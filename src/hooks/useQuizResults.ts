
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QuizResult, getRecommendedWines, getProfileDescription } from '@/data/quizData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

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
      const recommendations = getRecommendedWines(result);

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

      // Save wine recommendations with consistent scoring
      const recommendationsToInsert = recommendations.map((rec, index) => {
        const parts = rec.split(", ");
        // Generate consistent score based on position and profile
        const baseScore = 95 - (index * 2); // Start at 95 and decrease by 2 for each recommendation
        const profileSeed = `${result.potente}-${result.acidez}-${result.dulce}-${result.tanico}-${result.afrutado}`;
        const hash = profileSeed.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        const variation = Math.abs(hash) % 6 - 3; // Between -3 and +3
        
        return {
          quiz_result_id: quizResultData.id,
          user_id: user.id,
          wine_name: parts[0] || '',
          wine_type: parts[1] || '',
          winery: parts[2] || '',
          region: parts[3] || '',
          country: parts[4] || '',
          compatibility_score: Math.max(80, Math.min(100, baseScore + variation))
        };
      });

      const { error: recommendationsError } = await supabase
        .from('wine_recommendations')
        .insert(recommendationsToInsert);

      if (recommendationsError) throw recommendationsError;

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
