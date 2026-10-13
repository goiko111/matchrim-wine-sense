import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const output = process.argv[2];
if (!output) throw Error('Pass local AST/protection output JSON');
const baseline = 'eac41777fb3817446b4d2c5ce33c7deea6384335';
const paths = [
  'src/components/ui/progress.tsx', 'src/components/WineStylesCSVImporter.tsx', 'src/components/csv/ImportProgress.tsx',
  'src/components/wine-import/MultiWineLabelScanner.tsx', 'src/components/wine-import/FoodPairingScanner.tsx',
  'src/components/wine-import/WineLabelOCRImport.tsx', 'src/pages/Profile.tsx', 'src/pages/MyWines.tsx',
];
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => unknown) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
const changes = { rootValue: 0, consumerNames: 0, consumerMeters: 0 };
for (const path of paths) check('Only intended JSX accessibility delta restores complete baseline module: ' + path, () => {
  const oldSource = execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' });
  const source = readFileSync(path, 'utf8'), tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const before = ts.createSourceFile(path, oldSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result = ts.transform(tree, [context => {
    const visit: ts.Visitor = node => {
      if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        const tag = node.tagName.getText(tree);
        const properties = node.attributes.properties.filter(attribute => {
          if (!ts.isJsxAttribute(attribute)) return true;
          const name = attribute.name.getText(tree);
          if (tag === 'ProgressPrimitive.Root' && name === 'value') {
            assert.ok(attribute.initializer && ts.isJsxExpression(attribute.initializer));
            assert.equal(attribute.initializer.expression!.getText(tree), 'value'); changes.rootValue++; return false;
          }
          if (tag === 'Progress' && name === 'aria-label') {
            assert.ok(attribute.initializer); changes.consumerNames++; return false;
          }
          if (tag === 'Progress' && name === 'role') {
            assert.ok(attribute.initializer && ts.isStringLiteral(attribute.initializer));
            assert.equal(attribute.initializer.text, 'meter'); changes.consumerMeters++; return false;
          }
          return true;
        });
        if (properties.length !== node.attributes.properties.length) {
          const attributes = context.factory.updateJsxAttributes(node.attributes, properties);
          return ts.isJsxSelfClosingElement(node)
            ? context.factory.updateJsxSelfClosingElement(node, node.tagName, node.typeArguments, attributes)
            : context.factory.updateJsxOpeningElement(node, node.tagName, node.typeArguments, attributes);
        }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return root => ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  try {
    const printer = ts.createPrinter({ removeComments: true });
    assert.equal(printer.printFile(result.transformed[0]), printer.printFile(before));
  } finally { result.dispose(); }
});
check('Exactly one Root forwarding, eight contextual names, four static meter roles', () => assert.deepEqual(changes, { rootValue: 1, consumerNames: 8, consumerMeters: 4 }));
const previous = JSON.parse(readFileSync('docs/qa-evidence/matchrim-multi-stale-cancel-2026-10-13/source-stages.json', 'utf8')) as { stages: Array<{ path: string; protected: boolean }> };
const protectedPaths = [...new Set([
  ...previous.stages.filter(stage => stage.protected && !paths.includes(stage.path)).map(stage => stage.path),
  'src/components/AffinityExplanation.tsx', 'src/index.css', 'src/App.css',
])].sort();
for (const path of protectedPaths) check('Protected source ' + path, () => assert.equal(
  readFileSync(path, 'utf8'), execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' }),
));
const sourceHashes = Object.fromEntries([...paths, ...protectedPaths, 'scripts/check-matchrim-progress-a11y-oct13.ts'].map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(output, JSON.stringify({
  baseline, scope: 'Only Root value forwarding and accessibility names/static roles. Complete module AST restored after removing13 intended attributes. No percentages/calculation/pipeline/cancel/save/style changes.',
  changes, checks, sourceHashes,
}, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter(check => check.passed).length, total: checks.length, failures: checks.filter(check => !check.passed) }));
if (checks.some(check => !check.passed)) process.exitCode = 1;
