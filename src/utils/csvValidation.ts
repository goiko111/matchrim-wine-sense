import { CSVRow } from '@/types/csv';
import { findColumnValue } from './csvParser';

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

export const validateWineRow = (row: CSVRow): string[] => {
  const errors: string[] = [];
  
  console.log('=== VALIDACIÓN DE VINO ===');
  console.log('Fila completa:', JSON.stringify(row, null, 2));
  console.log('Columnas disponibles:', Object.keys(row));
  
  // Verificar nombre del vino
  const wineName = getColumnValue(row, ['nombre', 'name', 'Name', 'Nombre']);
  console.log('Nombre del vino encontrado:', `"${wineName}"`);
  
  if (!wineName) {
    errors.push('Nombre del vino es requerido');
  }
  
  // Verificar tipo/estilo
  const wineType = getColumnValue(row, ['tipo', 'estilo', 'type', 'style', 'Tipo', 'Estilo']);
  console.log('Tipo/Estilo encontrado:', `"${wineType}"`);
  
  if (!wineType) {
    errors.push('Tipo/Estilo del vino es requerido');
  }
  
  // Validar campos numéricos opcionales (1-5)
  const numericFields = {
    'Potente': ['potente', 'power', 'Potente'],
    'Acidez': ['acidez', 'acidity', 'Acidez'],
    'Dulce': ['dulce', 'sweet', 'sweetness', 'Dulce'],
    'Tánico': ['tánico', 'taninos', 'tanic', 'tanin', 'Tánico', 'Taninos'],
    'Afrutado': ['afrutado', 'fruity', 'Afrutado']
  };
  
  Object.entries(numericFields).forEach(([fieldName, searchTerms]) => {
    const valueStr = getColumnValue(row, searchTerms);
    
    if (valueStr) {
      const value = parseInt(valueStr);
      if (isNaN(value) || value < 1 || value > 5) {
        errors.push(`${fieldName} debe ser un número entre 1 y 5 (valor: "${valueStr}")`);
      }
    }
  });
  
  // Validar añada/vintage si existe
  const vintageStr = getColumnValue(row, ['añada', 'vintage', 'Añada', 'Vintage']);
  if (vintageStr && isNaN(parseInt(vintageStr))) {
    errors.push('Añada/Vintage debe ser un año válido');
  }
  
  console.log('Errores de validación de vino:', errors);
  console.log('=== FIN VALIDACIÓN DE VINO ===');
  
  return errors;
};

export const validateWineStyleRow = (row: CSVRow): string[] => {
  const errors: string[] = [];
  
  console.log('=== VALIDACIÓN DE ESTILO DE VINO ===');
  console.log('Fila completa:', JSON.stringify(row, null, 2));
  console.log('Columnas disponibles:', Object.keys(row));
  
  // Función auxiliar para buscar valor en columna de forma más flexible
  const findValue = (possibleNames: string[]): string => {
    // Primero buscar coincidencia exacta
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name].toString().trim()) {
        return row[name].toString().trim();
      }
    }
    
    // Luego buscar coincidencia parcial (case-insensitive)
    for (const name of possibleNames) {
      const foundKey = Object.keys(row).find(key => 
        key.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(key.toLowerCase())
      );
      if (foundKey && row[foundKey] !== undefined && row[foundKey].toString().trim()) {
        return row[foundKey].toString().trim();
      }
    }
    
    return '';
  };
  
  // Buscar el nombre del estilo con máxima flexibilidad
  const styleName = findValue([
    'Estilo', 'estilo', 'style', 'Style', 'nombre', 'Nombre', 'name', 'Name',
    'Winerim', 'winerim', 'tipo', 'Tipo', 'category', 'Category'
  ]);
  
  console.log('Nombre del estilo encontrado:', `"${styleName}"`);
  
  if (!styleName) {
    // Si no encuentra nada, tomar la primera columna que tenga contenido
    const firstNonEmptyValue = Object.entries(row).find(([key, value]) => 
      value && value.toString().trim() && 
      !key.toLowerCase().includes('potent') &&
      !key.toLowerCase().includes('acid') &&
      !key.toLowerCase().includes('dulc') &&
      !key.toLowerCase().includes('tanic') &&
      !key.toLowerCase().includes('frut')
    );
    
    if (firstNonEmptyValue) {
      console.log(`Usando primera columna no vacía: "${firstNonEmptyValue[0]}" = "${firstNonEmptyValue[1]}"`);
    } else {
      errors.push(`Nombre del estilo es requerido. Columnas disponibles: ${Object.keys(row).join(', ')}`);
    }
  }
  
  // Validar campos numéricos con búsqueda flexible
  const numericFields = {
    'Potente': ['potent', 'power', 'strength', 'fuerte', 'intenso'],
    'Acidez': ['acid', 'acido', 'sour'],
    'Dulce': ['dulc', 'sweet', 'sugar', 'azucar'],
    'Tánico': ['tanic', 'tanin', 'astringent'],
    'Afrutado': ['frut', 'fruit', 'berry']
  };
  
  Object.entries(numericFields).forEach(([fieldName, searchTerms]) => {
    const allSearchTerms = [fieldName.toLowerCase(), ...searchTerms];
    const valueStr = findValue(allSearchTerms);
    
    console.log(`Campo ${fieldName}: valor encontrado = "${valueStr}"`);
    
    if (!valueStr) {
      // Buscar por similitud parcial en nombres de columnas
      const possibleColumn = Object.keys(row).find(key => {
        const lowerKey = key.toLowerCase();
        return allSearchTerms.some(term => 
          lowerKey.includes(term) || term.includes(lowerKey.substring(0, 4))
        );
      });
      
      if (possibleColumn && row[possibleColumn] && row[possibleColumn].toString().trim()) {
        const value = parseInt(row[possibleColumn].toString().trim());
        if (isNaN(value) || value < 1 || value > 5) {
          errors.push(`${fieldName} debe ser un número entre 1 y 5 (valor: "${row[possibleColumn]}", columna: "${possibleColumn}")`);
        }
      } else {
        errors.push(`${fieldName} es requerido. Columnas disponibles: ${Object.keys(row).join(', ')}`);
      }
    } else {
      const value = parseInt(valueStr);
      if (isNaN(value) || value < 1 || value > 5) {
        errors.push(`${fieldName} debe ser un número entre 1 y 5 (valor: "${valueStr}")`);
      }
    }
  });
  
  console.log('Errores de validación:', errors);
  console.log('=== FIN VALIDACIÓN ===');
  
  return errors;
};

export const validateMatchrimProfileRow = (row: CSVRow): string[] => {
  const errors: string[] = [];
  
  // Verificar que tenemos el nombre del perfil
  if (!row['Nombre Perfil Matchrim'] && !row.name) {
    errors.push('Nombre del perfil es requerido');
  }
  
  // Validar campos numéricos (0-5) usando nombres del Excel
  const numericFields = ['Potente', 'Acidez', 'Dulce', 'Tánico', 'Afrutado'];
  numericFields.forEach(field => {
    const value = parseInt(row[field]);
    if (isNaN(value) || value < 0 || value > 5) {
      errors.push(`${field} debe ser un número entre 0 y 5`);
    }
  });
  
  return errors;
};
