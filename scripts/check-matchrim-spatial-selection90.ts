import assert from 'node:assert/strict';
import { normalizeDetectedRegions, selectWineRegionsForBatch, MAX_REFINED_WINE_REGIONS } from '../src/utils/multiWineScan';

let checks = 0;
const regions = normalizeDetectedRegions({ regions: Array.from({ length: 80 }, (_, i) => ({
  object_type: 'label', confidence: .7 + (i % 4) * .05,
  box: { x: (i % 20) * 5, y: Math.floor(i / 20) * 25 + 8, width: 3, height: 8 },
})) });
assert.equal(regions.length, 80); checks++;
const before = JSON.stringify(regions);
const batch = selectWineRegionsForBatch(regions);
assert.equal(batch.length, MAX_REFINED_WINE_REGIONS); checks++;
assert.equal(JSON.stringify(regions), before, 'Selection must not mutate detector evidence'); checks++;
assert.equal(new Set(batch.map((r) => JSON.stringify(r.box))).size, 60); checks++;
for (let shelf = 0; shelf < 4; shelf++) {
  assert.equal(batch.filter((r) => Math.floor(r.box.y / 25) === shelf).length, shelf < 3 ? 16 : 12,
    'Every shelf remains represented under the same cap'); checks++;
}
for (let i = 0; i < batch.length; i++) {
  assert.equal(batch[i].id, `region-${i + 1}`); checks++;
  assert.equal(batch[i].index, i + 1); checks++;
  assert.ok(i === 0 || batch[i - 1].box.y < batch[i].box.y
    || (batch[i - 1].box.y === batch[i].box.y && batch[i - 1].box.x <= batch[i].box.x)); checks++;
  const original = regions.find((r) => JSON.stringify(r.box) === JSON.stringify(batch[i].box))!;
  assert.equal(batch[i].detectionConfidence, original.detectionConfidence); checks++;
  assert.equal(batch[i].candidates, original.candidates, 'No candidate identity invented'); checks++;
}
const reversed = selectWineRegionsForBatch([...regions].reverse());
assert.deepEqual(reversed, batch, 'Distinct regions produce deterministic results independent of input ordering'); checks++;
assert.equal(selectWineRegionsForBatch([]).length, 0); checks++;
const small = regions.slice(0, 5);
assert.equal(selectWineRegionsForBatch(small), small, 'Uncapped scenes keep exact established behavior'); checks++;
for (const limit of [0, -1, NaN, Infinity, 1.1, 61]) {
  assert.throws(() => selectWineRegionsForBatch(regions, limit), RangeError); checks++;
}
const one = selectWineRegionsForBatch(regions, 1);
assert.equal(one.length, 1); checks++;
const sparse = [regions[0], regions[20], regions[40], ...regions.slice(60)];
const sparseBatch = selectWineRegionsForBatch(sparse, 8);
for (const original of sparse.slice(0, 3)) {
  assert.ok(sparseBatch.some((r) => JSON.stringify(r.box) === JSON.stringify(original.box)), 'Sparse occupied cells must not be starved by one dense shelf'); checks++;
}
assert.equal(new Set(sparseBatch.map((r) => r.id)).size, 8); checks++;
console.log(JSON.stringify({ checks, passed: true, scope: 'Spatial batch selection, invariant cap, stable reading-order IDs, no new detector/canonical claims' }));
