export interface WinerimOriginalSheet {
  id: string;
  name: string;
  producer: string | null;
  vintage: string | null;
  region: string | null;
  grapes: string[];
  url: string | null;
}

const geoWords = (value?: string | null) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
const countryKey = (value?: string | null) => {
  const text = geoWords(value).join(' ');
  const aliases: Record<string, string> = { espana: 'es', spain: 'es', francia: 'fr', france: 'fr', italia: 'it', italy: 'it',
    portugal: 'pt', germany: 'de', alemania: 'de', argentina: 'ar', chile: 'cl', 'united states': 'us', 'estados unidos': 'us' };
  return aliases[text] || text;
};

export const hasWinerimGeographyConflict = (
  input: { region?: string | null; country?: string | null }, catalog: { region?: string | null; country?: string | null },
) => {
  const left = countryKey(input.country), right = countryKey(catalog.country);
  if (left && right && left !== right) return true;
  const meaningfulRegion = (value?: string | null) => geoWords(value).filter(word => !['de', 'del', 'la', 'el', 'do', 'doc', 'doca'].includes(word));
  const region = meaningfulRegion(input.region), sourceRegion = meaningfulRegion(catalog.region);
  return region.length > 0 && sourceRegion.length > 0
    && !region.every(word => sourceRegion.includes(word)) && !sourceRegion.every(word => region.includes(word));
};

export const hasExactWinerimProducer = (left?: string | null, right?: string | null) => {
  const key = (value?: string | null) => geoWords(value)
    .filter(word => !['bodega', 'bodegas', 'winery', 'sl', 'sa', 's', 'a', 'ltd', 'limited'].includes(word)).sort().join(' ');
  return Boolean(key(left) && key(left) === key(right));
};

export const createWinerimOriginalSheet = (catalog: {
  id: string | number; name: string; winery?: string; vintage?: string | number;
  region?: string; grapes?: string[]; originalSheetUrl?: string; originalSheetSource?: 'winerim-api';
}): WinerimOriginalSheet | null => {
  const id = String(catalog.id).trim();
  if (catalog.originalSheetSource !== 'winerim-api' || !/^[a-z0-9_-]+$/i.test(id) || /^winerim-\d+$/i.test(id)) return null;
  try {
    let publicUrl: string | null = null;
    if (catalog.originalSheetUrl) {
      const url = new URL(catalog.originalSheetUrl);
      const host = url.hostname.toLowerCase();
      const owned = host === 'winerim.com' || host.endsWith('.winerim.com')
        || host === 'winerim.wine' || host.endsWith('.winerim.wine');
      if (url.protocol !== 'https:' || !owned || url.username || url.password || url.search || url.hash) return null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] !== 'the-library' || parts[1] !== 'wines' || decodeURIComponent(parts[2] ?? '') !== id || parts.length !== 4) return null;
      publicUrl = url.href;
    }
    const clean = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() || null : null;
    const name = clean(catalog.name);
    const vintage = clean(catalog.vintage);
    if (!name || (vintage && !/^(19|20)\d{2}$/.test(vintage))) return null;
    return { id, name, producer: clean(catalog.winery), vintage,
      region: clean(catalog.region), grapes: catalog.grapes?.map(clean).filter((grape): grape is string => Boolean(grape)) ?? [], url: publicUrl };
  } catch { return null; }
};
