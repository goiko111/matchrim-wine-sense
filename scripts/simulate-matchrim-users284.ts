// Offline, deterministic simulation of 100 synthetic Matchrim users. No account, network, model,
// catalogue read or write. Every person and every arm-B sensory value is synthetic; the 200 labels,
// their on-device OCR and the 19 retained catalogue details are real local evidence.
// Run: npx tsx scripts/simulate-matchrim-users284.ts [--out=qa-fixtures/users284]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';
import { cellarTrainingRows, makeCellarCatalogEvidence } from '../src/utils/bodegaAffinity';
import { selectUnseenWineRecommendations } from '../src/utils/matchrimRecommendations';
import { canAdmitNativeCatalogLookup97 } from '../src/utils/nativeCatalogAdmission97';
import { isNonWineIdentity } from '../src/utils/wineCategory';
import { parseMasterDetail188 } from '../src/utils/nativeMasterContract188';
import { describeMasterSensory195 } from '../src/utils/nativeMasterReference195';

const out = process.argv.find(arg => arg.startsWith('--out='))?.slice(6) ?? 'qa-fixtures/users284';
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const require = createRequire(import.meta.url), ts = require('typescript');
const quizSource = fs.readFileSync('src/data/quizData.ts', 'utf8'), quizModule = { exports: {} as Record<string, unknown> };
vm.runInNewContext(ts.transpileModule(quizSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
  { module: quizModule, exports: quizModule.exports, require: (id: string) => { assert(id.startsWith('@/assets/quiz/') && id.endsWith('.jpg')); return { __esModule: true, default: id }; } },
  { timeout: 1000 });
type Axis = 'potente' | 'acidez' | 'dulce' | 'tanico' | 'afrutado';
type Profile = Record<Axis, number>;
const axes: Axis[] = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'];
const { questions, calculateProfile } = quizModule.exports as {
  questions: { id: number; text: string; scores: Profile }[]; calculateProfile: (answers: Record<number, string>) => Profile };
assert.equal(questions.length, 20);

const seedArg = process.argv.find(arg => arg.startsWith('--seed='))?.slice(7);
let seed = seedArg ? Number(seedArg) : 0x284c0de;
const random = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const between = (low: number, high: number) => low + random() * (high - low);
const integer = (low: number, high: number) => Math.floor(between(low, high + 1));
const gauss = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
const clamp = (value: number, low = 0, high = 5) => Math.max(low, Math.min(high, value));
const rms = (a: Profile, b: Profile) => Math.sqrt(axes.reduce((sum, axis) => sum + (a[axis] - b[axis]) ** 2, 0) / axes.length);
const round = (value: number, digits = 3) => Number(value.toFixed(digits));
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN;
const spearman = (left: number[], right: number[]) => {
  const ranks = (values: number[]) => { const order = values.map((value, index) => [value, index]).sort((a, b) => a[0] - b[0]);
    const result = new Array(values.length); let i = 0;
    while (i < order.length) { let j = i; while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
      for (let k = i; k <= j; k++) result[order[k][1]] = (i + j) / 2; i = j + 1; }
    return result as number[]; };
  const a = ranks(left), b = ranks(right), ma = mean(a), mb = mean(b);
  const cov = a.reduce((sum, value, index) => sum + (value - ma) * (b[index] - mb), 0);
  const den = Math.sqrt(a.reduce((sum, value) => sum + (value - ma) ** 2, 0) * b.reduce((sum, value) => sum + (value - mb) ** 2, 0));
  return den ? cov / den : 0; };

// ---- Real local evidence: 200 labels, their on-device OCR, 19 retained details ----
const ocrRoot = 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2';
const comparison = JSON.parse(fs.readFileSync(ocrRoot + '/COMPARISON.json', 'utf8'));
const first20 = JSON.parse(fs.readFileSync('qa-fixtures/first20-283/RESULT.json', 'utf8')).matrix
  .filter((row: { variant?: string; file?: string }) => !row.variant && row.file);
const detailByImage = new Map<string, ReturnType<typeof parseMasterDetail188>>();
for (const row of first20) {
  const body = JSON.parse(fs.readFileSync(row.file, 'utf8'));
  detailByImage.set(row.imageId, parseMasterDetail188(body, body.mantalakWineId));
}
type Label = { imageId: string; sourceId: string; name: string; winery: string; ocr: string[]; nonWine: boolean; admitted: boolean;
  retained: boolean; anyAxisUsableForAffinity: boolean; type: string | null };
const labels: Label[] = comparison.rows.map((row: { imageId: string; sourceId: string; name: { reference: string }; winery: { reference: string } }) => {
  const raw = JSON.parse(fs.readFileSync(`${ocrRoot}/raw/${row.imageId}.json`, 'utf8'));
  const ocr = [...raw.lines].sort((a, b) => a.index - b.index).map((line: { text: string }) => line.text);
  const detail = detailByImage.get(row.imageId) ?? null;
  const sensory = detail ? describeMasterSensory195(detail, null) : null;
  return { imageId: row.imageId, sourceId: row.sourceId, name: row.name.reference, winery: row.winery.reference, ocr,
    nonWine: isNonWineIdentity(row.name.reference, detail?.type ?? null),
    // Perfect identity from an assumed recogniser; only the real OCR decides whether the app may look it up.
    admitted: canAdmitNativeCatalogLookup97({ name: row.name.reference, producer: row.winery.reference, vintage: null,
      region: null, country: null, confidence: 0.9, evidence: ocr }),
    retained: Boolean(detail),
    anyAxisUsableForAffinity: Boolean(sensory && Object.values(sensory.axes ?? {}).some(axis => (axis as { usableForAffinity?: boolean }).usableForAffinity)),
    type: detail?.type ?? null };
});
assert.equal(labels.length, 200);

// ---- Arm B catalogue: synthetic 0-5 attributes by style; known retained types steer the style ----
type Style = { key: string; ranges: Record<'power' | 'acidity' | 'sweetness' | 'tannin' | 'fruity', [number, number]> };
const styles: Style[] = [
  { key: 'blanco-fresco', ranges: { power: [1, 2], acidity: [3, 5], sweetness: [0, 1], tannin: [0, 0], fruity: [2, 4] } },
  { key: 'blanco-crianza', ranges: { power: [2, 4], acidity: [2, 4], sweetness: [0, 1], tannin: [0, 1], fruity: [2, 3] } },
  { key: 'espumoso', ranges: { power: [1, 2], acidity: [4, 5], sweetness: [0, 2], tannin: [0, 0], fruity: [2, 3] } },
  { key: 'dulce', ranges: { power: [2, 4], acidity: [2, 4], sweetness: [4, 5], tannin: [0, 1], fruity: [3, 5] } },
  { key: 'rosado', ranges: { power: [1, 3], acidity: [3, 4], sweetness: [0, 2], tannin: [0, 1], fruity: [3, 5] } },
  { key: 'tinto-ligero', ranges: { power: [2, 3], acidity: [3, 4], sweetness: [0, 1], tannin: [1, 3], fruity: [3, 4] } },
  { key: 'tinto-potente', ranges: { power: [4, 5], acidity: [2, 4], sweetness: [0, 1], tannin: [3, 5], fruity: [2, 4] } },
];
const styleFor = (type: string | null) => type === 'espumoso' ? styles[2] : type === 'blanco' ? pick(styles.slice(0, 2))
  : type === 'tinto' ? pick(styles.slice(5)) : type === 'rosado' ? styles[4] : type === 'dulce' || type === 'fortificado' ? styles[3] : pick(styles);
type Wine = Label & { style: string; attributes: { scale: 'winerim-0-5'; power: number; acidity: number; sweetness: number; tannin: number; fruity: number } };
const wines: Wine[] = labels.filter(label => !label.nonWine).map(label => {
  const style = styleFor(label.type), value = (key: keyof Style['ranges']) => integer(...style.ranges[key]);
  return { ...label, style: style.key, attributes: { scale: 'winerim-0-5' as const, power: value('power'), acidity: value('acidity'),
    sweetness: value('sweetness'), tannin: value('tannin'), fruity: value('fruity') } };
});
const asProfile = (attributes: Wine['attributes']): Profile => ({ potente: attributes.power, acidez: attributes.acidity,
  dulce: attributes.sweetness, tanico: attributes.tannin, afrutado: attributes.fruity });
const appAffinity = (profile: Profile, wine: Wine) => {
  const score = calculateLocalMatchrimAffinity(profile, wine.attributes, 'scan-local-rms-0to5-v3' as never);
  assert(typeof score === 'number', 'Complete synthetic 0-5 attributes must score'); return score; };

// ---- 100 synthetic users with a hidden true taste of varied shape ----
type Archetype = { key: string; center: Profile; weights?: Partial<Profile>; aversion?: { axis: Axis; above: number } };
const archetypes: Archetype[] = [
  { key: 'tintos-potentes', center: { potente: 4.5, acidez: 3, dulce: 0.5, tanico: 4, afrutado: 3 } },
  { key: 'blancos-frescos', center: { potente: 1.5, acidez: 4.5, dulce: 0.5, tanico: 0.3, afrutado: 3 } },
  { key: 'golosos', center: { potente: 2.5, acidez: 2.5, dulce: 4, tanico: 0.5, afrutado: 4.5 } },
  { key: 'equilibrados', center: { potente: 3, acidez: 3, dulce: 1, tanico: 2.5, afrutado: 3 } },
  { key: 'burbujas', center: { potente: 1.5, acidez: 4.5, dulce: 1, tanico: 0, afrutado: 2.5 } },
  { key: 'evita-tanino', center: { potente: 2.5, acidez: 3.5, dulce: 1, tanico: 1, afrutado: 3.5 }, aversion: { axis: 'tanico', above: 2 } },
  { key: 'solo-cuerpo-importa', center: { potente: 4.5, acidez: 2.5, dulce: 1, tanico: 3, afrutado: 2.5 }, weights: { potente: 0.6, acidez: 0.1, dulce: 0.1, tanico: 0.1, afrutado: 0.1 } },
  { key: 'curioso-aleatorio', center: { potente: 2.5, acidez: 2.5, dulce: 2.5, tanico: 2.5, afrutado: 2.5 } },
];
type User = { id: string; archetype: string; truth: Profile; weights: Profile; aversion?: Archetype['aversion']; noise: number;
  loveCut: number; okCut: number; quizNoise: number; scansPerWeek: number };
const users: User[] = Array.from({ length: 100 }, (_, index) => {
  const archetype = archetypes[index % archetypes.length];
  const truth = Object.fromEntries(axes.map(axis => [axis, archetype.key === 'curioso-aleatorio' ? between(0, 5)
    : clamp(archetype.center[axis] + gauss() * 0.6)])) as Profile;
  const raw = Object.fromEntries(axes.map(axis => [axis, archetype.weights?.[axis] ?? between(0.12, 0.28)])) as Profile;
  const total = axes.reduce((sum, axis) => sum + raw[axis], 0);
  return { id: `synthetic-user-${String(index + 1).padStart(3, '0')}`, archetype: archetype.key, truth,
    weights: Object.fromEntries(axes.map(axis => [axis, raw[axis] / total])) as Profile, aversion: archetype.aversion,
    noise: between(3, 9), loveCut: between(76, 84), okCut: between(60, 68), quizNoise: between(0.08, 0.2), scansPerWeek: integer(2, 4) };
});
// True liking deliberately differs from the app formula: per-user axis weights, a hard aversion and taste noise.
const trueLiking = (user: User, wine: Wine, noisy = true) => {
  const x = asProfile(wine.attributes);
  const distance = Math.sqrt(axes.reduce((sum, axis) => sum + user.weights[axis] * 5 * (x[axis] - user.truth[axis]) ** 2, 0) / 5);
  const aversion = user.aversion && x[user.aversion.axis] > user.aversion.above ? 22 : 0;
  return 95 - 17 * distance - aversion + (noisy ? gauss() * user.noise : 0); };
const rateFor = (user: User, liking: number) => liking >= user.loveCut ? 'love' : liking >= user.okCut ? 'ok' : 'not_for_me';
const answerQuiz = (user: User) => Object.fromEntries(questions.map(question => {
  const weight = axes.reduce((sum, axis) => sum + question.scores[axis], 0);
  const appeal = axes.reduce((sum, axis) => sum + question.scores[axis] * user.truth[axis] / 5, 0) / weight + gauss() * user.quizNoise;
  return [question.id, appeal > 0.58 ? 'si' : appeal > 0.42 ? 'indiferente' : 'no'];
}));

// Candidate learning rules for comparison only (NOT app code). Same structure as the app learner
// (recency half-life 120 days, blend 0.25+0.05n capped at 0.9); only the rating weights differ.
type Rated = { wine: Wine; rating: string; at: number };
const candidateRule = (base: Profile, rated: Rated[], rule: 'surprise' | 'attraction') => {
  if (!rated.length) return { ...base };
  const newest = Math.max(...rated.map(item => item.at)), blend = Math.min(0.9, 0.25 + rated.length * 0.05);
  const deltas = Object.fromEntries(axes.map(axis => [axis, 0])) as Profile;
  for (const item of rated) {
    const recency = 0.2 + 0.8 * Math.pow(0.5, (newest - item.at) / 86400000 / 120);
    // surprise: a rejection only teaches when the starting profile expected the wine to please.
    const surprise = clamp((appAffinity(base, item.wine) - 65) / 25, 0, 1);
    const weight = item.rating === 'love' ? 1 : item.rating === 'ok' ? 0.25 : rule === 'attraction' ? 0 : -0.8 * surprise;
    for (const axis of axes) deltas[axis] += (asProfile(item.wine.attributes)[axis] - base[axis]) * weight * recency;
  }
  return Object.fromEntries(axes.map(axis => [axis, clamp(Math.round((base[axis] + deltas[axis] / rated.length * blend) * 10) / 10)])) as Profile;
};

// ---- Twelve weeks: scan, save, rate, learn; measure against the hidden truth ----
const weeks = 12, checkpoints = [0, 1, 2, 4, 8, 12], start = Date.parse('2026-11-02T10:00:00Z');
type Point = { week: number; ratings: number; trainingRows: number; profileError: number; rankCorrelation: number;
  top3LoveRate: number; quizTop3LoveRate: number; randomTop3LoveRate: number; oracleTop3LoveRate: number; meanAbsGap: number;
  surpriseProfileError: number; surpriseTop3LoveRate: number; attractionProfileError: number; attractionTop3LoveRate: number };
const perUser = users.map(user => {
  const quiz = calculateProfile(answerQuiz(user));
  const cellar: Record<string, unknown>[] = [], seen = new Set<string>();
  const rated: Rated[] = [];
  let surprise: Profile = { ...quiz }, attraction: Profile = { ...quiz };
  let profile: Profile = { ...quiz }, ratings = 0, trainingRows = 0, armA = { scanned: 0, nonWine: 0, admitted: 0, retainedReference: 0, affinityShown: 0, trainingRows: 0 };
  const trajectory: Point[] = [];
  const measure = (week: number) => {
    const unseen = wines.filter(wine => !seen.has(wine.sourceId));
    const expected = unseen.map(wine => trueLiking(user, wine, false));
    const loved = new Set(unseen.filter((_, index) => expected[index] >= user.loveCut).map(wine => wine.sourceId));
    const top3 = (scorer: (wine: Wine) => number) => selectUnseenWineRecommendations([...unseen].sort((a, b) => scorer(b) - scorer(a))
      .map(wine => ({ ...wine, producer: wine.winery })), cellar.map(row => ({ name: row.name, producer: row.producer })), 3).recommendations;
    const loveRate = (picked: Wine[]) => picked.filter(wine => loved.has(wine.sourceId)).length / 3;
    const scores = unseen.map(wine => appAffinity(profile, wine));
    trajectory.push({ week, ratings, trainingRows, profileError: round(rms(profile, user.truth)),
      rankCorrelation: round(spearman(scores, expected)), top3LoveRate: round(loveRate(top3(wine => appAffinity(profile, wine)))),
      quizTop3LoveRate: round(loveRate(top3(wine => appAffinity(quiz, wine)))), randomTop3LoveRate: round(loved.size / unseen.length),
      oracleTop3LoveRate: round(loveRate(top3(wine => trueLiking(user, wine, false)))),
      meanAbsGap: round(mean(scores.map((score, index) => Math.abs(score - expected[index]))), 2),
      surpriseProfileError: round(rms(surprise, user.truth)), surpriseTop3LoveRate: round(loveRate(top3(wine => appAffinity(surprise, wine)))),
      attractionProfileError: round(rms(attraction, user.truth)), attractionTop3LoveRate: round(loveRate(top3(wine => appAffinity(attraction, wine)))) });
  };
  measure(0);
  for (let week = 1; week <= weeks; week++) {
    for (let scan = 0; scan < user.scansPerWeek; scan++) {
      const label = pick(labels.filter(item => !seen.has(item.sourceId)));
      seen.add(label.sourceId); armA.scanned++;
      if (label.nonWine) { armA.nonWine++; continue; }
      if (label.admitted) armA.admitted++;
      if (label.retained) { armA.retainedReference++; if (label.anyAxisUsableForAffinity) armA.affinityShown++; }
      const wine = wines.find(item => item.sourceId === label.sourceId)!;
      if (random() > 0.6) continue; // Not every scan becomes a cellar bottle.
      const ratedAt = new Date(start + ((week - 1) * 7 + between(0, 6)) * 86400000).toISOString();
      const row = { id: `${user.id}-${wine.sourceId}`, name: wine.name, producer: wine.winery, vintage: null, region: null, country: null,
        sensory_attributes: wine.attributes, rating: rateFor(user, trueLiking(user, wine)), use_for_profile_training: true,
        place_details: { matchrim_rating_at: ratedAt } as Record<string, unknown> };
      row.place_details.bodega_sensory_evidence = makeCellarCatalogEvidence(row as never, `mantalak-master:${wine.sourceId}`, wine.attributes as never);
      assert(row.place_details.bodega_sensory_evidence, 'Synthetic cellar row must carry catalogue evidence');
      cellar.push(row); ratings++; rated.push({ wine, rating: row.rating, at: Date.parse(ratedAt) });
    }
    const rows = cellarTrainingRows(cellar as never, true); trainingRows = rows.length;
    profile = { ...calculateLearnedMatchrimProfile(quiz, rows, { evidenceStrength: 'native-v2' }).profile } as Profile;
    surprise = candidateRule(quiz, rated, 'surprise'); attraction = candidateRule(quiz, rated, 'attraction');
    if (checkpoints.includes(week)) measure(week);
  }
  return { user: { id: user.id, archetype: user.archetype, truth: Object.fromEntries(axes.map(axis => [axis, round(user.truth[axis], 2)])),
    aversion: user.aversion ?? null }, quiz, finalProfile: profile, quizError: round(rms(quiz, user.truth)), armA, trajectory };
});

// ---- Aggregate ----
const at = (week: number, key: keyof Point) => mean(perUser.map(entry => entry.trajectory.find(point => point.week === week)![key] as number));
const byArchetype = Object.fromEntries(archetypes.map(archetype => {
  const group = perUser.filter(entry => entry.user.archetype === archetype.key);
  const point = (week: number, key: keyof Point) => round(mean(group.map(entry => entry.trajectory.find(item => item.week === week)![key] as number)));
  return [archetype.key, { users: group.length, quizError: round(mean(group.map(entry => entry.quizError))),
    profileErrorWeek0: point(0, 'profileError'), profileErrorWeek12: point(12, 'profileError'),
    top3LoveWeek0: point(0, 'top3LoveRate'), top3LoveWeek12: point(12, 'top3LoveRate'), randomTop3Love: point(12, 'randomTop3LoveRate'),
    rankCorrelationWeek0: point(0, 'rankCorrelation'), rankCorrelationWeek12: point(12, 'rankCorrelation') }];
}));
const improved = perUser.filter(entry => entry.trajectory.at(-1)!.profileError < entry.trajectory[0].profileError - 0.05).length;
const worsened = perUser.filter(entry => entry.trajectory.at(-1)!.profileError > entry.trajectory[0].profileError + 0.05).length;
const armA = perUser.reduce((sum, entry) => { for (const key of Object.keys(sum) as (keyof typeof sum)[]) sum[key] += entry.armA[key]; return sum; },
  { scanned: 0, nonWine: 0, admitted: 0, retainedReference: 0, affinityShown: 0, trainingRows: 0 });
const result = {
  scope: 'Offline deterministic simulation. Real: 200 label images, their Apple Vision OCR, 19 retained catalogue details and the app functions called. Synthetic: users, quiz answers, ratings and every arm-B sensory value. No account, network, model, catalogue read or write; not a taste-accuracy claim.',
  seed: seedArg ?? '0x284c0de', inputs: { comparisonSHA256: sha(fs.readFileSync(ocrRoot + '/COMPARISON.json')), first20SHA256: sha(fs.readFileSync('qa-fixtures/first20-283/RESULT.json')),
    quizDataSHA256: sha(quizSource) },
  appFunctions: ['calculateProfile', 'canAdmitNativeCatalogLookup97', 'isNonWineIdentity', 'describeMasterSensory195', 'calculateLocalMatchrimAffinity(scan-local-rms-0to5-v3)',
    'makeCellarCatalogEvidence', 'cellarTrainingRows(strict)', 'calculateLearnedMatchrimProfile(native-v2)', 'selectUnseenWineRecommendations'],
  labels: { total: labels.length, nonWine: labels.filter(label => label.nonWine).length, ocrNonEmpty: labels.filter(label => label.ocr.length > 0).length,
    lookupAdmittedWithPerfectIdentity: labels.filter(label => label.admitted).length, retainedDetails: labels.filter(label => label.retained).length,
    retainedWithAnyAxisUsableForAffinity: labels.filter(label => label.anyAxisUsableForAffinity).length },
  armA_today: { ...armA, note: 'Per scan with the real catalogue path: references never carry usable sensory axes, so no affinity is shown and ratings never train.' },
  armB_engineWithCompleteData: {
    users: users.length, weeks, wines: wines.length, meanRatingsPerUser: round(mean(perUser.map(entry => entry.trajectory.at(-1)!.ratings)), 1),
    quizProfileError: round(mean(perUser.map(entry => entry.quizError))),
    profileError: Object.fromEntries(checkpoints.map(week => [`week${week}`, round(at(week, 'profileError'))])),
    rankCorrelation: Object.fromEntries(checkpoints.map(week => [`week${week}`, round(at(week, 'rankCorrelation'))])),
    top3LoveRate: Object.fromEntries(checkpoints.map(week => [`week${week}`, round(at(week, 'top3LoveRate'))])),
    quizOnlyTop3LoveRateWeek12: round(at(12, 'quizTop3LoveRate')), randomTop3LoveRateWeek12: round(at(12, 'randomTop3LoveRate')),
    oracleTop3LoveRateWeek12: round(at(12, 'oracleTop3LoveRate')), meanAbsScoreGap: Object.fromEntries(checkpoints.map(week => [`week${week}`, round(at(week, 'meanAbsGap'), 1)])),
    usersProfileImproved: improved, usersProfileWorsened: worsened, byArchetype,
    candidateRulesNotAppCode: Object.fromEntries((['surprise', 'attraction'] as const).map(rule => [rule, {
      profileError: Object.fromEntries(checkpoints.map(week => [`week${week}`, round(at(week, `${rule}ProfileError` as keyof Point))])),
      top3LoveRate: Object.fromEntries(checkpoints.map(week => [`week${week}`, round(at(week, `${rule}Top3LoveRate` as keyof Point))])),
      usersImproved: perUser.filter(entry => entry.trajectory.at(-1)![`${rule}ProfileError`] < entry.trajectory[0].profileError - 0.05).length,
      usersWorsened: perUser.filter(entry => entry.trajectory.at(-1)![`${rule}ProfileError`] > entry.trajectory[0].profileError + 0.05).length }])) },
};
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/RESULT.json', JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(out + '/USERS.json', JSON.stringify(perUser, null, 1) + '\n');
console.log(JSON.stringify({ labels: result.labels, armA_today: result.armA_today, armB: { ...result.armB_engineWithCompleteData, byArchetype: undefined } }, null, 1));
