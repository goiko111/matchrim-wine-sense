import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pinCache179 } from './pin-matchrim-cache179';
import { sha112, verifySources112 } from './benchmark-matchrim-native112';

const base = 'qa-artifacts/continuation176-20261023';
const beforePath = 'qa-artifacts/night105-20261021/native112-corpus200-r19/REPORT.json';
const afterPath = 'qa-artifacts/night105-20261021/native112-corpus200-r21/REPORT.json';
const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
const before = read(beforePath), after = read(afterPath);
assert(before.summary.sourceIntegrityVerified && after.summary.sourceIntegrityVerified && after.rows.length === 200);
assert.equal(after.summary.publicGETStarts, 0); assert.equal(after.summary.missingCache, 0);
verifySources112(process.cwd(), after.sourceFingerprints);
const fresh = read(base + '/public177-live-r1/REPORT.json'), followup = read(base + '/public178-live-r1/REPORT.json');
const requests = [...read(base + '/public177-live-r1/REQUESTS.json'), ...read(base + '/public178-live-r1/REQUESTS.json')];
assert.equal(requests.length, fresh.actualFreshGET + followup.actualAdditionalGET);
assert(requests.length <= 24 && requests.every(row => row.status === 200 && row.state === 'completed'));
const cache = pinCache179(process.cwd(), read(path.dirname(afterPath) + '/CACHE_READS.json'));
const rechecked = fresh.results.filter(row => row.purpose === 'http-recheck');
assert(rechecked.every(row => row.oldStatus === 500 && row.newStatus === 200));
const newlyCompleted = [], regressions = [];
for (let i = 0; i < 200; i++) {
  const a = before.rows[i], b = after.rows[i]; assert.equal(a.imageId, b.imageId);
  assert.deepEqual(a.queries, b.queries); assert.equal(a.inputSHA256, b.inputSHA256);
  if (!a.eligible && b.eligible) newlyCompleted.push({ imageId: b.imageId, queries: b.queries,
    proposals: b.proposals.map(row => ({ publicID: row.row.id, name: row.name, vintage: row.row.vintage })),
    expectedNameProxyTop1: b.top1Hit, expectedNameProxyTop3: b.top3Hit });
  if (a.eligible && !b.eligible) regressions.push(b.imageId);
}
assert.equal(regressions.length, 0);
const remaining = after.rows.filter(row => !row.eligible).map(row => ({ imageId: row.imageId, pages: row.pages.map(page => {
  const observations = [...cache.entries()].filter(([url]) => new URL(url).searchParams.get('text') === page.query).map(([url, receipt]) => {
    const body = JSON.parse(receipt.bytes.toString('utf8'));
    return { url, sha256: receipt.sha256, sourceReceipt: receipt.sourceReceipt, count: body.count, page: body.page,
      returned: body.results?.length, emptySlugIDs: body.results?.filter(row => row.slugname === '').map(row => row.id) };
  });
  return { ...page, observations };
}) }));
const visual = read(base + '/visual-revalidated-r2/RESULT.json');
verifySources112(process.cwd(), visual.sources);
assert.equal(visual.screenshots.length, 18); assert.deepEqual(visual.errors, []);
assert.equal(visual.passed, false); assert(visual.error.includes('LOW_DISK_HOLD'));
const times = requests.map(row => row.elapsedMs).sort((a, b) => a - b);
const output = base + '/CHECKPOINT177.json'; assert(!fs.existsSync(output));
const result = { generatedUTC: new Date().toISOString(), beforePath, beforeSHA256: sha112(fs.readFileSync(beforePath)),
  afterPath, afterSHA256: sha112(fs.readFileSync(afterPath)), before: before.summary, after: after.summary,
  rechecked500URLs: rechecked.length, allRechecked500Now200: true, rootCauseKnown: false,
  newlyCompleted, regressions, remaining, broadOnly: remaining.filter(row => row.pages.every(page => page.status !== 'incomplete')).length,
  schemaOrMixed: remaining.filter(row => row.pages.some(page => page.status === 'incomplete')).length,
  nativeProductCommit: '1a14f81745eb1fb8569d9583aae87c171355c46f',
  localBuild: 'qa-artifacts/night105-20261021/uikit105-r11/RESULT.json', localVersion: '1.0 (105)',
  recognitionScope: 'Retained simulator Vision text replay plus verified public catalogue GETs; completed retrieval is not an identified wine. Expected-name proxies are not expert precision/recall, confirmed vintages or sensory/affinity validation.',
  visual: { receipt: base + '/visual-revalidated-r2/RESULT.json', captures: visual.screenshots,
    sourceFingerprintsReverified: true, errors: visual.errors, passed: false, hold: 'LOW_DISK_HOLD after18 captures',
    firstAttempt: base + '/visual-revalidated-r1/RESULT.json', fixedHarnessIssue: 'Whole old manifests shadowed new receipts; exact sourceReceipt/SHA/metadata replay now required',
    scope: visual.scope, humanReviewed: ['img-099-375-large.png', 'img-094 failure from first run'] },
  budget: { authorizedFreshPublicGET: 24, actualFreshPublicGET: requests.length, unusedReservedNotReclaimed: 24 - requests.length,
    oldConservativeReservation: 400, oldInstrumentedCLIStarts: 387, cumulativeInstrumentedCLIStarts: 387 + requests.length,
    newModelCalls: 0, newImageUploads: 0, lovableTurns: 0, productionWrites: 0, paidCeiling: 'unchanged50 requests/EUR15' },
  latencyMs: { samples: times.length, min: times[0], median: times[Math.floor(times.length / 2)],
    p95: times[Math.ceil(times.length * .95) - 1], max: times.at(-1), scope: 'Public single-page GET only; not scanner or taste inference latency' },
  webPublished: false, testFlightUploaded: false, release: 'NO-GO:19incomplete plus final visual resource hold',
};
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ output, retrieved: after.summary.evaluated, incomplete: remaining.length,
  newlyCompleted: newlyCompleted.length, broadOnly: result.broadOnly, schemaOrMixed: result.schemaOrMixed,
  newPublicGET: requests.length, latencyMs: result.latencyMs, visualPassed: false }));
