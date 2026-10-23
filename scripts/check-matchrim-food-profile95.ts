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
import { makeProfiles131 } from './matchrim-profiles131-fixture.mjs';

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
const shipped95 = execFileSync('git', ['show', `ea89a3fc8bdc58676a029ae1a1afdb4c679cb843:${sourcePath}`], { cwd: root }).toString('utf8');
const model = { summary: 'Synthetic dish', dishes: [{ nombre: 'Synthetic dish', categoria: 'principal', match: 99,
  razon: 'Synthetic culinary note', recomendaciones: [{ nombre: 'Blanco seco', tipo: 'Blanco', uvas: [], match: 99,
    razon: 'Podria acompanar al plato.', atributos: null }] }] };
type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
const deferred = <T>(): Deferred<T> => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
type Scenario = { owner?: string; base?: unknown; rows?: Wine[]; authError?: boolean; baseError?: boolean; rowsError?: boolean;
  throwAuth?: boolean; throwBase?: boolean; throwRows?: boolean; rowsGate?: Promise<void>; rowsStarted?: () => void };
type Query = { table: string; columns: string; filters: unknown[][]; limits: number[]; signal?: AbortSignal };
type Handler = (request: Request) => Promise<Response>;
function fixture(scenarios: Record<string, Scenario>, code = source, providerPayload: unknown = model) {
  let handler!: Handler;
  const queries: Query[] = [], prompts: string[] = [], authTokens: string[] = [];
  const modules: Record<string, unknown> = {
    'https://deno.land/std@0.168.0/http/server.ts': { serve: (fn: Handler) => { handler = fn; } },
    'https://esm.sh/@supabase/supabase-js@2.7.1': { createClient: (_url: string, _key: string, options: { global: { headers: { Authorization: string } } }) => {
      const token = options.global.headers.Authorization.replace(/^Bearer\s+/i, '');
      const scenario = scenarios[token] ?? {};
      return { auth: { getUser: async (accessToken: string) => {
        authTokens.push(accessToken);
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
      prompts.push(request.prompt); return { complete: true, text: JSON.stringify(providerPayload), provider: 'openai', model: 'SYNTHETIC-NO-NETWORK' };
    } },
  };
  const sandbox = { exports: {}, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
    Deno: { env: { get: (key: string) => key === 'SUPABASE_URL' ? 'https://synthetic.invalid' : 'SYN-ANON' } },
    Response, Request, Headers, DOMException, URL, atob, TextDecoder, console: { log() {}, error() {} }, fetch: deny };
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
    sandbox, { filename: sourcePath });
  const run = async (token = 'SYN-AUTH', clientProfile: unknown = all(5), signal?: AbortSignal,
    body: Record<string, unknown> = {}, requestHeaders: Record<string, string> = {}) => {
    const response = await handler(new Request('https://synthetic.invalid/functions/v1/scan-food-pairing', { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...requestHeaders }, signal,
      body: JSON.stringify({ mode: 'dish', image: 'data:image/png;base64,U1lOVEhFVElD', matchrimProfile: clientProfile, ...body }) }));
    return { status: response.status, body: await response.json() as Record<string, unknown> };
  };
  return { run, queries, prompts, authTokens };
}
const profileLine = (prompt: string) => prompt.split('\n').find(line => line.startsWith('Perfil Matchrim'));

await check('native186: 50 owner-bound Food prompts exclude public sensory defaults without a client-profile override', async () => {
  for (const { profile: p } of makeProfiles131('00000000-0000-4000-8000-000000018600')) {
    const row = wine('public186', all(3));
    row.place_details.bodega_sensory_evidence = makeCellarCatalogEvidence(row, 'winerim-public-store:186', row.sensory_attributes!);
    const before = JSON.stringify(row);
    const f = fixture({ 'SYN-AUTH': { base: p, rows: [row, { ...wine('foreign186', all(5)), user_id: 'OTHER-OWNER' }] } });
    const result = await f.run('SYN-AUTH', all(5), undefined, { matchrimLearningModel: profile95.NATIVE_MATCHRIM_LEARNING_MODEL });
    assert.equal(result.status, 200);
    assert.equal((result.body.profile_context as Record<string, unknown>).status, 'base');
    assert.equal((result.body.profile_context as Record<string, unknown>).samples, 0);
    assert.equal(profileLine(f.prompts[0]), `Perfil Matchrim del usuario (escala 0-5): potencia=${p.potente}, acidez=${p.acidez}, dulzura=${p.dulce}, taninos=${p.tanico}, afrutado=${p.afrutado}.`);
    assert(f.queries.every(q => q.filters.some(filter => filter[0] === 'user_id' && filter[1] === 'SYN-OWNER')));
    assert.equal(JSON.stringify(row), before);
  }
});

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
await check('legacy vision prompt, output contract, OpenAI selection and non-profile failures retain baseline behavior', async () => {
  const initializer = (code: string, name: string) => {
    const tree = ts.createSourceFile('handler.ts', code, ts.ScriptTarget.Latest, true); const matches: string[] = [];
    const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) matches.push(node.initializer!.getText(tree)); ts.forEachChild(node, visit); };
    visit(tree); assert.equal(matches.length, 1); return matches[0];
  };
  const contractPath = 'supabase/functions/scan-food-pairing/contract.ts';
  for (const name of ['normalizeFoodScan', 'isFoodScanPayload', 'parseFoodMenuRegionContext']) {
    assert.equal(initializer(read(contractPath), name), initializer(baseline(contractPath).toString('utf8'), name), name);
  }
  for (const path of ['supabase/functions/_shared/matchrim-ai-provider.ts',
    'supabase/functions/_shared/matchrim-openai.ts', 'supabase/functions/_shared/matchrim-learning.ts']) assert.equal(sha(readFileSync(resolve(root, path))), sha(baseline(path)), path);
  for (const body of [{ mode: 'dish' }, { mode: 'menu' }, { mode: 'menu', scan_region: { id: 'left', box: { x: 0, y: 0, width: 55, height: 100 }, tile_count: 2, max_dishes: 30, coordinate_space: 'crop_percent' } }, { mode: 'invalid' }, { image: 'invalid' }]) {
    const f = fixture({}), old = fixture({}, before), current = await f.run('', null, undefined, body), previous = await old.run('', null, undefined, body);
    const shipped = fixture({}, shipped95); await shipped.run('', null, undefined, body);
    assert.deepEqual(f.prompts, shipped.prompts,
      'native compact-menu opt-in must not change legacy prompt semantics');
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
const publicProfile = { potente: 0, acidez: 0.25, dulce: 2.5, tanico: 4.75, afrutado: 5 };
const publicClaims = { role: 'anon', ref: 'synthetic', exp: Math.floor(Date.now() / 1000) + 3600 };
const syntheticJwt = (claims: unknown, header: unknown = { alg: 'HS256', typ: 'JWT' }) =>
  Buffer.from(JSON.stringify(header)).toString('base64url') + '.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.U1lOVEhFVElDX05PVF9BX1NJR05BVFVSRQ';
const publicJwt = syntheticJwt(publicClaims), publishable = 'sb_publishable_SYNTHETIC_PUBLIC_NOT_A_REAL_KEY';
for (const [name, token] of [['legacy public JWT different from edge env key', publicJwt], ['current publishable presentation', publishable]]) {
  await check(`v10 actual handler accepts ${name} only as unprivileged client preferences`, async () => {
    const f = fixture({ [token]: { throwAuth: true } });
    const result = await f.run(token, publicProfile, undefined, { user_id: 'SYN-SPOOF-OWNER', profile_source: 'auth' }, { apikey: token });
    assert.equal(result.status, 200); assert.equal(result.body.scan_version, 'scan-food-pairing-2026-10-20-profile95-v11');
    assert.deepEqual(result.body.profile_context, { version: profile95.MATCHRIM_PROFILE95_VERSION, source: 'client', status: 'client', samples: 0 });
    assert.equal(result.body.profile_source, 'client'); assert.equal(f.authTokens.length, 0); assert.equal(f.queries.length, 0);
    assert.match(profileLine(f.prompts[0])!, /potencia=0, acidez=0\.25, dulzura=2\.5, taninos=4\.75, afrutado=5/);
    assert.ok(!JSON.stringify(result.body.profile_context).includes('SYN-SPOOF-OWNER'));
  });
}
await check('v10 public presentations with invalid client profiles abstain without inventing or loading server preferences', async () => {
  for (const token of [publicJwt, publishable]) for (const p of [null, { ...publicProfile, potente: '0' }, { ...publicProfile, acidez: 6 }]) {
    const f = fixture({ [token]: { throwAuth: true, base: all(3) } });
    const result = await f.run(token, p, undefined, {}, { apikey: token });
    assert.equal(result.body.has_profile, false); assert.equal(f.authTokens.length, 0); assert.equal(f.queries.length, 0);
    assert.deepEqual(result.body.profile_context, { version: profile95.MATCHRIM_PROFILE95_VERSION, source: 'none', status: 'none', samples: null });
    assert.equal(profileLine(f.prompts[0]), undefined);
  }
});
const rejectedPresentations: Array<{ name: string; token: string; apiKey?: string; authorization?: string }> = [
  { name: 'non-anon account role', token: syntheticJwt({ ...publicClaims, role: 'authenticated', sub: 'SYN-USER' }) },
  { name: 'service role', token: syntheticJwt({ ...publicClaims, role: 'service_role' }) },
  { name: 'spoofed anon with account sub', token: syntheticJwt({ ...publicClaims, sub: 'SYN-USER' }) },
  { name: 'spoofed anon with null sub', token: syntheticJwt({ ...publicClaims, sub: null }) },
  { name: 'spoofed anon with user_id', token: syntheticJwt({ ...publicClaims, user_id: 'SYN-USER' }) },
  { name: 'spoofed anon with session_id', token: syntheticJwt({ ...publicClaims, session_id: 'SYN-SESSION' }) },
  { name: 'wrong project', token: syntheticJwt({ ...publicClaims, ref: 'foreign-synthetic-project' }) },
  { name: 'expired public JWT', token: syntheticJwt({ ...publicClaims, exp: 1 }) },
  { name: 'future not-before', token: syntheticJwt({ ...publicClaims, nbf: Math.floor(Date.now() / 1000) + 3600 }) },
  { name: 'missing expiry', token: syntheticJwt({ role: 'anon', ref: 'synthetic' }) },
  { name: 'malformed payload object', token: syntheticJwt([]) },
  { name: 'unsigned JWT algorithm', token: syntheticJwt(publicClaims, { alg: 'none' }) },
  { name: 'malformed JWT encoding', token: 'eyJhbGciOiJIUzI1NiJ9.bm90LWpzb24.U1lOVEhFVElD' },
  { name: 'empty publishable suffix', token: 'sb_publishable_' },
  { name: 'secret key prefix', token: 'sb_secret_SYNTHETIC_NOT_A_REAL_SECRET' },
  { name: 'mismatched public headers', token: publicJwt, apiKey: publishable },
  { name: 'missing apikey', token: publicJwt, apiKey: '' },
  { name: 'non-Bearer authorization', token: publicJwt, authorization: 'Basic ' + publicJwt },
  { name: 'expired account with public apikey', token: syntheticJwt({ ...publicClaims, role: 'authenticated', sub: 'SYN-USER', exp: 1 }), apiKey: publishable },
];
for (const input of rejectedPresentations) await check(`v10 ${input.name} stays on getUser path without client fallback`, async () => {
  const authorization = input.authorization ?? 'Bearer ' + input.token;
  const actualToken = authorization.replace(/^Bearer\s+/i, '');
  const f = fixture({ [actualToken]: { authError: true } });
  const headers: Record<string, string> = { Authorization: authorization };
  const apiKey = input.apiKey ?? input.token; if (apiKey) headers.apikey = apiKey;
  const result = await f.run(input.token, publicProfile, undefined, {}, headers);
  assert.equal(result.status, 200); assert.deepEqual(f.authTokens, [actualToken]); assert.equal(f.queries.length, 0);
  assert.equal(result.body.has_profile, false);
  assert.deepEqual(result.body.profile_context, { version: profile95.MATCHRIM_PROFILE95_VERSION, source: 'none', status: 'unavailable', samples: null });
  assert.equal(profileLine(f.prompts[0]), undefined);
});
await check('v10 verified account token still requires getUser and only owner-filtered server profile, even with matching headers', async () => {
  const token = syntheticJwt({ ...publicClaims, role: 'authenticated', sub: 'SYN-OWNER' });
  const f = fixture({ [token]: { base: all(4), rows: [] } });
  const result = await f.run(token, publicProfile, undefined, {}, { apikey: token });
  assert.deepEqual(f.authTokens, [token]); assert.equal(f.queries.length, 2);
  assert.ok(f.queries.every(query => query.filters.some(filter => filter[0] === 'user_id' && filter[1] === 'SYN-OWNER')));
  assert.deepEqual(result.body.profile_context, { version: profile95.MATCHRIM_PROFILE95_VERSION, source: 'auth', status: 'base', samples: 0 });
  assert.match(profileLine(f.prompts[0])!, /potencia=4, acidez=4, dulzura=4, taninos=4, afrutado=4/);
});
await check('v10 public presentation never authenticates an extra claimed identity', async () => {
  const token = syntheticJwt({ ...publicClaims, owner_id: 'SYN-CLAIMED-OWNER', profile_source: 'auth' });
  const f = fixture({ [token]: { throwAuth: true, base: all(5) } });
  const result = await f.run(token, publicProfile, undefined, {}, { apikey: token });
  assert.equal(f.authTokens.length, 0); assert.equal(f.queries.length, 0);
  assert.equal((result.body.profile_context as Record<string, unknown>).source, 'client');
  assert.ok(!f.prompts[0].includes('SYN-CLAIMED-OWNER'));
});
const genericProviderPayload = (attributes: unknown) => ({
  summary: 'SYN-GENERIC-STYLES-ONLY',
  coverage: { estimated_visible_dishes: 3, unreadable_dishes: 1, truncated: true, notes: ['SYN-PRESERVE-COVERAGE'],
    regions: [{ id: 'left', box: { x: 0, y: 0, width: 55, height: 100 }, estimated_visible_dishes: 3, unreadable_dishes: 1, truncated: true }] },
  dishes: [0, 1].map(index => ({ nombre: `Synthetic dish ${index}`, categoria: 'principal', match: 91,
    razon: `SYN-DISH-REASON-${index}`, source_order: index + 1, source_text: `Synthetic dish ${index}`,
    region_id: 'left', source_box: { x: 5, y: 10 + index * 20, width: 40, height: 10 }, confidence: 87,
    recomendaciones: ['Blanco seco', 'Tinto ligero'].map((nombre, i) => ({ nombre, tipo: i ? 'Tinto' : 'Blanco',
      uvas: ['Synthetic grape'], match: 99 - i, razon: 'SYN-GENERIC-REASON', atributos: attributes })) })),
});
const withoutRecommendationAttributes = (dishes: contract.FoodDish[]) => dishes.map(dish => ({ ...dish,
  recomendaciones: dish.recomendaciones.map(recommendation => {
    const { atributos: _attributes, ...rest } = recommendation; return rest;
  }) }));
const attributeCases: Array<[string, unknown]> = [
  ['full exact zero/decimal vector', { potencia: 0, acidez: 0.25, dulzura: 2.5, taninos: 4.75, afrutado: 5 }],
  ['full positive vector', { potencia: 3, acidez: 3, dulzura: 3, taninos: 3, afrutado: 3 }],
  ['partial numeric vector', { acidez: 3 }],
  ['out-of-range numeric claims', { potencia: -1, acidez: 1000 }],
  ['unknown numeric evidence claim', { provider_verified: 1 }],
  ['empty vector', {}], ['explicit null', null], ['omitted vector', undefined],
];
for (const [name, attributes] of attributeCases) await check(`v10 final generic-style response abstains from ${name}`, async () => {
  const payload = genericProviderPayload(attributes), snapshot = JSON.stringify(payload);
  for (const body of [{ mode: 'dish' as const }, { mode: 'menu' as const },
    { mode: 'menu' as const, scan_region: { id: 'left', box: { x: 0, y: 0, width: 55, height: 100 }, tile_count: 2, max_dishes: 30, coordinate_space: 'crop_percent' } }]) {
    const f = fixture({}, source, payload), result = await f.run('', publicProfile, undefined, body);
    assert.equal(result.status, 200); assert.equal(f.prompts.length, 1);
    const dishes = result.body.dishes as contract.FoodDish[];
    assert.equal(dishes.length, body.mode === 'dish' ? 1 : 2);
    for (const dish of dishes) {
      assert.equal(dish.match, null); assert.equal(dish.recomendaciones.length, 2);
      for (const recommendation of dish.recomendaciones) {
        assert.equal(recommendation.atributos, null, 'Provider numbers are not evidence for a generic style');
        assert.equal(recommendation.match, null, 'Existing numerical affinity abstention remains mandatory');
      }
    }
    const expected = contract.normalizeFoodScan(payload.dishes, payload.coverage, body.mode, 'scan_region' in body ? 30 : 60);
    assert.deepEqual(withoutRecommendationAttributes(dishes), withoutRecommendationAttributes(expected.dishes), 'No other dish/recommendation field changes at this boundary');
    assert.deepEqual(result.body.coverage, expected.coverage);
    assert.equal(result.body.summary, payload.summary); assert.equal(result.body.ai_provider, 'openai');
    assert.equal(result.body.scan_version, 'scan-food-pairing-2026-10-20-profile95-v11');
    assert.deepEqual(result.body.profile_context, { version: profile95.MATCHRIM_PROFILE95_VERSION, source: 'client', status: 'client', samples: 0 });
  }
  assert.equal(JSON.stringify(payload), snapshot);
});
for (const [name, attributes] of [['string number', { potencia: '3' }], ['boolean number', { acidez: true }],
  ['array vector', [1, 2, 3]], ['scalar vector', 3], ['provider scale/evidence claim', { potencia: 3, scale: 'winerim-0-5' }]] as Array<[string, unknown]>) {
  await check(`v10 malformed generic ${name} retains strict model-schema rejection`, async () => {
    const f = fixture({}, source, genericProviderPayload(attributes)), result = await f.run('', publicProfile);
    assert.equal(result.status, 502); assert.equal(result.body.error, 'invalid_model_response');
    assert.equal(result.body.reason, 'invalid_schema'); assert.deepEqual(result.body.dishes, []);
    assert.equal(f.prompts.length, 1);
  });
}
await check('v10 final response boundary is necessary: unchanged low-level normalizer and auth-only v10 still expose full/partial vectors', async () => {
  const enforced = 'dishes: normalized.dishes.map(dish => ({\n          ...dish,\n          recomendaciones: dish.recomendaciones.map(recommendation => ({ ...recommendation, atributos: null })),\n        }))';
  assert.equal(source.split(enforced).length, 2);
  const authOnlyV10 = source.replace(enforced, 'dishes: normalized.dishes');
  for (const attributes of [{ potencia: 3, acidez: 3, dulzura: 3, taninos: 3, afrutado: 3 }, { acidez: 3 }]) {
    const payload = genericProviderPayload(attributes);
    assert.notEqual(contract.normalizeFoodScan(payload.dishes, payload.coverage, 'dish').dishes[0].recomendaciones[0].atributos, null);
    const old = await fixture({}, authOnlyV10, payload).run('', publicProfile);
    assert.equal(old.status, 200);
    const dishes = old.body.dishes as contract.FoodDish[];
    assert.notEqual(dishes[0].recomendaciones[0].atributos, null, 'Negative control must reproduce the independently observed historical v10-auth-only defect');
  }
});
await check('Native96 exact model tag selects weak evidence only in the actual authenticated Food handler', async () => {
  const rows = [wine('native-weak', all(5), 'ok')];
  const f = fixture({ 'SYN-AUTH': { base: all(1), rows } });
  const result = await f.run('SYN-AUTH', all(5), undefined, {
    matchrimLearningModel: profile95.NATIVE_MATCHRIM_LEARNING_MODEL, user_id: 'SPOOF-OWNER', profile_source: 'client',
  });
  assert.equal(result.status, 200); assert.match(profileLine(f.prompts[0])!, /potencia=1\.3, acidez=1\.3/);
  assert.deepEqual(f.authTokens, ['SYN-AUTH']); assert.equal(f.queries.length, 2);
  assert(f.queries.every(query => query.filters.some(filter => filter[0] === 'user_id' && filter[1] === 'SYN-OWNER')));
  assert.deepEqual(result.body.profile_context, { version: profile95.MATCHRIM_PROFILE95_VERSION, source: 'auth', status: 'learned', samples: 1 });
});
await check('Native96 missing and invalid Food model tags retain exact legacy response and provider prompt', async () => {
  const scenario = { 'SYN-AUTH': { base: all(1), rows: [wine('weak', all(5), 'ok')] } };
  const old = fixture(scenario), original = await old.run();
  assert.match(profileLine(old.prompts[0])!, /potencia=2\.2,/);
  for (const tag of [undefined, null, '', false, 2, [], {}, 'native-evidence-strength-v2 ', 'NATIVE-EVIDENCE-STRENGTH-V2']) {
    const f = fixture(scenario), current = await f.run('SYN-AUTH', all(5), undefined, { matchrimLearningModel: tag });
    assert.deepEqual(current, original); assert.deepEqual(f.prompts, old.prompts); assert.deepEqual(f.queries, old.queries);
  }
});
await check('Native96 tag cannot authenticate, select another owner or turn auth failure into client fallback', async () => {
  const body = { matchrimLearningModel: profile95.NATIVE_MATCHRIM_LEARNING_MODEL, user_id: 'SPOOF-OWNER' };
  for (const scenario of [{ authError: true }, { throwAuth: true }]) {
    const f = fixture({ 'SYN-AUTH': scenario }), result = await f.run('SYN-AUTH', all(5), undefined, body);
    assert.equal(result.body.has_profile, false); assert.equal(f.queries.length, 0); assert.equal(profileLine(f.prompts[0]), undefined);
  }
  const anon = fixture({}), response = await anon.run('', all(0), undefined, body);
  assert.equal(response.body.profile_source, 'client'); assert.equal(anon.queries.length, 0); assert.equal(anon.authTokens.length, 0);
  assert.match(profileLine(anon.prompts[0])!, /potencia=0,/);
});
assert.equal(outbound, 0);
const report = { syntheticOnly: true, groups: checks.length, checks, profiles: 50, outbound, observations,
  sourceSha256: sha(source), helperSha256: sha(read('supabase/functions/_shared/matchrim-profile95.ts')),
  legacyLearningUnchanged: true, limitations: ['No deployed endpoint/provider/real account operations. Synthetic contracts are not human taste validation.',
    'v1 numeric bound evidence preserves native legacy normalization; v1 strings are deliberately excluded rather than coerced.',
    'Duplicate raw rows resolve before eligibility; same-date contradictory attributes/identity abstain conservatively even where native legacy selector takes the last row.'] };
if (output) { mkdirSync(resolve(output), { recursive: true }); writeFileSync(resolve(output, 'food-profile95-results.json'), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify({ groups: checks.length, profiles: 50, outbound, result: 'PASS', legacyLearningUnchanged: true }));
