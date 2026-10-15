export const SPECIAL_MOMENT_LABELS = {
  'dinner-friends': 'cena con amigos',
  gift: 'vino para regalar',
  'intimate-dinner': 'cena íntima',
  celebration: 'cumpleaños/celebración',
} as const;

export type SpecialMomentType = keyof typeof SPECIAL_MOMENT_LABELS;

export const SPECIAL_MOMENT_OPTIONS = {
  people: ['2 personas', '3-4 personas', '5-8 personas', '9-12 personas', 'Más de 12'],
  food: ['Picoteo variado', 'Carne / Asado', 'Sushi / Japonesa', 'Pasta italiana', 'Mariscos', 'Cocina mediterránea'],
  guestLevel: ['Principiantes', 'Nivel medio', 'Conocedores', 'Expertos / Sommeliers'],
  approach: ['Acertar seguro (clásico)', 'Sorprender moderadamente', 'Algo muy disruptivo'],
  budget: ['Hasta 15 €', '15 € - 30 €', '30 € - 50 €', '50 € - 100 €', 'Más de 100 €'],
} as const;

export type SpecialMomentAnswerKey = keyof typeof SPECIAL_MOMENT_OPTIONS;
export type SpecialMomentAnswers = Record<SpecialMomentAnswerKey, string> & {
  momentType: SpecialMomentType | null;
};

export const emptySpecialMomentAnswers = (momentType: SpecialMomentType | null = null): SpecialMomentAnswers => ({
  momentType, people: '', food: '', guestLevel: '', approach: '', budget: '',
});

export const isCompleteSpecialMoment = (data: SpecialMomentAnswers): boolean => (
  Object.prototype.hasOwnProperty.call(SPECIAL_MOMENT_LABELS, data.momentType ?? '') &&
  (Object.keys(SPECIAL_MOMENT_OPTIONS) as SpecialMomentAnswerKey[]).every(key =>
    (SPECIAL_MOMENT_OPTIONS[key] as readonly string[]).includes(data[key]),
  )
);

// Keep the response inert and complete; remove only visual heading/bold markers.
export const specialMomentPlainText = (text: string): string => text
  .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
  .replace(/\*\*([^\n]+?)\*\*/g, '$1')
  .replace(/^[ \t]*(?:\*\*\*+|___+|---+)[ \t]*$/gm, '')
  .trim();
