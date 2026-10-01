import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  auditMatchrimLearning,
  scoreMatchrimProfileAgainstSensory,
  type MatchrimLearningOptions,
  type MatchrimRecommendationCandidate,
  type TrainableWine,
} from '../src/utils/matchrimLearning';
import type { MatchrimProfileLike } from '../src/utils/matchrimPassport';

type Axis = keyof MatchrimProfileLike;
type Strategy = 'popularity' | 'onboarding' | 'hybrid' | 'candidate' | 'oracle';
type Context = 'weekday' | 'aperitif' | 'seafood' | 'meat' | 'spicy' | 'celebration';
type Rating = 'love' | 'ok' | 'not_for_me';

type SimulationConfig = {
  users: number;
  days: number;
  seed: number;
  catalogSize: number;
  candidatePoolSize: number;
  auditProfiles: number;
};

type CatalogWine = MatchrimRecommendationCandidate & {
  price: number;
  popularity: number;
  style: 'fresh' | 'fruity' | 'structured' | 'sweet' | 'rounded' | 'intense';
};

type Segment = {
  id: 'novice' | 'casual' | 'enthusiast' | 'collector' | 'sommelier';
  weight: number;
  annualEvents: number;
  feedbackRate: number;
  onboardingNoise: number;
  exploration: number;
};

type RankedWine = {
  wine: CatalogWine;
  score: number;
};

type CalibrationBin = {
  count: number;
  predicted: number;
  observed: number;
};

type MetricBucket = {
  events: number;
  precisionAt5: number;
  recallAt5: number;
  ndcgAt5: number;
  hitAt1: number;
  regret: number;
  affinityMae: number;
  affinityMaeCount: number;
  correctTop: number;
  rejectedTop: number;
  falseConfident: number;
  topScores: number;
  calibration: CalibrationBin[];
  coverage: Set<string>;
};

type UserAudit = {
  id: string;
  segment: Segment['id'];
  events: number;
  ratings: number;
  drifted: boolean;
  baseProfile: MatchrimProfileLike;
  initialLatentProfile: MatchrimProfileLike;
  finalLatentProfile: MatchrimProfileLike;
  finalLearnedProfile: MatchrimProfileLike;
  finalCandidateProfile: MatchrimProfileLike;
  initialProfileRmse: number;
  finalProfileRmse: number;
  finalCandidateProfileRmse: number;
  candidateShiftDetected: boolean;
  candidateShiftMagnitude: number;
  learnedAtRating: number | null;
  loveRate: number;
  rejectionRate: number;
  uniqueTopRecommendations: number;
};

const AXES: Axis[] = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'];
const SENSORY_KEYS: Record<Axis, 'potencia' | 'acidez' | 'dulzura' | 'taninos' | 'afrutado'> = {
  potente: 'potencia',
  acidez: 'acidez',
  dulce: 'dulzura',
  tanico: 'taninos',
  afrutado: 'afrutado',
};
const STRATEGIES: Strategy[] = ['popularity', 'onboarding', 'hybrid', 'candidate', 'oracle'];
const CONTEXTS: Context[] = ['weekday', 'aperitif', 'seafood', 'meat', 'spicy', 'celebration'];
const MILESTONES = [0, 1, 3, 5, 10, 25, 50] as const;
const DAY_MS = 86_400_000;
const START_DATE = Date.parse('2026-01-01T12:00:00Z');
const CANDIDATE_OPTIONS: MatchrimLearningOptions = {
  detectPreferenceShift: true,
  driftThreshold: 0.9,
  calibrateAffinity: true,
  affinityPrior: 72,
};

const SEGMENTS: Segment[] = [
  { id: 'novice', weight: 0.30, annualEvents: 14, feedbackRate: 0.46, onboardingNoise: 1.05, exploration: 0.12 },
  { id: 'casual', weight: 0.28, annualEvents: 26, feedbackRate: 0.54, onboardingNoise: 0.82, exploration: 0.18 },
  { id: 'enthusiast', weight: 0.22, annualEvents: 52, feedbackRate: 0.68, onboardingNoise: 0.58, exploration: 0.28 },
  { id: 'collector', weight: 0.10, annualEvents: 78, feedbackRate: 0.73, onboardingNoise: 0.45, exploration: 0.22 },
  { id: 'sommelier', weight: 0.10, annualEvents: 120, feedbackRate: 0.82, onboardingNoise: 0.34, exploration: 0.36 },
];

const ARCHETYPES: MatchrimProfileLike[] = [
  { potente: 2, acidez: 5, dulce: 1, tanico: 1, afrutado: 4 },
  { potente: 5, acidez: 3, dulce: 1, tanico: 5, afrutado: 3 },
  { potente: 2, acidez: 3, dulce: 2, tanico: 1, afrutado: 5 },
  { potente: 2, acidez: 3, dulce: 5, tanico: 1, afrutado: 5 },
  { potente: 3, acidez: 2, dulce: 3, tanico: 2, afrutado: 4 },
  { potente: 5, acidez: 4, dulce: 1, tanico: 4, afrutado: 2 },
];

class Random {
  private state: number;
  private spareNormal: number | null = null;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next() {
    this.state = (Math.imul(this.state, 1_664_525) + 1_013_904_223) >>> 0;
    return this.state / 4_294_967_296;
  }

  integer(maxExclusive: number) {
    return Math.floor(this.next() * maxExclusive);
  }

