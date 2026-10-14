import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildRestaurantPairingPrompt, emptyRestaurantContext, parseRestaurantAdvice,
  readRestaurantCarry, restaurantBudgetValid, restaurantCarryIsForeign, restaurantCarryState,
  restaurantScanPath, restaurantSourceLabel,
} from '../src/utils/restaurantPairingContext';

let assertions = 0;
const check = (name: string, run: () => void) => { run(); assertions += 1; console.log(`PASS ${name}`); };
const context = { ...emptyRestaurantContext(), restaurantName: 'QA restaurant',
  foodMenu: 'Dorada al horno con patata\nSetas asadas', wineMenu: 'Albariño QA 2024 - botella 28 EUR',
  budget: '30,50', currency: 'EUR' as const, service: 'bottle' as const };

check('Budget is a preference, no default currency or service', () => {
  assert.equal(emptyRestaurantContext().currency, '');
  assert.equal(emptyRestaurantContext().service, 'any');
  assert(restaurantBudgetValid(emptyRestaurantContext()));
  assert(restaurantBudgetValid(context));
  for (const budget of ['0', '-4', '1e2', 'NaN', '30 EUR', '1,2,3', 'Infinity']) {
    assert(!restaurantBudgetValid({ ...context, budget }));
  }
  assert(!restaurantBudgetValid({ ...context, currency: '' }));
});
check('Carry is parsed, bounded, owner scoped and strips unrelated fields', () => {
  const carry = restaurantCarryState('owner-a', context);
  assert.deepEqual(readRestaurantCarry(carry, 'owner-a'), context);
  assert.deepEqual(readRestaurantCarry(carry, 'owner-b'), emptyRestaurantContext());
  assert(restaurantCarryIsForeign(carry, 'owner-b'));
  assert(!restaurantCarryIsForeign(carry, 'owner-a'));
  assert.deepEqual(readRestaurantCarry(carry, null), emptyRestaurantContext());
  assert.deepEqual(readRestaurantCarry(null, 'owner-a'), emptyRestaurantContext());
  assert.deepEqual(readRestaurantCarry({ restaurantPairing: { ownerId: 'owner-a', context: { service: 'jug' } } }, 'owner-a'), emptyRestaurantContext());
  assert.deepEqual(readRestaurantCarry({ restaurantPairing: { ownerId: 'owner-a', context: { foodMenu: 'x'.repeat(12001) } } }, 'owner-a'), emptyRestaurantContext());
  assert(!('secret' in readRestaurantCarry({ restaurantPairing: { ownerId: null, context: { secret: 'not-carried' } } }, null)));
});
check('Existing paths carry encoded selections, budget and service, not full menus', () => {
  const wineRoute = new URL(restaurantScanPath('wine-menu', { dish: 'Arroz & setas / salsa' }, context), 'http://local');
  assert.equal(wineRoute.pathname, '/escanear/carta-vinos');
  assert.equal(wineRoute.searchParams.get('dish'), 'Arroz & setas / salsa');
  assert.equal(wineRoute.searchParams.get('currency'), 'EUR');
  assert.equal(wineRoute.searchParams.get('service'), 'bottle');
  assert(!wineRoute.search.includes('Dorada'));
  const menuRoute = new URL(restaurantScanPath('food-menu', { wine: 'QA & vino' }, context), 'http://local');
  assert.equal(menuRoute.pathname, '/escanear/menu-comida');
  assert.equal(menuRoute.searchParams.get('wine'), 'QA & vino');
});
check('Three directions use the same evidence contract, no forced three', () => {
  for (const direction of ['wine-for-dish', 'dish-for-wine', 'pairing-check'] as const) {
    const prompt = buildRestaurantPairingPrompt(direction, 'Dorada', 'Albariño QA', context);
    const data = JSON.parse(prompt.split('\n').at(-1)!);
    assert.equal(data.direction, direction);
    assert.deepEqual(data.userProvidedContext, context);
    assert(prompt.includes('cero a tres'));
    assert(prompt.includes('NO evidencia'));
  }
});
check('Structured advice renders no price/score fields and supports fewer than three', () => {
  const option = { wine: 'Albariño QA', dish: 'Dorada', reason: 'La acidez puede equilibrar la textura.', price: 28, affinity: 99 };
  assert.deepEqual(parseRestaurantAdvice(JSON.stringify({ options: [option] })).options[0], {
    wine: option.wine, dish: option.dish, reason: option.reason,
  });
  assert.equal(parseRestaurantAdvice('```json\n{"options":[]}\n```').options.length, 0);
  for (const reason of ['Afinidad: 90', 'Maridaje 8/10', 'Precio 28 EUR', 'JPY 5000', '28 CHF', '$30', '90%', 'Afinidad del 90', 'Disponible por copa', 'Stock confirmado', 'Sin gluten', 'Garantizado sin alérgenos']) {
    assert.throws(() => parseRestaurantAdvice(JSON.stringify({ options: [{ ...option, reason }] })));
  }
  for (const response of [null, '', '{}', '{"options":null}', '{"options":[{}]}', JSON.stringify({ options: [option, option, option, option] })]) {
    assert.throws(() => parseRestaurantAdvice(response));
  }
  for (const reason of ['En mi experiencia, marida bien.', 'He probado este vino.', 'Lo he catado.']) {
    assert.throws(() => parseRestaurantAdvice(JSON.stringify({ options: [{ ...option, reason }] })));
  }
});
check('Text occurrence is labelled as supplied text, never verified availability', () => {
  assert(restaurantSourceLabel('Albarino QA', context.wineMenu).startsWith('Nombre en el texto'));
  assert(restaurantSourceLabel('Otro vino', context.wineMenu).startsWith('Idea fuera de carta'));
  assert(restaurantSourceLabel('Blanco fresco', '').includes('no comprobada'));
});

const root = new URL('../', import.meta.url);
const sources = ['src/components/MatchrimFunction.tsx', 'src/components/wine-import/FoodPairingScanner.tsx',
  'src/pages/LiquidIntelligence.tsx', 'src/utils/restaurantPairingContext.ts', 'scripts/check-matchrim-restaurant84.ts'];
const hashes = Object.fromEntries(sources.map((path) => [path, createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex')]));
const reportDir = process.env.MATCHRIM_QA_REPORT_DIR;
if (reportDir) {
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, 'restaurant-unit-results.json'), JSON.stringify({ passed: true, assertions, scope: 'Pure local restaurant contracts; no remote calls, no stock/price/affinity certification', hashes }, null, 2) + '\n');
}
console.log(`Restaurant84 PASS (${assertions} contract groups)`);
