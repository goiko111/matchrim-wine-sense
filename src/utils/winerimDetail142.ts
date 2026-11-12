import type { StoreRow140 } from './storeListing139';
import { diskGet145, diskSet145 } from './storeDiskCache145';

// 142: Winerim's public store already holds, for each wine, what a rich wine sheet needs: pairings, six flavour axes,
// a written tasting note, a one-line origin and personality, the wine's story, service data and related wines. The
// app showed four fields of it and sent people to Winerim's web page for the rest. This reads the detail once per
// wine per session, keeps only well-formed text, and never sends anything about the person.
const DETAIL_DISK145 = 'matchrim.store_detail.v1';
const STORE = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines';
export interface WinerimDetail142 {
  pairings: string[];
  nose: string | null; palate: string | null;
  origin: string | null; personality: string | null; story: string | null;
  alcohol: string | null; temperature: string | null;
  related: StoreRow140[];
  /** 144: the rest of what Winerim holds for a wine, shown folded: the whole tasting note, how it is made, where it comes from. */
  appearance: string | null; body: string | null; structure: string | null; finish: string | null;
  pairingLine: string | null; style: string | null; curiosity: string | null;
  aging: string | null; winemaking: string | null; wineryStory: string | null; vineyard: string | null; climate: string | null;
  agingLevel: number | null;
}
// 144: some sheets carry a paragraph written for a sibling wine (the sheet of «Ramón Bilbao» describing «Ramón Bilbao
// Edición Limitada»). A paragraph that names this wine followed by another capitalised word is about another wine: left out.
const escape144 = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const aboutAnotherWine144 = (value: string, wineName: string): boolean => {
  const name = wineName.trim(); if (name.length < 3) return false;
  return new RegExp(`${escape144(name)}\\s+(?!(?:Es|Se|Ha|Fue|Tiene|Nace|Ofrece|Presenta|Envejece|Procede)\\b)\\p{Lu}[\\p{L}\\d]+`, 'u').test(value);
};
const text = (value: unknown, max = 900): string | null => typeof value === 'string' && value.trim() && !/[<>]/.test(value) ? value.replace(/\s+/g, ' ').trim().slice(0, max) : null;
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const names: Record<string, string> = { 'carne-aves': 'Aves', 'carne-roja': 'Carne roja', 'carne-blanca': 'Carne blanca', 'carne-caza': 'Caza', 'pescado-blanco': 'Pescado blanco',
  'pescado-azul': 'Pescado azul', 'queso-curado': 'Queso curado', 'queso-suave': 'Queso suave', 'queso-azul': 'Queso azul', 'comida-picante': 'Comida picante' };
