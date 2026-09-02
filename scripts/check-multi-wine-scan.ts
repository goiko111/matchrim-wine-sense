import assert from 'node:assert/strict';
import {
  areLikelyDuplicateWines,
  areLikelySamePhysicalDetection,
  buildWineDetectionTiles,
  confirmWineCandidateIdentity,
  correctWineCandidateIdentity,
  determineRegionStatus,
  getConfirmableWineGroups,
  getFullWineDetectionTile,
  groupDuplicateWines,
  getRegionAnalysisConcurrency,
  intersectionOverUnion,
  mapWithConcurrency,
  mapDetectedRegionFromTile,
  mergeWineDetectionTileResults,
  normalizeDetectedRegions,
  normalizeRecognitionFallback,
  normalizeScanCoverage,
  normalizeWineCandidates,
  prioritizeRegionsForAnalysis,
  shouldRefineWineDetection,
  summarizeScanRegions,
  type ScanRegion,
} from '../src/utils/multiWineScan';
import { buildAiRimContextGuidance } from '../src/utils/aiRimContextGuide';
import { buildMatchrimQaFixturePayload } from '../src/utils/matchrimQaFixtures';
import {
  buildDetailedAffinityExplanation,
  calculateLocalMatchrimAffinity,
} from '../src/utils/wineAffinityExplanation';
import { buildWineComparisonDecision } from '../src/utils/wineComparison';
import { isWineMenuItem } from '../src/utils/wineMenuGrounding';
import {
  calibrateInferredAffinity,
  calibrateMenuIdentityConfidence,
  getConfidenceBand,
} from '../src/utils/scanConfidence';
import { evaluateCandidateGrounding } from '../supabase/functions/analyze-wine-region/grounding';
import { shouldRejectTextAnalysis } from '../src/utils/imageAnalysis';
import {
  buildMenuScanTiles,
  mapMenuWineFromTile,
  mergeMenuTileResults,
  resolveMenuTileResults,
  type MenuScanWine,
} from '../src/utils/wineMenuScan';
import {
  EdgeFunctionError,
  edgeFunctionRetryDelay,
  invokeWithEdgeFunctionRetry,
  isRetryableEdgeFunctionError,
  waitForAbortableDelay,
} from '../src/utils/edgeFunctionResilience';
import { clusterOverlayPins } from '../src/utils/overlayPins';

const regions = normalizeDetectedRegions({
  regions: [
    { box: { x: 10, y: 8, width: 20, height: 70 }, confidence: 0.91, quality: { glare: 'low', occlusion: 'low', legibility: 'good' } },
    { box: { x: 10.5, y: 8.5, width: 19.5, height: 69 }, confidence: 0.72 },
    { box: { x: 38, y: 9, width: 18, height: 68 }, confidence: 0.84 },
    { box: { x: 99, y: 10, width: 0.5, height: 20 }, confidence: 0.99 },
  ],
});

assert.equal(regions.length, 2, 'overlapping detections and tiny boxes should be removed');
assert.equal(regions[0].index, 1);
assert.equal(regions[1].index, 2);
assert.ok(intersectionOverUnion(regions[0].box, regions[0].box) === 1);
assert.ok(intersectionOverUnion(regions[0].box, regions[1].box) === 0);
assert.equal(areLikelySamePhysicalDetection(
  { x: 10, y: 10, width: 14, height: 18 },
  { x: 8, y: 8, width: 18, height: 72 },
), true, 'a label fragment and its containing bottle should be one physical detection');
assert.equal(areLikelySamePhysicalDetection(
  { x: 48, y: 0, width: 46, height: 98 },
  { x: 86, y: 42, width: 13, height: 55 },
), true, 'a narrow fragment mostly inside a much larger bottle should collapse');
assert.equal(areLikelySamePhysicalDetection(
  { x: 35, y: 1, width: 12, height: 21 },
  { x: 30, y: 18, width: 12, height: 65 },
), true, 'a short shelf or neck fragment touching a taller bottle should collapse');
assert.equal(areLikelySamePhysicalDetection(
  { x: 10, y: 11, width: 13, height: 72 },
  { x: 20, y: 15, width: 13, height: 69 },
), false, 'adjacent bottles in a dense shelf must remain independent');

