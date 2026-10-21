import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('src/pages/Matchrim.tsx', 'utf8');
const tree = ts.createSourceFile('Matchrim.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.equal(tree.parseDiagnostics.length, 0);
const declarations = new Map();
let historyEffect;
const visit = node => {
  if (ts.isVariableDeclaration(node) && node.initializer) declarations.set(node.name.getText(tree), node.initializer.getText(tree));
  if (ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
    && node.arguments[0].getText(tree).includes('const loadSavedResults')) historyEffect = node.arguments[0];
  ts.forEachChild(node, visit);
};
visit(tree);
assert(historyEffect);
const compile = input => ts.transpileModule(input, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
} }).outputText;
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
const row = { potente: 1.2, acidez: 0, dulce: 3.4, tanico: 2, afrutado: 5 };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
let groups = 0;
const check = async (name, task) => { await task(); groups++; console.log('PASS ' + name); };

// Execute AST-extracted production components, hooks, dependencies and handlers.
const run = ({ native = true, user = { id: 'owner-a' }, loading = false, reader = async () => [], cache = null, parameters = '' } = {}) => {
  const slots = [], effects = [], timers = new Map(), calls = [], storage = [];
  let cursor = 0, dirty = true, output, timerId = 0, currentReader = reader;
  const auth = { user, loading };
  const el = (type, props, ...children) => ({ type, props: { ...props, children } });
  const sandbox = {
    exports: {}, React: { createElement: el, Fragment: 'fragment' }, AbortController, Promise, Error,
    Capacitor: { isNativePlatform: () => native }, useAuth: () => auth,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { const next = typeof value === 'function' ? value(slots[index]) : value;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; } }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(callback, deps) {
      const index = cursor++, old = slots[index];
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
        slots[index] = { deps, cleanup: old?.cleanup };
        effects.push(() => { slots[index].cleanup?.(); slots[index].cleanup = callback(); });
      }
    },
    useQuizResults: () => ({ getQuizHistory: currentReader, saveQuizResult() { throw Error('unexpected quiz write'); }, isSaving: false }),
    useNavigate: () => navigate, useSearchParams: () => [new URLSearchParams(parameters)],
    getSafeRedirectPath: (_value, fallback) => fallback,
    readMatchrimLocalProfile: () => { storage.push('profile-read'); return cache; },
    localStorage: { getItem: key => { storage.push(key); return null; },
      setItem() { throw Error('unexpected storage write'); }, removeItem() { throw Error('unexpected storage removal'); } },
    window: { setTimeout(callback, ms) { const id = ++timerId; timers.set(id, { callback, ms }); return id; },
      clearTimeout(id) { timers.delete(id); } },
    getDiverseWineRecommendations: async () => [], generateWineStyles: () => [], getProfileDescription: () => 'saved',
    questions: [{ id: 1 }], console,
  };
  const navigate = () => {};
  for (const name of ['QuizIntro', 'QuizQuestion', 'QuizResults', 'AppNav', 'MobileBottomNav', 'Button', 'Card', 'CardContent',
    'ArrowLeft', 'CheckCircle', 'Loader2', 'RefreshCw', 'Wine']) sandbox[name] = name;
  const track = fn => (...args) => { calls.push(args); return fn(...args); };
  currentReader = track(reader);
  const names = ['NativeMatchrimLoading', 'MatchrimSession', 'Matchrim'];
  vm.runInNewContext(compile(names.map(name => `const ${name} = ${declarations.get(name)};`).join('\n')
    + '\nObject.assign(exports, { NativeMatchrimLoading, MatchrimSession, Matchrim });'), sandbox);
  const render = () => {
    cursor = 0; dirty = false; output = sandbox.exports.MatchrimSession();
    while (effects.length) effects.shift()();
    return output;
  };
  const settle = async () => { for (let i = 0; i < 5; i++) { await flush(); if (dirty) render(); } };
  const nodes = (node = output) => !node || typeof node !== 'object' ? []
    : [node, ...(node.props?.children ?? []).flat(Infinity).flatMap(child => nodes(child))];
  const find = type => nodes().find(node => node.type === type || node.type?.name === type);
  const text = node => typeof node === 'string' ? node : (node?.props?.children ?? []).flat(Infinity).map(text).join(' ');
  const retry = () => nodes().find(node => node.type === 'Button' && text(node).includes('Reintentar')).props.onClick;
  const cleanup = () => { for (const slot of slots) slot?.cleanup?.(); };
  render();
  return { calls, timers, storage, auth, render, settle, find, nodes, text, retry, cleanup,
    wrapper: () => sandbox.exports.Matchrim(), loadingBand: () => sandbox.exports.NativeMatchrimLoading(),
    changeReader: fn => { currentReader = track(fn); },
    started: () => { const index = slots.findIndex(slot => slot && typeof slot === 'object' && 'current' in slot); slots[index].current = true; },
  };
};

