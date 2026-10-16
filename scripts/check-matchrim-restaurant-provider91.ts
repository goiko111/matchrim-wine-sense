import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync('supabase/functions/_shared/matchrim-ai-provider.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
type RunAi = (request: { prompt: string; maxTokens: number; allowLovable: false }) => Promise<{ provider: string; complete: boolean }>;
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
console.log(JSON.stringify({ checks, passed: true, remoteCalls: 0, lovableCalls: 0,
  scope: 'Actual adapter with stub transport: Restaurant91 disallows Lovable AI and paid retries' }));
