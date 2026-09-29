import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  intersectionOverUnion,
  normalizeDetectedRegions,
  type NormalizedBox,
} from '../src/utils/multiWineScan';
import { normalizeFoodScan } from '../supabase/functions/scan-food-pairing/contract';

type Scene = {
  fixture: string;
  mode: string;
  expected_rationale?: string;
  accuracy?: {
    expected_count: number;
    actual_count: number;
    matched_count: number;
  } | null;
  backend?: { detected_boxes?: NormalizedBox[] };
  ground_truth?: { expected_boxes?: number[][] };
};

const reportPath = resolve(process.argv[2]
  || '/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/matchrim-independent-v2/e2e-final-25-2026-09-01/ground-truth-e2e-report.json');
const foodPath = resolve(process.argv[3]
  || 'docs/qa-evidence/matchrim-build64-recognition-2026-09-28/food-menu-real-backend.json');
const outputPath = resolve(process.argv[4]
  || 'docs/qa-evidence/matchrim-integral-qa-2026-09-29/recognition-replay-local.json');

const report = JSON.parse(readFileSync(reportPath, 'utf8')) as { results: Scene[]; summary?: unknown };
const food = JSON.parse(readFileSync(foodPath, 'utf8'));
const round = (value: number) => Math.round(value * 10_000) / 10_000;

const categoryFor = (scene: Scene) => {
  const rationale = scene.expected_rationale || '';
  if (scene.mode === 'carta-vinos') {
    return rationale.startsWith('handwritten_board') ? 'handwritten_board' : 'printed_wine_list';
  }
  if (/^(multi_bottle|two_bottles|single_label_table|dense_wine_shelf)/.test(rationale)) return 'multi_label';
  return 'single_label';
};

const aggregateIdentity = (scenes: Scene[]) => {
  const totals = scenes.reduce((sum, scene) => ({
    scenes: sum.scenes + 1,
    expected: sum.expected + (scene.accuracy?.expected_count || 0),
    actual: sum.actual + (scene.accuracy?.actual_count || 0),
    matched: sum.matched + (scene.accuracy?.matched_count || 0),
  }), { scenes: 0, expected: 0, actual: 0, matched: 0 });
  return {
    ...totals,
    precision: totals.actual ? round(totals.matched / totals.actual) : null,
    recall: totals.expected ? round(totals.matched / totals.expected) : null,
  };
};

const matchBoxes = (expected: NormalizedBox[], actual: NormalizedBox[]) => {
  const pairs = expected.flatMap((expectedBox, expectedIndex) => actual.map((actualBox, actualIndex) => ({
    expectedIndex,
    actualIndex,
    iou: intersectionOverUnion(expectedBox, actualBox),
  }))).filter((pair) => pair.iou >= 0.3).sort((left, right) => right.iou - left.iou);
  const usedExpected = new Set<number>();
  const usedActual = new Set<number>();
  pairs.forEach((pair) => {
    if (usedExpected.has(pair.expectedIndex) || usedActual.has(pair.actualIndex)) return;
    usedExpected.add(pair.expectedIndex);
    usedActual.add(pair.actualIndex);
  });
  return usedExpected.size;
};

const boxScenes = report.results.flatMap((scene) => {
  const expected = (scene.ground_truth?.expected_boxes || []).map((box) => ({
    x: box[0] * 100,
    y: box[1] * 100,
    width: box[2] * 100,
    height: box[3] * 100,
  }));
  const actual = scene.backend?.detected_boxes || [];
  return expected.length && actual.length ? [{ fixture: scene.fixture, expected, actual }] : [];
});

const boxMetrics = (normalize: boolean) => {
  const totals = boxScenes.reduce((sum, scene) => {
    const actual = normalize
      ? normalizeDetectedRegions({ regions: scene.actual.map((box) => ({ box, confidence: 0.5 })) })
        .map((region) => region.box)
      : scene.actual;
    return {
      scenes: sum.scenes + 1,
      expected: sum.expected + scene.expected.length,
      actual: sum.actual + actual.length,
      matched: sum.matched + matchBoxes(scene.expected, actual),
    };
  }, { scenes: 0, expected: 0, actual: 0, matched: 0 });
  return {
    ...totals,
    precision: round(totals.matched / totals.actual),
    recall: round(totals.matched / totals.expected),
  };
};

const categories = Object.fromEntries(
  ['single_label', 'multi_label', 'printed_wine_list', 'handwritten_board'].map((category) => [
    category,
    aggregateIdentity(report.results.filter((scene) => categoryFor(scene) === category && scene.accuracy)),
  ]),
);
const foodNormalized = normalizeFoodScan(food.response?.dishes || [], food.response?.coverage, 'menu');
const beforeBoxes = boxMetrics(false);
const afterBoxes = boxMetrics(true);

assert.ok(afterBoxes.precision >= beforeBoxes.precision);
assert.ok(afterBoxes.recall >= beforeBoxes.recall);
assert.equal(foodNormalized.coverage.split_rows, 1);
assert.equal(foodNormalized.dishes.length, 13);

const result = {
  generatedAt: new Date().toISOString(),
  qualification: {
    backend: 'recorded real independent backend run; no provider call was repeated',
    local: 'current-source deterministic normalization only',
    productionWrite: false,
    certified: false,
  },
  sources: { report: reportPath, food: foodPath },
  identityFromRecordedBackend: categories,
  detectionBoxes: { beforeLocalNormalization: beforeBoxes, afterLocalNormalization: afterBoxes },
  foodMenu: {
    expected: food.expected_count,
    recordedProviderRows: food.actual_count,
    locallySegmentedRows: foodNormalized.dishes.length,
    matchedExpected: food.matched_count,
    precision: food.precision,
    recall: food.recall,
    mergedRowsBefore: food.merged_result_count,
    mergedRowsAfter: 0,
    completenessImprovesOnlyAfterCandidateDeploy: true,
  },
  gate: {
    requiredPrecision: 0.9,
    requiredRecall: 0.9,
    passes: false,
    reason: 'Current recorded identity and food-menu metrics remain below the release threshold; local source is not deployed.',
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
