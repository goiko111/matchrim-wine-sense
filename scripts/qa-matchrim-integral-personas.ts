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
import { generateMatchrimCode, type MatchrimProfileLike } from '../src/utils/matchrimPassport';
import { selectUnseenWineRecommendations } from '../src/utils/matchrimRecommendations';
import { generateMatchrimName, generateWineStyles } from '../src/utils/profileUtils';

type CatalogWine = MatchrimRecommendationCandidate & {
  vintage: number;
  price: number;
};

type QuizResult = MatchrimProfileLike;

const questions = [
  { id: 1, text: '¿Te gusta la manzana verde?', scores: { potente: 0, acidez: 2, dulce: 0, tanico: 0, afrutado: 1 } },
  { id: 2, text: '¿Te gusta la cayena?', scores: { potente: 2, acidez: 0, dulce: 0, tanico: 2, afrutado: 0 } },
  { id: 3, text: '¿Te gustan las trufas?', scores: { potente: 2, acidez: 0, dulce: 0, tanico: 2, afrutado: 0 } },
  { id: 4, text: '¿Te gusta el pimiento rojo asado?', scores: { potente: 0, acidez: 0, dulce: 2, tanico: 0, afrutado: 2 } },
  { id: 5, text: '¿Te gusta el olor a cuero?', scores: { potente: 2, acidez: 0, dulce: 0, tanico: 2, afrutado: 0 } },
  { id: 6, text: '¿Te gusta el queso azul?', scores: { potente: 2, acidez: 1, dulce: 0, tanico: 2, afrutado: 0 } },
  { id: 7, text: '¿Te gustan los pepinillos en vinagre?', scores: { potente: 0, acidez: 2, dulce: 0, tanico: 0, afrutado: 0 } },
  { id: 8, text: '¿Te gustan las berenjenas asadas?', scores: { potente: 2, acidez: 0, dulce: 0, tanico: 2, afrutado: 0 } },
  { id: 9, text: '¿Te gustan los dátiles?', scores: { potente: 0, acidez: 0, dulce: 2, tanico: 0, afrutado: 2 } },
  { id: 10, text: '¿Te gusta el anís estrellado?', scores: { potente: 1, acidez: 0, dulce: 1, tanico: 1, afrutado: 1 } },
  { id: 11, text: '¿Te gusta el café sin azúcar?', scores: { potente: 2, acidez: 0, dulce: 0, tanico: 2, afrutado: 0 } },
  { id: 12, text: '¿Te gustan las avellanas tostadas?', scores: { potente: 1, acidez: 0, dulce: 1, tanico: 1, afrutado: 0 } },
  { id: 13, text: '¿Te gusta la vainilla?', scores: { potente: 1, acidez: 0, dulce: 2, tanico: 1, afrutado: 0 } },
  { id: 14, text: '¿Te gusta el café con leche y azúcar?', scores: { potente: 1, acidez: 0, dulce: 2, tanico: 1, afrutado: 0 } },
  { id: 15, text: '¿Te gusta la hierbabuena?', scores: { potente: 0, acidez: 1, dulce: 0, tanico: 0, afrutado: 1 } },
  { id: 16, text: '¿Te gusta el mango?', scores: { potente: 0, acidez: 0, dulce: 2, tanico: 0, afrutado: 2 } },
  { id: 17, text: '¿Te gusta el marisco?', scores: { potente: 0, acidez: 2, dulce: 0, tanico: 0, afrutado: 0 } },
  { id: 18, text: '¿Te gustan los encurtidos?', scores: { potente: 0, acidez: 2, dulce: 0, tanico: 0, afrutado: 0 } },
  { id: 19, text: '¿Te gusta el curry?', scores: { potente: 2, acidez: 0, dulce: 0, tanico: 1, afrutado: 0 } },
  { id: 20, text: '¿Te gustan los caramelos de limón?', scores: { potente: 0, acidez: 2, dulce: 2, tanico: 0, afrutado: 1 } },
] as const;

const calculateProfile = (answers: Record<number, string>): QuizResult => {
  const totals = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
  const weighted = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
  for (const question of questions) {
    const multiplier = answers[question.id] === 'si' ? 1 : answers[question.id] === 'indiferente' ? 0.5 : 0;
    for (const key of Object.keys(totals) as Array<keyof QuizResult>) {
      totals[key] += question.scores[key];
      weighted[key] += question.scores[key] * multiplier;
    }
  }
  const normalized = (value: number, total: number) => total === 0 ? 0 : Math.round((value / total) * 5);
  return {
    potente: normalized(weighted.potente, totals.potente),
    acidez: normalized(weighted.acidez, totals.acidez),
    dulce: normalized(weighted.dulce, totals.dulce),
    tanico: normalized(weighted.tanico, totals.tanico),
    afrutado: normalized(weighted.afrutado, totals.afrutado),
  };
};

