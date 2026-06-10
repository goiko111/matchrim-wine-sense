import { lazy, Suspense, useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { WineLabelOCRImport } from "@/components/wine-import/WineLabelOCRImport";
import { WineSearchBar } from "@/components/wine-import/WineSearchBar";
import { PurchaseInfoSelector } from "@/components/wine-import/PurchaseInfoSelector";
import { LocationSelector } from "@/components/wine-import/LocationSelector";
import { supabase } from "@/integrations/supabase/client";
import { buildAuthRedirectPath } from "@/utils/navigation";
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
  Sparkles,
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

const WineMenuScanner = lazy(() => import("@/components/wine-import/WineMenuScanner"));

const ScannerFallback = () => (
  <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed bg-muted/40">
    <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
    Preparando scanner...
  </div>
);

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
  status: 'collection' | 'wishlist' | 'tasted';
  quantity: number | null;
  price: number | null;
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
  imagen_url?: string | null;
}

const MyWines = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wines, setWines] = useState<UserWine[]>([]);
  const [filteredWines, setFilteredWines] = useState<UserWine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedWineData | null>(null);
  const [extractedImageUrl, setExtractedImageUrl] = useState<string | null>(null);
  const [selectedWine, setSelectedWine] = useState<UserWine | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'high_affinity'>('all');
  const [statusFilter, setStatusFilter] = useState<'collection' | 'wishlist' | 'tasted'>('collection');

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
    quantity: "1",
  });

  const [purchaseData, setPurchaseData] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate(buildAuthRedirectPath("/my-wines"));
      return;
    }
    loadWines();
  }, [user, navigate, statusFilter]);

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
      let query = supabase.from("user_wines").select("*");
      
      // Filter based on status
      if (statusFilter === 'collection') {
        query = query.eq("status", "collection");
      } else if (statusFilter === 'wishlist') {
        query = query.eq("status", "wishlist");
      } else if (statusFilter === 'tasted') {
        // Ya Probados shows all wines with a rating, regardless of status
        query = query.not("rating", "is", null);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

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
    setExtractedImageUrl(wine.imagen_url || null);
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
      quantity: "1",
    });
    setShowPurchaseDialog(true);
  };

  const handleSearchWineSelect = (wine: any) => {
    setFormData({
      name: wine.name,
      producer: wine.producer || "",
      vintage: wine.vintage?.toString() || "",
      region: wine.region || "",
      country: wine.country || "",
      grape_varieties: wine.grape_varieties?.join(", ") || "",
      alcohol_content: wine.alcohol_content != null ? String(wine.alcohol_content) : "",
      tasting_notes: wine.tasting_notes || "",
      personal_note: "",
      quantity: "1",
    });
    setShowPurchaseDialog(true);
  };

  const handlePurchaseInfoConfirm = async (data: any) => {
    if (!formData.name || !user) {
      toast.error("El nombre del vino es obligatorio");
      return;
    }

    // Validate restaurant is selected
    if (data?.location_type === 'restaurant' && !data?.place_name) {
      toast.error("Debes seleccionar un restaurante");
      return;
    }

    setSaving(true);
    try {
      const wineData = {
        user_id: user.id,
        name: formData.name,
        producer: formData.producer || null,
        vintage: formData.vintage ? parseInt(formData.vintage) : null,
        region: formData.region || null,
        country: formData.country || null,
        grape_varieties: formData.grape_varieties 
          ? formData.grape_varieties.split(",").map(g => g.trim()).filter(Boolean)
          : null,
        alcohol_content: formData.alcohol_content ? parseFloat(formData.alcohol_content) : null,
        tasting_notes: formData.tasting_notes || null,
        personal_note: formData.personal_note || null,
        image_url: extractedImageUrl || null,
        status: statusFilter,
        quantity: statusFilter === 'collection' ? parseInt(formData.quantity) || 1 : null,
        use_for_profile_training: statusFilter === 'tasted',
        consumption_place: data?.place_name || null,
        consumption_place_type: data?.location_type || null,
        consumption_date: data?.purchase_date || null,
        price: data?.price || null,
      };

      const { data: insertedWine, error } = await supabase
        .from("user_wines")
        .insert([wineData])
        .select()
        .single();

      if (error) throw error;

      // Calculate affinity in background
      if (insertedWine && (statusFilter === 'collection' || statusFilter === 'tasted')) {
        supabase.functions
          .invoke("calculate-wine-affinity", {
            body: { wine_id: insertedWine.id }
          })
          .then(({ data: affinityData }) => {
            if (affinityData?.affinity) {
              setWines((prev) =>
                prev.map((w) =>
                  w.id === insertedWine.id ? { ...w, matchrim_affinity: affinityData.affinity } : w
                )
              );
            }
          });
      }

      toast.success("Vino añadido exitosamente");
      setShowPurchaseDialog(false);
      setShowAddDialog(false);
      resetForm();
      loadWines();
    } catch (error) {
      console.error("Error saving wine:", error);
      toast.error("Error al guardar el vino");
    } finally {
      setSaving(false);
    }
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
        status: statusFilter,
        quantity: statusFilter === 'collection' ? (formData.quantity ? parseInt(formData.quantity) : 1) : null,
        image_url: extractedImageUrl || null,
        use_for_profile_training: statusFilter === 'tasted',
      };

      if (purchaseData) {
        wineData.consumption_place_type = purchaseData.location_type;
        wineData.consumption_place = purchaseData.place_name || null;
        wineData.price = purchaseData.price || null;
        wineData.consumption_date = purchaseData.purchase_date || new Date().toISOString();
      }

      const { data: newWine, error } = await supabase.from("user_wines").insert([wineData]).select().single();

      if (error) throw error;

      toast.success("¡Vino añadido!");
      setShowAddDialog(false);
      resetForm();

      // Calculate affinity in background for collection and tasted wines
      if (newWine && (statusFilter === 'collection' || statusFilter === 'tasted')) {
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

  const handleToggleProfileTraining = async (wineId: string, nextValue: boolean) => {
    const wine = wines.find((item) => item.id === wineId);

    if (!wine?.rating) {
      toast.error("Puntúa el vino antes de usarlo para afinar tu perfil");
      return;
    }

    if (!wine.sensory_attributes) {
      toast.error("Este vino no tiene atributos sensoriales suficientes para entrenar el perfil");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_wines")
        .update({ use_for_profile_training: nextValue })
        .eq("id", wineId);

      if (error) throw error;

      setWines((currentWines) =>
        currentWines.map((item) =>
          item.id === wineId ? { ...item, use_for_profile_training: nextValue } : item
        )
      );

      toast.success(nextValue ? "Este vino volverá a afinar tu perfil" : "Este vino ya no entrena tu perfil");
    } catch (error) {
      console.error("Error toggling profile training:", error);
      toast.error("No se pudo actualizar el entrenamiento del perfil");
    }
  };

  const handleRating = async (wineId: string, rating: 'love' | 'ok' | 'not_for_me') => {
    try {
      const wine = wines.find(w => w.id === wineId);
      
      const updateData: any = { rating, use_for_profile_training: true };
      
      if (wine?.status === 'wishlist') {
        updateData.status = 'tasted';
        updateData.consumption_date = new Date().toISOString();
      }

      // If rating from collection, optionally decrement quantity
      if (wine?.status === 'collection' && wine.quantity && wine.quantity > 0) {
        updateData.quantity = wine.quantity - 1;
        if (wine.quantity === 1) {
          updateData.status = 'tasted';
          updateData.consumption_date = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from("user_wines")
        .update(updateData)
        .eq("id", wineId);

      if (error) throw error;

      const message = wine?.status === 'collection'
        ? `Vino puntuado${wine.quantity && wine.quantity > 1 ? ` (quedan ${wine.quantity - 1} botellas)` : ' y movido a Ya Probados'}`
        : wine?.status === 'wishlist'
          ? 'Vino movido a Ya Probados y usado para afinar tu perfil'
          : "Valoración guardada";
      
      toast.success(message);

      supabase.functions
        .invoke("calculate-wine-affinity", {
          body: { wine_id: wineId }
        })
        .then(({ error }) => {
          if (error) {
            console.error("Error recalculating affinity after rating:", error);
          }
        });

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
      quantity: "1",
    });
    setExtractedData(null);
    setExtractedImageUrl(null);
    setPurchaseData(null);
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

  const trainingReadyCount = wines.filter(
    (wine) => wine.rating && wine.use_for_profile_training && wine.sensory_attributes
  ).length;
  const ratedCount = wines.filter((wine) => wine.rating).length;

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
              Colección
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
                  <Suspense fallback={<ScannerFallback />}>
                    <WineMenuScanner />
                  </Suspense>
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

          {/* Collection Tab with Status Filters */}
          <TabsContent value="collection" className="space-y-6">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <TabsList className="grid h-auto w-full grid-cols-3">
                <TabsTrigger value="collection" className="min-h-14 gap-1 px-1 sm:gap-2 sm:px-3">
                  <Wine className="h-4 w-4" />
                  <div className="flex min-w-0 flex-col items-start">
                    <span>Mi Bodega</span>
                    <span className="hidden text-[10px] text-muted-foreground font-normal sm:block">Vinos que tengo</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="wishlist" className="min-h-14 gap-1 px-1 sm:gap-2 sm:px-3">
                  <Heart className="h-4 w-4" />
                  <div className="flex min-w-0 flex-col items-start">
                    <span>Quiero Probar</span>
                    <span className="hidden text-[10px] text-muted-foreground font-normal sm:block">Lista de deseos</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="tasted" className="min-h-14 gap-1 px-1 sm:gap-2 sm:px-3">
                  <Star className="h-4 w-4" />
                  <div className="flex min-w-0 flex-col items-start">
                    <span>Ya Probados</span>
                    <span className="hidden text-[10px] text-muted-foreground font-normal sm:block">Puntúa y entrena</span>
                  </div>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6 space-y-6">
                {statusFilter === 'tasted' && (
                  <Card className="border-green-200 bg-green-50/80">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-950">
                        <Sparkles className="h-5 w-5" />
                        Tu perfil aprende con tus valoraciones
                      </CardTitle>
                      <CardDescription className="text-green-900">
                        {trainingReadyCount > 0
                          ? `${trainingReadyCount} vino${trainingReadyCount !== 1 ? 's' : ''} con atributos está${trainingReadyCount !== 1 ? 'n' : ''} afinando tu código Matchrim.`
                          : ratedCount > 0
                            ? 'Tienes vinos puntuados, pero todavía faltan atributos sensoriales para entrenar el perfil.'
                            : 'Puntúa vinos guardados desde cartas Winerim para que tu código se vuelva más preciso.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-green-700 hover:bg-green-700">
                          {trainingReadyCount} entrenando
                        </Badge>
                        <Badge variant="outline">
                          {ratedCount} puntuado{ratedCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        className="gap-2 bg-white"
                        onClick={() => navigate('/profile')}
                      >
                        <Sparkles className="h-4 w-4" />
                        Ver perfil afinado
                      </Button>
                    </CardContent>
                  </Card>
                )}

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
                        setShowPurchaseDialog(true);
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
                    <CardContent className="flex flex-col items-center px-5 py-12 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-red-50 text-red-900">
                        {statusFilter === 'wishlist' ? (
                          <Heart className="h-7 w-7" />
                        ) : statusFilter === 'tasted' ? (
                          <Star className="h-7 w-7" />
                        ) : (
                          <Wine className="h-7 w-7" />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {statusFilter === 'collection' && 'Tu bodega empieza con la primera botella'}
                        {statusFilter === 'wishlist' && 'Guarda aquí los vinos que te recomienda Winerim'}
                        {statusFilter === 'tasted' && 'Puntúa vinos para que Matchrim aprenda contigo'}
                      </h3>
                      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                        {statusFilter === 'collection' && 'Escanea una etiqueta, busca un vino o añádelo manualmente para recordar qué tienes en casa.'}
                        {statusFilter === 'wishlist' && 'Cuando filtres una carta o escanees un restaurante sin Winerim, podrás guardar candidatos para probarlos después.'}
                        {statusFilter === 'tasted' && 'Los vinos puntuados con atributos sensoriales afinan tu código y mejoran las recomendaciones futuras.'}
                      </p>
                      <div className="mt-5 flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
                        {statusFilter === 'wishlist' ? (
                          <Button onClick={() => navigate('/usar-matchrim')} className="gap-2 bg-red-800 hover:bg-red-900">
                            <ScanLine className="h-4 w-4" />
                            Usar mi código
                          </Button>
                        ) : statusFilter === 'tasted' ? (
                          <Button onClick={() => setStatusFilter('wishlist')} className="gap-2 bg-red-800 hover:bg-red-900">
                            <Heart className="h-4 w-4" />
                            Ver Quiero Probar
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              resetForm();
                              setShowPurchaseDialog(true);
                            }}
                            className="gap-2 bg-red-800 hover:bg-red-900"
                          >
                            <Plus className="h-4 w-4" />
                            Añadir vino
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => navigate('/usar-matchrim?mode=scanner')}
                          className="gap-2"
                        >
                          <ScanLine className="h-4 w-4" />
                          Escanear carta
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWines.map((wine) => (
                      <Card key={wine.id} className="relative group">
                        {/* Wine Image */}
                        {wine.image_url && (
                          <div className="w-full h-48 overflow-hidden rounded-t-lg bg-muted">
                            <img 
                              src={wine.image_url} 
                              alt={wine.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
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
                          {/* Quantity for collection items */}
                          {statusFilter === 'collection' && wine.quantity !== null && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Stock en bodega</span>
                              <Badge variant={wine.quantity > 0 ? 'default' : 'secondary'}>
                                {wine.quantity} {wine.quantity === 1 ? 'botella' : 'botellas'}
                              </Badge>
                            </div>
                          )}

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

                          {wine.rating && (
                            <div className="rounded-lg border bg-muted/30 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    Entrena mi perfil
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {wine.sensory_attributes
                                      ? 'Puedes excluir esta valoración si fue una botella atípica.'
                                      : 'Faltan atributos sensoriales para que esta valoración ajuste tu código.'}
                                  </p>
                                </div>
                                {wine.sensory_attributes ? (
                                  <Switch
                                    checked={Boolean(wine.use_for_profile_training)}
                                    onCheckedChange={(checked) => handleToggleProfileTraining(wine.id, checked)}
                                    aria-label={`Usar ${wine.name} para entrenar perfil`}
                                  />
                                ) : (
                                  <Badge variant="outline">Sin atributos</Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Rating Buttons - move wishlist wines to tasted and train the profile */}
                          {(statusFilter === 'tasted' || statusFilter === 'collection' || statusFilter === 'wishlist') && (
                            <div className="flex gap-2 pt-2">
                              <Button
                                variant={wine.rating === 'love' ? 'default' : 'outline'}
                                size="sm"
                                className="min-w-0 flex-1 text-xs sm:text-sm"
                                onClick={() => handleRating(wine.id, 'love')}
                              >
                                <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                                Me encanta
                              </Button>
                              <Button
                                variant={wine.rating === 'ok' ? 'default' : 'outline'}
                                size="sm"
                                className="min-w-0 flex-1 text-xs sm:text-sm"
                                onClick={() => handleRating(wine.id, 'ok')}
                              >
                                <Meh className="h-3.5 w-3.5 mr-1" />
                                Correcto
                              </Button>
                              <Button
                                variant={wine.rating === 'not_for_me' ? 'default' : 'outline'}
                                size="sm"
                                className="min-w-0 flex-1 text-xs sm:text-sm"
                                onClick={() => handleRating(wine.id, 'not_for_me')}
                              >
                                <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                                No va
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Purchase Info Dialog */}
        <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
          <DialogContent className="max-w-2xl">
            <PurchaseInfoSelector
              mode={statusFilter}
              onConfirm={handlePurchaseInfoConfirm}
              onCancel={() => {
                setShowPurchaseDialog(false);
                resetForm();
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Add/Edit Wine Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetForm();
        }}>
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

                {/* Quantity field only for collection */}
                {statusFilter === 'collection' && (
                  <div>
                    <Label htmlFor="quantity">Cantidad en Bodega</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="Número de botellas"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                
                {/* Status Selection Buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStatusFilter('collection');
                      setShowPurchaseDialog(true);
                      setShowAddDialog(false);
                    }}
                    disabled={saving}
                  >
                    Mi Bodega
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStatusFilter('wishlist');
                      setShowPurchaseDialog(true);
                      setShowAddDialog(false);
                    }}
                    disabled={saving}
                  >
                    Quiero Probar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setStatusFilter('tasted');
                      setShowPurchaseDialog(true);
                      setShowAddDialog(false);
                    }}
                    disabled={saving}
                  >
                    Ya Probado
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MyWines;
