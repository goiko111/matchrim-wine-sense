const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const source = fs.readFileSync('src/App.tsx', 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const routes = [];
function visit(node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'Route') {
    const attr = node.attributes.properties.find(p => p.name?.getText(ast) === 'path');
    routes.push({ path: attr.initializer.text, element: node.attributes.properties.find(p => p.name?.getText(ast) === 'element')?.initializer.getText(ast), status: 'NOT_RUN' });
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const out = path.resolve('../');
fs.writeFileSync(path.join(out, 'baseline-manifest.json'), JSON.stringify({
  task: 'MATCHRIM72-QA-20261007', baseline: 'Matchrim 1.0 (72)',
  ipaSha256: '2d98a360f44ebfb16f7f569bb39baf7ae71f928c869c4e7f39bdaa69919c2caf',
  appRouteSourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  seed: 721007, sourceBaseline: '/private/tmp/matchrim72-production-candidate',
  environments: { volume: 'local engine / isolated browser with deny-external interception', browserBackend: 'https://matchrim-integral.invalid (nonexistent host, always intercepted)',
    staging: 'NOT_RUN: no approved isolated load budget or account', production: 'No new calls in this task', device: 'CoreDevice read confirms 1.0 (72); interaction gate pending' },
  data: ['1000 synthetic taste vectors, 24 adult archetypes, 20000 local events', 'Five previously authorized photos retained locally; vision responses are fixtures/replay', 'No new production accounts, no LLM volume'],
  routes,
}, null, 2));
console.log(JSON.stringify({ declaredRoutes: routes.length, concretePaths: routes.length - 1, dynamicPaths: routes.filter(r => r.path.includes(':')).length }));
