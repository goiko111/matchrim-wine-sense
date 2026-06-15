// Sensory attributes must always live on a 0-5 integer scale (1-5 in practice).
// Legacy data may exist on 0-10 or 0-100 scales — coerce to 0-5.

export const SENSORY_KEYS = ['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado'] as const;
export type SensoryKey = typeof SENSORY_KEYS[number];
export type SensoryAttributes = Partial<Record<SensoryKey, number>>;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const normalizeSensoryValueTo5 = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  let v = numeric;
  if (v > 10) v = v / 20; // legacy 0-100
  else if (v > 5) v = v / 2; // legacy 0-10
  return clamp(Math.round(v), 1, 5);
};

export const normalizeSensoryAttributes = (
  attrs: Partial<Record<string, unknown>> | null | undefined
): SensoryAttributes | null => {
  if (!attrs || typeof attrs !== 'object') return null;
  const out: SensoryAttributes = {};
  let any = false;
  for (const key of SENSORY_KEYS) {
    const v = normalizeSensoryValueTo5((attrs as Record<string, unknown>)[key]);
    if (v !== null) {
      out[key] = v;
      any = true;
    }
  }
  return any ? out : null;
};
