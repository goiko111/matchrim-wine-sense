import assert from 'node:assert/strict';
import { normalizeDetectedRegions } from '../src/utils/multiWineScan';

let checks = 0;
const bottle = (box: {x: number; y: number; width: number; height: number}, confidence = .9) => ({ object_type: 'bottle', box, confidence });
const upper = bottle({ x: 22.96, y: 10, width: 6.72, height: 57 }, .91);
const lower = bottle({ x: 21, y: 73, width: 8, height: 25 }, .84);
for (const proposals of [[upper, lower], [lower, upper]]) {
  const regions = normalizeDetectedRegions({ regions: proposals });
  assert.equal(regions.length, 2, 'Recorded disjoint explicit bottle proposals must not become one88%-height crop'); checks++;
  assert.equal(Math.max(...regions.map((r) => r.box.height)), 57); checks++;
}

const partials = [
  bottle({ x: 0, y: 8.4, width: 42, height: 47.6 }, .95),
  bottle({ x: 0, y: 44, width: 40, height: 56 }, .94),
  bottle({ x: 0, y: 8, width: 42, height: 92 }, .9),
  bottle({ x: 52, y: 10, width: 48, height: 90 }, .92),
];
for (const order of [partials, [...partials].reverse()]) {
  const regions = normalizeDetectedRegions({ regions: order });
  assert.equal(regions.length, 2, 'Genuinely overlapping tile fragments retain the original full-bottle consolidation'); checks++;
  assert.deepEqual(regions.find((r) => r.box.x === 0)?.box, { x: 0, y: 8, width: 42, height: 92 }); checks++;
}
const labelledBottle = normalizeDetectedRegions({ regions: [
  bottle({ x: 10.3, y: 7.41, width: 77.29, height: 55.45 }),
  { object_type: 'label', box: { x: 12.01, y: 67.22, width: 64.67, height: 26.68 }, confidence: .95 },
] });
assert.equal(labelledBottle.length, 1, 'Explicit detached label fragments keep their established consolidation'); checks++;

const disconnected = normalizeDetectedRegions({ regions: [
  bottle({ x: 20, y: 5, width: 8, height: 25 }, .95),
  bottle({ x: 20, y: 65, width: 8, height: 25 }, .94),
  bottle({ x: 20, y: 5, width: 8, height: 85 }, .9),
] });
assert.ok(disconnected.length >= 2, 'An ambiguous long anchor cannot certify two disjoint explicit bottles as one'); checks++;
console.log(JSON.stringify({ checks, passed: true, scope: 'One recorded geometry failure plus synthetic typed-object invariants; zero vision calls, no physical count/identity accuracy claim' }));
