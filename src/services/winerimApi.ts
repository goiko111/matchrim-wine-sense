import { QuizResult } from '@/data/quizData';

const WINERIM_API_URL = import.meta.env.VITE_WINERIM_API_URL;
const WINERIM_RESTAURANT_UUID = import.meta.env.VITE_WINERIM_RESTAURANT_UUID;

export interface WinerimWine {
  id: string | number;
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

type RawWinerimWine = Record<string, unknown>;
type RawTastingAttributes = Record<string, unknown>;

export interface WineMatchingResponse {
  results?: RawWinerimWine[];
  wines?: RawWinerimWine[];
  data?: RawWinerimWine[] | { results?: RawWinerimWine[]; wines?: RawWinerimWine[] };
  count?: number;
  searchLevel?: number;
}

export interface FetchWinerimWinesOptions {
  restaurantUuid?: string;
  matchrimCode?: string;
  signal?: AbortSignal;
}

const normalizePrice = (rawWine: RawWinerimWine) => {
  if (Array.isArray(rawWine.prices)) return rawWine.prices as WinerimWine['prices'];
  const price = rawWine.price ?? rawWine.precio;
  if (price == null) return undefined;
  return [{
    price: Number(price),
    currency: rawWine.currency || rawWine.moneda || '€',
  }];
};

const asRecord = (value: unknown): RawTastingAttributes | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as RawTastingAttributes;
};

const normalizeTastingAttributes = (rawWine: RawWinerimWine) => {
  const attrs = asRecord(rawWine.tastingAttributes || rawWine.tasting_attributes || rawWine.atributos);
  if (!attrs) return null;

  return {
    power: Number(attrs.power ?? attrs.potencia ?? 0),
    acidity: Number(attrs.acidity ?? attrs.acidez ?? 0),
    fruity: Number(attrs.fruity ?? attrs.afrutado ?? 0),
    sweetness: Number(attrs.sweetness ?? attrs.dulzura ?? attrs.dulce ?? 0),
    tannin: Number(attrs.tannin ?? attrs.taninos ?? attrs.tanico ?? 0),
  };
};

const normalizeWineId = (rawWine: RawWinerimWine, index: number) => {
  const id = rawWine.id ?? rawWine.uuid ?? rawWine.wine_id ?? rawWine.wineId;
  if (typeof id === 'string' && id.trim()) return id;
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  return `winerim-${index + 1}`;
};

const normalizeMatchPercentage = (rawWine: RawWinerimWine) => {
  const rawValue =
    rawWine.matchPercentage ??
    rawWine.match_percentage ??
    rawWine.compatibility ??
    rawWine.compatibility_score ??
    rawWine.compatibilidad ??
    rawWine.match ??
    0;

  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric > 0 && numeric <= 1) return Math.round(numeric * 100);
  if (numeric > 1 && numeric <= 10) return Math.round(numeric * 10);
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const stringValue = (value: unknown) => typeof value === 'string' ? value : undefined;
const stringArrayValue = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined;

const normalizeWinerimWine = (rawWine: RawWinerimWine, index: number): WinerimWineWithMatch => ({
  id: normalizeWineId(rawWine, index),
  name: stringValue(rawWine.name) ?? stringValue(rawWine.nombre) ?? 'Vino sin nombre',
  subname: stringValue(rawWine.subname) ?? stringValue(rawWine.subtitle) ?? stringValue(rawWine.subtitulo) ?? null,
  slugname: stringValue(rawWine.slugname) ?? stringValue(rawWine.slug),
  winery: stringValue(rawWine.winery) ?? stringValue(rawWine.producer) ?? stringValue(rawWine.productor) ?? stringValue(rawWine.bodega),
  region: stringValue(rawWine.region),
  country: stringValue(rawWine.country) ?? stringValue(rawWine.pais),
  type: stringValue(rawWine.type) ?? stringValue(rawWine.tipo),
  vintage: typeof rawWine.vintage === 'number' || typeof rawWine.vintage === 'string'
    ? rawWine.vintage
    : typeof rawWine.anada === 'number' || typeof rawWine.anada === 'string'
      ? rawWine.anada
      : undefined,
  grapes: stringArrayValue(rawWine.grapes) ?? stringArrayValue(rawWine.uvas) ?? stringArrayValue(rawWine.grape_varieties),
  tastingAttributes: normalizeTastingAttributes(rawWine),
  prices: normalizePrice(rawWine),
  matchPercentage: normalizeMatchPercentage(rawWine),
});

const extractWineResults = (data: WineMatchingResponse): RawWinerimWine[] => {
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.wines)) return data.wines;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.results)) return data.data.results;
  if (data.data && Array.isArray(data.data.wines)) return data.data.wines;
  return [];
};

/**
 * Fetch wines matching user taste profile
 * Uses backend progressive tolerance search (31 configurations)
 * Returns wines already sorted by match percentage
 */
export const fetchWinesByAttributes = async (
  quizResult: QuizResult,
  options: FetchWinerimWinesOptions = {}
): Promise<WinerimWineWithMatch[]> => {
  const restaurantUuid = options.restaurantUuid?.trim() || WINERIM_RESTAURANT_UUID;

  if (!WINERIM_API_URL || !restaurantUuid) {
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

  if (options.matchrimCode?.trim()) {
    params.set('matchrimCode', options.matchrimCode.trim());
  }

  const url = `${WINERIM_API_URL.replace(/\/$/, '')}/api/v1/restaurant/${restaurantUuid}/wines/match?${params}`;

  const response = await fetch(url, {
    method: 'GET',
    signal: options.signal,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Winerim API error: ${response.status} ${response.statusText}`);
  }

  const data: WineMatchingResponse = await response.json();
  const results = extractWineResults(data).map(normalizeWinerimWine);

  console.log(`✅ [Winerim] Encontrados ${data.count ?? results.length} vinos (nivel de búsqueda: ${data.searchLevel ?? 'n/a'}/31)`);

  return results;
};
