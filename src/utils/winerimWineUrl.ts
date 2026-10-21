// Public ficha of a wine on the Winerim web (Angular app). The global catalogue
// lives under the "matchrim" slug: /matchrim/store/:wineId/:slugname. The web
// resolves the wine through the API with the exact slugname, so a wrong slug is a
// 404 and "the-library" (a 1.7k-wine menu) does not contain catalogue wines.
// Note: the web redirects deep links to the store list when the visitor has no
// `language` in localStorage yet (wine-detail.component.ts in winerim-web).

export const DEFAULT_WINERIM_WEB_URL = 'https://web.winerim.com';
export const MATCHRIM_STORE_SLUG = 'matchrim';

export const generateWinerimSlug = (name: string, vintage?: number | string | null): string => {
  const base = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join('-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();

  return vintage ? `${base}_${vintage}` : base;
};

export interface WinerimWineUrlInput {
  id: string | number;
  name: string;
  slugname?: string | null;
  vintage?: number | string | null;
}

export const buildWinerimWineFichaUrl = (wine: WinerimWineUrlInput, baseUrl?: string | null): string => {
  const slug = wine.slugname || generateWinerimSlug(wine.name, wine.vintage);
  const base = (baseUrl || DEFAULT_WINERIM_WEB_URL).replace(/\/$/, '');
  return `${base}/${MATCHRIM_STORE_SLUG}/store/${encodeURIComponent(String(wine.id))}/${encodeURIComponent(slug)}`;
};
