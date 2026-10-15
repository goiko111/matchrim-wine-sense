import assert from 'node:assert/strict';
import { lookupWinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';

// Opt-in public read-only canary: three GETs, no credentials, profile, files,
// uploads, pagination or retry. The record and route were observed via the
// Library's "Ver detalle" control on 2026-10-15, not inferred from a local UUID.
if (!process.argv.includes('--live')) {
  console.log('Run with --live to make up to three bounded public Winerim GETs.');
  process.exit(0);
}
const reads: { path: string; status: number; cors: string | null }[] = [];
const fetcher: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.origin, 'https://app.winerim.com');
  assert.equal(init.method, 'GET'); assert.equal(init.credentials, 'omit'); assert.equal(init.body, undefined);
  assert.ok(reads.length < 3);
  const response = await fetch(input, { ...init, headers: { ...init.headers, Origin: 'capacitor://localhost' } });
  reads.push({ path: url.pathname + url.search, status: response.status, cors: response.headers.get('access-control-allow-origin') });
  assert.equal(response.headers.get('access-control-allow-origin'), 'capacitor://localhost');
  return response;
};
const result = await lookupWinerimOriginalSheet({ name: 'Manzanilla La Gitana', producer: 'Bodegas Hidalgo La Gitana',
  vintage: null, region: 'Jerez-Xérès-Sherry', country: 'Spain' }, undefined, fetcher);
assert.equal(result.status, 'verified');
if (result.status !== 'verified') process.exit(1);
assert.equal(result.sheet.id, '278688');
assert.equal(result.sheet.url, 'https://web.winerim.com/the-library/wines/278688/Manzanilla-La-Gitana');
assert.equal(result.sheet.sensoryAttributes?.tannin, 0);
console.log(JSON.stringify({ observedAt: new Date().toISOString(), reads, result,
  mutations: 0, filesSent: 0, scope: 'One public non-vintage Library fiche, not canonical catalog coverage or active Matchrim score linkage' }, null, 2));
