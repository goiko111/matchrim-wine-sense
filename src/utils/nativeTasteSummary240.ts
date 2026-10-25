import type { MatchrimProfileLike } from './matchrimPassport';

const definitions = [
  ['potente', 'Cuerpo', ['Ligero', 'Intermedio', 'Con cuerpo'], ['ligeros', 'de cuerpo medio', 'con cuerpo']],
  ['acidez', 'Frescura', ['Suave', 'Equilibrada', 'Viva'], ['frescura suave', 'frescura equilibrada', 'frescura viva']],
  ['dulce', 'Dulzor', ['Seco', 'Un toque dulce', 'Dulce'], [null, null, null]],
  ['tanico', 'Taninos', ['Suaves', 'Moderados', 'Marcados'], [null, null, null]],
  ['afrutado', 'Fruta', ['Discreta', 'Presente', 'Intensa'], ['fruta discreta', 'fruta presente', 'fruta intensa']],
] as const;

export const nativeTasteSummary240 = (profile: MatchrimProfileLike) => {
  if (!profile || definitions.some(([key]) => typeof profile[key] !== 'number'
    || !Number.isFinite(profile[key]) || profile[key] < 0 || profile[key] > 5)) return null;
  const rows = definitions.map(([key, label, descriptions, phrases]) => {
    const value = profile[key], level = value <= 2 ? 0 : value >= 4 ? 2 : 1;
    return { key, label, value, description: descriptions[level], phrase: phrases[level] ?? null };
  });
  return { rows, summary: `Tu test apunta a vinos ${rows[0].phrase}, con ${rows[1].phrase} y ${rows[4].phrase}.` };
};
