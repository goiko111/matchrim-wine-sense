import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { parseMenuPriceDraft, resolveMenuPriceReview, manualMenuPriceLines, clearMenuManualPriceOrigin } from '../src/utils/menuPriceReview';
import { menuWinePriceEvidence, updateMenuWineEvidence } from '../src/utils/scanWineEvidence';
import { menuPriceSnapshot, menuFinancialPrice, readMenuPrice, menuSaveEvidence, confirmsMenuInsert } from '../src/utils/menuWineSave';
import { wineComparisonPrice } from '../src/utils/wineComparison';
import type { MenuScanWine } from '../src/utils/wineMenuScan';
import { isMenuIdentityConfirmed } from '../src/utils/wineMenuScan';
import * as money from '../src/utils/scanMoney';
import * as mutation from '../src/utils/matchrimWineMutation';

const bankBytes = readFileSync('docs/qa-evidence/matchrim-menu-comparison-2026-10-12/after/response-provenance.json');
assert.equal(createHash('sha256').update(bankBytes).digest('hex'), 'f4f7fbbf6ce5d19868baf78ff3983f8ca585a7fb1a070ca2386175d308e19fe5');
const bank = JSON.parse(bankBytes.toString()).variants;
const bottle: MenuScanWine = bank.units.vinos[1];
const both: MenuScanWine = { ...bottle, precio: 25, servicio: 'ambos', precios: { copa: 12, botella: 25, llevar: null } };
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => {
  try { run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: String(error) }); }
};
for (const [text, expected] of [['0', 0], ['35,50', 35.5], ['35.50', 35.5], [' 12 ', 12], ['00012', 12], ['1000000000', 1e9]] as const) {
  check(`Strict draft accepts ${JSON.stringify(text)}`, () => assert.equal(parseMenuPriceDraft(text).amount, expected));
}
for (const text of ['', ' ', '-1', '+1', '1e3', 'Infinity', 'NaN', '1,2.3', '1.234', '1 000', '12,', '.5', '1000000001']) {
  check(`Strict draft rejects ${JSON.stringify(text)} without zero coercion`, () => { assert.equal(parseMenuPriceDraft(text).amount, null); assert.ok(parseMenuPriceDraft(text).error); });
}
const resolved = resolveMenuPriceReview(both, 35, 'botella', 'EUR');
check('Manual bottle keeps actual service and original cup', () => {
  assert.equal(resolved.servicio, 'ambos'); assert.equal(resolved.precios?.copa, 12); assert.equal(resolved.precios?.botella, 35);
  assert.equal(resolved.precio_manual_pendiente, false); assert.equal(resolved.precio_origen, 'manual');
  assert.equal(resolved.precio_manual_asignacion?.original.prices.botella, 25);
});
check('Manual review never mutates source object', () => { assert.equal(both.precios?.botella, 25); assert.equal(both.precio, 25); assert.equal(both.precio_manual_asignacion, undefined); });
check('Manual price leaves identity, confidence, attributes and affinity byte-equivalent', () => {
  for (const field of ['nombre', 'productor', 'anada', 'confidence', 'dudas', 'canonicalId', 'sensorySource', 'atributos', 'compatibilidad', 'affinity_calibrated', 'razon', 'texto_fuente'] as const) assert.deepEqual(resolved[field], both[field]);
});
check('Comparator receives unit prices, never unallocated generic scalar', () => {
  const evidence = { id: 'a', name: resolved.nombre, ...menuWinePriceEvidence(resolved) };
  assert.equal(evidence.price, null); assert.equal(evidence.service, 'both');
  assert.equal(wineComparisonPrice(evidence, 'glass'), 12); assert.equal(wineComparisonPrice(evidence, 'bottle'), 35);
  assert.equal(wineComparisonPrice(evidence, 'any'), null);
});
check('EUR to GBP removes unselected amount without FX and keeps original trace', () => {
  const changed = resolveMenuPriceReview(both, 35, 'botella', 'GBP');
  assert.deepEqual(changed.precios, { copa: null, botella: 35, llevar: null });
  assert.equal(changed.precio_manual_asignacion?.original.currency, 'EUR');
  assert.equal(changed.precio_manual_asignacion?.original.prices.copa, 12);
});
check('Two explicit manual formats preserve both without scan-source mislabelling', () => {
  const changed = resolveMenuPriceReview(resolved, 8, 'copa', 'EUR');
  assert.deepEqual(changed.precio_manual_asignacion?.prices, { copa: 8, botella: 35 });
  assert.equal(changed.precio_manual_asignacion?.original.prices.botella, 25);
  assert.deepEqual(manualMenuPriceLines(changed), ['Manual · Copa: 8,00\u00a0€', 'Manual · Botella: 35,00\u00a0€']);
});
check('Currency switch does not carry previous manual amounts as new currency', () => {
  const changed = resolveMenuPriceReview(resolved, 9, 'copa', 'GBP');
  assert.deepEqual(changed.precio_manual_asignacion?.prices, { copa: 9, botella: null });
  assert.equal(changed.precios?.botella, null);
});
for (const service of ['ambos', 'copa', 'botella', null] as const) {
  check(`Explicit bottle price does not upgrade service ${service}`, () => {
    const wine = resolveMenuPriceReview({ ...both, servicio: service }, 35, 'botella', 'EUR');
    assert.equal(wine.servicio, service);
    const expected = service === 'botella' ? 35 : null;
    assert.equal(menuFinancialPrice(menuPriceSnapshot(wine)), expected);
  });
}
for (const field of ['servicio', 'precios', 'precio', 'moneda']) {
  check(`Manual unit does not certify inferred ${field} or other price`, () => {
    const wine = resolveMenuPriceReview({ ...both, campos_inferidos: [field] }, 35, 'botella', 'EUR');
    const e = menuWinePriceEvidence(wine);
    assert.equal(e.prices?.bottle, 35); assert.equal(e.prices?.glass, null);
    if (field === 'servicio') assert.equal(e.service, null);
    assert.equal(menuFinancialPrice(menuPriceSnapshot(wine)), null);
  });
}
check('Manual price is not catalog evidence or preference learning', () => {
  const e = menuSaveEvidence(resolved, null); assert.equal(e.matchrim_affinity, null); assert.equal(e.sensory_attributes, null); assert.equal(e.use_for_profile_training, false);
});
for (const value of [0, 12, 35.5]) {
  check(`Snapshot JSON roundtrip preserves manual bottle ${value} and original trace`, () => {
    const wine = resolveMenuPriceReview(both, value, 'botella', 'EUR');
    const snapshot = JSON.parse(JSON.stringify(menuPriceSnapshot(wine)));
    const read = readMenuPrice({ source: 'menu_scanner', menu_price_snapshot: snapshot }, null)!;
    assert.equal(read.state, 'current'); assert.equal(read.price, null);
    assert.ok(read.lines.some((line) => line.startsWith('Manual · Botella:')));
    assert.ok(!read.lines.some((line) => /importe.*pendiente/i.test(line)));
  });
}
check('Foreign manual amount and original EUR remain visibly distinct', () => {
  const snapshot = menuPriceSnapshot(resolveMenuPriceReview(both, 35, 'botella', 'GBP'));
  const read = readMenuPrice({ source: 'menu_scanner', menu_price_snapshot: snapshot }, null)!;
  assert.ok(read.lines.some((line) => /Manual.*(?:£|GBP)/.test(line))); assert.ok(read.lines.some((line) => /Lectura anterior.*€/.test(line)));
  assert.ok(!read.lines.some((line) => /Copa.*(?:£|GBP)/.test(line)));
});
for (const change of [
  { amount: 36 }, { currency: 'GBP' }, { format: 'copa' }, { prices: { copa: null, botella: 36 } },
  { original: { amount: 25, raw_currency: 'EUR', currency: 'GBP', prices: { copa: 12, botella: 25, llevar: null }, origin: 'scan', inferred: false } },
]) {
  check(`Malformed manual contract abstains: ${JSON.stringify(change)}`, () => {
    const snapshot = menuPriceSnapshot(resolved);
    const read = readMenuPrice({ source: 'menu_scanner', menu_price_snapshot: { ...snapshot, manual_assignment: { ...snapshot.manual_assignment, ...change } } }, null)!;
    assert.equal(read.state, 'legacy'); assert.equal(read.price, null);
  });
}
check('Generic legacy price update invalidates explicit manual assignment', () => {
  assert.equal(updateMenuWineEvidence(resolved, { precio: 40 }).precio_manual_asignacion, undefined);
});
check('Generic legacy currency update invalidates explicit manual assignment', () => {
  assert.equal(updateMenuWineEvidence(resolved, { moneda: 'GBP' }).precio_manual_asignacion, undefined);
});
check('Read cup availability cannot certify manually assigned bottle availability', () => {
  const wine = resolveMenuPriceReview({ ...both, servicio: 'copa' }, 35, 'botella', 'EUR');
  const read = readMenuPrice({ source: 'menu_scanner', menu_price_snapshot: menuPriceSnapshot(wine) }, null)!;
  assert.equal(read.state, 'pending'); assert.ok(read.lines.some((line) => /Disponibilidad.*pendiente/.test(line)));
});
check('A prior known legacy manual price retains manual provenance on the other unit', () => {
  const old = updateMenuWineEvidence(bottle, { precio: 35 });
  const wine = resolveMenuPriceReview(old, 8, 'copa', 'EUR');
  assert.deepEqual(wine.precio_manual_asignacion?.prices, { copa: 8, botella: 35 });
});
for (const amount of [NaN, Infinity, -1, 1_000_000_001, '35', null]) {
  check('Invalid direct manual input rejects before state update: ' + String(amount), () => assert.throws(() => resolveMenuPriceReview(both, amount as number, 'botella', 'EUR')));
}
check('Provider cannot self-certify a manual price origin', () => {
  const reading = clearMenuManualPriceOrigin(resolved);
  assert.equal(reading.precio_manual_asignacion, undefined); assert.equal(reading.precio_origen, undefined);
  assert.equal(reading.precio_manual_pendiente, undefined); assert.equal(reading.servicio, 'ambos');
  assert.equal(resolved.precio_manual_asignacion?.format, 'botella');
});
check('Identity edit still invalidates affinity instead of borrowing price confidence', () => {
  const changed = updateMenuWineEvidence(resolved, { nombre: 'Unconfirmed edit' });
  assert.equal(changed.compatibilidad, null); assert.equal(changed.confidence, null);
});
check('Legacy snapshot output remains additive only when explicit review exists', () => assert.equal(Object.hasOwn(menuPriceSnapshot(both), 'manual_assignment'), false));
check('Insert receipt rejects stripped manual metadata', () => {
  const snapshot = menuPriceSnapshot(resolved);
  const payload = { user_id: 'qa-owner', name: resolved.nombre, producer: resolved.productor, vintage: resolved.anada,
    status: 'wishlist', is_favorite: false, price: null, sensory_attributes: null, matchrim_affinity: null, use_for_profile_training: false,
    place_details: { source: 'menu_scanner', menu_price_snapshot: snapshot, menu_wine_evidence: {} } };
  const row = { id: 'qa-row', ...payload, rating: null };
  assert.equal(confirmsMenuInsert(row, payload), true);
  const stripped = structuredClone(row); delete stripped.place_details.menu_price_snapshot.manual_assignment;
  assert.equal(confirmsMenuInsert(stripped, payload), false);
});
const baseline = '3e75f30abc79c6262f96b06515437aec1e728a90';
const oldSource = execFileSync('git', ['show', baseline + ':src/utils/menuWineSave.ts'], { encoding: 'utf8' });
const exported: Record<string, (...args: unknown[]) => unknown> = {};
const nodeRequire = createRequire(import.meta.url);
const sandbox = vm.createContext({ exports: exported, module: { exports: exported }, require: (id: string) => {
  if (id === 'zod') return nodeRequire('zod');
  if (id === './wineMenuScan') return { isMenuIdentityConfirmed };
  if (id === './scanMoney') return money;
  if (id === './matchrimWineMutation') return mutation;
  throw Error('Unexpected legacy import ' + id);
} });
vm.runInContext(ts.transpileModule(oldSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
const legacyWines: MenuScanWine[] = Object.values(bank).flatMap((value) => (value as { vinos?: MenuScanWine[] }).vinos ?? []);
const recorded = JSON.parse(readFileSync('qa/fixtures/menu-food-evidence-oct8.json', 'utf8'));
legacyWines.push(...recorded.cases.flatMap((scene: { calls: Array<{ payload: { vinos?: MenuScanWine[] } }> }) => scene.calls.flatMap((call) => call.payload.vinos ?? [])));
for (const [index, wine] of legacyWines.entries()) {
  check(`Legacy snapshot and reader parity ${index}`, () => {
    const before = exported.menuPriceSnapshot(wine), after = menuPriceSnapshot(wine);
    assert.equal(JSON.stringify(after), JSON.stringify(before));
    const expected = menuFinancialPrice(after);
    assert.equal(expected, exported.menuFinancialPrice(before));
    for (const price of [expected, null, 35]) {
      const details = { source: 'menu_scanner', menu_price_snapshot: after };
      assert.equal(JSON.stringify(readMenuPrice(details, price)), JSON.stringify(exported.readMenuPrice(details, price)));
    }
  });
}
const activePath = 'src/components/wine-import/WineMenuScanner.tsx';
const initializers = (source: string) => {
  const tree = ts.createSourceFile(activePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result = new Map<string, string>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) result.set(node.name.text, node.initializer.getText(tree));
    ts.forEachChild(node, visit);
  };
  visit(tree); return result;
};
const activeBefore = initializers(execFileSync('git', ['show', baseline + ':' + activePath], { encoding: 'utf8' }));
const activeAfter = initializers(readFileSync(activePath, 'utf8'));
for (const name of ['saveScannedWine', 'updateScannedWine', 'resetSaveBatch', 'normalizeScannedWine', 'getWineDecision', 'getSimilarWines', 'menuDecision', 'retryScanProfile']) {
  check('Protected price-lane initializer unchanged: ' + name, () => assert.equal(activeAfter.get(name), activeBefore.get(name)));
}
for (const path of ['src/utils/wineComparison.ts', 'src/components/AffinityExplanation.tsx', 'src/components/wine-import/WineComparisonWorkspace.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx', 'src/utils/multiWineScan.ts', 'src/utils/wineAffinityExplanation.ts', 'src/utils/menuWineActions.ts', 'src/utils/imageAnalysis.ts', 'src/integrations/supabase/client.ts', 'src/integrations/supabase/types.ts', 'supabase/functions/search-wines/index.ts']) {
  check('Protected independent source unchanged: ' + path, () => assert.equal(readFileSync(path, 'utf8'), execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' })));
}
const result = { scope: 'Synthetic price/provenance contracts; not human preference or wine recognition', checks, passed: checks.every((c) => c.passed) };
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n');
for (const c of checks.filter((c) => !c.passed)) console.error(c.name, c.error);
console.log(`${checks.filter((c) => c.passed).length}/${checks.length} menu price resolution checks`);
if (!result.passed) process.exitCode = 1;
