import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

// Default: portable, no private artifacts, no writes, no credentials or network.
// Optional: --recorded-root DIR reads the explicit prior recommendation evidence.
// --baseline-ref REF overrides the frozen pre-95 revision. The default must not
// move with HEAD after committing the fix. Neither mode writes evidence files.
const repo = fileURLToPath(new URL('../', import.meta.url));
const servicePath = 'src/services/winerimApi.ts';
const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const attrs = ['power', 'acidity', 'sweetness', 'tannin', 'fruity'] as const;
type Profile = Record<typeof axes[number], number>;
type Sensory = Record<typeof attrs[number], number>;
type JsonObject = Record<string, unknown>;
interface Wine extends JsonObject { id: string | number; name: string; matchPercentage: number;
  tastingAttributes: (Sensory & { scale?: string }) | null }
interface Result { wines: Wine[]; metadata: JsonObject; query: string; requests: number }
interface Service {
  fetchWinesByAttributes(profile: Profile, options: { affinityCalibrationConfidence?: number | null }): Promise<Wine[]>;
  getWinerimWineResultsMeta(wines: Wine[]): JsonObject;
  normalizeTastingAttributes(wine: JsonObject): Sensory | null;
}
interface RecordedProfile { id?: string; persona: string; index: number; exactBaseProfile: Profile; coverage: string;
  responseQuery: string; responseSha256: string; rawScorePoisoning: { baseline: OrderRow[]; poisoned: OrderRow[];
    topChoiceChangedOnEqualAffinity: boolean } }
interface OrderRow { id: string | number; affinity: number }
interface RecordedCase { profile: RecordedProfile; data: JsonObject }

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const clone = <T>(value: T): T => structuredClone(value);
const readJson = <T>(filename: string) => JSON.parse(readFileSync(filename, 'utf8')) as T;
const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const identity = (wine: Wine) => JSON.stringify([String(wine.id), typeof wine.id, wine.name]);
const byId = (wines: Wine[]) => [...wines].sort((a, b) => identity(a) < identity(b) ? -1 : identity(a) > identity(b) ? 1 : 0);
const order = (wines: Wine[]): OrderRow[] => wines.map(wine => ({ id: wine.id, affinity: wine.matchPercentage }));
let accidentalNetworkCalls = 0;
globalThis.fetch = async () => { accidentalNetworkCalls++; throw new Error('Network forbidden in recommendation-order CI'); };

function options() {
  const args = process.argv.slice(2);
  let baselineRef = 'c25b28287d431e50239e45a25baebe8965f5077d', recordedRoot: string | undefined;
  const seen = new Set<string>();
  while (args.length) {
    const key = args.shift(), value = args.shift();
    assert.ok(key && value && !seen.has(key), 'Expected unique --baseline-ref REF or --recorded-root DIR');
    seen.add(key);
    if (key === '--baseline-ref') baselineRef = value;
    else if (key === '--recorded-root') recordedRoot = path.resolve(value);
    else assert.fail('Unknown option: ' + key);
  }
  assert.match(baselineRef, /^[A-Za-z0-9_./^~+-]+$/, 'A local Git ref is required');
  return { baselineRef, recordedRoot };
}

