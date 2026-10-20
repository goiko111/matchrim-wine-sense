import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import { restoreMenuHeaderStack96, restoreMenuHeaderStackPackage96 } from './check-matchrim-menu-header-stack96.mjs';
import { restoreNativeLabelGuard97 } from './native-label97-scope.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = '954a7141840b77ce8cb07bb31190fbe821441ddc';
const component = 'src/components/wine-import/WineMenuScanner.tsx';
const old = name => execFileSync('git', ['show', `${baseline}:${name}`], { cwd: root, encoding: 'utf8' });
const once = (value, from, to) => {
  assert.equal(value.split(from).length, 2, 'One exact reviewed keyboard fragment');
  return value.replace(from, to);
};
const oldClass = 'className="matchrim-soft-surface rounded-lg p-0 sm:p-4"';
const newClass = "className={isNative ? 'matchrim-native-menu-editor-body matchrim-soft-surface rounded-lg p-0 sm:p-4' : 'matchrim-soft-surface rounded-lg p-0 sm:p-4'}";
export const MENU_EDITOR_KEYBOARD96_SELECTOR = 'html.matchrim-native-platform.matchrim-keyboard-visible .matchrim-native-menu-editor-body input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"])';
export const MENU_EDITOR_KEYBOARD96_RULE = `\n  ${MENU_EDITOR_KEYBOARD96_SELECTOR} {\n    padding-top: 2px;\n    padding-bottom: 2px;\n  }\n`;
export const MENU_EDITOR_KEYBOARD96_TAIL = ' && node scripts/check-matchrim-menu-editor-keyboard96.mjs';

