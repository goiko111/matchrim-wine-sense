import type { Json } from '@/integrations/supabase/types';

export interface CatalogSearchResult {
  // Public row id. Null for catalogue wines that no restaurant lists (includeUnlisted=1).
  id: number | null;
  mantalakWineId: number;
  name: string;
  winery: string | null;
  type: string | null;
  country: string | null;
  region: string | null;
  grapes: string[];
  vintages: number[];
  tastingAttributes: { power: number; acidity: number; sweetness: number; tannin: number; fruity: number } | null;
  photo: string | null;
  slugname: string | null;
}

export interface ManualWineSuggestion {
  // true: identified by the Winerim catalogue. false: LLM or legacy-table proposal, never an identity.
  verified: boolean;
  winerim_wine_id?: number | null;
  winerim_mantalak_wine_id?: number;
  winerim_vintages?: number[];
  winerim_slugname?: string | null;
  image_url?: string | null;
  sensory_attributes?: Json | null;
  name: string;
  producer: string | null;
  vintage?: number | null;
  region: string | null;
  country?: string | null;
  grape_varieties: string[] | null;
  alcohol_content?: number | null;
  tasting_notes?: string | null;
  tipo?: string | null;
  estilo?: string | null;
}

export const toCatalogSuggestion = (wine: CatalogSearchResult): ManualWineSuggestion => ({
  verified: true,
  name: wine.name,
  producer: wine.winery,
  region: wine.region,
  country: wine.country,
  grape_varieties: wine.grapes?.length ? wine.grapes : null,
  tipo: wine.type,
  winerim_wine_id: wine.id ?? null,
  winerim_mantalak_wine_id: wine.mantalakWineId,
  winerim_vintages: wine.vintages,
  winerim_slugname: wine.slugname,
  image_url: wine.photo,
  sensory_attributes: wine.tastingAttributes
    ? {
        potencia: wine.tastingAttributes.power,
        acidez: wine.tastingAttributes.acidity,
        dulzura: wine.tastingAttributes.sweetness,
        taninos: wine.tastingAttributes.tannin,
        afrutado: wine.tastingAttributes.fruity,
      }
    : null,
});

type RawFallbackWine = Partial<ManualWineSuggestion> & { name?: string };

// Anything from the legacy `search-wines` function carries ids of its own table (or none) that mean
// nothing to Winerim, so none of them is kept: the pick is just text the user still has to check.
export const toUnverifiedSuggestion = (wine: RawFallbackWine): ManualWineSuggestion => ({
  verified: false,
  name: wine.name ?? '',
  producer: wine.producer ?? null,
  vintage: wine.vintage ?? null,
  region: wine.region ?? null,
  country: wine.country ?? null,
  grape_varieties: wine.grape_varieties ?? null,
  alcohol_content: wine.alcohol_content ?? null,
  tasting_notes: wine.tasting_notes ?? null,
  tipo: wine.tipo ?? null,
  estilo: wine.estilo ?? null,
});

export type ManualWineSearchOutcome = {
  suggestions: ManualWineSuggestion[];
  // 'unverified' only when the catalogue answered nothing or failed.
  source: 'catalog' | 'unverified' | 'none';
  catalogFailed: boolean;
};

export interface ManualWineSearchDeps {
  searchCatalog: (query: string, vintage: string | undefined) => Promise<CatalogSearchResult[]>;
  searchFallback: (query: string) => Promise<RawFallbackWine[]>;
  // The caller moved on: do not spend the legacy (LLM) lookup on an answer nobody will read.
  isCancelled?: () => boolean;
}

/**
 * The Winerim catalogue first. Only when it has no match (or is down) are the legacy proposals
 * offered, all of them marked unverified; a list never mixes both.
 */
export const searchManualWine = async (
  deps: ManualWineSearchDeps,
  query: string,
  vintage?: string,
): Promise<ManualWineSearchOutcome> => {
  let catalogFailed = false;
  try {
    const found = (await deps.searchCatalog(query, vintage)).filter((wine) => wine?.name && wine.mantalakWineId);
    if (found.length > 0) {
      return { suggestions: found.map(toCatalogSuggestion), source: 'catalog', catalogFailed: false };
    }
  } catch {
    catalogFailed = true;
  }

  if (deps.isCancelled?.()) return { suggestions: [], source: 'none', catalogFailed };

  try {
    const proposals = (await deps.searchFallback(query)).filter((wine) => wine?.name).map(toUnverifiedSuggestion);
    if (proposals.length > 0) return { suggestions: proposals, source: 'unverified', catalogFailed };
  } catch {
    // Both failed or both empty: the form falls back to "check the name yourself".
  }
  return { suggestions: [], source: 'none', catalogFailed };
};