await check('Native auth resolution gates the owner-keyed session; web keeps the exact session tree', async () => {
  for (const user of [null, { id: 'old-owner' }]) {
    const job = run({ user, loading: true });
    assert.equal(job.wrapper().type.name, 'NativeMatchrimLoading');
    job.auth.loading = false;
    assert.equal(job.wrapper().type.name, 'MatchrimSession');
    assert.equal(job.wrapper().props.key, user?.id ?? 'anonymous');
    job.cleanup();
  }
  const web = run({ native: false, user: null, loading: true });
  assert.equal(web.wrapper().type.name, 'MatchrimSession'); assert.equal(web.wrapper().props.key, 'anonymous');
});

await check('Native pending load hides intro/results and preserves the exact saved vector on success', async () => {
  const read = deferred(), job = run({ reader: () => read.promise });
  assert(job.find('NativeMatchrimLoading')); assert(!job.find('QuizIntro')); assert(!job.find('QuizResults'));
  assert.equal(job.calls[0][0].throwOnError, true); assert(job.calls[0][0].signal instanceof AbortSignal);
  read.resolve([row]); await job.settle();
  assert.deepEqual({ ...job.find('QuizResults').props.result }, row); assert(!job.find('QuizIntro'));
  assert.equal(job.timers.size, 0); assert.equal(job.storage.length, 0);
});