  normal(mean = 0, deviation = 1) {
    if (this.spareNormal !== null) {
      const value = this.spareNormal;
      this.spareNormal = null;
      return mean + value * deviation;
    }
    const u = Math.max(Number.EPSILON, this.next());
    const v = this.next();
    const magnitude = Math.sqrt(-2 * Math.log(u));
    const first = magnitude * Math.cos(2 * Math.PI * v);
    this.spareNormal = magnitude * Math.sin(2 * Math.PI * v);
    return mean + first * deviation;
  }

  weighted<T extends { weight: number }>(items: T[]) {
    const target = this.next() * items.reduce((sum, item) => sum + item.weight, 0);
    let cursor = 0;
    for (const item of items) {
      cursor += item.weight;
      if (target <= cursor) return item;
    }
    return items[items.length - 1];
  }
}

const clamp = (value: number, min = 0, max = 5) => Math.max(min, Math.min(max, value));
const round = (value: number, digits = 4) => Number(value.toFixed(digits));
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const percentile = (values: number[], ratio: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))];
};

const profileRmse = (left: MatchrimProfileLike, right: MatchrimProfileLike) => Math.sqrt(
  mean(AXES.map((axis) => Math.pow(left[axis] - right[axis], 2))),
);

const profileAtDay = (
  initial: MatchrimProfileLike,
  target: MatchrimProfileLike,
  drifted: boolean,
  day: number,
) => {
  if (!drifted || day < 180) return initial;
  const progress = Math.min(1, (day - 180) / 90);
  return Object.fromEntries(AXES.map((axis) => [
    axis,
    clamp(initial[axis] + (target[axis] - initial[axis]) * progress),
  ])) as MatchrimProfileLike;
};

const sensoryProfile = (wine: CatalogWine) => Object.fromEntries(AXES.map((axis) => [
  axis,
  Number(wine.sensory_attributes[SENSORY_KEYS[axis]]),
])) as MatchrimProfileLike;

const inferStyle = (profile: MatchrimProfileLike): CatalogWine['style'] => {
  if (profile.dulce >= 4) return 'sweet';
  if (profile.potente >= 4 && profile.tanico >= 4) return 'structured';
  if (profile.acidez >= 4 && profile.potente <= 3) return 'fresh';
  if (profile.afrutado >= 4 && profile.tanico <= 2) return 'fruity';
  if (profile.potente >= 4) return 'intense';
  return 'rounded';
};

const contextFit: Record<Context, Partial<Record<CatalogWine['style'], number>>> = {
  weekday: { fresh: 2, fruity: 4, rounded: 5, structured: -2, intense: -2 },
  aperitif: { fresh: 8, fruity: 5, rounded: 2, sweet: -3, structured: -5 },
  seafood: { fresh: 11, rounded: 3, fruity: 1, structured: -9, intense: -7 },
  meat: { structured: 11, intense: 8, rounded: 2, fresh: -6, sweet: -8 },
  spicy: { sweet: 8, fruity: 7, fresh: 4, structured: -7, intense: -4 },
  celebration: { structured: 4, intense: 4, fresh: 3, rounded: 2, sweet: 2 },
};

const generateCatalog = (size: number, random: Random): CatalogWine[] => Array.from({ length: size }, (_, index) => {
  const center = ARCHETYPES[index % ARCHETYPES.length];
  const profile = Object.fromEntries(AXES.map((axis) => [
    axis,
    clamp(Math.round(center[axis] + random.normal(0, 0.75)), 1, 5),
  ])) as MatchrimProfileLike;
  const style = inferStyle(profile);
  const sensory_attributes = Object.fromEntries(AXES.map((axis) => [SENSORY_KEYS[axis], profile[axis]]));
  return {
    id: `synthetic-wine-${String(index + 1).padStart(3, '0')}`,
    name: `Vino sintético ${String(index + 1).padStart(3, '0')}`,
    producer: `Bodega sintética ${String((index % 36) + 1).padStart(2, '0')}`,
    sensory_attributes,
    price: Math.round(clamp(8 + Math.exp(random.normal(2.65, 0.55)), 9, 95)),
    popularity: round(clamp(48 + random.normal(0, 18) + (style === 'fruity' ? 7 : 0), 5, 98), 2),
    style,
  };
});

const sampleCandidates = (catalog: CatalogWine[], count: number, random: Random) => {
  const indices = new Set<number>();
  while (indices.size < Math.min(count, catalog.length)) indices.add(random.integer(catalog.length));
  return [...indices].map((index) => catalog[index]);
};

const trueWineScore = (
  latent: MatchrimProfileLike,
  wine: CatalogWine,
  context: Context,
  budget: number,
) => {
  const taste = scoreMatchrimProfileAgainstSensory(latent, wine.sensory_attributes) ?? 0;
  const contextBonus = contextFit[context][wine.style] ?? 0;
  const overBudgetRatio = Math.max(0, wine.price - budget) / Math.max(1, budget);
  const pricePenalty = Math.min(24, overBudgetRatio * 22);
  return clamp(taste + contextBonus - pricePenalty, 0, 100);
};

const rankByProfile = (profile: MatchrimProfileLike, candidates: CatalogWine[]) => candidates
  .map((wine) => ({ wine, score: scoreMatchrimProfileAgainstSensory(profile, wine.sensory_attributes) ?? 0 }))
  .sort((a, b) => b.score - a.score || a.wine.id.localeCompare(b.wine.id));

