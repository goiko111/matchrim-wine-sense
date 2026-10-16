import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const baseline = 'c9d7b91b8aeb913978ccaab0df8b80f505a7b099';
const output = process.argv[2];
if (!output || !path.isAbsolute(output) || fs.existsSync(output)) throw new Error('New absolute JSON output required');
const hash = value => createHash('sha256').update(value).digest('hex');
const read = file => execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' });
const handler = 'supabase/functions/search-wines-v75/index.ts';
const parser = 'supabase/functions/_shared/matchrim-catalog-search-v75.ts';
const helper = 'supabase/functions/_shared/matchrim-openai.ts';
const before = read(handler);
const source = ts.createSourceFile(handler, before, ts.ScriptTarget.Latest, true);
const edits = [];
const visit = node => {
  if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer
    && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(source) === 'parseCatalogSearchInput') {
    if (node.name.getText(source) !== '{ query, limit }') throw new Error('Unexpected input binding');
    edits.push({ start: node.name.getStart(source), end: node.name.end, replacement: '{ query, limit, catalogOnly }' });
  }
  if (ts.isIfStatement(node) && ts.isIdentifier(node.expression) && node.expression.text === 'hasOpenAiKey') {
    edits.push({ start: node.expression.getStart(source), end: node.expression.end, replacement: '!catalogOnly && hasOpenAiKey' });
  }
  ts.forEachChild(node, visit);
};
visit(source);
if (edits.length !== 2) throw new Error('Unexpected production handler shape');
let content = before;
for (const edit of [...edits].sort((a, b) => b.start - a.start)) content = content.slice(0, edit.start) + edit.replacement + content.slice(edit.end);
const parserContent = fs.readFileSync(parser, 'utf8');
const reverseParser = parserContent.replace(', catalogOnly = false', '')
  .replace("  if (typeof catalogOnly !== 'boolean') throw new CatalogSearchInputError('Modo de catalogo invalido');\n", '')
  .replace('return { query: query.trim(), limit, catalogOnly };', 'return { query: query.trim(), limit };');
if (reverseParser !== read(parser)) throw new Error('Parser changes exceed the reviewed optional flag');
const files = [[handler, content], [parser, parserContent], [helper, read(helper)]].map(([file, text]) => {
  const parsed = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  if (parsed.parseDiagnostics.length) throw new Error('Invalid source: ' + file);
  return { path: file, content: text, sha256: hash(text), baselineSha256: hash(read(file)) };
});
const manifest = {
  schema: 'matchrim-catalog93-deployment-v1', sourceCommit: baseline,
  projectId: '7e9b6f66-d4ee-404a-8678-c9afab22de75', backendRef: 'cbjynrbvrhcmpaojmqdp',
  functions: [{ name: 'search-wines-v75', entrypoint: handler }], files,
  scope: 'Optional catalogOnly boolean skips unused AI suggestions; omitted/false preserves ordinary web search',
  configSha256: hash(read('supabase/config.toml')), configIncluded: false,
  publishWeb: false, secretValuesIncluded: false, databaseChanges: false,
  handlerEdits: edits.map(edit => ({ ...edit, before: before.slice(edit.start, edit.end) })),
  localSourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  localSourceDirty: Boolean(execFileSync('git', ['status', '--porcelain=v1'], { encoding: 'utf8' }).trim()),
};
const json = JSON.stringify(manifest, null, 2) + '\n';
fs.writeFileSync(output, json, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ output, files: files.length, functions: 1, sha256: hash(json) }));
