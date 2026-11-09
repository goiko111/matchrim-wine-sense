// 132: native learner v4 fits the profile to the ratings. Offline, deterministic, synthetic wines only.
// Run: npx tsx scripts/check-matchrim-learning132.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';

type Profile = { potente: number; acidez: number; dulce: number; tanico: number; afrutado: number };
const keys = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const toProfile = (values: number[]) => Object.fromEntries(keys.map((key, index) => [key, values[index]])) as Profile;
const wine = (id: string, t: number[], rating: 'love' | 'ok' | 'not_for_me', day = 0) => ({
  id, rating, use_for_profile_training: true,
  sensory_attributes: { scale: 'winerim-0-5' as const, potencia: t[0], acidez: t[1], dulzura: t[2], taninos: t[3], afrutado: t[4] },
  created_at: new Date(Date.UTC(2026, 0, 1) + day * 86_400_000).toISOString(),
});
const v4 = (base: Profile, rows: ReturnType<typeof wine>[]) => calculateLearnedMatchrimProfile(base, rows, { evidenceStrength: 'native-v4' });
const affinity = (profile: Profile, t: number[]) => calculateLocalMatchrimAffinity(profile,
  { scale: 'winerim-0-5', power: t[0], acidity: t[1], sweetness: t[2], tannin: t[3], fruity: t[4] }, 'scan-local-rms-0to5-v3')!;
const distance = (a: Profile, b: number[]) => Math.sqrt(keys.reduce((sum, key, index) => sum + (a[key] - b[index]) ** 2, 0) / 5);

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const quiz = toProfile([3, 3, 1, 2, 4]);
const bigRed = [5, 3, 1, 5, 3], crispWhite = [3, 5, 1, 0, 3];

test('No ratings leave the quiz untouched', () => {
  const learned = v4(quiz, []);
  assert.deepEqual(learned.profile, quiz);
  assert.equal(learned.samples, 0);
});
test('A love pulls the profile towards that wine; affinity for it rises', () => {
  const learned = v4(quiz, [wine('red', bigRed, 'love')]);
  assert.ok(distance(learned.profile, bigRed) < distance(quiz, bigRed));
  assert.ok(affinity(learned.profile, bigRed) > affinity(quiz, bigRed));
});
test('"Not for me" on a wine already far away teaches nothing; on a close one it pushes away', () => {
  const far = v4(quiz, [wine('sweet', [5, 1, 5, 5, 1], 'not_for_me')]);
  assert.deepEqual(far.profile, quiz);
  const close = [3, 3, 1, 3, 4];
  const near = v4(quiz, [wine('near', close, 'not_for_me')]);
  assert.ok(distance(near.profile, close) > distance(quiz, close) + 0.2, JSON.stringify(near.profile));
  assert.ok(affinity(near.profile, close) < affinity(quiz, close));
});
test('Consistent ratings converge on the hidden taste and keep improving with more ratings', () => {
  const hidden = [4.5, 3.5, 1, 4, 3.5];
  let seed = 132;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const rows: ReturnType<typeof wine>[] = [];
  for (let index = 0; rows.length < 40; index += 1) {
    const t = Array.from({ length: 5 }, () => Math.round(random() * 5));
    const score = affinity(toProfile(hidden), t);
    rows.push(wine(`w${index}`, t, score >= 78 ? 'love' : score >= 64 ? 'ok' : 'not_for_me', index));
  }
  const at = (count: number) => distance(v4(quiz, rows.slice(0, count)).profile, hidden);
  assert.ok(at(5) < distance(quiz, hidden), `5 ratings ${at(5)}`);
  assert.ok(at(20) < at(5), `20 ratings ${at(20)} vs 5 ${at(5)}`);
  assert.ok(at(40) <= at(20) + 0.02, `40 ratings ${at(40)} vs 20 ${at(20)}`);
  assert.ok(at(40) < 0.6, `40 ratings ${at(40)}`);
  const v3 = calculateLearnedMatchrimProfile(quiz, rows, { evidenceStrength: 'native-v3' });
  assert.ok(at(40) < distance(v3.profile, hidden), 'v4 beats v3 with 40 ratings');
});
test('Result is independent of row order and stays within 0-5', () => {
  const rows = [wine('a', bigRed, 'love', 1), wine('b', crispWhite, 'not_for_me', 2), wine('c', [0, 5, 5, 0, 5], 'ok', 3)];
  assert.deepEqual(v4(quiz, rows).profile, v4(quiz, [...rows].reverse()).profile);
  const extreme = v4(toProfile([0, 0, 0, 0, 0]), Array.from({ length: 30 }, (_, i) => wine(`x${i}`, [5, 5, 5, 5, 5], 'love', i)));
  assert.ok(keys.every(key => extreme.profile[key] >= 0 && extreme.profile[key] <= 5));
});
test('Newer ratings weigh more after a change of taste', () => {
  const old = Array.from({ length: 10 }, (_, i) => wine(`o${i}`, crispWhite, 'love', i));
  const recent = Array.from({ length: 10 }, (_, i) => wine(`r${i}`, bigRed, 'love', 400 + i));
  const learned = v4(quiz, [...old, ...recent]);
  assert.ok(distance(learned.profile, bigRed) < distance(learned.profile, crispWhite));
});
test('Native platform uses v4; web stays legacy-v1; v1-v3 untouched', () => {
  const platform = fs.readFileSync('src/utils/matchrimLearningPlatform.ts', 'utf8');
  assert.match(platform, /isNativePlatform\(\) \? 'native-v4' : 'legacy-v1'/);
  const rows = [wine('white', crispWhite, 'not_for_me'), wine('red', [4, 3, 1, 4, 3], 'love')];
  for (const model of ['legacy-v1', 'native-v2', 'native-v3'] as const)
    assert.notDeepEqual(calculateLearnedMatchrimProfile(quiz, rows, { evidenceStrength: model }).profile, v4(quiz, rows).profile, model);
});
assert.equal(groups, 7);
console.log(`Matchrim learner v4 132: ${groups}/7 PASS`);
