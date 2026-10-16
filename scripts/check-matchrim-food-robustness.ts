import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as contract from '../supabase/functions/scan-food-pairing/contract';
import * as learning from '../supabase/functions/_shared/matchrim-learning';
import { loadOpenAiTest } from './load-matchrim-openai-test';

const source = readFileSync('supabase/functions/scan-food-pairing/index.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const run = async (response: Response, requestBody: unknown = {
  image: 'data:image/jpeg;base64,local-fixture', mode: 'menu',
}, provider = 'openai') => {
  let handler!: (req: Request) => Promise<Response>;
  let requests = 0;
  const env = { get: (key: string) => {
    if (key === 'openai_matchrim') return provider === 'openai' ? 'local-test-only' : undefined;
    return undefined;
  } };
  const requestBodies: Record<string, unknown>[] = [];
  const fetchFixture = async (_url: unknown, options: RequestInit) => {
    requests += 1;
    requestBodies.push(JSON.parse(String(options.body)));
    return response;
  };
  const loaded = loadOpenAiTest({ env: provider === 'openai' ? { openai_matchrim: 'local-test-only' } : {}, fetch: fetchFixture });
  const dependencies: Record<string, unknown> = {
    'https://deno.land/std@0.168.0/http/server.ts': { serve: (fn: typeof handler) => { handler = fn; } },
    'https://esm.sh/@supabase/supabase-js@2.7.1': { createClient: () => ({}) },
    './contract.ts': contract,
    '../_shared/matchrim-learning.ts': learning,
    '../_shared/matchrim-ai-provider.ts': loaded.provider,
    '../_shared/matchrim-openai.ts': loaded.helper,
  };
  if (source.includes('structured-response.ts')) {
    dependencies['../_shared/structured-response.ts'] = await import('../supabase/functions/_shared/structured-response');
  }
  new Function('require', 'exports', 'Deno', 'fetch', compiled)(
    (id: string) => {
      assert.ok(id in dependencies, `Unexpected dependency: ${id}`);
      return dependencies[id];
    }, {}, { env }, fetchFixture,
  );
  const result = await handler(new Request('https://local.test/scan-food-pairing', {
    method: 'POST', body: JSON.stringify(requestBody),
  }));
  return { status: result.status, body: await result.json(), requests, headers: result.headers, requestBodies };
};

const completion = (content: unknown, finish_reason = 'stop') => new Response(JSON.stringify({
  status: finish_reason === 'stop' ? 'completed' : 'incomplete',
  output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: content }] }],
}));
const valid = { summary: 'Carta', dishes: [{ nombre: 'Gambas', recomendaciones: [] }] };

test('malformed gateway JSON is a typed nonretryable 502, never a 500', async () => {
  const result = await run(new Response('{"choices":['));
  assert.equal(result.status, 502);
  assert.equal(result.body.error, 'invalid_model_response');
  assert.equal(result.body.recoverable, true);
  assert.equal(result.body.retryable, false);
  assert.equal(result.headers.get('sb-error-code'), 'invalid_model_response');
  assert.deepEqual(result.body.dishes, []);
  assert.equal(result.requests, 1);
});

for (const [name, content] of Object.entries({
  malformed: '{"dishes":[}',
  truncated: '{"dishes":[{"nombre":"Gambas"}',
  wrongRoot: '[]',
  wrongCollection: '{"summary":"Carta","dishes":{}}',
  wrongName: '{"summary":"Carta","dishes":[{"nombre":17}]}',
  wrongSummary: '{"summary":17,"dishes":[]}',
  wrongCoverage: '{"dishes":[],"coverage":[]}',
  wrongCount: '{"dishes":[],"coverage":{"estimated_visible_dishes":"17"}}',
  wrongRecommendations: '{"dishes":[{"nombre":"Gambas","recomendaciones":{}}]}',
  wrongGrapes: '{"dishes":[{"nombre":"Gambas","recomendaciones":[{"nombre":"Blanco","uvas":[{}]}]}]}',
  wrongBox: '{"dishes":[{"nombre":"Gambas","source_box":{"x":99,"y":0,"width":20,"height":5}}]}',
  fencedTruncated: '```json\n{"dishes":[\n```',
  wrongContent: { dishes: [] },
  prose: `Result: ${JSON.stringify(valid)}`,
  multipleObjects: `${JSON.stringify(valid)} ${JSON.stringify(valid)}`,
})) {
  test(`${name} cannot become an empty success or repaired data`, async () => {
    const result = await run(completion(content));
    assert.equal(result.status, 502);
    assert.equal(result.body.error, 'invalid_model_response');
    assert.equal(result.body.retryable, false);
    assert.deepEqual(result.body.dishes, []);
    assert.equal(result.requests, 1);
  });
}

