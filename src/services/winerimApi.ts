import { QuizResult } from '@/data/quizData';

const WINERIM_API_URL = import.meta.env.VITE_WINERIM_API_URL;
const WINERIM_RESTAURANT_UUID = import.meta.env.VITE_WINERIM_RESTAURANT_UUID;

export interface WinerimWine {
  id: number;
  name: string;
  subname?: string | null;
  slugname?: string;
  winery?: string;
  region?: string;
  country?: string;
  type?: string;
  vintage?: number | string;
  grapes?: string[];
  tastingAttributes?: {
    power: number;
    acidity: number;
    fruity: number;
    sweetness: number;
    tannin: number;
  } | null;
  prices?: Array<{
    price: number;
    currency: string | { name: string; symbol: string };
  }>;
}

export interface WinerimWineWithMatch extends WinerimWine {
  matchPercentage: number;
}

export interface WineMatchingResponse {
  results: WinerimWineWithMatch[];
  count: number;
  searchLevel: number;
}

/**
 * Fetch wines matching user taste profile
 * Uses backend progressive tolerance search (31 configurations)
 * Returns wines already sorted by match percentage
 */
export const fetchWinesByAttributes = async (
  quizResult: QuizResult
): Promise<WinerimWineWithMatch[]> => {
  if (!WINERIM_API_URL || !WINERIM_RESTAURANT_UUID) {
    throw new Error('Winerim API not configured');
  }

  console.log('🔍 [Winerim] Buscando vinos con backend matching');
  console.log('📊 [Winerim] Perfil del usuario:', quizResult);

  // Map Spanish attribute names to English for API
  const params = new URLSearchParams({
    userPower: quizResult.potente.toString(),
    userAcidity: quizResult.acidez.toString(),
    userFruity: quizResult.afrutado.toString(),
    userSweetness: quizResult.dulce.toString(),
    userTannin: quizResult.tanico.toString(),
  });

  const url = `${WINERIM_API_URL}/api/v1/restaurant/${WINERIM_RESTAURANT_UUID}/wines/match?${params}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Winerim API error: ${response.status} ${response.statusText}`);
  }

  const data: WineMatchingResponse = await response.json();

  console.log(`✅ [Winerim] Encontrados ${data.count} vinos (nivel de búsqueda: ${data.searchLevel}/31)`);

  return data.results;
};
