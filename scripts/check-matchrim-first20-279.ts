import fs from 'node:fs';
import assert from 'node:assert/strict';
import { plan274 } from './probe-matchrim-first20-274';
import { remainingPlan279, runRemaining279 } from './probe-matchrim-first20-279';
import { createReader194 } from './probe-matchrim-master194';

const prior = { passed: false, halted: true, attempts: 1, maximumNewReads: 19, rows: [] };
const first = plan274()[0];
const receipt = { index: 1, label: first.imageId + '-manifest-detail', url: first.url,
  httpStatus: 503, error: 'HTTP_TRANSPORT_OR_BODY_REJECTED' };
const plan = remainingPlan279(prior, receipt);
assert.equal(plan.length, 18); assert.equal(plan[0].imageId, 'img-002');
for (const patch of [{ passed: true }, { halted: false }, { attempts: 0 }, { attempts: 2 },
  { maximumNewReads: 20 }, { rows: [{}] }]) assert.throws(() => remainingPlan279({ ...prior, ...patch }, receipt));
for (const patch of [{ index: 2 }, { label: 'other' }, { url: plan[0].url }, { httpStatus: 200 }, { error: undefined }])
  assert.throws(() => remainingPlan279(prior, { ...receipt, ...patch }));
const fixture = JSON.parse(fs.readFileSync('qa-artifacts/master253-20261026/hosted-six-r1/03-BODY.json', 'utf8'));
let starts = 0, claims = 0;
const reader = createReader194({ key: 'SYNTHETIC-279', fetcher: async (url, options) => {
  assert.equal(url, plan[starts].url); assert.equal(options?.method, 'GET');
  return Response.json({ ...fixture, mantalakWineId: plan[starts++].canonicalId });
}, claim: index => { assert(index <= 18); claims++; }, record: () => undefined });
const rows = await runRemaining279(plan, reader);
assert.equal(rows.length, 18); assert.equal(starts, 18); assert.equal(claims, 18);
assert(rows.every(row => row.affinityGranted === false && row.photoIdentityConfirmed === false));
await assert.rejects(runRemaining279(plan274(), reader));
assert.equal(starts, 18);
let failures = 0;
const unavailable = createReader194({ key: 'SYNTHETIC-279', fetcher: async () => {
  failures++; return new Response('', { status: 503 });
}, claim: () => undefined, record: () => undefined });
await assert.rejects(runRemaining279(plan, unavailable));
await assert.rejects(unavailable.read('no-retry', plan[1].url));
assert.equal(failures, 1);
console.log(JSON.stringify({ passed: true, syntheticDetails: rows.length, invalidLedgersRejected: 11,
  originalFailedIdExcluded: true, fullPlanResetRejected: true, stopWithoutRetry: true,
  externalRequests: 0, keychainReads: 0, additionalEUR: 0 }));
