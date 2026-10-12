import type { MatchrimProfileLike } from './matchrimPassport';
import { calculateLearnedMatchrimProfile, type TrainableWine } from './matchrimLearning';

export interface ScanProfileSnapshot {
  profile: MatchrimProfileLike | null;
  source: 'quiz' | 'learned' | 'unavailable';
  samples: number | null;
  note: string;
}

interface ScanProfileLoaders {
  base: () => Promise<MatchrimProfileLike | null>;
  training: () => Promise<TrainableWine[]>;
}

export const resolveScanProfile = async (
  ownerId: string | null, anonymousProfile: MatchrimProfileLike | null,
  loaders: ScanProfileLoaders, signal: AbortSignal,
): Promise<ScanProfileSnapshot> => {
  const checkAbort = () => { if (signal.aborted) throw new DOMException('Cancelled', 'AbortError'); };
  checkAbort();
  let base = anonymousProfile;
  if (ownerId) {
    // An authenticated load must never silently reuse another account's local quiz.
    try { base = await loaders.base(); } catch { base = null; }
    checkAbort();
  }
  if (!base || !['potente', 'acidez', 'dulce', 'tanico', 'afrutado'].every(key => (
    typeof base[key] === 'number' && Number.isFinite(base[key]) && base[key] >= 1 && base[key] <= 5
  ))) return { profile: null, source: 'unavailable', samples: null, note: 'Perfil no disponible para este análisis; afinidad pendiente.' };
  if (!ownerId) return { profile: { ...base }, source: 'quiz', samples: 0, note: 'Afinidad basada en tu test local, sin valoraciones de una cuenta.' };
  let training: TrainableWine[];
  try { training = await loaders.training(); } catch {
    checkAbort();
    return { profile: { ...base }, source: 'quiz', samples: null, note: 'Afinidad basada en tu test; no se pudieron cargar las valoraciones.' };
  }
  checkAbort();
  const learned = calculateLearnedMatchrimProfile(base, training);
  return {
    profile: { ...learned.profile }, source: learned.samples > 0 ? 'learned' : 'quiz', samples: learned.samples,
    note: learned.samples > 0
      ? `Perfil ajustado con ${learned.samples} valoraciones para este análisis.${learned.calibration.conflicting ? ' Hay señales contradictorias; la recomendación es provisional.' : ''}`
      : 'Afinidad basada en tu test; todavía no hay valoraciones utilizables.',
  };
};
