import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WineWithPrice {
  nombre: string;
  bodega: string;
  precio: number;
  moneda: string;
}

interface DistributorOCRImportProps {
  onImportComplete: (wines: WineWithPrice[]) => void;
}

export const DistributorOCRImport = ({ onImportComplete }: DistributorOCRImportProps) => {
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

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    await processImage(file);
  };

  const processImage = async (file: File) => {
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        const { data, error } = await supabase.functions.invoke('extract-distributor-ocr', {
          body: { image: base64Image }
        });

        if (error) throw error;

        if (data.wines && data.wines.length > 0) {
          toast.success(`Se encontraron ${data.wines.length} vinos con precios`);
          onImportComplete(data.wines);
        } else {
          toast.info("No se encontraron vinos con precios en la imagen");
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

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 space-y-2">
        <p>✅ Cartas de distribuidor</p>
        <p>✅ Listas de precios</p>
        <p>✅ Catálogos con precios</p>
      </div>

      <div className="border-2 border-dashed border-red-200 rounded-lg p-8 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={loading}
        />

        {preview ? (
          <div className="space-y-4">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 mx-auto rounded-lg shadow-lg"
            />
            <Button
              onClick={() => {
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              variant="outline"
              disabled={loading}
            >
              Cambiar imagen
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Camera className="w-16 h-16 mx-auto text-red-300" />
            <div>
              <Label className="text-red-900 font-semibold block mb-2">
                Sube una imagen de la carta
              </Label>
              <p className="text-sm text-gray-500 mb-4">
                JPG, PNG, WEBP hasta 20MB
              </p>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="bg-red-700 hover:bg-red-800"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Seleccionar Imagen
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};