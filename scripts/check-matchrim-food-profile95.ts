import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';
import vm from 'node:vm';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dgram from 'node:dgram';
import ts from 'typescript';
import * as profile95 from '../supabase/functions/_shared/matchrim-profile95';
import * as contract from '../supabase/functions/scan-food-pairing/contract';
import * as structured from '../supabase/functions/_shared/structured-response';
import * as legacy from '../supabase/functions/_shared/matchrim-learning';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '../src/utils/matchrimLearning';
import { cellarTrainingRows, makeCellarCatalogEvidence, type CellarAffinityWine } from '../src/utils/bodegaAffinity';
import { parseFoodScanResponse } from '../src/utils/foodScanResponse';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9);
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const baseline = (path: string) => execFileSync('git', ['show', `86df5feac04a6d33026c1ebc20cebab34ae4f3a4:${path}`], { cwd: root });
let outbound = 0;
const deny = (): never => { outbound++; throw new Error('FOOD_PROFILE95_NETWORK_FORBIDDEN'); };
globalThis.fetch = deny; net.Socket.prototype.connect = deny; tls.connect = deny;
http.request = deny; http.get = deny; https.request = deny; https.get = deny; dgram.createSocket = deny;
syncBuiltinESMExports();
const checks: string[] = [];
const observations: Record<string, unknown> = {};
const check = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); checks.push(name); };
const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const all = (value: number) => ({ potente: value, acidez: value, dulce: value, tanico: value, afrutado: value });
const attrs = (p: profile95.MatchrimProfile95, marked = true) => ({ ...(marked ? { scale: 'winerim-0-5' as const } : {}),
  potencia: p.potente, acidez: p.acidez, dulzura: p.dulce, taninos: p.tanico, afrutado: p.afrutado });
type Wine = TrainableWine & CellarAffinityWine & { id: string; user_id: string; place_details: Record<string, unknown> };
const stamp = '2026-05-01T12:00:00.000Z';
const wine = (id: string, p: profile95.MatchrimProfile95, rating: Wine['rating'] = 'love', date: string | null = stamp, marked = true): Wine => {
  const row = { id, user_id: 'SYN-OWNER', name: `Synthetic Wine ${id}`, producer: 'Synthetic Winery', vintage: 2024,
    region: 'Synthetic Region', country: 'Synthetic Country', rating, use_for_profile_training: true,
    sensory_attributes: attrs(p, marked), created_at: stamp, updated_at: stamp };
  return { ...row, place_details: { matchrim_rating_at: date,
    bodega_sensory_evidence: makeCellarCatalogEvidence(row, `SYN-CATALOG-${id}`, row.sensory_attributes) } };
};
const native = (base: profile95.MatchrimProfile95, rows: Wine[]) => calculateLearnedMatchrimProfile(base, cellarTrainingRows(rows, true));
const sourcePath = 'supabase/functions/scan-food-pairing/index.ts';
const source = read(sourcePath), before = baseline(sourcePath).toString('utf8');
const model = { summary: 'Synthetic dish', dishes: [{ nombre: 'Synthetic dish', categoria: 'principal', match: 99,
  razon: 'Synthetic culinary note', recomendaciones: [{ nombre: 'Blanco seco', tipo: 'Blanco', uvas: [], match: 99,
    razon: 'Podria acompanar al plato.', atributos: null }] }] };
type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
const deferred = <T>(): Deferred<T> => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
type Scenario = { owner?: string; base?: unknown; rows?: Wine[]; authError?: boolean; baseError?: boolean; rowsError?: boolean;
  throwAuth?: boolean; throwBase?: boolean; throwRows?: boolean; rowsGate?: Promise<void>; rowsStarted?: () => void };
