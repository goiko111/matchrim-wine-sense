import type { OcrLine143 } from './menuPositions143';

// 145: the server needs about forty seconds to read a wine list, and the person watched a progress card all that
// time. The phone reads the printed lines of the same photo in about a second: enough to show, right away, the
// wines that look like wines and what each costs, and to start asking Winerim about them. This is a preview: the
// server's reading replaces it when it arrives. Nothing here is saved.
// 166: the section a line sits under («BLANCOS») goes with it, so the white of a winery is not answered with its red.
export type QuickMenuLine145 = { text: string; price: number | null; y: number; section?: 'tinto' | 'blanco' | 'rosado' | 'espumoso' };
const COLOURS166: ReadonlyArray<[NonNullable<QuickMenuLine145['section']>, RegExp]> = [['tinto', /\btintos?\b|\bred\b/i], ['blanco', /\bblancos?\b|\bwhite\b/i],
  ['rosado', /\brosados?\b|\bros[eé]\b/i], ['espumoso', /\bespumosos?\b|\bcavas?\b|\bchampagnes?\b|\bchamp[aá]n\b|\bsparkling\b/i]];
const sectionOf166 = (text: string) => { const found = COLOURS166.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  return found.length === 1 || (found.length > 1 && found.every(name => name === 'espumoso')) ? found[0] : null; };
const PRICE = /(\d{1,4})(?:[.,](\d{1,2}))?\s?(?:€|eur(?:os?)?\b)|(\d{1,3})[.,](\d{2})\s*$/i;
const priceOf = (text: string): number | null => { const match = text.match(PRICE); if (!match) return null;
  const value = Number(`${match[1] ?? match[3]}.${(match[2] ?? match[4] ?? '0')}`); return Number.isFinite(value) && value >= 3 && value <= 5000 ? value : null; };
const SECTION = /^(?:tintos?|blancos?|rosados?|espumosos?|cavas?|champagnes?|champ[aá]n|dulces?|generosos?|vinos?|carta|copas?|botellas?|magnums?|red|white|ros[eé]|sparkling|wines?|y|e|and|de|por|los|las|la|el)$/iu;
// A section title is made only of such words («TINTOS», «CAVAS, CHAMPAGNES Y ESPUMOSOS», «VINOS POR COPAS»).
const HEADING = { test: (text: string) => { const words = text.split(/[^\p{L}]+/u).filter(Boolean); return words.length > 0 && words.every(word => SECTION.test(word)); } };

export const quickMenuLines145 = (lines: ReadonlyArray<OcrLine143>, max = 40): QuickMenuLine145[] => {
  const prices = lines.flatMap(line => { const bare = line.text.replace(PRICE, '').replace(/[\s.·_-]+/g, ''); const price = priceOf(line.text);
    return price !== null && bare.length < 2 ? [{ price, y: line.box.y + line.box.height / 2, x: line.box.x, used: false }] : []; });
  const out: QuickMenuLine145[] = [];
  // Sections are trusted only on a one-column page: with two columns the lines of both are mixed from top to bottom.
  const oneColumn = !lines.some(line => line.box.x > 0.4 && HEADING.test(line.text.trim()));
  let section: QuickMenuLine145['section'] | null = null;
  for (const line of [...lines].sort((a, b) => a.box.y - b.box.y)) {
    const inline = priceOf(line.text);
    const text = line.text.replace(PRICE, ' ').replace(/[.·_]{2,}/g, ' ').replace(/\s+/g, ' ').trim();
    const letters = text.replace(/[^\p{L}]/gu, '');
    // Not a wine: a bare price, a section in brackets («(RIOJA)»), a heading, or too little to search.
    // 146: nor the restaurant's own lines at the foot of the page («IKILIEUS / @IKILI.DONOSTIA», a web address, a phone).
    // 147: a zone in brackets cut by the edge («(EUSKA»), and a line that runs off the right edge of the photo with
    // no price of its own (the next column, cut: «MONTECIL», «LUIS CAN») are not wines to show either.
    if (oneColumn && HEADING.test(text)) section = sectionOf166(text);
    if (/^\(/.test(text) || (inline === null && line.box.x + line.box.width > 0.985)) continue;
    if (letters.length < 3 || /^\(.*\)$/.test(text) || HEADING.test(text) || /@|www\.|https?:|\.(?:com|es|eus|net)\b|\btel\b|\d{3}\s?\d{3}\s?\d{3}/i.test(text)) continue;
    const middle = line.box.y + line.box.height / 2;
    let price = inline;
    if (price === null) {
      // The price column is read as lines of its own: the one level with this line, to its right, is its price.
      // 147: with two columns the price level with a line may belong to the other column: the nearest one to the right wins.
      const end = line.box.x + line.box.width;
      const near = prices.filter(item => !item.used && item.x >= end - 0.02 && Math.abs(item.y - middle) <= line.box.height * 0.7)
        .sort((a, b) => (a.x - end) - (b.x - end) || Math.abs(a.y - middle) - Math.abs(b.y - middle))[0];
      if (near) { near.used = true; price = near.price; }
    }
    out.push({ text: text.slice(0, 160), price, y: middle, ...(section ? { section } : {}) });
    if (out.length >= max) break;
  }
  return out;
};
