
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
    
    // Extraer campos principales con todos los nombres posibles
    const wineName = getColumnValue(row, ['nombre', 'name', 'Name', 'Nombre']);
    const producer = getColumnValue(row, ['bodega', 'producer', 'Bodega', 'Producer']) || null;
    const vintageStr = getColumnValue(row, ['añada', 'vintage', 'Añada', 'Vintage']);
    const vintage = vintageStr ? parseInt(vintageStr) : null;
    
    if (!wineName) {
      result.errors.push(`Fila ${i + 2}: Nombre del vino es requerido`);
      continue;
    }
    
    // Extraer tipo/estilo con más variaciones
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
              // Crear descripción extendida con TODOS los campos disponibles
              const descriptionParts = [];
              
              // Campos básicos de información
              const restaurante = getColumnValue(row, ['restaurante', 'restaurant', 'Restaurante']);
              if (restaurante) descriptionParts.push(`Restaurante: ${restaurante}`);
              
              const pais = getColumnValue(row, ['pais', 'país', 'country', 'País']);
              if (pais) descriptionParts.push(`País: ${pais}`);
              
              const urlFoto = getColumnValue(row, ['url_foto', 'foto', 'image_url', 'photo']);
              if (urlFoto) descriptionParts.push(`Foto: ${urlFoto}`);
              
              const ventanaOptima = getColumnValue(row, ['ventana_optima_consumo', 'optimal_consumption', 'consumo_optimo']);
              if (ventanaOptima) descriptionParts.push(`Ventana Óptima Consumo: ${ventanaOptima}`);
              
              const primeConsumo = getColumnValue(row, ['prime_consumo', 'prime_consumption', 'mejor_consumo']);
              if (primeConsumo) descriptionParts.push(`Prime Consumo: ${primeConsumo}`);
              
              const uvas = getColumnValue(row, ['uvas', 'grapes', 'varietal', 'Uvas']);
              if (uvas) descriptionParts.push(`Uvas: ${uvas}`);
              
              // Campos sensoriales
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
              
              // Campos de elaboración
              const crianza = getColumnValue(row, ['crianza', 'aging', 'Crianza']);
              if (crianza) descriptionParts.push(`Crianza: ${crianza}`);
              
              const elaboracion = getColumnValue(row, ['elaboracion', 'elaboración', 'winemaking', 'Elaboración']);
              if (elaboracion) descriptionParts.push(`Elaboración: ${elaboracion}`);
              
              const vinedo = getColumnValue(row, ['viñedo', 'vineyard', 'Viñedo']);
              if (vinedo) descriptionParts.push(`Viñedo: ${vinedo}`);
              
              const infoBodega = getColumnValue(row, ['info bodega', 'winery info', 'Info bodega', 'Info Bodega']);
              if (infoBodega) descriptionParts.push(`Info Bodega: ${infoBodega}`);
              
              const clima = getColumnValue(row, ['clima', 'climate', 'Clima']);
              if (clima) descriptionParts.push(`Clima: ${clima}`);
              
              return descriptionParts.length > 0 ? descriptionParts.join('. ') : null;
            })(),
            maridage_recommendations: (() => {
              const maridajes = getColumnValue(row, ['maridajes', 'pairings', 'maridage', 'food_pairing']);
              return maridajes ? maridajes.split(';').map(m => m.trim()).filter(m => m) : null;
            })()
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
          // Crear descripción extendida con TODOS los campos disponibles
          const descriptionParts = [];
          
          // Campos básicos de información
          const restaurante = getColumnValue(row, ['restaurante', 'restaurant', 'Restaurante']);
          if (restaurante) descriptionParts.push(`Restaurante: ${restaurante}`);
          
          const pais = getColumnValue(row, ['pais', 'país', 'country', 'País']);
          if (pais) descriptionParts.push(`País: ${pais}`);
          
          const urlFoto = getColumnValue(row, ['url_foto', 'foto', 'image_url', 'photo']);
          if (urlFoto) descriptionParts.push(`Foto: ${urlFoto}`);
          
          const ventanaOptima = getColumnValue(row, ['ventana_optima_consumo', 'optimal_consumption', 'consumo_optimo']);
          if (ventanaOptima) descriptionParts.push(`Ventana Óptima Consumo: ${ventanaOptima}`);
          
          const primeConsumo = getColumnValue(row, ['prime_consumo', 'prime_consumption', 'mejor_consumo']);
          if (primeConsumo) descriptionParts.push(`Prime Consumo: ${primeConsumo}`);
          
          const uvas = getColumnValue(row, ['uvas', 'grapes', 'varietal', 'Uvas']);
          if (uvas) descriptionParts.push(`Uvas: ${uvas}`);
          
          // Campos sensoriales
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
          
          // Campos de elaboración
          const crianza = getColumnValue(row, ['crianza', 'aging', 'Crianza']);
          if (crianza) descriptionParts.push(`Crianza: ${crianza}`);
          
          const elaboracion = getColumnValue(row, ['elaboracion', 'elaboración', 'winemaking', 'Elaboración']);
          if (elaboracion) descriptionParts.push(`Elaboración: ${elaboracion}`);
          
          const vinedo = getColumnValue(row, ['viñedo', 'vineyard', 'Viñedo']);
          if (vinedo) descriptionParts.push(`Viñedo: ${vinedo}`);
          
          const infoBodega = getColumnValue(row, ['info bodega', 'winery info', 'Info bodega', 'Info Bodega']);
          if (infoBodega) descriptionParts.push(`Info Bodega: ${infoBodega}`);
          
          const clima = getColumnValue(row, ['clima', 'climate', 'Clima']);
          if (clima) descriptionParts.push(`Clima: ${clima}`);
          
          return descriptionParts.length > 0 ? descriptionParts.join('. ') : null;
        })(),
        maridage_recommendations: (() => {
          const maridajes = getColumnValue(row, ['maridajes', 'pairings', 'maridage', 'food_pairing']);
          return maridajes ? maridajes.split(';').map(m => m.trim()).filter(m => m) : null;
        })()
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
  console.log(`=== INICIO IMPORTACIÓN OPTIMIZADA DE ESTILOS (${data.length} filas) ===`);
  
  // OPTIMIZACIÓN 1: Cargar todos los estilos existentes al inicio
  const { data: existingStyles, error: fetchError } = await supabase
    .from('wine_styles')
    .select('id, name');
  
  if (fetchError) {
    console.error('Error cargando estilos existentes:', fetchError);
    result.errors.push('Error cargando datos existentes de la base de datos');
    return result;
  }
  
  // Crear un Map para búsquedas rápidas O(1)
  const existingStylesMap = new Map(
    existingStyles?.map(style => [style.name.toLowerCase(), style]) || []
  );
  
  console.log(`Estilos existentes cargados: ${existingStylesMap.size}`);
  
  // OPTIMIZACIÓN 2: Procesar en lotes para reducir overhead
  const BATCH_SIZE = 10;
  const totalBatches = Math.ceil(data.length / BATCH_SIZE);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, data.length);
    const batch = data.slice(startIndex, endIndex);
    
    const batchProgress = ((batchIndex + 1) / totalBatches) * 100;
    onProgress(batchProgress);
    
    console.log(`\n=== PROCESANDO LOTE ${batchIndex + 1}/${totalBatches} (filas ${startIndex + 1}-${endIndex}) ===`);
    
    // Procesar lote
    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const globalIndex = startIndex + i;
      
      // OPTIMIZACIÓN 3: Búsqueda simplificada del nombre del estilo
      let styleName = '';
      
      // Buscar en columnas más probables primero
      const styleColumns = ['Estilo Winerim', 'Estilo', 'Style', 'Name', 'Nombre'];
      for (const col of styleColumns) {
        if (row[col] && row[col].toString().trim() && !/^\d+$/.test(row[col].toString().trim())) {
          styleName = row[col].toString().trim();
          break;
        }
      }
      
      // Si no encontramos, buscar en cualquier columna que no sea numérica
      if (!styleName) {
        for (const [key, value] of Object.entries(row)) {
          if (value && typeof value === 'string' && value.trim()) {
            const trimmedValue = value.trim();
            if (!/^\d+$/.test(trimmedValue) && !['1', '2', '3', '4', '5'].includes(trimmedValue)) {
              styleName = trimmedValue;
              break;
            }
          }
        }
      }
      
      if (!styleName) {
        result.errors.push(`Fila ${globalIndex + 2}: No se pudo encontrar nombre del estilo`);
        continue;
      }
      
      // OPTIMIZACIÓN 4: Búsqueda rápida de duplicados usando Map
      const existingStyle = existingStylesMap.get(styleName.toLowerCase());
      
      if (existingStyle) {
        if (duplicateStrategy === 'skip') {
          result.skipped++;
          continue;
        } else if (duplicateStrategy === 'update') {
          // Actualizar estilo existente
          const updateData = {
            potente: getIntValue(row['Potente'] || ''),
            acidez: getIntValue(row['Acidez'] || ''),
            dulce: getIntValue(row['Dulzura'] || ''),
            tanico: getIntValue(row['Taninos'] || ''),
            afrutado: getIntValue(row['Afrutado'] || '')
          };
          
          const { error } = await supabase
            .from('wine_styles')
            .update(updateData)
            .eq('id', existingStyle.id);
          
          if (error) {
            result.errors.push(`Fila ${globalIndex + 2}: ${error.message}`);
          } else {
            result.updated++;
          }
          continue;
        }
      }

      // OPTIMIZACIÓN 5: Generación de nombres únicos más eficiente para strategy 'suffix'
      let finalStyleName = styleName;
      if (existingStyle && duplicateStrategy === 'suffix') {
        let counter = 1;
        do {
          finalStyleName = `${styleName} (${counter})`;
          counter++;
        } while (existingStylesMap.has(finalStyleName.toLowerCase()));
        
        // Agregar al Map para evitar duplicados en el mismo lote
        existingStylesMap.set(finalStyleName.toLowerCase(), { id: 'temp', name: finalStyleName });
      }
      
      // Insertar nuevo estilo
      const styleData = {
        name: finalStyleName,
        description: null,
        potente: getIntValue(row['Potente'] || ''),
        acidez: getIntValue(row['Acidez'] || ''),
        dulce: getIntValue(row['Dulzura'] || ''),
        tanico: getIntValue(row['Taninos'] || ''),
        afrutado: getIntValue(row['Afrutado'] || '')
      };
      
      const { error } = await supabase
        .from('wine_styles')
        .insert(styleData);
      
      if (error) {
        result.errors.push(`Fila ${globalIndex + 2}: ${error.message}`);
      } else {
        result.success++;
        // Agregar al Map para evitar duplicados futuros
        existingStylesMap.set(finalStyleName.toLowerCase(), { id: 'new', name: finalStyleName });
      }
    }
  }
  
  console.log('=== FIN IMPORTACIÓN OPTIMIZADA DE ESTILOS ===');
  console.log(`Importación completada:`, result);
  return result;
};

