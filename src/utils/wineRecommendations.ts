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
    // Fetch wines in batches to handle large datasets
    const pageSize = 1000;
    let from = 0;
    let allWines: any[] = [];
    
    while (true) {
      const { data: wines, error } = await supabase
        .from('wines')
        .select('*')
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Error fetching wines:', error);
        break;
      }

      if (!wines || wines.length === 0) break;
      
      allWines = allWines.concat(wines);
      
      if (wines.length < pageSize) break;
      from += pageSize;
    }

    if (allWines.length === 0) {
      return [];
    }

    // Calculate compatibility for each wine
    const recommendations: WineRecommendation[] = allWines.map(wine => {
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
 * Get diverse wine recommendations (different wines, no repetitions)
 */
export const getDiverseWineRecommendations = async (
  userProfile: UserProfile,
  limit: number = 10
): Promise<WineRecommendation[]> => {
  const allRecommendations = await getWineRecommendationsFromDB(userProfile, 100);
  
  if (allRecommendations.length === 0) return [];

  // Asegurar que no hay vinos duplicados (por ID)
  const uniqueWines = new Map<string, WineRecommendation>();
  
  for (const rec of allRecommendations) {
    if (!uniqueWines.has(rec.wine.id)) {
      uniqueWines.set(rec.wine.id, rec);
    }
  }
  
  const uniqueRecommendations = Array.from(uniqueWines.values());

  // Dividir por región para diversidad geográfica
  const byRegion = uniqueRecommendations.reduce((acc, rec) => {
    const region = rec.wine.region || 'Desconocida';
    if (!acc[region]) acc[region] = [];
    acc[region].push(rec);
    return acc;
  }, {} as Record<string, WineRecommendation[]>);

  const diverseRecommendations: WineRecommendation[] = [];
  const regions = Object.keys(byRegion);
  
  // Tomar 1-2 vinos de cada región de forma rotativa
  let round = 0;
  while (diverseRecommendations.length < limit && round < 10) {
    for (const region of regions) {
      if (diverseRecommendations.length >= limit) break;
      
      const regionWines = byRegion[region];
      const index = round % regionWines.length;
      
      const candidate = regionWines[index];
      // Verificar que no esté ya añadido
      if (!diverseRecommendations.some(existing => existing.wine.id === candidate.wine.id)) {
        diverseRecommendations.push(candidate);
      }
    }
    round++;
  }

  // Si aún faltan, rellenar con los mejores matches restantes
  while (diverseRecommendations.length < limit && diverseRecommendations.length < uniqueRecommendations.length) {
    const remaining = uniqueRecommendations.find(rec => 
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