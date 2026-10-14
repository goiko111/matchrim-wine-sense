import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { cellarAffinityView, cellarTrainingRows, confirmsCellarSaveEvidence, makeCellarCatalogEvidence,
  readCellarInitialAffinity, withCellarInitialAffinity } from '../src/utils/bodegaAffinity';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';
import { isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';
import { resolveMatchrimEdgeFunctionName } from '../src/utils/matchrimEdgeRouting';
import type { ScanProfileSnapshot } from '../src/utils/scanProfile';

const base = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
const snapshot: ScanProfileSnapshot = { profile: base, source: 'quiz', samples: 0, status: 'ready', note: 'Synthetic test.' };
const attributes = { potencia: 5, acidez: 3, dulzura: 1, taninos: 4, afrutado: 4 };
const identity = { name: 'QA84 Reference', producer: 'QA84 Producer', vintage: 2021, region: 'QA84 Region', country: 'QA84 Country' };
const evidence = makeCellarCatalogEvidence(identity, 'SYN-CATALOG-84', attributes);
const wine = { ...identity, sensory_attributes: attributes, place_details: { bodega_sensory_evidence: evidence } };
const saved = { ...wine, place_details: withCellarInitialAffinity(wine, snapshot, 'saved', '2026-10-14T10:00:00.000Z') };
const checks: string[] = [];
const check = (name: string, test: () => void) => { test(); checks.push(name); };
check('Initial/current use exact scanner model', () => {
  assert.equal(cellarAffinityView(saved, snapshot).current, calculateLocalMatchrimAffinity(base, attributes));
  assert.equal(readCellarInitialAffinity(saved)?.score, cellarAffinityView(saved, snapshot).current);
});
check('Evolution never rewrites initial', () => {
  const learned = calculateLearnedMatchrimProfile(base, [{ id: 'rating-84', rating: 'love', use_for_profile_training: true, sensory_attributes: attributes }]);
  const active = { ...snapshot, profile: learned.profile, source: 'learned' as const, samples: learned.samples };
  assert.notEqual(cellarAffinityView(saved, active).current, cellarAffinityView(saved, snapshot).current);
  assert.deepEqual(withCellarInitialAffinity(saved, active, 'first_verified'), saved.place_details);
});
check('Legacy score/inference cannot manufacture an initial', () => {
  assert.equal(cellarAffinityView({ ...wine, place_details: {}, matchrim_affinity: 99 } as typeof wine, snapshot).current, null);
});
check('Missing profile keeps history but current pending', () => {
  const view = cellarAffinityView(saved, { ...snapshot, profile: null, source: 'unavailable' });
  assert.equal(view.current, null); assert.ok(view.initial);
});
check('Identity and attributes invalidate signed evidence, even with legacy menu trace', () => {
  const details = { ...(saved.place_details as object), menu_wine_evidence: {
    version: 1, sensory_source: 'catalog', canonical_id: 'SYN-OLD', identity_confirmed: true,
  } };
  for (const edited of [{ vintage: 2020 }, { name: 'Other' }, { producer: 'Other' }, { sensory_attributes: { ...attributes, potencia: 1 } }]) {
    assert.equal(cellarAffinityView({ ...saved, ...edited, place_details: details }, snapshot).current, null);
  }
});
check('Readback requires identity, sensory and exact historical trace', () => {
  assert.equal(confirmsCellarSaveEvidence(JSON.parse(JSON.stringify(saved)), saved), true);
  assert.equal(confirmsCellarSaveEvidence({ ...saved, place_details: {} }, saved), false);
  assert.equal(confirmsCellarSaveEvidence({ ...saved, region: 'Other' }, saved), false);
  assert.equal(confirmsCellarSaveEvidence({ ...saved, sensory_attributes: null }, saved), false);
  const missing = { ...(saved.place_details as Record<string, unknown>) };
  delete missing.matchrim_affinity_initial;
  assert.equal(confirmsCellarSaveEvidence({ ...saved, place_details: missing }, saved), false);
});
check('Metadata edits never rejuvenate rating evidence', () => {
  const row = { ...saved, id: 'rating', rating: 'love' as const, use_for_profile_training: true,
    created_at: '2020-01-01', updated_at: '2026-10-14', place_details: { ...(saved.place_details as object), matchrim_rating_at: '2026-09-01T12:00:00Z' } };
  assert.deepEqual(cellarTrainingRows([row], true), cellarTrainingRows([{ ...row, updated_at: '2027-01-01' }], true));
  assert.equal(cellarTrainingRows([{ ...row, place_details: saved.place_details }], true)[0]?.updated_at, null);
  assert.equal(cellarTrainingRows([{ ...row, use_for_profile_training: false }], true).length, 0);
});
check('Partial producer cannot bind another winery', () => {
  assert.equal(isSafeCanonicalLabelMatch({ name: 'Mamba', producer: 'La Quinta', vintage: 2021 },
    { name: 'Mamba', producer: 'La Quinta Otra', vintage: 2021 }), false);
});
check('QA alias is explicit and production routing unchanged', () => {
  assert.equal(resolveMatchrimEdgeFunctionName('search-wines', 'qa84'), 'search-wines-qa84');
  assert.equal(resolveMatchrimEdgeFunctionName('search-wines', '75'), 'search-wines-v75');
  assert.equal(resolveMatchrimEdgeFunctionName('calculate-wine-affinity', '75'), 'calculate-wine-affinity-v73');
});
check('Native rating cannot invent a consumption timestamp', () => {
  const file = ts.createSourceFile('MyWines.tsx', readFileSync(new URL('../src/pages/MyWines.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const assignments: ts.BinaryExpression[] = [];
  const notNative = (node: ts.Expression): boolean => (
    ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken
      && ts.isIdentifier(node.operand) && node.operand.text === 'isNative'
  ) || (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    && (notNative(node.left) || notNative(node.right)));
  const visit = (node: ts.Node) => {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(node.left) && node.left.expression.getText(file) === 'updateData'
      && node.left.name.text === 'consumption_date') assignments.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.equal(assignments.length, 2);
  for (const node of assignments) {
    let guarded = false;
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isIfStatement(parent) && notNative(parent.expression)
        && parent.thenStatement.pos <= node.pos && node.end <= parent.thenStatement.end) guarded = true;
    }
    assert(guarded, 'Consumption date assignment must be inside the non-native branch');
  }
});
console.log(JSON.stringify({ scope: 'Synthetic contracts only; no users, photos, network or human-taste validation', passed: checks.length, checks }, null, 2));
