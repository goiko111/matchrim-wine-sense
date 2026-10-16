import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { parseCatalogSearchInput, catalogSearchFilter } from '../supabase/functions/_shared/matchrim-catalog-search-v75';

const file = 'supabase/functions/_shared/matchrim-catalog-search-v75.ts';
const beforeText = execFileSync('git', ['show', `fd13745:${file}`], { encoding: 'utf8' });
const compiled = ts.transpileModule(beforeText, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const before: { parseCatalogSearchInput?: (body: unknown) => { query: string; limit: number }; catalogSearchFilter?: (variants: string[]) => string } = {};
new Function('exports', compiled)(before);
let checks = 0;
for (const query of ['', ' ', 'Muga', 'Chateau (Reserve), "A"', 'BC/DC', 'A_%*\\', 'x'.repeat(240)]) {
  for (const limit of [1, 20, 50]) {
    const expected = before.parseCatalogSearchInput!({ query, limit });
    for (const flag of [undefined, false, true]) {
      const actual = parseCatalogSearchInput({ query, limit, ...(flag === undefined ? {} : { catalogOnly: flag }) });
      assert.deepEqual({ query: actual.query, limit: actual.limit }, expected); checks++;
      assert.equal(actual.catalogOnly, flag ?? false); checks++;
    }
    assert.equal(catalogSearchFilter([query]), before.catalogSearchFilter!([query])); checks++;
  }
}
for (const flag of [null, 0, 1, '', 'false', [], {}]) {
  assert.throws(() => parseCatalogSearchInput({ query: 'Muga', catalogOnly: flag })); checks++;
}
const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const baseline = ts.createSourceFile(file, beforeText, ts.ScriptTarget.Latest, true);
const filter = (tree: ts.SourceFile) => tree.statements.find(node => ts.isVariableStatement(node)
  && node.declarationList.declarations.some(item => item.name.getText(tree) === 'catalogSearchFilter'))!;
const printer = ts.createPrinter({ removeComments: true });
assert.equal(printer.printNode(ts.EmitHint.Unspecified, filter(source), source), printer.printNode(ts.EmitHint.Unspecified, filter(baseline), baseline)); checks++;
console.log(JSON.stringify({ checks, passed: true, remoteCalls: 0,
  scope: 'Optional catalog-only flag; ordinary search limits/filter operands and SQL filter AST retain exact behavior' }));
