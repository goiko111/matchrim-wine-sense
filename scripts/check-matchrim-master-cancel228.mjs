import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { lookupMasterReference195, createMasterBridgeInvoker195 } from '../src/utils/nativeMasterReference195.ts';

const detail = JSON.parse(fs.readFileSync('qa-fixtures/master193/2-BODY.json', 'utf8'));
const page = { results: [{ ...detail, id: detail.representativePublicId, tastingAttributes: {} }],
  count: 1, total: 1, page: 1, limit: 50, pageCount: 1 };
const input = { name: 'La Zorrera', producer: 'Chivite', vintage: '2015', confidence: 0.9,
  evidence: ['La Zorrera', 'Chivite', '2015'] };
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_NETWORK_IN_CANCEL228'); };
const cases = [];
const check = async (name, run) => {
  try { await run(); cases.push({ name, passed: true }); }
  catch (error) { cases.push({ name, passed: false, error: error.message }); }
};
try {
  await check('Direct detail resolution cannot win over cancellation inside its transport', async () => {
    const controller = new AbortController(); let calls = 0;
    await assert.rejects(lookupMasterReference195(input, async operation => {
      calls++;
      if (operation.operation === 'detail') controller.abort();
      return structuredClone(operation.operation === 'search' ? page : detail);
    }, controller.signal), { name: 'AbortError' });
    assert.equal(calls, 2);
  });
  await check('Actual client invoker preserves cancellation before exposing its detail', async () => {
    const controller = new AbortController(); let calls = 0;
    const invoke = createMasterBridgeInvoker195({ invoke: async (_name, options) => {
      calls++;
      if (options.body.operation === 'detail') controller.abort();
      return { data: structuredClone(options.body.operation === 'search' ? page : detail), error: null };
    } });
    await assert.rejects(lookupMasterReference195(input, invoke, controller.signal), { name: 'AbortError' });
    assert.equal(calls, 2);
  });
  await check('Cancellation in a queued search continuation starts no detail request', async () => {
    const controller = new AbortController(); let calls = 0;
    await assert.rejects(lookupMasterReference195(input, async () => {
      calls++; queueMicrotask(() => controller.abort()); return structuredClone(page);
    }, controller.signal), { name: 'AbortError' });
    assert.equal(calls, 1);
  });
  await check('Aborting an unresolved detail settles without a retry or late match', async () => {
    const controller = new AbortController(); let complete, calls = 0;
    const pending = lookupMasterReference195(input, async operation => {
      calls++;
      if (operation.operation === 'search') return structuredClone(page);
      return new Promise(resolve => { complete = resolve; queueMicrotask(() => controller.abort()); });
    }, controller.signal);
    await assert.rejects(pending, { name: 'AbortError' });
    complete(structuredClone(detail)); await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 2);
  });
  await check('Owned deadline keeps unavailable distinct from human cancellation', async () => {
    let signal, calls = 0;
    const result = await lookupMasterReference195(input, async (_operation, current) => {
      signal = current; calls++; return new Promise(() => {});
    }, undefined, 5);
    assert.equal(result.status, 'unavailable'); assert.equal(signal.aborted, true); assert.equal(calls, 1);
    assert.equal(result.imageIdentityConfirmed, false); assert.equal(result.affinityAttributes, null);
    assert.equal(result.learningEligible, false);
  });
  await check('Cancellation removes its caller listener, even with immediate transport resolution', async () => {
    const controller = new AbortController(), active = new Set();
    const add = controller.signal.addEventListener.bind(controller.signal);
    const remove = controller.signal.removeEventListener.bind(controller.signal);
    controller.signal.addEventListener = (type, listener, options) => { active.add(listener); add(type, listener, options); };
    controller.signal.removeEventListener = (type, listener, options) => { active.delete(listener); remove(type, listener, options); };
    const pending = lookupMasterReference195(input, async () => structuredClone(page), controller.signal);
    controller.abort(); await assert.rejects(pending, { name: 'AbortError' }); assert.equal(active.size, 0);
  });
} finally { globalThis.fetch = previousFetch; }
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const result = { checkedUTC: new Date().toISOString(), passed: cases.every(row => row.passed), cases,
  sources: Object.fromEntries(['src/utils/nativeMasterReference195.ts', 'scripts/check-matchrim-master-cancel228.mjs']
    .map(file => [file, hash(file)])), externalCalls: 0,
  scope: 'Actual inactive native resolver with controlled transports and retained catalogue payloads. Not deployed API, photo recognition, active-app leak or affinity validation.' };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result));
if (!result.passed) process.exitCode = 1;
