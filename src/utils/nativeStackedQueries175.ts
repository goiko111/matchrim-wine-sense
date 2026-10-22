import type { YearLine105 } from './wineYearRole105';

type Line = YearLine105 & { confidence: number; box: NonNullable<YearLine105['box']> };
export type StackedQuery175 = { text: string; fallback: string; sourceIndices: number[]; canonicalIdentityEvidence: false };
const key = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const validBox = (box: YearLine105['box']) => Boolean(box && Object.values(box).every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)
  && box.width > 0 && box.height > 0 && box.x + box.width <= 1.001 && box.y + box.height <= 1.001);
const valid = (value: YearLine105): value is Line => {
  const line = value as Line, box = line?.box;
  return typeof line?.text === 'string' && /^[\p{L}]{2,30}$/u.test(line.text.trim())
    && typeof line.confidence === 'number' && line.confidence >= .9 && line.confidence <= 1
    && validBox(box) && box.width / box.height >= 2;
};

// Query-only phrases, never an OCR replacement. No spelling corrections, joins
// across arbitrary fields, cross-column heuristics or inferred winery aliases.
export const nativeStackedQueries175 = (lines: readonly YearLine105[] | undefined,
  evidence: readonly string[], accept: (text: string) => boolean): StackedQuery175[] => {
  if (!Array.isArray(lines) || lines.length > 100 || !lines.every(line => evidence.includes(line?.text) && validBox(line?.box))) return [];
  const eligible = lines.map((line, i) => ({ line, i })).filter(({ line }) => valid(line) && accept(line.text)) as { line: Line; i: number }[];
  const edges = eligible.flatMap(a => eligible.filter(b => {
    if (a.i === b.i || b.line.box.y <= a.line.box.y) return false;
    const x = a.line.box, y = b.line.box, height = Math.min(x.height, y.height);
    const gap = y.y - x.y - x.height;
    return height / Math.max(x.height, y.height) >= .6 && gap >= -.3 * height && gap <= .6 * height
      && Math.abs(x.x + x.width / 2 - y.x - y.width / 2) <= .03;
  }).map(b => [a.i, b.i] as const));
  const starts = eligible.filter(a => !edges.some(([, end]) => end === a.i));
  const result: StackedQuery175[] = [];
  for (const first of starts) {
    const indices = [first.i]; let ambiguous = false;
    while (indices.length <= 3) {
      const next = edges.filter(([start]) => start === indices.at(-1));
      if (!next.length) break;
      if (next.length !== 1 || edges.filter(([, end]) => end === next[0][1]).length !== 1) { ambiguous = true; break; }
      indices.push(next[0][1]);
    }
    if (ambiguous || indices.length < 2 || indices.length > 3) continue;
    const group = indices.map(i => lines[i] as Line), text = group.map(line => line.text.trim()).join(' ');
    if (text.length > 80 || evidence.some(raw => key(raw) === key(text))) continue;
    const left = Math.min(...group.map(line => line.box.x)), right = Math.max(...group.map(line => line.box.x + line.box.width));
    const top = group[0].box.y, bottom = group.at(-1)!.box.y + group.at(-1)!.box.height;
    // Low-confidence/non-letter observations can veto an otherwise clean stack.
    if (lines.some((line, i) => !indices.includes(i) && line.box
      && line.box.y < bottom && line.box.y + line.box.height > top
      && line.box.x < right && line.box.x + line.box.width > left)) continue;
    const fallback = [...group].sort((a, b) => b.text.trim().length - a.text.trim().length)[0].text.trim();
    result.push({ text, fallback, sourceIndices: indices, canonicalIdentityEvidence: false });
  }
  return result;
};