export const importMatchrimProfiles = async (
  data: CSVRow[], 
  duplicateStrategy: DuplicateStrategy,
  onProgress: (progress: number) => void
): Promise<ImportResult> => {
  const result: ImportResult = { success: 0, errors: [], warnings: [], skipped: 0, updated: 0 };
  console.log(`=== INICIO IMPORTACIÓN ULTRA-RÁPIDA DE PERFILES MATCHRIM (${data.length} filas) ===`);
  
  // OPTIMIZACIÓN 1: Cargar todos los perfiles existentes al inicio
  const { data: existingProfiles, error: fetchError } = await supabase
    .from('matchrim_profiles')
    .select('id, name');
  
  if (fetchError) {
    console.error('Error cargando perfiles existentes:', fetchError);
    result.errors.push('Error cargando datos existentes de la base de datos');
    return result;
  }
  
  // Crear un Map para búsquedas rápidas O(1)
  const existingProfilesMap = new Map(
    existingProfiles?.map(profile => [profile.name.toLowerCase(), profile]) || []
  );
  
  console.log(`Perfiles existentes cargados: ${existingProfilesMap.size}`);
  
  // OPTIMIZACIÓN 2: Procesar en lotes GRANDES y usar bulk insert
  const BATCH_SIZE = 100; // Lotes más grandes
  const totalBatches = Math.ceil(data.length / BATCH_SIZE);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, data.length);
    const batch = data.slice(startIndex, endIndex);
    
    const batchProgress = ((batchIndex + 1) / totalBatches) * 100;
    onProgress(batchProgress);
    
    console.log(`Procesando lote ${batchIndex + 1}/${totalBatches} (filas ${startIndex + 1}-${endIndex})`);
    
    // Arrays para operaciones en lote
    const profilesToInsert = [];
    const profilesToUpdate = [];
    
    // Procesar lote y preparar operaciones
    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const globalIndex = startIndex + i;
      
      // Buscar nombre del perfil
      const profileName = row['Nombre Perfil Matchrim'] || row.name || row['Matchrim'] || row['MATCHRIM'];
      
      if (!profileName) {
        result.errors.push(`Fila ${globalIndex + 2}: No se pudo encontrar nombre del perfil`);
        continue;
      }
      
      const existingProfile = existingProfilesMap.get(profileName.toLowerCase());
      
      if (existingProfile) {
        if (duplicateStrategy === 'skip') {
          result.skipped++;
          continue;
        } else if (duplicateStrategy === 'update') {
          profilesToUpdate.push({
            id: existingProfile.id,
            data: {
              description: row.description || null,
              potente: getIntValue(row.Potente || row.potente || ''),
              acidez: getIntValue(row.Acidez || row.acidez || ''),
              dulce: getIntValue(row.Dulce || row.dulce || ''),
              tanico: getIntValue(row.Tánico || row.tanico || ''),
              afrutado: getIntValue(row.Afrutado || row.afrutado || ''),
              grape_recommendations: row.grape_recommendations ? 
                row.grape_recommendations.split(';').map(s => s.trim()) : null,
              region_recommendations: row.region_recommendations ? 
                row.region_recommendations.split(';').map(s => s.trim()) : null,
              style_recommendations: row.style_recommendations ? 
                row.style_recommendations.split(';').map(s => s.trim()) : null
            }
          });
          continue;
        }
      }

      // Generar nombre único si es necesario
      let finalProfileName = profileName;
      if (existingProfile && duplicateStrategy === 'suffix') {
        let counter = 1;
        do {
          finalProfileName = `${profileName} (${counter})`;
          counter++;
        } while (existingProfilesMap.has(finalProfileName.toLowerCase()));
        
        existingProfilesMap.set(finalProfileName.toLowerCase(), { id: 'temp', name: finalProfileName });
      }
      
      // Preparar para inserción
      profilesToInsert.push({
        name: finalProfileName,
        description: row.description || null,
        potente: getIntValue(row.Potente || row.potente || ''),
        acidez: getIntValue(row.Acidez || row.acidez || ''),
        dulce: getIntValue(row.Dulce || row.dulce || ''),
        tanico: getIntValue(row.Tánico || row.tanico || ''),
        afrutado: getIntValue(row.Afrutado || row.afrutado || ''),
        grape_recommendations: row.grape_recommendations ? 
          row.grape_recommendations.split(';').map(s => s.trim()) : null,
        region_recommendations: row.region_recommendations ? 
          row.region_recommendations.split(';').map(s => s.trim()) : null,
        style_recommendations: row.style_recommendations ? 
          row.style_recommendations.split(';').map(s => s.trim()) : null
      });
      
      // Agregar al Map para evitar duplicados futuros
      existingProfilesMap.set(finalProfileName.toLowerCase(), { id: 'new', name: finalProfileName });
    }
    
    // OPTIMIZACIÓN 3: Ejecutar operaciones en lote
    
    // Bulk insert
    if (profilesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('matchrim_profiles')
        .insert(profilesToInsert);
      
      if (insertError) {
        result.errors.push(`Error en lote ${batchIndex + 1}: ${insertError.message}`);
      } else {
        result.success += profilesToInsert.length;
      }
    }
    
    // Bulk update (uno por uno para updates porque Supabase no soporta bulk update fácilmente)
    for (const profile of profilesToUpdate) {
      const { error } = await supabase
        .from('matchrim_profiles')
        .update(profile.data)
        .eq('id', profile.id);
      
      if (error) {
        result.errors.push(`Error actualizando perfil: ${error.message}`);
      } else {
        result.updated++;
      }
    }
  }
  
  console.log('=== FIN IMPORTACIÓN ULTRA-RÁPIDA ===');
  console.log(`Importación completada:`, result);
  return result;
};
