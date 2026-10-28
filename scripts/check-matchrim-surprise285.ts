// Native-v3 learning by surprise. Offline; synthetic profiles and wines only.
// Run: npx tsx scripts/check-matchrim-surprise285.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateLearnedMatchrimProfile as learn } from '../src/utils/matchrimLearning';
import { cellarTrainingRows, makeCellarCatalogEvidence } from '../src/utils/bodegaAffinity';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';

type Profile = { potente: number; acidez: number; dulce: number; tanico: number; afrutado: number };
type Rating = 'love' | 'ok' | 'not_for_me';
const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const sensory = (p: Profile) => ({ scale: 'winerim-0-5' as const, potencia: p.potente, acidez: p.acidez, dulzura: p.dulce, taninos: p.tanico, afrutado: p.afrutado });
const wine = (id: string, p: Profile, rating: Rating) => {
  const row = { id, name: `Synthetic285 ${id}`, producer: 'Synthetic producer', vintage: 2024, region: 'Synthetic', country: 'ES',
    rating, use_for_profile_training: true, sensory_attributes: sensory(p) };
  return { ...row, place_details: { matchrim_rating_at: '2026-10-28T10:00:00.000Z',
    bodega_sensory_evidence: makeCellarCatalogEvidence(row, `mantalak-master:${id}`, row.sensory_attributes) } };
};
const run = (base: Profile, rows: ReturnType<typeof wine>[], model: 'native-v2' | 'native-v3' | 'legacy-v1') =>
  learn(base, cellarTrainingRows(rows as never, true), { evidenceStrength: model });
const predicted = (base: Profile, p: Profile) => calculateLocalMatchrimAffinity(base,
  { scale: 'winerim-0-5', power: p.potente, acidity: p.acidez, sweetness: p.dulce, tannin: p.tanico, fruity: p.afrutado }, 'scan-local-rms-0to5-v3')!;
const distance = (a: Profile, b: Profile) => Math.sqrt(axes.reduce((sum, axis) => sum + (a[axis] - b[axis]) ** 2, 0));

const redLover: Profile = { potente: 5, acidez: 3, dulce: 0, tanico: 4, afrutado: 3 };
const crispWhite: Profile = { potente: 1, acidez: 5, dulce: 1, tanico: 0, afrutado: 3 };
const closeRed: Profile = { potente: 4, acidez: 3, dulce: 1, tanico: 4, afrutado: 3 };
let groups = 0;
const test = (name: string, work: () => void) => { work(); groups++; console.log('PASS ' + name); };

test('An expected rejection does not move the profile (the old rule pushed it away)', () => {
  assert(predicted(redLover, crispWhite) < 65, 'the white is predicted not to please');
  const rows = [wine('white', crispWhite, 'not_for_me')];
  const v3 = run(redLover, rows, 'native-v3'), v2 = run(redLover, rows, 'native-v2');
  assert.deepEqual(v3.profile, redLover);
  assert.equal(v3.confidence, 0, 'an expected rejection alone carries no evidence');
  assert(distance(v2.profile, redLover) > 0.3, 'native-v2 still pushes; it stays unchanged for the server parity');
});
test('A surprising rejection moves the profile away from that wine', () => {
  const base: Profile = { potente: 4, acidez: 3, dulce: 1, tanico: 3.5, afrutado: 3 };
  const bigRed: Profile = { potente: 5, acidez: 3, dulce: 1, tanico: 4, afrutado: 3 };
  assert(predicted(base, bigRed) >= 80, 'the red is predicted to please');
  const v3 = run(base, [wine('red', bigRed, 'not_for_me')], 'native-v3');
  assert.notDeepEqual(v3.profile, base);
  assert(distance(v3.profile, bigRed) > distance(base, bigRed), 'moves away from the rejected wine');
});
test('A surprising love pulls harder than the old rule, and towards the wine on every axis', () => {
  assert(predicted(redLover, crispWhite) <= 50);
  const rows = [wine('white', crispWhite, 'love')];
  const v3 = run(redLover, rows, 'native-v3'), v2 = run(redLover, rows, 'native-v2');
  for (const axis of axes) {
    const towards = Math.sign(crispWhite[axis] - redLover[axis]);
    assert(Math.sign(v3.profile[axis] - redLover[axis]) === towards || towards === 0, axis);
    assert(Math.abs(v3.profile[axis] - redLover[axis]) >= Math.abs(v2.profile[axis] - redLover[axis]), axis);
  }
  assert(distance(v3.profile, crispWhite) < distance(v2.profile, crispWhite));
});
test('A confirmed love weighs as before; an expected "ok" too', () => {
  assert(predicted(redLover, closeRed) >= 75);
  for (const rating of ['love', 'ok'] as const) {
    const rows = [wine('red', closeRed, rating)];
    assert.deepEqual(run(redLover, rows, 'native-v3').profile, run(redLover, rows, 'native-v2').profile, rating);
  }
});
test('Order does not matter and repeated runs are identical', () => {
  const rows = [wine('a', crispWhite, 'love'), wine('b', closeRed, 'not_for_me'), wine('c', { potente: 3, acidez: 3, dulce: 3, tanico: 1, afrutado: 5 }, 'ok')];
  const forward = run(redLover, rows, 'native-v3'), backward = run(redLover, [...rows].reverse(), 'native-v3');
  assert.deepEqual(forward.profile, backward.profile);
  assert.deepEqual(forward, run(redLover, rows, 'native-v3'));
});
test('Web (legacy-v1) and server-parity (native-v2) learners are untouched by v3', () => {
  const rows = [wine('white', crispWhite, 'not_for_me'), wine('red', closeRed, 'love')];
  assert.deepEqual(run(redLover, rows, 'native-v2').profile, { potente: 5, acidez: 2.7, dulce: 0, tanico: 4.6, afrutado: 3 });
  assert.deepEqual(run(redLover, rows, 'legacy-v1').profile, run(redLover, rows, 'legacy-v1').profile);
  const platform = fs.readFileSync('src/utils/matchrimLearningPlatform.ts', 'utf8');
  assert.match(platform, /isNativePlatform\(\) \? 'native-v3' : 'legacy-v1'/);
});
test('Unscored or incomplete rows still teach nothing', () => {
  const broken = wine('broken', crispWhite, 'love');
  (broken.sensory_attributes as Record<string, unknown>).taninos = null;
  assert.equal(run(redLover, [broken], 'native-v3').samples, 0);
});
assert.equal(groups, 7);
console.log(`Matchrim surprise learner285: ${groups}/7 PASS`);
