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
  // Native scans learn by surprise (v3). The server learner, used by chat and food pairing,
  // still applies native-v2 until its shared copy is updated.
  evidenceStrength: Capacitor.isNativePlatform() ? 'native-v3' : 'legacy-v1',
});
