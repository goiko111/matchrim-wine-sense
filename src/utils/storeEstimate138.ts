import { createGlobalCatalogue103, type PublicGlobalRow103 } from './nativeGlobalCatalogue103';
import { hasExactWinerimProducer } from './winerimOriginalSheet';

// 138: most everyday wines are in Winerim's public store but not in the verified Library, so a search ended in
// «no tenemos la ficha». The store's flavour vector is not provenance-checked (it can hold filler values), so it
// is never used as a verified sheet, for the scanner or to train the profile. Here it only backs an estimate
// that is labelled as such, and vectors that look like filler are discarded.
export type StoreAttributes138 = { scale: 'winerim-0-5'; power: number; acidity: number; sweetness: number; tannin: number; fruity: number };
export type StoreEstimate138 = { row: PublicGlobalRow103; attributes: StoreAttributes138;
  /** 140: median bottle price of this wine across the restaurants of the store, when known. */
  typicalPrice?: number | null };

const key = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const keys = ['power', 'acidity', 'sweetness', 'tannin', 'fruity'] as const;

export const usableStoreSensory138 = (row: Pick<PublicGlobalRow103, 'type' | 'tastingAttributes'>): StoreAttributes138 | null => {
  const raw = row.tastingAttributes;
  if (!raw || typeof raw !== 'object') return null;
  const values = keys.map(name => (raw as Record<string, unknown>)[name]);
  if (!values.every((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5)) return null;
  const [power, acidity, sweetness, tannin, fruity] = values;
  // 0 means «not applicable» in this source: acceptable only for the tannin of a wine that is not red.
  if (power === 0 || acidity === 0 || sweetness === 0 || fruity === 0) return null;
  if (tannin === 0 && /tinto|red|rouge/i.test(row.type ?? '')) return null;
  // 140: only a flat vector is treated as the default. «3, 3, 1, 3, 3» is an ordinary medium dry red, and dropping it
  // hid the most common wine of several wineries (Baigorri Crianza) from a wine list.
  if (new Set(values).size === 1) return null;
  return { scale: 'winerim-0-5', power, acidity, sweetness, tannin, fruity };
};

const rowName = (row: PublicGlobalRow103) => {
  const sub = row.subname && !(` ${key(row.name)} `).includes(` ${key(row.subname)} `) ? row.subname : '';
  return key([row.name, sub].filter(Boolean).join(' '));
};

// A wine list often prints the year inside the name («Viña Ardanza Reserva 2016») without a separate vintage.
const split = (wine: { name: string; vintage?: number | string | null }) => {
  const trailing = wine.name.trim().match(/^(.*\S)\s+\(?((?:19|20)\d{2})\)?$/);
  const vintage = wine.vintage == null || wine.vintage === '' ? trailing?.[2] ?? '' : String(wine.vintage);
  return { vintage, name: trailing && trailing[2] === vintage ? trailing[1] : wine.name.trim() };
};

export const pickStoreRow138 = (
  wine: { name: string; producer?: string | null; vintage?: number | string | null }, rows: readonly PublicGlobalRow103[],
): StoreEstimate138 | null => {
  const { vintage, name: bare } = split(wine);
  const name = key(bare);
  let matches = rows.filter(row => rowName(row) === name);
  if (wine.producer) matches = matches.filter(row => hasExactWinerimProducer(wine.producer, row.winery));
  // Without a producer the name must point at a single winery.
  else if (new Set(matches.map(row => key(row.winery))).size !== 1) return null;
  const usable = matches.flatMap(row => { const attributes = usableStoreSensory138(row); return attributes ? [{ row, attributes }] : []; });
  if (!usable.length) return null;
  const year = (item: StoreEstimate138) => item.row.vintage == null ? 0 : Number(item.row.vintage);
  return usable.find(item => vintage && String(item.row.vintage ?? '') === vintage)
    ?? [...usable].sort((a, b) => year(b) - year(a))[0];
};

export const findStoreEstimate138 = async (
  wine: { name: string; producer?: string | null; vintage?: number | string | null }, signal?: AbortSignal,
): Promise<StoreEstimate138 | null> => {
  const query = split(wine).name;
  const page = await createGlobalCatalogue103().searchProposals(query, signal);
  if (page.status !== 'complete' && page.status !== 'partial') return null;
  return pickStoreRow138(wine, page.rows);
};
