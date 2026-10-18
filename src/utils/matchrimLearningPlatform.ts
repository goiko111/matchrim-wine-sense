import { Capacitor } from '@capacitor/core';
import type { MatchrimProfileLike } from './matchrimPassport';
import {
  calculateLearnedMatchrimProfile as calculatePureLearnedMatchrimProfile,
  type MatchrimLearningOptions,
  type TrainableWine,
} from './matchrimLearning';

export type { TrainableWine } from './matchrimLearning';

export const NATIVE_MATCHRIM_LEARNING_MODEL = 'native-evidence-strength-v2' as const;

export const calculateLearnedMatchrimProfile = (
  base: MatchrimProfileLike,
  wines: TrainableWine[],
  options: Omit<MatchrimLearningOptions, 'evidenceStrength'> = {},
) => calculatePureLearnedMatchrimProfile(base, wines, {
  ...options,
  evidenceStrength: Capacitor.isNativePlatform() ? 'native-v2' : 'legacy-v1',
});
