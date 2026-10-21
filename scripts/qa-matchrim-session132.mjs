import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { checkLeases, verifyArtifact } from './qa-matchrim-account114.mjs';

const origin = 'https://cbjynrbvrhcmpaojmqdp.supabase.co';
const userHash = 'dec0ce2e36d7642a3704f666fdbafa68e9aaabee17f077ef5a0ede86eea19c05';
const sha = value => createHash('sha256').update(value).digest('hex');
const device = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127', bundle = 'wine.matchrim.qa99review';
export function validateSession132(session, user = session?.user, expectedHash = userHash) {
  assert(/^[a-f0-9]{64}$/.test(expectedHash));
  assert(session && user?.email === 'info@winerim.com' && sha(user.id || '') === expectedHash, 'QA_IDENTITY_HOLD');
  assert(session.user?.id === user.id && session.user?.email === user.email, 'SESSION_OWNER_HOLD');
  assert(typeof session.refresh_token === 'string' && session.refresh_token.length >= 8, 'REFRESH_INPUT_HOLD');
  const token = typeof session.access_token === 'string' && session.access_token.split('.');
  assert(token?.length === 3, 'ACCESS_INPUT_HOLD');
  const claims = JSON.parse(Buffer.from(token[1], 'base64url').toString());
  assert(claims.sub === user.id && claims.iss === origin + '/auth/v1' && claims.role === 'authenticated', 'TOKEN_SCOPE_HOLD');
  return { userIdSHA256: expectedHash, expiresAt: claims.exp };
}

