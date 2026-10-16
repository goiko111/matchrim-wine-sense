import assert from 'node:assert/strict';
import { planRestaurantRanking91, runRestaurantRanking91 } from '../src/utils/restaurantRanking91';
import type { RestaurantRow91 } from '../supabase/functions/_shared/matchrim-restaurant91';

const rows = (kind: 'food' | 'wine', count: number): RestaurantRow91[] => Array.from({ length: count }, (_, index) => ({
  id: `${kind}-${index}`, kind, name: `${kind} ${index}`, sourceText: `${kind} ${index}`,
}));
const foods = rows('food', 121), wines = rows('wine', 3000);
const focused = planRestaurantRanking91(foods, wines, { selectedFoodId: foods[0].id });
assert.equal(focused.length, 25);
assert.equal(new Set(focused.flatMap(batch => batch.wines.map(row => row.id))).size, 3000);
assert.ok(focused.every(batch => batch.foods.length === 1 && batch.wines.length === 120));
assert.throws(() => planRestaurantRanking91(foods, wines, {}), /32 bloques/);
const both = planRestaurantRanking91(foods, wines, { selectedFoodId: foods[0].id, selectedWineId: wines[2999].id });
assert.equal(both.length, 1);
assert.equal(both[0].wines[0].id, wines[2999].id);
let calls = 0;
let progress = 0;
const result = await runRestaurantRanking91(focused, new AbortController().signal, async body => {
  calls++;
  const food = (body.foods as RestaurantRow91[])[0], wine = (body.wines as RestaurantRow91[])[0];
  return { pairs: [{ foodId: food.id, wineId: wine.id, band: 'uncertain', positives: [`${food.name} y ${wine.name}`], frictions: [], missing: ['Ficha sensorial'], evidence: 'model_inference' }], warnings: [] };
}, completed => { progress = completed; });
assert.equal(calls, 25);
assert.equal(progress, 25);
assert.equal(result.pairs.length, 25);
assert.ok(result.warnings.some(warning => warning.includes('25 bloques')));
const cancelled = new AbortController(); cancelled.abort();
await assert.rejects(() => runRestaurantRanking91(both, cancelled.signal, async () => { throw new Error('must not call'); }, () => {}), { name: 'AbortError' });
let invalidCalls = 0;
await assert.rejects(() => runRestaurantRanking91(focused, new AbortController().signal, async () => {
  invalidCalls++; return { pairs: [{ foodId: 'invented', wineId: 'invented', band: 'strong', positives: ['fake'], frictions: [], missing: [], evidence: 'model_inference' }], warnings: [] };
}, () => {}));
assert.equal(invalidCalls, 1, 'No automatic paid retry or further blocks after invalid response');
console.log('Restaurant ranking91: 13 checks PASS, all 3000 wine references retained');
