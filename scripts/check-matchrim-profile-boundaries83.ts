import assert from 'node:assert/strict';
import { resolveScanProfile } from '../src/utils/scanProfile';
import { readMatchrimLocalProfile } from '../src/utils/matchrimLocalProfile';
import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';
import { calculateEdgeLearnedProfileAudit } from '../supabase/functions/_shared/matchrim-learning';
import { buildDetailedAffinityExplanation, calculateLocalMatchrimAffinity, readStoredMatchrimProfile } from '../src/utils/wineAffinityExplanation';

const zero = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
const signal = new AbortController().signal;
let raw = JSON.stringify(zero);
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => raw } });
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: globalThis.localStorage } });
assert.deepEqual(readMatchrimLocalProfile(), zero, 'Valid zero quiz vector remains unchanged');
assert.deepEqual(readStoredMatchrimProfile(), zero, 'Actual scanner/service reader also preserves quiz zeros');
const lowWine = { potencia: 1, acidez: 1, dulzura: 1, taninos: 1, afrutado: 1 };
const detail = buildDetailedAffinityExplanation(zero, lowWine, { sensorySource: 'catalog' })!;
assert.ok(detail.dimensions.slice(0, 5).every(dimension => dimension.profileValue === 0));
assert.notEqual(calculateLocalMatchrimAffinity(zero, lowWine), calculateLocalMatchrimAffinity({ potente: 1, acidez: 1, dulce: 1, tanico: 1, afrutado: 1 }, lowWine));
for (const owner of [null, 'synthetic-owner']) {
  const result = await resolveScanProfile(owner, zero, { base: async () => zero, training: async () => [] }, signal);
  assert.equal(result.status, 'ready'); assert.deepEqual(result.profile, zero);
}
for (const value of [-1, 6, NaN, Infinity, null, undefined]) {
  const result = await resolveScanProfile('synthetic-owner', null, { base: async () => ({ ...zero, acidez: value }) as never, training: async () => [] }, signal);
  assert.equal(result.status, 'invalid'); assert.equal(result.profile, null);
}
raw = JSON.stringify({ ...zero, acidez: -1 });
assert.equal(readMatchrimLocalProfile(), null, 'Negative input is invalid, not a new preference');
let cases = 0;
const base = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
for (const value of [-1, 0, .4, 1, 5, 6, 10, 11, 20, 100, null, '', 'bad', false]) {
  for (const rating of ['love', 'ok', 'not_for_me'] as const) {
    const rows = [{ id: 'synthetic-boundary', rating, use_for_profile_training: true,
      sensory_attributes: { potencia: value, acidez: value, dulzura: value, taninos: value, afrutado: value } }];
    const client = calculateLearnedMatchrimProfile(base, rows);
    const edge = calculateEdgeLearnedProfileAudit(base, rows);
    assert.deepEqual(client.profile, edge.profile, 'Client/Edge normalization boundary ' + String(value));
    assert.equal(client.samples, edge.samples); assert.equal(client.confidence, edge.confidence); cases++;
  }
}
console.log(JSON.stringify({ scope: 'Real source functions, synthetic boundary evidence only; no API or human preferences', boundaryCases: cases,
  zeroQuizPreserved: true, ownerParity: true, clientEdgeParity: true, invalidInputsRejected: true }));
