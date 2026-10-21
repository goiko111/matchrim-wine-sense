import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { lookupNativeMaster102, applyNativeMaster102, isVerifiedNativeMaster102, nativeMasterAudit102,
  nativeMasterEndpoint102 } from '../src/utils/nativeMasterCatalog102';
import { canAdmitNativeCatalogLookup97 } from '../src/utils/nativeCatalogAdmission97';
import { nativeWineConsumerResult } from '../src/utils/multiWineConsumer95';
import { applyScanWineEvidence } from '../src/utils/scanWineEvidence';
import { correctWineCandidateIdentity, type WineCandidate } from '../src/utils/multiWineScan';
import { createScanRequestBudget } from '../src/utils/scanAnalysisPolicy';
import { hasMissingVisibleQualifier102 } from '../src/utils/nativeWineQualifier102';

// Proposed application contract, synthetic transport only. No API has this
// contract attested yet; these rows are NOT recognised images or deployed data.
const endpoint = 'https://app.winerim.com/api/v1/matchrim/catalogue';
const identity = { namespace: 'mantalak' as const, id: '180278', name: 'La Zorrera', producer: 'Chivite',
  vintage: '2015', region: 'Navarra', country: 'ES' };
const record = { ...identity, sensory: { vintage: '2015', scale: 'winerim-0-5',
  provenance: 'winerim-generated', sourceReference: 'synthetic-contract-test-only',
  attributes: { power: 4, acidity: 3, sweetness: 0, tannin: 3, fruity: 4 } } };
const candidate: WineCandidate = { id: 'synthetic-label', name: identity.name, producer: identity.producer, vintage: 2015,
  region: 'Navarra', country: 'ES', grapes: [], alcohol: null, confidence: .8, source: 'label',
  evidence: ['LA ZORRERA', 'CHIVITE', '2015'], uncertaintyReasons: [], inferredFields: [] };
const profile = { potente: 4, acidez: 3, dulce: 0, tanico: 3, afrutado: 4 };
const clone = <T>(value: T): T => structuredClone(value);
const search = (rows: unknown[] = [identity]) => ({ contract: 'matchrim-master-catalogue-v1', scope: 'full-master',
  complete: true, count: rows.length, matches: rows });
