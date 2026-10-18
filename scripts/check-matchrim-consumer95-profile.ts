/* eslint-disable @typescript-eslint/no-explicit-any -- Controlled VM boundary deliberately accepts malformed JSON and untyped JSX. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import vm from 'node:vm';
import ts from 'typescript';
import * as profileUtils from '../src/utils/profileUtils';
import * as classifier from '../src/lib/winerimClassifier';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '../src/utils/matchrimLearning';
import { cellarTrainingRows, makeCellarCatalogEvidence } from '../src/utils/bodegaAffinity';
import { resolveScanProfile } from '../src/utils/scanProfile';

const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({ options: { baseline: { type: 'boolean' }, output: { type: 'string' } } });
const path = 'src/pages/Profile.tsx';
const before = execFileSync('git', ['show', `c25b282:${path}`], { cwd: root, encoding: 'utf8' });
const source = values.baseline ? before : readFileSync(resolve(root, path), 'utf8');
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
type Vector = Record<typeof axes[number], number>;
type Node95 = { type: string; props: Record<string, any> };
const nodes = (node: any): Node95[] => Array.isArray(node) ? node.flatMap(nodes)
  : node && typeof node === 'object' && 'type' in node ? [node, ...nodes(node.props.children)] : [];
const shape = (node: any): any => Array.isArray(node) ? Array.from(node).filter(x => x != null && x !== false).map(shape)
  : node && typeof node === 'object' ? Object.fromEntries(Object.entries(node).filter(([, v]) => v !== undefined).map(([k, v]) => [k, shape(v)]))
    : typeof node === 'function' ? '[handler]' : node;
const vector = (profile: Vector) => Object.fromEntries(axes.map(key => [key, profile[key]]));
const jsx = (type: string, props: Node95['props']) => ({ type, props });
const components = new Proxy({}, { get: (_, key) => String(key) });
const learningPlatformSource96 = readFileSync(resolve(root, 'src/utils/matchrimLearningPlatform.ts'), 'utf8');
const loadLearningPlatform96 = (native: boolean) => {
  const sandbox = { exports: {} as { calculateLearnedMatchrimProfile: typeof calculateLearnedMatchrimProfile },
    require: (id: string) => {
      if (id === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
      if (id === './matchrimLearning') return { calculateLearnedMatchrimProfile };
      throw Error('Unmodeled platform-wrapper dependency: ' + id);
    } };
  vm.runInNewContext(ts.transpileModule(learningPlatformSource96, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, sandbox);
  return sandbox.exports;
};
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = async (name: string, run: () => unknown) => {
  try { await run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: String(error) }); }
};
const profiles = Array.from({ length: 50 }, (_, i) => Object.freeze({
  potente: [0, .01, .4, .75, 1, 1.25, 2.333333, 3.6, 4.999, 5][i % 10],
  acidez: i / 10, dulce: (i % 11) / 2, tanico: ((i * 7) % 51) / 10, afrutado: ((i * 13) % 51) / 10,
  id: `synthetic-profile95-${i}`, created_at: '2026-10-17T00:00:00Z',
}));
const owner = { id: 'synthetic-owner-profile95' };
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const actor = (text: string, native: boolean, profile: any, rows: any[] = [], suppliedTraining: TrainableWine[] = []) => {
  const actualLearningPlatform96 = loadLearningPlatform96(native);
  const slots: any[] = [[profile].filter(Boolean), profile, false, [], false, suppliedTraining, new Set(), [], false, null, 0, null];
  let cursor = 0;
  const effects: Array<() => any> = [], queries: any[] = [], timers: Array<() => any> = [], wineCalls: any[] = [], learningCalls: any[] = [];
  const hooks = {
    lazy: () => 'RegionMap',
    useState: (initial: any) => {
      const i = cursor++; if (i >= slots.length) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], (value: any) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useMemo: (build: () => any) => build(),
    useEffect: (effect: () => any) => { effects.push(effect); },
  };
  const from = (table: string) => {
    const query = { table, columns: '', filters: [] as any[] }; queries.push(query);
    const builder = {
      select(columns: string) { query.columns = columns; return this; },
      eq(key: string, value: any) { query.filters.push(['eq', key, value]); return this; },
      not(key: string, operator: string, value: any) { query.filters.push(['not', key, operator, value]); return this; },
      in(key: string, value: any) { query.filters.push(['in', key, value]); return this; },
      then(yes: any, no: any) {
        const data = table === 'user_wines' ? rows.filter(row => query.filters.every(([op, key, value]) =>
          op === 'eq' ? row[key] === value : op === 'not' ? row[key] != null : true)) : [];
        return Promise.resolve({ data, error: null }).then(yes, no);
      },
    }; return builder;
  };
  const sandbox: any = { exports: {}, console, Set, Map, Date, Number,
    window: { setTimeout: (callback: () => any) => { timers.push(callback); return timers.length; }, clearTimeout: () => {} },
    require: (id: string) => {
      if (id === 'react') return hooks;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
      if (id === 'react-router-dom') return { useNavigate: () => () => {} };
      if (id === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
      if (id === '@/contexts/AuthContext') return { useAuth: () => ({ user: owner, loading: false }) };
      if (id === '@/hooks/useQuizResults') return { useQuizResults: () => ({ getQuizHistory: async () => [profile].filter(Boolean) }) };
      if (id === '@/integrations/supabase/client') return { supabase: { from } };
      if (id === '@/utils/profileUtils') return profileUtils;
      if (id === '@/utils/matchrimLearning') return { calculateLearnedMatchrimProfile: (base: Vector, training: TrainableWine[]) => {
        learningCalls.push({ base, training }); return calculateLearnedMatchrimProfile(base, training);
      } };
      if (id === '@/utils/matchrimLearningPlatform') return { calculateLearnedMatchrimProfile: (base: Vector, training: TrainableWine[]) => {
        learningCalls.push({ base, training }); return actualLearningPlatform96.calculateLearnedMatchrimProfile(base, training);
      } };
      if (id === '@/utils/bodegaAffinity') return { cellarTrainingRows };
      if (id === '@/utils/navigation') return { buildAuthRedirectPath: (url: string) => '/auth?redirect=' + encodeURIComponent(url) };
      if (id === '@/services/winerimApi') return { fetchWinesByAttributes: async (...args: any[]) => { wineCalls.push(args); return []; } };
      if (id === '@/utils/winerimDataAggregation') return { aggregateGrapes: () => [], aggregateRegions: () => [] };
      if (id === '@/lib/winerimClassifier') return classifier;
      if (id.startsWith('@/components/ui/') || id === 'lucide-react') return components;
      if (id.startsWith('@/components/')) return { __esModule: true, default: id.split('/').at(-1) };
      throw Error('Unmodeled dependency: ' + id);
    },
  };
  // Observe real locals without replacing any helper, memo, effect or JSX expression.
  const marker = '  if (authLoading || isLoadingProfile) {';
  assert.equal(text.split(marker).length, 2);
  const observed = text.replace(marker, `  globalThis.observed95 = { passportProfile, activeProfile, activeDisplayProfile, currentDisplayProfile, activeClassifierProfile, wineQueryProfile, learnedProfile, chartData };
${marker}`);
  vm.runInNewContext(ts.transpileModule(observed + '\nexports.subject95 = Profile; exports.helpers95 = { normalizeProfileForDisplay, normalizeProfileForClassifier, selectProfileWineQuery };', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, sandbox);
  const render = () => {
    cursor = 0; effects.length = 0;
    // Existing recommendation diagnostics are not the unit's JSON report.
    const log = console.log;
    try { console.log = () => {}; return { tree: sandbox.exports.subject95(), observed: sandbox.observed95 }; }
    finally { console.log = log; }
  };
  const trainingEffect = async () => {
    const effect = effects.find(fn => fn.toString().includes('loadTrainingWines')); assert.ok(effect); const cleanup = effect(); await tick(); return cleanup;
  };
  const recommendationEffect = async () => {
    const effect = effects.find(fn => fn.toString().includes('fetchWinesByAttributes')); assert.ok(effect); const cleanup = effect();
    for (const timer of timers.splice(0)) timer(); await tick(); return cleanup;
  };
  return { render, trainingEffect, recommendationEffect, queries, wineCalls, learningCalls, slots, helpers: sandbox.exports.helpers95 };
};

const resultSource = readFileSync(resolve(root, 'src/components/QuizResults.tsx'), 'utf8');
const resultAst = ts.createSourceFile('QuizResults.tsx', resultSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let resultPassport = '';
const visit = (node: ts.Node) => {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(resultAst) === 'MatchrimPassport') resultPassport = node.getText(resultAst);
  ts.forEachChild(node, visit);
}; visit(resultAst);
assert.ok(resultPassport);
const resultCode = ts.transpileModule('exports.result95 = (result) => (' + resultPassport + ');', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const resultSandbox: any = { exports: {}, MatchrimPassport: 'MatchrimPassport', require: () => ({ jsx, jsxs: jsx }) };
vm.runInNewContext(resultCode, resultSandbox);

await check('50 synthetic profiles: real native Profile JSX passes the exact quiz vector to the same Passport callsite as QuizResults', () => {
  for (const profile of profiles) {
    const actual = actor(source, true, profile).render(), passport = nodes(actual.tree).find(n => n.type === 'MatchrimPassport');
    assert.ok(passport); assert.deepEqual(vector(passport.props.profile), vector(profile));
    assert.deepEqual(vector(passport.props.profile), vector(resultSandbox.exports.result95(profile).props.profile));
    assert.equal(actual.observed.passportProfile, profile, 'No rounding/coercion or mutation of the stored quiz');
  }
});
await check('Every axis retains exact zero, fractional boundaries and 5 in native display/query/passport; classifier remains independently discrete', () => {
  for (const key of axes) for (const value of [0, .01, .4, .75, 1.25, 2.333333, 3.6, 4.999, 5]) {
    const profile = Object.freeze({ potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3, [key]: value });
    const subject = actor(source, true, profile), { observed } = subject.render();
    for (const field of ['passportProfile', 'currentDisplayProfile', 'activeDisplayProfile', 'wineQueryProfile']) assert.equal(observed[field][key], value, field + ':' + key);
    assert.equal(observed.activeClassifierProfile[key], Math.round(Math.max(1, Math.min(5, value))));
    assert.equal(subject.helpers.normalizeProfileForDisplay(profile, true)[key], value);
    assert.equal(subject.helpers.selectProfileWineQuery(profile, true)[key], value);
  }
});
await check('Invalid native vectors abstain before learner, display, passport, chart, training load and recommendations: no default-3 or classifier fallback', async () => {
  const valid = profiles[0];
  for (const bad of [undefined, null, '', '0', NaN, Infinity, -Infinity, -.01, 5.01, true, {}, []]) {
    for (const key of axes) {
      const profile = { ...valid, [key]: bad }, subject = actor(source, true, profile), actual = subject.render();
      for (const field of ['passportProfile', 'currentDisplayProfile', 'activeDisplayProfile', 'activeProfile', 'wineQueryProfile', 'learnedProfile']) assert.equal(actual.observed[field], null, field + ':' + key + ':' + String(bad));
      assert.equal(actual.observed.chartData.length, 0); assert.equal(subject.learningCalls.length, 0);
      assert.equal(nodes(actual.tree).filter(n => n.type === 'MatchrimPassport').length, 0);
      assert.equal(subject.helpers.normalizeProfileForDisplay(profile, true), null);
      assert.equal(subject.helpers.selectProfileWineQuery(profile, true), null);
      await subject.trainingEffect(); await subject.recommendationEffect();
      assert.equal(subject.queries.length, 0); assert.equal(subject.wineCalls.length, 0);
    }
  }
});
await check('Legacy web actual JSX, helper results and effect inputs stay equal to c25b282 for all 50 profiles and invalid axes', async () => {
  for (const profile of [...profiles, ...[undefined, null, '0', NaN, -1, 6].map(value => ({ ...profiles[0], acidez: value }))]) {
    const actual = actor(source, false, profile), old = actor(before, false, profile);
    assert.deepEqual(shape(actual.render()), shape(old.render()));
    await actual.trainingEffect(); await old.trainingEffect();
    assert.deepEqual(shape(actual.queries), shape(old.queries));
    actual.render(); old.render();
    await actual.recommendationEffect(); await old.recommendationEffect();
    assert.deepEqual(shape(actual.wineCalls), shape(old.wineCalls));
  }
});

const attributes = { scale: 'winerim-0-5' as const, potencia: 0, acidez: 2.333333, dulzura: 5, taninos: 0, afrutado: 4.999 };
const identity = { name: 'Explicitly synthetic profile95 reference', producer: 'Synthetic producer', vintage: null, region: null, country: null };
const verified = { ...identity, id: 'synthetic-row95', user_id: owner.id, rating: 'love' as const, use_for_profile_training: true,
  sensory_attributes: attributes, place_details: { bodega_sensory_evidence: makeCellarCatalogEvidence(identity, 950095, attributes) } };
await check('Real platform wrapper in actual Profile effects distinguishes native OK from LOVE and preserves legacy web', async () => {
  const base = Object.freeze({ potente: 1, acidez: 1, dulce: 1, tanico: 1, afrutado: 1 });
  const high = { scale: 'winerim-0-5' as const, potencia: 5, acidez: 5, dulzura: 5, taninos: 5, afrutado: 5 };
  const highWine = { ...verified, sensory_attributes: high,
    place_details: { bodega_sensory_evidence: makeCellarCatalogEvidence(identity, 950096, high) } };
  for (const [native, rating, expected, confidence] of [
    [true, 'love', 2.2, 8], [true, 'ok', 1.3, 2], [false, 'ok', 2.2, 8],
  ] as const) {
    const subject = actor(source, native, base, [{ ...highWine, rating }]);
    subject.render(); await subject.trainingEffect();
    const { observed } = subject.render();
    assert.deepEqual(vector(observed.learnedProfile.profile), Object.fromEntries(axes.map(key => [key, expected])));
    assert.equal(observed.learnedProfile.confidence, confidence);
    assert.deepEqual(vector(observed.passportProfile), vector(base));
    if (native) assert.equal(observed.passportProfile, base);
  }
});
await check('Actual native training effect includes strict identity columns/owner/consent filters and preserves marked 0..5 attributes exactly', async () => {
  const subject = actor(source, true, profiles[0], [verified]); subject.render(); await subject.trainingEffect();
  const query = subject.queries[0]; assert.equal(query.table, 'user_wines');
  for (const field of ['name', 'producer', 'vintage', 'region', 'country', 'place_details', 'sensory_attributes']) assert.ok(query.columns.split(', ').includes(field), field);
  assert.deepEqual(query.filters, [['eq', 'user_id', owner.id], ['eq', 'use_for_profile_training', true], ['not', 'rating', 'is', null], ['not', 'sensory_attributes', 'is', null]]);
  const actual = subject.render().observed;
  assert.equal(actual.learnedProfile.samples, 1); assert.deepEqual(subject.learningCalls.at(-1).training[0].sensory_attributes, attributes);
});
await check('Actual training effect rejects absent/mismatched proof, explicit opt-out, foreign owner and malformed exact-scale sensory input', async () => {
  for (const row of [{ ...verified, place_details: null }, { ...verified, name: 'Different synthetic identity' },
    { ...verified, use_for_profile_training: false }, { ...verified, user_id: 'other-synthetic-owner' },
    { ...verified, sensory_attributes: { ...attributes, acidez: '2.333333' } }]) {
    const subject = actor(source, true, profiles[0], [row]); subject.render(); await subject.trainingEffect();
    const actual = subject.render().observed;
    assert.equal(actual.learnedProfile.samples, 0); assert.deepEqual(vector(actual.activeDisplayProfile), vector(profiles[0]));
  }
});
await check('All 50 active native vectors match the real scan resolver using the same strict rows; immutable quiz remains the passport input', async () => {
  for (const profile of profiles) {
    const initial = { ...profile };
    const subject = actor(source, true, profile, [verified]); subject.render(); await subject.trainingEffect();
    const { observed, tree } = subject.render();
    const scan = await resolveScanProfile(owner.id, null, { base: async () => profile, training: async () => cellarTrainingRows([verified], true) }, new AbortController().signal);
    assert.deepEqual(vector(observed.activeDisplayProfile), vector(scan.profile!));
    assert.deepEqual(vector(observed.wineQueryProfile), vector(scan.profile!));
    assert.equal(observed.learnedProfile.samples, 1);
    assert.equal(nodes(tree).find(n => n.type === 'MatchrimPassport')!.props.profile, profile);
    await subject.recommendationEffect(); assert.deepEqual(vector(subject.wineCalls[0][0]), vector(scan.profile!));
    assert.deepEqual(profile, initial);
  }
});
await check('Independent positive/negative learning direction, no base mutation and no classifier leakage into recommendations', async () => {
  const base = Object.freeze({ potente: 1.25, acidez: 1.25, dulce: 1.25, tanico: 1.25, afrutado: 1.25 });
  const high = { scale: 'winerim-0-5' as const, potencia: 4.75, acidez: 4.75, dulzura: 4.75, taninos: 4.75, afrutado: 4.75 };
  for (const rating of ['love', 'not_for_me'] as const) {
    const row = { ...verified, rating, sensory_attributes: high, place_details: { bodega_sensory_evidence: makeCellarCatalogEvidence(identity, 950096, high) } };
    const subject = actor(source, true, base, [row]); subject.render(); await subject.trainingEffect(); const { observed } = subject.render();
    for (const key of axes) assert.ok(rating === 'love' ? observed.activeDisplayProfile[key] > base[key] : observed.activeDisplayProfile[key] < base[key]);
    assert.equal(observed.passportProfile, base); await subject.recommendationEffect();
    assert.deepEqual(vector(subject.wineCalls[0][0]), vector(observed.activeDisplayProfile));
    assert.notDeepEqual(vector(subject.wineCalls[0][0]), vector(observed.activeClassifierProfile));
  }
});
await check('Ordinary native first screen and initial tab stay in place; missing profile renders no invented passport', () => {
  const tree = actor(source, true, profiles[0]).render().tree;
  assert.equal(nodes(tree).find(n => n.type === 'Tabs')!.props.defaultValue, 'profile');
  assert.ok(nodes(tree).some(n => n.type === 'MatchrimPassport'));
  assert.ok(nodes(tree).some(n => n.type === 'NativeAccountActions'));
  assert.equal(nodes(actor(source, true, null).render().tree).filter(n => n.type === 'MatchrimPassport').length, 0);
});
const traceInput = { potente: 0, acidez: 2.333333, dulce: 5, tanico: 0, afrutado: 4.999 };
const trace = actor(source, true, traceInput).render().observed;
const report = { baseline: Boolean(values.baseline), sourceSha256: sha(source), beforeSha256: sha(before),
  learningPlatformSourceSha256: sha(learningPlatformSource96),
  scriptSha256: sha(readFileSync(fileURLToPath(import.meta.url), 'utf8')),
  traceExample: { input: traceInput, passport: trace.passportProfile, activeDisplay: trace.activeDisplayProfile, query: trace.wineQueryProfile, classifier: trace.activeClassifierProfile },
  syntheticProfiles: profiles.length, passed: checks.filter(x => x.passed).length, failed: checks.filter(x => !x.passed).length, checks,
  limits: 'Actual Profile component/effects/JSX and actual learning platform wrapper with controlled Capacitor/hooks/offline transports; actual QuizResults Passport callsite. Native feedback-strength opt-in is explicit; not layout, real native runtime, persistence or human-taste certification.' };
if (values.output !== undefined) writeFileSync(resolve(values.output), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify(report, null, 2)); process.exitCode = report.failed ? 1 : 0;
