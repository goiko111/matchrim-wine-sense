import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const comparisonTargetMarker96 = '\n/* Native comparison checkbox: compact indicator, full accessible touch target. */';
const hash = (source: string) => createHash('sha256').update(source).digest('hex');
export const comparisonTargetScope96 = {
  test: 'scripts/check-matchrim-comparison-target96.ts',
  testHash: 'd9966bb7b785965a88fe810fef108cf859ed32361fc7833bf3f793e1effc2230',
  currentCssHash: 'df8e06271d366f768cf7315368dad91e536eb248ab374b466d4a35d12e8d5ebb',
  priorCssHash: '7bcbb68daff30c8b475e606d9f67d8f593617ef4456e73a72e57a9b4f3c3c50c',
  blockHash: '5c472eed4027cb6bcbbef95508ea979f1b0d0674ff31637c09d122175e8c4e3c',
  rules: 4, rejectedMutations: 6,
};
export function restoreComparisonTarget96(css: string): string {
  assert.equal(css.split(comparisonTargetMarker96).length, 2);
  const start = css.indexOf(comparisonTargetMarker96);
  assert.equal(hash(css.slice(start)), comparisonTargetScope96.blockHash, 'Only the exact four comparison rules');
  const prior = css.slice(0, start);
  assert.equal(hash(prior), comparisonTargetScope96.priorCssHash, 'Whole06d stylesheet outside this append stays identical');
  return prior;
}
export function assertScanHubComparisonBridge96(source: string) {
  const previous = execFileSync('git', ['show', '983146c6d87a49bfa58aa503a166e0dc4e972ec1:scripts/check-matchrim-scan-hub96.ts'], { encoding: 'utf8' });
  const imported = "import { comparisonTargetMarker96, restoreComparisonTarget96 } from './matchrim-comparison-target96-scope';\n";
  const inverse = '  if (css.includes(comparisonTargetMarker96)) css = restoreComparisonTarget96(css);\n';
  assert.equal(source.split(imported).length, 2); assert.equal(source.split(inverse).length, 2);
  assert.equal(source.replace(imported, '').replace(inverse, ''), previous,
    'All five old scan-hub groups and four negative controls remain byte exact');
}
export function assertLayoutComparisonBridge96(source: string) {
  const previous = execFileSync('git', ['show', '983146c6d87a49bfa58aa503a166e0dc4e972ec1:scripts/check-matchrim-consumer95-native-layout.ts'], { encoding: 'utf8' });
  const added = `  const scanHubSource = readFileSync(scanHub96.test, 'utf8');
  assertScanHubComparisonBridge96(scanHubSource);
  const oldScanHub = execFileSync('git', ['show', \`983146c6d87a49bfa58aa503a166e0dc4e972ec1:\${scanHub96.test}\`], { encoding: 'utf8' });
  assert.equal(hash(oldScanHub), scanHub96.testHash);
  const fullCss = readFileSync('src/index.css', 'utf8');
  assert.equal(hash(fullCss), comparisonTargetScope96.currentCssHash);
  assert.equal(hash(readFileSync(comparisonTargetScope96.test, 'utf8')), comparisonTargetScope96.testHash);
  const comparisonOutput = execFileSync(process.execPath, ['--import', 'tsx', comparisonTargetScope96.test], { encoding: 'utf8' });
  assert.equal(comparisonOutput.trim(), 'Comparison target96: CSS scope/inverse, 44px target, 20px indicator and six directed negatives PASS. Not UIKit geometry proof.');
  const actualCss = restoreComparisonTarget96(fullCss);`;
  const original = `  assert.equal(hash(readFileSync(scanHub96.test, 'utf8')), scanHub96.testHash);
  const actualCss = readFileSync('src/index.css', 'utf8');`;
  for (const [from, to] of [
    ["import { assertScanHubComparisonBridge96, comparisonTargetScope96, restoreComparisonTarget96 } from './matchrim-comparison-target96-scope';\n", ''],
    [added, original],
    ['    nativeComparisonTarget96: comparisonTargetScope96,\n', ''],
  ]) {
    assert.equal(source.split(from).length, 2, 'One exact comparison-only guard amendment');
    source = source.replace(from, to);
  }
  assert.equal(source, previous, 'All fifteen old layout groups and nested oracles remain byte exact after the declared bridge');
}
