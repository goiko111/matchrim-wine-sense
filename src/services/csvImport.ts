import { supabase } from '@/integrations/supabase/client';
import { CSVRow, ImportResult, DuplicateStrategy } from '@/types/csv';
import { validateWineRow, validateWineStyleRow, validateMatchrimProfileRow } from '@/utils/csvValidation';
import { findColumnValue } from '@/utils/csvParser';

const checkForExistingRecord = async (tableName: string, name: string) => {
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
  
  return data;
};

// Función auxiliar para extraer valor de columna de forma MUY flexible
const getColumnValue = (row: CSVRow, possibleNames: string[]): string => {
  // 1. Búsqueda exacta
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name].toString().trim()) {
      return row[name].toString().trim();
    }
  }
  
  // 2. Búsqueda case-insensitive
  const rowKeysLower = Object.keys(row).map(k => ({ original: k, lower: k.toLowerCase() }));
  for (const name of possibleNames) {
    const nameLower = name.toLowerCase();
    const found = rowKeysLower.find(k => k.lower === nameLower);
    if (found && row[found.original] !== undefined && row[found.original] !== null && row[found.original].toString().trim()) {
      return row[found.original].toString().trim();
    }
  }
  
  // 3. Búsqueda parcial (contiene)
  for (const name of possibleNames) {
    const nameLower = name.toLowerCase();
    const found = rowKeysLower.find(k => k.lower.includes(nameLower) || nameLower.includes(k.lower));
    if (found && row[found.original] !== undefined && row[found.original] !== null && row[found.original].toString().trim()) {
      return row[found.original].toString().trim();
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
  
  // Cargar todos los vinos existentes al inicio
  const { data: existingWines } = await supabase
    .from('wines')
    .select('id, name, producer, vintage');
  
  // Crear un Map para búsquedas rápidas
  const existingWinesMap = new Map();
  existingWines?.forEach(wine => {
    const key = `${wine.name.toLowerCase()}|${(wine.producer || '').toLowerCase()}|${wine.vintage || ''}`;
    existingWinesMap.set(key, wine);
  });
  
  // Procesar en lotes paralelos
  const BATCH_SIZE = 200;
  const PARALLEL_BATCHES = 5;
  const totalBatches = Math.ceil(data.length / BATCH_SIZE);
  
  // Procesar lotes en grupos paralelos
  for (let groupStart = 0; groupStart < totalBatches; groupStart += PARALLEL_BATCHES) {
    const groupEnd = Math.min(groupStart + PARALLEL_BATCHES, totalBatches);
    const batchPromises = [];
    
    for (let batchIndex = groupStart; batchIndex < groupEnd; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, data.length);
      const batch = data.slice(startIndex, endIndex);
      
      batchPromises.push(processBatch(batch, startIndex, existingWinesMap, duplicateStrategy));
    }
    
    // Esperar a que todos los lotes del grupo terminen
    const batchResults = await Promise.all(batchPromises);
    
    // Agregar resultados
    batchResults.forEach(batchResult => {
      result.success += batchResult.success;
      result.errors.push(...batchResult.errors);
      result.skipped += batchResult.skipped;
      result.updated += batchResult.updated;
    });
    
    onProgress((groupEnd / totalBatches) * 100);
  }
  
  return result;
};

