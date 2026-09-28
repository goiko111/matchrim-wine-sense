import assert from 'node:assert/strict';

import {
  auditMatchrimLearning,
  type MatchrimRecommendationCandidate,
  type TrainableWine,
} from '../src/utils/matchrimLearning';
import type { MatchrimProfileLike } from '../src/utils/matchrimPassport';

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
}> = [];

for (const persona of personas) {
  const before = auditMatchrimLearning(persona.base, [], catalog);
  const after = auditMatchrimLearning(persona.base, persona.signals, catalog);

  assert.equal(after.learned.samples, persona.signals.length, `${persona.id}: all explicit ratings train the profile`);
  assert.ok(after.learned.confidence > 0, `${persona.id}: learning confidence is visible`);
  assert.equal(after.recommendations[0]?.id, persona.expectedTop, `${persona.id}: expected top recommendation`);
  assert.notDeepEqual(after.learned.profile, before.learned.profile, `${persona.id}: profile changes after feedback`);

  storedByUser.set(persona.id, JSON.stringify(after));
  auditRows.push({
    persona: persona.id,
    before: before.recommendations[0]?.id || 'none',
    after: after.recommendations[0]?.id || 'none',
    afterScore: after.recommendations[0]?.afterScore || 0,
    samples: after.learned.samples,
    confidence: after.learned.confidence,
  });
}

assert.equal(storedByUser.size, personas.length, 'QA personas remain isolated by user id');
for (const persona of personas) {
  const restored = JSON.parse(storedByUser.get(persona.id) || '{}');
  assert.equal(restored.recommendations[0]?.id, persona.expectedTop, `${persona.id}: learned order persists`);
}

assert.notEqual(
  JSON.parse(storedByUser.get(personas[0].id) || '{}').recommendations[0]?.id,
  JSON.parse(storedByUser.get(personas[1].id) || '{}').recommendations[0]?.id,
  'One persona cannot inherit another persona recommendation order',
);

console.table(auditRows);
console.log('Matchrim synthetic persona checks passed: 3 isolated profiles, before/after learning and persistence');
