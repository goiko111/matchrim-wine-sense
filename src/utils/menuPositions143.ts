import type { MenuPhotoBox141 } from './menuScan141';

// 143: on the owner's iPhone the numbers never reached the photo of a real list: the server's read did not place
// the wines, so the photo stayed closed. The phone can find every printed line by itself (Apple Vision, on the
// device, nothing uploaded); this file decides which line is which wine. Everything here is pure: a line is given
// to a wine only when the wine's printed name is clearly on it, each line serves one wine, and a wine whose line is
// not clear gets no place — a number next to the wrong wine is worse than no number.

/** One line of text found on the page. The box is in fractions of the page (0–1), (x, y) its top-left corner. */
export type OcrLine143 = { text: string; box: { x: number; y: number; width: number; height: number } };
/** A wine as the list reader returned it: its name, the row as printed when the reader kept it, and its prices. */
export type MenuRow143 = { name: string; producer?: string | null; source?: string | null; extra?: ReadonlyArray<string | null | undefined>;
  prices?: ReadonlyArray<number | null | undefined> };
/**
 * Where a wine is printed, in % of the photo (the shape the 141 badge code reads) plus what the badge needs to stay
 * off the text: where the name ends and, when the row's price was found, where the price starts and ends.
 */
export type MenuPosition143 = { x: number; y: number; width: number; height: number; confidence: number;
  nameEnd: number; priceStart: number | null; priceEnd: number | null };

/** A wine is placed only when at least this share of its printed name is on the line. */
export const MENU_POSITION_MIN_OVERLAP143 = 0.6;

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Words that can identify a wine: letters (or letters and digits), two or more. Bare numbers are prices and years. */
const wordsOf = (text: string | null | undefined) => fold(text ?? '').split(/[^a-z0-9]+/).filter(token => token.length >= 2 && !/^\d+$/.test(token));
const PRICE143 = /\d{1,4}(?:[.,]\d{1,2})?/g;
const numbersOf = (text: string) => Array.from(text.matchAll(PRICE143), match => ({ value: Number(match[0].replace(',', '.')), index: match.index ?? 0, length: match[0].length }));
const samePrice = (a: number, b: number) => Math.abs(a - b) < 0.005;

/** Vision misreads a letter now and then («MONTECILL0», «Tempranilo»): long words may differ by one or two letters. */
const near = (a: string, b: string) => {
  if (a === b) return true;
  const allowed = Math.min(a.length, b.length) >= 9 ? 2 : Math.min(a.length, b.length) >= 5 ? 1 : 0;
  if (!allowed || Math.abs(a.length - b.length) > allowed) return false;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]; let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, current[j]);
    }
    if (best > allowed) return false;
    previous = current;
  }
  return previous[b.length] <= allowed;
};
const has = (tokens: ReadonlyArray<string>, set: ReadonlySet<string>, token: string) => set.has(token) || tokens.some(other => near(token, other));

type ReadLine = { box: OcrLine143['box']; text: string; words: string[]; set: Set<string>; numbers: ReturnType<typeof numbersOf>; centre: number };

/**
 * Gives each wine the box of the line that prints it, or null.
 * - Share of the wine's name found on the line (accents and case ignored). The row as printed counts too, so a name
 *   corrected by hand still finds its line. A word that many lines share («Tempranillo», «Crianza») counts for
 *   less: it says which kind of wine, not which wine.
 * - A line that also carries the wine's price, or sits on the same visual row as that price, is preferred.
 * - Best pairs first; a line is used once. A wine with two different lines equally good is left without a place.
 * `aspect` is the photo's height divided by its width; it only helps to tell where the name ends inside a line.
 */