async function processBatch(
  batch: CSVRow[], 
  startIndex: number, 
  existingWinesMap: Map<string, any>,
  duplicateStrategy: DuplicateStrategy
) {
  const batchResult = { success: 0, errors: [], skipped: 0, updated: 0 };
  const winesToInsert = [];
  const winesToUpdate = [];
  
  for (let i = 0; i < batch.length; i++) {
    const row = batch[i];
    const globalIndex = startIndex + i;
    
    // Extraer campos principales
    let wineName = getColumnValue(row, [
      'nombre', 'name', 'Name', 'Nombre', 'NOMBRE', 'NAME',
      'wine', 'Wine', 'WINE', 'vino', 'Vino', 'VINO'
    ]);
    
    // Si no hay nombre, buscar primera columna no numérica
    if (!wineName) {
      for (const [key, value] of Object.entries(row)) {
        if (value && typeof value === 'string' && value.trim() && !/^\d+$/.test(value.trim())) {
          wineName = value.trim();
          break;
        }
      }
    }
    
    const producer = getColumnValue(row, ['bodega', 'producer', 'Bodega', 'Producer', 'winery']) || null;
    const vintageStr = getColumnValue(row, ['añada', 'vintage', 'Añada', 'Vintage', 'año', 'year', 'anada']);
    const vintage = vintageStr ? parseInt(vintageStr) : null;
    const wineType = getColumnValue(row, ['tipo', 'estilo', 'type', 'style', 'Tipo', 'Estilo', 'Estilo Winerim']);
    
    if (!wineName) {
      batchResult.errors.push(`Fila ${globalIndex + 2}: Nombre del vino es requerido`);
      continue;
    }
    
    if (!wineType) {
      batchResult.errors.push(`Fila ${globalIndex + 2}: Tipo/Estilo del vino es requerido`);
      continue;
    }
    
    // Verificar duplicados
    const wineKey = `${wineName.toLowerCase()}|${(producer || '').toLowerCase()}|${vintage || ''}`;
    const existingWine = existingWinesMap.get(wineKey);
    
    // Helpers para descripción y maridajes
    const createDescription = () => {
      const parts = [];
      const fields = [
        ['restaurante', 'restaurant'],
        ['pais', 'país', 'country'],
        ['nariz', 'nose'],
        ['boca', 'mouth', 'palate'],
        ['visual', 'appearance'],
        ['crianza', 'aging']
      ];
      fields.forEach(names => {
        const val = getColumnValue(row, names);
        if (val) parts.push(`${names[0]}: ${val}`);
      });
      return parts.length > 0 ? parts.join('. ') : null;
    };
    
    const createMaridajes = () => {
      const m = getColumnValue(row, ['maridajes', 'pairings', 'maridage']);
      return m ? m.split(';').map(x => x.trim()).filter(x => x) : null;
    };
    
    if (existingWine) {
      if (duplicateStrategy === 'skip') {
        batchResult.skipped++;
        continue;
      } else if (duplicateStrategy === 'update') {
        winesToUpdate.push({
          id: existingWine.id,
          data: {
            producer,
            region: getColumnValue(row, ['region', 'Region', 'región']) || null,
            vintage,
            estilo: wineType,
            potencia: getIntValue(getColumnValue(row, ['potente', 'power'])),
            acidez: getIntValue(getColumnValue(row, ['acidez', 'acidity'])),
            dulzura: getIntValue(getColumnValue(row, ['dulce', 'sweet', 'dulzura'])),
            taninos: getIntValue(getColumnValue(row, ['tánico', 'taninos', 'tanico'])),
            afrutado: getIntValue(getColumnValue(row, ['afrutado', 'fruity'])),
            description: createDescription(),
            maridage_recommendations: createMaridajes()
          }
        });
        continue;
      } else if (duplicateStrategy === 'suffix') {
        let counter = 1;
        let uniqueKey;
        do {
          wineName = `${wineName} (${counter})`;
          uniqueKey = `${wineName.toLowerCase()}|${(producer || '').toLowerCase()}|${vintage || ''}`;
          counter++;
        } while (existingWinesMap.has(uniqueKey));
      }
    }
    
    // Insertar nuevo
    winesToInsert.push({
      name: wineName,
      producer,
      region: getColumnValue(row, ['region', 'Region', 'región']) || null,
      vintage,
      estilo: wineType,
      potencia: getIntValue(getColumnValue(row, ['potente', 'power'])),
      acidez: getIntValue(getColumnValue(row, ['acidez', 'acidity'])),
      dulzura: getIntValue(getColumnValue(row, ['dulce', 'sweet', 'dulzura'])),
      taninos: getIntValue(getColumnValue(row, ['tánico', 'taninos', 'tanico'])),
      afrutado: getIntValue(getColumnValue(row, ['afrutado', 'fruity'])),
      description: createDescription(),
      maridage_recommendations: createMaridajes()
    });
  }
  
  // Bulk insert
  if (winesToInsert.length > 0) {
    const { error } = await supabase.from('wines').insert(winesToInsert);
    if (error) {
      batchResult.errors.push(`Error insertando lote: ${error.message}`);
    } else {
      batchResult.success += winesToInsert.length;
    }
  }
  
  // Bulk update
  for (const wine of winesToUpdate) {
    const { error } = await supabase.from('wines').update(wine.data).eq('id', wine.id);
    if (error) {
      batchResult.errors.push(`Error actualizando: ${error.message}`);
    } else {
      batchResult.updated++;
    }
  }
  
  return batchResult;
}