const detail = (wine: unknown = record) => ({ contract: 'matchrim-master-catalogue-v1', scope: 'full-master', wine });
const json = (value: unknown) => Response.json(value);
const results: string[] = [];
const check = async (name: string, work: () => unknown | Promise<unknown>) => { await work(); results.push(name); console.log('PASS', name); };
const transport = (responses: unknown[] = [search(), detail()]) => {
  const requests: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
    assert.equal(init?.body, undefined); assert.deepEqual(init?.headers, { Accept: 'application/json' });
    assert(requests.length <= 2); return json(responses[requests.length - 1]);
  };
  return { fetcher, requests };
};
const oldFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_LIVE_NETWORK_IN_MASTER102_TEST'); };
try {
  await check('No configured route sends zero requests and never assumes a deployed contract', async () => {
    const h = transport(); assert.equal((await lookupNativeMaster102(candidate, undefined, undefined, h.fetcher)).status, 'not-configured');
    assert.equal(h.requests.length, 0);
  });
  await check('Only exact HTTPS application API endpoints are eligible; no admin credentials, cross-origin or query-bearing URLs', async () => {
    for (const url of ['http://app.winerim.com/api/v1/catalogue', 'https://evil.test/api/v1/catalogue',
      'https://app.winerim.com/admin/wine', 'https://token@app.winerim.com/api/v1/catalogue',
      'https://app.winerim.com/api/v1/admin/wines', 'https://app.winerim.com/api/v1/catalogue/sync',
      'https://app.winerim.com/api/v1/catalogue?token=secret', 'https://app.winerim.com/api/v1/catalogue#fragment',
      'https://app.winerim.com/api/v1/%2e%2e/admin', 'not-a-url']) {
      const h = transport(); assert.equal(nativeMasterEndpoint102(url), null);
      assert.equal((await lookupNativeMaster102(candidate, url, undefined, h.fetcher)).status, 'unavailable');
      assert.equal(h.requests.length, 0);
    }
  });
  await check('Missing and explicitly inferred identity evidence cannot query the master', async () => {
    for (const input of [{ ...candidate, producer: null }, { ...candidate, inferredFields: ['producer'] }]) {
      const h = transport(); assert.equal((await lookupNativeMaster102(input, endpoint, undefined, h.fetcher)).status, 'identity-required');
      assert.equal(h.requests.length, 0);
    }
  });
  await check('Search and independent detail use exact identity/vintage, not image/profile or GT paths', async () => {
    const h = transport(); const result = await lookupNativeMaster102(candidate, endpoint, undefined, h.fetcher);
    assert.equal(result.status, 'verified'); assert.equal(h.requests.length, 2);
    assert.deepEqual(Object.fromEntries(new URL(h.requests[0].url).searchParams), { name: 'La Zorrera', producer: 'Chivite', vintage: '2015' });
    assert.deepEqual(Object.fromEntries(new URL(h.requests[1].url).searchParams), { id: '180278', vintage: '2015' });
    if (result.status === 'verified') { assert(Object.isFrozen(result.record.sensory?.attributes)); assert(isVerifiedNativeMaster102(candidate, result.record)); }
  });
  await check('Mantalak identity can calculate zero-preserving affinity WITHOUT inventing a public Library fiche', async () => {
    const h = transport(); const result = await lookupNativeMaster102(candidate, endpoint, undefined, h.fetcher);
    assert.equal(result.status, 'verified'); if (result.status !== 'verified') return;
    const value = applyNativeMaster102(candidate, profile, result.record);
    assert.equal(value.canonicalId, 'mantalak:180278'); assert.equal(value.originalSheet, null);
    assert.equal(value.sensoryAttributes?.dulzura, 0); assert.equal(value.affinity, 93, 'Existing conservative L2 formula is unchanged, even for an exact vector');
    assert.equal(value.confidence, .8); assert.equal(value.affinityConfidence, null);
    assert.match(value.affinityReason!, /generados.*no una cata verificada/);
    assert.equal(nativeWineConsumerResult(value, profile).canExplainAffinity, true);
    assert.match(nativeWineConsumerResult(value, profile).identityLabel, /generado/);
    assert.deepEqual(nativeMasterAudit102(value), { namespace: 'mantalak', id: '180278', vintage: '2015',
      sensory_vintage: '2015', provenance: 'winerim-generated', source_reference: 'synthetic-contract-test-only', public_fiche_verified: false });
  });
  await check('A JSON/vision row cannot self-certify as a master response or preserve a score after correction', async () => {
    const h = transport(); const result = await lookupNativeMaster102(candidate, endpoint, undefined, h.fetcher);
    if (result.status !== 'verified') throw new Error('fixture');
    assert.equal(isVerifiedNativeMaster102(candidate, clone(result.record)), false);
    assert.equal(applyNativeMaster102(candidate, profile, clone(result.record)), candidate);
    const value = applyNativeMaster102(candidate, profile, result.record);
    assert.equal(nativeWineConsumerResult({ ...value, affinity: 99 }, profile).canExplainAffinity, false);
    assert.equal(nativeWineConsumerResult({ ...value, canonicalId: '180278' }, profile).canExplainAffinity, false);
    assert.equal(nativeWineConsumerResult({ ...value, sensoryAttributes: { ...value.sensoryAttributes, dulzura: 1 } }, profile).canExplainAffinity, false);
    assert.equal(nativeWineConsumerResult({ ...value, evidence: [...value.evidence, 'Grand Cru'] }, profile).canExplainAffinity, false);
    assert.equal(nativeWineConsumerResult(correctWineCandidateIdentity(value, { name: 'Otro vino' }), profile).canExplainAffinity, false);
    assert.equal(nativeMasterAudit102(correctWineCandidateIdentity(value, { name: 'Otro vino' })), null);
  });
  await check('Null sensory or missing profile retains linked identity but no numerical affinity', async () => {
    const h = transport([search(), detail({ ...record, sensory: null })]);
    const result = await lookupNativeMaster102(candidate, endpoint, undefined, h.fetcher);
    if (result.status !== 'verified') throw new Error('fixture');
    const value = applyNativeMaster102(candidate, profile, result.record);
    assert.equal(value.affinity, null); assert.equal(nativeWineConsumerResult(value, profile).catalogIdentityLinked, true);
    assert.equal(nativeWineConsumerResult(value, profile).canExplainAffinity, false);
    const other = transport(); const valid = await lookupNativeMaster102(candidate, endpoint, undefined, other.fetcher);
    if (valid.status === 'verified') assert.equal(applyNativeMaster102(candidate, null, valid.record).affinity, null);
  });
  await check('Fifty synthetic profiles use the unchanged conservative formula and keep the generated-source identity stable', async () => {
    const h = transport(); const result = await lookupNativeMaster102(candidate, endpoint, undefined, h.fetcher);
    if (result.status !== 'verified') throw new Error('fixture');
    for (let index = 0; index < 50; index++) {
      const axes = [0, 1, 2, 3, 4].map(axis => ((index * 7 + axis * 3) % 51) / 10);
      const [potente, acidez, dulce, tanico, afrutado] = axes;
      const person = { potente, acidez, dulce, tanico, afrutado };
      const original = JSON.stringify(candidate);
      const value = applyNativeMaster102(candidate, person, result.record);
      const distance = Math.sqrt(axes.reduce((sum, v, i) => sum + (v - [4, 3, 0, 3, 4][i]) ** 2, 0));
      const expected = Math.round(50 + ((1 - distance / Math.sqrt(125)) * 100 - 50) * .85);
      assert.equal(value.affinity, expected); assert.equal(value.canonicalId, 'mantalak:180278');
      assert.equal(nativeWineConsumerResult(value, person).canExplainAffinity, true);
      assert.equal(JSON.stringify(candidate), original);
    }
    assert.equal(h.requests.length, 2);
  });
  await check('NV/reference, wrong vintage, producer, detail ID and contradictory name/year cannot supply sensory authority', async () => {
    for (const wine of [{ ...record, vintage: '2019' }, { ...record, producer: 'Otra Bodega' },
      { ...record, id: '279839' }, { ...record, name: 'La Zorrera 2019' },
      { ...record, sensory: { ...record.sensory, vintage: null } },
      { ...record, sensory: { ...record.sensory, attributes: { ...record.sensory.attributes, power: 5.1 } } },
      { ...record, sensory: { ...record.sensory, provenance: 'verified-tasting-invented' } }]) {
      const h = transport([search(), detail(wine)]);
      assert.equal((await lookupNativeMaster102(candidate, endpoint, undefined, h.fetcher)).status, 'ambiguous');
    }
  });
  await check('Ambiguity, incomplete search, wrong namespace and local UUIDs never trigger detail or guessed ID conversion', async () => {
    for (const [payload, expected] of [[search([identity, identity]), 'ambiguous'],
      [search([identity, { ...identity, producer: 'Otra Bodega' }]), 'ambiguous'],
      [search([{ ...identity, producer: 'Otra Bodega' }]), 'ambiguous'],
      [{ ...search(), complete: false }, 'unavailable'], [{ ...search(), count: 2 }, 'unavailable'],
      [search([{ ...identity, namespace: 'library' }]), 'unavailable'],
      [search([{ ...identity, id: '6b718bee-d10d-4e71-a36a-aa7d7f962216' }]), 'unavailable'],
      [search([]), 'not-found']] as const) {
      const h = transport([payload]); assert.equal((await lookupNativeMaster102(candidate, endpoint, undefined, h.fetcher)).status, expected);
      assert.equal(h.requests.length, 1);
    }
  });
  await check('HTTP denial, redirect, invalid JSON and oversized streams fail closed without retries', async () => {
    for (const response of [new Response('Denied', { status: 403 }), new Response('', { status: 302, headers: { location: '/login' } }),
      new Response('{', { headers: { 'content-type': 'application/json' } }),
      new Response(' '.repeat(262145), { headers: { 'content-type': 'application/json' } })]) {
      let calls = 0;
      const result = await lookupNativeMaster102(candidate, endpoint, undefined, async () => { calls++; return response; });
      assert.equal(result.status, 'unavailable'); assert.equal(calls, 1);
    }
  });
  await check('Abort before start or during an adapter that ignores cancellation cannot apply a late result', async () => {
    const before = new AbortController(); before.abort(); const h = transport();
    await assert.rejects(lookupNativeMaster102(candidate, endpoint, before.signal, h.fetcher), { name: 'AbortError' });
    assert.equal(h.requests.length, 0);
    const controller = new AbortController();
    const pending = lookupNativeMaster102(candidate, endpoint, controller.signal, async () => new Promise(() => undefined));
    controller.abort(); await assert.rejects(pending, { name: 'AbortError' });
  });
  await check('Observed Morgeot OCR cannot link a generic Chassagne reference; qualified positives and producer names remain eligible', () => {
    const observed = JSON.parse(fs.readFileSync('qa-fixtures/consumer95/ocr-qualifier102.observed.json', 'utf8'));
    const evidence = observed.ocrLines;
    assert.equal(hasMissingVisibleQualifier102({ name: observed.localCandidate.name, evidence }), true);
    assert.equal(hasMissingVisibleQualifier102({ name: 'Chassagne-Montrachet 1er Cru Morgeot', evidence }), false);
    assert.equal(hasMissingVisibleQualifier102({ name: 'Chassagne-Montrachet Premier Cru Les Caillerets', evidence }), true);
    assert.equal(hasMissingVisibleQualifier102({ name: 'Aurora', evidence: ['Aurora', 'Grand Cru Cellars'] }), false);
    assert.equal(hasMissingVisibleQualifier102({ name: 'Clos Luna', evidence: ['Grand Cru'] }), true);
    assert.equal(hasMissingVisibleQualifier102({ name: 'Clos Luna Grand Cru', evidence: ['Grand Cru'] }), false);
  });
  await check('Actual scanner dispatches master enrichment only on native, never reserves AI budget or falls through on ambiguity', async () => {
    const source = fs.readFileSync('src/components/wine-import/MultiWineLabelScanner.tsx', 'utf8');
    const ast = ts.createSourceFile('scanner.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let closure: string | undefined;
    const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'enrichCandidate') closure = node.initializer?.getText(ast); ts.forEachChild(node, visit); };
    visit(ast); assert(closure);
    for (const [native, fixture, configured, ambiguous] of [[true, false, true, false], [false, false, true, false],
      [true, true, true, false], [true, false, false, false], [true, false, true, true]]) {
      const h = transport([ambiguous ? search([identity, identity]) : search(), detail()]); let legacy = 0;
      const context = { isNative: native, isMatchrimFixtureQaEnabled: fixture, nativeMasterUrl: configured ? endpoint : undefined,
        hasMissingVisibleQualifier102,
        canAdmitNativeCatalogLookup97, lookupNativeMaster102: (input: WineCandidate, url: string, signal: AbortSignal) => lookupNativeMaster102(input, url, signal, h.fetcher),
        applyNativeMaster102, applyScanWineEvidence, scanProfileRef: { current: { profile } }, DOMException,
        findWinerimWineForLabel: async () => { legacy++; return null; }, subject: undefined };
      vm.runInNewContext(ts.transpileModule(`subject = (${closure});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
      const enrich = context.subject as unknown as (c: WineCandidate, s: AbortSignal, b: ReturnType<typeof createScanRequestBudget>) => Promise<WineCandidate>;
      const budget = createScanRequestBudget(1); const value = await enrich(candidate, new AbortController().signal, budget);
      const useMaster = native && !fixture && configured;
      assert.equal(h.requests.length, useMaster ? ambiguous ? 1 : 2 : 0);
      assert.equal(legacy, !fixture && !useMaster ? 1 : 0);
      assert.equal(budget.used, !native && !fixture ? 1 : 0);
      assert.equal(value.affinity !== null, useMaster && !ambiguous);
      if (native && !fixture) {
        const callsBefore = h.requests.length, legacyBefore = legacy;
        const blocked = await enrich({ ...candidate, name: 'Chassagne-Montrachet', evidence: ['Chassagne-Montrachet', 'Premier Cru "Morgeot"', 'Chivite', '2015'] }, new AbortController().signal, budget);
        assert.equal(blocked.affinity, null); assert.equal(h.requests.length, callsBefore); assert.equal(legacy, legacyBefore);
        assert(blocked.uncertaintyReasons.some(reason => reason.includes('calificador')));
      }
    }
  });
  console.log(JSON.stringify({ passed: results.length, failed: 0, transport: 'synthetic-proposed-contract',
    liveCalls: 0, paidCalls: 0, syntheticProfiles: 50, catalogueDeployed: false, recognition200Claim: false }));
} finally { globalThis.fetch = oldFetch; }
