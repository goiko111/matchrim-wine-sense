import type { LocalOCRResult106 } from '@/utils/nativeOCR106';

// 156: what to offer as the name and year of a wine Winerim does not have, from the label's own lines.
const year = (text: string) => text.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? '';
const tidy = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, gap: string, letter: string) => gap + letter.toUpperCase()).slice(0, 80);

/** The label's largest line that is made of words: on most labels that is the wine's name. */
export const labelName156 = (lines: LocalOCRResult106['lines'] | undefined): string => {
  const words = (lines ?? []).filter(line => (line.text.match(/\p{L}/gu)?.length ?? 0) >= 3 && line.confidence >= 0.3);
  const tallest = [...words].sort((a, b) => b.box.height - a.box.height)[0];
  return tallest ? tidy(tallest.text.replace(/\b(?:19|20)\d{2}\b/g, ' ')) : '';
};
export const labelYear156 = (lines: LocalOCRResult106['lines'] | undefined): string => (lines ?? []).map(line => year(line.text)).find(Boolean) ?? '';
