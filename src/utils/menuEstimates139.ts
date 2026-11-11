import type { MatchrimProfileLike } from './matchrimPassport';
import type { StoreEstimate138 } from './storeEstimate138';
import { storeAffinity139, type ListingMatch139 } from './storeListing139';

// 139: a real wine list of 19 reds was read line by line and got no verdict, because only an exact verified sheet
// was scored. A line without a verified sheet is now looked up in Winerim's public store (storeListing139) and
// shown as a labelled estimate, or as a range when the list prints only the winery. Pure presentation and order:
// nothing here is saved, linked as a verified sheet or fed to the profile.
export type MenuVerdict139 =
  | { kind: 'verified'; score: number; title: string }
  | { kind: 'estimate'; score: number; title: string; estimate: StoreEstimate138; chosen: boolean }
  | { kind: 'range'; low: number; high: number; options: Array<{ estimate: StoreEstimate138; score: number }> }
  | { kind: 'loading' } | { kind: 'none' } | { kind: 'pending' };

const text = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** One store lookup per distinct printed line: editing the name or the winery asks again. */
export const menuLineKey139 = (wine: { nombre: string; productor?: string | null; anada?: number | string | null; tipo?: string | null }) =>
  [text(wine.nombre), text(wine.productor), String(wine.anada ?? ''), text(wine.tipo)].join('|');
export const storeOptionName139 = (estimate: StoreEstimate138) => { const { name, subname } = estimate.row;
  return [name, subname && !` ${text(name)} `.includes(` ${text(subname)} `) ? subname : ''].filter(Boolean).join(' '); };

/**
 * `verified` is the affinity of the existing verified-sheet path and always wins. `match` is undefined while the
 * store lookup is running and null when the store has no such wine. `chosen` is the store id picked from a range.
 */
export const menuVerdict139 = (verified: { score: number; title: string } | null, match: ListingMatch139 | null | undefined,
  profile: MatchrimProfileLike | null | undefined, chosen?: number | null, enabled = true): MenuVerdict139 => {
  if (verified) return { kind: 'verified', ...verified };
  if (!enabled || !profile) return { kind: 'pending' };
  if (match === undefined) return { kind: 'loading' };
  if (!match) return { kind: 'none' };
  const scored = (match.kind === 'exact' ? [match.estimate] : match.options).flatMap(estimate => {
    const result = storeAffinity139(profile, estimate.attributes);
    return result.state === 'ready' ? [{ estimate, score: result.score, title: result.title }] : [];
  });
  if (!scored.length) return { kind: 'none' };
  const picked = match.kind === 'range' && chosen != null ? scored.find(option => option.estimate.row.id === chosen) : null;
  const one = picked ?? (scored.length === 1 ? scored[0] : null);
  if (one) return { kind: 'estimate', score: one.score, title: one.title, estimate: one.estimate, chosen: Boolean(picked) };
  const scores = scored.map(option => option.score);
  return { kind: 'range', low: Math.min(...scores), high: Math.max(...scores),
    options: [...scored].sort((a, b) => b.score - a.score).map(({ estimate, score }) => ({ estimate, score })) };
};

/** Order of the list: verified and estimated together, a range by its upper bound, unmatched lines last. */
export const menuVerdictRank139 = (verdict: MenuVerdict139) => verdict.kind === 'verified' || verdict.kind === 'estimate' ? verdict.score
  : verdict.kind === 'range' ? verdict.high : verdict.kind === 'loading' ? -1 : -2;
export const sortMenuVerdicts139 = <T extends { verdict: MenuVerdict139 }>(rows: readonly T[]): T[] => rows
  .map((row, order) => ({ row, order })).sort((a, b) => menuVerdictRank139(b.row.verdict) - menuVerdictRank139(a.row.verdict) || a.order - b.order)
  .map(({ row }) => row);

/** What a row says. An estimate always carries the word «estimación»; a range says where it comes from. */
export const menuVerdictText139 = (verdict: MenuVerdict139): string => verdict.kind === 'verified' ? `≈${verdict.score}/100 · ${verdict.title}`
  : verdict.kind === 'estimate' ? `≈${verdict.score}/100 · ${verdict.title} (estimación)`
    : verdict.kind === 'range' ? verdict.low === verdict.high ? `≈${verdict.high}/100 (estimación, según el vino de esta bodega)`
      : `entre ${verdict.low} y ${verdict.high} (según el vino de esta bodega)`
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
