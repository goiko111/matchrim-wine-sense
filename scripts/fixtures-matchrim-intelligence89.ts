import { makeCellarCatalogEvidence } from '../src/utils/bodegaAffinity';
import type { Intelligence89Item, Intelligence89Plan, Intelligence89Training } from './matchrim-intelligence89';

export const base89 = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
export const sensory89 = (value: number) => ({ potencia: value, acidez: value, dulzura: value,
  taninos: value, afrutado: value });
export function item89(index: number, attrs = sensory89(4), ownerId = 'owner-a'): Intelligence89Item {
  const wine = { name: 'Synthetic intelligence89 wine ' + index, producer: 'Synthetic intelligence89 producer ' + index,
    vintage: 2023, region: 'Synthetic', country: 'Synthetic', sensory_attributes: attrs, place_details: {} };
  return { item_id: ownerId + '-item-' + index, owner_id: ownerId, wine_group: 'synthetic-family-' + index,
    feature_source: 'catalog', feature_reference: 'SYNTHETIC-NOT-A-REAL-CATALOG-SHEET-' + index,
    wine: { ...wine, place_details: { fixture: 'intelligence89-synthetic',
      bodega_sensory_evidence: makeCellarCatalogEvidence(wine, 'SYN-intelligence89-' + index, attrs) } } };
}
export function training89(index: number, value = 4,
  rating: Intelligence89Training['rating'] = 'love', ownerId = 'owner-a'): Intelligence89Training {
  return { ...item89(index, sensory89(value), ownerId), row_id: ownerId + '-row-' + index, rating,
    use_for_profile_training: true, rated_at: '2026-01-01T00:00:00Z', rating_source: 'synthetic' };
}
export function plan89(): Intelligence89Plan {
  return { version: 'intelligence89-v1', study_id: 'SYNTHETIC-intelligence89', evidence_kind: 'synthetic',
    selection: 'predeclared_without_test_outcomes', cutoff_at: '2026-02-01T00:00:00Z',
    minimum_owners: 2, minimum_training: 1, minimum_test: 3, bootstrap_seed: 89,
    owners: [{ owner_id: 'owner-a', base_profile: { ...base89 }, training: [training89(0)],
      test: [item89(10, sensory89(1)), item89(11, sensory89(3)), item89(12, sensory89(5))] }] };
}

// Frozen QA85 synthetic inputs, not real sensory sheets or independent taste labels.
export const historicalCatalog89 = [
  ['albarino-atlantico', [2, 5, 1, 1, 4]], ['godello-redondo', [3, 3, 2, 1, 4]],
  ['rioja-reserva', [5, 3, 1, 5, 3]], ['mencia-fresca', [3, 4, 1, 2, 4]],
  ['tinto-frutal', [2, 3, 2, 1, 5]], ['moscatel-dulce', [2, 3, 5, 1, 5]],
  ['nebbiolo-estructurado', [5, 5, 1, 5, 2]], ['blanco-baja-acidez', [3, 1, 3, 1, 4]],
] as const;
export const historicalArchetypes89 = [
  ['frutal', [2, 3, 2, 1, 5]], ['seco-ligero', [1, 3, 0, 1, 3]],
  ['estructurado', [5, 3, 1, 5, 3]], ['atlantico', [2, 5, 1, 1, 4]],
  ['dulce', [2, 3, 5, 1, 5]], ['espumoso', [2, 5, 1, 0, 3]],
  ['sommelier', [4, 4, 1, 4, 3]], ['explorador', [3, 4, 2, 3, 4]],
  ['contradictorio', [5, 1, 5, 0, 1]],
] as const;
