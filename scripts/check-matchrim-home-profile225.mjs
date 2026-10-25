import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

// Execute the actual Home controller with synthetic auth/database transports.
// This covers post-effect fallback behavior, not server RLS or native pixels.
const file = 'src/pages/Index.tsx';
const source = fs.readFileSync(file, 'utf8');
const compileBody = text => {
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return tree.statements.filter(node => !ts.isImportDeclaration(node) && !ts.isExportAssignment(node))
    .map(node => node.getText(tree)).join('\n');
};
const local = { potente: 5, acidez: 1, dulce: 0, tanico: 5, afrutado: 2 };
const current = { potente: 1, acidez: 4, dulce: 2, tanico: 0, afrutado: 5 };
const mount = ({ native = true, owner = 'qa-current', profile = null, profileError = false, winesError = false,
  sourceText = source, recommendationsPending = false, databasePending = false } = {}) => {
  const slots = [], effects = [], reads = [], requests = [], storageWrites = [];
  let cursor = 0, dirty = true, auth = { user: owner ? { id: owner } : null, loading: false }, result;
  let response = { profile, profileError, winesError };
  const deadlines = new Map(); let nextTimer = 0;
  const context = { exports: {}, console: { error() {} }, AbortController, DOMException, window: { setTimeout, clearTimeout },
    setTimeout: callback => { const id = ++nextTimer; deadlines.set(id, callback); return id; },
    clearTimeout: id => deadlines.delete(id), Promise, Capacitor: { isNativePlatform: () => native },
    useAuth: () => auth, readMatchrimLocalProfile: () => ({ ...local }),
    calculateLearnedMatchrimProfile: value => ({ profile: value, samples: 0, confidence: 0 }),
    cellarTrainingRows: value => value, generateMatchrimCode: value => JSON.stringify(value),
    selectUnseenWineRecommendations: wines => ({ recommendations: wines, exhausted: false }),
    fetchWinesByAttributes: async value => { requests.push(value); return recommendationsPending ? new Promise(() => {}) : []; },
    localStorage: { setItem: (...args) => storageWrites.push(args) }, NativeAppHome: () => null,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], update => { const next = typeof update === 'function' ? update(slots[i]) : update;
        if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true; } }]; },
    useMemo: (work, deps) => { const i = cursor++, previous = slots[i];
      if (!previous || deps.some((value, n) => !Object.is(value, previous.deps[n]))) slots[i] = { deps, value: work() };
      return slots[i].value; },
    useEffect: (work, deps) => { const i = cursor++, previous = slots[i];
      if (!previous || deps.some((value, n) => !Object.is(value, previous.deps[n]))) {
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = work(); }); slots[i] = { deps }; } },
    supabase: { from: table => {
      const observed = { table, filters: [] }; reads.push(observed);
      const chain = { select: () => chain, eq: (key, value) => { observed.filters.push([key, value]); return chain; },
        order: () => chain, limit: () => chain, abortSignal: () => chain,
        maybeSingle: () => chain, then: (resolve, reject) => (databasePending ? new Promise(() => {}) : Promise.resolve(table === 'quiz_results'
          ? { data: response.profile, error: response.profileError ? new Error('Synthetic read failure') : null }
          : { data: [], error: response.winesError ? new Error('Synthetic wines failure') : null })).then(resolve, reject) };
      return chain;
    } }, require: id => { assert.equal(id, 'react/jsx-runtime'); return jsx; },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/nativeHomeRead225.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  context.withNativeHomeRead225 = context.exports.withNativeHomeRead225;
  vm.runInNewContext(ts.transpileModule(compileBody(sourceText) + '\nexports.render = Index;', { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText, context);
  const render = () => { cursor = 0; dirty = false; result = context.exports.render(); return result.props; };
  const settle = async () => {
    for (let i = 0; i < 20; i++) { if (dirty) render(); while (effects.length) effects.shift()();
      await new Promise(resolve => setImmediate(resolve)); if (!dirty && !effects.length) return result.props; }
    throw new Error('Home did not settle');
  };
  render();
  return { settle, render, requests, reads, storageWrites,
    deadlines, expire: () => { for (const callback of [...deadlines.values()]) callback(); },
    changeOwner: id => { auth = { user: id ? { id } : null, loading: false }; dirty = true; },
    respond: next => { response = { ...response, ...next }; },
    dispose: () => { for (const value of slots) value?.cleanup?.(); },
  };
};
let groups = 0;
const test = async (name, work) => { await work(); groups++; console.log('PASS ' + name); };
await test('Signed-in native Home never treats an unrelated local test as this account\'s missing test', async () => {
  const h = mount(); try {
    const view = await h.settle(); assert.equal(view.activeProfile, null); assert.equal(view.hasQuizResults, false);
    assert.equal(h.requests.length, 0, 'No recommendation may use an unconfirmed cached vector');
  } finally { h.dispose(); }
});
await test('A failed native profile read is explicit and retryable, not a local-profile recommendation', async () => {
  const h = mount({ profileError: true }); try {
    const view = await h.settle(); assert.equal(view.activeProfile, null); assert.equal(h.requests.length, 0);
    assert.equal(view.nativeHomeReadError, 'profile'); assert.equal(typeof view.onRetryNativeHome, 'function');
    h.respond({ profile: current, profileError: false }); view.onRetryNativeHome();
    const retried = await h.settle(); assert.deepEqual(JSON.parse(JSON.stringify(retried.activeProfile)), current);
    assert.equal(retried.nativeHomeReadError, null); assert.equal(h.requests.length, 1);
    assert.equal(h.storageWrites.length, 0, 'Signed-in native reads must not overwrite anonymous quiz storage');
  } finally { h.dispose(); }
});
await test('Missing wine history does not silently remove exclusion and learning evidence', async () => {
  const h = mount({ profile: current, winesError: true }); try {
    const view = await h.settle(); assert.equal(view.nativeHomeReadError, 'wines');
    assert.equal(h.requests.length, 0); assert.equal(view.activeProfile, null);
  } finally { h.dispose(); }
});
await test('Incomplete and out-of-range native server profiles cannot become recommendations', async () => {
  for (const profile of [{ ...current, dulce: undefined }, { ...current, acidez: 6 }, { ...current, potente: NaN }]) {
    const h = mount({ profile }); try {
      const view = await h.settle(); assert.equal(view.nativeHomeReadError, 'profile');
      assert.equal(view.activeProfile, null); assert.equal(h.requests.length, 0);
    } finally { h.dispose(); }
  }
});
await test('Fifty post-effect native account switches do not borrow a missing account\'s local vector', async () => {
  const h = mount({ profile: current }); try {
    await h.settle();
    for (let n = 0; n < 50; n++) {
      h.respond({ profile: null }); h.changeOwner('synthetic-missing-' + n);
      const immediate = h.render(); assert.equal(immediate.activeProfile, null);
      const settled = await h.settle(); assert.equal(settled.activeProfile, null); assert.equal(settled.hasQuizResults, false);
    }
    assert.equal(h.requests.length, 1);
    for (const read of h.reads) assert(read.filters.some(([key, value]) => key === 'user_id' && value.startsWith('synthetic-') || key === 'user_id' && value === 'qa-current'));
  } finally { h.dispose(); }
});
await test('Anonymous native Home retains its local quiz without database reads', async () => {
  const h = mount({ owner: null }); try {
    const view = await h.settle(); assert.deepEqual(JSON.parse(JSON.stringify(view.activeProfile)), local);
    assert.equal(h.reads.length, 0); assert.equal(h.requests.length, 1);
  } finally { h.dispose(); }
});
await test('Leaving a pending native recommendation for a missing account clears its loading state', async () => {
  const h = mount({ profile: current, recommendationsPending: true }); try {
    assert.equal((await h.settle()).loadingRecommendations, true);
    h.respond({ profile: null }); h.changeOwner('synthetic-missing-after-pending');
    const view = await h.settle(); assert.equal(view.loadingRecommendations, false);
    assert.equal(view.activeProfile, null); assert.equal(h.requests.length, 1);
  } finally { h.dispose(); }
});
await test('A hung native account read has a bounded timeout, retry UI and no borrowed profile', async () => {
  const h = mount({ databasePending: true }); try {
    const loading = await h.settle(); assert.equal(loading.loadingCode, true); assert.equal(h.deadlines.size, 1);
    h.expire(); const view = await h.settle();
    assert.equal(view.loadingCode, false); assert.equal(view.nativeHomeReadError, 'profile');
    assert.equal(view.activeProfile, null); assert.equal(h.requests.length, 0); assert.equal(h.deadlines.size, 0);
  } finally { h.dispose(); }
});
await test('Web keeps its existing missing-profile local fallback', async () => {
  const h = mount({ native: false }); try {
    const view = await h.settle(); assert.equal(view.activeProfile, null); assert.equal(view.hasQuizResults, true);
    assert.deepEqual(JSON.parse(JSON.stringify(h.requests.at(-1))), local);
  } finally { h.dispose(); }
});
await test('Actual web Home controller and full nonnative Home JSX retain their prior behavior', async () => {
  const baseline = execFileSync('git', ['show', 'feaa229:' + file], { encoding: 'utf8' });
  for (const patch of [{}, { profile: current }, { profileError: true }, { profile: current, winesError: true }]) {
    const before = mount({ ...patch, native: false, sourceText: baseline }), after = mount({ ...patch, native: false });
    try {
      const oldProps = await before.settle(), newProps = await after.settle();
      const projection = value => JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(value)
        .filter(([key]) => !['nativeHomeReadError', 'onRetryNativeHome'].includes(key)))));
      assert.deepEqual(projection(newProps), projection(oldProps));
      assert.deepEqual(after.requests, before.requests); assert.deepEqual(after.storageWrites, before.storageWrites);
      assert.deepEqual(after.reads, before.reads);
    } finally { before.dispose(); after.dispose(); }
  }
  const path = 'src/components/NativeAppHome.tsx';
  const lastReturn = text => {
    const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let component; const find = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'NativeAppHome') component = node.initializer;
      ts.forEachChild(node, find); }; find(ast);
    return component.body.statements.filter(ts.isReturnStatement).at(-1).getText(ast);
  };
  assert.equal(lastReturn(fs.readFileSync(path, 'utf8')), lastReturn(execFileSync('git', ['show', 'feaa229:' + path], { encoding: 'utf8' })));
});
console.log(JSON.stringify({ passed: true, groups, syntheticOwnerTransitions: 50, externalRequests: 0,
  scope: 'Actual Home controller with in-memory auth, query, learning and recommendation transports; not real accounts, catalogue, RLS or native visual QA.' }));
