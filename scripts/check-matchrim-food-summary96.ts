import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const file = 'src/components/wine-import/FoodPairingScanner.tsx';
const baseline = '55ee695ed51b5079e6eb0ab645c04b0b3420420a';
const before = execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' });
const source = readFileSync(file, 'utf8');
const hunks = [
  [
    `<div className="rounded-lg border border-stone-200 bg-white p-4">\n            <div className="flex items-start gap-3">\n              <Sparkles className="mt-0.5 h-5 w-5 text-red-900" />\n              <div className={isNative ? 'min-w-0 flex-1' : undefined}>`,
    `<div className={isNative ? 'min-w-0 bg-white py-[16px] [overflow-wrap:anywhere]' : "rounded-lg border border-stone-200 bg-white p-4"}>\n            <div className={isNative ? 'flex min-w-0 flex-col items-start gap-[8px]' : "flex items-start gap-3"}>\n              <Sparkles className={isNative ? 'h-5 w-5 shrink-0 text-red-900' : "mt-0.5 h-5 w-5 text-red-900"} />\n              <div className={isNative ? 'min-w-0 w-full' : undefined}>`,
  ],
  [
    `<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">`,
    `<div className={isNative ? 'min-w-0 border-y border-amber-200 bg-amber-50 py-[12px] text-sm leading-6 text-amber-950 [overflow-wrap:anywhere]' : "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"}>`,
  ],
];
const restore = (value: string) => {
  for (const [old, current] of hunks) {
    assert.equal(value.split(current).length, 2, 'Exactly one scoped native class hunk');
    value = value.replace(current, old);
  }
  assert.equal(value, before, 'Whole source outside five native classes must be byte-identical');
};
const parse = (value: string) => ts.createSourceFile(file, value, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true });
function web(value: string) {
  const tree = parse(value);
  let expression: ts.Expression | undefined;
  const find = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'FoodPairingScannerSession') {
      const fn = node.initializer as ts.ArrowFunction;
      expression = (fn.body as ts.Block).statements.filter(ts.isReturnStatement).at(-1)?.expression;
    }
    ts.forEachChild(node, find);
  };
  find(tree); assert.ok(expression);
  const transformed = ts.transform(expression, [context => {
    const boolean = (node: ts.Node) => node.kind === ts.SyntaxKind.TrueKeyword ? true : node.kind === ts.SyntaxKind.FalseKeyword ? false : null;
    const visit: ts.Visitor = node => {
      if (ts.isIdentifier(node) && node.text === 'isNative') return context.factory.createFalse();
      const result = ts.visitEachChild(node, visit, context);
      if (ts.isJsxAttribute(result) && result.initializer && ts.isJsxExpression(result.initializer) && result.initializer.expression && ts.isStringLiteral(result.initializer.expression)) {
        return context.factory.updateJsxAttribute(result, result.name, context.factory.createStringLiteral(result.initializer.expression.text));
      }
      if (ts.isParenthesizedExpression(result) && boolean(result.expression) !== null) return result.expression;
      if (ts.isConditionalExpression(result) && boolean(result.condition) !== null) return boolean(result.condition) ? result.whenTrue : result.whenFalse;
      if (ts.isBinaryExpression(result)) {
        const left = boolean(result.left), right = boolean(result.right);
        if (result.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
          if (left === false || right === false) return context.factory.createFalse();
          if (left === true) return result.right;
          if (right === true) return result.left;
        }
        if (result.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
          if (left === true || right === true) return context.factory.createTrue();
          if (left === false) return result.right;
          if (right === false) return result.left;
        }
      }
      return result;
    };
    return node => ts.visitNode(node, visit) as ts.Expression;
  }]);
  try { return printer.printNode(ts.EmitHint.Expression, transformed.transformed[0], tree); }
  finally { transformed.dispose(); }
}
restore(source);
assert.equal(web(source), web(before), 'Full native-false return JSX equals the exact prior web tree');
const negatives = [
  source.replace('onClick={clearScan}', 'onClick={() => undefined}'),
  source.replace('rounded-lg border border-stone-200 bg-white p-4', 'rounded-lg border border-stone-200 bg-white p-5'),
  source.replace('min-w-0 bg-white py-[16px]', 'min-w-0 bg-white p-4 py-[16px]'),
  source.replace('min-w-0 border-y border-amber-200', 'min-w-0 p-4 border-y border-amber-200'),
];
for (const mutation of negatives) { assert.notEqual(mutation, source); assert.throws(() => restore(mutation)); }
console.log(JSON.stringify({ passed: 6, failed: 0, baseline, wholeFileInverse: true, fullWebJSXEqual: true, nativeClassAttributes: 5, rejectedMutations: negatives.length, network: 0, SDK: 0 }));
