import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Capacitor } from '@capacitor/core';
import { calculateLearnedMatchrimProfile as pure, type TrainableWine } from '../src/utils/matchrimLearning';
import { calculateLearnedMatchrimProfile as platform } from '../src/utils/matchrimLearningPlatform';
import { cellarTrainingRows, makeCellarCatalogEvidence, withCellarInitialAffinity } from '../src/utils/bodegaAffinity';
import { resolveScanProfile } from '../src/utils/scanProfile';

const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const vector = (value: number) => Object.fromEntries(axes.map(key => [key, value])) as Record<typeof axes[number], number>;
const attrs = { scale: 'winerim-0-5' as const, potencia: 5, acidez: 5, dulzura: 5, taninos: 5, afrutado: 5 };
const row = (rating: TrainableWine['rating'], id = 'one'): TrainableWine => ({
  id, rating, use_for_profile_training: true, sensory_attributes: attrs,
});
const native = { evidenceStrength: 'native-v2' as const };
let groups = 0;
const check = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`PASS ${name}`); };

check('legacy remains default and single fresh LOVE remains exact', () => {
  const base = vector(1);
  assert.deepEqual(pure(base, [row('love')], native), pure(base, [row('love')]));
  assert.deepEqual(pure(base, [row('ok')]), pure(base, [row('love')]));
});

check('weak OK is one quarter of LOVE on an interior quantization-exact case', () => {
  const base = vector(1);
  const love = pure(base, [row('love')], native);
  const ok = pure(base, [row('ok')], native);
  assert.deepEqual(love.profile, vector(2.2));
  assert.deepEqual(ok.profile, vector(1.3));
  assert.equal(Math.round((love.profile.potente - 1) * 10), 12);
  assert.equal(Math.round((ok.profile.potente - 1) * 10), 3);
  assert.equal(love.confidence, 8);
  assert.equal(ok.confidence, 2);
});

check('negative magnitude preserves weight before existing tenth rounding and clamp', () => {
  const negative = pure(vector(3), [row('not_for_me')], native);
  assert.deepEqual(negative.profile, vector(2.5)); // 3 - (5 - 3) * .8 * .3 = 2.52
  assert.equal(negative.confidence, 7);
  assert.deepEqual(pure(vector(0), [row('not_for_me')], native).profile, vector(0));
});

check('homogeneous multiple OK stays weaker; confidence measures weighted coverage', () => {
  const wines = (rating: TrainableWine['rating']) => Array.from({ length: 4 }, (_, i) => row(rating, String(i)));
  const love = pure(vector(1), wines('love'), native);
  const ok = pure(vector(1), wines('ok'), native);
  assert.deepEqual(love.profile, vector(2.8));
  assert.deepEqual(ok.profile, vector(1.5)); // Existing tenth rounding, not exact displayed .25 ratio.
  assert.equal(love.samples, 4);
  assert.equal(ok.samples, 4);
  assert(ok.confidence < love.confidence);
});

check('no signal, excluded, missing/nonfinite attributes and unknown scale remain no signal', () => {
  for (const wines of [[], [{ ...row(null) }], [{ ...row('ok'), use_for_profile_training: false }],
    [{ ...row('love'), sensory_attributes: null }],
    ...[null, NaN, Infinity].map(value => [{ ...row('love'), sensory_attributes: { ...attrs, acidez: value } }]),
    [{ ...row('love'), sensory_attributes: { ...attrs, scale: 'unknown' as 'winerim-0-5' } }]]) {
    assert.deepEqual(pure(vector(0), wines, native), pure(vector(0), []));
  }
});

check('duplicate IDs do not double train; latest optout and equal-date contradiction stay excluded', () => {
  const wine = row('ok');
  assert.deepEqual(pure(vector(1), [wine, { ...wine }], native), pure(vector(1), [wine], native));
  assert.equal(pure(vector(1), [wine, { ...wine, use_for_profile_training: false }], native).samples, 0);
  assert.equal(pure(vector(1), [wine, { ...wine, rating: 'love' }], native).samples, 0);
});

