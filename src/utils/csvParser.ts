
import { CSVRow } from '@/types/csv';

export const parseCSVLine = (line: string): string[] => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result.map(field => field.replace(/^"(.*)"$/, '$1'));
};

export const parseCSVFile = (file: File): Promise<CSVRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        console.log('Contenido del archivo CSV:', text.substring(0, 500));
        
        const lines = text.split('\n').filter(line => line.trim());
        console.log('Líneas del CSV:', lines.slice(0, 5));
        
        if (lines.length === 0) {
          console.error('El archivo CSV está vacío');
          reject(new Error('El archivo CSV está vacío'));
          return;
        }
        
        const headers = parseCSVLine(lines[0]);
        console.log('Headers detectados:', headers);
        
        const data = lines.slice(1).map((line, index) => {
          const values = parseCSVLine(line);
          const row: CSVRow = {};
          
          headers.forEach((header, headerIndex) => {
            const cleanHeader = header.trim();
            const value = values[headerIndex] ? values[headerIndex].trim() : '';
            row[cleanHeader] = value;
          });
          
          console.log(`Fila ${index + 1}:`, row);
          return row;
        }).filter(row => {
          // Filtrar filas completamente vacías
          return Object.values(row).some(value => value && value.trim());
        });
        
        console.log(`CSV parseado exitosamente: ${data.length} filas cargadas`);
        console.log('Primera fila de datos:', data[0]);
        console.log('Todas las columnas encontradas:', data.length > 0 ? Object.keys(data[0]) : 'Ninguna');
        
        resolve(data);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error leyendo el archivo'));
    };
    
    reader.readAsText(file);
  });
};

export const findColumnValue = (row: CSVRow, possibleNames: string[]): string => {
  console.log('Buscando valor en columnas:', possibleNames);
  console.log('Columnas disponibles en la fila:', Object.keys(row));
  
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name].trim()) {
      console.log(`Valor encontrado en columna "${name}": "${row[name].trim()}"`);
      return row[name].trim();
    }
  }
  
  // Si no encuentra nada, buscar de forma más flexible (ignorando mayúsculas/minúsculas y espacios)
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().replace(/\s+/g, '');
    const foundKey = Object.keys(row).find(key => 
      key.toLowerCase().replace(/\s+/g, '') === normalizedName
    );
    if (foundKey && row[foundKey] !== undefined && row[foundKey].trim()) {
      console.log(`Valor encontrado (búsqueda flexible) en columna "${foundKey}": "${row[foundKey].trim()}"`);
      return row[foundKey].trim();
    }
  }
  
  console.log('No se encontró valor para ninguna de las columnas:', possibleNames);
  return '';
};
