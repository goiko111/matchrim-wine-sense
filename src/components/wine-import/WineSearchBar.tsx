import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Wine as WineIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Wine {
  id: string;
  name: string;
  producer: string | null;
  region: string | null;
  vintage: number | null;
  grape_varieties: string[] | null;
  tipo?: string | null;
  estilo: string;
}

interface WineSearchBarProps {
  onSelectWine: (wine: Wine) => void;
}

export const WineSearchBar = ({ onSelectWine }: WineSearchBarProps) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Wine[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-wines', {
        body: { query: searchQuery, limit: 10 }
      });

      if (error) throw error;

      setResults(data.wines || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching wines:', error);
      toast.error("Error al buscar vinos");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWine = (wine: Wine) => {
    onSelectWine(wine);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Busca vino o bodega..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 max-h-96 overflow-y-auto shadow-lg">
          <CardContent className="p-2">
            {results.map((wine) => (
              <button
                key={wine.id}
                onClick={() => handleSelectWine(wine)}
                className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors"
              >
                <div className="flex items-start gap-3">
                  <WineIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{wine.name}</p>
                    {wine.producer && (
                      <p className="text-sm text-muted-foreground truncate">{wine.producer}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {wine.vintage && (
                        <Badge variant="outline" className="text-xs">{wine.vintage}</Badge>
                      )}
                      {wine.region && (
                        <Badge variant="outline" className="text-xs">{wine.region}</Badge>
                      )}
                      {wine.tipo && (
                        <Badge variant="outline" className="text-xs">{wine.tipo}</Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">{wine.estilo}</Badge>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {showResults && results.length === 0 && !loading && query.length >= 2 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            No se encontraron vinos. Prueba con otro término de búsqueda.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
