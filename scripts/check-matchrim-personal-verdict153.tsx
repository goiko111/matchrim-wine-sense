import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { NativeAffinitySummary } from '../src/components/NativeAffinitySummary';
import { buildConsumerAffinity } from '../src/utils/consumerAffinity95';

const profile = { potente: 1.4, acidez: 4, dulce: 2, tanico: 1.1, afrutado: 3.3 };
const attributes = { scale: 'winerim-0-5' as const, potencia: 2, acidez: 4, dulzura: 1, taninos: 0, afrutado: 1 };
const titles = { love: 'Tu valoración: te encanta', ok: 'Tu valoración: correcto', not_for_me: 'Tu valoración: no es para ti' };
const require = createRequire(import.meta.url);
const oldContext = vm.createContext({ exports: {}, require: (name: string) => {
  if (name === '@/utils/consumerAffinity95') return { buildConsumerAffinity };
  if (['react/jsx-runtime', 'react-router-dom', 'lucide-react'].includes(name)) return require(name);
  throw Error('Unexpected summary import: ' + name);
} });
const oldSummary = execFileSync('git', ['show', '39fd92a:src/components/NativeAffinitySummary.tsx'], { encoding: 'utf8' });
vm.runInContext(ts.transpileModule(oldSummary, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
} }).outputText, oldContext);
let rated = 0, unknown = 0, singular = 0, previousParity = 0;
for (const score of [0, 44, 65, 80, 100]) {
  const input = { score, profile, attributes, sensorySource: 'catalog' as const, catalogIdentityLinked: true };
  const calculated = buildConsumerAffinity(input);
  assert.equal(calculated.state, 'ready');
  if (calculated.state !== 'ready') throw Error('Ready score required');
  for (const personalRating of Object.keys(titles) as Array<keyof typeof titles>) {
    const html = renderToStaticMarkup(<NativeAffinitySummary {...input} personalRating={personalRating} />);
    assert(html.includes(titles[personalRating]));
    assert(!html.includes(calculated.title), 'A forecast headline must not override a known personal verdict');
    assert(html.includes('El porcentaje compara estilos; no cambia tu valoración de este vino.'));
    assert(html.includes(`aria-label="Afinidad orientativa: ${score} de 100"`));
    assert.equal((html.match(/este vino [0-5]\.\d\/5/g) || []).length, 5);
    for (const match of calculated.matches) assert(html.includes(match));
    if (calculated.caution) assert(html.includes(calculated.caution));
    rated++;
  }
  const plain = renderToStaticMarkup(<NativeAffinitySummary {...input} />);
  assert.equal(plain, renderToStaticMarkup(React.createElement(oldContext.exports.NativeAffinitySummary, input)),
    'Unrated real-reference presentation remains byte-identical to the already validated148 summary');
  previousParity++;
  for (const personalRating of [null, undefined, '', 'foreign-or-unknown']) {
    assert.equal(renderToStaticMarkup(<NativeAffinitySummary {...input} personalRating={personalRating} />), plain);
    unknown++;
  }
}
for (const file of ['src/components/CellarWineAffinity.tsx', 'src/components/CellarReferenceStyle110.tsx']) {
  const source = readFileSync(file, 'utf8');
  const previous = execFileSync('git', ['show', '39fd92a:' + file], { encoding: 'utf8' });
  const initial = (code: string) => {
    const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const found: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'p'
        && node.getText(ast).includes('view.initial.score')) found.push(node.getText(ast));
      ts.forEachChild(node, visit);
    };
    visit(ast); assert.equal(found.length, 1); return found[0];
  };
  const render = (code: string, delta: number) => {
    const context = vm.createContext({ exports: {}, view: { initial: { phase: 'saved', score: 72,
      recorded_at: '2026-10-20T12:00:00Z' }, delta }, require: (name: string) => {
      assert.equal(name, 'react/jsx-runtime'); return jsx;
    } });
    vm.runInContext(ts.transpileModule('exports.element = ' + code, { compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
    } }).outputText, context);
    return renderToStaticMarkup(context.exports.element);
  };
  for (const delta of [-2, -1, 1, 2]) {
    const before = render(initial(previous), delta), after = render(initial(source), delta);
    assert.equal(after, Math.abs(delta) === 1 ? before.replace(' puntos', ' punto') : before);
    singular++;
  }
}
const cellar = readFileSync('src/components/CellarWineAffinity.tsx', 'utf8');
assert(cellar.includes('<NativeAffinitySummary personalRating={wine.rating} score={view.current}'));
assert(!cellar.includes('<AffinityExplanation'));
const parent = readFileSync('src/pages/MyWines.tsx', 'utf8');
assert.equal(parent.split('isNative && <CellarWineAffinity wine={wine}').length, 2,
  'Changed cellar presentation is native-only; the web child is unchanged');
const unchanged = ['src/utils/consumerAffinity95.ts', 'src/utils/wineAffinityExplanation.ts',
  'src/utils/bodegaAffinity.ts', 'src/utils/scanProfile.ts', 'src/services/matchrimScanProfile.ts'];
for (const file of unchanged) {
  assert.equal(readFileSync(file, 'utf8'), execFileSync('git', ['show', '39fd92a:' + file], { encoding: 'utf8' }),
    'Existing score, profile, owner and training calculations remain byte-exact: ' + file);
}
console.log(JSON.stringify({ ratedCases: rated, unknownCases: unknown, singularCases: singular, previousUnratedParityCases: previousParity,
  sourceScoreAndFactorsUnchanged: true, exactCalculationSources: unchanged.length, actualReactSSR: true, remoteCalls: 0, userWrites: 0,
  scope: 'Known saved verdict copy only; not scan-history lookup, empirical taste accuracy or UIKit approval.' }));
