import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import { canLookupWinerimOriginal, lookupWinerimOriginalSheet, catalogWineFromVerifiedSheet, type WinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import { applyScanWineEvidence } from '../src/utils/scanWineEvidence';
import { confirmWineCandidateIdentity, correctWineCandidateIdentity, type WineCandidate } from '../src/utils/multiWineScan';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';

// Actual lookup closures in a minimal hook host, not a DOM renderer or UIKit claim.
const passed: string[] = [];
const check = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); passed.push(name); console.log('PASS', name); };
const lookupFile = 'src/components/WinerimSheetLookup.tsx', lookupSource = readFileSync(lookupFile, 'utf8');
const deferred = <T>() => { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
type Element = { type: unknown; props: Record<string, unknown>; key?: string };
const wine: WineCandidate = { id: 'candidate', name: 'Synthetic Luna', producer: 'Synthetic Estate', vintage: null, region: null,
  country: null, grapes: [], alcohol: null, confidence: .6, source: 'manual', evidence: [], uncertaintyReasons: ['Optional grapes unreadable'], inferredFields: [], sensoryAttributes: null, affinity: null };
const sheet: WinerimOriginalSheet = { id: '123', name: wine.name, producer: wine.producer, vintage: null, region: null, grapes: [], detailVerified: true,
  url: 'https://web.winerim.com/the-library/wines/123/synthetic-luna', sensoryAttributes: { power: 0, acidity: .25, sweetness: 2.5, tannin: 4.75, fruity: 5 } };
const profile = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
function host(identity = wine, extra: Record<string, unknown> = {}) {
  let cursor = 0, calls = 0, native = true;
  const slots: unknown[] = [], effects: { deps?: unknown[]; cleanup?: () => void }[] = [], queue: (() => void)[] = [];
  const commits: unknown[] = [], loading: boolean[] = [], signals: AbortSignal[] = [], response = deferred<unknown>();
  const hookEffect = (effect: () => (() => void) | void, deps?: unknown[]) => {
    const i = cursor++, old = effects[i];
    if (!old || !deps || deps.some((v, k) => !Object.is(v, old.deps?.[k]))) { old?.cleanup?.(); queue.push(() => { effects[i] = { deps, cleanup: effect() || undefined }; }); }
  };
  const hooks = { useRef(value: unknown) { const i = cursor++; slots[i] ??= { current: value }; return slots[i]; },
    useState(value: unknown) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], (v: unknown) => { slots[i] = v; }]; }, useEffect: hookEffect, useLayoutEffect: hookEffect };
  const jsx = (type: unknown, props: Record<string, unknown>, key?: string) => ({ type, props, key });
  const exports: Record<string, (props: Record<string, unknown>) => Element | null> = {};
  const code = ts.transpileModule(lookupSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, AbortController, require: (name: string) => {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
    if (name.includes('winerimOriginalSheet')) return { canLookupWinerimOriginal, lookupWinerimOriginalSheet: (_: unknown, signal: AbortSignal) => { calls++; signals.push(signal); return response.promise; } };
    if (name.includes('WinerimOriginalSheet')) return { WinerimOriginalSheet: 'OriginalSheet' };
    if (name.includes('/button')) return { Button: 'Button' };
    if (name === 'lucide-react') return { Loader2: 'Loader', BookOpen: 'Book', X: 'X' };
    throw Error('Unexpected import ' + name);
  } });
  let props = { identity, onVerified: (value: unknown) => commits.push(value), onLoadingChange: (v: boolean) => loading.push(v), ...extra };
  let tree: Element | null = null;
  const wrapper = () => exports.WinerimSheetLookup(props);
  const render = () => { cursor = 0; const node = wrapper(); tree = node ? (node.type as (p: Record<string, unknown>) => Element)(node.props) : null; while (queue.length) queue.shift()!(); return tree; };
  const nodes = (v: unknown): Element[] => Array.isArray(v) ? v.flatMap(nodes) : v && typeof v === 'object' && 'props' in v ? [v as Element, ...nodes((v as Element).props.children)] : [];
  const buttons = () => nodes(tree).filter(e => e.type === 'Button'); render();
  return { render, response, commits, loading, signals, wrapper, buttons, get calls() { return calls; }, setNative(v: boolean) { native = v; },
    setCallback(cb: (v: unknown) => void) { props = { ...props, onVerified: cb }; }, unmount() { for (const effect of effects) effect?.cleanup?.(); },
    lookup: () => (buttons()[0].props.onClick as () => void)(), cancel: () => (buttons()[1].props.onClick as () => void)() };
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
await check('existing entry defaults retain accessible label and web null render', () => {
  const h = host(); assert.equal(h.buttons()[0].props['aria-label'], 'Ficha original Winerim: Synthetic Luna'); assert.equal(h.calls, 0);
  h.setNative(false); assert.equal(h.wrapper(), null); h.unmount();
});
await check('new caption retains original100 entry, one controller and actual cancel closure', async () => {
  const h = host(wine, { buttonLabel: 'Buscar ficha para mi afinidad' });
  assert.equal(h.buttons()[0].props['aria-label'], 'Ficha original Winerim: Synthetic Luna. Buscar ficha para mi afinidad'); assert.ok(JSON.stringify(h.buttons()[0]).includes('Buscar ficha para mi afinidad'));
  h.lookup(); h.lookup(); assert.equal(h.calls, 1); h.render(); assert.equal(h.buttons()[0].props.disabled, true); h.cancel(); assert.equal(h.signals[0].aborted, true);
  h.response.resolve({ status: 'verified', sheet }); await flush(); assert.deepEqual(h.commits, []); assert.equal(h.loading.at(-1), false); h.unmount();
});
await check('verified result uses latest callback', async () => {
  const h = host(), values: unknown[] = []; h.lookup(); h.setCallback(v => values.push(v)); h.render(); h.response.resolve({ status: 'verified', sheet }); await flush();
  assert.deepEqual(values, [sheet]); assert.deepEqual(h.commits, []); h.unmount();
});
await check('custom visible caption is contained in native accessible name; default exact and web null', () => {
  const caption = 'Buscar ficha para mi afinidad', custom = host(wine, { buttonLabel: caption }), standard = host();
  assert.ok(String(custom.buttons()[0].props['aria-label']).startsWith('Ficha original Winerim:'));
  assert.ok(String(custom.buttons()[0].props['aria-label']).includes(caption));
  assert.equal(standard.buttons()[0].props['aria-label'], 'Ficha original Winerim: Synthetic Luna');
  custom.setNative(false); standard.setNative(false); assert.equal(custom.wrapper(), null); assert.equal(standard.wrapper(), null);
  custom.unmount(); standard.unmount();
});
await check('layout unmount rejects ignored late response', async () => {
  const h = host(); h.lookup(); h.unmount(); assert.equal(h.signals[0].aborted, true); h.response.resolve({ status: 'verified', sheet }); await flush(); assert.deepEqual(h.commits, []); assert.equal(h.loading.at(-1), false);
});
for (const [name, patch] of Object.entries({ owner: { owner: 'B' }, region: { region: '2' }, candidate: { candidate: { ...wine, name: 'Changed' } }, profile: { profile: { ...profile, potente: 0 } }, lock: { locked: true }, reset: { region: null, candidate: null } })) await check('actual lookup context key remounts on ' + name, () => {
  const base = { owner: 'A', region: '1', candidate: wine, profile, locked: false }, a = host(wine, { contextKey: JSON.stringify(base) }), b = host(wine, { contextKey: JSON.stringify({ ...base, ...patch }) });
  assert.notEqual(a.wrapper()!.key, b.wrapper()!.key); a.unmount(); b.unmount();
});
await check('disabled, missing or inferred producer/role cannot dispatch', () => {
  for (const [identity, extra] of [[wine, { disabled: true }], [{ ...wine, producer: null }, {}], [{ ...wine, inferredFields: ['producer'] }, {}], [{ ...wine, producer: 'Sicily', region: 'Sicily' }, {}]] as [WineCandidate, Record<string, unknown>][]) {
    const h = host(identity, extra); h.lookup(); assert.equal(h.calls, 0); h.unmount();
  }
});
await check('manual identity does not grant score or borrow year', () => {
  assert.equal(confirmWineCandidateIdentity({ ...wine, source: 'vision' }).affinity, null);
  const edited = correctWineCandidateIdentity({ ...wine, vintage: '2021' }, { name: 'Other literal' }); assert.equal(edited.vintage, null); assert.equal(edited.originalSheet, null); assert.equal(edited.affinity, null);
});
await check('actual strict evidence retains0/decimal scale and current local score', () => {
  const catalog = catalogWineFromVerifiedSheet(wine, sheet); assert.ok(catalog); const result = applyScanWineEvidence(wine, profile, catalog);
  assert.equal(result.sensoryAttributes?.potencia, 0); assert.equal(result.sensoryAttributes?.acidez, .25); assert.equal(result.sensoryAttributes?.scale, 'winerim-0-5');
  assert.equal(result.affinity, calculateLocalMatchrimAffinity(profile, result.sensoryAttributes)); assert.equal(applyScanWineEvidence(wine, null, catalog).affinity, null);
});
const oldFetch = globalThis.fetch;
try {
 for (const mode of ['verified', 'missing', 'ambiguous', 'unavailable', 'wrong-detail', 'unknown-vintage']) await check('actual strict reader mocked GET: ' + mode, async () => {
  const raw = { id: 123, name: wine.name, winery: wine.producer, vintage: mode === 'unknown-vintage' ? '2021' : null, slugname: 'synthetic-luna', region: null, country: null, grapes: [], tastingAttributes: sheet.sensoryAttributes };
  let calls = 0; globalThis.fetch = async () => { calls++; if (mode === 'unavailable') return new Response('{}', { status: 503 });
    const body = calls === 1 ? { restaurant: 'b653e084-e8e1-448c-bc03-507a1cea3810' } : calls === 2 ? { page: 1, count: mode === 'missing' ? 0 : mode === 'ambiguous' ? 2 : 1, results: mode === 'missing' ? [] : mode === 'ambiguous' ? [raw, { ...raw, id: 124 }] : [raw] } : mode === 'wrong-detail' ? { ...raw, winery: 'Other Estate' } : raw;
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }); };
  const result = await lookupWinerimOriginalSheet(wine);
  assert.equal(result.status, ({ verified: 'verified', missing: 'not-found', ambiguous: 'ambiguous', unavailable: 'unavailable', 'wrong-detail': 'ambiguous', 'unknown-vintage': 'not-found' } as Record<string, string>)[mode]); assert.ok(calls <= 3);
  if (mode !== 'verified') assert.equal('sheet' in result, false);
 });
} finally { globalThis.fetch = oldFetch; }
const file = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const old = execFileSync('git', ['show', `a625e04b0e805214bf5f3482302c85f67712196a:${file}`], { encoding: 'utf8' }), current = readFileSync(file, 'utf8');
const parse = (s: string) => ts.createSourceFile(file, s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), printer = ts.createPrinter({ removeComments: true });
const initializers = (s: string) => { const map = new Map<string, ts.Expression>(); const visit = (n: ts.Node) => { if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) map.set(n.name.text, n.initializer); ts.forEachChild(n, visit); }; visit(parse(s)); return map; };
await check('auto-lookup/lifecycle/edit/save actual AST closures unchanged', () => {
 const a = initializers(old), b = initializers(current);
 for (const name of ['enrichCandidate','analyzeRegion','startScan','resetScan','continueScan','reanalyzeSelected','discardSelected','selectCandidate','confirmSelectedCandidate','editCandidate','identifySelectedManually','moveSelection','confirmBatch']) assert.equal(printer.printNode(ts.EmitHint.Expression,a.get(name)!,parse(old)),printer.printNode(ts.EmitHint.Expression,b.get(name)!,parse(current)),name);
 assert.ok(current.includes('candidate.uncertaintyReasons.length === 0'));
});
const web = (s: string, name: string) => {
 const session = initializers(s).get('MultiWineLabelScannerSession') as ts.ArrowFunction;
 const expr = name === 'return' ? (session.body as ts.Block).statements.filter(ts.isReturnStatement).at(-1)!.expression! : initializers(s).get(name)!;
 const transformed = ts.transform(expr, [ctx => { const bool = (n: ts.Node) => n.kind === ts.SyntaxKind.TrueKeyword ? true : n.kind === ts.SyntaxKind.FalseKeyword ? false : null;
  const visit: ts.Visitor = n => { if (ts.isIdentifier(n) && n.text === 'isNative') return ctx.factory.createFalse(); const x = ts.visitEachChild(n,visit,ctx);
   if(ts.isParenthesizedExpression(x)&&bool(x.expression)!==null)return x.expression;
   if(ts.isPrefixUnaryExpression(x)&&x.operator===ts.SyntaxKind.ExclamationToken&&bool(x.operand)!==null)return bool(x.operand)?ctx.factory.createFalse():ctx.factory.createTrue();
   if(ts.isConditionalExpression(x)&&bool(x.condition)!==null)return bool(x.condition)?x.whenTrue:x.whenFalse;
   if(ts.isBinaryExpression(x)){const l=bool(x.left),r=bool(x.right);if(x.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken){if(l===false||r===false)return ctx.factory.createFalse();if(l===true)return x.right;if(r===true)return x.left;}if(x.operatorToken.kind===ts.SyntaxKind.BarBarToken){if(l===true||r===true)return ctx.factory.createTrue();if(l===false)return x.right;if(r===false)return x.left;}}return x;
  };return n=>ts.visitNode(n,visit) as ts.Expression; }]);
 try{return printer.printNode(ts.EmitHint.Expression,transformed.transformed[0],parse(s));}finally{transformed.dispose();}
};
await check('full legacy reference/session web-false JSX exact; mutation detected', () => {
 assert.equal(web(current,'referenceReview'),web(old,'referenceReview'));assert.equal(web(current,'return'),web(old,'return'));
 assert.notEqual(web(current.replace('value={selectedCandidate.name}','value={"Wrong web"}'),'referenceReview'),web(old,'referenceReview'));
});
await check('exclusive original100-compatible entry, current context callback and short native caption', () => {
 for(const text of ["(!isNative || selectedCandidate.source !== 'manual')",'contextKey={manualLookupKey}','currentManualLookupKey.current !== manualLookupKey','JSON.stringify({ ...manualLookupContext, candidate }) === manualLookupKey','!manualLookupLoading','buttonLabel="Buscar ficha para mi afinidad"','aria-label="Corregir identificación"',' /> Corregir</Button>'])assert.ok(current.includes(text),text);
 assert.ok(readFileSync('scripts/qa-matchrim-consumer95-memory.py','utf8').includes("re.compile('^Ficha original Winerim:')"));assert.ok(lookupSource.includes('aria-label={`Ficha original Winerim: ${identity.name}'));
});
await check('short native correction caption is contained in unchanged accessible name', () => {
  assert.ok('Corregir identificación'.includes('Corregir'));
  assert.ok(current.includes('aria-label="Corregir identificación"'));
  assert.ok(current.includes(' /> Corregir</Button>'));
  assert.ok(!current.includes(' /> Corregir vino</Button>'));
});
console.log(JSON.stringify({passed:passed.length,failed:0,groups:passed,actualLookupClosures:true,actualStrictReaderMockFetch:true,externalCalls:0,nativeUI:false}));
