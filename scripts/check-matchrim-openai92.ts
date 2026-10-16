import assert from 'node:assert/strict';
import { loadOpenAiTest } from './load-matchrim-openai-test';

let checks = 0;
const chatReply = (content: unknown = '{"rows":[]}', finish_reason = 'stop') => ({ choices: [{ message: { content }, finish_reason }] });
const responseReply = () => ({ status: 'completed', error: null, incomplete_details: null,
  output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: '{"rows":[]}' }] }] });
const testAdapter = (env: Record<string, string | undefined> = { openai_matchrim: 'synthetic-matchrim-key' },
  response: unknown = chatReply(), status = 200, headers: Record<string, string> = { 'Content-Type': 'application/json' }) => {
  const calls: Array<{ url: string; init: RequestInit; body: Record<string, unknown> }> = [];
  const loaded = loadOpenAiTest({ env, fetch: async (url, init) => {
    calls.push({ url, init, body: JSON.parse(String(init.body)) });
    return new Response(typeof response === 'string' ? response : JSON.stringify(response), { status, headers });
  } });
  return { ...loaded, calls,
    chat: loaded.helper.fetchMatchrimAiChat as (init: RequestInit) => Promise<Response>,
    run: loaded.provider.runMatchrimAi as (input: { prompt: string; image?: string; maxTokens: number; allowLovable?: boolean; signal?: AbortSignal }) => Promise<{ text: string; model: string; provider: string; complete: boolean }>,
  };
};
const request = (patch: Record<string, unknown> = {}): RequestInit => ({ method: 'POST',
  headers: { Authorization: 'Bearer obsolete-caller-header-never-sent' },
  body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: 'Synthetic QA' }], ...patch }) });

