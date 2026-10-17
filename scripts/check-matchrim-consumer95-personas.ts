import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dgram from 'node:dgram';
import type { MatchrimProfileLike as Profile } from '../src/utils/matchrimPassport';
import type { ScanProfileSnapshot } from '../src/utils/scanProfile';
import type { WineCandidate } from '../src/utils/multiWineScan';
import type { MenuScanWine } from '../src/utils/wineMenuScan';
import type { WinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';

// Run from any directory: node --import tsx scripts/check-matchrim-consumer95-personas.ts --existing
// Every person, wine, rating and owner below is explicitly synthetic. No taste-accuracy claim.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
process.umask(0o077);
const evidenceRoot = '/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-eight-hours-20261017/personas';
const output = resolve(process.argv.find(arg => arg.startsWith('--output='))?.slice(9) ?? resolve(evidenceRoot, 'etapa950/latest'));
assert.ok(output === evidenceRoot || output.startsWith(evidenceRoot + '/'), 'Evidence must stay in the authorized private directory');
mkdirSync(output, { recursive: true, mode: 0o700 });
const save = (name: string, value: unknown) => writeFileSync(resolve(output, name), JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const start = { head: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'),
  status: git('status', '--short'), trackedDiff: sha(git('diff', 'HEAD', '--binary')) };
const criticalPaths = ['src/data/quizData.ts', 'src/utils/wineAffinityExplanation.ts', 'src/utils/scanWineEvidence.ts',
  'src/utils/winerimOriginalSheet.ts', 'src/utils/bodegaAffinity.ts', 'src/utils/matchrimLearning.ts',
  'src/utils/matchrimLocalOwner.ts', 'src/utils/matchrimLocalProfile.ts', 'src/utils/scanHistory.ts',
  'src/utils/scanProfile.ts', 'src/services/matchrimScanProfile.ts', 'src/utils/menuWineActions.ts',
  'src/utils/menuWineSave.ts', 'src/pages/MyWines.tsx', 'src/utils/restaurantRanking91.ts',
  'src/pages/UseMatchrim.tsx',
  'supabase/functions/_shared/matchrim-learning.ts', 'supabase/functions/_shared/matchrim-training-evidence.ts'];
const criticalHashes = () => Object.fromEntries(criticalPaths.map(path => [path, sha(readFileSync(resolve(root, path)))]));
const initialSourceHashes = criticalHashes();

let networkAttempts = 0;
const block = () => { networkAttempts++; throw new Error('CONSUMER95_NETWORK_FORBIDDEN'); };
globalThis.fetch = block;
net.Socket.prototype.connect = block;
tls.connect = block;
http.request = block; http.get = block; https.request = block; https.get = block;
dgram.createSocket = block;
syncBuiltinESMExports();

const { calculateLocalMatchrimAffinity: affinity, normalizeWineAttributesForInsight: normalize } = await import('../src/utils/wineAffinityExplanation');
const { applyScanWineEvidence: labelEvidence, applyMenuWineEvidence: menuEvidence } = await import('../src/utils/scanWineEvidence');
const { catalogWineFromVerifiedSheet } = await import('../src/utils/winerimOriginalSheet');
const { cellarAffinityView: view, cellarTrainingRows: training, makeCellarCatalogEvidence: proof,
  readCellarInitialAffinity: initial, readCellarSensoryEvidence: sensory, withCellarInitialAffinity: withInitial } = await import('../src/utils/bodegaAffinity');
const { calculateLearnedMatchrimProfile: learn } = await import('../src/utils/matchrimLearning');
const { calculateEdgeLearnedProfileAudit: edgeLearn } = await import('../supabase/functions/_shared/matchrim-learning');
const { resolveScanProfile } = await import('../src/utils/scanProfile');
const { readMatchrimLocalProfile } = await import('../src/utils/matchrimLocalProfile');
const { reconcileMatchrimLocalOwner: reconcile, isMatchrimLocalOwner: isOwner } = await import('../src/utils/matchrimLocalOwner');
const { getScanHistory, recordOwnedScanHistory } = await import('../src/utils/scanHistory');
const { menuSaveEvidence, menuPriceSnapshot, readMenuPrice, hasStoredMenuCatalogEvidence } = await import('../src/utils/menuWineSave');
const { menuCardIdentity, menuIntentChanges, confirmsMenuAction } = await import('../src/utils/menuWineActions');
const { confirmsWineMutation } = await import('../src/utils/matchrimWineMutation');
const { optionalScanNumber } = await import('../supabase/functions/_shared/matchrim-scan-values');
const { resolveMatchrimEdgeFunctionName } = await import('../src/utils/matchrimEdgeRouting');
const { planRestaurantRanking91, runRestaurantRanking91 } = await import('../src/utils/restaurantRanking91');

const nodeRequire = createRequire(import.meta.url);
const esbuild: typeof import('esbuild') = nodeRequire('esbuild');
const ts: typeof import('typescript') = nodeRequire('typescript');
// Bundle the actual complete quiz module, replacing only its non-executable image assets.
const quizBuild = await esbuild.build({ entryPoints: [resolve(root, 'src/data/quizData.ts')], bundle: true,
  write: false, platform: 'node', format: 'esm', loader: { '.jpg': 'empty' }, alias: { '@': resolve(root, 'src') }, logLevel: 'silent' });
const quiz = await import('data:text/javascript;base64,' + Buffer.from(quizBuild.outputFiles[0].text).toString('base64')) as {
  questions: Array<{ id: number; scores: Profile }>;
  calculateProfile: (answers: Record<number, string>) => Profile;
};

const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const profile = (values: readonly number[]): Profile => ({ potente: values[0], acidez: values[1], dulce: values[2], tanico: values[3], afrutado: values[4] });
const all = (n: number) => profile([n, n, n, n, n]);
const attrs = (p: Profile) => ({ scale: 'winerim-0-5' as const, potencia: p.potente, acidez: p.acidez,
  dulzura: p.dulce, taninos: p.tanico, afrutado: p.afrutado });
const stamp = '2026-10-17T10:00:00.000Z';
const snapshot = (p: Profile): ScanProfileSnapshot => ({ profile: p, source: 'quiz', samples: 0, status: 'ready', note: 'SYNTHETIC ONLY' });
const checks: Array<{ persona: string; invariant: string; passed: boolean; defect?: string; error?: string; actual?: unknown; expected?: unknown }> = [];
async function check(persona: string, invariant: string, run: () => unknown | Promise<unknown>, defect?: string) {
  try { await run(); checks.push({ persona, invariant, passed: true, defect }); }
  catch (error) {
    const e = error as Error & { actual?: unknown; expected?: unknown };
    checks.push({ persona, invariant, passed: false, defect, error: e.message, actual: e.actual, expected: e.expected });
  }
}

const personas = [
  ...Array.from({ length: 32 }, (_, mask) => ({ id: `SYN95-${String(mask + 1).padStart(2, '0')}`,
    kind: 'five-axis boundary corner', base: profile(axes.map((_, i) => mask & (1 << i) ? 5 : 0)) })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: `SYN95-${i + 33}`, kind: `single-axis decimal ${axes[Math.floor(i / 2)]}`,
    base: profile(axes.map((_, axis) => axis === Math.floor(i / 2) ? i % 2 ? 4.6 : 0.4 : 2.5)) })),
  ...[
    [0, .4, 1.7, 0, 5], [2.4, 4.6, .4, 0, 3.2], [4.7, 1.3, 0, 4.1, 2.2], [1.1, 4.9, 2.7, .2, 4.8],
    [3.3, .1, 4.4, 1.9, .6], [.5, 3.7, 0, 2.1, 4.3], [5, 0, 2.5, 3.6, .4], [2.5, 2.5, 2.5, 2.5, 2.5],
  ].map((values, i) => ({ id: `SYN95-${i + 43}`, kind: 'mixed continuous taste vector', base: profile(values) })),
];
assert.equal(personas.length, 50);
assert.equal(new Set(personas.map(p => JSON.stringify(p.base))).size, 50);

function fixture(id: string, p: Profile) {
  const identity = { name: `Synthetic Reference ${id}`, producer: 'Synthetic Winery Ninety Five', vintage: 2021,
    region: 'Synthetic Region', country: 'Synthetic Country' };
  const sheet: WinerimOriginalSheet = { ...identity, id: `SYN-${id}`, vintage: '2021', grapes: [], detailVerified: true,
    url: `https://web.winerim.com/the-library/wines/SYN-${id}/synthetic-only`,
    sensoryAttributes: { power: p.potente, acidity: p.acidez, sweetness: p.dulce, tannin: p.tanico, fruity: p.afrutado } };
  const catalog = catalogWineFromVerifiedSheet(identity, sheet);
  assert.ok(catalog, 'The synthetic sheet must satisfy the actual identity contract');
  const candidate: WineCandidate = { ...identity, id, grapes: [], alcohol: null, source: 'inference', confidence: .95,
    evidence: ['SYNTHETIC'], uncertaintyReasons: [], inferredFields: [], sensoryAttributes: null };
  const menu: MenuScanWine = { nombre: identity.name, productor: identity.producer, anada: identity.vintage,
    region: identity.region, pais: identity.country, precio: 20, moneda: 'EUR', servicio: 'botella',
    tipo: 'tinto', descripcion: null, confidence: .95, dudas: [], campos_inferidos: [] };
  const row = { ...identity, id, user_id: id, rating: 'love' as const, use_for_profile_training: true,
    sensory_attributes: attrs(p), created_at: stamp, updated_at: stamp,
    place_details: { bodega_sensory_evidence: proof(identity, sheet.id, attrs(p)), matchrim_rating_at: stamp } };
  return { identity, sheet, catalog, candidate, menu, row };
}

// Independent fixed anchors, not a call back into the function under test to make an oracle.
const anchors = [
  { base: 0, wine: 0, expected: 93 }, { base: 5, wine: 5, expected: 93 },
  { base: 0, wine: 5, expected: 8 }, { base: 5, wine: 0, expected: 8 },
  { base: 0, wine: 1, expected: 76 }, { base: 0, wine: 2, expected: 59 },
  { base: 0, wine: 2.5, expected: 50 }, { base: 0, wine: 4, expected: 25 },
  { base: .4, wine: .4, expected: 93 }, { base: .4, wine: 1.4, expected: 76 },
];
for (const [i, a] of anchors.entries()) await check('GLOBAL', `fixed-score-anchor-${i}`, () => {
  const f = fixture(`ANCHOR-${i}`, all(a.wine));
  assert.equal(affinity(all(a.base), attrs(all(a.wine))), a.expected);
  assert.equal(labelEvidence(f.candidate, all(a.base), f.catalog).affinity, a.expected);
  assert.equal(menuEvidence(f.menu, all(a.base), f.catalog).compatibilidad, a.expected);
  assert.equal(view(f.row, snapshot(all(a.base))).current, a.expected);
}, i === 7 ? 'D4' : undefined);

const memory = new Map<string, string>();
const storage = { get length() { return memory.size; }, key: (i: number) => [...memory.keys()][i] ?? null,
  getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); } };
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, dispatchEvent: () => true } });

