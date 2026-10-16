import { readFileSync } from 'node:fs';
import ts from 'typescript';

export const loadOpenAiTest = (options: {
  env?: Record<string, string | undefined>;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
}) => {
  const envReads: string[] = [];
  const logs: unknown[] = [];
  const env = { get: (key: string) => { envReads.push(key); return options.env?.[key]; } };
  const compile = (file: string) => ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const helper: Record<string, unknown> = {};
  const provider: Record<string, unknown> = {};
  const consoleStub = { error: (...args: unknown[]) => logs.push(args), warn: (...args: unknown[]) => logs.push(args) };
  new Function('exports', 'Deno', 'fetch', 'console', compile('supabase/functions/_shared/matchrim-openai.ts'))(
    helper, { env }, options.fetch, consoleStub,
  );
  new Function('exports', 'require', 'Deno', 'fetch', 'console', compile('supabase/functions/_shared/matchrim-ai-provider.ts'))(
    provider, (id: string) => {
      if (id !== './matchrim-openai.ts') throw new Error('Unexpected provider dependency: ' + id);
      return helper;
    }, { env }, options.fetch, consoleStub,
  );
  return { helper, provider, envReads, logs };
};
