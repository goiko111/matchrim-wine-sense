import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { openAi92LegacyHandlers } from './matchrim-openai92-scope';

const baseline = '0ae0c98';
const reviewedClientSensory = 'f66edd6';
const providerMigration = 'b27011b';
const printer = ts.createPrinter({ removeComments: true });
const parse = (file: string, text: string) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
const print = (node: ts.Node, source: ts.SourceFile) => printer.printNode(ts.EmitHint.Unspecified, node, source);
const callBodies = (source: ts.SourceFile, legacy: boolean) => {
  const bodies: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && (legacy
      ? ts.isIdentifier(node.expression) && node.expression.text === 'fetch'
        && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text.includes('ai.gateway.lovable.dev')
      : ts.isIdentifier(node.expression) && node.expression.text === 'fetchMatchrimAiChat')) {
      const init = node.arguments[legacy ? 1 : 0];
      assert.ok(init && ts.isObjectLiteralExpression(init), 'Known object init only');
      const body = init.properties.find(property => ts.isPropertyAssignment(property)
        && property.name.getText(source).replace(/['"]/g, '') === 'body');
      assert.ok(body && ts.isPropertyAssignment(body));
      bodies.push(print(body.initializer, source));
      const headers = init.properties.find(property => ts.isPropertyAssignment(property)
        && property.name.getText(source).replace(/['"]/g, '') === 'headers');
      if (!legacy && headers) assert.doesNotMatch(print(headers, source), /Authorization|LOVABLE_API_KEY|ANTHROPIC_API_KEY/);
    }
    ts.forEachChild(node, visit);
  };
  visit(source); return bodies;
};
const databaseCalls = (source: ts.SourceFile) => {
  const calls: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && ['from', 'getUser', 'select', 'or', 'eq', 'limit', 'update', 'delete'].includes(node.expression.name.text)) {
      calls.push(print(node, source));
    }
    ts.forEachChild(node, visit);
  };
  visit(source); return calls;
};
let calls = 0;
for (const name of openAi92LegacyHandlers) {
  const file = `supabase/functions/${name}/index.ts`;
  const before = parse(file, execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' }));
  const afterText = readFileSync(file, 'utf8');
  const after = parse(file, afterText);
  const oldBodies = callBodies(before, true);
  const newBodies = callBodies(after, false);
  assert.deepEqual(newBodies, oldBodies, `${name}: every prompt, token limit and model-tier hint preserved`);
  assert.deepEqual(databaseCalls(after), databaseCalls(before), `${name}: auth/catalog query semantics retained`);
  assert.doesNotMatch(afterText, /Deno\.env\.get\(["'](?:LOVABLE_API_KEY|ANTHROPIC_API_KEY)["']\)|ai\.gateway\.lovable\.dev/);
  calls += newBodies.length;
}
const list = (folder: string): string[] => readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
  const name = path.join(folder, entry.name);
  return entry.isDirectory() ? list(name) : /\.tsx?$/.test(name) ? [name] : [];
});
for (const file of list('src')) {
  assert.doesNotMatch(readFileSync(file, 'utf8'), /openai_matchrim|OPENAI_API_KEY|api\.openai\.com/, 'No provider key or direct provider calls in client: ' + file);
}
for (const file of list('supabase/functions')) {
  assert.doesNotMatch(readFileSync(file, 'utf8'), /api\.anthropic\.com|ai\.gateway\.lovable\.dev/,
    'No remaining alternate-provider endpoint: ' + file);
}
for (const file of ['src/utils/matchrimLearning.ts', 'src/utils/wineAffinityExplanation.ts',
  'supabase/functions/_shared/matchrim-learning.ts', 'supabase/functions/_shared/matchrim-affinity.ts']) {
  const historical = execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' });
  assert.equal(execFileSync('git', ['show', `${providerMigration}:${file}`], { encoding: 'utf8' }), historical,
    'The provider migration itself did not alter taste scoring/learning: ' + file);
  assert.equal(readFileSync(file, 'utf8'), file.startsWith('src/')
    ? execFileSync('git', ['show', `${reviewedClientSensory}:${file}`], { encoding: 'utf8' }) : historical,
  'Only the separately reviewed explicit-scale client change is accepted; hosted scoring stays frozen: ' + file);
}
console.log(JSON.stringify({ passed: true, handlers: openAi92LegacyHandlers.length, legacyCallsites: calls,
  remoteCalls: 0, scope: 'AST request/prompt/auth/query preservation and complete local provider/client boundary audit; not deployed routing proof' }));
