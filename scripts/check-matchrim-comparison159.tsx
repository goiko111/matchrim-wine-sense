import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as money from '../src/utils/scanMoney';
import * as comparison from '../src/utils/wineComparison';
import { personalVerdictTitle159 } from '../src/utils/nativeRescanVerdict159';

globalThis.fetch = async () => { throw Error('NO_LIVE_NETWORK'); };
const oldLogic = execFileSync('git', ['show', '233442a:src/utils/wineComparison.ts'], { encoding: 'utf8' });
const prior = { exports: {}, require: (name: string) => { assert.equal(name, './scanMoney'); return money; } };
vm.runInNewContext(ts.transpileModule(oldLogic, { compilerOptions: { module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022 } }).outputText, prior);
const oldDecision = (prior.exports as typeof comparison).buildWineComparisonDecision;
const wines: comparison.ComparableWine[] = [
  { id: 'a', name: 'Rechazado conocido', producer: 'Ejemplo A', affinity: 100, confidence: 1,
    identityConfirmed: true, personalRating: 'not_for_me', price: 10, currency: 'EUR', service: 'bottle' },
  { id: 'b', name: 'Otro vino', producer: 'Ejemplo B', affinity: 55, confidence: .8,
    identityConfirmed: true, price: 15, currency: 'EUR', service: 'bottle' },
];
let directed = 0, parity = 0;
for (const priority of ['affinity', 'certainty', 'value'] as const) {
  for (const serviceFormat of ['any', 'bottle', 'glass'] as const) {
    const context: comparison.WineComparisonContext = { mode: 'personal', priority, budget: 20,
      budgetCurrency: 'EUR', serviceFormat };
    const result = comparison.buildWineComparisonDecision(wines, context);
    assert.equal(result.primary?.wine.id, 'b');
    assert.equal(result.ordered.at(-1)?.wine.id, 'a');
    assert(result.ordered.at(-1)?.cautions.includes('Tu valoración: no es para ti'));
    assert.equal(result.ordered.at(-1)?.wine.affinity, 100);
    const all = comparison.buildWineComparisonDecision(wines.map(wine => ({ ...wine, personalRating: 'not_for_me' })), context);
    assert.equal(all.primary, null); assert.equal(all.actionability, 'provisional');
    const service = comparison.buildWineComparisonDecision(wines, { ...context, mode: 'service' });
    assert.equal(service.primary?.wine.id, 'a', 'Service ordering must not inherit the owner personal exclusion'); directed++;
  }
}
for (let i = 0; i < 50; i++) for (const mode of ['personal', 'service'] as const) {
  for (const priority of ['affinity', 'certainty', 'value'] as const) {
    const input: comparison.ComparableWine[] = Array.from({ length: 2 + (i % 4) }, (_, j) => ({ id: `${i}-${j}`,
      name: `Vino ${j}`, affinity: j % 3 ? (i * 7 + j * 11) % 101 : null,
      confidence: ((i + j) % 11) / 10, identityConfirmed: j % 3 !== 0,
      price: j % 2 ? 20 : null, currency: 'EUR', service: j % 2 ? 'bottle' : 'glass' }));
    const context: comparison.WineComparisonContext = { mode, priority, budget: i % 2 ? 30 : null,
      budgetCurrency: 'EUR', serviceFormat: i % 2 ? 'bottle' : 'any' };
    assert.equal(JSON.stringify(comparison.buildWineComparisonDecision(input, context)),
      JSON.stringify(oldDecision(input, context)), 'Unrated existing decisions must remain exactly identical'); parity++;
  }
}

const component = 'src/components/wine-import/WineComparisonWorkspace.tsx';
const source = fs.readFileSync(component, 'utf8');
const oldSource = execFileSync('git', ['show', '233442a:' + component], { encoding: 'utf8' });
const shape = (value: unknown) => JSON.parse(JSON.stringify(value, (key, item) => {
  if (key === '_owner' || key === 'ref') return undefined;
  if (key === 'children' && Array.isArray(item)) return item.flat(Infinity).filter(child => child != null && typeof child !== 'boolean');
  if (typeof item === 'function') return '[callback]';
  if (typeof item === 'symbol') return item.description;
  return item;
}));
const text = (value: unknown): string => Array.isArray(value) ? value.map(text).join(' ')
  : value && typeof value === 'object' && 'props' in value ? text((value as { props: { children: unknown } }).props.children)
    : typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const render = (code: string, native: boolean, input: comparison.ComparableWine[], mode: comparison.WineDecisionMode) => {
  const ast = ts.createSourceFile(component, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), names: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.initializer
      && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(ast) === 'useState') names.push(node.name.elements[0].getText(ast));
    ts.forEachChild(node, visit);
  }; visit(ast);
  let slot = 0;
  const components = new Proxy({}, { get: (_, name) => String(name) });
  const sandbox = { exports: {}, require: (name: string) => {
    if (name === 'react/jsx-runtime') return jsx;
    if (name === 'react') return { useEffect() {}, useId: () => 'comparison159', useMemo: (body: () => unknown) => body(),
      useRef: (value: unknown) => ({ current: value }), useState: (value: unknown) => {
        const state = names[slot++]; return [state === 'mode' ? mode : typeof value === 'function' ? value() : value,
          () => { throw Error('No state mutation'); }];
      } };
    if (name === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
    if (name === '@/utils/scanMoney') return money;
    if (name === '@/utils/wineComparison') return comparison;
    if (name === '@/utils/nativeRescanVerdict159') return { personalVerdictTitle159 };
    if (name.startsWith('@/components/') || name === 'lucide-react') return components;
    throw Error('Unexpected import: ' + name);
  } };
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, sandbox);
  return (sandbox.exports as { WineComparisonWorkspace: (props: unknown) => unknown }).WineComparisonWorkspace({ wines: input });
};
const personal = text(render(source, true, wines, 'personal'));
assert(personal.includes('Tu valoración: no es para ti'));
const allRejected = text(render(source, true, wines.map(wine => ({ ...wine, personalRating: 'not_for_me' })), 'personal'));
assert(allRejected.includes('No te recomiendo ninguno para ti.'));
assert(!allRejected.includes('Elección para ti'));
let webParity = 0;
for (const mode of ['personal', 'service'] as const) {
  const input = wines.map(({ personalRating: _rating, ...wine }) => wine);
  assert.deepEqual(shape(render(source, false, input, mode)), shape(render(oldSource, false, input, mode))); webParity++;
}
console.log(JSON.stringify({ directed, legacyDecisionParityCases: parity, actualWorkspaceWebParityCases: webParity,
  actualWorkspaceNativeCases: 2, remoteCalls: 0, userWrites: 0, scope: 'Synthetic comparison decisions and actual JSX closure, not native touch or human taste QA.' }));
