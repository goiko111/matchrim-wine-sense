import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isMenuCurrencyAmountValid, parseMenuPriceDraft, resolveMenuPriceReview, formatMenuPriceAmount } from '../src/utils/menuPriceReview';
import { menuWinePriceEvidence } from '../src/utils/scanWineEvidence';
import { menuPriceSnapshot, menuFinancialPrice, readMenuPrice } from '../src/utils/menuWineSave';
import type { MenuScanWine } from '../src/utils/wineMenuScan';
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
const bottle: MenuScanWine = JSON.parse(readFileSync('docs/qa-evidence/matchrim-menu-comparison-2026-10-12/after/response-provenance.json', 'utf8')).variants.units.vinos[1];
for (const code of ['EUR', 'GBP', 'USD', 'CHF', 'CAD', 'AUD', 'NZD', 'JPY', 'CNY', 'SEK', 'NOK', 'DKK']) {
  for (const value of [0, 1, 125, 999999999, 1000000000]) check(`Integer ${value} valid for ${code}`, () => assert.equal(isMenuCurrencyAmountValid(value, code), true));
  for (const value of [0.01, 0.29, 1.01, 1.25, 999999999.99]) check(`Fractional ${value} currency-aware for ${code}`, () => assert.equal(isMenuCurrencyAmountValid(value, code), code !== 'JPY'));
  check(`Too many minor units reject for ${code}`, () => assert.equal(isMenuCurrencyAmountValid(1.234, code), false));
  check(`Manual amount explicitly retains ${code} without FX`, () => {
    const wine = resolveMenuPriceReview(bottle, 125, 'botella', code);
    assert.equal(wine.precio, 125); assert.equal(wine.moneda, code); assert.equal(wine.precio_manual_asignacion?.original.currency, 'EUR');
  });
}
for (const code of ['JPY', 'EUR']) for (const value of [null, undefined, '1', NaN, Infinity, -1, 1000000001]) check(`Invalid value ${String(value)} rejects for ${code}`, () => assert.equal(isMenuCurrencyAmountValid(value, code), false));
check('Unknown currency is not EUR', () => { assert.equal(isMenuCurrencyAmountValid(1.25, null), false); assert.equal(isMenuCurrencyAmountValid(1.25, 'XXX'), false); });
check('Large extra fractions are not mistaken for floating-point noise', () => assert.equal(isMenuCurrencyAmountValid(999999999.9999999, 'EUR'), false));
check('Arithmetic residue is pending, not silently rounded', () => assert.equal(isMenuCurrencyAmountValid(0.1 + 0.2, 'EUR'), false));
check('Decimal draft is preserved but rejected for JPY', () => { assert.equal(parseMenuPriceDraft('1,25', 'JPY').amount, null); assert.match(parseMenuPriceDraft('1,25', 'JPY').error!, /entero/); });
check('JPY zero-only fraction has exact integer value', () => assert.equal(parseMenuPriceDraft('125,00', 'JPY').amount, 125));
check('Unknown draft currency can wait for explicit selection', () => assert.equal(parseMenuPriceDraft('1,25', null).amount, 1.25));
check('Direct fractional JPY cannot bypass UI', () => assert.throws(() => resolveMenuPriceReview(bottle, 1.25, 'botella', 'JPY')));
for (const [code, amount] of [['JPY', 1.25], ['EUR', 1.234]] as const) {
  check(`Invalid ${code} precision displayed exactly, not rounded`, () => {
    const text = formatMenuPriceAmount(amount, code)!; assert.ok(text.includes(String(amount))); assert.ok(text.includes('pendiente'));
  });
  const wine = { ...bottle, moneda: code, precio: amount, precios: { botella: amount, copa: null, llevar: null } };
  check(`Invalid ${code} price excluded from comparator`, () => {
    const evidence = menuWinePriceEvidence(wine); assert.equal(evidence.price, null); assert.equal(evidence.prices?.bottle, null);
  });
  check(`Invalid ${code} legacy snapshot cannot certify finance or readback`, () => {
    const snapshot = menuPriceSnapshot(wine); assert.equal(menuFinancialPrice(snapshot), null);
    const read = readMenuPrice({ source: 'menu_scanner', menu_price_snapshot: snapshot }, null)!;
    assert.equal(read.price, null); assert.equal(read.state, 'pending'); assert.ok(read.lines.some(line => line.includes(String(amount)) && line.includes('pendiente')));
  });
}
check('One invalid service price does not erase valid other unit', () => {
  const e = menuWinePriceEvidence({ ...bottle, servicio: 'ambos', precio: null, precios: { copa: 1.234, botella: 25 } });
  assert.equal(e.prices?.glass, null); assert.equal(e.prices?.bottle, 25);
});
check('Tampered fractional manual JPY is not accepted as a verified snapshot', () => {
  const snapshot = menuPriceSnapshot(resolveMenuPriceReview(bottle, 125, 'botella', 'JPY'));
  snapshot.raw_amount = 1.25; snapshot.prices.botella = 1.25; snapshot.manual_assignment!.amount = 1.25; snapshot.manual_assignment!.prices.botella = 1.25;
  assert.equal(readMenuPrice({ source: 'menu_scanner', menu_price_snapshot: snapshot }, null)!.state, 'legacy');
});
for (const path of ['src/utils/menuWineSimilarity.ts', 'src/utils/wineAffinityExplanation.ts', 'src/utils/wineComparison.ts', 'src/components/wine-import/WineComparisonWorkspace.tsx', 'src/utils/menuWineActions.ts', 'src/components/wine-import/MultiWineLabelScanner.tsx', 'supabase/functions/search-wines/index.ts']) check('Unrelated intelligence/lifecycle source unchanged: ' + path, () => assert.equal(readFileSync(path, 'utf8'), execFileSync('git', ['show', '5b789a75ed636cb224d5f33dd4f4a1da7f9cc919:' + path], { encoding: 'utf8' })));
const result = { scope: 'Synthetic monetary precision only; no FX, recognition, humans or hosted data', checks, allPassed: checks.every(row => row.passed) };
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n');
for (const row of checks.filter(row => !row.passed)) console.error(row.name, row.error);
console.log(`${checks.filter(row => row.passed).length}/${checks.length} currency precision checks`);
if (!result.allPassed) process.exitCode = 1;
