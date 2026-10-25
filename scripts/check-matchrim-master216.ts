import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseMasterPage188, parseMasterPage216, parseMasterDetail188, masterVintageEvidence188 } from '../src/utils/nativeMasterContract188';
import { collectMasterPages216, masterSearchParams216, type MasterQuery216 } from '../src/utils/nativeMasterOptIn216';
import { masterRequestUrl194 } from '../supabase/functions/_shared/matchrim-master194';

const root = 'qa-fixtures/master216';
const read = (name: string) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const files = ['01-busqueda-defecto-migratoria.json', '02-busqueda-includeUnlisted-migratoria.json',
  '03-busqueda-defecto-control-listado.json', '04-ficha-217480.json', '05-ficha-control-78397.json',
  '06-busqueda-amplia-includeUnlisted-pagina1.json', '07-busqueda-amplia-includeUnlisted-pagina2.json'];
const [empty, unlisted, listed, detailRaw, controlRaw, first, second] = files.map(read);
const sha = (file: string) => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const before = new Map(files.map(file => [file, sha(file)]));
const copy = <T>(value: T): T => structuredClone(value);
let passed = 0;
const check = (name: string, work: () => void) => { work(); passed++; console.log('PASS', name); };
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_EXTERNAL_CALLS_IN_MASTER216_REPLAY'); };
try {
  check('Exact MIME attachment hashes and supplied seven-read ledger agree; no live request claim', () => {
    const receipt = read('CAPTURES_REPLY.json');
    assert.equal(receipt.claimedAuthorizationIndependentlyVerified, false);
    const ledger = read('_llamadas.json'); assert.equal(ledger.length, 7);
    for (const file of files) {
      assert.equal(sha(file), receipt.attachments.find((row: { name: string }) => row.name === file).sha256);
      const item = ledger.find((row: { file: string }) => row.file === file); assert(item);
      assert.equal(item.method, 'GET'); assert.equal(item.status, 200);
      assert.equal(new URL(item.url).origin, 'https://app.winerim.com');
    }
  });
  check('Observed unlisted217480 fails legacy search but passes explicit216decoder without synthetic public identity', () => {
    assert(parseMasterPage188(empty, 1, 10));
    assert.equal(parseMasterPage188(unlisted, 1, 10), null);
    const page = parseMasterPage216(unlisted, 1, 10); assert(page);
    assert.equal(page.results[0].mantalakWineId, 217480);
    assert.equal(page.results[0].id, null); assert.equal(page.results[0].representativePublicId, null);
    assert.equal(page.results[0].webUrl, null); assert.equal(page.results[0].tastingAttributes, null);
    assert(page.results[0].photo?.includes('pending-photo-'));
  });
  check('Listed control78397 retains the exact legacy188projection', () => {
    const old = parseMasterPage188(listed, 1, 5), next = parseMasterPage216(listed, 1, 5);
    assert(old && next); assert.deepEqual(next, old);
    const control = next.results.find(row => row.mantalakWineId === 78397); assert(control);
    assert.equal(control.representativePublicId, 320305);
  });
  check('Supplied81row opt-in pages remain partial until both pages;30public-null rows retained', () => {
    const partial = collectMasterPages216([first], 50);
    assert.equal(partial.status, 'incomplete'); assert.equal(partial.rows.length, 50);
    const whole = collectMasterPages216([first, second], 50);
    assert.equal(whole.status, 'complete'); assert.equal(whole.rows.length, 81);
    assert.equal(new Set(whole.rows.map(row => row.mantalakWineId)).size, 81);
    assert.equal(whole.rows.filter(row => row.id === null).length, 30);
    assert.equal(parseMasterPage216(first, 1, 50)?.results.filter(row => row.id === null).length, 18);
    assert.equal(parseMasterPage216(second, 2, 50)?.results.filter(row => row.id === null).length, 12);
    assert.equal(whole.snapshotAttested, false); assert.equal(whole.scope, 'provided-search-pages-only');
  });
  check('Mixed null/public IDs, invented store links and missing canonical identity fail closed', () => {
    for (const patch of [{ id: 5 }, { representativePublicId: 5 }, { mantalakWineId: null },
      { webUrl: 'https://web.winerim.com/matchrim/store/217480/La-Migratoria' },
      { id: 5, representativePublicId: 6 }, { photo: 'https://evil.example/label.jpg' }]) {
      const raw = copy(unlisted); Object.assign(raw.results[0], patch);
      assert.equal(parseMasterPage216(raw, 1, 10), null);
    }
    const wrong = copy(listed); wrong.results[0].id = wrong.results[0].representativePublicId + 1;
    assert.equal(parseMasterPage216(wrong, 1, 5), null);
  });
  check('Skipped/duplicate/drifting/extra pages fail without publishing a partial valid pool', () => {
    const duplicate = copy(second); duplicate.results[0].mantalakWineId = first.results[0].mantalakWineId;
    const drift = copy(second); drift.total++;
    const skipped = copy(second); skipped.page = 3;
    for (const value of [[first, duplicate], [first, drift], [first, skipped], [second], [first, second, second]]) {
      const result = collectMasterPages216(value, 50); assert.equal(result.status, 'invalid');
      assert.deepEqual(result.rows, []);
    }
    assert.equal(collectMasterPages216([first], 5).status, 'invalid');
    assert.equal(collectMasterPages216([empty], 10).status, 'complete');
  });
  check('Exact retained details grant neither missing-vintage identity nor default-bearing affinity', () => {
    const wine = parseMasterDetail188(detailRaw, 217480), control = parseMasterDetail188(controlRaw, 78397);
    assert(wine && control);
    const evidence = masterVintageEvidence188(wine, '2023');
    assert.equal(evidence.status, 'unrecorded'); assert.equal(evidence.scope, 'missing');
    assert.equal(evidence.affinityAttributes, null); assert.equal(evidence.learningEligible, false);
    const generic = masterVintageEvidence188(control, '2023');
    assert.equal(generic.scope, 'generic'); assert.equal(generic.affinityAttributes, null);
    assert.equal(generic.sensory?.source, null);
    assert.equal(wine.representativePublicId, null); assert.equal(wine.webUrl, null);
  });
  check('Opt-in is explicit and bounded; current194bridge rejects it, a retained deployment blocker', () => {
    const query: MasterQuery216 = { q: 'Migratoria', includeUnlisted: true, limit: 10, page: 1 };
    const params = masterSearchParams216(query); assert(params); assert.equal(params.get('includeUnlisted'), '1');
    assert.equal(masterSearchParams216({ q: 'Migratoria' })?.has('includeUnlisted'), false);
    for (const value of [false, 1, '1', null]) {
      assert.equal(masterSearchParams216({ ...query, includeUnlisted: value } as unknown as MasterQuery216), null);
    }
    assert.equal(masterSearchParams216({ ...query, limit: 51 }), null);
    assert.equal(masterSearchParams216({ ...query, q: 'bad\nquery' }), null);
    assert.equal(masterRequestUrl194({ operation: 'search', query }), null);
    assert.equal(masterRequestUrl194({ operation: 'search', query: { ...query, includeUnlisted: '1' } }), null);
    assert(masterRequestUrl194({ operation: 'search', query: { q: 'Migratoria' } }));
  });
  check('Read-only replay preserves all supplied source bytes', () => {
    for (const [file, hash] of before) assert.equal(sha(file), hash);
  });
  console.log(JSON.stringify({ passed, failed: 0, suppliedCapturedReads: 7, newCatalogueOrModelCalls: 0,
    optInRows: 81, publicNullRows: 30, bridgeOptInSupported: false, appActivated: false,
    apiDeploymentIndependentlyVerified: false, photoIdentitiesConfirmed: 0, sensoryAffinityGranted: false }));
} finally { globalThis.fetch = previousFetch; }
