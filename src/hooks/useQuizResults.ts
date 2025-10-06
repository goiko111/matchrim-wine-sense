
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QuizResult, getProfileDescription } from '@/data/quizData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { getDiverseWineRecommendations, UserProfile } from '@/utils/wineRecommendations';
import { generateWineStyles } from '@/utils/profileUtils';

export const useQuizResults = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const saveQuizResult = async (result: QuizResult, answers: { [id: number]: string }) => {
    if (!user) {
      toast({
        title: "Necesitas estar autenticado",
        description: "Por favor inicia sesión para guardar tus resultados",
        variant: "destructive"
      });
      return null;
    }

    setIsSaving(true);
    
    try {
      const description = getProfileDescription(result);
      
      // Get wine recommendations from database
      const userProfile: UserProfile = {
        potente: result.potente,
        acidez: result.acidez,
        dulce: result.dulce,
        tanico: result.tanico,
        afrutado: result.afrutado
      };
      
      // Get recommended styles for the user profile
      const recommendedStyles = generateWineStyles(result);
      
      const recommendations = await getDiverseWineRecommendations(userProfile, 12, recommendedStyles);

      // Save quiz result
      const { data: quizResultData, error: quizError } = await supabase
        .from('quiz_results')
        .insert({
          user_id: user.id,
          potente: result.potente,
          acidez: result.acidez,
          dulce: result.dulce,
          tanico: result.tanico,
          afrutado: result.afrutado,
          profile_description: description
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Save wine recommendations from database
      const recommendationsToInsert = recommendations.map((rec) => {
        const wine = rec.wine;
        const country = wine.region?.includes('España') || wine.region?.includes('Spain') || 
                       wine.producer?.includes('España') || wine.producer?.includes('Spain') ? 'España' : 'Internacional';
        
        return {
          quiz_result_id: quizResultData.id,
          user_id: user.id,
          wine_name: wine.name,
          wine_type: wine.estilo,
          winery: wine.producer || 'Desconocido',
          region: wine.region || 'No especificada',
          country: country,
          compatibility_score: rec.compatibilityScore
        };
      });

      if (recommendationsToInsert.length > 0) {
        const { error: recommendationsError } = await supabase
          .from('wine_recommendations')
          .insert(recommendationsToInsert);

        if (recommendationsError) throw recommendationsError;
      }

      toast({
        title: "¡Resultados guardados!",
        description: "Tu perfil y recomendaciones han sido guardados exitosamente."
      });

      return quizResultData.id;
    } catch (error: any) {
      console.error('Error saving quiz results:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los resultados. Inténtalo de nuevo.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const getQuizHistory = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select(`
          *,
          wine_recommendations (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching quiz history:', error);
      return [];
    }
  };

  return {
    saveQuizResult,
    getQuizHistory,
    isSaving
  };
};
