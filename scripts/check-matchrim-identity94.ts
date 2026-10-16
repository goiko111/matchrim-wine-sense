import assert from 'node:assert/strict';
import { catalogWineFromVerifiedSheet, isVerifiedWinerimSheetForIdentity, lookupWinerimOriginalSheet,
  type WinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import { isSafeCanonicalLabelMatch, hasAmbiguousCanonicalMatches } from '../src/utils/winerimLabelIdentity';
import { applyScanWineEvidence, applyMenuWineEvidence, updateMenuWineEvidence } from '../src/utils/scanWineEvidence';
import { canResolveMenuCatalogIdentity, isMenuIdentityConfirmed, type MenuScanWine } from '../src/utils/wineMenuScan';
import { refreshMenuProfileAffinity } from '../src/utils/menuProfileRecovery';
import { normalizeWineCandidates } from '../src/utils/multiWineScan';
import { buildDetailedAffinityExplanation, calculateLocalMatchrimAffinity, normalizeWineAttributesForInsight } from '../src/utils/wineAffinityExplanation';
import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';

let checks = 0;
const check = async (name: string, run: () => void | Promise<void>) => { await run(); checks++; console.log('PASS', name); };
const identity = { name: 'Luna Reserva', producer: 'Bodegas Ejemplo', vintage: 2021, region: 'Rioja', country: 'Spain' };
const sheet: WinerimOriginalSheet = { id: '123', name: identity.name, producer: identity.producer, vintage: '2021', region: 'Rioja',
  country: 'ES', grapes: [], detailVerified: true, url: 'https://web.winerim.com/the-library/wines/123/Luna-Reserva_2021',
  sensoryAttributes: { power: 2.4, acidity: 4, sweetness: 1, tannin: 0, fruity: 3 } };
const candidate = { ...normalizeWineCandidates({ candidates: [{ ...identity, confidence: .78 }] }, 'r')[0], inferredFields: [] };
const menu = { nombre: identity.name, productor: identity.producer, anada: 2021, region: 'Rioja', pais: 'Spain',
  confidence: .78, dudas: ['Lectura de confianza media'], campos_inferidos: [], precio: null, tipo: 'tinto', descripcion: null,
  texto_fuente: `${identity.name} ${identity.producer}` } as MenuScanWine;
const catalog = catalogWineFromVerifiedSheet(identity, sheet)!;

for (const updates of [{ producer: 'Ejemplo A' }, { producer: 'Otro Ejemplo' }, { vintage: 2020 }, { vintage: null },
  { region: 'Bordeaux' }, { country: 'FR' }, { inferredFields: ['producer'] }, { name: 'Luna Gran Reserva' }]) {
  await check('Binding rejects conflicting/inferred identity ' + JSON.stringify(updates), () => {
    assert.equal(catalogWineFromVerifiedSheet({ ...identity, ...updates }, sheet), null);
  });
}
await check('Original binding preserves exact source zero/decimal and all source metadata', () => {
  assert.ok(catalog); assert.equal(catalog.tastingAttributes?.tannin, 0); assert.equal(catalog.tastingAttributes?.power, 2.4);
  assert.equal(catalog.verifiedOriginalSheet, sheet);
  assert.equal(isVerifiedWinerimSheetForIdentity({ ...identity, name: 'Ejemplo Luna Reserva' }, sheet), true);
  const explicitYear = { ...candidate, name: 'Luna Reserva (2021)' };
  assert.equal(applyScanWineEvidence(explicitYear, null, catalog).originalSheet?.id, sheet.id);
});
for (const updates of [{ detailVerified: false }, { url: 'https://evil.test/123' }, { id: '124' }]) {
  await check('Unverified or route-mismatched sheet cannot bind ' + JSON.stringify(updates), () => {
    assert.equal(catalogWineFromVerifiedSheet(identity, { ...sheet, ...updates }), null);
  });
}
for (const producer of ['Ejemplo A', 'Ejemplo S', 'Sol Ejemplo', 'Ejemplo Ejemplo']) {
  await check('Producer qualifier/order is not discarded: ' + producer, () => {
    assert.equal(isSafeCanonicalLabelMatch({ name: 'Luna', producer }, { name: 'Luna', producer: 'Ejemplo' }), false);
  });
}
await check('Distinct canonical IDs or contradictory attributes never select first response row', () => {
  const a = { name: identity.name, producer: identity.producer, id: '1', tastingAttributes: { power: 2 } };
  for (const b of [{ ...a, id: '2' }, { ...a, tastingAttributes: { power: 4 } }]) {
    assert.equal(hasAmbiguousCanonicalMatches(identity, [a, b]), true);
    assert.equal(hasAmbiguousCanonicalMatches(identity, [b, a]), true);
  }
  assert.equal(hasAmbiguousCanonicalMatches(identity, [a, { ...a }]), false);
});
await check('Medium OCR signal can resolve independently without being inflated to 100%', () => {
  assert.equal(canResolveMenuCatalogIdentity(menu), true);
  const result = applyMenuWineEvidence(menu, null, catalog);
  assert.equal(result.confidence, .78); assert.equal(result.compatibilidad, null);
  assert.equal(isMenuIdentityConfirmed(menu), false); assert.equal(isMenuIdentityConfirmed(result), true);
  assert.equal(result.originalSheet?.detailVerified, true);
  assert.equal(result.atributos?.taninos, 0); assert.equal(result.atributos?.potencia, 2.4);
});
await check('Very weak, absent or partial literal evidence never automatically resolves a sheet', () => {
  for (const changes of [{ confidence: .2 }, { texto_fuente: null }, { texto_fuente: 'Luna Reserva' }, { campos_inferidos: ['producer'] }]) {
    assert.equal(canResolveMenuCatalogIdentity({ ...menu, ...changes }), false);
  }
});
await check('Strict known 0..5 source is not coerced or rescaled; legacy behavior is separate', () => {
  const values = { power: 0, acidity: .4, sweetness: 1, tannin: 0, fruity: 5, scale: 'winerim-0-5' as const };
  assert.deepEqual(normalizeWineAttributesForInsight(values), { potente: 0, acidez: .4, dulce: 1, tanico: 0, afrutado: 5 });
  assert.equal(normalizeWineAttributesForInsight({ ...values, power: 6 }), null);
  assert.equal(normalizeWineAttributesForInsight({ ...values, power: '2' as unknown as number }), null);
  assert.equal(normalizeWineAttributesForInsight({ ...values, scale: undefined })?.tanico, 1);
});
await check('Fifty deterministic profiles agree across label, menu, recovery and explanation', () => {
  const scores = new Set<number>();
  for (let i = 0; i < 50; i++) {
    const profile = { potente: (i % 6), acidez: (Math.floor(i / 6) % 6), dulce: (i * 3 % 6), tanico: (i * 5 % 6), afrutado: (i * 7 % 6) };
    const label = applyScanWineEvidence(candidate, profile, catalog);
    const row = applyMenuWineEvidence(menu, profile, catalog);
    assert.equal(row.compatibilidad, label.affinity); assert.equal(typeof label.affinity, 'number');
    assert.equal(refreshMenuProfileAffinity(row, profile).compatibilidad, label.affinity);
    const explanation = buildDetailedAffinityExplanation(profile, row.atributos, { score: row.compatibilidad, sensorySource: 'catalog' })!;
    assert.equal(explanation.score, label.affinity);
    assert.equal(explanation.dimensions.find(d => d.key === 'tanico')?.wineValue, 0);
    assert.equal(explanation.dimensions.find(d => d.key === 'potente')?.wineValue, 2.4);
    assert.equal(row.confidence, menu.confidence); scores.add(label.affinity!);
  }
  assert.ok(scores.size > 10);
  const zeros = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
  assert.equal(calculateLocalMatchrimAffinity(zeros, { power: 0, acidity: 0, sweetness: 0, tannin: 0, fruity: 0, scale: 'winerim-0-5' }), 93);
});
await check('Identity correction clears source, score and scale; price-only correction preserves them', () => {
  const row = applyMenuWineEvidence(menu, { potente: 2, acidez: 4, dulce: 1, tanico: 0, afrutado: 3 }, catalog);
  assert.equal(updateMenuWineEvidence(row, { precio: 20 }).compatibilidad, row.compatibilidad);
  const corrected = updateMenuWineEvidence(row, { anada: 2022 });
  assert.equal(corrected.atributos, null); assert.equal(corrected.originalSheet, null); assert.equal(corrected.compatibilidad, null);
});
await check('Learning preserves original zeros/decimals without changing legacy rows', () => {
  const base = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
  const attributes = { potencia: 0, acidez: 0, dulzura: 0, taninos: 0, afrutado: 0 };
  const row = { id: 'one', use_for_profile_training: true, rating: 'love' as const };
  assert.deepEqual(calculateLearnedMatchrimProfile(base, [{ ...row, sensory_attributes: { ...attributes, scale: 'winerim-0-5' } }]).profile, base);
  assert.equal(calculateLearnedMatchrimProfile(base, [{ ...row, sensory_attributes: attributes }]).profile.tanico, .3);
  assert.equal(calculateLearnedMatchrimProfile(base, [{ ...row, sensory_attributes: { ...attributes, scale: 'winerim-0-5', potencia: .4 } }]).profile.potente, .1);
  assert.equal(calculateLearnedMatchrimProfile(base, [{ ...row, sensory_attributes: { ...attributes, scale: 'winerim-0-5', potencia: 6 } }]).samples, 0);
});
await check('Missing original sensory never borrows summary/vision attributes', () => {
  const missing = catalogWineFromVerifiedSheet(identity, { ...sheet, sensoryAttributes: null })!;
  assert.equal(applyScanWineEvidence(candidate, { potente: 2, acidez: 4, dulce: 1, tanico: 0, afrutado: 3 },
    { ...missing, tastingAttributes: sheet.sensoryAttributes }).affinity, null);
});
await check('Cancellation bounds a transport ignoring AbortSignal', async () => {
  const controller = new AbortController();
  const pending = lookupWinerimOriginalSheet(identity, controller.signal, async () => new Promise(() => undefined));
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});
await check('Twelve-second deadline bounds an uncooperative transport', async () => {
  const original = globalThis.setTimeout;
  globalThis.setTimeout = ((callback, delay, ...rest) => original(callback, delay === 12000 ? 5 : delay, ...rest)) as typeof setTimeout;
  try { assert.equal((await lookupWinerimOriginalSheet(identity, undefined, async () => new Promise(() => undefined))).status, 'unavailable'); }
  finally { globalThis.setTimeout = original; }
});
console.log(JSON.stringify({ checks, passed: checks, profiles: 50, realUsers: 0, remoteCalls: 0,
  scope: 'Synthetic contract fixtures, not wine recognition or human taste accuracy' }));
