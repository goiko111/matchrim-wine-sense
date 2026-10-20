import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({ options: { before: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' } } });
if (values.help) {
  console.log('Usage: node --import tsx scripts/check-matchrim-consumer95-auth.ts [--before <snapshot-root>] [--output <report.json>]');
  console.log('Default baseline: git show c25b282:<path>. Override directory contains src/. Output is stdout only unless --output is supplied.');
  process.exit(0);
}
for (const option of ['before', 'output'] as const) {
  if (values[option] !== undefined) assert.ok(values[option]!.trim(), `--${option} must not be empty`);
}
const baselineRef = 'c25b282';
const beforeRoot = values.before === undefined ? undefined : resolve(values.before);
const readBefore = (path: string) => {
  if (beforeRoot !== undefined) return readFileSync(resolve(beforeRoot, path), 'utf8');
  try {
    return execFileSync('git', ['show', `${baselineRef}:${path}`], { cwd: root, encoding: 'utf8' });
  } catch (error) {
    throw new Error(`Cannot load baseline ${baselineRef}:${path}. Make that commit available locally or use --before <snapshot-root>. ${String(error)}`);
  }
};
const paths = ['src/pages/Auth.tsx', 'src/pages/ForgotPassword.tsx', 'src/pages/Registration.tsx',
  'src/components/registration/BasicInfoStep.tsx', 'src/components/registration/WinePreferencesStep.tsx',
  'src/components/registration/FinalStep.tsx', 'src/components/QuizQuestion.tsx'];
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const print = ts.createPrinter({ removeComments: true });
const checks: Array<{ path: string; invariant: string; passed: boolean; error?: string }> = [];
const check = (path: string, invariant: string, run: () => void) => {
  try { run(); checks.push({ path, invariant, passed: true }); }
  catch (error) { checks.push({ path, invariant, passed: false, error: String(error) }); }
};
const tree = (source: string) => ts.createSourceFile('auth95.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
// Choose only the existing web branch and erase props React omits. No handler,
// validation, option, legal copy or data mutation is exempted from this comparison.
const web = (source: string) => {
  const ast = tree(source);
  const native = (node: ts.Node) => ts.isIdentifier(node) && node.text === 'isNative';
  const result = ts.transform(ast, [context => root => {
    const visit: ts.Visitor = node => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === '@capacitor/core') return undefined;
      if (ts.isVariableStatement(node) && node.declarationList.declarations.length === 1 && node.declarationList.declarations[0].name.getText(ast) === 'isNative') return undefined;
      if (ts.isIfStatement(node) && native(node.expression)) return node.elseStatement ? ts.visitNode(node.elseStatement, visit) : undefined;
      if (ts.isConditionalExpression(node) && native(node.condition)) return ts.visitNode(node.whenFalse, visit);
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        && ts.isPrefixUnaryExpression(node.left) && node.left.operator === ts.SyntaxKind.ExclamationToken && native(node.left.operand)) return ts.visitNode(node.right, visit);
      if (ts.isJsxText(node) && !node.text.trim()) return undefined;
      const updated = ts.visitEachChild(node, visit, context);
      if (ts.isJsxAttribute(updated)) {
        const init = updated.initializer;
        if (init && ts.isJsxExpression(init) && init.expression) {
          if (ts.isIdentifier(init.expression) && init.expression.text === 'undefined') return undefined;
          if (ts.isStringLiteral(init.expression)) return ts.factory.updateJsxAttribute(updated, updated.name, ts.factory.createStringLiteral(init.expression.text));
        }
        if (init && ts.isStringLiteral(init)) return ts.factory.updateJsxAttribute(updated, updated.name, ts.factory.createStringLiteral(init.text));
      }
      if (ts.isJsxExpression(updated) && updated.expression && ts.isJsxElement(updated.expression)) return updated.expression;
      return updated;
    };
    return ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  const output = print.printFile(result.transformed[0]); result.dispose(); return output;
};
const declarations = (source: string) => {
  const ast = tree(source), values = new Map<string, ts.Expression>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) values.set(node.name.text, node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(ast); return { ast, values };
};
const hashes: Record<string, { before: string; after: string }> = {};
for (const path of paths) {
  const before = readBefore(path), after = readFileSync(resolve(root, path), 'utf8');
  hashes[path] = { before: sha(before), after: sha(after) };
  check(path, 'complete legacy web source projection is unchanged', () => assert.equal(web(after), web(before)));
  const old = declarations(before), current = declarations(after);
  check(path, 'all existing handlers, validation, options and hook dependencies are unchanged', () => {
    for (const [name, node] of old.values) {
      if (['Auth', 'ForgotPassword', 'Registration', 'BasicInfoStep', 'WinePreferencesStep', 'FinalStep', 'QuizQuestion'].includes(name)) continue;
      assert.equal(print.printNode(ts.EmitHint.Expression, current.values.get(name)!, current.ast), print.printNode(ts.EmitHint.Expression, node, old.ast), name);
    }
  });
  check(path, 'native condition is the actual Capacitor platform predicate', () => {
    assert.equal(current.values.get('isNative')?.getText(current.ast), 'Capacitor.isNativePlatform()');
  });
}
const finalSource = readFileSync(resolve(root, paths[5]), 'utf8'), final = declarations(finalSource);
check(paths[0], 'native auth tabs stack for accessibility text and retain two columns on wide screens', () => {
  const ast = tree(readFileSync(resolve(root, paths[0]), 'utf8'));
  let nativeClass = '';
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(ast) === 'TabsList') {
      const attribute = node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(ast) === 'className');
      assert.ok(attribute && ts.isJsxAttribute(attribute) && attribute.initializer && ts.isJsxExpression(attribute.initializer));
      const expression = attribute.initializer.expression;
      assert.ok(expression && ts.isConditionalExpression(expression) && expression.condition.getText(ast) === 'isNative');
      assert.ok(ts.isStringLiteral(expression.whenTrue));
      nativeClass = expression.whenTrue.text;
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  const classes = new Set(nativeClass.split(/\s+/));
  for (const expected of ['h-auto', 'min-w-0', '[.matchrim-accessibility-text_&]:grid-cols-1', '[.matchrim-accessibility-text_&]:md:grid-cols-2']) {
    assert.ok(classes.has(expected), expected);
  }
});
check(paths[5], 'all legal consent combinations and saving gate preserve the independent truth table', () => {
  const body = ts.transpileModule('return ' + final.values.get('isValid')!.getText(final.ast) + ';', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const termsAccepted of [false, true]) for (const privacyAccepted of [false, true]) {
    const valid = new Function('data', body)({ termsAccepted, privacyAccepted });
    assert.equal(valid, termsAccepted && privacyAccepted);
  }
  assert.match(finalSource, /disabled=\{!isValid \|\| isSaving\}/);
  for (const [id, field] of [['terms', 'termsAccepted'], ['privacy', 'privacyAccepted']]) {
    assert.ok(finalSource.includes(`id="${id}"`)); assert.ok(finalSource.includes(`onUpdate({ ${field}: checked as boolean })`));
    assert.ok(finalSource.includes(`htmlFor="${id}"`));
  }
});
const report = { scope: 'No account, transport, formula or auth API changes; native presentation only.',
  passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length, hashes, checks };
if (values.output !== undefined) writeFileSync(resolve(values.output), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.failed ? 1 : 0;
