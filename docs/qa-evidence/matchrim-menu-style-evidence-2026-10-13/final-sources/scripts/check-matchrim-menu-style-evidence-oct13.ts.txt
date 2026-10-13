import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { hasVerifiedMenuSensorySheet, menuWineSensorySimilarity, menuWineSimilarityBand, menuWineSimilarityUnavailable } from '../src/utils/menuWineSimilarity';
import { updateMenuWineEvidence, applyMenuWineEvidence } from '../src/utils/scanWineEvidence';
import type { MenuScanWine } from '../src/utils/wineMenuScan';

const bytes = readFileSync('docs/qa-evidence/matchrim-menu-comparison-2026-10-12/after/response-provenance.json');
assert.equal(createHash('sha256').update(bytes).digest('hex'), 'f4f7fbbf6ce5d19868baf78ff3983f8ca585a7fb1a070ca2386175d308e19fe5');
const rows: MenuScanWine[] = JSON.parse(bytes.toString()).variants.units.vinos.slice(1, 3);
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
check('Frozen vision attributes cannot compute style similarity', () => assert.equal(menuWineSensorySimilarity(rows[0], rows[1]), null));
check('Same inferred type/grapes cannot substitute for missing attributes', () => assert.equal(menuWineSensorySimilarity({ ...rows[0], atributos: null }, { ...rows[1], atributos: null }), null));
check('Unknown types never produce the previous Sin-tipo similarity', () => assert.equal(menuWineSensorySimilarity({ ...rows[0], atributos: null, tipo: '', uvas: [] }, { ...rows[1], atributos: null, tipo: '', uvas: [] }), null));
check('Provider source/catalog claim is cleared by canonical evidence gate', () => {
  const wine = applyMenuWineEvidence({ ...rows[0], canonicalId: 'provider-claim', sensorySource: 'catalog', compatibilidad: 99, affinity_calibrated: true }, null);
  assert.equal(wine.sensorySource, 'inference'); assert.equal(wine.canonicalId, null); assert.equal(wine.compatibilidad, null);
  assert.equal(hasVerifiedMenuSensorySheet(wine), false);
});

// Positive examples here test math only. They are not injected into the UI or verified wine data.
const source: MenuScanWine = { ...rows[0], canonicalId: 'synthetic-sheet-a', sensorySource: 'catalog', confidence: 0.9, dudas: [], campos_inferidos: [],
  atributos: { potencia: 3, acidez: 3, dulzura: 3, taninos: 3, afrutado: 3 }, compatibilidad: null, affinity_calibrated: false };
const candidate: MenuScanWine = { ...rows[1], canonicalId: 'synthetic-sheet-b', sensorySource: 'catalog', confidence: 0.9, dudas: [], campos_inferidos: [],
  atributos: { potencia: 3, acidez: 3, dulzura: 3, taninos: 3, afrutado: 3 }, compatibilidad: null, affinity_calibrated: false };
