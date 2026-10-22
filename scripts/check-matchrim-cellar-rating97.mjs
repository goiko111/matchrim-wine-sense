import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { restoreNativeCellar97 } from './native-cellar97-scope.mjs';

const require = createRequire(import.meta.url), ts = require('typescript'), React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const file = new URL('../src/components/CellarWineAffinity.tsx', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
let current = 71, resolveCalls = 0;
const props = { wine: { id: 'synthetic-ui-only', name: 'Synthetic rating UI fixture' }, snapshot: { status: 'ready', profile: {}, source: 'learned' },
  resolving: false, onResolve: () => { resolveCalls++; }, onRetryProfile() {} };
const output = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.ReactJSX } }).outputText, {
  exports: output.exports,
  require(name) {
    if (name === 'react' || name === 'react/jsx-runtime' || name === 'lucide-react') return require(name);
    if (name === 'react-router-dom') return { useNavigate: () => () => {} };
    if (name === '@/components/ui/button') return { Button: ({ children, ...rest }) => React.createElement('button', rest, children) };
    if (name === '@/components/ui/progress') return { Progress: p => React.createElement('div', p) };
    if (name === './AffinityExplanation') return { AffinityExplanation: () => null };
    if (name === '@/utils/scanProfile') return { canRetryScanProfile: () => false };
    if (name === '@/utils/bodegaAffinity') return { cellarAffinityView: () => ({ current, initial: null, attributes: null, reason: 'Synthetic view only' }) };
    if (name === '@/utils/cellarReferenceStyle110') return { cellarReferenceStyleView110: () => null };
    if (name === './CellarReferenceStyle110') return { CellarReferenceStyle110: () => { throw new Error('Unexpected reference-style branch in exact-score regression'); } };
    throw new Error('Unexpected test import: ' + name);
  },
}, { filename: file.pathname, timeout: 2000 });
const render = rating => renderToStaticMarkup(React.createElement(output.exports.CellarWineAffinity, {
  ...props, wine: { ...props.wine, rating },
}));
const results = [];
function check(name, action) { action(); results.push(name); }
for (const rating of [undefined, null, '', 'unknown', '__proto__']) check('Unrated/unknown keeps existing calculation: ' + String(rating), () => {
  const html = render(rating); assert(!html.includes('<details')); assert(html.includes('Afinidad actual'));
  assert(html.includes('71/100')); assert(!html.includes('Ya sabes que'));
});
for (const [rating, text] of [['not_for_me', 'Ya sabes que no te gusta'], ['love', 'Ya sabes que te gusta'], ['ok', 'Te pareci\u00f3 correcto']]) {
  check('Actual saved rating precedes a closed style disclosure: ' + rating, () => {
    const html = render(rating); assert(html.includes(text));
    const details = html.indexOf('<details'), score = html.indexOf('71/100');
    assert(details >= 0 && score > details); assert(!html.slice(0, details).includes('71/100'));
    assert(!/<details[^>]*\sopen(?:[\s=>])/.test(html));
    assert(html.includes('Tu valoraci\u00f3n de este vino tiene prioridad.'));
    assert(html.includes('Ver afinidad por estilo')); assert(html.includes('min-h-11'));
    assert(html.includes('aria-valuenow="71"')); assert.equal((html.match(/71\/100/g) ?? []).length, 1);
  });
}
check('Missing sensory score stays missing even when a rating exists', () => {
  current = null; const html = render('not_for_me');
  assert(html.includes('Ya sabes que no te gusta')); assert(html.includes('Por calcular'));
  assert(!html.includes('aria-valuenow=')); assert(!html.includes('71/100')); current = 71;
});
check('The component remains restricted to the existing native MyWines branch', () => {
  const host = fs.readFileSync(new URL('../src/pages/MyWines.tsx', import.meta.url), 'utf8');
  assert.match(host, /\{isNative && <CellarWineAffinity wine=\{wine\}/);
  assert.equal((host.match(/<CellarWineAffinity /g) ?? []).length, 1);
  assert.equal(resolveCalls, 0);
});
check('Only native grid sizing changes; all previous web, write and training code remains exact', () => {
  const file = 'src/pages/MyWines.tsx', page = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const prior = execFileSync('git', ['show', '0031c703fe6d20ead4e8aab8d85c09b0fb8ae5b2:' + file], { encoding: 'utf8' });
  assert.equal(restoreNativeCellar97(file, page), restoreNativeCellar97(file, prior));
  assert.throws(() => restoreNativeCellar97(file, page + '\n// unreviewed change\n'));
  assert.throws(() => restoreNativeCellar97(file, page.replace('20rem', '2rem')));
});
console.log(JSON.stringify({ passed: results.length, failed: 0, results,
  scope: 'Actual native-only TSX with controlled calculated view. No taste accuracy, DB writes, profile or score formula changes.' }));
