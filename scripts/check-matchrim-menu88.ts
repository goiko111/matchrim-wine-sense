import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getFullMenuScanTile, getRightFocusMenuScanTile, isMenuIdentityConfirmed,
  mapMenuWineFromTile, mergeMenuTileResults, resolveMenuTileResults,
  type MenuScanWine, type MenuTileResult,
} from '../src/utils/wineMenuScan';
import { isWineMenuItem } from '../src/utils/wineMenuGrounding';

// Read-only historical evidence, never a newly generated OCR/identity benchmark.
const artifacts = process.env.MATCHRIM_MENU88_ARTIFACTS
  ?? '/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts';
const recordedDir = join(artifacts, 'matchrim85-50users-qa-20261014/recognition/cases/img_7547-2-carta-vinos');
const auditDir = join(artifacts, 'matchrim87-simulator-50-delta-20261015');
const traceBytes = readFileSync(join(recordedDir, 'backend-trace.json'));
const trace = JSON.parse(traceBytes.toString()) as Array<{
  status: number; request_payload?: { scan_region?: MenuTileResult['tile'] }; payload: MenuTileResult['response'];
}>;
const results: MenuTileResult[] = trace.filter((call) => call.status === 200 && call.request_payload?.scan_region)
  .map((call) => ({ tile: call.request_payload!.scan_region!, response: call.payload }));
const truth = JSON.parse(readFileSync(join(auditDir, 'menu-price-ground-truth.json'), 'utf8')) as {
  readable_left_rows: Array<{ name: string; amount: number }>;
  cropped_right_groups: Array<{ name_prefix: string; readable_price: null }>;
};
const audit = JSON.parse(readFileSync(join(auditDir, 'menu-field-audit.json'), 'utf8'));
const prior = JSON.parse(readFileSync(join(recordedDir, 'result.json'), 'utf8'));
let passed = 0;
const check = (name: string, run: () => void) => {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
};
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const amounts = (wine: MenuScanWine) => [wine.precio, wine.precios?.copa, wine.precios?.botella, wine.precios?.llevar]
  .filter((value) => typeof value === 'number');
const full = getFullMenuScanTile();
const focus = getRightFocusMenuScanTile();
const fullRows = results.find((result) => result.tile.id === 'full')!.response.vinos!;
const focusRows = results.find((result) => result.tile.id === 'right-focus')!.response.vinos!;
const inputSnapshot = JSON.stringify(results);
const replay = resolveMenuTileResults(results).vinos!.filter(isWineMenuItem);
const merge = (...vinos: MenuScanWine[]) => mergeMenuTileResults([{ tile: full, response: { vinos } }]).vinos!;

check('authoritative trace/image match the QA87 audit; baseline documents six leaked amounts', () => {
  assert.equal(createHash('sha256').update(traceBytes).digest('hex'), audit.traceSha256);
  assert.equal(createHash('sha256').update(readFileSync(join(recordedDir, 'authorized-source.jpg'))).digest('hex'), audit.sourceSha256);
  assert.equal(audit.metrics.unsupportedAmounts, 6);
  assert.equal(prior.ui_rows.length, 18);
  assert.equal(results.length, 4);
});
for (const expected of truth.readable_left_rows) check(`recorded readable amount retained: ${expected.name}`, () => {
  const rows = replay.filter((wine) => normalize(wine.nombre) === normalize(expected.name));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].precio, expected.amount);
  assert.equal(rows[0].precios?.copa, expected.amount);
});
for (const expected of truth.cropped_right_groups) check(`recorded cropped row unique, no borrowed amount: ${expected.name_prefix}`, () => {
  const rows = replay.filter((wine) => normalize(wine.nombre).startsWith(normalize(expected.name_prefix)));
  assert.equal(rows.length, 1);
  assert.deepEqual(amounts(rows[0]), []);
  assert.ok(rows[0].dudas?.some((doubt) => /Precio omitido.*right-focus/.test(doubt)));
  assert.ok(rows[0].campos_inferidos?.includes('precios'));
});
check('recorded replay has 16 reviewable rows, no input mutation or new names', () => {
  assert.equal(replay.length, 16);
  assert.equal(JSON.stringify(results), inputSnapshot);
  assert.ok(replay.every((wine) => results.some((result) => result.response.vinos?.some((row) => row.nombre === wine.nombre))));
});

