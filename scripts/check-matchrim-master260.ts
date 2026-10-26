import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { resolveMasterCandidate259 } from '../src/utils/nativeMasterLink259';
import { makeCellarMasterReference260, readCellarMasterReference260, confirmsCellarMasterReference260 } from '../src/utils/cellarMasterReference260';
import { resolveNativeRescanVerdict159, nativeVerdictsSnapshot159 } from '../src/utils/nativeRescanVerdict159';
import { confirmedLabelInsertId } from '../src/utils/labelScanSave';
import { makeCellarCatalogEvidence, withCellarInitialAffinity, cellarTrainingRows, readCellarSensoryEvidence } from '../src/utils/bodegaAffinity';
import { isGlobalWine103 } from '../src/utils/nativeGlobalCatalogue103';
import { nativeMasterAudit102, lookupNativeMaster102, applyNativeMaster102 } from '../src/utils/nativeMasterCatalog102';
import { makeCellarPublicReference107 } from '../src/utils/cellarPublicReference107';
import { makeCellarReferenceStyle110 } from '../src/utils/cellarReferenceStyle110';
import type { WineCandidate } from '../src/utils/multiWineScan';
import type { LabelSaveWine } from '../src/utils/labelScanSave';

const owner = 'SYNTHETIC-OWNER260';
const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
const missing = read('qa-artifacts/master253-20261026/hosted-six-r1/03-BODY.json');
const zorrera = read('qa-fixtures/master193/2-BODY.json');
const profile = { potente: 1, acidez: 2, dulce: 3, tanico: 4, afrutado: 5 };
const snapshot = { profile, source: 'quiz', samples: 0, status: 'ready', note: 'SYNTHETIC260' } as const;
const sourceFile = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const mapper = (source: string, native = true): ((group: { candidate: WineCandidate }) => LabelSaveWine) => {
  const tree = ts.createSourceFile('scanner.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: ts.ArrowFunction[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(tree) === 'wines'
      && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(tree) === 'groups.map'
      && ts.isArrowFunction(node.initializer.arguments[0])) found.push(node.initializer.arguments[0]);
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.equal(found.length, 1);
  const mod = { exports: {} };
  const code = ts.transpileModule('module.exports = ' + found[0].getText(tree), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { module: mod, isNative: native, makeCellarCatalogEvidence, nativeMasterAudit102,
    isGlobalWine103, makeCellarPublicReference107, makeCellarReferenceStyle110, makeCellarMasterReference260,
    withCellarInitialAffinity, scanProfileRef: { current: snapshot } }, { timeout: 1000 });
  return mod.exports as (group: { candidate: WineCandidate }) => LabelSaveWine;
};
const make = async (wine = missing, vintage: number | null = 2023) => {
  const input: WineCandidate = { id: 'master260-one', name: wine.name, producer: wine.winery, vintage,
    region: null, country: null, grapes: [], alcohol: null, confidence: .9, source: 'manual',
    evidence: ['Identidad corregida manualmente por el usuario'], uncertaintyReasons: [], inferredFields: [] };
  const page = { results: [{ ...wine, id: wine.representativePublicId, tastingAttributes: {} }],
    count: 1, total: 1, page: 1, limit: 10, pageCount: 1 };
  const result = await resolveMasterCandidate259(input, async operation => structuredClone(operation.operation === 'search' ? page : wine));
  assert(result.status === 'reference-ready'); return result.candidate;
};
const rowFor = (wine: LabelSaveWine) => ({ id: 'ROW260', user_id: owner, name: wine.nombre,
  producer: wine.productor ?? null, vintage: wine.anada ?? null, region: wine.region ?? null, country: wine.pais ?? null,
  status: 'wishlist', is_favorite: false, use_for_profile_training: false, rating: 'love' as const,
  sensory_attributes: wine.sensory_attributes ?? null, place_details: wine.affinity_details ?? null });
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
let groups = 0;
const test = async (name: string, work: () => void | Promise<void>) => { await work(); groups++; console.log('PASS', name); };
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => { throw Error('MASTER260_ZERO_NETWORK'); };
try {
  const actualMapper = mapper(fs.readFileSync(sourceFile, 'utf8'));
  await test('Actual pre260save mapper loses master ID (retained RED); current mapper persists only the reference', async () => {
    const candidate = await make();
    const old = mapper(execFileSync('git', ['show', `2051562:${sourceFile}`], { encoding: 'utf8' }));
    assert.equal(old({ candidate }).affinity_details, null);
    const wine = actualMapper({ candidate }), row = rowFor(wine);
    const reference = readCellarMasterReference260(row); assert(reference);
    assert.equal(reference.mantalak_wine_id, 217480); assert.equal(reference.public_url, null);
    assert.equal(reference.sensory_usable, false); assert.deepEqual(reference.known_vintages, []);
    assert.equal(wine.matchrim_affinity, null); assert.equal(wine.sensory_attributes, null);
    assert.equal(readCellarSensoryEvidence(row, true), null);
    assert.deepEqual(cellarTrainingRows([{ ...row, sensory_attributes: null, use_for_profile_training: true }], true), []);
  });
  await test('Actual insert acknowledgement requires exact persisted master reference, not merely row ID', async () => {
    const wine = actualMapper({ candidate: await make() }), row = rowFor(wine);
    assert.equal(confirmedLabelInsertId(row, wine, owner), row.id);
    for (const place_details of [null, {}, { winerim_master_reference260: { bad: true } }]) {
      assert.equal(confirmedLabelInsertId({ ...row, place_details }, wine, owner), null);
    }
    assert.equal(confirmedLabelInsertId({ ...row, user_id: 'OTHER' }, wine, owner), null);
    assert.equal(confirmedLabelInsertId({ ...row, vintage: 2024 }, wine, owner), null);
  });
  await test('Durable reference survives JSON roundtrip but binds name/producer/vintage/region/country and refuses unsafe URLs', async () => {
    const wine = actualMapper({ candidate: await make() }), row = rowFor(wine);
    assert(readCellarMasterReference260(plain(row)));
    for (const patch of [{ name: 'Other' }, { producer: 'Other' }, { vintage: 2024 }, { region: 'Other' }, { country: 'Other' }]) {
      assert.equal(readCellarMasterReference260({ ...row, ...patch }), null);
    }
    for (const patch of [{ public_url: 'https://evil.example/label' }, { sensory_usable: true },
      { known_vintages: ['2023', '2023'] }, { mantalak_wine_id: -1 },
      { public_url: 'https://web.winerim.com/matchrim/store/999/x', representative_public_id: 1 }]) {
      const changed = plain(row);
      Object.assign(changed.place_details.winerim_master_reference260, patch);
      assert.equal(readCellarMasterReference260(changed), null);
    }
    assert.equal(confirmsCellarMasterReference260({}, { name: 'Legacy no reference' }), true);
  });
  await test('Same-owner known-vintage master reference recovers personal verdict without a sensory score', async () => {
    const candidate = await make(zorrera, 2015), wine = actualMapper({ candidate }), row = rowFor(wine);
    const saved = nativeVerdictsSnapshot159(owner, [row], 1);
    assert.equal(resolveNativeRescanVerdict159(owner, saved, candidate), 'love');
    assert.equal(candidate.affinity, null); assert.equal(candidate.sensoryAttributes, null);
    for (const rating of ['ok', 'not_for_me'] as const) {
      assert.equal(resolveNativeRescanVerdict159(owner, nativeVerdictsSnapshot159(owner, [{ ...row, rating }], 1), candidate), rating);
    }
    const attributes = { scale: 'winerim-0-5' as const, potencia: 2, acidez: 3, dulzura: 0, taninos: 4, afrutado: 3 };
    const legacy = { ...row, sensory_attributes: attributes, place_details: {
      bodega_sensory_evidence: makeCellarCatalogEvidence(row, `mantalak:${zorrera.mantalakWineId}`, attributes) } };
    assert.equal(resolveNativeRescanVerdict159(owner, nativeVerdictsSnapshot159(owner, [legacy], 1), candidate), 'love');
    const samePublic = { ...legacy, place_details: {
      bodega_sensory_evidence: makeCellarCatalogEvidence(row, `winerim-public-store:${zorrera.representativePublicId}`, attributes) } };
    assert.equal(resolveNativeRescanVerdict159(owner, nativeVerdictsSnapshot159(owner, [samePublic], 1), candidate), 'love');
    const wrongPublic = { ...legacy, place_details: {
      bodega_sensory_evidence: makeCellarCatalogEvidence(row, `winerim-public-store:${zorrera.representativePublicId + 1}`, attributes) } };
    assert.equal(resolveNativeRescanVerdict159(owner, nativeVerdictsSnapshot159(owner, [wrongPublic], 1), candidate), null);
  });
  await test('Present persisted260metadata also constrains older verified master adapters', async () => {
    const hosted = await make(zorrera, 2015), row = rowFor(actualMapper({ candidate: hosted }));
    const identity = { namespace: 'mantalak', id: String(zorrera.mantalakWineId), name: hosted.name,
      producer: hosted.producer, vintage: '2015', region: null, country: null };
    const legacyInput: WineCandidate = { ...hosted, evidence: [hosted.name, hosted.producer!, '2015'] };
    let calls = 0;
    const result = await lookupNativeMaster102(legacyInput,
      'https://app.winerim.com/api/v1/matchrim/catalogue', undefined, async () => {
        calls++;
        return Response.json(calls === 1 ? { contract: 'matchrim-master-catalogue-v1', scope: 'full-master',
          complete: true, count: 1, matches: [identity] }
          : { contract: 'matchrim-master-catalogue-v1', scope: 'full-master', wine: { ...identity, sensory: null } });
      });
    assert(result.status === 'verified');
    const legacy = { ...applyNativeMaster102(legacyInput, profile, result.record), masterLink259: null };
    assert.equal(resolveNativeRescanVerdict159(owner, nativeVerdictsSnapshot159(owner, [row], 1), legacy), 'love');
    const conflicting = plain(row); conflicting.place_details.winerim_master_reference260.mantalak_wine_id++;
    for (const invalid of [conflicting, { ...row, place_details: { winerim_master_reference260: { bad: true } } }]) {
      assert.equal(resolveNativeRescanVerdict159(owner, nativeVerdictsSnapshot159(owner, [invalid], 1), legacy), null);
    }
  });
  await test('Unknown vintage, foreign owner, conflicting canonical ID, malformed binding and contradictory ratings never leak a verdict', async () => {
    const candidate = await make(zorrera, 2015), row = rowFor(actualMapper({ candidate }));
    const saved = nativeVerdictsSnapshot159(owner, [row], 1);
    assert.equal(resolveNativeRescanVerdict159('OTHER', saved, candidate), null);
    for (const vintage of [null, 2023]) {
      const unknown = await make(zorrera, vintage), unknownRow = rowFor(actualMapper({ candidate: unknown }));
      assert.equal(resolveNativeRescanVerdict159(owner, nativeVerdictsSnapshot159(owner, [unknownRow], 1), unknown), null);
    }
    const conflicting = plain(row);
    conflicting.place_details.winerim_master_reference260.mantalak_wine_id++;
    for (const changed of [conflicting, { ...row, vintage: 2019 },
      { ...row, place_details: { winerim_master_reference260: { bad: true } } },
      { ...row, place_details: { winerim_public_catalogue: { id: 999 } } }]) {
      assert.equal(resolveNativeRescanVerdict159(owner, nativeVerdictsSnapshot159(owner, [changed], 1), candidate), null);
    }
    const contrary = { ...row, id: 'OTHER-ROW260', rating: 'not_for_me' as const };
    assert.equal(resolveNativeRescanVerdict159(owner, nativeVerdictsSnapshot159(owner, [row, contrary], 2), candidate), null);
  });
  await test('Legacy/web save mapping without new native reference stays byte-equivalent', async () => {
    const source = fs.readFileSync(sourceFile, 'utf8');
    const old = execFileSync('git', ['show', `2051562:${sourceFile}`], { encoding: 'utf8' });
    const candidate = await make();
    assert.deepEqual(plain(mapper(source, false)({ candidate })), plain(mapper(old, false)({ candidate })));
  });
  console.log(JSON.stringify({ passed: groups, failed: 0, externalCalls: 0, realUsers: 0, databaseWrites: 0,
    testedActualSaveCallback: true, persistedMasterReferenceRequired: true, sensoryOrLearningGranted: false }));
} finally { globalThis.fetch = previousFetch; }
