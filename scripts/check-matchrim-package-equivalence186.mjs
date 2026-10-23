import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve('qa-artifacts/continuation186-20261023');
const output = path.join(root, 'package-equivalence-r1.json');
assert(!fs.existsSync(output), 'Never overwrite an earlier receipt');
const read = file => JSON.parse(fs.readFileSync(file));
const previous = read('qa-artifacts/continuation184-20261023/candidate107-r2/preparation.json');
const current = read(path.join(root, 'candidate107-r3/preparation.json'));
const archive = read('qa-artifacts/continuation185-20261023/archive107-r1/ARCHIVE-RESULT.json');
const hash = value => createHash('sha256').update(value).digest('hex');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const tree = dir => Object.fromEntries(walk(dir).sort().map(file =>
  [path.relative(dir, file), hash(fs.readFileSync(file))]));

for (const prep of [previous, current]) {
  assert.equal(prep.passed, true); assert.equal(prep.sourceDirty, false);
  assert.equal(prep.typecheck, 'PASS'); assert.equal(prep.build, 107);
  assert.equal(prep.publicConfiguration.fixtures, false);
  assert.equal(prep.publicConfiguration.masterConfigured, false);
  assert.equal(Object.keys(prep.webResources).length, 164);
  assert.deepEqual(tree(prep.web), prep.webResources);
  assert.deepEqual(tree(path.join(prep.production, 'ios/App/App/public')), prep.webResources);
}
assert.deepEqual(current.webResources, previous.webResources);
assert.deepEqual(current.sourceFingerprints, previous.sourceFingerprints);
for (const [file, expected] of Object.entries(current.sourceFingerprints))
  assert.equal(hash(fs.readFileSync(file)), expected, file);
const currentIos = tree(path.join(current.production, 'ios'));
assert.deepEqual(currentIos, tree(path.join(previous.production, 'ios')));
assert(archive.passed && archive.signatureVerified && !archive.uploaded && !archive.exported);
assert.equal(archive.sourceCommit, previous.commit);
const app = path.join(archive.archive, 'Products/Applications/App.app');
execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'pipe' });
for (const [file, expected] of Object.entries(current.webResources))
  assert.equal(hash(fs.readFileSync(path.join(app, 'public', file))), expected, file);
const plist = key => execFileSync('/usr/bin/plutil', ['-extract', key, 'raw', '-o', '-', path.join(app, 'Info.plist')], { encoding: 'utf8' }).trim();
assert.equal(plist('CFBundleVersion'), '107');
assert.equal(plist('CFBundleIdentifier'), 'wine.matchrim.app');
for (const file of ['src/index.css', 'supabase/functions/search-wines/index.ts'])
  assert.equal(hash(fs.readFileSync(file)), hash(execFileSync('git', ['show', 'db6a181:' + file])), file);
const receipt = {
  passed: true, checkedUTC: new Date().toISOString(), currentSource: current.commit,
  previousProductSource: previous.commit, build: 107, verifiedWebResources: 164,
  verifiedIosFiles: Object.keys(currentIos).length,
  exactProductSourceFingerprints: true, exactNativeIosInputs: true,
  exactProductionResourceBytes: true, existingArchiveSignatureReverified: true,
  existingArchive: archive.archive, archiveRebuilt: false, newUiQaExecuted: false,
  existingVisualEvidence: 'qa-artifacts/continuation185-20261023/visual107-r3/report.json',
  existingUIKitEvidence: 'qa-artifacts/continuation184-20261023/uikit107-r1/RESULT.json',
  backendPatchIncludedInBinary: false, backendPatchDeployed: false,
  releaseApproved: false, uploaded: false, externalCalls: 0,
};
fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(receipt));
