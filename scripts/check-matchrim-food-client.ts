import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFoodScanResponse } from '../src/utils/foodScanResponse';
import { readMatchrimLocalProfile } from '../src/utils/matchrimLocalProfile';

const valid = { mode: 'menu', summary: 'Menu', has_profile: false, dishes: [{
  nombre: 'Dorada', categoria: 'Pescado', match: 80, razon: 'Acidez', recomendaciones: [{
    nombre: 'Blanco fresco', tipo: 'blanco', match: 85, razon: 'Estilo', atributos: null,
  }],
}] };
assert.equal(parseFoodScanResponse(valid).dishes.length, 1);
assert.equal(parseFoodScanResponse({ ...valid, dishes: [] }).dishes.length, 0);
const recorded = JSON.parse(readFileSync(new URL('../docs/qa-evidence/matchrim-build64-recognition-2026-09-28/food-menu-real-backend.json', import.meta.url), 'utf8'));
assert.equal(parseFoodScanResponse(recorded.response).dishes.length, recorded.actual_count);
const partial = parseFoodScanResponse({ ...valid, dishes: [{ ...valid.dishes[0], recomendaciones: [{
  ...valid.dishes[0].recomendaciones[0],
  atributos: { potencia: 3, acidez: null, dulzura: null, taninos: null, afrutado: null },
}] }] });
assert.equal(partial.dishes[0].recomendaciones[0].atributos?.acidez, null);
for (const invalid of [null, {}, { ...valid, dishes: null }, { ...valid, dishes: [{}] },
  { ...valid, dishes: [{ ...valid.dishes[0], recomendaciones: null }] }]) {
  assert.throws(() => parseFoodScanResponse(invalid));
}
for (const match of [-1, 101, NaN, Infinity, null, '', '85']) {
  assert.throws(() => parseFoodScanResponse({ ...valid, dishes: [{ ...valid.dishes[0], match }] }));
  assert.throws(() => parseFoodScanResponse({ ...valid, dishes: [{ ...valid.dishes[0],
    recomendaciones: [{ ...valid.dishes[0].recomendaciones[0], match }],
  }] }));
}
let stored: string | null = null;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => stored } });
assert.equal(readMatchrimLocalProfile(), null);
stored = JSON.stringify({ potente: null, acidez: null, dulce: null, tanico: null, afrutado: null });
assert.equal(readMatchrimLocalProfile(), null);
stored = JSON.stringify({ potente: 4, acidez: 3, dulce: 1, tanico: 2, afrutado: 4 });
assert.equal(readMatchrimLocalProfile()?.potente, 4);
console.log('Food client response/profile contracts PASS: invalid responses and scores rejected, missing profile preserved');
