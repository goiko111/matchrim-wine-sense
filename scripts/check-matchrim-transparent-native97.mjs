/* global oldPreparation, newPreparation */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { chromium } from '/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const repo = process.cwd();
const sourceFile = 'src/utils/imageAnalysis.ts';
const baselineCommit = 'db6a1812a2e478bb15a2026403e14d6d5a5a513f';
const baseline = execFileSync('git', ['show', `${baselineCommit}:${sourceFile}`], { encoding: 'utf8' });
const current = fs.readFileSync(sourceFile, 'utf8');
const out = path.resolve(process.argv[2] ?? 'qa-artifacts/continuation97-20261020/transparent-pixels97-r1');
const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases['heavy-local'];
assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && lease.leaseId === process.env.MATCHRIM97_HEAVY_LEASE_ID && lease.reviewAfter * 1000 > Date.now());
assert(!fs.existsSync(out), 'Fresh output required'); fs.mkdirSync(out, { recursive: true, mode: 0o700 });
const sha = data => createHash('sha256').update(data).digest('hex');
const bundle = (source, globalName) => buildSync({ stdin: { contents: source, resolveDir: path.join(repo, 'src/utils'), loader: 'ts' },
  bundle: true, write: false, format: 'iife', globalName, platform: 'browser', target: 'es2022' }).outputFiles[0].text;
