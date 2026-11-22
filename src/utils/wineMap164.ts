// 164 (owner: «¿se te ocurre hacer algo con nuestro mapa?»). The Winerim map (map.winerim.wine, on Mapbox) draws every
// wine region and opens on one with ?region=<deeplink>. The app carries a compact index of its primary labels
// (src/assets/map164/regions164.json, built from the map's own europe_wwr_labels.geojson on 22-nov-2026: name,
// country, deeplink, tier 0 top / 1 denomination / 2 subzone, parent, lon, lat, extent in km) so it can tell which zone a wine
// comes from, link to it and name the neighbouring zones. Opening the map counts as a map load on Winerim's Mapbox
// account; the app itself draws no map.
export type Region164 = { name: string; country: string; deeplink: string; tier: 0 | 1 | 2; parent: string; lon: number; lat: number; /** widest span in km when the map knows it, else 0 */ extent: number };
let loading: Promise<Region164[]> | null = null;
export const loadRegions164 = (): Promise<Region164[]> => loading ??= import('@/assets/map164/regions164.json').then(module =>
  (module.default as unknown as Array<[string, string, string, 0 | 1 | 2, string, number, number, number]>).map(([name, country, deeplink, tier, parent, lon, lat, extent]) => ({ name, country, deeplink, tier, parent, lon, lat, extent })))
  .catch(() => { loading = null; return []; });
export const mapUrl164 = (region: Pick<Region164, 'deeplink'>) => `https://map.winerim.wine/?region=${encodeURIComponent(region.deeplink)}`;

const norm = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const PREFIX = /^(d ?o ?c ?a|d ?o ?c ?g|d ?o ?c|d ?o ?p|d ?o ?q|d ?o|a ?o ?c|a ?o ?p|i ?g ?p|i ?g ?t|a ?v ?a|v ?t|denominacion de origen( calificada| protegida)?|vino de la tierra( de)?|vino de pago|appellation)\s+/;
const clean = (value: string) => { let text = norm(value); for (let i = 0; i < 2; i += 1) text = text.replace(PREFIX, ''); return text; };
const COUNTRY: Record<string, string> = { es: 'espana', spain: 'espana', espana: 'espana', fr: 'france', francia: 'france', france: 'france', it: 'italia', italy: 'italia', italia: 'italia',
  pt: 'portugal', portugal: 'portugal', de: 'germany', alemania: 'germany', germany: 'germany', us: 'united states', usa: 'united states', 'estados unidos': 'united states', 'united states': 'united states',
  ar: 'argentina', argentina: 'argentina', cl: 'chile', chile: 'chile', at: 'austria', austria: 'austria', au: 'australia', australia: 'australia', nz: 'new zealand', 'nueva zelanda': 'new zealand',
  za: 'south africa', sudafrica: 'south africa', 'south africa': 'south africa', gr: 'greece', grecia: 'greece', hu: 'hungary', hungria: 'hungary', ch: 'switzerland', suiza: 'switzerland' };
const country = (value: string | null | undefined) => value ? COUNTRY[norm(value)] ?? norm(value) : null;

/** The map zone a wine's region text names, or null. A name shared by several zones needs the country to decide;
    among equals the denomination wins over the subzone and the wide area. */
export const matchRegion164 = (regions: Region164[], regionText: string | null | undefined, countryText?: string | null): Region164 | null => {
  if (!regionText) return null;
  const wanted = country(countryText);
  const order = (region: Region164) => region.tier === 1 ? 0 : region.tier === 2 ? 1 : 2;
  for (const part of [regionText, ...regionText.split(/[,;/>|·]/)].map(clean).filter(text => text.length >= 3)) {
    const same = regions.filter(region => norm(region.name) === part);
    const inCountry = wanted ? same.filter(region => norm(region.country) === wanted) : same;
    const pool = inCountry.length ? inCountry : wanted ? [] : same;
    if (!pool.length) continue;
    if (!wanted && new Set(pool.map(region => region.country)).size > 1) continue;
    return [...pool].sort((a, b) => order(a) - order(b))[0];
  }
  return null;
};

const km = (a: Region164, b: Region164) => { const rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
/** Denominations around a zone (within 250 km), nearest first, leaving out the ones already known and the tiny ones
    (single-estate pagos, small IGP: under 25 km across), which say little to someone choosing where to look next. */
export const nearby164 = (regions: Region164[], from: Region164, known: ReadonlySet<string> = new Set(), limit = 3): Region164[] =>
  regions.filter(region => region.tier === 1 && !(region.extent > 0 && region.extent < 25) && region.deeplink !== from.deeplink && region.name !== from.parent && region.name !== from.name && !known.has(region.deeplink))
    .map(region => ({ region, distance: km(from, region) })).filter(item => item.distance <= 250)
    .sort((a, b) => a.distance - b.distance).slice(0, limit).map(item => item.region);

export type TastedZone164 = { region: Region164; wines: number; loved: number; disliked: number };
/** «Tu mapa del vino»: the zones of the wines a person has rated, most tasted first, and where to look next. */
export const tastedMap164 = (regions: Region164[], wines: Array<{ region?: string | null; country?: string | null; rating?: string | null }>) => {
  const zones = new Map<string, TastedZone164>();
  for (const wine of wines) {
    if (!wine.rating) continue;
    const region = matchRegion164(regions, wine.region, wine.country);
    if (!region) continue;
    const zone = zones.get(region.deeplink) ?? { region, wines: 0, loved: 0, disliked: 0 };
    zone.wines += 1; if (wine.rating === 'love') zone.loved += 1; if (wine.rating === 'not_for_me') zone.disliked += 1;
    zones.set(region.deeplink, zone);
  }
  const tasted = [...zones.values()].sort((a, b) => b.wines - a.wines || b.loved - a.loved || a.region.name.localeCompare(b.region.name, 'es'));
  const favourite = [...tasted].filter(zone => zone.loved > 0).sort((a, b) => b.loved - a.loved || b.wines - a.wines)[0] ?? null;
  const next = favourite ? nearby164(regions, favourite.region, new Set(zones.keys())) : [];
  return { tasted, favourite, next };
};
