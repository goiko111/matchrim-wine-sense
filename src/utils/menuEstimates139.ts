import type { MatchrimProfileLike } from './matchrimPassport';
import type { StoreEstimate138 } from './storeEstimate138';
import { likelyByPrice140, storeAffinity139, type ListingMatch139 } from './storeListing139';

// 139: a real wine list of 19 reds was read line by line and got no verdict, because only an exact verified sheet
// was scored. A line without a verified sheet is now looked up in Winerim's public store (storeListing139) and
// shown as a labelled estimate, or as a range when the list prints only the winery. Pure presentation and order:
// nothing here is saved, linked as a verified sheet or fed to the profile.
// 140: on the owner's real list most lines were ranges with six options each: the list became endless and he could
// not tell which wine it was. The bottle price printed on the list now settles a range when it clearly points at one
// wine (`likely`), a grape printed on the list discards wines that are not of that grape (`mismatch` when none is
// left), and what remains a range is ordered by its midpoint, below every certain answer.
export type MenuOption140 = { estimate: StoreEstimate138; score: number };
export type MenuVerdict139 =
  | { kind: 'verified'; score: number; title: string }
  | { kind: 'estimate'; score: number; title: string; estimate: StoreEstimate138; chosen: boolean }
  | { kind: 'likely'; score: number; title: string; estimate: StoreEstimate138; options: MenuOption140[] }
  | { kind: 'range'; low: number; high: number; options: MenuOption140[] }
  | { kind: 'mismatch'; grape: string; options: MenuOption140[] }
  | { kind: 'loading' } | { kind: 'none' } | { kind: 'pending' };
/** What the scanner read on the printed line, beyond what the store lookup already used. */
export type MenuLine140 = { name: string; bottlePrice?: number | null };

const text = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** One store lookup per distinct printed line: editing the name or the winery asks again. */
export const menuLineKey139 = (wine: { nombre: string; productor?: string | null; anada?: number | string | null; tipo?: string | null }) =>
  [text(wine.nombre), text(wine.productor), String(wine.anada ?? ''), text(wine.tipo)].join('|');
export const storeOptionName139 = (estimate: StoreEstimate138) => { const { name, subname } = estimate.row;
  return [name, subname && !` ${text(name)} `.includes(` ${text(subname)} `) ? subname : ''].filter(Boolean).join(' '); };

// 140: grapes a list prints next to the brand («MARCO REAL – Syrah»), with the names the store uses for the same
// grape. Names that are also a place or a surname (Cariñena, Mataró, Palomino) are left out on purpose: a false
// «no encontramos» is worse than a range.
const GRAPES140: ReadonlyArray<readonly string[]> = [
  ['Tempranillo', 'Tinta Fina', 'Tinto Fino', 'Tinta de Toro', 'Tinta del País', 'Cencibel', 'Ull de Llebre'],
  ['Garnacha', 'Garnatxa', 'Grenache'], ['Syrah', 'Shiraz'], ['Cabernet Sauvignon'], ['Cabernet Franc'], ['Cabernet'], ['Merlot'], ['Malbec'],
  ['Graciano'], ['Mazuelo', 'Carignan', 'Samsó'], ['Monastrell', 'Mourvèdre'], ['Mencía'], ['Bobal'], ['Pinot Noir'], ['Petit Verdot'],
  ['Verdejo'], ['Albariño', 'Alvarinho'], ['Godello'], ['Viura', 'Macabeo'], ['Chardonnay'], ['Sauvignon Blanc'], ['Riesling'],
  ['Gewürztraminer'], ['Moscatel', 'Muscat', 'Moscato'], ['Xarel·lo'], ['Treixadura'], ['Pedro Ximénez'], ['Hondarrabi Zuri'],
  ['Prieto Picudo'], ['Callet'], ['Listán Negro'], ['Sumoll'], ['Trepat'], ['Nebbiolo'], ['Sangiovese'], ['Viognier']];
const grapeGroups140 = (folded: string) => { const padded = ` ${folded} `;
  const found = GRAPES140.flatMap(group => { const name = group.find(grape => padded.includes(` ${text(grape)} `)); return name ? [{ group, name }] : []; });
  // «Cabernet Sauvignon» is not also a loose «Cabernet».
  return found.filter(item => item.group[0] !== 'Cabernet' || !found.some(other => other !== item && other.group[0].startsWith('Cabernet '))); };
