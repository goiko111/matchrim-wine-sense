import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd(), owner = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d';
const output = path.resolve(process.argv[2] ?? '');
const mode = process.argv[3] ?? 'original';
assert(['original', 'manual-region', 'manual-region-no-correction'].includes(mode), 'MODE_INVALID');
assert(output.startsWith(root + '/qa-artifacts/') && !fs.existsSync(output), 'FRESH_OUTPUT_REQUIRED');
const leaseFile = '/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json';
const gate = () => {
  const leases = JSON.parse(fs.readFileSync(leaseFile)).leases;
  for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]) {
    const lease = leases[resource];
    assert(lease?.owner === owner && lease.leaseId === process.env[key] && lease.reviewAfter > Date.now() / 1000 + 15, `OWN_LEASE_REQUIRED: ${resource}`);
  }
  const disk = fs.statfsSync(root);
  assert(Number(disk.bavail) * Number(disk.bsize) >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
  return leases['heavy-local'];
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
gate();
fs.mkdirSync(output, { mode: 0o700 });
const write = (file, value) => fs.writeFileSync(path.join(output, file), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const manifest = JSON.parse(fs.readFileSync('qa-fixtures/example207/ACCEPTANCE.json', 'utf8'));
const input = path.resolve(manifest.localCopy), bytes = fs.readFileSync(input);
assert.equal(hash(bytes), manifest.sha256); assert.equal(bytes.length, manifest.bytes);
assert.equal(manifest.externalUploadAuthorized, false);
const sources = ['scripts/qa-matchrim-example207.swift', 'scripts/qa-matchrim-example207.mjs', 'ios/App/App/MatchrimOCRPlugin106.swift'];
const sourceSHA256 = Object.fromEntries(sources.map(file => [file, hash(fs.readFileSync(file))]));
const lease = gate();
write('INPUT.json', { input, sha256: manifest.sha256, output, owner, leaseId: lease.leaseId,
  languageCorrection: mode !== 'manual-region-no-correction',
  manualRegion: mode === 'original' ? null : [.28, .44, .39, .23],
  stopEpoch: Math.min(lease.reviewAfter - 15, Date.now() / 1000 + 150) });
for (const dir of ['home', 'tmp', 'module-cache']) fs.mkdirSync(path.join(output, dir), { mode: 0o700 });
write('offline.sb', `(version 1)\n(allow default)\n(deny network*)\n(deny file-write*)\n(allow file-write* (subpath ${JSON.stringify(output)}))\n(allow file-write* (literal "/dev/null"))\n`);
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const env = { ...process.env, DEVELOPER_DIR: developer, HOME: path.join(output, 'home'), CFFIXED_USER_HOME: path.join(output, 'home'), TMPDIR: path.join(output, 'tmp') };
const report = { owner, leaseId: lease.leaseId, startedUTC: new Date().toISOString(), sourceSHA256,
  mode, manualRegionIsNotAutomaticDetection: mode !== 'original',
  sourceImageSHA256: manifest.sha256, passed: false, externalCalls: 0, networkDeniedBySandbox: true,
  iPhonePluginExecuted: false, appBuildChanged: false, canonicalIdentityValidated: false };
const run = (command, args, name, timeout) => {
  gate();
  const out = fs.openSync(path.join(output, name + '.stdout.log'), 'wx', 0o600), err = fs.openSync(path.join(output, name + '.stderr.log'), 'wx', 0o600);
  try { execFileSync('/usr/bin/sandbox-exec', ['-f', path.join(output, 'offline.sb'), command, ...args], { env, stdio: ['ignore', out, err], timeout }); }
  finally { fs.closeSync(out); fs.closeSync(err); }
};
try {
  run(developer + '/Toolchains/XcodeDefault.xctoolchain/usr/bin/swiftc', ['-swift-version', '5', '-O',
    '-sdk', developer + '/Platforms/MacOSX.platform/Developer/SDKs/MacOSX26.0.sdk',
    '-module-cache-path', path.join(output, 'module-cache'), sources[0], '-o', path.join(output, 'local-ocr')], 'compile', 90000);
  run(path.join(output, 'local-ocr'), [path.join(output, 'INPUT.json')], 'ocr', 45000);
  const raw = JSON.parse(fs.readFileSync(path.join(output, 'OCR.json'), 'utf8'));
  assert.equal(raw.source, 'apple-vision-macos'); assert.equal(raw.sourceSHA256, manifest.sha256);
  assert.equal(raw.iPhonePluginExecuted, false); assert.deepEqual(raw.customWords, []);
  assert.equal(hash(fs.readFileSync(input)), manifest.sha256);
  for (const [file, sha] of Object.entries(sourceSHA256)) assert.equal(hash(fs.readFileSync(file)), sha);
  // Human acceptance text enters evaluation only after the pixel OCR has finished.
  const fold = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const observed = fold(raw.lines.map(line => line.text).join(' '));
  report.literalChecks = manifest.humanVisualObservations.clearLiteralText.map(text => ({ text, found: observed.includes(fold(text)) }));
  report.tentativeCursiveHumanText = manifest.humanVisualObservations.tentativeCursiveText;
  report.tentativeCursiveTextConfirmed = false;
  report.actualLines = raw.lines.map(line => line.text); report.totalMs = raw.totalMs;
  report.passed = report.literalChecks.every(check => check.found);
  if (!report.passed) process.exitCode = 1;
  report.recognitionGate = 'partial-reading-only';
  report.scope = 'Pixel OCR on macOS only; not canonical matching, affinity or iPhone UI QA';
} catch (error) { report.failure = error.message; process.exitCode = 1; }
finally { report.finishedUTC = new Date().toISOString(); write('REPORT.json', report); }
console.log(JSON.stringify(report, null, 2));
