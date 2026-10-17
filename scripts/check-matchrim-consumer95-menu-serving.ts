import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import {
  getFullMenuScanTile, literalMenuServingFormat95, mergeMenuTileResults, resolveMenuTileResults,
  type MenuScanWine, type MenuTileResult,
} from '../src/utils/wineMenuScan';
import { resolveMenuPriceReview, clearMenuManualPriceOrigin } from '../src/utils/menuPriceReview';

// Entirely SYNTHETIC literal menu rows. No images, accounts, catalog identities or captured provider payload.
const { values } = parseArgs({ args: process.argv.slice(2), options: { 'audit-legacyweb': { type: 'boolean', default: false } } });
const nativeOptions = { preserveNumericReferences: true, preserveServingFormats: true };
const generic = (nombre: string, seccion: string, tipo: string, servicio: 'copa' | 'botella', formato: string | null,
  precio: number, texto_fuente: string): MenuScanWine => ({
  nombre, seccion, tipo, servicio, formato, precio, texto_fuente,
  productor: null, anada: null, region: null, pais: null, moneda: null,
  descripcion: 'SYNTHETIC unit fixture, not a real menu or named bottle.',
  canonicalId: null, originalSheet: null, atributos: null, compatibilidad: null,
  confidence: .55, dudas: ['SYNTHETIC generic style, no catalog identity'], campos_inferidos: ['atributos'],
  precios: { copa: servicio === 'copa' ? precio : null, botella: servicio === 'botella' ? precio : null, llevar: null },
});
const white = '175ml / 250ml / BTL \u00b7 WHITE 5.5 7 19 \u00b7 Pinot Grigio';
const red = '175ml / 250ml / BTL \u00b7 RED 5.5 7 19 \u00b7 Merlot / Shiraz';
const rose = '175ml / 250ml / BTL \u00b7 ROSE 5.5 7 19 \u00b7 Blush Pinot Grigio';
const rows: MenuScanWine[] = [
  generic('Pinot Grigio', 'WHITE', 'blanco', 'copa', '175 ml', 5.5, white),
  generic('Pinot Grigio', 'WHITE', 'blanco', 'copa', '250 ml', 7, white),
  generic('Pinot Grigio', 'WHITE', 'blanco', 'botella', null, 19, white),
  generic('Merlot', 'RED', 'tinto', 'copa', '175 ml', 5.5, red),
  generic('Merlot', 'RED', 'tinto', 'copa', '250 ml', 7, red),
  generic('Merlot', 'RED', 'tinto', 'botella', null, 19, red),
  generic('Shiraz', 'RED', 'tinto', 'copa', '175 ml', 5.5, red),
  generic('Shiraz', 'RED', 'tinto', 'copa', '250 ml', 7, red),
  generic('Shiraz', 'RED', 'tinto', 'botella', null, 19, red),
  generic('Blush Pinot Grigio', 'ROSE', 'rosado', 'copa', '175 ml', 5.5, rose),
  generic('Blush Pinot Grigio', 'ROSE', 'rosado', 'copa', '250 ml', 7, rose),
  generic('Blush Pinot Grigio', 'ROSE', 'rosado', 'botella', null, 19, rose),
  generic('Prosecco', 'FIZZ', 'espumoso', 'botella', null, 21, 'BTL \u00b7 FIZZ 21 \u00b7 Prosecco'),
];
type Serving = [name: string, service: string | null, format: string | null, amount: number | null];
// Independent literal oracle, not another call to the merger or a projection of its input.
const expected: Serving[] = [
  ['Pinot Grigio', 'copa', '175 ml', 5.5], ['Pinot Grigio', 'copa', '250 ml', 7], ['Pinot Grigio', 'botella', null, 19],
  ['Merlot', 'copa', '175 ml', 5.5], ['Merlot', 'copa', '250 ml', 7], ['Merlot', 'botella', null, 19],
  ['Shiraz', 'copa', '175 ml', 5.5], ['Shiraz', 'copa', '250 ml', 7], ['Shiraz', 'botella', null, 19],
  ['Blush Pinot Grigio', 'copa', '175 ml', 5.5], ['Blush Pinot Grigio', 'copa', '250 ml', 7], ['Blush Pinot Grigio', 'botella', null, 19],
  ['Prosecco', 'botella', null, 21],
];
const expectedWeb: Serving[] = [
  ['Pinot Grigio', 'copa', '175 ml', null], ['Pinot Grigio', 'botella', null, 19],
  ['Merlot', 'copa', '175 ml', null], ['Merlot', 'botella', null, 19],
  ['Shiraz', 'copa', '175 ml', null], ['Shiraz', 'botella', null, 19],
  ['Blush Pinot Grigio', 'copa', '175 ml', null], ['Blush Pinot Grigio', 'botella', null, 19],
  ['Prosecco', 'botella', null, 21],
];
const tuples = (wines: MenuScanWine[]): Serving[] => wines.map(wine => [wine.nombre, wine.servicio ?? null, wine.formato ?? null, wine.precio]);
const sorted = (items: Serving[]) => [...items].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const tile = getFullMenuScanTile();
const merge = (vinos: MenuScanWine[]) => mergeMenuTileResults([{ tile, response: { vinos } }], nativeOptions).vinos ?? [];
const a = rows[0], b = rows[1], originalInputs = JSON.stringify(rows);

