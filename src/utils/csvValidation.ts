
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
  
  console.log('=== VALIDACIÓN DE ESTILO DE VINO ===');
  console.log('Fila completa:', JSON.stringify(row, null, 2));
  console.log('Columnas disponibles:', Object.keys(row));
  console.log('Valores de columnas:', Object.entries(row).map(([key, value]) => `"${key}": "${value}"`));
  
  // Lista expandida de posibles nombres para el estilo
  const styleNameOptions = [
    'Estilo Winerim', 'estilo winerim', 'ESTILO WINERIM',
    'Estilo', 'estilo', 'ESTILO',
    'Style', 'style', 'STYLE',
    'Name', 'name', 'NAME',
    'Nombre', 'nombre', 'NOMBRE',
    'Wine Style', 'wine style', 'WINE STYLE',
    'Tipo', 'tipo', 'TIPO'
  ];
  
  // Buscar el nombre del estilo
  const styleName = findColumnValue(row, styleNameOptions);
  console.log('Nombre del estilo encontrado:', styleName);
  
  if (!styleName) {
    // Buscar cualquier columna que pueda contener el nombre del estilo
    const possibleNameColumns = Object.keys(row).filter(key => {
      const lowerKey = key.toLowerCase();
      return lowerKey.includes('estilo') || lowerKey.includes('name') || 
             lowerKey.includes('nombre') || lowerKey.includes('style') ||
             lowerKey.includes('tipo');
    });
    
    console.log('Posibles columnas de nombre encontradas:', possibleNameColumns);
    
    if (possibleNameColumns.length > 0) {
      const firstPossible = row[possibleNameColumns[0]];
      if (firstPossible && firstPossible.trim()) {
        console.log(`Usando columna "${possibleNameColumns[0]}" con valor "${firstPossible}"`);
      } else {
        errors.push(`Nombre del estilo es requerido. Columnas disponibles: ${Object.keys(row).join(', ')}`);
      }
    } else {
      errors.push(`Nombre del estilo es requerido. Columnas disponibles: ${Object.keys(row).join(', ')}`);
    }
  }
  
  // Mapeo más amplio para campos numéricos
  const numericFieldMappings = {
    'Potente': [
      'Potente', 'potente', 'POTENTE', 
      'Potencia', 'potencia', 'POTENCIA',
      'Power', 'power', 'POWER',
      'Strength', 'strength', 'STRENGTH'
    ],
    'Acidez': [
      'Acidez', 'acidez', 'ACIDEZ', 
      'Acido', 'acido', 'ACIDO',
      'Acid', 'acid', 'ACID',
      'Acidity', 'acidity', 'ACIDITY'
    ], 
    'Dulce': [
      'Dulzura', 'dulzura', 'DULZURA', 
      'Dulce', 'dulce', 'DULCE', 
      'Sweet', 'sweet', 'SWEET',
      'Sweetness', 'sweetness', 'SWEETNESS'
    ],
    'Tánico': [
      'Taninos', 'taninos', 'TANINOS', 
      'Tánico', 'tánico', 'tanico', 'TANICO',
      'Tannins', 'tannins', 'TANNINS',
      'Tannin', 'tannin', 'TANNIN'
    ],
    'Afrutado': [
      'Afrutado', 'afrutado', 'AFRUTADO', 
      'Frutal', 'frutal', 'FRUTAL', 
      'Fruity', 'fruity', 'FRUITY',
      'Fruit', 'fruit', 'FRUIT'
    ]
  };
  
  Object.entries(numericFieldMappings).forEach(([fieldName, possibleNames]) => {
    const valueStr = findColumnValue(row, possibleNames);
    console.log(`Campo ${fieldName}: buscando en ${possibleNames.join(', ')}`);
    console.log(`Campo ${fieldName}: valor encontrado = "${valueStr}"`);
    
    if (!valueStr) {
      // Buscar cualquier columna que pueda contener este campo
      const possibleColumns = Object.keys(row).filter(key => {
        const lowerKey = key.toLowerCase();
        const lowerField = fieldName.toLowerCase();
        return lowerKey.includes(lowerField.substring(0, 4)) || // primeras 4 letras
               possibleNames.some(name => lowerKey.includes(name.toLowerCase().substring(0, 4)));
      });
      
      console.log(`Posibles columnas para ${fieldName}:`, possibleColumns);
      
      if (possibleColumns.length > 0) {
        const firstPossible = row[possibleColumns[0]];
        console.log(`Intentando usar columna "${possibleColumns[0]}" con valor "${firstPossible}"`);
        
        if (firstPossible && firstPossible.trim()) {
          const value = parseInt(firstPossible.trim());
          if (isNaN(value) || value < 1 || value > 5) {
            errors.push(`${fieldName} debe ser un número entre 1 y 5 (valor actual: "${firstPossible}", columna: "${possibleColumns[0]}")`);
          }
        } else {
          errors.push(`${fieldName} es requerido. Columnas disponibles: ${Object.keys(row).join(', ')}`);
        }
      } else {
        errors.push(`${fieldName} es requerido. Columnas disponibles: ${Object.keys(row).join(', ')}`);
      }
    } else {
      const value = parseInt(valueStr);
      if (isNaN(value) || value < 1 || value > 5) {
        errors.push(`${fieldName} debe ser un número entre 1 y 5 (valor actual: "${valueStr}")`);
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