export const pairingLabel142 = (slug: string) => names[slug] ?? slug.replace(/-/g, ' ').replace(/^./, letter => letter.toUpperCase());
const row = (value: unknown): StoreRow140 | null => {
  const raw = record(value), name = text(raw.name, 240), winery = text(raw.winery, 240);
  if (typeof raw.id !== 'number' || !Number.isSafeInteger(raw.id) || raw.id <= 0 || !name || !winery || typeof raw.slugname !== 'string') return null;
  return { id: raw.id, name, winery, slugname: raw.slugname, vintage: /^(19|20)\d{2}$/.test(String(raw.vintage ?? '')) ? String(raw.vintage) : null, subname: text(raw.subname, 240),
    type: text(raw.type, 60), region: text(raw.region, 120), country: text(raw.country, 60), photo: typeof raw.photo === 'string' && /^https:\/\/app\.winerim\.com\//.test(raw.photo) ? raw.photo : null,
    grapes: Array.isArray(raw.grapes) ? raw.grapes.slice(0, 20) : [], tastingAttributes: raw.tastingAttributes, bottlePrice: null } as StoreRow140;
};
export const parseWinerimDetail142 = (value: unknown): WinerimDetail142 => {
  const raw = record(value), note = record(raw.tastingNote), quick = record(raw.quickSheet), details = record(raw.wineDetails);
  const land = record(raw.vineyardDetails), wineName = text(raw.name, 240) ?? '';
  const own = (field: unknown, max = 900) => { const value = text(field, max); return value && !aboutAnotherWine144(value, wineName) ? value : null; };
  const agingLevel = record(raw.tastingAttributes).aging;
  const alcohol = typeof details.alcohol === 'number' && details.alcohol > 0 ? (details.alcohol > 25 ? details.alcohol / 10 : details.alcohol) : null;
  return {
    pairings: [...new Set((Array.isArray(raw.pairings) ? raw.pairings : []).flatMap(item => { const slug = record(item).name; return typeof slug === 'string' && /^[a-zñáéíóú-]{2,40}$/i.test(slug) ? [pairingLabel142(slug)] : []; }))].slice(0, 8),
    nose: text(note.nose), palate: text(note.palate), origin: text(quick.origin, 400), personality: text(quick.personality, 400), story: text(record(raw.storytelling).narrative, 1200),
    alcohol: alcohol !== null && alcohol >= 4 && alcohol <= 23 ? `${alcohol.toLocaleString('es-ES', { maximumFractionDigits: 1 })} % vol.` : null,
    temperature: typeof details.serviceTemperature === 'string' && /^\d{1,2}(-\d{1,2})?$/.test(details.serviceTemperature) ? `${details.serviceTemperature.replace('-', '–')} °C` : null,
    related: (Array.isArray(raw.relatedWines) ? raw.relatedWines : []).flatMap(item => row(item) ?? []).slice(0, 8),
    appearance: text(note.appearance), body: text(note.body), structure: text(note.structure), finish: text(note.finish),
    pairingLine: own(quick.pairing, 300), style: own(quick.style, 300), curiosity: own(quick.curiosity, 300),
    aging: own(land.aging), winemaking: own(land.winemakingProcess), wineryStory: own(land.winery), vineyard: own(land.vineyard), climate: own(land.climate),
    agingLevel: typeof agingLevel === 'number' && Number.isFinite(agingLevel) && agingLevel >= 1 && agingLevel <= 5 ? agingLevel : null,
  };
};
const cache = new Map<string, Promise<WinerimDetail142 | null>>();
export const loadWinerimDetail142 = (id: number, slug: string): Promise<WinerimDetail142 | null> => {
  if (!Number.isSafeInteger(id) || id <= 0 || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,239}$/.test(slug)) return Promise.resolve(null);
  const key = `${id}/${slug}`, cached = cache.get(key); if (cached) return cached;
  // 145: a sheet opened within the last week is on the phone already (the raw public sheet is kept and parsed again).
  const kept = diskGet145<unknown>(DETAIL_DISK145, key);
  if (kept) { const ready = Promise.resolve(parseWinerimDetail142(kept)); cache.set(key, ready); return ready; }
  const pending = (async () => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${STORE}/${id}/${slug}`, { method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) return null;
      const body = await response.json() as Record<string, unknown>;
      // Only the parts the sheet shows are kept (not prices or stock).
      diskSet145(DETAIL_DISK145, key, Object.fromEntries(['name', 'pairings', 'tastingNote', 'quickSheet', 'storytelling', 'wineDetails', 'vineyardDetails', 'tastingAttributes', 'relatedWines'].map(field => [field, body?.[field]])), 25);
      return parseWinerimDetail142(body);
    } catch { return null; } finally { clearTimeout(timer); }
  })();
  cache.set(key, pending); void pending.then(value => { if (!value) cache.delete(key); });
  return pending;
};

export type CompatFace142 = 'good' | 'fair' | 'far';
/** «Por qué encaja», one short sentence per trait with a face, instead of two bars and «3.0/5». */
export const compatLines142 = (dimensions: ReadonlyArray<{ key: string; tone: string; direction: string; wineValue: number }>): Array<{ key: string; face: CompatFace142; text: string }> => {
  const words: Record<string, [string, string, string]> = { // [trait as it is, more of it, less of it]
    potente: ['El cuerpo', 'Tiene más cuerpo', 'Es más ligero'], acidez: ['La frescura', 'Es más fresco y ácido', 'Es menos fresco'], dulce: ['El dulzor', 'Es más dulce', 'Es más seco'],
    tanico: ['Los taninos', 'Es más áspero en boca', 'Es más suave en boca'], afrutado: ['La fruta', 'Es más afrutado', 'Es menos afrutado'] };
  return dimensions.flatMap((item): Array<{ key: string; face: CompatFace142; text: string }> => { const set = words[item.key]; if (!set) return [];
    if (item.tone === 'positive') return [{ key: item.key, face: 'good' as const, text: `${set[0]} es como te gusta` }];
    const change = item.direction === 'higher' ? set[1] : set[2];
    return [{ key: item.key, face: item.tone === 'neutral' ? 'fair' as const : 'far' as const, text: `${change} de lo que sueles preferir${item.tone === 'neutral' ? ', por poco' : ''}` }]; });
};
