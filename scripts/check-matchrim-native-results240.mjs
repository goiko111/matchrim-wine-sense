import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { nativeTasteSummary240 } from '../src/utils/nativeTasteSummary240.ts';
import { getSafeRedirectPath } from '../src/utils/navigation.ts';

const checks = [], check = (name, run) => { run(); checks.push(name); };
const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'];
const all = n => Object.fromEntries(axes.map(key => [key, n]));
check('Zero, boundaries and decimals remain explicit preferences, not confidence percentages', () => {
  assert.equal(nativeTasteSummary240(all(0)).rows[2].description, 'Seco');
  assert.equal(nativeTasteSummary240(all(2)).rows[0].description, 'Ligero');
  assert.equal(nativeTasteSummary240(all(2.1)).rows[0].description, 'Intermedio');
  assert.equal(nativeTasteSummary240(all(4)).rows[0].description, 'Con cuerpo');
  assert.equal(nativeTasteSummary240(all(5)).rows[4].description, 'Intensa');
});
check('Invalid or partial profiles do not produce a taste claim', () => {
  for (const value of [NaN, Infinity, -1, 6, null, undefined, '3']) assert.equal(nativeTasteSummary240({ ...all(3), potente: value }), null);
  assert.equal(nativeTasteSummary240(null), null);
});
check('Fifty distinct input vectors retain all five exact values without mutation', () => {
  const seen = new Set();
  for (let index = 0; index < 50; index++) {
    const profile = Object.fromEntries(axes.map((key, axis) => [key,
      ((Math.floor(index / 21 ** axis) + (index % 21) * (axis + 1) + axis * 3) % 21) / 4]));
    const before = JSON.stringify(profile), result = nativeTasteSummary240(profile);
    seen.add(before); assert.equal(JSON.stringify(profile), before); assert.equal(result.rows.length, 5);
    for (const row of result.rows) assert.equal(row.value, profile[row.key]);
    assert(!result.summary.includes('%'));
  }
  assert.equal(seen.size, 50);
});
check('Native question counter is a single accessible text node; legacy question JSX stays unchanged', () => {
  const file = 'src/components/QuizQuestion.tsx', current = fs.readFileSync(file, 'utf8');
  const previous = execFileSync('git', ['show', `1ea9d93:${file}`], { encoding: 'utf8' });
  assert(current.includes('<span>{`Pregunta ${currentQuestionIndex + 1} de ${totalQuestions}`}</span>'));
  assert.equal(current.slice(current.lastIndexOf('  return (')), previous.slice(previous.lastIndexOf('  return (')));
});
const element = (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) });
const react = { __esModule: true, default: { createElement: element } };
const load = (file, require) => {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText, { exports: module.exports, module, require }, { timeout: 1000 });
  return module.exports.default;
};
let native = true;
const NativeMarker = () => null;
const Router = load('src/components/QuizResults.tsx', id => id === 'react' ? react
  : id === '@capacitor/core' ? { Capacitor: { isNativePlatform: () => native } }
    : id === './NativeQuizResults240' ? { __esModule: true, default: NativeMarker } : {});
check('Actual default export routes native away from legacy query hooks and web to original component', () => {
  const props = { result: all(3), onRestart() {} };
  assert.equal(Router(props).type, NativeMarker); assert.equal(Router(props).props.result, props.result);
  native = false; assert.equal(Router(props).type.name, 'QuizResults');
  const declaration = source => {
    const tree = ts.createSourceFile('results.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let text; const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'QuizResults') text = node.getText(tree); ts.forEachChild(node, visit); }; visit(tree); return text;
  };
  const previous = execFileSync('git', ['show', '1ea9d93:src/components/QuizResults.tsx'], { encoding: 'utf8' });
  assert.equal(declaration(fs.readFileSync('src/components/QuizResults.tsx', 'utf8')), declaration(previous));
});
const routes = [], Restart = () => {}, Button = () => {}, Passport = () => {};
const Component = load('src/components/NativeQuizResults240.tsx', id => {
  if (id === 'react') return react;
  if (id === 'react-router-dom') return { useNavigate: () => path => routes.push(path) };
  if (id === '@/utils/nativeTasteSummary240') return { nativeTasteSummary240 };
  if (id === '@/utils/navigation') return { getSafeRedirectPath };
  if (id === '@/components/ui/button') return { Button };
  if (id === './MatchrimPassport') return { __esModule: true, default: Passport };
  return {};
});
const flatten = node => node && typeof node === 'object' ? [node, ...node.children.flatMap(flatten)] : [];
const text = node => typeof node === 'string' ? node : node && typeof node === 'object' ? node.children.map(text).join(' ') : '';
check('Actual native result shows five preferences before a closed secondary sharing disclosure', () => {
  const tree = Component({ result: all(3), onRestart: Restart }), nodes = flatten(tree);
  assert(text(tree).includes('Tus preferencias')); assert.equal(nodes.filter(node => node.type === 'dt').length, 5);
  assert.equal(nodes.find(node => node.type === 'details').props.open, undefined);
  const buttons = nodes.filter(node => node.type === Button);
  buttons[0].props.onClick(); assert.equal(routes.pop(), '/escanear/etiqueta');
  buttons[1].props.onClick(); assert.equal(routes.pop(), '/restaurante');
  assert.equal(buttons[2].props.onClick, Restart);
});
check('Return navigation is local, pending saves disable restart and invalid profile reveals no code', () => {
  for (const returnTo of ['https://invalid.example', '//invalid.example', '/%2f%2finvalid.example']) {
    const tree = Component({ result: all(3), onRestart: Restart, returnTo, restartDisabled: true });
    const buttons = flatten(tree).filter(node => node.type === Button);
    buttons[0].props.onClick(); assert.equal(routes.pop(), '/escanear/etiqueta'); assert.equal(buttons[2].props.disabled, true);
  }
  const invalid = Component({ result: all(NaN), onRestart: Restart });
  assert.equal(flatten(invalid).some(node => node.type === Passport), false);
});
console.log(JSON.stringify({ passed: true, groups: checks.length, checks, syntheticProfiles: 50, externalCalls: 0,
  scope: 'Actual routing/component expressions and pure preference summaries with inert UI/router leaves; not native visual, real-user taste or live catalogue QA.' }));
