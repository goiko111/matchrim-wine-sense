import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { firstMissingNativeAnswer273, isNativeQuizAnswer273 } from '../src/utils/nativeQuizCompletion273';

const quizSource = readFileSync('src/data/quizData.ts', 'utf8');
const quizAst = ts.createSourceFile('quizData.ts', quizSource, ts.ScriptTarget.Latest, true);
const imageImports = quizAst.statements.filter(ts.isImportDeclaration)
  .map(node => ({ name: node.importClause?.name?.text, path: (node.moduleSpecifier as ts.StringLiteral).text }))
  .filter((entry): entry is { name: string; path: string } => Boolean(entry.name));
const quizDeclarations = quizAst.statements.filter(ts.isVariableStatement).flatMap(node => node.declarationList.declarations)
  .filter(node => ['questions', 'calculateProfile'].includes(node.name.getText(quizAst)));
assert.equal(quizDeclarations.length, 2);
const quizBody = ts.transpileModule(quizDeclarations.map(node => 'const ' + node.getText(quizAst) + ';').join('\n')
  + '\nreturn { questions, calculateProfile };', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const { questions, calculateProfile } = new Function(...imageImports.map(entry => entry.name), quizBody)(
  ...imageImports.map(entry => entry.path));

const source = readFileSync('src/pages/Matchrim.tsx', 'utf8');
const ast = ts.createSourceFile('Matchrim.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let declaration: ts.VariableDeclaration | null = null;
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'advanceAnswer') declaration = node;
  ts.forEachChild(node, visit);
};
visit(ast);
assert.ok(declaration);
const body = ts.transpileModule('const ' + (declaration as ts.VariableDeclaration).getText(ast) + '; return advanceAnswer;',
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const inputs = ['isNative', 'nativeSubmissionPending', 'questions', 'currentQuestionIndex', 'answers', 'setAnswers',
  'setCurrentQuestionIndex', 'setQuizResult', 'setCurrentStep', 'calculateProfile', 'user', 'saveQuizResult',
  'localStorage', 'setNativeSaveStatus', 'saveLifetime', 'firstMissingNativeAnswer273', 'isNativeQuizAnswer273'];
function harness(native = true, authenticated = true) {
  const statuses: string[] = [];
  const calls: object[] = [];
  const local = new Map();
  let resolve: (id: string | null) => void = () => {};
  let reject: (reason: Error) => void = () => {};
  const promise = new Promise<string | null>((yes, no) => { resolve = yes; reject = no; });
  const lifetime = { current: { active: true, generation: 0 } };
  const pending = { current: false };
  const answer = new Function(...inputs, body)(native, pending, questions, questions.length - 1,
    Object.fromEntries(questions.slice(0, -1).map((q: { id: number }) => [q.id, 'indiferente'])), () => {}, () => {}, () => {}, () => {},
    calculateProfile, authenticated ? { id: 'synthetic-owner' } : null,
    (result: object, answers: object) => { calls.push({ result, answers }); return promise; },
    { setItem: (key: string, value: string) => local.set(key, value) }, (status: string) => statuses.push(status), lifetime,
    firstMissingNativeAnswer273, isNativeQuizAnswer273);
  return { answer, statuses, calls, local, resolve, reject, lifetime };
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const confirmed = harness(); confirmed.answer('si');
assert.deepEqual(confirmed.statuses, ['saving']);
confirmed.answer('si'); assert.equal(confirmed.calls.length, 1, 'No duplicate last-answer insert');
confirmed.resolve('synthetic-quiz-id'); await flush(); assert.deepEqual(confirmed.statuses, ['saving', 'saved']);
const failed = harness(); failed.answer('si'); failed.resolve(null); await flush();
assert.deepEqual(failed.statuses, ['saving', 'unconfirmed']);
const rejected = harness(); rejected.answer('si'); rejected.reject(new Error('Synthetic failure')); await flush();
assert.deepEqual(rejected.statuses, ['saving', 'unconfirmed']);
for (const mode of ['unmounted', 'generation-changed']) {
  const old = harness(); old.answer('si');
  if (mode === 'unmounted') old.lifetime.current.active = false;
  else old.lifetime.current.generation += 1;
  old.resolve('old-owner-quiz'); await flush(); assert.deepEqual(old.statuses, ['saving']);
}
const anonymous = harness(true, false); anonymous.answer('si');
assert.equal(anonymous.calls.length, 0); assert.deepEqual(anonymous.statuses, []); assert.ok(anonymous.local.has('matchrim_quiz_result'));
const web = harness(false); web.answer('si'); assert.equal(web.calls.length, 1); assert.deepEqual(web.statuses, []);
assert.match(source, /key=\{user\?\.id \?\? 'anonymous'\}/);
assert.match(source, /aria-busy=\{nativeSaveStatus === 'saving'\}/);
assert.match(source, /restartDisabled=\{isNative && \(isSaving \|\| nativeSaveStatus === 'saving'\)\}/);
assert.match(readFileSync('src/components/QuizResults.tsx', 'utf8'), /onClick=\{onRestart\}\s+disabled=\{restartDisabled\}/);
assert.match(source, /Revisa tu perfil antes de repetir el test/);
assert.doesNotMatch(source, /Reintentar guardado/);
console.log(JSON.stringify({ groups: 8, passed: true, scope: 'Actual completion-handler body + UI wiring; synthetic promises, not real DB persistence' }));
