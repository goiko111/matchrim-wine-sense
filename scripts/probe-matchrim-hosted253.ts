import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parseMasterDetail188, parseMasterPage188, parseMasterPage216,
  masterVintageEvidence188 } from '../src/utils/nativeMasterContract188';
import { validateSession132 } from './qa-matchrim-session132.mjs';

const origin = 'https://cbjynrbvrhcmpaojmqdp.supabase.co';
const output = 'qa-artifacts/master253-20261026/hosted-six-r1';
const owner = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d';
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const plan253 = [
  { label: 'migratoria-listed', body: { operation: 'search', query: { q: 'Migratoria', page: 1, limit: 10 } } },
  { label: 'migratoria-opt-in', body: { operation: 'search', query: { q: 'Migratoria', includeUnlisted: true, page: 1, limit: 10 } } },
  { label: 'unlisted-detail-217480', body: { operation: 'detail', mantalakWineId: 217480 } },
  { label: 'listed-detail-78397', body: { operation: 'detail', mantalakWineId: 78397 } },
  { label: 'rioja-opt-in-page1', body: { operation: 'search', query: { q: 'Rioja', includeUnlisted: true, page: 1, limit: 50 } } },
  { label: 'rioja-opt-in-page2', body: { operation: 'search', query: { q: 'Rioja', includeUnlisted: true, page: 2, limit: 50 } } },
] as const;

export function summarize253(index: number, body: unknown) {
  const request = plan253[index].body;
  if (request.operation === 'detail') {
    const wine = parseMasterDetail188(body, request.mantalakWineId);
    return { schemaAccepted: !!wine, canonicalId: wine?.mantalakWineId ?? null,
      name: wine?.name ?? null, winery: wine?.winery ?? null, vintages: wine?.vintages ?? [],
      sensoryRows: wine?.tastingAttributes.attributesByVintage.length ?? null,
      sourcedRows: wine?.tastingAttributes.attributesByVintage.filter(row => row.source !== null).length ?? null,
      vintageEvidence2023: wine ? masterVintageEvidence188(wine, '2023') : null,
      canonicalPhotoIdentityConfirmed: false, affinityGranted: false };
  }
  const winePage = 'includeUnlisted' in request.query
    ? parseMasterPage216(body, request.query.page, request.query.limit)
    : parseMasterPage188(body, request.query.page, request.query.limit);
  return { schemaAccepted: !!winePage, total: winePage?.total ?? null, count: winePage?.count ?? null,
    page: winePage?.page ?? null, pageCount: winePage?.pageCount ?? null,
    ids: winePage?.results.map(row => row.mantalakWineId) ?? [],
    unlistedRows: winePage?.results.filter(row => row.id === null).length ?? null,
    names: winePage?.results.map(row => ({ id: row.mantalakWineId, name: row.name, winery: row.winery })) ?? [],
    canonicalPhotoIdentityConfirmed: false, affinityGranted: false };
}

export function evaluate253(checks: ReturnType<typeof summarize253>[]) {
  if (checks.length !== plan253.length || checks.some(row => !row.schemaAccepted)) {
    return { passed: false, pagination: null, reason: 'INCOMPLETE_OR_SCHEMA_HOLD' };
  }
  const first = checks[4], second = checks[5];
  assert('ids' in first && 'ids' in second);
  const ids = [...first.ids, ...second.ids];
  const pagination = { sameTotal: first.total === second.total, distinct: new Set(ids).size === ids.length,
    observed: ids.length, total: first.total, completeWithinSearch: ids.length === first.total,
    fullCatalogueSnapshot: false };
  const passed = pagination.sameTotal && pagination.distinct && pagination.completeWithinSearch;
  return { passed, pagination, reason: passed
    ? 'SIX_TRANSPORT_AND_SCHEMA_CHECKS_COMPLETED_NOT_AFFINITY_APPROVAL' : 'PAGINATION_HOLD' };
}

