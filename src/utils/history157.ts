// 157: besides how the wine compares with the person's taste (five traits), the sheet says what they already know
// about wines like it: how they rated others from the same zone and of the same grape (the owner's OK to idea 3).
// Only their own ratings are counted, and only from two wines up; with less there is nothing honest to say.
export type RatedWine157 = { rating?: string | null; region?: string | null; grape_varieties?: string[] | null };
export type HistoryLine157 = { key: string; face: 'good' | 'fair' | 'far'; text: string };
const fold = (text: string | null | undefined) => (text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const line = (key: string, subject: string, ratings: string[]): HistoryLine157 | null => {
  if (ratings.length < 2) return null;
  const loved = ratings.filter(value => value === 'love').length, disliked = ratings.filter(value => value === 'not_for_me').length, total = ratings.length;
  if (loved / total >= 0.6) return { key, face: 'good', text: `${subject}: te encantaron ${loved} de los ${total} que has valorado` };
  if (disliked / total >= 0.6) return { key, face: 'far', text: `${subject}: no te gustaron ${disliked} de los ${total} que has valorado` };
  return { key, face: 'fair', text: `${subject}: has valorado ${total} y te gustaron unos sí y otros no` };
};
export const historyLines157 = (rated: RatedWine157[], wine: { region?: string | null; grapes?: string[] }): HistoryLine157[] => {
  const valid = rated.filter(item => item.rating === 'love' || item.rating === 'ok' || item.rating === 'not_for_me');
  const lines: (HistoryLine157 | null)[] = [];
  const region = fold(wine.region);
  if (region) lines.push(line('region', `Vinos de ${wine.region!.trim()}`, valid.filter(item => fold(item.region) === region).map(item => item.rating!)));
  for (const grape of (wine.grapes ?? []).slice(0, 2)) { const key = fold(grape); if (!key) continue;
    lines.push(line(`grape-${key}`, grape.trim(), valid.filter(item => (item.grape_varieties ?? []).some(value => fold(value) === key)).map(item => item.rating!))); }
  return lines.filter((item): item is HistoryLine157 => item !== null);
};
