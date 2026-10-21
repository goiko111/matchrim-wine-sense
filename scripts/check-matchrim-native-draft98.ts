import assert from 'node:assert/strict';
import { createNativeWineDraft98, readNativeWineDraft98 } from '../src/utils/nativeWineDraft98';
import { safeOwnedWineImage98, safeWineImageUrl98 } from '../src/utils/wineImage98';

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks++; console.log('PASS', name); };
const wine = { name: 'Luna Reserva', winery: 'Bodegas Ejemplo', vintage: 2021,
  id: 1, photo: 'https://example.test/bottle.png', affinity: 99, tastingAttributes: { power: 5 } };
check('Draft carries only identity text, never a trusted score, photo, sensory profile or catalogue id', () => {
  const before = JSON.stringify(wine);
  assert.deepEqual(createNativeWineDraft98(wine, 'qa-owner'), { nativeWineDraft98: {
    ownerId: 'qa-owner', name: wine.name, producer: wine.winery, vintage: '2021',
  } });
  assert.equal(JSON.stringify(wine), before);
});
check('Owner-bound draft reaches the existing explicit confirmation form', () => {
  assert.deepEqual(readNativeWineDraft98(createNativeWineDraft98(wine, 'qa-owner'), 'qa-owner'), {
    name: wine.name, producer: wine.winery, vintage: 2021,
  });
});
check('Anonymous and different owners cannot consume a previous owner draft', () => {
  for (const owner of [null, undefined, '', 'other-owner']) {
    assert.equal(readNativeWineDraft98(createNativeWineDraft98(wine, 'qa-owner'), owner), null);
  }
});
check('Forged optional authority fields are stripped, not promoted', () => {
  assert.deepEqual(readNativeWineDraft98({ nativeWineDraft98: { ...wine, ownerId: 'qa-owner',
    producer: wine.winery, vintage: '2021' } }, 'qa-owner'), { name: wine.name, producer: wine.winery, vintage: 2021 });
});
check('Malformed, executable and oversized identity text fails closed', () => {
  for (const name of ['', ' ', {}, [], '<script>', 'bad\nname', 'a'.repeat(301)]) {
    assert.equal(readNativeWineDraft98({ nativeWineDraft98: { ownerId: 'qa-owner', name } }, 'qa-owner'), null);
  }
  for (const state of [null, [], {}, false, 'x']) assert.equal(readNativeWineDraft98(state, 'qa-owner'), null);
});
check('Vintage is exact or absent, never silently rounded or coerced', () => {
  for (const vintage of ['2021x', '2021.1', '1800', '2100', 2021, {}, true]) {
    assert.equal(readNativeWineDraft98({ nativeWineDraft98: { ownerId: 'qa-owner', name: wine.name, vintage } }, 'qa-owner'), null);
  }
  for (const vintage of [undefined, null, '']) assert.equal(readNativeWineDraft98({ nativeWineDraft98: {
    ownerId: 'qa-owner', name: wine.name, vintage } }, 'qa-owner')?.vintage, null);
});
check('Owned raster captures remain displayable without acquiring catalogue authority', () => {
  for (const type of ['png', 'jpeg', 'webp']) {
    const value = `data:image/${type};base64,iVBORw0KGgo=`;
    assert.equal(safeOwnedWineImage98(value), value);
    assert.equal(safeWineImageUrl98(value), null);
  }
  for (const value of ['data:image/svg+xml;base64,PHN2Zz4=', 'javascript:alert(1)',
    'data:text/html;base64,PHN2Zz4=', 'data:image/png;base64,not valid', 'blob:https://test/id']) {
    assert.equal(safeOwnedWineImage98(value), null);
  }
});
console.log(`${checks}/${checks} PASS`);
