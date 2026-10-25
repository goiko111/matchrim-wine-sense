import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { localSingleCandidate109 } from '../src/utils/nativeSingleLabel109';
import { canAdmitNativeCatalogLookup97 } from '../src/utils/nativeCatalogAdmission97';
import { lookupMasterReference195 } from '../src/utils/nativeMasterReference195';
import type { LocalOCRResult106 } from '../src/utils/nativeOCR106';

const fixture = JSON.parse(readFileSync('qa-fixtures/example207/ACCEPTANCE.json', 'utf8'));
let groups = 0, bridgeCalls = 0;
const check = async (name: string, run: () => void | Promise<void>) => { await run(); groups++; console.log('PASS', name); };
const reading = (texts: string[]): LocalOCRResult106 => ({
  source: 'apple-vision-device', requestId: '00000000-0000-4000-8000-000000020701',
  width: 899, height: 1599, revision: 3, totalMs: 0, customWords: [],
  lines: texts.map((text, index) => ({ text, confidence: .95,
    box: { x: .3, y: .5 + index * .05, width: .3, height: .02 } })),
});
const unknown = (candidate: ReturnType<typeof localSingleCandidate109>) => {
  assert(candidate);
  assert.equal(candidate.name, 'Etiqueta por identificar');
  assert.equal(candidate.producer, null);
  assert.equal(candidate.confidence, 0);
  for (const key of ['canonicalId', 'masterRecord', 'globalRecord', 'originalSheet', 'sensoryAttributes', 'affinity']) {
    assert.equal(candidate[key as keyof typeof candidate], null, key);
  }
  assert.deepEqual(candidate.grapes, []);
  assert.equal(canAdmitNativeCatalogLookup97(candidate), false);
  return candidate;
};

await check('Local supplied image is preserved byte-for-byte, not uploaded or committed', () => {
  const original = readFileSync(fixture.source), copy = readFileSync(fixture.localCopy);
  assert.deepEqual(original, copy);
  assert.equal(copy.length, fixture.bytes);
  assert.equal(createHash('sha256').update(copy).digest('hex'), fixture.sha256);
  assert.equal(fixture.externalUploadAuthorized, false);
  assert.equal(fixture.pixelOCR.status, 'MACOS_PARTIAL_READING');
  assert.equal(fixture.humanVisualObservations.canonicalId, null);
  assert.equal(fixture.humanVisualObservations.tentativeCursiveTextConfirmed, false);
});
await check('Simulated clear grape/year reading remains an unidentified label', () => {
  const candidate = unknown(localSingleCandidate109(reading(['Pinot Noir', '2023']), fixture.id));
  assert.equal(candidate.vintage, 2023);
  assert(candidate.uncertaintyReasons.some(value => value.includes('solo una pista')));
});
await check('Cursive alternatives never fabricate a producer, canonical reference or sensory profile', () => {
  for (const cursive of ['Les Quatre Piliers', 'Le Quatre Piliers', 'Les Quatre Pitiers', '?']) {
    unknown(localSingleCandidate109(reading([cursive, 'Pinot Noir', '2023']), fixture.id));
  }
});
await check('Missing and ambiguous dates never substitute a catalogue vintage', () => {
  for (const texts of [['Pinot Noir'], ['Pinot Noir', '2023', '2022'], ['Pinot Noir', 'Gold Medal 2023']]) {
    assert.equal(unknown(localSingleCandidate109(reading(texts), fixture.id)).vintage, null);
  }
});
await check('Simulated partial identification performs no catalogue invocation', async () => {
  const candidate = unknown(localSingleCandidate109(reading(['Pinot Noir', '2023']), fixture.id));
  const result = await lookupMasterReference195(candidate, async () => { bridgeCalls++; throw new Error('FORBIDDEN'); });
  assert.equal(result.status, 'identity-required');
  assert.equal(result.affinityAttributes, null);
  assert.equal(bridgeCalls, 0);
});
await check('Stale OCR metadata cannot carry an old score or reference into this photo', () => {
  const raw = { ...reading(['Pinot Noir', '2023']), canonicalId: 'stale-test-only', affinity: 99,
    sensoryAttributes: { power: 5 }, producer: 'guessed-test-only', vintage: 2020 };
  const candidate = unknown(localSingleCandidate109(raw, fixture.id));
  assert.equal(candidate.vintage, 2023);
  assert.deepEqual(candidate.evidence, ['Pinot Noir', '2023']);
});
await check('Actual macOS readings stay literal and unidentified even at OCR confidence 1.0', async () => {
  const observed = JSON.parse(readFileSync(fixture.pixelOCR.observedFixture, 'utf8'));
  assert.equal(observed.runs.length, 3);
  const names = new Set<string>();
  for (const run of observed.runs) {
    assert.equal(run.raw.source, 'apple-vision-macos');
    assert.equal(run.raw.sourceSHA256, fixture.sha256);
    assert.equal(run.receipt.networkDeniedBySandbox, true);
    assert.equal(run.receipt.canonicalIdentityValidated, false);
    assert.equal(createHash('sha256').update(readFileSync(run.root + '/OCR.json')).digest('hex'), run.rawSHA256);
    assert.equal(createHash('sha256').update(readFileSync(run.root + '/REPORT.json')).digest('hex'), run.receiptSHA256);
    assert.deepEqual(run.raw.customWords, []);
    if (run.root.endsWith('/ocr-r1')) assert.equal(run.raw.lines[0].confidence, 1);
    names.add(run.raw.lines[0].text);
    // Explicit contract replay: map macOS text to the device-shaped interface,
    // never claim that the iPhone plugin produced these observations.
    const replay = { ...reading([]), width: run.raw.width, height: run.raw.height, lines: run.raw.lines };
    const candidate = unknown(localSingleCandidate109(replay, fixture.id));
    assert.equal(candidate.vintage, 2023);
    assert.deepEqual(candidate.evidence, run.raw.lines.map((line: { text: string }) => line.text));
    const result = await lookupMasterReference195(candidate, async () => { bridgeCalls++; throw new Error('FORBIDDEN'); });
    assert.equal(result.status, 'identity-required');
  }
  assert.equal(names.size, 3, 'Crop/language variants disagree; do not choose a spelling');
  assert.equal(bridgeCalls, 0);
});
console.log(JSON.stringify({ passed: true, groups, pixelOCRExecuted: false,
  pixelOCRRetainedRuns: 3, syntheticAndObservedContractReplay: true,
  bridgeCalls, externalCalls: 0, canonicalIdentityValidated: false }));
