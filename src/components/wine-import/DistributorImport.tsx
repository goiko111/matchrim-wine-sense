import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, TrendingDown, Minus, Camera, FileSpreadsheet, FileText, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DistributorOCRImport } from "./DistributorOCRImport";
import { DistributorCSVImport } from "./DistributorCSVImport";
import { DistributorPDFImport } from "./DistributorPDFImport";
import { DistributorTextImport } from "./DistributorTextImport";

interface WineWithPrice {
  nombre: string;
  bodega: string;
  precio: number;
  moneda: string;
  analisis?: {
    estado: 'correcto' | 'alto' | 'bajo';
    razonamiento: string;
    precio_medio_mercado?: number;
  };
}

export const DistributorImport = () => {
  const [activeTab, setActiveTab] = useState("csv");
  const [analyzing, setAnalyzing] = useState(false);
  const [wines, setWines] = useState<WineWithPrice[]>([]);

  const handleImportComplete = (importedWines: WineWithPrice[]) => {
    setWines(importedWines);
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
      {/* Import Methods Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="csv" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            CSV/Excel
          </TabsTrigger>
          <TabsTrigger value="ocr" className="gap-2">
            <Camera className="w-4 h-4" />
            OCR Imagen
          </TabsTrigger>
          <TabsTrigger value="pdf" className="gap-2">
            <FileText className="w-4 h-4" />
            PDF
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-2">
            <Type className="w-4 h-4" />
            Texto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="mt-6">
          <DistributorCSVImport onImportComplete={handleImportComplete} />
        </TabsContent>

        <TabsContent value="ocr" className="mt-6">
          <DistributorOCRImport onImportComplete={handleImportComplete} />
        </TabsContent>

        <TabsContent value="pdf" className="mt-6">
          <DistributorPDFImport onImportComplete={handleImportComplete} />
        </TabsContent>

        <TabsContent value="text" className="mt-6">
          <DistributorTextImport onImportComplete={handleImportComplete} />
        </TabsContent>
      </Tabs>

      {/* Analyze Button */}
      {wines.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleAnalyzePrices}
            disabled={analyzing}
            size="lg"
            className="bg-red-700 hover:bg-red-800"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analizando precios...
              </>
            ) : (
              <>Analizar Precios de {wines.length} Vinos</>
            )}
          </Button>
        </div>
      )}

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
                      {wine.precio.toFixed(2)} {wine.moneda}
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
                          Precio medio: {wine.analisis.precio_medio_mercado.toFixed(2)} {wine.moneda}
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