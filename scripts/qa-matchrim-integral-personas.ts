import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  auditMatchrimLearning,
  calculateLearnedMatchrimProfile,
  type MatchrimRecommendationCandidate,
  type TrainableWine,
} from '../src/utils/matchrimLearning';
import type { MatchrimProfileLike } from '../src/utils/matchrimPassport';
import { selectUnseenWineRecommendations } from '../src/utils/matchrimRecommendations';

type CatalogWine = MatchrimRecommendationCandidate & {
  vintage: number;
  price: number;
};

type Persona = {
  id: string;
  job: string;
  base: MatchrimProfileLike;
  targetId?: string;
  antiId?: string;
  unsupportedPreference?: 'budget' | 'occasion';
  changesOpinion?: boolean;
};

const neutral: MatchrimProfileLike = {
  potente: 3,
  acidez: 3,
  dulce: 2,
  tanico: 3,
  afrutado: 3,
};

const catalog: CatalogWine[] = [
  { id: 'albarino-atlantico', name: 'Albariño Atlántico QA', producer: 'QA Atlántica', vintage: 2023, price: 19, sensory_attributes: { potencia: 2, acidez: 5, dulzura: 1, taninos: 1, afrutado: 4 } },
  { id: 'godello-redondo', name: 'Godello Redondo QA', producer: 'QA Calma', vintage: 2022, price: 24, sensory_attributes: { potencia: 3, acidez: 3, dulzura: 2, taninos: 1, afrutado: 4 } },
  { id: 'rioja-reserva', name: 'Rioja Reserva QA', producer: 'QA Tradición', vintage: 2020, price: 29, sensory_attributes: { potencia: 5, acidez: 3, dulzura: 1, taninos: 5, afrutado: 3 } },
  { id: 'mencia-fresca', name: 'Mencía Fresca QA', producer: 'QA Bierzo', vintage: 2022, price: 17, sensory_attributes: { potencia: 3, acidez: 4, dulzura: 1, taninos: 2, afrutado: 4 } },
  { id: 'tinto-frutal', name: 'Tinto Frutal QA', producer: 'QA Fruta', vintage: 2023, price: 11, sensory_attributes: { potencia: 2, acidez: 3, dulzura: 2, taninos: 1, afrutado: 5 } },
  { id: 'moscatel-dulce', name: 'Moscatel Dulce QA', producer: 'QA Aromas', vintage: 2023, price: 13, sensory_attributes: { potencia: 2, acidez: 3, dulzura: 5, taninos: 1, afrutado: 5 } },
  { id: 'nebbiolo-estructurado', name: 'Nebbiolo Estructurado QA', producer: 'QA Langhe', vintage: 2019, price: 38, sensory_attributes: { potencia: 5, acidez: 5, dulzura: 1, taninos: 5, afrutado: 2 } },
  { id: 'blanco-baja-acidez', name: 'Blanco Baja Acidez QA', producer: 'QA Suave', vintage: 2023, price: 15, sensory_attributes: { potencia: 3, acidez: 1, dulzura: 3, taninos: 1, afrutado: 4 } },
];

const personas: Persona[] = [
  { id: 'novato-sin-historial', job: 'Entender su gusto sin historial ni vocabulario técnico', base: neutral },
  { id: 'blanco-atlantico', job: 'Priorizar blancos frescos y salinos', base: neutral, targetId: 'albarino-atlantico', antiId: 'rioja-reserva' },
  { id: 'tinto-clasico', job: 'Encontrar tintos estructurados y familiares', base: neutral, targetId: 'rioja-reserva', antiId: 'moscatel-dulce' },
  { id: 'experto-explorador', job: 'Aceptar tensión y estructura fuera de su zona habitual', base: neutral, targetId: 'nebbiolo-estructurado', antiId: 'tinto-frutal' },
  { id: 'frutal-suave', job: 'Evitar tanino y encontrar fruta directa', base: neutral, targetId: 'tinto-frutal', antiId: 'nebbiolo-estructurado' },
  { id: 'dulce-aromatico', job: 'Encontrar dulzor y expresión aromática', base: neutral, targetId: 'moscatel-dulce', antiId: 'rioja-reserva' },
  { id: 'baja-acidez', job: 'Evitar perfiles tensos y muy ácidos', base: neutral, targetId: 'blanco-baja-acidez', antiId: 'albarino-atlantico' },
  { id: 'presupuesto-estricto', job: 'No superar 15 EUR aunque el estilo cambie', base: neutral, unsupportedPreference: 'budget' },
  { id: 'maridaje-marisco', job: 'Elegir para marisco sin convertir la ocasión en gusto permanente', base: neutral, unsupportedPreference: 'occasion' },
  { id: 'cambio-de-opinion', job: 'Dejar atrás tintos clásicos y pasar a blancos frescos', base: neutral, targetId: 'rioja-reserva', antiId: 'albarino-atlantico', changesOpinion: true },
];

const candidate = (id: string | undefined) => catalog.find((wine) => wine.id === id);

