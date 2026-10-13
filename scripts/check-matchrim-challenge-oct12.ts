import assert from 'node:assert/strict';
import { isNonWineIdentity } from '../src/utils/wineCategory';
import { groupDuplicateWines, normalizeBox, normalizeDetectedRegions, normalizeRecognitionFallback, normalizeWineCandidates, type ScanRegion } from '../src/utils/multiWineScan';
import { planRegionAnalysis } from '../src/utils/scanAnalysisPolicy';

// Contract probes transcribed from frozen visible text; these are not model outputs.
const negative = { candidates: [{ name: 'Aperol', producer: 'Fratelli Barbieri', type: 'aperitivo', confidence: .99, source: 'label', evidence: ['APEROL', 'APERITIVO', 'DAL 1919'] }] };
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => {
  try { run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: (error as Error).message }); }
};
check('Aperol visible identity is a non-wine negative', () => assert.equal(isNonWineIdentity('Aperol', 'aperitivo'), true));
check('Conflicting wine type cannot override the explicit non-wine identity', () => assert.equal(isNonWineIdentity('APEROL', 'vino'), true));
check('No negative candidate reaches wine scoring', () => assert.deepEqual(normalizeWineCandidates(negative, 'a01'), []));
check('Negative explains no wine affinity', () => assert.equal(normalizeRecognitionFallback(negative)?.code, 'not_wine'));
check('Explicit non-wine fallback keeps its classification without candidates', () => {
  const fallback = normalizeRecognitionFallback({ candidates: [], fallback: { code: 'not_wine' } });
  assert.equal(fallback?.code, 'not_wine');
  assert.ok(fallback?.message.includes('No se calcula afinidad'));
});
check('Unknown fallback remains uncertain', () => assert.equal(normalizeRecognitionFallback({ fallback: { code: 'future_code' } })?.code, 'unknown'));
check('Word boundaries retain similarly spelled wine names', () => assert.equal(isNonWineIdentity('Aperolia Rosso', 'vino'), false));
check('Serving a wine as an aperitif does not exclude it', () => assert.equal(isNonWineIdentity('Hugel Gewurztraminer', 'vino de aperitivo'), false));
check('Existing spirits category remains excluded', () => assert.equal(isNonWineIdentity('Scotch Whisky'), true));
check('Tasting evidence does not become beverage classification', () => assert.equal(normalizeWineCandidates({ candidates: [{ name: 'Sainte Magdeleine', producer: 'Famille Sack-Zafiropulo', vintage: 2018, evidence: ['aroma de whisky'], confidence: .8 }] }, 'label01').length, 1));
const names = ['Gewurztraminer Hugel', 'Pinot Gris Tradition Hugel', 'Riesling Jubilee Hugel', 'Gewurztraminer Vendange Tardive Hugel'];
const regions: ScanRegion[] = names.map((name, index) => ({
  id: `h${index}`, index: index + 1, objectType: 'label', box: { x: index * 25, y: 0, width: 24, height: 95 },
  detectionConfidence: .9, quality: { glare: 'low', occlusion: 'low', legibility: 'good' }, status: 'recognized',
  candidates: normalizeWineCandidates({ candidates: [{ name, producer: 'Hugel et Fils', vintage: null, confidence: .9, evidence: [name] }] }, `h${index}`),
  selectedCandidateId: null, duplicateCount: 1,
}));
check('Four literal Hugel references stay distinct', () => assert.equal(groupDuplicateWines(regions).length, 4));
check('A repeated identical reference counts two bottles in one group', () => {
  const groups = groupDuplicateWines([regions[0], { ...regions[0], id: 'h-repeat' }]);
  assert.equal(groups.length, 1); assert.equal(groups[0].count, 2);
});
check('No numeric affinity is inferred from the label-only contracts', () => assert.ok(regions.every(region => region.candidates.every(candidate => candidate.affinity === null))));
const clippedBox = { x: 59.125, y: 97.5, width: 1.8125, height: 2.5 };
check('Explicit edge bottle is retained but cannot consume automatic OCR', () => {
  const clipped = normalizeDetectedRegions({ regions: [{ object_type: 'bottle', box: clippedBox, confidence: .9 }] });
  assert.equal(clipped.length, 1);
  const plan = planRegionAnalysis(clipped, 1600, 1200);
  assert.equal(plan.automatic.length, 0);
  assert.equal(plan.deferred[0].deferral?.code, 'resolution');
});
check('Unclassified and label slivers retain the existing exclusion', () => {
  assert.equal(normalizeDetectedRegions({ regions: [{ box: clippedBox }] }).length, 0);
  assert.equal(normalizeDetectedRegions({ regions: [{ object_type: 'label', box: clippedBox }] }).length, 0);
});
check('Tiny interior proposals do not bypass the percentage gate', () => assert.equal(normalizeDetectedRegions({ regions: [{ object_type: 'bottle', box: { ...clippedBox, y: 50 } }] }).length, 0));
check('Zero-area clipped box remains invalid even at zero minimum', () => assert.equal(normalizeBox({ x: -10, y: 10, width: 5, height: 5 }, 0), null));
console.log(JSON.stringify({ scope: 'Local category/deduplication contract delta, no vision accuracy claim', checks, passed: checks.every(check => check.passed) }, null, 2));
process.exitCode = checks.every(check => check.passed) ? 0 : 1;
