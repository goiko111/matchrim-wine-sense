import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, Camera, X, CheckCircle, AlertCircle, Sparkles, BookmarkPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { buildAuthRedirectPath } from "@/utils/navigation";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

type PdfJsLib = typeof import('pdfjs-dist');

let pdfJsPromise: Promise<PdfJsLib> | null = null;
let pdfWorkerUrl: string | null = null;

const loadPdfJs = async () => {
  if (!pdfJsPromise) {
    pdfJsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.mjs'),
    ]).then(([pdfjsLib, pdfjsWorker]) => {
      if (!pdfWorkerUrl) {
        pdfWorkerUrl = URL.createObjectURL(
          new Blob([pdfjsWorker.default], { type: 'application/javascript' })
        );
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return pdfjsLib;
    });
  }

  return pdfJsPromise;
};

interface ScannedWine {
  nombre: string;
  productor: string | null;
  anada: number | null;
  region: string | null;
  pais: string | null;
  precio: number | null;
  tipo: string;
  descripcion: string | null;
  uvas?: string[];
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

interface WineMenuScannerProps {
  restaurantName?: string;
  matchrimCode?: string;
  restaurantSessionId?: string | null;
  onScanComplete?: (winesDetected: number) => void;
}

export const WineMenuScanner = ({
  restaurantName,
  matchrimCode,
  restaurantSessionId,
  onScanComplete,
}: WineMenuScannerProps = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [scannedWines, setScannedWines] = useState<ScannedWine[]>([]);
  const [savingWineKey, setSavingWineKey] = useState<string | null>(null);
  const [savedWineKeys, setSavedWineKeys] = useState<Set<string>>(new Set());
  const [hasProfile, setHasProfile] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      toast.error("Por favor selecciona una imagen o PDF válido");
      return;
    }

    // Activar loader inmediatamente
    setLoading(true);
    setScannedWines([]);
    setFileType(isPDF ? 'pdf' : 'image');

