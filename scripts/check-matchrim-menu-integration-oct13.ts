import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { parseMenuPriceDraft, resolveMenuPriceReview, isMenuCurrencyAmountValid } from '../src/utils/menuPriceReview';
import { menuPriceSnapshot, readMenuPrice } from '../src/utils/menuWineSave';
import { menuWineSensorySimilarity } from '../src/utils/menuWineSimilarity';
import { isMenuIdentityConfirmed, type MenuScanWine } from '../src/utils/wineMenuScan';
import { isLiteralWineStyle95 } from '../src/utils/menuLiteralStyle95';
import { buildAuthRedirectPath } from '../src/utils/navigation';
import { reviewedMenu950 } from './matchrim-menu-etapa950-scope';
import { nativeMenuWineAffinity } from '../src/utils/menuWineConsumer95';
import { applyMenuWineEvidence } from '../src/utils/scanWineEvidence';
import { catalogWineFromVerifiedSheet, type WinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';

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
const currentSource = readFileSync(path, 'utf8');
const after = initializers(currentSource);
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
// Retain the exact old950 projection, then prove the bounded native-serving
// amendment separately. All initializer/behavior tests below use actual source.
const reviewedSource = execFileSync('git', ['show', `31e060828d1b370b275cdcf6691052368916f39f:${path}`], { encoding: 'utf8' });
check(() => assert.equal(hash(reviewedSource), reviewedMenu950.current, 'Only the exact reviewed95 Menu is projected'));
check(() => {
  const nativeServingSource = execFileSync('git', ['show', `ebee038059778f1f10bdb5dd647bccb8324fb580:${path}`], { encoding: 'utf8' });
  assert.equal(hash(nativeServingSource), 'df1d513633f04e716c162bfd8374a735d2e19dc5f3e10386e716c92a4e5e95b9',
    'Retain the exact ddba35c native-serving source before the separately proved96 amendment');
  assert.equal(hash(currentSource), 'ac27302f41c93d51ac2ad58de798b1928cde97d092773e349b1cc61e8af0e337',
    'Only the exact reviewed native row-context, parallel reads, consumer UI and reading96 amendment is accepted');
});
let nativeLayoutGroups = 0;
check(() => {
  assert.equal(hash(readFileSync('scripts/check-matchrim-consumer95-native-layout.ts', 'utf8')),
    '9979389b5bf9d2fab7136381cc4956763b5efbba0812c1180fe7c3deba92f6a2',
    'Exact source-preservation child for native/web parity, B_R3 and scoped menu/label/reading96 amendments');
  const output = execFileSync(process.execPath, ['--import', 'tsx', 'scripts/check-matchrim-consumer95-native-layout.ts'], { encoding: 'utf8' });
  const report = JSON.parse(output.trim().split('\n').at(-1)!);
  assert.equal(report.baseline, '31e060828d1b370b275cdcf6691052368916f39f');
  assert.equal(report.failed, 0);
  assert.equal(report.passed, 15);
  assert.equal(output.split('\n').filter(line => line.startsWith('PASS ')).length, 15);
  assert.equal(report.scope96.nativeMenuCropAmendments, 2);
  assert.equal(report.scope96.nativeMenuParallelAmendments, 6);
  assert.equal(report.scope96.nativeInitialScannerLandscapePaddingAmendments, 1);
  assert.equal(report.scope96.nativeMenuConsumerUiAmendments, 9);
  assert.equal(report.scope96.nativeMenuConsumerUiCategories, 4);
  assert.equal(report.scope96.nativeLabelUi96.currentHash, '9d2123e37af1de7d69a55c3f9dd333b04ef7c5f6940ccc747bc27117737c860f');
  assert.equal(report.scope96.nativeLabelUi96.priorNativeClassHash, 'b48b9fb5ac81cfb3eeb329f3e99b9709d5a0c22851bdf049280031784efcd11a');
  assert.equal(report.scope96.nativeLabelUi96.beforeHash, 'bc496d943d6ed7631c3505e1b63f11a18c0e641a31f2cf6a9ae9763773ae4146');
  assert.equal(report.scope96.nativeLabelUi96.passed, 36);
  assert.equal(report.scope96.nativeLabelUi96.failed, 0);
  assert.equal(report.scope96.nativeLabelUi96.classAmendments, 5);
  assert.equal(report.scope96.nativeLabelUi96.rejectedMutations, 15);
  assert.deepEqual(report.scope96.nativeKeyboardBridge, {
    path: 'scripts/check-matchrim-label-keyboard96.ts',
    testHash: '54a47abda40574d0b74551825f50ddb87042306fd95755aa8a2f85d4c56339c3',
    revision: '3a215039b91a6d3d57b806e3874f336a3010bc0e',
    priorRevision: '05ca1e2da53d581424f873fe0a9c1c2cd9d82018',
    priorSourceHash: 'b48b9fb5ac81cfb3eeb329f3e99b9709d5a0c22851bdf049280031784efcd11a',
    currentSourceHash: '9d2123e37af1de7d69a55c3f9dd333b04ef7c5f6940ccc747bc27117737c860f',
    webAstScope: 'Complete legacy web AST after the declared native keyboard/count inverse; not the literal current module AST',
    earlyNativeGuard: true,
    refsUndefinedOnWeb: true,
    whole05caSourceRestored: true,
    rejectedMutations: 14,
    childGroups: 5,
  });
  assert.deepEqual(report.scope96.nativeScanHubAccessibility96, {
    test: 'scripts/check-matchrim-scan-hub96.ts',
    testHash: '7149a47039c0382f4985051755e888cd36dc685efcf8a76a164c9db1a3cec4ad',
    revision: 'efc61c547fb04e1ac5adbe4974dbfe29aebd59fa',
    currentCssHash: '7bcbb68daff30c8b475e606d9f67d8f593617ef4456e73a72e57a9b4f3c3c50c',
    projectedCssHash: '548ff193ba713bce9595b28cb53bb316e3929653540199a4ca86789a4b2097dd',
    blockHash: '056d4d2f5b3907c4051637884114826a11f1321a8d944c22cff3a1355e5a2f02',
    childGroups: 5,
    rejectedMutations: 4,
    scope: 'One exact native-accessibility hub-only CSS block inverse before all historical checks; no component, route, callback, text or data projection',
  });
  assert.deepEqual(report.scope96.nativeMenuReading96.sources, {
    'src/components/wine-import/WineMenuScanner.tsx': 'ac27302f41c93d51ac2ad58de798b1928cde97d092773e349b1cc61e8af0e337',
    'src/utils/wineMenuScan.ts': '467be55f7138563662d96001a3f17f696c153418316097973c8a8a0d7ae28940',
    'src/utils/menuReadingPresentation96.ts': '13340660fcaa658f071361ae3fd7f9a402327b2c54ac1e03b81d1180f1a00f68',
    'scripts/check-matchrim-menu-reading96.ts': '429da3c23e7a0687b6eaf529276b5b029434173673cab65792c103e7104009fa',
  });
  assert.equal(report.scope96.nativeMenuReading96.componentJsxBlocks, 4);
  assert.equal(report.scope96.nativeMenuReading96.componentDeclarationBlocks, 2);
  assert.equal(report.scope96.nativeMenuReading96.componentOptInCalls, 2);
  assert.equal(report.scope96.nativeMenuReading96.resolverDeclarationBlocks, 4);
  assert.equal(report.scope96.nativeMenuReading96.resolverReturnWrappers, 3);
  assert.equal(report.scope96.nativeMenuReading96.resolverFalseAstEqual, true);
  assert.equal(report.scope96.nativeMenuReading96.rejectedMutations, 12);
  assert.equal(report.scope96.nativeMenuReading96.nativeCoverageCopyAmendments, 1);
  assert.equal(report.scope96.nativeMenuReading96.metadataSourceAdmissionAmendments, 1);
  assert.equal(report.scope96.nativeMenuReading96.r3RejectedMutations, 4);
  assert.equal(report.scope96.nativeMenuReading96.knownSourceTileIds, 10);
  assert.equal(report.scope96.nativeMenuReading96.metadataSourceHelperHash, 'fa12b2e159b4e0b50f4c43c4384ba0658478d2db36e959e0861c1b29286deea9');
  assert.equal(report.scope96.nativeMenuReading96.metadataPriorHelperHash, '0a9e8d14522e08d05e3f590fa9177586e6526cf00ae314e92c7fe1907b2f8696');
  assert.equal(report.scope96.nativeMenuReading96.functionalGroups, 11);
  nativeLayoutGroups = report.passed;
});
check(() => {
  const reviewedInitializers = initializers(reviewedSource);
  for (const name of ['saveScannedWine', 'updateScannedWine', 'normalizeScannedWine', 'menuDecision', 'listPriceText', 'calculateWineSimilarity', 'getSimilarWines']) {
    assert.ok(reviewedInitializers.get(name), `Missing reviewed950 initializer: ${name}`);
    assert.equal(after.get(name), reviewedInitializers.get(name), `Native-serving amendment cannot alter the old950 projection: ${name}`);
  }
});
const withoutNativeCellar84 = (initializer: string) => {
  const tree = ts.createSourceFile('save-proof.ts', `const proof = ${initializer};`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let literalGuards = 0;
  const transformed = ts.transform(tree, [context => root => {
    const visit: ts.Visitor = node => {
      if (ts.isIfStatement(node) && node.expression.getText(tree) === 'isNative && isLiteralWineStyle95(wine)') {
        assert.equal(hash(initializer), reviewedMenu950.initializers.saveScannedWine, 'Only the reviewed actual initializer can project this guard');
        assert.ok(ts.isBlock(node.thenStatement));
        assert.equal(node.thenStatement.statements.length, 2);
        assert.equal(node.thenStatement.statements[0].getText(tree), "toast.info('Identifica primero la botella concreta para guardarla en Bodega.');");
        assert.equal(node.thenStatement.statements[1].getText(tree), 'return;');
        literalGuards += 1;
        return undefined;
      }
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
  assert.equal(literalGuards, hash(initializer) === reviewedMenu950.initializers.saveScannedWine ? 1 : 0);
  transformed.dispose(); return printed;
};
const withoutNativeDecision95 = (initializer: string) => {
  const tree = ts.createSourceFile('decision-proof.ts', `const proof = ${initializer};`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let filters = 0, dependencies = 0;
  const transformed = ts.transform(tree, [context => root => {
    const visit: ts.Visitor = node => {
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        && node.right.getText(tree) === "(!isNative || nativeMenuWineAffinity(wine, scanProfile?.profile ?? null).state === 'ready')") {
        assert.equal(hash(initializer), reviewedMenu950.initializers.menuDecision); filters += 1;
        return ts.visitNode(node.left, visit);
      }
      if (ts.isCallExpression(node) && node.expression.getText(tree) === 'useMemo' && ts.isArrayLiteralExpression(node.arguments[1])
        && node.arguments[1].elements.length === 7) {
        assert.equal(hash(initializer), reviewedMenu950.initializers.menuDecision);
        assert.deepEqual(node.arguments[1].elements.slice(-2).map(value => value.getText(tree)), ['isNative', 'scanProfile?.profile']);
        dependencies += 1;
        return ts.factory.updateCallExpression(node, node.expression, node.typeArguments,
          [ts.visitNode(node.arguments[0], visit) as ts.Expression, ts.factory.createArrayLiteralExpression(node.arguments[1].elements.slice(0, -2))]);
      }
      return ts.visitEachChild(node, visit, context);
    }; return ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  const expected = hash(initializer) === reviewedMenu950.initializers.menuDecision ? 1 : 0;
  assert.equal(filters, expected); assert.equal(dependencies, expected);
  const printed = ts.createPrinter({ removeComments: true }).printFile(transformed.transformed[0]);
  transformed.dispose(); return printed;
};
for (const name of ['saveScannedWine', 'updateScannedWine', 'normalizeScannedWine', 'menuDecision', 'listPriceText', 'calculateWineSimilarity', 'getSimilarWines']) {
  check(() => {
    assert.ok(before.get(name), `Missing protected initializer: ${name}`);
    assert.equal(name === 'saveScannedWine' ? withoutNativeCellar84(after.get(name)!) : name === 'menuDecision' ? withoutNativeDecision95(after.get(name)!) : after.get(name),
      name === 'saveScannedWine' ? withoutNativeCellar84(before.get(name)!) : name === 'menuDecision' ? withoutNativeDecision95(before.get(name)!) : before.get(name), `Local beta logic preserved: ${name}`);
  });
}
check(() => assert.match(after.get('saveScannedWine')!, /withCellarInitialAffinity/));
check(() => assert.match(after.get('saveScannedWine')!, /confirmsCellarSaveEvidence\(data, payload\)/));
const literal = { nombre: 'Chardonnay', productor: null, tipo: 'blanco', seccion: 'White wine', texto_fuente: 'White wine Chardonnay' };
const named = { ...literal, nombre: 'Synthetic Estate Chardonnay', productor: 'Synthetic Estate', texto_fuente: 'White wine Synthetic Estate Chardonnay' };
const sourceAbsent = { ...literal, texto_fuente: null };
check(() => { assert.equal(isLiteralWineStyle95(literal), true); assert.equal(isLiteralWineStyle95(named), false); assert.equal(isLiteralWineStyle95(sourceAbsent), false); });
for (const native of [true, false]) for (const row of [literal, named, sourceAbsent]) {
  for (const status of ['wishlist', 'tasted']) for (const favorite of [false, true]) {
    const events: unknown[] = []; let ownerReads = 0, classifierCalls = 0;
    const sandbox = { exports: {} as { save?: (wine: unknown, index: number, status: string, favorite: boolean) => Promise<void> }, isNative: native,
      isLiteralWineStyle95: (input: typeof literal) => { assert.equal(native, true, 'Web must not call the new classifier'); classifierCalls += 1; return isLiteralWineStyle95(input); },
      toast: { info: (message: string) => events.push(['info', message]), error: (message: string) => events.push(['error', message]) },
      navigate: (destination: string) => events.push(['navigate', destination]), buildAuthRedirectPath,
      location: { pathname: '/use-matchrim', search: '?tab=menu' } };
    Object.defineProperty(sandbox, 'user', { get: () => { ownerReads += 1; return null; } });
    vm.runInNewContext(ts.transpileModule(`exports.save=${after.get('saveScannedWine')};`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
    await sandbox.exports.save!(row, 0, status, favorite);
    if (native && row === literal) {
      assert.deepEqual(events, [['info', 'Identifica primero la botella concreta para guardarla en Bodega.']]);
      assert.equal(ownerReads, 0, 'A generic style cannot reach owner lookup or any mutation');
    } else {
      assert.deepEqual(events, [['error', 'Inicia sesión para guardar vinos'], ['navigate', '/auth?redirect=%2Fuse-matchrim%3Ftab%3Dmenu']]);
      assert.equal(ownerReads, 1, 'Legacy authentication flow is retained');
    }
    assert.equal(classifierCalls, native ? 1 : 0); checks += 1;
  }
}
check(() => assert.throws(() => withoutNativeCellar84(after.get('saveScannedWine')! + '\n'), /Only the reviewed actual initializer/));
const profile = { potente: 2.4, acidez: 4, dulce: 1, tanico: 0, afrutado: 3 };
const identity = { name: 'Synthetic Luna Reserva', producer: 'Synthetic Estate', vintage: 2021, region: 'Rioja', country: 'Spain' };
const sheet: WinerimOriginalSheet = { id: '123', ...identity, vintage: '2021', detailVerified: true, grapes: [],
  url: 'https://web.winerim.com/the-library/wines/123/Synthetic-Luna-Reserva_2021',
  sensoryAttributes: { power: 2.4, acidity: 4, sweetness: 1, tannin: 0, fruity: 3 } };
const resolved = applyMenuWineEvidence({ ...wine, nombre: identity.name, productor: identity.producer, anada: 2021, region: 'Rioja', pais: 'Spain',
  confidence: .9, dudas: [], campos_inferidos: [], precio: null, texto_fuente: `${identity.name} ${identity.producer}` }, profile, catalogWineFromVerifiedSheet(identity, sheet)!);
const runDecision = (initializer: string, native: boolean, row: MenuScanWine, currentProfile: typeof profile | null) => {
  let affinityCalls = 0;
  const sandbox = { exports: {} as { decision?: { best: { score: number; index: number } | null; highMatches: number } },
    useMemo: (callback: () => unknown) => callback(), scannedWines: [row], isNative: native,
    scanProfile: { profile: currentProfile }, menuCurrency: null, listPriceFormat: null, menuPriceRows: [], scanMaxPrice: '',
    isMenuIdentityConfirmed, getWinePosition: () => null,
    nativeMenuWineAffinity: (input: MenuScanWine, inputProfile: typeof profile | null) => { affinityCalls += 1; return nativeMenuWineAffinity(input, inputProfile); } };
  vm.runInNewContext(ts.transpileModule(`exports.decision=${initializer};`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
  return { decision: sandbox.exports.decision!, affinityCalls };
};
for (const [row, currentProfile, ready] of [
  [resolved, profile, true], [{ ...resolved, originalSheet: null }, profile, false],
  [{ ...resolved, productor: 'Synthetic wrong producer' }, profile, false], [resolved, null, false],
  [resolved, { ...profile, dulce: 5 }, false],
] as Array<[MenuScanWine, typeof profile | null, boolean]>) {
  check(() => {
    assert.equal(isMenuIdentityConfirmed(row), true, 'This control must reach the added readiness gate, not short-circuit at the existing identity gate');
    const native = runDecision(after.get('menuDecision')!, true, row, currentProfile);
    assert.equal(native.affinityCalls, 1);
    assert.equal(native.decision.best?.index ?? null, ready ? 0 : null);
    assert.equal(native.decision.highMatches, ready ? 1 : 0);
    if (ready) assert.equal(native.decision.best?.score, 93);
    const web = runDecision(after.get('menuDecision')!, false, row, currentProfile);
    assert.equal(web.affinityCalls, 0);
    assert.equal(web.decision.best?.score, 93); assert.equal(web.decision.highMatches, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(web.decision)), JSON.parse(JSON.stringify(runDecision(before.get('menuDecision')!, false, row, currentProfile).decision)));
  });
}
console.log(JSON.stringify({ checks, release, nativeLayoutGroups, scope: 'Combined menu price/style/save invariants and synthetic math, not provider recognition, real preferences or hosted writes' }));
