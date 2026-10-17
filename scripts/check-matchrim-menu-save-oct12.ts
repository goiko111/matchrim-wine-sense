import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { optionalScanNumber } from '../supabase/functions/_shared/matchrim-scan-values';
import { normalizeWineAttributesForInsight } from '../src/utils/wineAffinityExplanation';
import { readCellarSensoryEvidence } from '../src/utils/bodegaAffinity';
import { confirmsMenuInsert, hasStoredMenuCatalogEvidence, menuFinancialPrice, menuPriceSnapshot, menuSaveEvidence, readMenuPrice } from '../src/utils/menuWineSave';
import { updateMenuWineEvidence } from '../src/utils/scanWineEvidence';
import type { MenuScanWine } from '../src/utils/wineMenuScan';
import type { Json } from '../src/integrations/supabase/types';

const bankPath = 'docs/qa-evidence/matchrim-menu-comparison-2026-10-12/after/response-provenance.json';
const bankBytes = readFileSync(bankPath);
assert.equal(createHash('sha256').update(bankBytes).digest('hex'), 'f4f7fbbf6ce5d19868baf78ff3983f8ca585a7fb1a070ca2386175d308e19fe5');
const bank = JSON.parse(bankBytes.toString()).variants;
const bottle: MenuScanWine = bank.units.vinos[1];
const cup: MenuScanWine = bank.units.vinos[0];
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => {
  try { run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: String(error) }); }
};

const both: MenuScanWine = { ...bottle, servicio: 'ambos', precios: { copa: 25, botella: 25, llevar: null } };
const edited = updateMenuWineEvidence(both, { precio: 35 });
const pending = menuPriceSnapshot(edited);
check('Manual35 remains pending and never reassigns read25 to both services', () => {
  assert.equal(pending.raw_amount, 35); assert.equal(pending.manual_pending, true);
  assert.equal(pending.origin, 'manual'); assert.deepEqual(pending.prices, { copa: 25, botella: 25, llevar: null });
  assert.equal(menuFinancialPrice(pending), null);
});
check('Explicit EUR bottle25 is eligible, without treating it as purchase', () => assert.equal(menuFinancialPrice(menuPriceSnapshot(bottle)), 25));
check('Known manual bottle updates only bottle amount and keeps manual provenance', () => {
  const snapshot = menuPriceSnapshot(updateMenuWineEvidence(bottle, { precio: 35 }));
  assert.equal(snapshot.origin, 'manual'); assert.equal(snapshot.manual_pending, false);
  assert.equal(snapshot.prices.botella, 35); assert.equal(snapshot.prices.copa, null); assert.equal(menuFinancialPrice(snapshot), 35);
});
check('Known manual cup never becomes bottle scalar', () => {
  const snapshot = menuPriceSnapshot(updateMenuWineEvidence(cup, { precio: 15 }));
  assert.equal(snapshot.prices.copa, 15); assert.equal(snapshot.prices.botella, null);
  assert.equal(snapshot.manual_pending, false); assert.equal(menuFinancialPrice(snapshot), null);
});
check('EUR copa is not a financial bottle amount', () => assert.equal(menuFinancialPrice(menuPriceSnapshot(cup)), null));
check('GBP bottle does not convert into EUR', () => assert.equal(menuFinancialPrice(menuPriceSnapshot(bank.currencies.vinos[2])), null));
check('Unknown currency is not implicitly EUR', () => assert.equal(menuFinancialPrice(menuPriceSnapshot({ ...bottle, moneda: null })), null));
check('Unsupported raw currency is retained but not financial', () => {
  const snapshot = menuPriceSnapshot({ ...bottle, moneda: 'XXX' });
  assert.equal(snapshot.raw_currency, 'XXX'); assert.equal(snapshot.currency, null); assert.equal(menuFinancialPrice(snapshot), null);
});
check('Missing price remains null, not zero', () => assert.equal(menuFinancialPrice(menuPriceSnapshot({ ...bottle, precio: null, precios: null })), null));
check('An explicitly read zero differs from missing data', () => assert.equal(menuFinancialPrice(menuPriceSnapshot({ ...bottle, precio: 0, precios: { botella: 0 } })), 0));
for (const field of ['servicio', 'precio', 'precios', 'moneda', 'nombre', 'productor']) {
  check(`${field} inference cannot become a financial scalar`, () => assert.equal(menuFinancialPrice(menuPriceSnapshot({ ...bottle, campos_inferidos: [field] })), null));
}
check('Conflicting generic and bottle amounts abstain', () => assert.equal(menuFinancialPrice(menuPriceSnapshot({ ...bottle, precio: 35 })), null));
check('Negative amount is not a valid scalar', () => assert.equal(menuFinancialPrice(menuPriceSnapshot({ ...bottle, precio: -1, precios: null })), null));
check('Unknown identity keeps attachment pending', () => assert.equal(menuFinancialPrice(menuPriceSnapshot({ ...bottle, confidence: null })), null));