const rose = fullRows.find((wine) => /rosado/.test(wine.nombre))!;
const roseCrop = mapMenuWineFromTile(focusRows.find((wine) => /Perrier rose/.test(wine.nombre))!, focus);
const costa = fullRows.find((wine) => wine.nombre === 'Costa di ro')!;
const costaCrop = mapMenuWineFromTile(focusRows.find((wine) => /Costa/.test(wine.nombre))!, focus);
for (const [label, a, b] of [['Rose/Rosado', rose, roseCrop], ['truncated Costa', costa, costaCrop]] as const) {
  check(`actual ${label} row merges without promoting commercial identity`, () => {
    const merged = merge(a, b);
    assert.equal(merged.length, 1);
    assert.equal(isMenuIdentityConfirmed(merged[0]), false);
    assert.equal(merged[0].compatibilidad, null);
    assert.equal(merged[0].canonicalId, null);
    assert.ok(merged[0].campos_inferidos?.includes('nombre'));
    assert.deepEqual(amounts(merged[0]), []);
    assert.ok([a.nombre, b.nombre].includes(merged[0].nombre));
  });
  for (const [boundary, patch] of [
    ['vintage', { anada: 2022 }],
    ['producer', { productor: 'Different winery' }],
    ['section', { seccion: 'Different section' }],
    ['other column', { posicion: { ...b.posicion, x: 5 } }],
    ['other row', { posicion: { ...b.posicion, y: 80 } }],
    ['missing geometry', { posicion: null }],
    ['incompatible literal source', { texto_fuente: 'Another Estate Rosado\nZona: Test' }],
  ] as Array<[string, Partial<MenuScanWine>]>) check(`actual ${label} negative boundary: ${boundary}`, () => {
    assert.equal(merge({ ...a, anada: 2020, productor: a.productor ?? 'Known winery' }, { ...b, ...patch }).length, 2);
  });
}
check('disjoint services remain separate even if the price itself is withheld', () => {
  assert.equal(merge({ ...rose, servicio: 'copa' }, { ...roseCrop, servicio: 'botella' }).length, 2);
  assert.equal(merge({ ...costa, servicio: 'copa' }, { ...costaCrop, servicio: 'botella' }).length, 2);
});
check('recorded uncertain row never fills absent producer/vintage from its expanded duplicate', () => {
  const [wine] = merge(costa, { ...costaCrop, productor: 'Uncorroborated winery', anada: 2022, confidence: 0.99 });
  assert.equal(wine.nombre, costa.nombre);
  assert.equal(wine.productor, null);
  assert.equal(wine.anada, null);
  assert.equal(wine.region, costa.region);
});

