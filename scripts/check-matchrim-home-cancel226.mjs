import assert from 'node:assert/strict';
import { withNativeHomeRead225 } from '../src/utils/nativeHomeRead225.ts';

// Actual native-only promise lifecycle, with no auth/database/UI transports.
const checks = [];
const check = async (name, work) => { await work(); checks.push(name); console.log('PASS ' + name); };
const controller = () => {
  const abort = new AbortController(), active = new Set();
  const add = abort.signal.addEventListener.bind(abort.signal), remove = abort.signal.removeEventListener.bind(abort.signal);
  abort.signal.addEventListener = (type, listener, options) => { if (type === 'abort') active.add(listener); add(type, listener, options); };
  abort.signal.removeEventListener = (type, listener, options) => { if (type === 'abort') active.delete(listener); remove(type, listener, options); };
  return { abort, active };
};
await check('Successful reads preserve the exact payload and remove abort listeners', async () => {
  const { abort, active } = controller(), payload = { profile: 'synthetic-only' }; let stops = 0;
  assert.equal(await withNativeHomeRead225(Promise.resolve(payload), abort.signal, () => stops++, 1000), payload);
  assert.equal(stops, 0); assert.equal(active.size, 0);
});
await check('Transport rejection is retained and removes abort listeners', async () => {
  const { abort, active } = controller(), error = new Error('SYNTHETIC_TRANSPORT_REJECTION'); let stops = 0;
  await assert.rejects(withNativeHomeRead225(Promise.reject(error), abort.signal, () => stops++, 1000), value => value === error);
  assert.equal(stops, 0); assert.equal(active.size, 0);
});
await check('An already aborted account read cannot expose an already resolved payload', async () => {
  const { abort, active } = controller(); abort.abort();
  await assert.rejects(withNativeHomeRead225(Promise.resolve({ privateVector: 'synthetic-old-account' }), abort.signal, () => {}, 1000), { name: 'AbortError' });
  assert.equal(active.size, 0);
});
await check('Active abort settles even when the transport never cooperates', async () => {
  const { abort, active } = controller();
  const pending = withNativeHomeRead225(new Promise(() => {}), abort.signal, () => {}, 1000);
  assert.equal(active.size, 1); abort.abort();
  await assert.rejects(pending, { name: 'AbortError' }); assert.equal(active.size, 0);
});
await check('Timeout rejects once, aborts the owned transport once and removes listeners', async () => {
  const { abort, active } = controller(); let stops = 0;
  await assert.rejects(withNativeHomeRead225(new Promise(() => {}), abort.signal, () => { stops++; abort.abort(); }, 5), /NATIVE_HOME_READ_TIMEOUT/);
  assert.equal(stops, 1); assert.equal(active.size, 0);
});
await check('A late transport resolution cannot replace cancellation', async () => {
  const { abort, active } = controller(); let finish;
  const read = new Promise(resolve => { finish = resolve; });
  const pending = withNativeHomeRead225(read, abort.signal, () => {}, 1000);
  abort.abort(); finish({ privateVector: 'synthetic-stale' });
  await assert.rejects(pending, { name: 'AbortError' }); assert.equal(active.size, 0);
});
await check('Cancellation after an immediate response still vetoes the result before returning it', async () => {
  const { abort, active } = controller();
  const pending = withNativeHomeRead225(Promise.resolve({ privateVector: 'synthetic-stale' }), abort.signal, () => {}, 1000);
  abort.abort(); await assert.rejects(pending, { name: 'AbortError' }); assert.equal(active.size, 0);
});
await check('Pre-abort consumes an already started rejection without an unhandled failure', async () => {
  const { abort, active } = controller(), failures = [];
  const capture = failure => failures.push(failure);
  process.on('unhandledRejection', capture);
  try {
    abort.abort();
    await assert.rejects(withNativeHomeRead225(Promise.reject(new Error('SYNTHETIC_ABORTED_READ')), abort.signal, () => {}, 1000), { name: 'AbortError' });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(failures, []); assert.equal(active.size, 0);
  } finally { process.removeListener('unhandledRejection', capture); }
});
console.log(JSON.stringify({ passed: true, groups: checks.length, checks, externalCalls: 0,
  scope: 'Actual native-only Home read lifecycle with synthetic promises; not a real user leak, deployed RLS or mobile UI test.' }));
