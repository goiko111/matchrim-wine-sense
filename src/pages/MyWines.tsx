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
import { WineLabelOCRImport } from "@/components/wine-import/WineLabelOCRImport";
import { WineMenuScanner } from "@/components/wine-import/WineMenuScanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wine, Plus, Trash2, Loader2, Calendar, MapPin, Grape, ScanLine } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedWineData | null>(null);

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
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadWines();
  }, [user, navigate]);

  const loadWines = async () => {
    try {
      const { data, error } = await supabase
        .from("user_wines")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWines(data || []);
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
    });
    setShowAddDialog(true);
  };

  const handleSaveWine = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre del vino es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const wineData = {
        user_id: user!.id,
        name: formData.name,
        producer: formData.producer || null,
        vintage: formData.vintage ? parseInt(formData.vintage) : null,
        region: formData.region || null,
        country: formData.country || null,
        grape_varieties: formData.grape_varieties 
          ? formData.grape_varieties.split(",").map(v => v.trim())
          : null,
        alcohol_content: formData.alcohol_content ? parseFloat(formData.alcohol_content) : null,
        tasting_notes: formData.tasting_notes || null,
      };

      const { error } = await supabase.from("user_wines").insert([wineData]);

      if (error) throw error;

      toast.success("¡Vino añadido a tu colección!");
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
    });
    setExtractedData(null);
  };

  if (!user) {
    return null;
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
          <p className="text-muted-foreground">Tu colección personal de vinos</p>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="scan-menu" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan-menu" className="gap-2">
              <ScanLine className="h-4 w-4" />
              Scanner de Cartas
            </TabsTrigger>
            <TabsTrigger value="my-collection" className="gap-2">
              <Wine className="h-4 w-4" />
              Mi Colección
            </TabsTrigger>
          </TabsList>

          {/* Wine Menu Scanner Tab */}
          <TabsContent value="scan-menu" className="space-y-6">
            <WineMenuScanner />
          </TabsContent>

          {/* My Collection Tab */}
          <TabsContent value="my-collection" className="space-y-6">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wine className="h-5 w-5" />
              Añadir Vino con OCR
            </CardTitle>
            <CardDescription>
              Fotografía la etiqueta y extrae automáticamente la información
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WineLabelOCRImport onExtractComplete={handleExtractComplete} />
          </CardContent>
        </Card>

        {/* Manual Add Button */}
        <div className="mb-6">
          <Button
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Añadir Vino Manualmente
          </Button>
        </div>

        {/* Wines Grid */}
        {wines.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Aún no tienes vinos en tu colección.
                <br />
                Añade tu primer vino usando OCR o manualmente.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wines.map((wine) => (
              <Card key={wine.id} className="relative group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{wine.name}</CardTitle>
                      {wine.producer && (
                        <CardDescription>{wine.producer}</CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteWine(wine.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {wine.vintage && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{wine.vintage}</span>
                    </div>
                  )}
                  {wine.region && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {wine.region}
                        {wine.country && `, ${wine.country}`}
                      </span>
                    </div>
                  )}
                  {wine.grape_varieties && wine.grape_varieties.length > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Grape className="h-4 w-4" />
                      <span>{wine.grape_varieties.join(", ")}</span>
                    </div>
                  )}
                  {wine.alcohol_content && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">{wine.alcohol_content}%</span> alcohol
                    </div>
                  )}
                  {wine.tasting_notes && (
                    <p className="text-muted-foreground italic mt-3 line-clamp-3">
                      {wine.tasting_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {extractedData ? "Verificar y Guardar Vino" : "Añadir Vino Manualmente"}
              </DialogTitle>
              <DialogDescription>
                {extractedData 
                  ? "Revisa los datos extraídos y modifica si es necesario"
                  : "Ingresa los datos del vino manualmente"}
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
                    placeholder="Describe los aromas, sabores y tus impresiones..."
                    rows={4}
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