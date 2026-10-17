import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const authPath = 'src/contexts/AuthContext.tsx';
const accountPath = 'src/components/NativeAccountActions.tsx';
const auth = readFileSync(new URL(authPath, root), 'utf8');
const account = readFileSync(new URL(accountPath, root), 'utf8');
const baseline = execFileSync('git', ['show', `c25b282:${authPath}`], { cwd: root, encoding: 'utf8' });
const declaration = (source: string, name: string) => {
  const ast = ts.createSourceFile('actual.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: ts.VariableDeclaration[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(found.length, 1, `Unique actual declaration: ${name}`);
  return found[0].getText(ast);
};
const execute = (source: string, name: string, dependencies: Record<string, unknown>) => {
  const compiled = ts.transpileModule(`const ${declaration(source, name)}; globalThis.actual = ${name};`, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const sandbox = vm.createContext({ ...dependencies, console: { error() {} } });
  vm.runInContext(compiled, sandbox);
  return sandbox.actual as () => Promise<boolean | void>;
};
const authRun = async (source: string, mode: 'success' | 'failure' | 'reject') => {
  const events: unknown[] = [];
  const run = execute(source, 'signOut', { toast: (payload: unknown) => events.push(payload), supabase: { auth: { signOut: async () => {
    events.push('actual SDK signOut called');
    if (mode === 'reject') throw new Error('Controlled transport rejection');
    return { error: mode === 'failure' ? { message: 'Controlled network failure' } : null };
  } } } });
  return { value: await run(), events: JSON.parse(JSON.stringify(events)) };
};
let groups = 0;
const check = async (name: string, run: () => void | Promise<void>) => { await run(); groups++; console.log('PASS', name); };
await check('Auth receipt is true only for an SDK-confirmed successful close', async () => {
  for (const mode of ['success', 'failure', 'reject'] as const) {
    const current = await authRun(auth, mode);
    assert.equal(current.value, mode === 'success');
    assert.equal(current.events.filter(event => event === 'actual SDK signOut called').length, 1);
  }
});
await check('Existing web SDK request and visible notice semantics are unchanged for all outcomes', async () => {
  for (const mode of ['success', 'failure', 'reject'] as const) {
    assert.deepEqual((await authRun(auth, mode)).events, (await authRun(baseline, mode)).events);
  }
  assert.equal(auth.replace('Promise<boolean>', 'Promise<void>').replace(/^ {8}return (?:false|true);\n/gm, '').replace(/^ {6}return false;\n/gm, ''), baseline);
});
const accountRun = (operation: () => Promise<boolean>, currentOwner: string | null = 'primary', presentUser = true) => {
  const events: unknown[] = [];
  const mounted = { current: true }, owner = { current: currentOwner }, pending = { current: false };
  const run = execute(account, 'closeSession', { user: presentUser ? { id: 'primary' } : null,
    mounted, owner, pending, signOut: operation, setClosing: (value: boolean) => events.push(['closing', value]),
    navigate: (...args: unknown[]) => events.push(['navigate', ...args]), toast: (payload: unknown) => events.push(['notice', payload]) });
  return { run, events, mounted, owner, pending };
};
await check('Native failure stays on the account instead of pretending to navigate away', async () => {
  const fixture = accountRun(async () => false); await fixture.run();
  assert.deepEqual(fixture.events, [['closing', true], ['closing', false]]);
});
await check('Native confirmed success navigates exactly once, including after the auth listener clears the owner', async () => {
  for (const owner of ['primary', null]) {
    const fixture = accountRun(async () => true, owner); await fixture.run();
    assert.deepEqual(JSON.parse(JSON.stringify(fixture.events)), [['closing', true], ['navigate', '/', { replace: true }], ['closing', false]]);
  }
});
await check('Unexpected rejection remains a readable unconfirmed close, not an unhandled promise', async () => {
  const fixture = accountRun(async () => { throw new Error('Control'); }); await fixture.run();
  assert.equal(fixture.events.some(event => Array.isArray(event) && event[0] === 'navigate'), false);
  assert.equal(fixture.events.filter(event => Array.isArray(event) && event[0] === 'notice').length, 1);
  assert.equal(fixture.pending.current, false);
});
await check('A double click cannot emit two concurrent logout requests', async () => {
  let resolve!: (value: boolean) => void, calls = 0;
  const fixture = accountRun(() => { calls++; return new Promise<boolean>(done => { resolve = done; }); });
  const first = fixture.run(); await fixture.run(); assert.equal(calls, 1);
  resolve(false); await first; assert.equal(fixture.pending.current, false);
});
await check('Late success cannot navigate a different account or an unmounted screen', async () => {
  for (const kind of ['other-owner', 'unmounted']) {
    let resolve!: (value: boolean) => void;
    const fixture = accountRun(() => new Promise<boolean>(done => { resolve = done; }));
    const pending = fixture.run();
    if (kind === 'other-owner') fixture.owner.current = 'secondary'; else fixture.mounted.current = false;
    resolve(true); await pending;
    assert.equal(fixture.events.some(event => Array.isArray(event) && event[0] === 'navigate'), false);
  }
});
await check('An anonymous account cannot start a logout or mutate the busy state', async () => {
  const fixture = accountRun(async () => { throw new Error('Must not call'); }, null, false);
  await fixture.run(); assert.deepEqual(fixture.events, []);
});
console.log(JSON.stringify({ groups, passed: true, realAuthCalls: 0, realUsers: 0,
  scope: 'Actual AuthContext and native account action closures with controlled SDK outcomes, not native UI or hosted auth acceptance.' }));
