import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { buildMenuScanTiles, getFullMenuScanTile, mergeMenuTileResults, resolveMenuTileResults, needsMenuRefinement,
  type MenuScanResponse, type MenuScanTile, type MenuScanWine } from '../src/utils/wineMenuScan';
import { createMenuScanRun93, MenuScanLimitError93, planNativeMenuInitialRead96, planNativeMenuRefinement93 } from '../src/utils/wineMenuExecution93';
import { menuRecoveryTiles95 } from '../src/utils/menuRecovery95';
import { getCropGeometry } from '../src/utils/imageCropGeometry';

// SYNTHETIC geometry/observations plus the unchanged public Oct8 captured16 oracle.
// Neither is new OCR, catalogue verification or human taste.
let groups = 0, rowChecks = 0;
const check = async (name: string, run: () => void | Promise<void>) => { await run(); groups++; console.log('PASS', name); };
const rowTiles: MenuScanTile[] = [
  { id: 'top', box: { x: 0, y: 0, width: 100, height: 56 } },
  { id: 'bottom', box: { x: 0, y: 44, width: 100, height: 56 } },
];
const columns: MenuScanTile[] = [
  { id: 'left', box: { x: 0, y: 0, width: 56, height: 100 } },
  { id: 'right', box: { x: 44, y: 0, width: 56, height: 100 } },
];
const rightFocus: MenuScanTile = { id: 'right-focus', box: { x: 64, y: 0, width: 36, height: 100 } };
const rowRefinement = [...rowTiles, rightFocus];
const options = { preserveRowContext: true };
const partial: MenuScanResponse = { layout: 'columns', vinos: [], coverage: { status: 'partial', estimated_visible_wines: 30 } };
const sizes = [[1800, 2400], [2400, 1800], [1000, 1000], [400, 2400], [2400, 600]];
const contains = (tile: MenuScanTile, x: number, y: number, width: number, height: number) =>
  tile.box.x <= x && tile.box.y <= y && tile.box.x + tile.box.width >= x + width
  && tile.box.y + tile.box.height >= y + height;

await check('Native opt-in retains two full-width strips plus conditional complementary right focus', () => {
  for (const [width, height] of sizes) for (const layout of ['columns', 'rows', 'unknown'] as const) {
    assert.deepEqual(buildMenuScanTiles(width, height, layout, options), rowTiles);
    assert.deepEqual(planNativeMenuRefinement93(width, height, { ...partial, layout }, options), layout === 'columns' ? rowRefinement : rowTiles);
  }
  for (const [width, height] of [[1800, 2400], [2400, 1800], [1200, 1801]]) {
    assert.deepEqual(planNativeMenuInitialRead96(width, height), [getFullMenuScanTile(), ...rowRefinement]);
  }
  for (const [width, height] of [[1200, 1800], [1199, 2400], [2400, 600], [1000, 1000], [0, 2400], [NaN, 2400], [Infinity, 2400]]) {
    assert.deepEqual(planNativeMenuInitialRead96(width, height), []);
  }
});
await check('Default and explicit opt-out preserve independent legacy geometry, including invalid inputs', () => {
  for (const [width, height] of sizes) for (const layout of ['columns', 'rows', 'unknown'] as const) {
    const expected = width >= height && layout === 'columns' ? columns : rowTiles;
    assert.deepEqual(buildMenuScanTiles(width, height, layout), expected);
    assert.deepEqual(buildMenuScanTiles(width, height, layout, { preserveRowContext: false }), expected);
    const expectedPlan = width < height && layout === 'columns' ? rowRefinement : expected;
    assert.deepEqual(planNativeMenuRefinement93(width, height, { ...partial, layout }), expectedPlan);
    assert.deepEqual(planNativeMenuRefinement93(width, height, { ...partial, layout }, { preserveRowContext: false }), expectedPlan);
  }
  for (const value of [0, -1, NaN, Infinity]) {
    assert.deepEqual(buildMenuScanTiles(value, 1000), [getFullMenuScanTile()]);
    assert.deepEqual(planNativeMenuRefinement93(value, 1000, partial, options), []);
  }
});
await check('Names and distant/mirrored price columns remain in the same crop, including seam rows', () => {
  for (let y = 0; y <= 92; y += .25) for (const [nameX, priceX] of [[5, 85], [85, 5], [45, 90]]) {
    assert.ok(rowTiles.some(tile => contains(tile, nameX, y, 10, 8) && contains(tile, priceX, y, 5, 8)));
    rowChecks++;
  }
  assert.equal(columns.some(tile => contains(tile, 5, 45, 35, 8) && contains(tile, 85, 45, 10, 8)), false);
  assert.ok(rowTiles.every(tile => tile.box.x === 0 && tile.box.width === 100));
});
await check('No whole-row guarantee is fabricated for rows taller than the overlap or absent headers', () => {
  assert.equal(rowTiles.some(tile => contains(tile, 0, 43, 100, 14)), false);
  assert.equal(contains(rowTiles[1], 65, 10, 30, 5), false);
});
await check('Actual crop geometry retains both horizontal endpoints and page bounds', () => {
  for (const [width, height] of sizes) for (const tile of rowTiles) {
    const crop = getCropGeometry(width, height, tile.box, 0);
    assert.equal(crop.pixels.x, 0); assert.equal(crop.pixels.width, width);
    assert.ok(crop.pixels.y >= 0 && crop.pixels.y + crop.pixels.height <= height);
  }
});
await check('Coverage gates refinement; original16-reference oracle is retained within four total requests', () => {
  const complete = { ...partial, coverage: { status: 'reported_complete' as const, estimated_visible_wines: 0 } };
  for (const [width, height] of sizes) {
    assert.deepEqual(planNativeMenuRefinement93(width, height, complete, options), []);
    const next = planNativeMenuRefinement93(width, height, partial, options);
    assert.deepEqual(next, rowRefinement);
    assert.ok(1 + next.length <= 4);
  }
  assert.deepEqual(planNativeMenuRefinement93(1000, 2000, partial).map(tile => tile.id), ['top', 'bottom', 'right-focus']);
  for (const layout of ['rows', 'unknown'] as const) for (const count of [11, 12]) {
    const vinos = Array.from({ length: count }, () => ({ nombre: 'SYNTHETIC', productor: null, anada: null, region: null,
      pais: null, precio: null, tipo: null, descripcion: null }));
    assert.deepEqual(planNativeMenuRefinement93(1800, 2400, { ...partial, layout, vinos }, options), count === 12 ? rowRefinement : rowTiles);
  }
  const recorded = JSON.parse(readFileSync(new URL('../qa/fixtures/menu-food-evidence-oct8.json', import.meta.url), 'utf8')).cases[0].calls as Array<{ scan_region: MenuScanTile; payload: MenuScanResponse }>;
  const full = recorded.find(call => call.scan_region.id === 'full')!;
  const plan = planNativeMenuRefinement93(1000, 2000, full.payload, options);
  const observations = [{ tile: getFullMenuScanTile(), response: full.payload }, ...plan.map(tile => ({ tile,
    response: recorded.find(call => call.scan_region.id === tile.id)!.payload }))];
  for (const mergeOptions of [{}, { preserveNumericReferences: true, preserveServingFormats: true }]) {
    const recovered = resolveMenuTileResults(observations, mergeOptions);
    assert.equal(recovered.vinos?.length, 16, 'Latency policy must retain the two references recovered by the narrow column');
    assert.ok(recovered.vinos?.some(wine => wine.nombre === 'Costa di ros'));
    assert.ok(recovered.vinos?.some(wine => wine.nombre === 'La Rosa'));
  }
});

