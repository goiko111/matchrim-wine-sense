import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGlobalCatalogue103, type PublicGlobalRow103 } from '../src/utils/nativeGlobalCatalogue103';
import { globalRecoveryQueries104, rankGlobalProposals104 } from '../src/utils/globalWineProposals104';
const fixture = JSON.parse(fs.readFileSync('qa-fixtures/global103/winerim-public.observed.json', 'utf8'));
const vidure: PublicGlobalRow103 = fixture.vidure.wine;
let count = 0;
const test = async (name: string, work: () => unknown | Promise<unknown>) => { await work(); console.log('PASS', name); count++; };
globalThis.fetch = async () => { throw new Error('NO_LIVE_REQUESTS'); };
await test('Name evidence can suggest a fiche without pretending to read its producer', () => {
  const proposals = rankGlobalProposals104(['VIDURE', '2020'], [vidure], 2020);
  assert.equal(proposals.length, 1); assert.equal(proposals[0].missingProducer, true);
  assert.equal(Object.hasOwn(proposals[0], 'affinity'), false);
  assert.equal(Object.hasOwn(proposals[0], 'confidence'), false);
  assert.equal(Object.hasOwn(proposals[0], 'globalRecord'), false);
});
await test('Unrelated photos and generic grapes alone cannot create useful suggestions', () => {
  assert.deepEqual(rankGlobalProposals104(['SOPA', '12 EUR'], [vidure]), []);
  assert.deepEqual(rankGlobalProposals104(['PINOT', 'NOIR'], [{ ...vidure, name: 'Pinot Noir', winery: 'Unknown producer' }]), []);
  assert.deepEqual(rankGlobalProposals104([], [vidure]), []);
  assert.deepEqual(rankGlobalProposals104(['CHATEAU BOUTISSE', 'Saint Emilion Grand Cru'], [{ ...vidure, name: 'Chateau Piney Saint Emilion Grand Cru', winery: 'Chateau Piney' }]), []);
});
await test('Visible cru/classification and conflicting source years cannot disappear in recovery', () => {
  assert.deepEqual(rankGlobalProposals104(['Chassagne Montrachet', 'Premier Cru "Morgeot"'], [{ ...vidure, name: 'Chassagne Montrachet' }]), []);
  assert.deepEqual(rankGlobalProposals104(['VIDURE', '2019'], [{ ...vidure, name: 'Vidure 2018', vintage: '2019' }]), []);
  assert.deepEqual(rankGlobalProposals104(['VIDURE', '2018'], [{ ...vidure, vintage: '2020' }], 2018), []);
  assert.deepEqual(rankGlobalProposals104(['Protos', '12 meses'], [{ ...vidure, name: 'Protos 9 Meses', winery: 'Protos' }]), []);
  assert.deepEqual(rankGlobalProposals104(['Campillo', 'Reserva Especial'], [{ ...vidure, name: 'Campillo', winery: 'Campillo' }]), []);
  assert.deepEqual(rankGlobalProposals104(['Marimar Estate Don Miguel Vineyard', 'Godello'], [{ ...vidure, name: 'Marimar Estate Don Miguel Vineyard Albariño', winery: 'Marimar Estate', grapes: ['Albariño'] }]), []);
});
await test('An exact year precedes NV, duplicate variants do not crowd the three choices', () => {
  const rows = [{ ...vidure, id: 1, vintage: '2019' }, { ...vidure, id: 2 }, { ...vidure, id: 3, vintage: '2020' }];
  const proposals = rankGlobalProposals104(['VIDURE', 'Pago de Cirsus', '2020'], rows, 2020);
  assert.equal(proposals.length, 1); assert.equal(proposals[0].row.id, 3);
  const unknown = rankGlobalProposals104(['VIDURE', 'Pago de Cirsus'], rows);
  assert.equal(unknown[0].row.id, 2);
});
await test('Bounded queries come only from visible words, not an inferred identity, URL or four-digit quantity', () => {
  const queries = globalRecoveryQueries104('Invented expensive wine', ['VIDURE', 'Pago de Cirsus', '2020', 'www.invalid.test', '3507 BOTTLES']);
  assert.deepEqual(queries, ['VIDURE', 'Pago de Cirsus']);
  assert.equal(globalRecoveryQueries104('Vidure', ['VIDURE']).length, 1);
  assert.deepEqual(globalRecoveryQueries104('Vidure', ['Identidad corregida manualmente'], true), ['Vidure']);
  assert.deepEqual(globalRecoveryQueries104('Vidure 2020', ['VIDURE', '2020']), ['Vidure']);
});
await test('Partial pages are suggestion-only; strict lookup remains complete-page fail-closed', async () => {
  let calls = 0;
  const client = createGlobalCatalogue103(async () => { calls++; return Response.json({ count: 400, page: 1, results: [vidure] }); });
  const partial = await client.search('Vidure', undefined, true); assert.equal(partial.status, 'partial'); assert.equal(partial.rows.length, 1);
  assert.equal((await client.search('Vidure')).status, 'incomplete');
  const result = await client.lookup({ name: 'Vidure', producer: 'Pago de Cirsus', vintage: 2020 });
  assert.equal(result.status, 'incomplete'); assert.equal(calls, 4);
});
await test('Explicit selection on a partial page still requires matching independent detail', async () => {
  const input = { name: 'Vidure', producer: 'Pago de Cirsus', vintage: 2020 };
  let reads = 0;
  const client = createGlobalCatalogue103(async url => { reads++; return Response.json(String(url).includes('?')
    ? { count: 400, page: 1, results: [vidure] } : vidure); });
  assert.equal((await client.lookup(input, undefined, vidure.id)).status, 'reference');
  assert.equal(reads, 2);
  assert.equal((await client.lookup(input, undefined, -1)).status, 'identity-required');
  assert.equal(reads, 2);
  const changed = createGlobalCatalogue103(async url => Response.json(String(url).includes('?')
    ? { count: 400, page: 1, results: [vidure] } : { ...vidure, winery: 'Another producer' }));
  assert.equal((await changed.lookup(input, undefined, vidure.id)).status, 'ambiguous');
});
await test('An observed name/subname proposal verifies directly; forged selections and detail drift fail', async () => {
  const source = { ...vidure, subname: 'Reserva' }, requests: string[] = [];
  const client = createGlobalCatalogue103(async url => {
    requests.push(String(url));
    return Response.json(String(url).includes('?') ? { count: 400, page: 1, results: [source] } : source);
  });
  const page = await client.search('Vidure', undefined, true), chosen = page.rows[0];
  const input = { name: 'Vidure Reserva', producer: 'Pago de Cirsus', vintage: 2020 };
  assert(Object.isFrozen(chosen));
  assert.equal((await client.confirmSelection(input, { ...chosen })).status, 'identity-required');
  assert.equal((await client.confirmSelection(input, chosen)).status, 'reference');
  assert.equal(requests.length, 2); assert(!requests[1].includes('?'));
  const changed = createGlobalCatalogue103(async () => Response.json({ ...source, winery: 'Other' }));
  assert.equal((await changed.confirmSelection(input, chosen)).status, 'ambiguous');
});
await test('Connectors and explicit classification expansions do not erase distinctive name or aging evidence', () => {
  const named = { ...vidure, name: 'Biografo del Vino', winery: 'An independent producer' };
  assert.equal(rankGlobalProposals104(['BIOGRAFO', 'DEI VINO'], [named]).length, 1);
  assert.equal(rankGlobalProposals104(['TOMBACCO', 'PRIMITIVO', 'MANDURIA', 'DENOMINAZIONE ORIGINE CONTROLLATA'],
    [{ ...vidure, name: 'Primitivo di Manduria DOC', winery: 'Tombacco' }]).length, 1);
  assert.deepEqual(rankGlobalProposals104(['TOMBACCO', 'PRIMITIVO', 'MANDURIA'], [{ ...vidure, name: 'Primitivo di Manduria DOC', winery: 'Tombacco' }]), []);
  assert.deepEqual(rankGlobalProposals104(['BIOGRAFO', 'GRAN RESERVA'], [named]), []);
});
await test('One long grape OCR substitution needs exact producer, companion grape and explicit warning', () => {
  const wine = { ...vidure, name: 'Ghost Block Cabernet Sauvignon', winery: 'Ghost Block' };
  const visible = ['GHOST BLOCK', 'CABERNET SALVIGNON'];
  const proposed = rankGlobalProposals104(visible, [wine]);
  assert.equal(proposed.length, 1); assert.deepEqual(proposed[0].readingCorrections, ['salvignon -> sauvignon']);
  assert.deepEqual(visible, ['GHOST BLOCK', 'CABERNET SALVIGNON']);
  assert.deepEqual(rankGlobalProposals104(['CABERNET SALVIGNON'], [wine]), []);
  assert.deepEqual(rankGlobalProposals104(['GHOST BLOCK', 'SALVIGNON'], [wine]), []);
  assert.deepEqual(rankGlobalProposals104([...visible, 'GODELLO'], [wine]), []);
  assert.deepEqual(rankGlobalProposals104(['GHOST BLOCK', 'CABERNET GODELLO'], [wine]), []);
  assert.deepEqual(rankGlobalProposals104(['GHOST BLACK', 'CABERNET SALVIGNON'], [wine]), []);
});
await test('Queries skip legal/volume metadata and preserve literal producer text without identity aliases', () => {
  const evidence = ['CONTAINS SULFITES', 'PRODUCT OF SPAIN', '750 ML', 'Embotellado por Bodegas Atlas', 'Cuvee Sierra'];
  assert.deepEqual(globalRecoveryQueries104('PRODUCT OF SPAIN', evidence), ['Bodegas Atlas', 'Cuvee Sierra']);
  assert.deepEqual(evidence, ['CONTAINS SULFITES', 'PRODUCT OF SPAIN', '750 ML', 'Embotellado por Bodegas Atlas', 'Cuvee Sierra']);
  assert.deepEqual(globalRecoveryQueries104('6 Cepas', ['6 CEPAS', '75 CL', '25 EUROS']), ['6 Cepas']);
  assert.deepEqual(globalRecoveryQueries104('Sierra', ['Mis en bouteille au Chateau Atlas', 'Sierra']), ['Sierra', 'Chateau Atlas']);
});
await test('Queries prefer a complete observed word over redundant partial logo fragments, without inventing joins', () => {
  assert.deepEqual(globalRecoveryQueries104('', ['LONGA', 'FINCA', 'VALONGA', 'Entre Lias']), ['VALONGA', 'Entre Lias']);
  assert.deepEqual(globalRecoveryQueries104('', ['GALI', 'ZEUS', 'GALIZEUS', 'G', 'ODELLO']), ['GALIZEUS', 'ODELLO']);
  assert.deepEqual(globalRecoveryQueries104('', ['FINCA', 'FLICHMAN', 'CHACAYES']), ['FLICHMAN', 'CHACAYES']);
  assert.deepEqual(globalRecoveryQueries104('', ['DA', 'LUCA']), ['LUCA'], 'Separate words are not silently joined');
});
await test('A distinctive read cuvee outranks generic rows of the same producer at an equal evidence score', () => {
  const broad = [1, 2, 3].map(id => ({ ...vidure, id, name: ['Synthetic Estate Dry', 'Northern Valley Dry', 'Synthetic Estate Northern Valley Dry'][id - 1],
    winery: 'Synthetic Estate', region: 'Northern Valley', grapes: undefined, type: undefined }));
  const specific = { ...vidure, id: 99, name: 'Aurora Pinot Noir Rose Dry', winery: 'Synthetic Estate', region: 'Northern Valley', grapes: ['Pinot Noir'], type: 'rosado' };
  const result = rankGlobalProposals104(['Synthetic Estate', 'DRY', 'AURORA', 'PINOT NOIR ROSE', 'NORTHERN VALLEY'], [...broad, specific]);
  assert.equal(result[0].row.id, 99); assert.equal(result.length, 3);
  assert.equal(result[0].score, 90); assert.equal(Object.hasOwn(result[0], 'affinity'), false);
});
await test('Both bounded80-row queries are ranked, including a specific match beyond the first eighty', () => {
  const unrelated = Array.from({ length: 80 }, (_, i) => ({ ...vidure, id: i + 1, name: `Unrelated ${i}`, winery: 'Other Estate' }));
  const relevant = { ...vidure, id: 111 };
  assert.equal(rankGlobalProposals104(['VIDURE', 'Pago de Cirsus', '2020'], [...unrelated, relevant], 2020)[0]?.row.id, 111);
  assert.deepEqual(rankGlobalProposals104(['VIDURE', 'Pago de Cirsus', '2020'],
    [...unrelated, ...unrelated, relevant], 2020), [], 'The aggregate bound is160, not an unbounded catalogue scan');
});
console.log(JSON.stringify({ groups: count, paidStarts: 0, liveCalls: 0, verifiedIdentitiesFromRanking: 0 }));
