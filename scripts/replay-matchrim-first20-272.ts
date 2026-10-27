import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { localSingleCandidate109 } from '../src/utils/nativeSingleLabel109';
import { nativeWineConsumerResult } from '../src/utils/multiWineConsumer95';
import { resolveMasterCandidate259 } from '../src/utils/nativeMasterLink259';
import { makeCellarMasterReference260, readCellarMasterReference260, confirmsCellarMasterReference260 } from '../src/utils/cellarMasterReference260';
import { cellarTrainingRows } from '../src/utils/bodegaAffinity';
import { nativeVerdictsSnapshot159, resolveNativeRescanVerdict159 } from '../src/utils/nativeRescanVerdict159';
import { correctNativeIdentity218 } from '../src/utils/nativeIdentityCorrection218';
import type { LocalOCRResult106 } from '../src/utils/nativeOCR106';
import type { WineCandidate } from '../src/utils/multiWineScan';

const source = 'qa-artifacts/night105-20261021/native112-corpus200-r23/REPORT.json';
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
const profiles = [
  { potente: 1, acidez: 5, dulce: 1, tanico: 1, afrutado: 3 },
  { potente: 5, acidez: 3, dulce: 1, tanico: 5, afrutado: 4 },
  { potente: 2, acidez: 2, dulce: 5, tanico: 1, afrutado: 5 },
];
type Scene = { imageId: string; inputSHA256: string; reading: LocalOCRResult106;
  expected: { name: string; producer: string }; status: string; proposals: { name: string }[] };

