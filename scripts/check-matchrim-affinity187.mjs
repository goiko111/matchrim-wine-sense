import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import ts from 'typescript';
import { makeProfiles131 } from './matchrim-profiles131-fixture.mjs';
import { restoreAffinity187 } from './native-affinity187-scope.mjs';

const root = path.resolve(process.argv[2]);
assert(root.startsWith(path.resolve('qa-artifacts/continuation187-20261023') + path.sep));
assert(!fs.existsSync(root));
fs.mkdirSync(root, { recursive: true, mode: 0o700 });
const files = ['src/utils/wineAffinityExplanation.ts', 'src/utils/bodegaAffinity.ts',
  'src/utils/cellarReferenceStyle110.ts', 'src/utils/nativeRecommendation95.ts',
  'src/services/winerimApi.ts', 'src/components/CellarWineAffinity.tsx'];
const before = Object.fromEntries(files.map(file => [file, execFileSync('git', ['show', '878f648:' + file], { encoding: 'utf8' })]));
const entry = `export * from './src/utils/wineAffinityExplanation';
export * from './src/utils/bodegaAffinity';
export * from './src/utils/scanWineEvidence';
export * from './src/utils/menuProfileRecovery';
export * from './src/utils/multiWineConsumer95';
export * from './src/utils/menuWineConsumer95';
export * from './src/utils/nativeRecommendation95';
export * from './src/services/winerimApi';`;
const load = async legacy => {
  const result = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent',
    define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://recommendations187.example.invalid' }) },
    plugins: [{ name: 'actual-platform187', setup(api) {
      api.onResolve({ filter: /^@capacitor\/core$/ }, () => ({ path: 'platform', namespace: 'fixture187' }));
      api.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'client', namespace: 'fixture187' }));
      api.onLoad({ filter: /.*/, namespace: 'fixture187' }, ({ path: file }) => ({ contents: file === 'platform'
        ? 'export const Capacitor = { isNativePlatform: () => globalThis.native187 };'
        : 'export const supabase = new Proxy({}, { get() { throw new Error("NO_DATABASE187"); } });' }));
      if (legacy) api.onLoad({ filter: /\/src\/.*\.(ts|tsx)$/ }, ({ path: absolute }) => {
        const file = path.relative(process.cwd(), absolute);
        return file in before ? { contents: before[file], loader: file.endsWith('.tsx') ? 'tsx' : 'ts' } : null;
      });
    } }] });
  const state = { payload: null, requests: 0 };
  const context = vm.createContext({ exports: {}, module: { exports: {} }, native187: false,
    console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
    URL, URLSearchParams, Headers, Request, Response, AbortController, AbortSignal, DOMException, setTimeout, clearTimeout,
    fetch: (input, init) => {
      const url = new URL(input);
      assert(state.payload && url.origin === 'https://recommendations187.example.invalid'
        && url.pathname === '/functions/v1/matchrim-recommendations' && init.method === 'GET');
      state.requests++;
      return Promise.resolve(new Response(JSON.stringify(state.payload), { status: 200 }));
    } });
  vm.runInContext(result.outputFiles[0].text, context);
  return { api: context.module.exports, context, state };
};
const old = await load(true), current = await load(false), api = current.api;
const plain = value => JSON.parse(JSON.stringify(value));
const all = value => ({ potente: value, acidez: value, dulce: value, tanico: value, afrutado: value });
const attributes = p => ({ scale: 'winerim-0-5', potencia: p.potente, acidez: p.acidez,
  dulzura: p.dulce, taninos: p.tanico, afrutado: p.afrutado });
