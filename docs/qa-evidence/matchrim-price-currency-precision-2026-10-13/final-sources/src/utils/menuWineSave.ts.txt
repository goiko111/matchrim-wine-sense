import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';
import type { MenuScanWine } from './wineMenuScan';
import { isMenuIdentityConfirmed } from './wineMenuScan';
import { normalizeScanCurrency, normalizeScanPrice } from './scanMoney';
import { formatMenuPriceAmount as formatScanPrice, isMenuCurrencyAmountValid } from './menuPriceReview';
import { confirmsWineMutation } from './matchrimWineMutation';

const amount = z.number().finite().nonnegative().nullable();
const unitPrices = z.object({ copa: amount, botella: amount, llevar: amount });
const manualAssignmentSchema = z.object({
  format: z.enum(['copa', 'botella']), amount: z.number().finite().nonnegative(), currency: z.string(),
  prices: z.object({ copa: amount, botella: amount }),
  original: z.object({ amount, raw_currency: z.string().nullable(), currency: z.string().nullable(),
    prices: unitPrices, origin: z.enum(['manual', 'scan']), inferred: z.boolean() }),
}).refine((manual) => normalizeScanCurrency(manual.currency) === manual.currency
  && normalizeScanCurrency(manual.original.raw_currency) === manual.original.currency
  && manual.prices[manual.format] === manual.amount && isMenuCurrencyAmountValid(manual.amount, manual.currency)
  && Object.values(manual.prices).every((price) => price === null || isMenuCurrencyAmountValid(price, manual.currency)));
const priceSnapshotSchema = z.object({
  version: z.literal(1),
  raw_amount: amount,
  raw_currency: z.string().nullable(),
  currency: z.string().nullable(),
  service: z.enum(['copa', 'botella', 'ambos']).nullable(),
  prices: unitPrices,
  manual_assignment: manualAssignmentSchema.optional(),
  origin: z.enum(['manual', 'scan']),
  manual_pending: z.boolean(),
  inferred_service: z.boolean(),
  inferred_price: z.boolean(),
  inferred_currency: z.boolean(),
  identity_confirmed: z.boolean(),
  source_text: z.string().nullable(),
}).refine((snapshot) => normalizeScanCurrency(snapshot.raw_currency) === snapshot.currency
  && (!snapshot.manual_assignment || (snapshot.origin === 'manual' && !snapshot.manual_pending
    && snapshot.manual_assignment.currency === snapshot.currency && snapshot.manual_assignment.amount === snapshot.raw_amount
    && (['copa', 'botella'] as const).every((format) => snapshot.manual_assignment!.prices[format] === null
      || snapshot.manual_assignment!.prices[format] === snapshot.prices[format]))));

export type MenuPriceSnapshot = z.infer<typeof priceSnapshotSchema>;

const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown> : null;

const sameJson = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length
    && left.every((value, index) => sameJson(value, right[index]));
  const a = record(left), b = record(right);
  return Boolean(a && b && Object.keys(a).length === Object.keys(b).length
    && Object.keys(a).every((key) => Object.prototype.hasOwnProperty.call(b, key) && sameJson(a[key], b[key])));
};

export const menuPriceSnapshot = (wine: MenuScanWine): MenuPriceSnapshot => ({
  version: 1,
  raw_amount: normalizeScanPrice(wine.precio),
  raw_currency: wine.moneda ?? null,
  currency: normalizeScanCurrency(wine.moneda),
  service: wine.servicio ?? null,
  prices: {
    copa: normalizeScanPrice(wine.precios?.copa),
    botella: normalizeScanPrice(wine.precios?.botella),
    llevar: normalizeScanPrice(wine.precios?.llevar),
  },
  origin: wine.precio_origen === 'manual' ? 'manual' : 'scan',
  manual_pending: wine.precio_manual_pendiente === true,
  inferred_service: wine.campos_inferidos?.includes('servicio') ?? false,
  inferred_price: (wine.campos_inferidos ?? []).some((field) => /^(precio|precios)$/.test(field)),
  inferred_currency: wine.campos_inferidos?.includes('moneda') ?? false,
  identity_confirmed: isMenuIdentityConfirmed(wine),
  source_text: wine.texto_fuente ?? null,
  ...(wine.precio_manual_asignacion ? { manual_assignment: wine.precio_manual_asignacion } : {}),
});

