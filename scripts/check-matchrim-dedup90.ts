import assert from 'node:assert/strict';
import { normalizeDetectedRegions, normalizeWineCandidates, groupDuplicateWines, areLikelyDuplicateWines, type WineCandidate, type ScanRegion } from '../src/utils/multiWineScan';
import { isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';
import { applyScanWineEvidence } from '../src/utils/scanWineEvidence';

let checks = 0;
const base = normalizeWineCandidates({ candidates: [{ name: 'La Encina', producer: 'Casa Uno', confidence: .8 }] }, 'base')[0];
const scene = (candidates: WineCandidate[]): ScanRegion[] => candidates.map((candidate, i) => ({
  ...normalizeDetectedRegions({ regions: [{ box: { x: i * 20, y: 10, width: 10, height: 30 } }] })[0],
  id: `source-${i}`, index: i + 1, status: 'uncertain', candidates: [candidate], selectedCandidateId: candidate.id,
}));
const permutations = <T>(values: T[]): T[][] => values.length <= 1 ? [values] : values.flatMap((item, i) =>
  permutations(values.filter((_, index) => index !== i)).map((rest) => [item, ...rest]));
const cases = [
  [{ ...base, id: 'known20', vintage: 2020 }, { ...base, id: 'unknown', vintage: null, confidence: .99 }, { ...base, id: 'known21', vintage: 2021 }],
  [{ ...base, id: 'producerA' }, { ...base, id: 'unknown', producer: null, confidence: .99 }, { ...base, id: 'producerB', producer: 'Casa Dos' }],
  [{ ...base, id: 'canonA', canonicalId: 'real-A' }, { ...base, id: 'unknown', canonicalId: null, confidence: .99 }, { ...base, id: 'canonB', canonicalId: 'real-B' }],
];
for (const candidates of cases) for (const order of permutations(candidates)) {
  const regions = scene(order), before = JSON.stringify(regions);
  const groups = groupDuplicateWines(regions);
  assert.equal(groups.length, 2, 'Incomplete high-confidence candidate cannot bridge known conflicting references'); checks++;
  for (const group of groups) {
    const members = regions.filter((r) => group.regionIds.includes(r.id)).map((r) => r.candidates[0]);
    for (const left of members) for (const right of members) {
      assert.equal(areLikelyDuplicateWines(left, right), true, 'Every grouped pair retains compatible evidence'); checks++;
    }
    assert.equal(group.count, group.regionIds.length); checks++;
  }
  assert.equal(JSON.stringify(regions), before); checks++;
}
for (const order of permutations([{ ...base, id: 'low', confidence: .49 }, { ...base, id: 'high', confidence: .95 }])) {
  assert.equal(groupDuplicateWines(scene(order)).length, 2, 'An ineligible low-confidence first row cannot be absorbed later'); checks++;
}
assert.equal(groupDuplicateWines(scene([{ ...base, id: 'same1' }, { ...base, id: 'same2' }])).length, 1); checks++;
assert.equal(areLikelyDuplicateWines({ ...base, canonicalId: 'A' }, { ...base, canonicalId: 'B' }), false); checks++;

// Product words observed in the seven public GETs; these guards do not declare
// which catalog record, if any, is the photographed bottle.
for (const [name, catalogName, producer] of [
  ['AVAN', 'Avancia Nobleza Mencía', 'Avancia'], ['AVAN', 'Avancia Godello', 'Avancia'],
  ['Muga', 'Flor de Muga Blanco', 'Muga'], ['Muga', 'Flor de Muga Rosado', 'Muga'],
  ['Corimbo', 'Corimbo I', 'Bodegas La Horra'], ['Bosque de Matasnos', 'Bosque de Matasnos Etiqueta Blanca', 'Bosque de Matasnos'],
]) {
  assert.equal(isSafeCanonicalLabelMatch({ name }, { name: catalogName, producer }), false, 'Public substring search is not canonical identity'); checks++;
}
const candidate = normalizeWineCandidates({ candidates: [{ name: 'Bosque de Matasnos', producer: 'Bosque de Matasnos', confidence: .95 }] }, 'catalog')[0];
const grounded = applyScanWineEvidence(candidate, { potente: 4, acidez: 3, dulce: 1, tanico: 4, afrutado: 4 }, {
  id: '279910', name: 'Bosque de Matasnos', winery: 'Bosque de Matasnos', vintage: 2022,
  tastingAttributes: { power: 4, acidity: 3, sweetness: 1, tannin: 4, fruity: 4 },
});
assert.equal(grounded.canonicalId, null, 'Unknown pixel vintage must not borrow the catalog year'); checks++;
assert.equal(grounded.affinity, null); checks++;
console.log(JSON.stringify({ checks, passed: true, scope: 'Synthetic group invariants and observed-name refusal regressions; not canonical photo validation or new recognition' }));
