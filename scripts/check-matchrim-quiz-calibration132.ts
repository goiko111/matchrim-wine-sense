// 132: native quiz profile read relative to the person's general liking. Offline, synthetic answers.
// Run: npx tsx scripts/check-matchrim-quiz-calibration132.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { calibrateQuizProfile132 } from '../src/utils/quizCalibration132';

const require = createRequire(import.meta.url), ts = require('typescript');
const quizModule = { exports: {} as Record<string, unknown> };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/data/quizData.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
  { module: quizModule, exports: quizModule.exports, require: (id: string) => { assert(id.startsWith('@/assets/quiz/')); return { __esModule: true, default: id }; } }, { timeout: 1000 });
type Profile = { potente: number; acidez: number; dulce: number; tanico: number; afrutado: number };
type Question = { id: number; scores: Profile };
const { questions, calculateProfile } = quizModule.exports as { questions: Question[]; calculateProfile: (answers: Record<number, string>) => Profile };
const answer = (pick: (question: Question) => string) => Object.fromEntries(questions.map(question => [question.id, pick(question)]));
const calibrated = (pick: (question: Question) => string) => calibrateQuizProfile132(answer(pick), questions);

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
test('Values are integers 0-5 (quiz_results columns are INTEGER)', () => {
  let seed = 132;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let index = 0; index < 500; index += 1) {
    const profile = calibrated(() => ['si', 'indiferente', 'no'][Math.floor(random() * 3)]);
    assert.ok(Object.values(profile).every(value => Number.isInteger(value) && value >= 0 && value <= 5), JSON.stringify(profile));
  }
});
test('Liking everything the same says nothing: all three land on the catalogue centre, dry', () => {
  const yes = calibrated(() => 'si'), no = calibrated(() => 'no'), meh = calibrated(() => 'indiferente');
  assert.deepEqual(yes, no); assert.deepEqual(yes, meh);
  assert.equal(yes.dulce, 1);
  assert.deepEqual({ ...calculateProfile(answer(() => 'si')) }, { potente: 5, acidez: 5, dulce: 5, tanico: 5, afrutado: 5 }, 'raw quiz unchanged');
});
test('A typical respondent (60 % "sí") is no longer read as liking sweet wines', () => {
  let seed = 7, raw = 0, cal = 0;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let index = 0; index < 300; index += 1) {
    const answers = answer(() => { const r = random(); return r < 0.6 ? 'si' : r < 0.8 ? 'indiferente' : 'no'; });
    raw += calculateProfile(answers).dulce; cal += calibrateQuizProfile132(answers, questions).dulce;
  }
  assert.ok(raw / 300 > 3, `raw ${raw / 300}`);
  assert.ok(cal / 300 <= 1.3, `calibrated ${cal / 300}`);
});
test('A marked sweet tooth still reads sweet', () => {
  const sweet = calibrated(question => question.scores.dulce >= 2 ? 'si' : 'no');
  assert.ok(sweet.dulce >= 4, JSON.stringify(sweet));
});
test('Bold foods read powerful and tannic; fresh foods read acid and light in tannin', () => {
  const bold = calibrated(question => question.scores.potente >= 2 && question.scores.dulce === 0 ? 'si' : 'no');
  const fresh = calibrated(question => question.scores.acidez >= 2 && question.scores.dulce === 0 ? 'si' : 'no');
  assert.ok(bold.potente >= 4 && bold.tanico >= 4 && bold.dulce <= 1, JSON.stringify(bold));
  assert.ok(fresh.acidez >= 4 && fresh.tanico <= 1 && fresh.dulce <= 1, JSON.stringify(fresh));
});
test('Only the native quiz uses it; the web keeps calculateProfile', () => {
  const page = fs.readFileSync('src/pages/Matchrim.tsx', 'utf8');
  assert.match(page, /const result = isNative \? calibrateQuizProfile132\(newAnswers, questions\) : calculateProfile\(newAnswers\);/);
});
assert.equal(groups, 6);
console.log(`Matchrim quiz calibration 132: ${groups}/6 PASS`);
