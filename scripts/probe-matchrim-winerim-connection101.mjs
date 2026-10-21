import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

assert(process.argv.includes('--run-readonly'), 'Explicit read-only canary required');
const repo = process.cwd();
const out = path.resolve(process.argv[2]);
assert(out.startsWith(path.join(repo, 'qa-artifacts/')) && !fs.existsSync(out));
fs.mkdirSync(out, { recursive: true, mode: 0o700 });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = path.join(repo, 'qa-artifacts/native99-20261021/preview-r4/web/assets');
const keys = new Set();
for (const file of fs.readdirSync(assets).filter(file => file.endsWith('.js'))) {
  const text = fs.readFileSync(path.join(assets, file), 'utf8');
  for (const [token] of text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url'));
      if (claims.role === 'anon' && claims.ref === 'cbjynrbvrhcmpaojmqdp') keys.add(token);
    } catch { /* Ignore unrelated strings; never read a session/secret store. */ }
  }
}
assert.equal(keys.size, 1, 'One already-public application anon key required');
const key = [...keys][0];
const resolver = 'https://app.winerim.com/api/v1/whoami/slugname?s=the-library';
const proxy = 'https://cbjynrbvrhcmpaojmqdp.supabase.co/functions/v1/winerim-wines';
const receipts = [];
const read = async (url, body) => {
  assert([resolver, proxy].includes(url) && receipts.length < 3, 'READ_ONLY_ROUTE_AND_CALL_CAP');
  assert(url !== proxy || body && ['wines', 'match'].includes(body.endpoint));
  const receipt = { ordinal: receipts.length + 1, url, method: body ? 'POST' : 'GET',
    endpoint: body?.endpoint ?? 'public-library-resolver', startedUTC: new Date().toISOString(),
    auth: body ? 'already-public-anon-key' : 'none', modelCalls: 0 };
  receipts.push(receipt);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET', credentials: 'omit', redirect: 'error',
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
    });
    receipt.status = response.status;
    const reader = response.body.getReader();
    const chunks = []; let bytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > 262144) { await reader.cancel(); receipt.bodyExceededBound = true; return null; }
        chunks.push(Buffer.from(value));
      }
    } finally { reader.releaseLock(); }
    const raw = Buffer.concat(chunks);
    receipt.bodyBytes = raw.length; receipt.bodySHA256 = hash(raw);
    const data = JSON.parse(raw);
    receipt.json = true;
    if (data.error) receipt.error = String(data.error).slice(0, 240);
    const rows = Array.isArray(data.results) ? data.results : Array.isArray(data.wines) ? data.wines : [];
    receipt.returnedRows = rows.length;
    receipt.reportedCount = data.count ?? data.total ?? data.totalCount ?? null;
    receipt.rows = rows.slice(0, 3).map(wine => ({ id: wine.id ?? null, name: wine.name ?? null,
      producer: wine.winery ?? wine.producer ?? null, vintage: wine.vintage ?? null }));
    return data;
  } catch (error) { receipt.failure = error.name; return null; }
  finally { receipt.elapsedMs = Math.round(performance.now() - started); receipt.finishedUTC = new Date().toISOString(); }
};
const result = await read(resolver);
if (typeof result?.restaurant === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(result.restaurant)) {
  const restaurantUuid = result.restaurant;
  await read(proxy, { endpoint: 'wines', restaurantUuid, page: 1, limit: 1 });
  await read(proxy, { endpoint: 'match', restaurantUuid, profile: { potente: 4.7, acidez: 3.7, dulce: 3.1, tanico: 4.7, afrutado: 3 } });
}
const report = { observedUTC: new Date().toISOString(), scope: 'Anonymous public Library, POST catalogue and synthetic decimal-profile contract only',
  receipts, cap: 3, retryCount: 0, paidModelCalls: 0, lovableAgentTurns: 0, mutations: 0,
  publicWebPublished: false, fullMasterCoverageVerified: false,
  passed: receipts.length === 3 && receipts.every(item => item.status === 200 && item.json && !item.error && !item.failure) };
fs.writeFileSync(path.join(out, 'REPORT.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(report));
process.exitCode = report.passed ? 0 : 1;
