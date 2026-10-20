import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const file = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const viewFile = 'src/components/wine-import/LabelAnalysisView.tsx';
const base = '8327ee7e31fe73ab8edd90303de514147d13978d';
const before = execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' });
const source = readFileSync(file, 'utf8'), view = readFileSync(viewFile, 'utf8');
const parse = (s: string) => ts.createSourceFile(file, s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true });
const declarations = (s: string) => {
  const tree = parse(s), map = new Map<string, ts.Expression>();
  const visit = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) map.set(n.name.text, n.initializer);
    ts.forEachChild(n, visit);
  };
  visit(tree); return { tree, map };
};
const expression = (s: string, name: string) => {
  const { map } = declarations(s), session = map.get('MultiWineLabelScannerSession') as ts.ArrowFunction;
  return name === 'return' ? (session.body as ts.Block).statements.filter(ts.isReturnStatement).at(-1)!.expression! : map.get(name)!;
};
const print = (s: string, name: string) => printer.printNode(ts.EmitHint.Expression, expression(s, name), parse(s));
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const nativeCatalogWire97 = {
  beforeEnrich: '6553abfc9c23655d1d8c2bd7a437f795ee58e9f17f303a8428956bd7674847ce',
  afterEnrich: '0feb100512a3b9e79fa798115dd40fe2d0d8c31870a5455cd8bdfc06734a4a09',
  importSha: 'fd07a20233d51aad60ee5f7d69d933671307d30ab92c841c603e406d610c558e',
  priorUiSource: '09ba6bc39610d04da6ad0009061e3a1f3747c5518df6a6a557b88e3a6e2f47e2',
};
const catalogImport97 = "import { canAdmitNativeCatalogLookup97 } from '@/utils/nativeCatalogAdmission97';\n";
const oldSearch97 = '    const shouldSearch = !isMatchrimFixtureQaEnabled && canResolveCanonically && budget.remaining > 0;';
const newSearch97 = '    const shouldSearch = !isMatchrimFixtureQaEnabled && (isNative\n      ? canAdmitNativeCatalogLookup97(candidate)\n      : canResolveCanonically && budget.remaining > 0);';
const oldReserve97 = '    if (shouldSearch) budget.reserve(signal);';
const newReserve97 = '    if (shouldSearch && !isNative) budget.reserve(signal);';
const restoreNativeCatalogWire97 = (s: string) => {
  assert.equal(sha(expression(s, 'enrichCandidate').getText(parse(s))), nativeCatalogWire97.afterEnrich, 'Exact reviewed enrichCandidate after wiring');
  assert.equal(sha(catalogImport97), nativeCatalogWire97.importSha);
  for (const [from, to] of [[catalogImport97, ''], [newSearch97, oldSearch97], [newReserve97, oldReserve97]]) {
    assert.ok(s.includes(from) && s.indexOf(from) === s.lastIndexOf(from), 'Exactly one reviewed wiring fragment');
    s = s.replace(from, to);
  }
  assert.equal(sha(expression(s, 'enrichCandidate').getText(parse(s))), nativeCatalogWire97.beforeEnrich, 'Full prior enrichCandidate restored');
  assert.equal(sha(s), nativeCatalogWire97.priorUiSource, 'Whole C UI freeze restored except exactly3 approved wiring edits');
  return s;
};
const web = (s: string, name: string) => {
  const result = ts.transform(expression(s, name), [ctx => {
    const bool = (n: ts.Node) => n.kind === ts.SyntaxKind.TrueKeyword ? true : n.kind === ts.SyntaxKind.FalseKeyword ? false : null;
    const visit: ts.Visitor = n => {
      if (ts.isIdentifier(n) && n.text === 'isNative') return ctx.factory.createFalse();
      const x = ts.visitEachChild(n, visit, ctx);
      if (ts.isJsxAttribute(x) && x.initializer && ts.isJsxExpression(x.initializer)
        && x.initializer.expression && ts.isStringLiteral(x.initializer.expression)) {
        return ctx.factory.updateJsxAttribute(x, x.name, ctx.factory.createStringLiteral(x.initializer.expression.text));
      }
      if (ts.isParenthesizedExpression(x) && bool(x.expression) !== null) return x.expression;
      if (ts.isPrefixUnaryExpression(x) && x.operator === ts.SyntaxKind.ExclamationToken && bool(x.operand) !== null) return bool(x.operand) ? ctx.factory.createFalse() : ctx.factory.createTrue();
      if (ts.isConditionalExpression(x) && bool(x.condition) !== null) return bool(x.condition) ? x.whenTrue : x.whenFalse;
      if (ts.isBinaryExpression(x)) {
        const l = bool(x.left), r = bool(x.right);
        if (x.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
          if (l === false || r === false) return ctx.factory.createFalse();
          if (l === true) return x.right;
          if (r === true) return x.left;
        }
        if (x.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
          if (l === true || r === true) return ctx.factory.createTrue();
          if (l === false) return x.right;
          if (r === false) return x.left;
        }
      }
      return x;
    };
    return n => ts.visitNode(n, visit) as ts.Expression;
  }]);
  try { return printer.printNode(ts.EmitHint.Expression, result.transformed[0], parse(s)); } finally { result.dispose(); }
};
let passed = 0;
const check = (name: string, fn: () => void) => { fn(); passed++; console.log('PASS', name); };
check('Native catalog wiring has exact before/after/import hashes and full inverse', () => {
  assert.equal(sha(expression(before, 'enrichCandidate').getText(parse(before))), nativeCatalogWire97.beforeEnrich);
  assert.equal(print(restoreNativeCatalogWire97(source), 'enrichCandidate'), print(before, 'enrichCandidate'));
});
const webSearch97 = (s: string, qa: boolean, resolve: boolean, remaining: number) => runInNewContext(
  declarations(s).map.get('shouldSearch')!.getText(parse(s)), {
    isNative: false, isMatchrimFixtureQaEnabled: qa, canResolveCanonically: resolve, budget: { remaining },
    canAdmitNativeCatalogLookup97: () => { throw Error('Web must never call native admission'); },
  });
