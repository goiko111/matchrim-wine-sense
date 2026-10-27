export const isNativeQuizAnswer273 = (value: unknown): value is 'si' | 'no' | 'indiferente' =>
  value === 'si' || value === 'no' || value === 'indiferente';

// Missing answers are unknown, not evidence that the person dislikes a flavour.
export const firstMissingNativeAnswer273 = (answers: unknown, questionIds: readonly number[]): number => {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return 0;
  if (!questionIds.length || new Set(questionIds).size !== questionIds.length
    || questionIds.some(id => !Number.isSafeInteger(id) || id < 1)) return 0;
  return questionIds.findIndex(id => !Object.prototype.hasOwnProperty.call(answers, id)
    || !isNativeQuizAnswer273((answers as Record<number, unknown>)[id]));
};