check('recency remains the original half-life and weighting, without re-normalization', () => {
  const wines = [{ ...row('love', 'old'), updated_at: '2026-02-01T00:00:00.000Z' },
    { ...row('love', 'new'), updated_at: '2026-06-01T00:00:00.000Z' }];
  assert.deepEqual(pure(vector(1), wines, native).profile, vector(2.1)); // 120 days: weights .6/1, blend .35.
  assert.deepEqual(pure(vector(1), wines).profile, vector(2.4));
});

const originalNative = Capacitor.isNativePlatform;
try {
  check('one platform selector: web exact legacy, native explicit v2', () => {
    Capacitor.isNativePlatform = () => false;
    assert.deepEqual(platform(vector(1), [row('ok')]), pure(vector(1), [row('ok')]));
    Capacitor.isNativePlatform = () => true;
    assert.deepEqual(platform(vector(1), [row('ok')]), pure(vector(1), [row('ok')], native));
  });

  Capacitor.isNativePlatform = () => true;
  const ownerA = await resolveScanProfile('synthetic-A', vector(5), {
    base: async () => vector(1), training: async () => [row('ok')],
  }, new AbortController().signal);
  const ownerB = await resolveScanProfile('synthetic-B', vector(5), {
    base: async () => vector(2), training: async () => [],
  }, new AbortController().signal);
  check('scan resolver recalculates v2 from each owner loader, never from previous derived profile', () => {
    assert.deepEqual(ownerA.profile, vector(1.3));
    assert.deepEqual(ownerB.profile, vector(2));
    assert.equal(ownerB.samples, 0);
  });
  const anonymous = await resolveScanProfile(null, vector(0), {
    base: async () => { throw Error('must not load owner'); },
    training: async () => { throw Error('must not train anonymous'); },
  }, new AbortController().signal);
  check('anonymous and missing owner quiz never inherit training or another quiz', () => {
    assert.deepEqual(anonymous.profile, vector(0));
    assert.equal(anonymous.samples, 0);
  });
  const missing = await resolveScanProfile('synthetic-B', vector(5), {
    base: async () => null, training: async () => { throw Error('must not train missing quiz'); },
  }, new AbortController().signal);
  assert.equal(missing.profile, null);
} finally { Capacitor.isNativePlatform = originalNative; }

check('catalog evidence eligibility and valid historical initial snapshot stay unchanged', () => {
  const wine = { ...row('ok'), name: 'Flor de Muga Blanco', producer: 'Muga', vintage: 2022,
    region: 'Rioja', country: 'ES', sensory_attributes: { scale: 'winerim-0-5' as const,
      potencia: 4, acidez: 4, dulzura: 1, taninos: 1, afrutado: 3 } };
  const evidence = makeCellarCatalogEvidence(wine, '279035', wine.sensory_attributes);
  const verified = { ...wine, place_details: { bodega_sensory_evidence: evidence } };
  assert.equal(cellarTrainingRows([wine], true).length, 0);
  assert.equal(cellarTrainingRows([verified], true).length, 1);
  const base = { profile: vector(1), source: 'quiz' as const, samples: 0, status: 'ready' as const, note: 'UNIT' };
  const first = withCellarInitialAffinity(verified, base, 'saved', '2026-10-18T00:00:00.000Z');
  const learned = pure(vector(1), cellarTrainingRows([verified], true), native);
  const saved = { ...verified, place_details: first };
  assert.deepEqual(withCellarInitialAffinity(saved, { ...base, profile: learned.profile, source: 'learned', samples: 1 },
    'first_verified', '2026-10-19T00:00:00.000Z'), first);
});

check('all frontend learner imports use selector; full caller bodies and legacy storage unchanged', () => {
  const files = ['src/pages/Index.tsx', 'src/pages/Profile.tsx', 'src/pages/UseMatchrim.tsx',
    'src/components/AiRimConversation.tsx', 'src/components/MatchrimFunction.tsx', 'src/utils/scanProfile.ts'];
  for (const file of files) {
    const current = readFileSync(file, 'utf8');
    const old = execFileSync('git', ['show', `06d56c76af9135559926e99b321ed8b00225c229:${file}`], { encoding: 'utf8' });
    assert.equal(current.replace(/from '([.@/a-zA-Z]+)matchrimLearningPlatform'/g, "from '$1matchrimLearning'"), old, file);
  }
});

console.log(`Feedback strength96: ${groups} groups PASS. UNIT/controlled loaders, not hosted isolation or taste validation.`);
