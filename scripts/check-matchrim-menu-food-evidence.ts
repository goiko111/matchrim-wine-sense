import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveMenuTileResults, mergeMenuTileResults, type MenuTileResult, type MenuScanWine } from '../src/utils/wineMenuScan';
import { parseFoodScanResponse } from '../src/utils/foodScanResponse';
import { normalizeFoodScan } from '../supabase/functions/scan-food-pairing/contract';

const fixture = JSON.parse(readFileSync('qa/fixtures/menu-food-evidence-oct8.json', 'utf8'));
const menu = fixture.cases[0].calls.map(c => ({ tile: c.scan_region, response: c.payload })) as MenuTileResult[];
const wines = resolveMenuTileResults(menu).vinos!;
assert.equal(wines.length, 16, 'recorded same literal Laurent Perriere Ultra row must not appear twice');
const ultra = wines.filter(w => /ultra/i.test(w.nombre));
assert.equal(ultra.length, 1);
assert.equal(ultra[0].nombre, 'Laurent Perriere Ultra', 'do not invent Brut missing from literal source');
assert.equal(ultra[0].compatibilidad, null, 'disputed identity cannot retain provider affinity');
const literal: MenuScanWine = { nombre: 'Laurent Perriere Ultra', productor: 'Laurent Perrier',
  texto_fuente: 'Laurent Perriere Ultra', posicion: { x: 80, y: 22.8, width: 18, height: 7.3 } };
const variant: MenuScanWine = { ...literal, nombre: 'Laurent Perriere Ultra Brut', posicion: { x: 81, y: 20.9, width: 16, height: 5 } };
const merge = (...vinos: MenuScanWine[]) => mergeMenuTileResults([{ tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } }, response: { vinos } }]).vinos!;
assert.equal(merge(literal, variant).length, 1);
assert.equal(merge(literal, { ...variant, texto_fuente: 'Laurent Perriere Ultra Brut' }).length, 2, 'different literal cuvee stays separate even at same location');
assert.equal(merge(literal, { ...variant, posicion: { x: 81, y: 40, width: 16, height: 5 } }).length, 2, 'identical text in a different row is insufficient');
assert.equal(merge({ ...literal, anada: 2018 }, { ...variant, anada: 2020 }).length, 2);
assert.equal(merge(literal, { ...variant, productor: 'Other winery' }).length, 2);

const food = parseFoodScanResponse(fixture.cases[1].calls[0].payload);
assert.equal(food.dishes.length, 8, 'do not invent omitted dishes from the recorded response');
assert.doesNotMatch(food.summary, /descarta postres|usuario busca/i);
assert.ok(food.dishes.every(d => d.match === null), 'wine taste does not prove food preference');
assert.ok(food.dishes.flatMap(d => d.recomendaciones).every(r => r.match === null), 'style suggestion is not calibrated wine affinity');
assert.ok(food.dishes.every(d => d.razon === ''), 'legacy dish taste assertions withheld');
const nullSensory = normalizeFoodScan([{ nombre: 'Plato', confidence: null, match: 99, recomendaciones: [{
  nombre: 'Blanco', match: 98, atributos: { potencia: null, acidez: '', dulzura: null, taninos: null, afrutado: null },
}] }], { estimated_visible_dishes: null }, 'menu');
assert.equal(nullSensory.dishes[0].recomendaciones[0].atributos, null);
assert.equal(nullSensory.dishes[0].confidence, null);
assert.equal(nullSensory.coverage.estimated_visible_dishes, null);
assert.equal(nullSensory.dishes[0].match, null);
assert.equal(nullSensory.dishes[0].recomendaciones[0].match, null);
const split = normalizeFoodScan([{ nombre: 'Flan / Tarta / Helado', recomendaciones: [{ nombre: 'Vino', match: 99 }] }], {}, 'menu');
assert.equal(split.dishes.length, 1, 'Slashes alone cannot establish three physical dish rows');
assert.equal(split.dishes[0].nombre, 'Flan / Tarta / Helado', 'Preserve the original model assertion without repairing names');
assert.equal(split.dishes[0].recomendaciones.length, 0, 'Do not attribute an aggregate pairing to an unresolved list of dishes');
assert.equal(split.coverage.split_rows, 0);
assert.equal(split.coverage.truncated, true, 'No source rows or boxes means segmentation remains unresolved');
assert.equal(split.coverage.partial, true);
const coverage = parseFoodScanResponse({ mode: 'menu', summary: 'All done', dishes: [], has_profile: false,
  coverage: { estimated_visible_dishes: 20, returned_dishes: 0, truncated: true } });
assert.equal(coverage.coverage?.truncated, true);
console.log('Recorded menu/food evidence regressions passed');