const malformedDenseDetection = {
  coverage: { status: 'partial', estimated_visible_objects: 70, confidence: 0.9 },
  regions: [
    { object_type: 'label', box: { x: 10, y: 98, width: 31, height: 2 }, confidence: 0.9 },
    { object_type: 'label', box: { x: 98, y: 98, width: 2, height: 2 }, confidence: 0.9 },
  ],
};
assert.equal(normalizeDetectedRegions(malformedDenseDetection).length, 0, 'edge slivers are not analyzable labels');
assert.equal(shouldRefineWineDetection(malformedDenseDetection, []), true);

const clutteredDetection = {
  coverage: { status: 'reported_complete', estimated_visible_objects: 5 },
  regions: [
    { object_type: 'bottle', box: { x: 48, y: 0, width: 46, height: 98 }, confidence: 0.8 },
    { object_type: 'label', box: { x: 50, y: 2, width: 14, height: 19 }, confidence: 0.7 },
    { object_type: 'label', box: { x: 54, y: 3, width: 14, height: 19 }, confidence: 0.65 },
  ],
};
const normalizedClutter = normalizeDetectedRegions(clutteredDetection);
assert.equal(normalizedClutter.length, 1, 'nested fragments should collapse into their bottle');
assert.equal(shouldRefineWineDetection(clutteredDetection, normalizedClutter), true);

const detectionTiles = buildWineDetectionTiles(1800, 1200);
assert.deepEqual(detectionTiles.map((tile) => tile.id), ['left', 'right']);
assert.equal(getFullWineDetectionTile().id, 'full');
const mappedDetection = mapDetectedRegionFromTile({
  ...regions[0],
  box: { x: 10, y: 20, width: 20, height: 50 },
}, detectionTiles[1]);
assert.deepEqual(mappedDetection.box, { x: 49.6, y: 20, width: 11.2, height: 50 });
const mergedDetection = mergeWineDetectionTileResults([
  {
    tile: detectionTiles[0],
    payload: {
      coverage: { status: 'reported_complete', estimated_visible_objects: 1, confidence: 0.9 },
      regions: [{ object_type: 'bottle', box: { x: 80, y: 10, width: 18, height: 70 }, confidence: 0.8 }],
    },
  },
  {
    tile: detectionTiles[1],
    payload: {
      coverage: { status: 'reported_complete', estimated_visible_objects: 1, confidence: 0.88 },
      regions: [{ object_type: 'bottle', box: { x: 2, y: 10, width: 18, height: 70 }, confidence: 0.82 }],
    },
  },
]);
assert.equal(mergedDetection.regions.length, 1, 'overlap tiles should not duplicate the same bottle');
assert.equal(mergedDetection.coverage.status, 'reported_complete');

const coverage = normalizeScanCoverage({
  coverage: {
    status: 'partial',
    estimated_visible_objects: 7,
    confidence: 0.74,
    notes: ['Dos botellas parcialmente ocultas.'],
  },
}, regions.length);
assert.equal(coverage.status, 'partial');
assert.equal(coverage.detectedObjects, 2);
assert.equal(coverage.estimatedVisibleObjects, 7);
assert.equal(coverage.confidence, 0.74);

const unknownCoverage = normalizeScanCoverage({}, regions.length);
assert.equal(unknownCoverage.status, 'unknown');
assert.equal(unknownCoverage.estimatedVisibleObjects, null);

const candidates = normalizeWineCandidates({
  candidates: [
    {
      name: 'Celler Aripta Brut',
      producer: 'Aripta',
      vintage: null,
      confidence: 0.81,
      evidence: ['ARIPTA visible'],
      uncertainty_reasons: [],
      sensory_attributes: { potencia: 2, acidez: 4, dulzura: 1, taninos: 1, afrutado: 3 },
    },
    { name: 'Sin nombre', confidence: 0.7 },
  ],
}, 'region-1');

