import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, Camera, X, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface ScannedWine {
  nombre: string;
  productor: string | null;
  anada: number | null;
  region: string | null;
  pais: string | null;
  precio: number | null;
  tipo: string;
  descripcion: string | null;
  atributos?: {
    potencia: number;
    acidez: number;
    dulzura: number;
    taninos: number;
    afrutado: number;
  } | null;
  compatibilidad?: number | null;
  razon?: string | null;
}

export const WineMenuScanner = () => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [scannedWines, setScannedWines] = useState<ScannedWine[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona una imagen válida");
      return;
    }

    // Activar loader inmediatamente
    setLoading(true);
    setScannedWines([]);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    await processImage(file);
  };

  const processImage = async (file: File) => {
    // Mantener el loader activo durante todo el proceso real
    setLoading(true);
    setScannedWines([]);

    try {
      // Leer el archivo como base64 y esperar a que termine
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Invocar la función de escaneo
      const { data, error } = await supabase.functions.invoke('scan-wine-menu', {
        body: { image: base64Image }
      });

      if (error) throw error;

      if (data?.vinos && data.vinos.length > 0) {
        setScannedWines(data.vinos);
        setHasProfile(!!data.has_profile);
        toast.success(`✨ ${data.vinos.length} vinos detectados en la carta`);
      } else {
        toast.info("No se encontraron vinos en la imagen");
      }
    } catch (error: any) {
      console.error('Error processing image:', error);
      const message = error?.message || 'Error al procesar la imagen';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const clearScan = () => {
    setPreview(null);
    setScannedWines([]);
    setHasProfile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getCompatibilityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Scanner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Scanner de Cartas de Vinos
          </CardTitle>
          <CardDescription>
            Escanea una carta de restaurante y descubre qué vinos se ajustan a tus gustos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center bg-card">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />

            {preview && !loading ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-60 mx-auto rounded-lg shadow-lg"
                  />
                  <Button
                    onClick={clearScan}
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : loading ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                <div>
                  <p className="text-lg font-semibold mb-2">Analizando carta de vinos...</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Extrayendo vinos y calculando compatibilidad
                  </p>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-primary animate-pulse" style={{ width: '70%' }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Esto puede tardar 30-60 segundos dependiendo del tamaño de la carta
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Camera className="w-16 h-16 mx-auto text-primary/40" />
                <div>
                  <p className="text-lg font-semibold text-foreground mb-2">
                    Fotografía la carta de vinos
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    JPG, PNG, WEBP hasta 20MB
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Seleccionar Imagen
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {scannedWines.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">
              Vinos Detectados ({scannedWines.length})
            </h3>
            {!hasProfile && (
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Completa el quiz Matchrim para ver compatibilidades
              </Badge>
            )}
          </div>

          <div className="grid gap-4">
            {scannedWines.map((wine, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Wine Info */}
                    <div className="flex-1 space-y-2">
                      <div>
                        <h4 className="text-lg font-semibold">{wine.nombre}</h4>
                        {wine.productor && (
                          <p className="text-sm text-muted-foreground">{wine.productor}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-sm">
                        {wine.anada && (
                          <Badge variant="outline">{wine.anada}</Badge>
                        )}
                        {wine.region && (
                          <Badge variant="outline">{wine.region}</Badge>
                        )}
                        {wine.pais && (
                          <Badge variant="outline">{wine.pais}</Badge>
                        )}
                        <Badge variant="secondary">{wine.tipo}</Badge>
                        {wine.precio && (
                          <Badge className="bg-green-100 text-green-800">
                            ${wine.precio.toFixed(2)}
                          </Badge>
                        )}
                      </div>

                      {wine.descripcion && (
                        <p className="text-sm text-muted-foreground italic">
                          {wine.descripcion}
                        </p>
                      )}

                      {/* Sensory Attributes */}
                      {wine.atributos && (
                        <div className="pt-3 space-y-2">
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                            Atributos Estimados
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                            {Object.entries(wine.atributos).map(([key, value]) => (
                              <div key={key} className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="capitalize text-muted-foreground font-medium">{key}</span>
                                  <span className="font-bold text-foreground">{value}/5</span>
                                </div>
                                <Progress value={value * 20} className="h-2" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Compatibility Score */}
                    {wine.compatibilidad !== null && wine.compatibilidad !== undefined && (
                      <div className="flex flex-col items-center justify-center gap-2 min-w-[120px] border-l pl-4">
                        {getCompatibilityIcon(wine.compatibilidad)}
                        <div className="text-center">
                          <div className="text-3xl font-bold">
                            {wine.compatibilidad}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Compatibilidad
                          </div>
                        </div>
                        <div className={`h-2 w-full rounded-full ${getCompatibilityColor(wine.compatibilidad)}`} />
                      </div>
                    )}
                  </div>

                  {/* Compatibility Reason */}
                  {wine.razon && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm">{wine.razon}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};