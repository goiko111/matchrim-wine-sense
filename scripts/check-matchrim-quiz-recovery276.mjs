import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source = fs.readFileSync('scripts/matchrim-quiz276-offline.js', 'utf8');
const tree = ts.createSourceFile('qa276.js', source, ts.ScriptTarget.Latest, true);
let implementation;
const visit = node => {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'findQuizHooks276') {
    assert(!implementation); implementation = node.getText(tree);
  }
  ts.forEachChild(node, visit);
};
visit(tree); assert(implementation);
const find = new Function(`${implementation}; return findQuizHooks276;`)();
const make = () => {
  const calls = [], dispatch = value => calls.push(value);
  const states = ['quiz', 0, {}, null, [], false];
  const hooks = states.map(memoizedState => ({ memoizedState, queue: { dispatch } }));
  hooks.forEach((hook, index) => { hook.next = hooks[index + 1] ?? null; });
  return { fiber: { memoizedState: hooks[0], return: null, alternate: null }, hooks, calls };
};
const sample = make(), state = find(sample.fiber);
assert.equal(state.index, sample.hooks[1]); assert.equal(state.answers, sample.hooks[2]);
assert.deepEqual(sample.calls, [], 'Discovery must not mutate React state');
const host = { memoizedState: null, return: sample.fiber };
assert.equal(find(host).index, state.index);
const alternate = { memoizedState: null, return: null, alternate: sample.fiber };
assert.equal(find(alternate).index, state.index);
for (const [index, value] of [[0, 'intro'], [1, 19], [2, { 1: 'si' }], [2, []], [2, null], [3, {}], [4, ['wine']], [5, 'false']]) {
  const wrong = make(); wrong.hooks[index].memoizedState = value;
  assert.throws(() => find(wrong.fiber), /EXACT_EMPTY_QUIZ_STATE_REQUIRED/);
}
const noDispatch = make(); noDispatch.hooks[1].queue.dispatch = null;
assert.throws(() => find(noDispatch.fiber), /EXACT_EMPTY_QUIZ_STATE_REQUIRED/);
const ambiguous = make(); ambiguous.fiber.return = make().fiber;
assert.throws(() => find(ambiguous.fiber), /EXACT_EMPTY_QUIZ_STATE_REQUIRED/);
const loop = { memoizedState: null }; loop.return = loop;
assert.throws(() => find(loop), /EXACT_EMPTY_QUIZ_STATE_REQUIRED/);
const sameQueueAlternate = { ...sample.fiber, alternate: sample.fiber };
assert.equal(find(sameQueueAlternate).index, sample.hooks[1]);
const runner = fs.readFileSync('scripts/qa-matchrim-native220.mjs', 'utf8');
assert(runner.includes("assert(!previous && prep.build === 126, 'RECOVERY276_REQUIRES_FRESH126_COPY')"));
assert(runner.includes("if (mode === 'quiz-recovery')"));
assert(runner.includes("else args.push('-skip-testing:Probe97UITests/MatchrimOffline220Tests/testIncompleteQuizRecovery276')"));
assert(source.includes("if (location.protocol !== 'capacitor:')"));
assert(!fs.readFileSync('index.html', 'utf8').includes('qa276'));
console.log(JSON.stringify({ passed: true, validOwnerAndAlternateDiscovery: true,
  wrongStateVariantsRejected: 8, noDispatchRejected: true, ambiguousOwnerRejected: true,
  cyclesBounded: true, discoveryStateWrites: sample.calls.length, productInjection: false,
  externalCalls: 0, nativeRuntime: 'NOT_EXECUTED_BY_THIS_CHECK' }));
