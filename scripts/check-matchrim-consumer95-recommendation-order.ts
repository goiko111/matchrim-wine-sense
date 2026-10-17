import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Offline source-execution regression. No Vite/Supabase client initialization,
// credentials, sessions, network, native build, simulator or QA server access.
const REPO = '/Users/GOIKO/2matchrim76-recognition-20261008';
const A95 = '/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-eight-hours-20261017';
const PRIVATE = path.join(A95, 'recommendations95');
const LIVE = path.join(PRIVATE, 'live-01');
const BASELINE = path.join(PRIVATE, 'replay-01');
const PROFILE_SHA = '00061bd5b722b9e62f12337c64fc17cbf7342f93dd19e9a5623987b39c34272c';
const ORIGIN = 'https://cbjynrbvrhcmpaojmqdp.supabase.co';
const ENDPOINT = '/functions/v1/matchrim-recommendations';
const AXES = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const ATTRS = ['power', 'acidity', 'sweetness', 'tannin', 'fruity'] as const;
type Profile = Record<typeof AXES[number], number>;
type RecordValue = Record<string, unknown>;
interface Persona { id: string; base: Profile; synthetic: true; realPerson: false }
interface Wine extends RecordValue { id: string | number; name: string; matchPercentage: number;
  tastingAttributes: Record<typeof ATTRS[number], number> | null }
interface Run { wines: Wine[]; metadata: RecordValue; query: string; requestCount: number }
interface Service {
  fetchWinesByAttributes(profile: Profile, options: { affinityCalibrationConfidence?: number | null }): Promise<Wine[]>;
  getWinerimWineResultsMeta(wines: Wine[]): RecordValue;
}
interface SourceHashes { [key: string]: { sha256: string } }
interface WireMeta { sequence: number; query: string; status: number; bodySha256: string; bodyComplete: boolean }
interface Capture { meta: WireMeta; body: Buffer; data: RecordValue }
interface OldReport { responseQuery: string; responseSha256: string; coverage: string;
  rawScorePoisoning: { baseline: { id: string | number; affinity: number }[];
    poisoned: { id: string | number; affinity: number }[]; topChoiceChangedOnEqualAffinity: boolean } }

const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const copy = <T>(value: T): T => structuredClone(value);
const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const readJson = <T>(filename: string): T => JSON.parse(readFileSync(filename, 'utf8')) as T;
const key = (wine: Wine) => JSON.stringify([String(wine.id), typeof wine.id, wine.name]);
const scoreOrder = (wines: Wine[]) => wines.map(wine => ({ id: wine.id, affinity: wine.matchPercentage }));
const byIdentity = (wines: Wine[]) => [...wines].sort((left, right) => key(left) < key(right) ? -1 : key(left) > key(right) ? 1 : 0);
const quietConsole = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
globalThis.fetch = async () => { throw new Error('Offline recommendation-order QA: network forbidden'); };

const files = {
  service: 'src/services/winerimApi.ts', affinity: 'src/utils/wineAffinityExplanation.ts',
  passport: 'src/utils/matchrimPassport.ts', sensory: 'src/utils/winerimOriginalSheet.ts',
  scanValues: 'supabase/functions/_shared/matchrim-scan-values.ts', classifier: 'src/lib/winerimClassifier.ts',
  calibration: 'src/utils/matchrimAffinityCalibration.ts',
};
const serviceNames = [
  'winerimWineResultsMeta', 'getWinerimWineResultsMeta', 'textFromUnknown', 'normalizeCurrency', 'inferPriceKind',
  'normalizePrice', 'asRecord', 'normalizeAttributeTo5', 'normalizeTastingAttributes', 'normalizeWineId',
  'normalizeMatchPercentage', 'stringValue', 'normalizeGrapes', 'normalizeWinerimWine', 'extractWineResults',
  'extractTotalCount', 'calculateProfileMatchPercentage', 'classifyWineByV41Style', 'mergeUniqueWines',
  'isFallbackRestaurantUuid', 'invokeMatchrimRecommendations', 'fetchWinesByAttributes',
];

