import { QuizResult } from '@/data/quizData';
import { supabase } from '@/integrations/supabase/client';
import { clasificarVino, suggestWineStylesForProfile, type PublicWineStyle } from '@/lib/winerimClassifier';

const WINERIM_RESTAURANT_UUID = import.meta.env.VITE_WINERIM_RESTAURANT_UUID;
const WINERIM_API_URL = import.meta.env.VITE_WINERIM_API_URL || 'https://app.winerim.com';
const WINERIM_DIRECT_FALLBACK_ENABLED = import.meta.env.VITE_WINERIM_DIRECT_FALLBACK === 'true';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
  matchSource?: 'winerim-api' | 'style-range';
  styleName?: PublicWineStyle;
}

export interface WinerimWineResultsMeta {
  totalCount: number;
  displayedCount: number;
  directCount: number;
  styleRangeCount: number;
  searchLevel?: number;
  primaryStyle?: PublicWineStyle;
  isGlobalRecommendations: boolean;
}

type RawWinerimWine = Record<string, unknown>;
type RawTastingAttributes = Record<string, unknown>;

export interface WineMatchingResponse {
  results?: RawWinerimWine[];
  wines?: RawWinerimWine[] | { home?: RawWinerimWine[]; detail?: RawWinerimWine[] };
  data?: RawWinerimWine[] | { results?: RawWinerimWine[]; wines?: RawWinerimWine[] };
  count?: number;
  total?: number;
  totalCount?: number;
  total_count?: number;
  searchLevel?: number;
  page?: number;
  limit?: number;
}

export interface FetchWinerimWinesOptions {
  restaurantUuid?: string;
  matchrimCode?: string;
  signal?: AbortSignal;
}

type WinerimRequestPayload = {
  endpoint: 'match' | 'wines';
  restaurantUuid: string;
  matchrimCode?: string;
  profile?: QuizResult;
  page?: number;
  limit?: number;
};

const winerimWineResultsMeta = new WeakMap<WinerimWineWithMatch[], WinerimWineResultsMeta>();

export const getWinerimWineResultsMeta = (wines: WinerimWineWithMatch[]) =>
  winerimWineResultsMeta.get(wines) || null;

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

const normalizeAttributeTo5 = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const scaled = numeric > 10 ? numeric / 20 : numeric > 5 ? numeric / 2 : numeric;
  return Math.max(1, Math.min(5, Math.round(scaled)));
};

const normalizeTastingAttributes = (rawWine: RawWinerimWine) => {
  const attrs = asRecord(rawWine.tastingAttributes || rawWine.tasting_attributes || rawWine.atributos);
  if (!attrs) return null;

  const normalized = {
    power: normalizeAttributeTo5(attrs.power ?? attrs.potencia),
    acidity: normalizeAttributeTo5(attrs.acidity ?? attrs.acidez),
    fruity: normalizeAttributeTo5(attrs.fruity ?? attrs.afrutado),
    sweetness: normalizeAttributeTo5(attrs.sweetness ?? attrs.dulzura ?? attrs.dulce),
    tannin: normalizeAttributeTo5(attrs.tannin ?? attrs.taninos ?? attrs.tanico),
  };

  if (Object.values(normalized).some((value) => value === null)) return null;
  return normalized as NonNullable<WinerimWine['tastingAttributes']>;
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
  if (data.wines && !Array.isArray(data.wines)) {
    if (Array.isArray(data.wines.detail)) return data.wines.detail;
    if (Array.isArray(data.wines.home)) return data.wines.home;
  }
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.results)) return data.data.results;
  if (data.data && Array.isArray(data.data.wines)) return data.data.wines;
  return [];
};

const extractTotalCount = (data: WineMatchingResponse, fallback: number) => {
  const rawCount = data.count ?? data.totalCount ?? data.total_count ?? data.total;
  const numeric = Number(rawCount);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : fallback;
};

