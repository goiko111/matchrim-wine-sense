import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseMasterDetail188, parseMasterPage188, parseMasterMapping188,
  masterVintageEvidence188 } from '../src/utils/nativeMasterContract188';

const root = 'qa-fixtures/master193';
const read = (file: string) => JSON.parse(fs.readFileSync(`${root}/${file}`, 'utf8'));
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_EXTERNAL_CALLS_IN_OBSERVED193_REPLAY'); };
let groups = 0;
const check = (name: string, test: () => void) => { test(); groups++; console.log('PASS', name); };
try {
  check('Actual five200receipts preserve the preceding401 and the cumulative6read limit', () => {
    const result = read('RESULT.json'), old = read('historical-401.json');
    assert.equal(old.httpStatus, 401); assert.equal(old.index, 1);
    assert.equal(result.passed, true); assert.equal(result.requests, 5);
    assert.equal(result.previousRequests, 1); assert.equal(result.cumulativeRequests, 6);
    assert.deepEqual(result.receipts.map((row: { index: number }) => row.index), [2, 3, 4, 5, 6]);
    for (const row of result.receipts) {
      assert.equal(row.httpStatus, 200); assert(row.elapsedMs >= 0); assert.match(row.sha256, /^[a-f0-9]{64}$/);
      assert.equal(new URL(row.url).origin, 'https://app.winerim.com');
    }
    assert.equal(result.appActivated, false); assert.equal(result.independent200LabelRecognition, false);
  });
  check('Observed LaZorrera2015has an exact row, not another vintage or default-derived affinity', () => {
    const wine = parseMasterDetail188(read('2-BODY.json'), 180278); assert(wine);
    assert.equal(wine.name, 'La Zorrera'); assert.equal(wine.winery, 'Chivite');
    assert.equal(wine.representativePublicId, 336808); assert(wine.photo?.startsWith('https://app.winerim.com/images/wines/'));
    const exact = masterVintageEvidence188(wine, '2015');
    assert.equal(exact.status, 'known'); assert.equal(exact.scope, 'exact'); assert.equal(exact.sensory?.vintage, '2015');
    assert.equal(exact.sensory?.sweetness, 0); assert.equal(exact.sensory?.source, null);
    assert.equal(exact.affinityAttributes, null); assert.equal(exact.learningEligible, false);
    assert.equal(masterVintageEvidence188(wine, '2019').scope, 'generic');
    assert.equal(parseMasterDetail188(read('2-BODY.json'), 336808), null, 'Public row ID is not the canonical ID');
  });
  check('Actual strict Vidure2020zero and preferred reference agree without asserting the vintage never existed', () => {
    const exact = parseMasterPage188(read('3-BODY.json'), 1, 10), preferred = parseMasterPage188(read('4-BODY.json'), 1, 10);
    assert(exact && preferred); assert.equal(exact.total, 0); assert.equal(preferred.total, 1);
    const wine = preferred.results[0]; assert.equal(wine.mantalakWineId, 201987); assert.equal(wine.name, 'Vidure');
    assert.deepEqual(wine.vintages, ['2018']); assert.equal(wine.id, 364050);
    assert.equal(wine.winery, 'Pago de Cirsus');
  });
  check('Observed Vidure2020cannot inherit the2018row, even if its numeric attributes would be useful', () => {
    const wine = parseMasterDetail188(read('5-BODY.json'), 201987); assert(wine);
    const evidence = masterVintageEvidence188(wine, '2020');
    assert.equal(evidence.status, 'other-vintages-only'); assert.equal(evidence.scope, 'generic');
    assert.equal(evidence.sensory?.vintage, null); assert.equal(evidence.sensory?.power, 5);
    assert.equal(wine.tastingAttributes.attributesByVintage.find(row => row.vintage === '2018')?.power, 4);
    assert.equal(evidence.affinityAttributes, null); assert.equal(evidence.learningEligible, false);
    const noGeneric = structuredClone(wine);
    noGeneric.tastingAttributes.attributesByVintage = noGeneric.tastingAttributes.attributesByVintage.filter(row => row.vintage !== null);
    assert.equal(masterVintageEvidence188(noGeneric, '2020').sensory, null);
  });
  check('Two real source IDs map to distinct canonical IDs and source links, without claiming photo identities', () => {
    const result = parseMasterMapping188(read('6-BODY.json'), [362891, 363580]); assert(result);
    assert.deepEqual(result.notFound, []);
    assert.deepEqual(result.results.map(row => [row.publicId, row.mantalakWineId]), [[362891, 215213], [363580, 215439]]);
    assert(result.results.every(row => row.vintage === null && row.publicId !== row.mantalakWineId));
    const poisoned = read('6-BODY.json'); poisoned.results[0].webUrl = poisoned.results[1].webUrl;
    assert.equal(parseMasterMapping188(poisoned, [362891, 363580]), null);
  });
  console.log(JSON.stringify({ passed: groups, failed: 0, externalRequests: 0,
    evidence: 'Replay of five actual authorized200responses; historical401unchanged',
    photoRecognitionClaims: 0, appActivated: false, modelCalls: 0, accountWrites: 0 }));
} finally { globalThis.fetch = previousFetch; }
