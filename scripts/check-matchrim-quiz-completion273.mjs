import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { firstMissingNativeAnswer273, isNativeQuizAnswer273 } from '../src/utils/nativeQuizCompletion273.ts';

const transpile = source => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
} }).outputText;
const quizModule = { exports: {} };
vm.runInNewContext(transpile(fs.readFileSync('src/data/quizData.ts', 'utf8')), {
  module: quizModule, exports: quizModule.exports, require: id => {
    assert(id.startsWith('@/assets/quiz/') && id.endsWith('.jpg')); return { default: id };
  },
}, { timeout: 1000 });
const { questions, calculateProfile } = quizModule.exports;
const file = 'src/pages/Matchrim.tsx', current = fs.readFileSync(file, 'utf8');
const previous = execFileSync('git', ['show', `8787e81:${file}`], { encoding: 'utf8' });
const inverse = current
  .replace("import { firstMissingNativeAnswer273, isNativeQuizAnswer273 } from '@/utils/nativeQuizCompletion273';\n", '')
  .replace('    if (isNative && (!questions[currentQuestionIndex] || !isNativeQuizAnswer273(value))) return;\n', '')
  .replace('      if (isNative) {\n        const missing = firstMissingNativeAnswer273(newAnswers, questions.map(question => question.id));\n        if (missing !== -1) { setCurrentQuestionIndex(missing); return; }\n      }\n', '')
  .replace('    if (!questions[currentQuestionIndex] || !isNativeQuizAnswer273(value)) return;\n', '');
assert.equal(inverse, previous, 'UNRELATED_OR_WEB_SOURCE_CHANGED');
const extract = (source, name) => {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) { assert(!found); found = node.initializer.getText(tree); }
    ts.forEachChild(node, visit);
  };
  visit(tree); assert(found); return found;
};
const run = (source, options) => {
  const { answers, native = true, index = 19, handler = 'advanceAnswer', user = null, pending = false } = options;
  const value = Object.prototype.hasOwnProperty.call(options, 'value') ? options.value : 'si';
  const calls = [], storage = new Map(), submission = { current: pending };
  const module = { exports: {} };
  const context = { module, exports: module.exports, isNative: native, answers, currentQuestionIndex: index,
    questions, nativeSubmissionPending: submission, firstMissingNativeAnswer273, isNativeQuizAnswer273,
    setAnswers: answer => calls.push(['answers', typeof answer === 'function' ? answer(answers) : answer]),
    setCurrentQuestionIndex: index => calls.push(['question', index]),
    setCurrentStep: step => calls.push(['step', step]), setQuizResult: result => calls.push(['result', result]),
    calculateProfile: answers => { calls.push(['calculate']); return calculateProfile(answers); },
    user, saveQuizResult: () => { calls.push(['save']); return Promise.resolve('SYNTHETIC-ID273'); },
    setNativeSaveStatus: status => calls.push(['status', status]),
    saveLifetime: { current: { active: true, generation: 0 } },
    localStorage: { setItem: (key, value) => storage.set(key, value) },
  };
  vm.runInNewContext(transpile(`const advanceAnswer = ${extract(source, 'advanceAnswer')};
    module.exports = ${handler === 'advanceAnswer' ? 'advanceAnswer' : extract(source, 'handleAnswer')};`), context, { timeout: 1000 });
  module.exports(value);
  return { calls: JSON.parse(JSON.stringify(calls)), storage, submission };
};
const all = value => Object.fromEntries(questions.map(question => [question.id, value]));
const ids = questions.map(question => question.id);
const old = run(previous, { answers: { 20: 'si' } });
assert(old.calls.some(call => call[0] === 'calculate'));
assert.equal(old.storage.get('matchrim_test_completed'), 'true');
const fixed = run(current, { answers: { 20: 'si' } });
assert(!fixed.calls.some(call => ['calculate', 'result', 'step', 'save'].includes(call[0])));
assert.equal(fixed.storage.size, 0); assert.equal(fixed.submission.current, false);
assert.deepEqual(fixed.calls.find(call => call[0] === 'question'), ['question', 0]);
const signedInPartial = run(current, { answers: { 20: 'si' }, user: { id: 'SYNTHETIC273' } });
assert(!signedInPartial.calls.some(call => ['calculate', 'result', 'step', 'save', 'status'].includes(call[0])));

let invalidCases = 0;
for (const value of ['', 'SI', 'yes', 'desconocido', null, undefined, 0, false]) {
  assert.equal(isNativeQuizAnswer273(value), false);
  for (const handler of ['handleAnswer', 'advanceAnswer']) {
    const result = run(current, { answers: all('si'), value, handler });
    assert.equal(result.calls.length, 0); assert.equal(result.storage.size, 0); invalidCases++;
  }
}
for (let i = 0; i < ids.length; i++) {
  const answers = all('indiferente'); delete answers[ids[i]];
  assert.equal(firstMissingNativeAnswer273(answers, ids), i);
}
for (const input of [null, [], 'no', Object.create(all('si'))])
  assert.equal(firstMissingNativeAnswer273(input, ids), 0);
assert.equal(firstMissingNativeAnswer273(all('si'), []), 0);
assert.equal(firstMissingNativeAnswer273(all('si'), [1, 1]), 0);

for (const value of ['si', 'no', 'indiferente']) {
  const answers = all(value), before = JSON.stringify(answers);
  const prior = run(previous, { answers, value }), result = run(current, { answers, value });
  assert.deepEqual(result.calls, prior.calls);
  assert.deepEqual([...result.storage], [...prior.storage]);
  assert.equal(firstMissingNativeAnswer273(answers, ids), -1);
  assert.equal(JSON.stringify(answers), before);
}
const webAnswers = { 20: 'si' };
for (const value of ['si', 'unexpected']) {
  const prior = run(previous, { answers: webAnswers, value, native: false });
  const result = run(current, { answers: webAnswers, value, native: false });
  assert.deepEqual(result.calls, prior.calls); assert.deepEqual([...result.storage], [...prior.storage]);
}
assert.equal(run(current, { answers: all('si'), pending: true }).calls.length, 0);
assert.equal(run(current, { answers: all('si'), index: 20 }).calls.length, 0);
console.log(JSON.stringify({ passed: true, oldPartialSubmissionReproduced: true,
  fixedPartialSubmissionBlocked: true, invalidHandlerCases: invalidCases,
  missingAnswerPositions: 20, validBoundaryVectorsUnchanged: 3, webBehaviorUnchanged: true,
  quizWeightsChanged: false, liveAccounts: 0, externalCalls: 0,
  scope: 'Actual native handler expressions and original quiz formula with inert storage/save hooks, not visual or predictive calibration' }));