export const importWineStyles = async (
  data: CSVRow[], 
  duplicateStrategy: DuplicateStrategy,
  onProgress: (progress: number) => void
): Promise<ImportResult> => {
  const result: ImportResult = { success: 0, errors: [], warnings: [], skipped: 0, updated: 0 };
  
  const { data: existingStyles } = await supabase.from('wine_styles').select('id, name');
  const existingStylesMap = new Map(existingStyles?.map(s => [s.name.toLowerCase(), s]) || []);
  
  const BATCH_SIZE = 100;
  const totalBatches = Math.ceil(data.length / BATCH_SIZE);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, data.length);
    const batch = data.slice(startIndex, endIndex);
    
    onProgress(((batchIndex + 1) / totalBatches) * 100);
    
    const stylesToInsert = [];
    const stylesToUpdate = [];
    
    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const globalIndex = startIndex + i;
      
      let styleName = '';
      const styleColumns = ['Estilo Winerim', 'Estilo', 'Style', 'Name', 'Nombre'];
      for (const col of styleColumns) {
        if (row[col] && row[col].toString().trim() && !/^\d+$/.test(row[col].toString().trim())) {
          styleName = row[col].toString().trim();
          break;
        }
      }
      
      if (!styleName) {
        for (const [key, value] of Object.entries(row)) {
          if (value && typeof value === 'string' && value.trim() && !/^\d+$/.test(value.trim())) {
            styleName = value.trim();
            break;
          }
        }
      }
      
      if (!styleName) {
        result.errors.push(`Fila ${globalIndex + 2}: No se pudo encontrar nombre del estilo`);
        continue;
      }
      
      const existingStyle = existingStylesMap.get(styleName.toLowerCase());
      
      if (existingStyle) {
        if (duplicateStrategy === 'skip') {
          result.skipped++;
          continue;
        } else if (duplicateStrategy === 'update') {
          stylesToUpdate.push({
            id: existingStyle.id,
            data: {
              potente: getIntValue(row['Potente'] || ''),
              acidez: getIntValue(row['Acidez'] || ''),
              dulce: getIntValue(row['Dulzura'] || ''),
              tanico: getIntValue(row['Taninos'] || ''),
              afrutado: getIntValue(row['Afrutado'] || '')
            }
          });
          continue;
        } else if (duplicateStrategy === 'suffix') {
          let counter = 1;
          do {
            styleName = `${styleName} (${counter})`;
            counter++;
          } while (existingStylesMap.has(styleName.toLowerCase()));
        }
      }
      
      stylesToInsert.push({
        name: styleName,
        potente: getIntValue(row['Potente'] || ''),
        acidez: getIntValue(row['Acidez'] || ''),
        dulce: getIntValue(row['Dulzura'] || ''),
        tanico: getIntValue(row['Taninos'] || ''),
        afrutado: getIntValue(row['Afrutado'] || '')
      });
    }
    
    if (stylesToInsert.length > 0) {
      const { error } = await supabase.from('wine_styles').insert(stylesToInsert);
      if (error) {
        result.errors.push(`Error en lote: ${error.message}`);
      } else {
        result.success += stylesToInsert.length;
      }
    }
    
    for (const style of stylesToUpdate) {
      const { error } = await supabase.from('wine_styles').update(style.data).eq('id', style.id);
      if (!error) result.updated++;
    }
  }
  
  return result;
};

export const importMatchrimProfiles = async (
  data: CSVRow[], 
  duplicateStrategy: DuplicateStrategy,
  onProgress: (progress: number) => void
): Promise<ImportResult> => {
  const result: ImportResult = { success: 0, errors: [], warnings: [], skipped: 0, updated: 0 };
  
  const { data: existingProfiles } = await supabase.from('matchrim_profiles').select('id, name');
  const existingProfilesMap = new Map(existingProfiles?.map(p => [p.name.toLowerCase(), p]) || []);
  
  const BATCH_SIZE = 100;
  const totalBatches = Math.ceil(data.length / BATCH_SIZE);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, data.length);
    const batch = data.slice(startIndex, endIndex);
    
    onProgress(((batchIndex + 1) / totalBatches) * 100);
    
    const profilesToInsert = [];
    const profilesToUpdate = [];
    
    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const globalIndex = startIndex + i;
      
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
              grape_recommendations: row.grape_recommendations ? row.grape_recommendations.split(';').map(s => s.trim()) : null,
              region_recommendations: row.region_recommendations ? row.region_recommendations.split(';').map(s => s.trim()) : null,
              style_recommendations: row.style_recommendations ? row.style_recommendations.split(';').map(s => s.trim()) : null
            }
          });
          continue;
        }
      }
      
      profilesToInsert.push({
        name: profileName,
        description: row.description || null,
        potente: getIntValue(row.Potente || row.potente || ''),
        acidez: getIntValue(row.Acidez || row.acidez || ''),
        dulce: getIntValue(row.Dulce || row.dulce || ''),
        tanico: getIntValue(row.Tánico || row.tanico || ''),
        afrutado: getIntValue(row.Afrutado || row.afrutado || ''),
        grape_recommendations: row.grape_recommendations ? row.grape_recommendations.split(';').map(s => s.trim()) : null,
        region_recommendations: row.region_recommendations ? row.region_recommendations.split(';').map(s => s.trim()) : null,
        style_recommendations: row.style_recommendations ? row.style_recommendations.split(';').map(s => s.trim()) : null
      });
    }
    
    if (profilesToInsert.length > 0) {
      const { error } = await supabase.from('matchrim_profiles').insert(profilesToInsert);
      if (error) {
        result.errors.push(`Error en lote: ${error.message}`);
      } else {
        result.success += profilesToInsert.length;
      }
    }
    
    for (const profile of profilesToUpdate) {
      const { error } = await supabase.from('matchrim_profiles').update(profile.data).eq('id', profile.id);
      if (!error) result.updated++;
    }
  }
  
  return result;
};
