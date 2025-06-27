
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ImportResult {
  success: number;
  errors: string[];
  warnings: string[];
}

interface CSVRow {
  [key: string]: string;
}

const CSVImporter = () => {
  const [selectedType, setSelectedType] = useState<'wines' | 'wine_styles' | 'matchrim_profiles'>('wines');
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
    
    if (!row.name) errors.push('Nombre es requerido');
    if (!row.estilo) errors.push('Estilo es requerido');
    
    ['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado'].forEach(field => {
      const value = parseInt(row[field]);
      if (isNaN(value) || value < 1 || value > 5) {
        errors.push(`${field} debe ser un número entre 1 y 5`);
      }
    });
    
    if (row.vintage && isNaN(parseInt(row.vintage))) {
      errors.push('Vintage debe ser un año válido');
    }
    
    return errors;
  };

  const validateWineStyleRow = (row: CSVRow) => {
    const errors: string[] = [];
    
    if (!row.name) errors.push('Nombre es requerido');
    
    ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'].forEach(field => {
      const value = parseInt(row[field]);
      if (isNaN(value) || value < 1 || value > 5) {
        errors.push(`${field} debe ser un número entre 1 y 5`);
      }
    });
    
    return errors;
  };

  const validateMatchrimProfileRow = (row: CSVRow) => {
    const errors: string[] = [];
    
    if (!row.name) errors.push('Nombre es requerido');
    
    ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'].forEach(field => {
      const value = parseInt(row[field]);
      if (isNaN(value) || value < 1 || value > 5) {
        errors.push(`${field} debe ser un número entre 1 y 5`);
      }
    });
    
    return errors;
  };

  const importWines = async (data: CSVRow[]) => {
    const result: ImportResult = { success: 0, errors: [], warnings: [] };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      setProgress((i / data.length) * 100);
      
      const validationErrors = validateWineRow(row);
      if (validationErrors.length > 0) {
        result.errors.push(`Fila ${i + 2}: ${validationErrors.join(', ')}`);
        continue;
      }
      
      try {
        const wineData = {
          name: row.name,
          producer: row.producer || null,
          region: row.region || null,
          vintage: row.vintage ? parseInt(row.vintage) : null,
          estilo: row.estilo,
          potencia: parseInt(row.potencia),
          acidez: parseInt(row.acidez),
          dulzura: parseInt(row.dulzura),
          taninos: parseInt(row.taninos),
          afrutado: parseInt(row.afrutado),
          description: row.description || null,
          maridage_recommendations: row.maridage_recommendations ? 
            row.maridage_recommendations.split(';').map(s => s.trim()) : null
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
    const result: ImportResult = { success: 0, errors: [], warnings: [] };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      setProgress((i / data.length) * 100);
      
      const validationErrors = validateWineStyleRow(row);
      if (validationErrors.length > 0) {
        result.errors.push(`Fila ${i + 2}: ${validationErrors.join(', ')}`);
        continue;
      }
      
      try {
        const styleData = {
          name: row.name,
          description: row.description || null,
          potente: parseInt(row.potente),
          acidez: parseInt(row.acidez),
          dulce: parseInt(row.dulce),
          tanico: parseInt(row.tanico),
          afrutado: parseInt(row.afrutado)
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
    const result: ImportResult = { success: 0, errors: [], warnings: [] };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      setProgress((i / data.length) * 100);
      
      const validationErrors = validateMatchrimProfileRow(row);
      if (validationErrors.length > 0) {
        result.errors.push(`Fila ${i + 2}: ${validationErrors.join(', ')}`);
        continue;
      }
      
      try {
        const profileData = {
          name: row.name,
          description: row.description || null,
          potente: parseInt(row.potente),
          acidez: parseInt(row.acidez),
          dulce: parseInt(row.dulce),
          tanico: parseInt(row.tanico),
          afrutado: parseInt(row.afrutado),
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
        description: `${result.success} registros importados exitosamente`,
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
        return 'name,producer,region,vintage,estilo,potencia,acidez,dulzura,taninos,afrutado,description,maridage_recommendations';
      case 'wine_styles':
        return 'name,description,potente,acidez,dulce,tanico,afrutado';
      case 'matchrim_profiles':
        return 'name,description,potente,acidez,dulce,tanico,afrutado,grape_recommendations,region_recommendations,style_recommendations';
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
          
          <div className="space-y-2">
            <Label htmlFor="csv-file">Archivo CSV</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isLoading}
            />
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
                  {importResult.errors.length > 0 && `, ${importResult.errors.length} errores`}
                </AlertDescription>
              </Alert>
              
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
