import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createGlobalCatalogue103, applyGlobalCatalogue103, globalSensory103 } from '../src/utils/nativeGlobalCatalogue103';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import { lookupNativeMaster102 } from '../src/utils/nativeMasterCatalog102';
import { createWinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import { makeCellarCatalogEvidence } from '../src/utils/bodegaAffinity';
import { makeCellarPublicReference107 } from '../src/utils/cellarPublicReference107';
import { nativeVerdictsSnapshot159, resolveNativeRescanVerdict159, personalVerdictTitle159 } from '../src/utils/nativeRescanVerdict159';
import type { WineCandidate } from '../src/utils/multiWineScan';

globalThis.fetch = async () => { throw Error('NO_LIVE_NETWORK'); };
const observed = JSON.parse(fs.readFileSync('qa-fixtures/global103/winerim-public.observed.json', 'utf8')).vidure.wine;
const candidate: WineCandidate = { id: 'synthetic159', name: 'Vidure', producer: 'Pago de Cirsus', vintage: 2020,
  region: null, country: null, grapes: [], alcohol: null, confidence: .8, source: 'label',
  evidence: ['Vidure', 'Pago de Cirsus', '2020'], uncertaintyReasons: [], inferredFields: [] };
const profile = { potente: 4, acidez: 3, dulce: 1, tanico: 3, afrutado: 4 };
const linked = async (vintage: number | null, id = observed.id) => {
  const row = { ...observed, id, vintage: vintage === null ? null : String(vintage) };
  const client = createGlobalCatalogue103(async url => Response.json(String(url).includes('?')
    ? { count: 1, page: 1, results: [row] } : row));
  const input = { ...candidate, vintage };
  const result = await client.lookup(input);
  assert('wine' in result);
  return applyGlobalCatalogue103(input, profile, result.wine);
};
const exact = await linked(2020), otherYear = await linked(2021), nv = await linked(null);
const saved = (rating = 'not_for_me') => ({ id: 'qa-row', user_id: 'owner-a', name: exact.globalRecord!.name,
  producer: exact.globalRecord!.producer, vintage: 2020, region: exact.globalRecord!.region,
  country: exact.globalRecord!.country, rating, place_details: null, use_for_profile_training: false });
let checks = 0;
const check = (name: string, run: () => void) => { run(); checks++; console.log('PASS', name); };
check('An excluded-from-training tasting still supplies its exact personal verdict', () => {
  for (const rating of ['love', 'ok', 'not_for_me']) {
    const snapshot = nativeVerdictsSnapshot159('owner-a', [saved(rating)], 1);
    assert.equal(snapshot.status, 'ready');
    assert.equal(resolveNativeRescanVerdict159('owner-a', snapshot, exact), rating);
    assert(personalVerdictTitle159(rating as 'love').startsWith('Tu valoración:'));
  }
});
check('A producer-prefixed saved name resolves both equivalent verified rescan names without dropping qualifiers', () => {
  const prefixed = { ...saved(), name: 'Pago de Cirsus Vidure' };
  const reference = makeCellarPublicReference107(prefixed, exact.globalRecord!); assert(reference);
  const attrs = { scale: 'winerim-0-5' as const, potencia: 4, acidez: 3, dulzura: 1, taninos: 3, afrutado: 4 };
  const record = { ...prefixed, sensory_attributes: attrs, place_details: {
    winerim_public_catalogue: reference,
    bodega_sensory_evidence: makeCellarCatalogEvidence(prefixed, `winerim-public-store:${exact.globalRecord!.id}`, attrs),
  } };
  const snapshot = nativeVerdictsSnapshot159('owner-a', [record], 1);
  assert.equal(resolveNativeRescanVerdict159('owner-a', snapshot, exact), 'not_for_me');
  assert.equal(resolveNativeRescanVerdict159('owner-a', snapshot, { ...exact, name: prefixed.name }), 'not_for_me');
  for (const patch of [{ name: 'Vidure Reserva' }, { producer: 'Otra bodega' }, { vintage: 2021 }]) {
    assert.equal(resolveNativeRescanVerdict159('owner-a', snapshot, { ...exact, ...patch }), null);
  }
});
check('Another owner, anonymous mode, unavailable and partial reads cannot inherit a verdict', () => {
  const snapshot = nativeVerdictsSnapshot159('owner-a', [saved()], 1);
  for (const owner of ['owner-b', null]) assert.equal(resolveNativeRescanVerdict159(owner, snapshot, exact), null);
  for (const [rows, count] of [[null, null], [[saved()], 2], [[{ ...saved(), user_id: 'owner-b' }], 1],
    [[saved(), saved()], 2], [[saved('unknown')], 1], [[saved()], null]] as const) {
    const value = nativeVerdictsSnapshot159('owner-a', rows, count);
    assert.equal(value.status, 'unavailable'); assert.deepEqual(value.rows, []);
    assert.equal(resolveNativeRescanVerdict159('owner-a', value, exact), null);
  }
});
check('Unverified OCR, a cloned catalogue record, edits and another vintage do not inherit', () => {
  const snapshot = nativeVerdictsSnapshot159('owner-a', [saved()], 1);
  for (const value of [candidate, { ...exact, globalRecord: structuredClone(exact.globalRecord) },
    { ...exact, name: 'Vidure Reserva' }, { ...exact, producer: 'Otra bodega' }, otherYear,
    { ...exact, vintage: null }, { ...exact, vintage: 2019 }, null]) {
    assert.equal(resolveNativeRescanVerdict159('owner-a', snapshot, value), null);
  }
});
check('Persisted producer, qualifier, geography and ID contradictions remain unresolved', () => {
  for (const change of [{ producer: 'Otra bodega' }, { name: 'Vidure Reserva' }, { vintage: 2021 },
    { country: 'Impossible different country' }, { region: 'Impossible different region' }]) {
    const original = saved(), row = { ...original, ...change };
    // Missing catalogue geography is not evidence of a contradiction.
    if (change.country && !exact.globalRecord!.country || change.region && !exact.globalRecord!.region) continue;
    assert.equal(resolveNativeRescanVerdict159('owner-a', nativeVerdictsSnapshot159('owner-a', [row], 1), exact), null);
  }
});
const alternate = await linked(2020, observed.id + 99);
check('A different persisted public ID cannot be replaced by a text-only match', () => {
  const row = saved();
  const reference = makeCellarPublicReference107(row, alternate.globalRecord!); assert(reference);
  const linkedRow = { ...row, place_details: { winerim_public_catalogue: reference } };
  const snapshot = nativeVerdictsSnapshot159('owner-a', [linkedRow], 1);
  assert.equal(resolveNativeRescanVerdict159('owner-a', snapshot, exact), null);
  assert.equal(resolveNativeRescanVerdict159('owner-a', snapshot, alternate), 'not_for_me');
});
check('Conflicting duplicate verdicts abstain; duplicate rows with one verdict are harmless', () => {
  const conflict = [saved(), { ...saved('love'), id: 'qa-row2' }];
  assert.equal(resolveNativeRescanVerdict159('owner-a', nativeVerdictsSnapshot159('owner-a', conflict, 2), exact), null);
  const consistent = [saved(), { ...saved(), id: 'qa-row2' }];
  assert.equal(resolveNativeRescanVerdict159('owner-a', nativeVerdictsSnapshot159('owner-a', consistent, 2), exact), 'not_for_me');
});
check('Two missing years require the same persisted public reference, never sensory promotion', () => {
  const row = { ...saved(), name: nv.globalRecord!.name, producer: nv.globalRecord!.producer, vintage: null,
    region: nv.globalRecord!.region, country: nv.globalRecord!.country, place_details: {} };
  assert.equal(resolveNativeRescanVerdict159('owner-a', nativeVerdictsSnapshot159('owner-a', [row], 1), nv), null);
  const reference = makeCellarPublicReference107(row, nv.globalRecord!); assert(reference);
  row.place_details = { winerim_public_catalogue: reference };
  assert.equal(resolveNativeRescanVerdict159('owner-a', nativeVerdictsSnapshot159('owner-a', [row], 1), nv), 'not_for_me');
  assert.equal(nv.affinity, null); assert.equal(nv.sensoryAttributes, null);
});
check('Fifty synthetic profile evolutions preserve the saved verdict and unchanged style math', () => {
  const snapshot = nativeVerdictsSnapshot159('owner-a', [saved()], 1);
  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const [potente, acidez, dulce, tanico, afrutado] = [0, 1, 2, 3, 4].map(axis => ((i * 7 + axis * 3) % 51) / 10);
    const person = { potente, acidez, dulce, tanico, afrutado };
    seen.add(JSON.stringify(person));
    const updated = applyGlobalCatalogue103(candidate, person, exact.globalRecord!);
    assert.equal(resolveNativeRescanVerdict159('owner-a', snapshot, updated), 'not_for_me');
    assert.equal(updated.affinity, calculateLocalMatchrimAffinity(person, globalSensory103(exact.globalRecord!)));
    assert.equal(updated.globalRecord, exact.globalRecord);
  }
  assert.equal(seen.size, 50);
});
const masterCandidate = async (vintage: number | null) => {
  const identity = { namespace: 'mantalak', id: '42', name: candidate.name, producer: candidate.producer,
    vintage: vintage === null ? null : String(vintage), region: null, country: 'France' };
  const input = { ...candidate, vintage, region: null, country: null };
  let calls = 0;
  const result = await lookupNativeMaster102(input, 'https://app.winerim.com/api/v1/matchrim/catalogue', undefined,
    async () => Response.json(++calls === 1
      ? { contract: 'matchrim-master-catalogue-v1', scope: 'full-master', complete: true, count: 1, matches: [identity] }
      : { contract: 'matchrim-master-catalogue-v1', scope: 'full-master', wine: { ...identity, sensory: null } }));
  assert.equal(result.status, 'verified'); assert('record' in result);
  return { ...input, masterRecord: result.record, canonicalId: 'mantalak:42' };
};
const masterExact = await masterCandidate(2020), masterUnknown = await masterCandidate(null);
const sheet = createWinerimOriginalSheet({ id: '42', name: candidate.name, winery: candidate.producer!, vintage: 2020,
  originalSheetSource: 'winerim-api', originalSheetUrl: 'https://web.winerim.com/the-library/wines/42/Vidure_2020' })!;
