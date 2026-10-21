import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { checkLeases, verifyArtifact } from './qa-matchrim-account114.mjs';

const repo = process.cwd(), base = path.join(repo, 'qa-artifacts/night105-20261021');
const prep = JSON.parse(fs.readFileSync(path.resolve(process.argv[2], 'preparation.json')));
const app = path.resolve(process.argv[3]), output = path.resolve(process.argv[4]);
assert(path.dirname(output) === base && /^media134-[\w-]+$/.test(path.basename(output)) && !fs.existsSync(output));
const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/KEY|AUTH|TOKEN|PASSWORD|SECRET|CREDENTIAL/i.test(key))),
  DEVELOPER_DIR: '/Applications/Xcode-26.0.1.app/Contents/Developer' };
const hash = value => createHash('sha256').update(value).digest('hex');
const probe = 'scripts/MatchrimMedia134Probe.swift', probeHash = hash(fs.readFileSync(probe));
const guard = () => {
  checkLeases(JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases, env);
  const disk = fs.statfsSync(base); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3);
  verifyArtifact({ repo, prep, app }); assert(hash(fs.readFileSync(probe)) === probeHash);
};
guard(); fs.mkdirSync(output, { mode: 0o700 });
const receipt = { startedUTC: new Date().toISOString(), sourceCommit: prep.commit, probeHash,
  scope: 'Inspect native Photos sorting menu and select date-added ordering in the dedicated QA simulator. No media selection/import, OCR, authentication, data save, rating, quiz or model call controls. Only the picker ordering preference changes.', passed: false };
const project = output + '/project', old = path.join(repo, 'qa-artifacts/native99-20261021/native-audit-project');
fs.mkdirSync(project, { mode: 0o700 });
fs.cpSync(old + '/Probe97.xcodeproj', project + '/Probe97.xcodeproj', { recursive: true });
const original = JSON.parse(fs.readFileSync(old + '/Probe97.xctestplan'));
assert(original.testTargets.length === 1);
const method = 'MatchrimMedia134Tests/testInspectPickerOrder134';
const plan = { version: 1, configurations: [{ id: randomUUID(), name: 'Media134Once', options: {} }],
  defaultOptions: { testTimeoutsEnabled: true, defaultTestExecutionTimeAllowance: 90, maximumTestExecutionTimeAllowance: 90,
    testRepetitionMode: 'fixedIterations', maximumTestRepetitions: 1, testRepetitionRelaunchEnabled: false },
  testTargets: [{ target: original.testTargets[0].target, parallelizable: false, selectedTests: [method] }] };
fs.writeFileSync(project + '/Probe97.xctestplan', JSON.stringify(plan), { mode: 0o600 });
fs.writeFileSync(project + '/AutomationModeProbe.swift', fs.readFileSync(probe), { mode: 0o600 });
const args = ['test', '-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-testPlan', 'Probe97',
  '-only-test-configuration', 'Media134Once', '-only-testing:' + plan.testTargets[0].target.name + '/' + method,
  '-destination', 'id=B18822EF-BFBD-4A6A-89B2-33539BDE4127', '-derivedDataPath', output + '/derived',
  '-resultBundlePath', output + '/result.xcresult', '-collect-test-diagnostics', 'never', '-parallel-testing-enabled', 'NO',
  '-disableAutomaticPackageResolution', '-skipPackageUpdates', '-jobs', '1', 'CODE_SIGNING_ALLOWED=NO',
  'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa134.media.uitests', 'ONLY_ACTIVE_ARCH=YES'];
const fd = fs.openSync(output + '/runtime.log', 'wx', 0o600);
const child = spawn(env.DEVELOPER_DIR + '/usr/bin/xcodebuild', args, { env, stdio: ['ignore', fd, fd] });
let stopped = false;
const stop = () => { if (stopped) return; stopped = true; child.kill('SIGINT');
  setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 5000).unref(); };
const timer = setTimeout(stop, 150000), watch = setInterval(() => { try { guard(); } catch { stop(); } }, 2000);
try {
  receipt.result = await new Promise(resolve => { child.once('error', () => resolve({ code: null, spawnError: true })); child.once('close', (code, signal) => resolve({ code, signal })); });
  guard();
  const log = fs.readFileSync(output + '/runtime.log', 'utf8');
  assert(!stopped && receipt.result.code === 0 && !receipt.result.signal && !receipt.result.spawnError);
  assert(log.split('\n').filter(line => line === 'MEDIA134_SORT_MENU_INSPECTED_NO_IMAGE_SELECTED').length === 1);
  assert(/Executed 1 test, with 0 failures/.test(log)); receipt.passed = true;
} catch { receipt.reason = 'MEDIA_MENU_NOT_PROVEN'; }
finally {
  clearTimeout(timer); clearInterval(watch); fs.closeSync(fd);
  if (fs.existsSync(output + '/result.xcresult')) {
    try { guard(); execFileSync('/usr/bin/xcrun', ['xcresulttool', 'export', 'attachments', '--path', output + '/result.xcresult', '--output-path', output + '/attachments'], { env, stdio: 'ignore' }); }
    catch { receipt.passed = false; receipt.reason = 'ATTACHMENT_OR_RESOURCE_HOLD'; }
  }
  receipt.finishedUTC = new Date().toISOString(); fs.writeFileSync(output + '/RESULT.json', JSON.stringify(receipt, null, 2), { mode: 0o600 });
}
console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
