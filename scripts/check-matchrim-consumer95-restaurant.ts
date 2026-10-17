import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import { buildConsumerAffinity } from '../src/utils/consumerAffinity95';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import { activeRestaurantRows91 } from '../src/utils/restaurantSession91';
import { isVerifiedWinerimSheetForIdentity, lookupWinerimOriginalSheet, validateWinerimOriginalSensory } from '../src/utils/winerimOriginalSheet';

const root = new URL('../', import.meta.url);
const file = new URL('src/pages/Restaurant.tsx', root);
const source = readFileSync(file, 'utf8');
const ast = ts.createSourceFile('Restaurant.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = (body: ts.Node) => {
  const result = new Map<string, ts.VariableStatement>();
  body.forEachChild(node => {
    if (ts.isVariableStatement(node)) for (const d of node.declarationList.declarations) result.set(d.name.getText(ast), node);
  });
  return result;
};
const top = declarations(ast);
const component = top.get('RestaurantSession')!.declarationList.declarations[0].initializer as ts.ArrowFunction;
const local = declarations(component.body);
const compile = (text: string) => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const context = vm.createContext({ exports: {}, buildConsumerAffinity, calculateLocalMatchrimAffinity,
  isVerifiedWinerimSheetForIdentity, validateWinerimOriginalSensory });
vm.runInContext(compile(top.get('nativeRestaurantAffinity95')!.getText(ast) + '\nglobalThis.nativeResult = nativeRestaurantAffinity95;'), context);
const nativeResult = context.nativeResult as (row: unknown, sheet: unknown, profile: unknown) => ReturnType<typeof buildConsumerAffinity>;
let groups = 0;
const check = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); groups++; console.log('PASS', name); };
const capturePath = process.argv.find(arg => arg.startsWith('--catalog='))?.slice(10)
  ?? new URL('qa-fixtures/consumer95/public-nv-catalogue.projected.json', root);
const capture = JSON.parse(readFileSync(capturePath, 'utf8'));
const recorded = capture.reads.filter((r: { case: string }) => r.case === 'public-nv-control');
assert.equal(recorded.length, 3);
const detail = recorded[2].body;
const row = { id: 'controlled-wine', kind: 'wine' as const, name: detail.name, producer: detail.winery,
  sourceText: detail.name, pageIds: [], reviewed: true, manual: true };
const profile = { potente: 2, acidez: 4, dulce: 1, tanico: 0, afrutado: 1 };

