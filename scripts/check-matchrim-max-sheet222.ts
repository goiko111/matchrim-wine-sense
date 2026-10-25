import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import postcss from 'postcss';
const file = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const project = (source: string) => {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const transformed = ts.transform(tree, [ctx => {
    const bool = (node: ts.Node) => node.kind === ts.SyntaxKind.FalseKeyword ? false : node.kind === ts.SyntaxKind.TrueKeyword ? true : null;
    const visit: ts.Visitor = node => {
      // These effects return before any side effect on the legacy web path.
      if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && ts.isIdentifier(node.expression.expression)
        && ['useEffect', 'useLayoutEffect'].includes(node.expression.expression.text)) {
        const callback = node.expression.arguments[0];
        if (callback && ts.isArrowFunction(callback) && ts.isBlock(callback.body)
          && callback.body.statements[0]?.getText(tree) === 'if (!isNative || !selectedRegionId) return;') return ctx.factory.createEmptyStatement();
      }
      if (ts.isIdentifier(node) && node.text === 'isNative') return ctx.factory.createFalse();
      const n = ts.visitEachChild(node, visit, ctx);
      if (ts.isConditionalExpression(n) && bool(n.condition) !== null) return bool(n.condition) ? n.whenTrue : n.whenFalse;
      if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken && bool(n.operand) !== null) return bool(n.operand) ? ctx.factory.createFalse() : ctx.factory.createTrue();
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        if (bool(n.left) === false || bool(n.right) === false) return ctx.factory.createFalse();
        if (bool(n.left) === true) return n.right;
      }
      if (ts.isJsxAttribute(n) && n.initializer) {
        if (ts.isJsxExpression(n.initializer) && n.initializer.expression) {
          if (ts.isIdentifier(n.initializer.expression) && n.initializer.expression.text === 'undefined') return undefined;
          if (ts.isStringLiteral(n.initializer.expression)) return ctx.factory.updateJsxAttribute(n, n.name, ctx.factory.createJsxExpression(undefined, ctx.factory.createStringLiteral(n.initializer.expression.text)));
        }
        if (ts.isStringLiteral(n.initializer)) return ctx.factory.updateJsxAttribute(n, n.name, ctx.factory.createJsxExpression(undefined, ctx.factory.createStringLiteral(n.initializer.text)));
      }
      if (ts.isJsxElement(n)) return ctx.factory.updateJsxElement(n, n.openingElement, n.children
        .map(child => ts.isJsxExpression(child) && child.expression && ts.isStringLiteral(child.expression) ? ctx.factory.createJsxText(child.expression.text) : child)
        .filter(child => !(ts.isJsxText(child) && !child.text.trim())), n.closingElement);
      return n;
    }; return root => ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  try { return ts.createPrinter({ removeComments: true }).printFile(transformed.transformed[0] as ts.SourceFile); } finally { transformed.dispose(); }
};
const current = fs.readFileSync(file, 'utf8'), before = execFileSync('git', ['show', `d4f9f2c:${file}`], { encoding: 'utf8' });
const actual = project(current), expected = project(before);
let first = 0; while (first < actual.length && actual[first] === expected[first]) first++;
assert(actual === expected, `Web delta at ${first}: ${JSON.stringify(actual.slice(first - 50, first + 100))} vs ${JSON.stringify(expected.slice(first - 50, first + 100))}`);
const css = postcss.parse(fs.readFileSync('src/components/wine-import/nativeLabelSheet102.css', 'utf8'));
let boundedHeader = false, fixedIcons = false, compactFooter = false;
css.walkRules(rule => {
  assert(rule.selector.split(',').every(selector => selector.trim().startsWith('html.matchrim-native-platform')), 'Native-only selectors required');
  if (rule.selector.includes('> :first-child')) { assert(rule.selector.includes('.matchrim-accessibility-text')); boundedHeader = rule.nodes.some(node => node.type === 'decl' && node.prop === 'max-height' && node.value === 'min(12dvh, 6rem)'); }
  if (rule.selector.includes('> :last-child')) { assert(rule.selector.includes('.matchrim-accessibility-text')); compactFooter = rule.nodes.some(node => node.type === 'decl' && node.prop === 'grid-template-columns' && node.value === 'minmax(0, 1fr) 44px'); }
  if (rule.selector.includes('.matchrim-region-footer-actions') && rule.selector.includes('button')) { assert(rule.selector.includes('.matchrim-accessibility-text')); fixedIcons = rule.nodes.some(node => node.type === 'decl' && node.prop === 'height' && node.value === '44px'); }
});
assert(boundedHeader && fixedIcons && compactFooter);
assert(current.includes("aria-label={isNative ? 'Cerrar' : undefined}"));
assert(!current.includes("addEventListener('scroll', revealFocusedField)"));
assert(current.includes("addEventListener('focusin', revealFocusedField)") && current.includes("addEventListener('resize', revealFocusedField)"));
console.log(JSON.stringify({ passed: true, checks: ['Full legacy web-false projection unchanged', 'All CSS native scoped', 'MAX-only keyboard-safe header budget', '44px icon targets', 'Single-row MAX footer', 'Explicit accessible close name', 'No focus restoration on manual viewport pan; focus/resize retained'], liveCalls: 0 }));
