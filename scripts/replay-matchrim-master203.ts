import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { parseMasterDetail188, parseMasterPage188 } from '../src/utils/nativeMasterContract188';
import { lookupMasterReference195, describeMasterSensory195, type MasterOperation195 } from '../src/utils/nativeMasterReference195';
import { plan203, summarize203 } from './probe-matchrim-master203';

const read = (name: string) => JSON.parse(fs.readFileSync(`qa-fixtures/master203/responses/${name}.json`, 'utf8'));
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_NETWORK_IN_MASTER203_REPLAY'); };
try {
  const report = read('RESULT'), authorization = read('AUTHORIZATION');
  assert.equal(report.requests, 12); assert.equal(report.state, 'COMPLETED_DIAGNOSTIC_NOT_RELEASE_APPROVAL');
  assert.equal(authorization.maximum, 12); assert.deepEqual(authorization.plan203, plan203);
  assert.equal(authorization.planSHA256, createHash('sha256').update(JSON.stringify(plan203)).digest('hex'));
  assert.equal(authorization.sourceCrosswalkSHA256, createHash('sha256')
    .update(fs.readFileSync('qa-artifacts/continuation199-20261024/ASSET_PROVENANCE-r2.json')).digest('hex'));
  const details = [];
  for (let index = 0; index < 12; index++) {
    const prefix = String(index + 1).padStart(2, '0'), entry = plan203[index];
    const reservation = read(`${prefix}-RESERVED`), receipt = read(`${prefix}-RECEIPT`), payload = read(`${prefix}-BODY`);
    assert.equal(reservation.index, index + 1); assert.equal(receipt.httpStatus, 200);
    assert.equal(receipt.url, entry.url); assert.equal(reservation.url, entry.url);
    assert.deepEqual(receipt, report.receipts[index]);
    assert.deepEqual(summarize203(entry, payload, 200), report.results[index]);
    // Upstream PHP serializes compact Unicode/slash escapes; the original wire
    // digest is retained in the receipt, not falsely recomputed from pretty JSON.
    assert.match(receipt.sha256, /^[a-f0-9]{64}$/); assert.equal(receipt.error, undefined);
    if (entry.kind === 'detail') { const detail = parseMasterDetail188(payload, entry.id); assert(detail); details.push(detail); }
    else assert(parseMasterPage188(payload, 1, 50));
  }
  assert.equal(details.length, 9); assert.equal(details.filter(row => row.representativePublicId === null).length, 7);
  assert.equal(details.filter(row => row.tastingAttributes.attributesByVintage.length === 0).length, 5);
  assert.equal(details.filter(row => row.tastingAttributes.attributesByVintage.some(axis => axis.source !== null)).length, 0);
  assert.equal(details.find(row => row.mantalakWineId === 217480)?.name, 'La Migratoria');
  const migratoriaPage = read('12-BODY'); assert.equal(migratoriaPage.total, 0);
  const operations: MasterOperation195[] = [];
  const missing = await lookupMasterReference195({ name: 'La Migratoria', producer: 'Bodegas Frontonio', vintage: null,
    confidence: 0.9, evidence: ['MIGRATORIA', 'Bodegas Frontonio'] }, async operation => {
    operations.push(operation); return migratoriaPage;
  });
  assert.equal(missing.status, 'not-found'); assert(missing.status === 'not-found');
  assert.equal(missing.catalogueAbsenceConfirmed, false); assert.equal(missing.lookupScope, 'search-response-only');
  assert.equal(operations.length, 1);
  const bossanova = details.find(row => row.mantalakWineId === 217304)!;
  const bossanovaOperations: MasterOperation195[] = [];
  const match = await lookupMasterReference195({ name: "Bossanova Montepulciano d'Abruzzo", producer: 'Bossanova',
    confidence: 0.9, vintage: null, evidence: ['Bossanova', "Montepulciano d'Abruzzo"] }, async operation => {
    bossanovaOperations.push(operation); return operation.operation === 'search' ? read('10-BODY') : bossanova;
  });
  assert(match.status === 'reference-match'); assert.equal(match.wine.mantalakWineId, 217304);
  assert.equal(match.vintage.scope, 'missing'); assert.equal(match.imageIdentityConfirmed, false);
  assert.equal(match.affinityAttributes, null); assert.equal(bossanovaOperations.length, 2);
  const altotinto = parseMasterPage188(read('11-BODY'), 1, 50)!;
  assert.equal(altotinto.total, 2); assert.deepEqual(altotinto.results.map(row => row.mantalakWineId), [217297, 79032]);
  assert(altotinto.results[1].vintages.includes('2021')); // Search-only, no detail read for79032.
  assert.equal(details.find(row => row.mantalakWineId === 217297)?.name, 'Scattola Selección');
  for (const detail of details) {
    const requested = detail.mantalakWineId === 217379 ? '1995' : detail.mantalakWineId === 217297 ? '2021' : null;
    const sensory = describeMasterSensory195(detail, requested);
    assert(sensory.axes.every(axis => !axis.usableForAffinity && !axis.usableForLearning));
    assert.equal(sensory.perAxisProvenanceAvailable, false);
  }
  const latency = report.receipts.map((row: { elapsedMs: number }) => row.elapsedMs).sort((a: number, b: number) => a - b);
  const result = { detailsDecoded: 9, searchControlsDecoded: 3, nonPublicDetails: 7,
    detailsWithoutSensoryRows: 5, rowOriginRecorded: 0, searchDetailContradictionVerified: true,
    referenceOnlyBossanovaReplay: 'PASS', emptySearchScopeRegression: 'PASS', newNetworkCalls: 0,
    latencyMs: { min: latency[0], median: (latency[5] + latency[6]) / 2, p95: latency[11], max: latency[11] },
    confirmedPhotoIdentities: 0, appActivated: false, testflightGate: 'HOLD' };
  if (process.argv[2] === '--save-new-report') {
    const target = 'qa-artifacts/continuation203-20261024/REPLAY.json';
    fs.mkdirSync('qa-artifacts/continuation203-20261024', { recursive: true });
    fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  }
  console.log(JSON.stringify(result));
} finally { globalThis.fetch = originalFetch; }
