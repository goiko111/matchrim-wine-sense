import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import {
  auditMatchrimLearning,
  type MatchrimRecommendationCandidate,
  type TrainableWine,
} from '../src/utils/matchrimLearning';
import type { MatchrimProfileLike } from '../src/utils/matchrimPassport';
import { selectUnseenWineRecommendations } from '../src/utils/matchrimRecommendations';

type QaPersona = {
  id: string;
  base: MatchrimProfileLike;
  signals: TrainableWine[];
  expectedTop: string;
};

const catalog: MatchrimRecommendationCandidate[] = [
  {
    id: 'rias-baixas-atlantico',
    name: 'Albariño atlántico',
    producer: 'Bodega QA Atlántica',
    sensory_attributes: { potencia: 2, acidez: 5, dulzura: 1, taninos: 1, afrutado: 4 },
  },
  {
    id: 'rioja-reserva-clasico',
    name: 'Rioja reserva clásico',
    producer: 'Bodega QA Tradición',
    sensory_attributes: { potencia: 5, acidez: 3, dulzura: 1, taninos: 5, afrutado: 3 },
  },
  {
    id: 'tinto-frutal-ligero',
    name: 'Tinto frutal ligero',
    producer: 'Bodega QA Fruta',
    sensory_attributes: { potencia: 2, acidez: 3, dulzura: 2, taninos: 1, afrutado: 5 },
  },
  {
    id: 'blanco-redondo',
    name: 'Blanco redondo',
    producer: 'Bodega QA Calma',
    sensory_attributes: { potencia: 3, acidez: 2, dulzura: 3, taninos: 1, afrutado: 4 },
  },
];

const personas: QaPersona[] = [
  {
    id: 'explorador-atlantico',
    base: { potente: 3, acidez: 3, dulce: 2, tanico: 3, afrutado: 3 },
    signals: [
      { rating: 'love', sensory_attributes: catalog[0].sensory_attributes },
      { rating: 'love', sensory_attributes: catalog[0].sensory_attributes },
      { rating: 'love', sensory_attributes: catalog[0].sensory_attributes },
      { rating: 'love', sensory_attributes: catalog[0].sensory_attributes },
      { rating: 'love', sensory_attributes: catalog[0].sensory_attributes },
      { rating: 'not_for_me', sensory_attributes: catalog[1].sensory_attributes },
      { rating: 'not_for_me', sensory_attributes: catalog[1].sensory_attributes },
    ],
    expectedTop: 'rias-baixas-atlantico',
  },
  {
    id: 'clasico-estructurado',
    base: { potente: 3, acidez: 3, dulce: 2, tanico: 3, afrutado: 3 },
    signals: [
      { rating: 'love', sensory_attributes: catalog[1].sensory_attributes },
      { rating: 'love', sensory_attributes: { potencia: 5, acidez: 3, dulzura: 1, taninos: 4, afrutado: 3 } },
      { rating: 'not_for_me', sensory_attributes: catalog[3].sensory_attributes },
    ],
    expectedTop: 'rioja-reserva-clasico',
  },
  {
    id: 'principiante-frutal',
    base: { potente: 3, acidez: 3, dulce: 2, tanico: 3, afrutado: 3 },
    signals: [
      { rating: 'love', sensory_attributes: catalog[2].sensory_attributes },
      { rating: 'love', sensory_attributes: { potencia: 2, acidez: 3, dulzura: 2, taninos: 1, afrutado: 5 } },
      { rating: 'not_for_me', sensory_attributes: catalog[1].sensory_attributes },
    ],
    expectedTop: 'tinto-frutal-ligero',
  },
];

const storedByUser = new Map<string, string>();
const auditRows: Array<{
  persona: string;
  before: string;
  after: string;
  afterScore: number;
  samples: number;
  confidence: number;
  savedWine: string;
  nextAfterSaved: string;
}> = [];

