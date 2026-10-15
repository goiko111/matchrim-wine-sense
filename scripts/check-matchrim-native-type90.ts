import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import postcss from 'postcss';

const baseline = (path: string) => execFileSync('git', ['show', `8f52291:${path}`], { encoding: 'utf8' });
const file = 'src/components/MobileBottomNav.tsx';
const webReturn = (text: string) => {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const variable = ast.statements.filter(ts.isVariableStatement).flatMap((s) => [...s.declarationList.declarations])
    .find((d) => d.name.getText(ast) === 'MobileBottomNav');
  assert.ok(variable && variable.initializer && ts.isArrowFunction(variable.initializer) && ts.isBlock(variable.initializer.body));
  const statement = variable.initializer.body.statements.filter(ts.isReturnStatement).at(-1);
  assert.ok(statement);
  return statement.getText(ast);
};
assert.equal(webReturn(readFileSync(file, 'utf8')), webReturn(baseline(file)), 'Public web navigation stays byte-identical');
const withoutNativeBranch = (text: string) => {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let native: ts.IfStatement | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isIfStatement(node) && node.expression.getText(ast) === 'isNative') native = node;
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.ok(native);
  return text.slice(0, native.getStart(ast)) + '[native branch]' + text.slice(native.end);
};
assert.equal(withoutNativeBranch(readFileSync(file, 'utf8')), withoutNativeBranch(baseline(file)), 'All navigation outside the native branch is unchanged');
const swiftPath = 'ios/App/App/AppDelegate.swift';
const oldSwift = baseline(swiftPath);
const expected = oldSwift
  .replace('let scale = min(max(preferredSize / standardSize, 0.94), 1.35)', 'let scale = max(preferredSize / standardSize, 0.94)')
  .replace('"document.documentElement.style.webkitTextSizeAdjust = \'\\(percentage)%\';" +',
    '"document.documentElement.style.webkitTextSizeAdjust = \'\\(percentage)%\';" +\n            "document.documentElement.style.fontSize = \'100%\';" +');
assert.notEqual(expected, oldSwift, 'Native bridge delta must be explicit');
assert.equal(readFileSync(swiftPath, 'utf8'), expected, 'Only uncapped user font scaling changes the bridge; permissions/lifetimes stay intact');
assert.equal(readFileSync('src/App.css', 'utf8'), baseline('src/App.css'), 'Actual nav-height reservation is preserved');
const native = readFileSync(file, 'utf8').split('if (isNative) {')[1].split('\n  return (')[0];
assert.match(native, /min-h-\[56px\]/);
assert.match(native, /w-\[48px\]/);
assert.match(native, /gap-\[2px\]/);
assert.match(readFileSync('src/index.css', 'utf8'), /html\.matchrim-native-platform \.matchrim-native-display-title \{\s*font-size: 2rem;\s*overflow-wrap: anywhere;/);
const nonNativeCss = (source: string) => {
  const rows: unknown[] = [];
  postcss.parse(source).walk((node) => {
    if (node.type === 'decl' || node.type === 'comment') return;
    if (node.type === 'rule' && node.selectors.every((s) => s.startsWith('html.matchrim-native-platform'))) return;
    if (node.type === 'rule') rows.push({ selector: node.selector, declarations: node.nodes.filter((n) => n.type === 'decl').map((n) => n.toString()) });
    else if (node.type === 'atrule') rows.push({ name: node.name, params: node.params });
  });
  return rows;
};
assert.deepEqual(nonNativeCss(readFileSync('src/index.css', 'utf8')), nonNativeCss(baseline('src/index.css')), 'Every non-native CSS rule/declaration remains unchanged');
console.log(JSON.stringify({ checks: 10, passed: true, scope: 'Native source/untouched web-branch and CSS contracts; actual font sizing and layout require UI/runtime evidence' }));
