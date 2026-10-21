import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { validateSession132 } from './qa-matchrim-session132.mjs';

const id = '00000000-0000-4000-8000-000000000132';
const digest = createHash('sha256').update(id).digest('hex');
const user = { id, email: 'info@winerim.com' };
const claims = { sub: id, iss: 'https://cbjynrbvrhcmpaojmqdp.supabase.co/auth/v1', role: 'authenticated', exp: 4102444800 };
const token = value => 'synthetic.' + Buffer.from(JSON.stringify(value)).toString('base64url') + '.synthetic';
const session = { user, access_token: token(claims), refresh_token: 'synthetic-only' };
assert.equal(validateSession132(session, user, digest).userIdSHA256, digest);
assert.throws(() => validateSession132(session));
assert.throws(() => validateSession132(session, { ...user, email: 'other@example.invalid' }, digest));
assert.throws(() => validateSession132({ ...session, user: { ...user, id: 'different' } }, user, digest));
for (const value of [{ ...claims, sub: 'different' }, { ...claims, role: 'service_role' },
  { ...claims, iss: 'https://example.invalid/auth/v1' }]) {
  assert.throws(() => validateSession132({ ...session, access_token: token(value) }, user, digest));
}
for (const access_token of ['', 'broken', 'a.invalid.c']) assert.throws(() => validateSession132({ ...session, access_token }, user, digest));
assert.throws(() => validateSession132({ ...session, refresh_token: '' }, user, digest));
const source = fs.readFileSync('scripts/qa-matchrim-session132.mjs', 'utf8');
assert(source.indexOf('fs.fsyncSync(directory)') < source.indexOf("await fetch(origin + '/auth/v1/token"));
assert(source.includes("'wx', 0o600") && source.includes("signal: AbortSignal.timeout(20000)"));
assert(source.includes('validateSession132(session, user)') && source.includes('databases.length === 1'));
assert(source.includes("input: JSON.stringify(session)") && !source.includes('access_token, session.refresh_token]'));
assert(source.includes("['-I', 'scripts/matchrim-session132-storage.py'"));
assert(source.includes('INSTALLED_ARTIFACT_MISMATCH') && source.includes('receipt.installedArtifactVerified = true'));
assert(!/\bassert\b/.test(fs.readFileSync('scripts/matchrim-session132-storage.py', 'utf8')));
console.log(JSON.stringify({ checks: 18, syntheticOnly: true, networkCalls: 0, storageWrites: 0 }));