export async function runSession132(args = process.argv.slice(2)) {
  const repo = process.cwd(), base = path.join(repo, 'qa-artifacts/night105-20261021');
  assert(args.length === 3);
  const prep = JSON.parse(fs.readFileSync(path.resolve(args[0], 'preparation.json'))), app = path.resolve(args[1]);
  const output = path.resolve(args[2]);
  assert(path.dirname(output) === base && /^session132-[\w-]+$/.test(path.basename(output)) && !fs.existsSync(output));
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|^PYTHON/i.test(key))),
    DEVELOPER_DIR: '/Applications/Xcode-26.0.1.app/Contents/Developer' };
  const guard = () => {
    checkLeases(JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases, env);
    const disk = fs.statfsSync(base); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3);
    verifyArtifact({ repo, prep, app });
  };
  guard(); fs.mkdirSync(output, { mode: 0o700 });
  const receipt = { startedUTC: new Date().toISOString(), sourceCommit: prep.commit, passed: false,
    scope: 'Resume the existing authorized QA session in the dedicated simulator by seeding its guest-only WebKit store. NOT a password-login UI test. One refresh POST and one identity GET maximum; no signup, password reset, profile/wine/quiz/rating writes or model calls.',
    refreshSubmissions: 0, identityReads: 0, modelStarts: 0, webPublished: false, backendDeployed: false,
    nativeArtifact: path.relative(repo, app), storageSeeded: false };
  const write = (file, value) => fs.writeFileSync(path.join(output, file), JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  try {
    const oldFile = path.join(repo, 'qa-artifacts/continuation97-20261020/live-account-parent/PRIVATE-SESSION.json');
    assert((fs.statSync(oldFile).mode & 0o777) === 0o600 && !fs.lstatSync(oldFile).isSymbolicLink());
    const old = JSON.parse(fs.readFileSync(oldFile)); validateSession132(old);
    const keys = new Set();
    for (const name of Object.keys(prep.webResources).filter(name => name.endsWith('.js'))) {
      for (const [value] of fs.readFileSync(path.join(prep.web, name), 'utf8').matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
        try { const claims = JSON.parse(Buffer.from(value.split('.')[1], 'base64url'));
          if (claims.role === 'anon' && claims.ref === 'cbjynrbvrhcmpaojmqdp') keys.add(value); } catch { /* Public key candidates only. */ }
      }
    }
    assert(keys.size === 1); const apikey = [...keys][0];
    const reservationFile = path.join(base, 'session132-refresh-reservation.json');
    const fd = fs.openSync(reservationFile, 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify({ output, sourceCommit: prep.commit, startedUTC: new Date().toISOString(), userIdSHA256: userHash })); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    const directory = fs.openSync(base, 'r'); try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
    guard(); receipt.refreshSubmissions = 1; write('REFRESH-STARTED.json', { maximum: 1, userIdSHA256: userHash });
    const refreshed = await fetch(origin + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', redirect: 'error',
      headers: { apikey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: old.refresh_token }), signal: AbortSignal.timeout(20000) });
    receipt.refreshHTTP = refreshed.status;
    assert(refreshed.ok && refreshed.headers.get('content-type')?.includes('application/json'), 'REFRESH_REJECTED_NO_RETRY');
    const session = await refreshed.json(); validateSession132(session); write('PRIVATE-SESSION.json', session);
    guard(); receipt.identityReads = 1;
    const response = await fetch(origin + '/auth/v1/user', { method: 'GET', redirect: 'error',
      headers: { apikey, Authorization: 'Bearer ' + session.access_token }, signal: AbortSignal.timeout(20000) });
    receipt.identityHTTP = response.status; assert(response.ok, 'IDENTITY_READ_REJECTED');
    const user = await response.json(); Object.assign(receipt, validateSession132(session, user));
    assert(receipt.expiresAt * 1000 > Date.now() + 120000, 'REFRESHED_SESSION_TOO_SHORT');
    guard();
    const xcrun = args => execFileSync('/usr/bin/xcrun', args, { env, encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] });
    const container = xcrun(['simctl', 'get_app_container', device, bundle, 'data']).trim();
    const prefix = `/Users/GOIKO/Library/Developer/CoreSimulator/Devices/${device}/data/Containers/Data/Application/`;
    assert(container.startsWith(prefix) && /^[A-F0-9-]{36}$/.test(container.slice(prefix.length)), 'OWN_CONTAINER_HOLD');
    const installed = xcrun(['simctl', 'get_app_container', device, bundle, 'app']).trim();
    assert(installed.startsWith(`/Users/GOIKO/Library/Developer/CoreSimulator/Devices/${device}/data/Containers/Bundle/Application/`)
      && installed.endsWith('/App.app'), 'INSTALLED_APP_CONTAINER_HOLD');
    for (const file of ['App', 'Info.plist', 'capacitor.config.json', ...Object.keys(prep.webResources).map(name => 'public/' + name)]) {
      assert(sha(fs.readFileSync(path.join(app, file))) === sha(fs.readFileSync(path.join(installed, file))), 'INSTALLED_ARTIFACT_MISMATCH');
    }
    receipt.installedArtifactVerified = true;
    const website = path.join(container, 'Library/WebKit', bundle, 'WebsiteData/Default');
    const databases = [];
    const walk = folder => {
      for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        const file = path.join(folder, entry.name); assert(!entry.isSymbolicLink(), 'STORAGE_SYMLINK_HOLD');
        if (entry.isDirectory()) walk(file); else if (entry.name === 'localstorage.sqlite3') databases.push(file);
      }
    };
    walk(website); assert(databases.length === 1, 'AMBIGUOUS_WEBKIT_ORIGIN');
    try { xcrun(['simctl', 'terminate', device, bundle]); }
    catch (error) { assert(String(error.stderr).includes('found nothing to terminate'), 'APP_TERMINATION_HOLD'); }
    guard();
    const result = execFileSync('/usr/bin/python3', ['-I', 'scripts/matchrim-session132-storage.py', databases[0], path.join(output, 'PRIVATE-GUEST-BACKUP.sqlite3')],
      { env, input: JSON.stringify(session), encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
    assert(result.trim() === 'SESSION132_OWN_QA_GUEST_STORE_SEEDED', 'SESSION_STORAGE_HOLD');
    receipt.storageSeeded = true; receipt.passed = true;
  } catch (error) {
    receipt.reason = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'PRIVATE_PREFLIGHT_OR_EXECUTION_HOLD_DETAILS_WITHHELD';
  } finally {
    receipt.finishedUTC = new Date().toISOString(); write('RESULT.json', receipt);
  }
  console.log(JSON.stringify(receipt)); return receipt;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  process.exitCode = (await runSession132()).passed ? 0 : 1;
