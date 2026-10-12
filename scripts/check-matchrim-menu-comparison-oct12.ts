import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildWineComparisonDecision, type ComparableWine, type WineComparisonContext } from '../src/utils/wineComparison';
import { updateMenuWineEvidence } from '../src/utils/scanWineEvidence';
import type { MenuScanWine } from '../src/utils/wineMenuScan';

const wine = (id: string, service: ComparableWine['service'], price: number | null): ComparableWine => ({
  id, name: id, service, price, currency: 'EUR', affinity: null, confidence: 0.88, identityConfirmed: true,
});
const context: WineComparisonContext = { mode: 'service', priority: 'certainty', budget: 30, budgetCurrency: 'EUR', serviceFormat: 'any' };
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => {
  try { run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) }); }
};
const mixed = [wine('glass', 'glass', 12), wine('bottle', 'bottle', 25)];
const ambiguous = buildWineComparisonDecision(mixed, context);
check('Mixed serving units cannot verify a shared generic budget', () => assert.ok(ambiguous.ordered.every((w) => w.constraintStatus === 'unknown')));
check('Mixed serving units do not claim within budget', () => assert.ok(ambiguous.ordered.every((w) => !w.reasons.some((r) => r.startsWith('Dentro del presupuesto')))));
check('Mixed-unit budget choice remains provisional', () => assert.equal(ambiguous.actionability, 'provisional'));
const unknown = buildWineComparisonDecision([wine('known', 'bottle', 25), wine('unknown', null, 35)], context);
check('Unknown serving unit cannot complete shared price basis', () => assert.ok(unknown.ordered.every((w) => w.constraintStatus === 'unknown')));
const shared = buildWineComparisonDecision([wine('one', 'glass', 12), wine('two', 'glass', 25)], context);
check('Known same-format prices remain usable', () => assert.ok(shared.ordered.every((w) => w.constraintStatus === 'confirmed')));
const explicit = buildWineComparisonDecision(mixed, { ...context, serviceFormat: 'glass' });
check('Explicit glass selection never borrows bottle price', () => assert.equal(explicit.ordered.find((w) => w.wine.id === 'bottle')?.wine.price, null));
check('Explicit glass price remains12', () => assert.equal(explicit.ordered.find((w) => w.wine.id === 'glass')?.wine.price, 12));
const money = buildWineComparisonDecision([wine('eur', 'bottle', 25), { ...wine('gbp', 'bottle', 35), currency: 'GBP' }], { ...context, serviceFormat: 'bottle' });
check('Distinct currency never completes EUR budget', () => assert.equal(money.ordered.find((w) => w.wine.id === 'gbp')?.constraintStatus, 'unknown'));
const fixture = JSON.parse(readFileSync('qa/fixtures/menu-food-evidence-oct8.json', 'utf8'));
const original: MenuScanWine = fixture.cases[0].calls.find((call: { scan_region: { id: string } }) => call.scan_region.id === 'full').payload.vinos[6];
const edited = updateMenuWineEvidence(original, { nombre: 'Barolo' });
check('Manual identity keeps recorded price/service/currency', () => assert.deepEqual([edited.precio, edited.precios, edited.moneda, edited.servicio], [original.precio, original.precios, original.moneda, original.servicio]));
check('Manual identity clears numeric affinity', () => assert.equal(edited.compatibilidad, null));
check('Manual identity clears model sensory values', () => assert.equal(edited.atributos, null));
check('Manual identity clears confidence/canonical sheet', () => assert.deepEqual([edited.confidence, edited.canonicalId], [null, null]));
check('Manual identity remains explicitly pending', () => assert.ok(edited.dudas?.some((doubt) => doubt.includes('pendiente'))));
check('Unchanged identity is not invalidated', () => assert.deepEqual(updateMenuWineEvidence(original, { nombre: original.nombre }), original));
check('Notes editing does not invalidate identity', () => assert.equal(updateMenuWineEvidence(original, { descripcion: original.texto_fuente }).confidence, original.confidence));
check('Price editing alone does not invalidate identity', () => assert.equal(updateMenuWineEvidence(original, { precio: 25 }).confidence, original.confidence));
check('Explicit single-format manual price updates that format', () => assert.equal(updateMenuWineEvidence(original, { precio: 25 }).precios?.copa, 25));
console.log(JSON.stringify({ scope: 'Synthetic price-boundary contracts; amounts reused from recorded menu, no profile/sensory evidence', checks }, null, 2));
if (checks.some((c) => !c.passed)) process.exitCode = 1;