const evidence = menuSaveEvidence(bottle, bottle.atributos as Json);
check('Model affinity and attributes cannot self-certify catalog evidence', () => {
  assert.equal(evidence.matchrim_affinity, null); assert.equal(evidence.sensory_attributes, null);
  assert.equal(evidence.use_for_profile_training, false); assert.equal(evidence.trace.canonical_id, null);
});
check('Catalog marker without sensory sheet still abstains', () => {
  const missing = menuSaveEvidence({ ...bottle, sensorySource: 'catalog' }, null);
  assert.equal(missing.matchrim_affinity, null); assert.equal(missing.sensory_attributes, null);
});
const details = { source: 'menu_scanner', scanned_price: 35, scanned_currency: 'EUR', menu_price_snapshot: pending, menu_wine_evidence: evidence.trace };
check('JSON round-trip preserves per-service prices/pending/raw amount', () => {
  const read = readMenuPrice(JSON.parse(JSON.stringify(details)), null)!;
  assert.equal(read.price, null); assert.equal(read.state, 'pending');
  assert.ok(read.lines.some((line) => /35/.test(line) && /Manual/.test(line)));
  assert.ok(read.lines.some((line) => /Copa/.test(line) && /25/.test(line)));
  assert.ok(read.lines.some((line) => /Botella/.test(line) && /25/.test(line)));
});
check('Tampered scalar35 is masked and visibly incoherent', () => {
  const read = readMenuPrice(details, 35)!;
  assert.equal(read.price, null); assert.ok(read.lines.some((line) => /incoherente/.test(line)));
});
check('Legacy source lacking unit/provenance never restores scalar35', () => {
  const read = readMenuPrice({ source: 'menu_scanner', scanned_price: 35, scanned_currency: 'EUR' }, 35)!;
  assert.equal(read.state, 'legacy'); assert.equal(read.price, null);
  assert.ok(read.lines.some((line) => /pendientes/.test(line)));
});
check('Non-menu purchase metadata remains outside this adapter', () => assert.equal(readMenuPrice({ source: 'manual', price: 35 }, 35), null));
check('Single-unit amount is not repeated in reader', () => assert.equal(readMenuPrice({ source: 'menu_scanner', menu_price_snapshot: menuPriceSnapshot(bottle) }, 25)!.lines.length, 1));
check('Unallocated both-format generic reading remains pending', () => assert.equal(readMenuPrice({ source: 'menu_scanner', menu_price_snapshot: menuPriceSnapshot(both) }, null)!.state, 'pending'));
for (const [label, changes] of [
  ['version', { version: 2 }], ['null-as-zero', { raw_amount: '0' }], ['unknown-unit', { service: 'large-glass' }],
  ['currency-mismatch', { currency: 'GBP' }], ['pending-type', { manual_pending: 'false' }],
  ['missing-per-service', { prices: null }], ['NaN-price', { raw_amount: NaN }],
] as Array<[string, Record<string, unknown>]>) {
  check(`Malformed ${label} snapshot cannot promote finance`, () => {
    const read = readMenuPrice({ ...details, menu_price_snapshot: { ...pending, ...changes } }, 35)!;
    assert.equal(read.price, null); assert.equal(read.state, 'legacy');
  });
}
check('No unknown/legacy trace becomes verified catalog', () => {
  assert.equal(hasStoredMenuCatalogEvidence(details), false);
  assert.equal(hasStoredMenuCatalogEvidence({ source: 'menu_scanner' }), false);
  assert.equal(hasStoredMenuCatalogEvidence({ menu_wine_evidence: { version: 1, sensory_source: 'inference', canonical_id: 'model-claim', identity_confirmed: true } }), false);
});