test('a whole fenced JSON object is accepted without editing values', async () => {
  const result = await run(completion('```json\n' + JSON.stringify(valid) + '\n```'));
  assert.equal(result.status, 200);
  assert.equal(result.body.dishes[0].nombre, 'Gambas');
  assert.equal(result.requests, 1);
});

test('a length-limited completion is not accepted even if its JSON is valid', async () => {
  const result = await run(completion(JSON.stringify(valid), 'length'));
  assert.equal(result.status, 502);
  assert.equal(result.body.reason, 'incomplete_response');
  assert.equal(result.requests, 1);
});

test('wrong request types fail before a paid request', async () => {
  const result = await run(completion(JSON.stringify(valid)), { image: {}, mode: 'menu' });
  assert.equal(result.status, 422);
  assert.equal(result.body.retryable, false);
  assert.equal(result.requests, 0);
});

const regions = [
  { id: 'left', box: { x: 0, y: 0, width: 50, height: 100 }, estimated_visible_dishes: 2, unreadable_dishes: 0, truncated: false },
  { id: 'right', box: { x: 50, y: 0, width: 50, height: 100 }, estimated_visible_dishes: 3, unreadable_dishes: 0, truncated: false },
];
const fused = {
  nombre: 'Poisson-Poulet braise', source_text: 'Poisson\nPoulet braise',
  recomendaciones: [{ nombre: 'Aggregate wine', match: 99 }],
  source_rows: [
    { nombre: 'Poisson', source_text: 'Poisson', region_id: 'left', source_order: 1,
      source_box: { x: 5, y: 10, width: 40, height: 5 } },
    { nombre: 'Poulet braise', source_text: 'Poulet braise', region_id: 'right', source_order: 1,
      source_box: { x: 55, y: 10, width: 40, height: 5 } },
  ],
};

test('fused two-column rows split only on explicit literal row evidence', () => {
  const result = contract.normalizeFoodScan([fused], { regions }, 'menu');
  assert.deepEqual(result.dishes.map((dish) => dish.nombre), ['Poisson', 'Poulet braise']);
  assert.deepEqual(result.dishes.map((dish) => dish.source_text), ['Poisson', 'Poulet braise']);
  assert.ok(result.dishes.every((dish) => dish.recomendaciones.length === 0 && dish.razon === ''));
  assert.equal(result.coverage.split_rows, 1);
  assert.equal(result.coverage.truncated, true, 'per-column missing rows must remain visible');
});

test('evidence must not invent a shared suffix or omitted rows', () => {
  const result = contract.normalizeFoodScan([{
    ...fused, source_rows: [fused.source_rows[0], {
      nombre: 'Poisson braise', source_text: 'Poulet braise', region_id: 'right', source_order: 1,
      source_box: { x: 55, y: 10, width: 40, height: 5 },
    }],
  }], { regions }, 'menu');
  assert.equal(result.dishes.length, 1);
  assert.equal(result.dishes[0].nombre, fused.nombre);
  assert.equal(result.coverage.truncated, true);
  assert.equal(result.coverage.unresolved_rows, 1);
  assert.deepEqual(result.dishes[0].recomendaciones, []);
});

test('same name in separate columns is not a duplicate', () => {
  const result = contract.normalizeFoodScan([
    { nombre: 'Gambas', source_text: 'Gambas', region_id: 'left', source_order: 1 },
    { nombre: 'Gambas', source_text: 'Gambas', region_id: 'right', source_order: 1 },
  ], { regions }, 'menu');
  assert.equal(result.dishes.length, 2);
  assert.equal(result.coverage.duplicate_rows, 0);
});

