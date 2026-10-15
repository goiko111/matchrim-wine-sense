import assert from 'node:assert/strict';
import { applySceneReview90, auditLabelCoverage90, labelCoverage90, validateSceneAnnotation90 } from './matchrim-scene-evidence90';

let checks = 0;
const make = () => ({ schema_version: 1, status: 'agent_pixel_review_not_human_validated',
  fixture: { id: 'synthetic', file_name: 'synthetic.jpg', sha256: 'a'.repeat(64), width: 1000, height: 1000 },
  coordinate_space: 'original_pixels_label_not_bottle', scope: 'Two explicit synthetic label slots, not a physical inventory.',
  slots: [
    { id: 'top-left', shelf: 'top', label_box_px: { x: 100, y: 100, width: 100, height: 50 }, literal_lines: ['Synthetic literal'], readability: 'partial', canonical: null },
    { id: 'bottom-left', shelf: 'bottom', label_box_px: { x: 100, y: 800, width: 100, height: 50 }, literal_lines: [], readability: 'unreadable', canonical: null },
  ],
});
const original = make(), scene = validateSceneAnnotation90(original);
scene.slots[0].literal_lines.push('Extra');
assert.equal(original.slots[0].literal_lines.length, 1); checks++;
const bad = [null, [], {}, { ...make(), status: 'human_validated' }, { ...make(), coordinate_space: 'detector_crop' },
  { ...make(), fixture: { ...make().fixture, width: true } },
  { ...make(), fixture: { ...make().fixture, height: 0 } },
  { ...make(), fixture: { ...make().fixture, sha256: 'source-url' } },
  { ...make(), slots: [] },
  { ...make(), slots: [make().slots[0], make().slots[0]] },
  { ...make(), slots: [{ ...make().slots[0], id: 'region-1' }] },
  { ...make(), slots: [{ ...make().slots[0], canonical: 'Invented wine' }] },
  { ...make(), slots: [{ ...make().slots[0], literal_lines: [17] }] },
  { ...make(), slots: [{ ...make().slots[0], label_box_px: { x: 980, y: 100, width: 100, height: 50 } }] },
  { ...make(), slots: [{ ...make().slots[0], label_box_px: { x: 1.1, y: 100, width: 100, height: 50 } }] },
  { ...make(), slots: [{ ...make().slots[0], readability: 'certain' }] },
];
for (const value of bad) { assert.throws(() => validateSceneAnnotation90(value)); checks++; }
const review = { schema_version: 1, base_sha256: 'b'.repeat(64), review_kind: 'same_agent_pixel_magnification_not_independent',
  reviewed_slot_count: 2, canonical_validation: false, corrections: [{ id: 'top-left', literal_lines: ['Corrected fragment'], readability: 'partial', reason: 'Explicit source review' }] };
const corrected = applySceneReview90(validateSceneAnnotation90(make()), review, 'b'.repeat(64));
assert.deepEqual(corrected.slots[0].literal_lines, ['Corrected fragment']); checks++;
assert.deepEqual(make().slots[0].literal_lines, ['Synthetic literal']); checks++;
for (const change of [
  { ...review, base_sha256: 'c'.repeat(64) }, { ...review, canonical_validation: true },
  { ...review, reviewed_slot_count: 1 }, { ...review, corrections: [review.corrections[0], review.corrections[0]] },
  { ...review, corrections: [{ ...review.corrections[0], id: 'not-a-slot' }] },
  { ...review, corrections: [{ ...review.corrections[0], canonical: 'Invented' }] },
  { ...review, corrections: [{ ...review.corrections[0], label_box_px: {x: 0, y: 0, width: 100, height: 100} }] },
]) { assert.throws(() => applySceneReview90(corrected, change, 'b'.repeat(64))); checks++; }
const empty = auditLabelCoverage90(corrected, []);
assert.equal(empty.covered_label_slots, 0); checks++;
assert.equal(empty.canonical_identity_precision, null); checks++;
assert.equal(empty.physical_bottle_count, null); checks++;
const crossed = auditLabelCoverage90(corrected, [{ id: 'ambiguous-strip', box: { x: 10, y: 10, width: 10, height: 75 } }]);
assert.equal(crossed.covered_label_slots, 2); checks++;
assert.equal(crossed.regions_with_multiple_label_slots.length, 1); checks++;
assert.deepEqual(crossed.regions_with_multiple_label_slots[0].shelves, ['top', 'bottom']); checks++;
assert.equal(crossed.canonical_identity_recall, null); checks++;
assert.equal(crossed.independent_human_validated, false); checks++;
assert.equal(labelCoverage90({ x: 10, y: 10, width: 10, height: 10 }, { x: 10, y: 10, width: 5, height: 10 }), .5); checks++;
for (const region of [
  { id: '', box: { x: 0, y: 0, width: 1, height: 1 } },
  { id: 'bad', box: { x: 99, y: 0, width: 2, height: 1 } },
  { id: 'bad', box: { x: -1, y: 0, width: 1, height: 1 } },
]) { assert.throws(() => auditLabelCoverage90(corrected, [region])); checks++; }
assert.throws(() => auditLabelCoverage90(corrected, [{id: 'same', box: {x: 1, y: 1, width: 2, height: 2}}, {id: 'same', box: {x: 3, y: 3, width: 2, height: 2}}])); checks++;
assert.throws(() => auditLabelCoverage90(corrected, [], 0)); checks++;
console.log(JSON.stringify({ checks, passed: true, scope: 'Synthetic provenance/geometry refusal contracts; no pixels, remote reads or identity quality claim' }));