const astFor = (source: string) => ts.createSourceFile('actual.ts', source, ts.ScriptTarget.Latest, true);
function namesIn(source: string) {
  return astFor(source).statements.flatMap(statement => ts.isVariableStatement(statement)
    ? statement.declarationList.declarations.flatMap(declaration => ts.isIdentifier(declaration.name) ? [declaration.name.text] : []) : []);
}
function actualScript(source: string, names: string[]) {
  const ast = astFor(source), found = new Set<string>(), pieces: string[] = [];
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && names.includes(declaration.name.text)) {
        assert.ok(!found.has(declaration.name.text), 'Duplicate selected source declaration');
        found.add(declaration.name.text); pieces.push('const ' + declaration.getText(ast) + ';');
      }
    }
  }
  assert.equal(found.size, names.length, 'Actual source declaration contract changed');
  const compiled = ts.transpileModule(pieces.join('\n') + '\nglobalThis.__qa95={' + names.join(',') + '};', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }, reportDiagnostics: true,
  });
  assert.ok(!(compiled.diagnostics || []).some(item => item.category === ts.DiagnosticCategory.Error));
  return new vm.Script(compiled.outputText);
}
function execute(script: vm.Script, dependencies: JsonObject = {}): JsonObject {
  const context = vm.createContext({ console: quiet, URL, URLSearchParams, Response, DOMException, ...dependencies },
    { codeGeneration: { strings: false, wasm: false } });
  script.runInContext(context, { timeout: 3000 });
  return context.__qa95 as JsonObject;
}
function maskSort(source: string) {
  const ast = astFor(source), found: ts.IfStatement[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isIfStatement(node) && node.expression.getText(ast) === 'Capacitor.isNativePlatform()'
      && node.thenStatement.getText(ast).includes('results.sort(')) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(found.length, 1, 'One final native sort statement expected');
  return source.slice(0, found[0].getStart(ast)) + '/* FINAL_NATIVE_SORT */' + source.slice(found[0].end);
}

const serviceNames = [
  'winerimWineResultsMeta', 'getWinerimWineResultsMeta', 'textFromUnknown', 'normalizeCurrency', 'inferPriceKind',
  'normalizePrice', 'asRecord', 'normalizeAttributeTo5', 'normalizeTastingAttributes', 'normalizeWineId',
  'normalizeMatchPercentage', 'stringValue', 'normalizeGrapes', 'normalizeWinerimWine', 'extractWineResults',
  'extractTotalCount', 'calculateProfileMatchPercentage', 'classifyWineByV41Style', 'mergeUniqueWines',
  'isFallbackRestaurantUuid', 'invokeMatchrimRecommendations', 'fetchWinesByAttributes',
];
const dependencyFiles = {
  scanValues: 'supabase/functions/_shared/matchrim-scan-values.ts', affinity: 'src/utils/wineAffinityExplanation.ts',
  passport: 'src/utils/matchrimPassport.ts', sensory: 'src/utils/winerimOriginalSheet.ts',
  classifier: 'src/lib/winerimClassifier.ts', calibration: 'src/utils/matchrimAffinityCalibration.ts',
};
function loadDependencies() {
  const sources = Object.fromEntries(Object.entries(dependencyFiles).map(([name, filename]) => [name, readFileSync(path.join(repo, filename), 'utf8')]));
  const scan = execute(actualScript(sources.scanValues, ['optionalScanNumber', 'normalizeScanSensoryValue']));
  const affinity = execute(actualScript(sources.affinity, ['clampAttribute', 'normalizeProfileAttribute', 'normalizeWineAttributesForInsight', 'calculateLocalMatchrimAffinity']), scan);
  const passport = execute(actualScript(sources.passport, ['clamp', 'normalizeMatchrimProfileForClassifier']));
  const sensory = execute(actualScript(sources.sensory, ['record', 'validateWinerimOriginalSensory']));
  const classifier = execute(actualScript(sources.classifier, namesIn(sources.classifier)));
  const calibration = execute(actualScript(sources.calibration, namesIn(sources.calibration)));
  return { sources, dependencies: { ...scan, ...affinity, ...passport, ...sensory, ...classifier, ...calibration } };
}

