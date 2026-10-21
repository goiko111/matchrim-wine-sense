import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
const hookSource = fs.readFileSync('src/hooks/useQuizResults.ts', 'utf8');
const tree = ts.createSourceFile('Profile.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effect;
const visit = node => {
  if (ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
    && node.arguments[0].getText(tree).includes('const loadQuizHistory')) effect = node.arguments[0].getText(tree);
  ts.forEachChild(node, visit);
};
visit(tree); assert(effect);
const hookTree = ts.createSourceFile('hook.ts', hookSource, ts.ScriptTarget.Latest, true);
let reader;
const findReader = node => {
  if (ts.isVariableDeclaration(node) && node.name.getText(hookTree) === 'getQuizHistory')
    reader = node.initializer.arguments[0].getText(hookTree);
  ts.forEachChild(node, findReader);
};
findReader(hookTree); assert(reader);
const compile = input => ts.transpileModule(input, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
let groups = 0;
const check = async (name, task) => { await task(); groups++; console.log('PASS ' + name); };
const read = async ({ user = { id: 'qa-owner' }, data = [], error = null, throws = false, options } = {}) => {
  const calls = [], chain = {
    select(value) { calls.push(['select', value]); return this; }, eq(key, value) { calls.push(['eq', key, value]); return this; },
    order(key, value) { calls.push(['order', key, value]); return this; },
    abortSignal(value) { calls.push(['signal', value]); return this; },
    then(yes, no) { return (throws ? Promise.reject(new Error('transport')) : Promise.resolve({ data, error })).then(yes, no); },
  };
  const sandbox = { exports: {}, user, console: { error() {} }, supabase: { from(name) { calls.push(['from', name]); return chain; } } };
  vm.runInNewContext(compile('exports.read = ' + reader), sandbox);
  return { value: await sandbox.exports.read(options), calls };
};
const run = (native, getQuizHistory, overrides = {}) => {
  const events = [], calls = [], timers = new Map(); let sequence = 0;
  const sandbox = { exports: {}, AbortController, Promise, Error, authLoading: false, user: { id: 'qa-owner' }, isNative: native,
    getQuizHistory: (...args) => { calls.push(args); return getQuizHistory(...args); },
    navigate: target => events.push(['navigate', target]), buildAuthRedirectPath: value => '/auth?redirect=' + value,
    setIsLoadingProfile: value => events.push(['loading', value]), setNativeHistoryError: value => events.push(['error', value]),
    setQuizHistory: value => events.push(['history', value]), setCurrentProfile: value => events.push(['profile', value]),
    window: { setTimeout(callback, ms) { const id = ++sequence; timers.set(id, { callback, ms }); return id; }, clearTimeout(id) { timers.delete(id); } },
    ...overrides,
  };
  vm.runInNewContext(compile('exports.effect = ' + effect), sandbox);
  const cleanup = sandbox.exports.effect();
  return { events, calls, timers, cleanup };
};

await check('Default history transport keeps legacy successful and error behavior', async () => {
  const row = { id: 'saved-test' };
  assert.deepEqual((await read({ data: [row] })).value, [row]);
  assert.equal((await read({ error: { message: 'failed' } })).value.length, 0);
  assert.equal((await read({ throws: true })).value.length, 0);
});
await check('Strict native history distinguishes server/transport failures from a genuinely empty history', async () => {
  await assert.rejects(read({ error: { message: 'failed' }, options: { throwOnError: true } }));
  await assert.rejects(read({ throws: true, options: { throwOnError: true } }));
  assert.deepEqual((await read({ data: [], options: { throwOnError: true } })).value, []);
});
await check('History remains owner-scoped and forwards only the optional abort signal', async () => {
  const signal = new AbortController().signal;
  const result = await read({ options: { signal, throwOnError: true } });
  assert(result.calls.some(([name, key, value]) => name === 'eq' && key === 'user_id' && value === 'qa-owner'));
  assert(result.calls.some(([name, value]) => name === 'signal' && value === signal));
  assert.equal((await read({ user: null })).calls.length, 0);
});
await check('Successful native history clears stale data then preserves the actual saved profile', async () => {
  const row = { id: 'saved-test' }; const job = run(true, async () => [row]); await flush();
  assert.equal(job.calls[0][0].throwOnError, true);
  assert(job.events.some(([type, value]) => type === 'history' && Array.isArray(value) && value.length === 0));
  assert.equal(job.events.findLast(([type]) => type === 'profile')[1], row);
  assert.equal(job.events.findLast(([type]) => type === 'loading')[1], false);
  assert.equal(job.timers.size, 0);
});
await check('Native transport failure shows retry state instead of an empty-profile success', async () => {
  const job = run(true, async () => { throw new Error('offline'); }); await flush();
  assert.equal(job.events.findLast(([type]) => type === 'error')[1], true);
  assert.equal(job.events.findLast(([type]) => type === 'loading')[1], false);
});
await check('Native deadline is bounded to12 seconds and aborts the actual request', async () => {
  const job = run(true, () => new Promise(() => {}));
  assert.equal(job.timers.size, 1); const timer = [...job.timers.values()][0]; assert.equal(timer.ms, 12000);
  timer.callback(); await flush(); assert.equal(job.calls[0][0].signal.aborted, true);
  assert.equal(job.events.findLast(([type]) => type === 'error')[1], true);
  assert.equal(job.events.findLast(([type]) => type === 'loading')[1], false);
});
await check('Unmount/owner replacement aborts and ignores late completion', async () => {
  let finish; const job = run(true, () => new Promise(resolve => { finish = resolve; }));
  job.cleanup(); const before = job.events.length; finish([{ id: 'previous-owner' }]); await flush();
  assert.equal(job.calls[0][0].signal.aborted, true); assert.equal(job.timers.size, 0); assert.equal(job.events.length, before);
});
await check('Legacy web does not opt into strict mode, abort, timeout or native error UI', async () => {
  const job = run(false, async () => []); await flush();
  assert.equal(job.calls[0].length, 0); assert.equal(job.timers.size, 0);
  assert(!job.events.some(([type]) => type === 'error'));
});
await check('Genuine empty history remains a completed load; anonymous state navigates without reading', async () => {
  const job = run(true, async () => []); await flush();
  assert.equal(job.events.findLast(([type]) => type === 'error')[1], false);
  assert.equal(job.events.findLast(([type]) => type === 'profile')[1], null);
  const anonymous = run(true, () => { throw new Error('must not read'); }, { user: null });
  assert.equal(anonymous.calls.length, 0); assert(anonymous.events.some(([type]) => type === 'navigate'));
});
await check('Error presentation is native-only and retry does not navigate to the quiz', async () => {
  const start = source.indexOf('  if (isNative && nativeHistoryError) return <>');
  assert(start > 0); const branch = source.slice(start, source.indexOf('\n  return (', start));
  assert(branch.includes('role="alert"')); assert(branch.includes('No necesitas repetirlo'));
  assert(branch.includes('setNativeHistoryRetry(value => value + 1)'));
  assert(!branch.includes('navigate(')); assert(branch.includes('<NativeAccountActions />'));
});
console.log(JSON.stringify({ groups, networkCalls: 0, accountWrites: 0, models: 0,
  scope: 'Actual hook reader and native Profile history effect with controlled offline transport/timers; not visual/native QA' }));