type Query = { table: string; columns: string; filters: unknown[][]; limits: number[]; signal?: AbortSignal };
type Handler = (request: Request) => Promise<Response>;
function fixture(scenarios: Record<string, Scenario>, code = source) {
  let handler!: Handler;
  const queries: Query[] = [], prompts: string[] = [];
  const modules: Record<string, unknown> = {
    'https://deno.land/std@0.168.0/http/server.ts': { serve: (fn: Handler) => { handler = fn; } },
    'https://esm.sh/@supabase/supabase-js@2.7.1': { createClient: (_url: string, _key: string, options: { global: { headers: { Authorization: string } } }) => {
      const token = options.global.headers.Authorization.replace(/^Bearer\s+/i, '');
      const scenario = scenarios[token] ?? {};
      return { auth: { getUser: async () => {
        if (scenario.throwAuth) throw new Error('SYN-AUTH-FAILURE');
        return { data: { user: scenario.authError ? null : { id: scenario.owner ?? 'SYN-OWNER' } }, error: scenario.authError ? new Error('SYN-AUTH') : null };
      } }, from: (table: string) => {
        const query: Query = { table, columns: '', filters: [], limits: [] }; queries.push(query);
        const result = async () => {
          if (table === 'quiz_results') {
            if (scenario.throwBase) throw new Error('SYN-BASE-FAILURE');
            return { data: scenario.base === undefined ? all(3) : scenario.base, error: scenario.baseError ? new Error('SYN-BASE') : null };
          }
          scenario.rowsStarted?.(); await scenario.rowsGate;
          if (scenario.throwRows) throw new Error('SYN-ROWS-FAILURE');
          let rows = scenario.rows ?? [];
          const owner = query.filters.find(filter => filter[0] === 'user_id')?.[1];
          rows = rows.filter(row => row.user_id === owner);
          return { data: rows.map(row => Object.fromEntries(query.columns.split(',').map(key => key.trim())
            .map(key => [key, (row as unknown as Record<string, unknown>)[key]]))), error: scenario.rowsError ? new Error('SYN-ROWS') : null };
        };
        const chain = { select: (columns: string) => { query.columns = columns; return chain; },
          eq: (...args: unknown[]) => { query.filters.push(args); return chain; }, not: (...args: unknown[]) => { query.filters.push(['not', ...args]); return chain; },
          order: () => chain, limit: (count: number) => { query.limits.push(count); return chain; },
          abortSignal: (signal: AbortSignal) => { query.signal = signal; return chain; }, maybeSingle: result,
          then: (yes: (value: unknown) => unknown, no: (error: unknown) => unknown) => result().then(yes, no) };
        return chain;
      } };
    } },
    '../_shared/matchrim-profile95.ts': profile95, '../_shared/matchrim-learning.ts': legacy, './contract.ts': contract,
    '../_shared/structured-response.ts': structured,
    '../_shared/matchrim-openai.ts': { hasMatchrimOpenAiKey: () => true },
    '../_shared/matchrim-ai-provider.ts': { runMatchrimAi: async (request: { prompt: string }) => {
      prompts.push(request.prompt); return { complete: true, text: JSON.stringify(model), provider: 'openai', model: 'SYNTHETIC-NO-NETWORK' };
    } },
  };
  const sandbox = { exports: {}, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
    Deno: { env: { get: (key: string) => key === 'SUPABASE_URL' ? 'https://synthetic.invalid' : 'SYN-ANON' } },
    Response, Request, Headers, DOMException, console: { log() {}, error() {} }, fetch: deny };
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
    sandbox, { filename: sourcePath });
  const run = async (token = 'SYN-AUTH', clientProfile: unknown = all(5), signal?: AbortSignal, body: Record<string, unknown> = {}) => {
    const response = await handler(new Request('https://synthetic.invalid/functions/v1/scan-food-pairing', { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, signal,
      body: JSON.stringify({ mode: 'dish', image: 'data:image/png;base64,U1lOVEhFVElD', matchrimProfile: clientProfile, ...body }) }));
    return { status: response.status, body: await response.json() as Record<string, unknown> };
  };
  return { run, queries, prompts };
}
const profileLine = (prompt: string) => prompt.split('\n').find(line => line.startsWith('Perfil Matchrim'));