async function main() {
  const resolved = await lookupWinerimOriginalSheet(row, undefined, async input => {
    const record = recorded.find((r: { url: string }) => r.url === String(input));
    assert(record, 'No real fetch fallback is permitted');
    return new Response(JSON.stringify(record.body), { status: record.status, headers: { 'content-type': 'application/json' } });
  });
  assert.equal(resolved.status, 'verified');
  if (resolved.status !== 'verified') throw new Error('Recorded La Gitana detail did not verify');
  const sheet = resolved.sheet;
  await check('Actual Restaurant adapter preserves captured original zero on explicit Winerim scale', () => {
    const result = nativeResult(row, sheet, profile);
    assert.equal(result.state, 'ready');
    if (result.state === 'ready') {
      assert.equal(result.score, 93);
      assert.equal(result.dimensions.find(d => d.key === 'tanico')?.wineValue, 0);
    }
  });
  await check('Actual Restaurant adapter preserves decimals, not integer-normalized source values', () => {
    const current = { ...sheet, sensoryAttributes: { ...sheet.sensoryAttributes!, power: 2.4, acidity: 4.75 } };
    const result = nativeResult(row, current, { ...profile, potente: 2.4, acidez: 4.75 });
    assert.equal(result.state, 'ready');
    if (result.state === 'ready') {
      assert.equal(result.score, 93);
      assert.equal(result.dimensions.find(d => d.key === 'potente')?.wineValue, 2.4);
      assert.equal(result.dimensions.find(d => d.key === 'acidez')?.wineValue, 4.75);
      assert.equal(result.dimensions.find(d => d.key === 'tanico')?.wineValue, 0);
    }
  });
  for (const [label, currentRow, currentSheet] of [
    ['wrong producer', { ...row, producer: 'Other producer' }, sheet],
    ['edited vintage', { ...row, vintage: '2021' }, sheet],
    ['edited cuvee', { ...row, name: 'Manzanilla La Gitana Reserva' }, sheet],
    ['discarded/missing row', null, sheet],
    ['food row', { ...row, kind: 'food' }, sheet],
    ['wrong returned sheet', row, { ...sheet, name: 'Another Wine' }],
    ['unverified detail', row, { ...sheet, detailVerified: false }],
    ['mismatched public URL ID', row, { ...sheet, url: sheet.url!.replace('278688', '278689') }],
  ] as const) await check(label + ' cannot show a stale or mixed personal score', () => {
    const result = nativeResult(currentRow, currentSheet, profile);
    assert.equal(result.state, 'pending');
    if (result.state === 'pending') assert.equal(result.reason, 'identity');
    assert.equal('score' in result, false); assert.equal('dimensions' in result, false);
  });
  await check('Missing profile stays pending with a test action, not a negative recommendation', () => {
    const result = nativeResult(row, sheet, null);
    assert.equal(result.state, 'pending');
    if (result.state === 'pending') assert.equal(result.reason, 'profile');
  });
  for (const value of [null, { ...sheet.sensoryAttributes!, tannin: -1 }, { ...sheet.sensoryAttributes!, power: 5.1 }, { ...sheet.sensoryAttributes!, acidity: NaN }]) {
    await check('Absent/invalid original axes do not become defaults or scores', () => {
      const result = nativeResult(row, { ...sheet, sensoryAttributes: value }, profile);
      assert.equal(result.state, 'pending');
      if (result.state === 'pending') assert.equal(result.reason, 'sensory');
    });
  }
  await check('No mutation of row, original sheet or profile', () => {
    const before = JSON.stringify({ row, sheet, profile });
    for (let i = 0; i < 5; i++) nativeResult(row, sheet, profile);
    assert.equal(JSON.stringify({ row, sheet, profile }), before);
  });
  await check('Native summary is once, before optional fiche, with no legacy percentage rail', () => {
    let nativeBranch: ts.ConditionalExpression | undefined;
    const visit = (node: ts.Node) => {
      if (ts.isConditionalExpression(node) && node.condition.getText(ast) === 'native'
        && node.whenTrue.getText(ast).includes('nativeRestaurantAffinity95')) nativeBranch = node;
      node.forEachChild(visit);
    };
    visit(ast); assert(nativeBranch);
    const text = nativeBranch.whenTrue.getText(ast);
    assert.equal((text.match(/<NativeAffinitySummary/g) || []).length, 1);
    assert(text.indexOf('<NativeAffinitySummary') < text.indexOf('<WinerimOriginalSheet'));
    assert(text.includes('<details')); assert(text.includes('isVerifiedWinerimSheetForIdentity(row, sheet)'));
    assert.doesNotMatch(text, /AffinityExplanation|Afinidad contigo|affinity}%/);
    const baseline = execFileSync('git', ['show', 'c25b28287d431e50239e45a25baebe8965f5077d:src/pages/Restaurant.tsx'], { cwd: new URL('.', root), encoding: 'utf8' });
    const oldAst = ts.createSourceFile('old.tsx', baseline, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let oldFragment: ts.JsxFragment | undefined;
    const findOld = (node: ts.Node) => {
      if (ts.isJsxFragment(node) && node.getText(oldAst).startsWith('<><WinerimOriginalSheet sheet={sheet}')) oldFragment = node;
      node.forEachChild(findOld);
    };
    findOld(oldAst); assert(oldFragment);
    assert.equal(nativeBranch.whenFalse.getText(ast), oldFragment.getText(oldAst), 'Legacy web JSX is byte-identical');
    const legacyAttributes = local.get('attributes')!.getText(ast);
    assert(legacyAttributes.includes('!native && sheet?.sensoryAttributes'));
  });
  await check('Actual legacy web adapter/calculation remains unchanged, including its legacy scale', () => {
    const web = vm.createContext({ sheet, profile: { profile }, native: false, calculateLocalMatchrimAffinity });
    vm.runInContext(compile(local.get('attributes')!.getText(ast) + '\n' + local.get('affinity')!.getText(ast)
      + '\nglobalThis.score = affinity; globalThis.attributesOut = attributes;'), web);
    assert.equal(web.score, 83);
    assert.equal(web.attributesOut.taninos, 0);
    assert.equal(web.attributesOut.scale, undefined);
    assert.equal(nativeResult(row, sheet, profile).state, 'ready');
  });

  const deferred = () => { let resolve!: (value: unknown) => void; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
  const inspection = (lookup: () => Promise<unknown>, load: () => Promise<unknown>) => {
    const commits: unknown[] = [], errors: string[] = [], profileCommits: unknown[] = [];
    const stateRef = { current: { version: 1, rows: [row], pages: [], documents: [], pairs: [], pairWarnings: [] } };
    const request = { current: null as AbortController | null };
    const c = vm.createContext({ AbortController, DOMException, native: true, mounted: { current: true }, stateRef, request,
      user: { id: 'synthetic-only' }, lookupWinerimOriginalSheet: lookup, loadMatchrimScanProfile: load,
      activeRestaurantRows91, isVerifiedWinerimSheetForIdentity,
      message: (error: Error) => error.message, stopped: (signal: AbortSignal) => { if (signal.aborted) throw new DOMException('Cancelled', 'AbortError'); },
      setBusy: () => {}, setProgress: () => {}, setSheetRow: () => {}, setError: (s: string) => errors.push(s),
      setSheet: (s: unknown) => commits.push(s), setProfile: (p: unknown) => profileCommits.push(p) });
    vm.runInContext(compile(['start', 'finish', 'check', 'inspectWine'].map(name => local.get(name)!.getText(ast)).join('\n')
      + '\nglobalThis.inspect = inspectWine;'), c);
    return { c, stateRef, request, commits, errors, profileCommits, run: () => c.inspect(row) as Promise<void> };
  };
  await check('Actual inspectWine ignores lookup transport that resolves after cancellation', async () => {
    const late = deferred(); let profiles = 0;
    const run = inspection(() => late.promise, async () => { profiles++; return { profile }; });
    const pending = run.run(); run.request.current!.abort(); late.resolve(resolved); await pending;
    assert.deepEqual(run.commits, [null]); assert.equal(profiles, 0);
  });
  await check('Actual inspectWine revalidates the edited current row after profile loading', async () => {
    const late = deferred();
    const run = inspection(async () => resolved, () => late.promise);
    const pending = run.run(); await Promise.resolve(); await Promise.resolve();
    run.stateRef.current.rows = [{ ...row, producer: 'Edited producer' }];
    late.resolve({ profile }); await pending;
    assert.deepEqual(run.commits, [null]); assert(run.errors.some(e => e.includes('lectura ha cambiado')));
    assert.deepEqual(run.profileCommits, [null]);
  });
  await check('Actual inspectWine ignores a late aborted profile result', async () => {
    const late = deferred(); const run = inspection(async () => resolved, () => late.promise);
    const pending = run.run(); await Promise.resolve(); await Promise.resolve();
    run.request.current!.abort(); late.resolve({ profile }); await pending;
    assert.deepEqual(run.commits, [null]); assert.deepEqual(run.profileCommits, [null]);
  });
  console.log(JSON.stringify({ passed: true, groups, source: 'Actual Restaurant.tsx function/closures extracted via TypeScript AST, shared guards/formula executed unchanged',
    capturedSource: capturePath, newNetworkCalls: 0, models: 0, formulaChanged: false, legacyWebJsxExact: true }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
