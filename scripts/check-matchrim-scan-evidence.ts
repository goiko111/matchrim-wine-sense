import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeWineCandidates, normalizeRecognitionFallback, groupDuplicateWines, areLikelyDuplicateWines, type ScanRegion } from '../src/utils/multiWineScan';
import { applyScanWineEvidence, applyMenuWineEvidence } from '../src/utils/scanWineEvidence';
import { isWineMenuItem } from '../src/utils/wineMenuGrounding';
import { isSafeCanonicalLabelMatch, hasAmbiguousCanonicalMatches } from '../src/utils/winerimLabelIdentity';
import type { MenuScanWine } from '../src/utils/wineMenuScan';

const fixture = JSON.parse(readFileSync(new URL('../qa/fixtures/scan-evidence-oct8.json', import.meta.url), 'utf8'));
let checks = 0;
const check = (name: string, fn: () => void) => { fn(); checks++; console.log('PASS', name); };
const profile = { potente: 4, acidez: 4, dulce: 1, tanico: 3, afrutado: 4 };
const base = normalizeWineCandidates({ candidates: [{ name: 'Mamba', producer: 'La Quinta', confidence: .95 }] }, 'one')[0];
const catalog = { id: 'qa-canonical-1', name: 'La Quinta Mamba', winery: 'La Quinta',
  tastingAttributes: { power: 4, acidity: 3, sweetness: 1, tannin: 4, fruity: 3 } };

