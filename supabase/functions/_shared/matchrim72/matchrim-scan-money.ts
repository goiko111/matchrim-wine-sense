import { optionalScanNumber } from './matchrim-scan-values.ts';

const currencies = new Set(['EUR', 'GBP', 'USD', 'CAD', 'AUD', 'NZD', 'CHF', 'JPY', 'CNY', 'SEK', 'NOK', 'DKK']);

export const normalizeScanCurrency = (value: unknown): string | null => {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return currencies.has(code) ? code : null;
};

export const resolveScanCurrency = (value: unknown, source: unknown, documentCurrency?: unknown): string | null => {
  const text = typeof source === 'string' ? source : '';
  const visible = new Set<string>();
  if (text.includes('\u00a3') || /\bGBP\b/i.test(text)) visible.add('GBP');
  if (text.includes('\u20ac') || /\bEUR\b/i.test(text)) visible.add('EUR');
  for (const code of currencies) if (new RegExp(`\\b${code}\\b`, 'i').test(text)) visible.add(code);
  const explicit = normalizeScanCurrency(value);
  if (visible.size > 1 || (explicit && visible.size === 1 && !visible.has(explicit))) return null;
  return visible.size === 1 ? [...visible][0] : explicit ?? normalizeScanCurrency(documentCurrency);
};

export const normalizeScanPrice = (value: unknown): number | null => {
  const price = optionalScanNumber(value);
  return price !== null && price >= 0 ? price : null;
};
