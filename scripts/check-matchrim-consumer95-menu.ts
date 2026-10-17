import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { nativeLiteralMenuEvidence95, nativeMenuWineAffinity } from '../src/utils/menuWineConsumer95';
import { applyMenuWineEvidence } from '../src/utils/scanWineEvidence';
import { catalogWineFromVerifiedSheet, type WinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import { getFullMenuScanTile, isMenuIdentityConfirmed, mergeMenuTileResults, resolveMenuTileResults, type MenuScanWine } from '../src/utils/wineMenuScan';
import { menuSaveEvidence } from '../src/utils/menuWineSave';
import { nativeMenuScanFailure } from '../src/utils/menuScanFailure95';
import { EdgeFunctionError } from '../src/utils/edgeFunctionResilience';
import { menuRecoveryTiles95 } from '../src/utils/menuRecovery95';

let groups = 0;
const check = (name: string, run: () => void) => { run(); groups++; console.log('PASS', name); };
const profile = { potente: 2.4, acidez: 4, dulce: 1, tanico: 0, afrutado: 3 };
const identity = { name: 'Luna Reserva', producer: 'Bodegas Ejemplo', vintage: 2021, region: 'Rioja', country: 'Spain' };
const sheet: WinerimOriginalSheet = { id: '123', ...identity, vintage: '2021', detailVerified: true, grapes: [],
  url: 'https://web.winerim.com/the-library/wines/123/Luna-Reserva_2021',
  sensoryAttributes: { power: 2.4, acidity: 4, sweetness: 1, tannin: 0, fruity: 3 } };
const row: MenuScanWine = { nombre: identity.name, productor: identity.producer, anada: 2021, region: 'Rioja', pais: 'Spain',
  confidence: .78, dudas: ['Synthetic medium OCR control'], campos_inferidos: [], precio: null, tipo: 'tinto', descripcion: null,
  texto_fuente: identity.name + ' ' + identity.producer };
const resolved = applyMenuWineEvidence(row, profile, catalogWineFromVerifiedSheet(identity, sheet)!);
check('A current verified menu row exposes the actual local score and exact dimensions', () => {
  const result = nativeMenuWineAffinity(resolved, profile);
  assert.equal(result.state, 'ready');
  if (result.state === 'ready') {
    assert.equal(result.score, 93);
    assert.equal(result.dimensions.find(d => d.key === 'tanico')?.wineValue, 0);
    assert.equal(result.dimensions.find(d => d.key === 'potente')?.wineValue, 2.4);
  }
});
for (const [name, update] of Object.entries({
  'wrong producer': { productor: 'Otro productor' }, 'wrong vintage': { anada: 2020 },
  'conflicting ID': { canonicalId: '124' }, 'unverified detail': { originalSheet: { ...sheet, detailVerified: false } },
  'inferred identity': { campos_inferidos: ['producer'] },
  'changed sensory axis': { atributos: { ...resolved.atributos!, taninos: 5 } },
  'missing scale': { atributos: { ...resolved.atributos!, scale: undefined } },
  'changed personal score': { compatibilidad: 70 }, 'absent score': { compatibilidad: null },
  'changed profile snapshot': {},
})) check(name + ' cannot retain a personal recommendation', () => {
  const currentProfile = name === 'changed profile snapshot' ? { ...profile, dulce: 5 } : profile;
  const result = nativeMenuWineAffinity({ ...resolved, ...update }, currentProfile);
  assert.equal(result.state, 'pending');
  assert.equal('dimensions' in result, false);
  assert.equal('score' in result, false);
});
check('Missing profile is distinguishable from a negative wine recommendation', () => {
  const result = nativeMenuWineAffinity(resolved, null);
  assert.equal(result.state, 'pending');
  if (result.state === 'pending') assert.equal(result.reason, 'profile');
});
check('An existing sheet without sensory evidence asks for data, not reidentification', () => {
  const result = nativeMenuWineAffinity({ ...resolved, sensorySource: 'inference' }, profile);
  assert.equal(result.state, 'pending');
  if (result.state === 'pending') assert.equal(result.reason, 'sensory');
});
check('A literal style remains readable but cannot inherit a named bottle identity or personal score', () => {
  const generic: MenuScanWine = { ...resolved, nombre: 'Merlot', productor: null, anada: null,
    tipo: 'tinto', seccion: 'RED', texto_fuente: '175ml / 250ml / BTL RED 5.5 7 19 Merlot / Shiraz', confidence: .99, dudas: [] };
  const pending = nativeLiteralMenuEvidence95(generic);
  assert.equal(isMenuIdentityConfirmed(pending), false);
  for (const field of ['canonicalId', 'originalSheet', 'atributos', 'compatibilidad', 'confidence'] as const) assert.equal(pending[field], null);
  assert.equal(pending.affinity_calibrated, false);
  const evidence = menuSaveEvidence(pending, { potencia: 5 });
  assert.equal(evidence.trace.identity_confirmed, false);
  assert.equal(evidence.sensory_attributes, null);
  assert.equal(evidence.matchrim_affinity, null);
  const answer = nativeMenuWineAffinity(generic, profile);
  assert.equal(answer.state, 'pending');
  assert.ok(answer.state === 'pending' && answer.description.includes('Merlot'));
  assert.ok(!('score' in answer));
});
check('Retaining a generic style does not invent or rewrite its price, format, currency or literal evidence', () => {
  const input: MenuScanWine = { ...row, nombre: 'Prosecco', productor: null, texto_fuente: 'BTL FIZZ 21 Prosecco',
    precio: 21, moneda: null, servicio: 'botella', precios: { botella: 21 }, campos_inferidos: ['atributos'] };
  const output = nativeLiteralMenuEvidence95(input);
  for (const field of ['precio', 'moneda', 'servicio', 'precios', 'texto_fuente', 'campos_inferidos'] as const) assert.deepEqual(output[field], input[field]);
});
const comparisonSource = readFileSync(new URL('../src/components/wine-import/WineComparisonWorkspace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('comparison.tsx', comparisonSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let attributeNode: ts.VariableStatement | undefined;
ast.forEachChild(node => {
  if (ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => declaration.name.getText(ast) === 'AttributeValue')) attributeNode = node;
});
assert.ok(attributeNode, 'Test executes the current component body, not a duplicated formatter');
const js = ts.transpileModule(attributeNode.getText(ast) + '\nglobalThis.AttributeValue = AttributeValue;', {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
}).outputText;
const renderAttribute = (value: unknown, native: boolean) => {
  const context = vm.createContext({ React, Capacitor: { isNativePlatform: () => native } });
  vm.runInContext(js, context);
  return renderToStaticMarkup(context.AttributeValue({ value }));
};
check('Actual native comparator preserves zero and decimals instead of rounding/clamping to one', () => {
  for (const value of [0, .4, 2.4, 4.75, 5]) {
    const html = renderAttribute(value, true);
    assert.ok(html.includes(`aria-label="${value} de 5"`));
    assert.ok(html.includes(`${value}/5`));
  }
});
check('Actual native comparator withholds invalid source values instead of silently clamping', () => {
  for (const value of [-1, 6, Number.NaN, Infinity, '2', null, undefined]) assert.ok(!renderAttribute(value, true).includes('aria-label='));
});
check('The legacy web attribute presentation remains byte-compatible for the previous inputs', () => {
  for (const [value, label] of [[0, 1], [2.4, 2], [4.75, 5], [6, 5]]) assert.ok(renderAttribute(value, false).includes(`aria-label="${label} de 5"`));
});
check('Real hosted timeout is understandable and does not expose the provider error', () => {
  const message = nativeMenuScanFailure(new EdgeFunctionError('Signal timed out.', { status: 500, errorCode: null, retryAfterMs: null }));
  assert.match(message, /tardó demasiado/);
  assert.match(message, /zonas/);
  assert.doesNotMatch(message, /Signal|timed out|500/);
});
check('Quota, invalid model and offline failures preserve a distinct honest next action', () => {
  for (const status of [402, 429]) assert.match(nativeMenuScanFailure(new EdgeFunctionError('raw secret-looking provider text', { status, errorCode: null, retryAfterMs: null })), /más tarde/);
  assert.match(nativeMenuScanFailure(new EdgeFunctionError('unknown', { status: 502, errorCode: 'invalid_model_response', retryAfterMs: null })), /lectura fiable/);
  assert.match(nativeMenuScanFailure(new TypeError('Failed to fetch')), /conexión/);
  assert.doesNotMatch(nativeMenuScanFailure(new Error('raw upstream debug information')), /raw upstream/);
});
check('User-selected two-page reading respects vertical pages even inside a portrait photograph', () => {
  assert.deepEqual(menuRecoveryTiles95(1800, 2400, 'columns').map(tile => tile.id), ['left', 'right']);
  assert.deepEqual(menuRecoveryTiles95(2400, 1800, 'rows').map(tile => tile.id), ['top', 'bottom']);
  assert.deepEqual(menuRecoveryTiles95(1800, 2400, 'auto').map(tile => tile.id), ['top', 'bottom']);
});
check('An explicit unequal-page divider preserves complete page spans without changing the default crop plan', () => {
  const defaults = menuRecoveryTiles95(3024, 4032, 'columns');
  assert.deepEqual(defaults.map(tile => tile.box), [
    { x: 0, y: 0, width: 56, height: 100 }, { x: 44, y: 0, width: 56, height: 100 },
  ]);
  for (const split of [20, 25, 50, 75, 80]) for (const layout of ['columns', 'quadrants'] as const) {
    const tiles = menuRecoveryTiles95(3024, 4032, layout, split);
    assert.equal(tiles.length, layout === 'columns' ? 2 : 4);
    assert.equal(tiles[0].box.width, split + 6);
    assert.equal(tiles[1].box.x, split - 6);
    assert.equal(tiles[1].box.x + tiles[1].box.width, 100);
    for (const tile of tiles) {
      assert.ok(tile.box.width > 0 && tile.box.height > 0);
      assert.ok(tile.box.x >= 0 && tile.box.y >= 0);
      assert.ok(tile.box.x + tile.box.width <= 100 && tile.box.y + tile.box.height <= 100);
    }
  }
});
check('Malformed page dividers fail locally instead of generating empty or off-image provider crops', () => {
  for (const split of [0, 19, 81, 100, NaN, Infinity]) assert.deepEqual(menuRecoveryTiles95(100, 100, 'columns', split), []);
});
check('Recovery geometry covers the complete frame with bounded overlap and at most four requests', () => {
  for (const mode of ['auto', 'columns', 'rows', 'quadrants'] as const) {
    const tiles = menuRecoveryTiles95(1800, 2400, mode);
    assert.ok(tiles.length >= 2 && tiles.length <= 4);
    assert.equal(new Set(tiles.map(tile => tile.id)).size, tiles.length);
    for (const { box } of tiles) assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 100 && box.y + box.height <= 100);
    for (let x = 0; x <= 100; x++) for (let y = 0; y <= 100; y++) {
      assert.ok(tiles.some(({ box }) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height));
    }
  }
  for (const size of [[0, 10], [10, 0], [NaN, 10], [10, Infinity], [-1, 10]]) assert.deepEqual(menuRecoveryTiles95(...size as [number, number], 'quadrants'), []);
  assert.deepEqual(menuRecoveryTiles95(1800, 2400, 'unsupported' as 'auto'), []);
});
check('Different numeric references are not erased as near-identical OCR in the native merger', () => {
  for (const names of [['Cuvée de la Casa 12', 'Cuvée de la Casa 18'], ['Luna Reserva 2018', 'Luna Reserva 2019'], ['Parcela Especial 100', 'Parcela Especial 101'], ['Cuvée de la Casa12', 'Cuvée de la Casa18']]) {
    const wines = names.map(nombre => ({ ...row, nombre, anada: null, texto_fuente: nombre + ' ' + row.productor }));
    const input = [{ tile: getFullMenuScanTile(), response: { vinos: wines } }];
    assert.equal(mergeMenuTileResults(input, { preserveNumericReferences: true }).vinos?.length, 2);
    assert.equal(resolveMenuTileResults(input, { preserveNumericReferences: true }).vinos?.length, 2);
    const separateCrops = [{ tile: getFullMenuScanTile(), response: { vinos: [wines[0]] } },
      { tile: menuRecoveryTiles95(2400, 1800, 'columns')[1], response: { vinos: [wines[1]] } }];
    assert.equal(resolveMenuTileResults(separateCrops, { preserveNumericReferences: true }).vinos?.length, 2);
  }
});
check('Exact numeric duplicates still group while the default legacy merger remains unchanged', () => {
  const names = ['Cuvée de la Casa 12', 'Cuvée de la Casa 18'];
  const wines = names.map(nombre => ({ ...row, nombre, anada: null, texto_fuente: nombre + ' ' + row.productor }));
  const input = [{ tile: getFullMenuScanTile(), response: { vinos: wines } }];
  assert.equal(mergeMenuTileResults(input).vinos?.length, 1);
  const duplicates = [{ ...input[0], response: { vinos: [wines[0], { ...wines[0] }] } }];
  assert.equal(mergeMenuTileResults(duplicates, { preserveNumericReferences: true }).vinos?.length, 1);
});
console.log(JSON.stringify({ groups, passed: true, modelCalls: 0, realUsers: 0, scoringFormulaChanged: false }));
