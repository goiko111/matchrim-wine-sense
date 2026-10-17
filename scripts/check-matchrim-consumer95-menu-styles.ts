import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { isLiteralWineStyle95, isNativeWineMenuItem95 } from '../src/utils/menuLiteralStyle95';
import { isWineMenuItem, type WineMenuIdentityFields } from '../src/utils/wineMenuGrounding';
import { hasSpecificWineIdentity } from '../supabase/functions/_shared/matchrim-menu-grounding';
import { canResolveMenuCatalogIdentity, isMenuIdentityConfirmed, type MenuScanWine } from '../src/utils/wineMenuScan';
import { nativeMenuWineAffinity } from '../src/utils/menuWineConsumer95';

const { values } = parseArgs({ options: { trace: { type: 'string' }, controls: { type: 'string' } } });
const fixtures = new URL('../qa-fixtures/consumer95/', import.meta.url);
const provenance = JSON.parse(readFileSync(new URL('public-mixed-drinks.provenance.json', fixtures), 'utf8'));
const tracePath = values.trace ?? fileURLToPath(new URL('public-mixed-drinks.payload.json', fixtures));
const controlsPath = values.controls ?? fileURLToPath(new URL('public-mixed-drinks.controls.json', fixtures));
const traceBytes = readFileSync(tracePath), controlsBytes = readFileSync(controlsPath);
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
if (!values.trace) assert.equal(sha(traceBytes), provenance.files['public-mixed-drinks.payload.json'], 'Frozen public payload integrity');
if (!values.controls) assert.equal(sha(controlsBytes), provenance.files['public-mixed-drinks.controls.json'], 'Frozen literal control integrity');
const trace = JSON.parse(traceBytes.toString());
const capture = trace.find((r: { function: string; status: number }) => r.function === 'scan-wine-menu-v72' && r.status === 200);
assert(capture, 'Use the existing successful receipt, never a new scan');
const capturedRows = capture.payload.vinos as MenuScanWine[];
const control = JSON.parse(controlsBytes.toString()).cases.find((c: { id: string }) => c.id === 'mixed-drinks');
assert(control);
type Case95 = { label: string; input: WineMenuIdentityFields };
const row = (nombre: string, seccion = 'WINES', tipo = 'vino', texto_fuente = `${seccion} | ${nombre} | 175ml 5.5 250ml 7 BTL 19`): WineMenuIdentityFields =>
  ({ nombre, productor: null, seccion, tipo, texto_fuente });
