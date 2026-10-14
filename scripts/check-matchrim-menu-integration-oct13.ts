import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { parseMenuPriceDraft, resolveMenuPriceReview, isMenuCurrencyAmountValid } from '../src/utils/menuPriceReview';
import { menuPriceSnapshot, readMenuPrice } from '../src/utils/menuWineSave';
import { menuWineSensorySimilarity } from '../src/utils/menuWineSimilarity';
import type { MenuScanWine } from '../src/utils/wineMenuScan';

const release = '89d478d6a391c4594fa09d815bb6546fb874231b';
const bank = JSON.parse(readFileSync('docs/qa-evidence/matchrim-menu-comparison-2026-10-12/after/response-provenance.json', 'utf8'));
const wine: MenuScanWine = bank.variants.units.vinos[1];
let checks = 0;
const check = (run: () => void) => { run(); checks += 1; };
for (const currency of ['EUR', 'GBP', 'USD', 'CHF', 'CAD', 'AUD', 'NZD', 'JPY', 'CNY', 'SEK', 'NOK', 'DKK']) {
  for (const amount of [0, 125, 1_000_000_000]) check(() => assert.equal(isMenuCurrencyAmountValid(amount, currency), true));
  check(() => assert.equal(isMenuCurrencyAmountValid(1.25, currency), currency !== 'JPY'));
  check(() => assert.equal(isMenuCurrencyAmountValid(1.234, currency), false));
  check(() => {
    const corrected = resolveMenuPriceReview(wine, 125, 'botella', currency);
    assert.equal(corrected.precio, 125);
    assert.equal(corrected.moneda, currency);
    assert.equal(corrected.precio_manual_asignacion?.original.currency, 'EUR');
    assert.equal(corrected.canonicalId, wine.canonicalId);
    assert.equal(corrected.compatibilidad, wine.compatibilidad);
    assert.equal(corrected.confidence, wine.confidence);
  });
}
check(() => assert.equal(parseMenuPriceDraft('35,50', 'EUR').amount, 35.5));
check(() => assert.equal(parseMenuPriceDraft('1,25', 'JPY').amount, null));
check(() => assert.equal(isMenuCurrencyAmountValid(0.1 + 0.2, 'EUR'), false));
check(() => {
  const corrected = resolveMenuPriceReview(wine, 35.5, 'botella', 'EUR');
  const snapshot = menuPriceSnapshot(corrected);
  const read = readMenuPrice({ source: 'menu_scanner', menu_price_snapshot: snapshot }, null);
  assert.ok(read?.lines.some(line => /35,50/.test(line)));
  assert.equal(snapshot.manual_assignment?.original.amount, wine.precio);
});
check(() => {
  assert.equal(menuWineSensorySimilarity(wine, { ...wine, nombre: 'Synthetic second wine' }), null);
  assert.equal(menuWineSensorySimilarity({ ...wine, atributos: null }, { ...wine, atributos: null }), null);
});
check(() => {
  const valid = { ...wine, canonicalId: 'synthetic-a', sensorySource: 'catalog' as const, confidence: 0.9,
    dudas: [], campos_inferidos: [], atributos: { potencia: 3, acidez: 3, dulzura: 3, taninos: 3, afrutado: 3 } };
  assert.equal(menuWineSensorySimilarity(valid, { ...valid, canonicalId: 'synthetic-b' })?.score, 100);
  assert.equal(menuWineSensorySimilarity(valid, { ...valid, canonicalId: 'synthetic-b', confidence: 0.4 }), null);
});
const path = 'src/components/wine-import/WineMenuScanner.tsx';
const initializers = (source: string) => {
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const values = new Map<string, string>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) values.set(node.name.text, node.initializer.getText(tree));
    ts.forEachChild(node, visit);
  };
  visit(tree); return values;
};
const before = initializers(execFileSync('git', ['show', `${release}:${path}`], { encoding: 'utf8' }));
const after = initializers(readFileSync(path, 'utf8'));
const withoutNativeCellar84 = (initializer: string) => {
  const tree = ts.createSourceFile('save-proof.ts', `const proof = ${initializer};`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const transformed = ts.transform(tree, [context => root => {
    const visit: ts.Visitor = node => {
      if (ts.isIfStatement(node) && [
        'isNative && wine.canonicalId && evidence.sensory_attributes',
        '!saved && isNative && !confirmsCellarSaveEvidence(data, payload)',
      ].includes(node.expression.getText(tree))) return undefined;
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'select'
        && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])
        && node.arguments[0].text === 'id, user_id, name, producer, vintage, region, country, status, is_favorite, rating, price, place_details, sensory_attributes, matchrim_affinity, use_for_profile_training') {
        return ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [ts.factory.createStringLiteral(
          'id, user_id, name, producer, vintage, status, is_favorite, rating, price, place_details, sensory_attributes, matchrim_affinity, use_for_profile_training', true)]);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  const printed = ts.createPrinter({ removeComments: true }).printFile(transformed.transformed[0]);
  transformed.dispose(); return printed;
};
for (const name of ['saveScannedWine', 'updateScannedWine', 'normalizeScannedWine', 'menuDecision', 'listPriceText', 'calculateWineSimilarity', 'getSimilarWines']) {
  check(() => {
    assert.ok(before.get(name), `Missing protected initializer: ${name}`);
    assert.equal(name === 'saveScannedWine' ? withoutNativeCellar84(after.get(name)!) : after.get(name),
      name === 'saveScannedWine' ? withoutNativeCellar84(before.get(name)!) : before.get(name), `Local beta logic preserved: ${name}`);
  });
}
check(() => assert.match(after.get('saveScannedWine')!, /withCellarInitialAffinity/));
check(() => assert.match(after.get('saveScannedWine')!, /confirmsCellarSaveEvidence\(data, payload\)/));
console.log(JSON.stringify({ checks, release, scope: 'Combined menu price/style/save invariants and synthetic math, not provider recognition, real preferences or hosted writes' }));
