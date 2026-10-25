import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

const source = fs.readFileSync('src/pages/Index.tsx', 'utf8');
const tree = ts.createSourceFile('Index.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let home;
const visit = node => {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'Index') home = node.initializer;
  ts.forEachChild(node, visit);
}; visit(tree);
const returns = home.body.statements.filter(ts.isReturnStatement);
assert.equal(returns.length, 1);
const renderSource = returns[0].getText(tree);
const NativeAppHome = () => null;
const harness = changed => {
  const context = { exports: {}, NativeAppHome, Capacitor: { isNativePlatform: () => context.native }, native: true,
    require: name => { assert.equal(name, 'react/jsx-runtime'); return jsx; } };
  vm.runInNewContext(ts.transpileModule('exports.render = () => {' + changed + '};', {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  return input => { Object.assign(context, input); const view = context.exports.render(); assert.equal(view.type, NativeAppHome); return view.props; };
};
const render = harness(renderSource);
const input = (owner = 'owner-0') => ({ user: { id: owner }, authLoading: false,
  savedWineOwnerId: owner, savedWines: [{ name: 'Synthetic Private Wine', producer: owner }],
  activeProfile: { potente: 1.2, acidez: 4, dulce: 0, tanico: 2.5, afrutado: 3 },
  loadingHomeProfile: false, hasQuizResults: true, homeMatchrimCode: 'SYNTHETIC-CODE',
  learningInfo: { samples: 2, confidence: 12 }, recommendations: [{ id: 1, name: 'Synthetic Private Recommendation' }],
  loadingRecommendations: false, recommendationsUnavailable: false, recommendationsExhausted: false,
  nativeHomeReadError: null, setNativeHomeRetry() {} });
let groups = 0;
const test = (name, work) => { work(); groups++; console.log('PASS ' + name); };
test('Fifty native owner transitions hide old recommendations and active vectors before effects run', () => {
  for (let n = 0; n < 50; n++) {
    const stale = input('owner-' + n);
    const ready = render(stale);
    assert.equal(ready.activeProfile, stale.activeProfile);
    assert.equal(ready.recommendations, stale.recommendations);
    const next = render({ ...stale, user: { id: 'owner-' + (n + 1) } });
    assert.equal(next.activeProfile, null);
    assert.equal(next.recommendations.length, 0);
    assert.equal(next.onboardingReady, false); assert.equal(next.hasSavedWines, false);
  }
});
test('Auth loading, unknown ownership, profile loading and logout hide the previous personal result', () => {
  for (const patch of [{ authLoading: true }, { savedWineOwnerId: null }, { loadingHomeProfile: true }, { user: null }]) {
    const props = render({ ...input(), ...patch });
    assert.equal(props.activeProfile, null); assert.equal(props.recommendations.length, 0);
  }
});
test('Only the newly loaded owner can expose their current vector and recommendations', () => {
  const next = input('new-owner');
  const props = render(next);
  assert.equal(props.activeProfile, next.activeProfile); assert.equal(props.recommendations, next.recommendations);
  assert.equal(props.onboardingReady, true); assert.equal(props.hasSavedWines, true);
});
test('Anonymous local ownership is explicit; a previous signed-in owner cannot satisfy it', () => {
  const guest = { ...input(), user: null, savedWineOwnerId: 'anonymous' };
  assert.equal(render(guest).activeProfile, guest.activeProfile);
  assert.equal(render({ ...guest, savedWineOwnerId: 'signed-in-owner' }).activeProfile, null);
});
test('Removing either native ownership condition is rejected by the transition assertions', () => {
  const mutants = [renderSource.replace("savedWineOwnerId === (user?.id ?? 'anonymous') ? activeProfile", 'true ? activeProfile'),
    renderSource.replace("savedWineOwnerId !== (user?.id ?? 'anonymous')) ? []", 'false) ? []')];
  for (const changed of mutants) {
    assert.notEqual(changed, renderSource);
    const props = harness(changed)({ ...input(), user: { id: 'other' } });
    assert(props.activeProfile !== null || props.recommendations.length > 0);
  }
});
test('Web retains its current unmodified recommendation prop behavior', () => {
  const value = { ...input(), native: false, user: { id: 'other' } };
  const props = render(value);
  assert.equal(props.activeProfile, null); assert.equal(props.recommendations, value.recommendations);
});
console.log(JSON.stringify({ groups, syntheticOwnerTransitions: 50, networkCalls: 0, dataWrites: 0,
  scope: 'Actual current Index return AST before passive effects; recommendation/vector props only. Not real users, auth events, cache ownership or native/browser layout. No product change.' }));
