import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { WineImportData } from "./WineImporter";

interface CSVImportProps {
  onImportComplete: (wines: WineImportData[]) => void;
}

export const CSVImport = ({ onImportComplete }: CSVImportProps) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): WineImportData[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
    const wines: WineImportData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/[,;\t]/).map(v => v.trim());
      const wine: WineImportData = {
        nombre: '',
        bodega: ''
      };

      headers.forEach((header, index) => {
        const value = values[index] || '';
        if (header.includes('nombre') || header.includes('name') || header.includes('wine')) {
          wine.nombre = value;
        } else if (header.includes('bodega') || header.includes('winery') || header.includes('producer')) {
          wine.bodega = value;
        } else if (header.includes('region') || header.includes('región')) {
          wine.region = value;
        } else if (header.includes('pais') || header.includes('país') || header.includes('country')) {
          wine.pais = value;
        } else if (header.includes('uva') || header.includes('grape') || header.includes('varietal')) {
          wine.uva = value;
        } else if (header.includes('año') || header.includes('añada') || header.includes('vintage') || header.includes('year')) {
          wine.anada = value;
        }
      });

      if (wine.nombre && wine.bodega) {
        wines.push(wine);
      }
    }

    return wines;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.csv', '.txt', '.tsv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error("Por favor selecciona un archivo CSV, TXT o TSV");
      return;
    }

    setLoading(true);

    try {
      const text = await file.text();
      const wines = parseCSV(text);

      if (wines.length > 0) {
        toast.success(`Se importaron ${wines.length} vinos`);
        onImportComplete(wines);
      } else {
        toast.error("No se pudieron extraer vinos del archivo. Verifica el formato.");
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
          nombre,bodega,region,pais,uva,año<br/>
          Castillo Ygay,Marqués de Murrieta,Rioja,España,Tempranillo,2010
        </code>
        <p className="text-xs mt-2">
          * Los campos nombre y bodega son obligatorios<br/>
          * Acepta separadores: coma (,), punto y coma (;) o tabulador
        </p>
      </div>

      <div className="border-2 border-dashed border-red-200 rounded-lg p-8 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.tsv"
          onChange={handleFileSelect}
          className="hidden"
          disabled={loading}
        />

        <FileSpreadsheet className="w-16 h-16 mx-auto text-red-300" />
        <div className="mt-4">
          <Label className="text-red-900 font-semibold block mb-2">
            Sube un archivo CSV
          </Label>
          <p className="text-sm text-gray-500 mb-4">
            CSV, TXT o TSV
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