function client(source: string, dependencies: JsonObject, native: boolean) {
  let response: JsonObject | undefined, queries: string[] = [], active = false;
  const scoreCalls: { profile: Profile; attrs: unknown }[] = [];
  const sourceScorer = dependencies.calculateLocalMatchrimAffinity as (profile: Profile, value: unknown) => number | null;
  const forbidden = () => { accidentalNetworkCalls++; throw new Error('Non-global endpoint forbidden in CI'); };
  const api = execute(actualScript(source, serviceNames), { ...dependencies,
    Capacitor: { isNativePlatform: () => native }, SUPABASE_URL: 'https://recommendations.example.invalid',
    SUPABASE_PUBLISHABLE_KEY: undefined, WINERIM_RESTAURANT_UUID: undefined,
    invokeWinerimEndpoint: forbidden, fetchStyleRangeWines: forbidden,
    calculateLocalMatchrimAffinity: (profile: Profile, value: unknown) => {
      scoreCalls.push({ profile: clone(profile), attrs: clone(value) });
      return sourceScorer(profile, value);
    },
    fetch: async (input: string, init: RequestInit) => {
      const url = new URL(input);
      assert.ok(active && response);
      assert.equal(url.origin, 'https://recommendations.example.invalid');
      assert.equal(url.pathname, '/functions/v1/matchrim-recommendations');
      assert.equal(init.method, 'GET'); assert.ok(!init.body);
      assert.equal([...url.searchParams.keys()].length, 5);
      assert.ok(attrs.every(k => /^[0-5]$/.test(url.searchParams.get(k) || '')));
      assert.equal(new Headers(init.headers).get('authorization'), null);
      assert.equal(new Headers(init.headers).get('apikey'), null);
      queries.push(url.searchParams.toString());
      return new Response(JSON.stringify(response), { status: 200 });
    } }) as unknown as Service;
  const run = async (profile: Profile, data: JsonObject, confidence?: number | null): Promise<Result> => {
    assert.ok(!active, 'Sequential in-memory client execution required'); active = true; response = data; queries = []; scoreCalls.length = 0;
    try {
      const wines = await api.fetchWinesByAttributes(clone(profile), { affinityCalibrationConfidence: confidence });
      assert.equal(queries.length, 1);
      if (native) assert.ok(scoreCalls.every(call => same(call.profile, profile)), 'Exact profile axes must reach the real scorer');
      return { wines: clone(wines), metadata: clone(api.getWinerimWineResultsMeta(wines)), query: queries[0], requests: queries.length };
    } finally { active = false; response = undefined; }
  };
  return { run, normalizeTasting: (wine: JsonObject) => clone(api.normalizeTastingAttributes(wine)), scoreCalls };
}