check('All three actual non-wine responses rejected before scoring', () => {
  const scene = fixture.cases.find((s: { id: string }) => s.id === 'commons-93111644-etiqueta');
  const analyses = scene.calls.filter((c: { function: string }) => c.function === 'analyze-wine-region');
  assert.equal(analyses.length, 3);
  for (const call of analyses) {
    assert.equal(normalizeWineCandidates(call.payload, call.region_id).length, 0);
    assert.equal(normalizeRecognitionFallback(call.payload)?.code, 'not_wine');
  }
});
for (const name of ['Junmai Ginjo Tokusen', 'ROYAL CASTLE Tequila Gold', 'Baileys The Original Irish Cream', 'Nihonshu Honjozo']) {
  check('Domain gate across menu and catalog: ' + name, () => {
    assert.equal(isWineMenuItem({ nombre: name, texto_fuente: name }), false);
    assert.equal(isSafeCanonicalLabelMatch({ name }, { name }), false);
  });
}
for (const name of ['Amontillado El Contrabandista', 'Oloroso Don Nuno', 'Muga Reserva', 'Cloudy Bay Sauvignon Blanc']) {
  check('Grape wine remains selectable: ' + name, () => assert.equal(normalizeWineCandidates({ candidates: [{ name }] }, 'wine').length, 1));
}
check('Spirits in prose do not remove a real wine', () => assert.equal(isWineMenuItem({ nombre: 'Muga Reserva', texto_fuente: 'Muga Reserva, aromas de brandy', tipo: 'tinto', seccion: 'Vinos y destilados' }), true));
check('Recorded Mamba aliases group as one candidate reference, not proof of physical count', () => {
  const scene = fixture.cases.find((s: { id: string }) => s.id === 'commons-159930620-etiqueta');
  const regions: ScanRegion[] = scene.calls.filter((c: { function: string }) => c.function === 'analyze-wine-region')
    .map((call: { payload: unknown; region_id: string }, index: number) => ({
      id: call.region_id, index, candidates: normalizeWineCandidates(call.payload, call.region_id),
      box: { x: index * 15, y: 0, width: 10, height: 50 }, objectType: 'bottle', detectionConfidence: .9,
      quality: { glare: 'low', occlusion: 'low', legibility: 'good' }, status: 'uncertain', selectedCandidateId: null, duplicateCount: 1,
    }));
  assert.equal(groupDuplicateWines(regions).length, 1);
});
for (const name of ['Mamba Reserva', 'Mamba Gran Reserva', 'Mamba Rose', 'Mamba Brut']) {
  check('Do not erase cuvee qualifier: ' + name, () => assert.equal(areLikelyDuplicateWines(base, { ...base, name }), false));
}
check('Known vintage and winery conflicts remain separate', () => {
  assert.equal(areLikelyDuplicateWines({ ...base, vintage: 2021 }, { ...base, vintage: 2022 }), false);
  assert.equal(areLikelyDuplicateWines(base, { ...base, producer: 'Different Winery', confidence: .55 }), false);
});
check('A name shared by two catalog wineries requires disambiguation', () => assert.equal(hasAmbiguousCanonicalMatches(
  { name: 'La Encina' }, [{ name: 'La Encina', producer: 'Bodega Uno' }, { name: 'La Encina', producer: 'Bodega Dos' }],
), true));
check('Unknown vintage cannot select one of two catalog vintages arbitrarily', () => assert.equal(hasAmbiguousCanonicalMatches(
  { name: 'Mamba' }, [{ name: 'Mamba', vintage: 2020 }, { name: 'Mamba', vintage: 2021 }],
), true));
check('Repeated catalog rows are not artificial ambiguity', () => assert.equal(hasAmbiguousCanonicalMatches(
  { name: 'Mamba' }, [{ name: 'Mamba', producer: 'La Quinta' }, { name: 'Mamba', producer: 'La Quinta' }],
), false));
check('Vision cannot self-declare verified catalog sensory evidence', () => {
  const fake = normalizeWineCandidates({ candidates: [{ name: 'Mamba', source: 'catalog', affinity: 99 }] }, 'fake')[0];
  assert.equal(fake.source, 'label'); assert.equal(fake.affinity, null);
  assert.equal(applyScanWineEvidence(fake, profile).affinity, null);
});
check('Different photo-inferred attributes produce the same catalog-backed score', () => {
  const a = applyScanWineEvidence({ ...base, sensoryAttributes: { potencia: 1, acidez: 1, dulzura: 5, taninos: 1, afrutado: 1 } }, profile, catalog);
  const b = applyScanWineEvidence({ ...base, sensoryAttributes: { potencia: 5, acidez: 5, dulzura: 1, taninos: 5, afrutado: 5 } }, profile, catalog);
  assert.equal(typeof a.affinity, 'number'); assert.equal(a.affinity, b.affinity);
  assert.deepEqual(a.sensoryAttributes, b.sensoryAttributes);
  assert.equal(a.canonicalId, 'qa-canonical-1'); assert.equal(a.sensorySource, 'catalog');
});
check('Missing catalog or mismatched vintage does not borrow the photo score', () => {
  assert.equal(applyScanWineEvidence({ ...base, affinity: 99 }, profile).affinity, null);
  assert.equal(applyScanWineEvidence({ ...base, vintage: 2020 }, profile, { ...catalog, vintage: 2021 }).affinity, null);
  assert.equal(applyScanWineEvidence(base, profile, { ...catalog, vintage: 2021 }).affinity, null);
  assert.equal(applyScanWineEvidence(base, profile, { ...catalog, tastingAttributes: null }).affinity, null);
  assert.equal(applyScanWineEvidence(base, null, catalog).affinity, null);
});
check('Recorded menus cannot retain provider percentages without canonical sensory evidence', () => {
  let rows = 0;
  for (const scene of fixture.cases) for (const call of scene.calls) {
    if (call.function !== 'scan-wine-menu' || call.status !== 200) continue;
    for (const wine of (call.payload.vinos ?? []) as MenuScanWine[]) {
      const result = applyMenuWineEvidence(wine, profile);
      assert.equal(result.compatibilidad, null); assert.match(result.razon ?? '', /ficha/); rows++;
    }
  }
  assert.ok(rows >= 40);
});
console.log(JSON.stringify({ checks, passed: checks, remoteCalls: 0, scope: 'recorded-response and synthetic catalog regression; not new recognition accuracy' }));
