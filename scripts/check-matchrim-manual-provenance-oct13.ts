import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { confirmWineCandidateIdentity, correctWineCandidateIdentity, normalizeWineCandidates, type ScanRegion } from '../src/utils/multiWineScan';
import { formatScanRegionProgress, summarizeScanRegionProgress } from '../src/utils/scanRegionProgress';
import { buildAiRimContextGuidance } from '../src/utils/aiRimContextGuide';
import { buildDetailedAffinityExplanation } from '../src/utils/wineAffinityExplanation';
import { buildWineComparisonDecision, type ComparableWine, type WineComparisonContext } from '../src/utils/wineComparison';

const output = process.argv[2];
if (!output) throw Error('Pass local manual-provenance contract output');
const baseline = '6d9fcad4cf6aa4a936b6c50e056296e0c7b80bf1';
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => unknown) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
const fixture = JSON.parse(readFileSync('docs/qa-evidence/matchrim-region-failure-2026-10-13/failure-before/scan-response-payloads.json', 'utf8'));
const original = normalizeWineCandidates(fixture.analyze['region-2'], 'qa-region')[0];
check('Actual candidate confirmation only adds manual identity source to old implementation', () => {
  const path = 'src/utils/multiWineScan.ts', before = execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' });
  const anchor = 'export const confirmWineCandidateIdentity = (candidate: WineCandidate): WineCandidate => ({\n  ...candidate,\n  confidence: 1,';
  assert.equal(before.split(anchor).length, 2);
  assert.equal(readFileSync(path, 'utf8'), before.replace(anchor, anchor + "\n  source: 'manual',"));
});
check('Backend source manual does not forge local human identity review', () => {
  const payload = { candidates: [{ ...fixture.analyze['region-2'].candidates[0], source: 'manual' }] };
  assert.equal(normalizeWineCandidates(payload, 'qa-region')[0].source, 'label');
});
check('Confirmation keeps prior sensory/affinity/canonical data, marks human source', () => {
  const candidate = confirmWineCandidateIdentity(original);
  assert.equal(candidate.source, 'manual'); assert.equal(candidate.confidence, 1);
  assert.equal(candidate.sensoryAttributes, original.sensoryAttributes); assert.equal(candidate.affinity, original.affinity);
  assert.equal(candidate.canonicalId, original.canonicalId);
  assert.deepEqual(candidate.uncertaintyReasons, []); assert.ok(candidate.evidence.includes('Identidad confirmada manualmente por el usuario'));
});
check('Correction remains manual, loses unsupported sensory/affinity/canonical evidence', () => {
  const candidate = correctWineCandidateIdentity(original, { name: 'Synthetic corrected reference' });
  assert.equal(candidate.source, 'manual'); assert.equal(candidate.affinity, null); assert.equal(candidate.sensoryAttributes, null); assert.equal(candidate.canonicalId, null);
});
const candidate = confirmWineCandidateIdentity(original);
type ProgressInput = Pick<ScanRegion, 'status' | 'error'> & Partial<Pick<ScanRegion, 'candidates' | 'selectedCandidateId'>>;
for (const status of ['recognized', 'uncertain', 'unrecognized', 'pending', 'analyzing', 'deferred', 'discarded'] as const) for (const error of [null, 'Old request error']) check('Manual progress partition ' + status + ' error=' + Boolean(error), () => {
  const region: ProgressInput = { status, error, candidates: [candidate], selectedCandidateId: candidate.id };
  const counts = summarizeScanRegionProgress([region]);
  assert.equal(Object.values(counts).reduce((sum, value) => sum + value, 0), 1);
  if (['recognized', 'uncertain', 'unrecognized'].includes(status)) {
    assert.equal(counts.manual, error ? 0 : 1); assert.equal(counts.failed, error ? 1 : 0); assert.equal(counts.analyzed, 0);
  } else { assert.equal(counts.manual, 0); assert.equal(counts[status], 1); }
});
check('Zero/default and plural human counters', () => {
  assert.equal(formatScanRegionProgress(summarizeScanRegionProgress([])), '0 analizadas');
  assert.equal(formatScanRegionProgress(summarizeScanRegionProgress([{ status: 'recognized', candidates: [candidate] }, { status: 'recognized', candidates: [candidate] }])), '0 analizadas \u00b7 2 identidades manuales');
});
check('Selected label candidate does not inherit a different manual candidate source', () => {
  const label = { ...original, id: 'label-other' };
  assert.equal(summarizeScanRegionProgress([{ status: 'uncertain', candidates: [candidate, label], selectedCandidateId: label.id }]).manual, 0);
});
const oldModule = (path: string, imports: Record<string, unknown>) => {
  const exports = {}, js = ts.transpileModule(execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' }), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(js, { exports, require: (name: string) => { if (!(name in imports)) throw Error(name); return imports[name]; } }); return exports;
};
const oldAi = oldModule('src/utils/aiRimContextGuide.ts', { '@/utils/wineAffinityExplanation': { buildDetailedAffinityExplanation } }) as { buildAiRimContextGuidance: typeof buildAiRimContextGuidance };
for (const context of ['label', 'menu', 'comparison'] as const) for (const confidence of [0, 0.3, 0.61, 0.91, 1]) for (const name of [null, 'Synthetic default candidate']) check('Default aiRIM parity ' + JSON.stringify({ context, confidence, name }), () => {
  const input = { context, identityConfidence: confidence, name, affinity: null };
  assert.deepEqual(JSON.parse(JSON.stringify(buildAiRimContextGuidance(input, null))), JSON.parse(JSON.stringify(oldAi.buildAiRimContextGuidance(input, null))));
});
check('Human aiRIM guidance is not a model percentage or invented affinity', () => {
  const result = buildAiRimContextGuidance({ context: 'label', name: 'Synthetic manual reference', identityConfidence: 1, identityReviewedByUser: true, affinity: null }, null);
  assert.equal(result.title, 'Identidad revisada por ti'); assert.ok(result.evidence.includes('Revision humana, no confianza del modelo')); assert.ok(!JSON.stringify(result).includes('100%'));
});
const money = await import('../src/utils/scanMoney');
const oldCompare = oldModule('src/utils/wineComparison.ts', { './scanMoney': money }) as { buildWineComparisonDecision: typeof buildWineComparisonDecision };
const wines: ComparableWine[] = [{ id: 'a', name: 'Synthetic manual option', confidence: 1, affinity: null, identityConfirmed: true }, { id: 'b', name: 'Synthetic label option', confidence: 0.61, affinity: null, identityConfirmed: false }];
for (const mode of ['personal', 'service'] as const) for (const priority of ['affinity', 'certainty', 'value'] as const) for (const format of ['any', 'glass', 'bottle'] as const) check('Default comparison parity ' + [mode, priority, format].join('/'), () => {
  const context: WineComparisonContext = { mode, priority, serviceFormat: format, budget: null };
  assert.deepEqual(JSON.parse(JSON.stringify(buildWineComparisonDecision(wines, context))), JSON.parse(JSON.stringify(oldCompare.buildWineComparisonDecision(wines, context))));
});
check('Human comparison text does not present100 as model confidence; ordering/constraints unchanged', () => {
  const context: WineComparisonContext = { mode: 'service', priority: 'certainty', serviceFormat: 'any', budget: null };
  const before = buildWineComparisonDecision(wines, context);
  const after = buildWineComparisonDecision([{ ...wines[0], identityReviewedByUser: true }, wines[1]], context);
  assert.deepEqual(after.ordered.map(item => item.wine.id), before.ordered.map(item => item.wine.id));
  assert.ok(after.ordered[0].reasons.includes('Identidad revisada por ti'));
  assert.ok(!JSON.stringify(after.ordered[0].reasons).includes('100%'));
});
const changed = ['src/utils/multiWineScan.ts', 'src/utils/scanRegionProgress.ts', 'src/utils/aiRimContextGuide.ts', 'src/utils/wineComparison.ts', 'src/components/AffinityExplanation.tsx', 'src/components/wine-import/WineComparisonWorkspace.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx'];
const prior = JSON.parse(readFileSync('docs/qa-evidence/matchrim-region-failure-2026-10-13/source-stages.json', 'utf8')) as { protectedSources: Array<{ path: string }> };
const protectedPaths = [...prior.protectedSources.map(row => row.path).filter(path => !changed.includes(path)), 'src/utils/regionAnalysisError.ts'].sort();
for (const path of protectedPaths) check('Protected source ' + path, () => assert.equal(readFileSync(path, 'utf8'), execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' })));
const hashes = Object.fromEntries([...changed, 'scripts/check-matchrim-manual-provenance-oct13.ts', ...protectedPaths].map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
writeFileSync(output, JSON.stringify({ baseline, scope: 'Trusted local human provenance and current-outcome counters; defaults retain comparison/aiRIM behavior. Synthetic guard/example inputs are not profiles/human tasting data.', checks, changed, protectedPaths, hashes }, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter(check => check.passed).length, total: checks.length, protectedSources: protectedPaths.length, failures: checks.filter(check => !check.passed) }));
if (checks.some(check => !check.passed)) process.exitCode = 1;