const positives: Case95[] = [
  ...['Merlot', 'Shiraz', 'Pinot Grigio', 'Prosecco', 'Blush Pinot Grigio', 'Cabernet Sauvignon', 'Cabernet Franc', 'Pinot Noir', 'Pinot Gris',
    'Chenin Blanc', 'Sauvignon Blanc', 'Tempranillo', 'Garnacha', 'Malbec', 'Albarino', 'Riesling', 'Syrah', 'Viognier',
    'Assyrtiko', 'Touriga Nacional', 'Nero d\u2019Avola', 'M\u00fcller-Thurgau', 'Xarel\u00b7lo', 'Gew\u00fcrztraminer']
    .map(name => ({ label: name, input: row(name) })),
  { label: 'literal accented rose modifier', input: row('Pinot Grigio Ros\u00e9', 'ROS\u00c9', 'rosado') },
  { label: 'two explicit modifiers', input: row('Dry Ros\u00e9 Sauvignon Blanc', 'WHITE WINES', 'blanco') },
  { label: 'off-dry exact phrase', input: row('Off-dry Riesling') },
  { label: 'family and dryness', input: row('Prosecco Extra Dry', 'FIZZ', 'espumoso') },
  { label: 'complete sparkling family', input: row('Cava Brut Nature', 'SPARKLING', 'espumoso') },
  { label: 'multiword dryness prefix', input: row('Demi-sec Champagne', 'SPARKLING', 'espumoso') },
  { label: 'fortified style', input: row('Palo Cortado', 'FORTIFIED', 'generoso') },
  { label: 'no API category guess needed when source says wine', input: { nombre: 'Merlot', texto_fuente: 'Wine list | Merlot 7' } },
  { label: 'section and price shared by two complete grapes', input: row('Shiraz', 'RED', 'tinto', '175ml / 250ml / BTL | RED 5.5 7 19 | Merlot / Shiraz') },
  { label: 'ordinary by-the-glass heading', input: row('Chardonnay', 'Wines by the glass', 'wine', 'Wines by the glass | Chardonnay 7 EUR') },
  { label: 'decomposed accent and whitespace', input: row('  Albari\u006e\u0303o  ', 'VINOS', 'vino', 'VINOS | ALBARI\u00d1O 7') },
];
const negatives: Case95[] = [
  ...['PINOT', 'Cabernet', 'Sauvignon', 'Blush', 'Dry', 'Rose', 'Wine', 'Vino', 'House wine', 'House Merlot',
    'Chateau', 'Cha', 'Chate', 'Chateau Merlot', 'Domaine Pinot Grigio', 'Cuvee', 'Cuvee Especial', 'Reserva', 'Brut',
    'Merlot Reserva', 'Prosecco DOC', 'Pinot label 2', 'Pinot 2', 'Merlot?', 'Merlot...', 'Wine (1)', 'Wine (Merlot)',
    'Merlot desconocido', 'Merlot sauce', 'Merlot / Shiraz', 'Cabernet / Sauvignon']
    .map(name => ({ label: 'not complete literal style: ' + name, input: row(name) })),
  { label: 'missing source is not replaced by the candidate', input: { nombre: 'Merlot', tipo: 'vino', seccion: 'WINES' } },
  { label: 'inferred type alone is not source category support', input: row('Merlot', '', 'tinto', 'Merlot 7') },
  { label: 'section not actually printed in source', input: row('Merlot', 'RED', 'tinto', 'WINES | Merlot 7') },
  { label: 'header field without any literal source context', input: row('Pinot Grigio', 'WHITE', 'blanco', 'Pinot Grigio 7') },
  { label: 'name modifier cannot supply its own category', input: row('Ros\u00e9 Pinot Grigio', '', '', 'Ros\u00e9 Pinot Grigio 7') },
  { label: 'whole name absent', input: row('Dry Pinot Grigio', 'WHITE', 'blanco', 'WHITE | Pinot Grigio 7') },
  { label: 'only a grape fragment visible', input: row('Pinot Grigio', 'WHITE', 'blanco', 'WHITE | PINOT 7') },
  { label: 'shared tokens but not the full phrase', input: row('Pinot Grigio', 'WHITE', 'blanco', 'WHITE | Pinot Noir / Grigio 7') },
  { label: 'word-prefix boundary', input: row('Merlot', 'RED', 'tinto', 'RED | Merlotville 7') },
  { label: 'word-suffix boundary', input: row('Merlot', 'RED', 'tinto', 'RED | Supermerlot 7') },
  { label: 'Unicode lookalike is not the literal varietal', input: row('Merlot', 'RED', 'tinto', 'RED | Merl\u043et 7') },
  { label: 'asserted producer even if visible', input: { ...row('Merlot', 'WINES', 'wine', 'WINES | Merlot Acme 7'), productor: 'Acme' } },
  { label: 'asserted placeholder producer', input: { ...row('Merlot'), productor: 'unknown' } },
  { label: 'hidden producer in row text', input: row('Merlot', 'WINES', 'wine', 'WINES | Merlot Acme 7') },
  { label: 'producer link in source', input: row('Merlot', 'WINES', 'wine', 'WINES | Merlot by Acme 7') },
  { label: 'source with winery marker', input: row('Merlot', 'WINES', 'wine', 'WINES | Chateau Merlot 7') },
  { label: 'source with unnamed cuvee', input: row('Merlot', 'WINES', 'wine', 'WINES | Merlot Cuvee Speciale 7') },
  { label: 'beer section cannot be overridden by wine type', input: row('Merlot', 'BEER', 'tinto', 'BEER | Merlot 7') },
  { label: 'beer source prefix with false wine section', input: row('Merlot', 'RED', 'tinto', 'RED | Beer Merlot 7') },
  { label: 'mixed whole-page source is not a bounded wine row', input: row('Merlot', 'WINES', 'vino', 'BEER Peroni 4.5 | WINES Merlot 7') },
  { label: 'non-wine API category', input: row('Merlot', 'WINES', 'beer') },
  { label: 'cooking information is not a beverage row', input: row('Merlot', 'WINES', 'wine', 'WINES | Merlot for cooking 7') },
  { label: 'food ingredient in source', input: row('Merlot', 'WINES', 'wine', 'WINES | Merlot sauce with steak 7') },
  { label: 'vinegar in source', input: row('Merlot', 'WINES', 'wine', 'WINES | Merlot vinegar 7') },
  { label: 'tea using a wine-style homonym', input: row('Manzanilla', 'WINES', 'wine', 'WINES | Manzanilla tea 7') },
  { label: 'cocktail ingredient', input: row('Prosecco', 'WINES', 'wine', 'WINES | Prosecco Aperol soda 7') },
  { label: 'food section, even with misleading wine word', input: row('Merlot', 'FOOD', 'wine', 'FOOD | Wine Merlot sauce 7') },
  { label: 'unbounded source', input: row('Merlot', 'WINES', 'wine', 'WINES | Merlot ' + '7 '.repeat(4000)) },
];
let assertions = 0;
const receipts: unknown[] = [];
const check = (name: string, fn: () => void) => { fn(); assertions++; console.log('PASS', name); };

