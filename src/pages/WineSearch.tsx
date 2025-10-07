import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Loader2, Wine, ExternalLink, Lightbulb, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WineResult {
  nombre: string;
  bodega: string;
  tipo_de_uva: string;
  pais: string;
  puntuacion: number;
  url: string;
}

interface SearchResponse {
  razonamiento: string;
  resultados: WineResult[];
}

// Lista exhaustiva de variedades de uva
const GRAPE_VARIETIES = [
  "Tempranillo", "Malbec", "Cabernet Sauvignon", "Merlot", "Pinot Noir", "Syrah", "Garnacha",
  "Chardonnay", "Sauvignon Blanc", "Albariño", "Verdejo", "Riesling", "Viognier",
  "Monastrell", "Mencía", "Graciano", "Mazuelo", "Cariñena", "Bobal", "Prieto Picudo",
  "Sangiovese", "Nebbiolo", "Barbera", "Corvina", "Montepulciano", "Nero d'Avola",
  "Grenache", "Mourvèdre", "Carignan", "Cinsault", "Counoise",
  "Cabernet Franc", "Petit Verdot", "Malbec", "Tannat", "Carmenère",
  "Zinfandel", "Petite Sirah", "Primitivo",
  "Shiraz", "Pinotage", "Chenin Blanc",
  "Gewürztraminer", "Grüner Veltliner", "Müller-Thurgau",
  "Moscatel", "Pedro Ximénez", "Palomino", "Airén", "Macabeo", "Parellada", "Xarel·lo",
  "Godello", "Treixadura", "Loureira", "Torrontés",
  "Semillon", "Marsanne", "Roussanne", "Viura",
  "Pinot Grigio", "Pinot Gris", "Pinot Blanc",
  "Gamay", "Dolcetto", "Freisa", "Grignolino",
  "Aglianico", "Negroamaro", "Primitivo",
  "Touriga Nacional", "Touriga Franca", "Tinta Roriz", "Tinta Barroca",
  "Aragonês", "Trincadeira", "Castelão", "Baga", "Alvarinho", "Loureiro", "Arinto",
  "Assyrtiko", "Agiorgitiko", "Xinomavro",
  "Zweigelt", "Blaufränkisch", "St. Laurent",
  "Kadarka", "Furmint", "Hárslevelű",
  "Saperavi", "Rkatsiteli",
  "Mavrud", "Melnik",
  "Fetească Neagră", "Fetească Regală", "Tămâioasă Românească",
  "Prokupac", "Vranac", "Plavac Mali",
  "Crljenak Kaštelanski", "Pošip", "Malvasia Istriana"
].sort();

// Lista exhaustiva de regiones vitivinícolas
const WINE_REGIONS = [
  // España
  "Rioja", "Ribera del Duero", "Priorat", "Rías Baixas", "Rueda", "Toro", "Bierzo", "Jumilla",
  "Penedès", "Montsant", "Somontano", "Navarra", "Valdepeñas", "La Mancha", "Utiel-Requena",
  "Yecla", "Alicante", "Valencia", "Campo de Borja", "Cariñena", "Calatayud", "Méntrida",
  // Francia
  "Bordeaux", "Borgoña", "Champagne", "Valle del Ródano", "Valle del Loira", "Alsacia",
  "Languedoc-Roussillon", "Provenza", "Beaujolais", "Jura", "Saboya", "Sud-Ouest",
  "Pomerol", "Saint-Émilion", "Médoc", "Graves", "Sauternes", "Chablis", "Côte de Nuits",
  "Côte de Beaune", "Châteauneuf-du-Pape", "Hermitage", "Côte-Rôtie", "Condrieu",
  // Italia
  "Toscana", "Piamonte", "Veneto", "Sicilia", "Puglia", "Friuli-Venezia Giulia", "Lombardía",
  "Chianti", "Brunello di Montalcino", "Barolo", "Barbaresco", "Amarone", "Valpolicella",
  "Franciacorta", "Montepulciano d'Abruzzo", "Primitivo di Manduria",
  // Portugal
  "Douro", "Alentejo", "Dão", "Vinho Verde", "Bairrada", "Lisboa", "Tejo", "Península de Setúbal",
  // Alemania
  "Mosel", "Rheingau", "Pfalz", "Rheinhessen", "Baden", "Franconia", "Nahe",
  // Argentina
  "Mendoza", "Salta", "San Juan", "Patagonia", "Valle de Uco", "Luján de Cuyo", "Cafayate",
  // Chile
  "Valle de Maipo", "Valle de Colchagua", "Valle de Casablanca", "Valle de Aconcagua",
  "Valle del Maule", "Valle de Curicó", "Valle de Limarí", "Valle de Elqui",
  // Estados Unidos
  "Napa Valley", "Sonoma", "Paso Robles", "Santa Barbara", "Willamette Valley",
  "Columbia Valley", "Finger Lakes", "Long Island",
  // Australia
  "Barossa Valley", "Margaret River", "Hunter Valley", "McLaren Vale", "Yarra Valley",
  "Coonawarra", "Clare Valley", "Adelaide Hills",
  // Nueva Zelanda
  "Marlborough", "Central Otago", "Hawke's Bay", "Martinborough", "Waipara Valley",
  // Sudáfrica
  "Stellenbosch", "Paarl", "Constantia", "Swartland", "Franschhoek", "Walker Bay",
  // Otros países
  "Tokaj (Hungría)", "Santorini (Grecia)", "Nemea (Grecia)", "Finger Lakes (USA)",
  "Wachau (Austria)", "Kamptal (Austria)", "Goriška Brda (Eslovenia)"
].sort();

const WineSearch = () => {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState<string>("");
  const [grape, setGrape] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [winery, setWinery] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [openGrapeCombobox, setOpenGrapeCombobox] = useState(false);
  const [openRegionCombobox, setOpenRegionCombobox] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error("Por favor, introduce un término de búsqueda");
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('wine-search', {
        body: {
          query: query.trim(),
          country: country || undefined,
          grape: grape || undefined,
          type: type || undefined,
          winery: winery || undefined,
          region: region || undefined,
        },
      });

      if (error) throw error;

      setResponse(data);
      
      if (data.resultados.length === 0) {
        toast.info("No se encontraron vinos con esos criterios. Intenta ajustar tu búsqueda.");
      }
    } catch (error) {
      console.error('Error searching wines:', error);
      toast.error("Error al buscar vinos. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 80) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-rose-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wine className="w-12 h-12 text-red-700" />
            <h1 className="text-4xl md:text-5xl font-bold text-red-900">
              Buscador de Vinos
            </h1>
          </div>
          <Badge variant="outline" className="text-red-700 border-red-300">
            Beta
          </Badge>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Encuentra vinos de todo el mundo. Busca por nombre, bodega, variedad de uva, región o país.
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8 shadow-lg border-red-100">
          <CardHeader>
            <CardTitle className="text-red-900">Búsqueda de Vinos</CardTitle>
            <CardDescription>
              Introduce el nombre del vino, bodega, uva o región que buscas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              {/* Main Search Input */}
              <div>
                <Label htmlFor="query" className="text-red-900">
                  Término de búsqueda
                </Label>
                <Input
                  id="query"
                  type="text"
                  placeholder="Ej: 'malbec argentino', 'rioja tempranillo artuke', 'château margaux'"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="mt-1.5 border-red-200 focus:border-red-400"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* País */}
                <div>
                  <Label htmlFor="country" className="text-red-900">
                    País (opcional)
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="country" className="mt-1.5 border-red-200">
                      <SelectValue placeholder="Cualquier país" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">Cualquier país</SelectItem>
                      <SelectItem value="España">España</SelectItem>
                      <SelectItem value="Francia">Francia</SelectItem>
                      <SelectItem value="Italia">Italia</SelectItem>
                      <SelectItem value="Argentina">Argentina</SelectItem>
                      <SelectItem value="Chile">Chile</SelectItem>
                      <SelectItem value="Estados Unidos">Estados Unidos</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                      <SelectItem value="Portugal">Portugal</SelectItem>
                      <SelectItem value="Alemania">Alemania</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="grape" className="text-red-900">
                    Uva (opcional)
                  </Label>
                  <Popover open={openGrapeCombobox} onOpenChange={setOpenGrapeCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openGrapeCombobox}
                        className="w-full justify-between mt-1.5 border-red-200 hover:border-red-400"
                      >
                        {grape ? grape : "Buscar variedad de uva..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-white" align="start">
                      <Command className="bg-white">
                        <CommandInput placeholder="Buscar uva..." className="border-0" />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>No se encontró esa variedad.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                setGrape("");
                                setOpenGrapeCombobox(false);
                              }}
                              className="hover:bg-red-50"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  grape === "" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Cualquier uva
                            </CommandItem>
                            {GRAPE_VARIETIES.map((variety) => (
                              <CommandItem
                                key={variety}
                                value={variety}
                                onSelect={(currentValue) => {
                                  setGrape(currentValue === grape ? "" : currentValue);
                                  setOpenGrapeCombobox(false);
                                }}
                                className="hover:bg-red-50"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    grape === variety ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {variety}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="type" className="text-red-900">
                    Tipo (opcional)
                  </Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type" className="mt-1.5 border-red-200">
                      <SelectValue placeholder="Cualquier tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">Cualquier tipo</SelectItem>
                      <SelectItem value="Tinto">Tinto</SelectItem>
                      <SelectItem value="Blanco">Blanco</SelectItem>
                      <SelectItem value="Rosado">Rosado</SelectItem>
                      <SelectItem value="Espumoso">Espumoso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Región */}
                <div>
                  <Label htmlFor="region" className="text-red-900">
                    Región (opcional)
                  </Label>
                  <Popover open={openRegionCombobox} onOpenChange={setOpenRegionCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openRegionCombobox}
                        className="w-full justify-between mt-1.5 border-red-200 hover:border-red-400"
                      >
                        {region ? region : "Buscar región..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-white" align="start">
                      <Command className="bg-white">
                        <CommandInput placeholder="Buscar región..." className="border-0" />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>No se encontró esa región.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                setRegion("");
                                setOpenRegionCombobox(false);
                              }}
                              className="hover:bg-red-50"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  region === "" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Cualquier región
                            </CommandItem>
                            {WINE_REGIONS.map((reg) => (
                              <CommandItem
                                key={reg}
                                value={reg}
                                onSelect={(currentValue) => {
                                  setRegion(currentValue === region ? "" : currentValue);
                                  setOpenRegionCombobox(false);
                                }}
                                className="hover:bg-red-50"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    region === reg ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {reg}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Tipo */}
                <div>
                  <Label htmlFor="winery" className="text-red-900">
                    Bodega (opcional)
                  </Label>
                  <Input
                    id="winery"
                    type="text"
                    placeholder="Ej: Marqués de Riscal, Catena Zapata..."
                    value={winery}
                    onChange={(e) => setWinery(e.target.value)}
                    className="mt-1.5 border-red-200 focus:border-red-400"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-red-700 hover:bg-red-800"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando vinos...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar Vinos
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {response && (
          <div className="space-y-8">
            {/* Info Section */}
            <Card className="shadow-lg border-blue-100 bg-blue-50/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-700" />
                  <CardTitle className="text-blue-900">Sobre tu búsqueda</CardTitle>
                </div>
                <CardDescription>
                  Información útil sobre estos vinos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-blue-900 leading-relaxed">
                  {response.razonamiento}
                </p>
              </CardContent>
            </Card>

            {/* Results Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-red-900">
                  Resultados
                </h2>
                <Badge variant="secondary" className="text-red-700">
                  {response.resultados.length} {response.resultados.length === 1 ? 'vino encontrado' : 'vinos encontrados'}
                </Badge>
              </div>

              {response.resultados.length === 0 ? (
                <Card className="shadow-lg">
                  <CardContent className="py-12 text-center">
                    <Wine className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">
                      No se encontraron vinos con estos criterios.
                    </p>
                    <p className="text-gray-400 mt-2">
                      Intenta ajustar tu búsqueda o quitar algunos filtros.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {response.resultados.map((wine, index) => (
                    <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow border-red-100">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-red-900 text-lg mb-1">
                              {wine.nombre}
                            </CardTitle>
                            <CardDescription className="text-base">
                              {wine.bodega}
                            </CardDescription>
                          </div>
                          <Badge className={`${getScoreColor(wine.puntuacion)} font-bold`}>
                            {wine.puntuacion}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-semibold text-red-900">Uva:</span>
                            <p className="text-gray-700">{wine.tipo_de_uva}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-red-900">País:</span>
                            <p className="text-gray-700">{wine.pais}</p>
                          </div>
                        </div>
                        <Separator />
                        <a
                          href={wine.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-red-700 hover:text-red-900 font-medium text-sm transition-colors"
                        >
                          Buscar en Wine-Searcher
                          <ExternalLink className="ml-1 w-4 h-4" />
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WineSearch;
