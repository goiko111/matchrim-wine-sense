
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RegistrationData } from '@/hooks/useRegistrationData';

interface DietaryStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const DietaryStep: React.FC<DietaryStepProps> = ({ data, onUpdate, onNext, onPrevious }) => {
  const dietaryOptions = [
    { value: 'vegana', label: 'Vegana' },
    { value: 'vegetariana', label: 'Vegetariana' },
    { value: 'sin_gluten', label: 'Sin Gluten' },
    { value: 'sin_lactosa', label: 'Sin Lactosa' }
  ];

  const foodPairingOptions = [
    { value: 'quesos', label: 'Quesos' },
    { value: 'carnes_rojas', label: 'Carnes Rojas' },
    { value: 'pescado', label: 'Pescado y Mariscos' },
    { value: 'postres', label: 'Postres' }
  ];

  const handleDietaryChange = (value: string, checked: boolean) => {
    const updatedRestrictions = checked
      ? [...data.dietaryRestrictions, value]
      : data.dietaryRestrictions.filter(restriction => restriction !== value);
    onUpdate({ dietaryRestrictions: updatedRestrictions });
  };

  const handlePairingChange = (value: string, checked: boolean) => {
    const updatedPairings = checked
      ? [...data.foodPairings, value]
      : data.foodPairings.filter(pairing => pairing !== value);
    onUpdate({ foodPairings: updatedPairings });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-lg font-semibold">Restricciones Dietéticas</Label>
        <p className="text-sm text-gray-600 mb-4">¿Tienes alguna restricción dietética?</p>
        <div className="grid grid-cols-2 gap-3">
          {dietaryOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={option.value}
                checked={data.dietaryRestrictions.includes(option.value)}
                onCheckedChange={(checked) => handleDietaryChange(option.value, checked as boolean)}
              />
              <Label htmlFor={option.value} className="text-sm">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-lg font-semibold">Maridajes Favoritos</Label>
        <p className="text-sm text-gray-600 mb-4">¿Con qué alimentos te gusta maridar el vino?</p>
        <div className="grid grid-cols-2 gap-3">
          {foodPairingOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={option.value}
                checked={data.foodPairings.includes(option.value)}
                onCheckedChange={(checked) => handlePairingChange(option.value, checked as boolean)}
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

export default DietaryStep;
