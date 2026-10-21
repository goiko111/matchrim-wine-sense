import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const source = path.resolve('qa-artifacts/global103-20261021/ocr200-r1');
const output = path.resolve(process.argv[2]);
assert(output.startsWith(path.resolve('qa-artifacts') + '/') && !fs.existsSync(output));
const hash = value => createHash('sha256').update(value).digest('hex');
const receipts = JSON.parse(fs.readFileSync(source + '/REQUESTS.json'));
const plan = [];
for (const receipt of receipts) {
  const bytes = fs.readFileSync(path.join(source, receipt.body)); assert.equal(hash(bytes), receipt.sha256);
  const url = new URL(receipt.url), body = JSON.parse(bytes);
  assert.equal(url.origin, 'https://app.winerim.com');
  if (!url.searchParams.has('text')) continue;
  assert.equal(url.pathname, '/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines');
  assert.equal(url.searchParams.get('page'), '1');
  if (receipt.status !== 200 || !Number.isInteger(body.count) || body.count <= 20 || body.count > 60) continue;
  assert.equal(body.page, 1); assert.equal(body.results.length, 20);
  for (let page = 2; page <= Math.ceil(body.count / 20); page++) {
    url.searchParams.set('page', String(page));
    plan.push({ url: url.href, count: body.count, page, sourceReceipt: receipt.body });
  }
}
assert(plan.length <= 80); assert.equal(new Set(plan.map(row => row.url)).size, plan.length);
// The retrieval plan contains only frozen OCR queries, never expected-name metadata.
fs.mkdirSync(output, { mode: 0o700 });
const report = { startedUTC: new Date().toISOString(), source, sourceScriptSHA256: hash(fs.readFileSync(import.meta.filename)),
  scope: 'Anonymous public text-only GETs for later pages of frozen OCR queries. No images, credentials, models or writes. First-page receipts are older; changed counts must fail closed in replay.',
  paidModelStarts: 0, photosUploaded: 0, credentialsSent: false, expectedNamesLoaded: false, plan, requests: [] };
const write = () => {
  fs.writeFileSync(output + '/REPORT.json', JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  fs.writeFileSync(output + '/REQUESTS.json', JSON.stringify(report.requests, null, 2) + '\n', { mode: 0o600 });
};
write();
for (const item of plan) {
  const started = performance.now(), name = `response-${String(report.requests.length + 1).padStart(3, '0')}.json`;
  const receipt = { ...item, body: name };
  try {
    const response = await fetch(item.url, { method: 'GET', credentials: 'omit', redirect: 'error',
      referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
    assert(!response.redirected && response.url === item.url);
    assert(/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || ''));
    const reader = response.body.getReader(), parts = []; let size = 0;
    try { while (true) {
      const next = await reader.read(); if (next.done) break;
      size += next.value.byteLength; assert(size <= 262144); parts.push(next.value);
    } } finally { await reader.cancel().catch(() => undefined); }
    const bytes = Buffer.concat(parts); JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    fs.writeFileSync(path.join(output, name), bytes, { mode: 0o600, flag: 'wx' });
    Object.assign(receipt, { status: response.status, sha256: hash(bytes), bytes: size });
  } catch (error) { receipt.status = 0; receipt.error = String(error); }
  receipt.elapsedMs = Math.round(performance.now() - started); report.requests.push(receipt); write();
  console.log(JSON.stringify({ index: report.requests.length, planned: plan.length, query: new URL(item.url).searchParams.get('text'), page: item.page, status: receipt.status }));
  if (receipt.status !== 200) { report.stopped = 'FIRST_TRANSPORT_FAILURE'; break; }
  await new Promise(resolve => setTimeout(resolve, 250));
}
report.finishedUTC = new Date().toISOString();
report.transportCompleted = report.requests.length === plan.length && report.requests.every(row => row.status === 200);
write();
console.log(JSON.stringify({ output, completed: report.transportCompleted, requests: report.requests.length, modelStarts: 0 }));
process.exitCode = report.transportCompleted ? 0 : 1;
