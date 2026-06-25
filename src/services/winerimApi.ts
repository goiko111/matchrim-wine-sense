import { QuizResult } from '@/data/quizData';
import { supabase } from '@/integrations/supabase/client';

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
  photo?: string;
  section?: string | null;
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
  if (Array.isArray(rawWine.prices)) {
    const prices = rawWine.prices
      .map((rawPrice) => {
        const priceRecord = asRecord(rawPrice);
        if (!priceRecord) return null;

        const numericPrice = Number(priceRecord.price ?? priceRecord.precio);
        if (!Number.isFinite(numericPrice)) return null;

        return {
          price: numericPrice,
          currency: priceRecord.currency || priceRecord.moneda || '€',
        };
      })
      .filter((price): price is NonNullable<WinerimWine['prices']>[number] => price !== null);

    return prices.length > 0 ? prices : undefined;
  }

  const price = rawWine.price ?? rawWine.precio;
  if (price == null) return undefined;
  return [{
    price: Number(price),
    currency: (rawWine.currency || rawWine.moneda || '€') as string | { name: string; symbol: string },
  }];
};

const asRecord = (value: unknown): RawTastingAttributes | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as RawTastingAttributes;
};

const normalizeTo5 = (raw: unknown): number => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  let v = n;
  if (v > 10) v = v / 20;
  else if (v > 5) v = v / 2;
  return Math.max(0, Math.min(5, Math.round(v)));
};

const normalizeTastingAttributes = (rawWine: RawWinerimWine) => {
  const attrs = asRecord(rawWine.tastingAttributes || rawWine.tasting_attributes || rawWine.atributos);
  if (!attrs) return null;

  return {
    power: normalizeTo5(attrs.power ?? attrs.potencia ?? 0),
    acidity: normalizeTo5(attrs.acidity ?? attrs.acidez ?? 0),
    fruity: normalizeTo5(attrs.fruity ?? attrs.afrutado ?? 0),
    sweetness: normalizeTo5(attrs.sweetness ?? attrs.dulzura ?? attrs.dulce ?? 0),
    tannin: normalizeTo5(attrs.tannin ?? attrs.taninos ?? attrs.tanico ?? 0),
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
const normalizeGrapes = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const grapes = value
    .flat(Number.POSITIVE_INFINITY)
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());

  return grapes.length > 0 ? Array.from(new Set(grapes)) : undefined;
};