let observationOrders = 0, batchEvaluations = 0;
const permutations95 = <T,>(items: T[]): T[][] => items.length === 0 ? [[]] : items.flatMap((item, index) =>
  permutations95(items.filter((_, other) => other !== index)).map(rest => [item, ...rest]));
const priceQuote95 = (patch: Partial<MenuScanWine> = {}): MenuScanWine => {
  const quote: MenuScanWine = { ...a, texto_fuente: 'WHITE\nPinot Grigio 175ml 250ml 750ml 0 5.5 5.75 7 19 20 18 18.5',
    precios: { copa: 5.5, botella: 19, llevar: 18 }, ...patch };
  if (quote.precios) Object.freeze(quote.precios);
  return Object.freeze(quote);
};
const batchPaths95 = (input: MenuScanWine[], status: 'partial' | 'unknown' | 'reported_complete' = 'reported_complete') => {
  const before = JSON.stringify(input);
  const full = (vinos: MenuScanWine[]): MenuTileResult => ({ tile, response: { vinos, coverage: { status } } });
  const regional = (vinos: MenuScanWine[]): MenuTileResult => ({
    tile: { id: 'left', box: { x: 0, y: 0, width: 100, height: 100 } }, response: { vinos, coverage: { status } },
  });
  const each: MenuTileResult[] = input.map((wine, index) => ({ ...regional([wine]),
    tile: index === 0 ? tile : { id: (['left', 'right', 'bottom'] as const)[index - 1], box: { x: 0, y: 0, width: 100, height: 100 } } }));
  const results = [
    mergeMenuTileResults([full(input)], nativeOptions),
    resolveMenuTileResults([full(input)], nativeOptions),
    resolveMenuTileResults([full(input.slice(0, 1)), regional(input.slice(1))], nativeOptions),
    resolveMenuTileResults([full(input.slice(0, 2)), regional(input.slice(2))], nativeOptions),
    resolveMenuTileResults(each, nativeOptions),
    resolveMenuTileResults([...each].reverse(), nativeOptions),
  ];
  batchEvaluations += results.length;
  assert.equal(JSON.stringify(input), before);
  return results.map(result => result.vinos ?? []);
};

let groups = 0;
const check = (name: string, run: () => void) => { run(); groups++; console.log('PASS', name); };