for (const persona of personas) {
  const before = auditMatchrimLearning(persona.base, [], catalog);
  const after = auditMatchrimLearning(persona.base, persona.signals, catalog);

  assert.equal(after.learned.samples, persona.signals.length, `${persona.id}: all explicit ratings train the profile`);
  assert.ok(after.learned.confidence > 0, `${persona.id}: learning confidence is visible`);
  assert.equal(after.recommendations[0]?.id, persona.expectedTop, `${persona.id}: expected top recommendation`);
  assert.notDeepEqual(after.learned.profile, before.learned.profile, `${persona.id}: profile changes after feedback`);

  const rankedCandidates = after.recommendations.flatMap((recommendation) => {
    const candidate = catalog.find((item) => item.id === recommendation.id);
    return candidate ? [candidate] : [];
  });
  const savedWine = rankedCandidates[0];
  const unseen = selectUnseenWineRecommendations(rankedCandidates, savedWine ? [savedWine] : []);

  assert.ok(savedWine, `${persona.id}: top recommendation exists before saving`);
  assert.equal(unseen.exhausted, false, `${persona.id}: more recommendations remain after saving the first`);
  assert.equal(
    unseen.recommendations[0]?.id,
    after.recommendations[1]?.id,
    `${persona.id}: saving the top recommendation promotes the next coherent option`,
  );

  storedByUser.set(persona.id, JSON.stringify({ learning: after, savedWines: [savedWine] }));
  auditRows.push({
    persona: persona.id,
    before: before.recommendations[0]?.id || 'none',
    after: after.recommendations[0]?.id || 'none',
    afterScore: after.recommendations[0]?.afterScore || 0,
    samples: after.learned.samples,
    confidence: after.learned.confidence,
    savedWine: savedWine?.id || 'none',
    nextAfterSaved: unseen.recommendations[0]?.id || 'none',
  });
}

assert.equal(storedByUser.size, personas.length, 'QA personas remain isolated by user id');
for (const persona of personas) {
  const restored = JSON.parse(storedByUser.get(persona.id) || '{}');
  assert.equal(restored.learning.recommendations[0]?.id, persona.expectedTop, `${persona.id}: learned order persists`);
  const rankedCandidates = restored.learning.recommendations.flatMap((recommendation: { id: string }) => {
    const candidate = catalog.find((item) => item.id === recommendation.id);
    return candidate ? [candidate] : [];
  });
  const unseen = selectUnseenWineRecommendations(rankedCandidates, restored.savedWines);
  assert.equal(
    unseen.recommendations[0]?.id,
    restored.learning.recommendations[1]?.id,
    `${persona.id}: saved-wine exclusion persists independently`,
  );
}

assert.notEqual(
  JSON.parse(storedByUser.get(personas[0].id) || '{}').learning.recommendations[0]?.id,
  JSON.parse(storedByUser.get(personas[1].id) || '{}').learning.recommendations[0]?.id,
  'One persona cannot inherit another persona recommendation order',
);

const vintageSelection = selectUnseenWineRecommendations([
  { id: 'rioja-2020', name: 'Rioja Reserva QA', winery: 'Bodega QA', vintage: 2020 },
  { id: 'rioja-2021', name: 'Rioja Reserva QA', winery: 'Bodega QA', vintage: 2021 },
], [
  { name: 'Rioja Reserva QA', producer: 'Bodega QA', vintage: 2020 },
]);
assert.deepEqual(
  vintageSelection.recommendations.map((wine) => wine.id),
  ['rioja-2021'],
  'Saving one vintage must not hide another vintage from the same producer',
);

const exhaustedSelection = selectUnseenWineRecommendations(catalog, catalog);
assert.deepEqual(exhaustedSelection.recommendations, [], 'Saved wines never reappear as fallback');
assert.equal(exhaustedSelection.exhausted, true, 'Home can distinguish an exhausted catalog from an API failure');

const report = {
  fixtureScope: 'synthetic QA only; no production users, ratings or saved wines were read or written',
  allPassed: true,
  personas: auditRows,
  identityChecks: {
    differentVintageRemainsEligible: vintageSelection.recommendations[0]?.id === 'rioja-2021',
    fullySavedCatalogReturnsEmpty: exhaustedSelection.recommendations.length === 0,
    exhaustedStateVisible: exhaustedSelection.exhausted,
  },
};

const outputPath = process.env.MATCHRIM_PERSONA_QA_OUTPUT;
if (outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

console.table(auditRows);
console.log(JSON.stringify(report, null, 2));
console.log('Matchrim synthetic persona checks passed: learning, isolation, persistence and saved-wine exclusion');