// user_wines.price is a single EUR bottle amount, never a cup price or a purchase claim.
export const menuFinancialPrice = (snapshot: MenuPriceSnapshot): number | null => {
  if (snapshot.service !== 'botella' || snapshot.currency !== 'EUR' || snapshot.manual_pending
    || snapshot.inferred_service || snapshot.inferred_price || snapshot.inferred_currency || !snapshot.identity_confirmed) return null;
  if (snapshot.raw_amount !== null && snapshot.prices.botella !== null && snapshot.raw_amount !== snapshot.prices.botella) return null;
  const value = snapshot.prices.botella ?? snapshot.raw_amount;
  return isMenuCurrencyAmountValid(value, snapshot.currency) ? value : null;
};

export const menuSaveEvidence = (wine: MenuScanWine, sensoryAttributes: Json | null) => {
  const grounded = wine.sensorySource === 'catalog' && Boolean(wine.canonicalId?.trim())
    && isMenuIdentityConfirmed(wine) && Boolean(sensoryAttributes);
  const affinity = grounded && wine.affinity_calibrated === true && typeof wine.compatibilidad === 'number'
    && Number.isFinite(wine.compatibilidad) && wine.compatibilidad >= 0 && wine.compatibilidad <= 100
    ? wine.compatibilidad : null;
  return {
    sensory_attributes: grounded ? sensoryAttributes : null,
    matchrim_affinity: affinity,
    use_for_profile_training: false,
    trace: {
      version: 1,
      canonical_id: grounded ? wine.canonicalId : null,
      sensory_source: grounded ? 'catalog' : 'inference',
      identity_confirmed: isMenuIdentityConfirmed(wine),
      affinity_calibrated: affinity !== null,
    },
  };
};

export const hasStoredMenuCatalogEvidence = (details: unknown): boolean => {
  const trace = record(record(details)?.menu_wine_evidence);
  return trace?.version === 1 && trace.sensory_source === 'catalog' && trace.identity_confirmed === true
    && typeof trace.canonical_id === 'string' && Boolean(trace.canonical_id.trim());
};