// Import the actual service with only Capacitor and the database transport substituted.
const serviceState = { native: true, owner: '', base: all(0), rows: [] as unknown[], queries: [] as Array<{ table: string; owner?: string }> };
Object.assign(globalThis, { __consumer95: serviceState });
const serviceBuild = await esbuild.build({ entryPoints: [resolve(root, 'src/services/matchrimScanProfile.ts')],
  bundle: true, write: false, platform: 'node', format: 'esm', alias: { '@': resolve(root, 'src') }, logLevel: 'silent',
  plugins: [{ name: 'consumer95-memory-transport', setup(build) {
    build.onResolve({ filter: /^(@\/integrations\/supabase\/client|@capacitor\/core)$/ }, args => ({ path: args.path, namespace: 'consumer95' }));
    build.onLoad({ filter: /.*/, namespace: 'consumer95' }, args => ({ contents: args.path === '@capacitor/core'
      ? 'export const Capacitor = { isNativePlatform: () => globalThis.__consumer95.native };'
      : `export const supabase = { from(table) {
          const s = globalThis.__consumer95, q = { table }; s.queries.push(q);
          const result = () => ({ data: q.owner === s.owner ? table === 'quiz_results' ? s.base : s.rows : table === 'quiz_results' ? null : [], error: null });
          const chain = { select: () => chain, order: () => chain, limit: () => chain, not: () => chain,
            eq: (key, value) => { if (key === 'user_id') q.owner = value; return chain; }, abortSignal: () => chain,
            maybeSingle: async () => result(), then: (yes, no) => Promise.resolve(result()).then(yes, no) };
          return chain;
        } };` }));
  } }],
});
const { loadMatchrimScanProfile: loadService } = await import('data:text/javascript;base64,' + Buffer.from(serviceBuild.outputFiles[0].text).toString('base64')) as {
  loadMatchrimScanProfile: (owner: string | null, signal: AbortSignal) => Promise<ScanProfileSnapshot>;
};

