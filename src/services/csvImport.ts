import { supabase } from '@/integrations/supabase/client';
import { CSVRow, ImportResult, DuplicateStrategy } from '@/types/csv';
import { validateWineRow, validateWineStyleRow, validateMatchrimProfileRow } from '@/utils/csvValidation';
import { findColumnValue } from '@/utils/csvParser';

const checkForExistingWine = async (name: string, producer?: string, vintage?: number) => {
  console.log(`Verificando duplicado de vino: nombre="${name}", bodega="${producer}", añada=${vintage}`);
  
  let query = supabase
    .from('wines')
    .select('id, name, producer, vintage')
    .eq('name', name);
  
  // Si tenemos bodega, la incluimos en la verificación
  if (producer) {
    query = query.eq('producer', producer);
  }
  
  // Si tenemos añada, la incluimos en la verificación
  if (vintage) {
    query = query.eq('vintage', vintage);
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  console.log(`Resultado de verificación de duplicado:`, data);
  return data;
};

const checkForExistingRecord = async (tableName: string, name: string) => {
  console.log(`Verificando duplicado exacto en ${tableName} para: "${name}"`);
  
  let query;
  
  if (tableName === 'wine_styles') {
    query = supabase
      .from('wine_styles')
      .select('id, name')
      .eq('name', name)
      .maybeSingle();
  } else if (tableName === 'matchrim_profiles') {
    query = supabase
      .from('matchrim_profiles')
      .select('id, name')
      .eq('name', name)
      .maybeSingle();
  } else {
    throw new Error('Tabla no válida');
  }
  
  const { data, error } = await query;
  
  if (error && error.code !== 'PGRST116') {
    console.error(`Error verificando duplicado en ${tableName}:`, error);
    throw error;
  }
  
  console.log(`Resultado verificación duplicado en ${tableName}:`, data ? 'EXISTE' : 'NO EXISTE');
  return data;
};

const generateUniqueName = async (tableName: string, baseName: string): Promise<string> => {
  let counter = 1;
  let uniqueName = `${baseName} (${counter})`;
  
  while (true) {
    const existing = await checkForExistingRecord(tableName, uniqueName);
    if (!existing) {
      return uniqueName;
    }
    counter++;
    uniqueName = `${baseName} (${counter})`;
  }
};

// Función auxiliar para extraer valor de columna de forma flexible
const getColumnValue = (row: CSVRow, possibleNames: string[]): string => {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name].toString().trim()) {
      return row[name].toString().trim();
    }
  }
  
  // Búsqueda flexible (case-insensitive)
  for (const name of possibleNames) {
    const foundKey = Object.keys(row).find(key => 
      key.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(key.toLowerCase())
    );
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && row[foundKey].toString().trim()) {
      return row[foundKey].toString().trim();
    }
  }
  
  return '';
};

// Función auxiliar para convertir a entero con valor por defecto
const getIntValue = (value: string, defaultValue: number = 3): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : Math.max(1, Math.min(5, parsed));
};

