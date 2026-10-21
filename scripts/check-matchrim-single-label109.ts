import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import type { LocalOCRResult106 } from '../src/utils/nativeOCR106';
import { localSingleCandidate109 } from '../src/utils/nativeSingleLabel109';

// Synthetic contract fixtures only; no real labels, aliases or ground-truth inputs.
const requestId = '00000000-0000-4000-8000-000000010901';
const candidateId = 'synthetic-single-label-109';
const line = (text: string, x = .1, y = .1) => ({ text, confidence: .95, box: { x, y, width: .3, height: .012 } });
const reading = (lines = [line('CASA SINTETICA Z109')]): LocalOCRResult106 => ({
  source: 'apple-vision-device', requestId, width: 1000, height: 2000,
  totalMs: 100, revision: 3, customWords: [], lines,
});
let groups = 0, candidatesCreated = 0, canonicalIdsCreated = 0, affinitiesCreated = 0;
const test = (name: string, run: () => void) => { run(); groups++; console.log('PASS', name); };
const run = (raw: unknown, id: unknown = candidateId) => {
  const candidate = localSingleCandidate109(raw as LocalOCRResult106, id as string);
  if (candidate) {
    candidatesCreated++;
    if (candidate.canonicalId != null) canonicalIdsCreated++;
    if (candidate.affinity != null) affinitiesCreated++;
    assert.equal(candidate.id, id);
    assert.equal(candidate.name, 'Etiqueta por identificar');
    assert.equal(candidate.source, 'label');
    assert.equal(candidate.confidence, 0);
    assert.deepEqual(candidate.grapes, []);
    for (const key of ['producer', 'region', 'country', 'alcohol', 'canonicalId', 'masterRecord',
      'globalRecord', 'originalSheet', 'sensorySource', 'sensoryAttributes', 'affinity',
      'affinityConfidence', 'affinityReason'] as const) {
      assert(Object.prototype.hasOwnProperty.call(candidate, key), key);
      assert.equal(candidate[key], null, key);
    }
    assert.deepEqual(candidate.inferredFields, candidate.vintage === null
      ? ['name', 'producer', 'vintage'] : ['name', 'producer']);
    assert(candidate.uncertaintyReasons.some(reason => /nombre.*bodega/.test(reason)));
    assert(candidate.uncertaintyReasons.every(reason => reason.length > 20));
    assert(candidate.evidence.length <= 100);
    assert(candidate.evidence.every(text => text.length <= 1000));
  }
  return candidate;
};

test('Zero useful text abstains, including empty OCR and punctuation-only fragments', () => {
  for (const lines of [[], [line('   \t\n')], [line('... --- % /')], [line('\u200b\u2060')]]) {
    assert.equal(run(reading(lines)), null);
  }
});

test('Useful OCR never becomes a guessed wine name, producer, geography or grape', () => {
  const input = reading([line('BODEGA SINTETICA Z109'), line('VINO EXPERIMENTAL Q109', .1, .3),
    line('RIOJA ESPANA TEMPRANILLO 14%', .1, .5)]);
  const candidate = run(input);
  assert(candidate);
  assert.equal(candidate.vintage, null);
  assert.deepEqual(candidate.evidence, input.lines.map(value => value.text));
  assert(run(reading([line('2020')])));
  assert(run(reading([line('\u8461\u8404\u9152')])));
});

test('Explicit vintage 2020 survives award 2026 without a catalogue-year substitution', () => {
  for (const lines of [
    [line('Cosecha 2020'), line('Gold Medal 2026', .1, .7)],
    [line('Cosecha 2020 Gold Medal 2026')],
    [line('2026 Gold Medal, Cosecha 2020')],
  ]) {
    const candidate = run(reading(lines));
    assert(candidate);
    assert.equal(candidate.vintage, 2020);
    assert(candidate.uncertaintyReasons.some(reason => reason.includes('2020')));
  }
  const stale = { ...reading([line('Gold Medal 2026')]), vintage: 2019,
    masterRecord: { vintage: 2019 }, globalRecord: { vintage: 2019 }, affinity: 99, canonicalId: 'synthetic-stale' };
  assert.equal(run(stale)?.vintage, null);
});

test('Actual OCR boxes associate split award words but not a distant unclassified vintage', () => {
  const splitAward = [line('2026', .37, .55), line('LYON', .53, .55), line('GOLD', .49, .53)];
  assert.equal(run(reading(splitAward))?.vintage, null);
  assert.equal(run(reading([...splitAward, line('2020', .36, .1)]))?.vintage, 2020);
  assert.equal(run(reading([line('2020'), line('Gold Medal', .7, .1)]))?.vintage, 2020);
});

test('Only one unique eligible year is a hint; awards, foundations and conflicts are excluded', () => {
  for (const lines of [
    [line('2020'), line('2021', .1, .7)],
    [line('Cosecha 2020 Cosecha 2021')],
    [line('Cosecha 2020'), line('2021', .1, .7)],
    [line('Cosecha 2020 Gold Medal 2020')],
    [line('Cosecha 2020'), line('Since 2020', .1, .7)],
    [line('Since 1950')], [line('Gold Medal 2026')],
    [line('Bottled in 2020')], [line('Mis en bouteille en 2020')],
    [line('Cosecha 2020'), line('Bottled in 2020', .1, .7)],
    [line('Gold Medal 2025 2026')],
    [line('2020 '.repeat(8) + '2021')],
  ]) assert.equal(run(reading(lines))?.vintage, null, JSON.stringify(lines));
  assert.equal(run(reading([line('2020'), line('Cosecha 2020', .1, .7)]))?.vintage, 2020);
  assert.equal(run(reading([line('Since 1950'), line('2020', .1, .7)]))?.vintage, 2020);
  assert.equal(run(reading([line('Cosecha 2018'), line('Bottled in 2020', .1, .7)]))?.vintage, 2018);
});