function rows(data: JsonObject): JsonObject[] {
  const wines = data.wines as JsonObject | undefined, nested = data.data as JsonObject | undefined;
  for (const value of [data.results, data.wines, wines?.detail, wines?.home, data.data, nested?.results, nested?.wines]) {
    if (Array.isArray(value)) return value as JsonObject[];
  }
  assert.fail('Unrecognized fixture/captured response shape');
}
const mutations = ['original', 'alternating', 'all-zero', 'all-hundred', 'reverse-raw-rank', 'reversed-input'] as const;
function mutate(data: JsonObject, mutation: typeof mutations[number]) {
  const result = clone(data), list = rows(result);
  if (mutation === 'original') return result;
  if (mutation === 'reversed-input') { list.reverse(); return result; }
  list.forEach((wine, index) => {
    for (const field of ['matchPercentage', 'match_percentage', 'compatibility', 'compatibility_score', 'compatibilidad', 'match']) delete wine[field];
    wine.matchPercentage = mutation === 'all-zero' ? 0 : mutation === 'all-hundred' ? 100
      : mutation === 'alternating' ? index % 2 ? 100 : 0 : Math.round(100 * (list.length - index) / list.length);
  });
  return result;
}
function oracle(profile: Profile, wine: Wine) {
  assert.ok(wine.tastingAttributes);
  const value = wine.tastingAttributes;
  const sum = axes.reduce((total, axis, index) => total + (profile[axis] - value[attrs[index]]) ** 2, 0);
  return Math.round(50 + (100 * (1 - Math.sqrt(sum) / Math.sqrt(125)) - 50) * .85);
}
function assertNative(result: Result, profile: Profile) {
  result.wines.forEach((wine, index) => {
    assert.equal(wine.matchPercentage, oracle(profile, wine));
    assert.equal(wine.affinityModel, 'scan-local-l2-0to5-v2');
    assert.equal(wine.rawMatchPercentage, undefined); assert.equal(wine.affinityConfidence, undefined);
    if (index) {
      const previous = result.wines[index - 1];
      assert.ok(previous.matchPercentage >= wine.matchPercentage);
      if (previous.matchPercentage === wine.matchPercentage) assert.ok(identity(previous) <= identity(wine));
    }
  });
}
const confidences = [undefined, null, 0, 35, 70, 100] as const;
const fixtureProfiles: readonly Profile[] = [
  { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 },
  { potente: 5, acidez: 5, dulce: 5, tanico: 5, afrutado: 5 },
  { potente: .4, acidez: 4.75, dulce: 1.7, tanico: 0, afrutado: 2.5 },
  { potente: 2.5, acidez: 2.5, dulce: 2.5, tanico: 2.5, afrutado: 2.5 },
  { potente: 5, acidez: 0, dulce: 0, tanico: 5, afrutado: 0 },
];
const zero = { power: 0, acidity: 0, sweetness: 0, tannin: 0, fruity: 0 };
const decimal = { power: 0, acidity: .4, sweetness: 1.7, tannin: 0, fruity: 5 };
const wine = (id: string | number, score: number, tasting: JsonObject) => ({ id, name: String(id), winery: 'Frozen synthetic fixture',
  type: 'Tinto', matchPercentage: score, tastingAttributes: tasting });
const fixture: JsonObject = {
  results: [wine('alpha', 12, zero), wine('2', 20, zero), wine(2, 30, zero), wine('10', 40, zero), wine(0, 50, zero),
    wine('ALPHA', 60, zero), wine('decimal', 70, decimal), wine('five', 80, { power: 5, acidity: 5, sweetness: 5, tannin: 5, fruity: 5 }),
    wine('middle', 90, { power: 2.5, acidity: 2.5, sweetness: 2.5, tannin: 2.5, fruity: 2.5 }),
    wine('bad-string', 95, { ...zero, power: '0' }), wine('bad-null', 96, { ...zero, acidity: null }),
    wine('bad-range', 97, { ...zero, tannin: 5.01 }), wine('bad-missing', 98, { power: 0, acidity: 0, sweetness: 0, tannin: 0 })],
  total: 57, searchLevel: 4,
};
function freezeDeep(value: unknown): void {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freezeDeep); }
}
freezeDeep(fixture); freezeDeep(fixtureProfiles);

