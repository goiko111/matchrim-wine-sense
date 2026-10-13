import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { EdgeFunctionError } from '../src/utils/edgeFunctionResilience';
import { regionAnalysisErrorMessage } from '../src/utils/regionAnalysisError';
import { confirmWineCandidateIdentity, correctWineCandidateIdentity, determineRegionStatus } from '../src/utils/multiWineScan';

const output = process.argv[2];
if (!output) throw Error('Pass failure contract receipt path');
const baseline = '485a2dc7fa0ea457cd026ba796796c4e58309d5a';
const path = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const source = readFileSync(path, 'utf8');
const before = execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' });
const parse = (text: string) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = (text: string) => {
  const tree = parse(text), found = new Map<string, string>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isArrowFunction(node.initializer)) found.set(node.name.getText(tree), node.initializer.getText(tree));
    ts.forEachChild(node, visit);
  };
  visit(tree); return found;
};
const current = functions(source), previous = functions(before);
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => unknown) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
const internal = 'INTERNAL_QA_ONLY provider detail';
const values: unknown[] = [new Error(internal), new TypeError(internal), internal, { message: internal, status: 429 }, null, undefined, 0];
for (const status of [400, 401, 403, 404, 408, 425, 429, 500, 503, 504]) values.push(new EdgeFunctionError(internal, { status, errorCode: internal, retryAfterMs: null }));
const messages = {
  offline: 'No hay conexión. Esta región no se ha podido analizar.',
  transport: 'No se pudo conectar con el servicio de lectura. Esta región sigue pendiente.',
  limited: 'El servicio de lectura está temporalmente limitado. Esta región no se ha podido analizar.',
  auth: 'No se pudo autorizar la lectura de esta región. Revisa tu sesión antes de reintentar.',
  unavailable: 'El servicio de lectura no pudo completar esta región. Puedes reintentarla.',
  generic: 'El servicio de lectura no pudo analizar esta región. No podemos evaluar su legibilidad.',
};
for (const [index, error] of values.entries()) for (const online of [false, true]) check('Safe failure contract ' + index + ' online=' + online, () => {
  const expected = !online ? messages.offline : error instanceof TypeError ? messages.transport
    : error instanceof EdgeFunctionError && error.status === 429 ? messages.limited
      : error instanceof EdgeFunctionError && [401, 403].includes(error.status) ? messages.auth
        : error instanceof EdgeFunctionError && ([408, 425].includes(error.status) || error.status >= 500) ? messages.unavailable : messages.generic;
  assert.equal(regionAnalysisErrorMessage(error, online), expected);
  assert.ok(!regionAnalysisErrorMessage(error, online).includes(internal));
});
for (const name of ['startScan', 'enrichCandidate', 'reanalyzeSelected', 'cancelScan', 'resetScan', 'confirmBatch', 'identifySelectedManually', 'discardSelected']) check('Unchanged source function ' + name, () => assert.equal(current.get(name), previous.get(name)));
check('Region network pipeline changes only safe error assignment', () => assert.equal(
  current.get('analyzeRegion')!.replace('error: regionAnalysisErrorMessage(error, navigator.onLine)', "error: error instanceof Error ? error.message : 'No se pudo analizar la región'"), previous.get('analyzeRegion'),
));
for (const name of ['selectCandidate', 'confirmSelectedCandidate', 'editCandidate']) {
  check(name + ' updater changes only clearing error/fallback', () => assert.equal(current.get(name)!.replace(/\n\s+error: null,\n\s+fallback: null,/, ''), previous.get(name)));
  for (const loading of [false, true]) check(name + ' explicit correction clears stale failure only when permitted, loading=' + loading, () => {
    const candidate = { id: 'qa-candidate', name: 'Synthetic guarded reference', confidence: 0.61, source: 'label', uncertaintyReasons: ['Synthetic ambiguity'], evidence: [], canonicalId: null, sensoryAttributes: null, affinity: null, affinityConfidence: null, affinityReason: null };
    const region = { id: 'qa-region', status: 'unrecognized', candidates: [candidate], selectedCandidateId: candidate.id, error: 'Old failed attempt', fallback: { code: 'unknown' } };
    let updated: typeof region | null = null;
    runInNewContext(ts.transpile('const handler=' + current.get(name) + ';handler(argument);', { target: ts.ScriptTarget.ES2020 }), {
      loading, batchRef: { current: null }, selectedRegion: region, selectedCandidate: candidate,
      argument: name === 'editCandidate' ? { name: 'Synthetic corrected reference' } : candidate.id,
      updateRegion: (_id: string, updater: (value: typeof region) => typeof region) => { updated = updater(region); },
      toast: { success() {} }, determineRegionStatus, confirmWineCandidateIdentity, correctWineCandidateIdentity,
    });
    if (loading) assert.equal(updated, null);
    else { assert.ok(updated); assert.equal(updated.error, null); assert.equal(updated.fallback, null); }
  });
}
const prior = JSON.parse(readFileSync('docs/qa-evidence/matchrim-region-edit-lock-2026-10-13/source-stages.json', 'utf8')) as { protectedSources: Array<{ path: string }> };
const protectedPaths = prior.protectedSources.map(row => row.path).sort();
for (const protectedPath of protectedPaths) check('Protected source ' + protectedPath, () => assert.equal(readFileSync(protectedPath, 'utf8'), execFileSync('git', ['show', baseline + ':' + protectedPath], { encoding: 'utf8' })));
const hashes = Object.fromEntries([path, 'src/utils/regionAnalysisError.ts', 'scripts/check-matchrim-region-failure-oct13.ts', ...protectedPaths].map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
writeFileSync(output, JSON.stringify({ baseline, scope: 'Typed safe errors, actual source updater recovery, protected function bodies and source bytes; synthetic controls not wine/user data.', checks, messages, protectedPaths, hashes }, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter(check => check.passed).length, total: checks.length, protectedSources: protectedPaths.length, failures: checks.filter(check => !check.passed) }));
if (checks.some(check => !check.passed)) process.exitCode = 1;