check('SYNTHETIC denominator is13 serving rows across five generic styles, not13 wines', () => {
  assert.equal(rows.length, 13); assert.equal(new Set(rows.map(row => row.nombre)).size, 5);
  assert.ok(rows.every(row => row.descripcion?.startsWith('SYNTHETIC')));
});
check('Native merger retains all13 literal serving/price tuples', () => {
  const result = merge(rows);
  assert.equal(result.length, 13);
  assert.deepEqual(sorted(tuples(result)), sorted(expected));
  for (const row of result) {
    assert.equal(row.precios?.[row.servicio as 'copa' | 'botella'], row.precio);
    for (const field of ['moneda', 'productor', 'anada', 'canonicalId', 'originalSheet', 'atributos', 'compatibilidad'] as const) {
      assert.equal(row[field], null, 'Serving retention is not identity, currency or sensory evidence');
    }
  }
});
check('Native resolver also retains13, including all four250ml alternatives at7', () => {
  const result = resolveMenuTileResults([{ tile, response: { vinos: rows } }], nativeOptions).vinos ?? [];
  assert.deepEqual(sorted(tuples(result)), sorted(expected));
  assert.equal(result.filter(row => row.formato === '250 ml' && row.precio === 7).length, 4);
});
check('Default and explicit opt-out retain exact legacy nine-row behavior', () => {
  const input = [{ tile, response: { vinos: rows } }];
  for (const result of [
    mergeMenuTileResults(input), resolveMenuTileResults(input),
    mergeMenuTileResults(input, { preserveServingFormats: false }), resolveMenuTileResults(input, { preserveServingFormats: false }),
  ]) {
    assert.equal(result.vinos?.length, 9);
    assert.deepEqual(sorted(tuples(result.vinos ?? [])), sorted(expectedWeb));
    assert.equal(result.vinos?.filter(row => row.servicio === 'copa' && row.precios?.copa === null).length, 4);
  }
});
check('Only literal serving labels are exposed; shared RED layout supports both sizes for both members', () => {
  const labels = rows.map(row => literalMenuServingFormat95(row));
  assert.deepEqual(labels, ['175ml', '250ml', null, '175ml', '250ml', null, '175ml', '250ml', null, '175ml', '250ml', null, null]);
});
check('Exact overlap duplicates collapse without removing distinct serving sizes', () => {
  assert.deepEqual(sorted(tuples(merge([...rows, ...structuredClone(rows)]))), sorted(expected));
});
check('Unknown-format bridges cannot join175ml and250ml in any of the six orders', () => {
  for (const formato of [undefined, null, '', 'unknown', '500 ml']) {
    const unknown = { ...a, formato, precio: null, precios: { copa: null, botella: null, llevar: null }, confidence: 1 };
    for (const input of [[a, unknown, b], [a, b, unknown], [unknown, a, b], [unknown, b, a], [b, a, unknown], [b, unknown, a]]) {
      assert.deepEqual(sorted(tuples(merge(input))), sorted([['Pinot Grigio', 'copa', '175 ml', 5.5], ['Pinot Grigio', 'copa', '250 ml', 7]]));
    }
  }
});
check('Full12 plus regional13 retains the observed13th serving under all coverage statuses', () => {
  const twelve = rows.filter(row => !(row.nombre === 'Pinot Grigio' && row.formato === '250 ml'));
  assert.equal(twelve.length, 12);
  for (const status of ['partial', 'unknown', 'reported_complete'] as const) {
    const input: MenuTileResult[] = [
      { tile, response: { vinos: twelve, coverage: { status } } },
      { tile: { id: 'left', box: { x: 0, y: 0, width: 100, height: 100 } },
        response: { vinos: rows, coverage: { status: 'reported_complete' } } },
    ];
    for (const order of [input, [...input].reverse()]) {
      assert.deepEqual(sorted(tuples(resolveMenuTileResults(order, nativeOptions).vinos ?? [])), sorted(expected));
    }
  }
});
check('Separate generic lines cannot borrow another style size or create a duplicate serving', () => {
  const source = 'RED\nMerlot 175ml 5.5\nShiraz 250ml 7';
  for (const [name, ownFormat, otherFormat, amount] of [
    ['Merlot', '175 ml', '250 ml', 5.5], ['Shiraz', '250 ml', '175 ml', 7],
  ] as const) {
    const own = generic(name, 'RED', 'tinto', 'copa', ownFormat, amount, source);
    const unsupported = { ...own, formato: otherFormat };
    assert.equal(literalMenuServingFormat95(own), ownFormat.replace(' ', ''));
    assert.equal(literalMenuServingFormat95(unsupported), null);
    for (const input of [[own, unsupported], [unsupported, own]]) {
      assert.deepEqual(tuples(merge(input)), [[name, 'copa', ownFormat, amount]]);
    }
  }
});
check('Row binding is not specific to the five fixtures and preserves explicit shared headers', () => {
  for (const source of [
    '175ml / 250ml / BTL \u00b7 RED 5.5 7 19 \u00b7 Cabernet Franc / Tempranillo',
    '175ml / 250ml / BTL\nRED 5.5 7 19\nCabernet Franc\nTempranillo',
  ]) {
    for (const name of ['Cabernet Franc', 'Tempranillo']) {
      assert.equal(literalMenuServingFormat95(generic(name, 'RED', 'tinto', 'copa', '250 ml', 7, source)), '250ml');
    }
  }
  for (const other of ['Chardonnay', 'Water']) {
    assert.equal(literalMenuServingFormat95({ ...a, formato: '250 ml',
      texto_fuente: 'WHITE\nPinot Grigio 175ml 5.5\n' + other + ' 250ml 7' }), null);
  }
  for (const source of [
    '175ml / 250ml / BTL\nRED 5.5 7 19\nCabernet Franc 175ml 5.5\nTempranillo 250ml 7',
    '175ml / 250ml / BTL\nWHITE 5.5 7 19\nCabernet Franc / Tempranillo',
    '175ml / 250ml / BTL\nRED 5.5 7 19\nCabernet Franc / Water',
    '175ml 250ml RED Cabernet Franc 175ml Tempranillo 250ml',
  ]) assert.equal(literalMenuServingFormat95(generic('Cabernet Franc', 'RED', 'tinto', 'copa', '250 ml', 7, source)), null);
});
check('Absent, malformed, unprinted and inferred format/service evidence cannot supply a label', () => {
  for (const formato of [undefined, null, '', 'unknown', '500 ml', '-175 ml', '0 ml']) {
    assert.equal(literalMenuServingFormat95({ ...a, formato }), null);
  }
  for (const field of ['formato', 'format', 'servicio', 'service', 'volumen', 'volume', 'size', 'tama\u00f1o']) {
    assert.equal(literalMenuServingFormat95({ ...a, campos_inferidos: [field] }), null);
  }
  for (const servicio of [undefined, null, 'ambos'] as const) assert.equal(literalMenuServingFormat95({ ...a, servicio }), null);
});
check('Equivalent ml/cl/L units collapse and display the printed unit, not an invented conversion', () => {
  for (const formato of ['17.5 cl', '0.175 L', '17,5 CL']) {
    assert.equal(literalMenuServingFormat95({ ...a, formato }), '175ml');
    assert.deepEqual(tuples(merge([a, { ...a, formato }])), [['Pinot Grigio', 'copa', '175 ml', 5.5]]);
  }
});
check('Decimal unit equivalence is exact rational arithmetic, not an IEEE754 epsilon', () => {
  const decimal = { ...a, formato: '175.1 ml', texto_fuente: 'Pinot Grigio 175.1ml 5.5' };
  for (const formato of ['17.51 cl', '0.1751 L']) {
    assert.equal(literalMenuServingFormat95({ ...decimal, formato }), '175.1ml');
    assert.equal(merge([decimal, { ...decimal, formato }]).length, 1);
  }
  for (const formato of ['175.1000000000000001 ml', '17.510000000000001 cl']) {
    assert.equal(literalMenuServingFormat95({ ...decimal, formato }), null);
  }
});
check('Large same-serving price contradictions still abstain', () => {
  const result = merge([a, { ...a, precio: 8, precios: { copa: 8, botella: null, llevar: null } }]);
  assert.equal(result.length, 1); assert.equal(result[0].precio, null); assert.equal(result[0].precios?.copa, null);
});
check('Missing provider serving observations are not reconstructed from header text or expected tuples', () => {
  const omitted = rows.filter(row => row.formato !== '250 ml');
  assert.equal(omitted.length, 9);
  const result = merge(omitted);
  assert.equal(result.length, 9);
  assert.deepEqual(sorted(tuples(result)), sorted(expected.filter(row => row[2] !== '250 ml')));
  assert.equal(result.some(row => row.nombre === 'Prosecco' && row.servicio === 'copa'), false);
});
check('Native same-serving unequal normalized prices abstain exactly, including zero and equal volume units', () => {
  for (const [low, high] of [[5.5, 5.75], [0, .25], [5.5, 5.5001]]) {
    const first = { ...a, precio: low, precios: { copa: low, botella: null, llevar: null } };
    for (const formato of ['175 ml', '17.5 cl']) {
      const second = { ...first, formato, precio: high, precios: { copa: high, botella: null, llevar: null } };
      for (const input of [[first, second], [second, first]]) {
        const result = merge(input);
        assert.equal(result.length, 1);
        assert.equal(result[0].precio, null);
        assert.equal(result[0].precios?.copa, null);
      }
    }
  }
});
check('Web small-price output remains EXACT legacy behavior, not a correctness endorsement', () => {
  const other = { ...a, precio: 5.75, precios: { copa: 5.75, botella: null, llevar: null } };
  for (const [input, expectedAmount] of [[[a, other], 5.5], [[other, a], 5.75]] as const) {
    for (const options of [undefined, { preserveServingFormats: false }]) {
      const result = mergeMenuTileResults([{ tile, response: { vinos: [...input] } }], options).vinos ?? [];
      assert.equal(result.length, 1);
      assert.equal(result[0].precio, expectedAmount);
      assert.equal(result[0].precios?.copa, expectedAmount);
    }
  }
});
check('Native scalar and selected-service price conflicts remain sticky in every3/4 observation order', () => {
  for (const servicio of ['copa', 'botella'] as const) {
    const first = priceQuote95({ servicio, formato: servicio === 'copa' ? '175 ml' : '750 ml',
      precio: servicio === 'copa' ? 5.5 : 19 });
    const prices = { ...first.precios, [servicio]: servicio === 'copa' ? 5.75 : 20 };
    const second = priceQuote95({ ...first, precio: prices[servicio], precios: prices });
    const unknown = priceQuote95({ ...first, precio: null, precios: { ...first.precios, [servicio]: null }, confidence: 1 });
    for (const readings of [[first, second, first], [first, second, second], [first, second, unknown],
      [first, second, first, unknown], [first, second, second, unknown], [first, second, first, second]]) {
      for (const order of permutations95(readings)) {
        observationOrders++;
        for (const result of batchPaths95(order)) {
          assert.equal(result.length, 1); assert.equal(result[0].precio, null); assert.equal(result[0].precios?.[servicio], null);
          assert.equal(result[0].precios?.[servicio === 'copa' ? 'botella' : 'copa'], servicio === 'copa' ? 19 : 5.5);
          assert.equal(result[0].precios?.llevar, 18);
        }
      }
    }
  }
});
check('Each service lane is independently sticky, without erasing other lane amounts', () => {
  for (const lane of ['copa', 'botella', 'llevar'] as const) {
    const first = priceQuote95({ servicio: 'ambos', formato: null, precio: null });
    const changed = { copa: 5.75, botella: 20, llevar: 18.5 }[lane];
    const second = priceQuote95({ ...first, precios: { ...first.precios, [lane]: changed } });
    const unknown = priceQuote95({ ...first, precios: { ...first.precios, [lane]: null }, confidence: 1 });
    for (const readings of [[first, second, first], [first, second, unknown],
      [first, second, first, unknown], [first, second, second, first]]) for (const order of permutations95(readings)) {
      observationOrders++;
      for (const result of batchPaths95(order)) {
        assert.equal(result.length, 1); assert.equal(result[0].precio, null); assert.equal(result[0].precios?.[lane], null);
        for (const other of ['copa', 'botella', 'llevar'] as const) if (other !== lane) assert.equal(result[0].precios?.[other], first.precios?.[other]);
      }
    }
  }
});
check('Scalar/service aliases cannot restore a disputed amount by moving it into another field', () => {
  const scalar = priceQuote95({ precios: { copa: null, botella: 19, llevar: 18 } });
  const lane = priceQuote95({ precio: null, precios: { copa: 5.75, botella: 19, llevar: 18 } });
  const repeat = priceQuote95();
  const unknown = priceQuote95({ precio: null, precios: { copa: null, botella: 19, llevar: 18 }, confidence: 1 });
  for (const readings of [[scalar, lane, repeat], [scalar, lane, unknown], [scalar, lane, repeat, unknown], [scalar, lane, repeat, repeat]]) {
    for (const order of permutations95(readings)) {
      observationOrders++;
      for (const result of batchPaths95(order)) {
        assert.equal(result.length, 1); assert.equal(result[0].precio, null); assert.equal(result[0].precios?.copa, null);
        assert.equal(result[0].precios?.botella, 19); assert.equal(result[0].precios?.llevar, 18);
      }
    }
  }
});
check('EUR/USD conflicts stay ambiguous after repeats or unknown currency and veto every money lane', () => {
  const eur = priceQuote95({ moneda: 'EUR' }), usd = priceQuote95({ moneda: 'USD' });
  const unknown = priceQuote95({ moneda: null, confidence: 1 });
  for (const readings of [[eur, usd, eur], [eur, usd, usd], [eur, usd, unknown],
    [eur, usd, eur, unknown], [eur, usd, usd, unknown], [eur, usd, eur, usd]]) for (const order of permutations95(readings)) {
    observationOrders++;
    for (const result of batchPaths95(order)) {
      assert.equal(result.length, 1); assert.equal(result[0].moneda, null); assert.equal(result[0].precio, null);
      assert.deepEqual(result[0].precios, { copa: null, botella: null, llevar: null });
    }
  }
});
check('Document currencies and all coverage statuses retain discarded duplicate conflict evidence', () => {
  const quote = priceQuote95({ moneda: null });
  const doc = (currency: string | null): MenuTileResult => ({ tile, response: { vinos: [quote], moneda: currency } });
  const eur = doc('EUR'), usd = doc('USD'), unknown = doc(null);
  for (const readings of [[eur, usd, eur], [eur, usd, unknown], [eur, usd, eur, unknown], [eur, usd, usd, eur]]) {
    for (const order of permutations95(readings)) {
      observationOrders++;
      const tiles = order.map((reading, index) => ({ ...reading,
        tile: index === 0 ? tile : { id: (['left', 'right', 'bottom'] as const)[index - 1], box: { x: 0, y: 0, width: 100, height: 100 } } }));
      for (const result of [mergeMenuTileResults(tiles, nativeOptions), resolveMenuTileResults(tiles, nativeOptions),
        resolveMenuTileResults([...tiles].reverse(), nativeOptions)]) {
        batchEvaluations++;
        assert.equal(result.vinos?.length, 1); assert.equal(result.vinos[0].moneda, null); assert.equal(result.vinos[0].precio, null);
        assert.deepEqual(result.vinos[0].precios, { copa: null, botella: null, llevar: null });
      }
    }
  }
  const first = priceQuote95(), second = priceQuote95({ precio: 5.75, precios: { copa: 5.75, botella: 19, llevar: 18 } });
  for (const status of ['partial', 'unknown', 'reported_complete'] as const) {
    for (const readings of [[first, second, first], [first, second, first, first]]) for (const order of permutations95(readings)) {
      observationOrders++;
      for (const result of batchPaths95(order, status)) {
        assert.equal(result.length, 1); assert.equal(result[0].precio, null); assert.equal(result[0].precios?.copa, null);
      }
    }
  }
});
check('Equal duplicates and one explicit reading plus unknowns remain valid; malformed repeats cannot clear conflict', () => {
  const good = priceQuote95({ moneda: 'EUR' });
  const unknown = priceQuote95({ precio: null, moneda: null, precios: { copa: null, botella: null, llevar: null }, confidence: 1 });
  for (const readings of [[good, good, good], [good, good, unknown], [good, good, good, good], [good, unknown, unknown, unknown]]) {
    for (const order of permutations95(readings)) {
      observationOrders++;
      for (const result of batchPaths95(order)) {
        assert.equal(result.length, 1); assert.equal(result[0].precio, 5.5); assert.equal(result[0].moneda, 'EUR');
        assert.deepEqual(result[0].precios, { copa: 5.5, botella: 19, llevar: 18 });
      }
    }
  }
  const other = priceQuote95({ precio: 5.75, precios: { copa: 5.75, botella: 19, llevar: 18 } });
  for (const invalid of [null, undefined, NaN, Infinity, 'unknown']) {
    const bad = priceQuote95({ precio: invalid as number, precios: { copa: invalid as number, botella: 19, llevar: 18 }, confidence: 1 });
    for (const order of permutations95([priceQuote95(), other, bad, priceQuote95()])) {
      observationOrders++;
      for (const result of batchPaths95(order)) {
        assert.equal(result.length, 1); assert.equal(result[0].precio, null); assert.equal(result[0].precios?.copa, null);
      }
    }
  }
});
check('Independent175/250 serving groups and fresh batches cannot inherit each other conflict state', () => {
  const small = priceQuote95(), large = priceQuote95({ formato: '250 ml', precio: 7, precios: { copa: 7, botella: 19, llevar: 18 } });
  const changed = priceQuote95({ precio: 5.75, precios: { copa: 5.75, botella: 19, llevar: 18 } });
  for (const [readings, smallAmount] of [[[small, small, large, large], 5.5], [[small, changed, large, large], null]] as const) {
    for (const order of permutations95([...readings])) {
      observationOrders++;
      for (const result of batchPaths95(order)) {
        assert.equal(result.length, 2);
        const a = result.find(row => row.formato === '175 ml'), b = result.find(row => row.formato === '250 ml');
        assert.ok(a && b); assert.equal(a.precio, smallAmount); assert.equal(a.precios?.copa, smallAmount);
        assert.equal(b.precio, 7); assert.equal(b.precios?.copa, 7);
      }
    }
  }
  assert.equal(merge([small, changed, small])[0].precio, null);
  assert.equal(merge([small, small, small])[0].precio, 5.5, 'No ledger survives its batch or mutates a reused input');
  const normal = merge([small, small])[0];
  assert.equal(Object.getOwnPropertySymbols(normal).length, 0);
  assert.ok(Object.keys(normal).every(key => !/moneyConflicts|conflictMask|NativeMenuMoneyConflicts95/.test(key)));
});
check('Provider manual/conflict metadata has no authority; explicit post-scan manual review still works', () => {
  const first = priceQuote95({ moneda: 'EUR' }), other = priceQuote95({ moneda: 'USD' });
  const fake = { ...first, precio_origen: 'manual' as const, precio_manual_pendiente: false,
    nativeMoneyConflicts95: { precio: false, moneda: false, copa: false } };
  const before = JSON.stringify([first, other, fake]);
  const pending = merge([first, other, fake])[0];
  assert.equal(pending.precio, null); assert.equal(pending.moneda, null);
  assert.deepEqual(pending.precios, { copa: null, botella: null, llevar: null });
  assert.equal(JSON.stringify([first, other, fake]), before);
  const fakeConflict = { ...first, nativeMoneyConflicts95: { precio: true, moneda: true, copa: true } };
  assert.equal(merge([fakeConflict, first])[0].precio, 5.5, 'Untrusted flags cannot create ledger authority either');
  const manual = resolveMenuPriceReview(pending, 7.25, 'copa', 'EUR');
  assert.equal(manual.precio, 7.25); assert.equal(manual.moneda, 'EUR'); assert.equal(manual.precios?.copa, 7.25);
  assert.equal(manual.precio_origen, 'manual'); assert.equal(manual.precio_manual_pendiente, false);
  assert.equal(manual.precio_manual_asignacion?.original.amount, null);
  assert.equal(manual.precio_manual_asignacion?.original.currency, null);
  for (const field of ['canonicalId', 'originalSheet', 'atributos', 'compatibilidad', 'texto_fuente', 'confidence'] as const) {
    assert.deepEqual(manual[field], pending[field], 'Manual money confirmation is not identity/sensory authority');
  }
  assert.equal(pending.precio, null); assert.equal(pending.moneda, null);
  const cleared = clearMenuManualPriceOrigin(manual);
  assert.equal(cleared.precio_origen, undefined); assert.equal(cleared.precio_manual_asignacion, undefined);
});

