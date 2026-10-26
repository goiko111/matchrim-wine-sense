import fs from 'node:fs';
import assert from 'node:assert/strict';
import { evaluate253, plan253, summarize253, validateResetResume258 } from './probe-matchrim-hosted253';

const names = ['01-busqueda-defecto-migratoria.json', '02-busqueda-includeUnlisted-migratoria.json',
  '04-ficha-217480.json', '05-ficha-control-78397.json',
  '06-busqueda-amplia-includeUnlisted-pagina1.json', '07-busqueda-amplia-includeUnlisted-pagina2.json'];
const bodies = names.map(name => JSON.parse(fs.readFileSync('qa-fixtures/master216/' + name, 'utf8')));
const summaries = bodies.map((body, index) => summarize253(index, body));
assert.equal(plan253.length, 6);
assert(summaries.every(row => row.schemaAccepted && !row.affinityGranted && !row.canonicalPhotoIdentityConfirmed));
assert.equal(evaluate253(summaries).passed, true);
assert.equal(evaluate253(summaries.slice(0, 5)).passed, false);

const drift = structuredClone(summaries);
if ('total' in drift[5]) drift[5].total++;
assert.equal(evaluate253(drift).passed, false);
const duplicate = structuredClone(summaries);
if ('ids' in duplicate[4] && 'ids' in duplicate[5]) duplicate[5].ids[0] = duplicate[4].ids[0];
assert.equal(evaluate253(duplicate).passed, false);
const gap = structuredClone(summaries);
if ('ids' in gap[5]) gap[5].ids.pop();
assert.equal(evaluate253(gap).passed, false);

const wrongYear = structuredClone(bodies[3]);
wrongYear.tastingAttributes.attributesByVintage[0].vintage = '2099';
assert.equal(summarize253(3, wrongYear).schemaAccepted, false);
assert.equal(summarize253(2, bodies[3]).schemaAccepted, false);
assert.equal(summarize253(0, bodies[1]).schemaAccepted, false);
console.log('HOSTED253_OFFLINE_8_GROUPS_PASS_ZERO_NETWORK_NOT_LIVE_VALIDATION');

const resetBaseline = {
  'RESULT.json': { catalogueAttempts: 0, sessionRefreshes: 1, refreshHTTP: 400,
    reason: 'AUTH_REFRESH_REJECTED_NO_RETRY' },
  'RESULT-QA-LOGIN.json': { catalogueAttempts: 0, sessionRefreshes: 2, recoveredRefreshHTTP: 400,
    reason: 'RECOVERED_SESSION_REFRESH_REJECTED_NO_RETRY' },
  'AUTH-RECOVERED-REFRESH-RESERVED.json': true,
};
validateResetResume258(resetBaseline);
for (const name of ['AUTH-PASSWORD-RESERVED.json', 'RESET-SESSION-RESERVED.json',
  'RESULT-RESET-SESSION.json', 'LOCAL-SESSION-RESERVED.json',
  ...plan253.flatMap((_, index) => ['RESERVED', 'RECEIPT', 'BODY'].map(suffix =>
    `${String(index + 1).padStart(2, '0')}-${suffix}.json`))]) {
  assert.throws(() => validateResetResume258({ ...resetBaseline, [name]: true }));
}
assert.throws(() => validateResetResume258({ ...resetBaseline, 'RESULT.json': { catalogueAttempts: 1 } }));
assert.throws(() => validateResetResume258({ ...resetBaseline, 'RESULT-QA-LOGIN.json': { passed: true } }));
assert.throws(() => validateResetResume258({ ...resetBaseline, 'AUTH-RECOVERED-REFRESH-RESERVED.json': false }));
console.log('RESET258_ONE_SHOT_LEDGER_VALID_AND_25_INVALID_STATES_PASS_ZERO_NETWORK');
