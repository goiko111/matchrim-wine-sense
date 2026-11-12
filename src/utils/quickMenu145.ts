import type { OcrLine143 } from './menuPositions143';

// 145: the server needs about forty seconds to read a wine list, and the person watched a progress card all that
// time. The phone reads the printed lines of the same photo in about a second: enough to show, right away, the
// wines that look like wines and what each costs, and to start asking Winerim about them. This is a preview: the
// server's reading replaces it when it arrives. Nothing here is saved.
export type QuickMenuLine145 = { text: string; price: number | null; y: number };
const PRICE = /(\d{1,4})(?:[.,](\d{1,2}))?\s?(?:€|eur(?:os?)?\b)|(\d{1,3})[.,](\d{2})\s*$/i;
const priceOf = (text: string): number | null => { const match = text.match(PRICE); if (!match) return null;
  const value = Number(`${match[1] ?? match[3]}.${(match[2] ?? match[4] ?? '0')}`); return Number.isFinite(value) && value >= 3 && value <= 5000 ? value : null; };
const HEADING = /^(?:tintos?|blancos?|rosados?|espumosos?|cavas?|champagnes?|dulces?|generosos?|vinos?|carta de vinos|copas?|por copas|botellas?|red|white|ros[eé]|sparkling)(?:\s+(?:y|e|and)\s+\p{L}+)?$/iu;

export const quickMenuLines145 = (lines: ReadonlyArray<OcrLine143>, max = 40): QuickMenuLine145[] => {
  const prices = lines.flatMap(line => { const bare = line.text.replace(PRICE, '').replace(/[\s.·_-]+/g, ''); const price = priceOf(line.text);
    return price !== null && bare.length < 2 ? [{ price, y: line.box.y + line.box.height / 2, x: line.box.x, used: false }] : []; });
  const out: QuickMenuLine145[] = [];
  for (const line of [...lines].sort((a, b) => a.box.y - b.box.y)) {
    const inline = priceOf(line.text);
    const text = line.text.replace(PRICE, ' ').replace(/[.·_]{2,}/g, ' ').replace(/\s+/g, ' ').trim();
    const letters = text.replace(/[^\p{L}]/gu, '');
    // Not a wine: a bare price, a section in brackets («(RIOJA)»), a heading, or too little to search.
    // 146: nor the restaurant's own lines at the foot of the page («IKILIEUS / @IKILI.DONOSTIA», a web address, a phone).
    if (letters.length < 3 || /^\(.*\)$/.test(text) || HEADING.test(text) || /@|www\.|https?:|\.(?:com|es|eus|net)\b|\btel\b|\d{3}\s?\d{3}\s?\d{3}/i.test(text)) continue;
    const middle = line.box.y + line.box.height / 2;
    let price = inline;
    if (price === null) {
      // The price column is read as lines of its own: the one level with this line, to its right, is its price.
      const near = prices.filter(item => !item.used && item.x > line.box.x && Math.abs(item.y - middle) <= line.box.height * 0.7)
        .sort((a, b) => Math.abs(a.y - middle) - Math.abs(b.y - middle))[0];
      if (near) { near.used = true; price = near.price; }
    }
    out.push({ text: text.slice(0, 160), price, y: middle });
    if (out.length >= max) break;
  }
  return out;
};
