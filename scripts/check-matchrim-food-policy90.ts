import assert from 'node:assert/strict';
import { foodRowPolicy90, foodPairingContext90 } from '../src/utils/foodRowPolicy90';

let checks = 0;
for (const source_text of ['Beef Bologna - COMING SOON', 'CAKE, PIE, CHEESECAKE COMING SOON', 'Próximamente: tarta']) {
  const policy = foodRowPolicy90({ nombre: 'Untrusted model name', source_text });
  assert.equal(policy.status, 'coming_soon'); checks++;
  assert.equal(policy.pairingAllowed, false); checks++;
  assert.equal(policy.evidence, source_text); checks++;
}
for (const source_text of ['OG Burger (unavailable Sundays)', 'Beef Ribs - Weekends Only', '* SAT: TACOS', '* SUN: BURNT ENDS', 'Solo los sábados: arroz', 'Excepto domingos']) {
  const policy = foodRowPolicy90({ nombre: 'A dish', source_text });
  assert.equal(policy.status, 'conditional'); checks++;
  assert.equal(policy.pairingAllowed, true, 'No unverified current-day calculation'); checks++;
}
for (const source_text of ['Pescado AGOTADO', 'Soup sold out', 'Dish NOT AVAILABLE', 'No disponible', 'Dish unavailable']) {
  const policy = foodRowPolicy90({ nombre: 'A dish', source_text });
  assert.equal(policy.status, 'unavailable'); checks++;
  assert.equal(policy.pairingAllowed, false); checks++;
}
for (const source_text of ['* FROZEN + CHILLED MEATS: ASK US!', 'Especial: pregúntanos', 'Consultar']) {
  const policy = foodRowPolicy90({ nombre: 'A dish', source_text });
  assert.equal(policy.status, 'needs_clarification'); checks++;
  assert.equal(policy.pairingAllowed, false); checks++;
}
for (const source_text of ['LG (1.5-1.75 LB)=$38', 'SM (1-1.25 LB)=$28', '$38', '250 g 12 EUR']) {
  const policy = foodRowPolicy90({ nombre: 'Inferred complete dish name', source_text });
  assert.equal(policy.status, 'needs_clarification'); checks++;
  assert.equal(policy.pairingAllowed, false, 'A portion/price line cannot validate an inferred dish or inherit a neighboring restriction'); checks++;
}
for (const row of [{ nombre: 'COMING SOON' }, { nombre: 'Brisket', source_text: 'Brisket $17' },
  { nombre: 'Menu name', source_text: '' }, { nombre: 'Not unavailable', source_text: 'not unavailable' },
  { nombre: 'Sunday roast', source_text: 'Sunday roast' }, { nombre: 'Noodles', source_text: '7. 拉面 $8' }]) {
  const policy = foodRowPolicy90(row);
  assert.equal(policy.pairingAllowed, true); checks++;
  assert.notEqual(policy.status, 'coming_soon', 'Model name alone is not a literal availability marker'); checks++;
  assert.equal(policy.status, 'unknown', 'A dish name or lack of a marker never confirms availability'); checks++;
}
const rows = [{ nombre: 'Beef Bologna', source_text: 'Beef Bologna COMING SOON' },
  { nombre: 'Meats', source_text: 'Frozen meats ASK US!' }, { nombre: 'Burger', source_text: 'Burger unavailable Sundays' },
  { nombre: 'Brisket', source_text: 'Brisket $17' }];
const before = JSON.stringify(rows);
assert.equal(foodPairingContext90(rows), 'Burger unavailable Sundays\nBrisket $17'); checks++;
assert.equal(JSON.stringify(rows), before); checks++;
assert.equal(foodPairingContext90(rows.slice(0, 2)), '', 'All blocked rows must not seed a first-dish shortcut'); checks++;
assert.equal(foodPairingContext90([{ nombre: 'Manual dish' }]), 'Manual dish'); checks++;
assert.equal(foodPairingContext90([{ nombre: 'x'.repeat(15000) }]).length, 12000); checks++;
console.log(JSON.stringify({ checks, passed: true, scope: 'Explicit source-text availability safeguards, not stock or dietary validation; zero provider calls' }));
