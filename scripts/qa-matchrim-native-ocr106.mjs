import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const repo = process.cwd(), output = path.resolve(process.argv[2]);
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const device = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127';
const framework = path.resolve(process.argv[3] || 'qa-artifacts/recovery104-20261021/uikit101-r2/build/derived/Build/Products/Debug-iphonesimulator/App.app/Frameworks');
const corpusStart = process.argv[4] ? Number(process.argv[4]) : null;
const corpusCount = process.argv[5] ? Number(process.argv[5]) : null;
if (corpusStart !== null) assert(Number.isSafeInteger(corpusStart) && corpusStart >= 1
  && Number.isSafeInteger(corpusCount) && corpusCount >= 1 && corpusCount <= 20 && corpusStart + corpusCount - 1 <= 200,
  'Corpus mode requires a neutral 1-based start and at most20 preserved images');
const modules = ['Capacitor', 'CapacitorCordova'].map(name => path.resolve(framework, '../..', name));
const env = { ...process.env, DEVELOPER_DIR: developer };
const sha = value => createHash('sha256').update(value).digest('hex');
const guard = () => {
  const { leases } = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json'));
  for (const [resource, name] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID']]) {
    const lease = leases[resource];
    assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && lease.leaseId === env[name] && lease.reviewAfter * 1000 > Date.now(), resource);
  }
  const disk = fs.statfsSync(path.dirname(output)); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
guard(); assert(!fs.existsSync(output)); fs.mkdirSync(output, { mode: 0o700 });
const receipt = { startedUTC: new Date().toISOString(), scope: 'Real Apple Vision in iOS simulator through actual CAPPluginCall, not WebView integration or physical iPhone.',
  modelStarts: 0, networkCalls: 0, fixtureDictionary: false, framework, device, stages: [],
  corpusStart, corpusCount, expectedNamesGivenToOCR: false, runnerSHA256: sha(fs.readFileSync(import.meta.filename)) };
const files = ['ios/App/App/MatchrimOCRPlugin106.swift', 'scripts/MatchrimOCR106Probe.swift'];
receipt.sourceSHA256 = Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(file))]));
const execute = (label, binary, args, options = {}) => {
  guard(); const result = spawnSync(binary, args, { env, encoding: 'utf8', timeout: 120000, maxBuffer: 2 * 1024 ** 2, ...options });
  fs.writeFileSync(path.join(output, label + '.stdout'), result.stdout || '', { mode: 0o600 });
  fs.writeFileSync(path.join(output, label + '.stderr'), result.stderr || '', { mode: 0o600 });
  receipt.stages.push({ label, status: result.status, error: result.error?.message });
  assert.equal(result.status, 0, `${label}: ${result.error?.message || (result.stderr || '').slice(-2000)}`); return result.stdout;
};
try {
  const sdk = execFileSync('/usr/bin/xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'], { env, encoding: 'utf8' }).trim();
  const binary = path.join(output, 'ocr106-probe');
  const swift = execFileSync('/usr/bin/xcrun', ['--find', 'swiftc'], { env, encoding: 'utf8' }).trim();
  execute('compile', swift, ['-parse-as-library', '-sdk', sdk, '-target', 'arm64-apple-ios16.0-simulator',
    ...modules.flatMap(dir => ['-F', dir]), '-framework', 'Capacitor', '-Xlinker', '-rpath', '-Xlinker', framework,
    ...files.map(file => path.join(repo, file)), '-o', binary]);
  const devices = JSON.parse(execFileSync('/usr/bin/xcrun', ['simctl', 'list', 'devices', '--json'], { env, encoding: 'utf8' })).devices;
  const selected = Object.values(devices).flat().find(row => row.udid === device); assert(selected?.isAvailable);
  if (selected.state === 'Shutdown') {
    execute('boot', '/usr/bin/xcrun', ['simctl', 'boot', device]);
    execute('bootstatus', '/usr/bin/xcrun', ['simctl', 'bootstatus', device, '-b']);
  }
  let inputs;
  if (corpusStart !== null) {
    const manifest = JSON.parse(fs.readFileSync('qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/REPORT.json'));
    assert.equal(manifest.expectedNamesGivenToOCR, false); assert.equal(manifest.prepared.length, 200);
    inputs = manifest.prepared.slice(corpusStart - 1, corpusStart - 1 + corpusCount).map(item => {
      const file = path.resolve('qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared', item.imageId + '.jpg');
      assert(/^img-\d{3}$/.test(item.imageId)); assert.equal(sha(fs.readFileSync(file)), item.sha256); return file;
    });
  } else inputs = ['img-184.jpg', 'img-061.jpg', 'img-174.jpg'].map(file =>
    path.resolve('qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared', file));
  receipt.inputs = Object.fromEntries(inputs.map(file => [path.basename(file), sha(fs.readFileSync(file))]));
  const raw = execute('recognize', '/usr/bin/xcrun', ['simctl', 'spawn', device, binary, ...inputs],
    { timeout: Math.max(120000, inputs.length * 25000 + 30000), maxBuffer: 16 * 1024 ** 2 });
  const data = JSON.parse(raw.trim()); fs.writeFileSync(output + '/OCR.json', JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  receipt.outputsSHA256 = Object.fromEntries(['OCR.json', 'recognize.stdout'].map(file =>
    [file, sha(fs.readFileSync(path.join(output, file)))]));
  const images = data.results.filter(row => row.file); assert.equal(images.length, inputs.length);
  for (const image of images) {
    assert.equal(image.settlements, 1); assert.equal(image.response.ok, true);
    const result = image.response.data; assert.equal(result.source, 'apple-vision-device');
    assert.equal(result.requestId, image.requestId); assert.deepEqual(result.customWords, []);
    assert(result.lines.length <= 100 && (corpusStart !== null || result.lines.length > 0));
    assert(result.width <= 2400 && result.height <= 2400);
    for (const line of result.lines) {
      assert(line.text.length > 0 && line.text.length <= 1000);
      assert(line.confidence >= 0 && line.confidence <= 1);
      const b = line.box; assert(b.x >= 0 && b.y >= 0 && b.width > 0 && b.height > 0 && b.x + b.width <= 1.001 && b.y + b.height <= 1.001);
    }
  }
  for (const [name, code] of [['invalid-id', 'INVALID_REQUEST_ID'], ['invalid-base64', 'INVALID_BASE64'], ['wrong-signature', 'IMAGE_TYPE_MISMATCH']]) {
    const item = data.results.find(row => row.case === name); assert.equal(item.response.code, code); assert.equal(item.settlements, 1);
  }
  assert.equal(data.results.find(row => row.case === 'busy').result.response.code, 'BUSY');
  assert.equal(data.results.find(row => row.case === 'cancel').result.response.code, 'CANCELLED');
  assert.equal(data.results.find(row => row.case === 'late-settlement').count, 1);
  for (const file of files) assert.equal(sha(fs.readFileSync(file)), receipt.sourceSHA256[file]);
  assert.equal(sha(fs.readFileSync(import.meta.filename)), receipt.runnerSHA256, 'RUNNER_CHANGED_DURING_EXECUTION');
  receipt.passed = true;
  receipt.metrics = images.map(image => ({ file: image.file, lines: image.response.data.lines.length, totalMs: image.response.data.totalMs }));
} catch (error) { receipt.passed = false; receipt.error = String(error.stack || error); }
receipt.finishedUTC = new Date().toISOString();
fs.writeFileSync(output + '/RESULT.json', JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
