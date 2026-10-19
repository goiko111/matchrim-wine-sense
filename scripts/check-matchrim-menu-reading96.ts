import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { getFullMenuScanTile, resolveMenuTileResults, type MenuScanWine, type MenuTileResult } from '../src/utils/wineMenuScan';
import { menuReadingSourceLabel96, nativeMenuTakeawayText96 } from '../src/utils/menuReadingPresentation96';
import { menuWinePriceEvidence, updateMenuWineEvidence } from '../src/utils/scanWineEvidence';
import { menuCardIdentity } from '../src/utils/menuWineActions';
import { formatMenuPriceAmount } from '../src/utils/menuPriceReview';
import { wineComparisonPrice } from '../src/utils/wineComparison';
import { restoreMenuEntrySource96 } from './check-matchrim-native-menu-entry-bridge96.mjs';

// SYNTHETIC literal readings only. No owner images, GT spellings, network or catalogue claims.
const base: MenuScanWine = {
  nombre: 'SYNTHETIC Solaria Ultra brut', productor: 'SYNTHETIC Solaria', anada: null, region: null, pais: null,
  precio: 130, moneda: 'EUR', precios: { copa: null, botella: 130, llevar: 104 }, servicio: 'botella',
  tipo: 'espumoso', descripcion: 'SYNTHETIC', texto_fuente: 'SYNTHETIC Solaria Ultra brut 130 104 EUR',
  confidence: .88, campos_inferidos: ['atributos'], posicion: { x: 10, y: 10, width: 50, height: 5, confidence: .94 },
};
const alternative: MenuScanWine = { ...base, nombre: 'SYNTHETIC Solarea Ultra brut', productor: 'SYNTHETIC Solarea',
  texto_fuente: 'SYNTHETIC Solarea Ultra brut 130 104 EUR',
  posicion: { x: 10, y: 10 / .56, width: 50, height: 5 / .56, confidence: .94 } };
const full = getFullMenuScanTile(), top: MenuTileResult['tile'] = { id: 'top', box: { x: 0, y: 0, width: 100, height: 56 } };
const options = { preserveNumericReferences: true, preserveServingFormats: true, preserveReadingAlternatives: true };
const input = (reading: MenuScanWine = alternative, rows = [base]): MenuTileResult[] => [
  { tile: full, response: { vinos: rows, coverage: { status: 'reported_complete' } } },
  { tile: top, response: { vinos: [{ ...base, nombre: 'SYNTHETIC unrelated', posicion: { x: 80, y: 80, width: 10, height: 2, confidence: .9 } }, reading] } },
];
const resolve = (reading: MenuScanWine = alternative, rows = [base]) => resolveMenuTileResults(input(reading, rows), options).vinos!;
const expectedReading = { tile: top, rawIndex: 1, nombre: alternative.nombre, productor: alternative.productor, texto_fuente: alternative.texto_fuente };
let groups = 0, controls = 0;
const check = (name: string, run: () => void) => { run(); groups++; console.log('PASS', name); };

