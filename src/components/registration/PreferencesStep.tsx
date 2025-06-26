
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RegistrationData } from '@/hooks/useRegistrationData';

interface PreferencesStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const PreferencesStep: React.FC<PreferencesStepProps> = ({ data, onUpdate, onNext, onPrevious }) => {
  const wineTypeOptions = [
    { value: 'blancos', label: 'Vinos Blancos' },
    { value: 'tintos', label: 'Vinos Tintos' },
    { value: 'espumosos', label: 'Espumosos' },
    { value: 'naturales', label: 'Vinos Naturales' },
    { value: 'biodinamicos', label: 'Vinos Biodinámicos' },
    { value: 'sin_sulfito', label: 'Sin Sulfitos Añadidos' }
  ];

  const handleWineTypeChange = (value: string, checked: boolean) => {
    const updatedTypes = checked
      ? [...data.wineTypes, value]
      : data.wineTypes.filter(type => type !== value);
    onUpdate({ wineTypes: updatedTypes });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-lg font-semibold">¿Qué tipos de vino te interesan?</Label>
        <p className="text-sm text-gray-600 mb-4">Selecciona todas las opciones que te interesen</p>
        <div className="grid grid-cols-2 gap-3">
          {wineTypeOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={option.value}
                checked={data.wineTypes.includes(option.value)}
                onCheckedChange={(checked) => handleWineTypeChange(option.value, checked as boolean)}
              />
              <Label htmlFor={option.value} className="text-sm">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
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

export default PreferencesStep;