test('competing names for the same physical source row stay one literal unresolved row', () => {
  const source_text = 'Brisket or Bacon Brisket -$10';
  const source_box = { x: 5, y: 10, width: 40, height: 5 };
  const result = contract.normalizeFoodScan(['Brisket Sandwich', 'Bacon Brisket Sandwich'].map((nombre, i) => ({
    nombre, source_text, source_box, region_id: 'left', source_order: i + 1,
    recomendaciones: [{ nombre: 'Unjustified pairing' }],
  })), { regions }, 'menu');
  assert.equal(result.dishes.length, 1);
  assert.equal(result.dishes[0].nombre, source_text);
  assert.equal(result.dishes[0].confidence, null);
  assert.deepEqual(result.dishes[0].recomendaciones, []);
  assert.equal(result.coverage.partial, true);
});

test('same literal text at distinct positions must not erase separate menu rows', () => {
  const result = contract.normalizeFoodScan([
    { nombre: 'Gambas', source_text: 'Gambas', source_order: 1, region_id: 'left', source_box: { x: 5, y: 5, width: 40, height: 5 } },
    { nombre: 'Gambas', source_text: 'Gambas', source_order: 2, region_id: 'left', source_box: { x: 5, y: 15, width: 40, height: 5 } },
  ], { regions }, 'menu');
  assert.equal(result.dishes.length, 2);
  assert.equal(result.coverage.duplicate_rows, 0);
});

for (const [name, source_rows] of Object.entries({
  noBoxes: fused.source_rows.map(({ source_box: _box, ...row }) => row),
  crossesRegion: [fused.source_rows[0], { ...fused.source_rows[1], source_box: { x: 45, y: 10, width: 40, height: 5 } }],
  outsideImage: [fused.source_rows[0], { ...fused.source_rows[1], source_box: { x: 99, y: 10, width: 40, height: 5 } }],
  overlapping: [fused.source_rows[0], { ...fused.source_rows[0], nombre: 'Poulet braise', source_text: 'Poulet braise', source_order: 2 }],
  unknownRegion: [fused.source_rows[0], { ...fused.source_rows[1], region_id: 'invented' }],
})) {
  test(`${name} does not authorize a split or cloned pairing`, () => {
    const result = contract.normalizeFoodScan([{ ...fused, source_rows }], { regions }, 'menu');
    assert.equal(result.dishes.length, 1);
    assert.equal(result.dishes[0].nombre, fused.nombre);
    assert.deepEqual(result.dishes[0].recomendaciones, []);
    assert.equal(result.coverage.split_rows, 0);
    assert.equal(result.coverage.unresolved_rows, 1);
  });
}

test('literal multi-part names stay one row, never arbitrary new dishes', () => {
  for (const nombre of ['Atun/ventresca', 'Pasta / tomato / cheese', 'Fish; chips; salad', 'Poisson-Poulet braise']) {
    const result = contract.normalizeFoodScan([{ nombre, recomendaciones: [{ nombre: 'Blanco' }] }], {}, 'menu');
    assert.deepEqual(result.dishes.map((dish) => dish.nombre), [nombre]);
    const looksAggregate = (nombre.match(/[/;]/g)?.length ?? 0) >= 2;
    assert.equal(result.dishes[0].recomendaciones.length, looksAggregate ? 0 : 1,
      'single slash labels retain a hypothesis; unresolved list-like aggregates cannot attribute it');
    assert.equal(result.coverage.split_rows, 0);
    assert.equal(result.coverage.truncated, true, 'missing boundaries cannot imply completeness');
    assert.equal(result.coverage.partial, true);
  }
});

test('only duplicate physical evidence is deduplicated', () => {
  const row = fused.source_rows[0];
  const result = contract.normalizeFoodScan([row, row, { ...row, source_order: 2,
    source_box: { ...row.source_box, y: 20 } }], { regions }, 'menu');
  assert.equal(result.dishes.length, 2);
  assert.equal(result.coverage.duplicate_rows, 1);
});

