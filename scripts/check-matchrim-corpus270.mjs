import assert from 'node:assert/strict';
import fs from 'node:fs';
import { audit270 } from './audit-matchrim-corpus270.mjs';

const report = JSON.parse(fs.readFileSync('qa-artifacts/night105-20261021/native112-corpus200-r23/REPORT.json'));
const bytes = JSON.stringify(report);
const result = audit270(report);
assert.deepEqual(result.summary.gates, {
  'top1-name-proxy-only': 46,
  'no-proposal-in-retained-complete-query': 119,
  'catalogue-query-incomplete': 19,
  'insufficient-local-reading-or-query': 7,
  'expected-name-not-in-top3': 7,
  'expected-name-below-top1': 2,
});
assert.equal(result.summary.retainedOCRWithText, 196);
assert.equal(result.summary.build125LiveRecognitionMeasured, false);
assert.equal(result.summary.canonicalIdentityPrecision, null);
assert.equal(result.summary.sensoryCoverageOf200, 'NOT_MEASURED');
assert(result.rows.every(row => !row.canonicalPhotoIdentityValidated && !row.sensoryEvidenceValidated));
assert.equal(JSON.stringify(report), bytes, 'SOURCE_MUTATED');
const rejected = mutate => { const copy = JSON.parse(bytes); mutate(copy); assert.throws(() => audit270(copy)); };
rejected(copy => copy.rows.pop());
rejected(copy => { copy.rows[1].imageId = copy.rows[0].imageId; });
rejected(copy => { copy.expectedLoadedAfterRanking = false; });
rejected(copy => { copy.summary.top1Expected++; });
rejected(copy => { copy.rows[0].top3Hit = false; });
rejected(copy => { copy.rows.find(row => row.status === 'incomplete').eligible = true; });
rejected(copy => { copy.rows.find(row => row.status === 'abstained').proposals = [{}]; });
console.log('PASS corpus270 retained200 stage partition; seven corrupt/overclaiming inputs rejected; zero network or product changes');
