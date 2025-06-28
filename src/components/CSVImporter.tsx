
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertTriangle, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { parseCSVFile } from '@/utils/csvParser';
import { importWines, importWineStyles, importMatchrimProfiles } from '@/services/csvImport';
import { ImportResult, CSVRow, DuplicateStrategy, ImportType } from '@/types/csv';
import CSVUpload from './csv/CSVUpload';
import CSVPreview from './csv/CSVPreview';
import ImportProgress from './csv/ImportProgress';
import ImportResults from './csv/ImportResults';

const CSVImporter = () => {
  const [selectedType, setSelectedType] = useState<ImportType>('wines');
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      try {
        const data = await parseCSVFile(selectedFile);
        setCsvData(data);
        console.log('=== DATOS CSV CARGADOS ===');
        console.log('Número de filas:', data.length);
        if (data.length > 0) {
          console.log('Primera fila (ejemplo):', data[0]);
          console.log('Columnas detectadas:', Object.keys(data[0]));
          console.log('Todas las columnas y sus valores en la primera fila:');
          Object.entries(data[0]).forEach(([key, value]) => {
            console.log(`  "${key}": "${value}"`);
          });
        }
        console.log('=== FIN DATOS CSV ===');
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          title: "Error",
          description: "Error al procesar el archivo CSV",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo CSV válido",
        variant: "destructive"
      });
    }
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
    
    console.log(`Iniciando importación: ${selectedType}, estrategia: ${duplicateStrategy}, ${csvData.length} filas`);
    setIsLoading(true);
    setProgress(0);
    setImportResult(null);
    
    try {
      let result: ImportResult;
      
      switch (selectedType) {
        case 'wines':
          result = await importWines(csvData, duplicateStrategy, setProgress);
          break;
        case 'wine_styles':
          result = await importWineStyles(csvData, duplicateStrategy, setProgress);
          break;
        case 'matchrim_profiles':
          result = await importMatchrimProfiles(csvData, duplicateStrategy, setProgress);
          break;
        default:
          throw new Error('Tipo de importación no válido');
      }
      
      setImportResult(result);
      setProgress(100);
      
      console.log('Importación completada:', result);
      toast({
        title: "Importación completada",
        description: `${result.success} registros importados, ${result.skipped} omitidos, ${result.updated} actualizados`,
      });
      
    } catch (error: any) {
      console.error('Error en la importación:', error);
      toast({
        title: "Error en la importación",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      console.log('Estado de carga establecido a false');
    }
  };

  console.log(`Estado actual: isLoading=${isLoading}, progress=${progress}, csvData.length=${csvData.length}`);

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
          {/* Información detallada de debug */}
          {csvData.length > 0 && (
            <div className="space-y-3">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Información del archivo:</strong><br />
                  - Filas cargadas: {csvData.length}<br />
                  - Tipo de importación: {selectedType}<br />
                  - Estrategia de duplicados: {duplicateStrategy}<br />
                  - Estado: {isLoading ? 'Importando...' : 'Listo para importar'}<br />
                  - Progreso: {Math.round(progress)}%
                </AlertDescription>
              </Alert>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Primeras 3 columnas detectadas:</strong><br />
                  {csvData.length > 0 ? Object.keys(csvData[0]).slice(0, 3).map(col => `"${col}"`).join(', ') : 'Ninguna'}<br />
                  {csvData.length > 0 && Object.keys(csvData[0]).length > 3 && (
                    <>
                      <strong>Total de columnas:</strong> {Object.keys(csvData[0]).length}<br />
                      <strong>Todas las columnas:</strong> {Object.keys(csvData[0]).map(col => `"${col}"`).join(', ')}
                    </>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          <CSVUpload
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            duplicateStrategy={duplicateStrategy}
            onDuplicateStrategyChange={setDuplicateStrategy}
            onFileChange={handleFileChange}
            isLoading={isLoading}
          />
          
          <CSVPreview csvData={csvData} />
          
          <ImportProgress isLoading={isLoading} progress={progress} />
          
          <Button 
            onClick={handleImport} 
            disabled={!csvData.length || isLoading}
            className="w-full"
          >
            {isLoading ? 'Importando...' : 'Importar Datos'}
          </Button>
          
          <ImportResults importResult={importResult} />
        </CardContent>
      </Card>
    </div>
  );
};

export default CSVImporter;