type Persona = {
  id: string;
  job: string;
  risk: string;
  scanScenario: 'single-label' | 'multi-bottle' | 'printed-list' | 'handwritten-board' | 'difficult-image';
  yes: number[];
  indifferent?: number[];
  targetId?: string;
  antiId?: string;
  acceptableTopIds?: string[];
  unsupportedPreference?: 'budget' | 'occasion' | 'color';
  changesOpinion?: boolean;
};

const answersFor = (persona: Pick<Persona, 'yes' | 'indifferent'>) => Object.fromEntries(
  questions.map((question) => [
    question.id,
    persona.yes.includes(question.id)
      ? 'si'
      : persona.indifferent?.includes(question.id)
        ? 'indiferente'
        : 'no',
  ]),
) as Record<number, string>;

const normalizePassportProfile = (profile: QuizResult): QuizResult => ({
  potente: Math.max(1, Math.min(5, Math.round(profile.potente))),
  acidez: Math.max(1, Math.min(5, Math.round(profile.acidez))),
  dulce: Math.max(1, Math.min(5, Math.round(profile.dulce))),
  tanico: Math.max(1, Math.min(5, Math.round(profile.tanico))),
  afrutado: Math.max(1, Math.min(5, Math.round(profile.afrutado))),
});

const answerSummary = (persona: Persona) => ({
  yes: persona.yes.length,
  indifferent: persona.indifferent?.length || 0,
  no: questions.length - persona.yes.length - (persona.indifferent?.length || 0),
  liked: questions.filter((question) => persona.yes.includes(question.id)).map((question) => question.text),
});

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
  { id: 'principiante-cero', job: 'Entender su gusto sin historial ni vocabulario técnico', risk: 'cold-start', scanScenario: 'single-label', yes: [], indifferent: [1, 4, 9, 13, 17] },
  { id: 'principiante-frutal', job: 'Encontrar fruta directa con lenguaje sencillo', risk: 'false-precision', scanScenario: 'single-label', yes: [4, 9, 13, 16, 20], indifferent: [1, 15], targetId: 'tinto-frutal', antiId: 'nebbiolo-estructurado' },
  { id: 'tinto-clasico', job: 'Encontrar tintos estructurados y familiares', risk: 'overweight-oak', scanScenario: 'single-label', yes: [2, 3, 5, 6, 8, 11, 12, 19], indifferent: [4], targetId: 'rioja-reserva', antiId: 'moscatel-dulce' },
  { id: 'blanco-atlantico', job: 'Priorizar blancos frescos y salinos', risk: 'acidity-explanation', scanScenario: 'single-label', yes: [1, 7, 15, 17, 18, 20], indifferent: [4, 16], targetId: 'albarino-atlantico', antiId: 'rioja-reserva' },
  { id: 'dulce-aromatico', job: 'Encontrar dulzor y expresión aromática', risk: 'sweetness-vs-fruit', scanScenario: 'single-label', yes: [4, 9, 10, 13, 14, 16, 20], indifferent: [12], targetId: 'moscatel-dulce', antiId: 'rioja-reserva' },
  { id: 'acidez-alta', job: 'Buscar tensión, cítricos y final fresco', risk: 'high-acidity-ranking', scanScenario: 'printed-list', yes: [1, 7, 15, 17, 18, 20], indifferent: [6], targetId: 'albarino-atlantico', antiId: 'blanco-baja-acidez' },
  { id: 'acidez-baja', job: 'Evitar vinos tensos y muy ácidos', risk: 'negative-factor', scanScenario: 'printed-list', yes: [4, 9, 12, 13, 14, 16], indifferent: [2], targetId: 'blanco-baja-acidez', antiId: 'albarino-atlantico' },
  { id: 'tanino-alto', job: 'Elegir estructura para carne y guarda prudente', risk: 'unsupported-cellaring-claim', scanScenario: 'printed-list', yes: [2, 3, 5, 6, 8, 11, 19], indifferent: [7], targetId: 'nebbiolo-estructurado', antiId: 'tinto-frutal', acceptableTopIds: ['nebbiolo-estructurado', 'rioja-reserva'] },
  { id: 'tanino-bajo', job: 'Evitar sequedad y encontrar tacto amable', risk: 'friction-visibility', scanScenario: 'printed-list', yes: [4, 9, 15, 16], indifferent: [1, 13], targetId: 'tinto-frutal', antiId: 'nebbiolo-estructurado' },
  { id: 'experto-explorador', job: 'Aceptar tensión y estructura fuera de su zona habitual', risk: 'adventure-label', scanScenario: 'multi-bottle', yes: [1, 2, 3, 5, 6, 7, 8, 10, 11, 18, 19], targetId: 'nebbiolo-estructurado', antiId: 'tinto-frutal' },
  { id: 'conservador-familiar', job: 'Elegir una referencia segura antes que una novedad', risk: 'safe-vs-exploratory', scanScenario: 'multi-bottle', yes: [3, 5, 8, 11, 12], indifferent: [2, 6], targetId: 'rioja-reserva', antiId: 'moscatel-dulce' },
  { id: 'presupuesto-estricto', job: 'No superar 15 EUR sin fingir que precio es gusto', risk: 'context-leak-into-profile', scanScenario: 'printed-list', yes: [4, 9, 15, 16], indifferent: [1], unsupportedPreference: 'budget' },
  { id: 'compra-premium', job: 'Comparar botellas premium y añadas sin inventar valor', risk: 'price-authority', scanScenario: 'multi-bottle', yes: [2, 3, 5, 6, 8, 11, 12, 19], indifferent: [7, 18], targetId: 'nebbiolo-estructurado', antiId: 'tinto-frutal', acceptableTopIds: ['nebbiolo-estructurado', 'rioja-reserva'] },
  { id: 'restaurante-copa', job: 'Elegir por copa manteniendo formato y precio', risk: 'service-format-loss', scanScenario: 'printed-list', yes: [1, 4, 15, 17], indifferent: [9, 16], unsupportedPreference: 'occasion' },
  { id: 'maridaje-marisco', job: 'Elegir para marisco sin convertir la ocasión en gusto permanente', risk: 'occasion-leak-into-profile', scanScenario: 'printed-list', yes: [1, 7, 15, 17, 18], indifferent: [20], unsupportedPreference: 'occasion' },
  { id: 'sumiller-tintos', job: 'Revisar una carta de tintos con criterio profesional', risk: 'dense-column-merge', scanScenario: 'printed-list', yes: [2, 3, 5, 6, 8, 11, 12, 19], indifferent: [7], targetId: 'rioja-reserva', antiId: 'moscatel-dulce' },
  { id: 'sumiller-blancos', job: 'Revisar blancos, regiones y añadas en una carta inclinada', risk: 'canonical-field-split', scanScenario: 'printed-list', yes: [1, 7, 15, 17, 18, 20], indifferent: [10], unsupportedPreference: 'color' },
  { id: 'tienda-expositor', job: 'Resolver varias botellas sin confundir regiones', risk: 'box-result-alignment', scanScenario: 'multi-bottle', yes: [1, 4, 7, 9, 15, 16], indifferent: [2, 18], targetId: 'mencia-fresca', antiId: 'moscatel-dulce', acceptableTopIds: ['mencia-fresca', 'albarino-atlantico'] },
  { id: 'coleccionista-duplicados', job: 'Agrupar duplicados conservando añadas y recuento', risk: 'canonical-deduplication', scanScenario: 'multi-bottle', yes: [2, 3, 5, 8, 11, 12], indifferent: [6], targetId: 'rioja-reserva', antiId: 'blanco-baja-acidez' },
  { id: 'etiqueta-oculta', job: 'Recibir incertidumbre útil cuando no se lee la etiqueta', risk: 'identity-hallucination', scanScenario: 'difficult-image', yes: [4, 10, 13, 15], indifferent: [1, 9, 16] },
  { id: 'pizarra-manuscrita', job: 'Corregir OCR de escritura irregular sin perder estructura', risk: 'handwriting-false-positive', scanScenario: 'handwritten-board', yes: [1, 4, 7, 15, 18], indifferent: [10, 17] },
  { id: 'baja-vision', job: 'Completar la decisión con texto ampliado', risk: 'dynamic-type-overflow', scanScenario: 'printed-list', yes: [4, 9, 13, 16], indifferent: [1, 15], targetId: 'tinto-frutal', antiId: 'nebbiolo-estructurado' },
  { id: 'voiceover', job: 'Navegar pins, lista y explicación sin apoyo visual', risk: 'accessible-name-order', scanScenario: 'printed-list', yes: [1, 7, 15, 17], indifferent: [4, 18], targetId: 'albarino-atlantico', antiId: 'rioja-reserva' },
  { id: 'movilidad-reducida', job: 'Usar controles sin gestos ni objetivos pequeños', risk: 'touch-target', scanScenario: 'multi-bottle', yes: [4, 9, 12, 16], indifferent: [1, 13], targetId: 'blanco-baja-acidez', antiId: 'albarino-atlantico' },
  { id: 'cambio-de-opinion', job: 'Dejar atrás tintos clásicos y pasar a blancos frescos', risk: 'recency-reversal', scanScenario: 'multi-bottle', yes: [2, 3, 5, 6, 8, 11], indifferent: [1, 7], targetId: 'rioja-reserva', antiId: 'albarino-atlantico', changesOpinion: true },
];

