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
  normalizeWineAttributesForInsight,
} from '../src/utils/wineAffinityExplanation';
import { normalizeScanSensoryValue, optionalScanNumber } from '../supabase/functions/_shared/matchrim-scan-values';
import { hasGroundedMenuName } from '../supabase/functions/_shared/matchrim-menu-grounding';
import { normalizeScanPrice, resolveScanCurrency, formatScanPrice } from '../src/utils/scanMoney';
import { buildWineComparisonDecision } from '../src/utils/wineComparison';
import { isWineMenuItem } from '../src/utils/wineMenuGrounding';
import {
  calibrateInferredAffinity,
  normalizeMenuAffinity,
  calibrateMenuIdentityConfidence,
  getConfidenceBand,
} from '../src/utils/scanConfidence';
import { evaluateCandidateGrounding } from '../supabase/functions/analyze-wine-region/grounding';
import { shouldRejectTextAnalysis } from '../src/utils/imageAnalysis';
import {
  buildMenuScanTiles,
  getRightFocusMenuScanTile,
  mapMenuWineFromTile,
  mergeMenuTileResults,
  resolveMenuTileResults,
  shouldRunRightFocusMenuScan,
  needsMenuRefinement,
  mayHaveUnreadMenuColumn,
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

for (const missing of [null, undefined, '', '  ', false, true, {}, [], 'NaN', Infinity]) {
  assert.equal(optionalScanNumber(missing), null, 'unknown scan data must remain unknown');
  assert.equal(normalizeScanSensoryValue(missing), null);
  assert.equal(calibrateInferredAffinity(missing), null, 'missing affinity must not become an 8% recommendation');
}
assert.equal(optionalScanNumber(0), 0, 'a genuine numeric zero must remain distinct from absence');
assert.equal(optionalScanNumber('2021'), 2021);
assert.equal(normalizeMenuAffinity(85, true), 85, 'server calibrated affinity must not be calibrated twice');
assert.equal(normalizeMenuAffinity(null, true), null);
assert.equal(normalizeMenuAffinity(100, false), 93, 'legacy uncalibrated values retain the safety adjustment');
assert.equal(normalizeScanSensoryValue(8), 4);
assert.equal(normalizeScanSensoryValue(80), 4);
assert.equal(normalizeWineAttributesForInsight({
  potencia: 3, acidez: 4, dulzura: null, taninos: 2, afrutado: 4,
}), null, 'missing sweetness must not become a confident sensory minimum');
assert.equal(calculateLocalMatchrimAffinity({
  potente: 3, acidez: 4, dulce: 1, tanico: 2, afrutado: 4,
}, { potencia: 3, acidez: 4, dulzura: null, taninos: 2, afrutado: 4 }), null);
const unknownNumbers = normalizeWineCandidates({ candidates: [{
  name: 'Unknown fields', vintage: null, alcohol: null, affinity_confidence: null,
  sensory_attributes: { potencia: null, madera: null },
}] }, 'unknown')[0];
assert.equal(unknownNumbers.vintage, null);
assert.equal(unknownNumbers.alcohol, null);
assert.equal(unknownNumbers.affinityConfidence, null);
assert.equal(unknownNumbers.sensoryAttributes?.potencia, null);
assert.equal(unknownNumbers.sensoryAttributes?.madera, null);
assert.equal(hasGroundedMenuName('Buck Creek Classic (Wine 2)', 'This will become a Buck Creek classic'), false);
assert.equal(hasGroundedMenuName('1886', 'A complex wine planted in 1900'), false);
assert.equal(hasGroundedMenuName('La Rosa', 'La Rosa...'), true);
assert.equal(hasGroundedMenuName('Bottle of Wine', 'Bottle of Wine 5.50'), false);
assert.equal(hasGroundedMenuName('House Red Wine', 'House Red Wine 5.50'), false);
assert.equal(hasGroundedMenuName('Languedoc-Roussillon (blanco parcialmente legible)', 'Languedoc-Roussillon'), false);
assert.equal(hasGroundedMenuName('2021 [ilegible] Gap', '2021 Gap', 'Leisure'), false);
assert.equal(isWineMenuItem({ nombre: 'Bottle of Wine', tipo: 'wine' }), false, 'legacy responses must also reject generic offers');
assert.equal(hasGroundedMenuName('1900', '1900 - Estate wine'), true);
assert.equal(hasGroundedMenuName('Muga Reserva', ''), false);
assert.equal(hasGroundedMenuName('Vintage Champagne (Fifth 18.00)', 'Vintage Champagne Fifth 18.00', 'Champagne'), false);
assert.equal(hasGroundedMenuName('Sparkling Wine Section 2 (Fifth 12.00)', 'Sparkling Wine Fifth 12.00'), false);
assert.equal(hasGroundedMenuName('Brut', 'JP Chenet France Brut', 'JP Chenet France'), true);

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
assert.equal(areLikelySamePhysicalDetection(
  { x: 10.3, y: 7.41, width: 77.29, height: 55.45 },
  { x: 12.01, y: 67.22, width: 64.67, height: 26.68 },
), true, 'a detached lower label fragment aligned with a large bottle should collapse');
assert.equal(areLikelySamePhysicalDetection(
  { x: 48, y: 0, width: 46, height: 98 },
  { x: 43, y: 42, width: 11, height: 19 },
), true, 'a tiny label mostly contained by a much larger bottle should collapse');
assert.equal(areLikelySamePhysicalDetection(
  { x: 10, y: 0, width: 25, height: 42 },
  { x: 10, y: 48, width: 25, height: 42 },
), false, 'similarly sized bottles stacked in one column must remain independent');

const cropHigherConfidence = normalizeDetectedRegions({ regions: [
  { object_type: 'bottle', box: { x: 10, y: 0, width: 20, height: 95 }, confidence: 0.85 },
  { object_type: 'label', box: { x: 12, y: 40, width: 16, height: 22 }, confidence: 0.98 },
] });
assert.equal(cropHigherConfidence.length, 1);
assert.deepEqual(cropHigherConfidence[0].box, { x: 10, y: 0, width: 20, height: 95 },
  'a high-confidence label must not replace the full bottle extent used for OCR');
assert.equal(cropHigherConfidence[0].objectType, 'bottle');
assert.equal(cropHigherConfidence[0].detectionConfidence, 0.98);

const connectedCropFragments = [
  { box: { x: 0, y: 8.4, width: 42, height: 47.6 }, confidence: 0.95 },
  { box: { x: 0, y: 44, width: 40, height: 56 }, confidence: 0.94 },
  { box: { x: 0, y: 8, width: 42, height: 92 }, confidence: 0.9 },
  { box: { x: 52, y: 10, width: 48, height: 90 }, confidence: 0.92 },
];
for (const order of [connectedCropFragments, [...connectedCropFragments].reverse()]) {
  const connected = normalizeDetectedRegions({ regions: order });
  assert.equal(connected.length, 2, 'a full bottle must consolidate both partial tile detections');
  assert.deepEqual(connected.find((region) => region.box.x === 0)?.box,
    { x: 0, y: 8, width: 42, height: 92 });
  assert.deepEqual(connected.find((region) => region.box.x === 52)?.box,
    { x: 52, y: 10, width: 48, height: 90 }, 'the neighboring bottle must remain independent');
}
assert.equal(normalizeDetectedRegions({ regions: [
  { box: { x: 10, y: 0, width: 25, height: 42 }, confidence: 0.9 },
  { box: { x: 10, y: 48, width: 25, height: 42 }, confidence: 0.9 },
] }).length, 2, 'extent consolidation cannot merge bottles on separate shelves');

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

const denseGridRegions = Array.from({ length: 48 }, (_, index) => ({
  object_type: 'bottle',
  box: {
    x: (index % 8) * 12 + 1,
    y: Math.floor(index / 8) * 16 + 1,
    width: 8,
    height: 13,
  },
  confidence: 0.8,
}));
const denseMergedDetection = mergeWineDetectionTileResults([{
  tile: getFullWineDetectionTile(),
  payload: {
    coverage: { status: 'partial', estimated_visible_objects: 48, confidence: 0.8 },
    regions: denseGridRegions,
  },
}]);
assert.equal(denseMergedDetection.regions.length, 48, 'dense refinements must retain lower rows beyond the former 30-region cap');
assert.ok(denseMergedDetection.regions.some((region) => region.box.y > 70), 'dense refinements must keep lower-shelf regions');
const retainedMainBottle = mergeWineDetectionTileResults([
  {
    tile: getFullWineDetectionTile(),
    payload: {
      regions: [{ box: { x: 45, y: 3, width: 30, height: 94 }, confidence: 0.95 }],
      coverage: { status: 'partial', estimated_visible_objects: 3 },
    },
  },
  {
    tile: { id: 'left', box: { x: 0, y: 0, width: 56, height: 100 } },
    payload: { regions: [{ box: { x: 10, y: 0, width: 30, height: 90 }, confidence: 0.85 }] },
  },
  {
    tile: { id: 'right', box: { x: 44, y: 0, width: 56, height: 100 } },
    payload: { regions: [{ box: { x: 60, y: 0, width: 35, height: 90 }, confidence: 0.85 }] },
  },
]);
assert.equal(retainedMainBottle.regions.length, 3);
assert.ok(retainedMainBottle.regions.some((region) => region.box.x === 45),
  'regional refinement must not discard a foreground bottle seen only in the full image');

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
assert.deepEqual(groundedIdentity.nameMatches, ['charles', 'heidsieck']);
assert.deepEqual(groundedIdentity.producerMatches, ['charles', 'heidsieck']);
assert.equal(groundedIdentity.fullyGroundedProducer, true);
assert.equal(groundedIdentity.groundedVintage, false);
assert.deepEqual(groundedIdentity.groundedEvidence, ['CHARLES HEIDSIECK', 'BRUT RESERVE visible']);

const distinctiveProductName = evaluateCandidateGrounding({
  name: 'Passion Pop Lemon Lime',
  producer: null,
  vintage: null,
  visibleText: ['PASSION POP', 'LEMON LIME'],
  evidence: ['PASSION POP', 'LEMON LIME'],
});
assert.deepEqual(distinctiveProductName.nameMatches, ['passion', 'pop', 'lemon', 'lime']);
assert.equal(distinctiveProductName.fullyGroundedName, true);
const inventedSecondaryIdentity = evaluateCandidateGrounding({
  name: 'Passion Pop Mixed Berry', producer: 'Golden Gate', vintage: 2021,
  visibleText: ['PASSION POP', 'MIXED BERRY'], evidence: ['PASSION POP', 'MIXED BERRY'],
});
assert.equal(inventedSecondaryIdentity.fullyGroundedName, true);
assert.equal(inventedSecondaryIdentity.fullyGroundedProducer, false);
assert.equal(inventedSecondaryIdentity.groundedVintage, false);
assert.equal(evaluateCandidateGrounding({
  name: 'Tres Picos', producer: 'Bodegas Borsao', vintage: 2021,
  visibleText: ['TRES PICOS', 'BORSAO', '2021'], evidence: ['TRES PICOS', 'BORSAO 2021'],
}).fullyGroundedProducer, true);
assert.equal(evaluateCandidateGrounding({
  name: 'Passion Pop Lemon Lime',
  producer: null,
  vintage: null,
  visibleText: ['PASSION POP', 'SPARKLING WINE'],
  evidence: ['PASSION POP', 'SPARKLING WINE'],
}).fullyGroundedName, false, 'a visible brand cannot confirm an unreadable product variant');

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

const landscapeTiles = buildMenuScanTiles(1800, 1200, 'columns');
assert.deepEqual(landscapeTiles.map((tile) => tile.id), ['left', 'right']);
assert.deepEqual(landscapeTiles.map((tile) => tile.box.width), [56, 56]);
for (const layout of ['rows', 'unknown'] as const) {
  const rowTiles = buildMenuScanTiles(1800, 1200, layout);
  assert.deepEqual(rowTiles.map((tile) => tile.id), ['top', 'bottom']);
  assert.ok(rowTiles.every((tile) => tile.box.width === 100), 'never bisect a chalkboard name/price row');
}
assert.equal(needsMenuRefinement({ vinos: [], coverage: { status: 'reported_complete' } }), false);
assert.equal(needsMenuRefinement({ vinos: [], coverage: { status: 'partial' } }), true);
assert.equal(needsMenuRefinement({ vinos: [{ nombre: 'Muga', confidence: 0.6 } as MenuScanWine], coverage: { status: 'reported_complete' } }), true);
assert.equal(resolveScanCurrency(null, 'Muga 12.50 \u00a3'), 'GBP');
assert.equal(resolveScanCurrency(null, 'Muga 12.50', 'GBP'), 'GBP');
assert.equal(resolveScanCurrency('EUR', 'Muga 12.50 \u00a3'), null, 'contradictions must not relabel GBP as EUR');
assert.equal(resolveScanCurrency(null, 'Muga $12.50'), null, 'dollar symbol is ambiguous');
assert.equal(resolveScanCurrency(null, 'Muga 12.50'), null, 'never assume EUR');
assert.equal(normalizeScanPrice(null), null);
assert.equal(normalizeScanPrice(''), null);
assert.equal(normalizeScanPrice(-4), null);
assert.ok(formatScanPrice(12.5, 'GBP')?.includes('GBP'));
assert.ok(formatScanPrice(12.5, null)?.includes('moneda pendiente'));
assert.deepEqual(getRightFocusMenuScanTile().box, { x: 64, y: 0, width: 36, height: 100 });
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
const adjacentDistinctCuvees = mergeMenuTileResults([{
  tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
  response: { vinos: [
    { ...menuWine('Barbaresco Marchesi di Barolo', 19, 63, 'Barbaresco Marchesi di Barolo 25'), productor: 'Marchesi di Barolo', precio: 25 },
    { ...menuWine('Barolo Marchesi di Barolo', 19, 65, 'Barolo Marchesi di Barolo 35'), productor: 'Marchesi di Barolo', precio: 35 },
  ] },
}]);
assert.equal(adjacentDistinctCuvees.vinos?.length, 2, 'nearby distinct names cannot merge merely because producer words overlap');
assert.equal(mappedRightWine.posicion?.x, 46.8);
assert.equal(mappedRightWine.posicion?.width, 11.2);
const conflictingRowPrices = mergeMenuTileResults([{
  tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
  response: { vinos: [
    { ...menuWine('Three Sons', 20, 30, 'Three Sons 20'), precio: 20, seccion: 'Dry' },
    { ...menuWine('Three Sons', 28, 31, 'Three Sons 24'), precio: 24, seccion: 'Estate' },
  ] },
}]);
assert.equal(conflictingRowPrices.vinos?.length, 1);
assert.equal(conflictingRowPrices.vinos?.[0].precio, null, 'conflicting OCR prices must not be silently chosen');
assert.ok(conflictingRowPrices.vinos?.[0].dudas?.some((doubt) => doubt.includes('Precio contradictorio')));
for (const patch of [{ anada: 2022 }, { productor: 'Different producer' }]) {
  const distinctReferences = mergeMenuTileResults([{
    tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
    response: { vinos: [
      { ...menuWine('Three Sons', 20, 30, 'Three Sons'), anada: 2021 },
      { ...menuWine('Three Sons', 20, 30, 'Three Sons'), anada: 2021, ...patch },
    ] },
  }]);
  assert.equal(distinctReferences.vinos?.length, 2, 'known vintage/producer differences cannot be deduplicated by position');
}
const mergedMenu = mergeMenuTileResults([
  {
    tile: landscapeTiles[0],
    response: {
      vinos: [menuWine('Solape', 84, 20, 'Solape 2021 20'), { ...menuWine('Repetido', 20, 50, 'Repetido copa 8'), precio: 8, servicio: 'copa' }],
      has_profile: true,
      coverage: { status: 'reported_complete', estimated_visible_wines: 2 },
    },
  },
  {
    tile: landscapeTiles[1],
    response: {
      vinos: [menuWine('Solape', 5, 20, 'Solape 2021 20'), { ...menuWine('Repetido', 80, 50, 'Repetido botella 30'), precio: 30, servicio: 'botella' }],
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

const noisyOcrDuplicate = mergeMenuTileResults([{
  tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
  response: {
    vinos: [
      { ...menuWine('Costa di Rose', 70, 42, 'Costa di Rose Umberto Cesari'), productor: 'Umberto Cesari', seccion: 'ROSADOS' },
      { ...menuWine('Costa di ros', 12, 72, 'Costa di ros'), productor: null, seccion: 'ROSADOS' },
    ],
  },
}]);
assert.equal(noisyOcrDuplicate.vinos?.length, 1, 'strong OCR truncations of the same identity must merge');

const focusGrounding = mergeMenuTileResults([{
  tile: getRightFocusMenuScanTile(),
  response: {
    vinos: [
      { ...menuWine('Chambolle Musigny', 50, 50, ''), confidence: 0.7 },
      { ...menuWine('Pedro Ximenez Don PX', 50, 55, 'Pedro Ximenez Don PX 23'), confidence: 0.62 },
      { ...menuWine('Fino Ynocente', 50, 60, 'Fino Ynocente, Valdespino 29'), confidence: 0.84 },
    ],
  },
}]);
assert.deepEqual(
  focusGrounding.vinos?.map((wine) => wine.nombre),
  ['Pedro Ximenez Don PX', 'Fino Ynocente'],
  'a focus crop must retain grounded medium-confidence OCR and abstain without source evidence',
);
assert.equal(shouldRunRightFocusMenuScan('reported_complete', 7), false);
assert.equal(shouldRunRightFocusMenuScan('reported_complete', 8), true);
assert.equal(shouldRunRightFocusMenuScan('partial', 3), true);
assert.equal(shouldRunRightFocusMenuScan('partial', 24, true), false,
  'a third horizontal crop must not re-read descriptions after both columns succeeded');
assert.equal(mayHaveUnreadMenuColumn({ layout: 'columns' }), true);
assert.equal(mayHaveUnreadMenuColumn({ layout: 'rows', vinos: Array(12).fill(menuWine('Wine', 10, 10, 'Wine')), coverage: { status: 'unknown' } }), true,
  'a dense incomplete portrait may hide a second page even when the model reports rows');
assert.equal(mayHaveUnreadMenuColumn({ layout: 'rows', vinos: Array(12).fill(menuWine('Wine', 10, 10, 'Wine')), coverage: { status: 'reported_complete' } }), false);
assert.equal(mayHaveUnreadMenuColumn({ layout: 'rows', vinos: Array(11).fill(menuWine('Wine', 10, 10, 'Wine')), coverage: { status: 'partial' } }), false,
  'do not add a speculative lateral crop to small row-only menus');
const servicePriceDuplicate = mergeMenuTileResults([{
  tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
  response: { vinos: [
    { ...menuWine('Casa Castillo', 10, 52, 'Casa Castillo monastrell Jumilia 4 23'), productor: null, precio: 4, precios: { copa: 4, botella: 23 }, servicio: 'ambos' },
    { ...menuWine('Casa Castillo', 7, 28, 'Casa Castillo monastrell Jumilla 4 23'), productor: null, precio: 23, precios: { copa: 4, botella: 23 }, servicio: 'ambos', seccion: 'TINTOS' },
  ] },
}]);
assert.equal(servicePriceDuplicate.vinos?.length, 1, 'matching cup and bottle prices must corroborate duplicate crop rows despite inaccurate anchors');
assert.equal(servicePriceDuplicate.vinos?.[0].precio, null, 'a contradictory generic price remains unknown');
assert.deepEqual(servicePriceDuplicate.vinos?.[0].precios, { copa: 4, botella: 23, llevar: null });
const distinctServiceRows = mergeMenuTileResults([{
  tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
  response: { vinos: [
    { ...menuWine('Casa Castillo', 10, 52, 'Casa Castillo 4 23'), precios: { copa: 4, botella: 23 }, seccion: 'TINTOS' },
    { ...menuWine('Casa Castillo', 7, 28, 'Casa Castillo 4 23'), precios: { copa: 4, botella: 23 }, seccion: 'BLANCOS' },
  ] },
}]);
assert.equal(distinctServiceRows.vinos?.length, 2, 'matching prices must not collapse distinct sections');

const sameNameDifferentSection = mergeMenuTileResults([{
  tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
  response: {
    vinos: [
      { ...menuWine('Huerto de la Condesa', 22, 22, 'Huerto de la Condesa, viognier, moscatel'), seccion: 'BLANCOS' },
      { ...menuWine('Huerto de la Condesa', 22, 27, 'Huerto de la Condesa, garnacha, syrah'), seccion: 'TINTOS' },
    ],
  },
}]);
assert.equal(sameNameDifferentSection.vinos?.length, 2, 'same name in different sections must remain two menu rows');

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
const fullWithFocusMenu = resolveMenuTileResults([
  {
    tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
    response: { vinos: [menuWine('Pagina principal', 10, 10, 'Pagina principal')], coverage: { status: 'reported_complete' } },
  },
  {
    tile: getRightFocusMenuScanTile(),
    response: { vinos: [menuWine('Borde derecho', 50, 50, 'Borde derecho')], coverage: { status: 'partial' } },
  },
]);
assert.deepEqual(
  fullWithFocusMenu.vinos?.map((wine) => wine.nombre),
  ['Pagina principal', 'Borde derecho'],
  'a focus-only refinement must augment rather than replace the full-page scan',
);
const truncatedFocusMenu = resolveMenuTileResults([{
  tile: getRightFocusMenuScanTile(),
  response: {
    vinos: [
      { ...menuWine('Gaudensius Blanc', 10, 10, 'Gaudensius blan...'), confidence: 0.62 },
      { ...menuWine('Costa di Rosa', 10, 20, 'Costa di ros...'), confidence: 0.45 },
      { ...menuWine('La Rosa', 10, 30, 'La Rosa...'), confidence: 0.4 },
      { ...menuWine('Guess without text', 10, 40, ''), confidence: 0.8 },
    ],
  },
}]);
assert.deepEqual(
  truncatedFocusMenu.vinos?.map((wine) => wine.nombre),
  ['Gaudensius Blanc', 'Costa di Rosa', 'La Rosa'],
  'truncated but visibly grounded border rows must remain reviewable',
);
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
assert.deepEqual(uncertainFullMenu.vinos?.map((wine) => wine.nombre), ['Duplicado completo', 'Regional']);

const overlappingPartialSources = resolveMenuTileResults([
  {
    tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
    response: {
      vinos: [
        { ...menuWine('Chateau Miraval Rose', 20, 30, 'Chateau Miraval Rose 55 44'), precio: 55, seccion: 'France' },
        { ...menuWine('Whispering Angels', 20, 40, 'Whispering Angels 52 41'), precio: 52, seccion: 'France' },
      ],
      coverage: { status: 'partial' },
    },
  },
  {
    tile: { id: 'bottom', box: { x: 0, y: 44, width: 100, height: 56 } },
    response: {
      vinos: [
        { ...menuWine('Chateau Miraval Rose', 20, 30, 'Chateau Miraval Rose 55 44'), precio: 55, seccion: 'Rosados' },
        { ...menuWine("Chateau d'Esclans Whispering Angels", 20, 40, "Chateau d'Esclans Whispering Angels 52 41"), precio: 52, seccion: 'France' },
      ],
      coverage: { status: 'reported_complete' },
    },
  },
]);
assert.deepEqual(
  overlappingPartialSources.vinos?.map((wine) => wine.nombre),
  ['Chateau Miraval Rose', 'Whispering Angels'],
  'substantially overlapping full and regional scans must not duplicate the same menu rows',
);

const undercountedCompleteSource = resolveMenuTileResults([
  {
    tile: { id: 'full', box: { x: 0, y: 0, width: 100, height: 100 } },
    response: {
      vinos: [menuWine('Uno', 20, 20, 'Uno'), menuWine('Dos', 20, 30, 'Dos')],
      coverage: { status: 'reported_complete', extracted_wines: 2 },
    },
  },
  {
    tile: { id: 'top', box: { x: 0, y: 0, width: 100, height: 56 } },
    response: {
      vinos: [
        menuWine('Uno', 20, 20, 'Uno'),
        menuWine('Dos', 20, 30, 'Dos'),
        menuWine('Tres', 20, 40, 'Tres'),
        menuWine('Cuatro', 20, 50, 'Cuatro'),
        menuWine('Cinco', 20, 60, 'Cinco'),
      ],
      coverage: { status: 'partial', extracted_wines: 5 },
    },
  },
]);
assert.deepEqual(
  undercountedCompleteSource.vinos?.map((wine) => wine.nombre),
  ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco'],
  'a reported-complete full scan must not override materially broader regional evidence',
);

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
]).length, 1, 'matching uncertain copies should group without becoming confirmable');
const partialProducerDuplicate = {
  ...uncertainDuplicate,
  candidates: [{
    ...uncertainDuplicate.candidates[0],
    producer: 'Aripta',
  }],
};
const fullProducerRegion = makeRegion('r1', 1, 'Celler Aripta Brut', 82);
fullProducerRegion.candidates[0].producer = 'Celler Aripta';
assert.equal(groupDuplicateWines([
  fullProducerRegion,
  partialProducerDuplicate,
]).length, 1, 'the same wine name with a partial compatible producer should group');
const conflictingProducerRegion = makeRegion('other-producer', 5, 'Celler Aripta Brut', 82);
conflictingProducerRegion.candidates[0].producer = 'Different Winery';
assert.equal(groupDuplicateWines([
  fullProducerRegion,
  conflictingProducerRegion,
]).length, 2, 'the same name must not bypass a contradictory known producer');
const ungroundedDuplicate = {
  ...uncertainDuplicate,
  candidates: [{ ...uncertainDuplicate.candidates[0], confidence: 0.45 }],
};
assert.equal(groupDuplicateWines([
  makeRegion('r1', 1, 'Celler Aripta Brut', 82),
  ungroundedDuplicate,
]).length, 2, 'very low-confidence identities must remain separate');
const groundedUncertainDuplicate = {
  ...uncertainDuplicate,
  candidates: [{
    ...uncertainDuplicate.candidates[0],
    confidence: 0.78,
    uncertaintyReasons: ['La añada no es legible.'],
  }],
};
const groundedUncertainGroups = groupDuplicateWines([
  makeRegion('r1', 1, 'Celler Aripta Brut', 82),
  groundedUncertainDuplicate,
]);
assert.equal(groundedUncertainGroups.length, 1, 'grounded uncertain copies should group as one reference');
assert.equal(groundedUncertainGroups[0].count, 2);
const genericDescriptorVariant = {
  ...uncertainDuplicate,
  candidates: [{
    ...uncertainDuplicate.candidates[0],
    name: 'Celler Aripta Brut Sparkling Wine Product',
    confidence: 0.62,
  }],
};
const genericDescriptorGroups = groupDuplicateWines([
  makeRegion('r1', 1, 'Celler Aripta Brut', 82),
  genericDescriptorVariant,
]);
assert.equal(genericDescriptorGroups.length, 1, 'generic wine descriptors must not create a second reference');
assert.equal(genericDescriptorGroups[0].count, 2);
const conflictingProducerCopy = {
  ...uncertainDuplicate,
  candidates: [{
    ...uncertainDuplicate.candidates[0],
    producer: 'OCR neighbour producer',
  }],
};
assert.equal(groupDuplicateWines([
  makeRegion('r1', 1, 'Celler Aripta Brut', 82),
  conflictingProducerCopy,
]).length, 1, 'an exact distinctive product name must win over a conflicting secondary producer read');
assert.equal(groupDuplicateWines([
  { ...makeRegion('generic-a', 1, 'Reserva Especial', 70), candidates: [{ ...candidates[0], name: 'Reserva Especial', producer: 'Bodega Uno' }] },
  { ...makeRegion('generic-b', 2, 'Reserva Especial', 70), candidates: [{ ...candidates[0], name: 'Reserva Especial', producer: 'Bodega Dos' }] },
]).length, 2, 'generic shared product names cannot override conflicting producers');
const differentVintageCopy = {
  ...conflictingProducerCopy,
  candidates: [{ ...conflictingProducerCopy.candidates[0], vintage: 2022 }],
};
const vintageRegion = makeRegion('r1', 1, 'Celler Aripta Brut', 82);
vintageRegion.candidates[0].vintage = 2021;
assert.equal(groupDuplicateWines([
  vintageRegion,
  differentVintageCopy,
]).length, 2, 'exact names with conflicting visible vintages must remain separate');
assert.equal(getConfirmableWineGroups([
  makeRegion('r1', 1, 'Celler Aripta Brut', 82),
  groundedUncertainDuplicate,
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
  { id: 'a', name: 'Afinidad alta', affinity: 91, confidence: 0.7, price: 48, currency: 'EUR', service: 'bottle' as const },
  { id: 'b', name: 'Identidad segura', affinity: 84, confidence: 0.96, price: 32, currency: 'EUR', service: 'both' as const, prices: { glass: 7, bottle: 32 } },
  { id: 'c', name: 'Mejor valor', affinity: 78, confidence: 0.82, price: 18, currency: 'EUR', service: 'glass' as const },
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
  budgetCurrency: 'EUR',
  serviceFormat: 'glass',
});
assert.equal(serviceDecision.primary?.wine.id, 'b');
assert.equal(serviceDecision.ordered.at(-1)?.wine.id, 'a');
assert.ok(serviceDecision.ordered.at(-1)?.cautions.some((caution) => caution.includes('presupuesto')));
assert.equal(serviceDecision.actionability, 'ready');
const glassBudget = buildWineComparisonDecision([comparisonWines[1]], {
  mode: 'service', priority: 'affinity', budget: 10, budgetCurrency: 'EUR', serviceFormat: 'glass',
});
assert.equal(glassBudget.actionability, 'ready');
assert.equal(glassBudget.primary?.wine.price, 7);
const missingGlassPrice = buildWineComparisonDecision([{ ...comparisonWines[1], prices: null }], {
  mode: 'service', priority: 'affinity', budget: 40, budgetCurrency: 'EUR', serviceFormat: 'glass',
});
assert.equal(missingGlassPrice.actionability, 'provisional', 'bottle price cannot stand in for an unread glass price');

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
const disputedIdentity = buildWineComparisonDecision([{ ...comparisonWines[1], identityConfirmed: false }], {
  mode: 'personal', priority: 'affinity', budget: null, serviceFormat: 'any',
});
assert.equal(disputedIdentity.actionability, 'provisional', 'numeric confidence cannot overrule a disputed identity');
const mixedCurrencies = buildWineComparisonDecision([
  { ...comparisonWines[1], currency: 'GBP' }, comparisonWines[2],
], { mode: 'service', priority: 'value', budget: 30, budgetCurrency: 'EUR', serviceFormat: 'any' });
assert.equal(mixedCurrencies.actionability, 'provisional');
assert.equal(mixedCurrencies.ordered.find((entry) => entry.wine.currency === 'GBP')?.constraintStatus, 'unknown');
assert.ok(mixedCurrencies.ordered.find((entry) => entry.wine.currency === 'GBP')?.cautions.some((note) => note.includes('Moneda')));
assert.equal(evaluateCandidateGrounding({
  name: 'Muga Reserva Especial', producer: 'Muga', vintage: null,
  visibleText: ['Muga', 'Reserva'], evidence: ['Muga', 'Reserva'],
}).ungroundedNameTokens.includes('especial'), true);

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
assert.equal(isWineMenuItem({ nombre: 'Chateau', tipo: 'tinto', seccion: 'Tintos' }), false);
assert.equal(isWineMenuItem({ nombre: 'Chat', tipo: 'tinto', seccion: 'Tintos' }), false);
assert.equal(isWineMenuItem({ nombre: 'Cha', tipo: 'tinto', seccion: 'Tintos' }), false);
assert.equal(isWineMenuItem({ nombre: 'Brut', productor: null, texto_fuente: 'Brut', tipo: 'espumoso', seccion: 'Espumosos' }), false);
assert.equal(isWineMenuItem({
  nombre: 'Brut',
  productor: 'JP Chenet France',
  texto_fuente: 'JP Chenet France\nBrut\n10 / 36',
  tipo: 'espumoso',
  seccion: 'Espumosos',
}), true);
assert.equal(isWineMenuItem({ nombre: 'Fino Ynocente', tipo: 'generoso', seccion: 'Generosos' }), true);
assert.equal(isWineMenuItem({ nombre: 'Pedro Ximenez Don PX', tipo: 'dulce', seccion: 'Dulces' }), true);

console.log('multi-wine scan checks: ok');
