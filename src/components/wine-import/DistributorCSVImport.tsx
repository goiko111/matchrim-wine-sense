import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface WineWithPrice {
  nombre: string;
  bodega: string;
  precio: number;
  moneda: string;
}

interface DistributorCSVImportProps {
  onImportComplete: (wines: WineWithPrice[]) => void;
}

export const DistributorCSVImport = ({ onImportComplete }: DistributorCSVImportProps) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): WineWithPrice[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.trim());
    const wines: WineWithPrice[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/[,;\t]/).map(v => v.trim());
      
      const nombreIdx = headers.findIndex(h => h.includes('nombre') || h.includes('wine') || h.includes('vino'));
      const bodegaIdx = headers.findIndex(h => h.includes('bodega') || h.includes('winery') || h.includes('productor'));
      const precioIdx = headers.findIndex(h => h.includes('precio') || h.includes('price'));
      const monedaIdx = headers.findIndex(h => h.includes('moneda') || h.includes('currency'));

      if (nombreIdx >= 0 && bodegaIdx >= 0 && precioIdx >= 0) {
        const precioStr = values[precioIdx]?.replace(/[^0-9.]/g, '');
        const precio = parseFloat(precioStr) || 0;
        
        // Detectar moneda del texto del precio o de la columna moneda
        let moneda = 'MXN'; // Por defecto pesos mexicanos
        const precioOriginal = values[precioIdx] || '';
        if (monedaIdx >= 0 && values[monedaIdx]) {
          moneda = values[monedaIdx].toUpperCase();
        } else if (precioOriginal.includes('€') || precioOriginal.toLowerCase().includes('eur')) {
          moneda = 'EUR';
        } else if (precioOriginal.includes('$') && (precioOriginal.toLowerCase().includes('usd') || precioOriginal.toLowerCase().includes('us'))) {
          moneda = 'USD';
        } else if (precioOriginal.includes('$')) {
          moneda = 'MXN';
        }

        if (values[nombreIdx] && values[bodegaIdx] && precio > 0) {
          wines.push({
            nombre: values[nombreIdx],
            bodega: values[bodegaIdx],
            precio,
            moneda
          });
        }
      }
    }

    return wines;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.csv', '.txt', '.tsv', '.xlsx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error("Por favor selecciona un archivo CSV, TXT, TSV o XLSX");
      return;
    }

    setLoading(true);

    try {
      const text = await file.text();
      const wines = parseCSV(text);

      if (wines.length > 0) {
        toast.success(`Se importaron ${wines.length} vinos con precios`);
        onImportComplete(wines);
      } else {
        toast.error("No se pudieron extraer vinos con precios. Verifica el formato.");
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error("Error al procesar el archivo");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 space-y-2">
        <p className="font-semibold">Formato esperado del CSV:</p>
        <code className="block bg-gray-100 p-2 rounded text-xs">
          nombre,bodega,precio,moneda<br/>
          Castillo Ygay,Marqués de Murrieta,850,MXN<br/>
          Pingus,Dominio de Pingus,7500,MXN
        </code>
        <p className="text-xs mt-2">
          * Los campos nombre, bodega y precio son obligatorios<br/>
          * Monedas soportadas: MXN (default), EUR, USD<br/>
          * Acepta separadores: coma (,), punto y coma (;) o tabulador
        </p>
      </div>

      <div className="border-2 border-dashed border-red-200 rounded-lg p-8 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.tsv,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
          disabled={loading}
        />

        <FileSpreadsheet className="w-16 h-16 mx-auto text-red-300" />
        <div className="mt-4">
          <Label className="text-red-900 font-semibold block mb-2">
            Sube un archivo CSV/Excel
          </Label>
          <p className="text-sm text-gray-500 mb-4">
            CSV, TXT, TSV o XLSX
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
              Seleccionar Archivo
            </>
          )}
        </Button>
      </div>
    </div>
  );
};