export const importWines = async (
  data: CSVRow[], 
  duplicateStrategy: DuplicateStrategy,
  onProgress: (progress: number) => void
): Promise<ImportResult> => {
  const result: ImportResult = { success: 0, errors: [], warnings: [], skipped: 0, updated: 0 };
  console.log(`Iniciando importación de ${data.length} vinos`);
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const currentProgress = ((i + 1) / data.length) * 100;
    onProgress(currentProgress);
    console.log(`Procesando vino ${i + 1}/${data.length} (${Math.round(currentProgress)}%)`);
    console.log('Fila completa:', row);
    
    // Extraer campos principales
    const wineName = getColumnValue(row, ['nombre', 'name', 'Name', 'Nombre']);
    const producer = getColumnValue(row, ['bodega', 'producer', 'Bodega', 'Producer']) || null;
    const vintageStr = getColumnValue(row, ['añada', 'vintage', 'Añada', 'Vintage']);
    const vintage = vintageStr ? parseInt(vintageStr) : null;
    
    if (!wineName) {
      result.errors.push(`Fila ${i + 2}: Nombre del vino es requerido`);
      continue;
    }
    
    // Extraer tipo/estilo
    const wineType = getColumnValue(row, ['tipo', 'estilo', 'type', 'style', 'Tipo', 'Estilo']);
    
    if (!wineType) {
      result.errors.push(`Fila ${i + 2}: Tipo/Estilo del vino es requerido`);
      continue;
    }
    
    try {
      // Usar la nueva función de verificación mejorada
      const existingWine = await checkForExistingWine(wineName, producer || undefined, vintage || undefined);
      
      if (existingWine) {
        console.log(`Vino duplicado encontrado: ${wineName} (${producer}, ${vintage}), estrategia: ${duplicateStrategy}`);
        if (duplicateStrategy === 'skip') {
          result.skipped++;
          result.warnings.push(`Fila ${i + 2}: Vino "${wineName}" (${producer}, ${vintage}) ya existe, omitido`);
          continue;
        } else if (duplicateStrategy === 'update') {
          // Actualizar vino existente
          const updateData = {
            producer,
            region: getColumnValue(row, ['region', 'Region']) || null,
            vintage,
            estilo: wineType,
            potencia: getIntValue(getColumnValue(row, ['potente', 'power', 'Potente'])),
            acidez: getIntValue(getColumnValue(row, ['acidez', 'acidity', 'Acidez'])),
            dulzura: getIntValue(getColumnValue(row, ['dulce', 'sweet', 'sweetness', 'Dulce'])),
            taninos: getIntValue(getColumnValue(row, ['tánico', 'taninos', 'tanic', 'tanin', 'Tánico', 'Taninos'])),
            afrutado: getIntValue(getColumnValue(row, ['afrutado', 'fruity', 'Afrutado'])),
            description: (() => {
              // Crear descripción extendida con todas las columnas disponibles
              const descriptionParts = [];
              
              const nariz = getColumnValue(row, ['nariz', 'nose', 'Nariz']);
              if (nariz) descriptionParts.push(`Nariz: ${nariz}`);
              
              const boca = getColumnValue(row, ['boca', 'mouth', 'palate', 'Boca']);
              if (boca) descriptionParts.push(`Boca: ${boca}`);
              
              const visual = getColumnValue(row, ['visual', 'appearance', 'Visual']);
              if (visual) descriptionParts.push(`Visual: ${visual}`);
              
              const cuerpo = getColumnValue(row, ['cuerpo', 'body', 'Cuerpo']);
              if (cuerpo) descriptionParts.push(`Cuerpo: ${cuerpo}`);
              
              const estructura = getColumnValue(row, ['estructura', 'structure', 'Estructura']);
              if (estructura) descriptionParts.push(`Estructura: ${estructura}`);
              
              const final = getColumnValue(row, ['final', 'finish', 'Final']);
              if (final) descriptionParts.push(`Final: ${final}`);
              
              const crianza = getColumnValue(row, ['crianza', 'aging', 'Crianza']);
              if (crianza) descriptionParts.push(`Crianza: ${crianza}`);
              
              const elaboracion = getColumnValue(row, ['elaboración', 'winemaking', 'Elaboración']);
              if (elaboracion) descriptionParts.push(`Elaboración: ${elaboracion}`);
              
              const vinedo = getColumnValue(row, ['viñedo', 'vineyard', 'Viñedo']);
              if (vinedo) descriptionParts.push(`Viñedo: ${vinedo}`);
              
              const infoBodega = getColumnValue(row, ['info bodega', 'winery info', 'Info bodega', 'Info Bodega']);
              if (infoBodega) descriptionParts.push(`Info Bodega: ${infoBodega}`);
              
              const clima = getColumnValue(row, ['clima', 'climate', 'Clima']);
              if (clima) descriptionParts.push(`Clima: ${clima}`);
              
              return descriptionParts.length > 0 ? descriptionParts.join('. ') : null;
            })(),
            maridage_recommendations: null
          };
          
          console.log(`Actualizando vino existente: ${wineName}`, updateData);
          const { error } = await supabase
            .from('wines')
            .update(updateData)
            .eq('id', existingWine.id);
          
          if (error) {
            console.error(`Error actualizando vino ${wineName}:`, error);
            result.errors.push(`Fila ${i + 2}: ${error.message}`);
          } else {
            result.updated++;
            console.log(`Vino actualizado exitosamente: ${wineName}`);
          }
          continue;
        }
      }

      // Si llegamos aquí, no hay duplicado o la estrategia es 'suffix'
      let finalWineName = wineName;
      if (existingWine && duplicateStrategy === 'suffix') {
        // Para vinos, generamos nombre único considerando bodega y añada
        let counter = 1;
        let uniqueName = `${wineName} (${counter})`;
        
        while (true) {
          const existing = await checkForExistingWine(uniqueName, producer || undefined, vintage || undefined);
          if (!existing) {
            finalWineName = uniqueName;
            break;
          }
          counter++;
          uniqueName = `${wineName} (${counter})`;
        }
      }
      
      const wineData = {
        name: finalWineName,
        producer,
        region: getColumnValue(row, ['region', 'Region']) || null,
        vintage,
        estilo: wineType,
        potencia: getIntValue(getColumnValue(row, ['potente', 'power', 'Potente'])),
        acidez: getIntValue(getColumnValue(row, ['acidez', 'acidity', 'Acidez'])),
        dulzura: getIntValue(getColumnValue(row, ['dulce', 'sweet', 'sweetness', 'Dulce'])),
        taninos: getIntValue(getColumnValue(row, ['tánico', 'taninos', 'tanic', 'tanin', 'Tánico', 'Taninos'])),
        afrutado: getIntValue(getColumnValue(row, ['afrutado', 'fruity', 'Afrutado'])),
        description: (() => {
          // Crear descripción extendida con todas las columnas disponibles
          const descriptionParts = [];
          
          const nariz = getColumnValue(row, ['nariz', 'nose', 'Nariz']);
          if (nariz) descriptionParts.push(`Nariz: ${nariz}`);
          
          const boca = getColumnValue(row, ['boca', 'mouth', 'palate', 'Boca']);
          if (boca) descriptionParts.push(`Boca: ${boca}`);
          
          const visual = getColumnValue(row, ['visual', 'appearance', 'Visual']);
          if (visual) descriptionParts.push(`Visual: ${visual}`);
          
          const cuerpo = getColumnValue(row, ['cuerpo', 'body', 'Cuerpo']);
          if (cuerpo) descriptionParts.push(`Cuerpo: ${cuerpo}`);
          
          const estructura = getColumnValue(row, ['estructura', 'structure', 'Estructura']);
          if (estructura) descriptionParts.push(`Estructura: ${estructura}`);
          
          const final = getColumnValue(row, ['final', 'finish', 'Final']);
          if (final) descriptionParts.push(`Final: ${final}`);
          
          const crianza = getColumnValue(row, ['crianza', 'aging', 'Crianza']);
          if (crianza) descriptionParts.push(`Crianza: ${crianza}`);
          
          const elaboracion = getColumnValue(row, ['elaboración', 'winemaking', 'Elaboración']);
          if (elaboracion) descriptionParts.push(`Elaboración: ${elaboracion}`);
          
          const vinedo = getColumnValue(row, ['viñedo', 'vineyard', 'Viñedo']);
          if (vinedo) descriptionParts.push(`Viñedo: ${vinedo}`);
          
          const infoBodega = getColumnValue(row, ['info bodega', 'winery info', 'Info bodega', 'Info Bodega']);
          if (infoBodega) descriptionParts.push(`Info Bodega: ${infoBodega}`);
          
          const clima = getColumnValue(row, ['clima', 'climate', 'Clima']);
          if (clima) descriptionParts.push(`Clima: ${clima}`);
          
          return descriptionParts.length > 0 ? descriptionParts.join('. ') : null;
        })(),
        maridage_recommendations: null
      };
      
      console.log(`Insertando nuevo vino: ${finalWineName}`, wineData);
      const { error } = await supabase
        .from('wines')
        .insert(wineData);
      
      if (error) {
        console.error(`Error insertando vino ${wineName}:`, error);
        result.errors.push(`Fila ${i + 2}: ${error.message}`);
      } else {
        result.success++;
        console.log(`Vino insertado exitosamente: ${finalWineName}`);
      }
    } catch (error: any) {
      console.error(`Error procesando fila ${i + 2}:`, error);
      result.errors.push(`Fila ${i + 2}: ${error.message}`);
    }
  }
  
  console.log(`Importación de vinos completada:`, result);
  return result;
};

