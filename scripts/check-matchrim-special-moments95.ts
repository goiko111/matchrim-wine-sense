import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { calculateLearnedMatchrimProfile95, MATCHRIM_PROFILE95_TRAINING_COLUMNS, NATIVE_MATCHRIM_LEARNING_MODEL, readMatchrimLearningOptions96, readMatchrimProfile95 } from '../supabase/functions/_shared/matchrim-profile95';
import { safeSpecialMomentsText95, specialMomentsPrompt95, specialMomentsResponse95, SPECIAL_MOMENTS_FALLBACK95,
  SPECIAL_MOMENTS95_VERSION } from '../supabase/functions/_shared/matchrim-special-moments95';
import { specialMomentPlainText } from '../src/utils/specialMomentsRequest';
import { projectFeedbackServer96 } from './matchrim-feedback-server96-scope';

const current = readFileSync('supabase/functions/ai-wine-chat/index.ts', 'utf8');
const before = execFileSync('git', ['show', '86df:supabase/functions/ai-wine-chat/index.ts'], { encoding: 'utf8' });
const base = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
const valid = 'Si prefieres un blanco fresco, podrías buscar un albariño seco. Con un presupuesto de 15 a 20 euros por botella, los precios serían orientativos y convendría comprobarlos. Comparte la etiqueta o la carta para revisar una referencia concreta.';
const learnedRow = { id: 'source-a', user_id: 'owner-a', name: 'SYN source', producer: 'SYN producer', vintage: null, region: 'SYN region', country: 'ES',
  rating: 'love', use_for_profile_training: true, sensory_attributes: { scale: 'winerim-0-5', potencia: 0, acidez: 0, dulzura: 0, taninos: 0, afrutado: 0 },
  place_details: { bodega_sensory_evidence: { version: 2, scale: 'winerim-0-5', source: 'catalog', canonical_id: '278688',
    identity_signature: JSON.stringify(['syn source', 'syn producer', null, 'syn region', 'es']),
    attribute_signature: JSON.stringify(['winerim-0-5', 0, 0, 0, 0, 0]) } } };
