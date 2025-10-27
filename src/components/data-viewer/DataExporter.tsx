import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const DataExporter = () => {
  const [exporting, setExporting] = useState<string | null>(null);

  // Fetch all rows in pages to bypass PostgREST limits
  const fetchAll = async <T,>(table: string, orderBy: string) => {
    const pageSize = 1000;
    let all: T[] = [];
    let hasMore = true;
    let lastValue: any = null;

    while (hasMore) {
      let query = supabase
        .from(table as any)
        .select('*')
        .order(orderBy as any, { ascending: true })
        .limit(pageSize);

      // Use cursor-based pagination instead of offset
      if (lastValue !== null) {
        query = query.gt(orderBy as any, lastValue);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      const batch = (data || []) as T[];
      
      if (batch.length === 0) {
        hasMore = false;
      } else {
        all = all.concat(batch);
        lastValue = batch[batch.length - 1][orderBy];
        hasMore = batch.length === pageSize;
      }
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

  const extractSensoryValues = (name: string) => {
    const match = name.match(/^(\d+);(\d+);(\d+);(\d+);(\d+);/);
    if (match) {
      return {
        potente: parseInt(match[1]),
        acidez: parseInt(match[2]),
        dulce: parseInt(match[3]),
        tanico: parseInt(match[4]),
        afrutado: parseInt(match[5])
      };
    }
    return null;
  };

  const cleanName = (name: string) => {
    return name
      .replace(/^\d+;\d+;\d+;\d+;\d+;/, '')
      .replace(/\s*\(\d+\)\s*$/, '')
      .trim();
  };

  const exportWineStyles = async () => {
    setExporting('styles');
    try {
      const data = await fetchAll<any>('wine_styles', 'name');

      // Export only name and sensory attributes, extracting from name prefix
      const exportData = data.map((style: any) => {
        const sensoryValues = extractSensoryValues(style.name);
        return {
          nombre: cleanName(style.name),
          potente: sensoryValues?.potente ?? style.potente,
          acidez: sensoryValues?.acidez ?? style.acidez,
          dulce: sensoryValues?.dulce ?? style.dulce,
          tanico: sensoryValues?.tanico ?? style.tanico,
          afrutado: sensoryValues?.afrutado ?? style.afrutado
        };
      });

      downloadCSV(exportData, 'estilos_vino_winerim.csv');
      
      toast({
        title: "Exportación exitosa",
        description: `${exportData.length} estilos de vino exportados correctamente`,
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


  const exportMatchrimProfiles = async () => {
    setExporting('profiles');
    try {
      const data = await fetchAll<any>('matchrim_profiles', 'name');

      // Export only name and sensory attributes, extracting from name prefix
      const exportData = data.map((profile: any) => {
        const sensoryValues = extractSensoryValues(profile.name);
        return {
          nombre: cleanName(profile.name),
          potente: sensoryValues?.potente ?? profile.potente,
          acidez: sensoryValues?.acidez ?? profile.acidez,
          dulce: sensoryValues?.dulce ?? profile.dulce,
          tanico: sensoryValues?.tanico ?? profile.tanico,
          afrutado: sensoryValues?.afrutado ?? profile.afrutado
        };
      });

      downloadCSV(exportData, 'perfiles_matchrim.csv');
      
      toast({
        title: "Exportación exitosa",
        description: `${exportData.length} perfiles Matchrim exportados correctamente`,
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
              Nombre y atributos sensoriales de todos los estilos
            </p>
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
                  Exportar Estilos
                </>
              )}
            </Button>
          </div>

          {/* Export Matchrim Profiles */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Perfiles Matchrim</h3>
            <p className="text-sm text-muted-foreground">
              Nombre y atributos sensoriales de todos los perfiles
            </p>
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
                  Exportar Perfiles
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Información sobre los archivos:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Los archivos se descargan en formato CSV compatible con Excel</li>
            <li>• Cada archivo incluye el nombre y los 5 atributos sensoriales: potente, acidez, dulce, tanico, afrutado</li>
            <li>• Para abrir en Excel: Archivo → Abrir → Seleccionar archivo CSV</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataExporter;