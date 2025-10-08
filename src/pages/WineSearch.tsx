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
import AppNav from "@/components/AppNav";
import { useAuth } from "@/contexts/AuthContext";

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
  // España - DOs y regiones principales
  "Rioja", "Ribera del Duero", "Priorat", "Rías Baixas", "Rueda", "Toro", "Bierzo", "Jumilla",
  "Penedès", "Montsant", "Somontano", "Navarra", "Valdepeñas", "La Mancha", "Utiel-Requena",
  "Yecla", "Alicante", "Valencia", "Campo de Borja", "Cariñena", "Calatayud", "Méntrida",
  "Txakoli", "Getariako Txakolina", "Bizkaiko Txakolina", "Arabako Txakolina",
  "Monterrei", "Valdeorras", "Ribeira Sacra", "Ribeiro", "Condado de Huelva",
  "Jerez-Xérès-Sherry", "Manzanilla-Sanlúcar de Barrameda", "Montilla-Moriles",
  "Málaga", "Sierras de Málaga", "Granada", "Almansa", "Bullas", "Cigales", "Arlanza",
  "Arribes", "Tierra de León", "Tierra del Vino de Zamora", "Valtiendas", "Ribera del Guadiana",
  "Manchuela", "Uclés", "Almansa", "Costers del Segre", "Conca de Barberà", "Empordà",
  "Alella", "Pla de Bages", "Tarragona", "Terra Alta", "Catalunya", "Cava",
  
  // Francia - Regiones y appellations principales
  "Bordeaux", "Médoc", "Haut-Médoc", "Pauillac", "Margaux", "Saint-Julien", "Saint-Estèphe",
  "Pomerol", "Saint-Émilion", "Graves", "Pessac-Léognan", "Sauternes", "Barsac", "Entre-Deux-Mers",
  "Côtes de Bordeaux", "Fronsac", "Canon-Fronsac", "Lalande-de-Pomerol",
  "Borgoña", "Chablis", "Côte de Nuits", "Côte de Beaune", "Côte Chalonnaise", "Mâconnais",
  "Gevrey-Chambertin", "Vosne-Romanée", "Nuits-Saint-Georges", "Beaune", "Pommard", "Volnay",
  "Meursault", "Puligny-Montrachet", "Chassagne-Montrachet", "Pouilly-Fuissé",
  "Champagne", "Montagne de Reims", "Vallée de la Marne", "Côte des Blancs",
  "Valle del Ródano", "Côte-Rôtie", "Condrieu", "Hermitage", "Crozes-Hermitage", "Saint-Joseph",
  "Cornas", "Châteauneuf-du-Pape", "Gigondas", "Vacqueyras", "Côtes du Rhône", "Tavel",
  "Valle del Loira", "Sancerre", "Pouilly-Fumé", "Muscadet", "Vouvray", "Chinon", "Bourgueil",
  "Saumur", "Anjou", "Savennières", "Coteaux du Layon",
  "Alsacia", "Alsace Grand Cru",
  "Languedoc-Roussillon", "Corbières", "Minervois", "Pic Saint-Loup", "Faugères", "Saint-Chinian",
  "Côtes du Roussillon", "Collioure", "Banyuls",
  "Provenza", "Côtes de Provence", "Bandol", "Cassis", "Palette",
  "Beaujolais", "Morgon", "Fleurie", "Moulin-à-Vent", "Chiroubles", "Brouilly",
  "Jura", "Arbois", "Côtes du Jura", "L'Étoile", "Château-Chalon",
  "Saboya", "Vin de Savoie", "Roussette de Savoie", "Crépy",
  "Sud-Ouest", "Cahors", "Madiran", "Jurançon", "Gaillac", "Bergerac", "Monbazillac",
  
  // Italia - Regiones y DOCs principales
  "Toscana", "Chianti", "Chianti Classico", "Brunello di Montalcino", "Vino Nobile di Montepulciano",
  "Bolgheri", "Carmignano", "Vernaccia di San Gimignano", "Montecucco", "Morellino di Scansano",
  "Piamonte", "Barolo", "Barbaresco", "Barbera d'Asti", "Barbera d'Alba", "Dolcetto d'Alba",
  "Gavi", "Roero", "Asti", "Moscato d'Asti", "Langhe", "Monferrato",
  "Veneto", "Valpolicella", "Amarone della Valpolicella", "Soave", "Bardolino", "Prosecco",
  "Conegliano Valdobbiadene", "Lugana", "Custoza",
  "Friuli-Venezia Giulia", "Collio", "Colli Orientali del Friuli", "Friuli Isonzo", "Friuli Grave",
  "Lombardía", "Franciacorta", "Oltrepò Pavese", "Valtellina", "Sforzato di Valtellina",
  "Trentino-Alto Adige", "Alto Adige", "Trentino", "Teroldego Rotaliano", "Trento DOC",
  "Sicilia", "Etna", "Marsala", "Nero d'Avola", "Cerasuolo di Vittoria", "Pantelleria",
  "Puglia", "Primitivo di Manduria", "Salice Salentino", "Castel del Monte", "Gioia del Colle",
  "Campania", "Taurasi", "Fiano di Avellino", "Greco di Tufo", "Aglianico del Taburno",
  "Abruzzo", "Montepulciano d'Abruzzo", "Trebbiano d'Abruzzo",
  "Marche", "Verdicchio dei Castelli di Jesi", "Rosso Conero", "Rosso Piceno",
  "Umbria", "Sagrantino di Montefalco", "Orvieto", "Torgiano",
  "Lazio", "Frascati", "Est! Est!! Est!!!",
  "Emilia-Romagna", "Lambrusco", "Sangiovese di Romagna", "Albana di Romagna",
  "Sardegna", "Vermentino di Gallura", "Cannonau di Sardegna", "Carignano del Sulcis",
  
  // Portugal - Regiões e DOCs
  "Douro", "Porto", "Dão", "Alentejo", "Vinho Verde", "Bairrada", "Lisboa", "Tejo",
  "Península de Setúbal", "Madeira", "Pico", "Douro Superior", "Távora-Varosa",
  "Trás-os-Montes", "Beira Interior", "Ribatejo", "Palmela", "Bucelas", "Carcavelos", "Colares",
  
  // Alemania - Regiones principales
  "Mosel", "Rheingau", "Rheinhessen", "Pfalz", "Baden", "Württemberg", "Franken",
  "Nahe", "Mittelrhein", "Ahr", "Saale-Unstrut", "Sachsen", "Hessische Bergstraße",
  
  // Austria
  "Wachau", "Kremstal", "Kamptal", "Weinviertel", "Burgenland", "Neusiedlersee",
  "Carnuntum", "Thermenregion", "Steiermark", "Südsteiermark",
  
  // Argentina - Regiones principales
  "Mendoza", "Luján de Cuyo", "Valle de Uco", "Maipú", "San Rafael",
  "Salta", "Cafayate", "Valles Calchaquíes",
  "San Juan", "Tulum Valley", "Ullum Valley",
  "Patagonia", "Neuquén", "Río Negro",
  "La Rioja (Argentina)", "Catamarca",
  
  // Chile - Valles principales
  "Valle de Maipo", "Valle de Colchagua", "Valle de Cachapoal", "Valle de Casablanca",
  "Valle de Aconcagua", "Valle del Maule", "Valle de Curicó", "Valle de Limarí",
  "Valle de Elqui", "Valle de Leyda", "Valle de San Antonio", "Valle de Itata",
  "Valle del Bío-Bío", "Valle del Choapa",
  
  // Estados Unidos - Regiones principales
  "Napa Valley", "Sonoma County", "Russian River Valley", "Dry Creek Valley", "Alexander Valley",
  "Paso Robles", "Santa Barbara County", "Santa Ynez Valley", "Santa Maria Valley",
  "Santa Cruz Mountains", "Monterey", "Carneros", "Stags Leap District", "Oakville",
  "Rutherford", "Howell Mountain", "Mount Veeder", "Diamond Mountain",
  "Willamette Valley", "Columbia Valley", "Walla Walla Valley", "Yakima Valley",
  "Finger Lakes", "Long Island", "North Fork", "Hamptons",
  "Lodi", "Sierra Foothills", "Mendocino", "Lake County", "El Dorado",
  
  // Australia - Regiones principales
  "Barossa Valley", "McLaren Vale", "Adelaide Hills", "Clare Valley", "Coonawarra",
  "Margaret River", "Hunter Valley", "Yarra Valley", "Mornington Peninsula",
  "Heathcote", "Rutherglen", "Goulburn Valley", "Grampians", "Pyrenees",
  "Eden Valley", "Langhorne Creek", "Riverland", "Mudgee", "Orange",
  "Tasmania", "Coal River Valley", "Tamar Valley",
  
  // Nueva Zelanda
  "Marlborough", "Central Otago", "Hawke's Bay", "Martinborough", "Wairarapa",
  "Waipara Valley", "Canterbury", "Gisborne", "Nelson", "Auckland",
  
  // Sudáfrica
  "Stellenbosch", "Paarl", "Franschhoek", "Constantia", "Swartland", "Walker Bay",
  "Elgin", "Hemel-en-Aarde Valley", "Robertson", "Worcester", "Durbanville",
  "Tulbagh", "Elim", "Cape South Coast",
  
  // Grecia
  "Santorini", "Nemea", "Naoussa", "Mantinia", "Paros", "Samos", "Rapsani",
  "Amyndeo", "Goumenissa", "Cephalonia",
  
  // Hungría
  "Tokaj", "Eger", "Villány", "Szekszárd", "Somló", "Badacsony",
  
  // Rumania
  "Dealu Mare", "Murfatlar", "Cotnari", "Târnave",
  
  // Bulgaria
  "Thracian Valley", "Danube Plain", "Black Sea Region",
  
  // Croacia
  "Istria", "Dalmacia", "Slavonia", "Plavac Mali", "Pelješac",
  
  // Eslovenia
  "Goriška Brda", "Vipava Valley", "Slovenian Istria", "Štajerska",
  
  // Israel
  "Galilee", "Golan Heights", "Judean Hills", "Negev",
  
  // Líbano
  "Bekaa Valley", "Mount Lebanon",
  
  // Uruguay
  "Canelones", "Montevideo", "Maldonado",
  
  // Brasil
  "Vale dos Vinhedos", "Serra Gaúcha", "Campanha",
  
  // México
  "Valle de Guadalupe", "Ensenada", "San Vicente",
  
  // Canadá
  "Okanagan Valley", "Niagara Peninsula", "Prince Edward County",
  
  // Inglaterra
  "Sussex", "Kent", "Hampshire", "Cornwall",
  
  // Suiza
  "Valais", "Vaud", "Ticino", "Geneva",
  
  // República Checa
  "Moravia", "Bohemia",
  
  // Eslovaquia
  "Malokarpatská", "Južnoslovenská",
  
  // Georgia
  "Kakheti", "Imereti", "Kartli",
  
  // Turquía
  "Thrace", "Anatolia Central", "Aegean",
  
  // Marruecos
  "Meknès", "Casablanca", "Essaouira",
  
  // China
  "Ningxia", "Shandong", "Hebei", "Shanxi",
  
  // Japón
  "Yamanashi", "Nagano", "Hokkaido"
].sort();

