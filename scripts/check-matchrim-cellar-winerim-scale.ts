import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import type { Json } from '../src/integrations/supabase/types';
import type { ScanProfileSnapshot } from '../src/utils/scanProfile';
import type { WineAttributeInput } from '../src/utils/wineAffinityExplanation';
import { calculateLocalMatchrimAffinity, normalizeWineAttributesForInsight } from '../src/utils/wineAffinityExplanation';
import { cellarAffinityView, cellarTrainingRows, confirmsCellarSaveEvidence, makeCellarCatalogEvidence,
  readCellarInitialAffinity, readCellarSensoryEvidence, withCellarInitialAffinity } from '../src/utils/bodegaAffinity';
import { confirmsWineMutation } from '../src/utils/matchrimWineMutation';
import { readMenuPrice, hasStoredMenuCatalogEvidence, confirmsMenuInsert, menuFinancialPrice,
  menuPriceSnapshot, menuSaveEvidence } from '../src/utils/menuWineSave';
import { confirmsMenuAction, menuCardIdentity, menuIntentChanges } from '../src/utils/menuWineActions';
import { labelInsertErrorResult } from '../src/utils/labelScanSave';
import { normalizeScanCurrency } from '../src/utils/scanMoney';
import { applyMenuWineEvidence } from '../src/utils/scanWineEvidence';
import { catalogWineFromVerifiedSheet, type WinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import type { MenuScanWine } from '../src/utils/wineMenuScan';
import { optionalScanNumber, normalizeScanSensoryValue } from '../supabase/functions/_shared/matchrim-scan-values';

globalThis.fetch = () => { throw new Error('Offline cellar scale contracts: remote fetch forbidden'); };
const object = (value: unknown): Record<string, unknown> => {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
};
const scale = 'winerim-0-5' as const;
const identity = { name: 'Synthetic scale contract', producer: 'Synthetic producer', vintage: 2021,
  region: 'Synthetic region', country: 'Synthetic country' };
const attributes: WineAttributeInput = { scale, potencia: 0, acidez: 0.4, dulzura: 1.7, taninos: 0, afrutado: 5 };
const snapshot: ScanProfileSnapshot = { profile: { potente: 0, acidez: 0.4, dulce: 1.7, tanico: 0, afrutado: 5 },
  source: 'quiz', samples: 0, status: 'ready', note: 'Synthetic offline profile.' };
const rowFor = (attrs: WineAttributeInput) => ({ ...identity, id: 'synthetic-cellar-scale', sensory_attributes: attrs,
  rating: null, use_for_profile_training: false, status: 'collection', price: null, matchrim_affinity: null,
  place_details: { fixture: true, bodega_sensory_evidence: makeCellarCatalogEvidence(identity, 'SYN-SCALE', attrs) } as Json });
const wine = rowFor(attributes);
const saved = { ...wine, place_details: withCellarInitialAffinity(wine, snapshot, 'saved', '2026-10-16T12:00:00.000Z') };
const before = JSON.stringify(saved);
let checks = 0;
const check = async (name: string, run: () => void | Promise<void>) => { await run(); checks++; console.log('PASS', name); };

await check('Explicit evidence binds exact values, marker and v2; zero and one cannot share a signature', () => {
  const trace = object(makeCellarCatalogEvidence(identity, 'SYN-SCALE', attributes));
  assert.equal(trace.version, 2); assert.equal(trace.scale, scale);
  assert.ok(typeof trace.attribute_signature === 'string');
  assert.deepEqual(JSON.parse(trace.attribute_signature), [scale, 0, 0.4, 1.7, 0, 5]);
  const one = object(makeCellarCatalogEvidence(identity, 'SYN-SCALE', { ...attributes, taninos: 1 }));
  assert.notEqual(trace.attribute_signature, one.attribute_signature);
  assert.deepEqual(readCellarSensoryEvidence(saved), attributes);
});
await check('V2 initial/current score uses the explicit range and retains the exact profile', () => {
  const initial = readCellarInitialAffinity(saved)!;
  assert.ok(initial); assert.equal(initial.version, 2); assert.equal(initial.model, 'scan-local-l2-0to5-v2');
  assert.equal(initial.scale, scale); assert.equal(initial.score, 93);
  assert.deepEqual(initial.profile, snapshot.profile);
  assert.equal(cellarAffinityView(saved, snapshot).current, 93);
  assert.equal(cellarAffinityView(saved, snapshot).attributes?.scale, scale);
});
await check('A later profile changes current affinity without rewriting initial history or the source row', () => {
  const changed: ScanProfileSnapshot = { ...snapshot, source: 'learned', samples: 3,
    profile: { potente: 5, acidez: 5, dulce: 5, tanico: 5, afrutado: 5 } };
  const view = cellarAffinityView(saved, changed);
  assert.equal(view.current, calculateLocalMatchrimAffinity(changed.profile, attributes));
  assert.notEqual(view.current, view.initial?.score);
  assert.equal(view.delta, view.current! - 93);
  assert.deepEqual(withCellarInitialAffinity(saved, changed, 'first_verified', '2027-01-01T00:00:00.000Z'), saved.place_details);
  assert.equal(JSON.stringify(saved), before);
});
await check('Missing profile preserves initial history but keeps current affinity pending', () => {
  const view = cellarAffinityView(saved, { ...snapshot, profile: null, source: 'unavailable' });
  assert.equal(view.current, null); assert.equal(view.initial?.score, 93);
});
await check('Identity or exact sensory edits invalidate current, initial and training evidence', () => {
  for (const change of [{ name: 'Other wine' }, { producer: 'Other producer' }, { vintage: 2020 },
    { region: 'Other region' }, { country: 'Other country' },
    { sensory_attributes: { ...attributes, taninos: 1 } }, { sensory_attributes: { ...attributes, acidez: 0.41 } }]) {
    const edited = { ...saved, ...change };
    assert.equal(readCellarSensoryEvidence(edited), null);
    assert.equal(readCellarInitialAffinity(edited), null);
    assert.equal(cellarAffinityView(edited, snapshot).current, null);
    assert.equal(cellarTrainingRows([{ ...edited, rating: 'love', use_for_profile_training: true }], true).length, 0);
    const details = withCellarInitialAffinity(edited, snapshot, 'first_verified');
    assert.equal(object(details).matchrim_affinity_initial, undefined);
  }
  assert.equal(JSON.stringify(saved), before);
});
await check('Scale removal, unknown scale and mismatched evidence cannot downgrade to legacy', () => {
  const { scale: omitted, ...unmarked } = attributes;
  for (const attrs of [unmarked, { ...attributes, scale: 'legacy' }, { ...attributes, scale: null }]) {
    const edited = { ...saved, sensory_attributes: attrs };
    assert.equal(readCellarSensoryEvidence(edited), null);
    assert.equal(readCellarInitialAffinity(edited), null);
    assert.equal(cellarAffinityView(edited, snapshot).current, null);
  }
  for (const change of [{ scale: undefined }, { scale: 'legacy' }, { version: 1 }, { version: 1, scale: undefined }]) {
    const details = structuredClone(object(saved.place_details));
    Object.assign(object(details.bodega_sensory_evidence), change);
    assert.equal(readCellarSensoryEvidence({ ...saved, place_details: details }), null);
  }
});
await check('Initial model/version/scale mismatches fail even when the numeric score happens to match', () => {
  for (const change of [{ scale: undefined }, { scale: 'legacy' }, { version: 1 },
    { model: 'scan-local-l2-v1' }, { model: 'scan-local-l2-v1', version: 1, scale: undefined }]) {
    const details = structuredClone(object(saved.place_details));
    Object.assign(object(details.matchrim_affinity_initial), change);
    assert.equal(readCellarInitialAffinity({ ...saved, place_details: details }), null);
    assert.equal(confirmsCellarSaveEvidence({ ...saved, place_details: details }, saved), false);
  }
});
await check('Explicit values are numbers in 0..5; no coercion or legacy rescaling can mint evidence', () => {
  for (const key of ['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado']) {
    for (const value of [-1, 5.01, 6, 100, NaN, Infinity, null, '0', false]) {
      const invalid = { ...attributes, [key]: value } as WineAttributeInput;
      assert.equal(makeCellarCatalogEvidence(identity, 'SYN-SCALE', invalid), null);
    }
  }
});
await check('Round-trip confirms marker, exact sensory data and initial snapshot', () => {
  const persisted = JSON.parse(JSON.stringify(saved));
  assert.equal(confirmsCellarSaveEvidence(persisted, saved), true);
  assert.deepEqual(readCellarSensoryEvidence(persisted), attributes);
  assert.deepEqual(readCellarInitialAffinity(persisted), readCellarInitialAffinity(saved));
  delete persisted.sensory_attributes.scale;
  assert.equal(confirmsCellarSaveEvidence(persisted, saved), false);
});
await check('Strict training boundary preserves explicit scale and exact axes without mutating storage', () => {
  const rated = { ...saved, rating: 'love' as const, use_for_profile_training: true };
  const rows = cellarTrainingRows([rated], true);
  assert.equal(rows.length, 1); assert.deepEqual(rows[0].sensory_attributes, attributes);
  assert.deepEqual(readCellarSensoryEvidence(rows[0] as typeof rated), attributes);
  assert.deepEqual(cellarTrainingRows([rated], false), [rated]);
  assert.equal(JSON.stringify(saved), before);
});
await check('Literal old v1 evidence and snapshot still verify without being upgraded', () => {
  const attrs = { potencia: 2, acidez: 5, dulzura: 1, taninos: 1, afrutado: 4 };
  const profile = { potente: 2, acidez: 3, dulce: 2, tanico: 1, afrutado: 5 };
  const identity_signature = JSON.stringify(Object.values(identity).map(value => typeof value === 'string' ? value.toLowerCase() : value));
  const attribute_signature = '[2,5,1,1,4]';
  const legacy = { ...rowFor(attrs), place_details: { bodega_sensory_evidence: { version: 1, source: 'catalog',
    canonical_id: 'SYN-LEGACY', identity_signature, attribute_signature },
  matchrim_affinity_initial: { version: 1, model: 'scan-local-l2-v1', identity_signature, attribute_signature,
    score: 69, recorded_at: '2026-10-14T12:00:00.000Z', phase: 'saved', profile, profile_source: 'quiz', samples: 0 } } };
  const original = JSON.stringify(legacy);
  assert.equal(readCellarInitialAffinity(legacy)?.score, 69);
  assert.equal(readCellarInitialAffinity(legacy)?.model, 'scan-local-l2-v1');
  assert.deepEqual(withCellarInitialAffinity(legacy, snapshot, 'first_verified'), legacy.place_details);
  assert.deepEqual(makeCellarCatalogEvidence(identity, 'SYN-LEGACY', attrs), legacy.place_details.bodega_sensory_evidence);
  assert.equal(JSON.stringify(legacy), original);
});

// Execute only the real normalization and resolver bodies with local dependency doubles.
const source = readFileSync('src/pages/MyWines.tsx', 'utf8');
const ast = ts.createSourceFile('MyWines.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['normalizeAttributeTo5', 'normalizeSensoryAttributesTo5', 'normalizeAffinity', 'normalizeUserWine'];
const declarations = ast.statements.filter(statement => ts.isVariableStatement(statement)
  && statement.declarationList.declarations.some(declaration => names.includes(declaration.name.getText(ast))));
assert.equal(declarations.length, names.length);
const compile = (body: string) => ts.transpileModule(body, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const normalization = compile(declarations.map(declaration => declaration.getText(ast)).join('\n'));
const nativeNormalizer = (native: boolean) => new Function('Capacitor', 'optionalScanNumber', 'normalizeWineAttributesForInsight',
  'readMenuPrice', 'hasStoredMenuCatalogEvidence', 'readCellarSensoryEvidence', normalization + '\nreturn normalizeUserWine;')(
  { isNativePlatform: () => native }, optionalScanNumber, normalizeWineAttributesForInsight,
  readMenuPrice, hasStoredMenuCatalogEvidence, readCellarSensoryEvidence);
await check('Actual MyWines reload keeps explicit zero/decimals, marker and initial on native and web', () => {
  for (const native of [true, false]) {
    const normalized = nativeNormalizer(native)(saved);
    assert.deepEqual(normalized.sensory_attributes, attributes);
    assert.equal(readCellarInitialAffinity(normalized)?.score, 93);
    assert.deepEqual(nativeNormalizer(native)(normalized), normalized);
  }
});
await check('Actual MyWines default web path and unmarked native legacy behavior stay unchanged', () => {
  const english = { power: 2, acidity: 5, sweetness: 0, tannin: 0, fruity: 4 };
  const legacy = rowFor(english);
  assert.equal(nativeNormalizer(false)(legacy).sensory_attributes, null);
  assert.deepEqual(nativeNormalizer(true)(legacy).sensory_attributes,
    { potencia: 2, acidez: 5, dulzura: 1, taninos: 1, afrutado: 4 });
});

let resolver: ts.VariableDeclaration | undefined;
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'resolveCellarWine') resolver = node;
  ts.forEachChild(node, visit);
};
visit(ast); assert.ok(resolver);
await check('Actual native resolver persists grounded scale unchanged and never calls the neutral fallback', async () => {
  let writes = 0, fallbackCalls = 0, finished = 0;
  let payload: Record<string, unknown> | undefined;
  const info: string[] = [], errors: string[] = [];
  const chain = { eq: () => chain, select: () => chain,
    single: async () => ({ data: { id: saved.id, ...structuredClone(payload) }, error: null }) };
  const dependencies = {
    isNative: true, Capacitor: { isNativePlatform: () => true },
    beginWineAction: () => ({ ownerId: 'synthetic-owner', isCurrent: () => true, finish: () => { finished++; } }),
    findWinerimWineForLabel: async () => ({ wine: { id: 'SYN-SCALE', tastingAttributes: attributes } }),
    findOriginalWinerimWineForLabel: async () => { fallbackCalls++; return null; },
    applyScanWineEvidence: () => ({ sensorySource: 'catalog', sensoryAttributes: attributes }),
    normalizeSensoryAttributesTo5: () => { throw new Error('Native resolver must preserve the grounded object'); },
    makeCellarCatalogEvidence, loadMatchrimScanProfile: async () => snapshot,
    withCellarInitialAffinity, cellarAffinityView, confirmsWineMutation, readCellarSensoryEvidence, readCellarInitialAffinity,
    supabase: { from: () => ({ update: (value: Record<string, unknown>) => { writes++; payload = value; return chain; } }) },
    toast: { info: (message: string) => info.push(message), success: () => undefined, error: (message: string) => errors.push(message) },
    setCellarProfile: () => undefined, setWines: (update: (rows: unknown[]) => unknown[]) => update([saved]),
    normalizeUserWine: nativeNormalizer(true),
  };
  const code = compile('const ' + resolver!.getText(ast) + ';') + '\nreturn resolveCellarWine;';
  const run = new Function(...Object.keys(dependencies), code)(...Object.values(dependencies));
  await run(saved);
  assert.equal(writes, 1); assert.equal(fallbackCalls, 0); assert.equal(finished, 1);
  assert.deepEqual(info, []); assert.deepEqual(errors, []);
  assert.deepEqual(payload!.sensory_attributes, attributes);
  assert.equal(object(object(payload!.place_details).bodega_sensory_evidence).scale, scale);
  assert.equal(object(object(payload!.place_details).matchrim_affinity_initial).model, 'scan-local-l2-0to5-v2');
});

const menuSource = readFileSync('src/components/wine-import/WineMenuScanner.tsx', 'utf8');
const menuAst = ts.createSourceFile('WineMenuScanner.tsx', menuSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const menuNames = ['normalizeAttributeTo5', 'normalizeAttributesTo5', 'saveScannedWine'];
const menuDeclarations = new Map<string, ts.VariableDeclaration>();
const visitMenu = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && menuNames.includes(node.name.text)) {
    assert.ok(!menuDeclarations.has(node.name.text));
    menuDeclarations.set(node.name.text, node);
  }
  ts.forEachChild(node, visitMenu);
};
visitMenu(menuAst); assert.equal(menuDeclarations.size, menuNames.length);
const menuNormalization = compile(menuNames.slice(0, 2)
  .map(name => 'const ' + menuDeclarations.get(name)!.getText(menuAst) + ';').join('\n'));
