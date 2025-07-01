import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText } from 'lucide-react';
import { ImportType, DuplicateStrategy } from '@/types/csv';

interface CSVUploadProps {
  selectedType: ImportType;
  onTypeChange: (type: ImportType) => void;
  duplicateStrategy: DuplicateStrategy;
  onDuplicateStrategyChange: (strategy: DuplicateStrategy) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

const getCSVTemplate = (type: ImportType) => {
  switch (type) {
    case 'wines':
      return 'id,nombre,tipo,bodega,region,país,añada,potente,dulce,acidez,tánico,afrutado,nariz,boca,visual,cuerpo,estructura,final,crianza,elaboración,viñedo,info bodega,clima';
    case 'wine_styles':
      return 'Potente,Acidez,Dulzura,Taninos,Afrutado,Estilo Winerim';
    case 'matchrim_profiles':
      return 'Potente,Acidez,Dulce,Tánico,Afrutado,Nombre Perfil Matchrim';
    default:
      return '';
  }
};

const getFormatDescription = (type: ImportType) => {
  switch (type) {
    case 'wines':
      return 'Formato esperado para vinos: id, nombre, tipo, bodega, region, país, añada, potente, dulce, acidez, tánico, afrutado, nariz, boca, visual, cuerpo, estructura, final, crianza, elaboración, viñedo, info bodega, clima';
    case 'wine_styles':
      return 'Formato esperado para estilos de vino: Potente, Acidez, Dulzura, Taninos, Afrutado, Estilo Winerim. Los valores numéricos deben estar entre 1 y 5.';
    case 'matchrim_profiles':
      return 'Formato esperado para perfiles Matchrim: Potente, Acidez, Dulce, Tánico, Afrutado, Nombre Perfil Matchrim';
    default:
      return '';
  }
};

const downloadTemplate = (type: ImportType) => {
  const template = getCSVTemplate(type);
  const blob = new Blob([template], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `${type}_template.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

const CSVUpload: React.FC<CSVUploadProps> = ({
  selectedType,
  onTypeChange,
  duplicateStrategy,
  onDuplicateStrategyChange,
  onFileChange,
  isLoading
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="import-type">Tipo de datos a importar</Label>
          <Select value={selectedType} onValueChange={(value: ImportType) => onTypeChange(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wines">Vinos</SelectItem>
              <SelectItem value="wine_styles">Estilos de Vino</SelectItem>
              <SelectItem value="matchrim_profiles">Perfiles Matchrim</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Plantilla CSV</Label>
          <Button 
            variant="outline" 
            onClick={() => downloadTemplate(selectedType)} 
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            Descargar Plantilla
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label>¿Cómo manejar duplicados?</Label>
        <RadioGroup value={duplicateStrategy} onValueChange={onDuplicateStrategyChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="skip" id="skip" />
            <Label htmlFor="skip">Omitir registros duplicados</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="update" id="update" />
            <Label htmlFor="update">Actualizar registros existentes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="suffix" id="suffix" />
            <Label htmlFor="suffix">Agregar sufijo único a nombres duplicados</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="csv-file">Archivo CSV</Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={onFileChange}
          disabled={isLoading}
        />
        <p className="text-sm text-gray-600">
          {getFormatDescription(selectedType)}
        </p>
      </div>
    </div>
  );
};

export default CSVUpload;