const oldBundle = bundle(baseline, 'oldPreparation'), newBundle = bundle(current, 'newPreparation');
const inputs = JSON.parse(fs.readFileSync('qa-artifacts/continuation97-20261020/local-ocr-A/INPUTS.json')).inputs;
const cases = ['img-063', 'img-162'].map(id => {
  const item = inputs.find(input => input.imageId === id); assert(item);
  const bytes = fs.readFileSync(item.path); assert.equal(sha(bytes), item.sha256);
  return { id, sourceSHA256: item.sha256, bytes: bytes.toString('base64') };
});
const report = { startedUTC: new Date().toISOString(), baselineCommit, baselineSHA256: sha(baseline), sourceSHA256: sha(current),
  scope: 'Real browser pixels using original transparent packshots. No live model, recognition, account, UIKit or paid requests.',
  cases: [], nativePreparation200: [], console: [], pageErrors: [], unexpectedRequests: [], passed: false };
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  proxy: { server: 'http://127.0.0.1:9' }, args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--host-resolver-rules=MAP * ~NOTFOUND'] });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => { report.unexpectedRequests.push(route.request().url()); return route.abort(); });
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('console', event => { if (['error', 'warning'].includes(event.type())) report.console.push(event.text()); });
  await page.addScriptTag({ content: oldBundle }); await page.addScriptTag({ content: newBundle });
  for (const item of cases) {
    const result = await page.evaluate(async ({ id, bytes }) => {
      const file = new File([Uint8Array.from(atob(bytes), c => c.charCodeAt(0))], 'label.png', { type: 'image/png' });
      const oldNative = await oldPreparation.prepareImageForAnalysis(file, 2400, undefined, oldPreparation.NATIVE_IMAGE_PREPARATION_LIMITS);
      const newNative = await newPreparation.prepareImageForAnalysis(file, 2400, undefined, newPreparation.NATIVE_IMAGE_PREPARATION_LIMITS);
      const oldWeb = await oldPreparation.prepareImageForAnalysis(file);
      const newWeb = await newPreparation.prepareImageForAnalysis(file);
      const pixels = async url => {
        const image = new Image(); image.src = url; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
        return { corner: [...context.getImageData(0, 0, 1, 1).data], width: canvas.width, height: canvas.height };
      };
      const original = await pixels('data:image/png;base64,' + bytes);
      const cropped = await newPreparation.cropImageRegionWithQuality(newNative.dataUrl, { x: 0, y: 0, width: 100, height: 100 }, 0);
      return { id, original, oldNative: { ...await pixels(oldNative.dataUrl), quality: oldNative.quality, image: oldNative.dataUrl },
        newNative: { ...await pixels(newNative.dataUrl), quality: newNative.quality, image: newNative.dataUrl },
        crop: await pixels(cropped.dataUrl), webByteExact: JSON.stringify(oldWeb) === JSON.stringify(newWeb) };
    }, item);
    assert.equal(result.original.corner[3], 0);
    assert.ok(result.oldNative.corner.slice(0, 3).every(value => value < 15), 'Original black matte reproduced');
    assert.ok(result.newNative.corner.slice(0, 3).every(value => value > 240), 'New native white matte');
    assert.ok(result.crop.corner.slice(0, 3).every(value => value > 240), 'Region crops retain the white backdrop');
    assert.equal(result.webByteExact, true, 'Complete legacy web result, JPEG and quality report remain byte-exact');
    assert.equal(result.oldNative.width, result.newNative.width); assert.equal(result.oldNative.height, result.newNative.height);
    for (const [name, record] of [['before', result.oldNative], ['after', result.newNative]]) {
      const image = Buffer.from(record.image.split(',')[1], 'base64');
      fs.writeFileSync(path.join(out, `${item.id}-${name}.jpg`), image, { flag: 'wx', mode: 0o600 });
      record.jpegSHA256 = sha(image); delete record.image;
    }
    report.cases.push({ ...result, sourceSHA256: item.sourceSHA256 });
  }
  const opaque = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
    const context = canvas.getContext('2d'); context.fillStyle = '#348c52'; context.fillRect(0, 0, 320, 240);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .92));
    const file = new File([blob], 'opaque.jpg', { type: 'image/jpeg' });
    const old = await oldPreparation.prepareImageForAnalysis(file, 2400, undefined, oldPreparation.NATIVE_IMAGE_PREPARATION_LIMITS);
    const next = await newPreparation.prepareImageForAnalysis(file, 2400, undefined, newPreparation.NATIVE_IMAGE_PREPARATION_LIMITS);
    return { byteExact: JSON.stringify(old) === JSON.stringify(next) };
  });
  assert.equal(opaque.byteExact, true); report.opaqueJPEGControl = opaque;
  for (const input of inputs) {
    const bytes = fs.readFileSync(input.path); assert.equal(sha(bytes), input.sha256);
    const mime = bytes.subarray(0, 3).toString() === 'GIF' ? 'image/gif'
      : bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg'
      : bytes.subarray(0, 4).toString() === 'RIFF' ? 'image/webp' : 'image/png';
    const result = await page.evaluate(async ({ bytes, mime }) => {
      const file = new File([Uint8Array.from(atob(bytes), c => c.charCodeAt(0))], 'source-image', { type: mime });
      const start = performance.now();
      const before = await oldPreparation.prepareImageForAnalysis(file, 2400, undefined, oldPreparation.NATIVE_IMAGE_PREPARATION_LIMITS);
      const after = await newPreparation.prepareImageForAnalysis(file, 2400, undefined, newPreparation.NATIVE_IMAGE_PREPARATION_LIMITS);
      return { before: { width: before.width, height: before.height, quality: before.quality,
        textGateRejected: oldPreparation.shouldRejectTextAnalysis(before.quality) },
      after: { width: after.width, height: after.height, quality: after.quality,
        textGateRejected: newPreparation.shouldRejectTextAnalysis(after.quality) },
      wallMsForBoth: performance.now() - start };
    }, { bytes: bytes.toString('base64'), mime });
    assert.equal(result.before.width, result.after.width); assert.equal(result.before.height, result.after.height);
    report.nativePreparation200.push({ imageId: input.imageId, sourceSHA256: input.sha256, mime, ...result });
  }
  assert.equal(report.nativePreparation200.length, 200);
  report.nativePreparationSummary = {
    processed: report.nativePreparation200.length,
    beforeTextGateRejected: report.nativePreparation200.filter(item => item.before.textGateRejected).length,
    afterTextGateRejected: report.nativePreparation200.filter(item => item.after.textGateRejected).length,
    newlyRejected: report.nativePreparation200.filter(item => !item.before.textGateRejected && item.after.textGateRejected).map(item => item.imageId),
    newlyAdmitted: report.nativePreparation200.filter(item => item.before.textGateRejected && !item.after.textGateRejected).map(item => item.imageId),
  };
  assert.equal(report.unexpectedRequests.length, 0); assert.equal(report.pageErrors.length, 0); assert.equal(report.console.length, 0);
  report.passed = true; await context.close();
} catch (error) { report.error = String(error); process.exitCode = 1; }
finally {
  await browser.close(); report.finishedUTC = new Date().toISOString(); report.browserClosed = true;
  assert.equal(sha(fs.readFileSync(sourceFile)), report.sourceSHA256);
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, error: report.error ?? null, output: out }));
