import assert from 'node:assert/strict';
import { suggestLocalOCRFragments108, type LocalOCRFragmentLine108 } from '../src/utils/localOCRFragments108';

let tests = 0;
const test = (name: string, run: () => void) => { run(); tests++; console.log('PASS', name); };
const line = (text: string, x: number, width: number, y = .2, height = .017, confidence = .96): LocalOCRFragmentLine108 =>
  ({ text, confidence, box: { x, y, width, height } });
const pair = () => [line('G', .1, .053), line('ODELLO', .168, .477)];
const none = (lines: readonly LocalOCRFragmentLine108[]) => assert.deepEqual(suggestLocalOCRFragments108(lines).alternatives, []);
const malformed = (input: unknown) => {
  const result = suggestLocalOCRFragments108(input as readonly LocalOCRFragmentLine108[]);
  assert.deepEqual(result.alternatives, []);
  assert.deepEqual(result.warnings, ['invalid-input']);
  assert.equal(result.rawLines, input);
};

test('Requested geometry proposes explicitly reconstructed GODELLO without replacing raw OCR', () => {
  const lines = pair();
  const before = JSON.stringify(lines);
  const result = suggestLocalOCRFragments108(lines);
  assert.equal(result.rawLines, lines);
  assert.equal(JSON.stringify(lines), before);
  assert.equal(result.alternatives.length, 1);
  const suggestion = result.alternatives[0];
  assert.equal(suggestion.text, 'GODELLO');
  assert.deepEqual(suggestion.sourceIndices, [0, 1]);
  assert.equal(suggestion.reconstructed, true);
  assert.equal(suggestion.usage, 'native-local-recovery-only');
  assert.equal(suggestion.canonicalIdentityEvidence, false);
  assert.equal(suggestion.warning, 'reconstructed-adjacent-fragments-not-identity-evidence');
  assert.deepEqual(result.warnings, [suggestion.warning]);
  assert(Math.abs(suggestion.horizontalGap - .015) < 1e-12);
  assert(Math.abs(suggestion.box.width - .545) < 1e-12);
  assert.equal(suggestion.box.x, .1);
  assert.equal(suggestion.box.y, .2);
  assert(Math.abs(suggestion.box.height - .017) < 1e-12);
  assert.equal(Object.prototype.hasOwnProperty.call(suggestion, 'canonicalId'), false);
});
test('Input order is irrelevant; source indices follow geometric reading order', () => {
  const result = suggestLocalOCRFragments108(pair().reverse());
  assert.equal(result.alternatives[0].text, 'GODELLO');
  assert.deepEqual(result.alternatives[0].sourceIndices, [1, 0]);
});
test('Single-letter suffix is supported without uppercasing or spelling correction', () => {
  const result = suggestLocalOCRFragments108([line('abc', .1, .15), line('d', .26, .05)]);
  assert.equal(result.alternatives[0].text, 'abcd');
});
test('Precomposed Unicode letters and non-BMP letters are counted as code points', () => {
  for (const letter of ['\u00c9', '\u03a9', '\u{10400}']) {
    const lines = [line(letter, .1, .053), line('\u00c1bcd', .168, .3)];
    assert.equal(suggestLocalOCRFragments108(lines).alternatives[0].text, `${letter}\u00c1bcd`);
  }
});
test('Raw whitespace, punctuation, digits, symbols and combining marks are not normalized into letters', () => {
  for (const text of [' G', 'G ', 'G\n', 'G1', '1', '-', 'G\u0301', 'G\u200b', '\u{1f377}']) {
    none([line(text, .1, .053), pair()[1]]);
  }
  for (const text of ['ODE LLO', 'ODE-LLO', 'ODE3', 'ODE\n', 'ODE\u0301']) none([pair()[0], line(text, .168, .477)]);
});
test('Only one plus at least three letters qualifies, never DA plus LUCA or chains', () => {
  for (const [a, b] of [['DA', 'LUCA'], ['AB', 'CDE'], ['A', 'B'], ['A', 'BC'], ['ABC', 'DEF']]) {
    none([line(a, .1, .053), line(b, .168, .477)]);
  }
  none([line('A', .1, .05), line('B', .16, .05), line('CDEF', .22, .2)]);
});
test('Joined length is bounded to 4 through 16 Unicode letters', () => {
  assert.equal(suggestLocalOCRFragments108([line('A', .1, .05), line('BCD', .16, .3)]).alternatives.length, 1);
  assert.equal(suggestLocalOCRFragments108([line('A', .1, .05), line('B'.repeat(15), .16, .6)]).alternatives.length, 1);
  none([line('A', .1, .05), line('B'.repeat(16), .16, .6)]);
});
test('Confidence threshold applies to both sources and is not boosted by reconstruction', () => {
  for (const index of [0, 1]) {
    const lines = pair();
    lines[index] = { ...lines[index], confidence: .8999 };
    none(lines);
    lines[index] = { ...lines[index], confidence: .9 };
    assert.equal(suggestLocalOCRFragments108(lines).alternatives[0].confidence, .9);
  }
});
test('Distant letters and other columns are not joined', () => {
  none([line('L', .01, .053), line('ODELLO', .168, .477)]);
  none([line('G', .1, .053), line('ODELLO', .65, .3)]);
  none([line('G', .1, .053), line('ODELLO', .18, .477)]);
});
test('Gap is bounded by text height and average letter width, not just absolute distance', () => {
  none([line('G', .1, .053, .2, .008), line('ODELLO', .168, .477, .2, .008)]);
  none([line('G', .1, .01), line('ABC', .12, .15)]);
  none([line('G', .1, .053), line('ABCDE', .168, .05)]);
});
test('Overlapping or touching fragments are rejected', () => {
  none([line('G', .1, .05), line('ODELLO', .14, .477)]);
  none([line('G', .1, .025), line('ODELLO', .125, .477)]);
  none([line('G', .1, .053), line('ODELLO', .1, .477)]);
});
test('Cross-line, baseline shifts and dissimilar heights are rejected', () => {
  none([pair()[0], line('ODELLO', .168, .477, .23)]);
  none([pair()[0], line('ODELLO', .168, .477, .205)]);
  none([pair()[0], line('ODELLO', .168, .477, .2, .025)]);
  none([line('G', .1, .053, .25), line('ODELLO', .168, .477, .2)]);
});
test('Small baseline and height variations still permit a local suggestion', () => {
  assert.equal(suggestLocalOCRFragments108([pair()[0], line('ODELLO', .168, .477, .201, .018)]).alternatives.length, 1);
});
test('Competing left and right neighbors veto all possible attachments', () => {
  none([line('ABC', .01, .08), ...pair()]);
  none([...pair(), line('XYZ', .655, .2)]);
  none([line('ABC', .1, .15), line('G', .26, .05), line('DEF', .32, .15)]);
});
test('Duplicates, intervening observations, low-confidence and non-letter neighbors veto joins', () => {
  for (const blocker of [pair()[0], pair()[1], line('-', .155, .005), line('?', .155, .005, .2, .017, .1),
    line('OTHER', .12, .3), line('X', .655, .01, .2, .017, .1)]) none([...pair(), blocker]);
});
test('Unrelated rows or distant same-row observations do not veto a pair', () => {
  const lines = [...pair(), line('OTHER', .1, .3, .3), line('L', .85, .05)];
  assert.equal(suggestLocalOCRFragments108(lines).alternatives.length, 1);
});
test('Two isolated rows yield independent supplemental alternatives with original indices', () => {
  const lines = [...pair(), line('abc', .1, .15, .5), line('d', .26, .05, .5)];
  const result = suggestLocalOCRFragments108(lines);
  assert.deepEqual(result.alternatives.map(item => item.text), ['GODELLO', 'abcd']);
  assert.deepEqual(result.alternatives.map(item => item.sourceIndices), [[0, 1], [2, 3]]);
});
test('Malformed containers and sparse arrays fail closed', () => {
  for (const input of [null, undefined, {}, 'G', new Array(2), [...pair(), null]]) malformed(input);
});
test('Malformed line text and confidence fail the entire batch, including unrelated observations', () => {
  for (const text of ['', 3, null, 'A'.repeat(1001)]) malformed([...pair(), { ...line('A', .8, .1), text }]);
  for (const confidence of [NaN, Infinity, -Infinity, -.1, 1.01, '.96', null]) {
    malformed([...pair(), { ...line('A', .8, .1), confidence }]);
  }
});
test('Malformed, nonfinite and out-of-frame boxes fail closed', () => {
  for (const box of [null, {}, [], { x: .1, y: .2, width: .1 }]) malformed([{ ...pair()[0], box }, pair()[1]]);
  for (const key of ['x', 'y', 'width', 'height']) {
    for (const value of [NaN, Infinity, -Infinity, -.1, 1.1, '0.1', null]) {
      malformed([{ ...pair()[0], box: { ...pair()[0].box, [key]: value } }, pair()[1]]);
    }
  }
  for (const box of [{ x: .9, y: .2, width: .2, height: .017 }, { x: .1, y: .99, width: .053, height: .02 },
    { x: .1, y: .2, width: 0, height: .017 }, { x: .1, y: .2, width: .053, height: 0 }]) {
    malformed([{ ...pair()[0], box }, pair()[1]]);
  }
});
test('Empty and singleton inputs are harmless; 100 lines accepted, 101 rejected without truncation', () => {
  assert.deepEqual(suggestLocalOCRFragments108([]), { rawLines: [], alternatives: [], warnings: [] });
  none([pair()[0]]);
  const hundred = [...pair(), ...Array.from({ length: 98 }, () => line('OTHER', .8, .1, .7))];
  assert.equal(suggestLocalOCRFragments108(hundred).alternatives.length, 1);
  const over = [...hundred, line('L', .85, .05)];
  const result = suggestLocalOCRFragments108(over);
  assert.deepEqual(result.alternatives, []);
  assert.deepEqual(result.warnings, ['line-limit-exceeded']);
  assert.equal(result.rawLines, over);
  assert.equal(result.rawLines.length, 101);
});
test('Frozen input works and output geometry cannot mutate source geometry', () => {
  const lines = Object.freeze(pair().map(item => Object.freeze({ ...item, box: Object.freeze({ ...item.box }) })));
  const result = suggestLocalOCRFragments108(lines);
  assert.equal(result.rawLines, lines);
  assert.equal(result.alternatives.length, 1);
  assert.notEqual(result.alternatives[0].box, lines[0].box);
  assert.notEqual(result.alternatives[0].box, lines[1].box);
});

console.log(JSON.stringify({ tests, failures: 0, syntheticOnly: true, nativeOCRCalls: 0, networkCalls: 0,
  scope: 'Geometry-only supplemental native local recovery; not canonical identity evidence' }));
