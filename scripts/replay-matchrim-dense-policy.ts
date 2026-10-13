import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildWineDetectionTiles, getFullWineDetectionTile, mergeWineDetectionTileResults } from '../src/utils/multiWineScan';
import { planRegionAnalysis } from '../src/utils/scanAnalysisPolicy';

const fixture = JSON.parse(readFileSync('qa/fixtures/dense-scan-oct8.json', 'utf8'));
const results = fixture.cases.map((scene) => {
  const tiles = [getFullWineDetectionTile(), ...buildWineDetectionTiles(scene.prepared_width, scene.prepared_height)];
  const detections = scene.calls.filter(c => c.function === 'detect-wine-regions').map(c => ({
    tile: tiles.find(t => t.id === c.request_payload.detection_tile)!, payload: c.payload,
  }));
  const merged = mergeWineDetectionTileResults(detections);
  const plan = planRegionAnalysis(merged.regions, scene.prepared_width, scene.prepared_height);
  assert.equal(plan.automatic.length + plan.deferred.length, merged.regions.length);
  assert.ok(plan.automatic.length <= 12);
  const reasons = Object.fromEntries(['resolution', 'legibility', 'automatic_limit'].map(code => [
    code, plan.deferred.filter(r => r.deferral?.code === code).length,
  ]));
  return {
    scene: scene.id, trace_sha256: scene.trace_sha256, detected_regions: merged.regions.length,
    recorded_region_requests: scene.calls.filter(c => c.function === 'analyze-wine-region').length,
    proposed_automatic_regions: plan.automatic.length, deferred: plan.deferred.length, reasons,
    physical_bottle_count: null, new_recognition_accuracy: null,
    interpretation: 'Policy-only replay. Pixel contrast gate and actual Edge request limit are tested in mobile browser separately. No new model calls.',
  };
});
console.log(JSON.stringify({ fixture_scope: fixture.scope, results }, null, 2));
