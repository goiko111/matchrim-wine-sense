
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import BasicInfoStep from '@/components/registration/BasicInfoStep';
import WinePreferencesStep from '@/components/registration/WinePreferencesStep';
import FinalStep from '@/components/registration/FinalStep';
import { useRegistrationData } from '@/hooks/useRegistrationData';
import { getSafeRedirectPath } from '@/utils/navigation';

const Registration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const { registrationData, updateRegistrationData, saveRegistrationData, isSaving } = useRegistrationData();
  const redirectPath = getSafeRedirectPath(searchParams.get('redirect'));

  const totalSteps = 3;

  // Redirect if already authenticated
  React.useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, redirectPath]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    const success = await saveRegistrationData();
    if (success) {
      navigate(redirectPath);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Información Básica';
      case 2: return 'Preferencias de Vino';
      case 3: return 'Finalizar Registro';
      default: return 'Registro';
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            data={registrationData}
            onUpdate={updateRegistrationData}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <WinePreferencesStep
            data={registrationData}
            onUpdate={updateRegistrationData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 3:
        return (
          <FinalStep
            data={registrationData}
            onUpdate={updateRegistrationData}
            onComplete={handleComplete}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png" 
            alt="Logo Winerim" 
            className="h-16 w-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-red-900">Winerim</h1>
          <p className="text-red-600">Descubre tu perfil de vino perfecto</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-red-900">{getStepTitle()}</CardTitle>
              <span className="text-sm text-red-600">
                Paso {currentStep} de {totalSteps}
              </span>
            </div>
            <div className="w-full bg-red-100 rounded-full h-2">
              <div 
                className="bg-red-700 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>
        <div className="mt-5 flex items-center justify-center gap-4 text-xs text-red-900">
          <Link to="/privacy" className="hover:underline">
            Privacidad
          </Link>
          <span className="text-red-300">|</span>
          <Link to="/terms" className="hover:underline">
            Términos
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Registration;
