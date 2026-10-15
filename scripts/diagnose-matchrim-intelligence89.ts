import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';
import { cellarTrainingRows } from '../src/utils/bodegaAffinity';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import { historicalArchetypes89, historicalCatalog89, item89 } from './fixtures-matchrim-intelligence89';

const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const senses = ['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado'] as const;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const vector = (values: readonly number[]) => Object.fromEntries(axes.map((key, i) => [key, values[i]])) as Record<typeof axes[number], number>;
function utility(archetype: string, target: number[], values: readonly number[]) {
  const weights = [1, 1, 1, 1, 1];
  if (archetype === 'frutal') weights[4] = 2;
  if (['atlantico', 'espumoso'].includes(archetype)) weights[1] = 2;
  if (archetype === 'dulce') weights[2] = 2;
  if (archetype === 'estructurado') weights[3] = 2;
  const loss = values.reduce((sum, v, i) => sum + weights[i] * (v - target[i]) ** 2, 0) / weights.reduce((a, b) => a + b, 0);
  const penalty = (target[2] <= 1 ? Math.max(0, values[2] - 1) ** 2 * 2 : 0)
    + (target[3] <= 1 ? Math.max(0, values[3] - 2) ** 2 : 0);
  return Math.min(100, Math.max(0, 100 - 6 * loss - penalty));
}
export function diagnose89() {
  const catalog = historicalCatalog89.map(([id, values], i) => ({ id, values,
    sensory: Object.fromEntries(senses.map((key, j) => [key, values[j]])), index: i }));
  const personas = historicalArchetypes89.flatMap(([archetype, values]) => Array.from({ length: 5 }, (_, variant) => {
    const target: number[] = [...values];
    if (variant) target[variant - 1] = target[variant - 1] === 5 ? 4 : target[variant - 1] + 1;
    const base = vector(target);
    const oracle = new Map<string, number>(catalog.map(w => [w.id, utility(archetype, target, w.values)]));
    const ordered = [...catalog].sort((a, b) => oracle.get(b.id)! - oracle.get(a.id)! || a.id.localeCompare(b.id));
    const picks = [ordered[0], ordered[3], ordered[7]];
    const rows = picks.map((w, index) => {
      const item = item89(w.index, w.sensory as Record<typeof senses[number], number>);
      return { ...item.wine, id: 'historical-' + index, catalogId: w.id,
        rating: (['love', 'ok', 'not_for_me'] as const)[index], use_for_profile_training: true,
        place_details: { ...item.wine.place_details, matchrim_rating_at: `2026-10-${10 + index}T12:00:00.000Z` } };
    });
    const rank = (scored: Array<{ id: string; score: number }>) => [...scored].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const metrics = (ranked: Array<{ id: string; score: number }>, subset = catalog) => {
      const best = Math.max(...subset.map(w => oracle.get(w.id)!));
      const dcg = (ids: string[]) => ids.slice(0, 3).reduce((sum, id, i) => sum + oracle.get(id)! / Math.log2(i + 2), 0);
      const ideal = [...subset].sort((a, b) => oracle.get(b.id)! - oracle.get(a.id)!);
      return { top1: oracle.get(ranked[0].id) === best,
        regret: best - oracle.get(ranked[0].id)!, ndcg3: dcg(ranked.map(w => w.id)) / dcg(ideal.map(w => w.id)) };
    };
    const before = rank(catalog.map(w => ({ id: w.id, score: calculateLocalMatchrimAffinity(base, w.sensory)! })));
    const mixed = (mode: 'all' | 'without_rejections') => {
      const folds = catalog.map(w => {
        const training = rows.filter(r => r.catalogId !== w.id && (mode === 'all' || r.rating !== 'not_for_me'));
        const learned = calculateLearnedMatchrimProfile(base, cellarTrainingRows(training, true));
        return { id: w.id, score: calculateLocalMatchrimAffinity(learned.profile, w.sensory)!,
          profile: learned.profile, samples: learned.samples, training_ids: training.map(r => r.catalogId) };
      });
      return { ...metrics(rank(folds)), distinct_profiles: new Set(folds.map(f => JSON.stringify(f.profile))).size,
        leakage: folds.some(f => f.training_ids.includes(f.id)), folds };
    };
    const original = mixed('all');
    const withoutRejections = mixed('without_rejections');
    const unseen = catalog.filter(w => !picks.some(p => p.id === w.id));
    const common = calculateLearnedMatchrimProfile(base, cellarTrainingRows(rows, true));
    const coherentBefore = rank(unseen.map(w => ({ id: w.id, score: calculateLocalMatchrimAffinity(base, w.sensory)! })));
    const coherentAfter = rank(unseen.map(w => ({ id: w.id, score: calculateLocalMatchrimAffinity(common.profile, w.sensory)! })));
    return { id: archetype + '-v' + variant, base, before: metrics(before), mixed_profile_after: original,
      mixed_without_rejections: { top1: withoutRejections.top1, regret: withoutRejections.regret, ndcg3: withoutRejections.ndcg3 },
      coherent_unseen_only: { candidates: unseen.length, training: rows.length,
        before: metrics(coherentBefore, unseen), after: metrics(coherentAfter, unseen) } };
  }));
  return { scope: 'Reproduction of QA85 synthetic oracle and cross-fold ranking, NOT taste validation or tuning.',
    known_historical: { top1_before: 44, top1_after: 33, ndcg3_before: 0.999499, ndcg3_after: 0.997923 },
    reproduced: { profiles: personas.length, top1_before: personas.filter(p => p.before.top1).length,
      top1_after: personas.filter(p => p.mixed_profile_after.top1).length,
      ndcg3_before: mean(personas.map(p => p.before.ndcg3)), ndcg3_after: mean(personas.map(p => p.mixed_profile_after.ndcg3)),
      regret_before: mean(personas.map(p => p.before.regret)), regret_after: mean(personas.map(p => p.mixed_profile_after.regret)),
      distinct_profile_counts: [...new Set(personas.map(p => p.mixed_profile_after.distinct_profiles))],
      target_row_overlap: personas.filter(p => p.mixed_profile_after.leakage).length,
      top1_without_rejections: personas.filter(p => p.mixed_without_rejections.top1).length },
    coherent_unseen_only: { label: 'Different five-item candidate set; not a replacement for the old eight-item metric.',
      top1_before: personas.filter(p => p.coherent_unseen_only.before.top1).length,
      top1_after: personas.filter(p => p.coherent_unseen_only.after.top1).length }, personas };
}
