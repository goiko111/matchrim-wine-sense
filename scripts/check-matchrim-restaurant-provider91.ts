import assert from 'node:assert/strict';
import { loadOpenAiTest } from './load-matchrim-openai-test';

type RunAi = (request: { prompt: string; image?: string; maxTokens: number; allowLovable?: boolean }) => Promise<{ provider: string; model: string; text: string; complete: boolean }>;
let checks = 0;
const input = { prompt: 'Synthetic restaurant contract', maxTokens: 8192, allowLovable: false };
const completed = () => ({ status: 'completed', error: null, incomplete_details: null, output: [
  { type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: '{"rows":[]}' }] },
] });
const adapter = (env: Record<string, string | undefined>, body: unknown = completed(), status = 200) => {
  let calls = 0;
  const loaded = loadOpenAiTest({ env, fetch: async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(JSON.parse(String(init.body)).store, false);
    return new Response(JSON.stringify(body), { status });
  } });
  return { run: loaded.provider.runMatchrimAi as RunAi, calls: () => calls, logs: loaded.logs };
};
for (const provider of [undefined, '', 'anthropic', 'lovable', 'invalid-provider']) {
  for (const key of [undefined, '', '   ', 'synthetic-old-provider-key']) {
    const test = adapter({ MATCHRIM_AI_PROVIDER: provider, ANTHROPIC_API_KEY: key, LOVABLE_API_KEY: 'forbidden' });
    await assert.rejects(() => test.run(input), /openai_matchrim/);
    assert.equal(test.calls(), 0, 'Legacy key/config can never select another provider');
    checks++;
  }
}
const key = { openai_matchrim: 'synthetic-matchrim-key' };
for (const provider of [undefined, 'anthropic', 'lovable', 'openai', 'invalid-provider']) {
  const test = adapter({ ...key, MATCHRIM_AI_PROVIDER: provider });
  const result = await test.run(input);
  assert.equal(result.provider, 'openai'); assert.equal(result.complete, true);
  assert.equal(test.calls(), 1);
  checks++;
}
for (const status of [400, 401, 402, 403, 429, 500, 503]) {
  const test = adapter(key, { error: { message: 'PRIVATE_SOURCE_NOT_FOR_LOGS' } }, status);
  await assert.rejects(() => test.run(input));
  assert.equal(test.calls(), 1); assert.equal(test.logs.length, 0);
  checks++;
}
for (const status of ['incomplete', 'failed', 'cancelled', 'queued', 'in_progress', undefined]) {
  const test = adapter(key, { ...completed(), status });
  assert.equal((await test.run(input)).complete, false);
  checks++;
}
for (const extra of [{ incomplete_details: { reason: 'max_output_tokens' } }, { error: { code: 'server_error' } }]) {
  const test = adapter(key, { ...completed(), ...extra });
  assert.equal((await test.run(input)).complete, false);
  checks++;
}
for (const status of ['in_progress', 'incomplete', undefined]) {
  const body = completed();
  const test = adapter(key, { ...body, output: [{ ...body.output[0], status }] });
  assert.equal((await test.run(input)).complete, false);
  checks++;
}
for (const content of [[], [{ type: 'refusal', refusal: 'Cannot analyze' }],
  [{ type: 'output_text', text: '{"rows":[]}' }, { type: 'refusal', refusal: 'Partial refusal' }]]) {
  const body = completed();
  const test = adapter(key, { ...body, output: [{ ...body.output[0], content }] });
  await assert.rejects(() => test.run(input)); assert.equal(test.calls(), 1);
  checks++;
}
for (const output of [[], [{ type: 'reasoning', summary: [] }], [{ ...completed().output[0], role: 'user' }]]) {
  const test = adapter(key, { ...completed(), output });
  await assert.rejects(() => test.run(input));
  checks++;
}
for (const type of ['function_call', 'web_search_call', 'unexpected']) {
  const test = adapter(key, { ...completed(), output: [...completed().output, { type }] });
  assert.equal((await test.run(input)).complete, false);
  checks++;
}
{
  const test = adapter(key, { ...completed(), output: [{ type: 'reasoning', summary: [] }, ...completed().output] });
  assert.equal((await test.run(input)).complete, true); checks++;
}
for (const image of ['https://example.com/private.jpg', 'data:image/heic;base64,c3ludGhldGlj']) {
  const test = adapter(key);
  await assert.rejects(() => test.run({ ...input, image }), /requiere una imagen/);
  assert.equal(test.calls(), 0); checks++;
}
console.log(JSON.stringify({ checks, passed: true, remoteCalls: 0, lovableCalls: 0,
  scope: 'Restaurant91 actual OpenAI-only adapter with stub transport: old provider keys/config cannot route away, completion/privacy guards, no paid retries' }));
