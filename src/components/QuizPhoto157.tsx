import q1 from '@/assets/quiz157/q1.jpg';
import q2 from '@/assets/quiz157/q2.jpg';
import q3 from '@/assets/quiz157/q3.jpg';
import q4 from '@/assets/quiz157/q4.jpg';
import q5 from '@/assets/quiz157/q5.jpg';
import q6 from '@/assets/quiz157/q6.jpg';
import q7 from '@/assets/quiz157/q7.jpg';
import q8 from '@/assets/quiz157/q8.jpg';
import q9 from '@/assets/quiz157/q9.jpg';
import q10 from '@/assets/quiz157/q10.jpg';
import q11 from '@/assets/quiz157/q11.jpg';
import q12 from '@/assets/quiz157/q12.jpg';
import q13 from '@/assets/quiz157/q13.jpg';
import q14 from '@/assets/quiz157/q14.jpg';
import q15 from '@/assets/quiz157/q15.jpg';
import q16 from '@/assets/quiz157/q16.jpg';
import q17 from '@/assets/quiz157/q17.jpg';
import q18 from '@/assets/quiz157/q18.jpg';
import q19 from '@/assets/quiz157/q19.jpg';
import q20 from '@/assets/quiz157/q20.jpg';

// 157: the owner found the flat drawings of 149 unprofessional and chose full-bleed photographs: one per question,
// all cropped square from pictures with the same dark, close light (credits in docs/MATCHRIM_157_FOTOS.md). They are
// decoration (the question names the food), so they are hidden from VoiceOver.
const PHOTO: Record<number, string> = { 1: q1, 2: q2, 3: q3, 4: q4, 5: q5, 6: q6, 7: q7, 8: q8, 9: q9, 10: q10, 11: q11, 12: q12, 13: q13, 14: q14, 15: q15, 16: q16, 17: q17, 18: q18, 19: q19, 20: q20 };
export const QUIZ_PHOTO_IDS157 = Object.keys(PHOTO).map(Number);
export const quizPhoto157 = (id: number) => PHOTO[id];
export const QuizPhoto157 = ({ id, className = '', eager = false }: { id: number; className?: string; eager?: boolean }) => {
  const src = PHOTO[id]; if (!src) return null;
  return <img src={src} alt="" aria-hidden="true" decoding="async" loading={eager ? 'eager' : 'lazy'} draggable={false} className={`object-cover ${className}`} data-testid="quiz-photo157" />;
};
