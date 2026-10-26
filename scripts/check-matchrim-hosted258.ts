import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { evaluate253, summarize253, validateResetResume258 } from './probe-matchrim-hosted253';
import { collectMasterPages216 } from '../src/utils/nativeMasterOptIn216';
import { parseMasterDetail188, parseMasterPage188, parseMasterPage216,
  masterVintageEvidence188 } from '../src/utils/nativeMasterContract188';
import { describeMasterSensory195 } from '../src/utils/nativeMasterReference195';

const root = 'qa-artifacts/master253-20261026/hosted-six-r1';
const read = (name: string) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const names = fs.readdirSync(root).filter(name => /^0[1-6]-(?:BODY|RECEIPT|RESERVED)\.json$/.test(name));
assert.equal(names.length, 18);
const hash = (name: string) => createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
const before = new Map(names.map(name => [name, hash(name)]));
const report = read('RESULT-RESET-SESSION.json');
const retainedReceipt = JSON.parse(fs.readFileSync('qa-fixtures/hosted258/RESULT.json', 'utf8'));
const bodies = Array.from({ length: 6 }, (_, index) => read(`${String(index + 1).padStart(2, '0')}-BODY.json`));
const oldFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('HOSTED258_OFFLINE_ONLY_NO_NEW_READS'); };
let passed = 0;
const check = (name: string, work: () => void) => { work(); passed++; console.log('PASS', name); };
try {
  check('All six actual hosted responses match recorded summaries; historical Auth failures stay failures', () => {
    assert.equal(report.catalogueAttempts, 6); assert.equal(report.maximumCatalogueAttempts, 6);
    assert.equal(report.newSessionRefreshes, 0); assert.equal(report.newPasswordSubmissions, 0);
    assert.equal(report.additionalEUR, 0); assert.equal(report.models, 0);
    assert.equal(report.passed, true);
    assert.equal(retainedReceipt.finishedUTC, report.finishedUTC);
    assert.equal(retainedReceipt.catalogueAttempts, report.catalogueAttempts);
    assert.equal(read('RESULT.json').refreshHTTP, 400);
    assert.equal(read('RESULT-QA-LOGIN.json').recoveredRefreshHTTP, 400);
    bodies.forEach((body, index) => {
      const receipt = read(`${String(index + 1).padStart(2, '0')}-RECEIPT.json`);
      assert.equal(receipt.status, 200); assert.equal(receipt.index, index + 1);
      assert.match(receipt.sha256, /^[a-f0-9]{64}$/);
      assert.equal(retainedReceipt.checks[index].wireSHA256, receipt.sha256);
      assert.equal(retainedReceipt.checks[index].elapsedMs, receipt.elapsedMs);
      assert.equal(retainedReceipt.checks[index].status, receipt.status);
      for (const [key, value] of Object.entries(summarize253(index, body))) {
        assert.deepEqual(report.checks[index][key], value);
      }
    });
    assert.deepEqual(evaluate253(bodies.map((body, index) => summarize253(index, body))).pagination,
      report.pagination);
  });
  check('Empty listed search does not erase canonical217480 found only with opt-in', () => {
    assert.equal(parseMasterPage188(bodies[0], 1, 10)?.total, 0);
    assert.equal(parseMasterPage188(bodies[1], 1, 10), null);
    const page = parseMasterPage216(bodies[1], 1, 10); assert(page);
    assert.equal(page.total, 1);
    assert.equal(page.results[0].mantalakWineId, 217480);
    assert.equal(page.results[0].name, 'La Migratoria');
    assert.equal(page.results[0].id, null); assert.equal(page.results[0].webUrl, null);
  });
  check('Actual87row search is complete only after50plus37; all36public-null identities retained', () => {
    assert.equal(collectMasterPages216([bodies[4]], 50).status, 'incomplete');
    const collected = collectMasterPages216([bodies[4], bodies[5]], 50);
    assert.equal(collected.status, 'complete'); assert.equal(collected.rows.length, 87);
    assert.equal(new Set(collected.rows.map(row => row.mantalakWineId)).size, 87);
    assert.equal(collected.rows.filter(row => row.id === null).length, 36);
    assert.equal(collected.snapshotAttested, false);
    assert(collected.rows.filter(row => row.id === null).every(row => row.webUrl === null));
  });
  check('Actual missing and source-less sensory rows remain non-scoring without fabricated vintage', () => {
    const missing = parseMasterDetail188(bodies[2], 217480);
    const generic = parseMasterDetail188(bodies[3], 78397);
    assert(missing && generic);
    assert.equal(missing.tastingAttributes.attributesByVintage.length, 0);
    assert.equal(generic.tastingAttributes.attributesByVintage.length, 1);
    assert.equal(generic.tastingAttributes.attributesByVintage[0].source, null);
    for (const wine of [missing, generic]) {
      assert.deepEqual(wine.vintages, []);
      const evidence = masterVintageEvidence188(wine, '2023');
      assert.equal(evidence.status, 'unrecorded');
      assert.equal(evidence.affinityAttributes, null); assert.equal(evidence.learningEligible, false);
      const description = describeMasterSensory195(wine, '2023');
      assert.equal(description.sourceVintage, null);
      assert(description.axes.every(axis => !axis.usableForAffinity && !axis.usableForLearning));
    }
    assert(describeMasterSensory195(missing, '2023').axes.every(axis => axis.status === 'missing'));
    assert.deepEqual(describeMasterSensory195(generic, '2023').axes.map(axis => axis.status),
      ['default-indistinguishable', 'default-indistinguishable', 'default-indistinguishable',
        'origin-unrecorded', 'origin-unrecorded']);
  });
  check('Already consumed tranche refuses reset-resume and source captures remain byte-identical', () => {
    const files = Object.fromEntries(fs.readdirSync(root).map(name => [name,
      ['RESULT.json', 'RESULT-QA-LOGIN.json'].includes(name) ? read(name) : true]));
    assert.throws(() => validateResetResume258(files), /EXISTING_TRANCHE_NO_RESET/);
    for (const [name, value] of before) assert.equal(hash(name), value);
  });
  console.log(JSON.stringify({ passed, failed: 0, retainedActualHostedReads: 6,
    newCatalogueOrAuthOrModelCalls: 0, observedSearchRows: 87, publicNullRows: 36,
    fullCatalogueSnapshot: false, canonicalPhotoIdentitiesConfirmed: 0, affinityGranted: false,
    appActivated: false, webChanged: false }));
} finally { globalThis.fetch = oldFetch; }
