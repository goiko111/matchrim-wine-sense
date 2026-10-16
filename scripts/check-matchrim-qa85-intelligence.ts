import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { calculateLocalMatchrimAffinity, buildDetailedAffinityExplanation, readStoredMatchrimProfile, normalizeWineAttributesForInsight } from '../src/utils/wineAffinityExplanation';
import { readMatchrimLocalProfile } from '../src/utils/matchrimLocalProfile';
import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';
import { calculateEdgeLearnedProfileAudit } from '../supabase/functions/_shared/matchrim-learning';
import { cellarAffinityView, cellarTrainingRows, makeCellarCatalogEvidence, readCellarSensoryEvidence, withCellarInitialAffinity } from '../src/utils/bodegaAffinity';
import type { Json } from '../src/integrations/supabase/types';
import type { MatchrimProfileLike } from '../src/utils/matchrimPassport';
import type { ScanProfileSnapshot } from '../src/utils/scanProfile';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profileSource = readFileSync(resolve(root, 'src/pages/Profile.tsx'), 'utf8');
const file = ts.createSourceFile('Profile.tsx', profileSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['clampProfileValue', 'normalizeProfileForDisplay', 'normalizeProfileForClassifier', 'selectProfileWineQuery'];
const declarations: string[] = [];
const found: string[] = [];
for (const statement of file.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name) && names.includes(declaration.name.text)) {
      declarations.push('const ' + declaration.getText(file) + ';'); found.push(declaration.name.text);
    }
  }
}
type ProfileHelpers = {
  normalizeProfileForDisplay: (profile: MatchrimProfileLike, preserve?: boolean) => MatchrimProfileLike;
  normalizeProfileForClassifier: (profile: MatchrimProfileLike) => MatchrimProfileLike;
  selectProfileWineQuery: (profile: MatchrimProfileLike, native: boolean) => MatchrimProfileLike;
};
const functions: ProfileHelpers = new Function(ts.transpileModule(
  declarations.join('\n') + '\nreturn {' + found.join(',') + '};',
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText)();
let queryArgument: string | null = null;
const visit = (node: ts.Node) => {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'fetchWinesByAttributes') {
    assert.equal(queryArgument, null, 'Exactly one Profile wine-query callsite');
    queryArgument = node.arguments[0].getText(file);
  }
  ts.forEachChild(node, visit);
};
visit(file);
assert(queryArgument, 'Actual production query callsite found');
const queryProfile = (profile: MatchrimProfileLike, native: boolean) => queryArgument === 'wineQueryProfile'
  ? functions.selectProfileWineQuery(profile, native)
  : functions.normalizeProfileForClassifier(profile);

const checks: Array<{ id: string; passed: boolean; actual?: string }> = [];
const check = (id: string, test: () => void) => {
  try { test(); checks.push({ id, passed: true }); }
  catch (error) { checks.push({ id, passed: false, actual: error instanceof Error ? error.message : String(error) }); }
};
const keys = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const profile = { potente: 2.4, acidez: 4.6, dulce: .4, tanico: 0, afrutado: 3.2 };
const attributes = { potencia: 2, acidez: 5, dulzura: 1, taninos: 1, afrutado: 4 };
check('Native query preserves the actual continuous learned profile', () => assert.deepEqual(queryProfile(profile, true), profile));
check('Web query preserves legacy classifier rounding and minimum1', () => assert.deepEqual(queryProfile(profile, false),
  { potente: 2, acidez: 5, dulce: 1, tanico: 1, afrutado: 3 }));
check('Passport classifier remains deliberately rounded for both surfaces', () => assert.deepEqual(functions.normalizeProfileForClassifier(profile),
  { potente: 2, acidez: 5, dulce: 1, tanico: 1, afrutado: 3 }));
check('Native display preserves known0.4 and0', () => assert.deepEqual(functions.normalizeProfileForDisplay(profile, true), profile));
check('Web display preserves its existing minimum1', () => assert.deepEqual(functions.normalizeProfileForDisplay(profile, false),
  { potente: 2.4, acidez: 4.6, dulce: 1, tanico: 1, afrutado: 3.2 }));
