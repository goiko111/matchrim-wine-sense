import type { MenuVerdict139 } from './menuEstimates139';

// 141: on the owner's iPhone the wine-list scan took one photo, showed 6 of 19 wines and asked him to «Reintentar 2
// zonas pendientes». The scan is now one action: several photos gathered first, read one after another into one
// list, unread parts retried once without asking, and the answer painted on the photo where the reader placed each
// wine. Everything here is pure (what the tray accepts, what the wait says, when to retry, what a badge says and
// where it goes); the component only draws it.

/** Photos gathered before «Analizar la carta». More than four is a long wait for one answer. */
export const MENU_TRAY_MAX141 = 4;
export const menuTrayFull141 = (count: number) => count >= MENU_TRAY_MAX141;
/** A new photo goes at the end; a full tray stays as it is (same array, so the caller can tell). */
export const addToMenuTray141 = <T>(tray: readonly T[], item: T): readonly T[] => menuTrayFull141(tray.length) ? tray : [...tray, item];
export const removeFromMenuTray141 = <T>(tray: readonly T[], index: number): T[] => tray.filter((_, position) => position !== index);
export const menuTrayLabel141 = (count: number) => count === 1 ? '1 foto' : `${count} fotos`;
export const menuTrayHint141 = (count: number) => menuTrayFull141(count) ? `Máximo ${MENU_TRAY_MAX141} fotos por lectura.`
  : '¿La carta sigue en otra página? Añade otra foto antes de analizar.';

/** What the single waiting screen says while photos are read in sequence. `index` is 0-based. */
export type MenuReading141 = { index: number; total: number; finishing: boolean };
export const menuReadingLabel141 = (reading: MenuReading141 | null): string => !reading ? 'Leyendo la carta'
  : reading.finishing ? 'Terminando de leer la carta…'
    : reading.total > 1 ? `Leyendo la foto ${Math.min(reading.index + 1, reading.total)} de ${reading.total}` : 'Leyendo la carta';

/**
 * Parts of a photo the reader left unread are asked again once, without a question: «Reintentar 2 zonas pendientes»
 * meant nothing to the person. Never a second time on its own (each try is a paid read and a longer wait), and never
 * after a cancel.
 */
export const shouldAutoRetry141 = ({ pending, retried, cancelled }: { pending: number; retried: boolean; cancelled: boolean }) =>
  pending > 0 && !retried && !cancelled;

/** The number painted on the photo: one certain score, a range, or nothing when Winerim has no answer (yet). */
export const MENU_BADGE_GOOD141 = 65;
export type MenuBadge141 = { text: string; tone: 'good' | 'plain' };
export const menuBadge141 = (verdict: MenuVerdict139 | null | undefined): MenuBadge141 | null => {
  if (!verdict) return null;
  if (verdict.kind === 'verified' || verdict.kind === 'estimate' || verdict.kind === 'likely')
    return { text: String(verdict.score), tone: verdict.score >= MENU_BADGE_GOOD141 ? 'good' : 'plain' };
  if (verdict.kind === 'range') return { text: verdict.low === verdict.high ? String(verdict.high) : `${verdict.low}–${verdict.high}`, tone: 'plain' };
  return null;
};

/** A line's box on the photo, in % of the image: (x, y) is its top-left corner; width and height may be missing. */
export type MenuPhotoBox141 = { x?: number | null; y?: number | null; width?: number | null; height?: number | null };
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
/** Badge widths in % of the image width, on a phone: «82» and «64–79». Used only to keep the badge inside the image. */
export const MENU_BADGE_WIDTH141 = { score: 9, range: 15 } as const;
/**
 * Where the badge goes: its RIGHT edge at the right end of the line's box (over the price column, never over the
 * name, which starts at the left), vertically centred on the line. Without a width the anchor is the name's left
 * edge, so the badge goes at the right margin of the image instead. Always inside the image.
 * Returns CSS percentages: `right` from the image's right edge, `top` of the badge's centre.
 */
export const menuBadgePlacement141 = (box: MenuPhotoBox141 | null | undefined, badgeWidth: number = MENU_BADGE_WIDTH141.score): { right: number; top: number } | null => {
  const x = number(box?.x), y = number(box?.y);
  if (x === null || y === null) return null;
  const width = number(box?.width), height = number(box?.height);
  const rightEdge = width !== null && width > 0 ? x + width : 99;
  // A box taller than a few lines is a block, not a line: its first line is where the name is.
  const centre = height !== null && height > 0 && height <= 12 ? y + height / 2 : y;
  return { right: 100 - clamp(rightEdge, Math.min(99, badgeWidth + 1), 99), top: clamp(centre, 2, 98) };
};

/**
 * Numbers go on a photo only when the reader placed most of its wines, each on its own line. A reader that puts
 * several wines on the same spot is guessing, and a wrong number next to a wine is worse than no number.
 */
export const menuPhotoReliable141 = (boxes: ReadonlyArray<MenuPhotoBox141 | null | undefined>): boolean => {
  const placed = boxes.map(box => menuBadgePlacement141(box)).filter((place): place is { right: number; top: number } => place !== null);
  if (!placed.length || placed.length < boxes.length * 0.7) return false;
  const stacked = placed.filter((place, index) => placed.some((other, position) => position !== index
    && Math.abs(other.top - place.top) < 1 && Math.abs(other.right - place.right) < 10)).length;
  return stacked <= placed.length * 0.2;
};