export const readMenuPrice = (details: unknown, storedPrice: unknown): {
  price: number | null;
  lines: string[];
  state: 'current' | 'pending' | 'legacy';
} | null => {
  const data = record(details);
  if (data?.source !== 'menu_scanner') return null;
  const parsed = priceSnapshotSchema.safeParse(data.menu_price_snapshot);
  if (!parsed.success) {
    const raw = formatScanPrice(data.scanned_price, data.scanned_currency);
    return { price: null, state: 'legacy', lines: [raw ? `Lectura anterior: ${raw}` : 'Precio no disponible', 'Formato y origen pendientes de confirmar'] };
  }
  const snapshot = parsed.data;
  const expected = menuFinancialPrice(snapshot);
  const inconsistent = storedPrice !== expected;
  const invalidPrecision = Boolean(snapshot.currency) && [snapshot.raw_amount, ...Object.values(snapshot.prices)]
    .some((price) => price !== null && !isMenuCurrencyAmountValid(price, snapshot.currency));
  if (snapshot.manual_assignment) {
    const manual = snapshot.manual_assignment;
    const serviceConflict = (snapshot.service === 'copa' || snapshot.service === 'botella')
      && manual.prices[snapshot.service === 'copa' ? 'botella' : 'copa'] !== null;
    const lines: string[] = [];
    for (const [format, label] of [['copa', 'Copa'], ['botella', 'Botella'], ['llevar', 'Para llevar']] as const) {
      const value = formatScanPrice(snapshot.prices[format], snapshot.currency);
      if (!value) continue;
      const manualValue = format !== 'llevar' && manual.prices[format] !== null;
      lines.push(`${manualValue ? 'Manual' : 'Carta'} \u00b7 ${label}${!manualValue && manual.original.inferred ? ' (sin confirmar)' : ''}: ${value}`);
    }
    for (const [format, label] of [['copa', 'Copa'], ['botella', 'Botella'], ['llevar', 'Para llevar']] as const) {
      const value = formatScanPrice(manual.original.prices[format], manual.original.currency);
      if (value && (manual.original.currency !== snapshot.currency || manual.original.prices[format] !== snapshot.prices[format])) {
        lines.push(`Lectura anterior \u00b7 ${label}${manual.original.inferred ? ' (sin confirmar)' : ''}: ${value}`);
      }
    }
    if (Object.values(manual.original.prices).every((price) => price === null)) {
      const raw = formatScanPrice(manual.original.amount, manual.original.currency);
      if (raw) lines.push(`Lectura anterior \u00b7 Importe sin formato: ${raw}`);
    }
    if (!snapshot.service || snapshot.inferred_service || serviceConflict) lines.push('Disponibilidad por copa o botella pendiente de confirmar');
    if (snapshot.inferred_price || snapshot.inferred_currency) lines.push('Otras lecturas de precio o moneda pendientes de confirmar');
    if (!snapshot.identity_confirmed) lines.push('Identidad del vino pendiente de verificar');
    if (inconsistent) lines.push('Precio guardado incoherente, sin confirmar');
    const pending = snapshot.inferred_service || snapshot.inferred_price || snapshot.inferred_currency
      || !snapshot.identity_confirmed || !snapshot.service || serviceConflict || inconsistent || invalidPrecision;
    return { price: inconsistent ? null : expected, state: pending ? 'pending' : 'current', lines };
  }
  const pending = snapshot.manual_pending || snapshot.inferred_service || snapshot.inferred_price
    || snapshot.inferred_currency || !snapshot.identity_confirmed || !snapshot.currency || !snapshot.service
    || (snapshot.service === 'ambos' && snapshot.raw_amount !== null) || inconsistent || invalidPrecision;
  const lines: string[] = [];
  const raw = formatScanPrice(snapshot.raw_amount, snapshot.currency);
  const singleService = !snapshot.manual_pending && !snapshot.inferred_service
    && (snapshot.service === 'copa' || snapshot.service === 'botella') ? snapshot.service : null;
  const unit = singleService === 'copa' ? 'Copa' : singleService === 'botella' ? 'Botella' : null;
  if (raw) lines.push(`${snapshot.origin === 'manual' ? 'Manual' : 'Carta'}${unit ? ` \u00b7 ${unit}` : ''}: ${raw}`);
  if (snapshot.manual_pending || !snapshot.service) lines.push('Formato pendiente; importe sin asignar');
  else if (snapshot.inferred_service) lines.push('Formato inferido, sin confirmar');
  else if (snapshot.service === 'ambos' && raw) lines.push('Importe general pendiente de asignar a un formato');
  for (const [service, label] of [['copa', 'Copa'], ['botella', 'Botella'], ['llevar', 'Para llevar']] as const) {
    if (service === singleService && raw && snapshot.prices[service] === snapshot.raw_amount) continue;
    const formatted = formatScanPrice(snapshot.prices[service], snapshot.currency);
    const source = snapshot.inferred_service || snapshot.inferred_price || snapshot.inferred_currency
      ? ' (dato inferido)' : snapshot.manual_pending ? ' (lectura de carta)' : '';
    if (formatted) lines.push(`${label}${source}: ${formatted}`);
  }
  if (snapshot.inferred_price || snapshot.inferred_currency) lines.push('Precio o moneda inferidos, sin confirmar');
  if (!snapshot.identity_confirmed) lines.push('Identidad del vino pendiente de verificar');
  if (inconsistent) lines.push('Precio guardado incoherente, sin confirmar');
  if (!lines.length) lines.push('Precio no disponible');
  return { price: inconsistent ? null : expected, state: pending ? 'pending' : 'current', lines };
};

export const confirmsMenuInsert = (data: unknown, payload: {
  user_id: string; name: string; producer: string | null; vintage: number | null;
  status: string; is_favorite: boolean; price: number | null;
  use_for_profile_training: boolean; sensory_attributes: Json | null; matchrim_affinity: number | null;
  place_details: Json;
}): boolean => {
  const row = record(data);
  if (typeof row?.id !== 'string' || !row.id.trim()) return false;
  if (!confirmsWineMutation(row, row.id, {
    user_id: payload.user_id, name: payload.name, producer: payload.producer, vintage: payload.vintage,
    status: payload.status, is_favorite: payload.is_favorite, price: payload.price,
    use_for_profile_training: false, matchrim_affinity: payload.matchrim_affinity,
  })) return false;
  const expected = record(payload.place_details);
  const actual = record(row.place_details);
  const price = priceSnapshotSchema.safeParse(actual?.menu_price_snapshot);
  const wanted = priceSnapshotSchema.safeParse(expected?.menu_price_snapshot);
  return actual?.source === 'menu_scanner' && price.success && wanted.success
    && sameJson(price.data, wanted.data)
    && sameJson(actual.menu_wine_evidence, expected?.menu_wine_evidence)
    && sameJson(row.sensory_attributes, payload.sensory_attributes);
};
