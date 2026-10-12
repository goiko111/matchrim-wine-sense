import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { buildAiRimContextGuidance, type AiRimContextInput, type AiRimContextGuidance } from '../src/utils/aiRimContextGuide';
import { buildDetailedAffinityExplanation, type AffinityDataSource } from '../src/utils/wineAffinityExplanation';

const output = process.argv[2];
if (!output) throw new Error('Pass09 result JSON path');
const baseline = 'a533e0d4d689fb245ec91ad0bb2f93796018e4cc';
const helper = 'src/utils/aiRimContextGuide.ts';
const oldSource = execFileSync('git', ['show', baseline + ':' + helper], { encoding: 'utf8' });
const sandbox = vm.createContext({ exports: {}, require: () => ({ buildDetailedAffinityExplanation }) });
vm.runInContext(ts.transpileModule(oldSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
const oldGuide: typeof buildAiRimContextGuidance = sandbox.exports.buildAiRimContextGuidance;
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
const joined = (g: AiRimContextGuidance) => [g.title, g.summary, ...g.evidence, g.nextStep].join('\n');
const cautious = (g: AiRimContextGuidance) => {
  assert.doesNotMatch(joined(g), /\b(?:confirmad[oa]|verificad[oa])\b|Identidad lista|Ficha Winerim vinculada/i);
  assert.match(joined(g), /lectura|candidat[oa]|referencia propuesta/i);
  assert.match(joined(g), /no verifica|no acredita|no equivale|no una verificacion/i);
  assert.doesNotMatch(joined(g), /NaN|Infinity/);
};
const base: AiRimContextInput = { context: 'menu', name: 'Barbaresco Marchesi di Barolo', identityConfidence: 0.88, affinity: null, sensorySource: 'inference', uncertaintyReasons: [] };
const profile = { potente: 3, acidez: 3, dulce: 1, tanico: 3, afrutado: 4 };
const attributes = { power: 3, acidity: 3, sweetness: 1, tannin: 3, fruity: 4 };
for (const [label, value] of [['absent', undefined], ['null', null], ['NaN', NaN], ['Infinity', Infinity], ['negative Infinity', -Infinity], ['low', 0.34]] as const) {
  check('Non-authoritative confidence ' + label, () => { const g = buildAiRimContextGuidance({ ...base, identityConfidence: value }, null); cautious(g); assert.equal(g.tone, 'caution'); });
}
for (const name of [undefined, null, '', '   ']) check('Absent/blank name ' + String(name), () => { const g = buildAiRimContextGuidance({ ...base, name, identityConfidence: 1 }, null); cautious(g); assert.equal(g.tone, 'caution'); });
for (const confidence of [0.35, 0.71, 0.72, 0.88, 1]) check('Valid confidence ' + confidence + ' does not confirm identity', () => { const g = buildAiRimContextGuidance({ ...base, identityConfidence: confidence }, null); cautious(g); assert.equal(g.tone, confidence < 0.72 ? 'caution' : 'neutral'); });
for (const sensorySource of ['label', 'catalog', 'inference', 'preference'] as AffinityDataSource[]) check('Sensory source alone ' + sensorySource + ' is not a linked sheet', () => { const g = buildAiRimContextGuidance({ ...base, sensorySource, identityConfidence: 1 }, null); cautious(g); assert.match(joined(g), /afinidad pendiente/i); });
for (const extra of [
  {}, { canonicalId: null }, { canonicalId: 'typed-only', source: 'catalog' },
  { source: 'manual', status: 'recognized', evidence: ['Identidad confirmada manualmente por el usuario'] },
  { provenance: null }, { provenance: 'invalid' }, { provenance: { canonicalId: 'incomplete' } },
  { humanConfirmed: true }, { confirmedAt: 'not-an-event' },
]) check('Absent/invalid/incomplete undeclared provenance ' + JSON.stringify(extra), () => { const g = buildAiRimContextGuidance({ ...base, identityConfidence: 1, ...extra }, null); cautious(g); assert.equal(g.title, 'Candidato de lectura; afinidad pendiente'); });
check('Profile alone cannot establish physical or canonical identity', () => { const g = buildAiRimContextGuidance(base, profile); cautious(g); assert.equal(g.tone, 'neutral'); });
check('Attributes alone cannot create a personal recommendation', () => { const g = buildAiRimContextGuidance({ ...base, affinity: 88, attributes }, null); cautious(g); assert.equal(g.tone, 'neutral'); });
check('Incomplete attributes with mathematical profile remain pending', () => { const g = buildAiRimContextGuidance({ ...base, affinity: 88, attributes: { power: 3 } }, profile); cautious(g); assert.equal(g.tone, 'neutral'); });
for (const affinity of [undefined, null, NaN, Infinity, -Infinity, -1, 101]) check('Invalid/absent affinity ' + String(affinity) + ' does not display a score', () => { const g = buildAiRimContextGuidance({ ...base, affinity, attributes }, profile); cautious(g); assert.match(g.title, /afinidad pendiente/); assert.doesNotMatch(joined(g), /Afinidad orientativa/); });
for (const context of ['label', 'menu', 'comparison'] as const) {
  check('Doubt retained in ' + context + ' without verification', () => { const g = buildAiRimContextGuidance({ ...base, context, identityConfidence: 1, uncertaintyReasons: ['Texto parcial por reflejo'], hasAlternatives: true }, profile); cautious(g); assert.match(g.summary, /Texto parcial por reflejo/); assert.equal(g.tone, 'caution'); });
  for (const score of [0, 30, 55, 70, 85, 100]) check('Pure mathematical ' + context + ' score ' + score + ' preserves range and evidence', () => {
    const input = { ...base, context, affinity: score, attributes };
    const current = buildAiRimContextGuidance(input, profile), previous = oldGuide(input, profile);
    cautious(current); assert.deepEqual(current.evidence.slice(0, 2), Array.from(previous.evidence)); assert.equal(current.tone, previous.tone);
  });
  for (const sensorySource of ['label', 'catalog', 'inference', 'preference'] as AffinityDataSource[]) check('Complete mathematical input with ' + sensorySource + ' in ' + context + ' still does not prove identity', () => {
    const input = { ...base, context, sensorySource, identityConfidence: 1, affinity: 88, attributes };
    const current = buildAiRimContextGuidance(input, profile), previous = oldGuide(input, profile);
    cautious(current); assert.deepEqual(current.evidence.slice(0, 2), Array.from(previous.evidence)); assert.equal(current.tone, previous.tone);
  });
}
check('Inputs are not mutated; no flag or authority added', () => { const input = Object.freeze({ ...base, attributes: Object.freeze(attributes), uncertaintyReasons: Object.freeze([]) as unknown as string[] }); const before = JSON.stringify(input); buildAiRimContextGuidance(input, Object.freeze(profile)); assert.equal(JSON.stringify(input), before); });
const consumers = ['src/components/AiRimContextGuide.tsx', 'src/components/wine-import/WineMenuScanner.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx'];
for (const path of consumers) check('Consumer/component byte-compatible: ' + path, () => assert.equal(readFileSync(path, 'utf8'), execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' })));
check('Exactly three active guide callsites retain explicit loaded profile/null', () => {
  const sites: string[] = [];
  for (const path of consumers.slice(1)) {
    const tree = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => { if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === 'AiRimContextGuide') sites.push(node.getText(tree)); ts.forEachChild(node, visit); };
    visit(tree);
  }
  assert.equal(sites.length, 3); for (const site of sites) assert.match(site, /profile=\{scanProfile\?\.profile \?\? null\}/);
});
const declarations = (source: string) => {
  const tree = ts.createSourceFile(helper, source, ts.ScriptTarget.Latest, true);
  let contract = '', calculation = '';
  const visit = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === 'AiRimContextInput') contract = node.getText(tree);
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 'buildDetailedAffinityExplanation') calculation = node.getText(tree);
    ts.forEachChild(node, visit);
  };
  visit(tree); return { contract, calculation };
};
check('Existing input contract adds no synthetic authority prop', () => assert.equal(declarations(readFileSync(helper, 'utf8')).contract, declarations(oldSource).contract));
check('Shared explanation call and inputs unchanged', () => assert.equal(declarations(readFileSync(helper, 'utf8')).calculation, declarations(oldSource).calculation));
const sourceHashes = Object.fromEntries([helper, ...consumers, 'src/utils/wineAffinityExplanation.ts', 'scripts/check-matchrim-airim-provenance-oct13.ts'].map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(output, JSON.stringify({ scope: 'Only09 guide language, negative provenance, absent/invalid input, pure mathematical compatibility and three consumers. Mathematical profile/attributes are not users, catalog linkage, physical identity or provider accuracy.', baseline, checks, sourceHashes }, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter(c => c.passed).length, total: checks.length, failures: checks.filter(c => !c.passed) }));
if (checks.some(c => !c.passed)) process.exitCode = 1;
