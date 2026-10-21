import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as money from '../src/utils/scanMoney.ts';
import * as comparison from '../src/utils/wineComparison.ts';

let native = false;
const element = tag => ({ children, asChild: _asChild, onValueChange: _onValueChange, onCheckedChange: _onCheckedChange, ...props }) =>
  React.createElement(tag, props, children);
const ui = Object.fromEntries(['Select','SelectContent','SelectItem','SelectTrigger','SelectValue'].map(name => [name, element('div')]));
const dependencies = {
  react: React, 'react/jsx-runtime': jsx,
  '@capacitor/core': { Capacitor: { isNativePlatform: () => native } },
  'lucide-react': Object.fromEntries(['Coins','BriefcaseBusiness','Scale','ShieldCheck','UserRound'].map(name => [name, element('svg')])),
  '@/utils/scanMoney': money, '@/utils/wineComparison': comparison,
  '@/components/ui/checkbox': { Checkbox: element('button') },
  '@/components/ui/input': { Input: element('input') },
  '@/components/ui/label': { Label: element('label') }, '@/components/ui/select': ui,
};
const load = source => {
  const sandbox = { exports: {}, require: id => { assert(Object.hasOwn(dependencies, id), id); return dependencies[id]; } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText, sandbox);
  return sandbox.exports.WineComparisonWorkspace;
};
const file = 'src/components/wine-import/WineComparisonWorkspace.tsx';
const current = load(fs.readFileSync(file, 'utf8'));
const previous = load(execFileSync('git', ['show','ba74ee1:' + file], { encoding: 'utf8' }));
const wines = Array.from({ length: 6 }, (_, i) => ({ id: 'synthetic135-' + i, name: 'Synthetic Reference ' + i,
  producer: 'Synthetic Estate', affinity: 40 + i * 8, confidence: .8, identityConfirmed: true,
  attributes: { body: 3, acidity: 4, tannin: 2, sweetness: 1, fruit: 3 },
  price: 24 + i, currency: 'EUR', service: 'both', prices: { glass: 6, bottle: 24 + i } }));
const render = (component, data) => renderToStaticMarkup(React.createElement(component, { wines: data }));
for (const data of [[], wines.slice(0,1), wines.slice(0,2), wines,
  wines.map(wine => ({ ...wine, affinity: null, price: null, prices: undefined }))]) {
  native = false;
  assert.equal(render(current, data), render(previous, data), 'Actual current web HTML remains identical without source projection');
}
native = true;
const html = render(current, wines);
assert(html.includes('scroll-margin-top:calc(var(--matchrim-safe-top) + 144px)'));
assert(!render(previous, wines).includes('scroll-margin-top'));
console.log(JSON.stringify({ webHTMLParityCases: 5, nativeScrollStylePresent: true,
  scope: 'Actual component/server markup with synthetic wines and lightweight UI wrappers; no browser pixels, UIKit or taste claim.' }));
