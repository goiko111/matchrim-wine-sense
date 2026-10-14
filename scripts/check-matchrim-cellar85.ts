import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { optionalScanNumber } from '../supabase/functions/_shared/matchrim-scan-values';
import { normalizeWineAttributesForInsight } from '../src/utils/wineAffinityExplanation';
import { cellarAffinityView, cellarTrainingRows, makeCellarCatalogEvidence, readCellarInitialAffinity,
  readCellarSensoryEvidence, withCellarInitialAffinity } from '../src/utils/bodegaAffinity';
import { readMenuPrice, hasStoredMenuCatalogEvidence } from '../src/utils/menuWineSave';
import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';

const source = readFileSync('src/pages/MyWines.tsx', 'utf8');
const ast = ts.createSourceFile('MyWines.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['normalizeAttributeTo5', 'normalizeSensoryAttributesTo5', 'normalizeAffinity', 'normalizeUserWine'];
const declarations = ast.statements.filter(statement => ts.isVariableStatement(statement)
  && statement.declarationList.declarations.some(declaration => names.includes(declaration.name.getText(ast))));
assert.equal(declarations.length, names.length);
const body = ts.transpileModule(declarations.map(declaration => declaration.getText(ast)).join('\n'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const normalize = (native: boolean) => new Function('Capacitor', 'optionalScanNumber', 'normalizeWineAttributesForInsight',
  'readMenuPrice', 'hasStoredMenuCatalogEvidence', 'readCellarSensoryEvidence', body + '\nreturn normalizeUserWine;')(
  { isNativePlatform: () => native }, optionalScanNumber, normalizeWineAttributesForInsight,
  readMenuPrice, hasStoredMenuCatalogEvidence, readCellarSensoryEvidence);
const native = normalize(true);
const web = normalize(false);
const profile = { potente: 2, acidez: 3, dulce: 2, tanico: 1, afrutado: 5 };
const snapshot = { profile, source: 'quiz' as const, status: 'ready' as const, samples: 0, note: 'Synthetic test profile' };
const identity = { name: 'Synthetic QA wine', producer: 'Synthetic producer', vintage: 2024, region: 'Synthetic region', country: 'Synthetic country' };
const attributes = { power: 2, acidity: 5, sweetness: 0, tannin: 0, fruity: 4 };
const row = { ...identity, sensory_attributes: attributes, rating: null, status: 'collection', quantity: 3, price: null,
  matchrim_affinity: null, use_for_profile_training: true,
  place_details: { bodega_sensory_evidence: makeCellarCatalogEvidence(identity, 'synthetic-catalog-85', attributes) } };
row.place_details = withCellarInitialAffinity(row, snapshot, 'saved', '2026-10-14T12:00:00.000Z') as typeof row.place_details;
const historical = JSON.stringify(readCellarInitialAffinity(row));
const loaded = native(row);
assert.deepEqual(loaded.sensory_attributes, { potencia: 2, acidez: 5, dulzura: 1, taninos: 1, afrutado: 4 });
assert.equal(cellarAffinityView(loaded, snapshot).current, 69);
assert.equal(JSON.stringify(readCellarInitialAffinity(loaded)), historical);
assert.equal(JSON.stringify(readCellarInitialAffinity(native(loaded))), historical);
assert.equal(JSON.stringify(readCellarInitialAffinity(row)), historical);
assert.equal(web(row).sensory_attributes, null, 'Legacy web English-alias behavior unchanged');
assert.deepEqual(web(loaded).sensory_attributes, loaded.sensory_attributes, 'Legacy Spanish web normalization unchanged');
assert.equal(native({ ...row, sensory_attributes: { ...attributes, acidity: null } }).sensory_attributes, null);
assert.equal(native({ ...row, sensory_attributes: { ...attributes, acidity: -1 } }).sensory_attributes, null);
assert.equal(native({ ...row, name: 'A different wine' }).sensory_attributes, null);
assert.equal(native({ ...row, vintage: 2023 }).sensory_attributes, null);
assert.equal(cellarAffinityView(loaded, { ...snapshot, profile: null, status: 'missing', source: 'unavailable' }).current, null);
const rated = { ...row, id: 'synthetic-row-85', rating: 'love' as const,
  place_details: { ...row.place_details, matchrim_rating_at: '2026-10-14T12:30:00.000Z' } };
const rowsBefore = JSON.stringify(rated);
const training = cellarTrainingRows([rated], true);
assert.equal(training.length, 1);
assert.deepEqual(training[0].sensory_attributes, loaded.sensory_attributes);
assert.ok(readCellarSensoryEvidence(training[0] as typeof row));
const learned = calculateLearnedMatchrimProfile(profile, training);
assert.equal(learned.samples, 1);
assert.equal(cellarAffinityView(loaded, { ...snapshot, source: 'learned', profile: learned.profile, samples: 1 }).current, 76);
assert.equal(JSON.stringify(readCellarInitialAffinity(loaded)), historical);
assert.equal(JSON.stringify(rated), rowsBefore);
assert.deepEqual(cellarTrainingRows([rated], false), [rated], 'Non-strict web training unchanged');
assert.equal(cellarTrainingRows([{ ...rated, use_for_profile_training: false }], true).length, 0);
assert.equal(cellarTrainingRows([{ ...rated, name: 'Changed identity' }], true).length, 0);
assert.equal(calculateLearnedMatchrimProfile(profile, cellarTrainingRows([{ ...rated, rating: null }], true)).samples, 0);
console.log(JSON.stringify({ groups: 9, assertions: 23, passed: true,
  scope: 'Actual MyWines normalization body; synthetic rows, no SQL/vision/human claims', initial: 69, webLegacyPreserved: true }));