assert.equal(personas.length, 25, 'The deterministic QA cohort must contain exactly 25 isolated personas');

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
  const answers = answersFor(persona);
  const base = calculateProfile(answers) satisfies QuizResult;
  const phases = phaseCounts.map((count) => {
    const signals = buildSignals(persona, count);
    const audit = auditMatchrimLearning(base, signals, catalog);
    assert.equal(audit.learned.samples, signals.length, `${persona.id}: phase ${count} sample count`);
    return {
      requestedPhase: count,
      savedOrRated: signals.length,
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
    const finalRecommendations = auditMatchrimLearning(base, buildSignals(persona, 20), catalog).recommendations;
    const finalTopThree = finalRecommendations.slice(0, 3).map((wine) => wine.id);
    assert.ok(finalTopThree.includes(persona.targetId), `${persona.id}: explicit preference must reach the top three`);
    assert.ok(
      (persona.acceptableTopIds || [persona.targetId]).includes(finalRecommendations[0]?.id),
      `${persona.id}: first recommendation ${finalRecommendations[0]?.id || 'none'} must stay inside the accepted style family`,
    );
    assert.notEqual(finalRecommendations[0]?.id, persona.antiId, `${persona.id}: rejected style cannot rank first`);
  } else {
    assert.deepEqual(phases.at(-1)?.profile, base, `${persona.id}: unsupported or absent evidence does not mutate taste`);
  }

  const finalAudit = auditMatchrimLearning(base, buildSignals(persona, 20), catalog);
  const passportProfile = normalizePassportProfile(finalAudit.learned.profile);
  const ranked = finalAudit.recommendations
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
    const weakChange = auditMatchrimLearning(base, weakChangeRatings, catalog);
    const weakTopFive = weakChange.recommendations.slice(0, 5).map((wine) => wine.id);
    const weakTarget = weakChange.recommendations.find((wine) => wine.id === newTarget.id)!;
    assert.ok(
      weakTopFive.includes(newTarget.id) && weakTarget.delta > 0,
      'Five consistent recent ratings must improve the changed preference without erasing older evidence',
    );
    assert.ok(
      weakChange.learned.confidence < 90,
      'A recent preference reversal must expose uncertainty rather than claim full confidence',
    );
    const sustainedChangeRatings = [
      ...Array.from({ length: 5 }, () => signal(oldTarget, 'love', staleDate)),
      ...Array.from({ length: 15 }, () => signal(newTarget, 'love', recentDate)),
    ];
    const sustainedChange = auditMatchrimLearning(base, sustainedChangeRatings, catalog);
    assert.equal(sustainedChange.recommendations[0]?.id, newTarget.id, 'A sustained edited preference must converge on the new target');
    reversal = {
      weakChange: {
        currentRatingRows: weakChangeRatings.length,
        top: weakChange.recommendations[0]?.id || 'none',
        topFive: weakTopFive,
        targetRank: weakChange.recommendations.findIndex((wine) => wine.id === newTarget.id) + 1,
        targetDelta: weakTarget.delta,
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
    risk: persona.risk,
    scanScenario: persona.scanScenario,
    answers: answerSummary(persona),
    initialProfile: base,
    learnedProfile: finalAudit.learned.profile,
    passportProfile,
    passportMatchrimCode: generateMatchrimCode(passportProfile),
    passportMatchrimName: generateMatchrimName(passportProfile),
    matchrimCode: generateMatchrimCode(finalAudit.learned.profile),
    matchrimName: generateMatchrimName(finalAudit.learned.profile),
    styles: generateWineStyles(finalAudit.learned.profile),
    unsupportedPreference: persona.unsupportedPreference || null,
    phases,
    nextAfterSavingTop: afterSave.recommendations[0]?.id || 'none',
    reversal,
  };
});

const neutral = calculateProfile(answersFor({ yes: [], indifferent: questions.map((question) => question.id) }));
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
  generatedAt: '2026-10-01',
  scope: {
    users: '25 deterministic isolated personas plus 1,000 local virtual model sessions',
    backend: 'none; no Supabase, aiRIM, scan function or production traffic',
    data: 'synthetic; no accounts, emails or real-user rows',
  },
  personas: rows,
  personaCount: rows.length,
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
    colorIsPersistentTasteDimension: false,
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
  code: row.matchrimCode,
  name: row.matchrimName,
  topCold: row.phases[0].top,
  top20: row.phases[3].top,
  confidence20: row.phases[3].confidence,
  nextAfterSave: row.nextAfterSavingTop,
  unsupported: row.unsupportedPreference || '',
})));
console.log(JSON.stringify(report.virtualCohort, null, 2));