test('local omission remains partial even if a global count matches', () => {
  const result = contract.normalizeFoodScan([fused], { estimated_visible_dishes: 2, regions }, 'menu');
  assert.equal(result.coverage.returned_dishes, 2);
  assert.equal(result.coverage.truncated, true);
  assert.deepEqual(result.coverage.regions.map((region) => region.returned_dishes), [1, 1]);
  assert.equal(result.coverage.verification, 'model_reported_not_pixel_verified');
});

test('Unicode literal evidence is retained', () => {
  const result = contract.normalizeFoodScan([{ ...fused, nombre: '\u9c7c / \u9e21', source_text: '\u9c7c\n\u9e21', source_rows: [
    { ...fused.source_rows[0], nombre: '\u9c7c', source_text: '\u9c7c' },
    { ...fused.source_rows[1], nombre: '\u9e21', source_text: '\u9e21' },
  ] }], { regions }, 'menu');
  assert.deepEqual(result.dishes.map((dish) => dish.nombre), ['\u9c7c', '\u9e21']);
});

test('OpenAI path never trusts model profile ownership', async () => {
  const result = await run(completion(JSON.stringify({ ...valid, has_profile: true, profile_source: 'auth' })),
    { image: 'data:image/jpeg;base64,local-fixture', mode: 'menu', has_profile: true });
  assert.equal(result.status, 200);
  assert.equal(result.body.ai_provider, 'openai');
  assert.equal(result.body.has_profile, false);
  assert.equal(result.body.profile_source, 'none');
  assert.equal(result.requests, 1);
});

for (const [name, response] of [
  ['malformed envelope', new Response('{"content":[')],
  ['malformed model JSON', completion('{"dishes":[')],
  ['wrong type', completion('{"dishes":{}}')],
] as const) {
  test(`OpenAI ${name} is safe and has no fallback or retry`, async () => {
    const result = await run(response);
    assert.equal(result.status, 502);
    assert.equal(result.body.error, 'invalid_model_response');
    assert.equal(result.body.retryable, false);
    assert.equal(result.requests, 1);
  });
}

test('no provider configuration is a typed no-call block', async () => {
  const result = await run(completion(JSON.stringify(valid)), undefined, 'none');
  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'provider_not_configured');
  assert.equal(result.body.retryable, false);
  assert.equal(result.requests, 0);
});

const scanRegion = { id: 'left', box: { x: 0, y: 0, width: 56, height: 100 },
  tile_count: 2, max_dishes: 30, coordinate_space: 'crop_percent' };
test('tile hint is validated, echoed by the server and caps rows and model output', async () => {
  const content = { ...valid, dishes: Array.from({ length: 31 }, (_, i) => ({ nombre: `Dish ${i}`, recomendaciones: [] })) };
  const result = await run(completion(JSON.stringify(content)), {
    image: 'data:image/jpeg;base64,local-fixture', mode: 'menu', scan_region: scanRegion,
  });
  assert.equal(result.status, 200);
  assert.equal(result.requests, 1);
  assert.equal(result.requestBodies[0].max_output_tokens, 8192);
  assert.equal(result.body.dishes.length, 30);
  assert.deepEqual(result.body.scan_region, scanRegion);
  assert.equal(result.body.coverage.partial, true);
  assert.equal(result.body.coverage.model_counts_reported, false, 'default zero counts are not model evidence');
});

test('invalid tile hint and tile hint on dish mode fail before a paid request', async () => {
  for (const input of [
    { mode: 'menu', scan_region: { ...scanRegion, max_dishes: 60 } },
    { mode: 'menu', scan_region: { ...scanRegion, coordinate_space: 'original_percent' } },
    { mode: 'dish', scan_region: scanRegion },
  ]) {
    const result = await run(completion(JSON.stringify(valid)), { image: 'data:image/jpeg;base64,local-fixture', ...input });
    assert.equal(result.status, 422);
    assert.equal(result.requests, 0);
  }
});