export const importWineStyles = async (
  data: CSVRow[], 
  duplicateStrategy: DuplicateStrategy,
  onProgress: (progress: number) => void
): Promise<ImportResult> => {
  const result: ImportResult = { success: 0, errors: [], warnings: [], skipped: 0, updated: 0 };
  console.log(`Iniciando importación de ${data.length} estilos de vino`);
  console.log('=== INICIO IMPORTACIÓN CORREGIDA DE ESTILOS ===');
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const currentProgress = ((i + 1) / data.length) * 100;
    onProgress(currentProgress);
    
    console.log(`\n=== PROCESANDO ESTILO ${i + 1}/${data.length} ===`);
    console.log('Fila completa del CSV:', row);
    console.log('Columnas disponibles:', Object.keys(row));
    
    // NUEVA LÓGICA: Buscar el nombre del estilo en TODAS las columnas posibles
    let styleName = '';
    
    // Lista de posibles nombres de columnas para el estilo
    const possibleStyleColumns = [
      'Estilo Winerim', 'Estilo', 'Style', 'Name', 'Nombre', 'estilo', 'style', 'name', 'nombre'
    ];
    
    // Buscar en las columnas específicas primero
    for (const columnName of possibleStyleColumns) {
      if (row[columnName] && row[columnName].toString().trim()) {
        const value = row[columnName].toString().trim();
        // Verificar que no sea solo números (evitar confundir con valores numéricos)
        if (!/^\d+$/.test(value)) {
          styleName = value;
          console.log(`✓ Nombre del estilo encontrado en columna "${columnName}": "${styleName}"`);
          break;
        }
      }
    }
    
    // Si no encontramos en las columnas específicas, buscar en cualquier columna que contenga texto
    if (!styleName) {
      console.log('No se encontró en columnas específicas, buscando en todas las columnas...');
      for (const [key, value] of Object.entries(row)) {
        if (value && typeof value === 'string' && value.trim()) {
          const trimmedValue = value.trim();
          // Debe ser texto, no solo números, y no debe ser un valor de puntuación (1-5)
          if (!/^\d+$/.test(trimmedValue) && !['1', '2', '3', '4', '5'].includes(trimmedValue)) {
            styleName = trimmedValue;
            console.log(`✓ Nombre del estilo encontrado en columna "${key}": "${styleName}"`);
            break;
          }
        }
      }
    }
    
    if (!styleName) {
      console.log(`✗ FILA ${i + 2}: No se pudo encontrar nombre del estilo`);
      console.log('Valores de todas las columnas:', row);
      result.errors.push(`Fila ${i + 2}: No se pudo encontrar nombre del estilo. Columnas disponibles: ${Object.keys(row).join(', ')}`);
      continue;
    }
    
    console.log(`✓ Nombre del estilo confirmado: "${styleName}"`);
    
    // Extraer valores numéricos usando nombres exactos del CSV
    const extractNumericValue = (columnName: string): number => {
      const value = row[columnName];
      if (value !== undefined && value !== null && value.toString().trim()) {
        const parsed = parseInt(value.toString().trim());
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
          console.log(`✓ ${columnName} = ${parsed}`);
          return parsed;
        }
      }
      console.log(`✗ ${columnName} no válido, usando 3 por defecto`);
      return 3;
    };
    
    const potente = extractNumericValue('Potente');
    const acidez = extractNumericValue('Acidez');
    const dulce = extractNumericValue('Dulzura');
    const tanico = extractNumericValue('Taninos');
    const afrutado = extractNumericValue('Afrutado');
    
    console.log(`Valores extraídos: potente=${potente}, acidez=${acidez}, dulce=${dulce}, tanico=${tanico}, afrutado=${afrutado}`);
    
    try {
      // Verificación de duplicado EXACTA para evitar falsos positivos
      const existingStyle = await checkForExistingRecord('wine_styles', styleName);
      
      if (existingStyle) {
        console.log(`DUPLICADO ENCONTRADO para "${styleName}", estrategia: ${duplicateStrategy}`);
        if (duplicateStrategy === 'skip') {
          result.skipped++;
          result.warnings.push(`Fila ${i + 2}: Estilo "${styleName}" ya existe, omitido`);
          console.log(`OMITIDO: Estilo "${styleName}" ya existe`);
          continue;
        } else if (duplicateStrategy === 'update') {
          // Actualizar estilo existente
          const updateData = {
            description: null, // No hay descripción en el CSV
            potente,
            acidez,
            dulce,
            tanico,
            afrutado
          };
          
          console.log(`Actualizando estilo existente: "${styleName}"`, updateData);
          const { error } = await supabase
            .from('wine_styles')
            .update(updateData)
            .eq('id', existingStyle.id);
          
          if (error) {
            console.error(`Error actualizando estilo ${styleName}:`, error);
            result.errors.push(`Fila ${i + 2}: ${error.message}`);
          } else {
            result.updated++;
            console.log(`✓ Estilo actualizado exitosamente: ${styleName}`);
          }
          continue;
        }
      }

      let finalStyleName = styleName;
      if (existingStyle && duplicateStrategy === 'suffix') {
        finalStyleName = await generateUniqueName('wine_styles', styleName);
        console.log(`Generando nombre único: "${styleName}" -> "${finalStyleName}"`);
      }
      
      const styleData = {
        name: finalStyleName,
        description: null, // No hay columna de descripción en tu CSV
        potente,
        acidez,
        dulce,
        tanico,
        afrutado
      };
      
      console.log(`Insertando nuevo estilo: "${finalStyleName}"`, styleData);
      
      const { error } = await supabase
        .from('wine_styles')
        .insert(styleData);
      
      if (error) {
        console.error(`Error insertando estilo ${styleName}:`, error);
        result.errors.push(`Fila ${i + 2}: ${error.message}`);
      } else {
        result.success++;
        console.log(`✓ Estilo insertado exitosamente: ${finalStyleName}`);
      }
    } catch (error: any) {
      console.error(`Error procesando fila ${i + 2}:`, error);
      result.errors.push(`Fila ${i + 2}: ${error.message}`);
    }
    
    console.log(`=== FIN PROCESAMIENTO ESTILO ${i + 1} ===\n`);
  }
  
  console.log('=== FIN IMPORTACIÓN CORREGIDA DE ESTILOS ===');
  console.log(`Importación de estilos completada:`, result);
  return result;
};

