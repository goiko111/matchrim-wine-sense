import assert from 'node:assert/strict';
import { normalizeBox, normalizeDetectedRegions, summarizeScanRegions } from '../src/utils/multiWineScan';
import { getCropGeometry, labelCropPadding } from '../src/utils/imageCropGeometry';
import { createScanRequestBudget, cropQualityDeferral, MAX_AUTOMATIC_REGION_ANALYSES, planRegionAnalysis, regionPreflight, ScanRequestLimitError } from '../src/utils/scanAnalysisPolicy';
import { invokeWithEdgeFunctionRetry } from '../src/utils/edgeFunctionResilience';

assert.deepEqual(normalizeBox({ x: -5, y: -3, width: 10, height: 8 }), {
  x: 0, y: 0, width: 5, height: 5,
}, 'clip the original rectangle, do not shift it onto a neighbouring label');
assert.equal(normalizeBox({ x: '', y: 0, width: 10, height: 10 }), null);
assert.equal(normalizeBox({ x: -20, y: 0, width: 10, height: 10 }), null);
assert.equal(normalizeBox({ x: Infinity, y: 0, width: 10, height: 10 }), null);
assert.deepEqual(getCropGeometry(1000, 1000, { x: 0, y: 0, width: 10, height: 10 }, 2).pixels,
  { x: 0, y: 0, width: 120, height: 120 });
assert.deepEqual(getCropGeometry(1000, 1000, { x: 90, y: 90, width: 10, height: 10 }, 2).pixels,
  { x: 880, y: 880, width: 120, height: 120 });
assert.throws(() => getCropGeometry(1000, 1000, { x: 105, y: 0, width: 10, height: 10 }));
assert.equal(labelCropPadding({ x: 5, y: 5, width: 4, height: 10 }), .32);
const regions = normalizeDetectedRegions({ regions: Array.from({ length: 30 }, (_, index) => ({
  box: { x: (index % 10) * 10, y: Math.floor(index / 10) * 30, width: 8, height: 20 },
  confidence: .9, quality: { glare: 'low', occlusion: 'low', legibility: 'good' },
})) });
assert.equal(regions.length, 30, 'adjacent bottles and shelves remain distinct');
const plan = planRegionAnalysis(regions, 1800, 2400);
assert.equal(plan.automatic.length, MAX_AUTOMATIC_REGION_ANALYSES);
assert.equal(plan.deferred.length, 18);
assert.equal(summarizeScanRegions(plan.deferred).unrecognized, 0);
assert.equal(summarizeScanRegions(plan.deferred).deferred, 18);
assert.deepEqual(new Set([...plan.automatic, ...plan.deferred].map(r => r.id)), new Set(regions.map(r => r.id)));
assert.equal(regionPreflight(regions[0], 400, 600)?.code, 'resolution');
assert.equal(regionPreflight(regions[0], 400, 600, true)?.code, 'resolution', 'manual retry cannot manufacture pixels');
const poor = { ...regions[0], quality: { ...regions[0].quality, legibility: 'poor' as const } };
assert.equal(regionPreflight(poor, 1800, 2400)?.code, 'legibility');
assert.equal(regionPreflight(poor, 1800, 2400, true), null, 'explicit review may override model-only legibility');
assert.equal(cropQualityDeferral({ brightness: 250, contrast: 2 })?.code, 'exposure');
assert.equal(cropQualityDeferral({ brightness: 100, contrast: 20 }), null);
assert.equal(cropQualityDeferral({ brightness: null, contrast: null }), null, 'unknown pixel metrics are not fabricated');
const duplicates = normalizeDetectedRegions({ regions: [
  { box: { x: 10, y: 10, width: 10, height: 25 } },
  { box: { x: 10.2, y: 10, width: 10, height: 25 } },
  { box: { x: 20, y: 10, width: 10, height: 25 } },
] });
assert.equal(duplicates.length, 2, 'repeated same-box proposal merges, neighbouring label does not');
const controller = new AbortController();
const budget = createScanRequestBudget(2);
budget.reserve(controller.signal);
budget.reserve(controller.signal);
assert.equal(budget.used, 2);
assert.throws(() => budget.reserve(controller.signal), ScanRequestLimitError);
let attempts = 0;
await assert.rejects(invokeWithEdgeFunctionRetry(async () => {
  attempts += 1; budget.reserve(controller.signal);
}, controller.signal, { maxAttempts: 3 }), ScanRequestLimitError);
assert.equal(attempts, 1, 'request budget is not retryable');
controller.abort();
const cancelled = createScanRequestBudget();
assert.throws(() => cancelled.reserve(controller.signal), { name: 'AbortError' });
assert.equal(cancelled.used, 0);
console.log('Dense gate: boundary, crop, policy, deduplication, budget and cancellation regressions passed');