assert.equal(candidates.length, 1);
assert.equal(candidates[0].confidence, 0.81);
assert.equal(determineRegionStatus(candidates), 'recognized');
assert.equal(determineRegionStatus([{ ...candidates[0], confidence: 0.6 }]), 'uncertain');
assert.equal(determineRegionStatus([]), 'unrecognized');

const unreadableFallback = normalizeRecognitionFallback({
  fallback: {
    code: 'insufficient_visible_text',
    message: 'No hay texto legible suficiente para identificar este vino.',
    suggested_actions: ['Acerca la camara.', 'Evita reflejos.'],
  },
});
assert.equal(unreadableFallback?.code, 'insufficient_visible_text');
assert.equal(unreadableFallback?.suggestedActions.length, 2);
assert.equal(normalizeRecognitionFallback({ candidates: [] }), null);
assert.equal(normalizeRecognitionFallback({
  fallback: { code: 'new_server_code', suggested_actions: [] },
})?.code, 'unknown');

const groundedIdentity = evaluateCandidateGrounding({
  name: 'Charles Heidsieck Brut Reserve',
  producer: 'Charles Heidsieck',
  vintage: null,
  visibleText: ['CHARLES HEIDSIECK', 'BRUT RESERVE'],
  evidence: ['CHARLES HEIDSIECK', 'BRUT RESERVE visible', 'known Champagne house'],
});
assert.deepEqual(groundedIdentity.identityMatches, ['charles', 'heidsieck']);
assert.deepEqual(groundedIdentity.groundedEvidence, ['CHARLES HEIDSIECK', 'BRUT RESERVE visible']);

const designOnlyGuess = evaluateCandidateGrounding({
  name: 'Invented Estate Reserva',
  producer: null,
  vintage: null,
  visibleText: ['BRUT RESERVE'],
  evidence: ['Bottle shape suggests Invented Estate'],
});
assert.deepEqual(designOnlyGuess.identityMatches, []);
assert.equal(designOnlyGuess.groundedEvidence.length, 0);
assert.equal(shouldRejectTextAnalysis({
  width: 480,
  height: 360,
  megapixels: 0.2,
  brightness: 130,
  contrast: 35,
  sharpness: 8.5,
  status: 'poor',
  warnings: [],
}), true);
assert.equal(shouldRejectTextAnalysis({
  width: 3024,
  height: 4032,
  megapixels: 12.2,
  brightness: 42,
  contrast: 18,
  sharpness: 8.5,
  status: 'warning',
  warnings: [],
}), false, 'high-resolution low-light captures must still reach OCR');

const landscapeTiles = buildMenuScanTiles(1800, 1200);
assert.deepEqual(landscapeTiles.map((tile) => tile.id), ['left', 'right']);
assert.deepEqual(landscapeTiles.map((tile) => tile.box.width), [56, 56]);
const portraitTiles = buildMenuScanTiles(1200, 1800);
assert.deepEqual(portraitTiles.map((tile) => tile.id), ['top', 'bottom']);

const menuWine = (name: string, x: number, y: number, source: string): MenuScanWine => ({
  nombre: name,
  productor: 'Bodega Test',
  anada: 2021,
  region: null,
  pais: null,
  precio: 20,
  tipo: 'tinto',
  descripcion: null,
  texto_fuente: source,
  confidence: 0.82,
  posicion: { x, y, width: 20, height: 5, confidence: 0.9 },
});
const mappedRightWine = mapMenuWineFromTile(menuWine('Solape', 5, 20, 'Solape 2021 20'), landscapeTiles[1]);
assert.equal(mappedRightWine.posicion?.x, 46.8);
assert.equal(mappedRightWine.posicion?.width, 11.2);
const mergedMenu = mergeMenuTileResults([
  {
    tile: landscapeTiles[0],
    response: {
      vinos: [menuWine('Solape', 84, 20, 'Solape 2021 20'), menuWine('Repetido', 20, 50, 'Repetido copa 8')],
      has_profile: true,
      coverage: { status: 'reported_complete', estimated_visible_wines: 2 },
    },
  },
  {
    tile: landscapeTiles[1],
    response: {
      vinos: [menuWine('Solape', 5, 20, 'Solape 2021 20'), menuWine('Repetido', 80, 50, 'Repetido botella 30')],
      coverage: { status: 'reported_complete', estimated_visible_wines: 2 },
    },
  },
]);
assert.equal(mergedMenu.vinos?.length, 3, 'overlap duplicates merge, distinct rows of the same wine remain');
assert.equal(mergedMenu.coverage?.status, 'reported_complete');
assert.equal(mergedMenu.has_profile, true);
const partialMenuDuplicate = mergeMenuTileResults([{
  tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
  response: {
    vinos: [
      { ...menuWine('PINOT NIOR', 70, 42, 'PINOT NIOR'), productor: null, precio: null },
      { ...menuWine('PINOT NIOR', 82, 47, 'PINOT NIOR BALLARD LANE 32'), productor: 'Ballard Lane', precio: 32 },
    ],
  },
}]);
assert.equal(partialMenuDuplicate.vinos?.length, 1, 'a nearby partial row must merge into its richer canonical row');
assert.equal(partialMenuDuplicate.vinos?.[0].productor, 'Ballard Lane');

