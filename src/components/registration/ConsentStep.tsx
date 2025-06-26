
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RegistrationData } from '@/hooks/useRegistrationData';

interface ConsentStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onComplete: () => void;
  onPrevious: () => void;
  isSaving: boolean;
}

const ConsentStep: React.FC<ConsentStepProps> = ({ data, onUpdate, onComplete, onPrevious, isSaving }) => {
  const isValid = data.termsAccepted && data.privacyAccepted;

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-lg font-semibold">Consentimientos Legales</Label>
        <p className="text-sm text-gray-600 mb-4">Para completar tu registro, necesitamos tu consentimiento:</p>
      </div>

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

export default ConsentStep;
