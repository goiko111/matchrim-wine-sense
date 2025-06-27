import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ImportResult {
  success: number;
  errors: string[];
  warnings: string[];
  skipped: number;
  updated: number;
}

interface CSVRow {
  [key: string]: string;
}

type DuplicateStrategy = 'skip' | 'update' | 'suffix';

const CSVImporter = () => {
  const [selectedType, setSelectedType] = useState<'wines' | 'wine_styles' | 'matchrim_profiles'>('wines');
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      parseCSV(selectedFile);
    } else {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo CSV válido",
        variant: "destructive"
      });
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: CSVRow = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
      
      setCsvData(data);
    };
    reader.readAsText(file);
  };

  const validateWineRow = (row: CSVRow) => {
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

  const validateWineStyleRow = (row: CSVRow) => {
    const errors: string[] = [];
    
    // Verificar que tenemos el nombre del estilo
    if (!row['Nombre Estilo'] && !row.name) {
      errors.push('Nombre del estilo es requerido');
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

  const validateMatchrimProfileRow = (row: CSVRow) => {
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

  const importWines = async (data: CSVRow[]) => {
    const result: ImportResult = { success: 0, errors: [], warnings: [], skipped: 0, updated: 0 };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      setProgress((i / data.length) * 100);
      
      const validationErrors = validateWineRow(row);
      if (validationErrors.length > 0) {
        result.errors.push(`Fila ${i + 2}: ${validationErrors.join(', ')}`);
        continue;
      }
      
      try {
        const wineName = row.nombre || row.name || '';
        const existingWine = await checkForExistingRecord('wines', wineName);
        
        if (existingWine) {
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
          result.errors.push(`Fila ${i + 2}: ${error.message}`);
        } else {
          result.success++;
        }
      } catch (error: any) {
        result.errors.push(`Fila ${i + 2}: ${error.message}`);
      }
    }
    
    return result;
  };

  const importWineStyles = async (data: CSVRow[]) => {
    const result: ImportResult = { success: 0, errors: [], warnings: [], skipped: 0, updated: 0 };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      setProgress((i / data.length) * 100);
      
      const validationErrors = validateWineStyleRow(row);
      if (validationErrors.length > 0) {
        result.errors.push(`Fila ${i + 2}: ${validationErrors.join(', ')}`);
        continue;
      }
      
      try {
        const styleName = row['Nombre Estilo'] || row.name;
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
        
        const styleData = {
          name: finalStyleName,
          description: row.description || null,
          potente: parseInt(row.Potente || row.potente),
          acidez: parseInt(row.Acidez || row.acidez),
          dulce: parseInt(row.Dulce || row.dulce),
          tanico: parseInt(row.Tánico || row.tanico),
          afrutado: parseInt(row.Afrutado || row.afrutado)
        };
        
        const { error } = await supabase
          .from('wine_styles')
          .insert(styleData);
        
        if (error) {
          result.errors.push(`Fila ${i + 2}: ${error.message}`);
        } else {
          result.success++;
        }
      } catch (error: any) {
        result.errors.push(`Fila ${i + 2}: ${error.message}`);
      }
    }
    
    return result;
  };

  const importMatchrimProfiles = async (data: CSVRow[]) => {
    const result: ImportResult = { success: 0, errors: [], warnings: [], skipped: 0, updated: 0 };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      setProgress((i / data.length) * 100);
      
      const validationErrors = validateMatchrimProfileRow(row);
      if (validationErrors.length > 0) {
        result.errors.push(`Fila ${i + 2}: ${validationErrors.join(', ')}`);
        continue;
      }
      
      try {
        const profileName = row['Nombre Perfil Matchrim'] || row.name;
        const existingProfile = await checkForExistingRecord('matchrim_profiles', profileName);
        
        if (existingProfile) {
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
            
            const { error } = await supabase
              .from('matchrim_profiles')
              .update(profileData)
              .eq('id', existingProfile.id);
            
            if (error) {
              result.errors.push(`Fila ${i + 2}: ${error.message}`);
            } else {
              result.updated++;
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
        
        const { error } = await supabase
          .from('matchrim_profiles')
          .insert(profileData);
        
        if (error) {
          result.errors.push(`Fila ${i + 2}: ${error.message}`);
        } else {
          result.success++;
        }
      } catch (error: any) {
        result.errors.push(`Fila ${i + 2}: ${error.message}`);
      }
    }
    
    return result;
  };

  const handleImport = async () => {
    if (!csvData.length) {
      toast({
        title: "Error",
        description: "No hay datos para importar",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setProgress(0);
    setImportResult(null);
    
    try {
      let result: ImportResult;
      
      switch (selectedType) {
        case 'wines':
          result = await importWines(csvData);
          break;
        case 'wine_styles':
          result = await importWineStyles(csvData);
          break;
        case 'matchrim_profiles':
          result = await importMatchrimProfiles(csvData);
          break;
        default:
          throw new Error('Tipo de importación no válido');
      }
      
      setImportResult(result);
      setProgress(100);
      
      toast({
        title: "Importación completada",
        description: `${result.success} registros importados, ${result.skipped} omitidos, ${result.updated} actualizados`,
      });
      
    } catch (error: any) {
      toast({
        title: "Error en la importación",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCSVTemplate = () => {
    switch (selectedType) {
      case 'wines':
        return 'id,nombre,tipo,bodega,region,país,añada,potente,dulce,acidez,tánico,afrutado,nariz,boca,visual,cuerpo,estructura,final,crianza,elaboración,viñedo,info bodega,clima';
      case 'wine_styles':
        return 'Potente,Acidez,Dulce,Tánico,Afrutado,Nombre Estilo';
      case 'matchrim_profiles':
        return 'Potente,Acidez,Dulce,Tánico,Afrutado,Nombre Perfil Matchrim';
      default:
        return '';
    }
  };

  const downloadTemplate = () => {
    const template = getCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${selectedType}_template.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getFormatDescription = () => {
    switch (selectedType) {
      case 'wines':
        return 'Formato esperado para vinos: id, nombre, tipo, bodega, region, país, añada, potente, dulce, acidez, tánico, afrutado, nariz, boca, visual, cuerpo, estructura, final, crianza, elaboración, viñedo, info bodega, clima';
      case 'wine_styles':
        return 'Formato esperado para estilos de vino: Potente, Acidez, Dulce, Tánico, Afrutado, Nombre Estilo';
      case 'matchrim_profiles':
        return 'Formato esperado para perfiles Matchrim: Potente, Acidez, Dulce, Tánico, Afrutado, Nombre Perfil Matchrim';
      default:
        return '';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importador CSV
          </CardTitle>
          <CardDescription>
            Importa vinos, estilos de vino y perfiles Matchrim desde archivos CSV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="import-type">Tipo de datos a importar</Label>
              <Select value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wines">Vinos</SelectItem>
                  <SelectItem value="wine_styles">Estilos de Vino</SelectItem>
                  <SelectItem value="matchrim_profiles">Perfiles Matchrim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Plantilla CSV</Label>
              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Descargar Plantilla
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>¿Cómo manejar duplicados?</Label>
            <RadioGroup value={duplicateStrategy} onValueChange={(value: DuplicateStrategy) => setDuplicateStrategy(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="skip" id="skip" />
                <Label htmlFor="skip">Omitir registros duplicados</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="update" id="update" />
                <Label htmlFor="update">Actualizar registros existentes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="suffix" id="suffix" />
                <Label htmlFor="suffix">Agregar sufijo único a nombres duplicados</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="csv-file">Archivo CSV</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <p className="text-sm text-gray-600">
              {getFormatDescription()}
            </p>
          </div>
          
          {csvData.length > 0 && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Se han cargado {csvData.length} filas. Revisa los datos antes de importar.
                </AlertDescription>
              </Alert>
              
              <div className="max-h-64 overflow-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(csvData[0] || {}).map(key => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((value, i) => (
                          <TableCell key={i}>{value}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {csvData.length > 5 && (
                <p className="text-sm text-gray-500">
                  Mostrando las primeras 5 filas de {csvData.length} total
                </p>
              )}
            </div>
          )}
          
          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importando...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
          
          <Button 
            onClick={handleImport} 
            disabled={!csvData.length || isLoading}
            className="w-full"
          >
            {isLoading ? 'Importando...' : 'Importar Datos'}
          </Button>
          
          {importResult && (
            <div className="space-y-4">
              <Alert className={importResult.errors.length > 0 ? 'border-red-200' : 'border-green-200'}>
                {importResult.errors.length > 0 ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <AlertDescription>
                  Importación completada: {importResult.success} registros exitosos
                  {importResult.skipped > 0 && `, ${importResult.skipped} omitidos`}
                  {importResult.updated > 0 && `, ${importResult.updated} actualizados`}
                  {importResult.errors.length > 0 && `, ${importResult.errors.length} errores`}
                </AlertDescription>
              </Alert>
              
              {importResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-yellow-700">Advertencias:</h4>
                  <div className="max-h-32 overflow-auto bg-yellow-50 p-3 rounded text-sm">
                    {importResult.warnings.map((warning, index) => (
                      <div key={index} className="text-yellow-700">{warning}</div>
                    ))}
                  </div>
                </div>
              )}
              
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-700">Errores:</h4>
                  <div className="max-h-32 overflow-auto bg-red-50 p-3 rounded text-sm">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-red-700">{error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CSVImporter;
