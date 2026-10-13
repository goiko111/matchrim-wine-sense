export const ONBOARDING_VERSION = 2;
const stateKey = (ownerId: string | null) => `matchrim.onboarding.v2:${ownerId ?? 'anonymous'}`;
const eventsKey = (ownerId: string | null) => `matchrim.onboarding.local-events.v2:${ownerId ?? 'anonymous'}`;

export const shouldShowMatchrimOnboarding = (existing: boolean, ownerId: string | null = null) => {
  if (existing) return false;
  try {
    // Legacy global keys have no trustworthy owner. Preserve them, but never import
    // their skip/completion into a different or newly authenticated account.
    const raw = localStorage.getItem(stateKey(ownerId));
    if (raw === null) return true;
    let state: { version?: unknown; result?: unknown } | null;
    try { state = JSON.parse(raw); } catch { return true; }
    return !(state && Number.isInteger(state.version) && Number(state.version) >= 1
      && Number(state.version) <= ONBOARDING_VERSION
      && (state.result === 'skipped' || state.result === 'completed'));
  } catch { return false; } // Storage failure must not create a recurring barrier; Help stays available.
};

export const recordOnboardingEvent = (name: 'started' | 'skipped' | 'completed' | 'reopened' | 'step', step: number, ownerId: string | null = null) => {
  try {
    let parsed: unknown;
    try { parsed = JSON.parse(localStorage.getItem(eventsKey(ownerId)) || '[]'); } catch { parsed = []; }
    const events = Array.isArray(parsed) ? parsed : [];
    localStorage.setItem(eventsKey(ownerId), JSON.stringify([...events, { name, step, version: ONBOARDING_VERSION, at: Date.now() }].slice(-30)));
  } catch { /* Optional local-only measurement; no network or personal data. */ }
};

export const finishMatchrimOnboarding = (result: 'skipped' | 'completed', ownerId: string | null = null) => {
  try { localStorage.setItem(stateKey(ownerId), JSON.stringify({ version: ONBOARDING_VERSION, result })); } catch { /* Non-blocking. */ }
};