export const importMatchrimProfiles = async (
  data: CSVRow[], 
  duplicateStrategy: DuplicateStrategy,
  onProgress: (progress: number) => void
): Promise<ImportResult> => {
  const result: ImportResult = { success: 0, errors: [], warnings: [], skipped: 0, updated: 0 };
  console.log(`Iniciando importación de ${data.length} perfiles Matchrim`);
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const currentProgress = ((i + 1) / data.length) * 100;
    onProgress(currentProgress);
    console.log(`Procesando perfil ${i + 1}/${data.length} (${Math.round(currentProgress)}%)`);
    
    const validationErrors = validateMatchrimProfileRow(row);
    if (validationErrors.length > 0) {
      result.errors.push(`Fila ${i + 2}: ${validationErrors.join(', ')}`);
      continue;
    }
    
    try {
      const profileName = row['Nombre Perfil Matchrim'] || row.name;
      const existingProfile = await checkForExistingRecord('matchrim_profiles', profileName);
      
      if (existingProfile) {
        console.log(`Perfil duplicado encontrado: ${profileName}, estrategia: ${duplicateStrategy}`);
        if (duplicateStrategy === 'skip') {
          result.skipped++;
          result.warnings.push(`Fila ${i + 2}: Perfil "${profileName}" ya existe, omitido`);
          continue;
        } else if (duplicateStrategy === 'update') {
          // Actualizar perfil existente
          const profileData = {
            description: row.description || null,
            potente: parseInt(row.Potente || row.potente),
            acidez: parseInt(row.Acidez || row.acidez),
            dulce: parseInt(row.Dulce || row.dulce),
            tanico: parseInt(row.Tánico || row.tanico),
            afrutado: parseInt(row.Afrutado || row.afrutado),
            grape_recommendations: row.grape_recommendations ? 
              row.grape_recommendations.split(';').map(s => s.trim()) : null,
            region_recommendations: row.region_recommendations ? 
              row.region_recommendations.split(';').map(s => s.trim()) : null,
            style_recommendations: row.style_recommendations ? 
              row.style_recommendations.split(';').map(s => s.trim()) : null
          };
          
          console.log(`Actualizando perfil existente: ${profileName}`);
          const { error } = await supabase
            .from('matchrim_profiles')
            .update(profileData)
            .eq('id', existingProfile.id);
          
          if (error) {
            console.error(`Error actualizando perfil ${profileName}:`, error);
            result.errors.push(`Fila ${i + 2}: ${error.message}`);
          } else {
            result.updated++;
            console.log(`Perfil actualizado exitosamente: ${profileName}`);
          }
          continue;
        }
      }

      let finalProfileName = profileName;
      if (existingProfile && duplicateStrategy === 'suffix') {
        finalProfileName = await generateUniqueName('matchrim_profiles', profileName);
      }
      
      const profileData = {
        name: finalProfileName,
        description: row.description || null,
        potente: parseInt(row.Potente || row.potente),
        acidez: parseInt(row.Acidez || row.acidez),
        dulce: parseInt(row.Dulce || row.dulce),
        tanico: parseInt(row.Tánico || row.tanico),
        afrutado: parseInt(row.Afrutado || row.afrutado),
        grape_recommendations: row.grape_recommendations ? 
          row.grape_recommendations.split(';').map(s => s.trim()) : null,
        region_recommendations: row.region_recommendations ? 
          row.region_recommendations.split(';').map(s => s.trim()) : null,
        style_recommendations: row.style_recommendations ? 
          row.style_recommendations.split(';').map(s => s.trim()) : null
      };
      
      console.log(`Insertando nuevo perfil: ${finalProfileName}`);
      const { error } = await supabase
        .from('matchrim_profiles')
        .insert(profileData);
      
      if (error) {
        console.error(`Error insertando perfil ${finalProfileName}:`, error);
        result.errors.push(`Fila ${i + 2}: ${error.message}`);
      } else {
        result.success++;
        console.log(`Perfil insertado exitosamente: ${finalProfileName}`);
      }
    } catch (error: any) {
      console.error(`Error procesando fila ${i + 2}:`, error);
      result.errors.push(`Fila ${i + 2}: ${error.message}`);
    }
  }
  
  console.log(`Importación de perfiles Matchrim completada:`, result);
  return result;
};
