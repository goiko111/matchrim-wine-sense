import assert from 'node:assert/strict';

export type LabelBox90 = { x: number; y: number; width: number; height: number };
export type LabelSlot90 = {
  id: string; shelf: string; label_box_px: LabelBox90; literal_lines: string[];
  readability: 'reference' | 'partial' | 'unreadable'; canonical: null;
};
export type SceneAnnotation90 = {
  schema_version: 1; status: 'agent_pixel_review_not_human_validated';
  fixture: { id: string; file_name: string; sha256: string; width: number; height: number };
  coordinate_space: 'original_pixels_label_not_bottle'; scope: string; slots: LabelSlot90[];
};
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const positiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const readability = new Set(['reference', 'partial', 'unreadable']);
function ensure(condition: unknown, message = 'Invalid scene evidence'): asserts condition {
  assert.ok(condition, message);
}
const literalLines = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 20
  && value.every((line) => typeof line === 'string' && line.trim().length > 0 && line.length <= 200);

export const validateSceneAnnotation90 = (value: unknown): SceneAnnotation90 => {
  ensure(record(value) && value.schema_version === 1 && value.status === 'agent_pixel_review_not_human_validated');
  assert.equal(value.coordinate_space, 'original_pixels_label_not_bottle');
  ensure(typeof value.scope === 'string' && value.scope.trim());
  ensure(record(value.fixture));
  const fixture = value.fixture;
  ensure(typeof fixture.id === 'string' && fixture.id && typeof fixture.file_name === 'string' && fixture.file_name);
  ensure(typeof fixture.sha256 === 'string' && /^[a-f0-9]{64}$/.test(fixture.sha256));
  ensure(positiveInteger(fixture.width) && positiveInteger(fixture.height) && fixture.width <= 20000 && fixture.height <= 20000);
  ensure(Array.isArray(value.slots) && value.slots.length > 0 && value.slots.length <= 500);
  const ids = new Set<string>(), bounds = new Set<string>();
  for (const slot of value.slots) {
    ensure(record(slot) && typeof slot.id === 'string' && /^[a-z][a-z0-9-]{1,79}$/.test(slot.id) && !/^region-\d+$/.test(slot.id), 'Slots must not inherit detector region IDs');
    ensure(!ids.has(slot.id), 'Repeated slot'); ids.add(slot.id);
    ensure(typeof slot.shelf === 'string' && slot.shelf && slot.shelf.length <= 40);
    ensure(readability.has(String(slot.readability)) && literalLines(slot.literal_lines));
    assert.equal(slot.canonical, null, 'Pixel transcription must not manufacture canonical validation');
    ensure(record(slot.label_box_px));
    const box = slot.label_box_px;
    ensure([box.x, box.y, box.width, box.height].every((n) => typeof n === 'number' && Number.isSafeInteger(n)));
    ensure(Number(box.x) >= 0 && Number(box.y) >= 0 && Number(box.width) > 0 && Number(box.height) > 0);
    ensure(Number(box.x) + Number(box.width) <= fixture.width && Number(box.y) + Number(box.height) <= fixture.height);
    const key = JSON.stringify([box.x, box.y, box.width, box.height]);
    ensure(!bounds.has(key), 'The same label bounds cannot define two independent slots'); bounds.add(key);
  }
  return structuredClone(value) as SceneAnnotation90;
};

export const applySceneReview90 = (annotation: SceneAnnotation90, review: unknown, baseSha256: string): SceneAnnotation90 => {
  ensure(record(review) && review.schema_version === 1 && review.base_sha256 === baseSha256, 'Review must bind the exact earlier annotation');
  assert.equal(review.review_kind, 'same_agent_pixel_magnification_not_independent');
  assert.equal(review.canonical_validation, false);
  assert.equal(review.reviewed_slot_count, annotation.slots.length);
  ensure(Array.isArray(review.corrections) && review.corrections.length <= annotation.slots.length);
  const result = structuredClone(annotation), seen = new Set<string>();
  for (const correction of review.corrections) {
    ensure(record(correction) && typeof correction.id === 'string' && !seen.has(correction.id));
    const target = result.slots.find((slot) => slot.id === correction.id);
    ensure(target, 'Review references an unknown slot'); seen.add(correction.id);
    ensure(Object.keys(correction).every((key) => ['id', 'literal_lines', 'readability', 'reason'].includes(key)), 'Review cannot change geometry, source or canonical identity');
    ensure(literalLines(correction.literal_lines) && readability.has(String(correction.readability)));
    ensure(typeof correction.reason === 'string' && correction.reason.trim());
    target.literal_lines = correction.literal_lines;
    target.readability = correction.readability as LabelSlot90['readability'];
  }
  return validateSceneAnnotation90(result);
};

