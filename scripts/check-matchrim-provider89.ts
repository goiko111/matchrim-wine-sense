import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync('supabase/functions/_shared/matchrim-ai-provider.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
let checks = 0;
for (const provider of ['anthropic', 'lovable']) {
  for (const reason of ['end_turn', 'stop', 'max_tokens', 'length', 'tool_use', undefined]) {
    let calls = 0;
    const exports: { runMatchrimAi?: (body: unknown) => Promise<{ complete: boolean }> } = {};
    new Function('exports', 'Deno', 'fetch', code)(exports, {
      env: { get: (key: string) => key === 'MATCHRIM_AI_PROVIDER' ? provider
        : key.endsWith('_API_KEY') ? 'synthetic-key-never-sent' : undefined },
    }, async () => {
      calls++;
      return new Response(JSON.stringify(provider === 'anthropic'
        ? { content: [{ type: 'text', text: '{"regions":[]}' }], stop_reason: reason }
        : { choices: [{ message: { content: '{"regions":[]}' }, finish_reason: reason }] }));
    });
    const result = await exports.runMatchrimAi!({ prompt: 'Synthetic contract', maxTokens: 64 });
    assert.equal(result.complete, reason === (provider === 'anthropic' ? 'end_turn' : 'stop'));
    assert.equal(calls, 1, 'no paid retry or provider fallback');
    checks++;
  }
}
console.log(JSON.stringify({ checks, passed: true, remoteCalls: 0, scope: 'Actual provider adapter with stub transport preserves completion reason' }));
