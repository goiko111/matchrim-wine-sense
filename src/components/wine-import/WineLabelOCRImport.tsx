import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, Camera, X, BookmarkPlus, MessageSquare, Search, Sparkles, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { normalizeSensoryAttributes } from "@/utils/sensoryNormalize";
import { trackAppEvent } from "@/lib/analytics";

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
  sensory_attributes?: Record<string, number> | null;
  affinity_reason?: string | null;
}

interface WineLabelOCRImportProps {
  onExtractComplete: (wine: ExtractedWineData) => void;
}

const buildAirimDescription = (w: ExtractedWineData) => {
  const parts = [w.nombre];
  if (w.productor) parts.push(w.productor);
  if (w.anada) parts.push(String(w.anada));
  if (w.region) parts.push(w.region);
  if (w.uvas?.length) parts.push(w.uvas.join(', '));
  return parts.filter(Boolean).join(' · ');
};

export const WineLabelOCRImport = ({ onExtractComplete }: WineLabelOCRImportProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [identified, setIdentified] = useState<ExtractedWineData | null>(null);
  const [affinityLoading, setAffinityLoading] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona una imagen válida");
      return;
    }

    setLoading(true);
    setIdentified(null);
    setNeedsProfile(false);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    await processImage(file);
  };

  const processImage = async (file: File) => {
    trackAppEvent("wine_label_scan_started");
    try {
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('extract-wine-label-ocr', {
        body: { image: base64Image }
      });

      if (error) throw error;

      if (!data?.wine) {
        toast.info("No se pudo extraer información de la etiqueta");
        setLoading(false);
        return;
      }

      const wine: ExtractedWineData = data.wine;
      toast.success("✨ Etiqueta identificada");
      trackAppEvent("wine_label_scan_completed", { name: wine.nombre });

      // Search bottle image (best-effort)
      try {
        const { data: imageData } = await supabase.functions.invoke('search-wine-image', {
          body: {
            wineName: wine.nombre,
            producer: wine.productor,
            vintage: wine.anada,
          },
        });
        if (imageData?.imageUrl) wine.imagen_url = imageData.imageUrl;
      } catch (imageError) {
        console.error('Error searching for wine image:', imageError);
      }

      setIdentified(wine);
      setLoading(false);

      // Compute "encaje conmigo" for logged-in users (no DB write)
      if (user) {
        setAffinityLoading(true);
        try {
          const { data: aff, error: affErr } = await supabase.functions.invoke('calculate-wine-affinity', {
            body: {
              wine: {
                name: wine.nombre,
                producer: wine.productor,
                vintage: wine.anada,
                region: wine.region,
                country: wine.pais,
                grape_varieties: wine.uvas,
              },
            },
          });
          if (affErr) throw affErr;
          if (aff?.affinity == null && aff?.message) {
            setNeedsProfile(true);
          } else if (aff?.affinity != null) {
            setIdentified((cur) =>
              cur
                ? {
                    ...cur,
                    matchrim_affinity: aff.affinity,
                    sensory_attributes: normalizeSensoryAttributes(aff.sensory_attributes) ?? null,
                  }
                : cur
            );
          }
        } catch (e) {
          console.error('Affinity error:', e);
        } finally {
          setAffinityLoading(false);
        }
      }
    } catch (error) {
      console.error('Error processing image:', error);
      trackAppEvent("wine_label_scan_failed", { error: String(error) });
      toast.error("Error al procesar la imagen");
      setLoading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setIdentified(null);
    setNeedsProfile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const affinityColor = (s: number) =>
    s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground space-y-2">
        <p className="font-medium">✨ Reconocimiento inteligente de etiquetas</p>
        <p>Identifica el vino, calcula tu encaje y luego decide si lo guardas</p>
      </div>

      <div className="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center bg-card">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={loading}
        />

        {preview ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img src={preview} alt="Preview" className="max-h-72 mx-auto rounded-lg shadow-lg" />
              {!loading && (
                <Button onClick={clearPreview} variant="destructive" size="icon" className="absolute top-2 right-2">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {loading && (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Analizando etiqueta...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Camera className="w-16 h-16 mx-auto text-primary/40" />
            <div>
              <p className="text-lg font-semibold text-foreground mb-2">Fotografía la etiqueta del vino</p>
              <p className="text-sm text-muted-foreground mb-4">JPG, PNG, WEBP hasta 20MB</p>
            </div>
            <Button onClick={() => fileInputRef.current?.click()} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Seleccionar Imagen
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {identified && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-start gap-4">
            {identified.imagen_url && (
              <img
                src={identified.imagen_url}
                alt={identified.nombre}
                className="h-24 w-24 rounded-md object-contain bg-muted"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold leading-tight">{identified.nombre}</h3>
              {identified.productor && (
                <p className="text-sm text-muted-foreground">{identified.productor}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {identified.anada && <Badge variant="outline">{identified.anada}</Badge>}
                {identified.region && <Badge variant="outline">{identified.region}</Badge>}
                {identified.pais && <Badge variant="outline">{identified.pais}</Badge>}
                {identified.alcohol != null && <Badge variant="secondary">{identified.alcohol}% ABV</Badge>}
              </div>
              {identified.uvas?.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">Uvas: </span>{identified.uvas.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Encaje conmigo */}
          {user ? (
            affinityLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculando tu encaje Matchrim...
              </div>
            ) : needsProfile ? (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                Completa tu test Matchrim para ver el encaje con este vino.
                <Button variant="link" className="px-1 h-auto text-amber-900" onClick={() => navigate('/matchrim')}>
                  Hacer el test
                </Button>
              </div>
            ) : identified.matchrim_affinity != null ? (
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-1">
                    <Sparkles className="h-4 w-4" /> Encaje conmigo
                  </span>
                  <span className={`font-bold ${affinityColor(identified.matchrim_affinity)}`}>
                    {identified.matchrim_affinity}%
                  </span>
                </div>
                <Progress value={identified.matchrim_affinity} className="h-2" />
                {identified.sensory_attributes && (
                  <div className="grid grid-cols-5 gap-1 pt-1 text-xs">
                    {(['potencia','acidez','dulzura','taninos','afrutado'] as const).map((k) => {
                      const normalized = normalizeSensoryAttributes(identified.sensory_attributes ?? null);
                      const v = normalized?.[k] ?? null;
                      return (
                        <div key={k} className="text-center">
                          <div className="font-medium">{v ?? '—'}</div>
                          <div className="text-muted-foreground capitalize">{k}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null
          ) : (
            <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
              Inicia sesión para ver tu encaje Matchrim con este vino.
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              className="gap-2"
              onClick={() => onExtractComplete(identified)}
            >
              <BookmarkPlus className="h-4 w-4" />
              Guardar vino
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate('/usar-matchrim?mode=scanner')}
            >
              <Search className="h-4 w-4" />
              Buscar parecidos en carta
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() =>
                navigate(`/inteligencia-liquida?function=dish-for-wine&wine=${encodeURIComponent(buildAirimDescription(identified))}`)
              }
            >
              <MessageSquare className="h-4 w-4" />
              Preguntar a aiRIM
            </Button>
          </div>
        </div>
      )}

      {loading && !identified && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-3 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm font-medium">Analizando etiqueta...</span>
          </div>
        </div>
      )}
    </div>
  );
};
