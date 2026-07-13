import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import { WineSearchBar } from "@/components/wine-import/WineSearchBar";
import { PurchaseInfoSelector } from "@/components/wine-import/PurchaseInfoSelector";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { buildAuthRedirectPath } from "@/utils/navigation";
import { trackAppEvent } from "@/lib/analytics";
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
  Sparkles,
  CheckCircle,
  AlertCircle,
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
  status: 'collection' | 'wishlist' | 'tasted';
  quantity: number | null;
  price: number | null;
}

interface LearningWine {
  id: string;
  name: string;
  rating: 'love' | 'ok' | 'not_for_me' | null;
  sensory_attributes: any;
  use_for_profile_training: boolean;
  grape_varieties: string[] | null;
  status: 'collection' | 'wishlist' | 'tasted';
  created_at: string;
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
  matchrim_affinity?: number | null;
  sensory_attributes?: {
    potencia?: number;
    acidez?: number;
    dulzura?: number;
    taninos?: number;
    afrutado?: number;
  } | null;
  affinity_reason?: string | null;
  is_favorite?: boolean;
}

interface WineSuggestion {
  id?: string;
  name: string;
  producer: string | null;
  vintage?: number | null;
  region: string | null;
  country?: string | null;
  grape_varieties: string[] | null;
  alcohol_content?: number | null;
  tasting_notes?: string | null;
  tipo?: string | null;
  estilo?: string | null;
}

type ManualWineLookupStatus = 'idle' | 'loading' | 'done' | 'error';
type WineStatus = 'collection' | 'wishlist' | 'tasted';
type WineSection = WineStatus | 'favorites' | 'rejected';
type SectionCounts = Record<WineSection, number>;

interface WineSectionCountRow {
  id: string;
  status: WineStatus | null;
  rating: 'love' | 'ok' | 'not_for_me' | null;
  is_favorite: boolean | null;
}

const validWineSections: WineSection[] = ['collection', 'wishlist', 'tasted', 'favorites', 'rejected'];
const emptySectionCounts: SectionCounts = {
  collection: 0,
  wishlist: 0,
  tasted: 0,
  favorites: 0,
  rejected: 0,
};

const sectionFromRoute = (section?: string): WineSection => {
  if (section === 'no-repetir' || section === 'rejected') return 'rejected';
  return validWineSections.includes(section as WineSection) ? section as WineSection : 'collection';
};

const routeForWineSection = (section: WineSection) => {
  if (section === 'collection') return '/my-wines';
  if (section === 'rejected') return '/my-wines/no-repetir';
  return `/my-wines/${section}`;
};

const normalizeAttributeTo5 = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const scaled = numeric > 10 ? numeric / 20 : numeric > 5 ? numeric / 2 : numeric;
  return Math.max(1, Math.min(5, Math.round(scaled)));
};

const normalizeSensoryAttributesTo5 = (attributes: unknown) => {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return null;
  const attrs = attributes as Record<string, unknown>;
  const normalized = {
    potencia: normalizeAttributeTo5(attrs.potencia),
    acidez: normalizeAttributeTo5(attrs.acidez),
    dulzura: normalizeAttributeTo5(attrs.dulzura),
    taninos: normalizeAttributeTo5(attrs.taninos),
    afrutado: normalizeAttributeTo5(attrs.afrutado),
  };

  if (Object.values(normalized).some((value) => value === null)) return null;
  return normalized;
};

const normalizeAffinity = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const normalizeUserWine = (wine: UserWine): UserWine => ({
  ...wine,
  matchrim_affinity: normalizeAffinity(wine.matchrim_affinity),
  sensory_attributes: normalizeSensoryAttributesTo5(wine.sensory_attributes),
});