await check('Genuine empty native history alone exposes intro; guest cached profile still works without a read', async () => {
  const empty = run(); await empty.settle(); assert(empty.find('QuizIntro')); assert(!empty.find('QuizResults'));
  const guest = run({ user: null, cache: row }); await guest.settle();
  assert.equal(guest.calls.length, 0); assert.deepEqual(guest.find('QuizResults').props.result, row);
  assert(guest.storage.includes('profile-read'));
});
await check('Explicit native retake reaches intro without erasing or saving the existing profile; web ignores the opt-in', async () => {
  const original = Object.freeze({ ...row });
  const native = run({ parameters: 'retake=1', reader: async () => [original] }); await native.settle();
  assert(native.find('QuizIntro')); assert(!native.find('QuizResults')); assert.equal(native.calls.length, 1);
  assert.deepEqual(original, row); assert.equal(native.storage.length, 0);
  const web = run({ native: false, parameters: 'retake=1', reader: async () => [original] }); await web.settle();
  assert(web.find('QuizResults')); assert(!web.find('QuizIntro'));
  const profile = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
  const profileTree = ts.createSourceFile('Profile.tsx', profile, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let action;
  const findAction = node => {
    if (ts.isJsxElement(node) && node.children.some(child => ts.isJsxText(child) && child.getText(profileTree).trim() === 'Realizar Nuevo Test'))
      action = node.openingElement.attributes.properties.find(attribute => attribute.name?.getText(profileTree) === 'onClick')?.initializer.expression.getText(profileTree);
    ts.forEachChild(node, findAction);
  };
  findAction(profileTree); assert(action);
  for (const [isNative, expected] of [[true, '/matchrim?retake=1'], [false, '/']]) {
    const calls = []; const box = { exports: {}, isNative, navigate: target => calls.push(target) };
    vm.runInNewContext(compile('exports.action = ' + action), box); box.exports.action(); assert.deepEqual(calls, [expected]);
  }
});

await check('Failure shows native unframed retry band and repeated retry clicks issue only one new read', async () => {
  const job = run({ reader: async () => { throw Error('offline'); } }); await job.settle();
  assert(!job.find('QuizIntro')); assert(!job.find('QuizResults'));
  const alert = job.nodes().find(node => node.props.role === 'alert');
  assert(job.text(alert).includes('No necesitas repetirlo')); assert(job.text(alert).includes('test guardado'));
  assert(!job.find('Card')); assert(job.find('RefreshCw'));
  assert(job.nodes().filter(node => node.type === 'Button').every(node => node.props.className.includes('min-h-11')));
  assert(job.nodes().some(node => node.props.style?.paddingBottom.includes('7rem')));
  const next = deferred(); job.changeReader(() => next.promise);
  const retry = job.retry(); retry(); retry(); job.render(); retry();
  assert.equal(job.calls.length, 2); assert(job.find('NativeMatchrimLoading'));
  next.resolve([row]); await job.settle(); assert(job.find('QuizResults')); assert.equal(job.timers.size, 0);
});

await check('12-second deadline aborts and ignores late results; retry can recover to genuine empty', async () => {
  const read = deferred(), job = run({ reader: () => read.promise });
  assert.equal(job.timers.size, 1); const timer = [...job.timers.values()][0]; assert.equal(timer.ms, 12000);
  timer.callback(); await job.settle(); assert.equal(job.calls[0][0].signal.aborted, true);
  assert(job.nodes().some(node => node.props.role === 'alert'));
  read.resolve([row]); await job.settle(); assert(!job.find('QuizResults'));
  job.changeReader(async () => []); job.retry()(); job.render(); await job.settle(); assert(job.find('QuizIntro'));
});

await check('Unmount and owner replacement abort stale reads without leaking old-owner or anonymous cache', async () => {
  const read = deferred(), old = run({ reader: () => read.promise, cache: row }); old.cleanup();
  assert.equal(old.calls[0][0].signal.aborted, true); assert.equal(old.timers.size, 0);
  const replacement = run({ user: { id: 'owner-b' }, reader: async () => [] });
  assert.equal(replacement.wrapper().props.key, 'owner-b');
  read.resolve([row]); await old.settle(); await replacement.settle();
  assert(!old.find('QuizResults')); assert(replacement.find('QuizIntro')); assert.equal(old.storage.length, 0);
});

await check('Late success, failure and retry never overwrite an already started quiz', async () => {
  for (const failure of [false, true]) {
    const read = deferred(), job = run({ reader: () => read.promise }); job.started();
    if (failure) read.reject(Error('late')); else read.resolve([row]);
    await job.settle(); assert(!job.find('QuizResults')); assert(!job.nodes().some(node => node.props.role === 'alert'));
  }
  const job = run({ reader: async () => { throw Error('offline'); } }); await job.settle();
  const retry = job.retry(); job.started(); retry(); job.render(); await job.settle(); assert.equal(job.calls.length, 1);
});

await check('Unrelated renders and same-owner auth/reader identity changes do not rerun native history', async () => {
  const job = run(); await job.settle();
  job.auth.user = { id: 'owner-a' }; job.changeReader(async () => [row]); job.render(); await job.settle();
  assert.equal(job.calls.length, 1); assert(job.find('QuizIntro'));
  job.find('QuizIntro').props.onStart(); job.render(); assert(job.find('QuizQuestion'));
  job.render(); await job.settle(); assert.equal(job.calls.length, 1);
});

await check('Actual start/restart handlers refuse native authenticated loading/error but leave web and guests unchanged', async () => {
  for (const name of ['handleStart', 'handleRestartQuiz']) {
    for (const status of ['loading', 'error', 'ready']) {
      for (const [isNative, user] of [[true, { id: 'owner' }], [false, { id: 'owner' }], [true, null]]) {
        const events = [], sandbox = { exports: {}, isNative, user, nativeHistoryStatus: status, isSaving: false,
          nativeSaveStatus: 'idle', hasStartedQuiz: { current: false }, saveLifetime: { current: { generation: 0 } },
          nativeSubmissionPending: { current: false }, localStorage: { removeItem: key => events.push(key) } };
        for (const setter of ['setCurrentStep', 'setCurrentQuestionIndex', 'setAnswers', 'setQuizResult', 'setRecommendations', 'setNativeSaveStatus'])
          sandbox[setter] = value => events.push([setter, value]);
        vm.runInNewContext(compile('exports.handler = ' + declarations.get(name)), sandbox); sandbox.exports.handler();
        const blocked = isNative && user && status !== 'ready';
        assert.equal(events.length === 0, Boolean(blocked)); assert.equal(sandbox.hasStartedQuiz.current, !blocked);
      }
    }
  }
});

await check('Web keeps default history call, intro while pending, saved results and no native DOM/timers', async () => {
  const read = deferred(), job = run({ native: false, reader: () => read.promise });
  assert(job.find('QuizIntro')); assert.equal(job.calls[0].length, 0); assert.equal(job.timers.size, 0);
  assert(!job.find('NativeMatchrimLoading')); assert(!job.find('RefreshCw'));
  read.resolve([row]); await job.settle(); assert.deepEqual({ ...job.find('QuizResults').props.result }, row);
  assert(!job.nodes().some(node => node.props.role === 'alert' || node.props.role === 'status'));
  const empty = run({ native: false }); await empty.settle(); assert(empty.find('QuizIntro'));
  const band = job.loadingBand(); assert.equal(band.props.children[0].props.role, 'status');
});

console.log(JSON.stringify({ groups, networkCalls: 0, accountWrites: 0, quizWrites: 0,
  scope: 'AST-extracted Matchrim components/effects/handlers with in-memory React hooks, readers and timers; no visual/native QA' }));
