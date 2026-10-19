import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url)), require = createRequire(root + 'package.json');
const ts = require('typescript'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const file = 'src/components/ScanPrivacyGate.tsx';
const before = execFileSync('git', ['show', `8af2104:${file}`], { cwd: root, encoding: 'utf8' });
const parse = source => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const tags = source => {
  const result = [], ast = parse(source);
  const visit = node => { if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) result.push(node); ts.forEachChild(node, visit); }; visit(ast);
  return { ast, result };
};
export function restoreNativeScanPrivacy96(source) {
  assert.equal(createHash('sha256').update(source).digest('hex'), '52cde3aa52c41a2f1ee23610ef0ce5275534a09ac2e325e33372397bfb5215fe', 'Only this reviewed native layout candidate');
  const old = tags(before), now = tags(source); assert.equal(now.result.length, old.result.length);
  const edits = [];
  for (let i = 0; i < now.result.length; i++) {
    const node = now.result[i], prior = old.result[i];
    assert.equal(node.tagName.getText(now.ast), prior.tagName.getText(old.ast));
    const priorAttrs = new Map(prior.attributes.properties.map(attr => [attr.name.getText(old.ast), attr.getText(old.ast)]));
    for (const attr of node.attributes.properties) {
      const name = attr.name.getText(now.ast), original = priorAttrs.get(name), actual = attr.getText(now.ast);
      if (actual === original) continue;
      assert.ok(['className', 'style', 'aria-hidden', 'focusable'].includes(name));
      assert.ok(ts.isJsxAttribute(attr) && ts.isJsxExpression(attr.initializer) && ts.isConditionalExpression(attr.initializer.expression));
      const conditional = attr.initializer.expression;
      assert.equal(conditional.condition.getText(now.ast), 'isNative');
      if (original) {
        const oldAttr = prior.attributes.properties.find(p => p.name.getText(old.ast) === name);
        assert.equal(conditional.whenFalse.text, oldAttr.initializer.text);
        edits.push([attr.getStart(now.ast), attr.end, original]);
      } else {
        assert.equal(conditional.whenFalse.getText(now.ast), 'undefined');
        assert.equal(source[attr.getStart(now.ast) - 1], ' ');
        edits.push([attr.getStart(now.ast) - 1, attr.end, '']);
      }
    }
  }
  for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0])) source = source.slice(0, start) + text + source.slice(end);
  for (const line of ["import { Capacitor } from '@capacitor/core';\n", '  const isNative = Capacitor.isNativePlatform();\n']) { assert.equal(source.split(line).length, 2); source = source.replace(line, ''); }
  assert.equal(source, before, 'Whole8af source: all notice text, consent, session/storage and listeners unchanged');
  return source;
}
function host(source, native, { stored = null, readError = false, writeError = false } = {}) {
  let cursor = 0; const slots = [], reads = [], writes = [], exports = {};
  const Checkbox = ({ checked, onCheckedChange: _change, ...props }) => React.createElement('button', { role: 'checkbox', 'aria-checked': checked, ...props });
  const Link = ({ to, ...props }) => React.createElement('a', { href: to, ...props });
  const hooks = { useState(init) { const i = cursor++; if (!(i in slots)) slots[i] = typeof init === 'function' ? init() : init; return [slots[i], value => { slots[i] = value; }]; } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, console: { warn() {} }, window: { localStorage: { getItem(key) { reads.push(key); if (readError) throw Error('denied'); return stored; }, setItem(key, value) { writes.push([key, value]); if (writeError) throw Error('denied'); stored = value; } } },
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return require(name);
      if (name === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
      if (name === 'lucide-react') return require(name);
      if (name === 'react-router-dom') return { Link };
      if (name.endsWith('/button')) return { Button: 'button' };
      if (name.endsWith('/checkbox')) return { Checkbox };
      throw Error(name);
    },
  });
  const children = React.createElement('strong', null, 'Controlled scanner child');
  const render = () => { cursor = 0; return exports.ScanPrivacyGate({ children }); };
  return { render, reads, writes };
}
const walk = node => Array.isArray(node) ? node.flatMap(walk) : React.isValidElement(node) ? [node, ...walk(node.props.children)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children) : typeof node === 'string' ? node : '';
export function runScanPrivacy96() {
  const source = readFileSync(root + file, 'utf8'), groups = [];
  const check = (name, run) => { run(); groups.push(name); };
  check('Exact native attributes inverse, whole8af consent/storage/session/copy and handlers byte identical', () => { restoreNativeScanPrivacy96(source); });
  check('Actual web SSR identical for fresh/accepted/read-error states', () => {
    for (const options of [{}, { stored: 'accepted' }, { readError: true }]) assert.equal(renderToStaticMarkup(host(source, false, options).render()), renderToStaticMarkup(host(before, false, options).render()));
  });
  check('Every notice paragraph/heading/link and action name remains visible and unchanged', () => {
    const a = host(source, true).render(), b = host(before, true).render();
    assert.equal(text(a), text(b)); assert.equal(walk(a).find(n => n.type === 'h2').props.id, 'scan-privacy-title');
    for (const tag of ['h2', 'p', 'label', 'span']) for (const node of walk(a).filter(n => n.type === tag)) assert.equal(node.props['aria-hidden'], undefined);
    assert.ok(renderToStaticMarkup(a).includes('href="/privacy"'));
  });
  check('Real checked gate: no write until exactly true, then original key/value once and child visible', () => {
    const h = host(source, true), action = () => walk(h.render()).find(n => n.type === 'button');
    assert.equal(action().props.disabled, true); action().props.onClick(); assert.equal(h.writes.length, 0);
    const checkbox = () => walk(h.render()).find(n => n.props.onCheckedChange);
    checkbox().props.onCheckedChange('indeterminate'); action().props.onClick(); assert.equal(h.writes.length, 0);
    checkbox().props.onCheckedChange(true); assert.equal(action().props.disabled, false); action().props.onClick();
    assert.deepEqual(h.writes, [['matchrim.scan_privacy_notice.v2', 'accepted']]); assert.equal(text(h.render()), 'Controlled scanner child');
  });
  check('Storage-denial behavior and already-accepted bypass remain original', () => {
    const h = host(source, true, { writeError: true }); walk(h.render()).find(n => n.props.onCheckedChange).props.onCheckedChange(true);
    walk(h.render()).find(n => n.type === 'button').props.onClick(); assert.equal(text(h.render()), 'Controlled scanner child');
    const prior = host(source, true, { stored: 'accepted' }); assert.equal(text(prior.render()), 'Controlled scanner child'); assert.equal(prior.writes.length, 0);
  });
  check('Native full-width single column, physical icons/checkbox/continue; no font-size cap', () => {
    const tree = host(source, true).render(); assert.ok(tree.props.className.includes('p-[12px]'));
    const all = walk(tree), icons = all.filter(n => n.props.style?.width === 20); assert.equal(icons.length, 4);
    for (const icon of icons) { assert.equal(icon.props.style.height, 20); assert.equal(icon.props['aria-hidden'], true); assert.equal(icon.props.focusable, false); }
    assert.ok(all.find(n => n.props.onCheckedChange).props.className.includes('h-[44px] w-[44px]'));
    assert.ok(all.find(n => n.type === 'button').props.className.includes('whitespace-normal'));
    assert.doesNotMatch(source, /fontSize|text-\[(?:\d+(?:px|rem))\]/);
  });
  let rejected = 0;
  check('Directed glyph/width/hidden-heading/consent/storage/default-web mutations reject', () => {
    for (const [from, to] of [['width: 20', 'width: 150'], ['h-[44px] w-[44px]', 'h-[43px] w-[43px]'], ['<h2 id="scan-privacy-title"', '<h2 aria-hidden="true" id="scan-privacy-title"'], ['if (!checked) return;', 'if (false) return;'], ["'accepted');", "'changed');"], ['La imagen y sus recortes', 'Different legal text'], ["'matchrim-surface rounded-lg p-4 sm:p-6'", "'web changed'"]]) {
      assert.ok(source.includes(from)); assert.throws(() => restoreNativeScanPrivacy96(source.replace(from, to))); rejected++;
    }
  });
  return { passed: groups.length, failed: 0, groups, rejectedMutations: rejected, whole8afInverse: true, webSSRExact: true, consentHandlersUnchanged: true, SDK: false, externalCalls: 0 };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(runScanPrivacy96()));
