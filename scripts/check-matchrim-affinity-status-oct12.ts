import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { presentMenuAffinity } from '../src/utils/menuAffinityPresentation';

const output = process.argv[2];
if (!output) throw new Error('Pass a result JSON path');
const path = 'src/components/wine-import/WineMenuScanner.tsx';
const baseline = '9c3a59ca54793b9b7a86a8e5675da2f578fd4900';
const oldSource = execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
const source = readFileSync(path, 'utf8');
const initializers = (text: string) => {
  const tree = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = new Map<string, string>();
  const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) found.set(node.name.text, node.initializer.getText(tree)); ts.forEachChild(node, visit); };
  visit(tree); return found;
};
const old = initializers(oldSource), current = initializers(source);
const compile = (expression: string) => ts.transpileModule(`globalThis.subject = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const oldContext = vm.createContext({}); vm.runInContext(compile(old.get('getWineDecision')!), oldContext);
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
for (const score of [0, 30, 54, 54.9, 55, 69, 70, 84, 85, 100]) {
  check(`Finite calibrated mathematical control ${score} preserves old classification and value`, () => {
    const result = presentMenuAffinity(score, true);
    const previous = oldContext.subject(score);
    assert.equal(result.state, 'calculated'); assert.equal(result.score, score);
    for (const field of ['label', 'description', 'className'] as const) assert.equal(result[field], previous[field]);
  });
}
for (const [label, value] of [['missing', undefined], ['null', null], ['NaN', NaN], ['positive Infinity', Infinity], ['negative Infinity', -Infinity], ['negative', -1], ['over100', 101], ['string71', '71'], ['empty string', ''], ['boolean', false], ['object', {}]] as Array<[string, unknown]>) {
  check(`${label} abstains, never absent-as-zero`, () => { const result = presentMenuAffinity(value, true); assert.equal(result.state, 'pending'); assert.equal(result.score, null); assert.equal(result.label, 'Afinidad pendiente'); });
}
for (const score of [0, 30, 71, 100]) check(`Uncalibrated ${score} is pending, not negative or positive`, () => { const result = presentMenuAffinity(score, false); assert.equal(result.state, 'pending'); assert.equal(result.score, null); });
check('Known unavailable cause is preserved verbatim, without blaming quiz', () => assert.equal(presentMenuAffinity(null, false, 'Perfil no disponible para este análisis; afinidad pendiente.').description, 'Perfil no disponible para este análisis; afinidad pendiente.'));
check('A low real mathematical value differs from absence', () => { assert.equal(presentMenuAffinity(30, true).label, 'No priorizaría'); assert.notEqual(presentMenuAffinity(null, true).label, 'No priorizaría'); });
const active = vm.createContext({ presentMenuAffinity, scanProfile: { profile: null, source: 'unavailable', note: 'Perfil no disponible para este análisis; afinidad pendiente.' } });
vm.runInContext(compile(current.get('getWineDecision')!), active);
check('Active wrapper missing profile withholds even a marked mathematical number', () => { const result = active.subject({ compatibilidad: 30, affinity_calibrated: true }); assert.equal(result.state, 'pending'); assert.equal(result.score, null); });
for (const name of ['saveScannedWine', 'updateScannedWine', 'resetSaveBatch', 'normalizeScannedWine', 'getSimilarWines']) {
  check(`Protected06/normalization initializer ${name} unchanged`, () => assert.equal(current.get(name), old.get(name)));
}
const result = { scope: 'Only07 direct mathematical presentation controls + active wrapper/AST boundaries. True-calibrated controls are not real profiles/catalog sheets/new recommendations or OCR metrics.', checks,
  sourceHashes: Object.fromEntries([path, 'src/utils/menuAffinityPresentation.ts', 'scripts/check-matchrim-affinity-status-oct12.ts'].map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')])) };
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter((c) => c.passed).length, total: checks.length, failures: checks.filter((c) => !c.passed) }));
if (checks.some((c) => !c.passed)) process.exitCode = 1;