// Synthetic boundaries exercise semantics/geometry, not independent price truth.
const synthetic = (patch: Partial<MenuScanWine> = {}): MenuScanWine => ({
  nombre: 'Example Estate', productor: 'Example Winery', anada: null, region: null, pais: null,
  tipo: 'tinto', descripcion: null, precio: 27, precios: { botella: 27 }, servicio: 'botella',
  confidence: 0.92, texto_fuente: 'Example Estate\nZona/zone: Test\nUva/grapes: Syrah\nCrianza/aging: 6 years\n27',
  posicion: { x: 30, y: 30, width: 20, height: 5 }, ...patch,
});
for (const tile of [full, focus, { id: 'left' as const, box: { x: 0, y: 0, width: 56, height: 100 } }]) {
  check(`detached metadata amount withheld across platforms/tiles: ${tile.id}`, () => {
    const row = synthetic();
    const [wine] = mergeMenuTileResults([{ tile, response: { vinos: [row] } }]).vinos!;
    assert.deepEqual(amounts(wine), []);
    assert.equal(wine.texto_fuente, row.texto_fuente);
    assert.ok(wine.dudas?.some((doubt) => doubt.includes(`(${tile.id})`)));
  });
}
for (const source of [
  'Example Estate 27\nZona: Test\nUva: Syrah',
  'Example Estate\nZona: Test\nBotella 27 EUR',
  'Example Estate\nZona: Test\nPrice: 27',
  'Example Estate\nZona: Test\n27 EUR',
  'Example Estate 27',
]) check(`synthetic row-bound/labelled price survives: ${JSON.stringify(source)}`, () => {
  assert.equal(merge(synthetic({ texto_fuente: source }))[0].precios?.botella, 27);
});
check('flat legacy/public-web responses are unchanged', () => {
  const [wine] = merge(synthetic({ texto_fuente: 'Example Estate', precios: { botella: 27 } }));
  assert.equal(wine.precio, 27);
  assert.equal(wine.dudas, undefined);
});
for (const source of [
  'Example Estate\nZona: Test\nCrianza/aging: 27 years',
  'Example Estate\nZona: Test\nAlcohol: 27%',
  'Example Estate\nZona: Test\nUva: 27% Syrah',
  'Example Estate 27%\nZona: Test',
  'Example Estate 27 cl\nZona: Test',
  'Example Estate 27 a\u00f1os\nZona: Test',
  'Example Estate 27 ABV\nZona: Test',
]) check(`synthetic non-price number cannot support a price: ${JSON.stringify(source)}`, () => {
  assert.deepEqual(amounts(merge(synthetic({ texto_fuente: source }))[0]), []);
});
check('a cuvee number or vintage is not a numeric price', () => {
  assert.deepEqual(amounts(merge(synthetic({ nombre: 'Example 27', texto_fuente: 'Example 27\nZona: Test' }))[0]), []);
  assert.deepEqual(amounts(merge(synthetic({ anada: 2021, precio: 2021, precios: { botella: 2021 }, texto_fuente: 'Example Estate 2021\nZona: Test' }))[0]), []);
});
check('service-specific amounts cannot borrow each other; decimal and free prices survive', () => {
  const [wine] = merge(synthetic({ precio: null, precios: { copa: 7.5, botella: 7.5, llevar: 0 },
    texto_fuente: 'Example Estate\nZona: Test\nCopa 7,50 EUR\nLlevar 0 EUR' }));
  assert.deepEqual(wine.precios, { copa: 7.5, botella: null, llevar: 0 });
  assert.ok(wine.dudas?.some((doubt) => doubt.includes('Precio omitido')));
});
check('one retained service cannot resurrect a rejected generic amount', () => {
  const [wine] = merge(synthetic({ precio: 40, precios: { copa: 7, botella: 40 },
    texto_fuente: 'Example Estate\nZona: Test\nCopa 7 EUR\n40' }));
  assert.equal(wine.precio, null);
  assert.deepEqual(wine.precios, { copa: 7, botella: null, llevar: null });
});
check('multiple service labels on one line bind only their own amounts', () => {
  const source = 'Example Estate\nZona: Test\nCopa 7,50 EUR / Botella 40 EUR';
  assert.deepEqual(merge(synthetic({ texto_fuente: source, precio: null, precios: { copa: 7.5, botella: 40, llevar: null } }))[0].precios,
    { copa: 7.5, botella: 40, llevar: null });
  assert.deepEqual(amounts(merge(synthetic({ texto_fuente: source, precio: null, precios: { copa: 40, botella: 7.5 } }))[0]), []);
});
check('negative and mixed-separator numbers do not leak numeric substrings', () => {
  for (const price of ['-27 EUR', '1.234,27 EUR']) {
    assert.deepEqual(amounts(merge(synthetic({ texto_fuente: `Example Estate\nZona: Test\n${price}` }))[0]), []);
  }
});
check('separately transcribed complete Rose/Rosado names are not globally aliased', () => {
  assert.equal(merge(synthetic({ nombre: 'Example Rose', texto_fuente: 'Example Rose' }),
    synthetic({ nombre: 'Example Rosado', texto_fuente: 'Example Rosado' })).length, 2);
});
for (const [a, b] of [
  ['Example Reserva', 'Example Gran Reserva'],
  ['Example Reserva', 'Example Reserva Especial'],
  ['Example Ultra', 'Example Ultra Brut'],
  ['Example Brut', 'Example Brut Nature'],
  ['Example Blanco', 'Example Rosado'],
]) check(`different cuvees survive identical geometry: ${a} / ${b}`, () => {
  assert.equal(merge(synthetic({ nombre: a, texto_fuente: a }), synthetic({ nombre: b, texto_fuente: b })).length, 2);
});
check('ambiguous truncated source is not resolved by input order', () => {
  const short = synthetic({ nombre: 'Example Ro', productor: null, texto_fuente: 'Example Ros\nZona: Test', campos_inferidos: ['nombre'] });
  const first = synthetic({ nombre: 'Example Rose', texto_fuente: 'Example Ros\nZona: Test', productor: 'Winery A' });
  const second = { ...first, productor: 'Winery B' };
  for (const rows of [[first, second, short], [second, first, short], [short, first, second],
    [short, second, first], [first, short, second], [second, short, first]]) assert.equal(merge(...rows).length, 3);
});
check('explicit type differences are not excused by a truncated name', () => {
  assert.equal(merge({ ...costa, campos_inferidos: [], tipo: 'rosado' }, { ...costaCrop, tipo: 'espumoso' }).length, 2);
});
check('known services/vintages cannot bypass the literal-source shortcut', () => {
  const row = synthetic({ texto_fuente: 'Example Estate', precio: null, precios: null });
  assert.equal(merge({ ...row, servicio: 'copa' }, { ...row, servicio: 'botella' }).length, 2);
  assert.equal(merge({ ...row, anada: 2018 }, { ...row, anada: 2021 }).length, 2);
});
console.log(`Menu88: ${passed} checks passed; offline recorded replay + synthetic boundaries, 0 external calls. Not release approval.`);
