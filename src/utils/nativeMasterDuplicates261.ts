import { getSelectedCandidate, groupDuplicateWines, type ScanRegion, type WineCandidate } from './multiWineScan';
import { nativeMasterLink259 } from './nativeMasterLink259';
import { isSafeCanonicalLabelMatch } from './winerimLabelIdentity';

const normalize = (value: string | null) => (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();
const sameBottleIdentity = (left: WineCandidate, right: WineCandidate) =>
  left.vintage === right.vintage && isSafeCanonicalLabelMatch(left, right) && isSafeCanonicalLabelMatch(right, left)
  && normalize(left.region) === normalize(right.region) && normalize(left.country) === normalize(right.country);

// Preserve an explicitly linked reference over raw OCR confidence, but never
// transfer its binding to another candidate or change any region's review state.
export const nativeDuplicateWineGroups261 = (regions: ScanRegion[]) => groupDuplicateWines(regions).flatMap(group => {
  const members = regions.filter(region => group.regionIds.includes(region.id))
    .flatMap(region => { const candidate = getSelectedCandidate(region); return candidate ? [{ region, candidate }] : []; });
  if (!members.some(member => nativeMasterLink259(member.candidate))) return [group];
  const buckets: typeof members[] = [];
  for (const member of members) {
    const bucket = buckets.find(value => sameBottleIdentity(value[0].candidate, member.candidate));
    if (bucket) bucket.push(member); else buckets.push([member]);
  }
  return buckets.map(bucket => {
    const representative = bucket.find(member => nativeMasterLink259(member.candidate))
      ?? bucket.reduce((best, member) => member.candidate.confidence > best.candidate.confidence ? member : best);
    return { ...group, key: buckets.length > 1 ? `${group.key}|native-ref:${bucket[0].region.id}` : group.key,
      candidate: representative.candidate, count: bucket.length,
      regionIds: [representative.region.id, ...bucket.filter(member => member !== representative).map(member => member.region.id)] };
  });
});
