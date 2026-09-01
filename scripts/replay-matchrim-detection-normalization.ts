import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  intersectionOverUnion,
  normalizeDetectedRegions,
  type NormalizedBox,
} from '../src/utils/multiWineScan';

interface BenchmarkResult {
  fixture: string;
  backend?: { detected_boxes?: NormalizedBox[] };
  ground_truth?: { expected_boxes?: number[][] };
}

interface BenchmarkReport {
  results?: BenchmarkResult[];
}

interface DetectionMetrics {
  scenes: number;
  matched: number;
  actual: number;
  expected: number;
  precision: number;
  recall: number;
}

const round = (value: number) => Math.round(value * 10_000) / 10_000;

const matchBoxes = (expected: NormalizedBox[], actual: NormalizedBox[]) => {
  const pairs = expected.flatMap((expectedBox, expectedIndex) => actual.map((actualBox, actualIndex) => ({
    expectedIndex,
    actualIndex,
    iou: intersectionOverUnion(expectedBox, actualBox),
  }))).filter((pair) => pair.iou >= 0.3).sort((left, right) => right.iou - left.iou);
  const usedExpected = new Set<number>();
  const usedActual = new Set<number>();
  let matched = 0;
  pairs.forEach((pair) => {
    if (usedExpected.has(pair.expectedIndex) || usedActual.has(pair.actualIndex)) return;
    usedExpected.add(pair.expectedIndex);
    usedActual.add(pair.actualIndex);
    matched += 1;
  });
  return matched;
};

const toExpectedBox = (value: number[]): NormalizedBox | null => {
  if (value.length !== 4 || value.some((item) => !Number.isFinite(item))) return null;
  return { x: value[0] * 100, y: value[1] * 100, width: value[2] * 100, height: value[3] * 100 };
};

const calculate = (
  scenes: Array<{ expected: NormalizedBox[]; actual: NormalizedBox[] }>,
): DetectionMetrics => {
  const totals = scenes.reduce((current, scene) => ({
    matched: current.matched + matchBoxes(scene.expected, scene.actual),
    actual: current.actual + scene.actual.length,
    expected: current.expected + scene.expected.length,
  }), { matched: 0, actual: 0, expected: 0 });
  return {
    scenes: scenes.length,
    ...totals,
    precision: totals.actual ? round(totals.matched / totals.actual) : 0,
    recall: totals.expected ? round(totals.matched / totals.expected) : 0,
  };
};

const reportPath = resolve(process.argv[2] ?? 'qa-artifacts/matchrim-independent-v2/e2e-final-25-2026-09-01/ground-truth-e2e-report.json');
const report = JSON.parse(readFileSync(reportPath, 'utf8')) as BenchmarkReport;
const scenes = (report.results ?? []).flatMap((result) => {
  const expected = (result.ground_truth?.expected_boxes ?? []).flatMap((box) => {
    const normalized = toExpectedBox(box);
    return normalized ? [normalized] : [];
  });
  const actual = result.backend?.detected_boxes ?? [];
  return expected.length && actual.length ? [{ fixture: result.fixture, expected, actual }] : [];
});
const before = calculate(scenes);
const normalizedScenes = scenes.map((scene) => ({
  expected: scene.expected,
  actual: normalizeDetectedRegions({ regions: scene.actual.map((box) => ({ box, confidence: 0.5 })) })
    .map((region) => region.box),
}));
const after = calculate(normalizedScenes);

assert.ok(after.recall >= before.recall, 'normalization must not lower replay recall');
assert.ok(after.precision >= before.precision, 'normalization must not lower replay precision');
console.log(JSON.stringify({ report: reportPath, before, after }, null, 2));