check('Takeaway is presentation only, with exact104, zero, decimals and missing-currency qualification', () => {
  assert.equal(nativeMenuTakeawayText96(base), 'Para llevar 104,00\u00a0€');
  assert.equal(nativeMenuTakeawayText96({ ...base, precios: { llevar: 0 } }), 'Para llevar 0,00\u00a0€');
  assert.equal(nativeMenuTakeawayText96({ ...base, precios: { llevar: 4.75 } }), 'Para llevar 4,75\u00a0€');
  assert.equal(nativeMenuTakeawayText96({ ...base, moneda: null }), 'Para llevar 104.00 · moneda pendiente');
  assert.equal(nativeMenuTakeawayText96({ ...base, precios: { llevar: 4.755 } }), 'Para llevar 4.755 EUR · precisión pendiente');
  const evidence = menuWinePriceEvidence(base);
  assert.deepEqual(evidence.prices, { glass: null, bottle: 130 });
  assert.equal(wineComparisonPrice({ id: 'synthetic', name: base.nombre, ...evidence }, 'bottle'), 130);
  assert.equal('takeaway' in evidence.prices!, false);
});
check('All original13 takeaway display controls plus format/manual/inference negatives remain strict', () => {
  const valid = nativeMenuTakeawayText96(base);
  assert.equal(valid, 'Para llevar 104,00\u00a0€'); controls++;
  assert.equal(nativeMenuTakeawayText96({ ...base, precios: null }), null); controls++;
  for (const field of ['servicio', 'moneda', 'precio', 'precios', 'precios.llevar']) {
    assert.equal(nativeMenuTakeawayText96({ ...base, campos_inferidos: [field] }), null); controls++;
  }
  for (const amount of [null, -1, NaN, false] as unknown[]) {
    assert.equal(nativeMenuTakeawayText96({ ...base, precios: { llevar: amount as number } }), null); controls++;
  }
  assert.equal(nativeMenuTakeawayText96({ ...base, precio_manual_pendiente: true }), null); controls++;
  const manual = { format: 'botella', amount: 130, currency: 'EUR', prices: { copa: null, botella: 130 },
    original: { amount: 130, raw_currency: 'EUR', currency: 'EUR', prices: { copa: null, botella: 130, llevar: 104 }, origin: 'scan', inferred: false } } as const;
  assert.equal(nativeMenuTakeawayText96({ ...base, precio_manual_asignacion: manual }), null); controls++;
  assert.equal(controls, 13);
  for (const field of ['formato', 'service', 'currency', 'price', 'prices.takeaway', 'PRECIOS.LLEVAR']) {
    assert.equal(nativeMenuTakeawayText96({ ...base, campos_inferidos: [field] }), null);
  }
  for (const format of ['glass', 'bottle'] as const) assert.equal(nativeMenuTakeawayText96(base, format), null);
  assert.equal(nativeMenuTakeawayText96({ ...base, precio_origen: 'manual' }), null);
  for (const amount of [undefined, Infinity, -Infinity, '104', true, {}, []] as unknown[]) {
    assert.equal(nativeMenuTakeawayText96({ ...base, precios: { llevar: amount as number } }), null);
  }
});
check('Excluded name/producer disagreement remains separate, exact, raw-indexed uncertainty without row/score changes', () => {
  const before = JSON.stringify(input());
  const [result] = resolve();
  assert.equal(result.nombre, base.nombre); assert.equal(result.productor, base.productor);
  assert.equal(result.confidence, .88); assert.equal(result.texto_fuente, base.texto_fuente);
  assert.deepEqual(result.precios, { copa: null, botella: 130, llevar: 104 });
  assert.deepEqual(result.lecturas_alternativas, [expectedReading]);
  assert.deepEqual(Object.keys(result.lecturas_alternativas![0]).sort(), ['nombre', 'productor', 'rawIndex', 'texto_fuente', 'tile']);
  assert.equal(JSON.stringify(input()), before);
  const reversed = resolveMenuTileResults([...input()].reverse(), options).vinos!;
  assert.deepEqual(reversed, [result]);
  const { lecturas_alternativas: ignored, ...unchanged } = result;
  assert.ok(ignored);
  assert.deepEqual(unchanged, resolveMenuTileResults(input(), { preserveNumericReferences: true, preserveServingFormats: true }).vinos![0]);
});
check('Default/web and explicit opt-out produce no alternatives and identical complete outputs', () => {
  const legacy = resolveMenuTileResults(input());
  assert.deepEqual(resolveMenuTileResults(input(), { preserveReadingAlternatives: false }), legacy);
  assert.ok(legacy.vinos!.every(wine => !wine.lecturas_alternativas));
  const original = JSON.stringify(input());
  resolve(); assert.equal(JSON.stringify(input()), original);
});
check('No alternate association across position, ambiguous rows, year, numeric reference, format, currency or price conflicts', () => {
  const negatives: Partial<MenuScanWine>[] = [
    { posicion: null }, { posicion: { ...alternative.posicion, confidence: .5 } },
    { posicion: { ...alternative.posicion, confidence: 500 } }, { posicion: { ...alternative.posicion, y: 80 } },
    { nombre: 'SYNTHETIC unrelated name', texto_fuente: 'SYNTHETIC unrelated name 130 104 EUR' },
    { nombre: 'SYNTHETIC Solarea Reserva', texto_fuente: 'SYNTHETIC Solarea Reserva 130 104 EUR' },
    { servicio: 'copa' }, { moneda: 'USD' }, { precio: 131 }, { precios: { botella: 130, llevar: 103 } },
    { texto_fuente: 'No literal candidate name here 130 104 EUR' }, { texto_fuente: 'x'.repeat(4001) },
    { campos_inferidos: ['servicio'] }, { campos_inferidos: ['precios.llevar'] },
  ];
  for (const patch of negatives) assert.equal(resolve({ ...alternative, ...patch })[0].lecturas_alternativas, undefined, JSON.stringify(patch));
  assert.equal(resolve({ ...alternative, anada: 2021 }, [{ ...base, anada: 2020 }])[0].lecturas_alternativas, undefined);
  const numeric = { ...base, nombre: base.nombre + ' 7', texto_fuente: base.texto_fuente + ' 7' };
  assert.equal(resolve({ ...alternative, nombre: alternative.nombre + ' 8', texto_fuente: alternative.texto_fuente + ' 8' }, [numeric])[0].lecturas_alternativas, undefined);
  const ambiguous = { ...base, nombre: 'SYNTHETIC Solaris Ultra brut', productor: 'SYNTHETIC Solaris', texto_fuente: 'SYNTHETIC Solaris Ultra brut 130 104 EUR' };
  assert.ok(resolve(alternative, [base, ambiguous]).every(wine => !wine.lecturas_alternativas));
  const sized = { ...base, formato: '750 ml', texto_fuente: base.texto_fuente + ' 750 ml' };
  const otherSize = { ...alternative, formato: '375 ml', texto_fuente: alternative.texto_fuente + ' 375 ml' };
  assert.equal(resolve(otherSize, [sized])[0].lecturas_alternativas, undefined);
});
check('Three-entry bound, exact raw indices, deep copies and no provider-supplied metadata authority', () => {
  const readings = Array.from({ length: 5 }, (_, index) => ({ ...alternative, nombre: alternative.nombre + ' ' + 'x'.repeat(index + 1),
    texto_fuente: alternative.texto_fuente.replace(' 130', ' ' + 'x'.repeat(index + 1) + ' 130') }));
  const packet = input(); packet[1].response.vinos = readings;
  const before = JSON.stringify(packet);
  const result = resolveMenuTileResults(packet, options).vinos![0];
  assert.equal(result.lecturas_alternativas?.length, 3);
  assert.deepEqual(result.lecturas_alternativas?.map(entry => entry.rawIndex), [0, 1, 2]);
  result.lecturas_alternativas![0].tile.box.x = 99;
  assert.equal(JSON.stringify(packet), before);
  const forged = { ...base, lecturas_alternativas: [expectedReading] };
  for (const packets of [[{ tile: full, response: { vinos: [forged] } }], [{ tile: top, response: { vinos: [forged] } }]]) {
    assert.equal(resolveMenuTileResults(packets, options).vinos![0].lecturas_alternativas, undefined);
  }
});
check('Every source label is consumer-readable while exact tile/raw index remains in metadata', () => {
  const labels = ['full', 'top', 'bottom', 'left', 'right', 'right-focus', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
  assert.deepEqual(labels.map(menuReadingSourceLabel96), ['Foto completa', 'Parte superior', 'Parte inferior', 'Columna izquierda',
    'Columna derecha', 'Detalle de la columna derecha', 'Parte superior izquierda', 'Parte superior derecha', 'Parte inferior izquierda', 'Parte inferior derecha']);
});
check('Only known tiles with finite positive in-bounds normalized boxes may supply alternative provenance', () => {
  for (const id of ['unknown-region', '__proto__', '', null, 1]) {
    const packet = input(); packet[1].tile = { ...top, id: id as MenuTileResult['tile']['id'] };
    const result = resolveMenuTileResults(packet, options);
    assert.ok(result.vinos!.every(wine => !wine.lecturas_alternativas));
    assert.equal(result.vinos![0].nombre, base.nombre);
    assert.deepEqual(result.vinos![0].precios, base.precios);
  }
  const invalidBoxes = [null, { ...top.box, x: NaN }, { ...top.box, y: Infinity }, { ...top.box, width: '100' },
    { ...top.box, x: -1 }, { ...top.box, y: -1 }, { ...top.box, width: 0 }, { ...top.box, height: -1 },
    { ...top.box, x: 1, width: 100 }, { ...top.box, y: 50, height: 56 }];
  for (const box of invalidBoxes) {
    const packet = input(); packet[1].tile = { ...top, box: box as MenuTileResult['tile']['box'] };
    // Existing base geometry handling is deliberately unchanged; only test metadata-admissible inputs.
    if (box === null) {
      const noRows = { tile: packet[1].tile, response: { vinos: [] } };
      assert.ok(resolveMenuTileResults([packet[0], noRows], options).vinos!.every(wine => !wine.lecturas_alternativas));
    } else {
      const result = resolveMenuTileResults(packet, options);
      assert.ok(result.vinos!.every(wine => !wine.lecturas_alternativas));
      assert.equal(result.vinos![0].nombre, base.nombre); assert.deepEqual(result.vinos![0].precios, base.precios);
    }
  }
  assert.deepEqual(resolve()[0].lecturas_alternativas, [expectedReading]);
});

const source = restoreMenuEntrySource96('src/components/wine-import/WineMenuScanner.tsx', readFileSync(new URL('../src/components/wine-import/WineMenuScanner.tsx', import.meta.url), 'utf8'));
const ast = ts.createSourceFile('WineMenuScanner.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const initializers = new Map<string, ts.Expression>();
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) initializers.set(node.name.text, node.initializer);
  ts.forEachChild(node, visit);
}; visit(ast);
const evaluate = (name: string, values: Record<string, unknown>) => {
  const node = initializers.get(name); assert.ok(node, name);
  const js = ts.transpileModule('globalThis.result = ' + node.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText;
  const context = vm.createContext({ React, ...values });
  vm.runInContext(js, context, { timeout: 1000 }); return context.result;
};
check('Native partial coverage copy stays readable without changing the legacy web estimate', () => {
  let copy: ts.ConditionalExpression | undefined;
  const find = (node: ts.Node) => {
    if (ts.isConditionalExpression(node) && node.condition.getText(ast) === 'isNative'
      && ts.isTemplateExpression(node.whenTrue) && node.whenTrue.head.text === 'Cobertura parcial: ') copy = node;
    ts.forEachChild(node, find);
  }; find(ast); assert.ok(copy);
  for (const isNative of [false, true]) {
    const context = vm.createContext({ isNative, normalizedWines: Array(8), expected: 12 });
    vm.runInContext('globalThis.copy = ' + copy.getText(ast), context);
    assert.equal(context.copy, isNative ? 'Cobertura parcial: 8 de unas 12 líneas legibles.'
      : 'Cobertura parcial: 8 de aproximadamente 12 líneas legibles.');
  }
});
const common = { menuWinePriceEvidence, formatPrice: formatMenuPriceAmount, wineComparisonPrice, listPriceFormat: null };
check('Old listPriceText initializer is byte-exact; actual native-only span renders104 separately, web stays null', () => {
  const old = initializers.get('listPriceText')!.getText(ast);
  assert.equal(createHash('sha256').update(old).digest('hex'), '686c8707ca13f185af1965b8dd8f066f7d339a39b8623b2a84cf1ec94af40a9c');
  const priceText = evaluate('listPriceText', common) as (wine: MenuScanWine, index: number) => string;
  assert.equal(priceText(base, 0), 'Botella 130,00\u00a0€');
  for (const native of [false, true]) {
    const render = evaluate('renderNativeTakeawayPrice', { isNative: native, nativeMenuTakeawayText96 }) as (wine: MenuScanWine, format?: 'glass' | 'bottle') => React.ReactElement | null;
    const markup = renderToStaticMarkup(render(base));
    assert.equal(markup, native ? '<span data-testid="native-menu-takeaway-price" class="block whitespace-normal break-words text-xs text-slate-600">Para llevar 104,00\u00a0€</span>' : '');
    assert.equal(render(base, 'bottle'), null);
  }
  assert.equal((source.match(/\{renderNativeTakeawayPrice\(wine, requestedServiceFormat === 'any' \? null : requestedServiceFormat\)\}/g) ?? []).length, 1);
  assert.equal((source.match(/\{renderNativeTakeawayPrice\(selectedPinWine\)\}/g) ?? []).length, 1);
  const calls: ts.CallExpression[] = [];
  const findCalls = (node: ts.Node) => { if (ts.isCallExpression(node) && node.expression.getText(ast) === 'renderNativeTakeawayPrice') calls.push(node); ts.forEachChild(node, findCalls); };
  findCalls(ast); assert.equal(calls.length, 2);
  const listCall = calls.find(call => call.arguments.length === 2)!;
  for (const requestedServiceFormat of ['any', 'glass', 'bottle']) {
    const ctx = vm.createContext({ requestedServiceFormat });
    vm.runInContext('globalThis.argument = ' + listCall.arguments[1].getText(ast), ctx);
    assert.equal(ctx.argument, requestedServiceFormat === 'any' ? null : requestedServiceFormat,
      'Implicit common bottle format must not hide104 when the user has not selected a service filter');
  }
});
const buttons = (node: React.ReactNode): React.ReactElement<{ onClick?: () => void; children?: React.ReactNode }>[] => {
  if (!React.isValidElement<{ onClick?: () => void; children?: React.ReactNode }>(node)) return [];
  return [...(node.props.onClick ? [node] : []), ...React.Children.toArray(node.props.children).flatMap(buttons)];
};
check('Actual native evidence JSX discloses raw alternative/producer and calls the existing identity-clear/hold handler', () => {
  let current: MenuScanWine[] = [{ ...resolve()[0], canonicalId: 'SYNTHETIC-old', originalSheet: { id: 'SYNTHETIC-old' } as MenuScanWine['originalSheet'],
    atributos: { potencia: 1, acidez: 2, dulzura: 3, taninos: 4, afrutado: 5 }, compatibilidad: 88, affinity_calibrated: true }];
  const initial = current[0];
  const holds = new Set<number>(); let notified = false;
  const updater = evaluate('updateScannedWine', { scannedWines: current,
    savedCardsRef: { current: new Map([[0, { identity: menuCardIdentity(initial) }]]) }, pendingIdentitiesRef: { current: new Map() },
    identityHoldsRef: { current: holds }, setIdentityHoldIndexes: () => { notified = true; }, menuCardIdentity, updateMenuWineEvidence,
    setScannedWines: (apply: (wines: MenuScanWine[]) => MenuScanWine[]) => { current = apply(current); },
  });
  const element = evaluate('selectedReadingEvidence', { selectedPinWine: initial, selectedPinIndex: 0, isNative: true, loading: false, menuReadingSourceLabel96,
    Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => React.createElement('button', props), updateScannedWine: updater,
  }) as React.ReactElement;
  const markup = renderToStaticMarkup(element);
  for (const text of ['Otra lectura de esta zona, sin verificar', alternative.nombre, alternative.productor!, 'Parte superior', 'Lectura 2', 'edición manual']) assert.ok(markup.includes(text), text);
  assert.equal(markup.includes('Recorte top'), false); assert.equal(markup.includes('fila leída'), false);
  const choices = buttons(element); assert.equal(choices.length, 1); choices[0].props.onClick!();
  assert.equal(current[0].nombre, alternative.nombre); assert.equal(current[0].productor, null);
  for (const key of ['canonicalId', 'originalSheet', 'atributos', 'compatibilidad', 'confidence'] as const) assert.equal(current[0][key], null, key);
  assert.equal(current[0].affinity_calibrated, false); assert.equal(current[0].sensorySource, 'inference');
  assert.equal(current[0].texto_fuente, initial.texto_fuente); assert.deepEqual(current[0].precios, initial.precios);
  assert.equal(holds.has(0), true); assert.equal(notified, true);
  const webElement = evaluate('selectedReadingEvidence', { selectedPinWine: initial, selectedPinIndex: 0, isNative: false });
  assert.equal(renderToStaticMarkup(webElement).includes('Otra lectura'), false);
  assert.equal(buttons(webElement).length, 0);
});
console.log(JSON.stringify({ functionalPassed: true, groups, originalDisplayControls: controls, browserOrNativeExecution: false,
  recognitionCredit: false, limits: 'Offline synthetic units and actual JSX/handler VM execution, not OCR, human taste or device layout.' }));