const WineSearch = () => {
  const { user } = useAuth();
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
    <>
      {user && <AppNav />}
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
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={wine.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-red-700 hover:text-red-900 font-medium text-sm transition-colors hover:underline"
                          >
                            Wine-Searcher
                            <ExternalLink className="ml-1 w-3.5 h-3.5" />
                          </a>
                          <span className="text-gray-300">•</span>
                          <a
                            href={`https://www.vivino.com/search/wines?q=${encodeURIComponent(wine.nombre + ' ' + wine.bodega)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-red-700 hover:text-red-900 font-medium text-sm transition-colors hover:underline"
                          >
                            Vivino
                            <ExternalLink className="ml-1 w-3.5 h-3.5" />
                          </a>
                          <span className="text-gray-300">•</span>
                          <a
                            href={`https://www.wine.com/search/${encodeURIComponent(wine.nombre + ' ' + wine.bodega)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-red-700 hover:text-red-900 font-medium text-sm transition-colors hover:underline"
                          >
                            Wine.com
                            <ExternalLink className="ml-1 w-3.5 h-3.5" />
                          </a>
                          <span className="text-gray-300">•</span>
                          <a
                            href={`https://www.cellartracker.com/list.asp?szSearch=${encodeURIComponent(wine.nombre + ' ' + wine.bodega)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-red-700 hover:text-red-900 font-medium text-sm transition-colors hover:underline"
                          >
                            CellarTracker
                            <ExternalLink className="ml-1 w-3.5 h-3.5" />
                          </a>
                          <span className="text-gray-300">•</span>
                          <a
                            href={`https://www.winespectator.com/search?q=${encodeURIComponent(wine.nombre + ' ' + wine.bodega)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-red-700 hover:text-red-900 font-medium text-sm transition-colors hover:underline"
                          >
                            Wine Spectator
                            <ExternalLink className="ml-1 w-3.5 h-3.5" />
                          </a>
                          <span className="text-gray-300">•</span>
                          <a
                            href={`https://www.guiapenin.com/es-es/vinos?q=${encodeURIComponent(wine.nombre + ' ' + wine.bodega)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-red-700 hover:text-red-900 font-medium text-sm transition-colors hover:underline"
                          >
                            Guía Peñín
                            <ExternalLink className="ml-1 w-3.5 h-3.5" />
                          </a>
                        </div>
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
    </>
  );
};

export default WineSearch;
