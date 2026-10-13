export const isMatchrimFixtureQaEnabled = import.meta.env.VITE_MATCHRIM_QA_FIXTURES === 'true';

export const ensureMatchrimQaProfile = () => {
  if (!isMatchrimFixtureQaEnabled || typeof window === 'undefined') return;
  if (window.localStorage.getItem('matchrim_quiz_result')) return;
  window.localStorage.setItem('matchrim_quiz_result', JSON.stringify({
    potente: 4,
    acidez: 4,
    dulce: 1,
    tanico: 3,
    afrutado: 4,
  }));
};
