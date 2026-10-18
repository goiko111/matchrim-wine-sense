import assert from 'node:assert/strict';

const modelExport = "export const NATIVE_MATCHRIM_LEARNING_MODEL = 'native-evidence-strength-v2' as const;";
const modelOptions = `${modelExport}
export type MatchrimLearningOptions96 = { evidenceStrength?: 'legacy-v1' | 'native-v2' };
// Model selection is not identity or authorization; unknown tags retain legacy.
export const readMatchrimLearningOptions96 = (model: unknown): MatchrimLearningOptions96 => ({
  evidenceStrength: model === NATIVE_MATCHRIM_LEARNING_MODEL ? 'native-v2' : 'legacy-v1',
});
`;
const pairs: Record<string, readonly (readonly [string, string])[]> = {
  'supabase/functions/_shared/matchrim-profile95.ts': [
    [modelOptions, ''],
    ['rows: readonly unknown[], options: MatchrimLearningOptions96 = {}', 'rows: readonly unknown[]'],
    ["  const strengthAware = options.evidenceStrength === 'native-v2';\n", ''],
    ['(strengthAware ? totalWeight : samples) / 12', 'samples / 12'],
    ['  const evidenceDenominator = strengthAware ? samples : totalWeight;\n', ''],
    ['deltas[key] / evidenceDenominator', 'deltas[key] / totalWeight'],
  ],
  'src/utils/matchrimLearningPlatform.ts': [
    ["export { NATIVE_MATCHRIM_LEARNING_MODEL } from '../../supabase/functions/_shared/matchrim-profile95';", modelExport],
  ],
  'src/components/wine-import/FoodPairingScanner.tsx': [
    ["import { NATIVE_MATCHRIM_LEARNING_MODEL } from '@/utils/matchrimLearningPlatform';\n", ''],
    ['const context = { restaurantName, matchrimProfile: readMatchrimLocalProfile(),\n        ...(isNative ? { matchrimLearningModel: NATIVE_MATCHRIM_LEARNING_MODEL } : {}) };',
      'const context = { restaurantName, matchrimProfile: readMatchrimLocalProfile() };'],
  ],
  'src/lib/aiRimStream.ts': [
    ["import { Capacitor } from '@capacitor/core';\nimport { NATIVE_MATCHRIM_LEARNING_MODEL } from '@/utils/matchrimLearningPlatform';\n", ''],
    ['body: JSON.stringify(Capacitor.isNativePlatform()\n        ? { ...payload, matchrimLearningModel: NATIVE_MATCHRIM_LEARNING_MODEL } : payload),', 'body: JSON.stringify(payload),'],
  ],
  'supabase/functions/scan-food-pairing/index.ts': [
    ['calculateLearnedMatchrimProfile95, readMatchrimLearningOptions96, readMatchrimProfile95', 'calculateLearnedMatchrimProfile95, readMatchrimProfile95'],
    ['matchrimProfile, matchrimLearningModel, scan_region: rawScanRegion', 'matchrimProfile, scan_region: rawScanRegion'],
    ['calculateLearnedMatchrimProfile95(learnedProfile, rows, readMatchrimLearningOptions96(matchrimLearningModel))', 'calculateLearnedMatchrimProfile95(learnedProfile, rows)'],
  ],
  'supabase/functions/ai-wine-chat/index.ts': [
    ['MATCHRIM_PROFILE95_TRAINING_COLUMNS, readMatchrimLearningOptions96, readMatchrimProfile95', 'MATCHRIM_PROFILE95_TRAINING_COLUMNS, readMatchrimProfile95'],
    ['  matchrimLearningModel?: unknown;\n', ''],
    ['signal: AbortSignal, learningModel?: unknown,', 'signal: AbortSignal,'],
    ['calculateLearnedMatchrimProfile95(base, training.data ?? [], readMatchrimLearningOptions96(learningModel))', 'calculateLearnedMatchrimProfile95(base, training.data ?? [])'],
    ['loadSpecialMomentProfile95(authHeader, specialUserId, signal, payload.matchrimLearningModel)', 'loadSpecialMomentProfile95(authHeader, specialUserId, signal)'],
  ],
};

export const feedbackServerScope96 = Object.keys(pairs);
export const projectFeedbackServer96 = (file: string, source: string): string => {
  assert.ok(file in pairs, 'Only the six reviewed opt-in files may be projected');
  for (const [current, previous] of pairs[file]) {
    assert.equal(source.split(current).length, 2, 'Exactly one reviewed native opt-in slot: ' + file + ': ' + current);
    source = source.replace(current, previous);
  }
  return source;
};