const calculateProfileMatchPercentage = (quizResult: QuizResult, wine: WinerimWineWithMatch) => {
  const attrs = wine.tastingAttributes;
  if (!attrs) return wine.matchPercentage || 0;

  const weightedScore =
    Math.max(0, 1 - Math.abs(quizResult.potente - attrs.power) / 5) * 0.25 +
    Math.max(0, 1 - Math.abs(quizResult.acidez - attrs.acidity) / 5) * 0.20 +
    Math.max(0, 1 - Math.abs(quizResult.dulce - attrs.sweetness) / 5) * 0.20 +
    Math.max(0, 1 - Math.abs(quizResult.tanico - attrs.tannin) / 5) * 0.20 +
    Math.max(0, 1 - Math.abs(quizResult.afrutado - attrs.fruity) / 5) * 0.15;

  return Math.max(0, Math.min(100, Math.round(weightedScore * 100)));
};

const classifyWineByV41Style = (wine: WinerimWineWithMatch): PublicWineStyle | null => {
  const attrs = wine.tastingAttributes;
  if (!attrs || !wine.type) return null;

  try {
    const classification = clasificarVino(
      attrs.power,
      attrs.acidity,
      attrs.sweetness,
      attrs.tannin,
      attrs.fruity,
      wine.type,
    );

    return classification.estiloFinal === 'Sin encaje por tipo' ? null : classification.estiloFinal;
  } catch (error) {
    return null;
  }
};

const mergeUniqueWines = (wines: WinerimWineWithMatch[]) => {
  const byId = new Map<string | number, WinerimWineWithMatch>();

  wines.forEach((wine) => {
    const previous = byId.get(wine.id);
    if (!previous) {
      byId.set(wine.id, wine);
      return;
    }

    byId.set(wine.id, {
      ...previous,
      ...wine,
      matchPercentage: Math.max(previous.matchPercentage, wine.matchPercentage),
      matchSource: previous.matchSource === 'winerim-api' ? previous.matchSource : wine.matchSource,
      styleName: previous.styleName || wine.styleName,
    });
  });

  return Array.from(byId.values()).sort((a, b) =>
    b.matchPercentage - a.matchPercentage ||
    String(a.name).localeCompare(String(b.name), 'es')
  );
};

const fetchRestaurantWinesPage = async (
  restaurantUuid: string,
  page: number,
  limit: number,
  signal?: AbortSignal,
) => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  return invokeWinerimEndpoint({
    endpoint: 'wines',
    restaurantUuid,
    page,
    limit,
  }, signal);
};

const buildDirectWinerimUrl = (payload: WinerimRequestPayload) => {
  const params = new URLSearchParams();
  const endpoint = payload.endpoint === 'wines' ? 'wines' : 'match';

  if (endpoint === 'match') {
    const profile = payload.profile;
    if (!profile) throw new Error('Complete Matchrim profile is required');

    params.set('userPower', String(profile.potente));
    params.set('userAcidity', String(profile.acidez));
    params.set('userFruity', String(profile.afrutado));
    params.set('userSweetness', String(profile.dulce));
    params.set('userTannin', String(profile.tanico));

    if (payload.matchrimCode?.trim()) {
      params.set('matchrimCode', payload.matchrimCode.trim());
    }
  } else {
    params.set('page', String(Math.max(1, Math.round(payload.page || 1))));
    params.set('limit', String(Math.min(250, Math.max(1, Math.round(payload.limit || 100)))));
  }

  const path = endpoint === 'match' ? 'wines/match' : 'wines';
  const baseUrl = WINERIM_API_URL.replace(/\/$/, '');
  return `${baseUrl}/api/v1/restaurant/${encodeURIComponent(payload.restaurantUuid)}/${path}?${params}`;
};

