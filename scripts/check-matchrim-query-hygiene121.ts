import assert from 'node:assert/strict';
import { globalRecoveryQueries104 as queries, rankGlobalProposals104 } from '../src/utils/globalWineProposals104';

assert.deepEqual(queries('Etiqueta por identificar', ['CELLER', 'Cuvee Oriole', 'VINO ECOLÓGICO', 'Casa Roca']), ['Cuvee Oriole', 'Casa Roca']);
assert.deepEqual(queries('Etiqueta por identificar', ['PET-NAT', 'MALVAR', 'INDICACIÓN GEOGRÁFICA PROTEGIDA']), []);
assert.deepEqual(queries('Etiqueta por identificar', ['-Mat', 'Cuvee Oriole', 'Casa Roca']), ['Cuvee Oriole', 'Casa Roca']);
assert.deepEqual(queries('Etiqueta por identificar', ['Oriole,', 'Casa Roca;']), ['Oriole', 'Casa Roca']);
assert.deepEqual(queries('Etiqueta por identificar', ["L'Or de la Maison", 'Ancestral de Casa Oriole']), ["L'Or de la Maison", 'Ancestral de Casa Oriole']);
assert.deepEqual(queries('Etiqueta por identificar', ['7 Fuentes', 'Celler Casa Roca']), ['7 Fuentes', 'Celler Casa Roca']);
assert.deepEqual(queries('Celler Casa Roca', ['Unrelated'], true), ['Celler Casa Roca']);
const raw = Object.freeze(['CELLER', 'Cuvee Oriole,', 'VINO ECOLÓGICO', 'Casa Roca']);
const before = [...raw]; queries('Etiqueta por identificar', raw); assert.deepEqual(raw, before);
const row = { id: 1, name: 'Casa Roca Ancestral', winery: 'Casa Roca', vintage: null, slugname: 'Casa-Roca-Ancestral' };
assert.equal(rankGlobalProposals104(['Casa Roca', 'Ancestral'], [row]).length, 1, 'Query metadata never removes identity qualifiers from ranking');
console.log(JSON.stringify({ groups: 6, networkCalls: 0, models: 0,
  scope: 'Actual native query allocation on synthetic label fragments, no names/IDs from the200 fixtures' }));
