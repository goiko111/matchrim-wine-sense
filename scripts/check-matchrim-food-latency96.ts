import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as contract from '../supabase/functions/scan-food-pairing/contract';
import * as profile from '../supabase/functions/_shared/matchrim-profile95';
import * as structured from '../supabase/functions/_shared/structured-response';
import { parseFoodScanResponse } from '../src/utils/foodScanResponse';
import { loadOpenAiTest } from './load-matchrim-openai-test';

const source = readFileSync('supabase/functions/scan-food-pairing/index.ts', 'utf8');
const styles = [
  { id: 1, nombre: 'Blanco fresco', tipo: 'Blanco', uvas: [], razon: 'Acidez para equilibrar la grasa.' },
  { id: 2, nombre: 'Tinto ligero', tipo: 'Tinto', uvas: [], razon: 'Intensidad moderada para no tapar el plato.' },
];
const fixture = (count: number) => ({ summary: 'Synthetic menu', pairing_styles: structuredClone(styles),
  coverage: { estimated_visible_dishes: count, unreadable_dishes: 0, truncated: false,
    regions: [{ id: 'section', box: { x: 0, y: 0, width: 100, height: 100 },
      estimated_visible_dishes: count, unreadable_dishes: 0, truncated: false }] },
  dishes: Array.from({ length: count }, (_, index) => ({ nombre: `Plato ${index + 1}`,
    categoria: 'principal', source_order: index + 1, region_id: 'section',
    source_box: { x: 2, y: index * 100 / count, width: 90, height: 90 / count },
    source_text: `Plato ${index + 1} 12,50 EUR`, confidence: 81,
    razon: 'Descripcion visible, sin preferencias personales.', pairing_ids: [1, 2] })),
});
const native = profile.NATIVE_MATCHRIM_LEARNING_MODEL;
// Use the production request parser to select native mode, not a test-only flag.
assert.equal(profile.readMatchrimLearningOptions96(native).evidenceStrength, 'native-v2');
let checks = 0, remoteCalls = 0;
const check = (run: () => unknown) => { run(); checks++; };
const outputs: unknown[] = [];

async function execute(value: unknown, options: { native?: boolean; crop?: boolean; mode?: string; error?: Error } = {}) {
  let handler!: (request: Request) => Promise<Response>;
  let calls = 0;
  const requests: Record<string, unknown>[] = [];
  const loaded = loadOpenAiTest({ env: { openai_matchrim: 'SYNTHETIC-NOT-SENT' }, fetch: async (_url, init) => {
    calls++;
    requests.push(JSON.parse(String(init.body)));
    if (options.error) throw options.error;
    return new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', role: 'assistant',
      status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }));
  } });
  const dependencies: Record<string, unknown> = {
    'https://deno.land/std@0.168.0/http/server.ts': { serve: (fn: typeof handler) => { handler = fn; } },
    'https://esm.sh/@supabase/supabase-js@2.7.1': { createClient: () => ({}) },
    './contract.ts': contract, '../_shared/matchrim-profile95.ts': profile,
    '../_shared/structured-response.ts': structured, '../_shared/matchrim-ai-provider.ts': loaded.provider,
    '../_shared/matchrim-openai.ts': loaded.helper,
  };
  new Function('require', 'exports', 'Deno', 'console', 'fetch', ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, {},
  { env: { get: () => undefined } }, { error() {} }, () => { remoteCalls++; throw new Error('NETWORK_FORBIDDEN'); });
  const response = await handler(new Request('https://synthetic.invalid/food', { method: 'POST', body: JSON.stringify({
    image: 'data:image/jpeg;base64,U1lOVEhFVElD', mode: options.mode ?? 'menu',
    ...(options.native === false ? {} : { matchrimLearningModel: native }),
    ...(options.crop ? { scan_region: { id: 'top', box: { x: 0, y: 0, width: 100, height: 56 },
      tile_count: 2, max_dishes: 30, coordinate_space: 'crop_percent' } } : {}),
  }) }));
  assert.equal(calls, 1, 'one stub call; never automatic retries or provider fallback');
  return { status: response.status, body: await response.json(), requests };
}