check('Native query/helper and effect dependencies are wired to the actual callsite', () => {
  assert.equal(queryArgument, 'wineQueryProfile');
  assert.match(profileSource, /selectProfileWineQuery\(activeProfile, Capacitor\.isNativePlatform\(\)\)/);
  assert.match(profileSource, /\[wineQueryProfile, learnedProfile\?\.confidence, profileWinerimRetryKey\]/);
  assert.match(profileSource, /normalizeProfileForDisplay\(activeProfile, Capacitor\.isNativePlatform\(\)\)/);
  assert.match(profileSource, /normalizeProfileForDisplay\(currentProfile, Capacitor\.isNativePlatform\(\)\)/);
});

const wine = { name: 'Synthetic QA85 fixture', producer: 'Synthetic', vintage: 2021,
  region: 'Synthetic', country: 'Synthetic', sensory_attributes: attributes, place_details: {} as Json };
wine.place_details = { fixture: true, bodega_sensory_evidence: makeCellarCatalogEvidence(wine, 'SYN-QA85', attributes) };
const snapshot: ScanProfileSnapshot = { profile, source: 'learned', samples: 3, status: 'ready', note: 'Synthetic, not live account.' };
wine.place_details = withCellarInitialAffinity(wine, snapshot, 'saved', '2026-10-14T12:00:00.000Z');
check('Native Profile/Home/Cellar use identical continuous input and actual scoring', () => {
  assert.equal(calculateLocalMatchrimAffinity(queryProfile(profile, true), attributes), calculateLocalMatchrimAffinity(profile, attributes));
  assert.equal(cellarAffinityView(wine, snapshot).current, calculateLocalMatchrimAffinity(profile, attributes));
});
check('Initial affinity is never rewritten by a later learned profile', () => {
  const learned = calculateLearnedMatchrimProfile(profile, [{ id: 'synthetic-rating', rating: 'love',
    use_for_profile_training: true, sensory_attributes: attributes }]);
  assert.deepEqual(withCellarInitialAffinity(wine, { ...snapshot, profile: learned.profile }, 'first_verified'), wine.place_details);
});
const legacy = { ...wine, id: 'legacy-synthetic', rating: 'love' as const, use_for_profile_training: true,
  place_details: { fixture: true, menu_wine_evidence: { version: 1, sensory_source: 'catalog',
    identity_confirmed: true, canonical_id: 'SYN-LEGACY' } } };
check('Legacy menu proof without identity/attribute binding abstains without rewriting data', () => {
  const before = structuredClone(legacy);
  assert.equal(readCellarSensoryEvidence(legacy), null);
  assert.equal(cellarAffinityView(legacy, snapshot).current, null);
  assert.equal(cellarTrainingRows([legacy], true).length, 0);
  assert.equal(readCellarSensoryEvidence({ ...legacy, name: 'Changed identity' }), null);
  assert.equal(readCellarSensoryEvidence({ ...legacy, sensory_attributes: { ...attributes, potencia: 5 } }), null);
  assert.deepEqual(legacy, before);
});
check('Web training retains legacy rows; valid current bound evidence still works', () => {
  assert.deepEqual(cellarTrainingRows([legacy], false), [legacy]);
  const verified = { ...legacy, place_details: { ...legacy.place_details, ...(wine.place_details as Record<string, Json>) } };
  assert.deepEqual(readCellarSensoryEvidence(verified), attributes);
  assert.equal(cellarTrainingRows([verified], true).length, 1);
});
let raw: string | null = JSON.stringify(profile);
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => raw } });
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: globalThis.localStorage } });
check('Native reader matches existing scan reader for fractional0..5', () => assert.deepEqual(readMatchrimLocalProfile(true), readStoredMatchrimProfile()));
check('Web reader remains legacy integer-normalized', () => assert.deepEqual(readMatchrimLocalProfile(false),
  { potente: 2, acidez: 5, dulce: 1, tanico: 0, afrutado: 3 }));
check('Reader selects native behavior at the production default callsite', () => assert.match(
  readFileSync(resolve(root, 'src/utils/matchrimLocalProfile.ts'), 'utf8'), /preserveContinuous = Capacitor\.isNativePlatform\(\)/));
