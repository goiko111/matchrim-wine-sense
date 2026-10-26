import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';
import type { CellarAffinityWine } from './bodegaAffinity';
import type { WineCandidate } from './multiWineScan';
import { nativeMasterLink259 } from './nativeMasterLink259';

const label = z.string().trim().min(1).max(240);
const year = z.number().int().min(1900).max(2099);
const identity = z.object({ name: label, producer: label.nullable(), vintage: year.nullable(),
  region: label.nullable(), country: label.nullable() }).strict();
const schema = z.object({ version: z.literal(1), namespace: z.literal('mantalak-master'),
  mantalak_wine_id: z.number().int().positive().safe(),
  catalogue_name: label, catalogue_winery: label,
  known_vintages: z.array(z.string().regex(/^(19|20)\d{2}$/)).max(200),
  representative_public_id: z.number().int().positive().safe().nullable(),
  public_url: z.string().max(2048).nullable(), sensory_usable: z.literal(false),
  bottle_identity: identity }).strict().refine(row => {
  if (new Set(row.known_vintages).size !== row.known_vintages.length) return false;
  if (row.public_url === null) return true;
  try {
    const url = new URL(row.public_url), parts = url.pathname.split('/');
    return url.origin === 'https://web.winerim.com' && !url.username && !url.password && !url.search && !url.hash
      && parts.length === 5 && parts[1] === 'matchrim' && parts[2] === 'store'
      && row.representative_public_id !== null && parts[3] === String(row.representative_public_id);
  } catch { return false; }
});
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const binding = (wine: CellarAffinityWine) => ({ name: wine.name, producer: wine.producer ?? null,
  vintage: wine.vintage ?? null, region: wine.region ?? null, country: wine.country ?? null });
const normalize = (value: string | null) => (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();
const signature = (wine: CellarAffinityWine) => JSON.stringify(Object.values(binding(wine))
  .map(value => typeof value === 'number' ? value : normalize(typeof value === 'string' ? value : null)));

// Durable reference only: this is never a sensory-evidence/learning record.
export const makeCellarMasterReference260 = (candidate: WineCandidate): Json | null => {
  const link = nativeMasterLink259(candidate);
  if (!link) return null;
  const parsed = schema.safeParse({ version: 1, namespace: 'mantalak-master', mantalak_wine_id: link.wine.mantalakWineId,
    catalogue_name: link.wine.name, catalogue_winery: link.wine.winery,
    known_vintages: link.wine.vintages, representative_public_id: link.wine.representativePublicId,
    public_url: link.wine.webUrl, sensory_usable: false, bottle_identity: binding(candidate) });
  return parsed.success ? parsed.data : null;
};
export const readCellarMasterReference260 = (wine: CellarAffinityWine) => {
  const parsed = schema.safeParse(record(wine.place_details)?.winerim_master_reference260);
  return parsed.success && signature(parsed.data.bottle_identity as CellarAffinityWine) === signature(wine) ? parsed.data : null;
};
export const confirmsCellarMasterReference260 = (data: unknown, expected: CellarAffinityWine) => {
  const details = record(expected.place_details);
  if (!Object.prototype.hasOwnProperty.call(details ?? {}, 'winerim_master_reference260')) return true;
  const wanted = readCellarMasterReference260(expected);
  const row = record(data), parsed = identity.safeParse({ name: row?.name, producer: row?.producer ?? null,
    vintage: row?.vintage ?? null, region: row?.region ?? null, country: row?.country ?? null });
  const actual = parsed.success ? readCellarMasterReference260({ ...parsed.data as CellarAffinityWine, place_details: row?.place_details }) : null;
  return Boolean(wanted && actual && JSON.stringify(wanted) === JSON.stringify(actual));
};
