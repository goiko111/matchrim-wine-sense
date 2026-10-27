import fs from 'node:fs';
import assert from 'node:assert/strict';
import { plan274, authorization274, summarizeDetail274 } from './probe-matchrim-first20-274';
import { createReader194 } from './probe-matchrim-master194';

const plan = plan274();
assert.equal(plan.length, 19); assert(!plan.some(row => row.canonicalId === 217480));
const approval = { humanApproved: true, maximumRequests: 19, maximumAdditionalEUR: 0,
  noModelsImagesLovableOrWrites: true,
  manifestSHA256: '7d018e648e5e7ab23aa0bffad826a03f501f2a29cc60ee090f4bf7d3d787e254',
  exactHumanReply: 'Sí, hasta 19 lecturas gratuitas' };
assert.doesNotThrow(() => authorization274(approval));
for (const patch of [{ humanApproved: false }, { maximumRequests: 20 }, { maximumAdditionalEUR: 1 },
  { noModelsImagesLovableOrWrites: false }, { manifestSHA256: 'bad' }, { exactHumanReply: 'continue' }])
  assert.throws(() => authorization274({ ...approval, ...patch }));
const base = JSON.parse(fs.readFileSync('qa-artifacts/master253-20261026/hosted-six-r1/03-BODY.json', 'utf8'));
let wireStarts = 0;
const reader = createReader194({ key: 'SYNTHETIC-KEY274',
  fetcher: async (url, options) => {
    wireStarts++; assert.equal(url, plan[wireStarts - 1].url);
    assert.equal(options?.method, 'GET'); assert.equal(options?.redirect, 'error');
    return Response.json({ ...base, mantalakWineId: plan[wireStarts - 1].canonicalId });
  },
  claim: index => assert(index <= 19), record: () => undefined,
});
for (const entry of plan) {
  const result = summarizeDetail274(entry, await reader.read(entry.imageId, entry.url));
  assert.equal(result.canonicalId, entry.canonicalId);
  assert.equal(result.photoIdentityConfirmed, false); assert.equal(result.affinityGranted, false);
}
await assert.rejects(reader.read('forbidden-twentieth', plan[18].url));
assert.equal(wireStarts, 19);
let deniedStarts = 0;
const denied = createReader194({ key: 'SYNTHETIC-KEY274',
  fetcher: async () => { deniedStarts++; return new Response('', { status: 401 }); },
  claim: () => undefined, record: () => undefined,
});
await assert.rejects(denied.read('first', plan[0].url));
await assert.rejects(denied.read('no-retry', plan[1].url));
assert.equal(deniedStarts, 1);
assert.throws(() => summarizeDetail274(plan[0], base));
assert.throws(() => summarizeDetail274(plan[0], { ...base, mantalakWineId: plan[0].canonicalId,
  tastingAttributes: { ...base.tastingAttributes, attributesByVintage: [{ vintage: null, power: 3,
    sweetness: 3, acidity: 3, tannin: 3, fruity: 3, aging: null,
    source: { type: 'ai', model: 'synthetic', confidence: 99, generatedAt: '2026-10-27T00:00:00Z' } }] } }));
console.log(JSON.stringify({ passed: true, plannedDetails: 19, syntheticWireStarts: 19,
  unauthorizedTwentiethBlocked: true, sixInvalidApprovalsRejected: true,
  accessFailureStopsWithoutRetry: true, externalCalls: 0, keychainReads: 0, realPhotoIdentities: 0 }));