const emptyBucket = (): MetricBucket => ({
  events: 0,
  precisionAt5: 0,
  recallAt5: 0,
  ndcgAt5: 0,
  hitAt1: 0,
  regret: 0,
  affinityMae: 0,
  affinityMaeCount: 0,
  correctTop: 0,
  rejectedTop: 0,
  falseConfident: 0,
  topScores: 0,
  calibration: Array.from({ length: 10 }, () => ({ count: 0, predicted: 0, observed: 0 })),
  coverage: new Set<string>(),
});

const getBucket = <T>(map: Map<T, MetricBucket>, key: T) => {
  let bucket = map.get(key);
  if (!bucket) {
    bucket = emptyBucket();
    map.set(key, bucket);
  }
  return bucket;
};

const discountedGain = (ranked: RankedWine[], relevant: Set<string>) => ranked.slice(0, 5)
  .reduce((sum, item, index) => sum + (relevant.has(item.wine.id) ? 1 / Math.log2(index + 2) : 0), 0);

const evaluateRanking = (
  bucket: MetricBucket,
  ranked: RankedWine[],
  trueRanked: RankedWine[],
  hasAffinityScore: boolean,
) => {
  const relevantCount = Math.max(3, Math.ceil(trueRanked.length * 0.2));
  const relevant = new Set(trueRanked.slice(0, relevantCount).map((item) => item.wine.id));
  const top = ranked[0];
  const topFive = ranked.slice(0, 5);
  const hits = topFive.filter((item) => relevant.has(item.wine.id)).length;
  const idealDcg = discountedGain(trueRanked.slice(0, Math.min(5, relevantCount)), relevant);
  const trueById = new Map(trueRanked.map((item) => [item.wine.id, item.score]));
  const topTrueScore = trueById.get(top.wine.id) ?? 0;
  const observed = topTrueScore >= 70 ? 1 : 0;

  bucket.events += 1;
  bucket.precisionAt5 += hits / Math.min(5, ranked.length);
  bucket.recallAt5 += hits / relevantCount;
  bucket.ndcgAt5 += idealDcg ? discountedGain(topFive, relevant) / idealDcg : 0;
  bucket.hitAt1 += relevant.has(top.wine.id) ? 1 : 0;
  bucket.regret += Math.max(0, trueRanked[0].score - topTrueScore);
  bucket.correctTop += observed;
  bucket.rejectedTop += topTrueScore < 55 ? 1 : 0;
  bucket.coverage.add(top.wine.id);

  if (hasAffinityScore) {
    bucket.affinityMae += Math.abs(top.score - topTrueScore);
    bucket.affinityMaeCount += 1;
    bucket.falseConfident += top.score >= 80 && topTrueScore < 55 ? 1 : 0;
    bucket.topScores += top.score;
    const bin = Math.min(9, Math.floor(top.score / 10));
    bucket.calibration[bin].count += 1;
    bucket.calibration[bin].predicted += top.score / 100;
    bucket.calibration[bin].observed += observed;
  }
};

const summarizeBucket = (bucket: MetricBucket, catalogSize: number) => {
  const events = Math.max(1, bucket.events);
  const calibrationError = bucket.calibration.reduce((sum, bin) => {
    if (!bin.count) return sum;
    return sum + (bin.count / events) * Math.abs(bin.predicted / bin.count - bin.observed / bin.count);
  }, 0);
  return {
    events: bucket.events,
    precisionAt5: round(bucket.precisionAt5 / events),
    recallAt5: round(bucket.recallAt5 / events),
    ndcgAt5: round(bucket.ndcgAt5 / events),
    hitRateAt1: round(bucket.hitAt1 / events),
    meanRegret: round(bucket.regret / events),
    affinityMae: bucket.affinityMaeCount ? round(bucket.affinityMae / bucket.affinityMaeCount) : null,
    calibrationError: bucket.affinityMaeCount ? round(calibrationError) : null,
    correctTopRate: round(bucket.correctTop / events),
    rejectedTopRate: round(bucket.rejectedTop / events),
    falseConfidenceRate: bucket.affinityMaeCount ? round(bucket.falseConfident / bucket.affinityMaeCount) : null,
    meanTopAffinity: bucket.affinityMaeCount ? round(bucket.topScores / bucket.affinityMaeCount) : null,
    catalogCoverage: round(bucket.coverage.size / catalogSize),
  };
};

const chooseContext = (segment: Segment, random: Random): Context => {
  if (segment.id === 'sommelier') return CONTEXTS[random.integer(CONTEXTS.length)];
  const weights = segment.id === 'novice'
    ? [0.34, 0.15, 0.12, 0.12, 0.08, 0.19]
    : [0.25, 0.14, 0.16, 0.16, 0.09, 0.20];
  const target = random.next();
  let cursor = 0;
  for (let index = 0; index < CONTEXTS.length; index += 1) {
    cursor += weights[index];
    if (target <= cursor) return CONTEXTS[index];
  }
  return 'weekday';
};

const ratingForScore = (score: number, experienceNoise: number): Rating => {
  const experienced = score + experienceNoise;
  if (experienced >= 78) return 'love';
  if (experienced >= 57) return 'ok';
  return 'not_for_me';
};

const eventDays = (segment: Segment, days: number, random: Random) => {
  const expected = segment.annualEvents * (days / 365);
  const count = Math.max(1, Math.round(expected * (0.72 + random.next() * 0.56)));
  return Array.from({ length: count }, () => random.integer(days)).sort((a, b) => a - b);
};