export const labelPercentBox90 = (slot: LabelSlot90, scene: SceneAnnotation90): LabelBox90 => ({
  x: slot.label_box_px.x / scene.fixture.width * 100, y: slot.label_box_px.y / scene.fixture.height * 100,
  width: slot.label_box_px.width / scene.fixture.width * 100, height: slot.label_box_px.height / scene.fixture.height * 100,
});

export const labelCoverage90 = (label: LabelBox90, region: LabelBox90) => {
  const intersection = Math.max(0, Math.min(label.x + label.width, region.x + region.width) - Math.max(label.x, region.x))
    * Math.max(0, Math.min(label.y + label.height, region.y + region.height) - Math.max(label.y, region.y));
  return intersection / (label.width * label.height);
};

export const auditLabelCoverage90 = (scene: SceneAnnotation90, regions: Array<{id: string; box: LabelBox90}>, minimum = 0.7) => {
  validateSceneAnnotation90(scene);
  ensure(Number.isFinite(minimum) && minimum > 0 && minimum <= 1);
  assert.equal(new Set(regions.map((region) => region.id)).size, regions.length);
  for (const region of regions) {
    ensure(typeof region.id === 'string' && region.id.trim() && region.id.length <= 80);
    ensure(Object.values(region.box).every((n) => typeof n === 'number' && Number.isFinite(n)));
    ensure(region.box.width > 0 && region.box.height > 0 && region.box.x >= 0 && region.box.y >= 0
      && region.box.x + region.box.width <= 100.000001 && region.box.y + region.box.height <= 100.000001);
  }
  const slots = scene.slots.map((slot) => {
    const label = labelPercentBox90(slot, scene);
    const coveredBy = regions.flatMap((region) => {
      const fraction = labelCoverage90(label, region.box);
      return fraction + 1e-9 >= minimum ? [{ id: region.id, label_fraction: fraction }] : [];
    });
    return { slot: slot.id, shelf: slot.shelf, readability: slot.readability, literal_lines: slot.literal_lines,
      label_box_pct: label, covered_by: coveredBy, covered: coveredBy.length > 0 };
  });
  const regionsWithMultipleLabels = regions.flatMap((region) => {
    const labels = slots.filter((slot) => slot.covered_by.some((item) => item.id === region.id)).map((slot) => slot.slot);
    return labels.length > 1 ? [{ region: region.id, box: region.box, labels,
      shelves: [...new Set(slots.filter((slot) => labels.includes(slot.slot)).map((slot) => slot.shelf))] }] : [];
  });
  return { status: 'agent_label_slot_geometry_only', threshold: minimum, proposed_regions: regions.length,
    reviewed_label_slots: slots.length, covered_label_slots: slots.filter((slot) => slot.covered).length,
    coverage_by_shelf: [...new Set(slots.map((slot) => slot.shelf))].map((shelf) => ({ shelf,
      reviewed: slots.filter((slot) => slot.shelf === shelf).length, covered: slots.filter((slot) => slot.shelf === shelf && slot.covered).length })),
    regions_with_multiple_label_slots: regionsWithMultipleLabels,
    uncovered_slots: slots.filter((slot) => !slot.covered).map((slot) => slot.slot), slots,
    physical_bottle_count: null, independent_human_validated: false,
    canonical_identity_precision: null, canonical_identity_recall: null,
  };
};