export function restoreMenuEditorKeyboard96(source) {
  const before = old(component);
  if (source === before) return source;
  source = restoreMenuHeaderStack96(source);
  source = once(source, newClass, oldClass);
  assert.equal(source, before, 'Whole954 component: only one native class; all web JSX, data, callbacks, keyboard/scroll logic exact');
  return source;
}
export function restoreMenuEditorKeyboardCss96(css) {
  const before = old('src/index.css');
  if (css === before) return css;
  css = once(css, MENU_EDITOR_KEYBOARD96_RULE, '');
  assert.equal(css, before, 'Whole954 CSS: existing Cellar rule, fonts, 44 minimum, widths and other states exact');
  return css;
}
export function restoreMenuEditorKeyboardPackage96(source) {
  const before = old('package.json');
  if (source === before) return source;
  source = restoreMenuHeaderStackPackage96(source);
  const command = JSON.parse(before).scripts['test:closure96'];
  source = once(source, command + MENU_EDITOR_KEYBOARD96_TAIL, command);
  assert.equal(source, before, 'Only additive closure96 leaf, no old assertion/dependency/command change');
  return source;
}
const guardChanges = {
  'scripts/check-matchrim-menu-list-jump96.mjs': [
    ["import { restoreMenuEditorKeyboard96, restoreMenuEditorKeyboardPackage96, restoreMenuEditorKeyboardGuard96 } from './check-matchrim-menu-editor-keyboard96.mjs';\n", ''],
    ['  source = restoreMenuEditorKeyboard96(source);\n', ''],
    ['  source = restoreMenuEditorKeyboardPackage96(source);\n', ''],
    ["const source = restoreMenuEditorKeyboard96(fs.readFileSync(path.join(root,file),'utf8')),checks=[];", "const source = fs.readFileSync(path.join(root,file),'utf8'),checks=[];"],
    ["  if (name === 'scripts/check-matchrim-menu-edit-shortcut96.mjs') source = restoreMenuEditorKeyboardGuard96(name, source);\n", ''],
  ],
  'scripts/check-matchrim-scan-privacy96.mjs': [
    ["import { restoreMenuEditorKeyboardCss96 } from './check-matchrim-menu-editor-keyboard96.mjs';\n", ''],
    ["  if (css.includes('.matchrim-native-menu-editor-body')) css = restoreMenuEditorKeyboardCss96(css);\n", ''],
  ],
  'scripts/check-matchrim-native-menu-entry-bridge96.mjs': [
    ["import { restoreMenuEditorKeyboardGuard96 } from './check-matchrim-menu-editor-keyboard96.mjs';\n", ''],
    ["  if (file === 'scripts/check-matchrim-scan-privacy96.mjs') value = restoreMenuEditorKeyboardGuard96(file, value);\n", ''],
  ],
  'scripts/check-matchrim-menu-edit-shortcut96.mjs': [
    ["import { restoreMenuEditorKeyboardGuard96 } from './check-matchrim-menu-editor-keyboard96.mjs';\n", ''],
    ["  if (name === 'scripts/check-matchrim-native-menu-entry-bridge96.mjs') value = restoreMenuEditorKeyboardGuard96(name, value);\n", ''],
  ],
};
export function restoreMenuEditorKeyboardGuard96(name, source) {
  source = restoreNativeLabelGuard97(name, source);
  assert(Object.hasOwn(guardChanges, name), 'No unrelated guard projection');
  const before = old(name);
  if (source === before) return source;
  for (const [from, to] of guardChanges[name]) source = once(source, from, to);
  assert.equal(source, before, 'Whole954 guard inverse; no assertion, count, mutation or baseline dropped');
  return source;
}
function nodes(source) {
  const tree = ts.createSourceFile(component, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), all = [];
  const visit = node => { all.push(node); ts.forEachChild(node, visit); }; visit(tree);
  return { tree, all };
}
function classRender(source, isNative) {
  const { tree, all } = nodes(source);
  const attrs = all.filter(n => ts.isJsxAttribute(n) && n.name.getText(tree) === 'className'
    && n.getText(tree).includes('matchrim-soft-surface rounded-lg p-0 sm:p-4'));
  assert.equal(attrs.length, 1);
  const attr = attrs[0], expression = ts.isStringLiteral(attr.initializer) ? JSON.stringify(attr.initializer.text) : attr.initializer.expression.getText(tree);
  const context = vm.createContext({ isNative, React });
  vm.runInContext('globalThis.output=React.createElement("div",{className:' + expression + '},"Identidad")', context);
  return renderToStaticMarkup(context.output);
}
export function runMenuEditorKeyboard96() {
  const source = fs.readFileSync(root + component, 'utf8'), css = fs.readFileSync(root + 'src/index.css', 'utf8'), checks = [];
  const test = (name, run) => { run(); checks.push(name); };
  test('Explicit954 component SHA', () => assert.equal(createHash('sha256').update(old(component)).digest('hex'), '3448dd5d21bf421e6598b0b228b65483019ea6caa61f96d35433e85c59f07795'));
  test('Whole954 component inverse including all handlers/data/scroll closures', () => restoreMenuEditorKeyboard96(source));
  test('Whole954 CSS inverse, no existing Cellar or global input change', () => restoreMenuEditorKeyboardCss96(css));
  test('Old source/CSS positive controls', () => { restoreMenuEditorKeyboard96(old(component)); restoreMenuEditorKeyboardCss96(old('src/index.css')); });
  test('Actual conditional class render: web exact and native retains every old class', () => {
    assert.equal(classRender(source, false), classRender(old(component), false));
    assert.equal(classRender(source, true), classRender(old(component), true).replace('class="', 'class="matchrim-native-menu-editor-body '));
  });
  test('One selector only under exact max-height240 and keyboard/native/editor conditions, padding only', () => {
    const parsed = postcss.parse(css), rules = [];
    parsed.walkRules(rule => { if (rule.selector.includes('matchrim-native-menu-editor-body')) rules.push(rule); });
    assert.equal(rules.length, 1); const rule = rules[0];
    assert.equal(rule.selector, MENU_EDITOR_KEYBOARD96_SELECTOR);
    assert.equal(rule.parent.name, 'media'); assert.equal(rule.parent.params, '(max-height: 240px)');
    assert.deepEqual(rule.nodes.map(n => [n.prop, n.value, n.important]), [['padding-top', '2px', undefined], ['padding-bottom', '2px', undefined]]);
  });
  test('Seven actual identity Inputs and price component unchanged; no new wrapper or controller', () => {
    const { tree, all } = nodes(source), form = all.filter(n => ts.isJsxExpression(n) && n.getText(tree).startsWith('{isEditing && ('));
    assert.equal(form.length, 1); const text = form[0].getText(tree);
    assert.equal((text.match(/<Input\b/g) || []).length, 7);
    assert.equal((text.match(/<MenuPriceEditor\b/g) || []).length, 1);
    assert.equal((source.match(/matchrim-native-menu-editor-body/g) || []).length, 1);
    assert.equal(text.replace(newClass, oldClass), nodes(old(component)).all.find(n => ts.isJsxExpression(n) && n.getText().startsWith('{isEditing && (')).getText());
  });
  test('Exact package tail preserves all historical commands', () => restoreMenuEditorKeyboardPackage96(fs.readFileSync(root + 'package.json', 'utf8')));
  for (const name of Object.keys(guardChanges)) {
    const value = fs.readFileSync(root + name, 'utf8');
    test('Complete954 guard inverse: ' + name, () => restoreMenuEditorKeyboardGuard96(name, value));
    test('Reject undeclared guard edit: ' + name, () => assert.throws(() => restoreMenuEditorKeyboardGuard96(name, value + '\n// unreviewed\n')));
  }
  const sourceMutations = [[newClass, newClass.replace('isNative ?', 'true ?')], [newClass, newClass.replace(" : 'matchrim-soft-surface", " : 'matchrim-native-menu-editor-body matchrim-soft-surface")],
    ['onChange={(event) => updateScannedWine(index, { nombre: event.target.value })}', 'onChange={() => updateScannedWine(index, { nombre: "changed" })}'],
    ['onClick={goToWineList}', 'onClick={() => openWineDetail(0)}']];
  for (const [from, to] of sourceMutations) test('Reject source mutation: ' + from.slice(0, 70), () => { assert(source.includes(from)); assert.throws(() => restoreMenuEditorKeyboard96(source.replace(from, to))); });
  const cssMutations = [['.matchrim-native-platform.matchrim-keyboard-visible .matchrim-native-menu-editor-body', '.matchrim-native-platform .matchrim-native-menu-editor-body'],
    ['(max-height: 240px)', '(max-height: 241px)'], [MENU_EDITOR_KEYBOARD96_RULE, MENU_EDITOR_KEYBOARD96_RULE.replace('padding-top: 2px;', 'padding-top: 1px;')],
    [MENU_EDITOR_KEYBOARD96_RULE, MENU_EDITOR_KEYBOARD96_RULE.replace('input:not([type="checkbox"])', 'input')],
    [MENU_EDITOR_KEYBOARD96_RULE, MENU_EDITOR_KEYBOARD96_RULE.replace('padding-bottom: 2px;', 'padding-bottom: 2px;\n    font-size: 14px;')],
    ['min-height: 44px;', 'min-height: 43px;']];
  for (const [from, to] of cssMutations) test('Reject CSS mutation: ' + from.slice(0, 70), () => { assert(css.includes(from)); assert.throws(() => restoreMenuEditorKeyboardCss96(css.replace(from, to))); });
  return { passed: checks.length, failed: 0, checks, sourceMutations: sourceMutations.length, cssMutations: cssMutations.length,
    whole954Inverse: true, webClassSSRExact: true, oldAssertionsRemoved: 0, SDK: 0, externalCalls: 0,
    qualification: 'Source/SSR/CSS proof only. Browser controlled font/rem counterfactual and UIKit keyboard physics are separate; no native runtime PASS inherited.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(runMenuEditorKeyboard96()));