/** The grape a list line names, as it should be shown («Syrah»), or null. */
export const listedGrape140 = (lineName: string): string | null => grapeGroups140(text(lineName))[0]?.name ?? null;
/** true: the wine is of that grape; false: the store says it is of others; null: the store does not say. */
export const optionHasGrape140 = (estimate: StoreEstimate138, lineName: string): boolean | null => {
  const wanted = grapeGroups140(text(lineName)); if (!wanted.length) return null;
  // The store sends grapes as strings or nested lists («[["Malbec"]]», «Shiraz/Syrah»): fold whatever comes.
  const known = text(`${storeOptionName139(estimate)} ${JSON.stringify((estimate.row as { grapes?: unknown }).grapes ?? '')}`);
  if (wanted.some(({ group }) => group.some(grape => ` ${known} `.includes(` ${text(grape)} `)))) return true;
  return grapeGroups140(known).length ? false : null;
};
const priceGap140 = (estimate: StoreEstimate138, price: number | null | undefined) => typeof price === 'number' && price > 0
  && typeof estimate.typicalPrice === 'number' && estimate.typicalPrice > 0 ? Math.abs(Math.log(price / estimate.typicalPrice)) : Infinity;
/** Options as they are offered: the one whose usual price is closest to the list's first; without prices, by score. */
const offered140 = (options: readonly MenuOption140[], price: number | null | undefined): MenuOption140[] => [...options]
  .sort((a, b) => { const left = priceGap140(a.estimate, price), right = priceGap140(b.estimate, price);
    return left === right ? b.score - a.score : left - right; });
/** 140: an opened range never shows more than five wines: a longer list is the «¿cuál es?» the owner complained about. */
export const MENU_OPTIONS_SHOWN140 = 5;
export const shownMenuOptions140 = (options: readonly MenuOption140[]) => options.slice(0, MENU_OPTIONS_SHOWN140);

/**
 * `verified` is the affinity of the existing verified-sheet path and always wins. `match` is undefined while the
 * store lookup is running and null when the store has no such wine. `chosen` is the store id picked from a range.
 * `line` (140) is the printed name and bottle price: they turn a range into a likely wine or a grape mismatch.
 */
export const menuVerdict139 = (verified: { score: number; title: string } | null, match: ListingMatch139 | null | undefined,
  profile: MatchrimProfileLike | null | undefined, chosen?: number | null, enabled = true, line?: MenuLine140 | null): MenuVerdict139 => {
  if (verified) return { kind: 'verified', ...verified };
  if (!enabled || !profile) return { kind: 'pending' };
  if (match === undefined) return { kind: 'loading' };
  if (!match) return { kind: 'none' };
  const scored = (match.kind === 'exact' ? [match.estimate] : match.options).flatMap(estimate => {
    const result = storeAffinity139(profile, estimate.attributes);
    return result.state === 'ready' ? [{ estimate, score: result.score, title: result.title }] : [];
  });
  if (!scored.length) return { kind: 'none' };
  const plain = (options: typeof scored) => offered140(options.map(({ estimate, score }) => ({ estimate, score })), line?.bottlePrice);
  // What the person picked by hand wins over price and grape: any wine of the winery can be picked.
  const picked = chosen != null ? scored.find(option => option.estimate.row.id === chosen) : null;
  if (picked) return { kind: 'estimate', score: picked.score, title: picked.title, estimate: picked.estimate, chosen: true };
  // A printed grape discards the wines the store says are of other grapes; a wine without grape data stays.
  let candidates = scored;
  const grape = line ? listedGrape140(line.name) : null;
  if (grape && line) {
    candidates = scored.filter(option => optionHasGrape140(option.estimate, line.name) !== false);
    if (!candidates.length) return { kind: 'mismatch', grape, options: plain(scored) };
  }
  if (candidates.length === 1) { const [one] = candidates;
    return { kind: 'estimate', score: one.score, title: one.title, estimate: one.estimate, chosen: false }; }
  const likely = likelyByPrice140(candidates.map(option => option.estimate), line?.bottlePrice);
  const priced = likely ? candidates.find(option => option.estimate === likely) : null;
  if (priced) return { kind: 'likely', score: priced.score, title: priced.title, estimate: priced.estimate,
    options: plain(candidates.filter(option => option !== priced)) };
  const scores = candidates.map(option => option.score);
  return { kind: 'range', low: Math.min(...scores), high: Math.max(...scores), options: plain(candidates) };
};