const clusteredPins = clusterOverlayPins([
  { key: '10', order: 10, x: 70, y: 42, value: 'partial' },
  { key: '11', order: 11, x: 82, y: 47, value: 'canonical' },
  { key: '12', order: 12, x: 20, y: 80, value: 'separate' },
]);
assert.deepEqual(clusteredPins.map((cluster) => cluster.items.length), [2, 1]);
assert.equal(clusterOverlayPins(clusteredPins[0].items, { zoom: 2 }).length, 2, 'zoom must separate nearby pins');
const completeFullMenu = resolveMenuTileResults([
  {
    tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
    response: { vinos: [menuWine('Completo', 10, 10, 'Completo 20')], coverage: { status: 'reported_complete' } },
  },
  ...landscapeTiles.map((tile) => ({
    tile,
    response: { vinos: [menuWine(`Fragmento ${tile.id}`, 10, 10, tile.id)], coverage: { status: 'unknown' as const } },
  })),
]);
assert.deepEqual(completeFullMenu.vinos?.map((wine) => wine.nombre), ['Completo']);
const uncertainFullMenu = resolveMenuTileResults([
  {
    tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
    response: { vinos: [menuWine('Duplicado completo', 10, 10, 'Duplicado completo')], coverage: { status: 'unknown' } },
  },
  {
    tile: landscapeTiles[0],
    response: { vinos: [menuWine('Regional', 10, 10, 'Regional')], coverage: { status: 'reported_complete' } },
  },
]);
assert.deepEqual(uncertainFullMenu.vinos?.map((wine) => wine.nombre), ['Regional']);

const makeRegion = (id: string, index: number, name: string, affinity: number): ScanRegion => ({
  id,
  index,
  objectType: 'bottle',
  box: { x: index * 10, y: 10, width: 8, height: 40 },
  detectionConfidence: 0.9,
  quality: { glare: 'low', occlusion: 'low', legibility: 'good' },
  status: 'recognized',
  selectedCandidateId: `${id}-candidate-1`,
  duplicateCount: 1,
  candidates: [{
    ...candidates[0],
    id: `${id}-candidate-1`,
    name,
    affinity,
  }],
});

