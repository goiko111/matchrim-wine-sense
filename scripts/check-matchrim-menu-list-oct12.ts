import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import * as evidence from '../src/utils/scanWineEvidence';
import { wineComparisonPrice, wineComparisonPriceFormat } from '../src/utils/wineComparison';
import { singlePriceCurrency } from '../src/utils/scanMoney';
import { isMenuIdentityConfirmed, type MenuScanWine } from '../src/utils/wineMenuScan';

const path = 'src/components/wine-import/WineMenuScanner.tsx';
const source = readFileSync(path, 'utf8');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map<string, ts.Expression>();
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) declarations.set(node.name.text, node.initializer);
  ts.forEachChild(node, visit);
};
visit(tree);
const evaluate = (name: string, context: Record<string, unknown>) => {
  const init = declarations.get(name);
  if (!init) return;
  const memo = ts.isCallExpression(init) && init.expression.getText(tree) === 'useMemo';
  const expression = memo && ts.isCallExpression(init) ? init.arguments[0] : init;
  const code = ts.transpileModule(`globalThis.subject = (${expression.getText(tree)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = vm.createContext({ ...context });
  vm.runInContext(code, sandbox);
  context[name] = memo ? sandbox.subject() : sandbox.subject;
};
const bank = JSON.parse(readFileSync('docs/qa-evidence/matchrim-menu-comparison-2026-10-12/after/response-provenance.json', 'utf8')).variants;
const fixture = JSON.parse(readFileSync('qa/fixtures/menu-food-evidence-oct8.json', 'utf8')).cases[0];
const full: MenuScanWine[] = fixture.calls.find((c: { scan_region: { id: string } }) => c.scan_region.id === 'full').payload.vinos;
const frame = (wines: MenuScanWine[], service: string, sort: string, max = '') => {
  const context: Record<string, unknown> = {
    scannedWines: wines, scanServiceFilter: service, scanSortMode: sort, scanMaxPrice: max,
    scanTypeFilter: 'all', scanRegionFilter: 'all', scanMinScore: 'all', scanMinConfidence: 'all',
    singlePriceCurrency, isMenuIdentityConfirmed, wineComparisonPrice, wineComparisonPriceFormat,
    menuWinePriceEvidence: Reflect.get(evidence, 'menuWinePriceEvidence'),
    getWinePosition: () => null,
  };
  for (const name of ['formatWineType', 'parseNullableNumber', 'requestedServiceFormat', 'priceEligibleWines', 'listPriceFormat', 'menuPriceRows', 'menuCurrency', 'visibleScannedWines', 'menuDecision']) evaluate(name, context);
  return context;
};
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => {
  try { run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) }); }
};
const names = (context: Record<string, unknown>) => (context.visibleScannedWines as Array<{ wine: MenuScanWine }>).map(({ wine }) => wine.nombre).join('|');
check('Active bottle max uses explicit25/35 despite generic null', () => assert.equal(names(frame(bank.prices.vinos, 'botella', 'price-asc', '30')), 'Barbaresco Marchesi di Barolo'));
check('Active bottle descending uses35 before25', () => assert.equal(names(frame(bank.prices.vinos, 'botella', 'price-desc')), 'Barolo Marchesi di Barolo|Barbaresco Marchesi di Barolo'));
check('Mixed/unknown all-format list lacks monetary basis', () => assert.equal(frame(bank.units.vinos, 'all', 'price-asc').menuCurrency, null));
check('Filtered EUR copa need not borrow GBP bottle currency', () => assert.equal(frame(bank.currencies.vinos, 'copa', 'price-asc').menuCurrency, 'EUR'));
check('Mixed bottle currencies stay incompatible', () => assert.equal(frame(bank.currencies.vinos, 'botella', 'price-asc').menuCurrency, null));
check('Model score is not trusted catalog affinity for menu value', () => assert.equal((frame(bank.units.vinos, 'botella', 'compatibility').menuDecision as { value: unknown }).value, null));
const both: MenuScanWine = { ...full[5], servicio: 'ambos', precios: { copa: full[5].precios?.copa, botella: full[5].precio } };
for (const [name, wine] of [['both', both], ['unknown', { ...full[11], servicio: null }], ['inferred', { ...full[11], servicio: 'copa', campos_inferidos: ['servicio'] }]] as Array<[string, MenuScanWine]>) {
  const edited = evidence.updateMenuWineEvidence(wine, { precio: 35 });
  check(`${name} manual amount is pending, not assigned a guessed unit`, () => assert.equal(Reflect.get(edited, 'precio_manual_pendiente'), true));
  check(`${name} manual amount has explicit provenance`, () => assert.equal(Reflect.get(edited, 'precio_origen'), 'manual'));
  check(`${name} read service prices are not overwritten`, () => assert.deepEqual(edited.precios, wine.precios));
}
console.log(JSON.stringify({ scope: 'Actual active list/value hook factories extracted with TypeScript AST; positions ignored in pure tests. Recorded model affinity is negative input, never catalog-positive evidence.', source: path, sourceSha256: createHash('sha256').update(source).digest('hex'), checks }, null, 2));
if (checks.some((c) => !c.passed)) process.exitCode = 1;
