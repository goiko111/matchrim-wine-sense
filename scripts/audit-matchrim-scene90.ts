import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import * as currentDetection from '../src/utils/multiWineScan';
import { buildWineDetectionTiles, getFullWineDetectionTile, mapDetectedRegionFromTile, mergeWineDetectionTileResults,
  normalizeDetectedRegions, type WineDetectionTileResult } from '../src/utils/multiWineScan';
import { applySceneReview90, auditLabelCoverage90, validateSceneAnnotation90 } from './matchrim-scene-evidence90';

const { values } = parseArgs({ options: {
  annotation: { type: 'string' }, review: { type: 'string' }, trace: { type: 'string' },
  'run-results': { type: 'string' }, case: { type: 'string' }, output: { type: 'string' },
  'compare-baseline': { type: 'boolean' },
} });
for (const required of ['annotation', 'trace', 'run-results', 'case', 'output']) assert.ok(values[required], required);
const option = (name: string): string => { assert.equal(typeof values[name], 'string'); return values[name] as string; };
const bytes = readFileSync(option('annotation'));
const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
let scene = validateSceneAnnotation90(JSON.parse(String(bytes)));
if (values.review) scene = applySceneReview90(scene, JSON.parse(readFileSync(option('review'), 'utf8')), sha(bytes));
const run = JSON.parse(readFileSync(option('run-results'), 'utf8'));
const result = run.results.find((row: {case: string}) => row.case === values.case);
assert.equal(result?.source_sha256, scene.fixture.sha256, 'Trace source must match the reviewed pixels');
const trace = JSON.parse(readFileSync(option('trace'), 'utf8')) as Array<{function: string; status: number; request: Record<string, unknown>; payload: unknown}>;
const tiles = [getFullWineDetectionTile(), ...buildWineDetectionTiles(scene.fixture.width, scene.fixture.height)];
const tileResults = trace.filter((row) => row.function.startsWith('detect-wine-regions') && row.status === 200).map((row) => {
  const tile = tiles.find((tile) => tile.id === row.request.detection_tile);
  assert.ok(tile, 'Unknown recorded tile');
  return { tile, payload: row.payload };
}) satisfies WineDetectionTileResult[];
assert.ok(tileResults.length > 0);
const mapped = tileResults.flatMap(({ tile, payload }) => normalizeDetectedRegions(payload).map((region) => mapDetectedRegionFromTile(region, tile)));
const all = normalizeDetectedRegions({ regions: mapped.map((region) => ({ box: region.box, confidence: region.detectionConfidence,
  quality: region.quality, object_type: region.objectType })) });
const merged = mergeWineDetectionTileResults(tileResults);
let baseline: unknown = null;
if (values['compare-baseline']) {
  const source = execFileSync('git', ['show', '8f52291:src/utils/multiWineScan.ts'], { encoding: 'utf8' });
  const exports = {} as typeof currentDetection;
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', compiled)(createRequire(resolve('src/utils/multiWineScan.ts')), exports);
  const oldTiles = trace.filter((row) => row.function.startsWith('detect-wine-regions') && row.status === 200).map((row) => ({
    tile: tiles.find((tile) => tile.id === row.request.detection_tile)!, payload: row.payload,
  }));
  const oldResult = exports.mergeWineDetectionTileResults(oldTiles);
  baseline = { commit: '8f52291', source_sha256: sha(source), after_cap: auditLabelCoverage90(scene, oldResult.regions) };
}
const analyses = trace.filter((row) => row.function.startsWith('analyze-wine-region') && row.status === 200);
const output = { annotation_sha256: sha(bytes), review_sha256: values.review ? sha(readFileSync(values.review)) : null,
  trace_sha256: sha(readFileSync(option('trace'))), source_sha256: scene.fixture.sha256,
  product_source_sha256: sha(readFileSync('src/utils/multiWineScan.ts')), baseline,
  scope: 'Frozen real detector responses and agent-reviewed pixel slots. Not a new model run, calibrated detector accuracy, canonical validation or physical inventory.',
  raw_tile_proposals: mapped.length, normalized_proposals: all.length,
  before_cap: auditLabelCoverage90(scene, all), after_cap: auditLabelCoverage90(scene, merged.regions),
  recorded_analysis_requests: analyses.length, recorded_source_boxes: analyses.map((row) => ({ region: row.request.region_id,
    region_box: row.request.region_box, crop_box: row.request.crop_box })),
  canonical_identity_precision: null, canonical_identity_recall: null,
};
const path = resolve(option('output')); assert.ok(!existsSync(path), 'Preserve earlier evidence');
mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
writeFileSync(path, JSON.stringify(output, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ proposals: all.length, retained: merged.regions.length,
  before_cap_covered: output.before_cap.covered_label_slots, after_cap_covered: output.after_cap.covered_label_slots,
  by_shelf: output.after_cap.coverage_by_shelf, multi_label_proposals: output.after_cap.regions_with_multiple_label_slots.length }));
