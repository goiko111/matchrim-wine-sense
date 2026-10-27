import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { plan274 } from './probe-matchrim-first20-274';
import { parseMasterDetail188, masterVintageEvidence188 } from '../src/utils/nativeMasterContract188';
import { describeMasterSensory195 } from '../src/utils/nativeMasterReference195';

const root = 'qa-artifacts/first20-274-20261027';
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
export const reportFirst20_279 = () => {
  const sources: { file: string; sha256: string }[] = [];
  const read = (file: string) => {
    const bytes = fs.readFileSync(file); sources.push({ file, sha256: sha(bytes) });
    return JSON.parse(bytes.toString());
  };
  const earlier = read('qa-fixtures/first20-272/RESULT.json');
  assert.equal(earlier.sourceSHA256, '9cf8268d45356e89286b6a54bce24444540ad0b42b9eca691e8e73081d9d87b2');
  assert.equal(earlier.scenesChecked, 20);
  const failed = read(root + '/live-r1/01-RECEIPT.json');
  assert.equal(failed.httpStatus, 503); assert.equal(failed.index, 1);
  const live = read(root + '/live-r2/RESULT.json');
  assert(live.passed && live.attempts === 18 && live.cumulativeAttempts === 19 && live.unusedAllowance === 0);
  const original = plan274();
  const elapsed: number[] = [];
  const rows = earlier.rows.map((scene: { imageId: string; indicatedVintage: number | null; imageSHA256: string;
    expectedForEvaluationOnly: { name: string; producer: string } }) => {
    if (scene.imageId === 'img-001') return { imageId: scene.imageId, canonicalId: original[0].canonicalId,
      name: scene.expectedForEvaluationOnly.name, nameSource: 'Expected manifest only, not a successful API detail',
      status: 'original-503-not-retried', httpStatus: 503, sensoryRows: null, declaredVintages: null,
      imageIdentityConfirmed: false, affinityGranted: false };
    const reused = scene.imageId === 'img-017';
    const entry = original.find(value => value.imageId === scene.imageId);
    const index = entry ? original.indexOf(entry) + 1 : null;
    const canonicalId = reused ? 217480 : entry!.canonicalId;
    const bodyFile = reused ? 'qa-artifacts/master253-20261026/hosted-six-r1/03-BODY.json'
      : root + `/live-r2/${String(index).padStart(2, '0')}-BODY.json`;
    const receipt = read(reused ? 'qa-fixtures/hosted258/RESULT.json'
      : root + `/live-r2/${String(index).padStart(2, '0')}-RECEIPT.json`);
    if (reused) assert(receipt.allHTTP200 && receipt.checks.some((value: { canonicalId?: number }) => value.canonicalId === canonicalId));
    else {
      assert(receipt.httpStatus === 200 && receipt.cumulativeIndex === index && receipt.url === entry!.url);
      elapsed.push(receipt.elapsedMs);
    }
    const wine = parseMasterDetail188(read(bodyFile), canonicalId); assert(wine);
    assert.equal(wine.name, scene.expectedForEvaluationOnly.name);
    assert.equal(wine.winery, scene.expectedForEvaluationOnly.producer);
    const requested = scene.indicatedVintage === null ? null : String(scene.indicatedVintage);
    const evidence = masterVintageEvidence188(wine, requested);
    return { imageId: scene.imageId, canonicalId, name: wine.name, winery: wine.winery,
      status: reused ? 'retained-detail-200' : 'new-detail-200', httpStatus: 200,
      exactManifestNameProducerEqual: true, imageSHA256: scene.imageSHA256,
      observedVintageHint: requested, declaredVintages: wine.vintages,
      vintageHintStatus: evidence.status, selectedSensoryScope: evidence.scope,
      sensoryRows: wine.tastingAttributes.attributesByVintage.length,
      sensoryRowSummaries: wine.tastingAttributes.attributesByVintage.map(value => ({
        vintage: value.vintage, sourceRecorded: value.source !== null,
        axes: { power: value.power, acidity: value.acidity, sweetness: value.sweetness, tannin: value.tannin, fruity: value.fruity },
        ambiguousDefaultAxes: (['power', 'acidity', 'sweetness', 'tannin', 'fruity'] as const).filter(axis => value[axis] === 3),
      })),
      selectedSensory: describeMasterSensory195(wine, requested),
      imageIdentityConfirmed: false, affinityGranted: false, profileLearningGranted: false,
      lookupBy: 'Supplied canonical ID, not the OCR candidate or a live search' };
  });
  assert.equal(rows.length, 20);
  const details = rows.filter((value: { httpStatus: number }) => value.httpStatus === 200);
  const sorted = [...elapsed].sort((a, b) => a - b);
  return { scope: 'First20 detail availability plus retained OCR vintage hints; NOT live scanner or account-save E2E',
    rows, sources, metrics: { scenes: 20, newReads: 18, allNewHTTP200: true,
      originalTrancheAttempts: 19, originalTrancheMaximum: 19, unusedAllowance: 0,
      canonicalDetailsAvailable: details.length, detailsWithoutSensoryRows: details.filter((value: { sensoryRows: number }) => value.sensoryRows === 0).length,
      detailsWithSensoryRows: details.filter((value: { sensoryRows: number }) => value.sensoryRows > 0).length,
      detailsWithRecordedSource: details.filter((value: { sensoryRowSummaries: { sourceRecorded: boolean }[] }) => value.sensoryRowSummaries.some(row => row.sourceRecorded)).length,
      detailsWithDeclaredVintages: details.filter((value: { declaredVintages: string[] }) => value.declaredVintages.length).length,
      newReadLatencyMs: { min: sorted[0], median: (sorted[8] + sorted[9]) / 2, p95NearestRank: sorted[17], max: sorted[17], total: elapsed.reduce((a, b) => a + b, 0) },
      realPhotoIdentitiesConfirmed: 0, realEndToEndChainsApproved: 0, affinityGranted: 0,
      additionalModelImageCalls: 0, writes: 0, additionalEUR: 0 } };
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = reportFirst20_279();
  if (process.argv[2] === '--save') {
    const output = 'qa-fixtures/first20-279/RESULT.json';
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
  console.log(JSON.stringify(report.metrics));
}
