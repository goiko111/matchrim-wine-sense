import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jsx from 'react/jsx-runtime';

const base = '3abfd07';
const files = ['src/components/NativeAffinitySummary.tsx', 'src/components/CellarReferenceStyle110.tsx',
  'src/components/CellarWineAffinity.tsx'];
const visible = node => Array.isArray(node) ? node.map(visible).join('') : React.isValidElement(node)
  ? visible(node.props.children) : node == null || typeof node === 'boolean' ? '' : String(node);
const normalized = node => visible(node).trim().replace(/\s+/g, ' ');
const icon = () => null;
const render = (expression, values) => {
  const context = { exports: {}, ChevronDown: icon, CircleHelp: icon, ...values,
    require: name => { assert.equal(name, 'react/jsx-runtime'); return jsx; } };
  vm.runInNewContext(ts.transpileModule('exports.element = ' + expression + ';', {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  return context.exports.element;
};
const elements = (source, tag) => {
  const tree = ts.createSourceFile('component.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches = [];
  const visit = node => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === tag) matches.push(node.getText(tree));
    ts.forEachChild(node, visit);
  };
  visit(tree); return matches;
};
let disclosureCases = 0, scoreCases = 0, initialCases = 0;
for (const file of files) {
  const current = fs.readFileSync(file, 'utf8');
  const previous = execFileSync('git', ['show', base + ':' + file], { encoding: 'utf8' });
  const oldSummaries = elements(previous, 'summary'), summaries = elements(current, 'summary');
  assert.equal(summaries.length, oldSummaries.length);
  for (let i = 0; i < summaries.length; i++) {
    const old = render(oldSummaries[i], {}), item = render(summaries[i], {});
    assert.equal(item.props['aria-label'], normalized(old));
    assert.equal(normalized(item), normalized(old));
    assert(item.props.className.includes('min-h-11'));
    for (const child of React.Children.toArray(item.props.children)) {
      assert(React.isValidElement(child)); assert.equal(child.props['aria-hidden'], 'true');
    }
    disclosureCases++;
  }
  const oldInitial = elements(previous, 'p').filter(text => text.includes('view.initial.score'));
  const initials = elements(current, 'p').filter(text => text.includes('view.initial.score'));
  assert.equal(initials.length, oldInitial.length);
  for (let i = 0; i < initials.length; i++) for (const phase of ['saved', 'resolved']) {
    for (const score of [0, 66, 100]) for (const delta of [null, -5, 0, 5]) {
      const values = { view: { initial: { phase, score, recorded_at: '2026-10-21T12:00:00Z' }, delta } };
      const old = render(oldInitial[i], values), item = render(initials[i], values);
      assert.equal(normalized(item), normalized(old));
      const children = React.Children.toArray(item.props.children);
      assert.equal(children.length, 1); assert.equal(typeof children[0], 'string');
      assert.match(children[0], phase === 'saved' || file.includes('ReferenceStyle')
        ? /^Al guardar: / : /^Primera afinidad registrada: /);
      initialCases++;
    }
  }
  if (file.includes('ReferenceStyle')) {
    const old = elements(previous, 'p').find(text => text.includes('view.current'));
    const currentScore = elements(current, 'p').find(text => text.includes('view.current'));
    for (const score of [0, 66, 100]) {
      const values = { view: { current: score } }, item = render(currentScore, values);
      assert.equal(normalized(item), normalized(render(old, values)));
      const children = React.Children.toArray(item.props.children);
      assert.deepEqual(children, [`\u2248${score}/100 para ti`]); scoreCases++;
    }
  }
  if (file.includes('NativeAffinitySummary')) {
    const predicate = text => text.includes('Afinidad orientativa:');
    const old = elements(previous, 'p').find(predicate), currentScore = elements(current, 'p').find(predicate);
    for (const score of [0, 66, 100]) {
      const values = { result: { score } }, item = render(currentScore, values);
      assert.equal(normalized(item), normalized(render(old, values)));
      assert.equal(item.props['aria-label'], `Afinidad orientativa: ${score} de 100`);
      const children = React.Children.toArray(item.props.children);
      assert.equal(children.length, 1); assert.equal(children[0].props['aria-hidden'], 'true'); scoreCases++;
    }
  }
}
assert.equal(disclosureCases, 4); assert.equal(scoreCases, 6); assert.equal(initialCases, 48);
const require = createRequire(import.meta.url);
let activeView, resolves = 0;
const loadCellar = source => {
  const context = { exports: {}, require: name => {
    if (['react', 'react/jsx-runtime', 'lucide-react'].includes(name)) return require(name);
    if (name === 'react-router-dom') return { useNavigate: () => () => { throw Error('Unexpected navigation'); } };
    if (name === '@/components/ui/button') return { Button: ({ children, ...props }) => React.createElement('button', props, children) };
    if (name === '@/components/ui/progress') return { Progress: props => React.createElement('div', props) };
    if (name === './AffinityExplanation') return { AffinityExplanation: () => null };
    if (name === '@/utils/scanProfile') return { canRetryScanProfile: () => false };
    if (name === '@/utils/bodegaAffinity') return { cellarAffinityView: () => activeView };
    if (name === '@/utils/cellarReferenceStyle110') return { cellarReferenceStyleView110: () => null };
    if (name === './CellarReferenceStyle110') return { CellarReferenceStyle110: () => { throw Error('Unexpected style branch'); } };
    throw Error('Unexpected test import: ' + name);
  } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.exports.CellarWineAffinity;
};
const cellarFile = files[2], currentCellar = loadCellar(fs.readFileSync(cellarFile, 'utf8'));
const oldCellar = loadCellar(execFileSync('git', ['show', base + ':' + cellarFile], { encoding: 'utf8' }));
let ratingCases = 0;
for (const rating of [undefined, null, '', 'unknown', '__proto__', 'love', 'ok', 'not_for_me']) {
  for (const current of [null, 0, 71, 100]) {
    activeView = { current, initial: null, delta: null, attributes: null, reason: 'Controlled missing fiche' };
    const props = { wine: { id: 'unit145', name: 'Controlled wine', rating },
      snapshot: { status: 'ready', profile: {}, source: 'learned' }, resolving: false,
      onResolve: () => { resolves++; }, onRetryProfile: () => { throw Error('Unexpected retry'); } };
    const render = component => renderToStaticMarkup(React.createElement(component, props));
    const previous = render(oldCellar), html = render(currentCellar);
    assert.equal(html.replace(/<[^>]*>/g, ''), previous.replace(/<[^>]*>/g, ''));
    const rated = ['love', 'ok', 'not_for_me'].includes(rating);
    assert.equal(html.includes('<details'), rated);
    assert(!/<details[^>]*\sopen(?:[\s=>])/.test(html));
    if (current === null) { assert(html.includes('Por calcular')); assert(!html.includes('aria-valuenow=')); }
    else {
      assert(html.includes(`aria-valuenow="${current}"`));
      if (rated) assert(html.indexOf(`${current}/100`) > html.indexOf('<details'));
    }
    ratingCases++;
  }
}
assert.equal(resolves, 0); assert.equal(ratingCases, 32);
const host = fs.readFileSync('src/pages/MyWines.tsx', 'utf8');
assert.match(host, /\{isNative && <CellarWineAffinity wine=\{wine\}/);
assert.equal((host.match(/<CellarWineAffinity /g) || []).length, 1);
console.log(JSON.stringify({ disclosureCases, scoreCases, initialCases, ratingCases, networkCalls: 0, applicationWrites: 0,
  scope: 'Actual native-only JSX evaluated against unchanged visible labels at3abfd07. Scores/initials form single text children; summaries and decorated scores expose one explicit label. UIKit AX/touch/VoiceOver speech still require runtime verification.' }));
