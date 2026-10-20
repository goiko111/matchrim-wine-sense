import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateLocalMatchrimAffinity, buildAffinityInsights, normalizeWineAttributesForInsight } from '../src/utils/wineAffinityExplanation';
import { validateWinerimOriginalSensory, validateWinerimOriginalSheetUrl, isVerifiedWinerimSheetForIdentity } from '../src/utils/winerimOriginalSheet';
import { canAdmitNativeCatalogLookup97 } from '../src/utils/nativeCatalogAdmission97';
import type { WineCandidate } from '../src/utils/multiWineScan';

const fixture = JSON.parse(readFileSync(new URL('../qa-fixtures/consumer95/master-catalogue97.observed.json', import.meta.url), 'utf8'));
const vidure = fixture.cases.find((item: { key: string }) => item.key === 'vidure-2020');
const zorrera = fixture.cases.find((item: { key: string }) => item.key === 'zorrera-2015');
const checks: string[] = [];
const check = (name: string, work: () => void) => { work(); checks.push(name); console.log('PASS', name); };

check('Observed master and Library namespaces are not silently interchangeable', () => {
  assert.equal(fixture.applicationReadContractVerified, false);
  assert.equal(fixture.masterCount, 217391);
  assert.notEqual(zorrera.master.id, zorrera.existingLibrary.id);
  assert.equal(zorrera.master.namespace, 'App\\Entity\\Mantalak\\Wine');
  for (const item of [vidure, zorrera]) {
    assert.equal(validateWinerimOriginalSheetUrl(item.master.id, item.master.adminDetailUrl), null);
    assert.equal(isVerifiedWinerimSheetForIdentity(item.observedIdentity, {
      id: item.master.id, name: item.master.name, producer: item.master.producer,
      vintage: item.master.selectedSensoryVintage, region: item.master.region, grapes: [],
      url: item.master.adminDetailUrl, detailVerified: true, sensoryAttributes: item.master.attributes,
    }), false, 'An authenticated admin page is not a verified public original sheet');
  }
});

check('Real Zorrera2015 zero sweetness survives the explicit0-5 scale without invented attributes', () => {
  const attrs = validateWinerimOriginalSensory(zorrera.master.attributes);
  assert.ok(attrs);
  assert.equal(attrs.sweetness, 0);
  assert.deepEqual(normalizeWineAttributesForInsight({ ...attrs, scale: 'winerim-0-5' }),
    { potente: 4, acidez: 3, dulce: 0, tanico: 3, afrutado: 4 });
  assert.equal(validateWinerimOriginalSensory({ ...attrs, sweetness: null }), null);
  assert.equal(validateWinerimOriginalSensory({ ...attrs, sweetness: '0' }), null);
  assert.equal(validateWinerimOriginalSensory({ ...attrs, power: 6 }), null);
});

check('Literal reported identities can reach strict catalogue lookup despite nonidentity image uncertainty', () => {
  for (const item of [vidure, zorrera]) {
    const candidate: WineCandidate = {
      id: item.key, ...item.observedIdentity, region: 'Navarra', country: null,
      grapes: [], alcohol: null, confidence: .78, source: 'label',
      evidence: [item.observedIdentity.name, item.observedIdentity.producer, String(item.observedIdentity.vintage)],
      inferredFields: [], uncertaintyReasons: ['Glare; small nonidentity text is unreadable'], sensoryAttributes: null,
    };
    assert.equal(canAdmitNativeCatalogLookup97(candidate), true);
    assert.equal(canAdmitNativeCatalogLookup97({ ...candidate, inferredFields: ['producer'] }), false);
    assert.equal(canAdmitNativeCatalogLookup97({ ...candidate, evidence: [candidate.name] }), false);
  }
});

check('Exact2015 sensory data and cross-vintage2019/NV records remain explicitly different', () => {
  assert.equal(zorrera.master.selectedSensoryVintage, String(zorrera.observedIdentity.vintage));
  assert.notEqual(zorrera.existingLibrary.vintage, String(zorrera.observedIdentity.vintage));
  assert.equal(zorrera.existingLibrary.attributes, null);
  assert.equal(vidure.master.availableSensoryVintages.includes('2020'), false);
  assert.equal(vidure.master.selectedSensoryVintage, null);
  assert.match(vidure.expected, /Do not silently/);
});

check('Fifty synthetic profiles produce bounded, deterministic, distance-ordered sensory similarity', () => {
  const attrs = { ...zorrera.master.attributes, scale: 'winerim-0-5' as const };
  const expectedProfile = { potente: 4, acidez: 3, dulce: 0, tanico: 3, afrutado: 4 };
  const best = calculateLocalMatchrimAffinity(expectedProfile, attrs);
  assert.equal(best, 93, 'The existing calibrated model is similarity, not a100% probability');
  const samples = Array.from({ length: 50 }, (_, i) => ({
    potente: i % 6, acidez: Math.floor(i / 2) % 6, dulce: Math.floor(i / 3) % 6,
    tanico: Math.floor(i / 5) % 6, afrutado: Math.floor(i / 7) % 6,
  })).map(profile => {
    const score = calculateLocalMatchrimAffinity(profile, attrs);
    assert.notEqual(score, null);
    assert.equal(score, calculateLocalMatchrimAffinity(profile, attrs));
    assert.ok(score! >= 0 && score! <= 100);
    const distance = Object.keys(expectedProfile).reduce((sum, key) => {
      const axis = key as keyof typeof expectedProfile;
      return sum + (profile[axis] - expectedProfile[axis]) ** 2;
    }, 0);
    const explanation = buildAffinityInsights(profile, attrs);
    assert.equal(explanation?.insights.length, 5);
    assert.equal(explanation?.insights.find(axis => axis.key === 'dulce')?.wineValue, 0);
    return { distance, score: score! };
  }).sort((a, b) => a.distance - b.distance);
  for (let index = 1; index < samples.length; index++) {
    assert.ok(samples[index].score <= samples[index - 1].score);
  }
});

console.log(JSON.stringify({ checks: checks.length, passed: true, syntheticProfiles: 50,
  liveProviderCalls: 0, realAccountsTested: 0, catalogueIntegrationApproved: false,
  physicalQAApproved: false, testFlightApproved: false }));