const MyWines = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { section } = useParams<{ section?: string }>();
  const isAddWineRoute = location.pathname === '/my-wines/add';
  const initialSection = sectionFromRoute(section);
  const [wines, setWines] = useState<UserWine[]>([]);
  const [learningWines, setLearningWines] = useState<LearningWine[]>([]);
  const [filteredWines, setFilteredWines] = useState<UserWine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedWineData | null>(null);
  const [extractedImageUrl, setExtractedImageUrl] = useState<string | null>(null);
  const [selectedWine, setSelectedWine] = useState<UserWine | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'high_affinity'>('all');
  const [statusFilter, setStatusFilter] = useState<WineSection>(initialSection);
  const [manualWineSuggestions, setManualWineSuggestions] = useState<WineSuggestion[]>([]);
  const [manualWineLookupStatus, setManualWineLookupStatus] = useState<ManualWineLookupStatus>('idle');
  const [manualWineNameConfirmed, setManualWineNameConfirmed] = useState(false);
  const [manualWineSelectedFromResults, setManualWineSelectedFromResults] = useState(false);
  const [sectionCounts, setSectionCounts] = useState<SectionCounts>(emptySectionCounts);

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

  const navigateToWineSection = (nextSection: WineSection) => {
    navigate(routeForWineSection(nextSection));
  };

  const closeAddDialog = () => {
    setShowAddDialog(false);
    resetForm();
    if (isAddWineRoute) navigate('/my-wines');
  };

  const manualWineName = formData.name.trim();
  const manualWineLookupNeedsConfirmation =
    showAddDialog &&
    manualWineName.length >= 3 &&
    (manualWineLookupStatus === 'done' || manualWineLookupStatus === 'error') &&
    manualWineSuggestions.length === 0 &&
    !manualWineNameConfirmed &&
    !manualWineSelectedFromResults;
  const manualWineLookupPending = showAddDialog && manualWineName.length >= 3 && manualWineLookupStatus === 'loading';
  const canContinueManualWine =
    manualWineName.length >= 2 &&
    !manualWineLookupPending &&
    !manualWineLookupNeedsConfirmation;
  const purchaseDialogMode: WineStatus = statusFilter === 'favorites' || statusFilter === 'rejected'
    ? 'wishlist'
    : statusFilter;

  useEffect(() => {
    if (isAddWineRoute) return;
    if (section && !validWineSections.includes(section as WineSection) && section !== 'no-repetir') {
      navigate('/my-wines', { replace: true });
      return;
    }

    const nextSection = sectionFromRoute(section);
    setStatusFilter((current) => current === nextSection ? current : nextSection);
  }, [isAddWineRoute, section, navigate]);

	  useEffect(() => {
	    if (authLoading) return;

	    if (!user) {
	      navigate(buildAuthRedirectPath("/my-wines"));
	      return;
	    }
	    loadWines();
	  }, [authLoading, user, navigate, statusFilter]);

	  useEffect(() => {
	    if (authLoading || !user) return;
	    loadLearningWines();
	  }, [authLoading, user]);

  useEffect(() => {
    if (isAddWineRoute) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAddWineRoute, statusFilter]);

  useEffect(() => {
    applyFilters();
  }, [wines, filterType]);

  useEffect(() => {
    if (!showAddDialog) {
      setManualWineSuggestions([]);
      setManualWineLookupStatus('idle');
      return;
    }

    const query = formData.name.trim();

    if (query.length < 3) {
      setManualWineSuggestions([]);
      setManualWineLookupStatus('idle');
      return;
    }

    let cancelled = false;
    setManualWineLookupStatus('loading');

    const timeout = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('search-wines', {
          body: { query, limit: 6 },
        });

        if (cancelled) return;
        if (error) throw error;

        setManualWineSuggestions((data?.wines || []).filter((wine: WineSuggestion) => wine?.name));
        setManualWineLookupStatus('done');
      } catch (error) {
        if (cancelled) return;
        console.error('Error validating manual wine name:', error);
        setManualWineSuggestions([]);
        setManualWineLookupStatus('error');
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [formData.name, showAddDialog]);

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

  const loadSectionCounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_wines")
        .select("id, status, rating, is_favorite")
        .eq("user_id", user.id);

      if (error) throw error;

      const rows = ((data as WineSectionCountRow[]) || []);
      setSectionCounts({
        collection: rows.filter((wine) => wine.status === 'collection').length,
        wishlist: rows.filter((wine) => wine.status === 'wishlist').length,
        tasted: rows.filter((wine) => Boolean(wine.rating)).length,
        favorites: rows.filter((wine) => Boolean(wine.is_favorite)).length,
        rejected: rows.filter((wine) => wine.rating === 'not_for_me').length,
      });
    } catch (error) {
      console.error("Error loading wine section counts:", error);
    }
  };

	  const loadWines = async () => {
	    setLoading(true);
	    try {
	      let query = supabase.from("user_wines").select("*").eq("user_id", user!.id);
      
      // Filter based on status
      if (statusFilter === 'favorites') {
        query = query.eq("is_favorite", true);
      } else if (statusFilter === 'rejected') {
        query = query.eq("rating", "not_for_me");
      } else if (statusFilter === 'collection') {
        query = query.eq("status", "collection");
      } else if (statusFilter === 'wishlist') {
        query = query.eq("status", "wishlist");
      } else if (statusFilter === 'tasted') {
        // Ya Probados shows all wines with a rating, regardless of status
        query = query.not("rating", "is", null);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setWines(((data as UserWine[]) || []).map(normalizeUserWine));
      void loadSectionCounts();
    } catch (error) {
      console.error("Error loading wines:", error);
      toast.error("Error al cargar tus vinos");
    } finally {
	      setLoading(false);
	    }
	  };

	  const loadLearningWines = async () => {
	    if (!user) return;

	    try {
	      const { data, error } = await supabase
	        .from("user_wines")
	        .select("id, name, rating, sensory_attributes, use_for_profile_training, grape_varieties, status, created_at")
	        .eq("user_id", user.id)
	        .not("rating", "is", null)
	        .order("created_at", { ascending: false });

	      if (error) throw error;
	      setLearningWines(((data as LearningWine[]) || []).map((wine) => ({
	        ...wine,
	        sensory_attributes: normalizeSensoryAttributesTo5(wine.sensory_attributes),
	      })));
	    } catch (error) {
	      console.error("Error loading learning wines:", error);
	    }
	  };

	  const handleExtractComplete = (wine: ExtractedWineData) => {
	    if (wine.is_favorite) navigateToWineSection('favorites');
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
    setManualWineNameConfirmed(true);
    setManualWineSelectedFromResults(true);
    setShowAddDialog(true);
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

  const updateManualWineName = (value: string) => {
    setFormData((current) => ({ ...current, name: value }));
    setManualWineNameConfirmed(false);
    setManualWineSelectedFromResults(false);
  };

  const handleManualSuggestionSelect = (wine: WineSuggestion) => {
    setFormData((current) => ({
      ...current,
      name: wine.name || current.name,
      producer: wine.producer || "",
      vintage: wine.vintage?.toString() || "",
      region: wine.region || "",
      country: wine.country || "",
      grape_varieties: wine.grape_varieties?.join(", ") || "",
      alcohol_content: wine.alcohol_content != null ? String(wine.alcohol_content) : current.alcohol_content,
      tasting_notes: wine.tasting_notes || current.tasting_notes,
    }));
    setManualWineNameConfirmed(true);
    setManualWineSelectedFromResults(true);
    setManualWineSuggestions([]);
    setManualWineLookupStatus('done');
  };

  const startManualWineSave = (targetStatus: WineStatus) => {
    if (!canContinueManualWine) {
      if (manualWineLookupPending) {
        toast.info("Espera un momento: estoy verificando el nombre del vino");
      } else if (manualWineLookupNeedsConfirmation) {
        toast.error("Confirma que has revisado el nombre del vino antes de continuar");
      } else {
        toast.error("Escribe el nombre del vino");
      }
      return;
    }

    setStatusFilter(targetStatus);
    setShowPurchaseDialog(true);
    setShowAddDialog(false);
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
      const saveStatus: WineStatus = statusFilter === 'favorites' || statusFilter === 'rejected'
        ? 'wishlist'
        : statusFilter;
      const sensoryAttributes = normalizeSensoryAttributesTo5(extractedData?.sensory_attributes || null);
      const manualSource = manualWineSelectedFromResults
        ? 'manual_search_result'
        : manualWineNameConfirmed
          ? 'manual_user_verified'
          : 'manual';
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
        matchrim_affinity: normalizeAffinity(extractedData?.matchrim_affinity) ?? null,
        sensory_attributes: sensoryAttributes as Json,
        status: saveStatus,
        quantity: saveStatus === 'collection' ? parseInt(formData.quantity) || 1 : null,
        is_favorite: statusFilter === 'favorites' ? true : undefined,
        use_for_profile_training: saveStatus === 'tasted',
        consumption_place: data?.place_name || null,
        consumption_place_type: data?.location_type || null,
        consumption_date: data?.purchase_date || null,
        price: data?.price || null,
        place_details: extractedData
          ? ({
              source: "label_scanner",
              affinity_reason: extractedData.affinity_reason || null,
            } as Json)
          : ({
              source: manualSource,
              name_verified_by_user: manualWineNameConfirmed,
            } as Json),
      };

      const { data: insertedWine, error } = await supabase
        .from("user_wines")
        .insert([wineData])
        .select()
        .single();

      if (error) throw error;

      // Calculate affinity in background
      if (insertedWine && (saveStatus === 'collection' || saveStatus === 'tasted') && !extractedData?.matchrim_affinity) {
        supabase.functions
          .invoke("calculate-wine-affinity", {
            body: { wine_id: insertedWine.id }
          })
          .then(({ data: affinityData }) => {
            const affinity = normalizeAffinity(affinityData?.affinity);
            const sensoryAttributes = normalizeSensoryAttributesTo5(affinityData?.sensory_attributes || null);

            if (affinity !== null) {
              setWines((prev) =>
                prev.map((w) =>
                  w.id === insertedWine.id
                    ? {
                        ...w,
                        matchrim_affinity: affinity,
                        sensory_attributes: sensoryAttributes || w.sensory_attributes,
                      }
                    : w
                )
              );
            }
          });
      }

      toast.success("Vino añadido exitosamente");
      trackAppEvent("wine_saved", {
        userId: user.id,
        metadata: {
          source: extractedData ? "label_scanner" : "manual",
          status: saveStatus,
          wine_name: formData.name,
          has_affinity: Boolean(extractedData?.matchrim_affinity),
        },
      });
      setShowPurchaseDialog(false);
	      setShowAddDialog(false);
	      resetForm();
	      loadWines();
	      loadLearningWines();
      if (isAddWineRoute) navigateToWineSection(saveStatus);
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
      const saveStatus: WineStatus = statusFilter === 'favorites' || statusFilter === 'rejected'
        ? 'wishlist'
        : statusFilter;
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
        status: saveStatus,
        quantity: saveStatus === 'collection' ? (formData.quantity ? parseInt(formData.quantity) : 1) : null,
        is_favorite: statusFilter === 'favorites' ? true : undefined,
        image_url: extractedImageUrl || null,
        use_for_profile_training: saveStatus === 'tasted',
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
      trackAppEvent("wine_saved", {
        userId: user!.id,
        metadata: {
          source: "manual",
          status: saveStatus,
          wine_name: formData.name,
        },
      });
      setShowAddDialog(false);
      resetForm();
      if (isAddWineRoute) navigateToWineSection(saveStatus);

      // Calculate affinity in background for collection and tasted wines
      if (newWine && (saveStatus === 'collection' || saveStatus === 'tasted')) {
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
	      loadLearningWines();
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
        .eq("id", wineId)
        .eq("user_id", user!.id);

      if (error) throw error;

      toast.success(currentFavorite ? "Eliminado de Favoritos" : "Añadido a Mis vinos > Favoritos");
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

    if (!normalizeSensoryAttributesTo5(wine.sensory_attributes)) {
      toast.error("Este vino no tiene atributos sensoriales suficientes para entrenar el perfil");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_wines")
        .update({ use_for_profile_training: nextValue })
        .eq("id", wineId)
        .eq("user_id", user!.id);

      if (error) throw error;

      setWines((currentWines) =>
        currentWines.map((item) =>
          item.id === wineId ? { ...item, use_for_profile_training: nextValue } : item
        )
      );

	      toast.success(nextValue ? "Este vino volverá a afinar tu perfil" : "Este vino ya no entrena tu perfil");
	      loadLearningWines();
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
        .eq("id", wineId)
        .eq("user_id", user!.id);

      if (error) throw error;

      const message = wine?.status === 'collection'
        ? `Vino puntuado${wine.quantity && wine.quantity > 1 ? ` (quedan ${wine.quantity - 1} botellas)` : ' y movido a Ya Probados'}`
        : wine?.status === 'wishlist'
          ? 'Vino movido a Ya Probados y usado para afinar tu perfil'
          : "Valoración guardada";
      
      toast.success(message);
      trackAppEvent("wine_rating_added", {
        userId: user!.id,
        metadata: {
          wine_id: wineId,
          rating,
          previous_status: wine?.status || null,
          has_sensory_attributes: Boolean(wine?.sensory_attributes),
        },
      });
      if (wine?.sensory_attributes) {
        trackAppEvent("profile_learning_updated", {
          userId: user!.id,
          metadata: {
            wine_id: wineId,
            rating,
          },
        });
      }

      if (updateData.status === 'tasted') {
        navigateToWineSection(rating === 'not_for_me' ? 'rejected' : 'tasted');
      }

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
	      loadLearningWines();
	    } catch (error) {
      console.error("Error rating wine:", error);
      toast.error("Error al guardar valoración");
    }
  };

  const handleDeleteWine = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este vino?")) return;

    try {
      const { error } = await supabase.from("user_wines").delete().eq("id", id).eq("user_id", user!.id);

      if (error) throw error;

	      toast.success("Vino eliminado");
	      loadWines();
	      loadLearningWines();
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
    setManualWineSuggestions([]);
    setManualWineLookupStatus('idle');
    setManualWineNameConfirmed(false);
    setManualWineSelectedFromResults(false);
  };

  useEffect(() => {
    if (!isAddWineRoute || showAddDialog || showPurchaseDialog) return;
    resetForm();
    setShowAddDialog(true);
  }, [isAddWineRoute, showAddDialog, showPurchaseDialog]);

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

	  const buildWinePrompt = (wine: UserWine) => [
	    wine.name,
	    wine.producer,
	    wine.vintage,
	    wine.region,
	    wine.country,
	    wine.grape_varieties?.join(', '),
	  ].filter(Boolean).join(' · ');

	  const askAiRimAboutWine = (wine: UserWine, intent: 'fit' | 'similar') => {
	    const winePrompt = encodeURIComponent(buildWinePrompt(wine));
	    const functionName = intent === 'similar' ? 'similar-wine' : 'wine-fit';
	    navigate(`/inteligencia-liquida?function=${functionName}&wine=${winePrompt}`);
	  };

	  const learningStats = useMemo(() => {
	    const keys = ['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado'] as const;
	    type SensoryKey = typeof keys[number];
	    type TrainableWine = { wine: LearningWine; attrs: Record<SensoryKey, number> };

	    const rated = learningWines.filter((wine) => wine.rating);
	    const trainable = rated
	      .map((wine) => {
	        const attrs = normalizeSensoryAttributesTo5(wine.sensory_attributes);
	        return wine.use_for_profile_training && attrs
	          ? { wine, attrs: attrs as Record<SensoryKey, number> }
	          : null;
	      })
	      .filter((item): item is TrainableWine => Boolean(item));
	    const loved = rated.filter((wine) => wine.rating === 'love');
	    const rejected = rated.filter((wine) => wine.rating === 'not_for_me');

	    const grapeCounts = new Map<string, number>();
	    loved.forEach((wine) => {
	      wine.grape_varieties?.forEach((grape) => {
	        const key = grape.trim();
	        if (!key) return;
	        grapeCounts.set(key, (grapeCounts.get(key) ?? 0) + 1);
	      });
	    });

	    const topGrapes = Array.from(grapeCounts.entries())
	      .sort((a, b) => b[1] - a[1])
	      .slice(0, 3)
	      .map(([grape]) => grape);

	    const totals = keys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {} as Record<SensoryKey, number>);
	    trainable.forEach(({ attrs }) => {
	      keys.forEach((key) => {
	        totals[key] += attrs[key];
	      });
	    });

	    const dominant = trainable.length
	      ? keys
	          .map((key) => ({
	            key,
	            label: key === 'dulzura' ? 'dulzor' : key,
	            value: Math.round((totals[key] / trainable.length) * 10) / 10,
	          }))
	          .sort((a, b) => b.value - a.value)
	          .slice(0, 2)
	      : [];

	    const nextStep = trainable.length === 0
	      ? 'Puntúa un vino con atributos para que Matchrim empiece a aprender.'
	      : trainable.length < 3
	        ? 'Puntúa al menos 3 vinos más para que el patrón deje de depender de una sola botella.'
	        : 'Sigue puntuando vinos de cartas reales: ahí es donde tus recomendaciones mejoran más.';

	    return {
	      ratedCount: rated.length,
	      trainingCount: trainable.length,
	      lovedCount: loved.length,
	      rejectedCount: rejected.length,
	      confidence: Math.min(100, Math.round((trainable.length / 12) * 100)),
	      topGrapes,
	      dominant,
	      nextStep,
	    };
	  }, [learningWines]);

	  const trainingReadyCount = learningStats.trainingCount;
	  const ratedCount = learningStats.ratedCount;
  const activeSectionCopy = {
    collection: {
      title: 'Mi Bodega',
      kicker: 'Vinos que tienes ahora',
      detail: 'Aquí viven las botellas que tienes en casa o localizadas. Al puntuarlas, si se terminan, pasan a Ya Probados.',
      action: 'Añadir vino',
      icon: Wine,
      onAction: () => navigate('/my-wines/add'),
    },
    wishlist: {
      title: 'Quiero Probar',
      kicker: 'Candidatos para pedir o comprar',
      detail: 'Aquí van los vinos que te interesan desde cartas, etiquetas o búsquedas. Cuando los puntúas, pasan a Ya Probados.',
      action: 'Escanear carta',
      icon: Heart,
      onAction: () => navigate('/escanear/carta-vinos'),
    },
    tasted: {
      title: 'Ya Probados',
      kicker: 'Historial que enseña a Matchrim',
      detail: 'Cada valoración aporta señal. Los vinos con atributos 1-5 afinan tus recomendaciones sin cambiar tu código público.',
      action: 'Puntuar pendientes',
      icon: Star,
      onAction: () => navigateToWineSection('wishlist'),
    },
    favorites: {
      title: 'Favoritos',
      kicker: 'Marca transversal',
      detail: 'Favorito no mueve el vino: solo lo destaca. El vino sigue en Mi Bodega, Quiero Probar o Ya Probados y también aparece aquí.',
      action: 'Ver Quiero Probar',
      icon: Heart,
      onAction: () => navigateToWineSection('wishlist'),
    },
    rejected: {
      title: 'No repetir',
      kicker: 'Señales negativas',
      detail: 'Los vinos marcados como “No va” ayudan a alejar estilos, uvas y estructuras que no te compensan.',
      action: 'Ver Ya Probados',
      icon: ThumbsDown,
      onAction: () => navigateToWineSection('tasted'),
    },
  } satisfies Record<WineSection, {
    title: string;
    kicker: string;
    detail: string;
    action: string;
    icon: typeof Wine;
    onAction: () => void;
  }>;
  const ActiveSectionIcon = activeSectionCopy[statusFilter].icon;
  const sectionCards = [
    {
      section: 'collection' as const,
      label: 'Mi Bodega',
      helper: 'Tengo',
      icon: Wine,
      count: sectionCounts.collection,
    },
    {
      section: 'wishlist' as const,
      label: 'Quiero Probar',
      helper: 'Pendientes',
      icon: Heart,
      count: sectionCounts.wishlist,
    },
    {
      section: 'tasted' as const,
      label: 'Ya Probados',
      helper: 'Valorados',
      icon: Star,
      count: sectionCounts.tasted,
    },
    {
      section: 'favorites' as const,
      label: 'Favoritos',
      helper: 'Marcados',
      icon: Heart,
      count: sectionCounts.favorites,
    },
    {
      section: 'rejected' as const,
      label: 'No repetir',
      helper: 'Evitar',
      icon: ThumbsDown,
      count: sectionCounts.rejected,
    },
  ];

	  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <AppNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

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
          <p className="text-muted-foreground">
            Tu bodega, tus pendientes y las señales que hacen que Matchrim aprenda.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-red-100 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-red-900" />
                Añadir o encontrar vinos
              </CardTitle>
              <CardDescription>
                Elige una acción. Favoritos es una vista transversal: un vino puede seguir en Bodega, Quiero Probar o Ya Probados y aparecer también en Favoritos.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Button
                type="button"
                variant="outline"
                className="matchrim-pressable h-auto justify-start gap-3 p-4 text-left"
                onClick={() => navigate('/escanear/etiqueta')}
              >
                <ScanLine className="h-5 w-5 shrink-0 text-red-900" />
                <span>
                  <span className="block font-semibold">Escanear etiqueta</span>
                  <span className="block text-xs font-normal text-muted-foreground">Identificar y guardar</span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="matchrim-pressable h-auto justify-start gap-3 p-4 text-left"
                onClick={() => navigate('/escanear/carta-vinos')}
              >
                <Search className="h-5 w-5 shrink-0 text-red-900" />
                <span>
                  <span className="block font-semibold">Escanear carta</span>
                  <span className="block text-xs font-normal text-muted-foreground">Encontrar candidatos</span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="matchrim-pressable h-auto justify-start gap-3 p-4 text-left"
                onClick={() => navigate('/my-wines/add')}
              >
                <Plus className="h-5 w-5 shrink-0 text-red-900" />
                  <span>
                    <span className="block font-semibold">Añadir manualmente</span>
                    <span className="block text-xs font-normal text-muted-foreground">Buscar, validar o completar</span>
                  </span>
                </Button>
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Search className="h-4 w-4 text-red-900" />
                  Buscar catálogo
                </div>
                <WineSearchBar onSelectWine={handleSearchWineSelect} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-100 bg-white">
            <CardContent className="p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
                <div className="rounded-lg border border-red-100 bg-red-50/70 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-red-900 shadow-sm">
                      <ActiveSectionIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-red-900/70">
                        {activeSectionCopy[statusFilter].kicker}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold leading-tight text-red-950">
                        {activeSectionCopy[statusFilter].title}
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-red-950/75">
                        {activeSectionCopy[statusFilter].detail}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      className="matchrim-pressable gap-2 bg-red-800 hover:bg-red-900"
                      onClick={activeSectionCopy[statusFilter].onAction}
                    >
                      <ActiveSectionIcon className="h-4 w-4" />
                      {activeSectionCopy[statusFilter].action}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="matchrim-pressable gap-2 bg-white"
                      onClick={() => navigate('/escanear')}
                    >
                      <ScanLine className="h-4 w-4" />
                      Escanear algo
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-5 lg:grid-cols-1">
                  {sectionCards.map((item) => {
                    const SectionIcon = item.icon;
                    const isActive = item.section === statusFilter;

                    return (
                      <button
                        key={item.section}
                        type="button"
                        onClick={() => navigateToWineSection(item.section)}
                        className={`matchrim-pressable flex min-h-16 items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                          isActive
                            ? 'border-red-900 bg-red-950 text-white shadow-sm'
                            : 'border-stone-200 bg-white text-foreground hover:border-red-200 hover:bg-red-50/50'
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                          isActive ? 'bg-white/15 text-white' : 'bg-red-50 text-red-900'
                        }`}>
                          <SectionIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{item.label}</span>
                          <span className={`block truncate text-xs ${
                            isActive ? 'text-white/70' : 'text-muted-foreground'
                          }`}>
                            {item.helper}
                          </span>
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          isActive ? 'bg-white text-red-950' : 'bg-stone-100 text-stone-700'
                        }`}>
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

		            <Card className="overflow-hidden border-red-100 bg-white">
	              <CardHeader className="border-b bg-red-950 text-white">
	                <CardTitle className="flex items-center gap-2">
	                  <Sparkles className="h-5 w-5" />
	                  Así aprende tu Matchrim
	                </CardTitle>
	                <CardDescription className="text-white/75">
	                  Tus valoraciones afinan el perfil: “me encanta” acerca tus recomendaciones a ese vino, “no va” las aleja y “correcto” pesa menos.
	                </CardDescription>
	              </CardHeader>
	              <CardContent className="grid gap-3 p-4 md:grid-cols-4">
	                <div className="rounded-lg border bg-muted/30 p-4">
	                  <p className="text-xs font-semibold uppercase text-muted-foreground">Señales útiles</p>
	                  <div className="mt-2 flex items-end gap-2">
	                    <span className="text-3xl font-bold">{learningStats.trainingCount}</span>
	                    <span className="pb-1 text-sm text-muted-foreground">entrenando</span>
	                  </div>
	                  <p className="mt-2 text-xs text-muted-foreground">
	                    {learningStats.ratedCount} vino{learningStats.ratedCount !== 1 ? 's' : ''} puntuado{learningStats.ratedCount !== 1 ? 's' : ''}.
	                  </p>
	                </div>

	                <div className="rounded-lg border bg-muted/30 p-4">
	                  <p className="text-xs font-semibold uppercase text-muted-foreground">Preferencias claras</p>
	                  <div className="mt-2 flex flex-wrap gap-1.5">
	                    {learningStats.topGrapes.length > 0 ? (
	                      learningStats.topGrapes.map((grape) => (
	                        <Badge key={grape} variant="outline">{grape}</Badge>
	                      ))
	                    ) : (
	                      <span className="text-sm text-muted-foreground">Aún sin uvas dominantes</span>
	                    )}
	                  </div>
	                  <p className="mt-2 text-xs text-muted-foreground">
	                    {learningStats.lovedCount} “me encanta” y {learningStats.rejectedCount} “no va”.
	                  </p>
	                </div>

	                <div className="rounded-lg border bg-muted/30 p-4">
	                  <p className="text-xs font-semibold uppercase text-muted-foreground">Perfil que aparece</p>
	                  <div className="mt-2 space-y-1">
	                    {learningStats.dominant.length > 0 ? (
	                      learningStats.dominant.map((item) => (
	                        <div key={item.key} className="flex items-center justify-between gap-2 text-sm">
	                          <span className="capitalize text-muted-foreground">{item.label}</span>
	                          <span className="font-semibold">{item.value}/5</span>
	                        </div>
	                      ))
	                    ) : (
	                      <p className="text-sm text-muted-foreground">Necesito vinos con atributos 1-5.</p>
	                    )}
	                  </div>
	                  <Progress value={learningStats.confidence} className="mt-3 h-2" />
	                </div>

	                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
	                  <p className="text-xs font-semibold uppercase text-amber-900">Siguiente paso</p>
	                  <p className="mt-2 text-sm leading-5 text-amber-950">{learningStats.nextStep}</p>
	                  <Button
	                    variant="outline"
	                    size="sm"
	                    className="mt-3 gap-2 border-amber-300 bg-white text-amber-950"
	                    onClick={() => navigateToWineSection('wishlist')}
	                  >
	                    <Heart className="h-4 w-4" />
	                    Puntuar pendientes
	                  </Button>
	                </div>
	              </CardContent>
	            </Card>

	            <Tabs
	              value={statusFilter}
	              onValueChange={(v) => {
                navigateToWineSection(v as WineSection);
                setFilterType('all');
              }}
            >
              <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-5">
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
                <TabsTrigger value="favorites" className="min-h-14 gap-1 px-1 sm:gap-2 sm:px-3">
                  <Heart className="h-4 w-4 fill-current" />
                  <div className="flex min-w-0 flex-col items-start">
                    <span>Favoritos</span>
                    <span className="hidden text-[10px] text-muted-foreground font-normal sm:block">Tus marcados</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="min-h-14 gap-1 px-1 sm:gap-2 sm:px-3">
                  <ThumbsDown className="h-4 w-4" />
                  <div className="flex min-w-0 flex-col items-start">
                    <span>No repetir</span>
                    <span className="hidden text-[10px] text-muted-foreground font-normal sm:block">Señal negativa</span>
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
                          ? `${trainingReadyCount} vino${trainingReadyCount !== 1 ? 's' : ''} con atributos está${trainingReadyCount !== 1 ? 'n' : ''} afinando tus recomendaciones Matchrim.`
                          : ratedCount > 0
                            ? 'Tienes vinos puntuados, pero todavía faltan atributos sensoriales para entrenar el perfil.'
                            : 'Puntúa vinos guardados desde cartas Winerim para que tus recomendaciones sean más precisas.'}
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
                      <DropdownMenuItem onClick={() => setFilterType('high_affinity')}>
                        <Star className="h-4 w-4 mr-2" />
                        Alta Afinidad ({wines.filter(w => w.matchrim_affinity && w.matchrim_affinity >= 70).length})
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {filterType !== 'all' && (
                    <Badge variant="secondary">
                      {filterType === 'high_affinity' && '⭐ Alta Afinidad'}
                    </Badge>
                  )}
                </div>

                {/* Wine Collection Grid */}
                {filteredWines.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center px-5 py-12 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-red-50 text-red-900">
                        {statusFilter === 'wishlist' || statusFilter === 'favorites' ? (
                          <Heart className="h-7 w-7" />
                        ) : statusFilter === 'tasted' ? (
                          <Star className="h-7 w-7" />
                        ) : statusFilter === 'rejected' ? (
                          <ThumbsDown className="h-7 w-7" />
                        ) : (
                          <Wine className="h-7 w-7" />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {statusFilter === 'collection' && 'Tu bodega empieza con la primera botella'}
                        {statusFilter === 'wishlist' && 'Guarda aquí los vinos que te recomienda Winerim'}
                        {statusFilter === 'tasted' && 'Puntúa vinos para que Matchrim aprenda contigo'}
                        {statusFilter === 'favorites' && 'Tus favoritos aparecerán aquí'}
                        {statusFilter === 'rejected' && 'Aquí van los vinos que no quieres repetir'}
                      </h3>
                      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                        {statusFilter === 'collection' && 'Escanea una etiqueta, busca un vino o añádelo manualmente para recordar qué tienes en casa.'}
                        {statusFilter === 'wishlist' && 'Cuando filtres una carta o escanees un restaurante sin Winerim, podrás guardar candidatos para probarlos después.'}
                        {statusFilter === 'tasted' && 'Los vinos puntuados con atributos sensoriales afinan tus recomendaciones futuras sin cambiar tu código público.'}
                        {statusFilter === 'favorites' && 'Toca el corazón de cualquier vino en Bodega, Quiero Probar o Ya Probados para verlo en esta sección.'}
                        {statusFilter === 'rejected' && 'Cuando marques “No va”, Matchrim aprende qué estilos, uvas o estructuras alejar de tus recomendaciones.'}
                      </p>
                      <div className="mt-5 flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
                        {statusFilter === 'wishlist' ? (
                          <Button onClick={() => navigate('/escanear/carta-vinos')} className="gap-2 bg-red-800 hover:bg-red-900">
                            <ScanLine className="h-4 w-4" />
                            Usar mi código
                          </Button>
                        ) : statusFilter === 'favorites' ? (
                          <Button onClick={() => navigateToWineSection('wishlist')} className="gap-2 bg-red-800 hover:bg-red-900">
                            <Heart className="h-4 w-4" />
                            Ver Quiero Probar
                          </Button>
                        ) : statusFilter === 'tasted' ? (
                          <Button onClick={() => navigateToWineSection('wishlist')} className="gap-2 bg-red-800 hover:bg-red-900">
                            <Heart className="h-4 w-4" />
                            Ver Quiero Probar
                          </Button>
                        ) : statusFilter === 'rejected' ? (
                          <Button onClick={() => navigateToWineSection('tasted')} className="gap-2 bg-red-800 hover:bg-red-900">
                            <Star className="h-4 w-4" />
                            Ver Ya Probados
                          </Button>
                        ) : (
                          <Button
                            onClick={() => navigate('/my-wines/add')}
                            className="gap-2 bg-red-800 hover:bg-red-900"
                          >
                            <Plus className="h-4 w-4" />
                            Añadir vino
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => navigate('/escanear/carta-vinos')}
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
                          {wine.status === 'collection' && wine.quantity !== null && (
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
                            {statusFilter === 'favorites' && (
                              <Badge className="bg-red-50 text-red-900 hover:bg-red-50">
                                {wine.status === 'collection' && 'Mi Bodega'}
                                {wine.status === 'wishlist' && 'Quiero Probar'}
                                {wine.status === 'tasted' && 'Ya Probado'}
                              </Badge>
                            )}
                            {statusFilter === 'rejected' && (
                              <Badge className="bg-red-50 text-red-900 hover:bg-red-50">
                                No repetir
                              </Badge>
                            )}
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

	                          <div className="grid gap-2 pt-2 sm:grid-cols-2">
	                            <Button
	                              type="button"
	                              variant="outline"
	                              size="sm"
	                              className="gap-2"
	                              onClick={() => askAiRimAboutWine(wine, 'fit')}
	                            >
	                              <Sparkles className="h-4 w-4" />
	                              ¿Por qué encaja?
	                            </Button>
	                            <Button
	                              type="button"
	                              variant="outline"
	                              size="sm"
	                              className="gap-2"
	                              onClick={() => askAiRimAboutWine(wine, 'similar')}
	                            >
	                              <ScanLine className="h-4 w-4" />
	                              Buscar parecido
	                            </Button>
	                          </div>

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
                          {(wine.status === 'tasted' || wine.status === 'collection' || wine.status === 'wishlist') && (
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
        </div>

        {/* Purchase Info Dialog */}
        <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
          <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg">
            <DialogHeader className="sr-only">
              <DialogTitle>Detalles del vino</DialogTitle>
              <DialogDescription>
                Completa dónde encontraste, compraste o tomaste este vino.
              </DialogDescription>
            </DialogHeader>
            <PurchaseInfoSelector
              mode={purchaseDialogMode}
              onConfirm={handlePurchaseInfoConfirm}
              onCancel={() => {
                setShowPurchaseDialog(false);
                if (isAddWineRoute) navigate('/my-wines');
                resetForm();
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Add/Edit Wine Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          if (open) {
            setShowAddDialog(true);
            return;
          }
          closeAddDialog();
        }}>
          <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg">
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
                    onChange={(e) => updateManualWineName(e.target.value)}
                    placeholder="Ej: Viña Albali Reserva"
                  />
                  {manualWineName.length >= 3 && (
                    <div className="mt-2 rounded-lg border bg-muted/20 p-3">
                      {manualWineLookupStatus === 'loading' ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Buscando coincidencias...
                        </div>
                      ) : manualWineSelectedFromResults ? (
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          Validado desde resultados
                        </div>
                      ) : manualWineSuggestions.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Search className="h-4 w-4 text-primary" />
                            Coincidencias encontradas
                          </div>
                          <div className="grid gap-2">
                            {manualWineSuggestions.map((wine, index) => (
                              <button
                                key={`${wine.name}-${wine.producer || 'producer'}-${index}`}
                                type="button"
                                onClick={() => handleManualSuggestionSelect(wine)}
                                className="rounded-md border bg-background p-3 text-left transition-colors hover:bg-accent"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">{wine.name}</p>
                                    {wine.producer && (
                                      <p className="truncate text-xs text-muted-foreground">{wine.producer}</p>
                                    )}
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {wine.vintage && <Badge variant="outline">{wine.vintage}</Badge>}
                                      {wine.region && <Badge variant="outline">{wine.region}</Badge>}
                                      {wine.tipo && <Badge variant="secondary">{wine.tipo}</Badge>}
                                    </div>
                                  </div>
                                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : manualWineLookupStatus === 'done' || manualWineLookupStatus === 'error' ? (
                        <div className="space-y-3">
                          <div className="flex items-start gap-2 text-sm">
                            {manualWineNameConfirmed ? (
                              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            ) : (
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            )}
                            <div>
                              <p className="font-medium">
                                {manualWineLookupStatus === 'error'
                                  ? 'No he podido verificarlo ahora'
                                  : 'No encuentro coincidencias claras'}
                              </p>
                              <p className="text-muted-foreground">
                                Revisa nombre, bodega y añada. Si el vino está bien escrito, confírmalo para guardarlo manualmente.
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant={manualWineNameConfirmed ? "secondary" : "outline"}
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              setManualWineNameConfirmed(true);
                              setManualWineSelectedFromResults(false);
                            }}
                          >
                            <CheckCircle className="h-4 w-4" />
                            {manualWineNameConfirmed ? 'Nombre confirmado' : 'He revisado el nombre'}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
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
                {purchaseDialogMode === 'collection' && (
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
	                    closeAddDialog();
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
                    onClick={() => startManualWineSave('collection')}
                    disabled={saving || !canContinueManualWine}
                  >
                    Mi Bodega
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => startManualWineSave('wishlist')}
                    disabled={saving || !canContinueManualWine}
                  >
                    Quiero Probar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => startManualWineSave('tasted')}
                    disabled={saving || !canContinueManualWine}
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
