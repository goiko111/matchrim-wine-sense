import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { authorization274, plan274, summarizeDetail274 } from './probe-matchrim-first20-274';
import { createReader194 } from './probe-matchrim-master194';

const base = 'qa-artifacts/first20-274-20261027';
const owner = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d';
const digest = (value: Buffer) => createHash('sha256').update(value).digest('hex');
type Prior279 = { passed: boolean; halted: boolean; attempts: number; maximumNewReads: number; rows: unknown[] };
type Receipt279 = { index: number; label: string; url: string; httpStatus: number | null; error?: string };

export const remainingPlan279 = (prior: Prior279, receipt: Receipt279) => {
  const original = plan274();
  assert(prior.passed === false && prior.halted === true && prior.attempts === 1
    && prior.maximumNewReads === 19 && Array.isArray(prior.rows) && prior.rows.length === 0,
  'EXACT_PREVIOUS_ONE_ATTEMPT_HALT_REQUIRED');
  assert(receipt.index === 1 && receipt.httpStatus === 503 && receipt.url === original[0].url
    && receipt.label === original[0].imageId + '-manifest-detail'
    && receipt.error === 'HTTP_TRANSPORT_OR_BODY_REJECTED', 'ORIGINAL_503_RECEIPT_REQUIRED');
  const remaining = original.slice(prior.attempts);
  assert.equal(remaining.length, 18);
  assert(!remaining.some(entry => entry.canonicalId === original[0].canonicalId), 'NO_FAILED_ID_RETRY');
  return remaining;
};

export const runRemaining279 = async (plan: ReturnType<typeof remainingPlan279>, reader: ReturnType<typeof createReader194>) => {
  assert.deepEqual(plan, plan274().slice(1), 'EXACT_UNUSED_PLAN_REQUIRED');
  const rows: ReturnType<typeof summarizeDetail274>[] = [];
  for (const entry of plan) rows.push(summarizeDetail274(entry, await reader.read(entry.imageId + '-manifest-detail', entry.url)));
  return rows;
};

const main = async () => {
  const sourceFiles = ['HUMAN-AUTHORIZATION.json', 'live-r1/RESULT.json', 'live-r1/01-RECEIPT.json'];
  const sources = sourceFiles.map(file => ({ file, bytes: fs.readFileSync(path.join(base, file)) }));
  authorization274(JSON.parse(sources[0].bytes.toString()));
  const prior = JSON.parse(sources[1].bytes.toString());
  const plan = remainingPlan279(prior, JSON.parse(sources[2].bytes.toString()));
  if (process.argv[2] !== '--live-remaining-18') {
    console.log(JSON.stringify({ mode: 'PLAN_ONLY', previousAttempts: 1, maximumNewReads: plan.length,
      cumulativeMaximum: 19, failedIdRetried: false, requests: 0, keychainReads: 0, plan })); return;
  }
  const guard = () => {
    const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases;
    for (const [resource, variable] of [['mac-desktop', 'MATCHRIM274_DESKTOP_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]) {
      const lease = leases[resource];
      assert(lease?.owner === owner && lease.leaseId === process.env[variable] && lease.reviewAfter * 1000 > Date.now(), 'OWN_RESOURCE_REQUIRED');
    }
    for (const source of sources) assert.equal(digest(fs.readFileSync(path.join(base, source.file))), digest(source.bytes), 'SOURCE_LEDGER_CHANGED');
  };
  guard();
  const output = path.join(base, 'live-r2');
  assert(!fs.existsSync(output), 'NO_CONTINUATION_RESET_OR_RETRY');
  fs.mkdirSync(output, { mode: 0o700 });
  const save = (name: string, value: unknown) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  save('STARTED.json', { startedUTC: new Date().toISOString(), previousAttempts: 1, maximumNewReads: 18,
    cumulativeMaximum: 19, originalFailedIdExcluded: 217496, plan,
    sourceHashes: sources.map(source => ({ file: source.file, sha256: digest(source.bytes) })),
    recoveryEvidence: 'qa-fixtures/development277/REPLY.json', identitySource: 'Supplied Mantalak IDs, not image recognition' });
  let key = '', attempts = 0, halted = false;
  let rows: ReturnType<typeof summarizeDetail274>[] = [];
  const partial: ReturnType<typeof summarizeDetail274>[] = [];
  let completed = 0;
  try {
    try { key = execFileSync('/usr/bin/security', ['find-generic-password', '-a', 'goiko', '-s', 'wine.matchrim.goiko-api', '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 4096 }).trim(); }
    catch { throw Error('KEYCHAIN_UNAVAILABLE'); }
    const reader = createReader194({ key, fetcher: fetch,
      claim: (index, label, url) => {
        guard(); assert(index <= 18 && url === plan[index - 1].url && label === plan[index - 1].imageId + '-manifest-detail');
        save(`${String(index + 1).padStart(2, '0')}-RESERVED.json`, { indexInContinuation: index, cumulativeIndex: index + 1, label, url, atUTC: new Date().toISOString() });
        attempts = index;
      },
      record: (receipt, payload) => {
        const n = String(receipt.index + 1).padStart(2, '0');
        save(n + '-RECEIPT.json', { ...receipt, indexInContinuation: receipt.index, cumulativeIndex: receipt.index + 1 });
        if (payload !== undefined) {
          save(n + '-BODY.json', payload);
          const summary = summarizeDetail274(plan[receipt.index - 1], payload);
          partial.push(summary); completed++;
        }
      },
    });
    rows = await runRemaining279(plan, reader);
  } catch { halted = true; rows = partial; }
  finally {
    key = '';
    save('RESULT.json', { passed: !halted && completed === 18, halted, previousAttempts: 1, attempts,
      cumulativeAttempts: 1 + attempts, cumulativeMaximum: 19, unusedAllowance: 18 - attempts,
      validatedNewDetails: completed, rows, failedIdRetried: false, photoIdentitiesConfirmed: 0,
      affinityGranted: false, models: 0, images: 0, writes: 0, additionalEUR: 0,
      scope: 'Unused canonical IDs only; not OCR identity, exact-vintage verification, measured taste calibration or 200-label approval',
      finishedUTC: new Date().toISOString() });
  }
  console.log(JSON.stringify({ output, halted, attempts, cumulativeAttempts: 1 + attempts, validatedNewDetails: completed, additionalEUR: 0 }));
  if (halted) process.exitCode = 1;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  void main().catch(() => { console.error('FIRST20_279_STOPPED_NO_SECRET_LOGGED'); process.exitCode = 1; });
