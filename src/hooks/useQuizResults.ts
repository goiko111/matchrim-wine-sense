
import { useState, useCallback } from 'react';
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
        
        // Detectar país basado en región y productor
        const detectCountry = (region: string = '', producer: string = ''): string => {
          const combined = `${region} ${producer}`.toLowerCase();
          
          // ESPAÑA
          if (combined.includes('rioja') || combined.includes('ribera') || combined.includes('priorat') || 
              combined.includes('rías baixas') || combined.includes('galicia') || combined.includes('penedès') ||
              combined.includes('jerez') || combined.includes('toro') || combined.includes('rueda') ||
              combined.includes('somontano') || combined.includes('bierzo') || combined.includes('jumilla') ||
              combined.includes('montsant') || combined.includes('empordà') || combined.includes('navarra') ||
              combined.includes('cataluña') || combined.includes('valencia') || combined.includes('españa') || 
              combined.includes('spain')) {
            return 'España';
          }
          
          // FRANCIA
          if (combined.includes('bordeaux') || combined.includes('borgoña') || combined.includes('burgundy') ||
              combined.includes('champagne') || combined.includes('rhône') || combined.includes('loire') ||
              combined.includes('alsace') || combined.includes('languedoc') || combined.includes('provence') ||
              combined.includes('beaujolais') || combined.includes('châteauneuf') || combined.includes('côtes du rhône') ||
              combined.includes('sancerre') || combined.includes('pouilly') || combined.includes('chablis') ||
              combined.includes('meursault') || combined.includes('pomerol') || combined.includes('pauillac') ||
              combined.includes('margaux') || combined.includes('saint-émilion') || combined.includes('jura') ||
              combined.includes('arbois') || combined.includes('chinon') || combined.includes('vouvray') ||
              combined.includes('muscadet') || combined.includes('bandol') || combined.includes('cassis') ||
              combined.includes('gigondas') || combined.includes('hermitage') || combined.includes('condrieu') ||
              combined.includes('côte-rôtie') || combined.includes('burdeos') || combined.includes('château') || 
              combined.includes('domaine') || combined.includes('francia') || combined.includes('france')) {
            return 'Francia';
          }
          
          // ITALIA
          if (combined.includes('toscana') || combined.includes('tuscany') || combined.includes('piemonte') ||
              combined.includes('piedmont') || combined.includes('veneto') || combined.includes('sicilia') ||
              combined.includes('sicily') || combined.includes('puglia') || combined.includes('lombardia') ||
              combined.includes('abruzzo') || combined.includes('campania') || combined.includes('marche') ||
              combined.includes('friuli') || combined.includes('barolo') || combined.includes('barbaresco') ||
              combined.includes('brunello') || combined.includes('chianti') || combined.includes('amarone') ||
              combined.includes('valpolicella') || combined.includes('prosecco') || combined.includes('soave') ||
              combined.includes('franciacorta') || combined.includes('etna') || combined.includes('primitivo') ||
              combined.includes('montepulciano') || combined.includes('italia') || combined.includes('italy')) {
            return 'Italia';
          }
          
          // ARGENTINA
          if (combined.includes('mendoza') || combined.includes('salta') || combined.includes('patagonia') ||
              combined.includes('cafayate') || combined.includes('luján') || combined.includes('argentina')) {
            return 'Argentina';
          }
          
          // CHILE
          if (combined.includes('maipo') || combined.includes('colchagua') || combined.includes('casablanca') ||
              combined.includes('aconcagua') || combined.includes('limarí') || combined.includes('elqui') ||
              combined.includes('cachapoal') || combined.includes('chile') || combined.includes('chilean')) {
            return 'Chile';
          }
          
          // PORTUGAL
          if (combined.includes('douro') || combined.includes('dão') || combined.includes('alentejo') ||
              combined.includes('vinho verde') || combined.includes('porto') || combined.includes('madeira') ||
              combined.includes('portugal') || combined.includes('portuguese')) {
            return 'Portugal';
          }
          
          // ALEMANIA
          if (combined.includes('mosel') || combined.includes('rheingau') || combined.includes('pfalz') ||
              combined.includes('rheinhessen') || combined.includes('baden') || combined.includes('franken') ||
              combined.includes('alemania') || combined.includes('germany') || combined.includes('german')) {
            return 'Alemania';
          }
          
          // ESTADOS UNIDOS
          if (combined.includes('napa') || combined.includes('sonoma') || combined.includes('california') ||
              combined.includes('oregon') || combined.includes('washington') || combined.includes('willamette') ||
              combined.includes('paso robles') || combined.includes('santa barbara') || combined.includes('usa') ||
              combined.includes('estados unidos') || combined.includes('united states')) {
            return 'Estados Unidos';
          }
          
          // AUSTRALIA
          if (combined.includes('barossa') || combined.includes('mclaren') || combined.includes('hunter') ||
              combined.includes('margaret') || combined.includes('yarra') || combined.includes('coonawarra') ||
              combined.includes('australia') || combined.includes('australian')) {
            return 'Australia';
          }
          
          // NUEVA ZELANDA
          if (combined.includes('marlborough') || combined.includes('hawke') || combined.includes('central otago') ||
              combined.includes('nueva zelanda') || combined.includes('new zealand')) {
            return 'Nueva Zelanda';
          }
          
          // SUDÁFRICA
          if (combined.includes('stellenbosch') || combined.includes('paarl') || combined.includes('swartland') ||
              combined.includes('constantia') || combined.includes('sudáfrica') || combined.includes('south africa')) {
            return 'Sudáfrica';
          }
          
          return 'Internacional';
        };
        
        const country = detectCountry(wine.region, wine.producer);
        
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

  const getQuizHistory = useCallback(async () => {
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
  }, [user]);

  return {
    saveQuizResult,
    getQuizHistory,
    isSaving
  };
};
