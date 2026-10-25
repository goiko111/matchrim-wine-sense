import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import { nativeWineConsumerResult } from '../src/utils/multiWineConsumer95';
import { confirmedLabelCatalogIdentity95 } from '../src/utils/confirmedCatalogIdentity95';
import { lookupWinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import { createGlobalCatalogue103, applyGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103';
import { localSingleCandidate109 } from '../src/utils/nativeSingleLabel109';
import type { WineCandidate } from '../src/utils/multiWineScan';

globalThis.fetch = async () => { throw new Error('LIVE_NETWORK_FORBIDDEN'); };
const capture = JSON.parse(readFileSync('qa-fixtures/consumer95/public-nv-catalogue.projected.json', 'utf8'));
const reference = await lookupWinerimOriginalSheet({ name: 'Manzanilla La Gitana', producer: 'Bodegas Hidalgo La Gitana' }, undefined, async url => {
  const cached = capture.reads.find((row: { url: string }) => row.url === String(url)); assert(cached);
  return Response.json(cached.body, { status: cached.status });
});
assert.equal(reference.status, 'verified'); if (reference.status !== 'verified') throw new Error('RETAINED_REFERENCE_REQUIRED');
const profile = { potente: 2, acidez: 4, dulce: 1, tanico: 0, afrutado: 1 };
const input: WineCandidate = { id: 'qa210', name: 'Visible reference', producer: 'Visible producer', vintage: null,
  source: 'manual', region: null, country: null, grapes: [], alcohol: null, evidence: [], inferredFields: [],
  uncertaintyReasons: [], confidence: 0 };
const known = confirmedLabelCatalogIdentity95(input, reference.sheet, profile)!;
let checks = 0;
const check = (name: string, run: () => void) => { run(); checks++; console.log('PASS', name); };
check('Actual cursive OCR disagreement explains identity gap, not catalogue absence or zero affinity', () => {
  const observed = JSON.parse(readFileSync('qa-fixtures/example207/OBSERVED.json', 'utf8'));
  for (const run of observed.runs) {
    const raw = run.raw;
    const replay = { ...raw, source: 'apple-vision-device' as const, requestId: '00000000-0000-4000-8000-000000021001' };
    const candidate = localSingleCandidate109(replay, 'observed-macos-replay210'); assert(candidate);
    const result = nativeWineConsumerResult(candidate, profile);
    assert.equal(result.pending?.reason, 'identity'); assert.match(result.pending.description, /uva o la fecha/);
    assert.equal(result.canExplainAffinity, false); assert.equal(candidate.affinity, null);
  }
});
check('A named manual wine reports an unlinked fiche, never absence from the master', () => {
  const gap = nativeWineConsumerResult(input, profile).pending;
  assert.equal(gap?.reason, 'catalogue-link'); assert.match(gap.description, /no significa que el vino no esté/);
});
check('Valid sensory data with missing/invalid profile requests the palate test', () => {
  for (const person of [null, { ...profile, acidez: NaN }, { ...profile, dulce: undefined }]) {
    const result = nativeWineConsumerResult(known, person as typeof profile | null);
    assert.equal(result.pending?.reason, 'profile'); assert.equal(result.canExplainAffinity, false);
  }
});
check('Linked identity without source sensory data explains exactly what is missing', () => {
  const noSensory = confirmedLabelCatalogIdentity95(input, { ...reference.sheet, sensoryAttributes: null }, profile)!;
  const result = nativeWineConsumerResult(noSensory, profile);
  assert.equal(result.pending?.reason, 'sensory'); assert.match(result.pending.description, /enlazado con Winerim/);
  assert.match(result.pending.nextStep, /cuerpo, acidez, dulzor, tanino y fruta/);
});
check('An injected sensory vector cannot make missing source data look like a stale score only', () => {
  const noSensory = confirmedLabelCatalogIdentity95(input, { ...reference.sheet, sensoryAttributes: null }, profile)!;
  const result = nativeWineConsumerResult({ ...noSensory, sensoryAttributes: known.sensoryAttributes,
    sensorySource: 'catalog', affinity: known.affinity }, profile);
  assert.equal(result.pending?.reason, 'sensory'); assert.equal(result.canExplainAffinity, false);
});
check('Stale score is distinguished from missing sensory data; zero-valued taste data survives', () => {
  const stale = nativeWineConsumerResult({ ...known, affinity: known.affinity! - 1 }, profile);
  assert.equal(stale.pending?.reason, 'score'); assert.match(stale.pending.title, /actualizarse/);
  assert.equal(known.sensoryAttributes?.taninos, 0);
  const ready = nativeWineConsumerResult(known, profile);
  assert.equal(ready.canExplainAffinity, true); assert.equal(ready.pending, null);
});
const publicFixture = JSON.parse(readFileSync('qa-fixtures/global103/winerim-public.observed.json', 'utf8'));
const vidure: WineCandidate = { ...input, name: 'Vidure', producer: 'Pago de Cirsus', vintage: 2020,
  evidence: ['VIDURE', 'Pago de Cirsus', '2020'], source: 'label', confidence: .8 };
for (const exact of [false, true]) {
  const row = { ...publicFixture.vidure.wine, ...(exact ? { vintage: '2020' } : {}) };
  const bodies = [{ count: 1, page: 1, results: [row] }, row]; let calls = 0;
  const client = createGlobalCatalogue103(async () => Response.json(bodies[calls++]));
  const found = await client.lookup(vidure); assert('wine' in found);
  const applied = applyGlobalCatalogue103(vidure, profile, found.wine);
  check(exact ? 'Exact public identity with untrusted/default-bearing values explains sensory gap'
    : 'Reference match without matching vintage explains harvest gap, not wine absence', () => {
    const result = nativeWineConsumerResult(applied, profile);
    assert.equal(result.pending?.reason, exact ? 'sensory' : 'vintage');
    if (!exact) assert.match(result.pending.description, /2020/);
    assert.equal(applied.affinity, null); assert.equal(calls, 2);
  });
}
check('Presentation does not mutate a candidate, fiche, rating or profile', () => {
  const before = JSON.stringify({ known, profile }); nativeWineConsumerResult(known, profile);
  assert.equal(JSON.stringify({ known, profile }), before);
});

type Node = { type: unknown; props: Record<string, unknown>; children: unknown[] };
const element = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): Node => ({ type, props: props ?? {}, children });
const text = (node: unknown): string => Array.isArray(node) ? node.map(text).join(' ')
  : node && typeof node === 'object' && 'children' in node ? text((node as Node).children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '';
const viewSource = readFileSync('src/components/wine-import/LabelAnalysisView.tsx', 'utf8');
const exports: Record<string, (props: Record<string, unknown>) => Node> = {};
vm.runInNewContext(ts.transpileModule(viewSource.replace(/^import .*;\n/gm, ''), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText,
{ exports, React: { createElement: element }, Link: 'Link', BookOpen: 'BookOpen', Check: 'Check', Pencil: 'Pencil', Button: 'Button' });
const props = { isNativePlatform: true, identity: input, identityLabel: 'Referencia propuesta', catalogIdentityLinked: false,
  canExplainAffinity: false, hasProfile: true, affinity: 'DO_NOT_LEAK_99', lookup: null, disabled: false,
  onFindSheet: () => undefined, onCorrect: () => undefined };
check('Native detail renders actual gap and next step without a numeric placeholder or false external search', () => {
  const gap = nativeWineConsumerResult(input, profile).pending!;
  const visible = text(exports.LabelAnalysisView({ ...props, pendingAffinity: gap }));
  assert(visible.includes(gap.title) && visible.includes(gap.description) && visible.includes(gap.nextStep));
  assert(!visible.includes('DO_NOT_LEAK') && !visible.includes('buscando en internet'));
});
check('Non-native early return ignores all new native props and preserves exact legacy content', () => {
  const child = element('web', null, 'Unchanged web');
  const rendered = exports.LabelAnalysisView({ ...props, isNativePlatform: false, pendingAffinity: nativeWineConsumerResult(input, profile).pending, children: child });
  assert.equal(rendered.children[0], child); assert.equal(text(rendered), 'Unchanged web');
});

const scanner = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const current = readFileSync(scanner, 'utf8'), before = execFileSync('git', ['show', `3edb136:${scanner}`], { encoding: 'utf8' });
const parse = (source: string) => ts.createSourceFile(scanner, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true });
const projectWeb = (source: string) => {
  const tree = parse(source);
  const transformed = ts.transform(tree, [ctx => {
    const bool = (n: ts.Node) => n.kind === ts.SyntaxKind.FalseKeyword ? false : n.kind === ts.SyntaxKind.TrueKeyword ? true : null;
    const visit: ts.Visitor = node => {
      if (ts.isIdentifier(node) && node.text === 'isNative') return ctx.factory.createFalse();
      const n = ts.visitEachChild(node, visit, ctx);
      if (ts.isConditionalExpression(n) && bool(n.condition) !== null) return bool(n.condition) ? n.whenTrue : n.whenFalse;
      if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken && bool(n.operand) !== null)
        return bool(n.operand) ? ctx.factory.createFalse() : ctx.factory.createTrue();
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        if (bool(n.left) === false || bool(n.right) === false) return ctx.factory.createFalse();
        if (bool(n.left) === true) return n.right;
      }
      if (ts.isJsxElement(n)) return ctx.factory.updateJsxElement(n, n.openingElement,
        n.children.filter(child => !(ts.isJsxExpression(child) && child.expression && bool(child.expression) === false)
          && !(ts.isJsxText(child) && !child.text.trim())), n.closingElement);
      return n;
    };
    return root => ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  try { return printer.printFile(transformed.transformed[0] as ts.SourceFile); } finally { transformed.dispose(); }
};
check('Whole scanner projection with native disabled remains identical to the previous product', () => {
  const actual = projectWeb(current), expected = projectWeb(before);
  let first = 0; while (first < actual.length && actual[first] === expected[first]) first++;
  assert(actual === expected, `Web difference at ${first}: ${JSON.stringify(actual.slice(first - 40, first + 100))} vs ${JSON.stringify(expected.slice(first - 40, first + 100))}`);
});
console.log(JSON.stringify({ passed: true, checks, realCatalogueCalls: 0, modelCalls: 0, formulaChanged: false,
  visualRecognitionImplemented: false, externalResearchActivated: false }));
