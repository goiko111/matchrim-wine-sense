import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jsx from 'react/jsx-runtime';

const source = fs.readFileSync('src/components/NativeAccountActions.tsx', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;
let native = true, user = null, signOutCalls = 0;
const element = name => ({ children, asChild: _asChild, ...props }) => React.createElement(name, props, children);
const button = element('button');
const dependencies = {
  'react/jsx-runtime': jsx,
  react: { useEffect: () => {}, useRef: value => ({ current: value }), useState: value => [value, () => {}] },
  '@capacitor/core': { Capacitor: { isNativePlatform: () => native } },
  'react-router-dom': { useNavigate: () => () => {} },
  '@/contexts/AuthContext': { useAuth: () => ({ user, signOut: () => { signOutCalls++; } }) },
  '@/hooks/use-toast': { useToast: () => ({ toast: () => {} }) },
  '@/components/ui/button': { Button: button },
  '@/components/ui/dropdown-menu': Object.fromEntries(['DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem',
    'DropdownMenuSeparator', 'DropdownMenuTrigger'].map(name => [name, element('div')])),
  'lucide-react': Object.fromEntries(['LogOut', 'Settings', 'ShieldCheck', 'Trash2'].map(name => [name, element('svg')])),
};
const sandbox = { exports: {}, require: name => {
  assert(Object.hasOwn(dependencies, name), 'Unexpected dependency: ' + name); return dependencies[name];
} };
vm.runInNewContext(compiled, sandbox);
const component = sandbox.exports.default;
const render = () => renderToStaticMarkup(React.createElement(component));
assert.equal(render(), '');
user = { id: 'synthetic-owner', email: 'synthetic@example.invalid' };
native = false; assert.equal(render(), '');
native = true;
let html = render();
assert(html.includes('aria-label="Cuenta actual"'));
assert(html.includes('synthetic@example.invalid'));
assert(!html.includes('synthetic-owner'));
assert(html.includes('aria-label="Ajustes de cuenta"'));
assert(source.includes('shrink-0'));
assert(source.includes('[overflow-wrap:anywhere]'));
user = { id: 'synthetic-owner', email: 'x'.repeat(220) + '@example.invalid' };
html = render(); assert(html.includes(user.email)); assert(!html.includes('truncate'));
user = { id: 'synthetic-owner', email: '<script>alert(1)</script>' };
html = render(); assert(html.includes('&lt;script&gt;')); assert(!html.includes('<script>'));
user = { id: 'synthetic-owner', email: null };
html = render(); assert(html.includes('Sesion iniciada')); assert(!html.includes('synthetic-owner'));
assert.equal(signOutCalls, 0);
assert(!source.includes('supabase'));
console.log(JSON.stringify({ groups: 8, networkCalls: 0, accountMutations: 0,
  scope: 'Actual native account component with mocked dependencies; no UIKit, real login or visual-layout claim' }));
