import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { wineYearRoles105, nonVintageYear105, normalizeNativeYear105 } from '../src/utils/wineYearRole105';
import { createGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103';
import { canAdmitNativeCatalogLookup97 } from '../src/utils/nativeCatalogAdmission97';
import type { WineCandidate } from '../src/utils/multiWineScan';
const role = (text: string) => wineYearRoles105([{ text }]).roles[0]?.role;
let groups = 0;
const test = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); groups++; console.log('PASS', name); };
await test('Explicit vintage, foundation and medal dates retain different roles', () => {
  assert.equal(role('Cosecha 2020'), 'vintage');
  assert.equal(role('Millésime 2020'), 'vintage');
  assert.equal(role('Fundada en 1950'), 'foundation');
  assert.equal(role('Since 1998'), 'foundation');
  assert.equal(role('Gold Medal 2026'), 'award');
  assert.equal(role('LYON GOLD 2026'), 'award');
  assert.equal(role('Gold Label 2020'), 'unclassified');
  assert.equal(role('2020'), 'unclassified');
  assert.equal(role('Cosecha 2020 Gold Medal 2020'), 'ambiguous');
});
await test('Separate unpositioned fragments cannot fabricate a medal/year association', () => {
  assert.equal(nonVintageYear105(2026, ['2026', 'LYON', 'GOLD']), null);
});
await test('Spatial evidence groups a local award but not a distant vintage or another column', () => {
  const box = (x: number, y: number, width = .1) => ({ x, y, width, height: .012 });
  const result = wineYearRoles105([{ text: '2026', box: box(.37, .55) }, { text: 'LYON', box: box(.53, .55) },
    { text: 'GOLD', box: box(.49, .53) }, { text: '2020', box: box(.36, .10) },
    { text: 'Gold Medal', box: box(.85, .10) }]).roles;
  assert.equal(result.find(value => value.year === 2026)?.role, 'award');
  assert.equal(result.find(value => value.year === 2020)?.role, 'unclassified');
});
await test('Conflicting roles abstain; malformed/oversized evidence and geometry are bounded', () => {
  assert.equal(wineYearRoles105([{ text: 'Cosecha 2020' }, { text: 'Since 2020' }]).roles[0].role, 'ambiguous');
  assert.equal(wineYearRoles105(Array.from({ length: 101 }, () => ({ text: '2020' }))).supported, false);
  assert.equal(wineYearRoles105([{ text: 'x'.repeat(1001) }]).supported, false);
  assert.equal(wineYearRoles105([{ text: '2026', box: { x: NaN, y: .1, width: .2, height: .1 } },
    { text: 'LYON GOLD', box: { x: .1, y: .1, width: .2, height: .1 } }]).roles[0].role, 'unclassified');
});
const candidate = { id: 'test', name: 'La Cuvee Lucien', producer: 'Bernard Maillard', vintage: 2026,
  source: 'label', evidence: ['La Cuvee Lucien', 'Bernard Maillard', 'LYON GOLD 2026'], inferredFields: [],
  uncertaintyReasons: [], affinity: 99, sensoryAttributes: { potencia: 5 }, canonicalId: 'not-authority' } as WineCandidate;