export const matchMenuPositions143 = (lines: ReadonlyArray<OcrLine143>, rows: ReadonlyArray<MenuRow143>, aspect: number = 4 / 3): (MenuPosition143 | null)[] => {
  const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
  const read: ReadLine[] = lines.filter(line => line && typeof line.text === 'string' && line.box && finite(line.box.x) && finite(line.box.y)
    && finite(line.box.width) && finite(line.box.height) && line.box.width > 0 && line.box.height > 0)
    .map(line => { const words = wordsOf(line.text);
      return { box: line.box, text: line.text, words, set: new Set(words), numbers: numbersOf(line.text), centre: line.box.y + line.box.height / 2 }; });
  const result: (MenuPosition143 | null)[] = rows.map(() => null);
  if (!read.length || !rows.length) return result;
  // How many lines print each word: a word on five lines is worth a fifth of one printed once.
  const frequency = new Map<string, number>();
  for (const line of read) for (const token of line.set) frequency.set(token, (frequency.get(token) ?? 0) + 1);
  const weight = (token: string) => token.length / Math.max(1, frequency.get(token) ?? 1);
  const coverage = (tokens: ReadonlyArray<string>, line: ReadLine) => {
    let total = 0, found = 0, letters = 0;
    const matched: string[] = [];
    for (const token of new Set(tokens)) { const value = weight(token); total += value;
      if (has(line.words, line.set, token)) { found += value; letters += token.length; matched.push(token); } }
    return { share: total > 0 ? found / total : 0, letters, matched };
  };
  // Lines on the same visual row to the right of a line, nearest first: where the dotted leader ends and the price is.
  const order = read.map((_, index) => index).sort((a, b) => read[a].centre - read[b].centre || read[a].box.x - read[b].box.x);
  const rank = new Map(order.map((line, position) => [line, position]));
  const rightOf = (index: number) => { const line = read[index];
    return read.map((other, position) => ({ other, position })).filter(({ other, position }) => position !== index
      && Math.abs(other.centre - line.centre) <= Math.max(other.box.height, line.box.height) / 2
      && other.box.x >= line.box.x + line.box.width - 0.02).sort((a, b) => a.other.box.x - b.other.box.x); };

  type Pair = { row: number; line: number; score: number; position: MenuPosition143 };
  const pairs: Pair[] = [];
  rows.forEach((row, rowIndex) => {
    const name = wordsOf(row.name), source = wordsOf(row.source);
    const known = new Set([...name, ...source, ...wordsOf(row.producer), ...(row.extra ?? []).flatMap(wordsOf)]);
    const knownList = [...known];
    const prices = (row.prices ?? []).filter(finite);
    if (!name.length && !source.length) return;
    read.forEach((line, lineIndex) => {
      if (!line.words.length) return;
      const byName = coverage(name, line), bySource = coverage(source, line);
      const best = byName.share >= bySource.share ? byName : bySource;
      if (best.share < MENU_POSITION_MIN_OVERLAP143 || best.letters < 3) return;
      // Of what the line says, how much belongs to this wine: a heading that happens to hold the name scores lower.
      const own = line.words.filter(token => has(knownList, known, token)).reduce((sum, token) => sum + token.length, 0);
      const all = line.words.reduce((sum, token) => sum + token.length, 0);
      // And how many lines print everything that matched: «Tempranillo» alone is on several, «Luis» on one.
      const printedOn = Math.max(1, read.filter(other => best.matched.every(token => has(other.words, other.set, token))).length);
      const base = best.share * (0.75 + 0.25 * (all > 0 ? own / all : 0)) * (0.85 + 0.15 / printedOn);
      if (base < MENU_POSITION_MIN_OVERLAP143) return;
      // The price: on the line itself, or on the same row to its right (a list prints it at the end of the leader).
      const inLine = [...line.numbers].reverse().find(number => prices.some(price => samePrice(price, number.value)));
      const trailing = inLine ?? (() => { const match = /(\d{1,4}[.,]\d{1,2}\s*(?:€|eur\w*)?|\d{1,4}\s*(?:€|eur\w*))\s*$/i.exec(line.text);
        return match ? { index: match.index, length: match[0].length } : undefined; })();
      const left = line.box.x, width = line.box.width, length = Math.max(1, line.text.length);
      let nameEnd = left + width, priceStart: number | null = null, priceEnd: number | null = null, confirmed = Boolean(inLine);
      if (trailing) {
        // Name and price read as one line. Vision often drops the dotted leader from the text, so a letter is not
        // «line width / characters» wide: it is no wider than that, and no wider than about 0.6 of the line's height.
        const before = line.text.slice(0, trailing.index).replace(/[\s.·…_\-–—]+$/u, '').length;
        const letter = Math.min(width / length, 0.6 * line.box.height * (aspect > 0 && Number.isFinite(aspect) ? aspect : 4 / 3));
        nameEnd = left + before * letter; priceEnd = left + width; priceStart = priceEnd - (length - trailing.index) * letter;
      } else {
        for (const { other } of rightOf(lineIndex)) {
          const pricedHere = other.numbers.some(number => prices.some(price => samePrice(price, number.value)));
          if (pricedHere || (!other.words.length && other.numbers.length)) {
            priceStart = other.box.x; priceEnd = other.box.x + other.box.width; confirmed = pricedHere; break;
          }
          // A piece of the same row read apart (the grape, the year): the name ends after it. Anything else is another column.
          const share = other.words.length ? other.words.filter(token => has(knownList, known, token)).length / other.words.length : 1;
          if (share < 0.5) break;
          nameEnd = Math.max(nameEnd, other.box.x + other.box.width);
        }
      }
      const percent = (value: number) => Math.round(Math.max(0, Math.min(100, value * 100)) * 100) / 100;
      const score = base + (confirmed ? 0.1 : 0);
      pairs.push({ row: rowIndex, line: lineIndex, score, position: { x: percent(left), y: percent(line.box.y), width: percent(width), height: percent(line.box.height),
        confidence: Math.round(Math.min(1, score) * 100) / 100, nameEnd: percent(nameEnd),
        priceStart: priceStart === null ? null : percent(priceStart), priceEnd: priceEnd === null ? null : percent(priceEnd) } });
    });
  });
  // Best pairs first. Equal scores (the same wine printed twice, two rows with one name) follow the reading order.
  const drift = (pair: Pair) => Math.abs(pair.row / rows.length - (rank.get(pair.line) ?? 0) / read.length);
  pairs.sort((a, b) => b.score - a.score || drift(a) - drift(b) || a.row - b.row || a.line - b.line);
  const taken = new Map<number, number>(), given = new Map<number, Pair>();
  for (const pair of pairs) if (!given.has(pair.row) && !taken.has(pair.line)) { given.set(pair.row, pair); taken.set(pair.line, pair.row); }
  // Nothing is guessed: if another line with other words fits a wine as well as the one it got, neither is certain —
  // unless that other line went to a wine that fits it clearly better (then it is that wine's line, not a rival).
  const sameWords = (a: ReadLine, b: ReadLine) => a.set.size === b.set.size && [...a.set].every(token => b.set.has(token));
  for (const [row, pair] of given) {
    const doubt = pairs.some(other => { if (other.row !== row || other.line === pair.line || other.score < pair.score - 0.05 || sameWords(read[other.line], read[pair.line])) return false;
      const owner = taken.get(other.line), owned = owner === undefined ? undefined : given.get(owner);
      return !owned || owned.score < other.score + 0.05; });
    if (!doubt) result[row] = pair.position;
  }
  return result;
};

