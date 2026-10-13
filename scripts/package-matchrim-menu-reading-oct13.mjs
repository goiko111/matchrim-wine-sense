import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const input = process.argv[2];
if (!input) throw Error('Pass13 artifact directory');
const output = 'docs/qa-evidence/matchrim-menu-reading-2026-10-13', baseline = 'c5c7b283ba860251af36b5eefe6d4120e648b2f0';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path => { const result = spawnSync('git', ['show', baseline + ':' + path]); return result.status === 0 ? result.stdout : null; };
mkdirSync(output, { recursive: true });
for (const name of ['before', 'checkpoint13.md']) cpSync(join(input, name), join(output, name), { recursive: true });
const scripts = ['scripts/qa-matchrim-menu-reading-oct13.py', 'scripts/package-matchrim-menu-reading-oct13.mjs'];
const protectedPaths = [
  'src/components/wine-import/WineMenuScanner.tsx',
  'src/components/AccountNotifications.tsx', 'src/components/ui/sonner.tsx', 'src/components/ui/drawer.tsx',
  'src/utils/aiRimContextGuide.ts', 'src/components/AiRimContextGuide.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx',
  'src/utils/menuAffinityPresentation.ts', 'src/utils/menuWineSave.ts', 'src/utils/menuWineActions.ts',
  'src/utils/scanProfile.ts', 'src/services/matchrimScanProfile.ts', 'src/utils/menuProfileRecovery.ts',
  'src/utils/scanWineEvidence.ts', 'src/utils/scanConfidence.ts', 'src/utils/multiWineScan.ts',
  'src/utils/wineAffinityExplanation.ts', 'src/utils/matchrimLearning.ts', 'src/contexts/AuthContext.tsx',
  'src/pages/MyWines.tsx', 'src/utils/wineMenuScan.ts', 'src/utils/wineComparison.ts', 'src/components/AffinityExplanation.tsx',
  'supabase/functions/_shared/matchrim-scan-values.ts', 'src/services/winerimApi.ts',
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
for (const name of ['matchrim-menu-save-2026-10-12', 'matchrim-menu-actions-2026-10-12', 'matchrim-affinity-status-2026-10-12', 'matchrim-profile-retry-2026-10-13', 'matchrim-airim-provenance-2026-10-13', 'matchrim-menu-notice-2026-10-13', 'matchrim-menu-focus-2026-10-13', 'matchrim-menu-navigation-2026-10-13']) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path);
  if (hash(bytes) !== hash(prior(path))) throw Error('Protected manifest drift: ' + name);
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) if (hash(readFileSync(join(dirname(path), entry.path))) !== entry.sha256) throw Error('Protected evidence drift: ' + entry.path);
  protectedEvidence.push({ name, sha256: hash(bytes), entries: manifest.entries.length, unchanged: true });
}
const receipt = JSON.parse(readFileSync(join(output, 'before/input-provenance.json'))), result = JSON.parse(readFileSync(join(output, 'before/results.json')));
for (const [path, expected] of Object.entries(receipt.hashes)) if (hash(readFileSync(path)) !== expected) throw Error('Reading fixture/source-stage drift: ' + path);
if (result.results.length !== 4 || result.results.some(r => !r.passed || r.checks.some(c => !c.passed) || r.counters.ocr !== 3 || r.counters.canonical !== 2 || r.counters.base !== 1 || r.errors.length || r.console.length)) throw Error('Reading13 QA mismatch');
const primary = result.results.map(r => ({ case: r.case, trigger: r.observations.trigger, inputMethod: r.case.startsWith('row') ? 'Tab+Enter' : 'Tab+Space',
  initialAX: r.observations.initialAX, notApplicable: r.observations.notApplicable ?? [],
  readings: r.observations.readings.map(reading => ({ state: reading.state, index: reading.initial.index, title: reading.initial.title, initialBody: reading.initial.body, finalBody: reading.bottomViaPages.body, document: reading.bottomViaPages.document, fragment: reading.bottomViaPages.fragment, ax: reading.ax })),
  shiftExit: r.observations.shiftExit.active, tabExit: r.observations.tabExit.active, change: r.observations.change, returnedEscape: r.observations.escaped.exact, returnedClose: r.observations.closed.exact, counters: r.counters,
}));
const checks = result.results.flatMap(r => r.checks);
writeFileSync(join(output, 'source-stages.json'), JSON.stringify({ baseline, productCodeChanged: false, stages, protectedEvidence, scannerBeforeAfterSha256: receipt.hashes['src/components/wine-import/WineMenuScanner.tsx'], note: 'Baseline13 native reading passed. No product edits, synthetic after-fix run, old green reruns, frontend lint/typecheck or build. Before/after screenshots mean initial vs native-key scrolled state on same code, not code remediation. AX generic empty name recorded, not certified reader defect.' }, null, 2) + '\n');
writeFileSync(join(output, 'verification.json'), JSON.stringify({ productCodeChanged: false, newLocalUI: { contexts: 4, checks: checks.length, passed: checks.filter(c => c.passed).length, exitCode: 0 }, frontendLint: 'not rerun: product unchanged', frontendTypecheck: 'not rerun: product unchanged', fullSuites: false, webBuild: false, nativeBuild: false }, null, 2) + '\n');
writeFileSync(join(output, 'primary.json'), JSON.stringify({ scope: 'Only13 four actual native-key reading routes / one existing scene, two reading states each. No fake focus/scroll assignments/wheel/scrollIntoView/text/DOM handler injection. All8 states overflow, no N-A exercised. Not people/groundtruth/native/VoiceOver. Product unchanged after passing baseline.', contexts: 4, contextsPassed: 4, checks: checks.length, checksPassed: checks.filter(c => c.passed).length, readingStates: primary.reduce((sum, r) => sum + r.readings.length, 0), notApplicable: primary.flatMap(r => r.notApplicable).length, cases: primary, realRemoteAppCalls: 0, paidCalls: 0, realWrites: 0, realAccounts: 0 }, null, 2) + '\n');
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length;
writeFileSync(join(output, 'manifest.json'), JSON.stringify({ entries, captures }, null, 2) + '\n');
console.log(JSON.stringify({ contexts: 4, checks: checks.length, readingStates: primary.reduce((sum, r) => sum + r.readings.length, 0), productCodeChanged: false, entries: entries.length, captures, sources: stages.length, protectedSources: protectedPaths.length, protectedEvidence: protectedEvidence.reduce((sum, e) => sum + e.entries, 0) }));
