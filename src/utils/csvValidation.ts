
import { CSVRow } from '@/types/csv';
import { findColumnValue } from './csvParser';

export const validateWineRow = (row: CSVRow): string[] => {
  const errors: string[] = [];
  
  // Verificar campos requeridos usando los nombres de columnas del Excel
  if (!row.nombre && !row.name) errors.push('Nombre es requerido');
  if (!row.tipo && !row.estilo) errors.push('Tipo/Estilo es requerido');
  
  // Validar campos numéricos (1-5) - usar nombres del Excel
  const numericFields = ['potente', 'dulce', 'acidez', 'tánico', 'afrutado'];
  numericFields.forEach(field => {
    const value = parseInt(row[field]);
    if (row[field] && (isNaN(value) || value < 1 || value > 5)) {
      errors.push(`${field} debe ser un número entre 1 y 5`);
    }
  });
  
  // Validar añada/vintage
  if (row.añada && isNaN(parseInt(row.añada))) {
    errors.push('Añada debe ser un año válido');
  }
  
  return errors;
};

export const validateWineStyleRow = (row: CSVRow): string[] => {
  const errors: string[] = [];
  
  console.log('Validando fila de estilo:', row);
  console.log('Columnas disponibles:', Object.keys(row));
  
  // Buscar el nombre del estilo con más opciones posibles
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
  
  console.log('Nombre del estilo encontrado:', styleName);
  
  if (!styleName) {
    errors.push('Nombre del estilo es requerido - verifica que la columna del nombre del estilo esté presente');
  }
  
  // Mapeo más flexible para campos numéricos - incluir todas las variaciones posibles
  const numericFieldMappings = {
    'Potente': ['Potente', 'potente', 'POTENTE', 'Potencia', 'potencia', 'POTENCIA'],
    'Acidez': ['Acidez', 'acidez', 'ACIDEZ', 'Acido', 'acido', 'ACIDO'], 
    'Dulce': ['Dulzura', 'dulzura', 'DULZURA', 'Dulce', 'dulce', 'DULCE', 'Sweet', 'sweet'],
    'Tánico': ['Taninos', 'taninos', 'TANINOS', 'Tánico', 'tanico', 'TANICO', 'Tannins', 'tannins'],
    'Afrutado': ['Afrutado', 'afrutado', 'AFRUTADO', 'Frutal', 'frutal', 'FRUTAL', 'Fruity', 'fruity']
  };
  
  Object.entries(numericFieldMappings).forEach(([fieldName, possibleNames]) => {
    const valueStr = findColumnValue(row, possibleNames);
    console.log(`Campo ${fieldName}: valor encontrado = "${valueStr}"`);
    
    if (!valueStr) {
      errors.push(`${fieldName} es requerido - verifica que la columna esté presente`);
    } else {
      const value = parseInt(valueStr);
      if (isNaN(value) || value < 1 || value > 5) {
        errors.push(`${fieldName} debe ser un número entre 1 y 5 (valor actual: "${valueStr}")`);
      }
    }
  });
  
  return errors;
};

export const validateMatchrimProfileRow = (row: CSVRow): string[] => {
  const errors: string[] = [];
  
  // Verificar que tenemos el nombre del perfil
  if (!row['Nombre Perfil Matchrim'] && !row.name) {
    errors.push('Nombre del perfil es requerido');
  }
  
  // Validar campos numéricos (1-5) usando nombres del Excel
  const numericFields = ['Potente', 'Acidez', 'Dulce', 'Tánico', 'Afrutado'];
  numericFields.forEach(field => {
    const value = parseInt(row[field]);
    if (isNaN(value) || value < 1 || value > 5) {
      errors.push(`${field} debe ser un número entre 1 y 5`);
    }
  });
  
  return errors;
};