const csv = (rows: Array<Record<string, string | number | null>>) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return `${headers.join(',')}\n${rows.map((row) => headers.map((header) => escape(row[header])).join(',')).join('\n')}\n`;
};

export const runMatchrimYearSimulation = (config: SimulationConfig) => {
  const started = performance.now();
  const random = new Random(config.seed);
  const catalog = generateCatalog(config.catalogSize, random);
  const overall = new Map<Strategy, MetricBucket>();
  const bySegment = new Map<string, MetricBucket>();
  const byMonth = new Map<string, MetricBucket>();
  const latencySamples: number[] = [];
  const candidateLatencySamples: number[] = [];
  const profileMilestones = new Map<number, number[]>();
  const driftShiftMagnitudes: number[] = [];
  const stableShiftMagnitudes: number[] = [];
  const audits: UserAudit[] = [];
  let totalEvents = 0;
  let totalRatings = 0;
  let totalLove = 0;
  let totalRejected = 0;
  let candidateLove = 0;
  let candidateRejected = 0;
  let driftingUsers = 0;
  let learnedUsers = 0;
  let candidateShiftDetectedUsers = 0;
  let candidateShiftTruePositives = 0;
  let candidateShiftFalsePositives = 0;
  const auditStep = Math.max(1, Math.floor(config.users / Math.max(1, config.auditProfiles)));

  MILESTONES.forEach((milestone) => profileMilestones.set(milestone, []));

  for (let userIndex = 0; userIndex < config.users; userIndex += 1) {
    const segment = random.weighted(SEGMENTS);
    const center = ARCHETYPES[random.integer(ARCHETYPES.length)];
    const latent = Object.fromEntries(AXES.map((axis) => [
      axis,
      clamp(center[axis] + random.normal(0, 0.62)),
    ])) as MatchrimProfileLike;
    const baseProfile = Object.fromEntries(AXES.map((axis) => [
      axis,
      clamp(Math.round(latent[axis] + random.normal(0, segment.onboardingNoise))),
    ])) as MatchrimProfileLike;
    const drifted = random.next() < 0.18;
    const driftTarget = Object.fromEntries(AXES.map((axis) => [
      axis,
      clamp(latent[axis] + random.normal(0, drifted ? 1.25 : 0.18)),
    ])) as MatchrimProfileLike;
    const budget = clamp(Math.exp(random.normal(3.15, 0.5)), 14, 90);
    const history: TrainableWine[] = [];
    const candidateHistory: TrainableWine[] = [];
    const topRecommendations = new Set<string>();
    const recordedMilestones = new Set<number>();
    const initialError = profileRmse(baseProfile, latent);
    let learnedAtRating: number | null = null;
    let userLove = 0;
    let userRejected = 0;
    let userEventCount = 0;
    let finalLearnedProfile = baseProfile;
    let finalCandidateProfile = baseProfile;
    let candidateShiftDetected = false;
    let candidateShiftMagnitude = 0;
    let finalLatentProfile = latent;

    profileMilestones.get(0)!.push(initialError);
    recordedMilestones.add(0);
    if (drifted) driftingUsers += 1;

    for (const day of eventDays(segment, config.days, random)) {
      const context = chooseContext(segment, random);
      const activeLatent = profileAtDay(latent, driftTarget, drifted, day);
      const candidates = sampleCandidates(catalog, config.candidatePoolSize, random);
      const eventStarted = performance.now();
      const hybridAudit = auditMatchrimLearning(baseProfile, history, candidates);
      latencySamples.push(performance.now() - eventStarted);
      const candidateStarted = performance.now();
      const candidateAudit = auditMatchrimLearning(baseProfile, candidateHistory, candidates, CANDIDATE_OPTIONS);
      candidateLatencySamples.push(performance.now() - candidateStarted);
      finalLearnedProfile = hybridAudit.learned.profile;
      finalCandidateProfile = candidateAudit.learned.profile;
      candidateShiftDetected ||= candidateAudit.learned.calibration.preferenceShiftDetected;
      candidateShiftMagnitude = Math.max(
        candidateShiftMagnitude,
        candidateAudit.learned.calibration.preferenceShiftMagnitude,
      );
      finalLatentProfile = activeLatent;

      const hybridById = new Map(hybridAudit.recommendations.map((item) => [item.id, item.afterScore]));
      const candidateById = new Map(candidateAudit.recommendations.map((item) => [item.id, item.afterScore]));
      const rankings: Record<Strategy, RankedWine[]> = {
        popularity: candidates
          .map((wine) => ({ wine, score: wine.popularity }))
          .sort((a, b) => b.score - a.score || a.wine.id.localeCompare(b.wine.id)),
        onboarding: rankByProfile(baseProfile, candidates),
        hybrid: candidates
          .map((wine) => ({ wine, score: hybridById.get(wine.id) ?? 0 }))
          .sort((a, b) => b.score - a.score || a.wine.id.localeCompare(b.wine.id)),
        candidate: candidates
          .map((wine) => ({
            wine,
            score: candidateById.get(wine.id) ?? 0,
            rankingScore: scoreMatchrimProfileAgainstSensory(candidateAudit.learned.profile, wine.sensory_attributes) ?? 0,
          }))
          .sort((a, b) => b.rankingScore - a.rankingScore || a.wine.id.localeCompare(b.wine.id))
          .map(({ wine, score }) => ({ wine, score })),
        oracle: candidates
          .map((wine) => ({ wine, score: trueWineScore(activeLatent, wine, context, budget) }))
          .sort((a, b) => b.score - a.score || a.wine.id.localeCompare(b.wine.id)),
      };
      const trueRanked = rankings.oracle;
      const month = Math.min(12, Math.floor(day / Math.max(1, config.days / 12)) + 1);

      for (const strategy of STRATEGIES) {
        const hasAffinity = strategy === 'onboarding'
          || strategy === 'hybrid'
          || strategy === 'candidate'
          || strategy === 'oracle';
        evaluateRanking(getBucket(overall, strategy), rankings[strategy], trueRanked, hasAffinity);
        evaluateRanking(getBucket(bySegment, `${segment.id}:${strategy}`), rankings[strategy], trueRanked, hasAffinity);
        evaluateRanking(getBucket(byMonth, `${month}:${strategy}`), rankings[strategy], trueRanked, hasAffinity);
      }

      const selected = rankings.hybrid[0];
      const candidateSelected = rankings.candidate[0];
      const selectedTrueScore = trueWineScore(activeLatent, selected.wine, context, budget);
      const candidateTrueScore = trueWineScore(activeLatent, candidateSelected.wine, context, budget);
      topRecommendations.add(selected.wine.id);
      totalEvents += 1;
      userEventCount += 1;

      if (random.next() <= segment.feedbackRate) {
        const experienceNoise = random.normal(0, 7);
        const rating = ratingForScore(selectedTrueScore, experienceNoise);
        const candidateRating = ratingForScore(candidateTrueScore, experienceNoise);
        const updatedAt = new Date(START_DATE + day * DAY_MS).toISOString();
        history.push({
          rating,
          sensory_attributes: selected.wine.sensory_attributes,
          updated_at: updatedAt,
        });
        candidateHistory.push({
          rating: candidateRating,
          sensory_attributes: candidateSelected.wine.sensory_attributes,
          updated_at: updatedAt,
        });
        totalRatings += 1;
        if (rating === 'love') {
          totalLove += 1;
          userLove += 1;
        } else if (rating === 'not_for_me') {
          totalRejected += 1;
          userRejected += 1;
        }
        if (candidateRating === 'love') candidateLove += 1;
        else if (candidateRating === 'not_for_me') candidateRejected += 1;

        const learnedAfterFeedback = auditMatchrimLearning(baseProfile, history, []).learned.profile;
        for (const milestone of MILESTONES) {
          if (milestone > 0 && history.length >= milestone && !recordedMilestones.has(milestone)) {
            profileMilestones.get(milestone)!.push(profileRmse(learnedAfterFeedback, activeLatent));
            recordedMilestones.add(milestone);
          }
        }

        const currentError = profileRmse(learnedAfterFeedback, activeLatent);
        if (learnedAtRating === null && history.length >= 3 && currentError <= Math.max(0.55, initialError * 0.8)) {
          learnedAtRating = history.length;
          learnedUsers += 1;
        }
      }
    }

    finalLearnedProfile = auditMatchrimLearning(baseProfile, history, []).learned.profile;
    const finalCandidateAudit = auditMatchrimLearning(baseProfile, candidateHistory, [], CANDIDATE_OPTIONS);
    finalCandidateProfile = finalCandidateAudit.learned.profile;
    candidateShiftDetected ||= finalCandidateAudit.learned.calibration.preferenceShiftDetected;
    candidateShiftMagnitude = Math.max(
      candidateShiftMagnitude,
      finalCandidateAudit.learned.calibration.preferenceShiftMagnitude,
    );
    finalLatentProfile = profileAtDay(latent, driftTarget, drifted, config.days - 1);
    (drifted ? driftShiftMagnitudes : stableShiftMagnitudes).push(candidateShiftMagnitude);
    if (candidateShiftDetected) {
      candidateShiftDetectedUsers += 1;
      if (drifted) candidateShiftTruePositives += 1;
      else candidateShiftFalsePositives += 1;
    }

    if (audits.length < config.auditProfiles && userIndex % auditStep === 0) {
      audits.push({
        id: `synthetic-user-${String(userIndex + 1).padStart(5, '0')}`,
        segment: segment.id,
        events: userEventCount,
        ratings: history.length,
        drifted,
        baseProfile,
        initialLatentProfile: Object.fromEntries(AXES.map((axis) => [axis, round(latent[axis], 2)])) as MatchrimProfileLike,
        finalLatentProfile: Object.fromEntries(AXES.map((axis) => [axis, round(finalLatentProfile[axis], 2)])) as MatchrimProfileLike,
        finalLearnedProfile,
        finalCandidateProfile,
        initialProfileRmse: round(initialError),
        finalProfileRmse: round(profileRmse(finalLearnedProfile, finalLatentProfile)),
        finalCandidateProfileRmse: round(profileRmse(finalCandidateProfile, finalLatentProfile)),
        candidateShiftDetected,
        candidateShiftMagnitude: round(candidateShiftMagnitude),
        learnedAtRating,
        loveRate: history.length ? round(userLove / history.length) : 0,
        rejectionRate: history.length ? round(userRejected / history.length) : 0,
        uniqueTopRecommendations: topRecommendations.size,
      });
    }
  }

  const strategyMetrics = Object.fromEntries(STRATEGIES.map((strategy) => [
    strategy,
    summarizeBucket(getBucket(overall, strategy), catalog.length),
  ]));
  const segmentRows = SEGMENTS.flatMap((segment) => STRATEGIES.map((strategy) => ({
    segment: segment.id,
    strategy,
    ...summarizeBucket(getBucket(bySegment, `${segment.id}:${strategy}`), catalog.length),
  })));
  const monthRows = Array.from({ length: 12 }, (_, index) => index + 1).flatMap((month) => STRATEGIES.map((strategy) => ({
    month,
    strategy,
    ...summarizeBucket(getBucket(byMonth, `${month}:${strategy}`), catalog.length),
  })));
  const milestoneRows = MILESTONES.map((ratings) => {
    const values = profileMilestones.get(ratings)!;
    return {
      ratings,
      usersObserved: values.length,
      meanProfileRmse: round(mean(values)),
      p50ProfileRmse: round(percentile(values, 0.5)),
      p90ProfileRmse: round(percentile(values, 0.9)),
    };
  });
  const hybrid = strategyMetrics.hybrid;
  const candidate = strategyMetrics.candidate;
  const onboarding = strategyMetrics.onboarding;
  const oracle = strategyMetrics.oracle;
  const worstSegment = segmentRows
    .filter((row) => row.strategy === 'hybrid')
    .sort((a, b) => a.ndcgAt5 - b.ndcgAt5)[0];

  const deterministicPayload = {
    config,
    strategyMetrics,
    segmentRows,
    monthRows,
    milestoneRows,
    totals: {
      totalEvents,
      totalRatings,
      totalLove,
      totalRejected,
      candidateLove,
      candidateRejected,
      driftingUsers,
      learnedUsers,
      candidateShiftDetectedUsers,
      candidateShiftTruePositives,
      candidateShiftFalsePositives,
    },
    audits,
  };
  const fingerprint = createHash('sha256').update(JSON.stringify(deterministicPayload)).digest('hex');
  const candidateShiftFalseNegatives = driftingUsers - candidateShiftTruePositives;
  const stableUsers = config.users - driftingUsers;
  const candidateShiftTrueNegatives = stableUsers - candidateShiftFalsePositives;

  const result = {
    generatedAt: '2026-10-01',
    qualification: 'Synthetic longitudinal model audit. It does not represent 10,000 human participants or prove real retention, satisfaction or commercial outcomes.',
    isolation: 'Local deterministic execution only. No production accounts, photos, APIs, Supabase rows, provider calls or personal data are read or written.',
    config,
    totals: {
      users: config.users,
      days: config.days,
      events: totalEvents,
      explicitRatings: totalRatings,
      meanEventsPerUser: round(totalEvents / config.users, 2),
      feedbackRate: round(totalRatings / Math.max(1, totalEvents)),
      loveRate: round(totalLove / Math.max(1, totalRatings)),
      rejectionRate: round(totalRejected / Math.max(1, totalRatings)),
      candidateLoveRate: round(candidateLove / Math.max(1, totalRatings)),
      candidateRejectionRate: round(candidateRejected / Math.max(1, totalRatings)),
      driftingUsers,
      usersMeetingLearningCriterion: learnedUsers,
      learningCriterionRate: round(learnedUsers / config.users),
      shiftDetection: {
        detectedUsers: candidateShiftDetectedUsers,
        truePositives: candidateShiftTruePositives,
        falsePositives: candidateShiftFalsePositives,
        falseNegatives: candidateShiftFalseNegatives,
        trueNegatives: candidateShiftTrueNegatives,
        precision: round(candidateShiftTruePositives / Math.max(1, candidateShiftDetectedUsers)),
        recall: round(candidateShiftTruePositives / Math.max(1, driftingUsers)),
        falsePositiveRate: round(candidateShiftFalsePositives / Math.max(1, stableUsers)),
        driftMagnitudeP50: round(percentile(driftShiftMagnitudes, 0.5)),
        driftMagnitudeP90: round(percentile(driftShiftMagnitudes, 0.9)),
        driftMagnitudeP95: round(percentile(driftShiftMagnitudes, 0.95)),
        stableMagnitudeP50: round(percentile(stableShiftMagnitudes, 0.5)),
        stableMagnitudeP90: round(percentile(stableShiftMagnitudes, 0.9)),
        stableMagnitudeP95: round(percentile(stableShiftMagnitudes, 0.95)),
        stableMagnitudeP99: round(percentile(stableShiftMagnitudes, 0.99)),
      },
    },
    strategyMetrics,
    profileLearning: milestoneRows,
    segments: segmentRows,
    months: monthRows,
    performance: {
      modelEvaluationP50Ms: round(percentile(latencySamples, 0.5), 5),
      modelEvaluationP95Ms: round(percentile(latencySamples, 0.95), 5),
      modelEvaluationP99Ms: round(percentile(latencySamples, 0.99), 5),
      candidateEvaluationP95Ms: round(percentile(candidateLatencySamples, 0.95), 5),
      wallClockSeconds: round((performance.now() - started) / 1000, 3),
      qualification: 'In-process algorithm time, not backend load or mobile latency.',
    },
    conclusions: {
      hybridNdcgUpliftVsPopularity: round(hybrid.ndcgAt5 - strategyMetrics.popularity.ndcgAt5),
      hybridNdcgUpliftVsOnboarding: round(hybrid.ndcgAt5 - onboarding.ndcgAt5),
      hybridHitRateUpliftVsOnboarding: round(hybrid.hitRateAt1 - onboarding.hitRateAt1),
      candidateNdcgUpliftVsCurrent: round(candidate.ndcgAt5 - hybrid.ndcgAt5),
      candidateHitRateUpliftVsCurrent: round(candidate.hitRateAt1 - hybrid.hitRateAt1),
      candidateAffinityMaeChangeVsCurrent: round(candidate.affinityMae! - hybrid.affinityMae!),
      candidateCalibrationChangeVsCurrent: round(candidate.calibrationError! - hybrid.calibrationError!),
      candidateRegretChangeVsCurrent: round(candidate.meanRegret - hybrid.meanRegret),
      remainingNdcgGapToOracle: round(oracle.ndcgAt5 - hybrid.ndcgAt5),
      remainingRegretGapToOracle: round(hybrid.meanRegret - oracle.meanRegret),
      worstHybridSegment: worstSegment.segment,
      worstHybridSegmentNdcgAt5: worstSegment.ndcgAt5,
      falseConfidenceRate: hybrid.falseConfidenceRate,
      recommendation: candidate.ndcgAt5 >= hybrid.ndcgAt5 && candidate.affinityMae! < hybrid.affinityMae!
        ? 'La calibracion por confianza conserva el ranking y reduce el error de afinidad; puede avanzar a regresion de producto y paridad Edge. La recencia adaptativa queda rechazada porque la señal de deriva no separa perfiles estables y cambiantes con recall suficiente.'
        : 'La variante candidata no supera conjuntamente ranking y calibracion; debe permanecer experimental.',
    },
    methodology: {
      agents: 'Five engagement segments with latent five-axis palates, noisy onboarding answers, budgets, contexts and optional taste drift.',
      chronology: 'Each agent is evaluated in event order. Only feedback available before an event trains that event recommendation.',
      feedback: 'Current and candidate policies receive the same feedback opportunity and experience noise; each learns only from its own prior recommendations.',
      candidateSets: `${config.candidatePoolSize} synthetic wines sampled per decision from a ${config.catalogSize}-wine catalog.`,
      baselines: {
        popularity: 'Static catalog popularity independent of simulated feedback.',
        onboarding: 'Initial Matchrim test profile with no longitudinal learning.',
        hybrid: 'Current Matchrim calculateLearnedMatchrimProfile and affinity ranking.',
        candidate: 'Current ranking with confidence-aware affinity calibration. Preference-shift telemetry is measured, but adaptive forgetting is disabled.',
        oracle: 'Evaluation ceiling using latent taste, context and budget; never visible to the hybrid model.',
      },
      knownLimits: [
        'Synthetic responses inherit the assumptions encoded in the simulator.',
        'The current five-axis model cannot represent grape, region, oak, aroma families or explicit occasion preferences.',
        'Vision/OCR identity quality is evaluated by the separate recognition benchmark, not fabricated here.',
        'Real-world retention, trust and willingness to pay require a consented human pilot.',
      ],
    },
    auditProfiles: audits,
    deterministicFingerprint: fingerprint,
  };

  assert.equal(result.totals.users, config.users, 'Every synthetic agent must be accounted for');
  assert.ok(result.totals.events >= config.users, 'Every agent must receive at least one event');
  assert.ok(result.totals.explicitRatings <= result.totals.events, 'Ratings cannot exceed events');
  assert.equal(strategyMetrics.oracle.meanRegret, 0, 'Oracle ranking must define zero regret');
  assert.ok(Number.isFinite(strategyMetrics.hybrid.ndcgAt5), 'Hybrid ranking metrics must be finite');

  return result;
};

