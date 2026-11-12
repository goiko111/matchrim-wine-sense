import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { parseMasterDetail188, masterVintageEvidence188, type MasterDetail188 } from '../src/utils/nativeMasterContract188';
import { describeMasterSensory195, type MasterInvoke195 } from '../src/utils/nativeMasterReference195';
import { resolveMasterCandidate259, nativeMasterLink259, masterAffinityGap259, masterSensory259, masterSensorySummary259 } from '../src/utils/nativeMasterLink259';
import { nativeDuplicateWineGroups261 } from '../src/utils/nativeMasterDuplicates261';
import { nativeWineConsumerResult } from '../src/utils/multiWineConsumer95';
import { correctNativeIdentity218 } from '../src/utils/nativeIdentityCorrection218';
import { isNonWineIdentity } from '../src/utils/wineCategory';
import type { ScanRegion, WineCandidate } from '../src/utils/multiWineScan';

// Offline reconciliation of the retained first20 details. Lookup by the supplied
// manifest ID is the ground truth here; it is not OCR or photo recognition.
type Row279 = { imageId: string; canonicalId: number; name: string; winery?: string; httpStatus: number;
  observedVintageHint?: string | null; declaredVintages: string[] | null; vintageHintStatus?: string;
  selectedSensoryScope?: string; sensoryRows: number | null };
const ledger = JSON.parse(fs.readFileSync('qa-fixtures/first20-279/RESULT.json', 'utf8')) as {
  rows: Row279[]; sources: { file: string; sha256: string }[] };
const hashed = new Map(ledger.sources.map(source => [source.file, source.sha256]));
const bodies = new Map<number, { file: string; body: unknown }>();
for (const [file, sha256] of hashed) {
  if (!file.endsWith('-BODY.json')) continue;
  const bytes = fs.readFileSync(file);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), sha256, `retained body changed: ${file}`);
  const body = JSON.parse(bytes.toString('utf8'));
  if (typeof body?.mantalakWineId === 'number' && ledger.rows.some(row => row.canonicalId === body.mantalakWineId)) {
    assert(!bodies.has(body.mantalakWineId)); bodies.set(body.mantalakWineId, { file, body });
  }
}
const candidate = (row: Row279, patch: Partial<WineCandidate> = {}): WineCandidate => ({ id: `first20-283-${row.imageId}`,
  name: row.name, producer: row.winery ?? null, vintage: row.observedVintageHint ? Number(row.observedVintageHint) : null,
  region: null, country: null, grapes: [], alcohol: null, source: 'label', confidence: .9,
  evidence: [row.name, row.winery ?? '', ...(row.observedVintageHint ? [row.observedVintageHint] : [])],
  uncertaintyReasons: [], inferredFields: [], ...patch });
// Search response rebuilt from the retained detail only to drive the bounded resolver.
const transport = (wine: MasterDetail188, raw: unknown) => {
  const listed = wine.representativePublicId !== null;
  const row = { mantalakWineId: wine.mantalakWineId, name: wine.name, winery: wine.winery, type: wine.type,
    country: wine.country, region: wine.region, grapes: wine.grapes, vintages: wine.vintages, photo: wine.photo,
    slugname: wine.slugname, webUrl: listed ? wine.webUrl : null, id: listed ? wine.representativePublicId : null,
    representativePublicId: listed ? wine.representativePublicId : null, tastingAttributes: {} };
  const page = { results: [row], count: 1, total: 1, page: 1, limit: 10, pageCount: 1 };
  let calls = 0;
  const invoke: MasterInvoke195 = async operation => { assert(++calls <= 2);
    return structuredClone(operation.operation === 'search' ? page : raw); };
  return { invoke, calls: () => calls };
};
const makeRegion = (id: string, value: WineCandidate): ScanRegion => ({
  id, index: 1, objectType: 'bottle', box: { x: 0, y: 0, width: 20, height: 80 }, detectionConfidence: .9,
  quality: { glare: 'low', occlusion: 'low', legibility: 'good' }, status: 'recognized',
  candidates: [value], selectedCandidateId: value.id, duplicateCount: 1, error: null });
const profile = { potente: 3, acidez: 4, dulce: 1, tanico: 2, afrutado: 4 };

const oldFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('FIRST20_283_NO_NETWORK'); };
const matrix: Record<string, unknown>[] = [];
let groups = 0;
const test = async (name: string, work: () => void | Promise<void>) => { await work(); groups++; console.log('PASS', name); };
try {
  await test('Ledger has 20 unique references; only the original 503 lacks a retained body', () => {
    assert.equal(ledger.rows.length, 20);
    assert.equal(new Set(ledger.rows.map(row => row.canonicalId)).size, 20);
    assert.equal(new Set(ledger.rows.map(row => row.imageId)).size, 20);
    const failed = ledger.rows.filter(row => row.httpStatus !== 200);
    assert.deepEqual(failed.map(row => [row.imageId, row.canonicalId, row.httpStatus]), [['img-001', 217496, 503]]);
    assert.equal(bodies.size, 19); assert(!bodies.has(217496));
    matrix.push({ imageId: 'img-001', canonicalId: 217496, actual: 'not-evaluated: original 503 retained, no retry' });
  });
  await test('Each retained detail parses and matches the ledger identity, declared vintages and row counts', async () => {
    for (const row of ledger.rows.filter(value => value.httpStatus === 200)) {
      const { file, body } = bodies.get(row.canonicalId)!;
      const wine = parseMasterDetail188(body, row.canonicalId); assert(wine, `${row.imageId} rejected`);
      assert.equal(wine.name.normalize('NFC'), row.name.normalize('NFC')); assert.equal(wine.winery, row.winery);
      assert.deepEqual(wine.vintages, row.declaredVintages); assert.equal(wine.tastingAttributes.attributesByVintage.length, row.sensoryRows);
      const requested = row.observedVintageHint ?? null, evidence = masterVintageEvidence188(wine, requested);
      assert.equal(evidence.status, row.vintageHintStatus); assert.equal(evidence.scope, row.selectedSensoryScope);
      const input = candidate(row), h = transport(wine, body);
      const result = await resolveMasterCandidate259(input, h.invoke, undefined, 8000, profile);
      if (isNonWineIdentity(row.name)) {
        // The catalogue lists a vermouth; the app deliberately excludes it before any read.
        assert.equal(result.status, 'identity-required'); assert.equal(h.calls(), 0);
        matrix.push({ imageId: row.imageId, canonicalId: row.canonicalId, file, declaredVintages: wine.vintages,
          sensoryRows: wine.tastingAttributes.attributesByVintage.length, vintageStatus: evidence.status,
          actual: 'not-searched: non-wine category rule (vermut) in wineCategory.ts; product decision pending' });
        continue;
      }
      assert.equal(result.status, 'reference-ready', `${row.imageId} did not bind`); assert(result.status === 'reference-ready');
      assert.equal(h.calls(), 2);
      // The OCR hint stays the bottle vintage; the catalogue years never overwrite it.
      assert.equal(result.candidate.vintage, input.vintage);
      const link = nativeMasterLink259(result.candidate); assert(link);
      const consumer = nativeWineConsumerResult(result.candidate, profile), sensory = masterSensory259(link);
      assert.equal(consumer.catalogIdentityLinked, true);
      const rowYears = wine.tastingAttributes.attributesByVintage.flatMap(value => value.vintage ? [value.vintage] : []);
      // 285: Winerim's own row for this harvest (or its general row) scores; another harvest's row never does.
      assert.equal(Boolean(sensory), evidence.scope !== 'missing');
      if (sensory) {
        assert.deepEqual(result.candidate.sensoryAttributes, sensory.attributes);
        assert.equal(typeof result.candidate.affinity, 'number'); assert.equal(consumer.canExplainAffinity, true);
        assert.equal(consumer.affinityValue, `≈${consumer.shownScore}/100`); if (((sensory.attributes as Record<string, unknown>).tannin ?? (sensory.attributes as Record<string, unknown>).taninos) !== 0) assert.equal(consumer.shownScore, result.candidate.affinity); assert.equal(consumer.pending, null);
        matrix.push({ imageId: row.imageId, canonicalId: row.canonicalId, file, bottleVintage: requested,
          declaredVintages: wine.vintages, sensoryRows: rowYears.length ? rowYears : ['generic'], vintageStatus: evidence.status,
          sensoryScope: evidence.scope, summary: masterSensorySummary259(link)!.description, affinity: consumer.affinityValue, imageIdentityConfirmed: false });
        continue;
      }
      assert.equal(result.candidate.affinity, null); assert.equal(result.candidate.sensoryAttributes, null);
      const gap = masterAffinityGap259(link);
      assert.equal(consumer.canExplainAffinity, false);
      assert(!/\d/.test(consumer.affinityValue)); assert.equal(consumer.pending?.reason, 'sensory');
      assert.deepEqual(consumer.pending, gap);
      if (wine.tastingAttributes.attributesByVintage.length) assert(!gap.description.includes('no incluye'), `${row.imageId} denies existing rows`);
      else assert(gap.description.includes('no incluye'));
      if (rowYears.length) {
        for (const year of rowYears) { assert(gap.description.includes(year)); assert(gap.summary.includes(year)); }
        assert(gap.description.includes('No los aplicamos a otra cosecha'));
      }
      if (evidence.status === 'other-vintages-only') {
        assert(gap.nextStep.includes(requested!)); for (const year of wine.vintages) assert(gap.nextStep.includes(year));
        assert(gap.nextStep.includes('Ficha e identificación'));
      }
      if (evidence.status === 'unspecified' && wine.vintages.length) assert(gap.nextStep.startsWith('Indica la añada'));
      for (const text of [gap.summary, gap.description, gap.nextStep]) assert(!/tampoco|verificad|relleno/i.test(text), `${row.imageId}: ${text}`);
      matrix.push({ imageId: row.imageId, canonicalId: row.canonicalId, file, bottleVintage: requested,
        declaredVintages: wine.vintages, sensoryRows: rowYears.length ? rowYears : wine.tastingAttributes.attributesByVintage.length ? ['generic'] : [],
        vintageStatus: evidence.status, sensoryScope: evidence.scope, summary: gap.summary, nextStep: gap.nextStep,
        affinity: consumer.affinityValue, imageIdentityConfirmed: false });
    }
  });
  await test('020: a human correction to 2020 rebinds to the exact row and scores with Winerim 2020 values (285)', async () => {
    const row = ledger.rows.find(value => value.imageId === 'img-020')!, { body } = bodies.get(row.canonicalId)!;
    const wine = parseMasterDetail188(body, row.canonicalId)!;
    const first = await resolveMasterCandidate259(candidate(row), transport(wine, body).invoke, undefined, 8000, profile);
    assert(first.status === 'reference-ready'); assert.equal(first.candidate.vintage, 2000);
    assert.equal(first.candidate.affinity, null, '2020 values are never applied to a 2000 bottle');
    const corrected = correctNativeIdentity218(first.candidate, { name: row.name, producer: row.winery!, vintage: 2020 });
    assert(corrected); assert.equal(nativeMasterLink259(corrected), null); assert.equal(corrected.canonicalId, null);
    const rebound = await resolveMasterCandidate259(corrected, transport(wine, body).invoke, undefined, 8000, profile);
    assert(rebound.status === 'reference-ready'); const link = nativeMasterLink259(rebound.candidate); assert(link);
    const evidence = masterVintageEvidence188(link.wine, '2020');
    assert.equal(evidence.status, 'known'); assert.equal(evidence.scope, 'exact');
    assert.deepEqual(rebound.candidate.sensoryAttributes, { scale: 'winerim-0-5', potencia: 3, acidez: 4, dulzura: 1, taninos: 0, afrutado: 4 });
    const shown = nativeWineConsumerResult(rebound.candidate, profile);
    assert.equal(shown.canExplainAffinity, true); assert.equal(rebound.candidate.affinity, 77);
    // 145 (owner's decision): this white's tannin of 0 is not compared, so the sheet and the list say more than the saved score, which stays 77.
    assert.equal(shown.affinityValue, '≈93/100');
    assert(masterSensorySummary259(link)!.description.includes('añada 2020'));
    matrix.push({ imageId: 'img-020', variant: 'human corrected 2000 -> 2020', vintageStatus: evidence.status,
      sensoryScope: evidence.scope, affinity: shown.affinityValue });
  });
  await test('018/019 under another stated cosecha stay other-vintages-only and never borrow 2024', async () => {
    for (const imageId of ['img-018', 'img-019']) {
      const row = ledger.rows.find(value => value.imageId === imageId)!, { body } = bodies.get(row.canonicalId)!;
      const wine = parseMasterDetail188(body, row.canonicalId)!;
      const result = await resolveMasterCandidate259(candidate(row, { vintage: 2023,
        evidence: [row.name, row.winery!, '2023'] }), transport(wine, body).invoke);
      assert(result.status === 'reference-ready'); const link = nativeMasterLink259(result.candidate)!;
      const evidence = masterVintageEvidence188(link.wine, '2023'), gap = masterAffinityGap259(link);
      assert.equal(evidence.status, 'other-vintages-only'); assert.equal(evidence.scope, 'missing'); assert.equal(evidence.sensory, null);
      assert.equal(gap.summary, 'Datos de sabor solo de 2024');
      assert(gap.nextStep.includes('la añada 2024') && gap.nextStep.includes('de 2023'));
    }
  });
  await test('Synthetic year lists keep wording bounded; a general row is used, another harvest never is', () => {
    const { body } = bodies.get(217477)!, wine = parseMasterDetail188(body, 217477)!;
    const years = ['2016', '2017', '2018', '2019', '2020'];
    const rows = years.map(vintage => ({ ...wine.tastingAttributes.attributesByVintage[0], vintage,
      source: { type: 'ai' as const, model: 'SYNTHETIC-283', confidence: 1, generatedAt: '2026-10-28T00:00:00Z' } }));
    const many = { ...wine, vintages: years, tastingAttributes: { ...wine.tastingAttributes, attributesByVintage: rows } };
    const gap = masterAffinityGap259({ candidateId: 'synthetic', name: wine.name, producer: wine.winery,
      vintage: null, region: null, country: null, wine: many });
    assert.equal(gap.summary, 'Datos de sabor solo de 2016, 2017, 2018 y 2 más');
    assert(gap.nextStep.includes('las añadas 2016, 2017, 2018 y 2 más'));
    const two = masterAffinityGap259({ candidateId: 'synthetic', name: wine.name, producer: wine.winery, vintage: 2015,
      region: null, country: null, wine: { ...many, vintages: ['2019', '2020'], tastingAttributes: { ...many.tastingAttributes,
        attributesByVintage: rows.slice(3) } } });
    assert.equal(two.summary, 'Datos de sabor solo de 2019 y 2020'); assert(two.nextStep.includes('las añadas 2019 y 2020'));
    const described = describeMasterSensory195(many, '2018');
    assert(described.axes.every(axis => axis.status !== 'origin-unrecorded' && !axis.usableForAffinity));
    const generic = masterAffinityGap259({ candidateId: 'synthetic', name: wine.name, producer: wine.winery, vintage: 1999,
      region: null, country: null, wine: { ...wine, vintages: [], tastingAttributes: { ...wine.tastingAttributes, dependsOnVintage: false,
        attributesByVintage: [{ ...wine.tastingAttributes.attributesByVintage[0], vintage: null }] } } });
    void generic;
    const genericLink = { candidateId: 'synthetic', name: wine.name, producer: wine.winery, vintage: 1999,
      region: null, country: null, wine: { ...wine, vintages: [], tastingAttributes: { ...wine.tastingAttributes, dependsOnVintage: false,
        attributesByVintage: [{ ...wine.tastingAttributes.attributesByVintage[0], vintage: null }] } } };
    assert.equal(masterSensory259(genericLink)?.scope, 'generic');
    assert(masterSensorySummary259(genericLink)!.description.includes('generales de Winerim'));
  });
  await test('Two bottles of 020 read as 2000 and corrected 2020 are not merged into one wine', async () => {
    const row = ledger.rows.find(value => value.imageId === 'img-020')!, { body } = bodies.get(row.canonicalId)!;
    const wine = parseMasterDetail188(body, row.canonicalId)!;
    const ocr = await resolveMasterCandidate259(candidate(row), transport(wine, body).invoke);
    const manual = await resolveMasterCandidate259(candidate(row, { id: 'first20-283-manual', source: 'manual', vintage: 2020,
      evidence: ['Identidad indicada por el usuario'] }), transport(wine, body).invoke);
    assert(ocr.status === 'reference-ready' && manual.status === 'reference-ready');
    const regions = [makeRegion('ocr-2000', ocr.candidate), makeRegion('manual-2020', manual.candidate)], before = JSON.stringify(regions);
    for (const input of [regions, [...regions].reverse()]) {
      const grouped = nativeDuplicateWineGroups261(input);
      assert.equal(grouped.length, 2); assert.deepEqual(grouped.map(group => group.count), [1, 1]);
      for (const group of grouped) assert.equal(group.candidate.vintage, group.regionIds[0] === 'ocr-2000' ? 2000 : 2020);
    }
    assert.equal(JSON.stringify(regions), before);
  });
  const out = process.argv.indexOf('--out');
  if (out > 0) fs.writeFileSync(process.argv[out + 1], JSON.stringify({ scope: 'Offline first20 catalogue/vintage/sensory UI-state reconciliation from retained bodies; NOT OCR, photo recognition, live lookup or taste accuracy',
    matrix, metrics: { groups, retainedDetails: bodies.size, externalCalls: 0, affinityGranted: matrix.filter(row => typeof row.affinity === 'string' && row.affinity.startsWith('≈')).length, imageIdentitiesConfirmed: 0 } }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: groups, failed: 0, retainedDetails: bodies.size, externalCalls: 0,
    affinityGranted: matrix.filter(row => typeof row.affinity === 'string' && row.affinity.startsWith('≈')).length }));
} finally { globalThis.fetch = oldFetch; }
