import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha112 } from './benchmark-matchrim-native112';

const baselineFile = 'qa-artifacts/night105-20261021/native112-corpus200-r17/REPORT.json';
const currentFile = 'qa-artifacts/night105-20261021/native112-corpus200-r19/REPORT.json';
const experiment = 'qa-artifacts/night105-20261021/vision122-lower-half-181-200-r1';
const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
const baseline = read(baselineFile), current = read(currentFile), receipt = read(experiment + '/RESULT.json');
assert(baseline.summary.sourceIntegrityVerified && current.summary.sourceIntegrityVerified);
assert(receipt.passed && receipt.eligibleForBound112 === false && receipt.expectedNamesGivenToOCR === false && receipt.fixtureDictionary === false);
for (const [file, hash] of Object.entries(receipt.outputsSHA256)) assert.equal(sha112(fs.readFileSync(experiment + '/' + file)), hash);
const ocr = read(experiment + '/OCR.json');
const changedQueries = [];
for (let i = 0; i < 200; i++) {
  const before = baseline.rows[i], after = current.rows[i]; assert.equal(before.imageId, after.imageId);
  assert.equal(before.eligible, after.eligible);
  assert.deepEqual(before.proposals.map((p: { row: { id: number } }) => p.row.id), after.proposals.map((p: { row: { id: number } }) => p.row.id));
  if (JSON.stringify(before.queries) !== JSON.stringify(after.queries)) changedQueries.push({ imageId: after.imageId, before: before.queries, after: after.queries });
}
const optical = ocr.results.filter((row: { file?: string }) => row.file).map((row: { file: string; response: { data: { lines: { text: string }[]; totalMs: number } } }) => {
  const imageId = row.file.replace(/\.jpg$/, ''), original = current.rows.find((item: { imageId: string }) => item.imageId === imageId);
  assert(original); assert.equal(receipt.inputs[row.file], original.inputSHA256);
  const before: string[] = original.reading.lines.map((line: { text: string }) => line.text), after = row.response.data.lines.map(line => line.text);
  return { imageId, before, after, removed: before.filter(text => !after.includes(text)), added: after.filter(text => !before.includes(text)),
    rawChanged: JSON.stringify(before) !== JSON.stringify(after), totalMs: row.response.data.totalMs };
});
assert.equal(optical.length, 20);
const output = 'qa-artifacts/continuation176-20261023/SUMMARY.json'; assert(!fs.existsSync(output));
const result = { generatedUTC: new Date().toISOString(), baselineFile, baselineSHA256: sha112(fs.readFileSync(baselineFile)),
  currentFile, currentSHA256: sha112(fs.readFileSync(currentFile)), summary: current.summary, changedQueries,
  newlyCompletedSearches: 0, noProposalOrEligibilityRegression: true,
  opticalExperiment: { receipt: experiment + '/RESULT.json', receiptSHA256: sha112(fs.readFileSync(experiment + '/RESULT.json')),
    productionPluginChanged: false, eligibleForProductionBenchmark: false, promoted: false,
    rawChangedScenes: optical.filter((row: { rawChanged: boolean }) => row.rawChanged).length,
    withRemovedOriginalLines: optical.filter((row: { removed: string[] }) => row.removed.length).length,
    rows: optical, conclusion: 'Fixed lower-half ROI loses observed names/qualifiers and does not repair PONT; reject promotion. This is not measured recognition precision or improved identity.' },
  independentSchemaAudit: { source: 'Read-only Popper sidecar', manifests: 28, verifiedBodies: 761, independentDetails: 14,
    targetIDs: [362891, 363580], validTargetSlugOrIndependentDetailFound: false, sourceMutations: 0,
    scope: 'Retained verified receipts only; not fresh current-day schema readback or administrative Mantalak equivalence' },
  currentDayPublicReadback: 'NOT_STARTED_PENDING_AUTHORIZATION; public177 plan has20 error URLs and2 observed malformed pages',
  newPublicCatalogueGET: 0, newModels: 0, newUploads: 0, lovableTurns: 0, productionWrites: 0,
  paidCap: 'unchanged50 requests/EUR15', priorConservativeFreeReservation: '400/400 unchanged, not reclaimed',
  webPublished: false, testFlightUploaded: false, release: 'NO-GO:17partial19historicalHTTP-unavailable1schema1mixed remain',
};
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ output, incomplete: current.summary.incompleteScenes, changedQueries,
  opticalRawChanges: result.opticalExperiment.rawChangedScenes, opticalRemovedLines: result.opticalExperiment.withRemovedOriginalLines,
  promoted: false, newGET: 0, models: 0 }));
