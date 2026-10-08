const OWNER_KEY = 'matchrim.local_profile_owner.v1';
const PRIVATE_KEYS = [
  'matchrim_quiz_result', 'matchrim_quiz_answers', 'matchrim_test_completed',
  'matchrim.scan_history.v1',
];

export const reconcileMatchrimLocalOwner = (userId: string | null, signedOut = false) => {
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    const next = userId || 'anonymous';
    // Never silently import another account's cached taste or scan history.
    if (signedOut || (owner !== null && owner !== next) || (owner === null && userId)) {
      PRIVATE_KEYS.forEach(key => localStorage.removeItem(key));
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('matchrim:scan-history-updated'));
    }
    localStorage.setItem(OWNER_KEY, next);
  } catch {
    // An unavailable local cache must not prevent authentication.
  }
};
