import assert from 'node:assert/strict';
import { createWinerimOriginalSheet, hasExactWinerimProducer, hasWinerimGeographyConflict } from '../src/utils/winerimOriginalSheet';
import { normalizeWineCandidates, correctWineCandidateIdentity } from '../src/utils/multiWineScan';
import { applyScanWineEvidence, applyMenuWineEvidence, updateMenuWineEvidence } from '../src/utils/scanWineEvidence';

let checks = 0;
const check = (name: string, fn: () => void) => { fn(); checks++; console.log('PASS', name); };
const catalog = { id: 'wine-123', name: 'Mamba', winery: 'La Quinta', vintage: 2021,
  originalSheetSource: 'winerim-api' as const,
  region: 'Rioja', grapes: ['Tempranillo'], originalSheetUrl: 'https://web.winerim.com/the-library/wines/wine-123/mamba-2021',
  tastingAttributes: { power: 4, acidity: 3, sweetness: 1, tannin: 4, fruity: 3 } };
const candidate = normalizeWineCandidates({ candidates: [{ name: 'Mamba', producer: 'La Quinta', vintage: 2021, confidence: .95 }] }, 'one')[0];
const profile = { potente: 4, acidez: 4, dulce: 1, tanico: 3, afrutado: 4 };
check('Official sheet preserves catalog identity and source URL', () => {
  const sheet = createWinerimOriginalSheet(catalog)!;
  assert.equal(sheet.id, catalog.id); assert.equal(sheet.name, catalog.name);
  assert.equal(sheet.vintage, '2021'); assert.deepEqual(sheet.grapes, catalog.grapes);
  assert.equal(sheet.url, catalog.originalSheetUrl);
});
for (const url of ['http://web.winerim.com/the-library/wines/wine-123/mamba', 'https://winerim.com.evil.test/the-library/wines/wine-123/mamba',
  'https://evil.test/the-library/wines/wine-123/mamba', 'https://user:password@web.winerim.com/the-library/wines/wine-123/mamba',
  'https://web.winerim.com/the-library/wines/other/mamba', 'https://web.winerim.com/the-library/wines/wine-123/mamba?token=secret',
  'https://web.winerim.com/the-library/wines/wine-123/mamba#fake', 'https://web.winerim.com/the-library/wines/wine-123/mamba/extra']) {
  check('Unsafe or mismatched original URL rejected: ' + new URL(url).host, () => assert.equal(createWinerimOriginalSheet({ ...catalog, originalSheetUrl: url }), null));
}
check('Generated placeholder IDs fail; missing public URL never fabricates a link', () => {
  assert.equal(createWinerimOriginalSheet({ ...catalog, id: 'winerim-4' }), null);
  assert.equal(createWinerimOriginalSheet({ ...catalog, originalSheetUrl: undefined })?.url, null);
});
check('A local UUID and fabricated owned-domain URL are not official provenance', () => {
  assert.equal(createWinerimOriginalSheet({ ...catalog, originalSheetSource: undefined }), null);
});
check('Whitespace metadata stays visibly absent, not inferred', () => {
  const sheet = createWinerimOriginalSheet({ ...catalog, winery: ' ', region: '\t', vintage: ' ', grapes: ['', '  ', ' Tempranillo '] })!;
  assert.equal(sheet.producer, null); assert.equal(sheet.region, null); assert.equal(sheet.vintage, null);
  assert.deepEqual(sheet.grapes, ['Tempranillo']);
});
check('Unverified vintage/producer aliases cannot certify a year-specific sheet', () => {
  for (const field of ['vintage', 'anada', 'year', 'producer', 'bodega']) {
    assert.equal(applyScanWineEvidence({ ...candidate, inferredFields: [field] }, profile, catalog).originalSheet, null);
  }
});
check('Confirmed geography conflicts abstain; absent or compatible geography does not', () => {
  assert.equal(hasWinerimGeographyConflict({ country: 'Spain' }, { country: 'Espana' }), false);
  assert.equal(hasWinerimGeographyConflict({ region: 'Rioja Alta' }, { region: 'Rioja' }), false);
  assert.equal(hasWinerimGeographyConflict({ region: 'Bordeaux' }, { region: 'Rioja' }), true);
  assert.equal(hasWinerimGeographyConflict({ region: 'Ribera del Duero' }, { region: 'Ribera del Guadiana' }), true);
  assert.equal(applyScanWineEvidence({ ...candidate, region: 'Bordeaux' }, profile, catalog).originalSheet, null);
});
check('Partial producer is not enough; explicit legal wrapper may normalize', () => {
  assert.equal(hasExactWinerimProducer('Producer', 'Synthetic Producer'), false);
  assert.equal(hasExactWinerimProducer('Muga', 'Bodegas Muga S.A.'), true);
});
check('Vision cannot inject original sheet or canonical identity', () => {
  const fake = normalizeWineCandidates({ candidates: [{ ...candidate, originalSheet: createWinerimOriginalSheet(catalog), canonicalId: catalog.id, source: 'catalog' }] }, 'fake')[0];
  assert.equal(fake.originalSheet, undefined);
  assert.equal(applyScanWineEvidence(fake, profile).originalSheet, null);
});
check('Canonical match gets original without requiring a taste profile', () => {
  const resolved = applyScanWineEvidence(candidate, null, catalog);
  assert.equal(resolved.originalSheet?.id, catalog.id); assert.equal(resolved.affinity, null);
});
check('Unknown or conflicting vintage never borrows original sheet', () => {
  for (const vintage of [null, 2020]) assert.equal(applyScanWineEvidence({ ...candidate, vintage }, profile, catalog).originalSheet, null);
});
check('Manual correction clears original and affinity', () => {
  const resolved = applyScanWineEvidence(candidate, profile, catalog);
  const corrected = correctWineCandidateIdentity(resolved, { name: 'Another wine' });
  assert.equal(corrected.originalSheet, null); assert.equal(corrected.affinity, null);
});
check('Menu original is cleared on identity change but not price edit', () => {
  const menu = applyMenuWineEvidence({ nombre: 'Mamba', productor: 'La Quinta', anada: 2021, confidence: .95,
    region: null, pais: null, precio: null, tipo: 'tinto', descripcion: null }, profile, catalog);
  assert.equal(menu.originalSheet?.id, catalog.id);
  assert.equal(updateMenuWineEvidence(menu, { precio: 22 }).originalSheet?.id, catalog.id);
  assert.equal(updateMenuWineEvidence(menu, { anada: 2020 }).originalSheet, null);
});
console.log(JSON.stringify({ checks, passed: checks, remoteCalls: 0, scope: 'original Winerim sheet provenance contracts, not live catalog coverage' }));
