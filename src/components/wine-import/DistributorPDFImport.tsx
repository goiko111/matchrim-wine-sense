import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WineWithPrice {
  nombre: string;
  bodega: string;
  precio: number;
  moneda: string;
}

interface DistributorPDFImportProps {
  onImportComplete: (wines: WineWithPrice[]) => void;
  onImportStart?: () => void;
}

export const DistributorPDFImport = ({ onImportComplete, onImportStart }: DistributorPDFImportProps) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Por favor selecciona un archivo PDF");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande. Máximo 20MB");
      return;
    }

    setLoading(true);
    onImportStart?.();

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64PDF = reader.result as string;

        const { data, error } = await supabase.functions.invoke('extract-distributor-pdf', {
          body: { pdf: base64PDF }
        });

        if (error) throw error;

        if (data.wines && data.wines.length > 0) {
          toast.success(`Se encontraron ${data.wines.length} vinos con precios`);
          onImportComplete(data.wines);
        } else {
          toast.info("No se encontraron vinos con precios en el PDF");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast.error("Error al procesar el PDF");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 space-y-2">
        <p>✅ Catálogos de distribuidores</p>
        <p>✅ Listas de precios (hasta 50 páginas)</p>
        <p>⚠️ El procesamiento puede tardar 30-60 segundos</p>
      </div>

      <div className="border-2 border-dashed border-red-200 rounded-lg p-8 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={loading}
        />

        <FileText className="w-16 h-16 mx-auto text-red-300" />
        <div className="mt-4">
          <Label className="text-red-900 font-semibold block mb-2">
            Sube un archivo PDF
          </Label>
          <p className="text-sm text-gray-500 mb-4">
            Máximo 20MB, primeras 50 páginas
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
              Procesando PDF...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Seleccionar PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
};