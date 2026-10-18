import { Capacitor } from '@capacitor/core';
import type { MatchrimProfileLike } from './matchrimPassport';
import {
  calculateLearnedMatchrimProfile as calculatePureLearnedMatchrimProfile,
  type MatchrimLearningOptions,
  type TrainableWine,
} from './matchrimLearning';

export type { TrainableWine } from './matchrimLearning';

export { NATIVE_MATCHRIM_LEARNING_MODEL } from '../../supabase/functions/_shared/matchrim-profile95';

export const calculateLearnedMatchrimProfile = (
  base: MatchrimProfileLike,
  wines: TrainableWine[],
  options: Omit<MatchrimLearningOptions, 'evidenceStrength'> = {},
) => calculatePureLearnedMatchrimProfile(base, wines, {
  ...options,
  evidenceStrength: Capacitor.isNativePlatform() ? 'native-v2' : 'legacy-v1',
});
