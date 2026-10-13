import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const output = process.argv[2];
if (!output) throw Error('Pass local region-action contract JSON path');
const baseline = 'bc94dad29d05785e57b1b44af7f9e92b719c7e17';
const path = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const source = readFileSync(path, 'utf8');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => unknown) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
const handlers = ['discardSelected', 'selectCandidate', 'confirmSelectedCandidate', 'editCandidate', 'identifySelectedManually'];
const actual = new Map<string, ts.ArrowFunction>();
const discover = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && handlers.includes(node.name.getText(tree)) && node.initializer && ts.isArrowFunction(node.initializer)) actual.set(node.name.getText(tree), node.initializer);
  ts.forEachChild(node, discover);
};
discover(tree);
check('Exactly five real source handlers extracted, no component initialization', () => assert.equal(actual.size, 5));
let actorVectors = 0;
for (const name of handlers) {
  const js = ts.transpile('const handler = ' + actual.get(name)!.getText(tree) + '; handler(argument);', { target: ts.ScriptTarget.ES2020 });
  for (const loading of [false, true]) for (const batch of [false, true]) for (const region of [false, true]) for (const candidate of [false, true]) {
    actorVectors++;
    check(name + ' guard ' + JSON.stringify({ loading, batch, region, candidate }), () => {
      const updates: string[] = [], selections: unknown[] = [], notices: string[] = [];
      let prevented = 0;
      const argument = name === 'identifySelectedManually' ? { preventDefault() { prevented++; }, currentTarget: {} }
        : name === 'editCandidate' ? { name: 'Synthetic guard only' } : 'synthetic-candidate';
      const scope = {
        loading, batchRef: { current: batch ? {} : null },
        selectedRegion: region ? { id: 'synthetic-region' } : null,
        selectedCandidate: candidate ? { id: 'synthetic-candidate' } : null,
        updateRegion: (id: string) => updates.push(id), setSelectedRegionId: (value: unknown) => selections.push(value),
        toast: { success: (value: string) => notices.push(value), error: (value: string) => notices.push(value) },
        FormData: class { get(key: string) { return key === 'manual-wine-name' ? 'Synthetic manual guard only' : ''; } },
        argument,
      };
      runInNewContext(js, scope);
      const allowed = !loading && !batch && region && (!['confirmSelectedCandidate', 'editCandidate'].includes(name) || candidate);
      assert.equal(updates.length, allowed ? 1 : 0);
      assert.equal(selections.length, allowed && name === 'discardSelected' ? 1 : 0);
      assert.equal(notices.length, allowed && ['confirmSelectedCandidate', 'identifySelectedManually'].includes(name) ? 1 : 0);
      assert.equal(prevented, name === 'identifySelectedManually' ? 1 : 0);
    });
  }
}
const changes = { derivedLock: 0, guards: 0, disabled: 0, guideConditions: 0, notice: 0 };
check('Complete scanner AST restored after exact region-action delta removal', () => {
  const before = ts.createSourceFile(path, execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' }), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result = ts.transform(tree, [context => {
    const visit: ts.Visitor = node => {
      if (ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => declaration.name.getText(tree) === 'regionActionsLocked')) {
        assert.equal(node.declarationList.declarations.length, 1);
        assert.equal(node.declarationList.declarations[0].initializer?.getText(tree), 'batchLocked || loading');
        changes.derivedLock++; return undefined;
      }
      if (ts.isJsxExpression(node) && node.expression && ts.isBinaryExpression(node.expression) && node.expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && ts.isIdentifier(node.expression.left) && node.expression.left.text === 'loading' && node.getText(tree).includes('data-testid="region-analysis-lock"')) {
        assert.equal(node.getText(tree).replace(/\s+/g, ' ').trim(), '{loading && ( <p role="status" className="text-sm text-slate-600" data-testid="region-analysis-lock"> Análisis del lote en curso. Las identidades aún pueden cambiar. </p> )}');
        changes.notice++; return undefined;
      }
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.BarBarToken && node.left.getText(tree) === 'batchRef.current' && node.right.getText(tree) === 'loading') {
        changes.guards++; return node.left;
      }
      if (ts.isJsxAttribute(node) && node.name.getText(tree) === 'disabled' && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression?.getText(tree) === 'regionActionsLocked') {
        changes.disabled++;
        return context.factory.updateJsxAttribute(node, node.name, context.factory.createJsxExpression(undefined, context.factory.createIdentifier('batchLocked')));
      }
      if (ts.isJsxAttribute(node) && ['primaryAction', 'secondaryAction'].includes(node.name.getText(tree)) && node.initializer?.getText(tree).includes('regionActionsLocked')) {
        const guideVisit: ts.Visitor = child => ts.isIdentifier(child) && child.text === 'regionActionsLocked'
          ? context.factory.createIdentifier('batchLocked') : ts.visitEachChild(child, guideVisit, context);
        changes.guideConditions++; return ts.visitEachChild(node, guideVisit, context);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return root => ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  try {
    const printer = ts.createPrinter({ removeComments: true });
    const normalize = (printed: string) => printed.replace(/\n[ \t]*\n/g, '\n');
    const afterPrinted = normalize(printer.printFile(result.transformed[0])), beforePrinted = normalize(printer.printFile(before));
    let first = 0;
    while (first < afterPrinted.length && afterPrinted[first] === beforePrinted[first]) first++;
    assert.ok(afterPrinted === beforePrinted, 'First normalized difference at ' + first + ': ' + JSON.stringify({ after: afterPrinted.slice(first - 70, first + 130), before: beforePrinted.slice(first - 70, first + 130) }));
  } finally { result.dispose(); }
});
check('Exactly one lock, five handler guards, eight disabled controls, three guide conditions, one status', () => assert.deepEqual(changes, { derivedLock: 1, guards: 5, disabled: 8, guideConditions: 3, notice: 1 }));
const prior = JSON.parse(readFileSync('docs/qa-evidence/matchrim-region-counter-2026-10-13/source-stages.json', 'utf8')) as { protectedSources: Array<{ path: string }> };
const protectedPaths = [...prior.protectedSources.map(row => row.path), 'src/utils/scanRegionProgress.ts'].sort();
for (const protectedPath of protectedPaths) check('Protected source ' + protectedPath, () => assert.equal(readFileSync(protectedPath, 'utf8'), execFileSync('git', ['show', baseline + ':' + protectedPath], { encoding: 'utf8' })));
const hashes = Object.fromEntries([path, 'scripts/check-matchrim-region-edit-lock-oct13.ts', ...protectedPaths].map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
writeFileSync(output, JSON.stringify({ baseline, scope: 'Execute only extracted source action guards with synthetic controls; no React/model/user fixture. Complete module normalized AST and source byte protection.', actorVectors, changes, checks, protectedPaths, hashes }, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter(check => check.passed).length, total: checks.length, actorVectors, protectedSources: protectedPaths.length, failures: checks.filter(check => !check.passed) }));
if (checks.some(check => !check.passed)) process.exitCode = 1;
