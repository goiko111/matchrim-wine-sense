import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { confirmedLabelCatalogIdentity95, confirmedMenuCatalogIdentity95 } from '../src/utils/confirmedCatalogIdentity95';
import { nativeWineConsumerResult } from '../src/utils/multiWineConsumer95';
import { nativeMenuWineAffinity } from '../src/utils/menuWineConsumer95';
import { lookupWinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import type { WineCandidate } from '../src/utils/multiWineScan';
import type { MenuScanWine } from '../src/utils/wineMenuScan';

const capture = JSON.parse(readFileSync(new URL('../qa-fixtures/consumer95/public-nv-catalogue.projected.json', import.meta.url), 'utf8'));
const result = await lookupWinerimOriginalSheet({ name: 'Manzanilla La Gitana', producer: 'Bodegas Hidalgo La Gitana' }, undefined, async url => {
  const row = capture.reads.find((value: { url: string }) => value.url === String(url));
  assert(row, 'Unexpected transport: no real fetch fallback');
  return new Response(JSON.stringify(row.body), { status: row.status, headers: { 'content-type': 'application/json' } });
});
assert.equal(result.status, 'verified');
if (result.status !== 'verified') throw new Error('Invalid recorded control');
const sheet = result.sheet;
const profile = { potente: 2, acidez: 4, dulce: 1, tanico: 0, afrutado: 1 };
const label: WineCandidate = { id: 'synthetic-region-candidate', name: 'Lectura incompleta', producer: null, vintage: 2021,
  region: null, country: null, grapes: [], alcohol: null, confidence: 0.4, source: 'inference', evidence: ['Lectura incompleta 2021'],
  uncertaintyReasons: ['No se lee la bodega'], inferredFields: ['nombre', 'producer', 'vintage'], sensoryAttributes: null, affinity: null };
const menu: MenuScanWine = { nombre: 'Pinot Grigio', productor: null, anada: null, region: null, pais: null,
  precio: 7, moneda: null, tipo: 'blanco', descripcion: null, texto_fuente: 'WHITE Pinot Grigio 7',
  campos_inferidos: ['nombre', 'productor', 'precio', 'servicio'], servicio: 'copa', precios: { copa: 7 }, atributos: null };
let groups = 0;
const check = (name: string, run: () => void) => { run(); groups++; console.log('PASS', name); };
check('A proposed label without confirmation remains pending and immutable', () => {
  assert.equal(nativeWineConsumerResult(label, profile).canExplainAffinity, false);
  assert.equal(label.name, 'Lectura incompleta');
  assert.equal(label.vintage, 2021);
});
check('Explicit selection replaces identity with the verified source, not a model completion', () => {
  const chosen = confirmedLabelCatalogIdentity95(label, sheet, profile)!;
  assert.equal(chosen.name, sheet.name); assert.equal(chosen.producer, sheet.producer);
  assert.equal(chosen.vintage, null, 'An NV selected reference must not borrow the photograph year');
  assert.equal(chosen.source, 'manual'); assert.deepEqual(chosen.inferredFields, []);
  assert.match(chosen.evidence.join(' '), /elegida por el usuario/);
  assert.equal(chosen.canonicalId, '278688'); assert.equal(chosen.originalSheet?.id, '278688');
});
check('Exact sensory zero survives the explicitly selected source and current affinity becomes explainable', () => {
  const chosen = confirmedLabelCatalogIdentity95(label, sheet, profile)!;
  assert.equal(chosen.sensoryAttributes?.taninos, 0);
  assert.equal(chosen.affinity, 93); assert.equal(nativeWineConsumerResult(chosen, profile).canExplainAffinity, true);
  assert.equal(nativeWineConsumerResult(chosen, { ...profile, potente: 5 }).canExplainAffinity, false);
});
check('A missing profile confirms identity only, without manufacturing a personal score', () => {
  const chosen = confirmedLabelCatalogIdentity95(label, sheet, null)!;
  assert.equal(chosen.canonicalId, '278688'); assert.equal(chosen.affinity, null);
  assert.equal(nativeWineConsumerResult(chosen, null).canExplainAffinity, false);
});
check('Menu selection preserves the literal receipt and price uncertainty, removing only replaced identity inferences', () => {
  const chosen = confirmedMenuCatalogIdentity95(menu, sheet, profile)!;
  assert.equal(chosen.nombre, sheet.name); assert.equal(chosen.texto_fuente, menu.texto_fuente);
  assert.equal(chosen.tipo, 'Sin tipo', 'Do not transfer the former proposed wine type to the selected reference');
  assert.equal(chosen.precio, 7); assert.equal(chosen.moneda, null);
  assert.deepEqual(chosen.campos_inferidos, ['precio', 'servicio']);
  assert.equal(chosen.atributos?.taninos, 0); assert.equal(chosen.compatibilidad, 93);
  assert.equal(nativeMenuWineAffinity(chosen, profile).state, 'ready');
  assert.match(chosen.dudas!.join(' '), /elegida por ti/);
});
check('Invalid or unverified original sheets cannot grant identity or affinity', () => {
  for (const invalid of [{ ...sheet, detailVerified: false }, { ...sheet, url: sheet.url!.replace('278688', '999') },
    { ...sheet, producer: null }]) {
    assert.equal(confirmedLabelCatalogIdentity95(label, invalid, profile), null);
    assert.equal(confirmedMenuCatalogIdentity95(menu, invalid, profile), null);
  }
});
check('A fiche without sensory data confirms identity but leaves all taste claims pending', () => {
  const incomplete = { ...sheet, sensoryAttributes: null };
  const chosen = confirmedLabelCatalogIdentity95(label, incomplete, profile)!;
  const chosenMenu = confirmedMenuCatalogIdentity95(menu, incomplete, profile)!;
  assert.equal(chosen.affinity, null); assert.equal(chosenMenu.compatibilidad, null);
  assert.equal(nativeWineConsumerResult(chosen, profile).canExplainAffinity, false);
  assert.equal(nativeMenuWineAffinity(chosenMenu, profile).state, 'pending');
});
check('Original input objects, original fiche and underlying formula are not mutated', () => {
  const before = JSON.stringify({ label, menu, sheet, profile });
  confirmedLabelCatalogIdentity95(label, sheet, profile); confirmedMenuCatalogIdentity95(menu, sheet, profile);
  assert.equal(JSON.stringify({ label, menu, sheet, profile }), before);
});
console.log(JSON.stringify({ groups, passed: true, transport: 'recorded public response projection', realCalls: 0,
  scope: 'Explicit user-confirmed catalogue adapter only; not automatic recognition or vintage verification.' }));
