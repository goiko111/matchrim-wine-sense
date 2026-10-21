export interface LocalOCRFragmentBox108 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LocalOCRFragmentLine108 {
  readonly text: string;
  readonly confidence: number;
  /** Normalized coordinates, with origin at the top left. */
  readonly box: LocalOCRFragmentBox108;
}

export interface LocalOCRFragmentAlternative108 {
  readonly text: string;
  /** Original, zero-based indices in left-to-right order, not input order. */
  readonly sourceIndices: readonly [number, number];
  /** Minimum source confidence, not a probability that the reconstruction is correct. */
  readonly confidence: number;
  readonly box: LocalOCRFragmentBox108;
  readonly horizontalGap: number;
  readonly reconstructed: true;
  readonly usage: 'native-local-recovery-only';
  readonly canonicalIdentityEvidence: false;
  readonly warning: 'reconstructed-adjacent-fragments-not-identity-evidence';
}

export type LocalOCRFragmentWarning108 =
  | 'invalid-input'
  | 'line-limit-exceeded'
  | 'reconstructed-adjacent-fragments-not-identity-evidence';

export interface LocalOCRFragmentsResult108 {
  /** Same array reference and unchanged raw text, including rejected lines. */
  readonly rawLines: readonly LocalOCRFragmentLine108[];
  readonly alternatives: readonly LocalOCRFragmentAlternative108[];
  readonly warnings: readonly LocalOCRFragmentWarning108[];
}

const limits = { lines: 100, rawText: 1000, confidence: .9, joinedLetters: 16, gap: .025 } as const;
const lettersOnly = /^\p{L}+$/u;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const validLine = (value: unknown): value is LocalOCRFragmentLine108 => {
  if (!record(value) || typeof value.text !== 'string' || !value.text.length || value.text.length > limits.rawText
    || !finite(value.confidence) || value.confidence < 0 || value.confidence > 1 || !record(value.box)) return false;
  const { x, y, width, height } = value.box;
  return finite(x) && finite(y) && finite(width) && finite(height)
    && x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 1 && y + height <= 1;
};
const right = (box: LocalOCRFragmentBox108) => box.x + box.width;
const bottom = (box: LocalOCRFragmentBox108) => box.y + box.height;
const sameBaseline = (a: LocalOCRFragmentBox108, b: LocalOCRFragmentBox108) => {
  const height = Math.min(a.height, b.height);
  return height / Math.max(a.height, b.height) >= .8
    && Math.abs(bottom(a) - bottom(b)) <= height * .2
    && Math.abs(a.y - b.y) <= height * .25;
};

/**
 * Supplemental native local-recovery suggestions only; never replace raw OCR or
 * use these as canonical identity evidence. No spelling, vocabulary or case changes.
 * Requires one Unicode letter + 3..15 letters (4..16 total), both confidence >= .9,
 * height ratio >= .8 and baseline delta <= .2 of the smaller height. Positive gap
 * is at most .025, one smaller height and half the smaller average letter width.
 * Malformed batches fail closed; all raw neighbors can veto an otherwise valid pair.
 */
export const suggestLocalOCRFragments108 = (
  lines: readonly LocalOCRFragmentLine108[],
): LocalOCRFragmentsResult108 => {
  const alternatives: LocalOCRFragmentAlternative108[] = [];
  const reject = (warning: LocalOCRFragmentWarning108): LocalOCRFragmentsResult108 =>
    ({ rawLines: lines, alternatives, warnings: [warning] });
  if (!Array.isArray(lines)) return reject('invalid-input');
  if (lines.length > limits.lines) return reject('line-limit-exceeded');
  // Iteration, unlike Array.every, also validates missing entries in sparse arrays.
  for (const line of lines) if (!validLine(line)) return reject('invalid-input');
  const counts = lines.map(line => lettersOnly.test(line.text) ? Array.from(line.text).length : 0);
  for (let i = 0; i < lines.length; i++) {
    if (!counts[i] || lines[i].confidence < limits.confidence) continue;
    for (let j = i + 1; j < lines.length; j++) {
      if (!counts[j] || lines[j].confidence < limits.confidence) continue;
      if (!((counts[i] === 1 && counts[j] >= 3) || (counts[j] === 1 && counts[i] >= 3))
        || counts[i] + counts[j] > limits.joinedLetters) continue;
      const [leftIndex, rightIndex] = lines[i].box.x <= lines[j].box.x ? [i, j] : [j, i];
      const left = lines[leftIndex], next = lines[rightIndex];
      if (!sameBaseline(left.box, next.box)) continue;
      const gap = next.box.x - right(left.box);
      const maxGap = Math.min(limits.gap, left.box.height, next.box.height,
        .5 * Math.min(left.box.width / counts[leftIndex], next.box.width / counts[rightIndex]));
      if (gap <= 0 || gap > maxGap) continue;
      const y = Math.min(left.box.y, next.box.y);
      const box = { x: left.box.x, y, width: right(next.box) - left.box.x,
        height: Math.max(bottom(left.box), bottom(next.box)) - y };
      const neighborGap = Math.min(limits.gap, Math.max(left.box.height, next.box.height));
      // Include non-letter and low-confidence neighbors: filtering them out first
      // could hide an overlapping observation or a second plausible attachment.
      const ambiguous = lines.some((line, index) => {
        if (index === i || index === j) return false;
        const overlap = Math.min(bottom(line.box), bottom(box)) - Math.max(line.box.y, box.y);
        const sameBand = overlap >= .5 * Math.min(line.box.height, box.height);
        return sameBand && line.box.x <= right(box) + neighborGap && right(line.box) >= box.x - neighborGap;
      });
      if (ambiguous) continue;
      alternatives.push({ text: left.text + next.text, sourceIndices: [leftIndex, rightIndex],
        confidence: Math.min(left.confidence, next.confidence), box, horizontalGap: gap,
        reconstructed: true, usage: 'native-local-recovery-only', canonicalIdentityEvidence: false,
        warning: 'reconstructed-adjacent-fragments-not-identity-evidence' });
    }
  }
  return { rawLines: lines, alternatives,
    warnings: alternatives.length ? ['reconstructed-adjacent-fragments-not-identity-evidence'] : [] };
};