const normalizeMenu = new Function('normalizeScanSensoryValue', 'normalizeWineAttributesForInsight',
  menuNormalization + '\nreturn normalizeAttributesTo5;')(normalizeScanSensoryValue, normalizeWineAttributesForInsight);
const menuInput: MenuScanWine = { nombre: identity.name, productor: identity.producer, anada: identity.vintage,
  region: identity.region, pais: identity.country, precio: 20, moneda: 'EUR', servicio: 'botella',
  tipo: 'tinto', descripcion: null, confidence: .78, dudas: ['Synthetic medium OCR signal'], campos_inferidos: [],
  texto_fuente: `${identity.name} ${identity.producer} 2021` };
const menuSheet: WinerimOriginalSheet = { id: 'SYN-SCALE', name: identity.name, producer: identity.producer,
  vintage: '2021', region: identity.region, country: identity.country, grapes: [], detailVerified: true,
  url: 'https://web.winerim.com/the-library/wines/SYN-SCALE/synthetic-scale',
  sensoryAttributes: { power: 0, acidity: .4, sweetness: 1.7, tannin: 0, fruity: 5 } };
const menuCatalog = catalogWineFromVerifiedSheet(identity, menuSheet);
assert.ok(menuCatalog);

const saveMenu = async (wine: MenuScanWine, profile: ScanProfileSnapshot) => {
  let payload: Record<string, unknown> | undefined, persisted: Record<string, unknown> | undefined;
  let inserts = 0, savedKeys = new Set<string>();
  const errors: string[] = [], warnings: string[] = [], successes: string[] = [];
  const ownerId = 'synthetic-menu-owner';
  const savingRef = { current: false }, pendingIdentitiesRef = { current: new Map<number, string>() };
  const savedCardsRef = { current: new Map() };
  const chain = { select: () => chain, single: async () => ({ data: persisted, error: null }) };
  const dependencies = {
    user: { id: ownerId }, isNative: true,
    navigate: () => { throw new Error('Unexpected navigation'); }, buildAuthRedirectPath: (path: string) => path,
    location: { pathname: '/escanear/carta-vinos', search: '' }, savingRef,
    unconfirmedRef: { current: new Set() }, identityHoldsRef: { current: new Set() }, savedWineKeys: savedKeys,
    saveLifetime: { current: { active: true, generation: 1, ownerId } }, pendingIdentitiesRef, savedCardsRef,
    setUnconfirmedWineIndexes: () => undefined, setIdentityHoldIndexes: () => undefined, setSavingWineKey: () => undefined,
    menuCardIdentity, normalizeAttributesTo5: normalizeMenu, menuSaveEvidence, menuPriceSnapshot, menuFinancialPrice,
    normalizeScanCurrency, makeCellarCatalogEvidence, withCellarInitialAffinity, scanProfile: profile,
    restaurantName: 'Synthetic restaurant', restaurantSessionId: null, matchrimCode: null,
    pairingDishName: null, similarWineName: null, menuIntentChanges, labelInsertErrorResult,
    confirmsMenuAction, confirmsMenuInsert, confirmsCellarSaveEvidence,
    supabase: { from: (table: string) => {
      assert.equal(table, 'user_wines');
      return { insert: (value: Record<string, unknown>) => {
        inserts++; payload = structuredClone(value);
        persisted = JSON.parse(JSON.stringify({ ...value, id: 'synthetic-menu-row', rating: null }));
        return chain;
      }, update: () => { throw new Error('Unexpected existing-row update'); } };
    } },
    setSavedWineKeys: (update: (keys: Set<string>) => Set<string>) => { savedKeys = update(savedKeys); },
    trackAppEvent: () => undefined,
    toast: { error: (message: string) => errors.push(message), warning: (message: string) => warnings.push(message),
      success: (message: string) => successes.push(message) },
    console: { error: (...args: unknown[]) => errors.push(args.map(String).join(' ')) },
  };
  const code = compile('const ' + menuDeclarations.get('saveScannedWine')!.getText(menuAst) + ';')
    + '\nreturn saveScannedWine;';
  const run = new Function(...Object.keys(dependencies), code)(...Object.values(dependencies));
  const original = JSON.stringify(wine);
  await run(wine, 0, 'wishlist');
  assert.equal(inserts, 1); assert.deepEqual(errors, []); assert.deepEqual(warnings, []);
  assert.equal(successes.length, 1); assert.equal(savedCardsRef.current.size, 1); assert.equal(savedKeys.size, 1);
  assert.equal(savingRef.current, false); assert.equal(pendingIdentitiesRef.current.size, 0);
  assert.equal(JSON.stringify(wine), original);
  assert.ok(payload); assert.ok(persisted);
  return { payload, persisted, reopened: nativeNormalizer(true)(persisted) };
};

