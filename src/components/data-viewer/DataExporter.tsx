import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const DataExporter = () => {
  const [exporting, setExporting] = useState<string | null>(null);

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
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .order('name');

      if (error) throw error;

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
      const { data, error } = await supabase
        .from('wine_styles')
        .select('*')
        .order('name');

      if (error) throw error;

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

  const exportMatchrimProfiles = async () => {
    setExporting('profiles');
    try {
      const { data, error } = await supabase
        .from('matchrim_profiles')
        .select('*')
        .order('name');

      if (error) throw error;

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Export Wines */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Vinos</h3>
            <p className="text-sm text-gray-600">
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
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Estilos de Vino</h3>
            <p className="text-sm text-gray-600">
              Los 16 estilos Winerim con sus descripciones y atributos
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
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Perfiles Matchrim</h3>
            <p className="text-sm text-gray-600">
              Todos los perfiles con recomendaciones de cepas y regiones
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

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Información sobre los archivos:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Los archivos se descargan en formato CSV compatible con Excel</li>
            <li>• Vinos: ~6,781 registros con todos los atributos sensoriales</li>
            <li>• Estilos: ~7,778 registros incluyendo variantes numéricas</li>
            <li>• Perfiles: ~7,776 registros con recomendaciones completas</li>
            <li>• Para abrir en Excel: Archivo → Abrir → Seleccionar archivo CSV</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataExporter;