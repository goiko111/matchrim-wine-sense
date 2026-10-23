import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pinCache179 } from './pin-matchrim-cache179';
import { captureSources112, verifySources112, sha112 } from './benchmark-matchrim-native112';
import { createGlobalCatalogue103, applyGlobalCatalogue103, type PublicGlobalRow103, type GlobalWine103 } from '../src/utils/nativeGlobalCatalogue103';
import type { WineCandidate } from '../src/utils/multiWineScan';

const repo = process.cwd(), sources = captureSources112(repo);
const reportPath = 'qa-artifacts/night105-20261021/native112-corpus200-r21/REPORT.json';
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
assert(report.summary.sourceIntegrityVerified); verifySources112(repo, report.sourceFingerprints);
const cache = pinCache179(repo, JSON.parse(fs.readFileSync(path.dirname(reportPath) + '/CACHE_READS.json', 'utf8')));
const output = 'qa-artifacts/continuation181-20261023'; assert(!fs.existsSync(output));
const targets = [362891, 363580], results = [];
let attemptedWireCalls = 0;
const client = createGlobalCatalogue103(async () => { attemptedWireCalls++; throw new Error('NO_NETWORK_ALLOWED181'); });
for (const id of targets) {
  const observed = [...cache].flatMap(([url, receipt]) => {
    if (receipt.status !== 200) return [];
    const body = JSON.parse(receipt.bytes.toString('utf8'));
    return (body.results || []).filter((row: { id?: unknown }) => row.id === id)
      .map((row: PublicGlobalRow103) => ({ url, receipt, row }));
  });
  assert.equal(observed.length, 1);
  const { row, url, receipt } = observed[0]; assert.equal(row.slugname, '');
  const candidate: WineCandidate = { id: 'manual-negative181-' + id, name: row.name, producer: row.winery,
    vintage: null, region: null, country: null, grapes: [], alcohol: null, source: 'manual', confidence: 0,
    evidence: ['Controlled manual negative, not an OCR identification'], inferredFields: [], uncertaintyReasons: [], affinity: null };
  const raw = await client.confirmSelection(candidate, row);
  assert.equal(raw.status, 'identity-required'); assert(!('wine' in raw));
  // This synthetic mutation is never written to a fixture or used in the app.
  const invented = await client.confirmSelection(candidate, { ...row, slugname: 'SYNTHETIC_UNTRUSTED_SLUG' });
  assert.equal(invented.status, 'identity-required'); assert(!('wine' in invented));
  const forged = { namespace: 'winerim-public-store', id, name: row.name, producer: row.winery, vintage: null,
    region: null, country: null, slug: 'SYNTHETIC_UNTRUSTED_SLUG', url: 'https://web.winerim.com/matchrim/store/' + id + '/SYNTHETIC_UNTRUSTED_SLUG',
    photo: null, sensory: { power: 5, acidity: 5, sweetness: 5, tannin: 5, fruity: 5 }, provenance: 'unspecified' } as GlobalWine103;
  const applied = applyGlobalCatalogue103(candidate, { potente: 5, acidez: 5, dulce: 5, tanico: 5, afrutado: 5 }, forged, true);
  assert.equal(applied, candidate); assert.equal(applied.affinity, null);
  results.push({ publicID: id, sourceURL: url, sourceReceipt: receipt.sourceReceipt, responseSHA256: receipt.sha256,
    rawSelection: raw.status, inventedSlugSelection: invented.status, injectedSensoryRejected: true,
    canonicalIdentityCreated: false, affinity: null });
}
assert.equal(attemptedWireCalls, 0); verifySources112(repo, sources);
fs.mkdirSync(output, { mode: 0o700 });
fs.writeFileSync(output + '/SOURCE_DEFECTS.json', JSON.stringify({ generatedUTC: new Date().toISOString(),
  passed: true, sourceReportSHA256: sha112(fs.readFileSync(reportPath)), sources, results,
  actualExternalGET: 0, attemptedWireCalls, models: 0, uploads: 0, productionWrites: 0,
  scope: 'Actual client confirmation/affinity guards with retained malformed source rows and explicit synthetic attacks. Not source repair, recognition or native QA.' }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ passed: true, records: results.length, negativePaths: 6, actualExternalGET: 0, models: 0, output }));