/** Badge sizes on the photo. 28 pt tall reads over paper at arm's length; widths are in % of a phone-wide photo. */
export const MENU_BADGE_HEIGHT143 = 28;
export const MENU_BADGE_WIDTH143 = { score: 10, range: 17 } as const;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/**
 * Where the number goes on a line found on the device: over the dotted leader, ending just before the price. When
 * the leader is too short, after the price; with no price, right after the name. Never over the name; always inside
 * the photo. Same result shape as menuBadgePlacement141 (`right` from the right edge, `top` of the badge's centre).
 */
export const menuBadgePlacement143 = (position: MenuPosition143, badgeWidth: number = MENU_BADGE_WIDTH143.score): { right: number; top: number } => {
  const gap = 1, { nameEnd, priceStart, priceEnd } = position;
  let rightEdge: number;
  if (priceStart === null) rightEdge = nameEnd + gap + badgeWidth;
  else if (priceStart - gap - badgeWidth >= nameEnd) rightEdge = priceStart - gap;
  else if ((priceEnd ?? priceStart) + gap + badgeWidth <= 99) rightEdge = (priceEnd ?? priceStart) + gap + badgeWidth;
  // No room before or after the price: the number may cover the price, which the list below repeats, not the name.
  else rightEdge = Math.max(priceEnd ?? priceStart, nameEnd + gap + badgeWidth);
  return { right: 100 - clamp(rightEdge, Math.min(99, badgeWidth + 1), 99), top: clamp(position.y + position.height / 2, 2, 98) };
};

/** A badge ready to draw: where it is, how wide (%), and how far left it may move without covering the name. */
export type MenuBadgeSpot143 = { right: number; top: number; width: number; nameEnd?: number | null };
/**
 * On a tight list the lines are closer than a badge is tall and the numbers would pile up. A badge that would cover
 * an earlier one moves sideways by its own width (left over the leader, else right, else further left), keeping off
 * the name when there is room. `badgeHeight` is in % of the photo's height. Nulls stay null; `top` never changes.
 */
export const spreadMenuBadges143 = (spots: ReadonlyArray<MenuBadgeSpot143 | null>, badgeHeight: number): ({ right: number; top: number } | null)[] => {
  const placed: { left: number; rightEdge: number; top: number }[] = [];
  const result: ({ right: number; top: number } | null)[] = spots.map(() => null);
  const byTop = spots.map((spot, index) => ({ spot, index })).filter((item): item is { spot: MenuBadgeSpot143; index: number } => item.spot !== null)
    .sort((a, b) => a.spot.top - b.spot.top || a.spot.right - b.spot.right);
  for (const { spot, index } of byTop) {
    const step = spot.width + 0.6, natural = 100 - spot.right;
    const options = [0, -1, 1, -2, 2, -3].map(shift => natural + shift * step)
      .filter(rightEdge => rightEdge <= 99 && rightEdge - spot.width >= 1);
    const free = (rightEdge: number) => !placed.some(other => Math.abs(other.top - spot.top) < badgeHeight
      && rightEdge - spot.width < other.rightEdge + 0.5 && other.left - 0.5 < rightEdge);
    const offName = (rightEdge: number) => spot.nameEnd === null || spot.nameEnd === undefined || rightEdge - spot.width >= spot.nameEnd;
    const rightEdge = options.find(option => free(option) && offName(option)) ?? options.find(free) ?? natural;
    placed.push({ left: rightEdge - spot.width, rightEdge, top: spot.top });
    result[index] = { right: Math.round((100 - rightEdge) * 100) / 100, top: spot.top };
  }
  return result;
};

/** What the 141 reliability rule reads from a place found on the device. */
export const menuPositionBox143 = (position: MenuPosition143 | null): MenuPhotoBox141 | null => position
  ? { x: position.x, y: position.y, width: position.width, height: position.height } : null;
