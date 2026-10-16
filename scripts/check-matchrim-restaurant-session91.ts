import assert from 'node:assert/strict';
import {
  activeRestaurantRows91, addRestaurantDocument91, completeRestaurantPage91, createRestaurantSession91,
  editRestaurantRow91, removeRestaurantDocument91, resetInterruptedRestaurant91, restaurantCoverage91,
} from '../src/utils/restaurantSession91';

let checks = 0;
const check = (value: unknown, note: string) => { assert.ok(value, note); checks++; };
let state = createRestaurantSession91();
state = addRestaurantDocument91(state, { id: 'food1', name: 'food.pdf', kind: 'food', pageCount: 50, digest: 'a' });
check(state.pages.length === 50, 'All fifty pages are represented');
assert.throws(() => addRestaurantDocument91(state, { id: 'x', name: 'too-many.pdf', kind: 'wine', pageCount: 51, digest: 'x' })); checks++;
assert.throws(() => addRestaurantDocument91(state, { id: 'duplicate', name: 'copy.pdf', kind: 'food', pageCount: 1, digest: 'a' })); checks++;
state = addRestaurantDocument91(state, { id: 'wine1', name: 'wine.pdf', kind: 'wine', pageCount: 50, digest: 'b' });
check(state.pages.length === 100, 'Both full menus fit');
assert.throws(() => addRestaurantDocument91(state, { id: 'over', name: 'one.jpg', kind: 'food', pageCount: 1, digest: 'c' })); checks++;
check(state.pages.length === 100, 'Limit failure preserves pages');
const food = { id: 'food1-p1-r1', kind: 'food' as const, name: 'Chuleta', sourceText: 'Chuleta 45 EUR', price: 45, currency: 'EUR' };
state = completeRestaurantPage91(state, 'food1-p1', [food], true, ['Partial source']);
check(state.rows.length === 1 && state.rows[0].pageIds[0] === 'food1-p1', 'Origin retained');
state = completeRestaurantPage91(state, 'food1-p2', [{ ...food, id: 'food1-p2-r1' }], false, []);
check(state.rows.length === 1 && state.rows[0].pageIds.length === 2, 'Exact repeated reading groups origins');
state = completeRestaurantPage91(state, 'food1-p3', [{ ...food, id: 'food1-p3-r1', price: 50, sourceText: 'Chuleta 50 EUR' }], false, []);
check(state.rows.length === 2, 'Different price is not collapsed');
const wine = { id: 'wine1-p1-r1', kind: 'wine' as const, name: 'Roda I', sourceText: 'Roda I 2020 70 EUR', vintage: '2020', producer: 'Roda' };
state = completeRestaurantPage91(state, 'wine1-p1', [wine], false, []);
state = completeRestaurantPage91(state, 'wine1-p2', [{ ...wine, id: 'wine1-p2-r1', vintage: '2021', sourceText: 'Roda I 2021 70 EUR' }], false, []);
check(state.rows.filter(row => row.kind === 'wine').length === 2, 'Different vintages remain distinct');
const priorRevision = state.revision;
state = { ...state, pairs: [{ foodId: food.id, wineId: wine.id, band: 'possible', positives: ['Example'], frictions: [], missing: [], evidence: 'model_inference' }] };
state = editRestaurantRow91(state, wine.id, { name: 'Roda I corregido', id: 'cannot-rebind', kind: 'food' });
check(state.rows.find(row => row.id === wine.id)?.kind === 'wine', 'Manual edit cannot rebind identity');
check(state.rows.find(row => row.id === wine.id)?.sourceText === wine.sourceText, 'Correction preserves original text');
check(state.pairs.length === 0 && state.revision > priorRevision, 'Correction invalidates prior pairings');
state = { ...state, pages: state.pages.map(page => page.id === 'wine1-p1' ? { ...page, enabled: false } : page) };
check(!activeRestaurantRows91(state).some(row => row.id === wine.id), 'Excluded pages do not reach pairings');
check(restaurantCoverage91(state, 'wine').omitted === 1, 'Excluded coverage visible');
state = { ...state, pages: state.pages.map(page => page.id === 'wine1-p2' ? { ...page, status: 'reading' } : page) };
check(!activeRestaurantRows91(state).some(row => row.id === 'wine1-p2-r1'), 'Old reads unavailable during rerun');
state = resetInterruptedRestaurant91(state);
check(state.pages.find(page => page.id === 'wine1-p2')?.status === 'queued', 'Interrupted work resumes without stuck spinner');
state = completeRestaurantPage91(state, 'food1-p1', [{ ...food, name: 'Another dish', sourceText: 'Another dish' }], false, []);
check(new Set(state.rows.map(row => row.id)).size === state.rows.length, 'Rerun cannot create duplicate local IDs');
check(state.rows.some(row => row.name === 'Chuleta' && row.pageIds.includes('food1-p2')), 'Rerun keeps other independent origin');
state = removeRestaurantDocument91(state, 'food1');
check(!state.rows.some(row => row.kind === 'food') && state.pages.length === 50, 'Removing document removes its reads');
assert.throws(() => completeRestaurantPage91(state, 'wine1-p1', [food], false, [])); checks++;
check(state.version === 1, 'Versioned draft format');
console.log(`Restaurant session91: ${checks} checks PASS`);