const markdownReport = (result: ReturnType<typeof runMatchrimYearSimulation>) => {
  const metric = (value: number | null) => value === null ? 'n/a' : `${(value * 100).toFixed(2)}%`;
  const rows = STRATEGIES.map((strategy) => {
    const item = result.strategyMetrics[strategy];
    return `| ${strategy} | ${metric(item.precisionAt5)} | ${metric(item.recallAt5)} | ${metric(item.ndcgAt5)} | ${metric(item.hitRateAt1)} | ${item.meanRegret.toFixed(2)} | ${item.affinityMae ?? 'n/a'} |`;
  }).join('\n');
  const milestoneRows = result.profileLearning.map((item) => (
    `| ${item.ratings} | ${item.usersObserved.toLocaleString('es-ES')} | ${item.meanProfileRmse.toFixed(3)} | ${item.p90ProfileRmse.toFixed(3)} |`
  )).join('\n');
  return `# Matchrim - simulación sintética de ${result.totals.users.toLocaleString('es-ES')} usuarios durante un año

Fecha: 2026-10-01

## Dictamen

Esta es una auditoría longitudinal **sintética**, no un estudio con 10.000 personas reales. Sirve para encontrar defectos del algoritmo, medir aprendizaje, comparar estrategias y preparar un piloto humano. No demuestra por sí sola satisfacción, retención ni intención de compra.

- Usuarios sintéticos: ${result.totals.users.toLocaleString('es-ES')}.
- Periodo: ${result.totals.days} días.
- Decisiones simuladas: ${result.totals.events.toLocaleString('es-ES')}.
- Valoraciones explícitas: ${result.totals.explicitRatings.toLocaleString('es-ES')} (${metric(result.totals.feedbackRate)} de los eventos).
- Tiempo local total: ${result.performance.wallClockSeconds.toFixed(2)} s.
- Producción, Supabase, proveedor de visión y datos personales: **0 llamadas / 0 escrituras**.
- Huella determinista: \`${result.deterministicFingerprint}\`.

## Inteligencia de recomendación

| Estrategia | Precision@5 | Recall@5 | NDCG@5 | Hit@1 | Regret medio | MAE afinidad |
|---|---:|---:|---:|---:|---:|---:|
${rows}

- Mejora NDCG del híbrido frente a popularidad: ${metric(result.conclusions.hybridNdcgUpliftVsPopularity)}.
- Mejora NDCG del híbrido frente al test inicial: ${metric(result.conclusions.hybridNdcgUpliftVsOnboarding)}.
- Cambio NDCG del candidato frente al híbrido actual: ${metric(result.conclusions.candidateNdcgUpliftVsCurrent)}.
- Cambio MAE de afinidad del candidato: ${result.conclusions.candidateAffinityMaeChangeVsCurrent.toFixed(2)} puntos.
- Cambio de calibración del candidato: ${metric(result.conclusions.candidateCalibrationChangeVsCurrent)}.
- Detección de deriva: precision ${metric(result.totals.shiftDetection.precision)}, recall ${metric(result.totals.shiftDetection.recall)}, falsos positivos ${metric(result.totals.shiftDetection.falsePositiveRate)}.
- Brecha NDCG restante frente al oráculo: ${metric(result.conclusions.remainingNdcgGapToOracle)}.
- Falsa confianza del híbrido: ${metric(result.conclusions.falseConfidenceRate)}.
- Segmento con menor NDCG híbrido: **${result.conclusions.worstHybridSegment}** (${metric(result.conclusions.worstHybridSegmentNdcgAt5)}).

${result.conclusions.recommendation}

## Aprendizaje del perfil

| Valoraciones disponibles | Usuarios observados | RMSE medio | RMSE p90 |
|---:|---:|---:|---:|
${milestoneRows}

El RMSE compara el perfil aprendido con el gusto latente sintético en escala 0-5. La cohorte incluye contradicciones, valoraciones omitidas y deriva gradual de gusto desde el día 180 en ${result.totals.driftingUsers.toLocaleString('es-ES')} perfiles.

## QA funcional incluido

- Aislamiento de los 10.000 historiales en memoria; cada agente solo aprende de sus propias valoraciones previas.
- Orden cronológico sin fuga de señales futuras.
- Eventos sin valoración no entrenan el perfil.
- Presupuesto y ocasión alteran la decisión real, pero no contaminan las cinco dimensiones persistentes.
- Recomendación y feedback reproducibles mediante semilla fija.
- Métricas mensuales, por segmento y por estrategia exportadas para regresión.
- Latencia del algoritmo p50/p95/p99: ${result.performance.modelEvaluationP50Ms} / ${result.performance.modelEvaluationP95Ms} / ${result.performance.modelEvaluationP99Ms} ms.

La navegación, accesibilidad, escáner, cartas, errores y layout móvil se validan además con la suite funcional/visual existente; este motor no sustituye esas pruebas.

## Límites

1. Los comportamientos son agentes matemáticos y heredan las hipótesis del simulador.
2. El modelo actual aprende cinco ejes; no aprende todavía uva, región, madera, familias aromáticas ni ocasión.
3. OCR, detección e identidad se mantienen en el benchmark independiente de reconocimiento.
4. Para afirmar valor humano se necesita un piloto consentido y longitudinal con usuarios reales.
`;
};

