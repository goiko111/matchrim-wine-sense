import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Camera, X, CheckCircle, AlertCircle, Sparkles, BookmarkPlus, Edit3, Mail, MessageCircle, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { buildAuthRedirectPath } from "@/utils/navigation";
import { toast } from "sonner";

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

type ScannedWineSortMode = 'compatibility' | 'price-asc' | 'price-desc' | 'name';

const formatWineType = (type?: string | null) => type?.trim() || 'Sin tipo';

const parseNullableNumber = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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
  const [scanSortMode, setScanSortMode] = useState<ScannedWineSortMode>('compatibility');
  const [scanTypeFilter, setScanTypeFilter] = useState('all');
  const [scanMaxPrice, setScanMaxPrice] = useState('');
  const [editingWineIndex, setEditingWineIndex] = useState<number | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const scannedWineTypes = useMemo(
    () => Array.from(new Set(scannedWines.map((wine) => formatWineType(wine.tipo)))).sort(),
    [scannedWines]
  );

  const visibleScannedWines = useMemo(() => {
    const maxPrice = parseNullableNumber(scanMaxPrice);

    return scannedWines
      .map((wine, index) => ({ wine, index }))
      .filter(({ wine }) => scanTypeFilter === 'all' || formatWineType(wine.tipo) === scanTypeFilter)
      .filter(({ wine }) => maxPrice === null || wine.precio === null || wine.precio === undefined || wine.precio <= maxPrice)
      .sort((a, b) => {
        if (scanSortMode === 'price-asc') {
          return (a.wine.precio ?? Number.POSITIVE_INFINITY) - (b.wine.precio ?? Number.POSITIVE_INFINITY);
        }
        if (scanSortMode === 'price-desc') {
          return (b.wine.precio ?? Number.NEGATIVE_INFINITY) - (a.wine.precio ?? Number.NEGATIVE_INFINITY);
        }
        if (scanSortMode === 'name') {
          return a.wine.nombre.localeCompare(b.wine.nombre, 'es');
        }

        return (b.wine.compatibilidad ?? -1) - (a.wine.compatibilidad ?? -1);
      });
  }, [scanMaxPrice, scanSortMode, scanTypeFilter, scannedWines]);

  const restaurantShareText = restaurantName
    ? `Hola, he intentado usar mi código Winerim${matchrimCode ? ` ${matchrimCode}` : ''} en ${restaurantName}. Me gustaría poder filtrar vuestra carta con mi perfil de vino. Podéis verlo en https://winerim.wine`
    : '';
  const restaurantMailtoHref = restaurantShareText
    ? `mailto:?subject=${encodeURIComponent('Clientes pidiendo Winerim')}&body=${encodeURIComponent(restaurantShareText)}`
    : '';
  const restaurantWhatsappHref = restaurantShareText
    ? `https://wa.me/?text=${encodeURIComponent(restaurantShareText)}`
    : '';

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
    setScanFeedback(null);
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
    setScanFeedback(null);

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
        setScanFeedback("No he encontrado vinos claros en el documento. Prueba con una foto más cercana o con una sección más pequeña de la carta.");
        toast.info("No se encontraron vinos en el documento");
      }
    } catch (error) {
      console.error('Error processing file:', error);
      const message = error instanceof Error ? error.message : 'Error al procesar el documento';
      setScanFeedback(`${message}. Si la carta es grande, prueba a escanear solo una página o una sección con menos vinos.`);
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
    setScanSortMode('compatibility');
    setScanTypeFilter('all');
    setScanMaxPrice('');
    setEditingWineIndex(null);
    setScanFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const updateScannedWine = (index: number, updates: Partial<ScannedWine>) => {
    setScannedWines((currentWines) =>
      currentWines.map((wine, wineIndex) =>
        wineIndex === index ? { ...wine, ...updates } : wine
      )
    );
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
                  <ul className="mx-auto mb-5 grid max-w-2xl gap-2 text-left text-xs text-muted-foreground sm:grid-cols-2">
                    <li>• Luz suficiente y carta completa dentro del encuadre.</li>
                    <li>• Evita reflejos, sombras fuertes y fotos inclinadas.</li>
                    <li>• Si la carta es larga, escanea una sección cada vez.</li>
                    <li>• Mantén visibles precios, añadas y productores.</li>
                  </ul>
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

      {scanFeedback && scannedWines.length === 0 && !loading && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-amber-950">No ha salido un escaneo útil</p>
              <p className="mt-1 text-sm text-amber-900">{scanFeedback}</p>
            </div>
            <Button
              variant="outline"
              className="gap-2 bg-white"
              onClick={() => {
                setScanFeedback(null);
                setPreview(null);
                cameraInputRef.current?.click();
              }}
            >
              <Camera className="h-4 w-4" />
              Reintentar foto
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {scannedWines.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-2xl font-bold">
                Vinos Detectados ({scannedWines.length})
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Revisa nombre, añada y precio antes de guardar. La carta puede tener errores de lectura.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!hasProfile && (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Completa el quiz Matchrim para ver compatibilidades
                </Badge>
              )}
              {fileType === 'pdf' && (
                <Badge variant="secondary">
                  PDF: primera página
                </Badge>
              )}
            </div>
          </div>

          <Card>
            <CardContent className="grid gap-3 p-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="scan-sort">Orden</Label>
                <Select value={scanSortMode} onValueChange={(value) => setScanSortMode(value as ScannedWineSortMode)}>
                  <SelectTrigger id="scan-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compatibility">Mejor match</SelectItem>
                    <SelectItem value="price-asc">Precio menor</SelectItem>
                    <SelectItem value="price-desc">Precio mayor</SelectItem>
                    <SelectItem value="name">Nombre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scan-type">Tipo</Label>
                <Select value={scanTypeFilter} onValueChange={setScanTypeFilter}>
                  <SelectTrigger id="scan-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {scannedWineTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scan-max-price">Precio máximo</Label>
                <Input
                  id="scan-max-price"
                  value={scanMaxPrice}
                  onChange={(event) => setScanMaxPrice(event.target.value)}
                  inputMode="decimal"
                  placeholder="Sin límite"
                />
              </div>
            </CardContent>
          </Card>

          {restaurantName && (
            <Card className="border-red-100 bg-red-50">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-red-950">Haz visible que quieres Winerim aquí</p>
                  <p className="text-sm text-red-900/80">
                    Tu escaneo ya queda como señal de demanda. También puedes enviárselo al restaurante en un toque.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild variant="outline" className="gap-2 bg-white">
                    <a href={restaurantMailtoHref}>
                      <Mail className="h-4 w-4" />
                      Email
                    </a>
                  </Button>
                  <Button asChild className="gap-2 bg-red-800 hover:bg-red-900">
                    <a href={restaurantWhatsappHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {visibleScannedWines.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No hay vinos que cumplan esos filtros. Prueba a subir el precio máximo o cambiar el tipo.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {visibleScannedWines.map(({ wine, index }) => {
                const isEditing = editingWineIndex === index;

                return (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row">
                    {/* Wine Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 className="text-lg font-semibold">{wine.nombre}</h4>
                        {wine.productor && (
                          <p className="text-sm text-muted-foreground">{wine.productor}</p>
                        )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-2 self-start"
                          onClick={() => setEditingWineIndex(isEditing ? null : index)}
                        >
                          <Edit3 className="h-4 w-4" />
                          {isEditing ? 'Cerrar edición' : 'Editar'}
                        </Button>
                      </div>

                      {isEditing && (
                        <div className="rounded-lg border bg-muted/30 p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1.5 md:col-span-2">
                              <Label htmlFor={`scan-name-${index}`}>Nombre</Label>
                              <Input
                                id={`scan-name-${index}`}
                                value={wine.nombre}
                                onChange={(event) => updateScannedWine(index, { nombre: event.target.value })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`scan-producer-${index}`}>Productor</Label>
                              <Input
                                id={`scan-producer-${index}`}
                                value={wine.productor || ''}
                                onChange={(event) => updateScannedWine(index, { productor: event.target.value || null })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`scan-vintage-${index}`}>Añada</Label>
                              <Input
                                id={`scan-vintage-${index}`}
                                value={wine.anada?.toString() || ''}
                                inputMode="numeric"
                                onChange={(event) => updateScannedWine(index, { anada: parseNullableNumber(event.target.value) })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`scan-region-${index}`}>Región</Label>
                              <Input
                                id={`scan-region-${index}`}
                                value={wine.region || ''}
                                onChange={(event) => updateScannedWine(index, { region: event.target.value || null })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`scan-country-${index}`}>País</Label>
                              <Input
                                id={`scan-country-${index}`}
                                value={wine.pais || ''}
                                onChange={(event) => updateScannedWine(index, { pais: event.target.value || null })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`scan-type-${index}`}>Tipo</Label>
                              <Input
                                id={`scan-type-${index}`}
                                value={wine.tipo}
                                onChange={(event) => updateScannedWine(index, { tipo: event.target.value })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`scan-price-${index}`}>Precio</Label>
                              <Input
                                id={`scan-price-${index}`}
                                value={wine.precio?.toString() || ''}
                                inputMode="decimal"
                                onChange={(event) => updateScannedWine(index, { precio: parseNullableNumber(event.target.value) })}
                              />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                              <Label htmlFor={`scan-grapes-${index}`}>Uvas</Label>
                              <Input
                                id={`scan-grapes-${index}`}
                                value={wine.uvas?.join(', ') || ''}
                                onChange={(event) => updateScannedWine(index, {
                                  uvas: event.target.value.split(',').map((grape) => grape.trim()).filter(Boolean),
                                })}
                              />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                              <Label htmlFor={`scan-description-${index}`}>Notas</Label>
                              <Textarea
                                id={`scan-description-${index}`}
                                value={wine.descripcion || ''}
                                onChange={(event) => updateScannedWine(index, { descripcion: event.target.value || null })}
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      )}

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
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WineMenuScanner;
