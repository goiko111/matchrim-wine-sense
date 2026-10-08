export const ONBOARDING_VERSION = 2;
const STATE_KEY = 'matchrim.onboarding.v1';
const EVENTS_KEY = 'matchrim.onboarding.local-events.v1';

export const shouldShowMatchrimOnboarding = (existing: boolean) => {
  if (existing) return false;
  try { return localStorage.getItem(STATE_KEY) === null; } catch { return false; }
};

export const recordOnboardingEvent = (name: 'started' | 'skipped' | 'completed' | 'reopened' | 'step', step: number) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
    const events = Array.isArray(parsed) ? parsed : [];
    localStorage.setItem(EVENTS_KEY, JSON.stringify([...events, { name, step, version: ONBOARDING_VERSION, at: Date.now() }].slice(-30)));
  } catch { /* Optional local-only measurement; no network or personal data. */ }
};

export const finishMatchrimOnboarding = (result: 'skipped' | 'completed') => {
  try { localStorage.setItem(STATE_KEY, JSON.stringify({ version: ONBOARDING_VERSION, result })); } catch { /* Non-blocking. */ }
};