check('A reused mutable input is re-evaluated by each merge, including inferred/source/volume changes', () => {
  const mutable = structuredClone(a), other = structuredClone(b);
  const input = [{ tile, response: { vinos: [mutable, other] } }];
  const run = () => mergeMenuTileResults(input, nativeOptions).vinos ?? [];
  assert.equal(run().length, 2);
  mutable.formato = '250 ml';
  assert.equal(run().length, 1);
  assert.equal(run()[0].precio, null);
  mutable.formato = '175 ml';
  mutable.campos_inferidos = ['atributos', 'formato'];
  assert.equal(run().length, 1);
  mutable.campos_inferidos = ['atributos'];
  assert.equal(run().length, 2);
  mutable.texto_fuente = 'WHITE\nOther Style 175ml\nPinot Grigio 250ml 7';
  // Different literal rows need not merge; the unbound175ml claim must lose its label.
  assert.equal(run().length, 2);
  assert.equal(literalMenuServingFormat95(run()[0]), null);
  assert.equal(literalMenuServingFormat95(run()[1]), '250ml');
  mutable.texto_fuente = a.texto_fuente;
  assert.equal(run().length, 2);
  assert.deepEqual(other, structuredClone(b));
});
check('Resolver aggregations observe mutations to reused full/regional inputs without retained cache authority', () => {
  const mutable = structuredClone(b);
  const input: MenuTileResult[] = [{ tile, response: { vinos: [structuredClone(a)], coverage: { status: 'reported_complete' } } },
    { tile: { id: 'left', box: { x: 0, y: 0, width: 100, height: 100 } }, response: { vinos: [mutable] } }];
  const run = () => resolveMenuTileResults(input, nativeOptions).vinos ?? [];
  assert.equal(run().length, 2);
  mutable.formato = '175 ml';
  assert.equal(run().length, 1);
  assert.equal(run()[0].precio, null);
  mutable.formato = '250 ml';
  assert.equal(run().length, 2);
  mutable.campos_inferidos = ['atributos', 'formato'];
  assert.equal(run().length, 1);
  mutable.campos_inferidos = ['atributos'];
  assert.equal(run().length, 2);
  const before = JSON.stringify(input);
  run();
  assert.equal(JSON.stringify(input), before);
});
check('The public literal label is uncached and observes nested inference/source/name/format mutations', () => {
  const mutable = structuredClone(a);
  assert.equal(literalMenuServingFormat95(mutable), '175ml');
  mutable.formato = '250 ml';
  assert.equal(literalMenuServingFormat95(mutable), '250ml');
  mutable.campos_inferidos?.push('formato');
  assert.equal(literalMenuServingFormat95(mutable), null);
  mutable.campos_inferidos = ['atributos'];
  mutable.nombre = 'Merlot';
  assert.equal(literalMenuServingFormat95(mutable), null);
  mutable.nombre = a.nombre;
  mutable.texto_fuente = 'WHITE\nPinot Grigio 175ml 5.5\nShiraz 250ml 7';
  assert.equal(literalMenuServingFormat95(mutable), null);
  mutable.texto_fuente = a.texto_fuente;
  assert.equal(literalMenuServingFormat95(mutable), '250ml');
});

