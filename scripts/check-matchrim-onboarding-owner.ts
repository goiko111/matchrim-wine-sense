import assert from 'node:assert/strict';
import { shouldShowMatchrimOnboarding as show, finishMatchrimOnboarding as finish, recordOnboardingEvent as event } from '../src/utils/matchrimOnboarding';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
}});
const results: { name: string; passed: boolean; error?: string }[] = [];
const test = (name: string, run: () => void) => {
  storage.clear();
  try { run(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: String(error) }); }
};
test('new owner has no completion', () => assert.equal(show(false, 'A'), true));
test('verified experience bypasses automatic guide', () => assert.equal(show(true, 'A'), false));
test('own voluntary skip survives', () => { finish('skipped', 'A'); assert.equal(show(false, 'A'), false); });
test('account A completion never suppresses B', () => { finish('completed', 'A'); assert.equal(show(false, 'B'), true); });
test('anonymous completion never suppresses account', () => { finish('completed', null); assert.equal(show(false, 'A'), true); });
test('logout never inherits account completion', () => { finish('completed', 'A'); assert.equal(show(false, null), true); });
test('switch back preserves own preference', () => { finish('skipped', 'A'); finish('completed', 'B'); assert.equal(show(false, 'A'), false); });
test('legacy global state kept but not assigned to an account', () => {
  const raw = JSON.stringify({ version: 2, result: 'completed' }); storage.set('matchrim.onboarding.v1', raw);
  assert.equal(show(false, 'A'), true); assert.equal(storage.get('matchrim.onboarding.v1'), raw);
});
for (const [name, raw] of [['malformed', '{'], ['primitive', 'true'], ['missing result', '{"version":2}'],
  ['invalid result', '{"version":2,"result":"started"}'], ['future version', '{"version":99,"result":"completed"}']]) {
  test(name + ' does not certify completion', () => {
    storage.set('matchrim.onboarding.v2:A', raw); assert.equal(show(false, 'A'), true);
  });
}
test('recognized old scoped skip preserved without rewrite', () => {
  const raw = JSON.stringify({ version: 1, result: 'skipped' }); storage.set('matchrim.onboarding.v2:A', raw);
  assert.equal(show(false, 'A'), false); assert.equal(storage.get('matchrim.onboarding.v2:A'), raw);
});
test('events bounded and owner-separated after corrupt history', () => {
  storage.set('matchrim.onboarding.local-events.v2:A', '{');
  for (let i = 0; i < 40; i++) event('step', i % 6, 'A');
  event('started', 0, 'B');
  assert.equal(JSON.parse(storage.get('matchrim.onboarding.local-events.v2:A')!).length, 30);
  assert.equal(JSON.parse(storage.get('matchrim.onboarding.local-events.v2:B')!).length, 1);
});
console.log(JSON.stringify({ scope: 'Local onboarding storage contracts', results }, null, 2));
if (results.some(result => !result.passed)) process.exitCode = 1;