check('Complete equivalent synthetic sheets compute100, not personal affinity', () => {
  const result = menuWineSensorySimilarity(source, candidate)!;
  assert.equal(result.score, 100); assert.equal(result.differences.length, 5); assert.ok(result.differences.every(row => row.delta === 0));
  assert.equal(source.compatibilidad, null); assert.equal(candidate.compatibilidad, null);
});
check('Similarity does not mutate sheets or user/price/affinity evidence', () => {
  const before = JSON.stringify([source, candidate]); menuWineSensorySimilarity(source, candidate); assert.equal(JSON.stringify([source, candidate]), before);
});
check('Extreme opposite complete sheets have bounded score0', () => {
  const left = { ...source, atributos: { potencia: 1, acidez: 1, dulzura: 1, taninos: 1, afrutado: 1 } };
  const right = { ...candidate, atributos: { potencia: 5, acidez: 5, dulzura: 5, taninos: 5, afrutado: 5 } };
  assert.equal(menuWineSensorySimilarity(left, right)?.score, 0);
});
for (const dimension of ['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado'] as const) {
  for (const value of [null, undefined, NaN, Infinity, -1, 0, 6, '3']) {
    check(`Missing/invalid ${dimension}=${String(value)} abstains on either side`, () => {
      const invalid = { ...source, atributos: { ...source.atributos!, [dimension]: value } } as MenuScanWine;
      assert.equal(menuWineSensorySimilarity(invalid, candidate), null); assert.equal(menuWineSensorySimilarity(candidate, invalid), null);
    });
  }
}
for (const [label, change] of [
  ['catalog-source', { sensorySource: 'inference' }], ['canonical-missing', { canonicalId: null }], ['canonical-blank', { canonicalId: ' ' }],
  ['identity-low', { confidence: 0.84 }], ['identity-doubt', { dudas: ['Pending identity'] }], ['identity-inferred', { campos_inferidos: ['nombre'] }],
  ['sheet-missing', { atributos: null }],
  ['canonical-number', { canonicalId: 42 as unknown as string }], ['confidence-string', { confidence: '0.9' as unknown as number }],
  ['confidence-infinite', { confidence: Infinity }], ['confidence-scale', { confidence: 90 }],
] as Array<[string, Partial<MenuScanWine>]>) {
  check('Ungrounded ' + label + ' abstains, not zero taste match', () => {
    assert.equal(menuWineSensorySimilarity({ ...source, ...change }, candidate), null);
    assert.equal(menuWineSensorySimilarity(candidate, { ...source, ...change }), null);
  });
}
check('Same known reference is not its own recommendation', () => assert.equal(menuWineSensorySimilarity(source, { ...candidate, canonicalId: source.canonicalId, anada: source.anada }), null));
check('Unknown vintage does not turn same canonical ID into another reference', () => assert.equal(menuWineSensorySimilarity(source, { ...candidate, canonicalId: source.canonicalId, anada: null }), null));
check('Explicit different vintages remain separate synthetic references', () => assert.equal(menuWineSensorySimilarity({ ...source, anada: 2020 }, { ...candidate, canonicalId: source.canonicalId, anada: 2021 })?.score, 100));
check('Type/grape guesses cannot inflate verified sensory math', () => assert.equal(menuWineSensorySimilarity(source, { ...candidate, tipo: 'otro tipo inferido', uvas: ['otra uva inferida'] })?.score, 100));
check('Price/currency changes do not recalibrate sensory similarity', () => assert.equal(menuWineSensorySimilarity(source, { ...candidate, precio: 999, moneda: 'GBP' })?.score, 100));
check('Manual identity change invalidates similarity with the old sheet', () => assert.equal(menuWineSensorySimilarity(updateMenuWineEvidence(source, { nombre: 'Manual unverified identity' }), candidate), null));
check('Manual price update preserves grounded sensory sheet, not a new sheet', () => assert.equal(menuWineSensorySimilarity(updateMenuWineEvidence(source, { precio: 35 }), candidate)?.score, 100));
check('Missing source sheet explicitly pending', () => assert.match(menuWineSimilarityUnavailable(rows[0], [candidate]), /^Parecidos pendientes: falta la ficha/));
check('Missing other sheets explicitly pending', () => assert.match(menuWineSimilarityUnavailable(source, [rows[1]]), /^Parecidos pendientes: faltan otras fichas/));
check('No qualifying style is different from missing data', () => {
  const left = { ...source, atributos: { potencia: 1, acidez: 1, dulzura: 1, taninos: 1, afrutado: 1 } };
  const right = { ...candidate, atributos: { potencia: 5, acidez: 5, dulzura: 5, taninos: 5, afrutado: 5 } };
  assert.match(menuWineSimilarityUnavailable(left, [right]), /^No hay otra ficha/);
});
check('Qualifying styles are not incorrectly labelled unavailable', () => assert.match(menuWineSimilarityUnavailable(source, [candidate]), /^Hay fichas/));
check('Qualitative UI bands never emit percentages/probability', () => {
  for (const score of [50, 60, 80, 100]) assert.doesNotMatch(menuWineSimilarityBand(score), /\d|%|probabilidad/);
});
const activePath = 'src/components/wine-import/WineMenuScanner.tsx';
const initializers = (source: string) => {
  const tree = ts.createSourceFile(activePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result = new Map<string, string>();
  const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) result.set(node.name.text, node.initializer.getText(tree)); ts.forEachChild(node, visit); };
  visit(tree); return result;
};
const baseline = 'ca73c57efa52c205fc173fb69e5f0ac11ae90f7c';
const before = initializers(execFileSync('git', ['show', baseline + ':' + activePath], { encoding: 'utf8' }));
const after = initializers(readFileSync(activePath, 'utf8'));
const scope = vm.createContext({ menuWineSensorySimilarity, scannedWines: [source, candidate] });
vm.runInContext(ts.transpileModule('globalThis.calculateWineSimilarity=' + after.get('calculateWineSimilarity') + ';globalThis.getSimilarWines=' + after.get('getSimilarWines'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
check('Actual reachable similarity wrapper invokes evidence gate', () => { assert.equal(scope.calculateWineSimilarity(rows[0], rows[1]), 0); assert.equal(scope.calculateWineSimilarity(source, candidate), 100); });
check('Actual list excludes missing sheets while preserving real indexes', () => {
  scope.scannedWines = [rows[0], rows[1]]; assert.equal(scope.getSimilarWines(rows[0], 0).length, 0);
  scope.scannedWines = [source, candidate]; const similar = scope.getSimilarWines(source, 0); assert.equal(similar.length, 1); assert.equal(similar[0].index, 1);
});
for (const name of ['saveScannedWine', 'updateScannedWine', 'normalizeScannedWine', 'processFile', 'retryScanProfile', 'listPriceText', 'menuDecision', 'getSimilarWines']) {
  check('Protected active initializer unchanged: ' + name, () => assert.equal(after.get(name), before.get(name)));
}
for (const path of ['src/utils/menuPriceReview.ts', 'src/utils/menuWineSave.ts', 'src/utils/scanWineEvidence.ts', 'src/utils/wineMenuScan.ts', 'src/utils/wineAffinityExplanation.ts', 'src/utils/wineComparison.ts', 'src/components/wine-import/WineComparisonWorkspace.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx']) {
  check('Protected independent source unchanged: ' + path, () => assert.equal(readFileSync(path, 'utf8'), execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' })));
}
const editorPath = 'src/components/wine-import/MenuPriceEditor.tsx';
const editorBefore = initializers(execFileSync('git', ['show', baseline + ':' + editorPath], { encoding: 'utf8' }));
const editorAfter = initializers(readFileSync(editorPath, 'utf8'));
for (const name of ['initialFormat', 'parsed', 'ready', 'changedCurrency', 'serviceConflict', 'reset']) {
  check('Price editor layout change preserves business initializer: ' + name, () => assert.equal(editorAfter.get(name), editorBefore.get(name)));
}
const result = { scope: 'Frozen negative contracts plus explicitly synthetic positive math only; no catalog-positive UI injection, provider or human calibration', baseline, checks, allPassed: checks.every(row => row.passed) };
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n');
for (const row of checks.filter(row => !row.passed)) console.error(row.name, row.error);
console.log(`${checks.filter(row => row.passed).length}/${checks.length} menu style evidence checks`);
if (!result.allPassed) process.exitCode = 1;
