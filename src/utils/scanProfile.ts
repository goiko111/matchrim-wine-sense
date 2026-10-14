import type { MatchrimProfileLike } from './matchrimPassport';
import { calculateLearnedMatchrimProfile, type TrainableWine } from './matchrimLearning';

export interface ScanProfileSnapshot {
  profile: MatchrimProfileLike | null;
  source: 'quiz' | 'learned' | 'unavailable';
  samples: number | null;
  note: string;
  status: 'ready' | 'missing' | 'invalid' | 'base-error' | 'base-timeout' | 'training-error' | 'training-timeout';
}

export class ScanProfileReadFailure extends Error {
  constructor(readonly kind: 'failed' | 'timeout') {
    super('Profile read unavailable');
    this.name = 'ScanProfileReadFailure';
  }
}

export const canRetryScanProfile = (snapshot: ScanProfileSnapshot | null): boolean =>
  Boolean(snapshot && ['base-error', 'base-timeout', 'training-error', 'training-timeout'].includes(snapshot.status));

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
    try { base = await loaders.base(); } catch (error) {
      checkAbort();
      const timedOut = error instanceof ScanProfileReadFailure && error.kind === 'timeout';
      return {
        profile: null, source: 'unavailable', samples: null, status: timedOut ? 'base-timeout' : 'base-error',
        note: timedOut ? 'Se agot\u00f3 el tiempo de espera del perfil; afinidad pendiente.'
          : 'No se pudo cargar tu perfil; afinidad pendiente.',
      };
    }
    checkAbort();
  }
  if (!base) return { profile: null, source: 'unavailable', samples: null, status: 'missing', note: ownerId
    ? 'No hay un perfil guardado para esta cuenta; afinidad pendiente.' : 'No hay un perfil local disponible; afinidad pendiente.' };
  if (!['potente', 'acidez', 'dulce', 'tanico', 'afrutado'].every(key => (
    typeof base[key] === 'number' && Number.isFinite(base[key]) && base[key] >= 0 && base[key] <= 5
  ))) return { profile: null, source: 'unavailable', samples: null, status: 'invalid', note: 'El perfil disponible est\u00e1 incompleto o contiene datos no v\u00e1lidos; afinidad pendiente.' };
  if (!ownerId) return { profile: { ...base }, source: 'quiz', samples: 0, status: 'ready', note: 'Afinidad basada en tu test local, sin valoraciones de una cuenta.' };
  let training: TrainableWine[];
  try { training = await loaders.training(); } catch (error) {
    checkAbort();
    return { profile: { ...base }, source: 'quiz', samples: null,
      status: error instanceof ScanProfileReadFailure && error.kind === 'timeout' ? 'training-timeout' : 'training-error',
      note: 'Afinidad basada en tu test; no se pudieron cargar las valoraciones.' };
  }
  checkAbort();
  const learned = calculateLearnedMatchrimProfile(base, training);
  return {
    profile: { ...learned.profile }, source: learned.samples > 0 ? 'learned' : 'quiz', samples: learned.samples, status: 'ready',
    note: learned.samples > 0
      ? `Perfil ajustado con ${learned.samples} ${learned.samples === 1 ? 'valoración' : 'valoraciones'} para este análisis.${learned.calibration.conflicting ? ' Hay señales contradictorias; la recomendación es provisional.' : ''}`
      : 'Afinidad basada en tu test; todavía no hay valoraciones utilizables.',
  };
};