sheet.detailVerified = true; sheet.country = 'France';
check('All master/sheet paths reject unknown years and use verified catalogue geography', () => {
  const row = { ...saved(), country: 'Spain', region: null };
  const snapshot = nativeVerdictsSnapshot159('owner-a', [row], 1);
  assert.equal(resolveNativeRescanVerdict159('owner-a', snapshot, masterExact), null);
  assert.equal(resolveNativeRescanVerdict159('owner-a', snapshot, { ...candidate, originalSheet: sheet }), null);
  const undated = nativeVerdictsSnapshot159('owner-a', [{ ...row, country: null, vintage: null }], 1);
  assert.equal(resolveNativeRescanVerdict159('owner-a', undated, masterUnknown), null);
  assert.equal(resolveNativeRescanVerdict159('owner-a', undated, { ...candidate, vintage: null,
    originalSheet: { ...sheet, vintage: null } }), null);
});
check('An explicit persisted master ID is authoritative over identical text', () => {
  const attrs = { scale: 'winerim-0-5' as const, potencia: 4, acidez: 3, dulzura: 1, taninos: 3, afrutado: 4 };
  const row = { ...saved(), country: 'France', region: null, sensory_attributes: attrs };
  const trace = makeCellarCatalogEvidence(row, 'mantalak:41', attrs); assert(trace);
  const persisted = { ...row, place_details: { bodega_sensory_evidence: trace } };
  assert.equal(resolveNativeRescanVerdict159('owner-a', nativeVerdictsSnapshot159('owner-a', [persisted], 1), masterExact), null);
  persisted.place_details.bodega_sensory_evidence = makeCellarCatalogEvidence(row, 'mantalak:42', attrs)!;
  assert.equal(resolveNativeRescanVerdict159('owner-a', nativeVerdictsSnapshot159('owner-a', [persisted], 1), masterExact), 'not_for_me');
  const tampered = { ...persisted, sensory_attributes: { ...attrs, potencia: 5 } };
  assert.equal(resolveNativeRescanVerdict159('owner-a', nativeVerdictsSnapshot159('owner-a', [tampered], 1), masterExact), null);
});

