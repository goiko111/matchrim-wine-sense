// 149: the taste test redesigned with flat illustrations drawn in the app (the owner's choice, «B, ilustraciones»).
// Offline. Run: npx tsx scripts/check-matchrim-ux149.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
// The questions import their photos (the web still shows them), so they are read as text here.
const questions = [...read('src/data/quizData.ts').matchAll(/\{\s*id: (\d+),\s*text: "([^"]+)"/g)].map(match => ({ id: Number(match[1]), text: match[2] }));

test('Every question has its own illustration, drawn in the app and hidden from VoiceOver', () => {
  const art = read('src/components/QuizArt149.tsx');
  for (const question of questions) assert.match(art, new RegExp(`\\n  ${question.id}: \\{ bg: '#[0-9a-f]{6}', draw: `), `question ${question.id}: ${question.text}`);
  assert.equal(questions.length, 20);
  assert.match(art, /role="presentation" aria-hidden="true" focusable="false"/);
  assert(!/<img|https?:|\.jpg|\.png/.test(art.replace(/\/\/.*$/gm, '')), 'no photos, nothing downloaded');
});

test('The question keeps its answers, labels and scoring; only its look changes', () => {
  const question = read('src/components/QuizQuestion.tsx');
  assert.match(question, /<QuizArt149 id=\{question\.id\} className="matchrim-native-quiz-image /);
  for (const keep of ["['si', 'Me gusta', ThumbsUp]", "['indiferente', 'Me da igual', Meh]", "['no', 'No me gusta', ThumbsDown]", 'aria-label="Progreso del test"', 'aria-label="Anterior"',
    'aria-label="Salir del test"', "{isLast ? 'Ver mi perfil' : 'Siguiente'}", '`Pregunta ${currentQuestionIndex + 1} de ${totalQuestions}`', 'aria-label={question.text}']) assert(question.includes(keep), keep);
  // The web test still shows its photos.
  assert.match(question, /src=\{question\.image\}\s+alt=\{question\.text\}/);
  assert.match(read('src/data/quizData.ts'), /scores: \{ potente: 0, acidez: 2, dulce: 0, tanico: 0, afrutado: 1 \}/, 'scoring untouched');
});

test('The cover shows four of the foods and keeps its words', () => {
  const intro = read('src/components/QuizIntro.tsx');
  assert.match(intro, /\[1, 11, 2, 16\]\.map\(id => <QuizArt149 key=\{id\} id=\{id\}/);
  for (const keep of ['Test de paladar', 'Comenzar el test', 'No hace falta saber de vino.']) assert(intro.includes(keep), keep);
});
console.log(`check-matchrim-ux149: ${groups}/3 groups passed`);
