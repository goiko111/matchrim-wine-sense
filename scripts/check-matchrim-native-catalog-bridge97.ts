import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { canAdmitNativeCatalogLookup97 } from '../src/utils/nativeCatalogAdmission97';
import { canonicalLabelSearchQuery } from '../src/utils/winerimLabelIdentity';
import { catalogWineFromVerifiedSheet, lookupWinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import { applyScanWineEvidence } from '../src/utils/scanWineEvidence';
import { createScanRequestBudget, type ScanRequestBudget } from '../src/utils/scanAnalysisPolicy';
import type { WineCandidate } from '../src/utils/multiWineScan';

const scanner = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const service = 'src/services/winerimApi.ts';
const baseline = '8327ee7e31fe73ab8edd90303de514147d13978d';
const source = readFileSync(scanner, 'utf8');
const oldSource = execFileSync('git', ['show', `${baseline}:${scanner}`], { encoding: 'utf8' });
function initializer(file: string, text: string, name: string) {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: ts.Expression[] = [];
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) found.push(node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(found.length, 1, `Unique actual ${name}`);
  return found[0].getText(ast);
}
const current = initializer(scanner, source, 'enrichCandidate');
const previous = initializer(scanner, oldSource, 'enrichCandidate');
const originalService = initializer(service, readFileSync(service, 'utf8'), 'findWinerimWineForLabel');
const envExpression = 'import.meta.env.VITE_MATCHRIM_EDGE_RELEASE';
assert.equal(originalService.split(envExpression).length, 2);
// Only the build-time env expression is adapted for a Script VM; no control flow changes.
const serviceCode = originalService.replace(envExpression, 'edgeRelease');
function load<T>(body: string, deps: Record<string, unknown>): T {
  const sandbox = { ...deps, subject: undefined };
  vm.runInNewContext(ts.transpileModule(`subject = (${body});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, sandbox, { timeout: 1000 });
  return sandbox.subject as T;
}

const profile = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
const candidate: WineCandidate = {
  id: 'synthetic-label', name: 'Aurora Cuvee Especial', producer: 'Monte Claro', vintage: 2020,
  region: 'Navarra', country: 'ES', grapes: [], alcohol: null, confidence: .78, source: 'label',
  evidence: ['AURORA CUVEE ESPECIAL', 'MONTE CLARO', '2020'], inferredFields: [],
  uncertaintyReasons: ['Reflejos; uva no legible'], sensoryAttributes: null,
};
const row = { id: 123, slugname: 'Aurora-Cuvee-Especial_2020', name: candidate.name, winery: candidate.producer,
  vintage: '2020', region: 'Navarra', country: 'ES', grapes: [['Tempranillo']],
  tastingAttributes: { power: 0, acidity: 2.5, sweetness: 1, tannin: 3, fruity: 4 } };
type Match = { wine: NonNullable<ReturnType<typeof catalogWineFromVerifiedSheet>>; confidence: number; restaurantUuid: null };
type Find = (input: Parameters<typeof lookupWinerimOriginalSheet>[0], options?: { signal?: AbortSignal }) => Promise<Match | null>;
type Enrich = (value: WineCandidate, signal: AbortSignal, budget: ScanRequestBudget) => Promise<WineCandidate>;
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const abortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';
const results: string[] = [];
const check = async (name: string, work: () => unknown | Promise<unknown>) => { await work(); results.push(name); console.log('PASS', name); };
function host({ native = true, fixture = false, body = current, response = row, overrideFind,
  pauseFetch = false }: { native?: boolean; fixture?: boolean; body?: string; response?: typeof row;
    overrideFind?: Find; pauseFetch?: boolean } = {}) {
  const requests: string[] = [], lookups: { input: Parameters<Find>[0]; options: Parameters<Find>[1] }[] = [];
  let applied = 0, release!: () => void;
  const fetchStarted = new Promise<void>(resolve => { release = resolve; });
  const transport: typeof fetch = async (url, init) => {
    assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
    assert.equal(init?.body, undefined); assert.deepEqual(init?.headers, { Accept: 'application/json' });
    assert.equal(new URL(String(url)).origin, 'https://app.winerim.com');
    requests.push(String(url)); release();
    if (pauseFetch) return new Promise<Response>((_, reject) => {
      assert.ok(init?.signal);
      if (init.signal.aborted) reject(new DOMException('Cancelled', 'AbortError'));
      else init.signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
    });
    if (requests.length === 1) return json({ restaurant: 'b653e084-e8e1-448c-bc03-507a1cea3810' });
    if (requests.length === 2) return json({ results: [response], count: 1, page: 1, limit: 20 });
    assert.equal(requests.length, 3, 'No retry/fallback/extra request');
    return json(response);
  };
  const actualNativeFind = load<Find>(serviceCode, {
    canonicalLabelSearchQuery, Capacitor: { isNativePlatform: () => true }, AbortController, DOMException, setTimeout, clearTimeout,
    lookupWinerimOriginalSheet: (input: Parameters<Find>[0], signal?: AbortSignal) => lookupWinerimOriginalSheet(input, signal, transport),
    catalogWineFromVerifiedSheet, edgeRelease: 'unused-native', console: { warn() {} },
  });
  const enrich = load<Enrich>(body, {
    isNative: native, isMatchrimFixtureQaEnabled: fixture, canAdmitNativeCatalogLookup97, DOMException,
    scanProfileRef: { current: { profile } },
    findWinerimWineForLabel: async (input: Parameters<Find>[0], options: Parameters<Find>[1]) => {
      lookups.push({ input, options });
      return overrideFind ? overrideFind(input, options) : actualNativeFind(input, options);
    },
    applyScanWineEvidence: (...args: Parameters<typeof applyScanWineEvidence>) => { applied++; return applyScanWineEvidence(...args); },
  });
  return { enrich, requests, lookups, fetchStarted, get applied() { return applied; } };
}

const oldFetch = globalThis.fetch;
let forbiddenNetwork = 0;
globalThis.fetch = async () => { forbiddenNetwork++; throw new Error('External network forbidden'); };
try {
  await check('Exact source inverse retains the whole prior enrichCandidate except native gate and native GET budget separation', () => {
    const nativeGate = '!isMatchrimFixtureQaEnabled && (isNative\n      ? canAdmitNativeCatalogLookup97(candidate)\n      : canResolveCanonically && budget.remaining > 0)';
    assert.equal(current.split(nativeGate).length, 2);
    assert.equal(current.split('if (shouldSearch && !isNative)').length, 2);
    assert.equal(current.replace(nativeGate, '!isMatchrimFixtureQaEnabled && canResolveCanonically && budget.remaining > 0')
      .replace('if (shouldSearch && !isNative)', 'if (shouldSearch)'), previous);
    assert.ok(source.includes("import { canAdmitNativeCatalogLookup97 } from '@/utils/nativeCatalogAdmission97';"));
    assert.ok(originalService.includes('catalogOnly ? setTimeout(abort, 5000) : undefined'), 'No timeout increase');
  });
  await check('Native quality uncertainty dispatches actual strict GETs with zero AI budget remaining and no confidence elevation', async () => {
    const h = host(), budget = createScanRequestBudget(0), controller = new AbortController();
    const before = JSON.stringify(candidate), value = await h.enrich(candidate, controller.signal, budget);
    assert.equal(h.requests.length, 3); assert.equal(h.lookups[0].options?.signal, controller.signal);
    assert.equal(budget.used, 0); assert.equal(value.confidence, candidate.confidence);
    assert.equal(value.canonicalId, '123'); assert.equal(value.originalSheet?.detailVerified, true);
    assert.equal(value.sensoryAttributes?.potencia, 0); assert.equal(value.sensoryAttributes?.scale, 'winerim-0-5');
    assert.notEqual(value.affinity, null); assert.equal(JSON.stringify(candidate), before);
  });
  await check('Native successful GET also leaves a nonempty AI budget untouched', async () => {
    const h = host(), budget = createScanRequestBudget(2);
    await h.enrich(candidate, new AbortController().signal, budget);
    assert.equal(h.requests.length, 3); assert.equal(budget.used, 0); assert.equal(budget.remaining, 2);
  });
  await check('Prior native quality veto and GET charging are independently reproduced, not assumed', async () => {
    const oldQuality = host({ body: previous }), qualityBudget = createScanRequestBudget(2);
    await oldQuality.enrich(candidate, new AbortController().signal, qualityBudget);
    assert.equal(oldQuality.requests.length, 0);
    for (const [body, expectedUsed] of [[previous, 1], [current, 0]] as const) {
      const h = host({ body }), budget = createScanRequestBudget(2);
      await h.enrich({ ...candidate, uncertaintyReasons: [] }, new AbortController().signal, budget);
      assert.equal(h.requests.length, 3); assert.equal(budget.used, expectedUsed);
    }
  });
  await check('Unbacked producer, partial name, missing year, inference and dotted unrelated letters dispatch nothing', async () => {
    for (const patch of [{ producer: 'Invented Estate' }, { name: 'Aurora Cuvee Especial Premium' },
      { evidence: ['Aurora Cuvee Especial', 'Monte Claro'] }, { inferredFields: ['producer'] }, { confidence: .719 },
      { name: 'Juve & Camps', producer: 'Juve & Camps', evidence: ['D.E.U.T.Z', '2020'] }]) {
      const h = host(), budget = createScanRequestBudget(2);
      const value = await h.enrich({ ...candidate, ...patch }, new AbortController().signal, budget);
      assert.equal(h.lookups.length, 0); assert.equal(h.requests.length, 0); assert.equal(budget.used, 0);
      assert.equal(value.canonicalId, null); assert.equal(value.originalSheet, null); assert.equal(value.affinity, null);
    }
  });
  await check('Wrong producer or vintage in actual search responses cannot certify catalogue identity or GT', async () => {
    for (const response of [{ ...row, winery: 'Invented Estate' }, { ...row, vintage: '2019' }]) {
      const h = host({ response }), value = await h.enrich(candidate, new AbortController().signal, createScanRequestBudget(0));
      assert.equal(h.requests.length, 2); assert.equal(value.name, candidate.name); assert.equal(value.producer, candidate.producer);
      assert.equal(value.vintage, 2020); assert.equal(value.canonicalId, null); assert.equal(value.originalSheet, null); assert.equal(value.affinity, null);
    }
  });
  await check('Already-cancelled native signal causes zero HTTP GETs and no evidence application', async () => {
    const h = host(), controller = new AbortController(); controller.abort();
    await assert.rejects(h.enrich(candidate, controller.signal, createScanRequestBudget(0)), abortError);
    assert.equal(h.requests.length, 0); assert.equal(h.applied, 0);
  });
  await check('In-flight native cancellation aborts transport without retry or evidence application', async () => {
    const h = host({ pauseFetch: true }), controller = new AbortController();
    const pending = h.enrich(candidate, controller.signal, createScanRequestBudget(0));
    await h.fetchStarted; controller.abort(); await assert.rejects(pending, abortError);
    assert.equal(h.requests.length, 1); assert.equal(h.applied, 0);
  });
  await check('Component post-await guard rejects even an adapter that ignores cancellation', async () => {
    let release!: (value: null) => void;
    const late = new Promise<null>(resolve => { release = resolve; });
    const h = host({ overrideFind: async () => late }), controller = new AbortController();
    const pending = h.enrich(candidate, controller.signal, createScanRequestBudget(0));
    controller.abort(); release(null); await assert.rejects(pending, abortError); assert.equal(h.applied, 0);
  });
  await check('Fixture mode dispatches neither native catalogue GET nor legacy web lookup', async () => {
    for (const native of [true, false]) {
      const h = host({ native, fixture: true }), budget = createScanRequestBudget(2);
      const value = await h.enrich({ ...candidate, uncertaintyReasons: [] }, new AbortController().signal, budget);
      assert.equal(h.lookups.length, 0); assert.equal(budget.used, 0); assert.equal(value.affinity, null);
    }
  });
  await check('Web legacy gate/budget/options and resulting evidence exactly match pinned prior source across120 cases', async () => {
    let cases = 0;
    for (const fixture of [false, true]) for (const uncertaintyReasons of [[], ['quality doubt']])
      for (const confidence of [.71, .72, .9, NaN, Infinity]) for (const evidence of [[], ['one'], ['one', 'two']])
        for (const limit of [0, 1]) {
          const value = { ...candidate, confidence, evidence, uncertaintyReasons };
          const observations = [];
          for (const body of [previous, current]) {
            const h = host({ native: false, fixture, body, overrideFind: async () => null }), budget = createScanRequestBudget(limit);
            const result = await h.enrich(value, new AbortController().signal, budget);
            const allowed = !fixture && confidence >= .72 && evidence.length >= 2 && uncertaintyReasons.length === 0 && limit > 0;
            assert.equal(h.lookups.length, Number(allowed)); assert.equal(budget.used, Number(allowed));
            if (allowed) assert.equal(h.lookups[0].options, undefined, 'Web options remain exact legacy undefined');
            observations.push(clone({ lookups: h.lookups, used: budget.used, result }));
          }
          assert.deepEqual(observations[1], observations[0]); cases++;
        }
    assert.equal(cases, 120);
  });
  await check('Web budget cancellation fails before lookup, matching prior source', async () => {
    for (const body of [previous, current]) {
      const h = host({ native: false, body }), controller = new AbortController(), budget = createScanRequestBudget(1);
      controller.abort(); await assert.rejects(h.enrich({ ...candidate, uncertaintyReasons: [] }, controller.signal, budget), abortError);
      assert.equal(h.lookups.length, 0); assert.equal(budget.used, 0); assert.equal(h.applied, 0);
    }
  });
  await check('Web matched-catalogue enrichment and legacy confidence promotion also remain exact', async () => {
    const nativeHost = host();
    const verified = await nativeHost.enrich(candidate, new AbortController().signal, createScanRequestBudget(0));
    const catalog = catalogWineFromVerifiedSheet(candidate, verified.originalSheet);
    assert.ok(catalog);
    const observations = [];
    for (const body of [previous, current]) {
      const h = host({ native: false, body, overrideFind: async () => ({ wine: catalog, confidence: .95, restaurantUuid: null }) });
      const budget = createScanRequestBudget(1);
      const value = await h.enrich({ ...candidate, uncertaintyReasons: [] }, new AbortController().signal, budget);
      assert.equal(value.confidence, .95); assert.equal(budget.used, 1); assert.equal(h.lookups[0].options, undefined);
      observations.push(clone(value));
    }
    assert.deepEqual(observations[1], observations[0]);
  });
  assert.equal(forbiddenNetwork, 0);
  console.log(JSON.stringify({ passed: results.length, failed: 0, webParityCases: 120, remoteCalls: forbiddenNetwork,
    baseline, scope: 'Actual extracted enrichCandidate and native service closures, strict resolver/evidence and synthetic GET transport. No real catalogue GT, fresh OCR, web rendering, UIKit or model claim.' }));
} finally { globalThis.fetch = oldFetch; }