const signal = (
  wine: CatalogWine,
  rating: 'love' | 'not_for_me',
  updatedAt?: string,
): TrainableWine => ({
  rating,
  sensory_attributes: wine.sensory_attributes,
  updated_at: updatedAt,
});

const buildSignals = (persona: Persona, count: number) => {
  const target = candidate(persona.targetId);
  const anti = candidate(persona.antiId);
  if (!target || !anti || count === 0) return [];

  return Array.from({ length: count }, (_, index) => (
    index % 4 === 3 ? signal(anti, 'not_for_me') : signal(target, 'love')
  ));
};

const phaseCounts = [0, 1, 5, 20];
const rows = personas.map((persona) => {
  const phases = phaseCounts.map((count) => {
    const signals = buildSignals(persona, count);
    const audit = auditMatchrimLearning(persona.base, signals, catalog);
    assert.equal(audit.learned.samples, signals.length, `${persona.id}: phase ${count} sample count`);
    return {
      savedOrRated: count,
      samples: audit.learned.samples,
      confidence: audit.learned.confidence,
      top: audit.recommendations[0]?.id || 'none',
      topScore: audit.recommendations[0]?.afterScore || 0,
      profile: audit.learned.profile,
    };
  });

  for (let index = 1; index < phases.length; index += 1) {
    assert.ok(
      phases[index].confidence >= phases[index - 1].confidence,
      `${persona.id}: confidence must not decrease while valid evidence is added`,
    );
  }

  if (persona.targetId) {
    assert.equal(phases.at(-1)?.top, persona.targetId, `${persona.id}: 20-rating phase follows explicit preference`);
  } else {
    assert.deepEqual(phases.at(-1)?.profile, persona.base, `${persona.id}: unsupported or absent evidence does not mutate taste`);
  }

  const ranked = auditMatchrimLearning(persona.base, buildSignals(persona, 20), catalog).recommendations
    .flatMap((item) => {
      const wine = candidate(item.id);
      return wine ? [wine] : [];
    });
  const savedTop = ranked[0];
  const afterSave = selectUnseenWineRecommendations(ranked, savedTop ? [savedTop] : []);
  if (savedTop && ranked.length > 1) {
    assert.notEqual(afterSave.recommendations[0]?.id, savedTop.id, `${persona.id}: saved top is excluded`);
  }

  let reversal = null;
  if (persona.changesOpinion) {
    const oldTarget = candidate(persona.targetId)!;
    const newTarget = candidate(persona.antiId)!;
    const staleDate = '2025-09-29T12:00:00.000Z';
    const recentDate = '2026-09-29T12:00:00.000Z';
    const weakChangeRatings = [
      ...Array.from({ length: 15 }, () => signal(oldTarget, 'love', staleDate)),
      ...Array.from({ length: 5 }, () => signal(newTarget, 'love', recentDate)),
    ];
    const weakChange = auditMatchrimLearning(persona.base, weakChangeRatings, catalog);
    const weakTopThree = weakChange.recommendations.slice(0, 3).map((wine) => wine.id);
    assert.ok(
      weakTopThree.includes(newTarget.id),
      'Five consistent recent ratings must move the changed preference into the top three',
    );
    assert.ok(
      weakChange.learned.confidence < 90,
      'A recent preference reversal must expose uncertainty rather than claim full confidence',
    );
    const sustainedChangeRatings = [
      ...Array.from({ length: 5 }, () => signal(oldTarget, 'love', staleDate)),
      ...Array.from({ length: 15 }, () => signal(newTarget, 'love', recentDate)),
    ];
    const sustainedChange = auditMatchrimLearning(persona.base, sustainedChangeRatings, catalog);
    assert.equal(sustainedChange.recommendations[0]?.id, newTarget.id, 'A sustained edited preference must converge on the new target');
    reversal = {
      weakChange: {
        currentRatingRows: weakChangeRatings.length,
        top: weakChange.recommendations[0]?.id || 'none',
        topThree: weakTopThree,
        expectedTarget: newTarget.id,
        converged: weakChange.recommendations[0]?.id === newTarget.id,
        confidence: weakChange.learned.confidence,
      },
      sustainedChange: {
        currentRatingRows: sustainedChangeRatings.length,
        top: sustainedChange.recommendations[0]?.id || 'none',
        expectedTarget: newTarget.id,
        converged: sustainedChange.recommendations[0]?.id === newTarget.id,
        confidence: sustainedChange.learned.confidence,
        profile: sustainedChange.learned.profile,
      },
    };
  }

  return {
    id: persona.id,
    job: persona.job,
    unsupportedPreference: persona.unsupportedPreference || null,
    phases,
    nextAfterSavingTop: afterSave.recommendations[0]?.id || 'none',
    reversal,
  };
});

const saveWithoutRating = calculateLearnedMatchrimProfile(neutral, [
  { sensory_attributes: catalog[0].sensory_attributes },
]);
assert.equal(saveWithoutRating.samples, 0, 'Saving without rating must not count as learning evidence');
assert.deepEqual(saveWithoutRating.profile, neutral, 'Saving without rating must not change the learned profile');

