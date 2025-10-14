import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, FileSpreadsheet, FileText, Type, Loader2 } from "lucide-react";
import { ImageOCRImport } from "./ImageOCRImport";
import { CSVImport } from "./CSVImport";
import { PDFImport } from "./PDFImport";
import { TextImport } from "./TextImport";

export interface WineImportData {
  nombre: string;
  bodega: string;
  region?: string;
  pais?: string;
  uva?: string;
  anada?: string;
}

interface WineImporterProps {
  onImportComplete: (wines: WineImportData[]) => void;
}

export const WineImporter = ({ onImportComplete }: WineImporterProps) => {
  const [activeTab, setActiveTab] = useState("ocr");
  const [loading, setLoading] = useState(false);

  const handleImportStart = () => setLoading(true);
  const handleComplete = (wines: WineImportData[]) => {
    setLoading(false);
    onImportComplete(wines);
  };

  return (
    <Card className="shadow-lg border-red-100 relative">
      {loading && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-red-700 mx-auto" />
            <p className="text-red-900 font-semibold">Procesando imagen...</p>
            <p className="text-gray-600 text-sm">Esto puede tardar unos segundos</p>
          </div>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-red-900">Importar Vinos</CardTitle>
        <CardDescription>
          Elige el método que prefieras para importar múltiples vinos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ocr" className="gap-2">
              <Camera className="w-4 h-4" />
              OCR Imagen
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              CSV/Excel
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-2">
              <FileText className="w-4 h-4" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-2">
              <Type className="w-4 h-4" />
              Texto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ocr" className="mt-6">
            <ImageOCRImport onImportComplete={handleComplete} onImportStart={handleImportStart} />
          </TabsContent>

          <TabsContent value="csv" className="mt-6">
            <CSVImport onImportComplete={handleComplete} />
          </TabsContent>

          <TabsContent value="pdf" className="mt-6">
            <PDFImport onImportComplete={handleComplete} />
          </TabsContent>

          <TabsContent value="text" className="mt-6">
            <TextImport onImportComplete={handleComplete} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
