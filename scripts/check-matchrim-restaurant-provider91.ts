import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync('supabase/functions/_shared/matchrim-ai-provider.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
type RunAi = (request: { prompt: string; image?: string; maxTokens: number; allowLovable?: boolean }) => Promise<{ provider: string; model: string; text: string; complete: boolean }>;
let checks = 0;
const input = { prompt: 'Synthetic restaurant contract', maxTokens: 64, allowLovable: false as const };
const adapter = (provider: string | undefined, key: string | undefined, responseStatus = 200) => {
  let calls = 0;
  const exports: { runMatchrimAi?: RunAi } = {};
  new Function('exports', 'Deno', 'fetch', 'console', code)(exports, {
    env: { get: (name: string) => name === 'MATCHRIM_AI_PROVIDER' ? provider
      : name === 'ANTHROPIC_API_KEY' ? key
        : name === 'LOVABLE_API_KEY' ? 'synthetic-lovable-key-never-sent' : undefined },
  }, async (url: string, init: RequestInit) => {
    calls++;
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal((init.headers as Record<string, string>)['x-api-key'], key);
    const body = JSON.parse(init.body as string);
    assert.equal('allowLovable' in body, false);
    return new Response(JSON.stringify(responseStatus === 200
      ? { content: [{ type: 'text', text: '{"rows":[]}' }], stop_reason: 'end_turn' }
      : { error: 'synthetic upstream failure' }), { status: responseStatus });
  }, { error: () => undefined });
  return { run: exports.runMatchrimAi!, calls: () => calls };
};

for (const provider of [undefined, '', 'anthropic', 'lovable', 'invalid-provider']) {
  for (const key of [undefined, '', '   ', 'synthetic-independent-key-never-sent']) {
    const test = adapter(provider, key);
    const permitted = (!provider || provider === 'anthropic') && Boolean(key?.trim());
    if (permitted) {
      const result = await test.run(input);
      assert.equal(result.provider, 'anthropic');
      assert.equal(result.complete, true);
      assert.equal(test.calls(), 1);
    } else {
      await assert.rejects(() => test.run(input), /Lovable AI no esta permitido/);
      assert.equal(test.calls(), 0, 'Forbidden configuration must not make any request');
    }
    checks++;
  }
}
for (const status of [402, 429, 500]) {
  const test = adapter('anthropic', 'synthetic-independent-key-never-sent', status);
  await assert.rejects(() => test.run(input));
  assert.equal(test.calls(), 1, 'No retry or fallback after independent provider failure');
  checks++;
}

const completed = () => ({ status: 'completed', error: null, incomplete_details: null, output: [
  { type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: '{"rows":[]}' }] },
] });
const openAiAdapter = (env: Record<string, string | undefined>, body: unknown = completed(), status = 200) => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const errors: unknown[] = [];
  const exports: { runMatchrimAi?: RunAi } = {};
  new Function('exports', 'Deno', 'fetch', 'console', code)(exports, {
    env: { get: (name: string) => env[name] },
  }, async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }, { error: (...args: unknown[]) => errors.push(args) });
  return { run: exports.runMatchrimAi!, calls, errors };
};
const openAiEnv = {
  MATCHRIM_RESTAURANT91_AI_PROVIDER: 'openai',
  OPENAI_API_KEY: 'synthetic-openai-key-never-sent',
  MATCHRIM_RESTAURANT91_OPENAI_MODEL: 'synthetic-model-not-an-availability-claim',
  ANTHROPIC_API_KEY: 'synthetic-independent-key-never-sent',
  LOVABLE_API_KEY: 'synthetic-lovable-key-never-sent',
};
for (const image of [undefined, 'data:image/jpeg;base64,c3ludGhldGlj', 'data:image/png;base64,c3ludGhldGlj']) {
  const test = openAiAdapter(openAiEnv);
  const result = await test.run({ ...input, image });
  assert.equal(result.provider, 'openai');
  assert.equal(result.model, openAiEnv.MATCHRIM_RESTAURANT91_OPENAI_MODEL);
  assert.equal(result.complete, true);
  assert.equal(result.text, '{"rows":[]}');
  assert.equal(test.calls.length, 1);
  const call = test.calls[0];
  assert.equal(call.url, 'https://api.openai.com/v1/responses');
  assert.equal((call.init.headers as Record<string, string>).Authorization, `Bearer ${openAiEnv.OPENAI_API_KEY}`);
  const body = JSON.parse(call.init.body as string);
  assert.equal(body.store, false);
  assert.equal(body.max_output_tokens, 64);
  assert.equal(body.model, openAiEnv.MATCHRIM_RESTAURANT91_OPENAI_MODEL);
  assert.equal(body.input[0].content[0].text, input.prompt);
  assert.deepEqual(Object.keys(body).sort(), ['input', 'max_output_tokens', 'model', 'store']);
  assert.equal(body.input[0].content.length, image ? 2 : 1);
  if (image) assert.deepEqual(body.input[0].content[1], { type: 'input_image', image_url: image, detail: 'high' });
  checks++;
}
for (const name of ['OPENAI_API_KEY', 'MATCHRIM_RESTAURANT91_OPENAI_MODEL']) {
  for (const value of [undefined, '', '   ']) {
    const test = openAiAdapter({ ...openAiEnv, [name]: value });
    await assert.rejects(() => test.run(input), /Configura OPENAI_API_KEY/);
    assert.equal(test.calls.length, 0, 'Missing OpenAI config never falls back to another paid provider');
    checks++;
  }
}
for (const status of [400, 401, 402, 403, 429, 500, 503]) {
  const test = openAiAdapter(openAiEnv, { error: { message: 'PRIVATE_SOURCE_MUST_NOT_BE_LOGGED' } }, status);
  await assert.rejects(() => test.run(input));
  assert.equal(test.calls.length, 1, 'OpenAI error has no retry or other-provider fallback');
  assert.equal(test.errors.length, 0, 'No upstream body or source text in logs');
  checks++;
}
for (const status of ['incomplete', 'failed', 'cancelled', 'queued', 'in_progress', undefined]) {
  const test = openAiAdapter(openAiEnv, { ...completed(), status });
  assert.equal((await test.run(input)).complete, false, 'Only completed response is usable by Restaurant91');
  checks++;
}
for (const extra of [{ incomplete_details: { reason: 'max_output_tokens' } }, { error: { code: 'server_error' } }]) {
  const test = openAiAdapter(openAiEnv, { ...completed(), ...extra });
  assert.equal((await test.run(input)).complete, false);
  checks++;
}
for (const status of ['in_progress', 'incomplete', undefined]) {
  const body = completed();
  const message = { ...body.output[0], status };
  const test = openAiAdapter(openAiEnv, { ...body, output: [message] });
  assert.equal((await test.run(input)).complete, false);
  checks++;
}
for (const content of [[], [{ type: 'refusal', refusal: 'Cannot analyze' }],
  [{ type: 'output_text', text: '{"rows":[]}' }, { type: 'refusal', refusal: 'Partial refusal' }]]) {
  const body = completed();
  const test = openAiAdapter(openAiEnv, { ...body, output: [{ ...body.output[0], content }] });
  await assert.rejects(() => test.run(input));
  assert.equal(test.calls.length, 1);
  checks++;
}
for (const output of [[], [{ type: 'reasoning', summary: [] }], [{ ...completed().output[0], role: 'user' }]]) {
  const test = openAiAdapter(openAiEnv, { ...completed(), output });
  await assert.rejects(() => test.run(input));
  checks++;
}
for (const type of ['function_call', 'web_search_call', 'unexpected']) {
  const test = openAiAdapter(openAiEnv, { ...completed(), output: [...completed().output, { type }] });
  assert.equal((await test.run(input)).complete, false, 'Unexpected tool output cannot be passed off as a complete reading');
  checks++;
}
{
  const body = completed();
  const test = openAiAdapter(openAiEnv, { ...body, output: [{ type: 'reasoning', summary: [] }, ...body.output] });
  assert.equal((await test.run(input)).complete, true);
  checks++;
}
for (const image of ['https://example.com/private.jpg', 'data:image/heic;base64,c3ludGhldGlj']) {
  const test = openAiAdapter(openAiEnv);
  await assert.rejects(() => test.run({ ...input, image }), /requiere una imagen/);
  assert.equal(test.calls.length, 0);
  checks++;
}
// Restaurant-specific configuration must not redirect existing scanner/affinity callers.
for (const global of [undefined, 'anthropic', 'lovable']) {
  const test = openAiAdapter({ ...openAiEnv, MATCHRIM_AI_PROVIDER: global }, global === 'lovable'
    ? { choices: [{ message: { content: '{}' }, finish_reason: 'stop' }] }
    : { content: [{ type: 'text', text: '{}' }], stop_reason: 'end_turn' });
  const result = await test.run({ ...input, allowLovable: undefined });
  assert.equal(result.provider, global === 'lovable' ? 'lovable' : 'anthropic');
  assert.equal(test.calls.length, 1);
  assert.notEqual(test.calls[0].url, 'https://api.openai.com/v1/responses');
  checks++;
}
console.log(JSON.stringify({ checks, passed: true, remoteCalls: 0, lovableCalls: 0,
  scope: 'Actual adapter with stub transport: isolated optional OpenAI, completion/privacy guards, no Lovable AI or paid retries' }));
