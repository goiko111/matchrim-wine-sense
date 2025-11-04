import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WineLabelOCRImport } from "@/components/wine-import/WineLabelOCRImport";
import { WineMenuScanner } from "@/components/wine-import/WineMenuScanner";
import { WineSearchBar } from "@/components/wine-import/WineSearchBar";
import { LocationSelector } from "@/components/wine-import/LocationSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wine,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  MapPin,
  Grape,
  ScanLine,
  Search,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Filter,
  Star,
  Edit3,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserWine {
  id: string;
  name: string;
  producer: string | null;
  vintage: number | null;
  region: string | null;
  country: string | null;
  grape_varieties: string[] | null;
  alcohol_content: number | null;
  tasting_notes: string | null;
  image_url: string | null;
  created_at: string;
  is_favorite: boolean;
  rating: 'love' | 'ok' | 'not_for_me' | null;
  personal_note: string | null;
  consumption_place: string | null;
  consumption_place_type: string | null;
  consumption_date: string | null;
  matchrim_affinity: number | null;
  sensory_attributes: any;
  use_for_profile_training: boolean;
}

interface ExtractedWineData {
  nombre: string;
  productor: string | null;
  anada: number | null;
  region: string | null;
  pais: string | null;
  uvas: string[];
  alcohol: number | null;
  notas_cata: string | null;
}

