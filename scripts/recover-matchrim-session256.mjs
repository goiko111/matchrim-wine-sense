import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { validateSession132 } from './qa-matchrim-session132.mjs';

const owner = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d';
const device = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127', bundle = 'wine.matchrim.qa99review';
const base = '/Users/GOIKO/Library/Application Support/Matchrim QA/session256';
const guard = () => {
  const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
  for (const [resource, env] of [['ios-simulator', 'MATCHRIM_SIMULATOR_LEASE'], ['writer-matchrim-native99', 'MATCHRIM_WRITER_LEASE']]) {
    const lease = leases[resource];
    assert(lease?.owner === owner && lease.leaseId === process.env[env]
      && lease.reviewAfter * 1000 > Date.now() + 60000, 'RESOURCE_HOLD');
  }
};
guard();
const report = { source: 'Own QA99review WebKit exact Auth key; read-only local SQLite, not another user or browser',
  rowFound: false, boundQA: false, catalogueCalls: 0, authCalls: 0, passwordRead: false,
  appLaunched: false, databaseWrites: false, recovered: false };
try {
  const container = execFileSync('/usr/bin/xcrun', ['simctl', 'get_app_container', device, bundle, 'data'], {
    encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, DEVELOPER_DIR: '/Applications/Xcode-26.0.1.app/Contents/Developer' },
  }).trim();
  const prefix = `/Users/GOIKO/Library/Developer/CoreSimulator/Devices/${device}/data/Containers/Data/Application/`;
  assert(container.startsWith(prefix) && /^[A-F0-9-]{36}$/.test(container.slice(prefix.length)), 'OWN_CONTAINER_HOLD');
  const website = path.join(container, 'Library/WebKit', bundle, 'WebsiteData/Default');
  const databases = [];
  const walk = folder => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      assert(!entry.isSymbolicLink(), 'STORAGE_SYMLINK_HOLD');
      if (entry.isDirectory()) walk(file);
      else if (entry.name === 'localstorage.sqlite3') databases.push(file);
    }
  };
  walk(website); assert(databases.length === 1, 'AMBIGUOUS_STORAGE_HOLD'); guard();
  const raw = execFileSync('/usr/bin/python3', ['-I', '-c', `
import sqlite3, sys, base64
from pathlib import Path
connection = sqlite3.connect(Path(sys.argv[1]).as_uri() + '?mode=ro', uri=True, timeout=2)
try:
    connection.execute('PRAGMA query_only=ON')
    row = connection.execute('SELECT value FROM ItemTable WHERE key=?', ('sb-cbjynrbvrhcmpaojmqdp-auth-token',)).fetchone()
    if row: sys.stdout.write(base64.b64encode(row[0]).decode('ascii'))
finally: connection.close()
`, databases[0]], { encoding: 'utf8', timeout: 5000, maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] });
  report.rowFound = !!raw;
  assert(raw, 'NO_QA_SESSION_IN_OWN_STORAGE');
  const session = JSON.parse(Buffer.from(raw, 'base64').toString('utf16le'));
  const verified = validateSession132(session);
  assert(session.user?.is_anonymous !== true && session.is_anonymous !== true, 'ANONYMOUS_SESSION_HOLD');
  report.boundQA = true; report.expiresUTC = new Date(verified.expiresAt * 1000).toISOString();
  const failed = JSON.parse(fs.readFileSync('qa-artifacts/night105-20261021/session132-r1/PRIVATE-SESSION.json'));
  report.refreshDifferentFromFailed132 = session.refresh_token !== failed.refresh_token;
  report.accessStillValid = verified.expiresAt * 1000 > Date.now() + 120000;
  assert(report.accessStillValid || report.refreshDifferentFromFailed132, 'ONLY_FAILED_OLD_SESSION_HOLD');
  guard(); assert(!fs.existsSync(base), 'EXISTING_RECOVERY_NO_RESET');
  fs.mkdirSync(base, { recursive: true, mode: 0o700 });
  const fd = fs.openSync(path.join(base, 'PRIVATE-SESSION.json'), 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(session)); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  report.recovered = true;
} catch (error) {
  report.reason = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'PRIVATE_STORAGE_HOLD_DETAILS_WITHHELD';
}
console.log(JSON.stringify(report));
process.exitCode = report.recovered ? 0 : 1;