const serviceSource = fs.readFileSync('src/services/nativeScanContext159.ts', 'utf8');
const service = (native: boolean, response: unknown, delay = false) => {
  const calls: unknown[][] = [], timeouts = new Map<number, () => void>();
  let id = 0, profileCalls = 0;
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'not', 'limit', 'abortSignal']) chain[method] = (...args: unknown[]) => {
    calls.push([method, ...args]); return chain;
  };
  chain.then = (resolve: (value: unknown) => void) => { if (!delay) resolve(response); };
  const sandbox = { exports: {}, Promise, AbortController, DOMException,
    setTimeout: (callback: () => void) => { timeouts.set(++id, callback); return id; },
    clearTimeout: (timer: number) => timeouts.delete(timer),
    require: (name: string) => {
      if (name === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
      if (name === '@/integrations/supabase/client') return { supabase: { from: (table: string) => { calls.push(['from', table]); return chain; } } };
      if (name === './matchrimScanProfile') return { loadMatchrimScanProfile: async () => { profileCalls++; return { profile }; } };
      if (name === '@/utils/nativeRescanVerdict159') return { nativeVerdictsSnapshot159 };
      throw Error('Unexpected import: ' + name);
    } };
  vm.runInNewContext(ts.transpileModule(serviceSource, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  return { api: sandbox.exports as { loadNativeSavedVerdicts159: (owner: string | null, signal: AbortSignal) => Promise<ReturnType<typeof nativeVerdictsSnapshot159>>;
    loadNativeScanContext159: (owner: string | null, signal: AbortSignal) => Promise<unknown> },
    calls, timeouts, profileCalls: () => profileCalls };
};
for (const native of [false, true]) {
  const h = service(native, { data: [saved()], count: 1, error: null });
  const result = await h.api.loadNativeSavedVerdicts159('owner-a', new AbortController().signal);
  assert.equal(result.status, native ? 'ready' : 'unavailable');
  if (native) {
    assert(h.calls.some(call => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'owner-a'));
    assert(h.calls.some(call => call[0] === 'select' && JSON.stringify(call[2]) === '{"count":"exact"}'));
    assert(!JSON.stringify(h.calls).includes('use_for_profile_training'));
  } else assert.equal(h.calls.length, 0);
  assert.equal(h.timeouts.size, 0); checks++;
}
for (const cancel of ['timeout', 'abort']) {
  const h = service(true, null, true), controller = new AbortController();
  const pending = h.api.loadNativeSavedVerdicts159('owner-a', controller.signal);
  if (cancel === 'timeout') { [...h.timeouts.values()][0](); assert.equal((await pending).status, 'unavailable'); }
  else { controller.abort(); await assert.rejects(pending, { name: 'AbortError' }); }
  assert.equal(h.timeouts.size, 0); checks++;
}
const web = service(false, null), anonymous = service(true, null);
assert.equal((await anonymous.api.loadNativeSavedVerdicts159(null, new AbortController().signal)).status, 'unavailable');
assert.equal(anonymous.calls.length, 0);
await web.api.loadNativeScanContext159('owner-a', new AbortController().signal);
assert.equal(web.profileCalls(), 1); assert.equal(web.calls.length, 0); checks++;
console.log(JSON.stringify({ checks, realCalls: 0, userWrites: 0, scope: 'Actual owner-bound verdict resolver and service closure; synthetic records, not live rescan or taste accuracy.' }));
