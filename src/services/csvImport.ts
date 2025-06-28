
import { supabase } from '@/integrations/supabase/client';
import { CSVRow, ImportResult, DuplicateStrategy } from '@/types/csv';
import { validateWineRow, validateWineStyleRow, validateMatchrimProfileRow } from '@/utils/csvValidation';
import { findColumnValue } from '@/utils/csvParser';

const checkForExistingRecord = async (tableName: string, name: string) => {
  let query;
  
  if (tableName === 'wines') {
    query = supabase
      .from('wines')
      .select('id, name')
      .eq('name', name)
      .maybeSingle();
  } else if (tableName === 'wine_styles') {
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
    throw error;
  }
  
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
    
    const validationErrors = validateWineRow(row);
    if (validationErrors.length > 0) {
      result.errors.push(`Fila ${i + 2}: ${validationErrors.join(', ')}`);
      continue;
    }
    
    try {
      const wineName = row.nombre || row.name || '';
      const existingWine = await checkForExistingRecord('wines', wineName);
      
      if (existingWine) {
        console.log(`Vino duplicado encontrado: ${wineName}, estrategia: ${duplicateStrategy}`);
        if (duplicateStrategy === 'skip') {
          result.skipped++;
          result.warnings.push(`Fila ${i + 2}: Vino "${wineName}" ya existe, omitido`);
          continue;
        } else if (duplicateStrategy === 'update') {
          // Lógica de actualización aquí si es necesaria
          result.updated++;
          continue;
        }
      }

      // Crear descripción extendida combinando múltiples campos
      const descriptionParts = [];
      if (row.nariz) descriptionParts.push(`Nariz: ${row.nariz}`);
      if (row.boca) descriptionParts.push(`Boca: ${row.boca}`);
      if (row.visual) descriptionParts.push(`Visual: ${row.visual}`);
      if (row.cuerpo) descriptionParts.push(`Cuerpo: ${row.cuerpo}`);
      if (row.estructura) descriptionParts.push(`Estructura: ${row.estructura}`);
      if (row.final) descriptionParts.push(`Final: ${row.final}`);
      if (row.crianza) descriptionParts.push(`Crianza: ${row.crianza}`);
      if (row.elaboración) descriptionParts.push(`Elaboración: ${row.elaboración}`);
      if (row.viñedo) descriptionParts.push(`Viñedo: ${row.viñedo}`);
      if (row['info bodega']) descriptionParts.push(`Info Bodega: ${row['info bodega']}`);
      if (row.clima) descriptionParts.push(`Clima: ${row.clima}`);
      
      const extendedDescription = descriptionParts.join('. ');
      
      let finalWineName = wineName;
      if (existingWine && duplicateStrategy === 'suffix') {
        finalWineName = await generateUniqueName('wines', wineName);
      }
      
      const wineData = {
        name: finalWineName,
        producer: row.bodega || row.producer || null,
        region: row.region || null,
        vintage: row.añada ? parseInt(row.añada) : (row.vintage ? parseInt(row.vintage) : null),
        estilo: row.tipo || row.estilo || '',
        potencia: row.potente ? parseInt(row.potente) : 3,
        acidez: row.acidez ? parseInt(row.acidez) : 3,
        dulzura: row.dulce ? parseInt(row.dulce) : 3,
        taninos: row.tánico ? parseInt(row.tánico) : 3,
        afrutado: row.afrutado ? parseInt(row.afrutado) : 3,
        description: extendedDescription || null,
        maridage_recommendations: null
      };
      
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
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const currentProgress = ((i + 1) / data.length) * 100;
    onProgress(currentProgress);
    console.log(`Procesando estilo ${i + 1}/${data.length} (${Math.round(currentProgress)}%)`);
    
    const validationErrors = validateWineStyleRow(row);
    if (validationErrors.length > 0) {
      console.log(`Errores de validación en fila ${i + 2}:`, validationErrors);
      result.errors.push(`Fila ${i + 2}: ${validationErrors.join(', ')}`);
      continue;
    }
    
    try {
      // Buscar el nombre del estilo con más flexibilidad
      const styleName = findColumnValue(row, [
        'Estilo Winerim',
        'estilo winerim',
        'ESTILO WINERIM',
        'Estilo',
        'estilo',
        'name',
        'Name',
        'nombre',
        'Nombre'
      ]);
      
      const existingStyle = await checkForExistingRecord('wine_styles', styleName);
      
      if (existingStyle) {
        if (duplicateStrategy === 'skip') {
          result.skipped++;
          result.warnings.push(`Fila ${i + 2}: Estilo "${styleName}" ya existe, omitido`);
          continue;
        } else if (duplicateStrategy === 'update') {
          result.updated++;
          continue;
        }
      }

      let finalStyleName = styleName;
      if (existingStyle && duplicateStrategy === 'suffix') {
        finalStyleName = await generateUniqueName('wine_styles', styleName);
      }
      
      // Extraer valores usando el mapeo flexible
      const styleData = {
        name: finalStyleName,
        description: findColumnValue(row, ['description', 'Description', 'descripcion', 'Descripcion']) || null,
        potente: parseInt(findColumnValue(row, ['Potente', 'potente', 'POTENTE', 'Potencia', 'potencia'])),
        acidez: parseInt(findColumnValue(row, ['Acidez', 'acidez', 'ACIDEZ'])),
        dulce: parseInt(findColumnValue(row, ['Dulzura', 'dulzura', 'DULZURA', 'Dulce', 'dulce'])),
        tanico: parseInt(findColumnValue(row, ['Taninos', 'taninos', 'TANINOS', 'Tánico', 'tanico'])),
        afrutado: parseInt(findColumnValue(row, ['Afrutado', 'afrutado', 'AFRUTADO']))
      };
      
      console.log('Datos del estilo a insertar:', styleData);
      
      const { error } = await supabase
        .from('wine_styles')
        .insert(styleData);
      
      if (error) {
        console.error(`Error insertando estilo ${styleName}:`, error);
        result.errors.push(`Fila ${i + 2}: ${error.message}`);
      } else {
        result.success++;
        console.log(`Estilo insertado exitosamente: ${finalStyleName}`);
      }
    } catch (error: any) {
      console.error(`Error procesando fila ${i + 2}:`, error);
      result.errors.push(`Fila ${i + 2}: ${error.message}`);
    }
  }
  
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