/** 140: a certain answer is one wine with one score; a range is not, however high its upper bound. */
export const menuVerdictCertain140 = (verdict: MenuVerdict139): verdict is Extract<MenuVerdict139, { score: number }> =>
  verdict.kind === 'verified' || verdict.kind === 'estimate' || verdict.kind === 'likely';
/** The number a row is compared by: its score, or the midpoint of a range. */
export const menuVerdictScore140 = (verdict: MenuVerdict139): number | null => menuVerdictCertain140(verdict) ? verdict.score
  : verdict.kind === 'range' ? (verdict.low + verdict.high) / 2 : null;
/**
 * Order of the list. 140: «entre 64 y 79» sat above a certain ≈76 because a range counted by its upper bound. Certain
 * answers (verified, exact, likely) go first by score; then ranges by midpoint; then what is still loading; then the rest.
 */
export const menuVerdictRank139 = (verdict: MenuVerdict139) => menuVerdictCertain140(verdict) ? 2000 + verdict.score
  : verdict.kind === 'range' ? 1000 + (verdict.low + verdict.high) / 2 : verdict.kind === 'loading' ? -1 : -2;
export const sortMenuVerdicts139 = <T extends { verdict: MenuVerdict139 }>(rows: readonly T[]): T[] => rows
  .map((row, order) => ({ row, order })).sort((a, b) => menuVerdictRank139(b.row.verdict) - menuVerdictRank139(a.row.verdict) || a.order - b.order)
  .map(({ row }) => row);

/** 140: the wine Winerim knows the line as, and the printed text when it is not the same words. */
export const menuRowName140 = (listed: string, verdict: MenuVerdict139): { name: string; listed: string | null } => {
  if (verdict.kind !== 'estimate' && verdict.kind !== 'likely') return { name: listed, listed: null };
  const name = storeOptionName139(verdict.estimate);
  return { name, listed: text(name) === text(listed) ? null : listed };
};
export const menuLikelyText140 = (verdict: Extract<MenuVerdict139, { kind: 'likely' }>) => `Probablemente ${storeOptionName139(verdict.estimate)} (por el precio)`;

/** What a row says. An estimate always carries the word «estimación»; a range says where it comes from. */
export const menuVerdictText139 = (verdict: MenuVerdict139): string => verdict.kind === 'verified' ? `≈${verdict.score}/100 · ${verdict.title}`
  : verdict.kind === 'estimate' ? `≈${verdict.score}/100 · ${verdict.title} (estimación)`
    : verdict.kind === 'likely' ? `≈${verdict.score}/100 · ${verdict.title} · ${menuLikelyText140(verdict)}`
      : verdict.kind === 'range' ? verdict.low === verdict.high ? `≈${verdict.high}/100 (estimación) · según cuál de sus vinos sea`
        : `entre ${verdict.low} y ${verdict.high} · según cuál de sus vinos sea`
        : verdict.kind === 'mismatch' ? `No encontramos el ${verdict.grape} de esta bodega en Winerim`
          : verdict.kind === 'loading' ? 'Buscando en Winerim…' : verdict.kind === 'none' ? 'No lo hemos encontrado en Winerim' : 'Afinidad pendiente';

/** A second photo adds its wines to the list; a line already there (same name and price) is not repeated. */
export const mergeMenuPages139 = <T extends { nombre: string; precio: number | null }>(current: readonly T[], added: readonly T[]): T[] => {
  const id = (wine: T) => `${text(wine.nombre)}|${wine.precio ?? ''}`;
  const seen = new Set(current.map(id));
  return [...current, ...added.filter(wine => { const key = id(wine); if (seen.has(key)) return false; seen.add(key); return true; })];
};

/** A partial reading is worth a warning only when clearly fewer lines were read than the reader saw. */
export const menuCoverageWarning139 = (read: number, expected: number | null | undefined): string | null =>
  typeof expected === 'number' && expected > 0 && read < expected * 0.6
    ? `Puede que falten vinos: hemos leído ${read} de unas ${expected} líneas. Acerca la cámara y usa «Añadir otra página».` : null;