function astFor(source: string) { return ts.createSourceFile('actual.ts', source, ts.ScriptTarget.Latest, true); }
function allVariables(source: string) {
  return astFor(source).statements.flatMap(statement => ts.isVariableStatement(statement)
    ? statement.declarationList.declarations.flatMap(declaration => ts.isIdentifier(declaration.name) ? [declaration.name.text] : []) : []);
}
function selectActual(source: string, names: string[]) {
  const ast = astFor(source), selected: string[] = [], found = new Set<string>();
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && names.includes(declaration.name.text)) {
        check(!found.has(declaration.name.text), 'Duplicate actual declaration');
        found.add(declaration.name.text); selected.push('const ' + declaration.getText(ast) + ';');
      }
    }
  }
  check(found.size === names.length, 'Actual source declaration contract changed');
  const result = ts.transpileModule(selected.join('\n') + '\nglobalThis.__qa95={' + names.join(',') + '};', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }, reportDiagnostics: true,
  });
  check(!(result.diagnostics || []).some(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error), 'Actual source parse failed');
  return new vm.Script(result.outputText);
}
function execute(script: vm.Script, dependencies: RecordValue = {}): RecordValue {
  const context = vm.createContext({ console: quietConsole, URL, URLSearchParams, Response, DOMException,
    ...dependencies }, { codeGeneration: { strings: false, wasm: false } });
  script.runInContext(context, { timeout: 3000 });
  return context.__qa95 as RecordValue;
}

function maskNativeSort(source: string) {
  const ast = astFor(source), matches: ts.IfStatement[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isIfStatement(node) && node.expression.getText(ast) === 'Capacitor.isNativePlatform()'
      && node.thenStatement.getText(ast).includes('results.sort(')) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); check(matches.length === 1, 'Exactly one final native result-sort statement expected');
  return source.slice(0, matches[0].getStart(ast)) + '/* QA95_FINAL_NATIVE_SORT */' + source.slice(matches[0].end);
}

function makeClient(serviceScript: vm.Script, dependencies: RecordValue, native: boolean) {
  let pending: RecordValue | undefined, requests: string[] = [], running = false;
  const unavailable = () => { throw new Error('Non-global endpoint is forbidden in offline recommendation QA'); };
  const api = execute(serviceScript, { ...dependencies, Capacitor: { isNativePlatform: () => native },
    SUPABASE_URL: ORIGIN, SUPABASE_PUBLISHABLE_KEY: undefined, WINERIM_RESTAURANT_UUID: undefined,
    invokeWinerimEndpoint: unavailable, fetchStyleRangeWines: unavailable,
    fetch: async (input: string, init: RequestInit) => {
      const url = new URL(input);
      check(running && pending && init.method === 'GET' && !init.body && url.origin === ORIGIN && url.pathname === ENDPOINT,
        'Only the actual source GET may reach the in-memory response adapter');
      check([...url.searchParams.keys()].length === 5 && ATTRS.every(k => /^[0-5]$/.test(url.searchParams.get(k) || '')),
        'Actual rounded query contract changed');
      requests.push(url.searchParams.toString());
      return new Response(JSON.stringify(pending), { status: 200 });
    } }) as unknown as Service;
  return async (profile: Profile, data: RecordValue, options: { affinityCalibrationConfidence?: number | null } = {}): Promise<Run> => {
    check(!running, 'Source execution must stay sequential'); pending = data; requests = []; running = true;
    try {
      const wines = await api.fetchWinesByAttributes(copy(profile), options);
      check(requests.length === 1, 'Exactly one mocked actual-client GET expected');
      return { wines: copy(wines), metadata: copy(api.getWinerimWineResultsMeta(wines)), query: requests[0], requestCount: requests.length };
    } finally { running = false; pending = undefined; }
  };
}