await check('exact profile reader preserves zeros/decimals and rejects coercion/invalid/missing axes', () => {
  const p = { potente: 0, acidez: 0.25, dulce: 2.5, tanico: 4.75, afrutado: 5 };
  assert.deepEqual(profile95.readMatchrimProfile95(p), p);
  for (const invalid of [null, undefined, '', '0', false, NaN, Infinity, -0.1, 5.01, 100]) {
    assert.equal(profile95.readMatchrimProfile95({ ...p, potente: invalid }), null);
  }
  assert.equal(profile95.readMatchrimProfile95([]), null);
});
await check('independent D1 anchor 2.1, signed direction, weighted mixture and input immutability', () => {
  const base = all(3), positive = wine('anchor', all(0)), snapshot = JSON.stringify([base, positive]);
  assert.deepEqual(profile95.calculateLearnedMatchrimProfile95(base, [positive]).profile, all(2.1));
  assert.deepEqual(profile95.calculateLearnedMatchrimProfile95(base, [wine('negative', all(0), 'not_for_me')]).profile, all(3.9));
  assert.deepEqual(profile95.calculateLearnedMatchrimProfile95(base, [wine('mix-love', all(5)), wine('mix-avoid', all(0), 'not_for_me')]).profile, all(3.9));
  assert.deepEqual(profile95.calculateLearnedMatchrimProfile95(base, [wine('weighted-love', all(0)), wine('weighted-ok', all(5), 'ok')]).profile, all(2.3));
  assert.deepEqual(profile95.calculateLearnedMatchrimProfile95(all(0.25), []).profile, all(0.25));
  assert.equal(profile95.calculateLearnedMatchrimProfile95({ ...base, potente: null }, [positive]).profile, null);
  assert.equal(JSON.stringify([base, positive]), snapshot);
  const old = legacy.calculateEdgeLearnedProfileAudit(base, [positive]); assert.deepEqual(old.profile, all(2.4));
  observations.anchor = { current: profile95.calculateLearnedMatchrimProfile95(base, [positive]), legacyUnchanged: old };
});
await check('D2 binding rejects absent/mismatched identity, attributes, source, canonical ID, and opt-out', () => {
  const row = wine('binding', all(0));
  for (const altered of [{ ...row, place_details: {} }, { ...row, name: 'Other synthetic wine' },
    { ...row, producer: 'Other' }, { ...row, vintage: 2023 }, { ...row, region: 'Other' }, { ...row, country: 'Other' },
    { ...row, sensory_attributes: attrs(all(2)) }, { ...row, use_for_profile_training: false }, { ...row, rating: null },
    ...['source', 'canonical_id', 'scale', 'version'].map(key => ({ ...row, place_details: { ...row.place_details,
      bodega_sensory_evidence: { ...(row.place_details.bodega_sensory_evidence as Record<string, unknown>), [key]: '' } } }))]) {
    assert.equal(profile95.calculateLearnedMatchrimProfile95(all(3), [altered]).samples, 0);
  }
});
await check('D3 marked invalid values and unknown scales abstain, never infer another scale', () => {
  const row = wine('invalid', all(0));
  for (const invalid of [6, 100, '0', null, undefined, false, NaN, Infinity, -1]) {
    assert.equal(profile95.calculateLearnedMatchrimProfile95(all(3), [{ ...row, sensory_attributes: { ...row.sensory_attributes, potencia: invalid } }]).samples, 0);
  }
  assert.equal(profile95.calculateLearnedMatchrimProfile95(all(3), [{ ...row, sensory_attributes: { ...row.sensory_attributes, scale: 'unknown' } }]).samples, 0);
});
await check('legitimate v1 numeric evidence preserves native compatibility; unbound and coerced v1 abstain', () => {
  for (const p of [all(0), all(2.7), all(8), all(80)]) {
    const row = wine('legacy-' + p.potente, p, 'love', stamp, false);
    const actual = profile95.calculateLearnedMatchrimProfile95(all(3), [row]), expected = native(all(3), [row]);
    assert.deepEqual(actual, { profile: expected.profile, samples: expected.samples, confidence: expected.confidence });
  }
  const row = wine('v1-string', all(2), 'love', stamp, false);
  assert.equal(profile95.calculateLearnedMatchrimProfile95(all(3), [{ ...row, sensory_attributes: { ...row.sensory_attributes, potencia: '2' } }]).samples, 0);
  const coercion = { ...row, sensory_attributes: { ...row.sensory_attributes, potencia: '2' } };
  assert.equal(calculateLearnedMatchrimProfile(all(3), cellarTrainingRows([coercion] as unknown as TrainableWine[], true)).samples, 1,
    'Explicit negative control: native v1 historically coerces numeric strings; v95 deliberately refuses them');
});
await check('latest before eligibility excludes newer opt-out/invalid proof; equal-date rating/attribute conflicts abstain in both orders', () => {
  const row = wine('latest', all(0));
  const newer = { ...row, place_details: { ...row.place_details, matchrim_rating_at: '2026-06-01T12:00:00.000Z' } };
  for (const next of [{ ...newer, use_for_profile_training: false }, { ...newer, rating: null },
    { ...newer, place_details: { matchrim_rating_at: '2026-06-01T12:00:00.000Z' } }]) {
    for (const rows of [[row, next], [next, row]]) assert.equal(profile95.calculateLearnedMatchrimProfile95(all(3), rows).samples, 0);
  }
  for (const next of [wine('latest', all(5)), { ...row, rating: 'not_for_me' as const }]) {
    for (const rows of [[row, next], [next, row]]) assert.equal(profile95.calculateLearnedMatchrimProfile95(all(3), rows).samples, 0);
  }
  assert.equal(profile95.calculateLearnedMatchrimProfile95(all(3), [row, row]).samples, 1);
  const newerValid = { ...wine('latest', all(5)), place_details: {
    ...wine('latest', all(5)).place_details, matchrim_rating_at: '2026-06-01T12:00:00.000Z' } };
  for (const rows of [[row, newerValid], [newerValid, row]]) {
    assert.deepEqual(profile95.calculateLearnedMatchrimProfile95(all(3), rows).profile, all(3.6));
  }
  const conflictingAttributes = [wine('latest', all(0)), wine('latest', all(5))];
  assert.equal(native(all(3), conflictingAttributes).samples, 1,
    'Native historical selector takes a last conflicting attribute row; v95 explicitly abstains rather than inheriting order');
});
await check('120-day recency independent anchor and rating-date-only fallback match native', () => {
  const old = wine('dated-old', all(5), 'love', '2026-01-01T12:00:00.000Z');
  const recent = wine('dated-new', all(0), 'love', '2026-05-01T12:00:00.000Z');
  assert.deepEqual(profile95.calculateLearnedMatchrimProfile95(all(3), [old, recent]).profile, all(2.6));
  for (const date of [null, 'bad-date', '2026-01-01T12:00:00.000Z']) {
    const row = wine('date-fallback', all(0), 'love', date);
    row.updated_at = '2099-01-01T00:00:00.000Z'; row.created_at = '1900-01-01T00:00:00.000Z';
    assert.deepEqual(profile95.calculateLearnedMatchrimProfile95(all(3), [row, recent]).profile, native(all(3), [row, recent]).profile);
  }
});
for (let index = 0; index < 50; index++) await check(`SYN95-${index + 1}: native profile parity and actual complete Food provider prompt`, async () => {
  const base = Object.fromEntries(axes.map((axis, i) => [axis, ((index * 7 + i * 3) % 21) / 4])) as profile95.MatchrimProfile95;
  const target = Object.fromEntries(axes.map((axis, i) => [axis, ((index * 11 + i * 5) % 21) / 4])) as profile95.MatchrimProfile95;
  const rows = [wine(`SYN95-${index}-a`, target), wine(`SYN95-${index}-b`, all(index % 6), 'ok', null),
    wine(`SYN95-${index}-c`, all((index + 2) % 6), 'not_for_me', '2026-01-01T12:00:00.000Z')];
  const actual = profile95.calculateLearnedMatchrimProfile95(base, rows), expected = native(base, rows);
  assert.deepEqual(actual, { profile: expected.profile, samples: expected.samples, confidence: expected.confidence });
  const f = fixture({ 'SYN-AUTH': { base, rows } }), result = await f.run();
  assert.equal(result.status, 200);
  const p = actual.profile!;
  assert.equal(profileLine(f.prompts[0]), `Perfil Matchrim del usuario (escala 0-5): potencia=${p.potente}, acidez=${p.acidez}, dulzura=${p.dulce}, taninos=${p.tanico}, afrutado=${p.afrutado}.`);
  assert.deepEqual(result.body.profile_context, { version: profile95.MATCHRIM_PROFILE95_VERSION, source: 'auth', status: 'learned', samples: 3 });
});
await check('actual handler D1/D2/D3 anchors and no hard50 projection truncation', async () => {
  for (const rows of [[wine('handler-zero', all(0))], [{ ...wine('unbound', all(0)), place_details: {} }],
    [{ ...wine('bad-scalar', all(0)), sensory_attributes: { ...attrs(all(0)), potencia: 100 } }]]) {
    const f = fixture({ 'SYN-AUTH': { rows } }), result = await f.run(); assert.equal(result.status, 200);
    assert.match(profileLine(f.prompts[0])!, rows[0].id === 'handler-zero' ? /potencia=2\.1/ : /potencia=3,/);
    const query = f.queries.find(q => q.table === 'user_wines')!;
    assert.equal(query.columns, profile95.MATCHRIM_PROFILE95_TRAINING_COLUMNS); assert.deepEqual(query.limits, []);
    assert.ok(query.filters.some(filter => filter[0] === 'user_id' && filter[1] === 'SYN-OWNER'));
  }
  const rows = Array.from({ length: 75 }, (_, i) => wine('over50-' + i, all(0)));
  const f = fixture({ 'SYN-AUTH': { rows } }), result = await f.run();
  assert.equal((result.body.profile_context as Record<string, unknown>).samples, 75);
  assert.deepEqual(profile95.calculateLearnedMatchrimProfile95(all(3), rows).profile, all(0.3));
});
await check('actual anonymous zero/decimal prompt remains exact; invalid client profile is absent', async () => {
  const p = { potente: 0, acidez: 0.25, dulce: 2.5, tanico: 4.75, afrutado: 5 };
  for (const token of ['', 'SYN-ANON']) {
    const f = fixture({}), result = await f.run(token, p); assert.equal(result.status, 200); assert.equal(result.body.profile_source, 'client');
    assert.match(profileLine(f.prompts[0])!, /potencia=0, acidez=0\.25, dulzura=2\.5, taninos=4\.75, afrutado=5/);
    assert.equal(f.queries.length, 0);
  }
  for (const value of [null, { ...p, potente: '0' }, { ...p, dulce: 6 }]) {
    const f = fixture({}), result = await f.run('', value); assert.equal(result.body.has_profile, false); assert.equal(profileLine(f.prompts[0]), undefined);
  }
});
await check('actual auth/base errors never reuse client profile; training errors clearly preserve base', async () => {
  for (const scenario of [{ authError: true }, { throwAuth: true }, { baseError: true }, { throwBase: true }, { base: null }, { base: { ...all(3), potente: '3' } }]) {
    const f = fixture({ 'SYN-AUTH': scenario }), result = await f.run();
    assert.equal(result.status, 200); assert.equal(result.body.has_profile, false); assert.equal(result.body.profile_source, 'none');
    assert.equal(profileLine(f.prompts[0]), undefined); assert.ok(!f.queries.some(q => q.table === 'user_wines'));
  }
  for (const scenario of [{ rowsError: true }, { throwRows: true }]) {
    const f = fixture({ 'SYN-AUTH': scenario }), result = await f.run();
    assert.equal(result.status, 200); assert.equal((result.body.profile_context as Record<string, unknown>).status, 'training-unavailable');
    assert.match(profileLine(f.prompts[0])!, /potencia=3,.*Solo test base; valoraciones no disponibles/);
  }
});
await check('active cancellation excludes late profile response before provider; simultaneous owners do not mix', async () => {
  const gate = deferred<void>(), started = deferred<void>(), controller = new AbortController();
  const f = fixture({ 'SYN-AUTH': { rows: [wine('late', all(0))], rowsGate: gate.promise, rowsStarted: () => started.resolve() } });
  const pending = f.run('SYN-AUTH', all(5), controller.signal); await started.promise; controller.abort(); gate.resolve();
  assert.equal((await pending).status, 500); assert.equal(f.prompts.length, 0);
  const rowB = { ...wine('owner-b', all(5)), user_id: 'SYN-OWNER-B' };
  const shared = fixture({ 'SYN-A': { rows: [wine('owner-a', all(0)), rowB] }, 'SYN-B': { owner: 'SYN-OWNER-B', base: all(1), rows: [wine('owner-a', all(0)), rowB] } });
  const a = shared.run('SYN-A'), b = shared.run('SYN-B'); await a; await b;
  assert.ok(shared.prompts.some(prompt => /potencia=2\.1,/.test(prompt))); assert.ok(shared.prompts.some(prompt => /potencia=2\.2,/.test(prompt)));
});
await check('whole vision prompt, output contract, OpenAI selection and non-profile failures retain baseline behavior', async () => {
  const initializer = (code: string, name: string) => {
    const tree = ts.createSourceFile('handler.ts', code, ts.ScriptTarget.Latest, true); const matches: string[] = [];
    const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) matches.push(node.initializer!.getText(tree)); ts.forEachChild(node, visit); };
    visit(tree); assert.equal(matches.length, 1); return matches[0];
  };
  assert.equal(initializer(source, 'prompt'), initializer(before, 'prompt'));
  for (const path of ['supabase/functions/scan-food-pairing/contract.ts', 'supabase/functions/_shared/matchrim-ai-provider.ts',
    'supabase/functions/_shared/matchrim-openai.ts', 'supabase/functions/_shared/matchrim-learning.ts']) assert.equal(sha(readFileSync(resolve(root, path))), sha(baseline(path)), path);
  for (const body of [{ mode: 'dish' }, { mode: 'menu' }, { mode: 'menu', scan_region: { id: 'left', box: { x: 0, y: 0, width: 55, height: 100 }, tile_count: 2, max_dishes: 30, coordinate_space: 'crop_percent' } }, { mode: 'invalid' }, { image: 'invalid' }]) {
    const f = fixture({}), old = fixture({}, before), current = await f.run('', null, undefined, body), previous = await old.run('', null, undefined, body);
    const normalized = { ...current.body }; delete normalized.profile_context; normalized.scan_version = previous.body.scan_version;
    assert.equal(current.status, previous.status); assert.deepEqual(normalized, previous.body);
  }
  const f = fixture({}), result = await f.run('', null), parsed = parseFoodScanResponse(result.body);
  assert.equal(parsed.dishes[0].match, null); assert.equal(parsed.dishes[0].recomendaciones[0].match, null);
  assert.equal(parsed.dishes[0].recomendaciones[0].atributos, null); assert.equal(result.body.ai_provider, 'openai');
  const robustnessPath = 'scripts/check-matchrim-food-robustness.ts';
  const oldRobustness = baseline(robustnessPath).toString('utf8');
  const expectedRobustness = oldRobustness.replace("import * as learning from '../supabase/functions/_shared/matchrim-learning';",
    "import * as learning from '../supabase/functions/_shared/matchrim-learning';\nimport * as profile95 from '../supabase/functions/_shared/matchrim-profile95';")
    .replace("    '../_shared/matchrim-learning.ts': learning,", "    '../_shared/matchrim-learning.ts': learning,\n    '../_shared/matchrim-profile95.ts': profile95,");
  assert.notEqual(expectedRobustness, oldRobustness);
  assert.equal(read(robustnessPath), expectedRobustness, 'Exactly two VM dependency registration lines change; all 40 old test bodies remain byte-identical');
});
assert.equal(outbound, 0);
const report = { syntheticOnly: true, groups: checks.length, checks, profiles: 50, outbound, observations,
  sourceSha256: sha(source), helperSha256: sha(read('supabase/functions/_shared/matchrim-profile95.ts')),
  legacyLearningUnchanged: true, limitations: ['No deployed endpoint/provider/real account operations. Synthetic contracts are not human taste validation.',
    'v1 numeric bound evidence preserves native legacy normalization; v1 strings are deliberately excluded rather than coerced.',
    'Duplicate raw rows resolve before eligibility; same-date contradictory attributes/identity abstain conservatively even where native legacy selector takes the last row.'] };
if (output) { mkdirSync(resolve(output), { recursive: true }); writeFileSync(resolve(output, 'food-profile95-results.json'), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify({ groups: checks.length, profiles: 50, outbound, result: 'PASS', legacyLearningUnchanged: true }));
