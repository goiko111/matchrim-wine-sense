import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchWinerimCandidates95, confirmWinerimCandidate95 } from '../src/utils/winerimCandidateSearch95';
import { canAdmitNativeCatalogLookup97 } from '../src/utils/nativeCatalogAdmission97';
import { hasConflictingNativeVintage100 } from '../src/utils/nativeVintageEvidence100';

const uuid = 'b653e084-e8e1-448c-bc03-507a1cea3810';
// Identity-only projection observed in the public Library, 2026-10-21.
// All transport and sensory responses below are synthetic, not fresh API calls.
const fixture = JSON.parse(readFileSync(new URL('../qa-fixtures/consumer95/catalogue-vintage100.observed.json', import.meta.url), 'utf8'));
const contradictory: { id: number; name: string; subname: null; winery: string; vintage: string; slugname: string; type: string; region: string } = fixture.contradictoryRow;
let calls = 0;
const network = (wine = contradictory): typeof fetch => async url => {
  calls++;
  const path = new URL(String(url)).pathname;
  if (path.endsWith('/whoami/slugname')) return Response.json({ restaurant: uuid });
  if (path.endsWith('/wines')) return Response.json({ page: 1, count: 1, limit: 20, results: [wine] });
  return Response.json({ ...wine, tastingAttributes: { power: 4, acidity: 3, sweetness: 0, tannin: 3, fruity: 4 } });
};
const literal = { name: contradictory.name, producer: contradictory.winery, vintage: contradictory.vintage,
  confidence: .9, evidence: [contradictory.name, contradictory.winery, contradictory.vintage] };
const proposal = { id: String(contradictory.id), name: contradictory.name, winery: contradictory.winery,
  vintage: contradictory.vintage, slug: contradictory.slugname, type: contradictory.type, region: contradictory.region };
const search = await searchWinerimCandidates95('Chivite', undefined, network());
const beforeConfirm = calls;
const confirm = await confirmWinerimCandidate95(proposal, undefined, network());
const observed = { searchStatus: search.status, confirmationStatus: confirm.status, confirmationRequests: calls - beforeConfirm,
  scanAdmission: canAdmitNativeCatalogLookup97(literal), paidCalls: 0, network: 'synthetic-only' };
console.log(JSON.stringify(observed));
assert.equal(search.status, 'proposals', 'Shared legacy reader unchanged; the native controller owns review');
assert.equal(confirm.status, 'verified', 'Shared utility is not falsely claimed to enforce the new native-only policy');
assert.equal(hasConflictingNativeVintage100(proposal), true, 'The native controller rejects this before invoking shared confirmation');
assert.equal(observed.scanAdmission, false, 'Literal but contradictory scan evidence cannot auto-bind');
let checks = 4;
for (const [name, vintage, admitted] of [
  ['Luna Reserva 2022', '2022', true], ['Luna Reserva (2022)', '2022', true],
  ['Luna Reserva [2022]', '2022', true], ['Luna Reserva (2021)', '2022', false],
  ['Luna Reserva 2021', '2022', false], ['Luna Reserva', '2022', true],
  ['Colección 125', '2022', true], ['Gran Reserva 904', '2022', true],
  ['Marqués de 1864', '2022', true], ['Cuvée 1902', '2022', false],
] as const) {
  assert.equal(canAdmitNativeCatalogLookup97({ ...literal, name, vintage, evidence: [name, 'Chivite', vintage] }), admitted, name);
  checks++;
}
const good = { ...contradictory, name: 'Chivite Colección 125 Blanco 2022', slugname: 'Chivite-Coleccion-125-Blanco-2022_2022' };
const goodProposal = { ...proposal, name: good.name, slug: good.slugname };
const healthy = await confirmWinerimCandidate95(goodProposal, undefined, network(good));
assert.equal(healthy.status, 'verified');
if (healthy.status === 'verified') assert.equal(healthy.sheet.sensoryAttributes?.sweetness, 0);
checks += 2;
console.log(JSON.stringify({ checks, passed: true, liveRequests: 0, paidCalls: 0, canonicalAccuracyClaim: false }));