const payload = {
  user_id: '00000000-0000-4000-8000-000000000080', name: bottle.nombre,
  producer: bottle.productor, vintage: bottle.anada, status: 'wishlist', is_favorite: false,
  price: null, sensory_attributes: null, matchrim_affinity: null, use_for_profile_training: false,
  place_details: details,
};
const row = { id: '10000000-0000-4000-8000-000000000001', ...payload };
check('Insert representation is confirmed only with matching identity/owner/provenance', () => assert.equal(confirmsMenuInsert(row, payload), true));
check('JSONB key order does not cause false rejection', () => {
  const reversed = (value: unknown): unknown => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reversed(child)])) : value;
  assert.equal(confirmsMenuInsert(reversed(row), payload), true);
});
for (const [label, changes] of [
  ['owner', { user_id: 'another-owner' }], ['identity', { producer: null }], ['scalar', { price: 35 }],
  ['training', { use_for_profile_training: true }], ['model-score', { matchrim_affinity: 71 }],
  ['missing-snapshot', { place_details: { source: 'menu_scanner' } }],
  ['lost-pending', { place_details: { ...details, menu_price_snapshot: { ...pending, manual_pending: false } } }],
] as Array<[string, Record<string, unknown>]>) {
  check(`Mismatched ${label} readback is not a save receipt`, () => assert.equal(confirmsMenuInsert({ ...row, ...changes }, payload), false));
}
check('Empty/array representation does not certify save', () => {
  assert.equal(confirmsMenuInsert(null, payload), false); assert.equal(confirmsMenuInsert([row], payload), false);
});
const readerPath = 'src/pages/MyWines.tsx';
const readerSource = readFileSync(readerPath, 'utf8');
const readerTree = ts.createSourceFile(readerPath, readerSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const initializers = new Map<string, ts.Expression>();
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) initializers.set(node.name.text, node.initializer);
  ts.forEachChild(node, visit);
};
visit(readerTree);
let nativeReader = false;
const context = vm.createContext({ readMenuPrice, hasStoredMenuCatalogEvidence, optionalScanNumber,
  normalizeWineAttributesForInsight, readCellarSensoryEvidence,
  Capacitor: { isNativePlatform: () => nativeReader } });
for (const name of ['normalizeAttributeTo5', 'normalizeSensoryAttributesTo5', 'normalizeAffinity', 'normalizeUserWine']) {
  const init = initializers.get(name);
  assert.ok(init);
  vm.runInContext(ts.transpileModule(`globalThis.${name} = ${init.getText(readerTree)};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
}
const normalizeReader = context.normalizeUserWine as (row: Record<string, unknown>) => Record<string, unknown>;
check('Active Bodega legacy reader masks model ficha, score and training', () => {
  const read = normalizeReader({ ...row, rating: null, sensory_attributes: bottle.atributos, matchrim_affinity: bottle.compatibilidad, use_for_profile_training: true,
    place_details: { source: 'menu_scanner', scanned_price: 35, scanned_currency: 'EUR' }, price: 35 });
  assert.equal(read.price, null); assert.equal(read.sensory_attributes, null);
  assert.equal(read.matchrim_affinity, null); assert.equal(read.use_for_profile_training, false);
});
check('Active Bodega keeps original inconsistency warning after masking scalar', () => {
  const read = normalizeReader({ ...row, rating: null, price: 35 });
  assert.equal(read.price, null);
  assert.ok((read.menu_price_view as { lines: string[] }).lines.some((line) => /incoherente/.test(line)));
});
check('Active Bodega leaves non-menu monetary amounts unchanged', () => assert.equal(normalizeReader({ ...row, place_details: { source: 'manual' }, price: 35 }).price, 35));
check('Actual native reader retains non-menu money and abstains from unbound sensory', () => {
  nativeReader = true;
  try {
    const read = normalizeReader({ ...row, place_details: { source: 'manual' }, price: 35, sensory_attributes: bottle.atributos });
    assert.equal(read.price, 35); assert.equal(read.sensory_attributes, null);
  } finally { nativeReader = false; }
});
const output = {
  scope: 'Pure price/metadata/negative provenance/confirmation contracts. Existing replay and synthetic units/currencies, no OCR/new catalog-positive fiche/profile/account.',
  sourceHashes: Object.fromEntries(['src/utils/menuWineSave.ts', 'src/components/wine-import/WineMenuScanner.tsx', 'src/pages/MyWines.tsx', bankPath].map((path) => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
  checks,
};
const outputPath = process.argv[process.argv.indexOf('--output') + 1];
if (process.argv.includes('--output')) writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter((c) => c.passed).length, total: checks.length, failures: checks.filter((c) => !c.passed) }, null, 2));
if (checks.some((c) => !c.passed)) process.exitCode = 1;
