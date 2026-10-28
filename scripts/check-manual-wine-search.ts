import assert from 'node:assert/strict';
import { searchManualWine, toCatalogSuggestion, type CatalogSearchResult } from '../src/lib/manualWineSearch';

const wine = (over: Partial<CatalogSearchResult> = {}): CatalogSearchResult => ({
  id: 363300, mantalakWineId: 25795, name: 'Prado Enea', winery: 'Muga', type: 'tinto', country: 'ES', region: 'Rioja',
  grapes: ['Garnacha'], vintages: [2016], tastingAttributes: { power: 4, acidity: 3, sweetness: 2, tannin: 4, fruity: 3 },
  photo: 'https://x/p.png', slugname: 'Prado-Enea_2016', ...over,
});
const gemini = [{ name: 'Prado Enea Gran Reserva', producer: 'Muga', id: 'legacy-uuid', winerim_wine_id: 5 } as never];
let fallbackCalls = 0;
const deps = (catalog: () => Promise<CatalogSearchResult[]>, fallback: () => Promise<never[]> = async () => gemini) => ({
  searchCatalog: catalog,
  searchFallback: async () => { fallbackCalls++; return fallback(); },
});

// Catalogue hit: verified, keyed by the canonical id, and the fallback is never even asked.
const hit = await searchManualWine(deps(async () => [wine()]), 'enea prado', '2016');
assert.equal(hit.source, 'catalog');
assert.equal(hit.suggestions[0].verified, true);
assert.equal(hit.suggestions[0].winerim_mantalak_wine_id, 25795);
assert.equal(fallbackCalls, 0);

// A wine nobody lists has no public id: it is still a catalogue wine, identified by mantalakWineId.
const unlisted = toCatalogSuggestion(wine({ id: null, tastingAttributes: null }));
assert.equal(unlisted.verified, true);
assert.equal(unlisted.winerim_wine_id, null);
assert.equal(unlisted.winerim_mantalak_wine_id, 25795);
assert.equal(unlisted.sensory_attributes, null);

// No catalogue match: only unverified proposals, stripped of every id, never mixed with catalogue wines.
const none = await searchManualWine(deps(async () => []), 'zzz');
assert.equal(none.source, 'unverified');
assert.equal(none.catalogFailed, false);
assert.ok(none.suggestions.every((s) => s.verified === false));
assert.equal('id' in none.suggestions[0], false);
assert.equal(none.suggestions[0].winerim_wine_id, undefined);
assert.equal(none.suggestions[0].winerim_mantalak_wine_id, undefined);

// Catalogue down: unverified proposals, and the caller can tell.
const down = await searchManualWine(deps(async () => { throw new Error('503'); }), 'muga');
assert.equal(down.source, 'unverified');
assert.equal(down.catalogFailed, true);

// Both empty or failing: nothing to show.
const empty = await searchManualWine(deps(async () => [], async () => []), 'zzz');
assert.deepEqual([empty.source, empty.suggestions.length], ['none', 0]);
const broken = await searchManualWine(deps(async () => { throw new Error('x'); }, async () => { throw new Error('y'); }), 'zzz');
assert.deepEqual([broken.source, broken.catalogFailed], ['none', true]);

// Rows without a canonical id or a name are not catalogue identities.
const junk = await searchManualWine(deps(async () => [wine({ mantalakWineId: 0 }), wine({ name: '' })], async () => []), 'q');
assert.equal(junk.source, 'none');

// Cancelled while the catalogue was answering: the legacy lookup is not even started.
fallbackCalls = 0;
const cancelled = await searchManualWine({ ...deps(async () => []), isCancelled: () => true }, 'muga');
assert.equal(cancelled.source, 'none');
assert.equal(fallbackCalls, 0);

console.log('Manual wine search checks passed');
