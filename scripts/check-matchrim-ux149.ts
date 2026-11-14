// 149: the taste test redesigned with flat illustrations drawn in the app (the owner's choice, «B, ilustraciones»).
// Offline. Run: npx tsx scripts/check-matchrim-ux149.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
// The questions import their photos (the web still shows them), so they are read as text here.
const questions = [...read('src/data/quizData.ts').matchAll(/\{\s*id: (\d+),\s*text: "([^"]+)"/g)].map(match => ({ id: Number(match[1]), text: match[2] }));

test('Every question has its own picture, bundled with the app and hidden from VoiceOver (157: photographs)', () => {
  const art = read('src/components/QuizPhoto157.tsx');
  for (const question of questions) { assert(art.includes(`import q${question.id} from '@/assets/quiz157/q${question.id}.jpg';`), `question ${question.id}: ${question.text}`); assert(fs.statSync(`src/assets/quiz157/q${question.id}.jpg`).size > 20000); }
  assert.equal(questions.length, 20);
  assert.match(art, /alt="" aria-hidden="true"/);
  assert(!/https?:/.test(art.replace(/\/\/.*$/gm, '')), 'nothing downloaded at run time');
});

test('The question keeps its answers, labels and scoring; only its look changes', () => {
  const question = read('src/components/QuizQuestion.tsx');
  assert.match(question, /<QuizPhoto157 key=\{question\.id\} id=\{question\.id\} eager className="matchrim-native-quiz-image /);
  for (const keep of ["['si', 'Me gusta', ThumbsUp]", "['indiferente', 'Me da igual', Meh]", "['no', 'No me gusta', ThumbsDown]", 'aria-label="Progreso del test"', 'aria-label="Anterior"',
    'aria-label="Salir del test"', "{isLast ? 'Ver mi perfil' : 'Siguiente'}", '`Pregunta ${currentQuestionIndex + 1} de ${totalQuestions}`', 'aria-label={question.text}']) assert(question.includes(keep), keep);
  // The web test still shows its photos.
  assert.match(question, /src=\{question\.image\}\s+alt=\{question\.text\}/);
  assert.match(read('src/data/quizData.ts'), /scores: \{ potente: 0, acidez: 2, dulce: 0, tanico: 0, afrutado: 1 \}/, 'scoring untouched');
});

test('The cover shows four of the foods and keeps its words', () => {
  const intro = read('src/components/QuizIntro.tsx');
  assert.match(intro, /\[1, 14, 2, 16\]\.map\(id => <QuizPhoto157 key=\{id\} id=\{id\}/);
  for (const keep of ['Test de paladar', 'Comenzar el test', 'No hace falta saber de vino.']) assert(intro.includes(keep), keep);
});
console.log(`check-matchrim-ux149: ${groups}/3 groups passed`);