const values = [0, 1, 2, 3, 4, 5];
const snapshot = profile => ({ profile, source: 'quiz', status: 'ready', samples: 0, note: 'SYNTHETIC187' });
const date = '2026-10-23T00:00:00.000Z';
const row = p => {
  const wine = { name: 'Synthetic187', producer: 'Synthetic producer', vintage: 2024, region: 'Synthetic', country: 'ES', sensory_attributes: attributes(p) };
  return { ...wine, place_details: { bodega_sensory_evidence: api.makeCellarCatalogEvidence(wine, 'SYN-TRUSTED187', wine.sensory_attributes) } };
};
const checks = [];
const check = (name, run) => { try { run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error.stack }); } };
old.context.native187 = true; current.context.native187 = true;
check('retained native v2 counterexample is24; selected native v3 is25', () => {
  assert.equal(old.api.calculateLocalMatchrimAffinity(all(0), attributes(all(4))), 24);
  assert.equal(api.calculateLocalMatchrimAffinity(all(0), attributes(all(4))), 25);
  assert.equal(api.currentLocalAffinityModel187(attributes(all(4))), 'scan-local-rms-0to5-v3');
  assert.equal(api.calculateLocalMatchrimAffinity(all(0), attributes(all(4)), 'scan-local-l2-0to5-v2'), 24);
});
check('7776 integer vectors agree with independent squared-threshold rounding oracle', () => {
  const target = attributes(all(4));
  for (const a of values) for (const b of values) for (const c of values) for (const d of values) for (const e of values) {
    const p = { potente: a, acidez: b, dulce: c, tanico: d, afrutado: e };
    const squared = [a, b, c, d, e].reduce((sum, value) => sum + (value - 4) ** 2, 0);
    let expected = 8;
    for (let n = 93; n >= 8; n--) if ((93 - n) ** 2 * 125 >= 7225 * squared) { expected = n; break; }
    assert.equal(api.calculateLocalMatchrimAffinity(p, target), expected, JSON.stringify(p));
  }
});
check('300 decimal vectors use exact hundredths oracle;12near-half controls round on the correct side', () => {
  for (const { profile } of makeProfiles131('00000000-0000-4000-8000-000000018700')) {
    for (const value of [0, .25, .4, 1.7, 4.75, 5]) {
      const squaredHundredths = Object.values(profile).reduce((sum, axis) => sum + (Math.round(axis * 100) - Math.round(value * 100)) ** 2, 0);
      let expected = 8;
      for (let n = 93; n >= 8; n--) if ((93 - n) ** 2 * 1250000 >= 7225 * squaredHundredths) { expected = n; break; }
      assert.equal(api.calculateLocalMatchrimAffinity(profile, attributes(all(value))), expected);
    }
  }
  for (const value of [1, 2, 3, 4]) {
    const tie = Math.round(92.5 - 17 * value);
    assert.equal(api.calculateLocalMatchrimAffinity(all(0), attributes(all(value))), tie);
    assert.equal(api.calculateLocalMatchrimAffinity(all(0), attributes(all(value - 1e-8))), tie);
    assert.equal(api.calculateLocalMatchrimAffinity(all(0), attributes(all(value + 1e-8))), tie - 1);
  }
});
check('runtime platform switch keeps web/default and unmarked inputs exactly legacy for50profiles', () => {
  current.context.native187 = false;
  for (const { profile } of makeProfiles131('00000000-0000-4000-8000-000000018700')) {
    for (const value of values) {
      const attrs = attributes(all(value));
      assert.equal(api.calculateLocalMatchrimAffinity(profile, attrs), old.api.calculateLocalMatchrimAffinity(profile, attrs));
      assert.equal(api.currentLocalAffinityModel187(attrs), 'scan-local-l2-0to5-v2');
    }
  }
  current.context.native187 = true;
  const attrs = { ...attributes(all(4)), scale: undefined };
  assert.equal(api.currentLocalAffinityModel187(attrs), 'scan-local-l2-v1');
  assert.equal(api.calculateLocalMatchrimAffinity(all(0), attrs), old.api.calculateLocalMatchrimAffinity(all(0), attrs));
  assert.equal(api.calculateLocalMatchrimAffinity(all(0), attrs, 'scan-local-rms-0to5-v3'), null);
});
check('v1/v2 initial history remains immutable; v3current does not claim a learning delta', () => {
  for (const scale of ['winerim-0-5', undefined]) {
    const wine = row(all(4)); wine.sensory_attributes.scale = scale;
    wine.place_details.bodega_sensory_evidence = api.makeCellarCatalogEvidence(wine, 'SYN-TRUSTED187', wine.sensory_attributes);
    const details = old.api.withCellarInitialAffinity(wine, snapshot(all(0)), 'saved', date);
    const saved = { ...wine, place_details: details }, frozen = JSON.stringify(saved);
    const historic = api.readCellarInitialAffinity(saved, true);
    assert.equal(historic.score, details.matchrim_affinity_initial.score);
    assert.equal(JSON.stringify(api.withCellarInitialAffinity(saved, snapshot(all(5)), 'first_verified', date)), JSON.stringify(details));
    const view = api.cellarAffinityView(saved, snapshot(all(0)), true);
    if (scale) { assert.equal(view.current, 25); assert.equal(view.initial.score, 24); assert.equal(view.delta, null); assert(view.modelChanged); }
    assert.equal(JSON.stringify(saved), frozen);
  }
});
check('new v3 initial roundtrips, binds identity and changes only with a usable profile', () => {
  const wine = row(all(4));
  const details = api.withCellarInitialAffinity(wine, snapshot(all(0)), 'saved', date);
  assert.equal(details.matchrim_affinity_initial.model, 'scan-local-rms-0to5-v3');
  assert.equal(details.matchrim_affinity_initial.version, 3);
  assert.equal(details.matchrim_affinity_initial.score, 25);
  const saved = plain({ ...wine, place_details: details });
  assert.equal(api.readCellarInitialAffinity(saved, true).score, 25);
  assert.equal(api.cellarAffinityView(saved, snapshot(all(4)), true).modelChanged, false);
  assert.equal(api.cellarAffinityView(saved, snapshot(all(4)), true).delta, 68);
  assert.equal(api.cellarAffinityView(saved, null, true).current, null);
  assert(api.confirmsCellarSaveEvidence(saved, saved));
  assert.equal(api.readCellarInitialAffinity({ ...saved, vintage: 2025 }, true), null);
  for (const [model, score] of [['scan-local-rms-0to5-v3', 24], ['scan-local-l2-0to5-v2', 25]]) {
    const altered = plain(saved); Object.assign(altered.place_details.matchrim_affinity_initial, { model, score, version: model.endsWith('v3') ? 3 : 2 });
    assert.equal(api.readCellarInitialAffinity(altered, true), null);
  }
});
check('public sensory quarantine survives v3 save/current; malformed and missing values abstain', () => {
  const wine = row(all(4)); wine.place_details.bodega_sensory_evidence.canonical_id = 'winerim-public-store:187';
  assert(!api.withCellarInitialAffinity(wine, snapshot(all(0)), 'saved', date).matchrim_affinity_initial);
  assert.equal(api.cellarAffinityView(wine, snapshot(all(0)), true).current, null);
  for (const value of [null, undefined, NaN, Infinity, -1, 5.1, '4'])
    assert.equal(api.calculateLocalMatchrimAffinity(all(0), { ...attributes(all(4)), potencia: value }), null);
  assert.equal(api.calculateLocalMatchrimAffinity(null, attributes(all(4))), null);
});
check('native recommendations reject old model even when scores tie, and accept current metadata', () => {
  const wine = { id: 187, name: 'Synthetic187', winery: 'Synthetic producer', originalSheetSource: 'winerim-api',
    tastingAttributes: { scale: 'winerim-0-5', power: 4, acidity: 4, sweetness: 4, tannin: 4, fruity: 4 },
    affinityModel: 'scan-local-rms-0to5-v3', matchPercentage: 25 };
  assert.equal(api.buildNativeRecommendation95(wine, all(0)).result.state, 'ready');
  assert.equal(api.buildNativeRecommendation95({ ...wine, affinityModel: 'scan-local-l2-0to5-v2' }, all(0)).result.state, 'pending');
  assert.equal(api.buildNativeRecommendation95({ ...wine, matchPercentage: 24 }, all(0)).result.state, 'pending');
});
check('scan, menu, reprofile and individual explanations share the actual native scorer', () => {
  const sheet = { id: '187', name: 'Synthetic187', producer: 'Synthetic producer', vintage: '2024',
    region: 'Synthetic', country: 'ES', grapes: [], url: 'https://web.winerim.com/the-library/wines/187/Synthetic187',
    detailVerified: true, sensoryAttributes: { power: 4, acidity: 4, sweetness: 4, tannin: 4, fruity: 4 } };
  const catalog = { id: '187', name: sheet.name, winery: sheet.producer, vintage: '2024', region: sheet.region,
    country: sheet.country, originalSheetSource: 'winerim-api', originalSheetUrl: sheet.url,
    tastingAttributes: sheet.sensoryAttributes, verifiedOriginalSheet: sheet };
  const candidate = { id: 'region187', name: sheet.name, producer: sheet.producer, vintage: 2024,
    region: sheet.region, country: sheet.country, grapes: [], alcohol: null, source: 'inference',
    confidence: .9, evidence: [], inferredFields: [], uncertaintyReasons: [] };
  const found = api.applyScanWineEvidence(candidate, all(0), catalog);
  assert.equal(found.affinity, 25); assert(api.nativeWineConsumerResult(found, all(0)).canExplainAffinity);
  assert(!api.nativeWineConsumerResult({ ...found, affinity: 24 }, all(0)).canExplainAffinity);
  const wine = { nombre: sheet.name, productor: sheet.producer, anada: 2024, region: sheet.region,
    pais: sheet.country, campos_inferidos: [], confidence: .9, confirmado: true };
  const matched = api.applyMenuWineEvidence(wine, all(0), catalog);
  assert.equal(matched.compatibilidad, 25);
  assert.equal(api.nativeMenuWineAffinity(matched, all(0)).state, 'ready');
  const refreshed = api.refreshMenuProfileAffinity(matched, all(4));
  assert.equal(refreshed.compatibilidad, 93);
  assert.equal(api.nativeMenuWineAffinity(refreshed, all(4)).state, 'ready');
  assert.equal(api.refreshMenuProfileAffinity(matched, null).compatibilidad, null);
  const corrected = api.applyScanWineEvidence({ ...candidate, vintage: 2025 }, all(0), catalog);
  assert.equal(corrected.affinity, null);
});
check('actual service map stamps the same runtime model and retains web output', () => {
  const file = 'src/services/winerimApi.ts';
  const run = (source, runtime, wine, native) => {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    let callback;
    const visit = node => {
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'scoredResults') callback = node.initializer.arguments[0].getText(ast);
      ts.forEachChild(node, visit);
    }; visit(ast); assert(callback);
    const context = vm.createContext({ exports: {}, wine, quizResult: all(0), options: {},
      Capacitor: { isNativePlatform: () => native }, calculateLocalMatchrimAffinity: runtime.calculateLocalMatchrimAffinity,
      currentLocalAffinityModel187: runtime.currentLocalAffinityModel187 });
    vm.runInContext(ts.transpileModule(`exports.result = (${callback})(wine);`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
    return plain(context.exports.result);
  };
  const wine = { id: 187, name: 'Synthetic187', tastingAttributes: attributes(all(4)), matchPercentage: 99 };
  const source = fs.readFileSync(file, 'utf8');
  const result = run(source, api, wine, true);
  assert.equal(result.matchPercentage, 25); assert.equal(result.affinityModel, 'scan-local-rms-0to5-v3');
  assert.deepEqual(run(source, api, wine, false), run(before[file], old.api, wine, false));
});
check('historical source readers restore exact v2 bytes and reject unrelated mutations', () => {
  for (const file of ['src/services/winerimApi.ts', 'src/utils/wineAffinityExplanation.ts']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.equal(restoreAffinity187(file, source), before[file]);
    assert.equal(restoreAffinity187(file, before[file]), before[file]);
    assert.throws(() => restoreAffinity187(file, source + '\n'));
    assert.throws(() => restoreAffinity187(file, source.replace('scan-local-rms-0to5-v3', 'scan-local-rms-0to5-v4')));
  }
});
check('50 independent native profiles keep recommendation, label, menu, save and reprofile consistent', () => {
  const sheet = { id: '187', name: 'Synthetic187', producer: 'Synthetic producer', vintage: '2024',
    region: 'Synthetic', country: 'ES', grapes: [], url: 'https://web.winerim.com/the-library/wines/187/Synthetic187',
    detailVerified: true, sensoryAttributes: { power: 4, acidity: 4, sweetness: 4, tannin: 4, fruity: 4 } };
  const catalog = { id: '187', name: sheet.name, winery: sheet.producer, vintage: '2024', region: sheet.region,
    country: sheet.country, originalSheetSource: 'winerim-api', originalSheetUrl: sheet.url,
    tastingAttributes: sheet.sensoryAttributes, verifiedOriginalSheet: sheet };
  for (const { profile } of makeProfiles131('00000000-0000-4000-8000-000000018700')) {
    const frozen = JSON.stringify(profile), expected = api.calculateLocalMatchrimAffinity(profile, attributes(all(4)));
    const candidate = { id: 'region187', name: sheet.name, producer: sheet.producer, vintage: 2024,
      region: sheet.region, country: sheet.country, grapes: [], alcohol: null, source: 'inference',
      confidence: .9, evidence: [], inferredFields: [], uncertaintyReasons: [] };
    const found = api.applyScanWineEvidence(candidate, profile, catalog);
    assert.equal(found.affinity, expected); assert(api.nativeWineConsumerResult(found, profile).canExplainAffinity);
    const menu = api.applyMenuWineEvidence({ nombre: sheet.name, productor: sheet.producer, anada: 2024,
      region: sheet.region, pais: sheet.country, campos_inferidos: [], confirmado: true }, profile, catalog);
    assert.equal(menu.compatibilidad, expected); assert.equal(api.nativeMenuWineAffinity(menu, profile).state, 'ready');
    assert.equal(api.refreshMenuProfileAffinity(menu, all(0)).compatibilidad, 25);
    const recommendation = { ...catalog, tastingAttributes: { ...sheet.sensoryAttributes, scale: 'winerim-0-5' },
      affinityModel: 'scan-local-rms-0to5-v3', matchPercentage: expected };
    assert.equal(api.buildNativeRecommendation95(recommendation, profile).result.state, 'ready');
    const wine = row(all(4)), details = api.withCellarInitialAffinity(wine, snapshot(profile), 'saved', date);
    assert.equal(details.matchrim_affinity_initial.score, expected);
    const view = api.cellarAffinityView({ ...wine, place_details: details }, snapshot(all(0)), true);
    assert.equal(view.current, 25); assert.equal(view.delta, 25 - expected);
    assert.equal(JSON.stringify(profile), frozen);
  }
});
try {
  let comparisons = 0;
  const rows = [
    { id: 188, name: 'Synthetic tie B', winery: 'Synthetic producer', tastingAttributes: { power: 4, acidity: 4, sweetness: 4, tannin: 4, fruity: 4 }, matchPercentage: 99 },
    { id: 187, name: 'Synthetic tie A', winery: 'Synthetic producer', tastingAttributes: { power: 4, acidity: 4, sweetness: 4, tannin: 4, fruity: 4 }, matchPercentage: 1 },
    { id: 189, name: 'Synthetic contrasting wine', winery: 'Synthetic producer', tastingAttributes: { power: 0, acidity: 1, sweetness: 2, tannin: 3, fruity: 4 }, matchPercentage: 77 },
  ];
  for (const { profile } of makeProfiles131('00000000-0000-4000-8000-000000018700')) {
    current.context.native187 = true; let first;
    for (const payloadRows of [rows, [...rows].reverse(), rows.map(wine => ({ ...wine, matchPercentage: 100 - wine.matchPercentage }))]) {
      current.state.payload = { results: payloadRows };
      const result = plain(await api.fetchWinesByAttributes(profile));
      if (!first) first = result;
      assert.deepEqual(result, first);
      for (const wine of result) {
        assert.equal(wine.affinityModel, 'scan-local-rms-0to5-v3');
        assert.equal(wine.matchPercentage, api.calculateLocalMatchrimAffinity(profile, wine.tastingAttributes));
      }
      assert(result.findIndex(wine => wine.id === 187) < result.findIndex(wine => wine.id === 188));
      comparisons++;
    }
    current.context.native187 = false; old.context.native187 = false;
    current.state.payload = old.state.payload = { results: rows };
    assert.deepEqual(plain(await api.fetchWinesByAttributes(profile)), plain(await old.api.fetchWinesByAttributes(profile)));
    comparisons++;
  }
  current.context.native187 = true;
  checks.push({ name: 'actual complete recommendation service:50native profiles,150raw-score/order mutations and50exact web comparisons', passed: true, comparisons });
} catch (error) {
  checks.push({ name: 'actual complete recommendation service:50native profiles,150raw-score/order mutations and50exact web comparisons', passed: false, error: error.stack });
}
const report = { passed: checks.every(check => check.passed), checks, integerVectors: 7776,
  decimalVectors: 300, nearHalfControls: 12,
  syntheticProfiles: 50, legacyHistoricalCounterexample: 24, nativeCurrentCounterexample: 25,
  sourceHashes: Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),
  externalCalls: 0, realUsers: 0, historical101ReportModified: false, backendDeployed: false, uploaded: false };
fs.writeFileSync(path.join(root, 'RESULT.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
if (report.passed) {
  const wine = row(all(4));
  const saved = { ...wine, place_details: old.api.withCellarInitialAffinity(wine, snapshot(all(0)), 'saved', date),
    id: '00000000-0000-4000-8000-000000018701', user_id: '00000000-0000-4000-8000-000000018700',
    status: 'collection', quantity: 1, rating: null, use_for_profile_training: false,
    created_at: date, updated_at: date, image_url: 'https://cbjynrbvrhcmpaojmqdp.supabase.co/storage/v1/object/public/qa187/bottle.jpg' };
  fs.writeFileSync(path.join(root, 'visual-fixture.json'), JSON.stringify({ profile: all(0), wines: [saved],
    scope: 'Synthetic identity/profile and stored local photo, not a real catalogue match, user or preference' }, null, 2), { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;
