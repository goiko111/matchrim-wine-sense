import assert from 'node:assert/strict';
import { resolveScanProfile } from '../src/utils/scanProfile';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '../src/utils/matchrimLearning';
import { applyMenuWineEvidence, applyScanWineEvidence } from '../src/utils/scanWineEvidence';
import { normalizeWineCandidates } from '../src/utils/multiWineScan';
import { reconcileMatchrimLocalOwner } from '../src/utils/matchrimLocalOwner';
import { buildDetailedAffinityExplanation } from '../src/utils/wineAffinityExplanation';

const base = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
const training: TrainableWine[] = Array.from({ length: 15 }, (_, i) => ({
  id: `SYN-${i}`, rating: 'love', use_for_profile_training: true,
  sensory_attributes: { potencia: 5, acidez: 4, dulzura: 1, taninos: 4, afrutado: 5 },
}));
const signal = new AbortController().signal;
const snapshot = await resolveScanProfile('SYN-user', null, { base: async () => base, training: async () => training }, signal);
assert.equal(snapshot.source, 'learned');
assert.deepEqual(snapshot.profile, calculateLearnedMatchrimProfile(base, training).profile);
assert.notDeepEqual(snapshot.profile, base);
assert.deepEqual(base, { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 }, 'base quiz/code stays unchanged');
const candidate = normalizeWineCandidates({ candidates: [{ name: 'Mamba', producer: 'La Quinta', confidence: .95 }] }, 'one')[0];
const catalog = { id: 'SYN-catalog', name: 'La Quinta Mamba', winery: 'La Quinta',
  tastingAttributes: { power: 5, acidity: 4, sweetness: 1, tannin: 4, fruity: 5 } };
const label = applyScanWineEvidence(candidate, snapshot.profile, catalog);
const menu = applyMenuWineEvidence({ nombre: candidate.name, productor: candidate.producer, anada: null, region: null, pais: null, confidence: .95 }, snapshot.profile, catalog);
assert.equal(label.affinity, menu.compatibilidad, 'same active profile/catalog sheet yields same score in both scanner modes');
assert.notEqual(label.affinity, applyScanWineEvidence(candidate, base, catalog).affinity, 'learning affects scanner score');
const explanation = buildDetailedAffinityExplanation(snapshot.profile, { ...label.sensoryAttributes, madera: 3, intensidad: 4 }, { score: label.affinity, sensorySource: 'catalog' })!;
assert.ok(explanation.dimensions.slice(0, 5).every(d => d.weight === .2), 'displayed weights match actual equal-axis calculation');
assert.ok(explanation.dimensions.filter(d => d.key === 'madera' || d.key === 'intensidad').every(d => d.weight === 0), 'extra descriptors are not secretly scored');
let reads = 0;
const unused = { base: async () => { reads++; return base; }, training: async () => { reads++; return training; } };
const anon = await resolveScanProfile(null, base, unused, signal);
assert.equal(anon.source, 'quiz'); assert.equal(reads, 0);
const fail = async () => { throw new Error('SYN network failure'); };
const noBase = await resolveScanProfile('SYN-other-user', base, { base: fail, training: fail }, signal);
assert.equal(noBase.profile, null, 'must not reuse stale account/anonymous cache on authenticated error');
const noTraining = await resolveScanProfile('SYN-user', null, { base: async () => base, training: fail }, signal);
assert.equal(noTraining.source, 'quiz'); assert.equal(noTraining.samples, null);
assert.match(noTraining.note, /no se pudieron/);
const abort = new AbortController();
await assert.rejects(resolveScanProfile('SYN-user', null, {
  base: async () => { abort.abort(); return base; }, training: async () => training,
}, abort.signal), { name: 'AbortError' });
const excluded = await resolveScanProfile('SYN-user', null, {
  base: async () => base, training: async () => training.map(w => ({ ...w, use_for_profile_training: false })),
}, signal);
assert.equal(excluded.samples, 0, 'explicit training exclusion preserved');

const data = new Map<string, string>([
  ['matchrim.local_profile_owner.v1', 'SYN-A'],
  ['matchrim_quiz_result', JSON.stringify(base)],
  ['matchrim.affinity_feedback.wine-legacy', '{"acidez":"hit"}'],
  ['matchrim.affinity_feedback.SYN-A:wine', '{"acidez":"miss"}'],
  ['matchrim.scan_privacy_notice.v2', 'accepted'],
]);
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  get length() { return data.size; }, key: (i: number) => [...data.keys()][i] ?? null,
  getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value),
  removeItem: (key: string) => data.delete(key),
} });
reconcileMatchrimLocalOwner('SYN-B');
assert.equal(data.has('matchrim_quiz_result'), false);
assert.equal([...data.keys()].some(k => k.startsWith('matchrim.affinity_feedback.')), false);
assert.equal(data.get('matchrim.local_profile_owner.v1'), 'SYN-B');
assert.equal(data.get('matchrim.scan_privacy_notice.v2'), 'accepted', 'non-personal consent setting preserved');
console.log('Scan profile input parity, fallback, cancellation and local feedback isolation PASS (synthetic evidence only)');
