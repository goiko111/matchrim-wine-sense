import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';
import type { CellarAffinityWine } from './bodegaAffinity';
import { isGlobalWine103, type GlobalWine103 } from './nativeGlobalCatalogue103';

const value = z.string().trim().min(1).max(240);
const year = z.number().int().min(1900).max(2099).nullable();
const identity = z.object({ name: value, producer: value.nullable(), vintage: year,
  region: value.nullable(), country: value.nullable() }).strict();
const schema = z.object({ version: z.literal(1), namespace: z.literal('winerim-public-store'),
  id: z.number().int().positive().safe(), slug: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,239}$/i),
  catalogue_vintage: z.string().regex(/^(19|20)\d{2}$/).nullable(),
  bottle_identity: identity }).strict();
const normalize = (text?: string | null) => (text || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const binding = (wine: CellarAffinityWine) => ({ name: wine.name, producer: wine.producer ?? null,
  vintage: wine.vintage ?? null, region: wine.region ?? null, country: wine.country ?? null });
const signature = (wine: CellarAffinityWine) => JSON.stringify([normalize(wine.name), normalize(wine.producer),
  wine.vintage ?? null, normalize(wine.region), normalize(wine.country)]);
const record = (input: unknown): Record<string, unknown> | null =>
  input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : null;

// This records a public reference, never vintage-specific tasting evidence.
export const makeCellarPublicReference107 = (wine: CellarAffinityWine, global: GlobalWine103): Json | null => {
  if (!isGlobalWine103(wine, global)) return null;
  const parsed = schema.safeParse({ version: 1, namespace: global.namespace, id: global.id,
    slug: global.slug, catalogue_vintage: global.vintage, bottle_identity: binding(wine) });
  return parsed.success ? parsed.data : null;
};

export const readCellarPublicReference107 = (wine: CellarAffinityWine) => {
  const parsed = schema.safeParse(record(wine.place_details)?.winerim_public_catalogue);
  if (!parsed.success || signature(parsed.data.bottle_identity as CellarAffinityWine) !== signature(wine)
    || (parsed.data.catalogue_vintage !== null && parsed.data.catalogue_vintage !== String(wine.vintage ?? ''))) return null;
  const data = parsed.data;
  return { ...data, url: `https://web.winerim.com/matchrim/store/${data.id}/${data.slug}` };
};

export const confirmsCellarPublicReference107 = (data: unknown, expected: CellarAffinityWine) => {
  const expectedDetails = record(expected.place_details);
  if (!Object.prototype.hasOwnProperty.call(expectedDetails || {}, 'winerim_public_catalogue')) return true;
  const row = record(data), parsed = identity.safeParse({ name: row?.name, producer: row?.producer ?? null,
    vintage: row?.vintage ?? null, region: row?.region ?? null, country: row?.country ?? null });
  if (!parsed.success) return false;
  const actual = readCellarPublicReference107({ ...parsed.data as CellarAffinityWine, place_details: row?.place_details });
  const wanted = readCellarPublicReference107(expected);
  return Boolean(actual && wanted && JSON.stringify(actual) === JSON.stringify(wanted));
};
