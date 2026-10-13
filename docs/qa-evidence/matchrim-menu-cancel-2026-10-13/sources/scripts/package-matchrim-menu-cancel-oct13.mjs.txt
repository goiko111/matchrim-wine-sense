import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const input = process.argv[2];
if (!input) throw Error('Pass14 artifact directory');
const output = 'docs/qa-evidence/matchrim-menu-cancel-2026-10-13', baseline = '1f33843e3998258f0312ce315c8809a38e1ec829';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path => { const result = spawnSync('git', ['show', baseline + ':' + path]); return result.status === 0 ? result.stdout : null; };
mkdirSync(output, { recursive: true });
for (const name of ['before', 'checkpoint14.md']) cpSync(join(input, name), join(output, name), { recursive: true });
const scripts = ['scripts/qa-matchrim-menu-cancel-oct13.py', 'scripts/package-matchrim-menu-cancel-oct13.mjs'];
const protectedPaths = [
  'src/components/wine-import/WineMenuScanner.tsx',
  'src/components/AccountNotifications.tsx', 'src/components/ui/sonner.tsx', 'src/components/ui/drawer.tsx',
  'src/utils/aiRimContextGuide.ts', 'src/components/AiRimContextGuide.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx',
  'src/utils/menuAffinityPresentation.ts', 'src/utils/menuWineSave.ts', 'src/utils/menuWineActions.ts',
  'src/utils/scanProfile.ts', 'src/services/matchrimScanProfile.ts', 'src/utils/menuProfileRecovery.ts',
  'src/utils/scanWineEvidence.ts', 'src/utils/scanConfidence.ts', 'src/utils/multiWineScan.ts',
  'src/utils/wineAffinityExplanation.ts', 'src/utils/matchrimLearning.ts', 'src/contexts/AuthContext.tsx',
  'src/pages/MyWines.tsx', 'src/utils/wineMenuScan.ts', 'src/utils/wineComparison.ts', 'src/components/AffinityExplanation.tsx',
  'supabase/functions/_shared/matchrim-scan-values.ts', 'src/services/winerimApi.ts', 'src/utils/invokeEdgeFunction.ts',
];
const stages = [];
for (const path of [...scripts, ...protectedPaths]) {
  const current = readFileSync(path), old = prior(path);
  if (protectedPaths.includes(path) && (!old || hash(current) !== hash(old))) throw Error('Product drift despite passing baseline: ' + path);
  const destination = join(output, 'sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, current);
  if (old) { const before = join(output, 'baseline-sources', path + '.txt'); mkdirSync(dirname(before), { recursive: true }); writeFileSync(before, old); }
  stages.push({ path, before: old ? hash(old) : null, after: hash(current), protected: protectedPaths.includes(path) });
}
const protectedEvidence = [];
for (const name of ['matchrim-menu-save-2026-10-12', 'matchrim-menu-actions-2026-10-12', 'matchrim-affinity-status-2026-10-12', 'matchrim-profile-retry-2026-10-13', 'matchrim-airim-provenance-2026-10-13', 'matchrim-menu-notice-2026-10-13', 'matchrim-menu-focus-2026-10-13', 'matchrim-menu-navigation-2026-10-13', 'matchrim-menu-reading-2026-10-13']) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path);
  if (hash(bytes) !== hash(prior(path))) throw Error('Protected manifest drift: ' + name);
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) if (hash(readFileSync(join(dirname(path), entry.path))) !== entry.sha256) throw Error('Protected evidence drift: ' + entry.path);
  protectedEvidence.push({ name, sha256: hash(bytes), entries: manifest.entries.length, unchanged: true });
}
const receipt = JSON.parse(readFileSync(join(output, 'before/input-provenance.json'))), result = JSON.parse(readFileSync(join(output, 'before/results.json')));
for (const [path, expected] of Object.entries(receipt.hashes)) if (hash(readFileSync(path)) !== expected) throw Error('Cancel fixture/source-stage drift: ' + path);
if (result.results.length !== 4 || result.results.some(r => !r.passed || r.checks.some(c => !c.passed) || r.errors.length || r.console.length || JSON.stringify(r.countsByAttempt) !== JSON.stringify({ 1: { ocr: 1, canonical: 0, base: 1 }, 2: { ocr: 3, canonical: 2, base: 1 } }))) throw Error('Cancel14 QA/count mismatch');
const primary = result.results.map(r => ({ case: r.case, releaseKind: r.releaseKind, controlsAfterCancel: r.observations.cancelled.buttons,
  chooserBefore: r.observations.chooserBefore, selections: r.observations.selections, selectionEvents: r.observations.selectionEvents,
  abortedRequest: r.requestFailures, releases: r.releases, oldReleaseUI: r.observations.afterOldRelease,
  finalRows: r.observations.completed.rows, countsByAttempt: r.countsByAttempt,
}));
const prior13 = 'docs/qa-evidence/matchrim-menu-reading-2026-10-13/before/results.json';
const readings = JSON.parse(readFileSync(prior13)).results;
const axAddendum = {
  source: prior13, sourceSha256: hash(readFileSync(prior13)), rerun: false, correctedInterpretation: 'Initial before body focus names empty; focused body names contain computed existing content in all8 readings. Generic/absence of explicit label is not universally empty name or certified reader failure. Supersedes broad empty-focused-name interpretation in13 notes; immutable13 evidence preserved.',
  initial: readings.map(r => ({ case: r.case, nodes: r.observations.initialAX.nodes.map(n => ({ role: n.role, name: n.name, ignored: n.ignored })) })),
  focused: readings.flatMap(r => r.observations.readings.map(x => ({ case: r.case, state: x.state, nodes: x.ax.nodes.map(n => ({ role: n.role, name: n.name, nameLength: n.name?.length, ignored: n.ignored })) }))),
};
if (axAddendum.focused.length !== 8 || axAddendum.focused.some(r => !r.nodes.some(n => n.name))) throw Error('AX13 focused nuance mismatch');
writeFileSync(join(output, 'AX13_ADDENDUM.json'), JSON.stringify(axAddendum, null, 2) + '\n');
const driverBase = '/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim73-qa-20261007/.venv/lib/python3.12/site-packages/playwright/driver/package/lib/server';
const tooling = [['dom.js', 'playwright-dom.js.txt'], ['chromium/crPage.js', 'playwright-chromium-page.js.txt']].map(([source, name]) => {
  const path = join(driverBase, source), bytes = readFileSync(path); mkdirSync(join(output, 'installed-tooling'), { recursive: true }); writeFileSync(join(output, 'installed-tooling', name), bytes); return { source: path, snapshot: 'installed-tooling/' + name, sha256: hash(bytes) };
});
writeFileSync(join(output, 'selection-semantics.json'), JSON.stringify({ playwrightVersion: '1.55.0', API: 'UI button => standard expect_file_chooser => FileChooser.set_files(exact Path)', localPathBackend: 'ElementHandle _setInputFiles localPaths branch => Chromium DOM.setFileInputFiles', filePayloadBranchUsed: false, manualDispatchOrInputValueMutation: false, trustedEventsObserved: true, physicalCertification: false, limitation: 'Browser protocol selection can generate input/change events even when isTrustedtrue. Empty input after actual QuitarCarta => same exact path is observed, not OS/iOS chooser behavior or direct same-file reselect without clear. No camera retry/permission tested.', tooling }, null, 2) + '\n');
const checks = result.results.flatMap(r => r.checks);
writeFileSync(join(output, 'source-stages.json'), JSON.stringify({ baseline, productCodeChanged: false, stages, protectedEvidence, scannerBeforeAfterSha256: receipt.hashes['src/components/wine-import/WineMenuScanner.tsx'], note: 'Baseline14 passed, no product edit/after-fix run/oldgreen/frontend compile/lint/build. New request held while old aborted response/error route fulfilled; protocol accepted old route does not mean delivered to aborted fetch. Same file source tuple and UI reset recorded.' }, null, 2) + '\n');
writeFileSync(join(output, 'verification.json'), JSON.stringify({ productCodeChanged: false, newLocalUI: { contexts: 4, checks: checks.length, passed: checks.filter(c => c.passed).length, exitCode: 0 }, frontendLint: 'not rerun: product unchanged', frontendTypecheck: 'not rerun: product unchanged', fullSuites: false, webBuild: false, nativeBuild: false }, null, 2) + '\n');
writeFileSync(join(output, 'primary.json'), JSON.stringify({ scope: 'Only14 local pending-cancel/retry exact path on4 keyboard/touch x orientations. One existing scene/file, not people, OS/iOS chooser or vision. Physical selection/camera gates remain. Product unchanged. Initial aborted attempt1/0/1; retry3/2/1; total4/2/2, no old replay or new-request increments from late response/error.', contexts: 4, contextsPassed: 4, checks: checks.length, checksPassed: checks.filter(c => c.passed).length, physicalSameFileCertification: false, cases: primary, realRemoteAppCalls: 0, paidCalls: 0, realWrites: 0, realAccounts: 0 }, null, 2) + '\n');
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length;
writeFileSync(join(output, 'manifest.json'), JSON.stringify({ entries, captures }, null, 2) + '\n');
console.log(JSON.stringify({ contexts: 4, checks: checks.length, productCodeChanged: false, entries: entries.length, captures, sources: stages.length, protectedSources: protectedPaths.length, protectedEvidence: protectedEvidence.reduce((sum, e) => sum + e.entries, 0), ax13FocusedNonempty: axAddendum.focused.length }));
