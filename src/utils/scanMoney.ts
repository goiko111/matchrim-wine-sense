import { normalizeScanCurrency, normalizeScanPrice } from '../../supabase/functions/_shared/matchrim-scan-money';

export { normalizeScanCurrency, normalizeScanPrice, resolveScanCurrency } from '../../supabase/functions/_shared/matchrim-scan-money';

export const formatScanPrice = (value: unknown, currency: unknown): string | null => {
  const price = normalizeScanPrice(value);
  if (price === null) return null;
  const code = normalizeScanCurrency(currency);
  return code
    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: code }).format(price)
    : `${price.toFixed(2)} \u00b7 moneda pendiente`;
};

export const singlePriceCurrency = (wines: Array<{ price?: number | null; currency?: string | null }>): string | null => {
  const codes = new Set(wines.filter((wine) => normalizeScanPrice(wine.price) !== null)
    .map((wine) => normalizeScanCurrency(wine.currency)).filter((code): code is string => Boolean(code)));
  return codes.size === 1 ? [...codes][0] : null;
};
