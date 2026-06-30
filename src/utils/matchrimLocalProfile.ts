// Reads the locally-stored Matchrim quiz result so anonymous users can still
// get personalized scanner recommendations. Always returns values normalized
// to integers 1-5 (or null if any axis is missing/invalid).

const KEYS = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;

export type MatchrimLocalProfile = Record<typeof KEYS[number], number>;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const toScale5 = (value: unknown): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  let v = n;
  if (v > 10) v = v / 20;
  else if (v > 5) v = v / 2;
  return clamp(Math.round(v), 1, 5);
};

export const readMatchrimLocalProfile = (): MatchrimLocalProfile | null => {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('matchrim_quiz_result');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<MatchrimLocalProfile> = {};
    for (const k of KEYS) {
      const v = toScale5(parsed?.[k]);
      if (v == null) return null;
      out[k] = v;
    }
    return out as MatchrimLocalProfile;
  } catch {
    return null;
  }
};