    if (isPDF) {
      setConvertingPdf(true);
      setPreview(null); // Limpiar preview anterior
      await convertPdfToImage(file);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      await processFile(file, 'image');
    }
  };

  const convertPdfToImage = async (file: File) => {
    try {
      toast.info("Convirtiendo PDF a imagen...");
      
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await loadPdfJs();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Renderizar la primera página
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 }); // Escala 2x para mejor calidad
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo crear el contexto del canvas');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }).promise;
      
      // Convertir canvas a blob y luego a base64
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
      });
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setPreview(base64);
        setConvertingPdf(false);
        
        // Crear un archivo temporal con la imagen
        const imageFile = new File([blob], 'pdf-page.jpg', { type: 'image/jpeg' });
        await processFile(imageFile, 'image');
      };
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('Error converting PDF:', error);
      toast.error("Error al convertir el PDF. Por favor intenta con una imagen.");
      setLoading(false);
      setConvertingPdf(false);
    }
  };

  const processFile = async (file: File, type: 'image' | 'pdf') => {
    // Mantener el loader activo durante todo el proceso real
    setLoading(true);
    setScannedWines([]);

    try {
      // Leer el archivo como base64 y esperar a que termine
      const base64File = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Invocar la función de escaneo
      const { data, error } = await supabase.functions.invoke('scan-wine-menu', {
        body: { image: base64File }
      });

      if (error) throw error;

      if (data?.vinos && data.vinos.length > 0) {
        setScannedWines(data.vinos);
        setHasProfile(!!data.has_profile);
        onScanComplete?.(data.vinos.length);

        if (restaurantSessionId) {
          const { error: sessionError } = await supabase
            .from('restaurant_matchrim_sessions')
            .update({
              menu_scan_used: true,
              wines_detected: data.vinos.length,
            })
            .eq('id', restaurantSessionId);

          if (sessionError) {
            console.error('Error updating restaurant Matchrim session:', sessionError);
          }
        }

        toast.success(`✨ ${data.vinos.length} vinos detectados en la carta`);
      } else {
        toast.info("No se encontraron vinos en el documento");
      }
    } catch (error) {
      console.error('Error processing file:', error);
      const message = error instanceof Error ? error.message : 'Error al procesar el documento';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const clearScan = () => {
    setPreview(null);
    setScannedWines([]);
    setSavedWineKeys(new Set());
    setHasProfile(false);
    setFileType(null);
    setConvertingPdf(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
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

  const saveWineToWishlist = async (wine: ScannedWine, index: number) => {
    if (!user) {
      toast.error("Inicia sesión para guardar vinos");
      navigate(buildAuthRedirectPath(`${location.pathname}${location.search}`));
      return;
    }

    const saveKey = `${wine.nombre}-${index}`;
    setSavingWineKey(saveKey);

    try {
      const sensoryAttributes = wine.atributos
        ? {
            potencia: wine.atributos.potencia,
            acidez: wine.atributos.acidez,
            dulzura: wine.atributos.dulzura,
            taninos: wine.atributos.taninos,
            afrutado: wine.atributos.afrutado,
          }
        : null;

      const { error } = await supabase
        .from("user_wines")
        .insert({
          user_id: user.id,
          name: wine.nombre,
          producer: wine.productor || null,
          vintage: wine.anada || null,
          region: wine.region || null,
          country: wine.pais || null,
          grape_varieties: wine.uvas || null,
          tasting_notes: wine.descripcion || wine.razon || null,
          status: "wishlist",
          matchrim_affinity: wine.compatibilidad || null,
          sensory_attributes: sensoryAttributes as Json,
          use_for_profile_training: false,
          consumption_place: restaurantName || null,
          consumption_place_type: restaurantName ? "restaurant" : null,
          price: wine.precio || null,
          place_details: {
            source: "menu_scanner",
            restaurant_session_id: restaurantSessionId || null,
            matchrim_code: matchrimCode || null,
          } as Json,
        });

      if (error) throw error;

      setSavedWineKeys((currentKeys) => new Set(currentKeys).add(saveKey));
      toast.success(`${wine.nombre} guardado en Quiero Probar`);
    } catch (error) {
      console.error("Error saving scanned wine:", error);
      toast.error("No se pudo guardar el vino");
    } finally {
      setSavingWineKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {(restaurantName || matchrimCode) && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {restaurantName && (
              <span className="font-medium text-red-950">
                Restaurante: {restaurantName}
              </span>
            )}
            {matchrimCode && (
              <Badge variant="outline" className="border-red-300 text-red-800">
                Código {matchrimCode}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-red-900/80">
            Esta carta se analizará contra tu perfil Matchrim para ordenar las mejores opciones.
          </p>
        </div>
      )}

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
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />

            {(preview || convertingPdf) && !loading ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-60 mx-auto rounded-lg shadow-lg"
                    />
                  ) : convertingPdf ? (
                    <div className="max-h-60 mx-auto p-8 bg-muted rounded-lg flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">Convirtiendo PDF a imagen...</p>
                    </div>
                  ) : null}
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
            ) : loading || convertingPdf ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                <div>
                  <p className="text-lg font-semibold mb-2">
                    {convertingPdf ? 'Convirtiendo PDF a imagen...' : 'Analizando carta de vinos...'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {convertingPdf 
                      ? 'Renderizando primera página del PDF' 
                      : 'Extrayendo vinos y calculando compatibilidad'}
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
                    Sube la carta de vinos
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Haz una foto clara o sube una imagen/PDF. En PDF analizamos la primera página.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Hacer foto
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    variant="outline"
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Subir archivo
                  </Button>
                </div>
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
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="text-lg font-semibold">{wine.nombre}</h4>
                        {wine.productor && (
                          <p className="text-sm text-muted-foreground">{wine.productor}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {wine.anada && (
                          <Badge variant="outline">{wine.anada}</Badge>
                        )}
                        {wine.region && (
                          <Badge variant="outline">{wine.region}</Badge>
                        )}
                        {wine.pais && (
                          <Badge variant="outline">{wine.pais}</Badge>
                        )}
                        <Badge variant="secondary" className="capitalize">{wine.tipo}</Badge>
                        {wine.precio && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            {wine.precio.toFixed(2)}€
                          </Badge>
                        )}
                      </div>

                      {wine.uvas && wine.uvas.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground">Variedades: </span>
                          <span className="text-sm font-medium">{wine.uvas.join(', ')}</span>
                        </div>
                      )}

                      {wine.descripcion && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {wine.descripcion}
                        </p>
                      )}

                      {wine.atributos && (
                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium mb-2 text-muted-foreground">Perfil sensorial</p>
                          <div className="grid grid-cols-5 gap-2 text-xs">
                            <div className="text-center">
                              <div className="font-medium">{wine.atributos.potencia}</div>
                              <div className="text-muted-foreground">Potencia</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{wine.atributos.acidez}</div>
                              <div className="text-muted-foreground">Acidez</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{wine.atributos.dulzura}</div>
                              <div className="text-muted-foreground">Dulzura</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{wine.atributos.taninos}</div>
                              <div className="text-muted-foreground">Taninos</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{wine.atributos.afrutado}</div>
                              <div className="text-muted-foreground">Afrutado</div>
                            </div>
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

                  <Button
                    onClick={() => saveWineToWishlist(wine, index)}
                    disabled={savingWineKey === `${wine.nombre}-${index}` || savedWineKeys.has(`${wine.nombre}-${index}`)}
                    variant="outline"
                    className="mt-4 w-full gap-2"
                  >
                    {savedWineKeys.has(`${wine.nombre}-${index}`) ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : savingWineKey === `${wine.nombre}-${index}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BookmarkPlus className="h-4 w-4" />
                    )}
                    {savedWineKeys.has(`${wine.nombre}-${index}`) ? 'Guardado en Quiero Probar' : 'Guardar en Quiero Probar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WineMenuScanner;