for (const key of keys) {
  check('Native invalid base rejects ' + key, () => {
    raw = JSON.stringify({ ...profile, [key]: -1 }); assert.equal(readMatchrimLocalProfile(true), null);
    raw = JSON.stringify({ ...profile, [key]: null }); assert.equal(readMatchrimLocalProfile(true), null);
  });
}
for (const key of ['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado'] as const) {
  for (const value of [-1, NaN, Infinity, -Infinity]) {
    check('Affinity invalid sensory rejects ' + key + '=' + String(value), () => {
      const invalid = { ...attributes, [key]: value };
      assert.equal(calculateLocalMatchrimAffinity(profile, invalid), null);
      assert.equal(makeCellarCatalogEvidence(wine, 'SYN-QA85', invalid), null);
    });
  }
}
check('Detailed explanation rejects nonfinite score and limits invalid identity confidence', () => {
  const result = buildDetailedAffinityExplanation(profile, attributes, { score: NaN, identificationConfidence: Infinity })!;
  assert.equal(result.score, null); assert.equal(result.scoreRange, null);
  assert.equal(result.confidence, 0); assert.equal(result.identificationConfidence, 0);
});
check('Legacy positive sensory scales remain compatible', () => {
  const integer = { potencia: 2, acidez: 4, dulzura: 1, taninos: 2, afrutado: 4 };
  const scale10 = Object.fromEntries(Object.entries(integer).map(([k,v]) => [k,v*2]));
  const scale100 = Object.fromEntries(Object.entries(integer).map(([k,v]) => [k,v*20]));
  // Scale10 values <=5 were historically ambiguous and are intentionally unchanged.
  assert.equal(calculateLocalMatchrimAffinity(profile, scale100), calculateLocalMatchrimAffinity(profile, integer));
  assert.deepEqual(normalizeWineAttributesForInsight(scale10), { potente: 4, acidez: 4, dulce: 2, tanico: 4, afrutado: 4 });
});
for (const immutable of ['src/data/quizData.ts']) {
  check('No model/quiz change: ' + immutable, () => assert.equal(readFileSync(resolve(root, immutable), 'utf8'),
    execFileSync('git', ['-C', root, 'show', '598dda8:' + immutable], { encoding: 'utf8' })));
}
for (const guarded of ['src/utils/matchrimLearning.ts', 'supabase/functions/_shared/matchrim-learning.ts']) {
  check('Historical negative guard retained; explicit client scale94 is separately fingerprinted: ' + guarded, () => {
    const original = execFileSync('git', ['-C', root, 'show', '598dda8:' + guarded], { encoding: 'utf8' });
    const oldGuard = 'if (numeric === null) return null;';
    assert.equal(original.split(oldGuard).length, 2, 'Exactly one baseline guard');
    const expected = original.replace(oldGuard, 'if (numeric === null || numeric < 0) return null;');
    assert.equal(execFileSync('git', ['-C', root, 'show', '71ac7eb:' + guarded], { encoding: 'utf8' }), expected);
    assert.equal(readFileSync(resolve(root, guarded), 'utf8'), guarded.startsWith('src/')
      ? execFileSync('git', ['-C', root, 'show', 'f66edd6:' + guarded], { encoding: 'utf8' }) : expected);
  });
}
for (const key of ['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado'] as const) {
  for (const value of [-1, NaN, Infinity, -Infinity]) {
    check('Client/Edge learning abstain for invalid ' + key + '=' + String(value), () => {
      const row = { id: 'synthetic-negative', rating: 'love' as const, use_for_profile_training: true,
        sensory_attributes: { ...attributes, [key]: value } };
      const client = calculateLearnedMatchrimProfile(profile, [row]);
      const edge = calculateEdgeLearnedProfileAudit(profile, [row]);
      assert.equal(client.samples, 0); assert.equal(edge.samples, 0);
      assert.deepEqual(client.profile, profile); assert.deepEqual(edge.profile, profile);
    });
  }
}
console.log(JSON.stringify({ scope: 'Actual production pure functions + actual Profile query callsite AST; synthetic inputs only; no mocks claiming live UI/DB',
  actualQueryArgument: queryArgument, checks, passed: checks.filter(c => c.passed).length,
  failed: checks.filter(c => !c.passed).length, sourceHashes: Object.fromEntries([
    'src/pages/Profile.tsx', 'src/utils/matchrimLocalProfile.ts', 'src/utils/wineAffinityExplanation.ts',
    'src/utils/bodegaAffinity.ts', 'src/utils/matchrimLearning.ts', 'supabase/functions/_shared/matchrim-learning.ts',
  ].map(p => [p, createHash('sha256').update(readFileSync(resolve(root, p))).digest('hex')])) }, null, 2));
process.exitCode = checks.some(c => !c.passed) ? 1 : 0;
