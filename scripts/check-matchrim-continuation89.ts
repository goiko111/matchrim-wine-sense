import assert from 'node:assert/strict';
import { normalizeDetectedRegions, type ScanRegion } from '../src/utils/multiWineScan';
import { deferRegion, MAX_AUTOMATIC_REGION_ANALYSES, planAdditionalRegionAnalysis, planRegionAnalysis } from '../src/utils/scanAnalysisPolicy';

const scene = normalizeDetectedRegions({ regions: Array.from({ length: 30 }, (_, i) => ({
  box: { x: i % 10 * 10, y: Math.floor(i / 10) * 30, width: 8, height: 20 },
  confidence: .9, quality: { legibility: 'good', glare: 'low', occlusion: 'low' },
})) });
const initial = planRegionAnalysis(scene, 2400, 1800);
let regions: ScanRegion[] = [...initial.automatic.map((region) => ({ ...region, status: 'uncertain' as const })), ...initial.deferred];
const submitted = initial.automatic.map((region) => region.id);
for (const expected of [12, 6, 0]) {
  const plan = planAdditionalRegionAnalysis(regions, 2400, 1800);
  assert.equal(plan.automatic.length, expected);
  assert.ok(plan.automatic.length <= MAX_AUTOMATIC_REGION_ANALYSES);
  submitted.push(...plan.automatic.map((region) => region.id));
  const completed = new Set(plan.automatic.map((region) => region.id));
  regions = regions.map((region) => completed.has(region.id) ? { ...region, status: 'unrecognized' } : region);
}
assert.equal(new Set(submitted).size, 30);
assert.equal(submitted.length, 30, 'no completed region is billed again');
const seed = scene[0];
const stopped: ScanRegion[] = [
  { ...seed, id: 'cancelled-active', status: 'pending' },
  deferRegion({ ...seed, id: 'budget' }, { code: 'request_limit', message: 'budget' }),
  ...(['recognized', 'uncertain', 'unrecognized', 'discarded', 'analyzing'] as const)
    .map((status) => ({ ...seed, id: status, status })),
  deferRegion({ ...seed, id: 'quality' }, { code: 'exposure', message: 'exposure' }),
  deferRegion({ ...seed, id: 'tiny' }, { code: 'resolution', message: 'pixels' }),
  deferRegion({ ...seed, id: 'poor' }, { code: 'legibility', message: 'poor' }),
];
assert.deepEqual(new Set(planAdditionalRegionAnalysis(stopped, 2400, 1800).automatic.map((r) => r.id)), new Set(['cancelled-active', 'budget']));
const small = planAdditionalRegionAnalysis([{ ...seed, status: 'pending' }], 100, 100);
assert.equal(small.automatic.length, 0);
assert.equal(small.deferred[0].deferral?.code, 'resolution');
console.log('Continuation89 PASS: all 30 regions across bounded batches; completed/manual/discarded/error/poor crops excluded; cancelled and budget work resumable. Synthetic policy test, not recognition accuracy.');
