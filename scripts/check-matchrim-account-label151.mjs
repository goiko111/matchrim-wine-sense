import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { restoreAccountLabel151 } from './native-account-label151-scope.mjs';
import { restoreNativeAuth97 } from './native-auth97-scope.mjs';

const file = 'src/components/NativeAccountActions.tsx';
const source = fs.readFileSync(file, 'utf8');
const before = execFileSync('git', ['show', '86df5fe:' + file], { encoding: 'utf8' });
assert.equal(restoreAccountLabel151(file, source), before);
assert.equal(restoreNativeAuth97(file, source), before);
assert.equal(restoreAccountLabel151(file, before), before);
assert.equal(restoreNativeAuth97(file, before), before);
assert.equal(restoreAccountLabel151('other/NativeAccountActions.tsx', source), source);
const path = 'scripts/native-auth97-scope.mjs', scope = fs.readFileSync(path, 'utf8');
const additions = ["import { restoreAccountLabel151 } from './native-account-label151-scope.mjs';\n",
  '  source = restoreAccountLabel151(file, source);\n'];
let restored = scope;
for (const added of additions) { assert.equal(restored.split(added).length, 2); restored = restored.replace(added, ''); }
assert.equal(restored, execFileSync('git', ['show', 'd97cf25:' + path], { encoding: 'utf8' }), 'Every prior auth source oracle remains exact');
const changes = [
  ['if (pending.current || !user) return;', 'if (!user) return;'],
  ['const expectedOwner = user.id;', 'const expectedOwner = "other";'],
  ['const closed = await signOut();', 'const closed = true;'],
  ['if (!Capacitor.isNativePlatform() || !user) return null;', 'if (!user) return null;'],
  ['Correo de tu cuenta:', 'Account:'],
  ['aria-hidden="true">{user.email', 'aria-hidden="false">{user.email'],
  ['h-11 w-11 shrink-0', 'h-1 w-1 shrink-0'],
];
for (const [from, to] of changes) {
  assert(source.includes(from)); const changed = source.replace(from, to); assert.notEqual(changed, source);
  assert.notEqual(restoreNativeAuth97(file, changed), before, 'Unknown source must not be projected into the frozen pass');
}
const authPath = 'src/pages/Auth.tsx', auth = fs.readFileSync(authPath, 'utf8');
assert.equal(restoreNativeAuth97(authPath, auth), execFileSync('git', ['show', '86df5fe:' + authPath], { encoding: 'utf8' }));
console.log(JSON.stringify({ exactSourcePairs: 3, rejectedUnknownSourceMutations: changes.length,
  networkCalls: 0, authSubmissions: 0,
  scope: 'The account label is projected only for old frozen source proofs. Actual current native/web/escaping semantics remain covered by115 and need UIKit148 verification; signout/lifecycle code is unchanged.' }));