export async function replay272() {
  const sourceBytes = fs.readFileSync(source);
  assert.equal(sha(sourceBytes), '9cf8268d45356e89286b6a54bce24444540ad0b42b9eca691e8e73081d9d87b2');
  const report = JSON.parse(sourceBytes.toString());
  const prepared = read('qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/REPORT.json');
  const scenes = (report.rows as Scene[]).slice(0, 20);
  assert.deepEqual(scenes.map(row => row.imageId), Array.from({ length: 20 }, (_, i) => `img-${String(i + 1).padStart(3, '0')}`));
  const previousFetch = globalThis.fetch;
  let forbiddenNetworkAttempts = 0;
  globalThis.fetch = async () => { forbiddenNetworkAttempts++; throw Error('FIRST20_272_NO_NETWORK'); };
  try {
    const rows = scenes.map(scene => {
      const image = prepared.prepared.find((item: { imageId: string }) => item.imageId === scene.imageId);
      assert(image && image.sha256 === scene.inputSHA256);
      assert.equal(sha(fs.readFileSync(image.path)), scene.inputSHA256);
      // Only the retained raw reading enters production logic, never expected names.
      const candidate = localSingleCandidate109(scene.reading, scene.imageId);
      const results = profiles.map(profile => {
        const result = nativeWineConsumerResult(candidate, profile);
        assert.equal(result.catalogIdentityLinked, false);
        assert.equal(result.canExplainAffinity, false);
        assert.equal(result.pending?.reason, 'identity');
        assert.equal(candidate?.affinity ?? null, null);
        assert.equal(candidate ? makeCellarMasterReference260(candidate) : null, null);
        return { affinity: candidate?.affinity ?? null, reason: result.pending?.reason,
          nextStep: result.pending?.nextStep };
      });
      return { imageId: scene.imageId, imageSHA256: scene.inputSHA256,
        currentLocalCandidateCreated: Boolean(candidate), indicatedVintage: candidate?.vintage ?? null,
        rawOCRReused: true, newOCRPerformed: false, consumerChecks: results,
        liveMasterLookupPerformed: false, liveSavePerformed: false, fullRealChainApproved: false,
        historicalProposalNames: scene.proposals.map(item => item.name), historicalQueryStatus: scene.status,
        expectedForEvaluationOnly: scene.expected };
    });

    // Separate manual-reference fixture branch. It is not recognition of img-017.
    const base = 'qa-artifacts/master253-20261026/hosted-six-r1/';
    const page = read(base + '02-BODY.json'), detail = read(base + '03-BODY.json');
    const manual: WineCandidate = { id: 'MANUAL-QA272', name: detail.name, producer: detail.winery,
      vintage: null, region: null, country: null, grapes: [], alcohol: null,
      confidence: 0, source: 'manual', evidence: ['Identidad introducida manualmente en QA local'],
      uncertaintyReasons: [], inferredFields: [] };
    let fixtureOperations = 0;
    const resolved = await resolveMasterCandidate259(manual, async operation => {
      fixtureOperations++; assert(fixtureOperations <= 2);
      return structuredClone(operation.operation === 'search' ? page : detail);
    });
    assert.equal(resolved.status, 'reference-ready'); assert(resolved.status === 'reference-ready');
    const linked = resolved.candidate, reference = makeCellarMasterReference260(linked);
    assert(reference);
    for (const profile of profiles) {
      const result = nativeWineConsumerResult(linked, profile);
      assert.equal(result.catalogIdentityLinked, true);
      assert.equal(result.canExplainAffinity, false);
      assert.equal(result.pending?.reason, 'sensory');
      assert(result.pending?.description.includes('Winerim tiene esta referencia'));
    }
    const row = { id: 'SYNTHETIC-ROW272', user_id: 'SYNTHETIC-OWNER272',
      name: linked.name, producer: linked.producer, vintage: linked.vintage,
      region: linked.region, country: linked.country, status: 'wishlist', is_favorite: false,
      rating: 'love' as const, use_for_profile_training: true, sensory_attributes: null,
      place_details: { winerim_master_reference260: reference } };
    const restored = JSON.parse(JSON.stringify(row));
    assert(readCellarMasterReference260(restored));
    assert.equal(confirmsCellarMasterReference260(restored, row), true);
    assert.equal(confirmsCellarMasterReference260({ ...restored, place_details: null }, row), false);
    assert.deepEqual(cellarTrainingRows([restored], true), []);
    assert.equal(resolveNativeRescanVerdict159(row.user_id,
      nativeVerdictsSnapshot159(row.user_id, [restored], 1), linked), null);
    const corrected = correctNativeIdentity218(linked, { name: linked.name, producer: linked.producer!, vintage: 2024 });
    assert(corrected); assert.equal(corrected.masterLink259, null); assert.equal(corrected.canonicalId, null);
    assert.equal(readCellarMasterReference260({ ...restored, vintage: 2024 }), null);
    assert.equal(fixtureOperations, 2); assert.equal(forbiddenNetworkAttempts, 0);
    return { scope: 'First20 current native logic on retained readings, plus separate manual-reference lifecycle fixture. NOT live image/catalogue/save E2E.',
      sourceFile: source, sourceSHA256: sha(sourceBytes), scenesChecked: rows.length,
      currentLocalCandidates: rows.filter(row => row.currentLocalCandidateCreated).length,
      syntheticProfiles: profiles, consumerProfileChecks: rows.length * profiles.length,
      newOCRCalls: 0, externalRequests: 0, forbiddenNetworkAttempts, databaseWrites: 0,
      fullRealChainsApproved: 0, build125Changed: false,
      manualReferenceBranch: { status: 'PASS', fixtureOperations, retainedCanonicalId: detail.mantalakWineId,
        sourceVintage: null, declaredVintages: detail.vintages, sensoryRows: detail.tastingAttributes.attributesByVintage.length,
        automaticallyRecognizedPhoto: false, serializedReferencePreserved: true,
        missingMetadataRejected: true, profileTrainingRows: 0,
        unknownVintagePersonalVerdictTransferred: false, correctedVintageInvalidatesReference: true,
        fullScannerSaveCallbackTested: false, actualServerPersistenceTested: false }, rows };
  } finally { globalThis.fetch = previousFetch; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const leases = read('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json').leases;
  const lease = leases['writer-matchrim-native99'];
  assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d'
    && lease.leaseId === process.env.MATCHRIM102_WRITER_LEASE_ID && lease.reviewAfter * 1000 > Date.now());
  const result = await replay272();
  const output = 'qa-fixtures/first20-272/RESULT.json';
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output, scenes: result.scenesChecked, consumerProfileChecks: result.consumerProfileChecks,
    manualReferenceBranch: result.manualReferenceBranch, fullRealChainsApproved: 0, externalRequests: 0 }));
}
