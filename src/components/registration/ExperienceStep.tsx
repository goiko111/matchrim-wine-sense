
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RegistrationData } from '@/hooks/useRegistrationData';

interface ExperienceStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const ExperienceStep: React.FC<ExperienceStepProps> = ({ data, onUpdate, onNext, onPrevious }) => {
  const experienceOptions = [
    { value: 'armonia_comida', label: 'Armonía con la comida' },
    { value: 'descubrir', label: 'Descubrir nuevos vinos' },
    { value: 'consejos_sumiller', label: 'Consejos de sumiller' },
    { value: 'autonomia', label: 'Elegir con autonomía' }
  ];

  const handleExperienceChange = (value: string, checked: boolean) => {
    const updatedExperience = checked
      ? [...data.experienceType, value]
      : data.experienceType.filter(exp => exp !== value);
    onUpdate({ experienceType: updatedExperience });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-lg font-semibold">Tipo de Experiencia</Label>
        <p className="text-sm text-gray-600 mb-4">¿Qué buscas en tu experiencia con el vino?</p>
        <div className="space-y-3">
          {experienceOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={option.value}
                checked={data.experienceType.includes(option.value)}
                onCheckedChange={(checked) => handleExperienceChange(option.value, checked as boolean)}
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

export default ExperienceStep;
