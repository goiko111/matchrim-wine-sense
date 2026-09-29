import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

type StagingUser = { id: string; accessToken: string };
type OperationResult = { ok: boolean; latencyMs: number; operation: string; status: number };

const STAGES = [10, 50, 200, 1000] as const;
const EXECUTION_PHRASE = 'ISOLATED_STAGING_ONLY';
const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=', 2);
  const next = process.argv[index + 1];
  const value = inlineValue ?? (next && !next.startsWith('--') ? (index += 1, next) : 'true');
  args.set(key, value);
}

const loadEnv = (path: string) => {
  if (!existsSync(path)) return {} as Record<string, string>;
  return Object.fromEntries(readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
    }));
};

const productionEnv = loadEnv(resolve('.env'));
const baseUrl = (args.get('base-url') || process.env.MATCHRIM_STAGING_SUPABASE_URL || '').replace(/\/$/, '');
const projectRef = args.get('project-ref') || process.env.MATCHRIM_STAGING_PROJECT_REF || '';
const usersPath = args.get('users') || process.env.MATCHRIM_STAGING_USERS_FILE || '';
const execute = (args.get('execute') || process.env.MATCHRIM_LOAD_EXECUTE) === EXECUTION_PHRASE;
const outputPath = resolve(args.get('output') || 'docs/qa-evidence/matchrim-integral-qa-2026-09-29/staging-load-plan.json');
const stageFilter = args.get('stage') ? Number(args.get('stage')) : null;
const concurrency = Math.max(1, Math.min(25, Number(args.get('concurrency') || 10)));

const productionUrl = (productionEnv.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const productionRef = productionUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i)?.[1] || '';
const stagingUrlIsExplicit = /(^https?:\/\/(localhost|127\.0\.0\.1)(:|\/))|(-staging\.|-qa\.|-test\.)/i.test(baseUrl);
const distinctHostedProject = Boolean(projectRef && projectRef !== productionRef && baseUrl.includes(projectRef));
const environmentSafe = Boolean(baseUrl && baseUrl !== productionUrl && (stagingUrlIsExplicit || distinctHostedProject));

const plannedStages = STAGES.filter((stage) => stageFilter === null || stage === stageFilter);
if (!plannedStages.length) throw new Error(`--stage must be one of ${STAGES.join(', ')}`);

const loadUsers = (): StagingUser[] => {
  if (!usersPath) return [];
  const parsed = JSON.parse(readFileSync(resolve(usersPath), 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('The staging users file must contain an array');
  return parsed.map((entry, index) => {
    assert.equal(typeof entry?.id, 'string', `user ${index + 1} needs an id`);
    assert.equal(typeof entry?.accessToken, 'string', `user ${index + 1} needs an accessToken`);
    return { id: entry.id, accessToken: entry.accessToken };
  });
};

const users = loadUsers();
const plan = {
  generatedAt: new Date().toISOString(),
  mode: execute ? 'execute' : 'dry-run',
  target: baseUrl ? new URL(baseUrl).host : 'not-configured',
  projectRef: projectRef || 'not-configured',
  productionGuard: {
    productionUrlMatch: Boolean(baseUrl && baseUrl === productionUrl),
    productionRefMatch: Boolean(projectRef && projectRef === productionRef),
    environmentSafe,
    executionPhraseRequired: EXECUTION_PHRASE,
  },
  stages: plannedStages.map((users) => ({ users, concurrency: Math.min(concurrency, users) })),
  workflow: [
    'read latest quiz profile under the supplied user JWT',
    'insert one uniquely named QA wine',
    'attempt the same canonical identity again and require HTTP 409',
    'verify the row is visible to its owner',
    'delete the QA row in finally cleanup',
  ],
  constraints: {
    createsAuthAccounts: false,
    usesExistingPreprovisionedUsersOnly: true,
    invokesPaidAi: false,
    logsTokens: false,
    acceptableErrorRate: '<1%',
  },
  suppliedUsers: users.length,
};

if (!execute) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

if (!environmentSafe) {
  throw new Error('Refusing load: target is production, missing, or not explicitly identifiable as isolated staging');
}
if (projectRef === productionRef) throw new Error('Refusing load: staging project ref equals production');
const requiredUsers = Math.max(...plannedStages);
if (users.length < requiredUsers) {
  throw new Error(`Need ${requiredUsers} preprovisioned staging users; received ${users.length}`);
}

const request = async (
  user: StagingUser,
  operation: string,
  path: string,
  init: RequestInit = {},
): Promise<{ result: OperationResult; json: unknown }> => {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      apikey: process.env.MATCHRIM_STAGING_ANON_KEY || '',
      Authorization: `Bearer ${user.accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.text();
  return {
    result: {
      ok: response.ok,
      latencyMs: Number((performance.now() - started).toFixed(2)),
      operation,
      status: response.status,
    },
    json: body ? JSON.parse(body) : null,
  };
};

const runUser = async (user: StagingUser, runId: string): Promise<OperationResult[]> => {
  const results: OperationResult[] = [];
  let insertAttempted = false;
  const name = `MATCHRIM LOAD QA ${runId} ${user.id.slice(0, 8)}`;
  const payload = { user_id: user.id, name, producer: 'QA ISOLATED', vintage: 2099, status: 'wishlist' };

  try {
    const profile = await request(user, 'read_profile', '/rest/v1/quiz_results?select=id&order=created_at.desc&limit=1');
    results.push(profile.result);

    const insert = await request(user, 'insert_wine', '/rest/v1/user_wines?select=id', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    insertAttempted = true;
    results.push(insert.result);

    const duplicate = await request(user, 'reject_duplicate', '/rest/v1/user_wines?select=id', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    });
    results.push({ ...duplicate.result, ok: duplicate.result.status === 409 });

    const visible = await request(
      user,
      'read_own_wine',
      `/rest/v1/user_wines?select=id&name=eq.${encodeURIComponent(name)}&limit=2`,
    );
    results.push({ ...visible.result, ok: visible.result.ok && Array.isArray(visible.json) && visible.json.length === 1 });
  } finally {
    if (insertAttempted) {
      const cleanup = await request(
        user,
        'cleanup_wine',
        `/rest/v1/user_wines?name=eq.${encodeURIComponent(name)}`,
        { method: 'DELETE' },
      );
      results.push(cleanup.result);
    }
  }
  return results;
};

const percentile = (values: number[], ratio: number) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] || 0;
};

const runStage = async (size: number) => {
  const runId = `${Date.now()}-${size}`;
  const queue = users.slice(0, size);
  const allResults: OperationResult[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, size) }, async () => {
    while (cursor < queue.length) {
      const user = queue[cursor];
      cursor += 1;
      allResults.push(...await runUser(user, runId));
    }
  });
  await Promise.all(workers);
  const failures = allResults.filter((result) => !result.ok);
  const latencies = allResults.map((result) => result.latencyMs);
  return {
    users: size,
    operations: allResults.length,
    errors: failures.length,
    errorRate: allResults.length ? failures.length / allResults.length : 1,
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    statuses: Object.fromEntries([...new Set(allResults.map((result) => result.status))]
      .map((status) => [status, allResults.filter((result) => result.status === status).length])),
  };
};

const stages = [];
for (const stage of plannedStages) {
  const result = await runStage(stage);
  stages.push(result);
  if (result.errorRate >= 0.01) break;
}

const report = { ...plan, stages };
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (stages.some((stage) => stage.errorRate >= 0.01)) process.exitCode = 1;