test('Evidence is verbatim, ordered and independent, including duplicates and whitespace', () => {
  const input = reading([line('  CASA SINTETICA Z109  '), line('Cosecha\n2020', .1, .4),
    line('  CASA SINTETICA Z109  ', .1, .7)]);
  const before = structuredClone(input);
  for (const value of input.lines) { Object.freeze(value.box); Object.freeze(value); }
  Object.freeze(input.lines); Object.freeze(input.customWords); Object.freeze(input);
  const candidate = run(input);
  assert(candidate);
  assert.deepEqual(candidate.evidence, before.lines.map(value => value.text));
  assert.equal(candidate.vintage, 2020);
  assert.deepEqual(input, before);
  const again = run(input);
  assert.deepEqual(candidate, again);
  assert.notEqual(candidate, again);
  assert.notEqual(candidate.evidence, again?.evidence);
  candidate.evidence[0] = 'modified output only';
  candidate.grapes.push('modified output only');
  candidate.inferredFields.push('modified output only');
  assert.deepEqual(input, before);
  assert.deepEqual(again?.evidence, before.lines.map(value => value.text));
  assert.deepEqual(again?.grapes, []);
  assert.deepEqual(again?.inferredFields, ['name', 'producer']);
});

test('Malformed source, request, metadata, dictionaries and line shapes fail closed', () => {
  const base = reading();
  const malformed: unknown[] = [null, undefined, false, 0, '', [], {},
    { ...base, source: 'model' }, { ...base, source: 'catalog' },
    { ...base, requestId: '' }, { ...base, requestId: 'not-a-uuid' }, { ...base, requestId: null },
    { ...base, customWords: ['CASA SINTETICA Z109'] }, { ...base, customWords: null },
    { ...base, customWords: undefined }, { ...base, lines: null }, { ...base, lines: {} },
    { ...base, lines: [null] }, { ...base, lines: [line('')] },
    { ...base, lines: [{ ...line('text'), text: 2020 }] },
    { ...base, lines: [{ ...line('text'), confidence: '0.9' }] },
    { ...base, lines: [{ text: 'text', confidence: .9 }] },
  ];
  for (const field of ['width', 'height', 'revision'] as const) {
    for (const value of [NaN, Infinity, -Infinity, -1, 0, .5, null, '100']) malformed.push({ ...base, [field]: value });
  }
  for (const field of ['width', 'height'] as const) malformed.push({ ...base, [field]: 2401 });
  for (const value of [NaN, Infinity, -Infinity, -1, null, '100']) malformed.push({ ...base, totalMs: value });
  for (const raw of malformed) assert.equal(run(raw), null);
  for (const id of [null, undefined, 109, '', ' \t']) {
    assert.equal(localSingleCandidate109(base, id as string), null);
  }
});

test('Nonfinite confidence and malformed, missing or out-of-bounds boxes are rejected', () => {
  const base = line('Cosecha 2020');
  for (const confidence of [NaN, Infinity, -Infinity, -.1, 1.01, null]) {
    assert.equal(run({ ...reading(), lines: [{ ...base, confidence }] }), null);
  }
  const boxes: unknown[] = [null, {}, [], { ...base.box, x: .9, width: .3 }, { ...base.box, y: .99, height: .1 }];
  for (const field of ['x', 'y', 'width', 'height'] as const) {
    for (const value of [NaN, Infinity, -Infinity, -.01, 1.01, null, '.1', undefined]) boxes.push({ ...base.box, [field]: value });
  }
  boxes.push({ ...base.box, width: 0 }, { ...base.box, height: 0 });
  for (const box of boxes) assert.equal(run({ ...reading(), lines: [{ ...base, box }] }), null);
});

test('100 by 1000 raw evidence limit is inclusive; oversize input is never truncated or trimmed', () => {
  const input = reading(Array.from({ length: 100 }, () => line('Z'.repeat(1000))));
  const candidate = run(input);
  assert(candidate);
  assert.deepEqual(candidate.evidence, input.lines.map(value => value.text));
  for (const lines of [
    [...input.lines, line('one too many')], [line('Z'.repeat(1001))],
    [line(' '.repeat(1000) + 'Z')], [line('useful'), line('Z'.repeat(1001))],
  ]) assert.equal(run(reading(lines)), null);
  assert(run({ ...reading(), width: 2400, height: 2400, totalMs: 0,
    lines: [{ text: 'Z', confidence: 0, box: { x: 0, y: 0, width: 1, height: 1 } }] }));
});

test('Runtime imports are local and side-effect-free; no network or image decoding occurs', () => {
  const source = readFileSync(new URL('../src/utils/nativeSingleLabel109.ts', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('nativeSingleLabel109.ts', source, ts.ScriptTarget.Latest, true);
  const imports = ast.statements.filter(ts.isImportDeclaration);
  assert.deepEqual(imports.filter(value => !value.importClause?.isTypeOnly)
    .map(value => (value.moduleSpecifier as ts.StringLiteral).text), ['zod', './wineYearRole105']);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|Image|createImageBitmap|atob|registerPlugin|readLocalWineText106)\s*\(/);
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = () => { networkCalls++; throw Error('NO_NETWORK'); };
  try { assert(run(reading())); assert.equal(run(reading([])), null); }
  finally { globalThis.fetch = originalFetch; }
  assert.equal(networkCalls, 0);
});

assert.equal(canonicalIdsCreated, 0);
assert.equal(affinitiesCreated, 0);
console.log(JSON.stringify({ groups, candidatesCreated, canonicalIdsCreated, affinitiesCreated,
  networkCalls: 0, imageDecodes: 0, fixtures: 'synthetic only' }));
