import assert from 'node:assert/strict';
import { loadOpenAiTest } from './load-matchrim-openai-test';

let checks = 0;
for (const keyName of ['openai_matchrim', 'OPENAI_API_KEY']) {
  for (const status of ['completed', 'incomplete', 'failed', 'cancelled', 'in_progress', undefined]) {
    let calls = 0;
    const loaded = loadOpenAiTest({
      env: { [keyName]: 'synthetic-key-never-sent', MATCHRIM_AI_PROVIDER: 'lovable' },
      fetch: async (url) => {
        calls++;
        assert.equal(url, 'https://api.openai.com/v1/responses');
        return new Response(JSON.stringify({ status, output: [{
          type: 'message', role: 'assistant', status: 'completed',
          content: [{ type: 'output_text', text: '{"regions":[]}' }],
        }] }));
      },
    });
    const run = loaded.provider.runMatchrimAi as (input: unknown) => Promise<{ complete: boolean; provider: string }>;
    const result = await run({ prompt: 'Synthetic contract', maxTokens: 64 });
    assert.equal(result.complete, status === 'completed');
    assert.equal(result.provider, 'openai');
    assert.equal(calls, 1, 'no paid retry or provider fallback');
    checks++;
  }
}
console.log(JSON.stringify({ checks, passed: true, remoteCalls: 0,
  scope: 'Actual OpenAI adapter with stub transport preserves completion status; dedicated/standard key aliases, legacy provider setting cannot route away' }));