function responseRows(data: RecordValue): RecordValue[] {
  const wines = data.wines as RecordValue | undefined, nested = data.data as RecordValue | undefined;
  for (const candidate of [data.results, data.wines, wines?.detail, wines?.home, data.data, nested?.results, nested?.wines]) {
    if (Array.isArray(candidate)) return candidate as RecordValue[];
  }
  throw new Error('Captured response shape changed');
}
const mutations = ['original', 'alternating', 'all-zero', 'all-hundred', 'reverse-raw-rank', 'reversed-candidate-input'] as const;
function mutated(data: RecordValue, name: typeof mutations[number]) {
  const result = copy(data), rows = responseRows(result);
  if (name === 'original') return result;
  if (name === 'reversed-candidate-input') { rows.reverse(); return result; }
  rows.forEach((wine, index) => {
    for (const field of ['matchPercentage', 'match_percentage', 'compatibility', 'compatibility_score', 'compatibilidad', 'match']) delete wine[field];
    wine.matchPercentage = name === 'all-zero' ? 0 : name === 'all-hundred' ? 100
      : name === 'alternating' ? index % 2 ? 100 : 0 : Math.round(100 * (rows.length - index) / rows.length);
  });
  return result;
}

function independentScore(profile: Profile, wine: Wine) {
  check(wine.tastingAttributes, 'Native output must have strict official sensory values');
  const attrs = wine.tastingAttributes;
  check(ATTRS.every(k => typeof attrs[k] === 'number' && Number.isFinite(attrs[k]) && attrs[k] >= 0 && attrs[k] <= 5), 'Invalid native sensory output');
  const sum = AXES.reduce((total, axis, index) => total + (profile[axis] - attrs[ATTRS[index]]) ** 2, 0);
  return Math.round(50 + (100 * (1 - Math.sqrt(sum) / Math.sqrt(125)) - 50) * .85);
}
function checkNativeOrder(wines: Wine[], profile: Profile) {
  for (let index = 0; index < wines.length; index++) {
    check(wines[index].matchPercentage === independentScore(profile, wines[index]), 'Independent native numeric oracle mismatch');
    if (index > 0) {
      const previous = wines[index - 1], current = wines[index];
      check(previous.matchPercentage >= current.matchPercentage, 'Native score order is not descending');
      if (previous.matchPercentage === current.matchPercentage) check(key(previous) <= key(current), 'Native tie must use deterministic identity');
    }
  }
}
function write(file: string, value: string | Buffer | unknown) {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}

