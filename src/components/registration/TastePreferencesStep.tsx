
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RegistrationData } from '@/hooks/useRegistrationData';

interface TastePreferencesStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const TastePreferencesStep: React.FC<TastePreferencesStepProps> = ({ data, onUpdate, onNext, onPrevious }) => {
  const tasteOptions = [
    { value: 'seco', label: 'Seco' },
    { value: 'aterciopelado', label: 'Aterciopelado' },
    { value: 'frutal', label: 'Frutal' },
    { value: 'potente', label: 'Potente' }
  ];

  const priceRanges = [
    { value: '<15', label: 'Menos de 15€' },
    { value: '15-30', label: '15€ - 30€' },
    { value: '30-60', label: '30€ - 60€' },
    { value: '+60', label: 'Más de 60€' }
  ];

  const handleTasteChange = (value: string, checked: boolean) => {
    const updatedTastes = checked
      ? [...data.tastePreferences, value]
      : data.tastePreferences.filter(taste => taste !== value);
    onUpdate({ tastePreferences: updatedTastes });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-lg font-semibold">Preferencias de Sabor</Label>
        <p className="text-sm text-gray-600 mb-4">¿Qué características buscas en un vino?</p>
        <div className="grid grid-cols-2 gap-3">
          {tasteOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={option.value}
                checked={data.tastePreferences.includes(option.value)}
                onCheckedChange={(checked) => handleTasteChange(option.value, checked as boolean)}
              />
              <Label htmlFor={option.value} className="text-sm">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="priceRange" className="text-lg font-semibold">Rango de Precio</Label>
        <p className="text-sm text-gray-600 mb-4">¿Cuánto sueles gastar en una botella de vino?</p>
        <Select 
          value={data.priceRange} 
          onValueChange={(value) => onUpdate({ priceRange: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un rango" />
          </SelectTrigger>
          <SelectContent>
            {priceRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex space-x-4">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          className="flex-1"
        >
          Anterior
        </Button>
        <Button 
          onClick={onNext}
          className="flex-1 bg-red-700 hover:bg-red-800"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};

export default TastePreferencesStep;
