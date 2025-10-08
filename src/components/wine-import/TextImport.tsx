import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WineImportData } from "./WineImporter";

interface TextImportProps {
  onImportComplete: (wines: WineImportData[]) => void;
}

export const TextImport = ({ onImportComplete }: TextImportProps) => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast.error("Por favor ingresa una lista de vinos");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('extract-wines-text', {
        body: { text: text.trim() }
      });

      if (error) throw error;

      if (data.wines && data.wines.length > 0) {
        toast.success(`Se encontraron ${data.wines.length} vinos`);
        onImportComplete(data.wines);
        setText("");
      } else {
        toast.info("No se encontraron vinos en el texto");
      }
    } catch (error) {
      console.error('Error processing text:', error);
      toast.error("Error al procesar el texto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 space-y-2">
        <p className="font-semibold">Formatos aceptados:</p>
        <code className="block bg-gray-100 p-2 rounded text-xs">
          - Castillo Ygay - Marqués de Murrieta - Rioja<br/>
          - Pingus 2015, Ribera del Duero<br/>
          - Vega Sicilia Único (Tempranillo)
        </code>
        <p className="text-xs mt-2">
          * Separa cada vino en una línea diferente<br/>
          * Usa guiones, comas o paréntesis para separar información
        </p>
      </div>

      <div>
        <Label htmlFor="wine-text" className="text-red-900">
          Lista de Vinos
        </Label>
        <Textarea
          id="wine-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pega o escribe tu lista de vinos aquí...&#10;&#10;Ejemplo:&#10;Castillo Ygay - Marqués de Murrieta - Rioja&#10;Pingus 2015 - Ribera del Duero&#10;Vega Sicilia Único - Tempranillo"
          className="min-h-[200px] mt-2 border-red-200 focus:border-red-400"
          disabled={loading}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        className="w-full bg-red-700 hover:bg-red-800"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Procesando...
          </>
        ) : (
          "Extraer Vinos"
        )}
      </Button>
    </div>
  );
};
