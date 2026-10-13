import assert from 'node:assert/strict';
import { clusterScreenOverlayPins } from '../src/utils/screenOverlayPins';
const cases = [
  { width: 206, height: 267, targetSize: 44 },
  { width: 329, height: 428, targetSize: 88 },
  { width: 329, height: 428, targetSize: 44 },
  { width: 987, height: 1284, targetSize: 44 },
];
// Mathematical layout points only; not new wine identities, scenes or a corpus.
const points = Array.from({ length: 60 }, (_, i) => ({ key: `synthetic-${i}`, order: i, x: (i * 19) % 100, y: (i * 13) % 100, value: { index: i } }));
const original = JSON.stringify(points);
for (const viewport of cases) {
  const clusters = clusterScreenOverlayPins(points, viewport);
  assert.equal(JSON.stringify(points), original, 'Display grouping cannot mutate original geometry or values');
  assert.deepEqual(clusters.flatMap(c => c.items.map(p => p.key)).sort(), points.map(p => p.key).sort());
  assert.equal(new Set(clusters.flatMap(c => c.items.map(p => p.key))).size, points.length);
  for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) {
    const dx = Math.abs(clusters[i].x - clusters[j].x) / 100 * viewport.width;
    const dy = Math.abs(clusters[i].y - clusters[j].y) / 100 * viewport.height;
    assert.ok(dx >= viewport.targetSize || dy >= viewport.targetSize);
  }
}
console.log(JSON.stringify({ scope: 'Synthetic mathematical hit-target grouping, no recognition evidence', layouts: cases.length, points: points.length }));
