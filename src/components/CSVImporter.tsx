
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertTriangle } from 'lucide-react';
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
          {/* Debug info */}
          {csvData.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Estado: {isLoading ? 'Importando...' : 'Listo para importar'} | 
                Progreso: {Math.round(progress)}% | 
                Filas: {csvData.length} | 
                Tipo: {selectedType} | 
                Estrategia: {duplicateStrategy}
                <br />
                <strong>Columnas detectadas:</strong> {csvData.length > 0 ? Object.keys(csvData[0]).join(', ') : 'Ninguna'}
              </AlertDescription>
            </Alert>
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