const grouped = groupDuplicateWines([
  makeRegion('r1', 1, 'Celler Aripta Brut', 82),
  makeRegion('r2', 2, 'Celler Aripta Brut', 82),
  makeRegion('r3', 3, 'Haton Blanc', 74),
]);
assert.equal(grouped.length, 2);
assert.equal(grouped[0].count, 2);
assert.equal(grouped[0].candidate.affinity, 82);
const uncertainDuplicate = {
  ...makeRegion('r4', 4, 'Celler Aripta Brut', 82),
  status: 'uncertain' as const,
  candidates: [{ ...makeRegion('r4', 4, 'Celler Aripta Brut', 82).candidates[0], confidence: 0.55 }],
};
assert.equal(groupDuplicateWines([
  makeRegion('r1', 1, 'Celler Aripta Brut', 82),
  uncertainDuplicate,
]).length, 2, 'uncertain identities must not be grouped as duplicate bottles');
assert.equal(getConfirmableWineGroups([
  makeRegion('r1', 1, 'Celler Aripta Brut', 82),
  uncertainDuplicate,
]).length, 1, 'uncertain identities must not enter batch confirmation');
const manuallyConfirmed = confirmWineCandidateIdentity(uncertainDuplicate.candidates[0]);
assert.equal(manuallyConfirmed.confidence, 1);
assert.equal(manuallyConfirmed.affinity, 82, 'explicit confirmation keeps the candidate sensory result');
assert.equal(manuallyConfirmed.uncertaintyReasons.length, 0);
const manuallyCorrected = correctWineCandidateIdentity(candidates[0], { name: 'Corrected identity' });
assert.equal(manuallyCorrected.source, 'manual');
assert.equal(manuallyCorrected.affinity, null, 'identity correction invalidates the previous wine affinity');
assert.equal(manuallyCorrected.sensoryAttributes, null);
assert.equal(areLikelyDuplicateWines(
  { ...candidates[0], name: 'Moscatel Dulce', producer: 'Bodega La Geria' },
  { ...candidates[0], name: 'Moscatel Dulce La Geria', producer: 'La Geria' },
), true, 'producer tokens appended to a product name should still group');
assert.equal(areLikelyDuplicateWines(
  { ...candidates[0], name: 'Passion Pop Original', producer: 'Passion Pop' },
  { ...candidates[0], name: 'Passion Pop Mixed Berry', producer: 'Passion Pop' },
), false, 'distinct product variants must remain separate');
assert.deepEqual(summarizeScanRegions([
  makeRegion('r1', 1, 'A', 80),
  { ...makeRegion('r2', 2, 'B', 70), status: 'uncertain' },
  { ...makeRegion('r3', 3, 'C', 60), status: 'unrecognized' },
]), { recognized: 1, uncertain: 1, unrecognized: 1, discarded: 0, pending: 0 });

let active = 0;
let maxActive = 0;
const mapped = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
  active += 1;
  maxActive = Math.max(maxActive, active);
  await new Promise((resolve) => setTimeout(resolve, 5));
  active -= 1;
  return value * 2;
});
assert.deepEqual(mapped, [2, 4, 6, 8, 10]);
assert.equal(maxActive, 2);

assert.equal(getRegionAnalysisConcurrency(0), 0);
assert.equal(getRegionAnalysisConcurrency(5), 3);
assert.equal(getRegionAnalysisConcurrency(12), 4);
assert.equal(getRegionAnalysisConcurrency(30), 5);
assert.equal(getRegionAnalysisConcurrency(30, { effectiveType: '3g' }), 3);
assert.equal(getRegionAnalysisConcurrency(30, { effectiveType: '2g' }), 2);
assert.equal(getRegionAnalysisConcurrency(30, { saveData: true }), 2);

const priorityRegions = prioritizeRegionsForAnalysis([
  { ...makeRegion('poor', 1, 'A', 80), quality: { glare: 'low', occlusion: 'low', legibility: 'poor' } },
  { ...makeRegion('good-low', 2, 'B', 80), detectionConfidence: 0.7, quality: { glare: 'low', occlusion: 'low', legibility: 'good' } },
  { ...makeRegion('good-high', 3, 'C', 80), detectionConfidence: 0.9, quality: { glare: 'low', occlusion: 'low', legibility: 'good' } },
]);
assert.deepEqual(priorityRegions.map((region) => region.id), ['good-high', 'good-low', 'poor']);

const badRequest = new EdgeFunctionError('bad request', { status: 400, errorCode: null, retryAfterMs: null });
const serverFailure = new EdgeFunctionError('server failure', { status: 503, errorCode: 'EDGE_FUNCTION_ERROR', retryAfterMs: null });
const rateLimit = new EdgeFunctionError('slow down', { status: 429, errorCode: null, retryAfterMs: 2_000 });
assert.equal(isRetryableEdgeFunctionError(badRequest), false);
assert.equal(isRetryableEdgeFunctionError(serverFailure), true);
assert.equal(isRetryableEdgeFunctionError(rateLimit), true);
assert.equal(edgeFunctionRetryDelay(serverFailure, 1), 600);
assert.equal(edgeFunctionRetryDelay(serverFailure, 3), 2_400);
assert.equal(edgeFunctionRetryDelay(rateLimit, 1), 2_000);

