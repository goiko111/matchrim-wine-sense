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
