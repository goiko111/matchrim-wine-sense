import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Search, Trash2, Wine, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/contexts/AuthContext";
import { WineImporter, WineImportData } from "@/components/wine-import/WineImporter";

interface WineSearchResult extends WineImportData {
  puntuacion?: number;
  url?: string;
  imagen_url?: string;
  searching?: boolean;
  searchResult?: any;
}

const WineImport = () => {
  const { user } = useAuth();
  const [wines, setWines] = useState<WineSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleImportComplete = (importedWines: WineImportData[]) => {
    setWines(importedWines.map(w => ({ ...w, searching: false })));
  };

  const searchWine = async (wine: WineSearchResult, index: number) => {
    const updatedWines = [...wines];
    updatedWines[index].searching = true;
    setWines(updatedWines);

    try {
      const query = `${wine.nombre} ${wine.bodega}`.trim();
      
      const { data, error } = await supabase.functions.invoke('wine-search', {
        body: {
          query,
          country: wine.pais || undefined,
          grape: wine.uva || undefined,
          region: wine.region || undefined,
        },
      });

      if (error) throw error;

      if (data.resultados && data.resultados.length > 0) {
        const result = data.resultados[0]; // Usar el primer resultado
        updatedWines[index] = {
          ...updatedWines[index],
          puntuacion: result.puntuacion,
          url: result.url,
          imagen_url: result.imagen_url,
          searchResult: result,
          searching: false,
        };
        toast.success(`Encontrado: ${result.nombre}`);
      } else {
        updatedWines[index].searching = false;
        toast.info(`No se encontró información para ${wine.nombre}`);
      }

      setWines(updatedWines);
    } catch (error) {
      console.error('Error searching wine:', error);
      updatedWines[index].searching = false;
      setWines(updatedWines);
      toast.error(`Error al buscar ${wine.nombre}`);
    }
  };

  const searchAllWines = async () => {
    setSearching(true);
    
    for (let i = 0; i < wines.length; i++) {
      if (!wines[i].searchResult) {
        await searchWine(wines[i], i);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setSearching(false);
    toast.success("Búsqueda completada");
  };

  const removeWine = (index: number) => {
    setWines(wines.filter((_, i) => i !== index));
  };

  const exportResults = () => {
    const csv = [
      'Nombre,Bodega,Region,Pais,Uva,Añada,Puntuacion,URL',
      ...wines.map(w => 
        `"${w.nombre}","${w.bodega}","${w.region || ''}","${w.pais || ''}","${w.uva || ''}","${w.anada || ''}","${w.puntuacion || ''}","${w.url || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vinos-resultados.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Resultados exportados");
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "bg-gray-100 text-gray-800 border-gray-200";
    if (score >= 90) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 80) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <>
      {user && <AppNav />}
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-rose-50 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Wine className="w-12 h-12 text-red-700" />
              <h1 className="text-4xl md:text-5xl font-bold text-red-900">
                Importador de Vinos
              </h1>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Importa múltiples vinos y búscalos automáticamente
            </p>
          </div>

          {/* Importer */}
          {wines.length === 0 ? (
            <WineImporter onImportComplete={handleImportComplete} />
          ) : (
            <div className="space-y-6">
              {/* Actions */}
              <Card className="shadow-lg border-red-100">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-4">
                    <Button
                      onClick={searchAllWines}
                      disabled={searching}
                      className="bg-red-700 hover:bg-red-800"
                    >
                      {searching ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Buscar Todos ({wines.filter(w => !w.searchResult).length})
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={exportResults}
                      variant="outline"
                      disabled={wines.length === 0}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar CSV
                    </Button>

                    <Button
                      onClick={() => setWines([])}
                      variant="outline"
                    >
                      Nueva Importación
                    </Button>

                    <div className="ml-auto text-sm text-gray-600">
                      Total: {wines.length} vinos | Buscados: {wines.filter(w => w.searchResult).length}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wines.map((wine, index) => (
                  <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow border-red-100">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <h3 className="font-bold text-red-900">{wine.nombre}</h3>
                              <p className="text-sm text-gray-600">{wine.bodega}</p>
                            </div>
                            {wine.puntuacion && (
                              <Badge className={`${getScoreColor(wine.puntuacion)} font-bold`}>
                                {wine.puntuacion}
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-gray-500 space-y-1">
                            {wine.region && <p>Región: {wine.region}</p>}
                            {wine.pais && <p>País: {wine.pais}</p>}
                            {wine.uva && <p>Uva: {wine.uva}</p>}
                            {wine.anada && <p>Añada: {wine.anada}</p>}
                          </div>

                          <Separator className="my-3" />

                          <div className="flex gap-2">
                            {wine.searchResult ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => wine.url && window.open(wine.url, '_blank')}
                                disabled={!wine.url}
                              >
                                Ver Detalles
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => searchWine(wine, index)}
                                disabled={wine.searching || searching}
                                className="bg-red-700 hover:bg-red-800"
                              >
                                {wine.searching ? (
                                  <>
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    Buscando...
                                  </>
                                ) : (
                                  <>
                                    <Search className="mr-2 h-3 w-3" />
                                    Buscar
                                  </>
                                )}
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeWine(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WineImport;