async function main() {
  const { baselineRef, recordedRoot } = options();
  const currentSource = readFileSync(path.join(repo, servicePath), 'utf8');
  const sourceShaBefore = sha(currentSource);
  const gitSource = execFileSync('git', ['show', '--no-ext-diff', '--no-textconv', baselineRef + ':' + servicePath],
    { cwd: repo, encoding: 'utf8', timeout: 5000, maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const { sources, dependencies } = loadDependencies();
  const oldNative = client(gitSource, dependencies, true), native = client(currentSource, dependencies, true);
  const oldWeb = client(gitSource, dependencies, false), web = client(currentSource, dependencies, false);
  const passed: string[] = [];
  const group = async (name: string, run: () => void | Promise<void>) => { await run(); passed.push(name); console.log('PASS ' + name); };
  const metrics = { fixtureNativeCases: 0, fixtureNativeScoreComparisons: 0, fixtureWebCases: 0, fixtureWebWineComparisons: 0,
    recordedNativeCases: 0, recordedNativeScoreComparisons: 0, recordedWebCases: 0, recordedWebWineComparisons: 0,
    recordedOldTopChanges: 0, recordedNewTopChanges: 0 };
  const frozenInput = JSON.stringify([fixture, fixtureProfiles]);

  await group('Git baseline source guard permits only the final native sort change', () => {
    assert.equal(maskSort(currentSource), maskSort(gitSource));
    assert.ok(gitSource.includes('fetchWinesByAttributes'));
  });
  await group('Equal native scores use stable typed ID/name order', async () => {
    const result = await native.run(fixtureProfiles[0], fixture);
    assert.deepEqual(result.wines.slice(0, 6).map(item => item.id), [0, '10', 2, '2', 'ALPHA', 'alpha']);
    assertNative(result, fixtureProfiles[0]);
  });
  await group('Raw-score perturbations leave all native results exactly unchanged', async () => {
    for (const profile of fixtureProfiles) {
      const initial = await native.run(profile, fixture);
      for (const mutation of mutations) {
        const data = mutate(fixture, mutation), before = await oldNative.run(profile, data), after = await native.run(profile, data);
        assert.ok(same(after, initial)); assert.ok(same(byId(before.wines), byId(after.wines)));
        assertNative(after, profile); metrics.fixtureNativeCases++; metrics.fixtureNativeScoreComparisons += after.wines.length;
      }
    }
  });
  await group('Actual request builder retains the exact five rounded query parameters', async () => {
    for (const profile of fixtureProfiles) {
      const before = await oldNative.run(profile, fixture), after = await native.run(profile, fixture);
      assert.equal(before.query, after.query);
      const expected = new URLSearchParams(Object.fromEntries(attrs.map((axis, index) => [axis, String(Math.round(profile[axes[index]]))])));
      assert.equal(after.query, expected.toString()); assert.equal(after.requests, 1);
    }
  });
  await group('Native zero and opposite-corner scores remain 93 and 8', async () => {
    const result = await native.run(fixtureProfiles[0], fixture);
    const actualZero = result.wines.find(item => item.id === 0)!;
    assert.ok(same(actualZero.tastingAttributes, { ...zero, scale: 'winerim-0-5' }));
    assert.equal(actualZero.matchPercentage, 93);
    assert.equal(result.wines.find(item => item.id === 'five')!.matchPercentage, 8);
  });
  await group('Fractional official axes and exact fractional profiles are preserved', async () => {
    const result = await native.run(fixtureProfiles[2], fixture);
    assert.ok(same(result.wines.find(item => item.id === 'decimal')!.tastingAttributes, { ...decimal, scale: 'winerim-0-5' }));
    assertNative(result, fixtureProfiles[2]);
  });
  await group('Native invalid source attributes are rejected without rescaling', async () => {
    for (const axis of attrs) for (const bad of [-1, 5.01, '0', false, null, undefined, NaN, Infinity]) {
      assert.equal(native.normalizeTasting({ tastingAttributes: { ...zero, [axis]: bad } }), null);
    }
    const result = await native.run(fixtureProfiles[0], fixture);
    assert.equal(result.wines.length, 9); assert.ok(result.wines.every(item => !String(item.id).startsWith('bad-')));
  });
  await group('Metadata, identity and source provenance remain unchanged', async () => {
    const before = await oldNative.run(fixtureProfiles[0], fixture), after = await native.run(fixtureProfiles[0], fixture);
    assert.ok(same(before.metadata, after.metadata)); assert.ok(same(byId(before.wines), byId(after.wines)));
    assert.equal(after.metadata.totalCount, 57); assert.equal(after.metadata.directCount, 13);
    assert.equal(after.metadata.displayedCount, 9); assert.equal(after.metadata.searchLevel, 4);
    assert.ok(after.wines.every(item => item.originalSheetSource === 'winerim-api' && item.matchSource === 'winerim-api'));
  });
  await group('Current-profile scores, not previous or upstream scores, determine rank', async () => {
    const low = await native.run(fixtureProfiles[0], fixture), high = await native.run(fixtureProfiles[1], fixture);
    assert.equal(low.wines[0].id, 0); assert.equal(high.wines[0].id, 'five');
    assert.equal(high.wines[0].matchPercentage, 93); assertNative(high, fixtureProfiles[1]);
    assert.ok(same(high, await native.run(fixtureProfiles[1], mutate(fixture, 'alternating'))));
  });
  await group('Input permutations and opaque/case-sensitive IDs have deterministic ties', async () => {
    const initial = await native.run(fixtureProfiles[0], fixture);
    const reversed = mutate(fixture, 'reversed-input');
    const rotated = clone(fixture), list = rows(rotated); list.push(...list.splice(0, 4));
    assert.ok(same(initial, await native.run(fixtureProfiles[0], reversed)));
    assert.ok(same(initial, await native.run(fixtureProfiles[0], rotated)));
  });
  await group('Legacy web order, scores, fields and metadata exactly match Git source', async () => {
    for (const profile of fixtureProfiles) for (const mutation of mutations) for (const confidence of confidences) {
      const data = mutate(fixture, mutation), before = await oldWeb.run(profile, data, confidence), after = await web.run(profile, data, confidence);
      assert.ok(same(before, after)); metrics.fixtureWebCases++; metrics.fixtureWebWineComparisons += after.wines.length;
    }
  });
  await group('Frozen legacy web golden order and legacy zero-to-one behavior remain intact', async () => {
    const result = await web.run(fixtureProfiles[0], fixture);
    assert.deepEqual(result.wines.map(item => item.id), ['bad-missing', 'bad-range', 'bad-null', 'bad-string', 'middle', 'five', 'decimal', 'ALPHA', 0, '10', 2, '2', 'alpha']);
    assert.deepEqual(result.wines.map(item => item.matchPercentage), [98, 97, 96, 95, 90, 80, 70, 60, 50, 40, 30, 20, 12]);
    const legacyZero = result.wines.find(item => item.id === 0)!;
    assert.equal(legacyZero.tastingAttributes!.power, 1); assert.equal(legacyZero.affinityModel, 'raw-v1');
    assert.equal(legacyZero.rawMatchPercentage, 50);
  });
  await group('Legacy web calibrated score golden remains unchanged', async () => {
    const result = await web.run(fixtureProfiles[0], fixture, 35);
    const middle = result.wines.find(item => item.id === 'middle')!;
    assert.equal(middle.matchPercentage, 87); assert.equal(middle.rawMatchPercentage, 90);
    assert.equal(middle.affinityConfidence, 35); assert.equal(middle.affinityModel, 'confidence-v1');
  });
  await group('Frozen inputs stay immutable and default execution performs zero network/writes', () => {
    assert.equal(JSON.stringify([fixture, fixtureProfiles]), frozenInput);
    assert.equal(accidentalNetworkCalls, 0);
    assert.equal(sha(readFileSync(path.join(repo, servicePath))), sourceShaBefore);
  });

  if (recordedRoot) {
    const manifest = readJson<{ sourceHashes: Record<string, { sha256: string }> }>(path.join(recordedRoot, 'live-01/manifest.json'));
    const capturedSource = readFileSync(path.join(recordedRoot, 'live-01/sources/service.ts'), 'utf8');
    assert.equal(sha(capturedSource), manifest.sourceHashes.service.sha256);
    assert.equal(maskSort(capturedSource), maskSort(currentSource));
    for (const [name, text] of Object.entries(sources)) {
      if (name !== 'calibration') assert.equal(sha(text), manifest.sourceHashes[name].sha256);
    }
    const captures = new Map<string, { body: Buffer; data: JsonObject; hash: string }>();
    for (let index = 1; index <= 42; index++) {
      const stem = String(index).padStart(3, '0');
      const meta = readJson<{ status: number; bodyComplete: boolean; query: string; bodySha256: string }>(path.join(recordedRoot, 'live-01/network', stem + '.json'));
      const body = readFileSync(path.join(recordedRoot, 'live-01/network', stem + '.body'));
      assert.equal(meta.status, 200); assert.equal(meta.bodyComplete, true); assert.equal(sha(body), meta.bodySha256);
      captures.set(meta.query, { body, hash: meta.bodySha256, data: JSON.parse(body.toString()) as JsonObject });
    }
    const recordedCases: RecordedCase[] = readdirSync(path.join(recordedRoot, 'replay-01/profiles')).filter(name => name.endsWith('.json')).map(name => {
      const profile = readJson<RecordedProfile>(path.join(recordedRoot, 'replay-01/profiles', name));
      const capture = captures.get(profile.responseQuery); assert.ok(capture); assert.equal(capture.hash, profile.responseSha256);
      return { profile, data: capture.data };
    }).sort((a, b) => a.profile.index - b.profile.index);
    assert.equal(recordedCases.length, 50);
    assert.deepEqual(recordedCases.map(item => item.profile.index), Array.from({ length: 50 }, (_, index) => index));
    const capturedNative = client(capturedSource, dependencies, true), capturedWeb = client(capturedSource, dependencies, false);
    await group('Explicit recorded matrix preserves old 12 tied-top failures and fixes all 50 profiles', async () => {
      let ownQueries = 0;
      for (const { profile, data } of recordedCases) {
        if (profile.coverage === 'REPLAY_OF_OWN_PREVIOUS_PUBLIC_QUERY') ownQueries++;
        const before = await capturedNative.run(profile.exactBaseProfile, data), beforePoison = await capturedNative.run(profile.exactBaseProfile, mutate(data, 'alternating'));
        assert.ok(same(order(before.wines), profile.rawScorePoisoning.baseline));
        assert.ok(same(order(beforePoison.wines), profile.rawScorePoisoning.poisoned));
        const oldMoved = before.wines[0]?.id !== beforePoison.wines[0]?.id;
        assert.equal(oldMoved, profile.rawScorePoisoning.topChoiceChangedOnEqualAffinity);
        metrics.recordedOldTopChanges += Number(oldMoved);
        const initial = await native.run(profile.exactBaseProfile, data);
        for (const mutation of mutations) {
          const after = await native.run(profile.exactBaseProfile, mutate(data, mutation));
          assert.ok(same(initial, after)); assertNative(after, profile.exactBaseProfile);
          metrics.recordedNewTopChanges += Number(initial.wines[0]?.id !== after.wines[0]?.id);
          metrics.recordedNativeCases++; metrics.recordedNativeScoreComparisons += after.wines.length;
        }
      }
      assert.equal(ownQueries, 42); assert.equal(metrics.recordedOldTopChanges, 12); assert.equal(metrics.recordedNewTopChanges, 0);
    });
    await group('Explicit recorded legacy web matrix exactly matches captured baseline source', async () => {
      for (const { profile, data } of recordedCases) for (const mutation of mutations) for (const confidence of confidences) {
        const payload = mutate(data, mutation), before = await capturedWeb.run(profile.exactBaseProfile, payload, confidence), after = await web.run(profile.exactBaseProfile, payload, confidence);
        assert.ok(same(before, after)); metrics.recordedWebCases++; metrics.recordedWebWineComparisons += after.wines.length;
      }
    });
  }
  assert.equal(accidentalNetworkCalls, 0);
  assert.equal(sha(readFileSync(path.join(repo, servicePath))), sourceShaBefore);
  console.log(JSON.stringify({ status: 'PASS', groups: passed.length, baselineRef, recordedRootRead: Boolean(recordedRoot),
    realRequests: 0, filesWritten: 0, serviceSha256: sourceShaBefore, ...metrics }));
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Recommendation-order CI failed');
  process.exitCode = 1;
});
