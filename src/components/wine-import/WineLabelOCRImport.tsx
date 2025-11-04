import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Camera, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface WineLabelOCRImportProps {
  onExtractComplete: (wine: ExtractedWineData) => void;
}

export const WineLabelOCRImport = ({ onExtractComplete }: WineLabelOCRImportProps) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona una imagen válida");
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    await processImage(file);
  };

  const processImage = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        const { data, error } = await supabase.functions.invoke('extract-wine-label-ocr', {
          body: { image: base64Image }
        });

        if (error) throw error;

        if (data.wine) {
          toast.success("✨ Etiqueta analizada correctamente");
          onExtractComplete(data.wine);
        } else {
          toast.info("No se pudo extraer información de la etiqueta");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error("Error al procesar la imagen");
    } finally {
      setLoading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground space-y-2">
        <p className="font-medium">✨ Reconocimiento inteligente de etiquetas</p>
        <p>Extrae automáticamente información del vino desde la foto de la etiqueta</p>
      </div>

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

        {preview ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="max-h-80 mx-auto rounded-lg shadow-lg"
              />
              {!loading && (
                <Button
                  onClick={clearPreview}
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                >
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
              <p className="text-lg font-semibold text-foreground mb-2">
                Fotografía la etiqueta del vino
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
      {loading && (
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