for (const count of [1, 15, 30, 60]) {
  const input = fixture(count), snapshot = JSON.stringify(input);
  const expanded = contract.expandFoodPairingStyles(input)!;
  check(() => {
    assert.ok(contract.isFoodScanPayload(expanded));
    assert.equal(JSON.stringify(input), snapshot, 'wire input immutable');
    assert.equal(expanded.dishes.length, count);
    assert.ok(!('pairing_styles' in expanded));
  });
  const result = await execute(input, { crop: count === 30 });
  check(() => {
    assert.equal(result.status, 200);
    assert.equal(result.body.dishes.length, count);
    assert.ok(result.body.dishes.every((dish: Record<string, unknown>) => dish.match === null));
    const expected = contract.normalizeFoodScan(expanded.dishes, expanded.coverage, 'menu');
    assert.deepEqual(result.body.dishes, expected.dishes);
    assert.deepEqual(result.body.coverage, expected.coverage);
    assert.equal(parseFoodScanResponse(result.body).dishes.length, count);
    assert.ok(JSON.stringify(result.requests).includes('pairing_styles'));
    assert.equal(result.requests[0].max_output_tokens, count === 30 ? 8192 : 16384);
  });
  outputs.push({ rows: count, compactBytes: snapshot.length, expandedBytes: JSON.stringify(expanded).length });
}

for (const mutate of [
  (value: ReturnType<typeof fixture>) => { value.dishes[0].pairing_ids = [99]; },
  (value: ReturnType<typeof fixture>) => { value.dishes[0].pairing_ids = [1, 1]; },
  (value: ReturnType<typeof fixture>) => { value.dishes[0].pairing_ids = [1, 2, 1]; },
  (value: ReturnType<typeof fixture>) => { value.pairing_styles.push({ ...styles[0] }); },
  (value: ReturnType<typeof fixture>) => { value.pairing_styles[0].id = 0; },
  (value: ReturnType<typeof fixture>) => { value.pairing_styles[0].id = 1.5; },
  (value: ReturnType<typeof fixture>) => { Object.assign(value.dishes[0], { recomendaciones: [] }); },
  (value: ReturnType<typeof fixture>) => { Object.assign(value, { pairing_styles: null }); },
]) {
  const input = fixture(1); mutate(input);
  check(() => assert.equal(contract.expandFoodPairingStyles(input), null));
  const result = await execute(input);
  check(() => { assert.equal(result.status, 502); assert.equal(result.body.error, 'invalid_model_response');
    assert.deepEqual(result.body.dishes, []); });
}
const abstain = fixture(1); abstain.pairing_styles = []; abstain.dishes[0].pairing_ids = [];
check(() => assert.deepEqual((contract.expandFoodPairingStyles(abstain)!.dishes as Record<string, unknown>[])[0].recomendaciones, []));
const legacy = contract.expandFoodPairingStyles(fixture(1))!;
for (const mode of ['menu', 'dish']) {
  const result = await execute(legacy, { native: false, mode });
  check(() => { assert.equal(result.status, 200); assert.ok(!JSON.stringify(result.requests).includes('pairing_styles')); });
}
for (const isNative of [true, false]) {
  const result = await execute(null, { native: isNative, error: new DOMException('synthetic deadline', 'TimeoutError') });
  check(() => { assert.equal(result.status, isNative ? 504 : 502);
    assert.equal(result.body.error, isNative ? 'provider_timeout' : 'provider_unavailable');
    assert.equal(result.body.retryable, false); assert.deepEqual(result.body.dishes, []); });
}
check(() => assert.equal(remoteCalls, 0));
console.log(JSON.stringify({ passed: true, checks, remoteCalls, outputs,
  scope: 'Synthetic actual-handler/adapter contract; size is bytes, NOT measured live latency or recognition accuracy.' }));