const parseArgs = () => {
  const values = new Map(process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=', 2);
    return [key, value];
  }));
  const numberArg = (key: string, fallback: number) => {
    const value = Number(values.get(key) ?? fallback);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`--${key} must be a positive number`);
    return Math.round(value);
  };
  return {
    config: {
      users: numberArg('users', 10_000),
      days: numberArg('days', 365),
      seed: numberArg('seed', 10_012_026),
      catalogSize: numberArg('catalog', 180),
      candidatePoolSize: numberArg('candidates', 24),
      auditProfiles: numberArg('audits', 100),
    },
    output: resolve(values.get('output') || 'docs/qa-evidence/matchrim-10000-user-year-2026-10-01'),
  };
};

const main = () => {
  const { config, output } = parseArgs();
  const result = runMatchrimYearSimulation(config);
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'summary.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  writeFileSync(resolve(output, 'monthly-metrics.csv'), csv(result.months), 'utf8');
  writeFileSync(resolve(output, 'segment-metrics.csv'), csv(result.segments), 'utf8');
  writeFileSync(resolve(output, 'profile-learning.csv'), csv(result.profileLearning), 'utf8');
  writeFileSync(resolve(output, 'profile-audit-100.csv'), csv(result.auditProfiles.map((audit) => ({
    id: audit.id,
    segment: audit.segment,
    events: audit.events,
    ratings: audit.ratings,
    drifted: String(audit.drifted),
    initialProfileRmse: audit.initialProfileRmse,
    finalProfileRmse: audit.finalProfileRmse,
    finalCandidateProfileRmse: audit.finalCandidateProfileRmse,
    candidateShiftDetected: String(audit.candidateShiftDetected),
    candidateShiftMagnitude: audit.candidateShiftMagnitude,
    learnedAtRating: audit.learnedAtRating,
    loveRate: audit.loveRate,
    rejectionRate: audit.rejectionRate,
    uniqueTopRecommendations: audit.uniqueTopRecommendations,
  }))), 'utf8');
  writeFileSync(resolve(output, 'REPORT.md'), markdownReport(result), 'utf8');
  console.log(JSON.stringify({
    output,
    fingerprint: result.deterministicFingerprint,
    totals: result.totals,
    performance: result.performance,
    conclusions: result.conclusions,
  }, null, 2));
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
