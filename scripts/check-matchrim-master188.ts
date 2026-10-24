import assert from 'node:assert/strict';
import fs from 'node:fs';
import { masterSearchParams188, parseMasterPage188, startMasterPages188, appendMasterPage188,
  parseMasterDetail188, masterVintageEvidence188, parseMasterMapping188 } from '../src/utils/nativeMasterContract188';

// Developer-supplied examples, not independently observed API receipts.
const contract = fs.readFileSync('qa-fixtures/master188/CONTRATO-API-827-20261024.md', 'utf8');
const examples = [...contract.matchAll(/```json\s*([\s\S]*?)```/g)].map(match => JSON.parse(match[1]));
const pageExample = examples.find(value => value.total === 149 && value.count === 2);
const zorrera = examples.find(value => value.mantalakWineId === 180278);
const vidure = examples.find(value => value.mantalakWineId === 201987);
const mappings = examples.find(value => value.notFound);
assert(pageExample && zorrera && vidure && mappings);
let groups = 0;
const test = (name: string, work: () => void) => { work(); groups++; console.log('PASS', name); };
const copy = <T>(value: T): T => structuredClone(value);
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_EXTERNAL_MASTER188_REQUESTS'); };
try {
  test('Documented independent filters and strict vintage query; no key or synthetic catalogue route', () => {
    const params = masterSearchParams188({ name: 'zorrera', winery: 'chivite', vintage: '2015', vintageMatch: 'only', limit: 50 });
    assert(params); assert.deepEqual(Object.fromEntries(params), { name: 'zorrera', winery: 'chivite', vintage: '2015', vintageMatch: 'only', limit: '50', page: '1' });
    for (const input of [{}, { q: '' }, { q: 'a b' }, { q: 'wine', limit: 51 }, { q: 'wine', page: 1001 },
      { q: 'wine', vintageMatch: 'only' as const }, { name: 'zorrera', vintage: '20x5' },
      { q: 'one two three four five six seven' }, { name: 'wine\nattack' }]) assert.equal(masterSearchParams188(input), null);
    assert(masterSearchParams188({ q: 'wine', limit: 50, page: 200 }));
  });
  test('Search separates representative public IDs from canonical IDs and validates effective paging', () => {
    const value = parseMasterPage188(pageExample, 1, 2); assert(value);
    assert.equal(value.results[0].id, 355574); assert.equal(value.results[0].mantalakWineId, 214921);
    for (const payload of [{ ...pageExample, total: 1 }, { ...pageExample, count: 1 },
      { ...pageExample, pageCount: 74 }, { ...pageExample, limit: 50 },
      { ...pageExample, results: [pageExample.results[0], pageExample.results[0]] }]) assert.equal(parseMasterPage188(payload, 1, 2), null);
    const wrong = copy(pageExample); wrong.results[0].webUrl = 'https://web.winerim.com/matchrim/store/999/Wine';
    assert.equal(parseMasterPage188(wrong, 1, 2), null);
    const empty = examples.find(value => value.page === 99); assert(parseMasterPage188(empty, 99, 50));
  });
  test('Paging accumulates canonical IDs without duplicates, missing pages or count drift', () => {
    const first = parseMasterPage188(pageExample, 1, 2)!; const accumulated = startMasterPages188(first)!;
    const next = { ...first, page: 2, results: first.results.map((row, index) => ({ ...row, mantalakWineId: [50050, 48483][index] })) };
    const accumulated2 = appendMasterPage188(accumulated, next); assert(accumulated2); assert.equal(accumulated2.rows.length, 4);
    assert.equal(appendMasterPage188(accumulated, { ...next, page: 3 }), null);
    assert.equal(appendMasterPage188(accumulated, { ...next, total: 150 }), null);
    assert.equal(appendMasterPage188(accumulated, { ...next, results: first.results }), null);
    assert.equal(startMasterPages188(next), null);
    const third = { ...next, page: 3, results: next.results.map(row => ({ ...row, mantalakWineId: row.mantalakWineId + 10 })) };
    assert.equal(appendMasterPage188(accumulated2, third)?.rows.length, 6);
    assert.equal(appendMasterPage188(accumulated2, { ...third, results: first.results }), null);
  });
  test('La Zorrera 2015 is known but zero means not-applicable and no default-bearing affinity is granted', () => {
    const value = parseMasterDetail188(zorrera, 180278); assert(value);
    const result = masterVintageEvidence188(value, '2015');
    assert.equal(result.status, 'known'); assert.equal(result.scope, 'exact'); assert.equal(result.sensory?.sweetness, 0);
    assert.equal(result.affinityAttributes, null); assert.equal(result.learningEligible, false);
    assert.equal(masterVintageEvidence188(value, '2019').scope, 'generic');
    assert.equal(masterVintageEvidence188(value, null).status, 'unspecified');
  });
  test('Vidure 2020 cannot inherit 2018 or claim that an unlisted vintage does not exist', () => {
    const value = parseMasterDetail188(vidure, 201987); assert(value);
    const result = masterVintageEvidence188(value, '2020');
    assert.equal(result.status, 'other-vintages-only'); assert.equal(result.scope, 'generic'); assert.equal(result.sensory?.vintage, null);
    assert.notDeepEqual(result.sensory, value.tastingAttributes.attributesByVintage.find(row => row.vintage === '2018'));
    const onlyOther = copy(value); onlyOther.tastingAttributes.attributesByVintage = onlyOther.tastingAttributes.attributesByVintage.filter(row => row.vintage !== null);
    assert.equal(masterVintageEvidence188(onlyOther, '2020').scope, 'missing');
    const unrecorded = copy(value); unrecorded.vintages = []; unrecorded.tastingAttributes.attributesByVintage = []; unrecorded.tastingAttributes.dependsOnVintage = false;
    assert.equal(masterVintageEvidence188(unrecorded, '2020').status, 'unrecorded');
  });
  test('Wrong detail ID, contradictory vintages, bad scale, duplicate rows and hostile links fail closed', () => {
    assert.equal(parseMasterDetail188(zorrera, 201987), null);
    const mutations = [
      (row: typeof zorrera) => { row.tastingAttributes.scale.notApplicable = null; },
      (row: typeof zorrera) => { row.tastingAttributes.dependsOnVintage = false; },
      (row: typeof zorrera) => { row.vintages = [2019]; },
      (row: typeof zorrera) => { row.tastingAttributes.attributesByVintage.push(row.tastingAttributes.attributesByVintage[0]); },
      (row: typeof zorrera) => { row.photo = 'https://evil.example/secret'; },
      (row: typeof zorrera) => { row.webUrl = 'https://web.winerim.com/matchrim/store/999/Wine'; },
      (row: typeof zorrera) => { row.tastingAttributes.attributesByVintage[0].power = 6; },
    ];
    for (const mutate of mutations) { const value = copy(zorrera); mutate(value); assert.equal(parseMasterDetail188(value, 180278), null); }
    const suppliedSource = copy(zorrera);
    suppliedSource.tastingAttributes.attributesByVintage[1].source = { type: 'ai', model: 'controlled-test', confidence: .99, generatedAt: '2026-10-24T00:00:00Z' };
    assert.equal(masterVintageEvidence188(parseMasterDetail188(suppliedSource, 180278)!, '2015').affinityAttributes, null);
  });
  test('Public-to-canonical mapping preserves row vintage, real link and exact requested ID coverage', () => {
    const requested = [362891, 363580, 378799, 2147483000];
    const value = parseMasterMapping188(mappings, requested); assert(value);
    assert.equal(value.results[0].mantalakWineId, 215213); assert.equal(value.results[1].mantalakWineId, 215439);
    assert.equal(value.results[2].vintage, '2021');
    assert.equal(parseMasterMapping188(mappings, requested.slice(0, 2)), null);
    assert.equal(parseMasterMapping188({ ...mappings, notFound: [362891] }, requested), null);
    assert.equal(parseMasterMapping188({ ...mappings, results: [...mappings.results].reverse() }, requested), null);
    const wrong = copy(mappings); wrong.results[0].webUrl = wrong.results[1].webUrl;
    assert.equal(parseMasterMapping188(wrong, requested), null);
    assert(parseMasterMapping188(mappings, [...requested, requested[0]]));
  });
  console.log(JSON.stringify({ passed: groups, failed: 0, externalRequests: 0, liveApiValidated: false,
    source: 'Developer-supplied release827 documentation; synthetic mutations are not live receipts',
    appActivated: false, accountWrites: 0, affinityOrLearningGranted: false }));
} finally { globalThis.fetch = previousFetch; }