const delayController = new AbortController();
const abortedDelay = waitForAbortableDelay(10_000, delayController.signal);
delayController.abort();
await assert.rejects(abortedDelay, (error: unknown) => error instanceof DOMException && error.name === 'AbortError');

let retryAttempts = 0;
const retryResult = await invokeWithEdgeFunctionRetry(async () => {
  retryAttempts += 1;
  if (retryAttempts === 1) throw new TypeError('fetch failed');
  return 'recovered';
}, new AbortController().signal, { maxAttempts: 2 });
assert.equal(retryResult, 'recovered');
assert.equal(retryAttempts, 2);

let nonRetryableAttempts = 0;
await assert.rejects(invokeWithEdgeFunctionRetry(async () => {
  nonRetryableAttempts += 1;
  throw badRequest;
}, new AbortController().signal));
assert.equal(nonRetryableAttempts, 1);

const explanation = buildDetailedAffinityExplanation(
  { potente: 4, acidez: 3, dulce: 1, tanico: 4, afrutado: 3 },
  { potencia: 4, acidez: 4, dulzura: 1, taninos: 2, afrutado: 3, madera: 4, intensidad: 5 },
  { score: 76, identificationConfidence: 0.8, sensorySource: 'inference' },
);
assert.ok(explanation);
assert.equal(explanation.score, 76);
assert.equal(explanation.dimensions.length, 7);
assert.equal(explanation.confidenceLabel, 'media');
assert.ok(explanation.missingData.includes('tu preferencia de madera/crianza'));
assert.deepEqual(explanation.scoreRange, { min: 65, max: 90 });
const uncertainExplanation = buildDetailedAffinityExplanation(
  { potente: 4, acidez: 3, dulce: 1, tanico: 4, afrutado: 3 },
  { potencia: 4, acidez: 4, dulzura: 1, taninos: 2, afrutado: 3 },
  { score: 76, identificationConfidence: 0.55, sensorySource: 'inference' },
);
assert.ok(uncertainExplanation?.missingData.includes('identidad del vino confirmada'));
const uncertainGuidance = buildAiRimContextGuidance({
  context: 'label',
  name: 'Candidato dudoso',
  identityConfidence: 0.55,
  affinity: 82,
  uncertaintyReasons: ['Reflejo sobre la marca'],
  hasAlternatives: true,
}, { potente: 4, acidez: 3, dulce: 1, tanico: 4, afrutado: 3 });
assert.equal(uncertainGuidance.tone, 'caution');
assert.match(uncertainGuidance.summary, /candidato, no una identidad cerrada/i);
const groundedGuidance = buildAiRimContextGuidance({
  context: 'comparison',
  name: 'Vino confirmado',
  identityConfidence: 0.9,
  affinity: 84,
  attributes: { potencia: 4, acidez: 3, dulzura: 1, taninos: 4, afrutado: 3 },
  sensorySource: 'catalog',
  hasAlternatives: true,
}, { potente: 4, acidez: 3, dulce: 1, tanico: 4, afrutado: 3 });
assert.equal(groundedGuidance.tone, 'positive');
assert.match(groundedGuidance.nextStep, /opcion mas segura/i);
assert.equal(calculateLocalMatchrimAffinity(
  { potente: 4, acidez: 3, dulce: 1, tanico: 4, afrutado: 3 },
  { potencia: 4, acidez: 3, dulzura: 1, taninos: 4, afrutado: 3 },
), 93);
assert.equal(calculateLocalMatchrimAffinity(null, { potencia: 4 }), null);
assert.equal(calibrateInferredAffinity(100), 93);
assert.equal(calibrateInferredAffinity(84), 79);
assert.equal(calibrateMenuIdentityConfidence({
  rawConfidence: 0.95,
  hasReliablePosition: true,
  hasTextEvidence: true,
  hasProducer: true,
  hasRegion: true,
  hasPrice: true,
}), 0.88);
assert.equal(calibrateMenuIdentityConfidence({
  rawConfidence: 0.95,
  hasReliablePosition: false,
  hasTextEvidence: false,
  hasProducer: false,
  hasRegion: false,
  hasPrice: false,
}), 0.68);
assert.equal(getConfidenceBand(0.88), 'alta');
assert.equal(getConfidenceBand(0.68), 'media');
assert.equal(calibrateMenuIdentityConfidence({
  rawConfidence: 0.95,
  hasReliablePosition: true,
  hasTextEvidence: false,
  hasProducer: true,
  hasRegion: true,
  hasPrice: true,
}), 0.82);

