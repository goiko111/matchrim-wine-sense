import { supabase } from '@/integrations/supabase/client';

export interface Wine {
  id: string;
  name: string;
  producer: string | null;
  region: string | null;
  estilo: string;
  potencia: number;
  acidez: number;
  dulzura: number;
  taninos: number;
  afrutado: number;
  vintage: number | null;
  description: string | null;
}

export interface UserProfile {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
}

export interface WineRecommendation {
  wine: Wine;
  compatibilityScore: number;
  matchDetails: {
    potenciaMatch: number;
    acidezMatch: number;
    dulzuraMatch: number;
    taninosMatch: number;
    afrutadoMatch: number;
  };
}

/**
 * Calculate compatibility score between user profile and wine
 * Returns a score from 0 to 100
 */
export const calculateCompatibility = (userProfile: UserProfile, wine: Wine): number => {
  // Calculate individual attribute matches (0-1 scale, 1 being perfect match)
  const potenciaMatch = 1 - Math.abs(userProfile.potente - wine.potencia) / 4; // Max difference is 4
  const acidezMatch = 1 - Math.abs(userProfile.acidez - wine.acidez) / 4;
  const dulzuraMatch = 1 - Math.abs(userProfile.dulce - wine.dulzura) / 4;
  const taninosMatch = 1 - Math.abs(userProfile.tanico - wine.taninos) / 4;
  const afrutadoMatch = 1 - Math.abs(userProfile.afrutado - wine.afrutado) / 4;

  // Weighted average (potencia and style might be more important)
  const weightedScore = (
    potenciaMatch * 0.25 +
    acidezMatch * 0.20 +
    dulzuraMatch * 0.20 +
    taninosMatch * 0.20 +
    afrutadoMatch * 0.15
  );

  return Math.round(weightedScore * 100);
};

/**
 * Get wine recommendations from database based on user profile
 */
export const getWineRecommendationsFromDB = async (
  userProfile: UserProfile,
  limit: number = 10
): Promise<WineRecommendation[]> => {
  try {
    // Fetch all wines from database
    const { data: wines, error } = await supabase
      .from('wines')
      .select('*');

    if (error) {
      console.error('Error fetching wines:', error);
      return [];
    }

    if (!wines || wines.length === 0) {
      return [];
    }

    // Calculate compatibility for each wine
    const recommendations: WineRecommendation[] = wines.map(wine => {
      const compatibilityScore = calculateCompatibility(userProfile, wine);
      
      return {
        wine,
        compatibilityScore,
        matchDetails: {
          potenciaMatch: Math.round((1 - Math.abs(userProfile.potente - wine.potencia) / 4) * 100),
          acidezMatch: Math.round((1 - Math.abs(userProfile.acidez - wine.acidez) / 4) * 100),
          dulzuraMatch: Math.round((1 - Math.abs(userProfile.dulce - wine.dulzura) / 4) * 100),
          taninosMatch: Math.round((1 - Math.abs(userProfile.tanico - wine.taninos) / 4) * 100),
          afrutadoMatch: Math.round((1 - Math.abs(userProfile.afrutado - wine.afrutado) / 4) * 100),
        }
      };
    });

    // Sort by compatibility score and return top recommendations
    return recommendations
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, limit);

  } catch (error) {
    console.error('Error getting wine recommendations:', error);
    return [];
  }
};

/**
 * Get diverse wine recommendations (different styles/regions)
 */
export const getDiverseWineRecommendations = async (
  userProfile: UserProfile,
  limit: number = 10
): Promise<WineRecommendation[]> => {
  const allRecommendations = await getWineRecommendationsFromDB(userProfile, 50);
  
  if (allRecommendations.length === 0) return [];

  // Group by style to ensure diversity
  const byStyle = allRecommendations.reduce((acc, rec) => {
    const style = rec.wine.estilo;
    if (!acc[style]) acc[style] = [];
    acc[style].push(rec);
    return acc;
  }, {} as Record<string, WineRecommendation[]>);

  const diverseRecommendations: WineRecommendation[] = [];
  const maxPerStyle = Math.max(1, Math.floor(limit / Object.keys(byStyle).length));

  // Take top wines from each style
  for (const style in byStyle) {
    const styleRecs = byStyle[style].slice(0, maxPerStyle);
    diverseRecommendations.push(...styleRecs);
  }

  // Fill remaining slots with best overall matches
  while (diverseRecommendations.length < limit && diverseRecommendations.length < allRecommendations.length) {
    const remaining = allRecommendations.find(rec => 
      !diverseRecommendations.some(existing => existing.wine.id === rec.wine.id)
    );
    if (remaining) {
      diverseRecommendations.push(remaining);
    } else {
      break;
    }
  }

  return diverseRecommendations
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, limit);
};