await check('Actual menu normalizer preserves explicit zero/decimals and leaves the unmarked legacy branch intact', () => {
  assert.deepEqual(normalizeMenu(attributes), attributes);
  assert.deepEqual(normalizeMenu({ potencia: 0, acidez: .4, dulzura: 1.7, taninos: 0, afrutado: 5 }),
    { potencia: 1, acidez: 1, dulzura: 2, taninos: 1, afrutado: 5 });
});
await check('Actual menu normalizer abstains on missing or invalid explicit axes instead of inventing sensory data', () => {
  const missing = { ...attributes }; delete missing.taninos;
  for (const value of [null, missing, { ...attributes, taninos: null }, { ...attributes, taninos: '0' },
    { ...attributes, taninos: 6 }]) assert.equal(normalizeMenu(value), null);
});
await check('Actual menu save to Bodega retains v2 source values, displayed/current score and immutable initial snapshot', async () => {
  const menu = applyMenuWineEvidence(menuInput, snapshot.profile, menuCatalog);
  assert.equal(menu.compatibilidad, 93); assert.deepEqual(menu.atributos, attributes);
  const result = await saveMenu(menu, snapshot);
  assert.deepEqual(result.payload.sensory_attributes, attributes);
  assert.deepEqual(result.reopened.sensory_attributes, attributes);
  assert.equal(result.persisted.matchrim_affinity, menu.compatibilidad);
  assert.equal(object(object(result.persisted.place_details).bodega_sensory_evidence).version, 2);
  const view = cellarAffinityView(result.reopened, snapshot);
  assert.equal(view.current, menu.compatibilidad); assert.equal(view.initial?.score, menu.compatibilidad);
  assert.equal(view.initial?.model, 'scan-local-l2-0to5-v2'); assert.equal(view.initial?.scale, scale);
  assert.deepEqual(view.initial?.profile, snapshot.profile);
  assert.deepEqual(withCellarInitialAffinity(result.reopened, { ...snapshot,
    profile: { potente: 5, acidez: 5, dulce: 5, tanico: 5, afrutado: 5 } }, 'first_verified'), result.reopened.place_details);
});
await check('Actual menu save with missing original sensory stays pending after Bodega reload', async () => {
  const missing = catalogWineFromVerifiedSheet(identity, { ...menuSheet, sensoryAttributes: null });
  const menu = applyMenuWineEvidence(menuInput, snapshot.profile, missing);
  assert.equal(menu.compatibilidad, null); assert.equal(menu.atributos, null);
  const result = await saveMenu(menu, snapshot);
  assert.equal(result.persisted.sensory_attributes, null); assert.equal(result.persisted.matchrim_affinity, null);
  assert.equal(readCellarSensoryEvidence(result.reopened), null);
  assert.equal(readCellarInitialAffinity(result.reopened), null);
  assert.equal(cellarAffinityView(result.reopened, snapshot).current, null);
  assert.equal(object(result.persisted.place_details).bodega_sensory_evidence, undefined);
});
await check('Actual menu save without a profile keeps exact v2 sensory but does not manufacture an initial score', async () => {
  const missing: ScanProfileSnapshot = { ...snapshot, profile: null, source: 'unavailable', status: 'missing' };
  const menu = applyMenuWineEvidence(menuInput, null, menuCatalog);
  const result = await saveMenu(menu, missing);
  assert.deepEqual(result.reopened.sensory_attributes, attributes);
  assert.equal(result.persisted.matchrim_affinity, null); assert.equal(readCellarInitialAffinity(result.reopened), null);
  assert.equal(cellarAffinityView(result.reopened, missing).current, null);
});
await check('Actual unmarked legacy menu save keeps the historical v1 model and score on Bodega reload', async () => {
  const attrs = { potencia: 2, acidez: 5, dulzura: 1, taninos: 1, afrutado: 4 };
  const profile: ScanProfileSnapshot = { ...snapshot, profile: { potente: 2, acidez: 3, dulce: 2, tanico: 1, afrutado: 5 } };
  const score = calculateLocalMatchrimAffinity(profile.profile, attrs);
  const menu: MenuScanWine = { ...menuInput, confidence: .95, dudas: [], canonicalId: 'SYN-LEGACY-MENU',
    sensorySource: 'catalog', atributos: attrs, compatibilidad: score, affinity_calibrated: true };
  const result = await saveMenu(menu, profile);
  assert.equal(score, 69); assert.deepEqual(result.reopened.sensory_attributes, attrs);
  assert.equal(result.persisted.matchrim_affinity, score);
  const view = cellarAffinityView(result.reopened, profile);
  assert.equal(view.current, score); assert.equal(view.initial?.score, score);
  assert.equal(view.initial?.model, 'scan-local-l2-v1'); assert.equal(view.initial?.version, 1);
  assert.equal(view.initial?.scale, undefined);
});
assert.equal(JSON.stringify(saved), before);
console.log(JSON.stringify({ checks, passed: true, remoteCalls: 0, realDatabaseWrites: 0,
  scope: 'Synthetic exact-scale Bodega contracts and actual MyWines/menu save bodies with in-memory dependencies; no migration, build or provider calls' }));
