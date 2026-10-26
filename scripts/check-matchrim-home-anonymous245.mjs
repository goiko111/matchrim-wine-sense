import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import postcss from 'postcss';

const module = { exports: {} }, routes = [];
const jsx = (type, props) => ({ type, props: props ?? {} });
const source = fs.readFileSync('src/components/NativeHome98.tsx', 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
} }).outputText, { module, exports: module.exports, require: id => id === 'react'
  ? { useState: () => [false, () => {}] } : id === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
    : id === 'react-router-dom' ? { useNavigate: () => route => routes.push(route) } : {} });
const flatten = node => node && typeof node === 'object'
  ? [node, ...[node.props.children].flat(Infinity).flatMap(flatten)] : [];
const text = node => typeof node === 'string' ? node : node && typeof node === 'object'
  ? [node.props.children].flat(Infinity).map(text).join(' ') : '';
const checks = [];
for (const [ownerId, hasProfile, readError, label, expected] of [
  [null, true, null, 'Mis gustos', '/matchrim'],
  [null, false, null, 'Conocer mis gustos', '/matchrim'],
  ['synthetic-owner245', true, null, 'Mis gustos', '/profile'],
  ['synthetic-owner245', false, 'profile', 'Mis gustos', '/profile'],
]) {
  const tree = module.exports.NativeHome98({ ownerId, hasProfile, readError, loading: false,
    unavailable: false, exhausted: false, recommendations: [], profile: null, recent: [], detail: null,
    onSelect() {}, onRetry() {} });
  const button = flatten(tree).find(node => node.type === 'button' && text(node).trim() === label);
  assert(button, label); button.props.onClick(); const actual = routes.pop();
  checks.push({ ownerId, hasProfile, readError, actual, expected, passed: actual === expected });
}
const profile = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
assert(profile.includes('navigate(') && profile.includes('if (!user)'), 'Profile page is account-bound');
const passed = checks.every(check => check.passed);
const css = postcss.parse(fs.readFileSync('src/index.css', 'utf8'));
const padding = new Map();
css.walkRules(rule => {
  if (['html.matchrim-native-platform .matchrim-quiz-page', 'html.matchrim-native-platform .matchrim-quiz-page > .container:last-child'].includes(rule.selector))
    rule.walkDecls('padding-bottom', declaration => padding.set(rule.selector, declaration.value));
});
assert.equal(padding.get('html.matchrim-native-platform .matchrim-quiz-page'), 'calc(var(--matchrim-bottom-nav-height, calc(88px + var(--matchrim-safe-bottom))) + 16px)');
assert.equal(padding.get('html.matchrim-native-platform .matchrim-quiz-page > .container:last-child'), '16px');
console.log(JSON.stringify({ passed, checks, externalCalls: 0,
  nativeOnlyMeasuredFooterPadding: true,
  scope: 'Actual native Home view handlers with inert leaves and parsed native-only quiz padding rules. Anonymous local quiz must reopen its existing result, not the account-bound Profile page. Not authentication, RLS or native runtime proof.' }));
if (!passed) process.exitCode = 1;