await test('Native normalization removes a medal year and stale affinity without substituting catalogue vintage', () => {
  const next = normalizeNativeYear105(candidate);
  assert.equal(candidate.vintage, 2026); assert.equal(candidate.affinity, 99);
  assert.equal(next.vintage, null); assert.equal(next.affinity, null); assert.equal(next.sensoryAttributes, null);
  assert.equal(next.canonicalId, null); assert(next.inferredFields.includes('vintage'));
  assert(next.uncertaintyReasons[0].includes('premio')); assert.equal(next.evidence, candidate.evidence);
  const manual = { ...candidate, source: 'manual' as const }; assert.equal(normalizeNativeYear105(manual), manual);
  const ordinary = { ...candidate, evidence: ['La Cuvee Lucien', '2020'], vintage: 2020 };
  assert.equal(normalizeNativeYear105(ordinary), ordinary);
});
await test('A known non-vintage year causes zero automatic catalogue reads', async () => {
  let calls = 0;
  const result = await createGlobalCatalogue103(async () => { calls++; throw Error('NO_NETWORK'); }).lookup(candidate);
  assert.equal(result.status, 'identity-required'); assert.equal(calls, 0);
});
await test('Actual scanner normalizes before enrichment only in the native branch', () => {
  const source = readFileSync('src/components/wine-import/MultiWineLabelScanner.tsx', 'utf8');
  const block = source.match(/let candidates = normalizeWineCandidates\(payload, region\.id\);\s+if \(isNative\) candidates = candidates\.map\(normalizeNativeYear105\);/)?.[0];
  assert(block);
  for (const isNative of [false, true]) {
    const result: { values?: WineCandidate[] } = {};
    vm.runInNewContext(block + '; result.values = candidates;', { payload: {}, region: { id: 'r' }, isNative, result,
      normalizeWineCandidates: () => [candidate], normalizeNativeYear105 });
    assert.equal(result.values?.[0].vintage, isNative ? null : 2026);
    if (!isNative) assert.equal(result.values?.[0], candidate);
  }
});
await test('Separate award clauses cannot erase an explicit vintage in a mixed-year fragment', () => {
  for (const evidence of ['Cosecha 2020. Gold Medal 2026', 'Cosecha 2020 Gold Medal 2026', 'Premio 2026, cosecha 2020',
    '2026 Gold Medal, Cosecha 2020', '2026 Gold Medal Cosecha 2020']) {
    assert.equal(nonVintageYear105(2020, [evidence]), null, evidence);
    assert.equal(nonVintageYear105(2026, [evidence])?.role, 'award', evidence);
    const normalized = normalizeNativeYear105({ ...candidate, vintage: 2020, evidence: [evidence] });
    assert.equal(normalized.vintage, 2020);
  }
});
await test('Oversized evidence fails closed in normalization, native admission and the real catalogue caller', async () => {
  const input = { ...candidate, confidence: .99, evidence: [...candidate.evidence, 'x'.repeat(1001)] };
  assert.equal(nonVintageYear105(input.vintage, input.evidence)?.role, 'unsupported');
  assert.equal(normalizeNativeYear105(input).vintage, null);
  assert.equal(canAdmitNativeCatalogLookup97(input), false);
  let calls = 0;
  const result = await createGlobalCatalogue103(async () => { calls++; throw Error('NO_NETWORK'); }).lookup(input);
  assert.equal(result.status, 'identity-required'); assert.equal(calls, 0);
});
await test('Reverse-order medal year is rejected before catalogue reads, not promoted to affinity', async () => {
  const input = { ...candidate, confidence: .99, evidence: ['La Cuvee Lucien', 'Bernard Maillard', '2026 Gold Medal, Cosecha 2020'] };
  assert.equal(canAdmitNativeCatalogLookup97(input), false);
  let calls = 0;
  const result = await createGlobalCatalogue103(async () => { calls++; throw Error('NO_NETWORK'); }).lookup(input);
  assert.equal(result.status, 'identity-required'); assert.equal(calls, 0);
});
await test('Foundation clauses and multiple award dates cannot leave an unrelated year eligible for affinity', () => {
  const evidence = ['2026 Gold Medal Depuis 1950'];
  assert.equal(nonVintageYear105(2026, evidence)?.role, 'award');
  assert.equal(nonVintageYear105(1950, evidence)?.role, 'foundation');
  for (const year of [2025, 2026]) assert(nonVintageYear105(year, ['2025 Gold Medal 2026 Gold Medal']));
  assert.equal(nonVintageYear105(2020, ['Gold Medal 2025 Cosecha 2020']), null);
});
await test('Clearly labelled Italian/French/English foundation years cannot become vintages', () => {
  for (const text of ['Fondata nel 1919', 'Fondato nel 1919', 'Fondée en 1919', 'Founded in 1919', 'Established in 1919', 'Seit 1919'])
    assert.equal(role(text), 'foundation', text);
});
await test('Future OCR years fail before any catalogue request even when labelled as vintage', async () => {
  const future = new Date().getUTCFullYear() + 20;
  assert.equal(role(`Cosecha ${future}`), 'unsupported');
  assert.equal(nonVintageYear105(future, [])?.role, 'unsupported');
  assert.equal(normalizeNativeYear105({ ...candidate, vintage: future, evidence: [`Cosecha ${future}`] }).vintage, null);
  let calls = 0;
  const result = await createGlobalCatalogue103(async () => { calls++; throw Error('NO_NETWORK'); })
    .lookup({ ...candidate, vintage: future, evidence: [] });
  assert.equal(result.status, 'identity-required'); assert.equal(calls, 0);
});
await test('Year-occurrence overflow fails closed before a capped observation can certify identity', () => {
  const evidence = [Array(8).fill('2018').join(' ') + ' 2019'];
  assert.equal(wineYearRoles105(evidence.map(text => ({ text }))).supported, false);
  assert.equal(nonVintageYear105(2018, evidence)?.role, 'unsupported');
});
await test('Explicit bottling dates cannot become vintages or retain a stale verified affinity', () => {
  for (const text of ['Bottled in 2020', 'Bottling: 2020', 'Embotellado en 2020', 'Mis en bouteille en 2020',
    'Mise en bouteille 2020', 'Imbottigliato nel 2020', 'Engarrafado em 2020', 'Abgefüllt im 2020']) {
    assert.equal(role(text), 'bottling', text);
    assert.equal(nonVintageYear105(2020, [text])?.role, 'bottling');
    const input = { ...candidate, vintage: 2020, evidence: [text] };
    const result = normalizeNativeYear105(input);
    assert.equal(result.vintage, null); assert.equal(result.affinity, null); assert.equal(result.canonicalId, null);
    assert.equal(result.evidence, input.evidence); assert(result.uncertaintyReasons.at(-1)?.includes('embotellado'));
    assert.equal(normalizeNativeYear105({ ...input, source: 'manual' }).vintage, 2020);
  }
  const mixed = wineYearRoles105([{ text: 'Cosecha 2018. Bottled in 2020' }]).roles;
  assert.equal(mixed.find(item => item.year === 2018)?.role, 'vintage');
  assert.equal(mixed.find(item => item.year === 2020)?.role, 'bottling');
  assert.equal(role('Cosecha 2020. Bottled in 2020'), 'ambiguous');
  assert.equal(role('Bottled by Casa Atlas 2020'), 'unclassified', 'A producer prefix alone does not date the bottling');
});
console.log(JSON.stringify({ groups, networkCalls: 0, modelStarts: 0, verifiedVintagesCreated: 0 }));
