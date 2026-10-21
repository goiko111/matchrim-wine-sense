/* global nativePreparation */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { chromium } from '/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const repo = process.cwd();
const output = path.resolve(process.argv[2]);
const prior = path.join(repo, 'qa-artifacts/continuation97-20261020/local-ocr-A');
const matrixFile = path.join(repo, 'qa-artifacts/native99-20261021/corpus200-matrix/MATRIX.json');
const owner = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const leaseFile = '/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json';
const leaseId = process.env.MATCHRIM100_HEAVY_LEASE_ID;
const gate = () => {
  const lease = JSON.parse(fs.readFileSync(leaseFile)).leases['heavy-local'];
  assert(lease?.owner === owner && lease.leaseId === leaseId && lease.reviewAfter * 1000 > Date.now() + 10000, 'OWN_HEAVY_LEASE_REQUIRED');
  const disk = fs.statfsSync(output);
  assert(Number(disk.bavail) * Number(disk.bsize) >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
  return lease;
};
assert(output.startsWith(path.join(repo, 'qa-artifacts/')) && !fs.existsSync(output), 'FRESH_OWN_OUTPUT_REQUIRED');
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
gate();
for (const dir of ['prepared', 'raw', 'module-cache', 'home', 'tmp']) fs.mkdirSync(path.join(output, dir), { mode: 0o700 });
const write = (name, value) => fs.writeFileSync(path.join(output, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const sourceFiles = ['src/utils/imageAnalysis.ts', 'src/utils/imageCropGeometry.ts', 'scripts/benchmark-matchrim-ocr100.swift'];
const sourceHashes = Object.fromEntries(sourceFiles.map(file => [file, sha(fs.readFileSync(file))]));
const inputsBytes = fs.readFileSync(path.join(prior, 'INPUTS.json'));
const inputs = JSON.parse(inputsBytes).inputs;
assert.equal(inputs.length, 200);
const historicalRoot = '/Users/GOIKO/Library/Mobile Documents/com~apple~CloudDocs/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim83-fixes-20261014/dataset-200/extracted';
const residentRoot = fs.realpathSync(historicalRoot);
assert.equal(residentRoot, '/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim83-fixes-20261014/dataset-200/extracted');
const budgetFile = path.join(repo, 'qa-artifacts/native99-20261021/pilot-reconciliation/RECONCILIATION.json');
const budgetSHA = sha(fs.readFileSync(budgetFile));
const report = { startedUTC: new Date().toISOString(), sourceHashes, inputManifestSHA256: sha(inputsBytes),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  owner, leaseId, scope: 'Local Apple Vision on actual native-prepared JPEG pixels; NOT Matchrim/OpenAI recognition or a canonical identity benchmark',
  publicWebChanged: false, paidCalls: 0, productionWrites: 0, expectedNamesGivenToOCR: false,
  originalFilesChanged: false, nativeFramesMayDifferFromRawPrimaryFrame: true,
  unexpectedRequests: [], pageErrors: [], consoleErrors: [], prepared: [], passed: false };
const bundle = buildSync({ entryPoints: ['src/utils/imageAnalysis.ts'], bundle: true, write: false, format: 'iife',
  globalName: 'nativePreparation', platform: 'browser', target: 'es2022' }).outputFiles[0].text;
write('preparation.bundle.js', bundle);
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  proxy: { server: 'http://127.0.0.1:9' }, args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--host-resolver-rules=MAP * ~NOTFOUND'] });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => { report.unexpectedRequests.push(route.request().url()); return route.abort(); });
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') report.consoleErrors.push(event.text()); });
  await page.addScriptTag({ content: bundle });
  for (const input of inputs) {
    gate();
    assert(input.path.startsWith(historicalRoot + '/'));
    const resident = fs.realpathSync(input.path);
    assert(resident.startsWith(residentRoot + '/') && resident === path.join(residentRoot, path.relative(historicalRoot, input.path)), 'EXACT_ROOT_RELOCATION_ONLY');
    const stat = fs.lstatSync(resident);
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.blocks > 0 && stat.size === input.bytes, 'RESIDENT_ORIGINAL_REQUIRED');
    const bytes = fs.readFileSync(resident); assert.equal(sha(bytes), input.sha256);
    const mime = bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg' : 'image/png';
    const prepared = await page.evaluate(async ({ base64, mime }) => {
      const file = new File([Uint8Array.from(atob(base64), value => value.charCodeAt(0))], 'label', { type: mime });
      const result = await nativePreparation.prepareImageForAnalysis(file, 2400, undefined, nativePreparation.NATIVE_IMAGE_PREPARATION_LIMITS);
      return { ...result, rejected: nativePreparation.shouldRejectTextAnalysis(result.quality) };
    }, { base64: bytes.toString('base64'), mime });
    const jpeg = Buffer.from(prepared.dataUrl.split(',')[1], 'base64');
    const target = path.join(output, 'prepared', `${input.imageId}.jpg`);
    fs.writeFileSync(target, jpeg, { flag: 'wx', mode: 0o600 });
    report.prepared.push({ imageId: input.imageId, path: target, sha256: sha(jpeg), sourceSHA256: input.sha256,
      originalHistoricalPath: input.path, originalResidentPath: resident,
      width: prepared.width, height: prepared.height, quality: prepared.quality, rejected: prepared.rejected });
  }
  await context.close();
} finally { await browser.close(); report.browserClosed = true; }
assert.equal(report.unexpectedRequests.length + report.pageErrors.length + report.consoleErrors.length, 0);
const lease = gate();
const config = { inputs: report.prepared.map(({ imageId, path, sha256, sourceSHA256 }) => ({ imageId, path, sha256, sourceSHA256 })),
  output, owner, leaseId, stopEpoch: Math.min(lease.reviewAfter - 15, Date.now() / 1000 + 180) };
write('OCR-INPUTS.json', config);
const sandbox = `(version 1)\n(allow default)\n(deny network*)\n(deny file-write*)\n(allow file-write* (subpath ${JSON.stringify(output)}))\n(allow file-write* (literal "/dev/null"))\n`;
write('offline.sb', sandbox);
const xcode = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const env = { ...process.env, HOME: path.join(output, 'home'), CFFIXED_USER_HOME: path.join(output, 'home'), TMPDIR: path.join(output, 'tmp'), DEVELOPER_DIR: xcode };
const run = (command, args, name, timeout) => {
  gate();
  const stdout = fs.openSync(path.join(output, `${name}.stdout.log`), 'wx', 0o600), stderr = fs.openSync(path.join(output, `${name}.stderr.log`), 'wx', 0o600);
  try { execFileSync('/usr/bin/sandbox-exec', ['-f', path.join(output, 'offline.sb'), command, ...args], { env, stdio: ['ignore', stdout, stderr], timeout }); }
  finally { fs.closeSync(stdout); fs.closeSync(stderr); }
};
run(path.join(xcode, 'Toolchains/XcodeDefault.xctoolchain/usr/bin/swiftc'), ['-swift-version', '5', '-O', '-sdk', path.join(xcode, 'Platforms/MacOSX.platform/Developer/SDKs/MacOSX26.0.sdk'),
  '-module-cache-path', path.join(output, 'module-cache'), 'scripts/benchmark-matchrim-ocr100.swift', '-o', path.join(output, 'local-ocr')], 'compile', 90000);
run(path.join(output, 'local-ocr'), [path.join(output, 'OCR-INPUTS.json')], 'ocr', 180000);
// Ground truth enters only after all image preparation and OCR have finished.
const matrix = JSON.parse(fs.readFileSync(matrixFile));
const { compare, metrics, selfTest } = await import(path.join(prior, 'compare.mjs'));
assert(selfTest().passed);
const rows = inputs.map(input => JSON.parse(fs.readFileSync(path.join(output, 'raw', `${input.imageId}.json`))));
const comparisons = rows.map(row => {
  const expected = matrix.rows.find(item => item.imageId === row.imageId).expectedEvaluationOnly;
  assert.equal(row.sourceSHA256, expected.imageSHA256);
  return compare(row, { name: expected.name, producer: expected.winery, sourceId: expected.MantalakID });
});
const baseline = JSON.parse(fs.readFileSync(path.join(prior, 'ALL200-COMPARISON-r2.json')));
report.metrics = metrics(rows, comparisons, 200);
report.baselineMetrics = baseline.metrics;
report.changed = comparisons.map(row => {
  const old = baseline.rows.find(item => item.imageId === row.imageId);
  return { imageId: row.imageId, nameBefore: old.name.foldedExactPhrase, nameAfter: row.name.foldedExactPhrase,
    wineryBefore: old.winery.foldedExactPhrase, wineryAfter: row.winery.foldedExactPhrase };
}).filter(row => row.nameBefore !== row.nameAfter || row.wineryBefore !== row.wineryAfter);
write('COMPARISON.json', { rows: comparisons, metrics: report.metrics, canonicalIdentityPrecision: null, canonicalIdentityRecall: null });
for (const [file, hash] of Object.entries(sourceHashes)) assert.equal(sha(fs.readFileSync(file)), hash);
for (const input of inputs) assert.equal(sha(fs.readFileSync(input.path)), input.sha256);
assert.equal(sha(fs.readFileSync(budgetFile)), budgetSHA);
report.budgetUnchanged = true; report.budgetSHA256 = budgetSHA;
report.finishedUTC = new Date().toISOString(); report.passed = true;
write('REPORT.json', report);
console.log(JSON.stringify({ passed: true, completed: rows.length, metrics: report.metrics, before: report.baselineMetrics, output, paidCalls: 0 }));