const checks: string[] = [];
const check = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); checks.push(name); console.log('PASS', name); };
globalThis.fetch = async () => { throw new Error('Real network/provider forbidden in special95 unit'); };
const completion = (content: unknown, finish = 'stop') => new Response(JSON.stringify({ choices: [{ finish_reason: finish, message: { content } }] }), { headers: { 'Content-Type': 'application/json' } });
type Settings = { rows?: unknown[]; quiz?: unknown; quizError?: boolean; trainingError?: boolean; owner?: string | null; authError?: boolean; authGate?: Promise<void>; model?: (init: RequestInit) => Promise<Response> };
function handler(source = current, settings: Settings = {}) {
  const queries: { table: string; columns?: string; owner?: unknown }[] = [], logs: unknown[] = [], models: RequestInit[] = [];
  const client = { auth: { getUser: async () => { await settings.authGate; return { data: { user: settings.owner === null ? null : { id: settings.owner ?? 'owner-a' } }, error: settings.authError ? { message: 'Synthetic auth unavailable' } : null }; } },
    from(table: string) {
      const query = { table } as typeof queries[number];
      const run = () => {
        queries.push(query);
        if (table === 'quiz_results') return { data: settings.quizError ? null : settings.quiz === undefined ? base : settings.quiz, error: settings.quizError ? { message: 'synthetic query unavailable' } : null };
        return { data: (settings.rows ?? [learnedRow]).filter(r => (r as { user_id: unknown }).user_id === query.owner), error: settings.trainingError ? { message: 'synthetic training unavailable' } : null };
      };
      const builder = { select(columns: string) { query.columns = columns; return builder; }, eq(key: string, value: unknown) { assert.equal(key, 'user_id'); query.owner = value; return builder; },
        order() { return builder; }, limit() { return builder; }, abortSignal(signal: AbortSignal) { assert(signal instanceof AbortSignal); return builder; },
        maybeSingle: async () => run(), then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
        insert(value: unknown) { logs.push(value); return { then: () => Promise.resolve() }; } };
      return builder;
    } };
  const ast = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true);
  const code = ast.statements.filter(n => !ts.isImportDeclaration(n)).map(n => n.getText(ast)).join('\n');
  let invoke!: (req: Request) => Promise<Response>;
  const context = vm.createContext({ Request, Response, AbortSignal, AbortController, DOMException, Promise,
    Deno: { env: { get: (key: string) => key === 'SUPABASE_URL' ? 'https://synthetic.invalid' : key === 'SUPABASE_ANON_KEY' ? 'synthetic-anon' : undefined } },
    console: { error() {} }, serve: (fn: typeof invoke) => { invoke = fn; }, createClient: () => client,
    hasMatchrimOpenAiKey: () => true, getMatchrimOpenAiModel: () => 'synthetic-model',
    calculateLearnedMatchrimProfile95, MATCHRIM_PROFILE95_TRAINING_COLUMNS, readMatchrimLearningOptions96, readMatchrimProfile95, specialMomentsResponse95,
    fetchMatchrimAiChat: async (init: RequestInit) => { models.push(init); if (settings.model) return settings.model(init);
      return JSON.parse(String(init.body)).stream ? new Response('data: {"choices":[{"delta":{"content":"LEGACY"}}]}\n\ndata: [DONE]\n\n') : completion(valid); },
  });
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { invoke, models, queries, logs };
}
const request = (payload: unknown, signal?: AbortSignal, authenticated = true) => new Request('https://synthetic.invalid/functions/v1/ai-wine-chat', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer synthetic-owner-token' } : {}) }, body: JSON.stringify(payload), signal });
const payload = { functionType: 'special-moments', input1: 'Cena', eventDetails: { budget: '15 a 20 euros', food: 'Verduras' } };
const decodeSse = async (response: Response) => {
  const body = await response.text(), lines = body.trim().split('\n\n');
  assert.equal(lines.length, 2); assert.equal(lines[1], 'data: [DONE]');
  return JSON.parse(lines[0].slice(6)).choices[0].delta.content as string;
};
for (const text of ['Afinidad Matchrim 99%. Es perfecto para ti.', 'Tu compatibilidad es 99/100.', 'Noventa y nueve por ciento de afinidad.',
  'Esta botella está verificada. Si prefieres algo fresco, comparte la etiqueta.', 'Es ideal para tus gustos. Podrías consultar la carta.',
  'Cuesta 20 euros. Si prefieres un blanco, comparte la etiqueta.', 'Precio confirmado: 20 €. Si buscas un vino, consulta la carta.',
  'Esta es tu botella ideal. Si prefieres algo fresco, comparte la etiqueta.', 'Tu Matchrim es ９９％. Podrías leer la etiqueta.',
  'Tiene un encaje de 99⁄100. Podrías revisar la carta.', 'He verificado la ficha. Si prefieres fresco, consulta la etiqueta.',
  'Esta botella ha sido verificada. Si prefieres fresco, consulta la etiqueta.',
  'La ficha original ha sido confirmada. Podrías consultar la carta.']) {
  await check('reject whole unsupported output: ' + text.slice(0, 35), () => assert.equal(safeSpecialMomentsText95(text), null));
}
await check('valid conditional budget nuance stays intact, no personal probability', () => assert.equal(safeSpecialMomentsText95(valid), valid));
await check('strict owner learned floats2.1 reach actual special handler prompt, not base3 or client override', async () => {
  const h = handler(); const response = await h.invoke(request({ ...payload, profile: { ...base, potente: 5 }, user_id: 'owner-b' }));
  assert.equal(await decodeSse(response), valid); const body = JSON.parse(String(h.models[0].body));
  assert.match(body.messages[1].content, /"potente":2\.1/); assert.doesNotMatch(body.messages[1].content, /"potente":3|confianza|confidence|exploration/i);
  assert.equal(body.stream, false); assert.equal(body.max_completion_tokens, 1800); assert(h.models[0].signal instanceof AbortSignal);
  assert(h.queries.every(q => q.owner === 'owner-a')); assert.equal(response.headers.get('x-matchrim-profile-source'), 'strict-owner-learned');
});
await check('identity-unbound training rows cannot alter owner base profile', async () => {
  const h = handler(current, { rows: [{ ...learnedRow, place_details: {} }] }); await h.invoke(request(payload));
  assert.match(JSON.parse(String(h.models[0].body)).messages[1].content, /"potente":3/);
});
await check('foreign owner rows and edited identity proof excluded', async () => {
  for (const row of [{ ...learnedRow, user_id: 'owner-b' }, { ...learnedRow, name: 'Edited source' }]) {
    const h = handler(current, { rows: [row] }); await h.invoke(request(payload));
    assert.match(JSON.parse(String(h.models[0].body)).messages[1].content, /"potente":3/);
  }
});
await check('query error becomes unavailable general advice, never false no-learning or base fallback', async () => {
  const h = handler(current, { trainingError: true }); const response = await h.invoke(request(payload));
  const prompt = JSON.parse(String(h.models[0].body)).messages[1].content;
  assert.match(prompt, /No se pudo consultar el perfil/); assert.doesNotMatch(prompt, /"potente"|sin aprendizaje|0 valoraciones/);
  assert.equal(response.headers.get('x-matchrim-profile-source'), 'general-unavailable');
});
await check('anonymous caller has no owner profile read or fabricated defaults', async () => {
  const h = handler(); const r = await h.invoke(request(payload, undefined, false));
  assert.equal(h.queries.length, 0); assert.match(JSON.parse(String(h.models[0].body)).messages[1].content, /No hay un perfil/);
  assert.equal(r.headers.get('x-matchrim-profile-source'), 'general-missing');
});
await check('actual full handler removes entire persuasive99 response before first SSE token', async () => {
  const h = handler(current, { model: async () => completion('UNSAFE_PERSUASIVE_PREFIX: Afinidad Matchrim99%; esta botella es perfecta para ti.') });
  const response = await h.invoke(request(payload)); const result = await decodeSse(response);
  assert.equal(result, SPECIAL_MOMENTS_FALLBACK95); assert.doesNotMatch(result, /UNSAFE|99|%/); assert.match(result, /etiqueta|carta/);
  assert.equal(response.headers.get('x-matchrim-response-kind'), 'fallback'); assert.equal(response.headers.get('x-matchrim-response-reason'), 'output-rejected');
});
await check('complete validation precedes any response even when upstream sends partial JSON', async () => {
  let finish!: () => void; const h = handler(current, { model: async () => new Response(new ReadableStream({ start(c) {
    c.enqueue(new TextEncoder().encode('{"choices":[{"finish_reason":"stop","message":{"content":"UNSAFE99%'));
    finish = () => { c.enqueue(new TextEncoder().encode('"}}]}')); c.close(); };
  } }), { headers: { 'Content-Type': 'application/json' } }) });
  let settled = false; const pending = h.invoke(request(payload)).then(r => { settled = true; return r; });
  while (!finish) await new Promise(r => setImmediate(r)); assert.equal(settled, false); finish();
  assert.equal(await decodeSse(await pending), SPECIAL_MOMENTS_FALLBACK95);
});
await check('model timeout aborts transport, ignores late text and returns only fixed fallback', async () => {
  let observed!: AbortSignal;
  const response = await specialMomentsResponse95({ payload, headers: {}, timeoutMs: 5,
    loadProfile: async () => ({ profile: base, status: 'available' }), callModel: async init => { observed = init.signal!; return new Promise(() => {}); } });
  assert(observed.aborted); assert.equal(await decodeSse(response), SPECIAL_MOMENTS_FALLBACK95);
  assert.equal(response.headers.get('x-matchrim-response-reason'), 'timeout');
});
await check('owner/request cancellation produces no SSE or late persuasive content', async () => {
  const controller = new AbortController(); let resolve!: (r: Response) => void, signal!: AbortSignal;
  const h = handler(current, { model: async init => { signal = init.signal!; return new Promise(r => { resolve = r; }); } });
  const pending = h.invoke(request(payload, controller.signal)); while (!resolve) await new Promise(r => setImmediate(r));
  controller.abort(); const response = await pending; assert.equal(response.status, 499); assert.equal(await response.text(), ''); assert(signal.aborted);
  resolve(completion('UNSAFE99%')); assert.equal(h.logs.length, 0);
});
await check('cancelled owner lookup cannot start late profile queries or model calls', async () => {
  let release!: () => void; const controller = new AbortController();
  const h = handler(current, { authGate: new Promise<void>(resolve => { release = resolve; }) });
  const pending = h.invoke(request(payload, controller.signal)); await new Promise(r => setImmediate(r)); controller.abort();
  const response = await pending; assert.equal(response.status, 499); assert.equal(await response.text(), '');
  release(); await new Promise(r => setImmediate(r)); assert.equal(h.queries.length, 0); assert.equal(h.models.length, 0);
});
for (const [name, model] of [
  ['upstream503', async () => new Response('', { status: 503 })],
  ['truncated', async () => completion(valid, 'length')],
  ['oversize', async () => completion('L'.repeat(70000))],
] as const) await check('non-success model response fallback: ' + name, async () => {
  const h = handler(current, { model }); const response = await h.invoke(request(payload)); assert.equal(await decodeSse(response), SPECIAL_MOMENTS_FALLBACK95);
});
await check('non-PII version/kind/reason/source headers are exposed only on special', async () => {
  const h = handler(), r = await h.invoke(request(payload));
  assert.equal(r.headers.get('x-matchrim-function-version'), SPECIAL_MOMENTS95_VERSION); assert.equal(r.headers.get('x-matchrim-response-kind'), 'validated');
  assert.match(r.headers.get('Access-Control-Expose-Headers')!, /x-matchrim-response-reason/);
  assert.doesNotMatch([...r.headers].map(([k, v]) => k + v).join(' '), /owner-a|synthetic-owner-token|2\.1|confidence/);
});
for (const p of [{ message: 'Hola', context: 'SYN context' }, ...['wine-for-dish', 'dish-for-wine', 'pairing-check'].map(functionType => ({ functionType, input1: 'SYN A', input2: 'SYN B', context: 'SYN context' }))]) {
  await check('actual86df legacy handler response, request, queries and logs unchanged: ' + ('message' in p ? 'message' : p.functionType), async () => {
    const a = handler(before), b = handler(current); const ra = await a.invoke(request(p)), rb = await b.invoke(request(p));
    assert.equal(rb.status, ra.status); assert.deepEqual([...rb.headers], [...ra.headers]); assert.equal(await rb.text(), await ra.text());
    assert.deepEqual(b.models.map(m => JSON.parse(String(m.body))), a.models.map(m => JSON.parse(String(m.body))));
    assert.equal(JSON.stringify(b.queries), JSON.stringify(a.queries)); assert.equal(JSON.stringify(b.logs), JSON.stringify(a.logs));
  });
}
await check('ordinary source AST exactly86df after projecting only special95 additions', () => {
  const project = (source: string, remove: boolean) => {
    const ast = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true);
    const result = ts.transform(ast, [context => tree => {
      const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
        if (ts.isImportDeclaration(node)) return undefined;
        if (remove && ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(ast) === 'loadSpecialMomentProfile95')) return undefined;
        if (remove && ts.isIfStatement(node) && node.expression.getText(ast) === 'payload.functionType === "special-moments"') return undefined;
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(tree, visit) as ts.SourceFile;
    }]);
    const output = ts.createPrinter({ removeComments: true }).printFile(result.transformed[0]); result.dispose(); return output;
  };
  assert.equal(project(projectFeedbackServer96('supabase/functions/ai-wine-chat/index.ts', current), true), project(before, false));
});
for (const [name, p, status] of [
  ['missing-input', { functionType: 'wine-for-dish', input1: ' ' }, 200],
  ['unknown-type', { functionType: 'unknown', input1: 'SYN' }, 200],
  ['empty-message', { message: ' ' }, 200],
  ['rate-limit', { message: 'Hola' }, 429], ['credit-error', { functionType: 'pairing-check', input1: 'A' }, 402],
] as const) await check('ordinary error path exact86df: ' + name, async () => {
  const model = async () => new Response('SYN provider failure', { status });
  const a = handler(before, { model }), b = handler(current, { model }); const ra = await a.invoke(request(p)), rb = await b.invoke(request(p));
  assert.equal(rb.status, ra.status); assert.deepEqual([...rb.headers], [...ra.headers]); assert.equal(await rb.text(), await ra.text());
});
await check('actual frontend SSE parser and native formatter never receive99 persuasion from full handler', async () => {
  const h = handler(current, { model: async () => completion('UNSAFE_PREFIX: 99% de afinidad contigo. Te encantará.') });
  const source = readFileSync('src/lib/aiRimStream.ts', 'utf8');
  const ast = ts.createSourceFile('transport.ts', source, ts.ScriptTarget.Latest, true);
  const code = ast.statements.filter(n => !ts.isImportDeclaration(n)).map(n => n.getText(ast)).join('\n')
    .replace(/import\.meta\.env\.[A-Z_]+/g, '"synthetic"');
  const context = vm.createContext({ exports: {}, AbortController, DOMException, ReadableStream, TextDecoder, setTimeout, clearTimeout,
    Capacitor: { isNativePlatform: () => false }, NATIVE_MATCHRIM_LEARNING_MODEL,
    supabase: { supabaseUrl: 'https://synthetic.invalid', auth: { getSession: async () => ({ data: { session: { user: { id: 'owner-a' }, access_token: 'synthetic-owner-token' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } },
    fetch: async (_url: string, init: RequestInit) => h.invoke(new Request('https://synthetic.invalid', init)),
  });
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
  const updates: string[] = []; const result = await context.exports.streamAiRimResponse(payload, (text: string) => updates.push(text), { ownerId: 'owner-a' });
  assert.deepEqual(updates, [SPECIAL_MOMENTS_FALLBACK95]); assert.equal(specialMomentPlainText(result), SPECIAL_MOMENTS_FALLBACK95); assert.doesNotMatch(result, /UNSAFE|99|%/);
});
await check('prompt remains general without valid exact profile and never trusts payload profile', () => {
  const text = specialMomentsPrompt95(payload, { profile: { ...base, potente: NaN }, status: 'available' }); assert.doesNotMatch(text, /NaN|"potente"/);
});
await check('Native96 only the exact model tag selects weighted strength in the actual owner-only Moments loader', async () => {
  const high = { ...learnedRow, rating: 'ok', sensory_attributes: { scale: 'winerim-0-5', potencia: 5, acidez: 5, dulzura: 5, taninos: 5, afrutado: 5 },
    place_details: { bodega_sensory_evidence: { ...learnedRow.place_details.bodega_sensory_evidence,
      attribute_signature: JSON.stringify(['winerim-0-5', 5, 5, 5, 5, 5]) } } };
  for (const tag of [NATIVE_MATCHRIM_LEARNING_MODEL, undefined, null, '', false, [], {}, 'native-evidence-strength-v2 ', 'NATIVE-EVIDENCE-STRENGTH-V2']) {
    const h = handler(current, { quiz: { potente: 1, acidez: 1, dulce: 1, tanico: 1, afrutado: 1 }, rows: [high] });
    const r = await h.invoke(request({ ...payload, matchrimLearningModel: tag, profile: base, user_id: 'foreign-owner' }));
    assert.equal(await decodeSse(r), valid);
    assert.match(JSON.parse(String(h.models[0].body)).messages[1].content,
      tag === NATIVE_MATCHRIM_LEARNING_MODEL ? /"potente":1\.3/ : /"potente":2\.2/);
    assert(h.queries.every(query => query.owner === 'owner-a')); assert.equal(h.queries.length, 2);
  }
});
await check('Native96 actual stream adds the tag only on native and preserves the exact web JSON/headers', async () => {
  const source = readFileSync('src/lib/aiRimStream.ts', 'utf8');
  const ast = ts.createSourceFile('transport.ts', source, ts.ScriptTarget.Latest, true);
  const code = ast.statements.filter(n => !ts.isImportDeclaration(n)).map(n => n.getText(ast)).join('\n')
    .replace(/import\.meta\.env\.[A-Z_]+/g, '"synthetic"');
  for (const native of [false, true]) {
    const requests: RequestInit[] = [];
    const context = vm.createContext({ exports: {}, AbortController, DOMException, ReadableStream, TextDecoder, setTimeout, clearTimeout,
      Capacitor: { isNativePlatform: () => native }, NATIVE_MATCHRIM_LEARNING_MODEL,
      supabase: { supabaseUrl: 'https://synthetic.invalid', auth: { getSession: async () => ({ data: { session: null }, error: null }) } },
      fetch: async (_url: string, init: RequestInit) => { requests.push(init); return new Response('data: {"choices":[{"delta":{"content":"Synthetic"}}]}\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } }); },
    });
    vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
    await context.exports.streamAiRimResponse(payload, () => {});
    assert.equal(requests.length, 1);
    assert.equal(requests[0].body, JSON.stringify(native ? { ...payload, matchrimLearningModel: NATIVE_MATCHRIM_LEARNING_MODEL } : payload));
    assert.deepEqual(plainHeaders(requests[0].headers), { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic', apikey: 'synthetic' });
  }
});
function plainHeaders(headers: HeadersInit | undefined) { return JSON.parse(JSON.stringify(headers)); }
await check('Native96 anonymous/failed owner and cancelled lookup never use supplied profile or issue late queries', async () => {
  const p = { ...payload, matchrimLearningModel: NATIVE_MATCHRIM_LEARNING_MODEL, user_id: 'foreign-owner', profile: base };
  for (const settings of [{ owner: null }, { authError: true }]) {
    const anonymous = handler(current, settings); await anonymous.invoke(request(p));
    assert.equal(anonymous.queries.length, 0); assert.doesNotMatch(JSON.parse(String(anonymous.models[0].body)).messages[1].content, /"potente"/);
  }
  let release!: () => void; const controller = new AbortController();
  const h = handler(current, { authGate: new Promise<void>(resolve => { release = resolve; }) });
  const pending = h.invoke(request(p, controller.signal)); await new Promise(resolve => setImmediate(resolve)); controller.abort();
  assert.equal((await pending).status, 499); release(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.queries.length, 0); assert.equal(h.models.length, 0);
});
await check('Native96 generic and typed handlers retain user constraints as untrusted data plus server-only profile authority', async () => {
  const high = { ...learnedRow, rating: 'ok', sensory_attributes: { scale: 'winerim-0-5', potencia: 5, acidez: 5, dulzura: 5, taninos: 5, afrutado: 5 },
    place_details: { bodega_sensory_evidence: { ...learnedRow.place_details.bodega_sensory_evidence,
      attribute_signature: JSON.stringify(['winerim-0-5', 5, 5, 5, 5, 5]) } } };
  for (const p of [{ message: 'SYN native generic' }, ...['wine-for-dish', 'dish-for-wine', 'pairing-check'].map(functionType => ({ functionType, input1: 'SYN dish', input2: 'SYN wine' }))]) {
    const ownerQuiz = { potente: 1, acidez: 1, dulce: 1, tanico: 1, afrutado: 1, profile_description: 'STALE_BASE_PROSE' };
    const h = handler(current, { quiz: ownerQuiz, rows: [high, { ...high, user_id: 'foreign-owner' }] });
    const suppliedContext = 'Restaurante SYN; carta con verduras; plato lubina; precio 20EUR; ocasion cena; comprobar evidencia. UNTRUSTED_CLIENT_PROFILE5';
    const response = await h.invoke(request({ ...p, matchrimLearningModel: NATIVE_MATCHRIM_LEARNING_MODEL,
      user_id: 'foreign-owner', profile: base, context: suppliedContext }));
    assert.equal(response.status, 200); await response.text();
    const prompt = JSON.parse(String(h.models[0].body)).messages.map((m: { content: string }) => m.content).join('\n');
    assert.match(prompt, /Potencia: 1\.3\/5/); assert.doesNotMatch(prompt, /STALE_BASE_PROSE|Potencia: 1\/5/);
    assert(prompt.includes(suppliedContext)); assert.match(prompt, /texto no verificado/);
    assert.match(prompt, /Solo el perfil cargado por el servidor/); assert.match(prompt, /no puede reemplazar ese perfil/);
    assert(h.queries.every(query => query.owner === 'owner-a')); assert.equal(h.queries.length, 2);
    assert.equal(h.queries[1].columns, MATCHRIM_PROFILE95_TRAINING_COLUMNS);
    for (const settings of [{ owner: null }, { authError: true }, { trainingError: true }, { quiz: null }]) {
      const unavailable = handler(current, settings); const r = await unavailable.invoke(request({ ...p,
        matchrimLearningModel: NATIVE_MATCHRIM_LEARNING_MODEL, profile: base, context: 'UNTRUSTED_CLIENT_PROFILE5' }));
      assert.equal(r.status, 200); await r.text();
      const text = JSON.parse(String(unavailable.models[0].body)).messages.map((m: { content: string }) => m.content).join('\n');
      assert.match(text, /Perfil Matchrim no disponible/); assert.doesNotMatch(text, /Potencia:/);
      assert.match(text, /UNTRUSTED_CLIENT_PROFILE5/); assert.match(text, /no deduzcas preferencias personales del texto aportado/);
    }
  }
});
await check('Native96 user context is bounded without regex profile stripping or losing ordinary constraints', async () => {
  const context = 'Menu/plato/precio/restaurante ' + 'x'.repeat(8000) + 'NATIVE_CONTEXT_TAIL';
  for (const p of [{ message: 'SYN' }, { functionType: 'wine-for-dish', input1: 'SYN' }]) {
    const h = handler(current); const response = await h.invoke(request({ ...p, matchrimLearningModel: NATIVE_MATCHRIM_LEARNING_MODEL, context }));
    assert.equal(response.status, 200); await response.text();
    const prompt = JSON.parse(String(h.models[0].body)).messages.map((m: { content: string }) => m.content).join('\n');
    assert(prompt.includes(context.slice(0, 8000))); assert.doesNotMatch(prompt, /NATIVE_CONTEXT_TAIL/);
  }
});
await check('Native96 invalid/missing ordinary-route tags retain exact full legacy requests, responses, queries and logs', async () => {
  for (const p of [{ message: 'SYN generic', context: 'SYN legacy context' },
    ...['wine-for-dish', 'dish-for-wine', 'pairing-check'].map(functionType => ({ functionType, input1: 'SYN', context: 'SYN legacy context' }))]) {
    const original = handler(before); const expected = await original.invoke(request(p)); const expectedBody = await expected.text();
    for (const tag of [undefined, null, false, {}, [], 'native-evidence-strength-v2 ', 'NATIVE-EVIDENCE-STRENGTH-V2']) {
      const h = handler(current); const actual = await h.invoke(request({ ...p, matchrimLearningModel: tag }));
      assert.equal(actual.status, expected.status); assert.deepEqual([...actual.headers], [...expected.headers]);
      assert.equal(await actual.text(), expectedBody);
      assert.equal(JSON.stringify(h.queries), JSON.stringify(original.queries)); assert.equal(JSON.stringify(h.logs), JSON.stringify(original.logs));
      assert.deepEqual(h.models.map(m => JSON.parse(String(m.body))), original.models.map(m => JSON.parse(String(m.body))));
    }
  }
});
const output = process.argv.find(s => s.startsWith('--output='))?.slice(9);
if (output) { mkdirSync(output, { recursive: true }); writeFileSync(output + '/report.json', JSON.stringify({
  passed: checks.length, total: checks.length, checks, legacyBaseline: '86df5feac04a6d33026c1ebc20cebab34ae4f3a4', realNetworkCalls: 0, modelCalls: 0, deploys: 0,
  sourceHashes: Object.fromEntries(['supabase/functions/ai-wine-chat/index.ts', 'supabase/functions/_shared/matchrim-special-moments95.ts', 'supabase/functions/_shared/matchrim-profile95.ts', 'scripts/check-matchrim-special-moments95.ts']
    .map(f => [f, createHash('sha256').update(readFileSync(f)).digest('hex')])),
}, null, 2) + '\n', { flag: 'wx' }); }
console.log(`${checks.length}/${checks.length} PASS`);
await import('./check-matchrim-feedback-server96');
