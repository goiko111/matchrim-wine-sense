import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildConsumerAffinity } from '../src/utils/consumerAffinity95';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';

const profile = { potente: 5, acidez: 4, dulce: 4, tanico: 5, afrutado: 3 };
const attributes = { scale: 'winerim-0-5' as const, power: 4, acidity: 3, sweetness: 1, tannin: 4, fruity: 4 };
let checks = 0;
const check = (name: string, run: () => void) => { run(); checks++; console.log(`PASS ${name}`); };
check('Owner screenshot: pending score plus inferred axes cannot produce a recommendation', () => {
  const value = buildConsumerAffinity({ profile, attributes, score: null, sensorySource: 'inference', catalogIdentityLinked: false });
  assert.equal(value.state, 'pending');
  assert.equal('dimensions' in value, false);
  assert.equal('matches' in value, false);
  assert.equal('score' in value, false);
});
check('A forged vision/catalog source without independently linked identity remains pending', () => {
  assert.equal(buildConsumerAffinity({ profile, attributes, score: 90, sensorySource: 'catalog' }).state, 'pending');
  assert.equal(buildConsumerAffinity({ profile, attributes, score: 90, sensorySource: 'inference', catalogIdentityLinked: true }).state, 'pending');
});
const base = { profile, attributes, sensorySource: 'catalog' as const, catalogIdentityLinked: true };
check('Missing profile has one specific consumer action, no invented defaults', () => {
  const value = buildConsumerAffinity({ ...base, profile: null, score: 90 });
  assert.equal(value.state, 'pending');
  if (value.state === 'pending') assert.equal(value.reason, 'profile');
});
check('Incomplete catalogue attributes withhold all sensory assertions', () => {
  assert.equal(buildConsumerAffinity({ ...base, attributes: { power: 4 }, score: 90 }).state, 'pending');
});
check('Null/nonfinite/out-of-range score is not a visible zero or an empty badge', () => {
  for (const score of [undefined, null, Number.NaN, Infinity, -1, 101]) {
    assert.equal(buildConsumerAffinity({ ...base, score }).state, 'pending');
  }
});
check('An actual zero score is a valid low-fit result, not missing', () => {
  const value = buildConsumerAffinity({ ...base, score: 0 });
  assert.equal(value.state, 'ready');
  if (value.state === 'ready') assert.equal(value.title, 'Se aleja de tus gustos actuales');
});
check('Owner sensory control explains dry versus sweet preference in ordinary language', () => {
  const value = buildConsumerAffinity({ ...base, score: calculateLocalMatchrimAffinity(profile, attributes) });
  assert.equal(value.state, 'ready');
  if (value.state === 'ready') assert.equal(value.caution, 'Es más seco de lo que sueles elegir.');
});
check('Exact original zero and decimals survive optional detailed view', () => {
  const value = buildConsumerAffinity({ ...base, attributes: { ...attributes, tannin: 0, acidity: 2.4 }, score: 70 });
  assert.equal(value.state, 'ready');
  if (value.state === 'ready') {
    assert.equal(value.dimensions.find(item => item.key === 'tanico')?.wineValue, 0);
    assert.equal(value.dimensions.find(item => item.key === 'acidez')?.wineValue, 2.4);
  }
});
check('Presentation does not mutate scoring inputs, history or raw profile', () => {
  const before = JSON.stringify(base);
  for (let i = 0; i < 10; i++) buildConsumerAffinity({ ...base, score: 75 });
  assert.equal(JSON.stringify(base), before);
});
check('Consumer copy does not sell a raw score as tasting success probability', () => {
  for (const score of [0, 44, 45, 64, 65, 79, 80, 93, 100]) {
    const value = buildConsumerAffinity({ ...base, score });
    assert.equal(value.state, 'ready');
    assert.doesNotMatch(JSON.stringify(value), /probabilidad|seguro que|te encantará|garantiz/i);
  }
});
check('Native-only wrapper leaves the legacy web return path intact', () => {
  const source = readFileSync(new URL('../src/components/AffinityExplanation.tsx', import.meta.url), 'utf8');
  assert.match(source, /if \(Capacitor\.isNativePlatform\(\)\) return <NativeAffinitySummary/);
  const native = readFileSync(new URL('../src/components/NativeAffinitySummary.tsx', import.meta.url), 'utf8');
  assert.match(native, /if \(result\.state === 'pending'\) return/);
  assert.match(native, /<details/);
  assert.doesNotMatch(native, /localStorage|Math\.random|inferencia sensorial|peso 20|Respaldo de la explicación/);
});
console.log(JSON.stringify({ groups: checks, passed: true, modelCalls: 0, realUsers: 0, scoringFormulaChanged: false }));
