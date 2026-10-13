import type { MenuScanWine, MenuManualPriceAssignment } from './wineMenuScan';
import { formatScanPrice, normalizeScanCurrency, normalizeScanPrice } from './scanMoney';

export const isMenuCurrencyAmountValid = (amount: unknown, currency: unknown): boolean => {
  const code = normalizeScanCurrency(currency);
  if (!code || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) return false;
  const digits = new Intl.NumberFormat('es-ES', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits;
  if (digits === 0) return Number.isInteger(amount);
  const scale = 10 ** digits;
  return Math.round(amount * scale) / scale === amount;
};

export const formatMenuPriceAmount = (value: unknown, currency: unknown): string | null => {
  const amount = normalizeScanPrice(value), code = normalizeScanCurrency(currency);
  if (amount !== null && code && !isMenuCurrencyAmountValid(amount, code)) return `${amount} ${code} \u00b7 precisi\u00f3n pendiente`;
  return formatScanPrice(value, currency);
};

export const parseMenuPriceDraft = (value: string, currency?: string | null): { amount: number | null; error: string | null } => {
  const text = value.trim();
  if (!text) return { amount: null, error: 'Indica un importe.' };
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return { amount: null, error: 'Importe no válido. Usa cero o un número positivo con hasta dos decimales.' };
  const amount = Number(text.replace(',', '.'));
  if (!Number.isFinite(amount) || amount > 1_000_000_000) return { amount: null, error: 'Importe fuera de rango.' };
  const code = normalizeScanCurrency(currency);
  if (code && !isMenuCurrencyAmountValid(amount, code)) return { amount: null, error: `${code} requiere un importe entero, sin fracciones.` };
  return { amount, error: null };
};

export const clearMenuManualPriceOrigin = (wine: MenuScanWine): MenuScanWine => {
  const reading = { ...wine };
  delete reading.precio_manual_asignacion;
  delete reading.precio_manual_pendiente;
  delete reading.precio_origen;
  return reading;
};

export const resolveMenuPriceReview = (
  wine: MenuScanWine,
  amount: number,
  format: 'copa' | 'botella',
  currency: string,
): MenuScanWine => {
  const code = normalizeScanCurrency(currency);
  if (!isMenuCurrencyAmountValid(amount, code) || !code
    || (format !== 'copa' && format !== 'botella')) throw new Error('Precio manual incompleto o no válido.');
  const previous = wine.precio_manual_asignacion;
  const original = previous?.original ?? {
    amount: normalizeScanPrice(wine.precio), raw_currency: wine.moneda ?? null,
    currency: normalizeScanCurrency(wine.moneda),
    prices: { copa: normalizeScanPrice(wine.precios?.copa), botella: normalizeScanPrice(wine.precios?.botella), llevar: normalizeScanPrice(wine.precios?.llevar) },
    origin: wine.precio_origen === 'manual' ? 'manual' as const : 'scan' as const,
    inferred: (wine.campos_inferidos ?? []).some((field) => /^(servicio|precio|precios|moneda)$/.test(field)),
  };
  // Currency is not a conversion. Unselected readings in another currency stay only in the original trace.
  const sameCurrency = normalizeScanCurrency(wine.moneda) === code;
  const prices = sameCurrency
    ? { copa: normalizeScanPrice(wine.precios?.copa), botella: normalizeScanPrice(wine.precios?.botella), llevar: normalizeScanPrice(wine.precios?.llevar) }
    : { copa: null, botella: null, llevar: null };
  prices[format] = amount;
  const manualPrices = previous?.currency === code ? { ...previous.prices } : { copa: null, botella: null };
  if (!previous && sameCurrency && wine.precio_origen === 'manual' && !wine.precio_manual_pendiente
    && !wine.campos_inferidos?.includes('servicio') && (wine.servicio === 'copa' || wine.servicio === 'botella')) {
    manualPrices[wine.servicio] = normalizeScanPrice(wine.precio);
  }
  manualPrices[format] = amount;
  const assignment: MenuManualPriceAssignment = { format, amount, currency: code, prices: manualPrices, original };
  return { ...wine, precio: amount, moneda: code, precios: prices, precio_origen: 'manual',
    precio_manual_pendiente: false, precio_manual_asignacion: assignment };
};

export const manualMenuPriceLines = (wine: MenuScanWine): string[] => {
  const manual = wine.precio_manual_asignacion;
  if (!manual) return [];
  return (['copa', 'botella'] as const).flatMap((format) => {
    const value = formatMenuPriceAmount(manual.prices[format], manual.currency);
    return value ? [`Manual \u00b7 ${format === 'copa' ? 'Copa' : 'Botella'}: ${value}`] : [];
  });
};
