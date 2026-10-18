import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { openAi92LegacyHandlers } from './matchrim-openai92-scope';
import { projectFeedbackServer96 } from './matchrim-feedback-server96-scope';

const baseline = '0ae0c98';
const reviewedClientSensory = 'f66edd6';
const providerMigration = 'b27011b';
const reviewedSpecialBaseline95 = '86df5feac04a6d33026c1ebc20cebab34ae4f3a4';
const reviewedSpecialSources95 = {
  'supabase/functions/ai-wine-chat/index.ts': '9cfc34dc222e9d0d19fc9f1edd852c580b1aadc71b8db9cc3337d6f38c7accbd',
  'supabase/functions/_shared/matchrim-special-moments95.ts': 'bbda4f7971782fd4d1f3ce337841f709b2e20ffcba3e975d63999a45c75d82bc',
  'supabase/functions/_shared/matchrim-profile95.ts': 'cb4d874ae2567fa4cef9aa6f4915cc887db90d4b75a25ee4a93d3f1b386d67b4',
};
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
// The only new DB scope is the separately reviewed special-moments loader.
// Pin the complete reviewed sources, then prove every remaining legacy node.
const projectSpecial95 = (source: ts.SourceFile, removeSpecial: boolean) => {
  let loaders = 0, branches = 0;
  const transformed = ts.transform(source, [context => root => {
    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
      if (ts.isImportDeclaration(node)) return undefined;
      if (removeSpecial && ts.isVariableStatement(node)
        && node.declarationList.declarations.some(d => d.name.getText(source) === 'loadSpecialMomentProfile95')) {
        loaders++; return undefined;
      }
      if (removeSpecial && ts.isIfStatement(node)
        && node.expression.getText(source) === 'payload.functionType === "special-moments"') {
        branches++; return undefined;
      }
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  const output = printer.printFile(transformed.transformed[0]); transformed.dispose();
  if (removeSpecial) { assert.equal(loaders, 1, 'Exactly one reviewed loader'); assert.equal(branches, 1, 'Exactly one special-only early branch'); }
  return parse(source.fileName, output);
};
const assertSpecialLegacyProjection95 = (source: ts.SourceFile) => {
  const previous = parse(source.fileName, execFileSync('git', ['show', `${reviewedSpecialBaseline95}:${source.fileName}`], { encoding: 'utf8' }));
  const projected = projectSpecial95(source, true);
  assert.equal(printer.printFile(projected), printer.printFile(projectSpecial95(previous, false)),
    'Entire ordinary handler/module AST stays exact86df, not merely its DB calls');
  return projected;
};
const reviewedSpecialDb95 = (source: ts.SourceFile) => {
  assert.equal(source.fileName, 'supabase/functions/ai-wine-chat/index.ts');
  const legacyText96 = projectFeedbackServer96(source.fileName, source.text);
  assert.equal(createHash('sha256').update(legacyText96).digest('hex'),
    reviewedSpecialSources95['supabase/functions/ai-wine-chat/index.ts'],
    'The supplied AST source, including the special-only loader, must match the reviewed freeze');
  for (const [file, expected] of Object.entries(reviewedSpecialSources95)) {
    const text = readFileSync(file, 'utf8');
    const legacyText = file === 'supabase/functions/_shared/matchrim-special-moments95.ts' ? text : projectFeedbackServer96(file, text);
    assert.equal(createHash('sha256').update(legacyText).digest('hex'), expected,
      'Additive v95 source freeze; no unreviewed helper/body/query change: ' + file);
  }
  return assertSpecialLegacyProjection95(parse(source.fileName, legacyText96));
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
  const databaseSource = name === 'ai-wine-chat' ? reviewedSpecialDb95(after) : after;
  assert.deepEqual(databaseCalls(databaseSource), databaseCalls(before), `${name}: auth/catalog query semantics retained`);
  assert.doesNotMatch(afterText, /Deno\.env\.get\(["'](?:LOVABLE_API_KEY|ANTHROPIC_API_KEY)["']\)|ai\.gateway\.lovable\.dev/);
  calls += newBodies.length;
}
// Test both the complete source pin and the independent legacy AST projection.
const chatPath95 = 'supabase/functions/ai-wine-chat/index.ts';
const chatText95 = readFileSync(chatPath95, 'utf8');
for (const [label, candidate] of [
  ['legacy auth', chatText95.replace('getUser(token)', 'getUser("unreviewed-owner")')],
  ['strict owner filter', chatText95.replace('.eq("user_id", userId).order', '.eq("user_id", "unreviewed-owner").order')],
  ['ordinary prompt/body', chatText95.replace('model: stream ? "google/gemini-2.5-pro"', 'model: stream ? "unreviewed-model"')],
  ['extra side query', chatText95 + '\ngetSupabaseClient(null).from("unreviewed_table").select("*");\n'],
] as const) {
  assert.notEqual(candidate, chatText95, 'Mutation fixture must change source: ' + label);
  assert.throws(() => reviewedSpecialDb95(parse(chatPath95, candidate)), undefined, 'Guard rejects: ' + label);
  if (label !== 'strict owner filter') {
    assert.throws(() => assertSpecialLegacyProjection95(parse(chatPath95, projectFeedbackServer96(chatPath95, candidate))), undefined,
      'Legacy AST projection independently rejects: ' + label);
  }
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
const learnerPath96 = 'src/utils/matchrimLearning.ts';
const projectNativeLearner96 = (source: string) => {
  for (const [current, previous] of [
    ["  evidenceStrength?: 'legacy-v1' | 'native-v2';\n", ''],
    ["  const strengthAware = options.evidenceStrength === 'native-v2';\n", ''],
    ['(strengthAware ? totalWeight : samples) / 12', 'samples / 12'],
    ['  const evidenceDenominator = strengthAware ? samples : totalWeight;\n', ''],
    ['deltas[targetKey] / evidenceDenominator', 'deltas[targetKey] / totalWeight'],
  ]) {
    assert.equal(source.split(current).length, 2, 'Exactly one reviewed native evidence-strength delta: ' + current);
    source = source.replace(current, previous);
  }
  return source;
};
const assertNativeLearner96 = (source: string) => assert.equal(projectNativeLearner96(source),
  execFileSync('git', ['show', `${reviewedClientSensory}:${learnerPath96}`], { encoding: 'utf8' }),
  'Exact opt-in inverse preserves the full reviewed legacy client learner');
const learnerText96 = readFileSync(learnerPath96, 'utf8');
assertNativeLearner96(learnerText96);
for (const [current, changed] of [
  ["options.evidenceStrength === 'native-v2'", "options.evidenceStrength !== 'native-v2'"],
  ['strengthAware ? samples : totalWeight', 'strengthAware ? totalWeight : samples'],
  ["if (rating === 'love') return 1;", "if (rating === 'love') return 0.5;"],
  ['Math.round(', 'Math.floor('],
]) {
  const candidate = learnerText96.replace(current, changed);
  assert.notEqual(candidate, learnerText96, 'Native learner mutation must be reachable: ' + current);
  assert.throws(() => assertNativeLearner96(candidate));
}
for (const [file, expected] of [
  [learnerPath96, '070999f26f18b8ff3958b1d2864d5bf9f3ddb23aaffe7e0c1eee05b5af5d3fee'],
  ['src/utils/matchrimLearningPlatform.ts', 'f3a6ded6020ffb16aca44f79c50cbcda473c1f5549ce01d9670755b17ccd9178'],
  ['scripts/check-matchrim-feedback-strength96.ts', 'f2642c532de5c940510e0627b336c9e9613f66fb5459e8527ae48798851714e8'],
]) {
  const text = readFileSync(file, 'utf8');
  assert.equal(createHash('sha256').update(file === 'src/utils/matchrimLearningPlatform.ts'
    ? projectFeedbackServer96(file, text) : text).digest('hex'), expected, 'Reviewed opt-in source: ' + file);
}
const nativeLearningOutput96 = execFileSync(process.execPath,
  ['--import', 'tsx', 'scripts/check-matchrim-feedback-strength96.ts'], { encoding: 'utf8' });
assert.equal(nativeLearningOutput96.split('\n').filter(line => line.startsWith('PASS ')).length, 12,
  'All twelve native-strength and default/web parity groups execute');
for (const file of [learnerPath96, 'src/utils/wineAffinityExplanation.ts',
  'supabase/functions/_shared/matchrim-learning.ts', 'supabase/functions/_shared/matchrim-affinity.ts']) {
  const historical = execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' });
  assert.equal(execFileSync('git', ['show', `${providerMigration}:${file}`], { encoding: 'utf8' }), historical,
    'The provider migration itself did not alter taste scoring/learning: ' + file);
  assert.equal(file === learnerPath96 ? projectNativeLearner96(readFileSync(file, 'utf8')) : readFileSync(file, 'utf8'), file.startsWith('src/')
    ? execFileSync('git', ['show', `${reviewedClientSensory}:${file}`], { encoding: 'utf8' }) : historical,
  'Only the separately reviewed explicit-scale client change is accepted; hosted scoring stays frozen: ' + file);
}
console.log(JSON.stringify({ passed: true, handlers: openAi92LegacyHandlers.length, legacyCallsites: calls,
  reviewedSpecial95: true, negativeMutationControls: 4, independentLegacyAstMutationControls: 3,
  nativeFeedback96: { exactInverseDeltas: 5, mutationControls: 4, functionalGroups: 12, importOnlyClientBridges: 2 },
  remoteCalls: 0, scope: 'AST request/prompt/auth/query preservation plus hash-pinned special95-only projection; complete provider/client/scoring boundary audit; not deployed routing proof' }));
