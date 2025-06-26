
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface RegistrationData {
  // Basic Info
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  preferredLanguage: string;
  location: string;
  birthDate: string;
  
  // Wine Preferences
  wineTypes: string[];
  tastePreferences: string[];
  priceRange: string;
  experienceType: string[];
  
  // Dietary Preferences
  dietaryRestrictions: string[];
  foodPairings: string[];
  
  // Consent
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

const initialData: RegistrationData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  preferredLanguage: 'ES',
  location: '',
  birthDate: '',
  wineTypes: [],
  tastePreferences: [],
  priceRange: '',
  experienceType: [],
  dietaryRestrictions: [],
  foodPairings: [],
  termsAccepted: false,
  privacyAccepted: false,
};

export const useRegistrationData = () => {
  const [registrationData, setRegistrationData] = useState<RegistrationData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const { signUp } = useAuth();

  const updateRegistrationData = (updates: Partial<RegistrationData>) => {
    setRegistrationData(prev => ({ ...prev, ...updates }));
  };

  const saveRegistrationData = async (): Promise<boolean> => {
    setIsSaving(true);
    
    try {
      // First, create the user account
      const { error: signUpError } = await signUp(
        registrationData.email,
        registrationData.password,
        registrationData.firstName,
        registrationData.lastName
      );

      if (signUpError) {
        toast({
          title: "Error en el registro",
          description: signUpError.message,
          variant: "destructive"
        });
        return false;
      }

      // Get the current session to get user ID
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast({
          title: "Error",
          description: "No se pudo obtener la información del usuario",
          variant: "destructive"
        });
        return false;
      }

      // Update profile with additional data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          preferred_language: registrationData.preferredLanguage,
          location: registrationData.location || null,
          birth_date: registrationData.birthDate || null,
          terms_accepted: registrationData.termsAccepted,
          privacy_accepted: registrationData.privacyAccepted
        })
        .eq('id', session.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Save wine preferences
      if (registrationData.wineTypes.length > 0 || registrationData.tastePreferences.length > 0 || registrationData.priceRange) {
        const { error: wineError } = await supabase
          .from('wine_preferences')
          .insert({
            user_id: session.user.id,
            wine_types: registrationData.wineTypes,
            taste_preferences: registrationData.tastePreferences,
            price_range: registrationData.priceRange || null,
            experience_type: registrationData.experienceType
          });

        if (wineError) {
          console.error('Wine preferences error:', wineError);
        }
      }

      // Save dietary preferences
      if (registrationData.dietaryRestrictions.length > 0 || registrationData.foodPairings.length > 0) {
        const { error: dietaryError } = await supabase
          .from('dietary_preferences')
          .insert({
            user_id: session.user.id,
            dietary_restrictions: registrationData.dietaryRestrictions,
            food_pairings: registrationData.foodPairings
          });

        if (dietaryError) {
          console.error('Dietary preferences error:', dietaryError);
        }
      }

      toast({
        title: "¡Registro completado!",
        description: "Tu cuenta ha sido creada exitosamente. Por favor verifica tu email."
      });

      return true;
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Error en el registro",
        description: "Ocurrió un error inesperado. Inténtalo de nuevo.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    registrationData,
    updateRegistrationData,
    saveRegistrationData,
    isSaving
  };
};