const normalizeWinerimWine = (rawWine: RawWinerimWine, index: number): WinerimWineWithMatch => ({
  id: normalizeWineId(rawWine, index),
  name: stringValue(rawWine.name) ?? stringValue(rawWine.nombre) ?? 'Vino sin nombre',
  subname: stringValue(rawWine.subname) ?? stringValue(rawWine.subtitle) ?? stringValue(rawWine.subtitulo) ?? null,
  slugname: stringValue(rawWine.slugname) ?? stringValue(rawWine.slug),
  winery: stringValue(rawWine.winery) ?? stringValue(rawWine.producer) ?? stringValue(rawWine.productor) ?? stringValue(rawWine.bodega),
  region: stringValue(rawWine.region),
  country: stringValue(rawWine.country) ?? stringValue(rawWine.pais),
  type: stringValue(rawWine.type) ?? stringValue(rawWine.tipo),
  photo: stringValue(rawWine.photo) ?? stringValue(rawWine.image) ?? stringValue(rawWine.image_url),
  section: stringValue(rawWine.section) ?? stringValue(rawWine.seccion) ?? null,
  vintage: typeof rawWine.vintage === 'number' || typeof rawWine.vintage === 'string'
    ? rawWine.vintage
    : typeof rawWine.anada === 'number' || typeof rawWine.anada === 'string'
      ? rawWine.anada
      : undefined,
  grapes: normalizeGrapes(rawWine.grapes) ?? normalizeGrapes(rawWine.uvas) ?? normalizeGrapes(rawWine.grape_varieties),
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

  if (!restaurantUuid) {
    throw new Error('Winerim restaurant UUID not configured');
  }

  console.log('🔍 [Winerim] Buscando vinos vía edge function winerim-wines');
  console.log('📊 [Winerim] Perfil del usuario:', quizResult);

  const params = new URLSearchParams({
    restaurantUuid,
    userPower: quizResult.potente.toString(),
    userAcidity: quizResult.acidez.toString(),
    userFruity: quizResult.afrutado.toString(),
    userSweetness: quizResult.dulce.toString(),
    userTannin: quizResult.tanico.toString(),
  });

  if (options.matchrimCode?.trim()) {
    params.set('matchrimCode', options.matchrimCode.trim());
  }

  const { data, error } = await supabase.functions.invoke<WineMatchingResponse>(
    `winerim-wines?${params.toString()}`,
    { method: 'GET' }
  );

  if (error) {
    throw new Error(`Winerim proxy error: ${error.message}`);
  }
  if (!data) {
    throw new Error('Winerim proxy returned empty response');
  }

  const results = extractWineResults(data).map(normalizeWinerimWine);

  console.log(`✅ [Winerim] Encontrados ${data.count ?? results.length} vinos (nivel de búsqueda: ${data.searchLevel ?? 'n/a'}/31)`);

  return results;
};

// ----------------------------------------------------------------------------
// Matchrim recommendations endpoint (motor de afinidad: vinos/uvas/regiones ya
// cocinados por el backend, sin "restaurante falso" ni agregación en cliente).
// ----------------------------------------------------------------------------

export type MatchrimRegime = 'versatil' | 'definido' | 'nicho';

export interface MatchrimCategory {
  name: string;
  lift: number;
  compat: number;
  support: number;
  score: number;
}

export interface MatchrimCategoryTier {
  home: MatchrimCategory[];
  detail: MatchrimCategory[];
}

export interface MatchrimWineTier {
  home: WinerimWineWithMatch[];
  detail: WinerimWineWithMatch[];
}

export interface MatchrimHeadline {
  count: number;
  kind: 'compatibles' | 'afines';
  exploreMore: boolean;
}

export interface MatchrimTotals {
  compatibleUniverse: number;
  signal: number;
  bandUsed: number;
}

export interface MatchrimRecommendations {
  version: string;
  metric: string;
  profile: { power: number; acidity: number; sweetness: number; tannin: number; fruity: number };
  regime: MatchrimRegime;
  palateDefinitionScore: number;
  headline: MatchrimHeadline;
  totals: MatchrimTotals;
  grapes: MatchrimCategoryTier;
  regions: MatchrimCategoryTier;
  styles: { home: MatchrimCategory[] };
  wines: MatchrimWineTier;
}

const normalizeCategories = (value: unknown): MatchrimCategory[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const record = asRecord(raw);
      if (!record) return null;
      const name = stringValue(record.name);
      if (!name) return null;
      return {
        name,
        lift: Number(record.lift) || 0,
        compat: Number(record.compat) || 0,
        support: Number(record.support) || 0,
        score: Number(record.score) || 0,
      };
    })
    .filter((category): category is MatchrimCategory => category !== null);
};

const normalizeWineTier = (value: unknown): MatchrimWineTier => {
  const record = asRecord(value);
  const home = record && Array.isArray(record.home) ? record.home : [];
  const detail = record && Array.isArray(record.detail) ? record.detail : [];
  return {
    home: home.map((wine, index) => normalizeWinerimWine(wine as RawWinerimWine, index)),
    detail: detail.map((wine, index) => normalizeWinerimWine(wine as RawWinerimWine, index)),
  };
};

const normalizeCategoryTier = (value: unknown): MatchrimCategoryTier => {
  const record = asRecord(value);
  return {
    home: normalizeCategories(record?.home),
    detail: normalizeCategories(record?.detail),
  };
};

/**
 * Fetch cooked recommendations (regime + significant grapes/regions/styles +
 * wines) for a sensory profile. Replaces fetchWinesByAttributes + client-side
 * aggregation for the home discovery flow.
 */
export const fetchMatchrimRecommendations = async (
  quizResult: QuizResult,
  options: { signal?: AbortSignal } = {}
): Promise<MatchrimRecommendations> => {
  if (!WINERIM_API_URL) {
    throw new Error('Winerim API not configured');
  }

  const params = new URLSearchParams({
    power: quizResult.potente.toString(),
    acidity: quizResult.acidez.toString(),
    sweetness: quizResult.dulce.toString(),
    tannin: quizResult.tanico.toString(),
    fruity: quizResult.afrutado.toString(),
  });

  const url = `${WINERIM_API_URL.replace(/\/$/, '')}/api/v1/matchrim/recommendations?${params}`;

  const response = await fetch(url, {
    method: 'GET',
    signal: options.signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Matchrim API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  return {
    version: String(data.version ?? '1'),
    metric: String(data.metric ?? ''),
    profile: data.profile as MatchrimRecommendations['profile'],
    regime: (data.regime as MatchrimRegime) ?? 'versatil',
    palateDefinitionScore: Number(data.palateDefinitionScore) || 0,
    headline: data.headline as MatchrimHeadline,
    totals: data.totals as MatchrimTotals,
    grapes: normalizeCategoryTier(data.grapes),
    regions: normalizeCategoryTier(data.regions),
    styles: { home: normalizeCategories(asRecord(data.styles)?.home) },
    wines: normalizeWineTier(data.wines),
  };
};
