// Reads the locally-stored Matchrim quiz result so anonymous users can still
// get personalized scanner recommendations. Quiz vectors include zero;
// legacy positive scales normalize to integers 1-5. Missing/invalid axes fail closed.

import { Capacitor } from '@capacitor/core';
import { normalizeScanSensoryValue, optionalScanNumber } from '../../supabase/functions/_shared/matchrim-scan-values';

const KEYS = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;

export type MatchrimLocalProfile = Record<typeof KEYS[number], number>;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const toScale5 = (value: unknown): number | null => {
  const n = optionalScanNumber(value);
  if (n === null || n < 0) return null;
  if (n === 0) return 0;
  let v = n;
  if (v > 10) v = v / 20;
  else if (v > 5) v = v / 2;
  return clamp(Math.round(v), 1, 5);
};

export const readMatchrimLocalProfile = (preserveContinuous = Capacitor.isNativePlatform()): MatchrimLocalProfile | null => {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('matchrim_quiz_result');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<MatchrimLocalProfile> = {};
    for (const k of KEYS) {
      const numeric = optionalScanNumber(parsed?.[k]);
      const v = preserveContinuous
        ? numeric === null || numeric < 0 ? null : numeric <= 5 ? numeric : normalizeScanSensoryValue(numeric)
        : toScale5(parsed?.[k]);
      if (v == null) return null;
      out[k] = v;
    }
    return out as MatchrimLocalProfile;
  } catch {
    return null;
  }
};