async function main() {
  const mode = process.argv.slice(2).join(' ');
  assert(['--authorized-six', '--resume-qa-login'].includes(mode), 'EXPLICIT_MODE_REQUIRED');
  const resume = mode === '--resume-qa-login';
  const guard = () => {
    const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases;
    const lease = leases['writer-matchrim-native99'];
    assert(lease?.owner === owner && lease.leaseId === process.env.MATCHRIM_WRITER_LEASE
      && lease.reviewAfter * 1000 > Date.now() + 60000, 'WRITER_LEASE_HOLD');
  };
  guard();
  let previous: { [key: string]: unknown; catalogueAttempts: number; sessionRefreshes: number; checks: unknown[] } | undefined;
  if (resume) {
    previous = JSON.parse(fs.readFileSync(path.join(output, 'RESULT.json'), 'utf8'));
    assert(previous.catalogueAttempts === 0 && previous.sessionRefreshes === 1
      && previous.reason === 'AUTH_REFRESH_REJECTED_NO_RETRY', 'RESUME_BASELINE_HOLD');
    assert(!fs.existsSync(path.join(output, 'AUTH-PASSWORD-RESERVED.json'))
      && !fs.existsSync(path.join(output, 'RESULT-QA-LOGIN.json'))
      && !plan253.some((_, i) => fs.existsSync(path.join(output, String(i + 1).padStart(2, '0') + '-RESERVED.json'))),
    'EXISTING_TRANCHE_NO_RESET');
  } else {
    assert(!fs.existsSync(output), 'EXISTING_TRANCHE_NO_RESET');
    fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  }
  const save = (name: string, value: unknown) => {
    guard();
    const fd = fs.openSync(path.join(output, name), 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    const directory = fs.openSync(output, 'r');
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
  };
  if (!resume) save('AUTHORIZATION.json', { authorized: 'Ya esta guardada. Haz las seis comprobaciones gratuitas',
    maximumCatalogueAttempts: 6, maximumSessionRefreshes: 1, additionalEUR: 0,
    priorQuotasUnchanged: true, models: 0, images: 0, lovable: 0, wineWrites: 0,
    backendOrWebChanges: false, startedUTC: new Date().toISOString(), plan: plan253 });
  const report: { [key: string]: unknown; catalogueAttempts: number; sessionRefreshes: number; checks: unknown[] } = {
    catalogueAttempts: 0, maximumCatalogueAttempts: 6, sessionRefreshes: 0, checks: [],
    passed: false, reason: 'PREFLIGHT', models: 0, images: 0, lovable: 0, wineWrites: 0,
    additionalEUR: 0, webChanged: false, backendChanged: false, appActivated: false,
    ...(resume ? { sessionRefreshes: 1, previousRefreshHTTP: previous.refreshHTTP,
      passwordLogins: 0, preservedPreflight: 'RESULT.json', reason: 'QA_LOGIN_PREFLIGHT' } : {}),
  };
  try {
    process.loadEnvFile('.env');
    assert(process.env.VITE_SUPABASE_URL === origin, 'PUBLIC_PROJECT_MISMATCH');
    const apikey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    assert(typeof apikey === 'string' && apikey.length > 30, 'PUBLIC_KEY_UNAVAILABLE');
    const oldFile = 'qa-artifacts/night105-20261021/session132-r1/PRIVATE-SESSION.json';
    assert(!fs.lstatSync(oldFile).isSymbolicLink() && (fs.statSync(oldFile).mode & 0o777) === 0o600, 'PRIVATE_SESSION_MODE');
    let session = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
    const verified = validateSession132(session);
    const secrets = [session.access_token, session.refresh_token];
    const request = async (url: string, init: RequestInit, privateResponse: boolean) => {
      guard();
      const started = performance.now();
      const response = await fetch(url, { ...init, redirect: 'error', credentials: 'omit',
        referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(20000) });
      assert(!response.redirected && response.url === url, 'REDIRECT_HOLD');
      assert(/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? ''), 'RESPONSE_TYPE_HOLD');
      assert(response.body, 'EMPTY_BODY_HOLD');
      const reader = response.body.getReader(), chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const part = await reader.read(); if (part.done) break;
          length += part.value.byteLength;
          assert(length <= (privateResponse ? 65536 : 262144), 'BODY_LIMIT_HOLD'); chunks.push(part.value);
        }
      } finally { void reader.cancel().catch(() => undefined); }
      const bytes = Buffer.concat(chunks), raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const payload: unknown = JSON.parse(raw);
      if (!privateResponse) assert(!secrets.some(value => raw.includes(value)
        || raw.includes(JSON.stringify(value).slice(1, -1))), 'SECRET_ECHO_HOLD');
      return { status: response.status, elapsedMs: Math.round(performance.now() - started),
        bytes: length, sha256: sha(bytes), payload };
    };
    if (resume) {
      const accessFile = '/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim97-physical-20261020/account/PRIVATE-ACCESS.json';
      const flags = execFileSync('/usr/bin/stat', ['-f', '%Sf', accessFile],
        { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'pipe'] }).trim().split(',');
      assert(!flags.includes('dataless'), 'QA_PRIVATE_FILE_NOT_DOWNLOADED');
      assert(!fs.lstatSync(accessFile).isSymbolicLink() && (fs.statSync(accessFile).mode & 0o777) === 0o600, 'PRIVATE_ACCESS_MODE');
      const access = JSON.parse(fs.readFileSync(accessFile, 'utf8'));
      assert(access.email === 'info@winerim.com' && typeof access.password === 'string'
        && access.password.length > 12 && !Array.from(access.password as string).some(char =>
        char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127), 'QA_PRIVATE_ACCESS_HOLD');
      secrets.push(access.password);
      save('AUTH-PASSWORD-RESERVED.json', { maximum: 1, atUTC: new Date().toISOString(), userIdSHA256: verified.userIdSHA256,
        purpose: 'Routine same-account QA sign-in only; no new account, password change or catalogue-quota reset' });
      report.passwordLogins = 1;
      const signedIn = await request(origin + '/auth/v1/token?grant_type=password', { method: 'POST',
        headers: { apikey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: access.email, password: access.password }) }, true);
      report.loginHTTP = signedIn.status;
      assert(signedIn.status === 200, 'QA_LOGIN_REJECTED_NO_RETRY');
      session = signedIn.payload; validateSession132(session);
      assert(session.is_anonymous !== true && session.user?.is_anonymous !== true, 'ANONYMOUS_SESSION_HOLD');
      secrets.push(session.access_token, session.refresh_token);
      save('PRIVATE-QA-LOGIN-SESSION.json', session);
    } else if (verified.expiresAt * 1000 <= Date.now() + 120000) {
      save('AUTH-REFRESH-RESERVED.json', { maximum: 1, atUTC: new Date().toISOString(), userIdSHA256: verified.userIdSHA256 });
      report.sessionRefreshes = 1;
      const refreshed = await request(origin + '/auth/v1/token?grant_type=refresh_token', { method: 'POST',
        headers: { apikey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }) }, true);
      report.refreshHTTP = refreshed.status;
      assert(refreshed.status === 200, 'AUTH_REFRESH_REJECTED_NO_RETRY');
      session = refreshed.payload; validateSession132(session);
      assert(session.is_anonymous !== true && session.user?.is_anonymous !== true, 'ANONYMOUS_SESSION_HOLD');
      secrets.push(session.access_token, session.refresh_token);
      save('PRIVATE-SESSION.json', session);
    }
    validateSession132(session);
    assert(session.expires_at * 1000 > Date.now() + 120000, 'SESSION_EXPIRED_HOLD');
    for (const [index, entry] of plan253.entries()) {
      const number = String(index + 1).padStart(2, '0');
      save(number + '-RESERVED.json', { index: index + 1, label: entry.label, body: entry.body, atUTC: new Date().toISOString() });
      report.catalogueAttempts++;
      const result = await request(origin + '/functions/v1/matchrim-master-catalog', { method: 'POST',
        headers: { apikey, Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.body) }, false);
      const { payload, ...receipt } = result;
      const error = payload && typeof payload === 'object' && 'error' in payload
        && typeof payload.error === 'string' && /^[A-Z_]{1,80}$/.test(payload.error) ? payload.error : null;
      save(number + '-RECEIPT.json', { ...receipt, index: index + 1, label: entry.label, error });
      save(number + '-BODY.json', payload);
      report.checks.push({ ...receipt, index: index + 1, label: entry.label, error,
        ...(result.status === 200 ? summarize253(index, payload) : {}) });
      assert(result.status === 200, 'HOSTED_HTTP_HOLD_NO_RETRY');
    }
    Object.assign(report, evaluate253(report.checks as ReturnType<typeof summarize253>[]));
  } catch (error) {
    report.reason = error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message)
      ? error.message : 'PRIVATE_EXECUTION_HOLD_DETAILS_WITHHELD';
  } finally {
    save(resume ? 'RESULT-QA-LOGIN.json' : 'RESULT.json', { ...report, finishedUTC: new Date().toISOString() });
  }
  console.log(JSON.stringify(report));
  process.exitCode = report.passed ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch(() => { console.error('HOSTED253_PREFLIGHT_HOLD_NO_SECRET_LOGGED'); process.exitCode = 1; });
}
