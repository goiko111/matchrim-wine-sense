import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { confirmsMenuAction, menuCardIdentity, menuIntentChanges, type SavedMenuCard } from '../src/utils/menuWineActions';
import type { MenuScanWine } from '../src/utils/wineMenuScan';

const artifact = process.argv[2];
if (!artifact) throw new Error('Pass task06 artifact directory');
const receipt = JSON.parse(readFileSync(`${artifact}/before/results.json`, 'utf8')).results[0];
const payload = receipt.mutations[0].payload;
const card: SavedMenuCard = { rowId: receipt.rows[0].id, ownerId: payload.user_id, identity: 'exact-card-identity', payload };
const wine: MenuScanWine = JSON.parse(readFileSync('docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json', 'utf8')).bothContract.vinos[1];
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => {
  try { run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: String(error) }); }
};
check('Wishlist favorite changes only favorite, not state/history', () => assert.deepEqual(menuIntentChanges(card, 'wishlist', true), { is_favorite: true }));
const favorite = { ...card, payload: { ...payload, is_favorite: true } };
check('Favorite to tasted changes only status, never favorite=false', () => assert.deepEqual(menuIntentChanges(favorite, 'tasted', false), { status: 'tasted' }));
const tasted = { ...card, payload: { ...payload, status: 'tasted' } };
check('Favoriting a tasted declaration never sends wishlist', () => assert.deepEqual(menuIntentChanges(tasted, 'wishlist', true), { is_favorite: true }));
check('Repeated wishlist intent does not require a mutation', () => assert.deepEqual(menuIntentChanges(card, 'wishlist', false), {}));
check('Repeated tasted intent does not invent rating/feedback', () => assert.deepEqual(menuIntentChanges(tasted, 'tasted', false), {}));
check('Already favorite intent is an empty delta', () => assert.deepEqual(menuIntentChanges(favorite, 'wishlist', true), {}));
for (const [field, value] of [['nombre', wine.nombre + ' editado'], ['productor', 'otro productor'], ['anada', 2020], ['region', 'otra region'], ['pais', 'otro pais'], ['tipo', 'otro estilo'], ['uvas', ['otra uva']]] as Array<[string, unknown]>) {
  check(`Exact ${field} edit cannot silently retain bound identity`, () => assert.notEqual(menuCardIdentity(wine), menuCardIdentity({ ...wine, [field]: value })));
}
check('Price is not a global wine-identity key', () => assert.equal(menuCardIdentity(wine), menuCardIdentity({ ...wine, precio: 35 })));
const expected = { ...payload, is_favorite: true, status: 'tasted' };
const row = { ...expected, id: card.rowId, rating: null };
check('Same ID and frozen metadata confirm only requested combined intention', () => assert.equal(confirmsMenuAction(row, expected, card.rowId), true));
for (const [label, change] of [
  ['different row', { id: 'another-row' }], ['different owner', { user_id: 'another-owner' }],
  ['state loss', { status: 'wishlist' }], ['favorite loss', { is_favorite: false }],
  ['rating appeared', { rating: 'not_for_me' }], ['training appeared', { use_for_profile_training: true }],
  ['price overwrite', { price: 35 }],
  ['metadata loss', { place_details: { source: 'menu_scanner' } }],
] as Array<[string, Record<string, unknown>]>) {
  check(`${label} representation stays unconfirmed`, () => assert.equal(confirmsMenuAction({ ...row, ...change }, expected, card.rowId), false));
}
check('Missing/array response cannot certify a mutation', () => { assert.equal(confirmsMenuAction(null, expected, card.rowId), false); assert.equal(confirmsMenuAction([row], expected, card.rowId), false); });
const path = 'src/components/wine-import/WineMenuScanner.tsx';
const source = readFileSync(path, 'utf8');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map<string, ts.Expression>();
const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) declarations.set(node.name.text, node.initializer); ts.forEachChild(node, visit); };
visit(tree);
check('Active save uses indexed per-card ID ledger, not name dedup', () => {
  assert.ok(declarations.get('savedCardsRef')?.getText(tree).includes('new Map<number, SavedMenuCard>'));
  assert.ok(declarations.get('saveScannedWine')?.getText(tree).includes('savedCardsRef.current.get(index)'));
});
check('Active reset clears bound IDs/pending identity/holds', () => {
  const reset = declarations.get('resetSaveBatch')!.getText(tree);
  for (const key of ['savedCardsRef', 'pendingIdentitiesRef', 'identityHoldsRef']) assert.ok(reset.includes(`${key}.current.clear()`));
});
check('Active follow-up SDK mutation is owner AND exact row constrained', () => assert.ok(declarations.get('saveScannedWine')!.getText(tree).includes(".update(changes).eq('id', saved.rowId).eq('user_id', ownerId)")));
const result = { scope: 'Task06 pure intent/identity/readback contracts and active AST boundaries. Existing negative provenance receipt; no new OCR/user/catalog-positive sheet.', checks,
  sourceHashes: Object.fromEntries([path, 'src/utils/menuWineActions.ts', 'scripts/check-matchrim-menu-actions-oct12.ts'].map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')])) };
writeFileSync(`${artifact}/contracts.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter((c) => c.passed).length, total: checks.length, failures: checks.filter((c) => !c.passed) }));
if (checks.some((c) => !c.passed)) process.exitCode = 1;