check('Actual default-web search expression retains all8 prior truth-table outcomes', () => {
  for (const qa of [false, true]) for (const resolve of [false, true]) for (const remaining of [0, 1]) assert.equal(webSearch97(source, qa, resolve, remaining), webSearch97(before, qa, resolve, remaining));
});
check('Negated web branch and unrelated wiring mutations are rejected', () => {
  const negated = source.replace(newSearch97, newSearch97.replace(': canResolveCanonically', ': !canResolveCanonically'));
  assert.notEqual(negated, source);
  assert.notEqual(webSearch97(negated, false, true, 1), webSearch97(before, false, true, 1));
  for (const mutant of [negated, source.replace(newReserve97, oldReserve97), source.replace(catalogImport97, catalogImport97.replace('nativeCatalogAdmission97', 'unreviewedAdmission')), source.replace('candidate.confidence >= 0.72', 'candidate.confidence >= 0.71')]) {
    assert.notEqual(mutant, source); assert.throws(() => restoreNativeCatalogWire97(mutant));
  }
});
check('Full web-false return and all rendered local fragments equal8327', () => {
  for (const name of ['return', 'referenceReview', 'contextGuidance', 'affinityExplanation', 'candidateDiagnostics', 'identityEvidence', 'sceneDiagnostics', 'scanDiagnostics']) {
    const a = web(source, name), b = web(before, name); let i = 0; while (i < a.length && a[i] === b[i]) i++;
    assert.ok(a === b, `${name}: first difference${i}: ${JSON.stringify(a.slice(i - 80, i + 100))} != ${JSON.stringify(b.slice(i - 80, i + 100))}`);
  }
});
check('Web label and callback mutations are detected', () => {
  for (const mutated of [source.replace('Región {selectedRegion.index}:', 'Wrong web {selectedRegion.index}:'), source.replace('onClick={discardSelected}', 'onClick={resetScan}')]) assert.notEqual(web(mutated, 'return'), web(before, 'return'));
});
check('Analysis/save/selection/lifetime/context closures unchanged by presentation scope', () => {
  // Only the3 approved wiring fragments are reversed; helper runtime belongs to E/Parent.
  const restored = restoreNativeCatalogWire97(source);
  for (const name of ['enrichCandidate', 'analyzeRegion', 'startScan', 'resetScan', 'continueScan', 'reanalyzeSelected', 'discardSelected', 'selectCandidate', 'confirmSelectedCandidate', 'editCandidate', 'identifySelectedManually', 'moveSelection', 'confirmBatch', 'manualLookupContext', 'manualLookupKey']) assert.equal(print(restored, name), print(before, name), name);
});
check('Strict manual lookup props/callback preserved exactly, one route', () => {
  const lookup = (s: string) => {
    const tree = parse(s), found: ts.JsxSelfClosingElement[] = [];
    const visit = (n: ts.Node) => { if (ts.isJsxSelfClosingElement(n) && n.tagName.getText(tree) === 'WinerimSheetLookup' && n.attributes.getText(tree).includes('contextKey={manualLookupKey}')) found.push(n); ts.forEachChild(n, visit); };
    visit(tree); assert.equal(found.length, 1); return printer.printNode(ts.EmitHint.Unspecified, found[0], tree);
  };
  assert.equal(lookup(source), lookup(before));
  assert.equal(print(source, 'referenceReview'), print(before, 'referenceReview'));
});
check('Primary navigation opens only existing details; missing target does nothing', () => {
  const tree = parse(source), found: ts.JsxAttribute[] = [];
  const visit = (n: ts.Node) => { if (ts.isJsxAttribute(n) && n.name.getText(tree) === 'onFindSheet') found.push(n); ts.forEachChild(n, visit); };
  visit(tree); assert.equal(found.length, 1);
  const callback = (found[0].initializer as ts.JsxExpression).expression!.getText(tree);
  for (const exists of [true, false]) {
    const events: string[] = [];
    class Details {
      open = false;
      querySelector(name: string) { assert.equal(name, 'summary'); return { focus: (options: unknown) => { assert.equal(this.open, true); assert.equal(JSON.stringify(options), '{"preventScroll":true}'); events.push('focus'); } }; }
      scrollIntoView(options: unknown) { assert.equal(this.open, true); assert.equal(JSON.stringify(options), '{"block":"start","behavior":"instant"}'); events.push('scroll'); }
    }
    const details = new Details();
    runInNewContext(`(${callback})()`, { HTMLDetailsElement: Details, document: { getElementById: (id: string) => { assert.equal(id, 'native-label-reference'); return exists ? details : null; } } });
    assert.deepEqual(events, exists ? ['focus', 'scroll'] : []);
    assert.equal(details.open, exists);
  }
});
check('Native reanalysis requires explicit consent; web callback stays exact', () => {
  const tree = parse(source), buttons: ts.JsxOpeningElement[] = [];
  const visit = (n: ts.Node) => { if (ts.isJsxOpeningElement(n) && n.tagName.getText(tree) === 'Button' && n.attributes.getText(tree).includes('title="Reanalizar"')) buttons.push(n); ts.forEachChild(n, visit); };
  visit(tree); assert.equal(buttons.length, 1);
  const attr = buttons[0].attributes.properties.find(n => ts.isJsxAttribute(n) && n.name.getText(tree) === 'onClick') as ts.JsxAttribute;
  const expression = (attr.initializer as ts.JsxExpression).expression!.getText(tree);
  for (const native of [true, false]) for (const agreed of [true, false]) {
    let confirms = 0, calls = 0;
    const click = runInNewContext(expression, { isNative: native, window: { confirm: (message: string) => { assert.ok(message.includes('servicio de lectura con IA')); confirms++; return agreed; } }, reanalyzeSelected: () => { calls++; } }) as () => void;
    click(); assert.equal(confirms, native ? 1 : 0); assert.equal(calls, native ? Number(agreed) : 1);
  }
  assert.equal(web(source, 'return'), web(before, 'return'));
});

