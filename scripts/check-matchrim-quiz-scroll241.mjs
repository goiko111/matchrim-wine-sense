import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { execFileSync } from 'node:child_process';

const file = 'src/components/QuizQuestion.tsx';
const source = fs.readFileSync(file, 'utf8');
const output = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
  esModuleInterop: true,
} }).outputText;
let native = true, heading, effect, dependencies;
const calls = [];
const react = { createElement: () => null, useRef: () => ({ current: heading }),
  useEffect: (callback, deps) => { effect = callback; dependencies = deps; } };
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, require: id => id === 'react'
  ? { __esModule: true, default: react, ...react }
  : id === '@capacitor/core' ? { Capacitor: { isNativePlatform: () => native } } : {} });
const Component = module.exports.default;
const props = id => ({ question: { id, image: '', text: 'Controlled question' }, currentAnswer: '',
  currentQuestionIndex: 0, totalQuestions: 20, isFirst: true, isLast: false });
heading = { closest: selector => { calls.push(['closest', selector]); return {
  scrollIntoView: options => calls.push(['scroll', { ...options }]),
}; }, focus: options => calls.push(['focus', { ...options }]) };
Component(props(1)); effect();
assert.deepEqual(calls, [['closest', 'section'], ['scroll', { block: 'start', behavior: 'instant' }], ['focus', { preventScroll: true }]]);
assert.deepEqual([...dependencies], [true, 1]);
Component(props(2)); assert.deepEqual([...dependencies], [true, 2]);
calls.length = 0; native = false; Component(props(2)); effect(); assert.deepEqual(calls, []);
native = true; heading = null; Component(props(3)); assert.doesNotThrow(() => effect());
const prior = execFileSync('git', ['show', `812ef9b:${file}`], { encoding: 'utf8' });
assert.equal(source.slice(source.lastIndexOf('  return (')), prior.slice(prior.lastIndexOf('  return (')));
console.log(JSON.stringify({ passed: true, groups: 4, nativeSectionBeforeFocus: true,
  questionChangeDependency: true, webAndNullSafe: true, legacyJSXUnchanged: true,
  scope: 'Actual component hook expressions with controlled DOM refs; not native scroll or VoiceOver approval.' }));
