import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { formatScanRegionProgress, summarizeScanRegionProgress, type ScanRegionProgress } from '../src/utils/scanRegionProgress';
import type { ScanRegion } from '../src/utils/multiWineScan';

const output = process.argv[2];
if (!output) throw Error('Pass local counter contract output JSON');
const baseline = 'cdcbbc472c88353768d5a1490038a266bcc9a986';
const scanner = 'src/components/wine-import/MultiWineLabelScanner.tsx';
type Region = Pick<ScanRegion, 'status' | 'error'>;
const zero: ScanRegionProgress = { analyzed: 0, analyzing: 0, pending: 0, deferred: 0, failed: 0, discarded: 0 };
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => unknown) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
const cases: Array<{ name: string; regions: Region[]; counts: ScanRegionProgress; text: string }> = [];
const add = (name: string, regions: Region[], counts: Partial<ScanRegionProgress>, text: string) => cases.push({ name, regions, counts: { ...zero, ...counts }, text });
const r = (status: Region['status'], error?: string | null): Region => ({ status, error });
add('Empty', [], {}, '0 analizadas');
for (const status of ['recognized', 'uncertain', 'unrecognized'] as const) {
  add(status + ' outcome is analyzed, not necessarily identified', [r(status)], { analyzed: 1 }, '1 analizada');
  add(status + ' outcome with request error is separate', [r(status, 'Request failed')], { failed: 1 }, '0 analizadas \u00b7 1 con error');
  add(status + ' empty error is a completed outcome', [r(status, '')], { analyzed: 1 }, '1 analizada');
}
for (const [status, label] of [['pending', 'en espera'], ['analyzing', 'en curso'], ['deferred', 'sin analizar'], ['discarded', 'descartada']] as const) {
  add(status + ' is not completed', [r(status)], { [status]: 1 }, '0 analizadas \u00b7 1 ' + label);
  add(status + ' ignores stale error from a previous state', [r(status, 'Old error')], { [status]: 1 }, '0 analizadas \u00b7 1 ' + label);
}
add('Real local queue', [r('analyzing'), r('analyzing'), r('analyzing'), r('pending'), r('deferred')], { analyzing: 3, pending: 1, deferred: 1 }, '0 analizadas \u00b7 3 en curso \u00b7 1 en espera \u00b7 1 sin analizar');
add('Real local held catalog', [r('analyzing'), r('uncertain'), r('analyzing'), r('analyzing'), r('deferred')], { analyzed: 1, analyzing: 3, deferred: 1 }, '1 analizada \u00b7 3 en curso \u00b7 1 sin analizar');
add('Real local ready', [r('recognized'), r('uncertain'), r('recognized'), r('recognized'), r('deferred')], { analyzed: 4, deferred: 1 }, '4 analizadas \u00b7 1 sin analizar');
add('All deferred', [r('deferred'), r('deferred')], { deferred: 2 }, '0 analizadas \u00b7 2 sin analizar');
add('All discarded', [r('discarded'), r('discarded')], { discarded: 2 }, '0 analizadas \u00b7 2 descartadas');
add('All failed', [r('unrecognized', 'Offline'), r('unrecognized', 'Quota')], { failed: 2 }, '0 analizadas \u00b7 2 con error');
add('Reanalysis retains other outcomes, replaces selected status', [r('recognized'), r('analyzing'), r('deferred')], { analyzed: 1, analyzing: 1, deferred: 1 }, '1 analizada \u00b7 1 en curso \u00b7 1 sin analizar');
add('Discard after analysis moves to discarded, not analyzed', [r('recognized'), r('discarded'), r('deferred')], { analyzed: 1, discarded: 1, deferred: 1 }, '1 analizada \u00b7 1 sin analizar \u00b7 1 descartada');
add('All categories, no double counts', [r('recognized'), r('uncertain'), r('unrecognized'), r('analyzing'), r('pending'), r('deferred'), r('unrecognized', 'Failure'), r('discarded')], { analyzed: 3, analyzing: 1, pending: 1, deferred: 1, failed: 1, discarded: 1 }, '3 analizadas \u00b7 1 en curso \u00b7 1 en espera \u00b7 1 con error \u00b7 1 sin analizar \u00b7 1 descartada');
for (const item of cases) {
  const before = JSON.stringify(item.regions);
  check(item.name + ' exact partition', () => assert.deepEqual(summarizeScanRegionProgress(item.regions), item.counts));
  check(item.name + ' truthful wording', () => assert.equal(formatScanRegionProgress(summarizeScanRegionProgress(item.regions)), item.text));
  check(item.name + ' partition total and no input mutation', () => {
    assert.equal(Object.values(summarizeScanRegionProgress(item.regions)).reduce((sum, value) => sum + value, 0), item.regions.length);
    assert.equal(JSON.stringify(item.regions), before);
  });
}
const changes = { import: 0, memo: 0, counter: 0 };
check('Only import/memo/counter presentation restores complete scanner AST', () => {
  const source = readFileSync(scanner, 'utf8');
  const before = ts.createSourceFile(scanner, execFileSync('git', ['show', baseline + ':' + scanner], { encoding: 'utf8' }), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const tree = ts.createSourceFile(scanner, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let oldCounter: ts.JsxExpression | undefined;
  const find = (node: ts.Node) => {
    if (ts.isJsxExpression(node) && node.expression && ts.isBinaryExpression(node.expression) && node.expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && node.getText(before).includes('regions.length - summary.pending')) oldCounter = node;
    ts.forEachChild(node, find);
  };
  find(before);
  assert.ok(oldCounter);
  const transform = ts.transform(tree, [context => {
    const visit: ts.Visitor = node => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === '@/utils/scanRegionProgress') {
        assert.equal(node.importClause?.getText(tree), '{ formatScanRegionProgress, summarizeScanRegionProgress }');
        changes.import++; return undefined;
      }
      if (ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => declaration.name.getText(tree) === 'regionProgress')) {
        assert.equal(node.declarationList.declarations.length, 1);
        assert.equal(node.declarationList.declarations[0].initializer?.getText(tree), 'useMemo(() => formatScanRegionProgress(summarizeScanRegionProgress(regions)), [regions])');
        changes.memo++; return undefined;
      }
      if (ts.isJsxExpression(node) && node.expression && ts.isBinaryExpression(node.expression) && node.getText(tree).includes('data-testid="scan-region-progress"')) {
        assert.equal(node.getText(tree).replace(/\s+/g, ' ').trim(), '{(phase === \'analyzing\' || phase === \'ready\') && regions.length > 0 && ( <div className="mt-1 text-xs text-slate-600" role="status" data-testid="scan-region-progress"> {regionProgress} </div> )}');
        changes.counter++; return context.factory.createJsxExpression(undefined, context.factory.createIdentifier('__COUNTER_PRESENTATION__'));
      }
      return ts.visitEachChild(node, visit, context);
    };
    return root => ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  const normalizedBefore = ts.transform(before, [context => {
    const visit: ts.Visitor = node => node === oldCounter
      ? context.factory.createJsxExpression(undefined, context.factory.createIdentifier('__COUNTER_PRESENTATION__'))
      : ts.visitEachChild(node, visit, context);
    return root => ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  try {
    const printer = ts.createPrinter({ removeComments: true });
    assert.equal(printer.printFile(transform.transformed[0]), printer.printFile(normalizedBefore.transformed[0]));
  } finally { transform.dispose(); normalizedBefore.dispose(); }
});
check('Exactly one import, one memo, one counter change', () => assert.deepEqual(changes, { import: 1, memo: 1, counter: 1 }));
const prior = JSON.parse(readFileSync('docs/qa-evidence/matchrim-progress-a11y-2026-10-13/source-stages.json', 'utf8')) as { stages: Array<{ path: string }> };
const protectedPaths = prior.stages.map(stage => stage.path).filter(path => path !== scanner && !path.startsWith('scripts/')).sort();
for (const path of protectedPaths) check('Protected source ' + path, () => assert.equal(readFileSync(path, 'utf8'), execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' })));
const sourceHashes = Object.fromEntries([scanner, 'src/utils/scanRegionProgress.ts', 'scripts/check-matchrim-region-counter-oct13.ts', ...protectedPaths].map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(output, JSON.stringify({ baseline, changes, scope: 'Presentation-only progress partitions. Complete scanner AST restored; no detector, affinity, request, timing, cancellation, summary, styles or image changes.', cases, checks, protectedPaths, sourceHashes }, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter(check => check.passed).length, total: checks.length, vectors: cases.length, protectedSources: protectedPaths.length, failures: checks.filter(check => !check.passed) }));
if (checks.some(check => !check.passed)) process.exitCode = 1;