type Node = { type: string; props: Record<string, unknown> };
const fragment = 'fragment';
const jsx = (type: string, props: Node['props']): Node => ({ type, props });
const sandbox = { exports: {}, require: (id: string) => {
  if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: fragment };
  if (id === 'lucide-react') return { BookOpen: 'BookOpen', Check: 'Check', Pencil: 'Pencil' };
  if (id === 'react-router-dom') return { Link: 'Link' };
  if (id === '@/components/ui/button') return { Button: 'Button' };
  throw Error(`Unexpected dependency: ${id}`);
} };
runInNewContext(ts.transpileModule(view, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText, sandbox);
const render = (sandbox.exports as { LabelAnalysisView: (props: Record<string, unknown>) => Node }).LabelAnalysisView;
const flatten = (node: unknown): Node[] => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === 'object' && 'props' in node ? [node as Node, ...flatten((node as Node).props.children)] : [];
const text = (node: unknown): string => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'props' in node ? text((node as Node).props.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '';
let corrected = 0, opened = 0;
const props = { isNativePlatform: true, identity: { name: 'Visible reference', producer: null, vintage: null }, identityLabel: 'Referencia propuesta', catalogIdentityLinked: false, canExplainAffinity: false, hasProfile: true, affinity: jsx('verified-answer', { children: '≈93/100' }), lookup: null, disabled: false, onFindSheet: () => opened++, onCorrect: () => corrected++ };
check('Explicit non-native early return retains legacy children only', () => {
  const child = jsx('legacy-exact', { children: 'Original web' });
  const tree = render({ ...props, isNativePlatform: false, children: child });
  assert.equal(tree.props.children, child); assert.equal(text(tree), 'Original web');
});
check('Pending has one explanation, literal missing-vintage and no affinity leak', () => {
  const tree = render(props), content = text(tree);
  assert.equal(content.split('Afinidad pendiente').length - 1, 1);
  assert.ok(content.includes('Bodega sin confirmar') && content.includes('Añada no indicada'));
  assert.ok(content.includes('Aún no hay una ficha enlazada'));
  assert.ok(!content.includes('Confirmar este candidato') && !content.includes('foto'));
  assert.ok(!content.includes('≈93') && !content.includes('aiRIM'));
});
check('Identity lives in header, not duplicated body; no new sticky overlay', () => {
  const tree = render({ ...props, showIdentity: false });
  assert.ok(!text(tree).includes(props.identity.name));
  assert.ok(text(tree).includes('Referencia propuesta'));
  assert.ok(!source.includes('`Vino ${selectedRegion.index}`'));
  assert.ok(source.includes('max-h-[40dvh] min-w-0 shrink-0 overflow-y-auto'));
  assert.ok(!source.includes('sticky top-0 z-10 max-h-[40dvh]'));
  assert.ok(source.includes("selectedCandidate?.vintage ? ` · ${selectedCandidate.vintage}`"));
});
check('Opening/reselecting resets only scroll, cancels late frame, no web/focus/network', () => {
  const tree = parse(source), effects: ts.CallExpression[] = [];
  const visit = (n: ts.Node) => { if (ts.isCallExpression(n) && n.expression.getText(tree) === 'useLayoutEffect' && n.getText(tree).includes("header.scrollTop = 0")) effects.push(n); ts.forEachChild(n, visit); };
  visit(tree); assert.equal(effects.length, 1);
  const callback = effects[0].arguments[0].getText(tree);
  for (const native of [false, true]) for (const selected of [null, 'region-1']) {
    const header = { scrollTop: 80 }, layout = { scrollTop: 120, firstElementChild: header }, body = { scrollTop: 240 };
    let frame: (() => void) | null = null, cancelled = 0;
    const cleanup = runInNewContext(`(${callback})()`, { isNative: native, selectedRegionId: selected,
      regionEditorLayout: { current: layout }, regionEditorBody: { current: body },
      HTMLElement: { [Symbol.hasInstance]: (v: unknown) => v === header },
      requestAnimationFrame: (fn: () => void) => { frame = fn; return 17; },
      cancelAnimationFrame: (id: number) => { assert.equal(id, 17); cancelled++; },
    }) as (() => void) | undefined;
    if (native && selected) { assert.ok(frame); (frame as () => void)(); assert.deepEqual([layout.scrollTop, body.scrollTop, header.scrollTop], [0, 0, 0]); cleanup!(); assert.equal(cancelled, 1); }
    else { assert.equal(frame, null); assert.deepEqual([layout.scrollTop, body.scrollTop, header.scrollTop], [120, 240, 80]); }
  }
});
check('Actions delegate exactly once without lookup or identity authority', () => {
  const actions = flatten(render(props)).filter(n => n.type === 'Button');
  for (const label of ['Buscar ficha para mi afinidad', 'Corregir']) {
    const action = actions.find(n => text(n).trim() === label)!; assert.ok(action); (action.props.onClick as () => void)();
  }
  assert.deepEqual([opened, corrected], [1, 1]);
});
check('Manual uses single existing lookup slot, not a second controller', () => {
  const slot = jsx('strict-lookup', { children: 'Original strict request control' });
  const tree = render({ ...props, lookup: slot });
  assert.equal(flatten(tree).filter(n => n === slot).length, 1);
  assert.ok(!text(tree).includes('Buscar ficha para mi afinidad'));
});
check('Verified answer rendered unchanged, no duplicate pending or search', () => {
  const tree = render({ ...props, catalogIdentityLinked: true, canExplainAffinity: true });
  assert.ok(flatten(tree).includes(props.affinity));
  assert.ok(!text(tree).includes('Afinidad pendiente') && !text(tree).includes('Buscar ficha'));
});
check('Ready continuation is navigation only; pending never offers to save', () => {
  let returned = 0;
  const control = { ...props, onReturnToBatch: () => returned++ };
  assert.ok(!text(render(control)).includes('Volver al lote para guardar'));
  const tree = render({ ...control, catalogIdentityLinked: true, canExplainAffinity: true });
  const button = flatten(tree).find(n => n.type === 'Button' && text(n).trim() === 'Volver al lote para guardar')!;
  assert.ok(button); (button.props.onClick as () => void)(); assert.equal(returned, 1);
  const ast = parse(source), callbacks: ts.JsxAttribute[] = [];
  const visit = (n: ts.Node) => { if (ts.isJsxAttribute(n) && n.name.getText(ast) === 'onReturnToBatch') callbacks.push(n); ts.forEachChild(n, visit); };
  visit(ast); assert.equal(callbacks.length, 1);
  assert.equal(callbacks[0].initializer!.getText(ast).replace(/\s+/g, ' '), "{phase === 'ready' ? () => { setNativeResultView('wines'); setSelectedRegionId(null); } : undefined}");
});
check('Linked without profile offers test, never new sheet or fabricated score', () => {
  const tree = render({ ...props, catalogIdentityLinked: true, hasProfile: false });
  assert.ok(text(tree).includes('Completar mi test'));
  assert.ok(!text(tree).includes('≈93') && !text(tree).includes('Buscar ficha'));
});
check('Locked actions stay disabled and all native controls retain44px', () => {
  const actions = flatten(render({ ...props, disabled: true })).filter(n => n.type === 'Button');
  assert.equal(actions.length, 2);
  assert.ok(actions.every(n => n.props.disabled === true && String(n.props.className).includes('min-h-11')));
});
check('Photo secondary/native only; existing web photo branch preserved', () => {
  assert.ok(source.includes('data-testid="native-label-photo"'));
  assert.ok(source.includes('Foto de la etiqueta'));
  assert.equal(web(source, 'return'), web(before, 'return'));
});
console.log(JSON.stringify({ passed, failed: 0, base, nativeCatalogWire97, scope: 'Presentation/web isolation plus exact native wiring inverse; helper runtime integration owned by E/Parent', SDK: 0, network: 0 }));