const fetchDirectWinerimEndpoint = async (
  payload: WinerimRequestPayload,
  signal?: AbortSignal,
): Promise<WineMatchingResponse> => {
  const response = await fetch(buildDirectWinerimUrl(payload), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Winerim API responded ${response.status}${errorText ? `: ${errorText}` : ''}`);
  }

  return response.json() as Promise<WineMatchingResponse>;
};

const invokeWinerimEndpoint = async (
  payload: WinerimRequestPayload,
  signal?: AbortSignal,
): Promise<WineMatchingResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('winerim-wines', { body: payload });
    if (error) throw error;
    return (data || {}) as WineMatchingResponse;
  } catch (error) {
    if (WINERIM_DIRECT_FALLBACK_ENABLED) {
      console.warn('⚠️ [Winerim] Edge Function no disponible; usando API directa:', error);
      return fetchDirectWinerimEndpoint(payload, signal);
    }

    console.warn('⚠️ [Winerim] Edge Function no disponible:', error);
    throw new Error('No se pudo conectar con Winerim. Falta desplegar la función winerim-wines en Supabase.');
  }
};

const isFallbackRestaurantUuid = (restaurantUuid: string) =>
  restaurantUuid === '00000000-0000-0000-0000-000000000001';

const invokeMatchrimRecommendations = async (
  profile: QuizResult,
  signal?: AbortSignal,
): Promise<WineMatchingResponse> => {
  if (!SUPABASE_URL) throw new Error('Supabase URL not configured');

  const params = new URLSearchParams({
    power: String(profile.potente),
    acidity: String(profile.acidez),
    sweetness: String(profile.dulce),
    tannin: String(profile.tanico),
    fruity: String(profile.afrutado),
  });

  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/matchrim-recommendations?${params}`, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
      ...(SUPABASE_PUBLISHABLE_KEY
        ? {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          }
        : {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Matchrim recommendations proxy responded ${response.status}${errorText ? `: ${errorText}` : ''}`);
  }

  return response.json() as Promise<WineMatchingResponse>;
};

const fetchStyleRangeWines = async (
  quizResult: QuizResult,
  restaurantUuid: string,
  primaryStyle: PublicWineStyle,
  signal?: AbortSignal,
) => {
  const pageSize = 200;
  const maxPages = 1;
  const targetStyleMatches = 40;
  const styleMatches: WinerimWineWithMatch[] = [];

  for (let page = 1; page <= maxPages && styleMatches.length < targetStyleMatches; page += 1) {
    const data = await fetchRestaurantWinesPage(restaurantUuid, page, pageSize, signal);
    const pageWines = extractWineResults(data).map(normalizeWinerimWine);

    pageWines.forEach((wine) => {
      const styleName = classifyWineByV41Style(wine);
      if (styleName !== primaryStyle) return;

      styleMatches.push({
        ...wine,
        matchPercentage: calculateProfileMatchPercentage(quizResult, wine),
        matchSource: 'style-range',
        styleName,
      });
    });

    if (pageWines.length < pageSize) break;
  }

  return styleMatches;
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
  const useGlobalRecommendations = !options.restaurantUuid?.trim() || isFallbackRestaurantUuid(restaurantUuid);

  if (!restaurantUuid && !useGlobalRecommendations) {
    throw new Error('Winerim API not configured');
  }

  console.log('🔍 [Winerim] Buscando vinos con backend matching');
  console.log('📊 [Winerim] Perfil del usuario:', quizResult);

  if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const responseData = useGlobalRecommendations
    ? await invokeMatchrimRecommendations(quizResult, options.signal)
    : await invokeWinerimEndpoint({
        endpoint: 'match',
        restaurantUuid,
        matchrimCode: options.matchrimCode,
        profile: quizResult,
      }, options.signal);
  const directResults = extractWineResults(responseData)
    .map(normalizeWinerimWine)
    .map((wine) => ({
      ...wine,
      matchSource: 'winerim-api' as const,
      styleName: classifyWineByV41Style(wine) || undefined,
    }));

  const [primaryStyle] = suggestWineStylesForProfile({
    potente: quizResult.potente,
    acidez: quizResult.acidez,
    dulce: quizResult.dulce,
    tanico: quizResult.tanico,
    afrutado: quizResult.afrutado,
  }, 1);

  let styleRangeResults: WinerimWineWithMatch[] = [];

  if (!useGlobalRecommendations) {
    try {
      styleRangeResults = await fetchStyleRangeWines(quizResult, restaurantUuid, primaryStyle, options.signal);
    } catch (error) {
      console.warn('⚠️ [Winerim] No se pudo ampliar por rango de estilo:', error);
    }
  }

  const results = mergeUniqueWines([...directResults, ...styleRangeResults]);
  const totalCount = extractTotalCount(responseData, directResults.length);

  winerimWineResultsMeta.set(results, {
    totalCount,
    displayedCount: results.length,
    directCount: directResults.length,
    styleRangeCount: styleRangeResults.length,
    searchLevel: responseData.searchLevel,
    primaryStyle,
    isGlobalRecommendations: useGlobalRecommendations,
  });

  console.log(`✅ [Winerim] Encontrados ${totalCount} compatibles totales; mostrando ${results.length} (${directResults.length} directos, ${styleRangeResults.length} del rango ${primaryStyle})`);

  return results;
};
