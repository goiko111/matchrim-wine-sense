import type { QuizResult } from '@/data/quizData';

type Axis = keyof QuizResult;
type Question = { id: number; scores: Record<Axis, number> };
type Answers = { [id: number]: string };

// 132: the quiz asks about foods, and most people like most foods. Read on its own, every axis rose
// with that general liking: a typical respondent (60 % "sí") got dulzor 3-4, and 60 % of their 20
// closest wines out of 6283 real Winerim wines were sweet, fortified or dessert (8 % of the catalogue).
// Here each axis is read relative to the person's own general liking and placed on the wine scale:
// liking everything equally lands on the catalogue centre (dry, medium body, some tannin); a clear
// preference moves it from there. Sweetness only rises above dry for a marked sweet tooth.
const CENTER: Record<Axis, number> = { potente: 3.5, acidez: 3.5, dulce: 1, tanico: 2, afrutado: 3.5 };
const SPAN: Record<Axis, number> = { potente: 3, acidez: 3, dulce: 0, tanico: 5, afrutado: 3 };
const AXES: Axis[] = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'];

const liking = (answer: string | undefined) => answer === 'si' ? 1 : answer === 'indiferente' ? 0.5 : 0;

export const calibrateQuizProfile132 = (answers: Answers, questions: readonly Question[]): QuizResult => {
  const general = questions.reduce((sum, question) => sum + liking(answers[question.id]), 0) / questions.length;
  const result = {} as QuizResult;
  for (const axis of AXES) {
    const total = questions.reduce((sum, question) => sum + question.scores[axis], 0);
    const relative = total
      ? questions.reduce((sum, question) => sum + question.scores[axis] * liking(answers[question.id]), 0) / total - general
      : 0;
    const value = axis === 'dulce'
      ? relative <= -0.3 ? 0 : relative <= 0.1 ? 1 : 1 + (relative - 0.1) * 10
      : CENTER[axis] + relative * SPAN[axis];
    // Stored as integers 0-5 (quiz_results columns are INTEGER).
    result[axis] = Math.round(Math.max(0, Math.min(5, value)));
  }
  return result;
};
