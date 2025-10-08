import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WineWithPrice {
  nombre: string;
  bodega: string;
  precio: number;
  analisis?: {
    estado: 'correcto' | 'alto' | 'bajo';
    razonamiento: string;
    precio_medio_mercado?: number;
  };
}

export const DistributorImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [wines, setWines] = useState<WineWithPrice[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setWines([]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Por favor, selecciona un archivo");
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          toast.error("El archivo está vacío");
          setLoading(false);
          return;
        }

        // Parsear CSV (asumiendo formato: nombre, bodega, precio)
        const parsedWines: WineWithPrice[] = [];
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const nombreIdx = headers.findIndex(h => h.includes('nombre') || h.includes('wine') || h.includes('vino'));
          const bodegaIdx = headers.findIndex(h => h.includes('bodega') || h.includes('winery') || h.includes('productor'));
          const precioIdx = headers.findIndex(h => h.includes('precio') || h.includes('price') || h.includes('€'));

          if (nombreIdx >= 0 && bodegaIdx >= 0 && precioIdx >= 0) {
            parsedWines.push({
              nombre: values[nombreIdx] || '',
              bodega: values[bodegaIdx] || '',
              precio: parseFloat(values[precioIdx]?.replace(/[^0-9.]/g, '')) || 0
            });
          }
        }

        setWines(parsedWines);
        toast.success(`${parsedWines.length} vinos importados`);
        setLoading(false);
      };

      reader.onerror = () => {
        toast.error("Error al leer el archivo");
        setLoading(false);
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing:', error);
      toast.error("Error al importar el archivo");
      setLoading(false);
    }
  };

  const handleAnalyzePrices = async () => {
    if (wines.length === 0) {
      toast.error("No hay vinos para analizar");
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-distributor-prices', {
        body: { wines }
      });

      if (error) throw error;

      setWines(data.wines);
      toast.success("Análisis de precios completado");
    } catch (error) {
      console.error('Error analyzing prices:', error);
      toast.error("Error al analizar precios");
    } finally {
      setAnalyzing(false);
    }
  };

  const getPriceIcon = (estado?: string) => {
    if (estado === 'alto') return <TrendingUp className="w-4 h-4 text-red-600" />;
    if (estado === 'bajo') return <TrendingDown className="w-4 h-4 text-green-600" />;
    return <Minus className="w-4 h-4 text-blue-600" />;
  };

  const getPriceBadgeVariant = (estado?: string) => {
    if (estado === 'alto') return "destructive";
    if (estado === 'bajo') return "default";
    return "secondary";
  };

  const getPriceLabel = (estado?: string) => {
    if (estado === 'alto') return "Precio Alto";
    if (estado === 'bajo') return "Precio Bajo";
    return "Precio Correcto";
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="distributor-file" className="text-red-900">
            Carta de Distribuidor (CSV)
          </Label>
          <p className="text-sm text-gray-600 mb-2">
            Formato: Nombre del vino, Bodega, Precio
          </p>
          <Input
            id="distributor-file"
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="border-red-200"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!file || loading}
            className="bg-red-700 hover:bg-red-800"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </>
            )}
          </Button>

          {wines.length > 0 && (
            <Button
              onClick={handleAnalyzePrices}
              disabled={analyzing}
              variant="outline"
              className="border-red-700 text-red-700 hover:bg-red-50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>Analizar Precios</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Results Section */}
      {wines.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-red-900">
            Vinos Importados ({wines.length})
          </h3>
          <div className="grid gap-4">
            {wines.map((wine, index) => (
              <Card key={index} className="p-4 border-red-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900">{wine.nombre}</h4>
                    <p className="text-sm text-gray-600">{wine.bodega}</p>
                    <p className="text-lg font-bold text-red-700 mt-1">
                      {wine.precio.toFixed(2)}€
                    </p>
                  </div>
                  
                  {wine.analisis && (
                    <div className="flex flex-col items-end gap-2">
                      <Badge 
                        variant={getPriceBadgeVariant(wine.analisis.estado)}
                        className="flex items-center gap-1"
                      >
                        {getPriceIcon(wine.analisis.estado)}
                        {getPriceLabel(wine.analisis.estado)}
                      </Badge>
                      {wine.analisis.precio_medio_mercado && (
                        <p className="text-xs text-gray-600">
                          Precio medio: {wine.analisis.precio_medio_mercado.toFixed(2)}€
                        </p>
                      )}
                      <p className="text-sm text-gray-700 text-right max-w-md">
                        {wine.analisis.razonamiento}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};