check('Input observations remain immutable', () => assert.equal(JSON.stringify(rows), originalInputs));

// Separate original abstention oracles: native now passes; legacy web remains FAIL.
// Audit mode is deliberately exit1 for the unchanged web defect, never a PASS/waiver.
const legacyAudit: { id: string; passed: boolean; expected: { amount: null; glass: null };
  actual: { amount: number | null; glass: number | null | undefined }; error: string | null }[] = [];
if (values['audit-legacyweb']) for (const mode of ['native', 'default-web'] as const) {
  const input = [{ tile, response: { vinos: [a, { ...a, precio: 5.75, precios: { copa: 5.75, botella: null, llevar: null } }] } }];
  const result = (mode === 'native' ? mergeMenuTileResults(input, nativeOptions) : mergeMenuTileResults(input)).vinos ?? [];
  assert.equal(result.length, 1);
  const actual = { amount: result[0].precio, glass: result[0].precios?.copa };
  const expectedAbstention = { amount: null, glass: null };
  let error: string | null = null;
  try { assert.deepEqual(actual, expectedAbstention); } catch (failure) {
    error = failure instanceof Error ? failure.message : String(failure);
  }
  const passed = error === null;
  console[passed ? 'log' : 'error']((passed ? 'AUDIT_PASS ' : 'AUDIT_FAIL ') + 'historical-small-price-conflict-' + mode,
    JSON.stringify({ expected: expectedAbstention, actual }));
  legacyAudit.push({ id: 'historical-small-price-conflict-' + mode, passed, expected: expectedAbstention, actual, error });
}
const legacyAuditAllPassed = values['audit-legacyweb'] ? legacyAudit.every(item => item.passed) : null;
console.log(JSON.stringify({
  status: legacyAuditAllPassed === false ? 'NATIVE_FUNCTIONAL_PASS_LEGACY_WEB_AUDIT_FAIL' : 'NATIVE_FUNCTIONAL_PASS_WEB_BEHAVIOR_UNCHANGED',
  functionalPassed: true, functionalGroupsPassed: groups, observationOrders, batchEvaluations, legacyAuditRequested: values['audit-legacyweb'],
  legacyAuditAllPassed, legacyAudit,
  denominator: '13 synthetic serving rows across five generic styles, not13 wines',
  syntheticOnly: true, modelCalls: 0, realPeople: 0,
  scope: 'Native functional contract plus exact unchanged web compatibility. Separate legacy audit retains original abstention oracles; its web FAIL is not counted as PASS or waived.',
  limits: 'Pure imported menu merge/resolver/literal-label units. No recognition, owner data, UI/native50, human-taste or release approval claim.',
}));
if (legacyAuditAllPassed === false) process.exitCode = 1;