const comparisonWines = [
  { id: 'a', name: 'Afinidad alta', affinity: 91, confidence: 0.7, price: 48, service: 'bottle' as const },
  { id: 'b', name: 'Identidad segura', affinity: 84, confidence: 0.96, price: 32, service: 'both' as const },
  { id: 'c', name: 'Mejor valor', affinity: 78, confidence: 0.82, price: 18, service: 'glass' as const },
];
const personalDecision = buildWineComparisonDecision(comparisonWines, {
  mode: 'personal',
  priority: 'affinity',
  budget: null,
  serviceFormat: 'any',
});
assert.equal(personalDecision.primary?.wine.id, 'b', 'confirmed identity should outrank a doubtful higher affinity');
assert.equal(personalDecision.actionability, 'ready');

const serviceDecision = buildWineComparisonDecision(comparisonWines, {
  mode: 'service',
  priority: 'certainty',
  budget: 40,
  serviceFormat: 'glass',
});
assert.equal(serviceDecision.primary?.wine.id, 'b');
assert.equal(serviceDecision.ordered.at(-1)?.wine.id, 'a');
assert.ok(serviceDecision.ordered.at(-1)?.cautions.some((caution) => caution.includes('presupuesto')));
assert.equal(serviceDecision.actionability, 'ready');

const valueDecision = buildWineComparisonDecision(comparisonWines, {
  mode: 'personal',
  priority: 'value',
  budget: null,
  serviceFormat: 'any',
});
assert.equal(valueDecision.primary?.wine.id, 'c');
assert.equal(valueDecision.actionability, 'ready');

const provisionalDecision = buildWineComparisonDecision([
  comparisonWines[0],
  { ...comparisonWines[2], confidence: 0.55 },
], {
  mode: 'personal',
  priority: 'affinity',
  budget: null,
  serviceFormat: 'any',
});
assert.equal(provisionalDecision.actionability, 'provisional');

const qaDetection = buildMatchrimQaFixturePayload('detect-wine-regions', {
  qa_fixture_name: 'IMG_7605 2.jpg',
});
assert.equal(qaDetection.handled, true);
assert.equal((qaDetection.payload as { regions: unknown[] }).regions.length, 5);
assert.equal((qaDetection.payload as { coverage: { status: string } }).coverage.status, 'unknown');

const qaUncertainRegion = buildMatchrimQaFixturePayload('analyze-wine-region', {
  region_id: 'region-2',
});
assert.equal((qaUncertainRegion.payload as { candidates: unknown[] }).candidates.length, 2);

const qaMenu = buildMatchrimQaFixturePayload('scan-wine-menu', {
  qa_fixture_name: 'IMG_7552 2.HEIC',
});
assert.equal((qaMenu.payload as { vinos: unknown[] }).vinos.length, 5);
assert.equal((qaMenu.payload as { vinos: Array<{ nombre: string }> }).vinos[0].nombre, 'Txakoli G22');

assert.equal(isWineMenuItem({ nombre: 'Vermouth Ataman', tipo: 'aperitivo', seccion: 'Vermouth' }), false);
assert.equal(isWineMenuItem({ nombre: 'Cerveza artesanal', tipo: 'cerveza', seccion: 'Cervezas' }), false);
assert.equal(isWineMenuItem({ nombre: 'Fino Ynocente', tipo: 'generoso', seccion: 'Generosos' }), true);
assert.equal(isWineMenuItem({ nombre: 'Pedro Ximenez Don PX', tipo: 'dulce', seccion: 'Dulces' }), true);

console.log('multi-wine scan checks: ok');