const MyWines = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wines, setWines] = useState<UserWine[]>([]);
  const [filteredWines, setFilteredWines] = useState<UserWine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedWineData | null>(null);
  const [selectedWine, setSelectedWine] = useState<UserWine | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'high_affinity'>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    producer: "",
    vintage: "",
    region: "",
    country: "",
    grape_varieties: "",
    alcohol_content: "",
    tasting_notes: "",
    personal_note: "",
  });

  const [locationData, setLocationData] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadWines();
  }, [user, navigate]);

  useEffect(() => {
    applyFilters();
  }, [wines, filterType]);

  const applyFilters = () => {
    let filtered = [...wines];

    switch (filterType) {
      case 'favorites':
        filtered = filtered.filter(w => w.is_favorite);
        break;
      case 'high_affinity':
        filtered = filtered.filter(w => w.matchrim_affinity && w.matchrim_affinity >= 70);
        filtered.sort((a, b) => (b.matchrim_affinity || 0) - (a.matchrim_affinity || 0));
        break;
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredWines(filtered);
  };

  const loadWines = async () => {
    try {
      const { data, error } = await supabase
        .from("user_wines")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWines((data as any) || []);
    } catch (error) {
      console.error("Error loading wines:", error);
      toast.error("Error al cargar tus vinos");
    } finally {
      setLoading(false);
    }
  };

  const handleExtractComplete = (wine: ExtractedWineData) => {
    setExtractedData(wine);
    setFormData({
      name: wine.nombre || "",
      producer: wine.productor || "",
      vintage: wine.anada?.toString() || "",
      region: wine.region || "",
      country: wine.pais || "",
      grape_varieties: wine.uvas?.join(", ") || "",
      alcohol_content: wine.alcohol?.toString() || "",
      tasting_notes: wine.notas_cata || "",
      personal_note: "",
    });
    setShowLocationDialog(true);
  };

  const handleSearchWineSelect = (wine: any) => {
    setFormData({
      name: wine.name,
      producer: wine.producer || "",
      vintage: wine.vintage?.toString() || "",
      region: wine.region || "",
      country: "",
      grape_varieties: wine.grape_varieties?.join(", ") || "",
      alcohol_content: "",
      tasting_notes: "",
      personal_note: "",
    });
    setShowLocationDialog(true);
  };

  const handleLocationSelected = (location: any) => {
    setLocationData(location);
    setShowLocationDialog(false);
    setShowAddDialog(true);
  };

  const handleSaveWine = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre del vino es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const wineData: any = {
        user_id: user!.id,
        name: formData.name,
        producer: formData.producer || null,
        vintage: formData.vintage ? parseInt(formData.vintage) : null,
        region: formData.region || null,
        country: formData.country || null,
        grape_varieties: formData.grape_varieties
          ? formData.grape_varieties.split(",").map((v) => v.trim())
          : null,
        alcohol_content: formData.alcohol_content ? parseFloat(formData.alcohol_content) : null,
        tasting_notes: formData.tasting_notes || null,
        personal_note: formData.personal_note || null,
        consumption_date: new Date().toISOString(),
      };

      if (locationData) {
        wineData.consumption_place_type = locationData.type;
        wineData.consumption_place = locationData.place_name || null;
        wineData.place_details = locationData.place_details || null;
        wineData.restaurant_id = locationData.restaurant_id || null;
      }

      const { data: newWine, error } = await supabase.from("user_wines").insert([wineData]).select().single();

      if (error) throw error;

      toast.success("¡Vino añadido a tu colección!");
      setShowAddDialog(false);
      resetForm();

      // Calculate affinity in background - will search for attributes and calculate affinity
      if (newWine) {
        toast.info("Calculando afinidad Matchrim...");
        const { data: affinityData, error: affinityError } = await supabase.functions.invoke('calculate-wine-affinity', {
          body: { wine_id: newWine.id }
        });

        if (affinityError) {
          console.error('Error calculating affinity:', affinityError);
          toast.error("No se pudo calcular la afinidad");
        } else if (affinityData?.affinity) {
          toast.success(`Afinidad Matchrim: ${affinityData.affinity}%`);
        }
      }

      loadWines();
    } catch (error) {
      console.error("Error saving wine:", error);
      toast.error("Error al guardar el vino");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async (wineId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from("user_wines")
        .update({ is_favorite: !currentFavorite })
        .eq("id", wineId);

      if (error) throw error;

      toast.success(currentFavorite ? "Eliminado de favoritos" : "Añadido a favoritos");
      loadWines();
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Error al actualizar favorito");
    }
  };

  const handleRating = async (wineId: string, rating: 'love' | 'ok' | 'not_for_me') => {
    try {
      const { error } = await supabase
        .from("user_wines")
        .update({ rating })
        .eq("id", wineId);

      if (error) throw error;

      toast.success("Valoración guardada");
      loadWines();
    } catch (error) {
      console.error("Error rating wine:", error);
      toast.error("Error al guardar valoración");
    }
  };

  const handleDeleteWine = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este vino?")) return;

    try {
      const { error } = await supabase.from("user_wines").delete().eq("id", id);

      if (error) throw error;

      toast.success("Vino eliminado");
      loadWines();
    } catch (error) {
      console.error("Error deleting wine:", error);
      toast.error("Error al eliminar el vino");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      producer: "",
      vintage: "",
      region: "",
      country: "",
      grape_varieties: "",
      alcohol_content: "",
      tasting_notes: "",
      personal_note: "",
    });
    setExtractedData(null);
    setLocationData(null);
  };

  const getAffinityColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getRatingIcon = (rating: string | null) => {
    switch (rating) {
      case 'love': return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case 'not_for_me': return <ThumbsDown className="h-4 w-4 text-red-600" />;
      case 'ok': return <Meh className="h-4 w-4 text-yellow-600" />;
      default: return null;
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <AppNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <AppNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Mis Vinos</h1>
          <p className="text-muted-foreground">Tu colección personal de vinos</p>
        </div>

        <Tabs defaultValue="scanner" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scanner" className="gap-2">
              <ScanLine className="h-4 w-4" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="collection" className="gap-2">
              <Wine className="h-4 w-4" />
              Mi Colección
            </TabsTrigger>
          </TabsList>

          {/* Scanner Tab */}
          <TabsContent value="scanner" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Wine Menu Scanner */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ScanLine className="h-5 w-5" />
                    Scanner de Cartas
                  </CardTitle>
                  <CardDescription>
                    Escanea cartas de restaurante y descubre compatibilidades
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WineMenuScanner />
                </CardContent>
              </Card>

              {/* Wine Label OCR */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wine className="h-5 w-5" />
                    Scanner de Etiquetas
                  </CardTitle>
                  <CardDescription>
                    Fotografía etiquetas para extraer información
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WineLabelOCRImport onExtractComplete={handleExtractComplete} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Collection Tab */}
          <TabsContent value="collection" className="space-y-6">
            {/* Search and Add */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar y Añadir Vino
                </CardTitle>
                <CardDescription>
                  Busca en nuestra base de datos o añade manualmente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <WineSearchBar onSelectWine={handleSearchWineSelect} />
                <Button
                  onClick={() => {
                    resetForm();
                    setShowLocationDialog(true);
                  }}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Añadir Manualmente
                </Button>
              </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterType('all')}>
                    Todos ({wines.length})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('favorites')}>
                    <Heart className="h-4 w-4 mr-2" />
                    Favoritos ({wines.filter(w => w.is_favorite).length})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('high_affinity')}>
                    <Star className="h-4 w-4 mr-2" />
                    Alta Afinidad ({wines.filter(w => w.matchrim_affinity && w.matchrim_affinity >= 70).length})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {filterType !== 'all' && (
                <Badge variant="secondary">
                  {filterType === 'favorites' && '❤️ Favoritos'}
                  {filterType === 'high_affinity' && '⭐ Alta Afinidad'}
                </Badge>
              )}
            </div>

            {/* Wine Collection Grid */}
            {filteredWines.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Wine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {filterType === 'all' 
                      ? "Aún no tienes vinos en tu colección."
                      : "No hay vinos que coincidan con este filtro."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWines.map((wine) => (
                  <Card key={wine.id} className="relative group">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate flex items-center gap-2">
                            {wine.name}
                            {getRatingIcon(wine.rating)}
                          </CardTitle>
                          {wine.producer && (
                            <CardDescription className="truncate">{wine.producer}</CardDescription>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleFavorite(wine.id, wine.is_favorite)}
                          >
                            <Heart className={`h-4 w-4 ${wine.is_favorite ? 'fill-red-500 text-red-500' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteWine(wine.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Affinity Score */}
                      {wine.matchrim_affinity !== null && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Afinidad Matchrim</span>
                            <span className={`font-bold ${getAffinityColor(wine.matchrim_affinity)}`}>
                              {wine.matchrim_affinity}%
                            </span>
                          </div>
                          <Progress value={wine.matchrim_affinity} className="h-2" />
                        </div>
                      )}

                      {/* Wine Details */}
                      <div className="flex flex-wrap gap-1.5 text-sm">
                        {wine.vintage && <Badge variant="outline">{wine.vintage}</Badge>}
                        {wine.region && <Badge variant="outline">{wine.region}</Badge>}
                        {wine.country && <Badge variant="outline">{wine.country}</Badge>}
                        {wine.alcohol_content && (
                          <Badge variant="secondary">{wine.alcohol_content}% ABV</Badge>
                        )}
                      </div>

                      {wine.grape_varieties && wine.grape_varieties.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Grape className="h-4 w-4" />
                          <span className="truncate">{wine.grape_varieties.join(", ")}</span>
                        </div>
                      )}

                      {/* Location */}
                      {wine.consumption_place && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{wine.consumption_place}</span>
                        </div>
                      )}

                      {/* Date */}
                      {wine.consumption_date && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(wine.consumption_date).toLocaleDateString('es-ES')}</span>
                        </div>
                      )}

                      {/* Personal Note */}
                      {wine.personal_note && (
                        <p className="text-sm text-muted-foreground italic line-clamp-2 border-l-2 border-primary pl-2">
                          {wine.personal_note}
                        </p>
                      )}

                      {/* Rating Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant={wine.rating === 'love' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRating(wine.id, 'love')}
                        >
                          <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                          Me encanta
                        </Button>
                        <Button
                          variant={wine.rating === 'ok' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRating(wine.id, 'ok')}
                        >
                          <Meh className="h-3.5 w-3.5 mr-1" />
                          Correcto
                        </Button>
                        <Button
                          variant={wine.rating === 'not_for_me' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRating(wine.id, 'not_for_me')}
                        >
                          <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                          No va
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Location Dialog */}
        <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
          <DialogContent className="max-w-2xl">
            <LocationSelector
              onLocationSelected={handleLocationSelected}
              onCancel={() => {
                setShowLocationDialog(false);
                resetForm();
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Add/Edit Wine Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {extractedData ? "Verificar y Guardar Vino" : "Añadir Vino"}
              </DialogTitle>
              <DialogDescription>
                {extractedData
                  ? "Revisa los datos extraídos y modifica si es necesario"
                  : "Completa la información del vino"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Nombre del Vino *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Viña Albali Reserva"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="producer">Bodega/Productor</Label>
                    <Input
                      id="producer"
                      value={formData.producer}
                      onChange={(e) => setFormData({ ...formData, producer: e.target.value })}
                      placeholder="Ej: Félix Solís"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vintage">Añada</Label>
                    <Input
                      id="vintage"
                      type="number"
                      value={formData.vintage}
                      onChange={(e) => setFormData({ ...formData, vintage: e.target.value })}
                      placeholder="Ej: 2019"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="region">Región</Label>
                    <Input
                      id="region"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      placeholder="Ej: Valdepeñas"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">País</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Ej: España"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="grapes">Uvas (separadas por comas)</Label>
                    <Input
                      id="grapes"
                      value={formData.grape_varieties}
                      onChange={(e) => setFormData({ ...formData, grape_varieties: e.target.value })}
                      placeholder="Ej: Tempranillo, Garnacha"
                    />
                  </div>
                  <div>
                    <Label htmlFor="alcohol">Grado Alcohólico (%)</Label>
                    <Input
                      id="alcohol"
                      type="number"
                      step="0.1"
                      value={formData.alcohol_content}
                      onChange={(e) => setFormData({ ...formData, alcohol_content: e.target.value })}
                      placeholder="Ej: 14.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notas de Cata</Label>
                  <Textarea
                    id="notes"
                    value={formData.tasting_notes}
                    onChange={(e) => setFormData({ ...formData, tasting_notes: e.target.value })}
                    placeholder="Describe los aromas, sabores..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="personal">Nota Personal</Label>
                  <Textarea
                    id="personal"
                    value={formData.personal_note}
                    onChange={(e) => setFormData({ ...formData, personal_note: e.target.value })}
                    placeholder="¿Con qué lo tomaste? ¿Qué te pareció?"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveWine} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Vino"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MyWines;