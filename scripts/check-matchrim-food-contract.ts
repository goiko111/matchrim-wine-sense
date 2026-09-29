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
assert.equal(normalized.dishes.length, 13, 'The six merged desserts must become six independent rows');
assert.equal(normalized.coverage.split_rows, 1);
assert.equal(normalized.coverage.duplicate_rows, 0);
assert.ok(normalized.dishes.every((dish) => !dish.nombre.includes('/')));
assert.deepEqual(
  normalized.dishes.slice(6, 12).map((dish) => dish.nombre),
  ['Magnolya', 'Mozaik Pasta', 'Kabak Tatlısı', 'Sütlaç', 'Pannacotta', 'Supangle'],
);

const duplicated = normalizeFoodScan([
  priorDishes[0],
  { ...priorDishes[0], nombre: '  Günün Çorbası - Tam  ' },
], { estimated_visible_dishes: 2 }, 'menu');
assert.equal(duplicated.dishes.length, 1);
assert.equal(duplicated.coverage.duplicate_rows, 1);
assert.equal(duplicated.coverage.truncated, true);

const legitimateSlash = normalizeFoodScan([
  { nombre: 'Atún rojo/ventresca', recomendaciones: [] },
], {}, 'menu');
assert.equal(legitimateSlash.dishes.length, 1, 'A two-part slash name is not split speculatively');

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
  providerRecallUnchangedUntilDeploy: report.recall,
}, null, 2));
