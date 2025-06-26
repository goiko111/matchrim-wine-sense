
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RegistrationData } from '@/hooks/useRegistrationData';

interface FinalStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onComplete: () => void;
  onPrevious: () => void;
  isSaving: boolean;
}

const FinalStep: React.FC<FinalStepProps> = ({ data, onUpdate, onComplete, onPrevious, isSaving }) => {
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

  const isValid = data.termsAccepted && data.privacyAccepted;

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-lg font-semibold">Restricciones Dietéticas</Label>
        <p className="text-sm text-gray-600 mb-4">¿Tienes alguna restricción dietética? (Opcional)</p>
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
        <p className="text-sm text-gray-600 mb-4">¿Con qué alimentos te gusta maridar el vino? (Opcional)</p>
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

      <div className="border-t pt-6">
        <Label className="text-lg font-semibold">Consentimientos Legales</Label>
        <p className="text-sm text-gray-600 mb-4">Para completar tu registro, necesitamos tu consentimiento:</p>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={data.termsAccepted}
              onCheckedChange={(checked) => onUpdate({ termsAccepted: checked as boolean })}
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed">
              Acepto los <a href="#" className="text-red-700 hover:underline">términos y condiciones</a> de uso de la plataforma
            </Label>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="privacy"
              checked={data.privacyAccepted}
              onCheckedChange={(checked) => onUpdate({ privacyAccepted: checked as boolean })}
            />
            <Label htmlFor="privacy" className="text-sm leading-relaxed">
              Acepto la <a href="#" className="text-red-700 hover:underline">política de privacidad</a> y el tratamiento de mis datos personales
            </Label>
          </div>
        </div>
      </div>

      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-sm text-red-800">
          <strong>Resumen de tu perfil:</strong>
        </p>
        <ul className="text-sm text-red-700 mt-2 space-y-1">
          <li>• Nombre: {data.firstName} {data.lastName}</li>
          <li>• Email: {data.email}</li>
          <li>• Idioma: {data.preferredLanguage}</li>
          {data.location && <li>• Ubicación: {data.location}</li>}
          {data.wineTypes.length > 0 && <li>• Tipos de vino: {data.wineTypes.length} seleccionados</li>}
          {data.priceRange && <li>• Rango de precio: {data.priceRange}</li>}
        </ul>
      </div>

      <div className="flex space-x-4">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          className="flex-1"
          disabled={isSaving}
        >
          Anterior
        </Button>
        <Button 
          onClick={onComplete}
          className="flex-1 bg-red-700 hover:bg-red-800"
          disabled={!isValid || isSaving}
        >
          {isSaving ? 'Creando cuenta...' : 'Completar Registro'}
        </Button>
      </div>
    </div>
  );
};

export default FinalStep;
