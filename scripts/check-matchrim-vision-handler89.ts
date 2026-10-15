import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as structured from '../supabase/functions/_shared/structured-response';
import * as values from '../supabase/functions/_shared/matchrim-scan-values';
import * as grounding from '../supabase/functions/analyze-wine-region/grounding';
import * as menuGrounding from '../supabase/functions/_shared/matchrim-menu-grounding';
import * as money from '../supabase/functions/_shared/matchrim-scan-money';
import * as learning from '../supabase/functions/_shared/matchrim-learning';
import { EdgeFunctionError, invokeWithEdgeFunctionRetry } from '../src/utils/edgeFunctionResilience';

let count = 0;
for (const name of ['detect-wine-regions', 'analyze-wine-region', 'scan-wine-menu']) {
  let handler!: (req: Request) => Promise<Response>;
  let output: unknown = '';
  let complete = true;
  let aiCalls = 0;
  const compiled = ts.transpileModule(readFileSync(`supabase/functions/${name}/index.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const requireStub = (id: string) => {
    if (id.includes('/http/server')) return { serve: (fn: typeof handler) => { handler = fn; } };
    if (id.includes('matchrim-ai-provider')) return { runMatchrimAi: async () => { aiCalls++; return { text: output, provider: 'stub', model: 'offline-contract', complete }; } };
    if (id.includes('structured-response')) return structured;
    if (id.includes('matchrim-scan-values')) return values;
    if (id.includes('matchrim-scan-money')) return money;
    if (id.includes('matchrim-learning')) return learning;
    if (id.includes('matchrim-menu-grounding')) return menuGrounding;
    if (id.includes('supabase-js')) return { createClient: () => ({}) };
    if (id.includes('grounding')) return grounding;
    throw Error('Unexpected handler dependency: ' + id);
  };
  new Function('require', 'exports', 'console', 'Deno', compiled)(requireStub, {}, { error: () => {}, log: () => {} }, { env: { get: () => undefined } });
  const request = (body: unknown) => new Request('http://127.0.0.1/' + name, { method: 'POST', body: JSON.stringify(body) });
  for (const invalid of [null, {}, [], { image: 12 }, { image: 'not-an-image' }]) {
    assert.equal((await handler(request(invalid))).status, 422);
    count++;
  }
  assert.equal(aiCalls, 0);
  for (const raw of ['', '{', '{} trailing', '{} {}', 'prefix {} suffix', 'null', '[]', '{"regions":null}', '{"candidates":null}']) {
    output = raw;
    const response = await handler(request({ image: 'data:image/jpeg;base64,synthetic' }));
    assert.equal(response.status, 502, raw);
    assert.equal(response.headers.get('sb-error-code'), 'invalid_model_response');
    const payload = await response.json();
    assert.equal(payload.retryable, false);
    assert.equal(payload.recoverable, true);
    assert.deepEqual(payload[name === 'detect-wine-regions' ? 'regions' : name === 'scan-wine-menu' ? 'vinos' : 'candidates'], []);
    count++;
  }
  output = JSON.stringify(name === 'detect-wine-regions' ? { regions: [] } : name === 'scan-wine-menu' ? { vinos: [] } : { candidates: [], visible_text: [] });
  assert.equal((await handler(request({ image: 'data:image/jpeg;base64,synthetic' }))).status, 200);
  count++;
  complete = false;
  const truncated = await handler(request({ image: 'data:image/jpeg;base64,synthetic' }));
  assert.equal(truncated.status, 502);
  assert.equal((await truncated.json()).reason, 'incomplete_response');
  complete = true;
  count++;
  if (name === 'scan-wine-menu') {
    for (const vinos of [[null], [17], [{ nombre: 17 }], [{ nombre: ' ' }], Array.from({ length: 31 }, () => ({ nombre: 'Manzanilla La Gitana' }))]) {
      output = JSON.stringify({ vinos });
      assert.equal((await handler(request({ image: 'data:image/jpeg;base64,synthetic' }))).status, 502);
      count++;
    }
    output = JSON.stringify({ vinos: [{ nombre: 'Manzanilla La Gitana', texto_fuente: 'Manzanilla La Gitana', posicion: { x: null, y: 40, confidence: 0.99 } }], coverage: { estimated_visible_wines: null } });
    const result = await (await handler(request({ image: 'data:image/jpeg;base64,synthetic' }))).json();
    assert.equal(result.vinos.length, 1);
    assert.equal(result.vinos[0].posicion, null);
    assert.equal(result.coverage.estimated_visible_wines, null);
    count += 3;
  }
  if (name === 'detect-wine-regions') {
    output = JSON.stringify({ regions: [
      { box: { x: -5, y: -3, width: 10, height: 8 } },
      { box: { x: null, y: 10, width: 5, height: 5 } },
      { box: { x: false, y: 10, width: 5, height: 5 } },
      { box: { x: 150, y: 10, width: 10, height: 10 } },
    ] });
    const payload = await (await handler(request({ image: 'data:image/jpeg;base64,synthetic' }))).json();
    assert.equal(payload.regions.length, 1);
    assert.deepEqual(payload.regions[0].box, { x: 0, y: 0, width: 5, height: 5 });
    count++;
  }
}
let attempts = 0;
const signal = new AbortController().signal;
await assert.rejects(invokeWithEdgeFunctionRetry(async () => {
  attempts++;
  throw new EdgeFunctionError('Invalid structured output', { status: 502, errorCode: 'invalid_model_response', retryAfterMs: null });
}, signal));
assert.equal(attempts, 1, 'A malformed model response is not automatically paid for again');
console.log(JSON.stringify({ checks: count + 1, passed: true, scope: 'Actual three Edge handlers with stubbed provider, clipped boxes, bounded menu schema and no-auto-retry transport. Zero remote/model calls; not recognition precision.' }));
