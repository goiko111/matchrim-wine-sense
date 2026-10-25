import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { correctNativeIdentity218, validateNativeIdentity218 } from '../src/utils/nativeIdentityCorrection218';
import type { WineCandidate } from '../src/utils/multiWineScan';
import { isPendingLocalIdentity109 } from '../src/utils/nativeSingleLabel109';

const checks: string[] = [];
const check = (name: string, run: () => void) => { run(); checks.push(name); };
const base = Object.freeze({ id: 'controlled218', name: 'Vino controlado', producer: 'Bodega controlada', vintage: 2020,
  source: 'catalog', confidence: 1, evidence: ['old'], uncertaintyReasons: [], inferredFields: [], region: 'old', country: 'old',
  grapes: ['old'], alcohol: 14, canonicalId: 'old', masterRecord: { id: 123 }, globalRecord: { id: 456 },
  originalSheet: { id: 789 }, sensorySource: 'catalog', sensoryAttributes: { acidez: 4 }, affinity: 0,
  affinityConfidence: 1, affinityReason: 'old' }) as unknown as WineCandidate;
const identity = { name: base.name, producer: base.producer, vintage: base.vintage };
check('No-op keeps the exact reference and its zero affinity', () => assert.equal(correctNativeIdentity218(base, identity), base));
for (const [name, patch] of Object.entries({ vintage: { vintage: 2021 }, clearVintage: { vintage: null },
  name: { name: 'Otro vino' }, producer: { producer: 'Otra bodega' }, clearProducer: { producer: null } })) {
  check(`${name} clears all previous catalogue/sensory/affinity authority`, () => {
    const next = correctNativeIdentity218(base, { ...identity, ...patch })!;
    assert(next && next !== base); assert.equal(next.source, 'manual');
    for (const key of ['canonicalId', 'masterRecord', 'globalRecord', 'originalSheet', 'sensoryAttributes',
      'affinity', 'affinityConfidence', 'affinityReason', 'region', 'country', 'alcohol'] as const) assert.equal(next[key], null, key);
    assert.deepEqual(next.grapes, []); assert.deepEqual(next.inferredFields, []);
    assert.equal(next.vintage, 'vintage' in patch ? patch.vintage : base.vintage);
    assert.equal(base.affinity, 0); assert.equal(base.vintage, 2020);
  });
}
check('Validation normalizes optional fields without manufacturing a harvest', () => {
  assert.deepEqual(validateNativeIdentity218({ name: '  Vino  ', producer: ' ', vintage: '' }),
    { ok: true, identity: { name: 'Vino', producer: null, vintage: null } });
  for (const year of ['1900', '2099']) assert.equal(validateNativeIdentity218({ name: 'V', producer: '', vintage: year }).ok, true);
});
check('Invalid names, control characters and harvests cannot be applied', () => {
  for (const name of ['', ' ', 'a'.repeat(241), 'a\u202eb', 'a\nb']) assert.equal(validateNativeIdentity218({ name, producer: '', vintage: '' }).ok, false);
  for (const vintage of ['1899', '2100', '20xx', '2020.0', '20201', '-1']) {
    assert.equal(validateNativeIdentity218({ name: 'V', producer: '', vintage }).ok, false);
  }
  assert.equal(correctNativeIdentity218(base, { ...identity, vintage: NaN }), null);
});

