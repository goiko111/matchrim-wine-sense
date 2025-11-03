import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const WineStylesCSVImporter = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const parseCSVWithSemicolon = (text: string): Array<Record<string, string>> => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(';').map(h => h.trim());
    console.log('Headers:', headers);

    return lines.slice(1).map(line => {
      const values = line.split(';').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      const text = await file.text();
      const data = parseCSVWithSemicolon(text);
      
      console.log(`Total filas a procesar: ${data.length}`);
      console.log('Primera fila:', data[0]);

      // Limpiar wine_styles existentes (solo las 7776 combinaciones)
      toast({
        title: "Limpiando datos existentes...",
        description: "Preparando para la importación",
      });

      const { error: deleteError } = await supabase
        .from('wine_styles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Borra todos excepto un ID imposible

      if (deleteError) {
        console.error('Error limpiando:', deleteError);
        toast({
          title: "Error",
          description: "No se pudieron limpiar los datos existentes",
          variant: "destructive",
        });
        return;
      }

      // Procesar en lotes
      const BATCH_SIZE = 500;
      let successCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, Math.min(i + BATCH_SIZE, data.length));
        
        const stylesToInsert = batch.map((row, index) => {
          const potente = parseInt(row.Potente || row.potente || '0');
          const acidez = parseInt(row.Acidez || row.acidez || '0');
          const dulzura = parseInt(row.Dulzura || row.dulzura || row.Dulce || row.dulce || '0');
          const taninos = parseInt(row.Taninos || row.taninos || row.Tánico || row.tanico || '0');
          const afrutado = parseInt(row.Afrutado || row.afrutado || '0');
          const estilo = row.Estilo || row.estilo || row.Style || row.style || '';

          if (!estilo) {
            errors.push(`Fila ${i + index + 2}: Falta nombre del estilo`);
            return null;
          }

          // Crear nombre con prefijo sensorial para mantener las combinaciones únicas
          const fullName = `${potente};${acidez};${dulzura};${taninos};${afrutado};${estilo}`;

          return {
            name: fullName,
            potente: Math.max(0, Math.min(5, potente)),
            acidez: Math.max(0, Math.min(5, acidez)),
            dulce: Math.max(0, Math.min(5, dulzura)),
            tanico: Math.max(0, Math.min(5, taninos)),
            afrutado: Math.max(0, Math.min(5, afrutado)),
            description: `Combinación sensorial para ${estilo}`
          };
        }).filter(Boolean);

        if (stylesToInsert.length > 0) {
          const { error } = await supabase
            .from('wine_styles')
            .insert(stylesToInsert);

          if (error) {
            console.error('Error insertando lote:', error);
            errors.push(`Error en lote ${i / BATCH_SIZE + 1}: ${error.message}`);
          } else {
            successCount += stylesToInsert.length;
          }
        }

        setProgress(Math.round(((i + batch.length) / data.length) * 100));
      }

      setResult({ success: successCount, errors });

      if (errors.length === 0) {
        toast({
          title: "Importación completada",
          description: `Se importaron ${successCount} estilos correctamente`,
        });
      } else {
        toast({
          title: "Importación completada con errores",
          description: `${successCount} éxitos, ${errors.length} errores`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Error procesando el archivo",
        variant: "destructive",
      });
      setResult({ success: 0, errors: [error.message] });
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar Estilos Winerim (CSV con punto y coma)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este importador está diseñado específicamente para el archivo GOIKO_ESTILOS_7776.csv
            que usa punto y coma (;) como separador.
          </AlertDescription>
        </Alert>

        <div>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              Procesando... {progress}%
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <Alert variant={result.errors.length > 0 ? "destructive" : "default"}>
              {result.errors.length === 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div>
                  <strong>Importados exitosamente:</strong> {result.success}
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-2">
                    <strong>Errores ({result.errors.length}):</strong>
                    <ul className="mt-1 text-xs max-h-40 overflow-y-auto">
                      {result.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>... y {result.errors.length - 10} errores más</li>
                      )}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WineStylesCSVImporter;
