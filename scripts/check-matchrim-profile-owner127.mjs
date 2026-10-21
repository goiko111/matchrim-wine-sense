import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), React = require('react');
const source = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
const tree = ts.createSourceFile('Profile.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let wrapper, defaultName;
const visit = node => {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'ProfileOwnerBoundary127') wrapper = node.initializer.getText(tree);
  if (ts.isExportAssignment(node) && !node.isExportEquals) defaultName = node.expression.getText(tree);
  ts.forEachChild(node, visit);
};
visit(tree); assert(wrapper); assert.equal(defaultName, 'ProfileOwnerBoundary127', 'The actual route export must use the boundary');
const code = ts.transpileModule('exports.render = ' + wrapper, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
let auth = { user: { id: 'owner-A' }, loading: false }, native = true, reads = 0;
const Profile = () => null;
const sandbox = { exports: {}, Profile, JSON,
  useAuth: () => { reads++; return auth; }, Capacitor: { isNativePlatform: () => native },
  require: id => { assert.equal(id, 'react/jsx-runtime'); return require(id); } };
vm.runInNewContext(code, sandbox);
const render = () => { const element = sandbox.exports.render(); assert(React.isValidElement(element)); assert.equal(element.type, Profile); return element; };
let groups = 0;
const test = (name, work) => { work(); groups++; console.log('PASS ' + name); };
test('Native owner change remounts the complete Profile subtree, not only its history reader', () => {
  const first = render(); auth = { user: { id: 'owner-B' }, loading: false };
  assert.notEqual(render().key, first.key);
});
test('Authentication loading cannot retain a previously ready Profile instance', () => {
  const ready = render(); auth = { ...auth, loading: true };
  const loading = render(); assert.notEqual(loading.key, ready.key);
  auth = { ...auth, loading: false }; assert.notEqual(render().key, loading.key);
});
test('Logout and a new login cannot reuse the prior owner subtree', () => {
  const loggedIn = render(); auth = { user: null, loading: false };
  const anonymous = render(); assert.notEqual(anonymous.key, loggedIn.key);
  auth = { user: { id: 'owner-C' }, loading: false }; assert.notEqual(render().key, anonymous.key);
});
test('Same-owner object refresh preserves state and does not key on mutable email/name fields', () => {
  const before = render(); auth = { user: { id: 'owner-C', email: 'changed@example.invalid' }, loading: false };
  assert.equal(render().key, before.key);
});
test('Web keeps the existing unkeyed Profile lifecycle for every auth state', () => {
  native = false;
  for (const user of [null, { id: 'owner-A' }, { id: 'owner-B' }]) for (const loading of [true, false]) {
    auth = { user, loading }; const element = render(); assert.equal(element.key, null);
    assert.deepEqual(Object.keys(element.props), []);
  }
});
test('The boundary adds no fetch, mutation or data-transform hooks', () => {
  assert(!/useEffect|useState|fetch|supabase|calculate|setProfile|setQuiz/.test(wrapper));
  assert(reads > 0);
});
console.log(JSON.stringify({ groups, realNetworkCalls: 0, modelStarts: 0,
  scope: 'Actual exported Profile boundary AST and React element keys; reconciliation semantics, not browser/mobile account QA.' }));