const file = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const current = fs.readFileSync(file, 'utf8');
const parse = (source: string) => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const tree = parse(current);
let handler: ts.Expression | undefined;
const find = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'editNativeIdentity218') handler = node.initializer;
  ts.forEachChild(node, find);
}; find(tree); assert(handler);
const compiled = ts.transpileModule(`globalThis.apply = ${handler.getText(tree)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const region = () => ({ id: 'r218', status: 'recognized', selectedCandidateId: base.id, candidates: [base], error: 'old', fallback: {} });
check('Actual scanner handler applies only native, unlocked, current selection', () => {
  for (const mode of ['ok', 'pending-local', 'web', 'loading', 'saving', 'discarded', 'selection', 'stale', 'missing']) {
    let value = region(), writes = 0;
    if (mode === 'discarded') value.status = 'discarded';
    if (mode === 'selection') value.selectedCandidateId = 'other';
    if (mode === 'stale') value.candidates = [{ ...base, vintage: 2022 }];
    if (mode === 'missing') value.candidates = [];
    const context = { isNative: mode !== 'web', localBatch: mode === 'pending-local', isPendingLocalIdentity109,
      batchRef: { current: mode === 'saving' }, loading: mode === 'loading',
      selectedRegion: { id: value.id }, selectedCandidate: base, correctNativeIdentity218,
      updateRegion: (_id: string, update: (input: typeof value) => typeof value) => { const next = update(value); if (next !== value) writes++; value = next; }, apply: (_: unknown) => {} };
    vm.runInNewContext(compiled, context, { timeout: 1000 });
    context.apply({ ...identity, vintage: 2021, ...(mode === 'pending-local' ? { name: 'Etiqueta por identificar' } : {}) });
    assert.equal(writes, ['ok', 'pending-local'].includes(mode) ? 1 : 0, mode);
    if (mode === 'ok') { assert.equal(value.candidates[0].vintage, 2021); assert.equal(value.candidates[0].affinity, null); }
    if (mode === 'pending-local') assert.equal(value.status, 'uncertain');
  }
});

// Compare the entire legacy projection, excluding only the new guarded native
// handler and its imports; all other existing code must remain identical.
const project = (source: string) => {
  const transformed = ts.transform(parse(source), [ctx => {
    const bool = (node: ts.Node) => node.kind === ts.SyntaxKind.FalseKeyword ? false : node.kind === ts.SyntaxKind.TrueKeyword ? true : null;
    const visit: ts.Visitor = node => {
      if (ts.isImportDeclaration(node) && /(?:nativeIdentityCorrection218|NativeLabelIdentityEditor218)/.test(node.moduleSpecifier.getText())) return undefined;
      if (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText() === 'editNativeIdentity218')) return undefined;
      if (ts.isIdentifier(node) && node.text === 'isNative') return ctx.factory.createFalse();
      const n = ts.visitEachChild(node, visit, ctx);
      if (ts.isJsxExpression(n) && n.expression && ts.isJsxElement(n.expression)) return n.expression;
      if (ts.isConditionalExpression(n) && bool(n.condition) !== null) return bool(n.condition) ? n.whenTrue : n.whenFalse;
      if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken && bool(n.operand) !== null) return bool(n.operand) ? ctx.factory.createFalse() : ctx.factory.createTrue();
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        if (bool(n.left) === false || bool(n.right) === false) return ctx.factory.createFalse();
        if (bool(n.left) === true) return n.right;
      }
      if (ts.isJsxElement(n)) return ctx.factory.updateJsxElement(n, n.openingElement, n.children.filter(child => !(ts.isJsxExpression(child) && child.expression && bool(child.expression) === false)
        && !(ts.isJsxText(child) && !child.text.trim())), n.closingElement);
      return n;
    }; return root => ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  try { return ts.createPrinter({ removeComments: true }).printFile(transformed.transformed[0] as ts.SourceFile); } finally { transformed.dispose(); }
};
check('Legacy web projection equals preserved1550bae', () => {
  const before = execFileSync('git', ['show', `1550bae:${file}`], { encoding: 'utf8' });
  const actual = project(current), expected = project(before);
  let first = 0; while (first < actual.length && actual[first] === expected[first]) first++;
  assert(actual === expected, `Web delta at ${first}: ${JSON.stringify(actual.slice(first - 50, first + 100))} vs ${JSON.stringify(expected.slice(first - 50, first + 100))}`);
});
console.log(JSON.stringify({ passed: true, checks, liveCalls: 0, scope: 'Synthetic correction and actual extracted handler; not OCR, UIKit, user learning or live saving.' }, null, 2));