const partialAttributes = calculateLearnedMatchrimProfile(neutral, [
  { rating: 'love', sensory_attributes: { acidez: 5, afrutado: 4 } },
]);
assert.equal(partialAttributes.samples, 0, 'Partial sensory data must not silently train the current five-axis model');

const duplicateCandidate = { ...catalog[0], id: 'albarino-atlantico-duplicate' };
const deduplicated = selectUnseenWineRecommendations([catalog[0], duplicateCandidate, catalog[1]], []);
assert.deepEqual(
  deduplicated.recommendations.map((wine) => wine.id),
  ['albarino-atlantico', 'godello-redondo'],
  'Canonical duplicate recommendations must collapse before display',
);

const vintageAware = selectUnseenWineRecommendations([
  catalog[2],
  { ...catalog[2], id: 'rioja-reserva-2021', vintage: 2021 },
], [catalog[2]]);
assert.deepEqual(vintageAware.recommendations.map((wine) => wine.id), ['rioja-reserva-2021']);

const percentile = (values: number[], ratio: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] || 0;
};

let seed = 29_09_2026;
const random = () => {
  seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
  return seed / 4_294_967_296;
};

const cohortLatencies: number[] = [];
const cohortState = new Map<string, string>();
for (let index = 0; index < 1_000; index += 1) {
  const id = `virtual-${String(index + 1).padStart(4, '0')}`;
  const base = {
    potente: 1 + Math.floor(random() * 5),
    acidez: 1 + Math.floor(random() * 5),
    dulce: 1 + Math.floor(random() * 5),
    tanico: 1 + Math.floor(random() * 5),
    afrutado: 1 + Math.floor(random() * 5),
  };
  const targetIndex = Math.floor(random() * catalog.length);
  const target = catalog[targetIndex];
  const anti = catalog[(targetIndex + 3) % catalog.length];
  const count = phaseCounts[index % phaseCounts.length];
  const signals = Array.from({ length: count }, (_, signalIndex) => (
    signalIndex % 5 === 4 ? signal(anti, 'not_for_me') : signal(target, 'love')
  ));

  const started = performance.now();
  const result = auditMatchrimLearning(base, signals, catalog);
  cohortLatencies.push(performance.now() - started);
  cohortState.set(id, JSON.stringify({ id, learned: result.learned, top: result.recommendations[0]?.id }));
}

assert.equal(cohortState.size, 1_000, 'All virtual sessions remain independently addressable');
for (const [id, serialized] of cohortState) {
  assert.equal(JSON.parse(serialized).id, id, `${id}: serialized state belongs to the same virtual user`);
}

const report = {
  generatedAt: '2026-09-29',
  scope: {
    users: '10 deterministic personas plus 1,000 local virtual model sessions',
    backend: 'none; no Supabase, aiRIM, scan function or production traffic',
    data: 'synthetic; no accounts, emails or real-user rows',
  },
  personas: rows,
  invariants: {
    saveWithoutRatingDoesNotLearn: saveWithoutRating.samples === 0,
    partialSensoryDataDoesNotTrain: partialAttributes.samples === 0,
    canonicalRecommendationDuplicatesCollapse: deduplicated.recommendations.length === 2,
    differentVintageRemainsEligible: vintageAware.recommendations[0]?.id === 'rioja-reserva-2021',
    virtualSessionsIsolated: cohortState.size === 1_000,
  },
  modelLimits: {
    budgetIsPersistentTasteDimension: false,
    occasionIsPersistentTasteDimension: false,
    confidenceMeasuresDiversity: true,
    confidenceMeasuresContradiction: true,
    recencyIsAppliedWhenTimestampsExist: true,
    confidenceDefinition: 'sample coverage calibrated by directional consistency and sensory diversity; profile deltas use a 120-day recency decay with a 0.2 floor',
  },
  virtualCohort: {
    count: cohortLatencies.length,
    operation: 'in-process profile learning plus ranking of eight candidates',
    p50Ms: Number(percentile(cohortLatencies, 0.50).toFixed(4)),
    p95Ms: Number(percentile(cohortLatencies, 0.95).toFixed(4)),
    p99Ms: Number(percentile(cohortLatencies, 0.99).toFixed(4)),
    errors: 0,
    qualification: 'algorithm benchmark only; not staging load or 1,000 human users',
  },
};

const outputPath = process.env.MATCHRIM_INTEGRAL_QA_OUTPUT || resolve(
  'docs/qa-evidence/matchrim-integral-qa-2026-09-29/persona-longitudinal.json',
);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.table(rows.map((row) => ({
  persona: row.id,
  topCold: row.phases[0].top,
  top20: row.phases[3].top,
  confidence20: row.phases[3].confidence,
  nextAfterSave: row.nextAfterSavingTop,
  unsupported: row.unsupportedPreference || '',
})));
console.log(JSON.stringify(report.virtualCohort, null, 2));