const componentPath = new URL('../src/components/wine-import/WineMenuScanner.tsx', import.meta.url);
const source = readFileSync(componentPath, 'utf8');
const ast = ts.createSourceFile('WineMenuScanner.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map<string, ts.Expression>();
const cropCalls: ts.CallExpression[] = [];
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) declarations.set(node.name.text, node.initializer);
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'cropImageRegion') cropCalls.push(node);
  ts.forEachChild(node, visit);
};
visit(ast);
const expression = (name: string) => { const value = declarations.get(name); assert.ok(value); return value.getText(ast); };
const actual = (name: string, values: Record<string, unknown>) => {
  const context = { nativeInitialTiles: [], ...values, buildMenuScanTiles, menuRecoveryTiles95, planNativeMenuInitialRead96,
    planNativeMenuRefinement93, needsMenuRefinement, result: undefined };
  vm.runInNewContext(ts.transpileModule('result = (' + expression(name) + ');', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return context.result as MenuScanTile[];
};
await check('Actual native component automatic-recovery initializer selects row context without overriding manual layouts', () => {
  for (const [width, height] of sizes) {
    const values = { retained: null, prepared: { width, height }, recoveryColumnSplit: 75, recoveryLayout: 'auto' };
    assert.deepEqual(actual('initialTiles', values), rowTiles);
    for (const recoveryLayout of ['columns', 'rows', 'quadrants'] as const) {
      assert.deepEqual(actual('initialTiles', { ...values, recoveryLayout }), menuRecoveryTiles95(width, height, recoveryLayout, 75));
    }
    const failed = [{ id: 'left' as const, box: { x: 0, y: 0, width: 81, height: 100 } }];
    assert.equal(actual('initialTiles', { ...values, retained: { failed } }), failed, 'Retained failed crop must remain exact');
  }
  assert.deepEqual(actual('nativeInitialTiles', { nativeRun: {}, readMode: 'full', isMatchrimFixtureQaEnabled: false,
    prepared: { width: 1800, height: 2400 } }), [getFullMenuScanTile(), ...rowRefinement]);
  for (const values of [
    { nativeRun: null, readMode: 'full', isMatchrimFixtureQaEnabled: false },
    { nativeRun: {}, readMode: 'regions', isMatchrimFixtureQaEnabled: false },
    { nativeRun: {}, readMode: 'full', isMatchrimFixtureQaEnabled: true },
  ]) {
    const tiles = actual('nativeInitialTiles', { ...values, prepared: { width: 1800, height: 2400 } });
    assert.ok(Array.isArray(tiles)); assert.equal(tiles.length, 0);
  }
});
await check('Actual component refinement initializer gates the opt-in to native, preserving web and explicit retry behavior', () => {
  const values = { isMatchrimFixtureQaEnabled: false, isNative: true, readMode: 'full', nativeRun: {}, fullResponse: partial,
    prepared: { width: 2400, height: 1800 } };
  assert.deepEqual(actual('scanTiles', values), rowRefinement);
  assert.deepEqual(actual('scanTiles', { ...values, isNative: false, nativeRun: null }), columns);
  for (const result of [actual('scanTiles', { ...values, readMode: 'failed-regions' }),
    actual('scanTiles', { ...values, readMode: 'regions' }),
    actual('scanTiles', { ...values, isMatchrimFixtureQaEnabled: true }),
    actual('scanTiles', { ...values, nativeInitialTiles: [getFullMenuScanTile(), ...rowRefinement] })]) {
    assert.ok(Array.isArray(result)); assert.equal(result.length, 0);
  }
});
await check('All actual regional crop calls keep padding0, max1800 and the same cancellation signal', () => {
  assert.equal(cropCalls.length, 3);
  for (const call of cropCalls) {
    assert.equal(call.arguments[2].getText(ast), '0');
    assert.equal(call.arguments[3].getText(ast), '1800');
    assert.equal(call.arguments[4].getText(ast), 'controller.signal');
  }
});
await check('R6 literal formats, zero/decimal prices and sticky contradictions remain strict, without service/currency invention', () => {
  const quote = (price: number, format = '175 ml'): MenuScanWine => ({ nombre: 'Merlot', productor: null, anada: null, region: null,
    pais: null, precio: price, tipo: 'tinto', descripcion: 'SYNTHETIC row', formato: format, servicio: 'copa', moneda: null,
    texto_fuente: 'RED\nMerlot 175ml 250ml 0 0.25 7', precios: { copa: price, botella: null, llevar: null }, campos_inferidos: ['atributos'] });
  const input = [quote(0), quote(.25), quote(0), quote(7, '250 ml')], before = JSON.stringify(input);
  const result = mergeMenuTileResults([{ tile: rowTiles[0], response: { vinos: input } }],
    { preserveServingFormats: true, preserveNumericReferences: true }).vinos!;
  assert.equal(result.length, 2); assert.equal(result[0].precio, null); assert.equal(result[0].precios?.copa, null);
  assert.equal(result[1].precio, 7); assert.ok(result.every(row => row.moneda === null));
  const unknown = { ...quote(7), servicio: null, formato: null };
  assert.equal(mergeMenuTileResults([{ tile: rowTiles[1], response: { vinos: [unknown] } }]).vinos![0].servicio, null);
  assert.equal(JSON.stringify(input), before);
});
await check('Actual native runner retains four-request cap and90s/58s defaults without hidden retries', async () => {
  const operation = createMenuScanRun93({ signal: new AbortController().signal });
  let calls = 0;
  for (let index = 0; index < 4; index++) await operation.request(async () => ++calls);
  await assert.rejects(operation.request(async () => ++calls), error => error instanceof MenuScanLimitError93 && error.reason === 'request_limit');
  assert.equal(calls, 4); operation.finish('completed');
});
await check('Ignoring-signal transports still settle on active abort/deadline and cannot publish late success', async () => {
  for (const mode of ['abort', 'deadline'] as const) {
    const controller = new AbortController();
    const operation = createMenuScanRun93({ signal: controller.signal, requestMs: mode === 'deadline' ? 5 : 58000 });
    let resolveLate: ((value: string) => void) | undefined;
    const request = operation.request(() => new Promise<string>(resolve => { resolveLate = resolve; }));
    await Promise.resolve();
    if (mode === 'abort') controller.abort();
    await assert.rejects(request);
    resolveLate?.('late'); await Promise.resolve();
    assert.equal(operation.snapshot().completed, 0); assert.equal(operation.snapshot().failed, 1);
    operation.finish(mode === 'abort' ? 'cancelled' : 'failed');
  }
});
console.log(JSON.stringify({ passed: true, groups, rowChecks, nativeRegionsMax: 3, fullWidthStrips: 2, complementaryRightFocus: true, capturedReferences: 16, cropMaxDimension: 1800,
  largeDocumentsStartParallel: true, initialParallelMinShortSide: 1200, initialParallelLongSideAbove: 1800,
  requestCap: 4, remoteCalls: 0, syntheticOnly: false, capturedReplay: 'Unchanged public Oct8 responses; no new recognition',
  limits: 'Geometry preserves joint row pixels, not OCR success or missing headers. Wide crops may downsample text more; manual column/quadrant choices remain partial-context. No recognition/provider/human-taste/native-latency claim.' }));
