// 144: on a real iPhone a wine list was photographed twice through «Botellas»: the label reader searched the whole
// page as one bottle and offered twenty unrelated wines. The text the phone has already read says which of the two
// it is: a list is many lines, several of them ending in a price. A label is recognised as such by having neither.
const PRICE144 = /(?:^|\s)\d{1,4}(?:[.,]\d{1,2})?\s?(?:€|eur(?:os?)?\b)|(?:^|\s)\d{1,3}[.,]\d{2}\s*$/i;
export const looksLikeWineList144 = (lines: ReadonlyArray<{ text: string }>): boolean =>
  lines.length >= 10 && lines.filter(line => PRICE144.test(line.text)).length >= 4;

// The photo changes hands inside the app (never stored, never sent): the label scanner leaves it here and the list
// scanner picks it up once, into its tray, where the person sees it and starts the read as with any other list photo.
let pending144: File | null = null;
export const handMenuPhoto144 = (file: File) => { pending144 = file; };
export const takeMenuPhoto144 = (): File | null => { const file = pending144; pending144 = null; return file; };

// 145: a bottle photographed in a restaurant had the wine list behind it, and the search used that small print
// instead of the label (a PSI came back as eighteen Malvasías). The label is what the person points at: a line of
// the label crosses the middle fifth of the photo; text that lies wholly to one side of it is background (the list
// on the table, a screen behind). With too little left, everything is kept (an off-centre label still reads).
export const labelLines145 = <T extends { box: { x: number; width: number } }>(lines: readonly T[]): T[] => {
  if (lines.length < 4) return [...lines];
  const middle = lines.filter(line => line.box.x <= 0.6 && line.box.x + line.box.width >= 0.4);
  return middle.length >= 1 ? middle : [...lines];
};

/** 145: label lines that are a single three-letter word (a lone symbol or the year beside it is ignored): «Ψ Psi 2023» → «Psi». */
export const shortNames145 = (lines: readonly string[]): string[] => [...new Set(lines.flatMap(line => {
  const words = line.replace(/\b(?:19|20)\d{2}\b/g, ' ').split(/[^\p{L}]+/u).filter(word => word.length >= 2);
  return words.length === 1 && words[0].length === 3 && !/^(?:vol|the|des|del|los|las|vin|doc|igp|dop)$/i.test(words[0]) ? [words[0]] : [];
}))].slice(0, 2);
