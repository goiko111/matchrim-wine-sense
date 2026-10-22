import type { NativeVerdicts159 } from './nativeRescanVerdict159';
import type { PublicGlobalRow103 } from './nativeGlobalCatalogue103';
import { readCellarPublicReference107 } from './cellarPublicReference107';
import { isSafeCanonicalLabelMatch } from './winerimLabelIdentity';
import { hasExactWinerimProducer, hasWinerimGeographyConflict } from './winerimOriginalSheet';

// Presentation priority only. A saved public ID never replaces detail verification.
export const nativeSavedCatalogue168 = (ownerId: string | null, snapshot: NativeVerdicts159 | null,
  rows: readonly PublicGlobalRow103[]): ReadonlySet<number> => {
  const known = new Set<number>();
  if (!ownerId || snapshot?.ownerId !== ownerId || snapshot.status !== 'ready') return known;
  for (const saved of snapshot.rows) {
    if (saved.user_id !== ownerId) continue;
    const reference = readCellarPublicReference107(saved);
    if (!reference) continue;
    for (const row of rows) {
      if (row.id !== reference.id || row.slugname !== reference.slug
        || (row.vintage == null ? null : String(row.vintage)) !== reference.catalogue_vintage
        || (row.vintage == null ? null : Number(row.vintage)) !== saved.vintage) continue;
      const name = row.subname && !row.name.toLowerCase().includes(row.subname.toLowerCase()) ? `${row.name} ${row.subname}` : row.name;
      const identity = { name, producer: row.winery, vintage: row.vintage, region: row.region, country: row.country };
      if (isSafeCanonicalLabelMatch(saved, identity) && hasExactWinerimProducer(saved.producer, row.winery)
        && !hasWinerimGeographyConflict(saved, identity)) known.add(row.id);
    }
  }
  return known;
};