async function main() {
  process.umask(0o077);
  check(process.argv.length === 4 && process.argv[2] === '--out', 'Usage: check-matchrim-consumer95-recommendation-order.ts --out NEW_PRIVATE_DIR');
  const out = path.resolve(process.argv[3]);
  check(out.startsWith(PRIVATE + path.sep) && !existsSync(out), 'Fresh private evidence directory required');
  mkdirSync(out, { recursive: true, mode: 0o700 });
  const ledgerFile = path.join(PRIVATE, 'real-get-ledger.jsonl'), ledgerBefore = digest(readFileSync(ledgerFile));
  const liveManifest = readJson<{ sourceHashes: SourceHashes }>(path.join(LIVE, 'manifest.json'));
  const sources: Record<string, string> = {}, dependencyHashes: Record<string, string> = {};
  for (const [name, filename] of Object.entries(files)) {
    const current = readFileSync(path.join(REPO, filename), 'utf8');
    sources[name] = current; dependencyHashes[name] = digest(current);
    if (name !== 'service' && name !== 'calibration') check(digest(current) === liveManifest.sourceHashes[name].sha256,
      'Pure dependency changed since immutable baseline: ' + name);
    write(path.join(out, 'sources', name + '.ts'), current);
  }
  const baselineSource = readFileSync(path.join(LIVE, 'sources/service.ts'), 'utf8');
  check(digest(baselineSource) === liveManifest.sourceHashes.service.sha256, 'Baseline service source hash mismatch');
  check(maskNativeSort(baselineSource) === maskNativeSort(sources.service), 'Change extends beyond the final native sort statement');
  write(path.join(out, 'baseline-service.ts'), baselineSource);
  const bytes = readFileSync(path.join(A95, 'personas/synthetic-profiles.json'));
  check(digest(bytes) === PROFILE_SHA, 'Immutable profile source changed');
  const profiles = JSON.parse(bytes.toString()) as Persona[];
  check(profiles.length === 50 && profiles.every(p => p.synthetic && p.realPerson === false), '50 immutable synthetic profiles required');
  const captures = new Map<string, Capture>();
  for (let sequence = 1; sequence <= 42; sequence++) {
    const stem = String(sequence).padStart(3, '0');
    const meta = readJson<WireMeta>(path.join(LIVE, 'network', stem + '.json'));
    const body = readFileSync(path.join(LIVE, 'network', stem + '.body'));
    check(meta.status === 200 && meta.bodyComplete && digest(body) === meta.bodySha256, 'Immutable real response body/hash mismatch');
    captures.set(meta.query, { meta, body, data: JSON.parse(body.toString()) as RecordValue });
  }
  const scan = execute(selectActual(sources.scanValues, ['optionalScanNumber', 'normalizeScanSensoryValue']));
  const affinity = execute(selectActual(sources.affinity, ['clampAttribute', 'normalizeProfileAttribute', 'normalizeWineAttributesForInsight', 'calculateLocalMatchrimAffinity']), scan);
  const passport = execute(selectActual(sources.passport, ['clamp', 'normalizeMatchrimProfileForClassifier']));
  const sensory = execute(selectActual(sources.sensory, ['record', 'validateWinerimOriginalSensory']));
  const classifier = execute(selectActual(sources.classifier, allVariables(sources.classifier)));
  const calibration = execute(selectActual(sources.calibration, allVariables(sources.calibration)));
  const dependencies = { ...scan, ...affinity, ...passport, ...sensory, ...classifier, ...calibration };
  const beforeScript = selectActual(baselineSource, serviceNames), afterScript = selectActual(sources.service, serviceNames);
  const beforeNative = makeClient(beforeScript, dependencies, true), afterNative = makeClient(afterScript, dependencies, true);
  const beforeWeb = makeClient(beforeScript, dependencies, false), afterWeb = makeClient(afterScript, dependencies, false);
  const baselineFailures: string[] = [], baselineOrderFailures: string[] = [];
  const reports: unknown[] = [];
  let nativeCases = 0, webCases = 0, numericChecks = 0, webWineChecks = 0, profileChanges = 0, ownQueries = 0;
  const confidences = [undefined, null, 0, 35, 70, 100] as const;
  for (const [index, persona] of profiles.entries()) {
    const preserved = readJson<OldReport>(path.join(BASELINE, 'profiles', persona.id + '.json'));
    const capture = captures.get(preserved.responseQuery);
    check(capture && capture.meta.bodySha256 === preserved.responseSha256, 'Original qualified matrix mapping changed');
    if (preserved.coverage === 'REPLAY_OF_OWN_PREVIOUS_PUBLIC_QUERY') ownQueries++;
    const before = await beforeNative(persona.base, capture.data), after = await afterNative(persona.base, capture.data);
    check(equal(scoreOrder(before.wines), preserved.rawScorePoisoning.baseline), 'Original observed baseline was not preserved');
    check(equal(byIdentity(before.wines), byIdentity(after.wines)), 'Native fields or numeric scores changed, not just order');
    check(equal(before.metadata, after.metadata) && before.query === after.query, 'Native metadata or actual query changed');
    checkNativeOrder(after.wines, persona.base);
    const mutationEvidence: unknown[] = [];
    for (const mutation of mutations) {
      const data = mutated(capture.data, mutation);
      const nativeBefore = mutation === 'original' ? before : await beforeNative(persona.base, data);
      const nativeAfter = mutation === 'original' ? after : await afterNative(persona.base, data);
      check(equal(nativeAfter, after), 'Native result changes with raw scores or candidate order: ' + persona.id + ':' + mutation);
      check(equal(byIdentity(nativeBefore.wines), byIdentity(nativeAfter.wines)), 'Native mutation changed numeric values or source fields');
      checkNativeOrder(nativeAfter.wines, persona.base);
      nativeCases++; numericChecks += nativeAfter.wines.length;
      if (mutation === 'alternating') {
        check(equal(scoreOrder(nativeBefore.wines), preserved.rawScorePoisoning.poisoned), 'Preserved raw-perturbation FAIL baseline changed');
        if (!equal(scoreOrder(before.wines), scoreOrder(nativeBefore.wines))) baselineOrderFailures.push(persona.id);
        const moved = before.wines[0]?.id !== nativeBefore.wines[0]?.id;
        check(moved === preserved.rawScorePoisoning.topChoiceChangedOnEqualAffinity, 'Preserved tied-top failure mismatch');
        if (moved) baselineFailures.push(persona.id);
      }
      const webEvidence: unknown[] = [];
      for (const confidence of confidences) {
        const options = { affinityCalibrationConfidence: confidence };
        const webBefore = await beforeWeb(persona.base, data, options), webAfter = await afterWeb(persona.base, data, options);
        check(equal(webBefore, webAfter), 'Legacy web order, values, source fields, metadata or query changed');
        webCases++; webWineChecks += webAfter.wines.length;
        webEvidence.push({ confidence: confidence === undefined ? 'omitted' : confidence, exactFullResultParity: true,
          baselineSha256: digest(JSON.stringify(webBefore)), afterSha256: digest(JSON.stringify(webAfter)) });
      }
      mutationEvidence.push({ mutation, nativeRawOrderIndependence: 'PASS', numericAndSourceFieldsUnchanged: true,
        baselineOrder: scoreOrder(nativeBefore.wines), afterOrder: scoreOrder(nativeAfter.wines), web: webEvidence });
    }
    const first = after.wines[0];
    check(first?.tastingAttributes, 'Captured matrix must provide an official sensory row');
    const attrs = first.tastingAttributes;
    const changed = Object.fromEntries(AXES.map((axis, i) => [axis, first.matchPercentage === 93 ? attrs[ATTRS[i]] <= 2.5 ? 5 : 0 : attrs[ATTRS[i]]])) as Profile;
    const changedBefore = await beforeNative(changed, capture.data), changedAfter = await afterNative(changed, capture.data);
    const changedPoison = await afterNative(changed, mutated(capture.data, 'alternating'));
    check(equal(byIdentity(changedBefore.wines), byIdentity(changedAfter.wines)), 'Current-profile numeric values changed across source versions');
    check(equal(changedAfter, changedPoison), 'Changed-profile native tie order depends on raw scores');
    checkNativeOrder(changedAfter.wines, changed);
    const initialById = new Map(after.wines.map(wine => [JSON.stringify([typeof wine.id, wine.id]), wine.matchPercentage]));
    check(changedAfter.wines.some(wine => initialById.get(JSON.stringify([typeof wine.id, wine.id])) !== wine.matchPercentage), 'Current-profile recalculation was not demonstrated');
    profileChanges++;
    const report = { persona: persona.id, index, exactBaseProfile: persona.base, coverage: preserved.coverage,
      responseQuery: preserved.responseQuery, bodySha256: preserved.responseSha256,
      baselineStatus: 'FAIL_RAW_UPSTREAM_TIE_ORDER_INDEPENDENCE_PRESERVED', baselineTopChoiceFailure: baselineFailures.includes(persona.id),
      afterStatus: 'PASS_NATIVE_CANONICAL_TIES_AND_EXACT_WEB_PARITY', baseline: before, after,
      expectedAndActualScores: after.wines.map(wine => ({ id: wine.id, expected: independentScore(persona.base, wine), actual: wine.matchPercentage })),
      mutations: mutationEvidence, changedProfile: { profile: changed, originalNumericFieldsPreserved: true,
        deterministicUnderRawPerturbation: true, after: changedAfter } };
    reports.push(report); write(path.join(out, 'profiles', persona.id + '.json'), report);
  }
  const originalSummary = readJson<{ profilesWithPoisonedEqualAffinityTopChoiceChange: string[] }>(path.join(BASELINE, 'summary.json'));
  check(baselineFailures.length === 12 && equal([...baselineFailures].sort(), [...originalSummary.profilesWithPoisonedEqualAffinityTopChoiceChange].sort()),
    'The 12 original tied-top FAIL cases must remain preserved');
  check(baselineOrderFailures.length === 50, 'The full observed baseline tie-order sensitivity must remain preserved');
  check(ownQueries === 42, 'Qualified matrix must remain 42 own queries plus eight local replays');

  const fixtureIds = ['alpha', '2', 2, '10', 0, 'ALPHA'];
  const fixture = { results: fixtureIds.map((id, index) => ({ id, name: ['a', 'Z', 'A', 'Name', 'Zero', 'accent'][index],
    winery: 'Offline fixture, not producer evidence', matchPercentage: index * 17,
    tastingAttributes: { power: 0, acidity: 0, sweetness: 0, tannin: 0, fruity: 0 } })) };
  const expectedIds = [0, '10', 2, '2', 'ALPHA', 'alpha'];
  for (const mutation of mutations) {
    const run = await afterNative(profiles[0].base, mutated(fixture, mutation));
    check(equal(run.wines.map(wine => wine.id), expectedIds), 'Typed/case-sensitive canonical ID order is not deterministic');
    check(run.wines.every(wine => wine.matchPercentage === 93), 'Tie-only fixture must not change the numeric formula');
  }
  const ledgerAfter = digest(readFileSync(ledgerFile));
  check(ledgerBefore === ledgerAfter, 'Real request ledger changed during offline remediation');
  const summary = { status: 'PASS_NATIVE_TIE_REMEDIATION_WITH_EXACT_LEGACY_WEB_PARITY', realGETs: 0,
    capturedBodiesReused: captures.size, immutableProfiles: profiles.length, ownCapturedQueries: ownQueries,
    crossQueryLocalReplays: profiles.length - ownQueries, original12TiedTopFailBaselinePreserved: baselineFailures,
    original50OrderSensitivityBaselinePreserved: baselineOrderFailures.length,
    nativeMutationCases: nativeCases, independentNumericComparisons: numericChecks,
    nativeRawPerturbationOrderChangesAfterFix: 0, nativeRawPerturbationTopChoiceChangesAfterFix: 0,
    currentProfileChangeCases: profileChanges, legacyWebExactParityCases: webCases, legacyWebWineComparisons: webWineChecks,
    webConfidenceModes: confidences.map(value => value === undefined ? 'omitted' : value), canonicalFixtureCases: mutations.length,
    onlyProductChange: 'Final native result-sort statement. Numeric formula, source normalization, shared merge, query and full legacy web source unchanged.',
    canonicalTieKey: '[String(wine.id), typeof wine.id, wine.name] serialized and compared by UTF-16 code unit; no runtime locale or raw affinity',
    beforeServiceSha256: digest(baselineSource), afterServiceSha256: digest(sources.service), dependencyHashes,
    profileSourceSha256: PROFILE_SHA, realGetLedgerSha256Before: ledgerBefore, realGetLedgerSha256After: ledgerAfter,
    testRunnerSha256: digest(readFileSync(path.join(REPO, 'scripts/check-matchrim-consumer95-recommendation-order.ts'))),
    preservedBaselineDirectory: BASELINE, evidenceDirectory: out,
    scope: 'Actual service/dependency declarations executed from TypeScript AST in a VM, before and after; all fetches answered from immutable captured public responses. Not native UI, live-query coverage for all 50, provider/producer ground truth or predictive accuracy.' };
  write(path.join(out, 'summary.json'), summary);
  write(path.join(out, 'preserved-12-baseline-fails.json'), { status: 'FAIL_BASELINE_PRESERVED_NOT_OVERWRITTEN', personas: baselineFailures });
  write(path.join(out, 'matrix.json'), reports.map((report, index) => ({ persona: profiles[index].id, details: 'profiles/' + profiles[index].id + '.json' })));
  console.log(JSON.stringify({ status: summary.status, realGETs: 0, profiles: profiles.length,
    nativeCases, nativeNumericComparisons: numericChecks, webCases, webWineChecks, baselineTopFailuresPreserved: baselineFailures.length, out }));
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Offline recommendation-order harness failure');
  process.exitCode = 1;
});
