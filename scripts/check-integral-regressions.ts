import assert from 'node:assert/strict';
import { reconcileMatchrimLocalOwner } from '../src/utils/matchrimLocalOwner';
import { finishMatchrimOnboarding, recordOnboardingEvent, shouldShowMatchrimOnboarding } from '../src/utils/matchrimOnboarding';
import { buildDetailedAffinityExplanation } from '../src/utils/wineAffinityExplanation';
import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
}});
reconcileMatchrimLocalOwner(null);
storage.set('matchrim_quiz_result', 'ANONYMOUS');
reconcileMatchrimLocalOwner('USER-A');
assert.equal(storage.get('matchrim_quiz_result'), undefined);
storage.set('matchrim_quiz_result', 'A');
storage.set('matchrim.scan_history.v1', 'A');
reconcileMatchrimLocalOwner('USER-A');
assert.equal(storage.get('matchrim_quiz_result'), 'A');
reconcileMatchrimLocalOwner('USER-B');
assert.equal(storage.get('matchrim_quiz_result'), undefined);
assert.equal(storage.get('matchrim.scan_history.v1'), undefined);
storage.set('matchrim_quiz_result', 'B');
reconcileMatchrimLocalOwner(null, true);
assert.equal(storage.get('matchrim_quiz_result'), undefined);
assert.equal(shouldShowMatchrimOnboarding(true), false);
assert.equal(shouldShowMatchrimOnboarding(false), true);
finishMatchrimOnboarding('skipped');
assert.equal(shouldShowMatchrimOnboarding(false), false);
for (let i = 0; i < 60; i++) recordOnboardingEvent('step', i % 3);
assert.equal(JSON.parse(storage.get('matchrim.onboarding.local-events.v1')!).length, 30);
const base = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
const attrs = { potencia: 4, acidez: 4, dulzura: 1, taninos: 3, afrutado: 4 };
assert.equal(buildDetailedAffinityExplanation({ ...base, acidez: null } as never, attrs), null);
const detail = buildDetailedAffinityExplanation(base, attrs, { score: 72, sensorySource: 'inference' })!;
assert.ok(detail.confidence <= 0.58);
assert.ok(detail.missingData.includes('madera/crianza fiable'));
assert.ok(detail.frictions.length > 0 && detail.primaryMatches.length > 0);
assert.equal(calculateLearnedMatchrimProfile(base, [{rating:null,sensory_attributes:attrs}]).samples, 0);
console.log('Local owner, optional-data affinity, save!=taste, guide version/skip and bounded local measurement regressions PASS');
