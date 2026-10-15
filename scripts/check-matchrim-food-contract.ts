import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  MAX_MENU_DISHES,
  normalizeFoodScan,
} from '../supabase/functions/scan-food-pairing/contract';

const reportPath = process.argv[2]
  || 'docs/qa-evidence/matchrim-build64-recognition-2026-09-28/food-menu-real-backend.json';
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const priorDishes = report.response?.dishes || [];
const normalized = normalizeFoodScan(priorDishes, report.response?.coverage, 'menu');

assert.equal(MAX_MENU_DISHES, 60, 'The menu contract must not silently cap a normal menu at eight rows');
assert.equal(priorDishes.length, 8, 'The regression fixture records the old eight-row provider response');
// A delimiter list is not evidence of six physical rows. Keep the recorded value
// unchanged until explicit literal source rows and nonoverlapping boxes support a split.
assert.equal(normalized.dishes.length, 8, 'Do not fabricate independent rows from slash-separated model text');
assert.equal(normalized.coverage.split_rows, 0);
assert.equal(normalized.coverage.duplicate_rows, 0);
assert.deepEqual(normalized.dishes.map((dish) => dish.nombre), priorDishes.map((dish) => dish.nombre));
assert.ok(normalized.coverage.unresolved_rows > 0);
assert.equal(normalized.coverage.truncated, true);
assert.equal(normalized.coverage.partial, true);
assert.ok(normalized.dishes.filter((dish) => (dish.nombre.match(/\//g)?.length ?? 0) >= 2)
  .every((dish) => dish.recomendaciones.length === 0), 'Unresolved list-like aggregates have no per-dish pairing attribution');
assert.equal(normalized.coverage.verification, 'model_reported_not_pixel_verified');

const duplicated = normalizeFoodScan([
  priorDishes[0],
  { ...priorDishes[0], nombre: '  Günün Çorbası - Tam  ' },
], { estimated_visible_dishes: 2 }, 'menu');
assert.equal(duplicated.dishes.length, 2, 'Identical names without physical row evidence can be distinct menu entries');
assert.equal(duplicated.coverage.duplicate_rows, 0);
assert.equal(duplicated.coverage.truncated, true);

const legitimateSlash = normalizeFoodScan([
  { nombre: 'Atún rojo/ventresca', recomendaciones: [{ nombre: 'Blanco orientativo' }] },
], {}, 'menu');
assert.equal(legitimateSlash.dishes.length, 1, 'A two-part slash name is not split speculatively');
assert.equal(legitimateSlash.dishes[0].recomendaciones.length, 1, 'Literal slash names can retain a single pairing hypothesis');

const legacyScale = normalizeFoodScan([{
  nombre: 'Plato QA',
  recomendaciones: [{
    nombre: 'Vino QA',
    atributos: { potencia: 10, acidez: 8, dulzura: 2, taninos: 6, afrutado: 100 },
  }],
}], {}, 'menu');
assert.deepEqual(legacyScale.dishes[0].recomendaciones[0].atributos, {
  potencia: 5,
  acidez: 4,
  dulzura: 2,
  taninos: 3,
  afrutado: 5,
});

console.log(JSON.stringify({
  source: reportPath,
  beforeRows: priorDishes.length,
  afterRows: normalized.dishes.length,
  splitRows: normalized.coverage.split_rows,
  duplicateRows: normalized.coverage.duplicate_rows,
  historicalMeasuredRecallNotRerun: report.recall,
}, null, 2));
