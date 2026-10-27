import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const source = 'qa-artifacts/night105-20261021/native112-corpus200-r23/REPORT.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Classify retained evaluation results, never use expected names for recognition.
export function audit270(report) {
  assert.equal(report.expectedLoadedAfterRanking, true);
  assert.equal(report.rows.length, 200);
  const seen = new Set();
  const rows = report.rows.map(row => {
    assert.match(row.imageId, /^img-(?:00[1-9]|0[1-9]\d|1\d\d|200)$/);
    assert(!seen.has(row.imageId), 'DUPLICATE_SCENE'); seen.add(row.imageId);
    assert(['complete', 'incomplete', 'abstained'].includes(row.status));
    assert.equal(row.eligible, row.status !== 'incomplete');
    assert(Array.isArray(row.proposals) && Array.isArray(row.pages));
    assert(!row.top1Hit || row.top3Hit, 'INCONSISTENT_TOP_HITS');
    assert(!(row.top1Hit || row.top3Hit) || (row.eligible && row.proposals.length > 0));
    assert(row.status !== 'abstained' || row.proposals.length === 0);
    let gate;
    if (row.status === 'incomplete') gate = 'catalogue-query-incomplete';
    else if (row.status === 'abstained') gate = 'insufficient-local-reading-or-query';
    else if (!row.proposals.length) gate = 'no-proposal-in-retained-complete-query';
    else if (!row.top3Hit) gate = 'expected-name-not-in-top3';
    else if (!row.top1Hit) gate = 'expected-name-below-top1';
    else gate = 'top1-name-proxy-only';
    return {
      imageId: row.imageId, gate, expectedForEvaluationOnly: row.expected,
      indicatedVintage: row.candidateVintage, reason: row.reason ?? null,
      usefulOCRTextPresent: Boolean(row.reading?.lines?.some(line => line.text?.trim())),
      queries: row.pages.map(page => ({ query: page.query, status: page.status, rows: page.rows })),
      proposalCount: row.proposals.length,
      top1NameProxy: row.top1Hit === true, top3NameProxy: row.top3Hit === true,
      canonicalPhotoIdentityValidated: false, sensoryEvidenceValidated: false,
    };
  });
  const count = predicate => rows.filter(predicate).length;
  const summary = {
    scenes: rows.length, retainedOCRWithText: count(row => row.usefulOCRTextPresent),
    retainedCompletedEvaluations: count(row => row.gate !== 'catalogue-query-incomplete'),
    incompleteScenesWithUnscoredProposals: count(row => row.gate === 'catalogue-query-incomplete' && row.proposalCount > 0),
    gates: Object.fromEntries([...new Set(rows.map(row => row.gate))].map(gate => [gate, count(row => row.gate === gate)])),
    top1NameProxy: count(row => row.top1NameProxy), top3NameProxy: count(row => row.top3NameProxy),
    canonicalIdentityPrecision: null, canonicalIdentityRecall: null,
    build125LiveRecognitionMeasured: false, sensoryCoverageOf200: 'NOT_MEASURED',
  };
  assert.equal(summary.retainedCompletedEvaluations, report.summary.evaluated);
  assert.equal(summary.top1NameProxy, report.summary.top1Expected);
  assert.equal(summary.top3NameProxy, report.summary.top3Expected);
  assert.equal(summary.gates['catalogue-query-incomplete'] ?? 0, report.summary.incompleteScenes);
  return { scope: 'OFFLINE RETAINED SNAPSHOT AUDIT, not new recognition or build125 accuracy',
    retainedObservedUTC: report.observedUTC, newExternalRequests: 0, summary, rows };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
  const lease = leases['writer-matchrim-native99'];
  assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d'
    && lease.leaseId === process.env.MATCHRIM102_WRITER_LEASE_ID && lease.reviewAfter * 1000 > Date.now());
  const bytes = fs.readFileSync(source);
  const result = { sourceFile: source, sourceSHA256: hash(bytes), ...audit270(JSON.parse(bytes)) };
  const output = 'qa-fixtures/corpus270/RESULT.json';
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output, sourceSHA256: result.sourceSHA256, ...result.summary }));
}