for (const c of positives) check('literal style accepted: ' + c.label, () => {
  const before = JSON.stringify(c.input);
  assert.equal(isLiteralWineStyle95(c.input), true);
  assert.equal(isNativeWineMenuItem95(c.input), true);
  assert.equal(JSON.stringify(c.input), before);
  receipts.push({ class: 'positive', label: c.label, input: c.input, literalStyle: true, classification: 'literal-generic-style', requiredStage: 'pending' });
});
for (const c of negatives) check('literal exception rejected: ' + c.label, () => {
  assert.equal(isLiteralWineStyle95(c.input), false);
  assert.equal(isNativeWineMenuItem95(c.input), isWineMenuItem(c.input), 'Do not silently rewrite the legacy branch');
  receipts.push({ class: 'negative', label: c.label, input: c.input, literalStyle: false, legacy: isWineMenuItem(c.input) });
});

check('Captured 13 format rows / five literal names replay without new recognition', () => {
  assert.equal(capturedRows.length, 13);
  assert.deepEqual([...new Set(capturedRows.map(r => r.nombre))].sort(), control.rows.map((r: { literal_name: string }) => r.literal_name).sort());
  assert.equal(capturedRows.filter(isLiteralWineStyle95).length, 13);
  assert.equal(capturedRows.filter(isNativeWineMenuItem95).length, 13);
});
check('Legacy remains false for four generic names, unchanged three raw Blush format rows', () => {
  for (const name of ['Pinot Grigio', 'Merlot', 'Shiraz', 'Prosecco']) {
    assert(capturedRows.filter(r => r.nombre === name).every(r => !isWineMenuItem(r)));
  }
  assert.equal(capturedRows.filter(isWineMenuItem).length, 3);
  assert(capturedRows.filter(isWineMenuItem).every(r => r.nombre === 'Blush Pinot Grigio'));
});
check('Captured generic rows have no canonical identity, lookup eligibility, verified sensory score or confirmed-save gate', () => {
  const before = JSON.stringify(capturedRows);
  const profile = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
  for (const r of capturedRows) {
    assert.equal(r.productor, null); assert.equal(r.anada, null); assert(!r.canonicalId); assert(!r.originalSheet);
    assert.equal(canResolveMenuCatalogIdentity(r), false);
    assert.equal(isMenuIdentityConfirmed(r), false);
    const affinity = nativeMenuWineAffinity(r, profile);
    assert.equal(affinity.state, 'pending'); assert.equal('score' in affinity, false);
    const literal = isLiteralWineStyle95(r);
    // Parent must classify this branch BEFORE any confidence-based identity fallback.
    const stage = literal ? 'generic-pending' : isMenuIdentityConfirmed(r) ? 'confirmed' : 'pending';
    assert.equal(stage, 'generic-pending');
    receipts.push({ class: 'captured-row', name: r.nombre, price: r.precio, service: r.servicio, format: (r as unknown as { formato?: string }).formato ?? null,
      legacy: isWineMenuItem(r), literalStyle: literal, nativeIncluded: isNativeWineMenuItem95(r), classification: 'literal-generic-style', requiredStage: stage,
      producer: r.productor, vintage: r.anada, canonicalId: r.canonicalId ?? null, identityConfirmed: false, catalogLookupEligible: false,
      affinityState: affinity.state, score: null, confirmedSaveAllowed: false,
      inferredFieldsUnchanged: r.campos_inferidos, source: r.texto_fuente });
  }
  assert.equal(JSON.stringify(capturedRows), before);
});
check('Literal-first staging contract prevents confidence-only promotion; actual score guard still rejects inferred attributes', () => {
  for (const r of capturedRows) {
    const untrusted = { ...r, confidence: 0.99, dudas: [], campos_inferidos: [], compatibilidad: 99 };
    assert.equal(isLiteralWineStyle95(untrusted), true);
    assert.equal(isLiteralWineStyle95(untrusted) ? 'generic-pending' : 'other', 'generic-pending');
    assert.equal(nativeMenuWineAffinity(untrusted, { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 }).state, 'pending');
  }
});
check('C controls remain partial identity evidence: ten price cells / four blocks, no currency or guessed FIZZ glasses', () => {
  assert.equal(control.evaluation, 'literal_controls_only'); assert.equal(control.currency_iso, null);
  assert.equal(control.price_groups.length, 4);
  assert.equal(control.price_groups.flatMap((g: { prices: { value: number | null }[] }) => g.prices).filter((p: { value: number | null }) => p.value != null).length, 10);
  assert.deepEqual(control.price_groups.find((g: { id: string }) => g.id === 'red').applies_to, ['merlot', 'shiraz']);
  assert.equal(control.price_groups.find((g: { id: string }) => g.id === 'fizz').prices.filter((p: { value: number | null }) => p.value == null).length, 2);
  assert(capturedRows.every(r => r.moneda == null));
  assert(capturedRows.filter(r => ['Merlot', 'Shiraz'].includes(r.nombre)).every(r => r.campos_inferidos?.includes('precio')));
  for (const nombre of control.excluded_literal_names_from_wine_identity) assert.equal(isLiteralWineStyle95(row(nombre)), false);
});
check('Named wine is not reclassified as a literal style; native OR retains existing inclusion only', () => {
  const named = { nombre: 'Chateau Synthetic95', productor: 'Synthetic Winery95', tipo: 'tinto', seccion: 'RED',
    texto_fuente: 'RED | Chateau Synthetic95 Synthetic Winery95 20' };
  assert.equal(isLiteralWineStyle95(named), false); assert.equal(isWineMenuItem(named), true); assert.equal(isNativeWineMenuItem95(named), true);
});
check('Null, malformed names and empty objects fail the literal exception without guessing', () => {
  for (const input of [null, {}, { nombre: 2 }, { ...row('Merlot'), productor: 5 }, { nombre: '', texto_fuente: 'WINES Merlot' }]) {
    assert.equal(isLiteralWineStyle95(input as WineMenuIdentityFields), false);
  }
});
check('Existing distinctive identity helper remains a separate, unchanged concept', () => {
  for (const name of ['Pinot Grigio', 'Merlot', 'Shiraz', 'Prosecco']) assert.equal(hasSpecificWineIdentity(name), false);
  assert.equal(isLiteralWineStyle95(capturedRows.find(r => r.nombre === 'Blush Pinot Grigio')!), true);
});
console.log(JSON.stringify({ passed: true, groups: assertions, positiveCases: positives.length, negativeCases: negatives.length,
  portableDefaults: { trace: !values.trace, controls: !values.controls },
  recordedPublicEvidence: { traceSha256: provenance.originalTrace.sha256, controlsSha256: provenance.originalControls.sha256,
    scope: provenance.scope, note: 'Provenance applies to the bundled default projection; explicit replay paths are hashed separately below.' },
  trace: { path: tracePath, sha256: sha(traceBytes), receiptRows: 13, literalStyles: 5, retainedRows: 13, legacyRawRows: 3 },
  controls: { path: controlsPath, sha256: sha(controlsBytes), scope: control.annotation_scope, numericPriceCells: 10, priceBlocks: 4, currency: null },
  receipts, realCalls: 0, modelCalls: 0, productionWrites: 0, integration: 'Parent must use literal-style branch first and keep pending; inclusion is not identity, score or confirmed-save permission.',
  limits: 'Receipt replay only, not new extraction or consumer QA. Closed complete-name vocabulary, source-boundary/category/context proof; partial/unlisted/brand/mixed-page evidence fails closed. Composite intentionally preserves existing legacy behavior.' }));