for (const name of ['openai_matchrim', 'OPENAI_API_KEY']) {
  for (const value of [undefined, '', '   ', 'synthetic-key']) {
    const test = testAdapter({ [name]: value, ANTHROPIC_API_KEY: 'forbidden-key', LOVABLE_API_KEY: 'forbidden-key' });
    const result = await test.chat(request());
    assert.equal(result.status, value?.trim() ? 200 : 503);
    assert.equal(test.calls.length, value?.trim() ? 1 : 0);
    assert.equal(test.envReads.some(key => /ANTHROPIC|LOVABLE/.test(key)), false);
    checks++;
  }
}
{
  const test = testAdapter({ openai_matchrim: '  matchrim-only  ', OPENAI_API_KEY: 'wrong-account-key',
    MATCHRIM_AI_PROVIDER: 'anthropic', LOVABLE_API_KEY: 'forbidden-key' });
  await test.chat(request());
  assert.equal(new Headers(test.calls[0].init.headers).get('authorization'), 'Bearer matchrim-only');
  assert.equal(test.calls[0].url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(test.envReads.includes('OPENAI_API_KEY'), false, 'Dedicated user-specified key wins');
  assert.equal(test.calls[0].body.store, false);
  checks++;
}
for (const [legacy, model, effort] of [
  ['google/gemini-2.5-flash', 'gpt-6-luna', 'none'], ['google/gemini-2.5-pro', 'gpt-6-astra', 'low'],
] as const) {
  const test = testAdapter();
  await test.chat(request({ model: legacy, max_tokens: 8192, temperature: 0.3, top_p: 0.5, logprobs: true }));
  const body = test.calls[0].body;
  assert.equal(body.model, model); assert.equal(body.reasoning_effort, effort);
  assert.equal(body.max_completion_tokens, 8192); assert.equal('max_tokens' in body, false);
  assert.equal('temperature' in body, effort === 'none');
  assert.equal('top_p' in body || 'logprobs' in body, false);
  checks++;
}
for (const max_tokens of [0, -1, 1.5, '100', null, 32769]) {
  const test = testAdapter();
  const result = await test.chat(request({ max_tokens }));
  assert.equal(result.status, max_tokens === null ? 200 : 400);
  assert.equal(test.calls.length, max_tokens === null ? 1 : 0);
  checks++;
}
for (const url of ['data:image/jpeg;base64,c3ludGhldGlj', 'data:image/png;base64,c3ludGhldGlj', 'data:application/pdf;base64,c3ludGhldGlj']) {
  const test = testAdapter();
  const result = await test.chat(request({ messages: [{ role: 'user', content: [{ type: 'text', text: 'Read' }, { type: 'image_url', image_url: { url } }] }] }));
  assert.equal(result.status, 200);
  assert.equal(test.calls[0].body.model, 'gpt-6-astra', 'Photo/PDF reading uses the explicit vision tier');
  const messages = test.calls[0].body.messages as Array<{ content: unknown[] }>;
  assert.deepEqual(messages[0].content[1], url.includes('application/pdf')
    ? { type: 'file', file: { filename: 'carta.pdf', file_data: url } }
    : { type: 'image_url', image_url: { url, detail: 'high' } });
  checks++;
}
for (const patch of [{ messages: [] }, { messages: null }, { messages: [{ role: 'tool', content: 'x' }] },
  { messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'http://127.0.0.1/private.png' } }] }] },
  { tools: [{ type: 'web_search' }] }, { functions: [] }, { modalities: ['image', 'text'] }]) {
  const test = testAdapter();
  assert.equal((await test.chat(request(patch))).status, 400);
  assert.equal(test.calls.length, 0);
  checks++;
}
for (const status of [400, 401, 402, 403, 404, 429, 500, 503]) {
  const test = testAdapter(undefined, { error: { message: 'PRIVATE_SOURCE' } }, status);
  const result = await test.chat(request());
  assert.equal(result.status, status); assert.doesNotMatch(await result.text(), /PRIVATE_SOURCE/);
  assert.equal(test.calls.length, 1, 'No provider retry or fallback'); assert.equal(test.logs.length, 0);
  checks++;
}
for (const reply of [null, {}, { choices: [] }, chatReply('', 'stop'), chatReply('valid', 'length'),
  chatReply('valid', 'content_filter'), chatReply({}, 'stop'), { choices: [{ message: { content: 'x', refusal: 'No' }, finish_reason: 'stop' }] }]) {
  const test = testAdapter(undefined, reply);
  assert.equal((await test.chat(request())).status, 502); assert.equal(test.calls.length, 1);
  checks++;
}
{
  const sse = 'data: {"choices":[{"delta":{"content":"Synthetic"},"finish_reason":null}]}\n\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n';
  const test = testAdapter(undefined, sse, 200, { 'Content-Type': 'text/event-stream' });
  const result = await test.chat(request({ stream: true, model: 'google/gemini-2.5-pro' }));
  assert.equal(await result.text(), sse); assert.equal(test.calls[0].body.stream, true);
  checks++;
}
{
  const test = testAdapter();
  assert.equal((await test.chat(request({ stream: true }))).status, 502);
  checks++;
}
for (const image of [undefined, 'data:image/jpeg;base64,c3ludGhldGlj']) {
  const test = testAdapter(undefined, responseReply());
  const result = await test.run({ prompt: 'Synthetic', image, maxTokens: 512, allowLovable: true });
  assert.equal(result.provider, 'openai'); assert.equal(result.complete, true);
  assert.equal(result.model, image ? 'gpt-6-astra' : 'gpt-6-luna');
  assert.equal(test.calls[0].url, 'https://api.openai.com/v1/responses');
  assert.equal(test.calls[0].body.store, false);
  checks++;
}
for (const status of ['incomplete', 'failed', 'cancelled', 'in_progress', 'queued', undefined]) {
  const test = testAdapter(undefined, { ...responseReply(), status });
  assert.equal((await test.run({ prompt: 'Synthetic', maxTokens: 8192 })).complete, false);
  checks++;
}
for (const output of [[], [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'refusal', refusal: 'No' }] }]]) {
  const test = testAdapter(undefined, { ...responseReply(), output });
  await assert.rejects(() => test.run({ prompt: 'Synthetic', maxTokens: 8192 }));
  checks++;
}
for (const env of [{ LOVABLE_API_KEY: 'forbidden' }, { ANTHROPIC_API_KEY: 'forbidden' }, {}]) {
  const test = testAdapter(env);
  await assert.rejects(() => test.run({ prompt: 'Synthetic', maxTokens: 8192 }));
  assert.equal(test.calls.length, 0);
  checks++;
}
{
  const test = testAdapter();
  const signal = AbortSignal.abort(new Error('cancelled-by-QA'));
  await assert.rejects(() => test.chat({ ...request(), signal }), /cancelled-by-QA/);
  await assert.rejects(() => test.run({ prompt: 'Synthetic', maxTokens: 8192, signal }), /cancelled-by-QA/);
  assert.equal(test.calls.length, 0);
  checks++;
}
console.log(JSON.stringify({ checks, passed: true, remoteCalls: 0, scope: 'Actual global OpenAI-only adapters, synthetic transport: dedicated-key precedence, tiers, images/PDF, SSE, completion/errors, no fallback or raw provider logging' }));