const useSource = readFileSync(resolve(root, 'src/pages/UseMatchrim.tsx'), 'utf8');
const beforeUseSource = readFileSync(resolve(evidenceRoot, 'native-use/before/UseMatchrim.tsx'), 'utf8');
const extractUseLoaderParts = (source: string) => {
  const tree = ts.createSourceFile('UseMatchrim.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = new Map<string, import('typescript').VariableDeclaration>();
  const visit = (node: import('typescript').Node) => {
    if (ts.isVariableDeclaration(node) && ['loadProfile', 'calculateUseMatchrimLearnedProfile'].includes(node.name.getText(tree))) {
      assert.ok(!declarations.has(node.name.getText(tree)));
      declarations.set(node.name.getText(tree), node);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.ok(declarations.has('loadProfile'));
  const compile = (name: string) => declarations.has(name) ? ts.transpileModule(
    'const ' + declarations.get(name)!.getText(tree) + '; return ' + name + ';',
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText : null;
  return { loader: compile('loadProfile')!, helper: compile('calculateUseMatchrimLearnedProfile'), tree, declarations };
};
const currentUseParts = extractUseLoaderParts(useSource), beforeUseParts = extractUseLoaderParts(beforeUseSource);
type UseFixtureRow = Parameters<typeof learn>[1][number] & Record<string, unknown>;
async function runUseLoader(base: Profile, rows: UseFixtureRow[], native = true, parts = currentUseParts) {
  const ownerId = 'SYN-USE-OWNER';
  const queries: Array<{ table: string; columns?: string; filters: unknown[] }> = [];
  const learnerCalls: Array<{ arguments: number; rows: Parameters<typeof learn>[1]; options: unknown }> = [];
  const nativeOptions: unknown[] = [], writes: unknown[] = [], states: unknown[] = [];
  let observedProfile: Profile | null = null, observedCodeProfile: unknown, observedInfo: unknown;
  let observedLearning: ReturnType<typeof learn> | null = null;
  const core = (...args: Parameters<typeof learn>) => {
    learnerCalls.push({ arguments: args.length, rows: structuredClone(args[1]), options: args[2] });
    const result = learn(...args); observedLearning = result; return result;
  };
  const actualHelper = parts.helper ? new Function('calculateLearnedMatchrimProfile', 'cellarTrainingRows', parts.helper)(core, training) : null;
  const dependencies = { cancelled: false, user: { id: ownerId }, searchParams: { get: () => null },
    Capacitor: { isNativePlatform: () => native }, parseProfileVector: () => null, readMatchrimLocalProfile: () => null,
    localStorage: { setItem: (key: string, value: string) => writes.push([key, value]) },
    setLearnedProfileInfo: (value: unknown) => { observedInfo = value; }, setLoadingProfile: (value: unknown) => states.push(value),
    setCodeProfile: (value: unknown) => { observedCodeProfile = value; },
    setProfile: (value: Profile | null) => { observedProfile = value; },
    calculateLearnedMatchrimProfile: core,
    calculateUseMatchrimLearnedProfile: (...args: unknown[]) => { nativeOptions.push(args[2]); return actualHelper(...args); },
    supabase: { from: (table: string) => {
      assert.ok(['quiz_results', 'user_wines'].includes(table));
      const query: typeof queries[number] = { table, filters: [] }; queries.push(query);
      const response = () => {
        const belongs = query.filters.some(f => Array.isArray(f) && f[0] === 'user_id' && f[1] === ownerId);
        const project = (row: object) => Object.fromEntries((query.columns ?? '').split(',').map(k => k.trim())
          .filter(k => Object.hasOwn(row, k)).map(k => [k, structuredClone((row as Record<string, unknown>)[k])]));
        return { data: belongs ? table === 'quiz_results' ? project(base) : rows.map(project) : null, error: null };
      };
      const chain = { select: (columns: string) => { query.columns = columns; return chain; },
        eq: (key: string, value: unknown) => { query.filters.push([key, value]); return chain; },
        not: (key: string, op: string, value: unknown) => { query.filters.push(['not', key, op, value]); return chain; },
        order: () => chain, limit: () => chain, maybeSingle: async () => response(),
        then: (yes: (value: ReturnType<typeof response>) => unknown) => Promise.resolve(response()).then(yes) };
      return chain;
    } } };
  await new Function(...Object.keys(dependencies), parts.loader)(...Object.values(dependencies))();
  return { profile: observedProfile as Profile | null, codeProfile: observedCodeProfile, info: observedInfo,
    learning: observedLearning as ReturnType<typeof learn> | null, queries, learnerCalls, nativeOptions, writes, states };
}

// Hand-reviewed question contributions, frozen independently of questions[].scores.
const quizMatrix = [
  [0,2,0,0,1], [2,0,0,2,0], [2,0,0,2,0], [0,0,2,0,2], [2,0,0,2,0],
  [2,1,0,2,0], [0,2,0,0,0], [2,0,0,2,0], [0,0,2,0,2], [1,0,1,1,1],
  [2,0,0,2,0], [1,0,1,1,0], [1,0,2,1,0], [1,0,2,1,0], [0,1,0,0,1],
  [0,0,2,0,2], [0,2,0,0,0], [0,2,0,0,0], [2,0,0,1,0], [0,2,2,0,1],
];
const quizTotals = [18, 12, 14, 17, 10];
await check('GLOBAL', 'quiz IDs, independent totals and fixed complete-answer anchors', () => {
  assert.deepEqual(quiz.questions.map(q => q.id), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.deepEqual(axes.map((_, axis) => quizMatrix.reduce((sum, row) => sum + row[axis], 0)), quizTotals);
  for (const [answer, expected] of [['no', 0], ['indiferente', 3], ['si', 5]] as const)
    assert.deepEqual(quiz.calculateProfile(Object.fromEntries(quizMatrix.map((_, i) => [i + 1, answer]))), all(expected));
});

const observations: unknown[] = [];
const journeyObservations: Record<string, unknown> = {};
const useProfileObservations: unknown[] = [];
const quizAnswerSets: string[] = [];
for (const [index, p] of personas.entries()) {
  const f = fixture(p.id, p.base);
  const snap = snapshot(p.base);
  const target = profile(axes.map(key => p.base[key] <= 2.5 ? 5 : 0));
  const t = fixture(p.id + '-TARGET', target);
  const before = JSON.stringify({ p, f, t });
  const useRows = [fixture('USE-' + p.id, profile([0, .4, 1.7, 0, 5])).row];
  await check(p.id, 'native UseMatchrim verified exact-marked learning matches native scan loader', async () => {
    const result = await runUseLoader(p.base, useRows);
    Object.assign(serviceState, { native: true, owner: 'SYN-USE-OWNER', base: p.base, rows: useRows, queries: [] });
    const scan = await loadService('SYN-USE-OWNER', new AbortController().signal);
    assert.equal(result.learning?.samples, 1); assert.equal(scan.samples, 1);
    assert.deepEqual(result.profile, scan.profile); assert.equal(result.learning?.confidence, scan.confidence);
    assert.deepEqual(result.codeProfile, p.base);
    assert.deepEqual(result.nativeOptions, [{ requireCatalogEvidence: true }]);
    assert.deepEqual(result.learnerCalls[0].rows[0].sensory_attributes, attrs(profile([0, .4, 1.7, 0, 5])));
    assert.equal(result.queries[1].columns, 'id, name, producer, vintage, region, country, place_details, rating, sensory_attributes, use_for_profile_training, created_at, updated_at');
    useProfileObservations.push({ id: p.id, result, nativeScan: scan });
  });
  await check(p.id, 'native UseMatchrim missing or mismatched proof never trains and matches native scan', async () => {
    for (const row of [{ ...useRows[0], place_details: {} }, { ...useRows[0], name: 'Different identity' },
      { ...useRows[0], producer: 'Different producer' }, { ...useRows[0], vintage: 2022 },
      { ...useRows[0], region: 'Other region' }, { ...useRows[0], country: 'Other country' },
      { ...useRows[0], sensory_attributes: { ...useRows[0].sensory_attributes, acidez: .41 } },
      { ...useRows[0], sensory_attributes: null }]) {
      const result = await runUseLoader(p.base, [row]);
      Object.assign(serviceState, { native: true, owner: 'SYN-USE-OWNER', base: p.base, rows: [row], queries: [] });
      const scan = await loadService('SYN-USE-OWNER', new AbortController().signal);
      assert.equal(result.learning?.samples, 0); assert.equal(scan.samples, 0);
      assert.deepEqual(result.profile, p.base); assert.deepEqual(result.profile, scan.profile);
      assert.equal(result.info, null); assert.deepEqual(result.codeProfile, p.base);
    }
  });
  await check(p.id, 'web UseMatchrim columns two-argument learner and output exactly preserve baseline', async () => {
    for (const rows of [[], useRows, [{ ...useRows[0], place_details: {} }],
      [{ ...useRows[0], rating: 'not_for_me' as const }]]) {
      const current = await runUseLoader(p.base, rows, false);
      const old = await runUseLoader(p.base, rows, false, beforeUseParts);
      assert.deepEqual(current, old);
      assert.equal(current.queries[1].columns, 'id, rating, sensory_attributes, use_for_profile_training, created_at, updated_at');
      assert.deepEqual(current.nativeOptions, []);
      assert.equal(current.learnerCalls[0].arguments, 2); assert.equal(current.learnerCalls[0].options, undefined);
    }
  });
  await check(p.id, 'native UseMatchrim opt-out and absent ratings never become learning samples', async () => {
    for (const patch of [{ rating: null }, { use_for_profile_training: false }, { use_for_profile_training: null }]) {
      const row = { ...useRows[0], ...patch }, result = await runUseLoader(p.base, [row]);
      Object.assign(serviceState, { native: true, owner: 'SYN-USE-OWNER', base: p.base, rows: [row], queries: [] });
      const scan = await loadService('SYN-USE-OWNER', new AbortController().signal);
      assert.equal(result.learning?.samples, 0); assert.equal(scan.samples, 0);
      assert.deepEqual(result.profile, p.base); assert.deepEqual(result.profile, scan.profile);
    }
  });
  const saved = { ...t.row, place_details: withInitial(t.row, snap, 'saved', stamp) };
  const frozenInitial = initial(saved);
  const cold = learn(p.base, []);
  const loved = learn(p.base, training([t.row], true));
  const rejected = learn(p.base, training([{ ...t.row, rating: 'not_for_me' }], true));
  const edge = edgeLearn(p.base, training([t.row], true));
  const fixed = labelEvidence(f.candidate, p.base, f.catalog);
  await check(p.id, 'menu-label-cellar perfect-match anchor and exact axes', () => {
    assert.equal(fixed.affinity, 93);
    assert.equal(menuEvidence(f.menu, p.base, f.catalog).compatibilidad, 93);
    assert.equal(view(f.row, snap).current, 93);
    assert.deepEqual(normalize(attrs(p.base)), p.base);
    assert.deepEqual(fixed.sensoryAttributes, attrs(p.base));
    assert.deepEqual(menuEvidence(f.menu, p.base, f.catalog).atributos, attrs(p.base));
    assert.deepEqual(training([f.row], true)[0].sensory_attributes, attrs(p.base));
  });
  await check(p.id, 'heterogeneous target same-input cross-journey parity and bounded score', () => {
    const label = labelEvidence(t.candidate, p.base, t.catalog).affinity;
    assert.equal(menuEvidence(t.menu, p.base, t.catalog).compatibilidad, label);
    assert.equal(view(saved, snap).current, label);
    assert.ok(typeof label === 'number' && label >= 8 && label < 93);
  });
  await check(p.id, 'cold-start abstains from learning', () => {
    assert.deepEqual(cold.profile, p.base); assert.equal(cold.samples, 0); assert.equal(cold.confidence, 0);
  });
  await check(p.id, 'positive and negative feedback directions, bounds and strict improvement where possible', () => {
    assert.equal(loved.samples, 1); assert.equal(rejected.samples, 1);
    for (const key of axes) {
      assert.ok(Math.abs(loved.profile[key] - target[key]) < Math.abs(p.base[key] - target[key]));
      assert.ok(Math.abs(rejected.profile[key] - target[key]) >= Math.abs(p.base[key] - target[key]));
      assert.ok(loved.profile[key] >= 0 && loved.profile[key] <= 5);
      assert.ok(rejected.profile[key] >= 0 && rejected.profile[key] <= 5);
      if (p.base[key] > .1 && p.base[key] < 4.9)
        assert.ok(Math.abs(rejected.profile[key] - target[key]) > Math.abs(p.base[key] - target[key]));
    }
    assert.ok(view(saved, { ...snap, profile: loved.profile }).current! > view(saved, snap).current!);
    assert.ok(view(saved, { ...snap, profile: rejected.profile }).current! <= view(saved, snap).current!);
  });
  await check(p.id, 'same explicit training evidence also keeps client-Edge profile contract', () => {
    assert.deepEqual(edge.profile, loved.profile);
  }, 'D1');
  await check(p.id, 'initial immutable, current evolves, JSON roundtrip and missing profile', () => {
    assert.ok(frozenInitial); assert.deepEqual(frozenInitial.profile, p.base);
    const active = { ...snap, source: 'learned' as const, profile: loved.profile, samples: loved.samples };
    assert.deepEqual(withInitial(saved, active, 'first_verified', '2027-01-01T00:00:00.000Z'), saved.place_details);
    assert.deepEqual(initial(JSON.parse(JSON.stringify(saved))), frozenInitial);
    assert.equal(view(saved, active).initial?.score, frozenInitial.score);
    assert.notEqual(view(saved, active).current, frozenInitial.score);
    assert.equal(view(saved, { ...snap, profile: null, source: 'unavailable' }).current, null);
    assert.equal(view(saved, { ...snap, profile: null }).initial?.score, frozenInitial.score);
  });
  await check(p.id, 'identity/sensory absence or stale binding never scores or trains strict path', () => {
    for (const catalog of [null, { ...f.catalog, tastingAttributes: null, verifiedOriginalSheet: { ...f.sheet, sensoryAttributes: null } },
      { ...f.catalog, vintage: '2022' }, { ...f.catalog, name: 'Entirely Different Reference' }]) {
      assert.equal(labelEvidence(f.candidate, p.base, catalog).affinity, null);
      assert.equal(menuEvidence(f.menu, p.base, catalog).compatibilidad, null);
    }
    for (const changed of [{ ...f.row, place_details: {} }, { ...f.row, name: 'Different identity' },
      { ...f.row, vintage: 2022 }, { ...f.row, sensory_attributes: null },
      { ...f.row, sensory_attributes: { ...attrs(p.base), potencia: p.base.potente === 0 ? .01 : 0 } }]) {
      assert.equal(sensory(changed), null); assert.equal(view(changed, snap).current, null);
      assert.equal(learn(p.base, training([changed], true)).samples, 0);
    }
    assert.equal(labelEvidence(f.candidate, null, f.catalog).affinity, null);
    assert.equal(menuEvidence(f.menu, null, f.catalog).compatibilidad, null);
  });
  await check(p.id, 'rerating/removal/withdrawal/dedup have independent expected sample counts', () => {
    assert.equal(learn(p.base, training([t.row, t.row], true)).samples, 1);
    const old = { ...t.row, updated_at: '2026-01-01T00:00:00Z' };
    for (const patch of [{ rating: null }, { use_for_profile_training: false }, { use_for_profile_training: null }]) {
      const latest = { ...old, ...patch, updated_at: stamp };
      // Resolve revisions before the strict evidence filter, as the DB returns only the current row.
      for (const rows of [[old, latest], [latest, old]]) assert.equal(learn(p.base, rows).samples, 0);
    }
    assert.equal(learn(p.base, [{ ...t.row, id: 'one' }, { ...t.row, id: 'two' }]).samples, 2);
  });
  await check(p.id, 'actual profile service binds every DB read to owner and preserves native exact learning', async () => {
    Object.assign(serviceState, { native: true, owner: p.id, base: p.base, rows: [t.row], queries: [] });
    const loaded = await loadService(p.id, new AbortController().signal);
    assert.deepEqual(loaded.profile, loved.profile); assert.equal(loaded.samples, 1);
    assert.equal(serviceState.queries.length, 2); assert.ok(serviceState.queries.every(q => q.owner === p.id));
    const foreign = await loadService(p.id + '-foreign', new AbortController().signal);
    assert.equal(foreign.profile, null); assert.equal(foreign.status, 'missing');
    serviceState.rows = [{ ...t.row, place_details: {} }];
    const noProof = await loadService(p.id, new AbortController().signal);
    assert.equal(noProof.samples, 0); assert.deepEqual(noProof.profile, p.base);
  });
  await check(p.id, 'actual web profile service must abstain without bound sensory evidence', async () => {
    Object.assign(serviceState, { native: false, owner: p.id, base: p.base, rows: [{ ...t.row, place_details: {} }], queries: [] });
    const loaded = await loadService(p.id, new AbortController().signal);
    assert.equal(loaded.samples, 0);
    assert.deepEqual(loaded.profile, p.base);
  }, 'D2');
  await check(p.id, 'local owner switch/logout clears taste, answers, feedback and history; stale writer blocked', () => {
    memory.clear(); reconcile(p.id);
    storage.setItem('matchrim_quiz_result', JSON.stringify(p.base));
    storage.setItem('matchrim_quiz_answers', '{"synthetic":true}');
    storage.setItem('matchrim_test_completed', 'true');
    storage.setItem('matchrim.affinity_feedback.synthetic', 'private'); storage.setItem('unrelated', 'keep');
    assert.deepEqual(readMatchrimLocalProfile(true), p.base);
    let live = true;
    const context = { ownerId: p.id, isCurrent: () => live };
    const history = { id: p.id, type: 'shop-link' as const, title: 'SYNTHETIC', createdAt: 1, route: '/escanear/encontrar-vino' };
    assert.ok(recordOwnedScanHistory(context, history)); assert.equal(getScanHistory(p.id).length, 1);
    assert.deepEqual(getScanHistory(p.id + '-other'), []);
    live = false; reconcile(p.id + '-other');
    assert.equal(recordOwnedScanHistory(context, history), null); assert.equal(readMatchrimLocalProfile(true), null);
    assert.equal(storage.getItem('matchrim_quiz_answers'), null); assert.equal(storage.getItem('matchrim_test_completed'), null);
    assert.equal(storage.getItem('matchrim.affinity_feedback.synthetic'), null); assert.equal(storage.getItem('unrelated'), 'keep');
    assert.deepEqual(getScanHistory(p.id + '-other'), []);
    reconcile(p.id); assert.equal(recordOwnedScanHistory(context, history), null);
    storage.setItem('matchrim_quiz_result', JSON.stringify(p.base)); reconcile(null, true);
    assert.equal(isOwner(p.id), false); assert.equal(readMatchrimLocalProfile(true), null); assert.deepEqual(getScanHistory(null), []);
  });
  await check(p.id, 'authenticated missing/error never borrows anonymous cache; late read aborts', async () => {
    const controller = new AbortController();
    for (const base of [async () => null, async () => { throw new Error('synthetic'); }]) {
      const out = await resolveScanProfile(p.id, p.base, { base, training: async () => { throw new Error('must not run'); } }, controller.signal);
      assert.equal(out.profile, null);
    }
    await assert.rejects(resolveScanProfile(p.id, p.base, { base: async () => { controller.abort(); return p.base; },
      training: async () => [] }, controller.signal), { name: 'AbortError' });
  });
  let quizSeed = 95_000 + index;
  const answers = Object.fromEntries(quizMatrix.map((_, i) => {
    quizSeed = (Math.imul(quizSeed, 1664525) + 1013904223) >>> 0;
    return [i + 1, index < 3 ? ['no', 'indiferente', 'si'][index] : ['no', 'indiferente', 'si'][quizSeed % 3]];
  }));
  quizAnswerSets.push(JSON.stringify(answers));
  const expectedQuiz = profile(axes.map((_, axis) => Math.round(5 * quizMatrix.reduce((sum, weights, i) =>
    sum + weights[axis] * ({ no: 0, indiferente: .5, si: 1 }[answers[i + 1]] ?? 0), 0) / quizTotals[axis])));
  const actualQuiz = quiz.calculateProfile(answers);
  await check(p.id, 'actual complete quiz answer-to-profile agrees with independent contribution matrix', () => {
    assert.deepEqual(actualQuiz, expectedQuiz);
    const reversed = Object.fromEntries(Object.entries(answers).reverse()); assert.deepEqual(quiz.calculateProfile(reversed), expectedQuiz);
    for (let q = 1; q <= 20; q++) {
      const low = quiz.calculateProfile({ ...answers, [q]: 'no' });
      const high = quiz.calculateProfile({ ...answers, [q]: 'si' });
      for (const key of axes) assert.ok(high[key] >= low[key], 'An affirmative contribution cannot lower an axis');
    }
  });
  await check(p.id, 'favorites/tasted intent preserves status, favorite and never manufactures a rating', () => {
    const payload = { user_id: p.id, name: f.identity.name, producer: f.identity.producer, vintage: 2021,
      status: 'wishlist', is_favorite: false, price: null, sensory_attributes: null, matchrim_affinity: null,
      use_for_profile_training: false, place_details: { source: 'menu_scanner', menu_price_snapshot: menuPriceSnapshot(f.menu),
        menu_wine_evidence: menuSaveEvidence(f.menu, null).trace } };
    const card = { rowId: p.id, ownerId: p.id, identity: menuCardIdentity(f.menu), payload };
    assert.deepEqual(menuIntentChanges(card, 'wishlist', true), { is_favorite: true });
    const fav = { ...card, payload: { ...payload, is_favorite: true } };
    assert.deepEqual(menuIntentChanges(fav, 'tasted', false), { status: 'tasted' });
    const tasted = { ...card, payload: { ...payload, status: 'tasted' } };
    assert.deepEqual(menuIntentChanges(tasted, 'wishlist', true), { is_favorite: true });
    const expected = { ...payload, status: 'tasted', is_favorite: true };
    assert.equal(confirmsMenuAction({ ...expected, id: p.id, rating: null }, expected, p.id), true);
    assert.equal(confirmsMenuAction({ ...expected, id: p.id, user_id: p.id + '-foreign', rating: null }, expected, p.id), false);
    assert.equal(confirmsMenuAction({ ...expected, id: p.id, rating: 'love' }, expected, p.id), false);
    assert.equal(menuSaveEvidence(f.menu, attrs(p.base)).use_for_profile_training, false);
  });
  await check(p.id, 'all fixture and initial inputs remain immutable', () => {
    assert.equal(JSON.stringify({ p, f, t }), before); assert.deepEqual(initial(saved), frozenInitial);
  });
  observations.push({ ...p, synthetic: true, realPerson: false, answers, expectedQuiz, actualQuiz,
    learning: { cold, loved, rejected, edge }, target, scoring: { perfect: fixed.affinity, initial: frozenInitial,
      afterLove: view(saved, { ...snap, profile: loved.profile }).current,
      afterRejection: view(saved, { ...snap, profile: rejected.profile }).current } });
}
for (const [rating, expected] of [['love', [2.1, 2.2, 2.6, 2.1, 3.6]], ['not_for_me', [3.9, 3.8, 3.4, 3.9, 2.4]]] as const) {
  await check('GLOBAL', 'native UseMatchrim independent exact single-rating update ' + rating, async () => {
    const row = { ...fixture('USE-FIXED', profile([0, .4, 1.7, 0, 5])).row, rating };
    const result = await runUseLoader(all(3), [row]);
    assert.equal(result.learning?.samples, 1); assert.deepEqual(result.profile, profile(expected));
  });
}
await check('GLOBAL', 'native UseMatchrim historical baseline is a real negative control', async () => {
  const row = { ...fixture('USE-NO-PROOF', all(5)).row, place_details: {} };
  const old = await runUseLoader(all(3), [row], true, beforeUseParts);
  const current = await runUseLoader(all(3), [row]);
  assert.equal(old.learning?.samples, 1); assert.equal(current.learning?.samples, 0);
  assert.deepEqual(current.profile, all(3)); assert.notDeepEqual(old.profile, all(3));
});
await check('GLOBAL', 'all 50 complete synthetic quiz answer sets are distinct', () => assert.equal(new Set(quizAnswerSets).size, 50));

const continuousTarget = profile([0, .4, 1.7, 0, 5]);
for (const [rating, expected] of [
  ['love', profile([2.1, 2.2, 2.6, 2.1, 3.6])],
  ['not_for_me', profile([3.9, 3.8, 3.4, 3.9, 2.4])],
] as const) {
  const row = { ...fixture('FIXED-LEARNING', continuousTarget).row, rating };
  await check('GLOBAL', `client independent exact single-rating update ${rating}`, () => assert.deepEqual(learn(all(3), training([row], true)).profile, expected));
  await check('GLOBAL', `Edge independent exact single-rating update ${rating}`, () => assert.deepEqual(edgeLearn(all(3), training([row], true)).profile, expected), 'D1');
}
for (const invalid of [6, 100, '0', null, Infinity, NaN]) {
  const row = { ...fixture('INVALID', all(3)).row, sensory_attributes: { ...attrs(all(3)), potencia: invalid } };
  await check('GLOBAL', `client rejects invalid marked sensory ${String(invalid)}`, () => assert.equal(learn(all(3), [row]).samples, 0));
  await check('GLOBAL', `Edge rejects invalid marked sensory ${String(invalid)}`, () => assert.equal(edgeLearn(all(3), [row]).samples, 0), 'D3');
}
await check('GLOBAL', 'Edge must abstain from identity-unbound training evidence', () => {
  const row = { ...fixture('NO-PROOF-EDGE', all(5)).row, place_details: {} };
  assert.equal(edgeLearn(all(3), [row]).samples, 0);
}, 'D2');
await check('GLOBAL', 'Edge must reject an unknown explicit sensory scale', () => {
  const row = { ...fixture('UNKNOWN-SCALE', all(3)).row, sensory_attributes: { ...attrs(all(3)), scale: 'unknown' } };
  assert.equal(learn(all(3), [row as never]).samples, 0);
  assert.equal(edgeLearn(all(3), [row]).samples, 0);
}, 'D3');
await check('GLOBAL', 'contradictory ratings lower confidence without inventing a direction', () => {
  const rows = [fixture('CONFLICT-A', all(5)).row, { ...fixture('CONFLICT-B', all(5)).row, rating: 'not_for_me' as const },
    fixture('CONFLICT-C', all(1)).row, { ...fixture('CONFLICT-D', all(1)).row, rating: 'not_for_me' as const }];
  const out = learn(all(3), training(rows, true));
  assert.deepEqual(out.profile, all(3)); assert.equal(out.samples, 4); assert.equal(out.calibration.conflicting, true);
  assert.ok(out.confidence < 20);
});
await check('GLOBAL', 'recency follows tasting date, not unrelated metadata edit date', () => {
  const rows = [...Array.from({ length: 6 }, (_, i) => ({ ...fixture('OLD-' + i, all(5)).row,
    place_details: { ...fixture('OLD-' + i, all(5)).row.place_details, matchrim_rating_at: '2024-01-01T00:00:00Z' } })),
  ...Array.from({ length: 6 }, (_, i) => fixture('NEW-' + i, all(0)).row)];
  const result = learn(all(3), training(rows, true));
  assert.ok(axes.every(key => result.profile[key] < 3));
  assert.deepEqual(training(rows, true), training(rows.map(r => ({ ...r, updated_at: '2030-01-01T00:00:00Z' })), true));
});
await check('GLOBAL', 'bidirectional restaurant focus executes actual planner/runner, no global taste score claimed', async () => {
  const foods = Array.from({ length: 121 }, (_, i) => ({ id: `food-${i}`, name: `Synthetic Dish ${i}`, sourceText: `Synthetic Dish ${i}`, kind: 'food' as const }));
  const wines = Array.from({ length: 121 }, (_, i) => ({ id: `wine-${i}`, name: `Synthetic Wine ${i}`, sourceText: `Synthetic Wine ${i}`, kind: 'wine' as const }));
  for (const focus of [{ selectedFoodId: foods[0].id }, { selectedWineId: wines[0].id },
    { selectedFoodId: foods[0].id, selectedWineId: wines[0].id }]) {
    const plan = planRestaurantRanking91(foods, wines, focus);
    assert.equal(plan.length, Object.keys(focus).length === 2 ? 1 : 2);
    const result = await runRestaurantRanking91(plan, new AbortController().signal, async body => {
      const food = (body.foods as typeof foods)[0], wine = (body.wines as typeof wines)[0];
      return { pairs: [{ foodId: food.id, wineId: wine.id, band: 'uncertain', positives: [`${food.name} with ${wine.name}`],
        frictions: [], missing: ['Synthetic: no measured pairing evidence'], evidence: 'model_inference' }], warnings: [] };
    }, () => {});
    assert.equal(result.pairs.length, plan.length);
    if (focus.selectedFoodId) assert.ok(result.pairs.every(p => p.foodId === focus.selectedFoodId));
    if (focus.selectedWineId) assert.ok(result.pairs.every(p => p.wineId === focus.selectedWineId));
  }
});
await check('GLOBAL', 'restaurant active cancellation settles without waiting for a non-cooperative transport', async () => {
  const food = { id: 'cancel-food', name: 'Synthetic Dish', sourceText: 'Synthetic Dish', kind: 'food' as const };
  const wine = { id: 'cancel-wine', name: 'Synthetic Wine', sourceText: 'Synthetic Wine', kind: 'wine' as const };
  const controller = new AbortController();
  let release: (value: unknown) => void = () => {};
  let started: () => void = () => {};
  const invoked = new Promise<void>(resolve => { started = resolve; });
  let calls = 0;
  const work = runRestaurantRanking91(planRestaurantRanking91([food], [wine], {}), controller.signal,
    () => { calls++; started(); return new Promise(resolve => { release = resolve; }); }, () => {});
  const result = work.then(() => 'resolved', (error: Error) => error.name);
  await invoked;
  controller.abort();
  const observed = await Promise.race([result, new Promise<string>(resolve => setTimeout(() => resolve('still-pending-after-50ms'), 50))]);
  release({ pairs: [], warnings: [] });
  const afterRelease = await result;
  journeyObservations.restaurantCancellation = { observed, afterRelease, transport: 'deferred in-memory promise', realRequests: 0 };
  assert.equal(observed, 'AbortError');
  assert.equal(calls, 1);
}, 'D5');

for (const stop of ['abort', 'deadline'] as const) for (const late of ['resolve', 'reject'] as const) {
  for (const partial of [false, true]) await check('GLOBAL', `restaurant ${stop}, late ${late}, prior block ${partial}`, async () => {
    const realSetTimeout = globalThis.setTimeout, realClearTimeout = globalThis.clearTimeout;
    const timers = new Map<ReturnType<typeof setTimeout>, () => void>();
    globalThis.setTimeout = ((callback: () => void, delay?: number) => {
      if (delay !== 100_000) return realSetTimeout(callback, delay);
      const handle = {} as ReturnType<typeof setTimeout>; timers.set(handle, callback); return handle;
    }) as typeof setTimeout;
    globalThis.clearTimeout = ((handle: ReturnType<typeof setTimeout>) => {
      if (!timers.delete(handle)) realClearTimeout(handle);
    }) as typeof clearTimeout;
    const controller = new AbortController();
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const add = controller.signal.addEventListener.bind(controller.signal), remove = controller.signal.removeEventListener.bind(controller.signal);
    controller.signal.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions) => {
      if (type === 'abort') listeners.add(listener); add(type, listener, options);
    }) as typeof controller.signal.addEventListener;
    controller.signal.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: EventListenerOptions) => {
      listeners.delete(listener); remove(type, listener, options);
    }) as typeof controller.signal.removeEventListener;
    let release: (value: unknown) => void = () => {}, rejectLate: (error: Error) => void = () => {}, started: () => void = () => {};
    let calls = 0, lateParsed = 0, transportSignal: AbortSignal | undefined;
    const invoked = new Promise<void>(resolve => { started = resolve; });
    const progress: number[] = [], unhandled: unknown[] = [];
    const onUnhandled = (error: unknown) => unhandled.push(error);
    process.on('unhandledRejection', onUnhandled);
    const food = { id: 'stop-food', name: 'Synthetic Dish', sourceText: 'Synthetic Dish', kind: 'food' as const };
    const wines = Array.from({ length: 241 }, (_, i) => ({ id: `stop-wine-${i}`, name: `Synthetic Wine ${i}`, sourceText: `Synthetic Wine ${i}`, kind: 'wine' as const }));
    let result: Promise<{ state: string; error?: Error }> | undefined;
    try {
      const work = runRestaurantRanking91(planRestaurantRanking91([food], wines, {}), controller.signal, async (body, signal) => {
        calls++;
        if (partial && calls === 1) {
          const wine = (body.wines as typeof wines)[0];
          return { pairs: [{ foodId: food.id, wineId: wine.id, band: 'uncertain', positives: [`${food.name} with ${wine.name}`],
            frictions: [], missing: ['Synthetic incomplete evidence'], evidence: 'model_inference' }], warnings: [] };
        }
        transportSignal = signal; started();
        return new Promise((yes, no) => { release = yes; rejectLate = no; });
      }, completed => progress.push(completed));
      result = work.then(() => ({ state: 'resolved' }), (error: Error) => ({ state: 'rejected', error }));
      await invoked;
      assert.equal(timers.size, 1, 'Production block deadline remains 100000ms');
      if (stop === 'abort') controller.abort();
      else [...timers.values()][0]();
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      const observed = await Promise.race([result, new Promise<{ state: string }>(resolve => {
        watchdog = realSetTimeout(() => resolve({ state: 'still-pending' }), 50);
      })]);
      if (watchdog) realClearTimeout(watchdog);
      if (late === 'resolve') release({ get pairs() { lateParsed++; throw new Error('Late data must not be parsed'); }, warnings: [] });
      else rejectLate(new Error('Synthetic late transport rejection'));
      const settled = await result;
      await new Promise<void>(resolve => setImmediate(resolve));
      await new Promise<void>(resolve => setImmediate(resolve));
      journeyObservations[`restaurant-${stop}-${late}-partial-${partial}`] = { observed: observed.state,
        error: settled.error?.message, calls, progress, timers: timers.size, listeners: listeners.size, lateParsed, unhandled };
      assert.equal(observed.state, 'rejected');
      assert.equal(settled.state, 'rejected');
      if (stop === 'abort') assert.equal(settled.error?.name, 'AbortError');
      else assert.match(settled.error?.message ?? '', /agot[oó] su tiempo/);
      assert.equal(transportSignal?.aborted, true);
      assert.equal(calls, partial ? 2 : 1, 'No retry or further blocks after termination');
      assert.deepEqual(progress, partial ? [0, 1] : [0], 'No completed progress or partial success is published');
      assert.equal(lateParsed, 0); assert.deepEqual(unhandled, []);
      assert.equal(timers.size, 0); assert.equal(listeners.size, 0);
    } finally {
      controller.abort(); release({ pairs: [], warnings: [] });
      if (result) await result;
      process.removeListener('unhandledRejection', onUnhandled);
      globalThis.setTimeout = realSetTimeout; globalThis.clearTimeout = realClearTimeout;
    }
  }, 'D5');
}
await check('GLOBAL', 'restaurant abort in progress callback starts no transport', async () => {
  const controller = new AbortController(); let calls = 0;
  const food = { id: 'f', name: 'Synthetic food', sourceText: 'Synthetic food', kind: 'food' as const };
  const wine = { id: 'w', name: 'Synthetic wine', sourceText: 'Synthetic wine', kind: 'wine' as const };
  await assert.rejects(runRestaurantRanking91(planRestaurantRanking91([food], [wine], {}), controller.signal,
    async () => { calls++; return {}; }, () => controller.abort()), { name: 'AbortError' });
  assert.equal(calls, 0);
}, 'D5');

const cellarSource = readFileSync(resolve(root, 'src/pages/MyWines.tsx'), 'utf8');
const cellarTree = ts.createSourceFile('MyWines.tsx', cellarSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const favoriteDeclarations: import('typescript').VariableDeclaration[] = [];
const findFavorite = (node: import('typescript').Node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(cellarTree) === 'handleToggleFavorite') favoriteDeclarations.push(node);
  ts.forEachChild(node, findFavorite);
};
findFavorite(cellarTree); assert.equal(favoriteDeclarations.length, 1);
const favoriteBody = ts.transpileModule('const ' + favoriteDeclarations[0].getText(cellarTree) + '; return handleToggleFavorite;',
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
for (const [name, receipt, expectedSuccess] of [
  ['complete matching receipt', { id: 'SYN-FAVORITE', user_id: 'SYN-OWNER', is_favorite: true }, 1],
  ['empty receipt', null, 0], ['wrong row', { id: 'OTHER-ROW', user_id: 'SYN-OWNER', is_favorite: true }, 0],
  ['missing favorite value', { id: 'SYN-FAVORITE', user_id: 'SYN-OWNER' }, 0],
  ['unchanged favorite value', { id: 'SYN-FAVORITE', user_id: 'SYN-OWNER', is_favorite: false }, 0],
  ['wrong owner', { id: 'SYN-FAVORITE', user_id: 'OTHER-OWNER', is_favorite: true }, 0],
  ['missing owner', { id: 'SYN-FAVORITE', is_favorite: true }, 0],
  ['coerced favorite', { id: 'SYN-FAVORITE', user_id: 'SYN-OWNER', is_favorite: 'true' }, 0],
  ['array receipt', [{ id: 'SYN-FAVORITE', user_id: 'SYN-OWNER', is_favorite: true }], 0],
] as const) await check('GLOBAL', 'actual cellar favorite confirmation: ' + name, async () => {
  const successes: string[] = [], errors: string[] = [];
  const filters: unknown[] = [], selections: string[] = [];
  const chain = { eq: (key: string, value: unknown) => { filters.push([key, value]); return chain; },
    select: (columns: string) => { selections.push(columns); return chain; }, single: async () => ({ data: receipt, error: null }) };
  const dependencies = { isNative: true, confirmsWineMutation, user: { id: 'SYN-OWNER' }, ownerLifetime: { current: { active: true, generation: 1 } },
    currentOwner: { current: 'SYN-OWNER' }, pendingFavorites: { current: new Set() }, setSavingFavorites: () => {},
    supabase: { from: () => ({ update: () => chain }) }, loadWines: () => {},
    toast: { success: (message: string) => successes.push(message), error: (message: string) => errors.push(message) },
    console: { error: () => {} } };
  const run = new Function(...Object.keys(dependencies), favoriteBody)(...Object.values(dependencies));
  await run('SYN-FAVORITE', false);
  journeyObservations['favorite-' + name] = { receipt, successes, errors, filters };
  assert.deepEqual(filters, [['id', 'SYN-FAVORITE'], ['user_id', 'SYN-OWNER']]);
  assert.deepEqual(selections, ['id, user_id, is_favorite']);
  assert.equal(successes.length, expectedSuccess);
  assert.equal(errors.length, expectedSuccess ? 0 : 1);
  assert.equal(dependencies.pendingFavorites.current.size, 0);
}, ['wrong row', 'missing favorite value', 'unchanged favorite value'].includes(name) ? 'D6' : undefined);

const favoriteHarness = (body = favoriteBody, native = true, currentFavorite = false) => {
  const successes: string[] = [], errors: string[] = [], selections: string[] = [];
  const filters: unknown[] = [], mutations: unknown[] = [];
  let reloads = 0, states = 0, complete: (value: unknown) => void = () => {};
  const response = new Promise(resolve => { complete = resolve; });
  const lifetime = { current: { active: true, generation: 1 } }, owner = { current: 'SYN-OWNER' }, pending = { current: new Set<string>() };
  const chain = { eq: (key: string, value: unknown) => { filters.push([key, value]); return chain; },
    select: (columns: string) => { selections.push(columns); return chain; }, single: () => response };
  const dependencies = { isNative: native, confirmsWineMutation, user: { id: 'SYN-OWNER' }, ownerLifetime: lifetime,
    currentOwner: owner, pendingFavorites: pending, setSavingFavorites: () => { states++; },
    supabase: { from: () => ({ update: (payload: unknown) => { mutations.push(payload); return chain; } }) },
    loadWines: () => { reloads++; }, console: { error: () => {} },
    toast: { success: (message: string) => successes.push(message), error: (message: string) => errors.push(message) } };
  const fn = new Function(...Object.keys(dependencies), body)(...Object.values(dependencies));
  return { run: () => fn('SYN-FAVORITE', currentFavorite), complete, lifetime, owner, pending,
    inspect: () => ({ successes, errors, selections, filters, mutations, reloads, states, pending: pending.current.size }) };
};
for (const mode of ['unmounted', 'generation', 'owner-changed', 'owner-away-back'] as const) await check('GLOBAL', 'native favorite stale lifetime: ' + mode, async () => {
  const h = favoriteHarness(), work = h.run();
  if (mode === 'unmounted') h.lifetime.current.active = false;
  if (mode === 'generation') h.lifetime.current.generation++;
  if (mode === 'owner-changed') h.owner.current = 'OTHER';
  if (mode === 'owner-away-back') { h.owner.current = 'OTHER'; h.lifetime.current.generation++; h.owner.current = 'SYN-OWNER'; }
  h.complete({ data: { id: 'SYN-FAVORITE', user_id: 'SYN-OWNER', is_favorite: true }, error: null }); await work;
  const actual = h.inspect();
  assert.deepEqual(actual.successes, []); assert.deepEqual(actual.errors, []);
  assert.equal(actual.reloads, 0); assert.equal(actual.states, 1); assert.equal(actual.pending, 0);
});
await check('GLOBAL', 'native favorite duplicate held pending, exact removal and SDK error', async () => {
  const h = favoriteHarness(undefined, true, true), work = h.run();
  await h.run(); assert.equal(h.inspect().mutations.length, 1);
  h.complete({ data: { id: 'SYN-FAVORITE', user_id: 'SYN-OWNER', is_favorite: false }, error: null }); await work;
  assert.equal(h.inspect().successes.length, 1); assert.equal(h.inspect().pending, 0);
  assert.deepEqual(h.inspect().mutations, [{ is_favorite: false }]);
  const failed = favoriteHarness(), failing = failed.run();
  failed.complete({ data: { id: 'SYN-FAVORITE', user_id: 'SYN-OWNER', is_favorite: true }, error: { message: 'Synthetic SDK failure' } }); await failing;
  assert.equal(failed.inspect().successes.length, 0); assert.equal(failed.inspect().errors.length, 1);
  assert.equal(failed.inspect().pending, 0);
});
await check('GLOBAL', 'published web favorite branch retains baseline query and receipt behavior', async () => {
  const before = readFileSync(resolve(evidenceRoot, 'fixes/before/MyWines.tsx'), 'utf8');
  const beforeTree = ts.createSourceFile('MyWines-before.tsx', before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration: import('typescript').VariableDeclaration | undefined;
  const visit = (node: import('typescript').Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(beforeTree) === 'handleToggleFavorite') declaration = node;
    ts.forEachChild(node, visit);
  };
  visit(beforeTree); assert.ok(declaration);
  const baselineBody = ts.transpileModule('const ' + declaration.getText(beforeTree) + '; return handleToggleFavorite;',
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const currentFavorite of [false, true]) for (const receipt of [null, [], {}, { id: 'SYN-FAVORITE' },
    { id: 'OTHER' }, { id: 'SYN-FAVORITE', is_favorite: currentFavorite }]) {
    const current = favoriteHarness(favoriteBody, false, currentFavorite), baseline = favoriteHarness(baselineBody, false, currentFavorite);
    const a = current.run(), b = baseline.run();
    current.complete({ data: receipt, error: null }); baseline.complete({ data: receipt, error: null }); await a; await b;
    assert.deepEqual(current.inspect(), baseline.inspect()); assert.deepEqual(current.inspect().selections, ['id']);
  }
  const transformed = ts.transform(favoriteDeclarations[0].initializer!, [context => root => {
    let query: import('typescript').Expression | undefined;
    const visit: import('typescript').Visitor = node => {
      if (ts.isVariableStatement(node) && node.declarationList.declarations.length === 1
        && node.declarationList.declarations[0].name.getText(cellarTree) === 'query') {
        query = node.declarationList.declarations[0].initializer; assert.ok(query); return undefined;
      }
      if (ts.isConditionalExpression(node) && node.condition.getText(cellarTree) === 'isNative') return ts.visitNode(node.whenFalse, visit);
      if (ts.isIfStatement(node) && node.expression.getText(cellarTree) === 'isNative') { assert.ok(node.elseStatement); return node.elseStatement; }
      if (ts.isIdentifier(node) && node.text === 'query' && query) return query;
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(root, visit) as import('typescript').Expression;
  }]);
  const printer = ts.createPrinter({ removeComments: true });
  assert.equal(printer.printNode(ts.EmitHint.Expression, transformed.transformed[0], cellarTree),
    printer.printNode(ts.EmitHint.Expression, declaration.initializer!, beforeTree)); transformed.dispose();
});
// Extract real handlers and normalizers; only import.meta is replaced for the offline fixture.
const consentParts = (source: string) => {
  const tree = ts.createSourceFile('MyWines-consent.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['normalizeAttributeTo5', 'normalizeSensoryAttributesTo5', 'normalizeAffinity', 'normalizeUserWine',
    'handleToggleProfileTraining', 'handleRating'];
  const declarations = new Map<string, import('typescript').VariableDeclaration>();
  const visit = (node: import('typescript').Node) => {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(tree))) {
      assert.ok(!declarations.has(node.name.getText(tree))); declarations.set(node.name.getText(tree), node);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.equal(declarations.size, names.length);
  const program = ts.createSourceFile('consent-fixture.ts', names.map(name => 'const ' + declarations.get(name)!.getText(tree) + ';').join('\n'), ts.ScriptTarget.Latest, true);
  const transformed = ts.transform(program, [context => root => {
    const visit: import('typescript').Visitor = node => ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword
      ? ts.factory.createIdentifier('fixtureImportMeta') : ts.visitEachChild(node, visit, context);
    return ts.visitNode(root, visit) as import('typescript').SourceFile;
  }]);
  const body = ts.createPrinter().printFile(transformed.transformed[0]); transformed.dispose();
  return ts.transpileModule(body + '\nreturn {rate: handleRating, toggle: handleToggleProfileTraining, normalize: normalizeUserWine};',
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
};
const currentConsentBody = consentParts(cellarSource);
const beforeConsentBody = consentParts(readFileSync(resolve(evidenceRoot, 'native-use/before/MyWines.tsx'), 'utf8'));
const publishedConsentBody = consentParts(readFileSync(resolve(evidenceRoot, 'fixes/before/MyWines.tsx'), 'utf8'));
const consentRow = (overrides: Record<string, unknown> = {}) => ({ ...fixture('SYN-CONSENT', continuousTarget).row,
  user_id: 'SYN-CONSENT-OWNER', status: 'collection', quantity: 2, consumption_date: null, price: null, ...overrides });
const consentHarness = (row: Record<string, unknown>, native = true, body = currentConsentBody,
  options: { receipt?: (value: Record<string, unknown>) => unknown; error?: unknown; stale?: boolean } = {}) => {
  let stored = structuredClone(row), reloads = 0, learningReloads = 0, finished = 0, activeAction = false;
  const wines: Record<string, unknown>[] = [], mutations: Array<{ payload: Record<string, unknown>; filters: unknown[]; columns?: string }> = [];
  const successes: string[] = [], errors: string[] = [], events: unknown[] = [], navigations: unknown[] = [], invokes: unknown[] = [];
  const ownerLifetime = { current: { active: true, generation: 1 } };
  type ConsentApi = { rate: (id: string, rating: string | null) => Promise<void>; toggle: (id: string, value: boolean) => Promise<void>;
    normalize: (wine: Record<string, unknown>) => Record<string, unknown> };
  class FixedDate extends Date { constructor() { super(stamp); } }
  const dependencies = { isNative: native, Capacitor: { isNativePlatform: () => native },
    optionalScanNumber, normalizeWineAttributesForInsight: normalize, readMenuPrice, hasStoredMenuCatalogEvidence,
    readCellarSensoryEvidence: sensory, confirmsWineMutation, resolveMatchrimEdgeFunctionName,
    fixtureImportMeta: { env: { VITE_MATCHRIM_EDGE_RELEASE: '75' } }, Date: FixedDate, wines, ownerLifetime,
    console: { error: () => {} },
    beginWineAction: (id: string) => {
      if (!ownerLifetime.current.active || activeAction) return null;
      assert.equal(id, row.id); activeAction = true; const generation = ownerLifetime.current.generation;
      return { ownerId: row.user_id, isCurrent: () => ownerLifetime.current.active && ownerLifetime.current.generation === generation,
        finish: () => { activeAction = false; finished++; } };
    },
    setWines: (update: (previous: typeof wines) => typeof wines) => { wines.splice(0, wines.length, ...update(wines)); },
    toast: { success: (message: string) => successes.push(message), error: (message: string) => errors.push(message) },
    trackAppEvent: (...args: unknown[]) => events.push(args), navigateToWineSection: (section: unknown) => navigations.push(section),
    loadWines: async () => { reloads++; wines.splice(0, wines.length, api.normalize(structuredClone(stored))); },
    loadLearningWines: async () => { learningReloads++; },
    supabase: { functions: { invoke: (...args: unknown[]) => { invokes.push(args); return Promise.resolve({ error: null }); } },
      from: (table: string) => {
        assert.equal(table, 'user_wines');
        return { update: (payload: Record<string, unknown>) => {
          const mutation: typeof mutations[number] = { payload: structuredClone(payload), filters: [] }; mutations.push(mutation);
          const chain = { eq: (key: string, value: unknown) => { mutation.filters.push([key, value]); return chain; },
            select: (columns: string) => { mutation.columns = columns; return chain; }, single: async () => {
              assert.deepEqual(mutation.filters, [['id', row.id], ['user_id', row.user_id]]);
              if (!options.error) stored = { ...stored, ...structuredClone(payload) };
              const data = Object.fromEntries((mutation.columns ?? '').split(',').map(key => key.trim()).map(key => [key, structuredClone(stored[key])]));
              if (options.stale) ownerLifetime.current.generation++;
              return { data: options.receipt ? options.receipt(data) : data, error: options.error ?? null };
            } };
          return chain;
        } };
      } } };
  const api = new Function(...Object.keys(dependencies), body)(...Object.values(dependencies)) as ConsentApi;
  wines.push(api.normalize(structuredClone(stored)));
  return { rate: (rating: string | null) => api.rate(String(row.id), rating), toggle: (value: boolean) => api.toggle(String(row.id), value),
    inspect: () => structuredClone({ row: stored, ui: wines[0], mutations, successes, errors, events, navigations, invokes,
      reloads, learningReloads, finished, activeAction }) };
};
const consentPolicy = (row: Record<string, unknown>, policy: string) => ({ ...(row.place_details as object), matchrim_training_policy: policy });
for (const policy of [undefined, 'excluded', 'included']) await check('GLOBAL', `native rating edit keeps prior false consent, metadata ${policy}`, async () => {
  const seed = consentRow();
  const h = consentHarness({ ...seed, use_for_profile_training: false,
    ...(policy ? { place_details: consentPolicy(seed, policy) } : {}) });
  await h.rate('ok'); const result = h.inspect(); journeyObservations['consent-false-' + policy] = result;
  assert.equal(result.row.rating, 'ok'); assert.equal(result.row.use_for_profile_training, false);
  assert.equal(result.successes.length, 1); assert.deepEqual(result.errors, []);
  assert.equal((result.row.place_details as Record<string, unknown>).matchrim_training_policy, 'excluded');
  assert.equal(result.row.quantity, 2); assert.equal(result.row.consumption_date, null); assert.deepEqual(result.invokes, []);
}, 'D7');
await check('GLOBAL', 'native actual love toggle-false meh sequence keeps consent excluded', async () => {
  const h = consentHarness(consentRow()); await h.toggle(false); await h.rate('ok');
  const result = h.inspect(); journeyObservations.consentNativeSequence = result;
  assert.equal(result.row.use_for_profile_training, false); assert.equal(result.row.rating, 'ok');
  assert.equal((result.row.place_details as Record<string, unknown>).matchrim_training_policy, 'excluded');
  assert.equal(result.successes.length, 2); assert.deepEqual(result.errors, []); assert.equal(result.finished, 2);
}, 'D7');
for (const policy of ['included', 'excluded']) await check('GLOBAL', `native clear and re-rate retains ${policy} policy`, async () => {
  const seed = consentRow(), h = consentHarness({ ...seed, use_for_profile_training: policy === 'included', place_details: consentPolicy(seed, policy) });
  await h.rate(null); assert.equal(h.inspect().row.use_for_profile_training, false);
  assert.equal((h.inspect().row.place_details as Record<string, unknown>).matchrim_rating_at, null);
  await h.rate('not_for_me'); const result = h.inspect(); journeyObservations['consent-rerate-' + policy] = result;
  assert.equal(result.row.use_for_profile_training, policy === 'included'); assert.equal(result.successes.length, 2);
  assert.equal((result.row.place_details as Record<string, unknown>).matchrim_training_policy, policy);
}, 'D7');
await check('GLOBAL', 'native explicit re-inclusion survives subsequent rating edit', async () => {
  const seed = consentRow(), h = consentHarness({ ...seed, use_for_profile_training: false, place_details: consentPolicy(seed, 'excluded') });
  await h.toggle(true); await h.rate('ok'); const result = h.inspect();
  assert.equal(result.row.use_for_profile_training, true); assert.equal(result.successes.length, 2); assert.deepEqual(result.errors, []);
  assert.equal((result.row.place_details as Record<string, unknown>).matchrim_training_policy, 'included');
}, 'D7');
for (const attributes of [attrs(continuousTarget), null]) await check('GLOBAL', `native initial rating policy unchanged, sensory ${Boolean(attributes)}`, async () => {
  const h = consentHarness(consentRow({ rating: null, use_for_profile_training: false, sensory_attributes: attributes }));
  await h.rate('love'); const result = h.inspect();
  assert.equal(result.row.use_for_profile_training, Boolean(attributes)); assert.equal(result.successes.length, 1);
  assert.equal(result.row.quantity, 2); assert.equal(result.row.status, 'collection'); assert.equal(result.row.consumption_date, null);
}, 'D7');
await check('GLOBAL', 'native excluded policy vetoes contradictory included flag and first rating', async () => {
  for (const rating of ['love', null]) {
    const seed = consentRow(), h = consentHarness({ ...seed, rating, use_for_profile_training: true, place_details: consentPolicy(seed, 'excluded') });
    await h.rate('ok'); assert.equal(h.inspect().row.use_for_profile_training, false);
  }
}, 'D7');
await check('GLOBAL', 'native consent toggle requires rating and verified sensory data', async () => {
  for (const overrides of [{ rating: null }, { sensory_attributes: null }, { place_details: {} }]) {
    const h = consentHarness(consentRow(overrides)); await h.toggle(true);
    assert.equal(h.inspect().mutations.length, 0); assert.equal(h.inspect().successes.length, 0); assert.equal(h.inspect().errors.length, 1);
  }
}, 'D7');
await check('GLOBAL', 'native rating and toggle reject incorrect receipts and stale lifetimes', async () => {
  for (const action of ['rate', 'toggle'] as const) for (const mode of ['wrong-flag', 'wrong-detail', 'sdk-error', 'stale'] as const) {
    const h = consentHarness(consentRow(), true, currentConsentBody, {
      receipt: mode === 'wrong-flag' ? data => ({ ...data, use_for_profile_training: true })
        : mode === 'wrong-detail' ? data => ({ ...data, place_details: {} }) : undefined,
      error: mode === 'sdk-error' ? { message: 'Synthetic consent SDK error' } : undefined, stale: mode === 'stale' });
    if (action === 'rate') await h.rate(null); else await h.toggle(false);
    const result = h.inspect(); assert.equal(result.successes.length, 0); assert.equal(result.errors.length, mode === 'stale' ? 0 : 1);
    assert.equal(result.reloads, 0); assert.equal(result.learningReloads, 0); assert.equal(result.finished, 1);
  }
}, 'D7');
await check('GLOBAL', 'web rating consent behavior remains identical to pre-fix published branch', async () => {
  for (const priorRating of [null, 'love', 'ok', 'not_for_me']) for (const flag of [false, true]) for (const policy of [undefined, 'included', 'excluded']) {
    const seed = consentRow({ rating: priorRating, use_for_profile_training: flag });
    const row = { ...seed, ...(policy ? { place_details: consentPolicy(seed, policy) } : {}) };
    const current = consentHarness(row, false), before = consentHarness(row, false, publishedConsentBody);
    for (const next of ['ok', null, 'love']) { await current.rate(next); await before.rate(next); assert.deepEqual(current.inspect(), before.inspect()); }
  }
  const h = consentHarness(consentRow(), false); await h.toggle(false); await h.rate('ok');
  assert.equal(h.inspect().row.use_for_profile_training, true, 'Known web opt-out bug preserved by native-only scope');
  journeyObservations.consentWebSequence = h.inspect();
});
await check('GLOBAL', 'native conflicting consent negative control reproduces before fix', async () => {
  const seed = consentRow(), h = consentHarness({ ...seed, use_for_profile_training: false, place_details: consentPolicy(seed, 'included') }, true, beforeConsentBody);
  await h.rate('ok'); const result = h.inspect(); journeyObservations.consentNativeBeforeConflict = result;
  assert.equal(result.row.use_for_profile_training, true);
});

await check('GLOBAL', 'all 50 outputs remain identical to frozen pre-fix baseline', () => {
  assert.deepEqual(observations, JSON.parse(readFileSync(resolve(evidenceRoot, 'synthetic-profiles.json'), 'utf8')));
});
await check('GLOBAL', 'D1 D2 D3 D4 outcomes preserved against pre-fix baseline', () => {
  const baseline = JSON.parse(readFileSync(resolve(evidenceRoot, 'results.json'), 'utf8')) as { checks: typeof checks };
  const retained = (rows: typeof checks) => rows.filter(c => ['D1', 'D2', 'D3', 'D4'].includes(c.defect ?? ''))
    .map(({ persona, invariant, passed, actual, expected }) => ({ persona, invariant, passed, actual, expected }));
  assert.deepEqual(retained(checks), retained(baseline.checks));
});
await check('GLOBAL', 'D4 scalar trace and historical v2 initial-score compatibility remain unchanged', () => {
  const distanceSquared = 5 * 4 ** 2, distance = Math.sqrt(distanceSquared), maximum = Math.sqrt(5 * 5 ** 2);
  const ratio = distance / maximum, raw = (1 - ratio) * 100, softened = 50 + (raw - 50) * .85;
  const number = (value: number) => {
    const bytes = new DataView(new ArrayBuffer(8)); bytes.setFloat64(0, value);
    return { value, decimal17: value.toPrecision(17), binary64: '0x' + bytes.getBigUint64(0).toString(16).padStart(16, '0') };
  };
  const tie = 24.5, bytes = new DataView(new ArrayBuffer(8)); bytes.setFloat64(0, tie);
  const tieBits = bytes.getBigUint64(0); bytes.setBigUint64(0, tieBits - 1n); const lower = bytes.getFloat64(0);
  const f = fixture('D4-HISTORICAL-V2', all(4));
  const saved = { ...f.row, place_details: withInitial(f.row, snapshot(all(0)), 'saved', stamp) };
  const oldInitial = initial(saved)!;
  assert.equal(affinity(all(0), attrs(all(4))), 24);
  assert.equal(Math.round(softened), 24); assert.ok(softened < tie);
  assert.equal(oldInitial.score, 24); assert.equal(oldInitial.model, 'scan-local-l2-0to5-v2');
  assert.deepEqual(initial(JSON.parse(JSON.stringify(saved))), oldInitial);
  assert.deepEqual(withInitial(saved, snapshot(all(3)), 'first_verified'), saved.place_details);
  const changed = structuredClone(saved) as typeof saved & { place_details: Record<string, unknown> };
  (changed.place_details.matchrim_affinity_initial as { score: number }).score = 25;
  assert.equal(initial(changed), null, 'Existing v2 validates the exact recomputed scalar, not a tolerance');
  journeyObservations.d4 = { exactAlgebra: { ratio: '4/5', raw: '20', softened: '49/2', halfUp: 25 },
    ieee754: { distanceSquared: number(distanceSquared), distance: number(distance), maximum: number(maximum),
      ratio: number(ratio), raw: number(raw), softened: number(softened), exactTie: number(tie), nextBelowTie: number(lower),
      tieGap: tie - softened, ulpsBelowTie: (tie - softened) / (tie - lower), rounded: Math.round(softened) },
    historicalInitial: oldInitial, score25RejectedUnderV2: true,
    implication: 'Changing v2 numeric rounding in place would invalidate stored score=24 at readCellarInitialAffinity; withCellarInitialAffinity could then replace historical evidence. A separately versioned scorer/validator policy is needed before a fix.' };
});

if (process.argv.includes('--native-trace')) {
  const unsupported = { ...fixture('NATIVE-USE-UNBOUND', continuousTarget).row, place_details: {} };
  const observedUse = await runUseLoader(all(3), [unsupported]);
  const beforeUse = await runUseLoader(all(3), [unsupported], true, beforeUseParts);
  const privateRoot = dirname(dirname(evidenceRoot));
  const deploymentRoot = resolve(privateRoot, 'matchrim92-openai-20261016');
  const manifest = JSON.parse(readFileSync(resolve(deploymentRoot, 'openai92-deployment-final.json'), 'utf8')) as {
    files: Array<{ path: string; content: string; sha256: string }>;
  };
  const readback = JSON.parse(readFileSync(resolve(deploymentRoot, 'deployment-source-readback.json'), 'utf8'));
  const selected = manifest.files.filter(f => ['supabase/functions/_shared/matchrim72/matchrim-learning.ts',
    'supabase/functions/scan-wine-menu-v72/index.ts', 'supabase/functions/scan-food-pairing/index.ts'].includes(f.path));
  for (const file of selected) assert.equal(sha(file.content), file.sha256, 'Frozen deployed-source mirror integrity');
  const learnerSource = selected.find(f => f.path.includes('/matchrim72/'))!;
  const compiled = ts.transpileModule(learnerSource.content, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const versioned = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')) as { calculateEdgeLearnedProfileAudit: typeof edgeLearn };
  const v72 = versioned.calculateEdgeLearnedProfileAudit;
  const foodSource = selected.find(f => f.path === 'supabase/functions/scan-food-pairing/index.ts')!;
  const foodTree = ts.createSourceFile('deployed-food.ts', foodSource.content, ts.ScriptTarget.Latest, true);
  const needed = ['clamp', 'normalizeSensoryValueTo5', 'normalizeSensoryAttributes', 'ratingWeight', 'buildLearnedProfile'];
  const declarations = foodTree.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations])
    .filter(d => needed.includes(d.name.getText(foodTree)));
  assert.equal(declarations.length, needed.length);
  const foodBody = ts.transpileModule(declarations.map(d => 'const ' + d.getText(foodTree) + ';').join('\n') + '\nreturn buildLearnedProfile;',
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const foodBuilder = new Function(foodBody)();
  const foodChain = { select: () => foodChain, eq: () => foodChain, not: () => foodChain, limit: () => foodChain,
    then: (yes: (value: unknown) => unknown) => Promise.resolve({ data: [unsupported], error: null }).then(yes) };
  const foodProfile = await foodBuilder({ from: () => foodChain }, 'SYN-NATIVE-FOOD', all(3));
  const nativeCommit = '6f45254b8e7e4aac817e7356d632f6fce352ed59';
  const identityFiles = ['src/pages/Index.tsx', 'src/pages/Profile.tsx', 'src/pages/UseMatchrim.tsx',
    'src/services/winerimApi.ts', 'src/services/matchrimScanProfile.ts', 'src/components/wine-import/FoodPairingScanner.tsx'];
  const prepared = resolve(privateRoot, 'matchrim94-testflight-20261016/candidate94-fixed-bundle');
  const preparation = JSON.parse(readFileSync(resolve(prepared, 'preparation.json'), 'utf8'));
  const distribution = JSON.parse(readFileSync(resolve(prepared, 'verification94-r3.json'), 'utf8'));
  save('native-reachability.json', {
    scope: 'Current native UseMatchrim fix plus read-only frozen native94/deployment-source audit; in-memory executions only. No hosted/provider/Apple operation. Historical native94 remains pre-fix until a new candidate is prepared.',
    native94: { sourceCommit: preparation.sourceCommit, policy: preparation.publicClient, routing: distribution.publicConfiguration.routing },
    currentVersusNative94: identityFiles.map(path => ({ path, currentSha256: sha(readFileSync(resolve(root, path))),
      native94SourceSha256: sha(execFileSync('git', ['show', nativeCommit + ':' + path], { cwd: root })) })),
    useMatchrimActualBody: { sourceSha256: sha(useSource), queries: observedUse.queries,
      observedProfile: observedUse.profile, observedLearning: observedUse.learning, nativeOptions: observedUse.nativeOptions,
      beforeFixObservedSamples: beforeUse.learning?.samples,
      strictEquivalentSamples: learn(all(3), training([unsupported], true)).samples },
    deployedVersionedMirror: { historicalReadbackCommit: readback.deployedCommit,
      matchingFilesAtRecordedReadback: readback.matchingFiles, currentRemoteStateReverified: false,
      sources: selected.map(file => ({ path: file.path, sha256: file.sha256,
        matchingHistoricalReadback: readback.results.find((r: { path: string }) => r.path === file.path),
        lines: file.content.split('\n').flatMap((text, i) => /calculateEdgeLearned|buildLearnedProfile|normalizeSensoryValue|Number\(value\)|Math.round\(scaled\)|\.from\(['"]user_wines|\.select\(|learnedProfile|matchrim-learning/.test(text)
          ? [{ line: i + 1, text }] : []) })),
      exactMarkedLove: v72(all(3), [unsupported]),
      invalidMarkedAxes: [6, 100, '0', null].map(value => ({ value, audit: v72(all(3), [{ ...unsupported,
        sensory_attributes: { ...unsupported.sensory_attributes, potencia: value } }]) })),
      unknownScale: v72(all(3), [{ ...unsupported, sensory_attributes: { ...unsupported.sensory_attributes, scale: 'unknown' } }]),
      noIdentityProof: v72(all(3), [unsupported]), foodActualBuilderProfile: foodProfile },
  });
}

const existing: Array<{ script: string; exitCode: number | null; error?: string; stdout: string; stderr: string; elapsedMs: number }> = [];
if (process.argv.includes('--existing')) {
  const groupNames = [
    'check-matchrim-learning', 'check-matchrim-personas', 'check-matchrim-training-evidence',
    'check-matchrim-intelligence89', 'check-matchrim-quiz-save85', 'check-matchrim-cellar-winerim-scale',
    'check-matchrim-qa85-intelligence', 'check-matchrim-scan-profile', 'check-matchrim-history-owner',
    'check-matchrim-onboarding-owner', 'check-matchrim-wine-mutation', 'check-matchrim-bodega84',
    'check-matchrim-restaurant84', 'check-matchrim-restaurant-session91', 'check-matchrim-restaurant-ranking91',
    'check-matchrim-restaurant-workspace91', 'check-matchrim-restaurant-provider91', 'check-matchrim-restaurant-documents91',
    'check-matchrim-restaurant-dedup93', 'check-matchrim-menu-execution93', 'check-matchrim-menu-comparison-oct12',
    'check-matchrim-menu-save-oct12', 'check-matchrim-menu-price-resolution-oct13', 'check-matchrim-menu-integration-oct13',
    'check-matchrim-menu-navigation-oct13', 'check-matchrim-menu-style-evidence-oct13',
  ];
  const guard = `import net from 'node:net'; import tls from 'node:tls'; import http from 'node:http';
    import https from 'node:https'; import dgram from 'node:dgram'; import {syncBuiltinESMExports} from 'node:module';
    const blocked = () => { throw new Error('CONSUMER95_CHILD_NETWORK_FORBIDDEN'); };
    globalThis.fetch = blocked; net.Socket.prototype.connect = blocked; tls.connect = blocked;
    http.request = blocked; http.get = blocked; https.request = blocked; https.get = blocked; dgram.createSocket = blocked;
    syncBuiltinESMExports();`;
  for (const name of groupNames) {
    const then = Date.now();
    const env: NodeJS.ProcessEnv = { ...process.env, MATCHRIM_RESTAURANT91_TEST_DEPS: process.env.MATCHRIM_RESTAURANT91_TEST_DEPS ?? '/tmp/matchrim-restaurant91-offline-deps' };
    delete env.MATCHRIM_QA_REPORT_DIR; delete env.MATCHRIM_PERSONA_QA_OUTPUT; delete env.MATCHRIM_DELTA_BASELINE;
    const structuredPath = JSON.stringify(resolve(output, 'existing-' + name + '-results.json'));
    const reportArg = name === 'check-matchrim-menu-save-oct12' ? '\nprocess.argv.push("--output", ' + structuredPath + ');'
      : ['check-matchrim-menu-navigation-oct13', 'check-matchrim-menu-price-resolution-oct13', 'check-matchrim-menu-style-evidence-oct13'].includes(name)
        ? '\nprocess.argv[2] = ' + structuredPath + ';' : '';
    const run = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', guard + reportArg + '\nawait import(' + JSON.stringify(pathToFileURL(resolve(root, 'scripts', name + '.ts')).href) + ');'],
      { cwd: root, env, encoding: 'utf8', timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
    const stdout = name + '.stdout.log', stderr = name + '.stderr.log';
    writeFileSync(resolve(output, stdout), run.stdout ?? '', { mode: 0o600 });
    writeFileSync(resolve(output, stderr), run.stderr ?? '', { mode: 0o600 });
    existing.push({ script: 'scripts/' + name + '.ts', exitCode: run.status, error: run.error?.message,
      stdout, stderr, elapsedMs: Date.now() - then });
    console.log(`EXISTING ${run.status === 0 ? 'PASS' : 'FAIL'} ${name}`);
  }
}
await check('GLOBAL', 'no network attempts from production functions', () => assert.equal(networkAttempts, 0));
await check('GLOBAL', 'network guard rejects fetch and raw sockets', () => {
  assert.throws(() => fetch('https://synthetic.invalid'), /CONSUMER95_NETWORK_FORBIDDEN/);
  assert.throws(() => new net.Socket().connect(443, 'synthetic.invalid'), /CONSUMER95_NETWORK_FORBIDDEN/);
  assert.equal(networkAttempts, 2);
});
await check('GLOBAL', 'imported contract sources, HEAD and branch unchanged', () => {
  assert.equal(git('rev-parse', 'HEAD'), start.head); assert.equal(git('branch', '--show-current'), start.branch);
  assert.deepEqual(criticalHashes(), initialSourceHashes);
});
const sourcePaths = [...new Set(['scripts/check-matchrim-consumer95-personas.ts', 'src/data/quizData.ts', 'src/utils/wineAffinityExplanation.ts',
  'src/utils/scanWineEvidence.ts', 'src/utils/winerimOriginalSheet.ts', 'src/utils/bodegaAffinity.ts',
  'src/utils/matchrimLearning.ts', 'src/utils/matchrimLocalOwner.ts', 'src/utils/matchrimLocalProfile.ts',
  'src/utils/scanProfile.ts', 'src/services/matchrimScanProfile.ts', 'src/utils/menuWineActions.ts',
  'src/pages/MyWines.tsx', 'src/pages/UseMatchrim.tsx', 'src/utils/restaurantRanking91.ts', 'src/pages/Restaurant.tsx',
  'supabase/functions/_shared/matchrim-learning.ts', 'scripts/matchrim-menu-etapa950-scope.ts', ...existing.map(g => g.script)])];
const report = {
  scope: '50 explicitly synthetic vectors and synthetic answers/ratings/owners; actual imported production modules, bundled actual quiz and profile service with only image/native/database transports substituted. Not human taste validation.',
  limitations: ['No real people or accounts, live auth/RLS, persistence, OCR, provider quality, Apple/simulator or production tested.',
    'Parity alone is not a score oracle: fixed numeric anchors, independent frozen quiz contributions and directional/bounds properties provide separate expectations.',
    'Five-axis synthetic contracts do not estimate human preference accuracy, calibration, cultural/dietary coverage or restaurant pairing quality.',
    'Boundary rejection may saturate at zero/five; direction is non-reversal, not guaranteed score decrease at a clamped endpoint.',
    'Native and database transports are in-memory doubles; owner tests verify real code filters/cache lifetime, not deployed authorization.',
    'Existing frozen-source tests may fail due later authorized changes; distinguish harness drift from product failures.'],
  start, end: { head: git('rev-parse', 'HEAD'), status: git('status', '--short'), trackedDiff: sha(git('diff', 'HEAD', '--binary')) },
  initialSourceHashes, finalContractSourceHashes: criticalHashes(),
  concurrentWorktreeChanges: 'Git status/diff are observations only. Parent/sibling edits are not reverted or attributed to this script; the imported contract hashes are checked independently.',
  syntheticProfiles: personas.length, passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length,
  byInvariant: Object.fromEntries([...new Set(checks.map(c => c.invariant))].map(name => [name, {
    passed: checks.filter(c => c.invariant === name && c.passed).length, failed: checks.filter(c => c.invariant === name && !c.passed).length }])),
  failuresByDefect: Object.fromEntries(['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].map(id => [id, checks.filter(c => !c.passed && c.defect === id).length])),
  zeroRealDatabaseWrites: true, outboundCalls: 0, guardProbes: networkAttempts,
  existing: { groups: existing.length, passed: existing.filter(g => g.exitCode === 0).length, failed: existing.filter(g => g.exitCode !== 0).length, results: existing },
  sourceHashes: Object.fromEntries(sourcePaths.map(path => [path, sha(readFileSync(resolve(root, path)))])), checks,
};
save('results.json', report); save('synthetic-profiles.json', observations); save('functional-journeys.json', journeyObservations);
save('native-use-profiles.json', useProfileObservations);
console.log(JSON.stringify({ profiles: 50, passed: report.passed, failed: report.failed, failuresByDefect: report.failuresByDefect,
  unexpectedFailures: checks.filter(c => !c.passed && !c.defect), existing: { passed: report.existing.passed, failed: report.existing.failed }, output }, null, 2));
process.exitCode = report.failed || report.existing.failed ? 1 : 0;
