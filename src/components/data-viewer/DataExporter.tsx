import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const DataExporter = () => {
  const [exporting, setExporting] = useState<string | null>(null);

  // Fetch all rows in pages of 1000 to bypass PostgREST page limit
  const fetchAll = async <T,>(table: string, orderBy: string) => {
    const pageSize = 1000;
    let from = 0;
    let all: T[] = [];
    while (true) {
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .order(orderBy as any, { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const batch = (data || []) as T[];
      all = all.concat(batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    return all;
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay datos para exportar",
        variant: "destructive"
      });
      return;
    }

    // Get headers from the first object
    const headers = Object.keys(data[0]);
    
    // Convert data to CSV format
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle null, undefined, arrays, and objects
          if (value === null || value === undefined) return '';
          if (Array.isArray(value)) return `"${value.join('; ')}"`;
          if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
          // Escape quotes and wrap in quotes if contains comma or quote
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportWines = async () => {
    setExporting('wines');
    try {
      const data = await fetchAll<any>('wines', 'name');

      downloadCSV(data, 'vinos_winerim.csv');
      
      toast({
        title: "Exportación exitosa",
        description: `${data.length} vinos exportados correctamente`,
      });
    } catch (error: any) {
      console.error('Error exporting wines:', error);
      toast({
        title: "Error",
        description: `Error al exportar vinos: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setExporting(null);
    }
  };

  const exportWineStyles = async () => {
    setExporting('styles');
    try {
      const data = await fetchAll<any>('wine_styles', 'name');

      downloadCSV(data, 'estilos_vino_winerim.csv');
      
      toast({
        title: "Exportación exitosa",
        description: `${data.length} estilos de vino exportados correctamente`,
      });
    } catch (error: any) {
      console.error('Error exporting wine styles:', error);
      toast({
        title: "Error",
        description: `Error al exportar estilos: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setExporting(null);
    }
  };

  const exportWineStyleCombinations = async () => {
    setExporting('style-combinations');
    try {
      const data = await fetchAll<any>('wine_styles', 'name');
      
      // Create unique combinations based on the 5 sensory attributes
      const combinationsMap = new Map<string, any>();
      
      data.forEach((style: any) => {
        const key = `${style.potente}-${style.acidez}-${style.dulce}-${style.tanico}-${style.afrutado}`;
        if (!combinationsMap.has(key)) {
          combinationsMap.set(key, {
            potente: style.potente,
            acidez: style.acidez,
            dulce: style.dulce,
            tanico: style.tanico,
            afrutado: style.afrutado,
            ejemplo_estilo: style.name
          });
        }
      });

      const combinations = Array.from(combinationsMap.values());
      downloadCSV(combinations, 'combinaciones_estilos_winerim.csv');
      
      toast({
        title: "Exportación exitosa",
        description: `${combinations.length} combinaciones únicas de atributos exportadas`,
      });
    } catch (error: any) {
      console.error('Error exporting style combinations:', error);
      toast({
        title: "Error",
        description: `Error al exportar combinaciones: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setExporting(null);
    }
  };

  const exportMatchrimProfiles = async () => {
    setExporting('profiles');
    try {
      const data = await fetchAll<any>('matchrim_profiles', 'name');

      downloadCSV(data, 'perfiles_matchrim.csv');
      
      toast({
        title: "Exportación exitosa",
        description: `${data.length} perfiles Matchrim exportados correctamente`,
      });
    } catch (error: any) {
      console.error('Error exporting matchrim profiles:', error);
      toast({
        title: "Error",
        description: `Error al exportar perfiles: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setExporting(null);
    }
  };

  const exportProfileCombinations = async () => {
    setExporting('profile-combinations');
    try {
      const data = await fetchAll<any>('matchrim_profiles', 'name');
      
      // Create unique combinations based on the 5 sensory attributes
      const combinationsMap = new Map<string, any>();
      
      data.forEach((profile: any) => {
        const key = `${profile.potente}-${profile.acidez}-${profile.dulce}-${profile.tanico}-${profile.afrutado}`;
        if (!combinationsMap.has(key)) {
          combinationsMap.set(key, {
            potente: profile.potente,
            acidez: profile.acidez,
            dulce: profile.dulce,
            tanico: profile.tanico,
            afrutado: profile.afrutado,
            ejemplo_perfil: profile.name
          });
        }
      });

      const combinations = Array.from(combinationsMap.values());
      downloadCSV(combinations, 'combinaciones_perfiles_matchrim.csv');
      
      toast({
        title: "Exportación exitosa",
        description: `${combinations.length} combinaciones únicas de atributos exportadas`,
      });
    } catch (error: any) {
      console.error('Error exporting profile combinations:', error);
      toast({
        title: "Error",
        description: `Error al exportar combinaciones: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Exportar Datos a Excel/CSV
        </CardTitle>
        <CardDescription>
          Descarga los datos en formato CSV que pueden abrirse en Excel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Wines */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Vinos</h3>
            <p className="text-sm text-muted-foreground">
              Todos los vinos con sus características sensoriales y metadatos
            </p>
            <Button 
              onClick={exportWines}
              disabled={exporting === 'wines'}
              className="w-full"
              variant="outline"
            >
              {exporting === 'wines' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Vinos
                </>
              )}
            </Button>
          </div>

          {/* Export Wine Styles */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Estilos de Vino</h3>
            <p className="text-sm text-muted-foreground">
              Los estilos Winerim con sus descripciones y atributos
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={exportWineStyles}
                disabled={exporting === 'styles'}
                className="w-full"
                variant="outline"
              >
                {exporting === 'styles' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Todos
                  </>
                )}
              </Button>
              <Button 
                onClick={exportWineStyleCombinations}
                disabled={exporting === 'style-combinations'}
                className="w-full"
                variant="secondary"
              >
                {exporting === 'style-combinations' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Combinaciones Únicas
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Export Matchrim Profiles */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Perfiles Matchrim</h3>
            <p className="text-sm text-muted-foreground">
              Perfiles con recomendaciones de cepas y regiones
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={exportMatchrimProfiles}
                disabled={exporting === 'profiles'}
                className="w-full"
                variant="outline"
              >
                {exporting === 'profiles' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Todos
                  </>
                )}
              </Button>
              <Button 
                onClick={exportProfileCombinations}
                disabled={exporting === 'profile-combinations'}
                className="w-full"
                variant="secondary"
              >
                {exporting === 'profile-combinations' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Combinaciones Únicas
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Información sobre los archivos:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Los archivos se descargan en formato CSV compatible con Excel</li>
            <li>• <strong>Exportar Todos:</strong> Incluye todos los registros con todos sus campos</li>
            <li>• <strong>Combinaciones Únicas:</strong> Solo las combinaciones únicas de los 5 atributos sensoriales (potente, acidez, dulce, tanico, afrutado)</li>
            <li>• Para abrir en Excel: Archivo → Abrir → Seleccionar archivo CSV</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataExporter;