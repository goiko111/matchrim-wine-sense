import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), React = require('react');
const source = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
const tree = ts.createSourceFile('Profile.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let clamp, callback;
const visit = node => {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'clampProfileValue') clamp = node.getText(tree);
  if (ts.isCallExpression(node) && node.expression.getText(tree) === 'chartData.map') callback = node.arguments[0].getText(tree);
  ts.forEachChild(node, visit);
};
visit(tree); assert(clamp); assert(callback);
const code = ts.transpileModule(`const ${clamp};\nexports.render = (item, isNative, hasLearnedProfile) => (${callback})(item);`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const sandbox = { exports: {}, Number, Math,
  require: name => { assert.equal(name, 'react/jsx-runtime'); return require(name); } };
vm.runInNewContext(code, sandbox);
const walk = node => Array.isArray(node) ? node.flatMap(walk) : React.isValidElement(node)
  ? [node, ...walk(node.props.children)] : [];
const render = (activeValue, baseValue = activeValue, native = true, learned = false, attribute = 'Potente') =>
  walk(sandbox.exports.render({ attribute, activeValue, baseValue }, native, learned));
let groups = 0;
const test = (name, work) => { work(); groups++; console.log('PASS ' + name); };
test('Native zero is announced by a nonzero-width track, not the invisible zero-width fill', () => {
  const nodes = render(0), meter = nodes.find(node => node.props.role === 'meter'); assert(meter);
  assert.equal(meter.type, 'div'); assert.equal(meter.props['aria-valuenow'], 0);
  assert.equal(meter.props.style?.width, undefined);
  const fill = nodes.find(node => node.props.style?.width === '0%'); assert(fill);
  assert.equal(fill.props['aria-hidden'], true); assert.equal(fill.props['aria-label'], undefined);
});
test('Every native axis preserves exact numbers while declaring a 0-to-5 meter range', () => {
  for (const label of ['Potente', 'Acidez', 'Dulce', 'Tánico', 'Afrutado']) {
    for (const value of [0, .01, .4, .75, 1, 1.25, 2.333333, 3.6, 4.999, 5]) {
      const meter = render(value, value, true, false, label).find(node => node.props.role === 'meter');
      assert.equal(meter.props['aria-valuenow'], value);
      assert.equal(meter.props['aria-valuemin'], 0); assert.equal(meter.props['aria-valuemax'], 5);
      assert.equal(meter.props['aria-label'], `${label}: perfil actual`);
      assert.equal(meter.props.tabIndex, undefined, 'Read-only data is not an extra keyboard control');
    }
  }
});
test('Learned/current comparison includes the real initial value, including zero', () => {
  const meter = render(5, 0, true, true).find(node => node.props.role === 'meter');
  assert.equal(meter.props['aria-valuetext'], '5 de 5; test inicial: 0 de 5');
});
test('Speech formatting is concise Spanish, without changing the numeric source', () => {
  const meter = render(2.333333).find(node => node.props.role === 'meter');
  assert.equal(meter.props['aria-valuenow'], 2.333333); assert.equal(meter.props['aria-valuetext'], '2,3 de 5');
});
test('Web keeps the prior inner label, fills and absence of new meter semantics', () => {
  const nodes = render(3.6, 2, false, true);
  assert.equal(nodes.some(node => node.props.role === 'meter'), false);
  const fill = nodes.find(node => node.props['aria-label'] === 'Potente: perfil activo 3.6 de 5'); assert(fill);
  assert.equal(fill.props['aria-hidden'], undefined);
});
console.log(JSON.stringify({ groups, nativeAxisValueCases: 50, models: 0, networkCalls: 0,
  scope: 'Actual Profile chart callback AST/React props; semantic contract only, not a physical VoiceOver approval.' }));
