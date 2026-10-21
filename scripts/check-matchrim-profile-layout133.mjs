import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';

const source = fs.readFileSync('src/components/NativeProfileLayout133.tsx', 'utf8');
let native = false;
const sandbox = { exports: {}, require: name => {
  if (name === 'react/jsx-runtime') return jsx;
  assert.equal(name, '@capacitor/core'); return { Capacitor: { isNativePlatform: () => native } };
} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText, sandbox);
assert.equal(renderToStaticMarkup(React.createElement(sandbox.exports.default)), '');
native = true;
const html = renderToStaticMarkup(React.createElement(sandbox.exports.default));
assert(html.startsWith('<style>') && html.endsWith('</style>'));
const css = postcss.parse(sandbox.exports.default().props.children);
let rules = 0;
css.walkRules(rule => {
  rules++;
  assert(rule.selector.startsWith('html.matchrim-native-platform'));
  assert(rule.selector.includes('.matchrim-profile133'));
});
assert(rules >= 12);
assert(!/text-size-adjust|pageZoom|display:\s*none[\s\S]*font-size:\s*0/.test(html));
const settings = css.nodes.find(rule => rule.selector?.endsWith('[aria-label="Ajustes de cuenta"]'));
assert(settings.nodes.some(decl => decl.prop === 'width' && decl.value === '44px'));
assert(settings.nodes.some(decl => decl.prop === 'height' && decl.value === '44px'));
assert(css.nodes.some(rule => rule.selector?.endsWith(' .grid')
  && rule.nodes.some(decl => decl.prop === 'grid-template-columns' && decl.value === 'minmax(0, 1fr)')));
css.walkRules(rule => {
  if (rule.selector.includes('.matchrim-accessibility-text'))
    assert(!rule.nodes.some(decl => decl.prop === 'font-size'), 'Larger text must not reduce a heading font at the accessibility threshold');
});
console.log(JSON.stringify({ rules, webMarkupEmpty: true, sourceContractOnly: true,
  scope: 'Native-only CSS isolation/fixed icon target and stacked layout. Actual Dynamic Type, touch/VoiceOver and visual results require native QA.' }));
