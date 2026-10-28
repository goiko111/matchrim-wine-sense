// Runners accept only leases held by the identity that launches them. Codex keeps its
// historical owner; another agent must declare its own registered owner. Every resource
// still needs that owner's unexpired lease and its leaseId, which only the acquirer knows.
import assert from 'node:assert/strict';

export const CODEX_RUNNER_OWNER = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d';
const CLAUDE_OWNER = /^claude-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const runnerOwner = (env = process.env) => {
  const owner = env.MATCHRIM_RUNNER_OWNER ?? CODEX_RUNNER_OWNER;
  assert(owner === CODEX_RUNNER_OWNER || CLAUDE_OWNER.test(owner), 'UNVERIFIABLE_RUNNER_OWNER');
  return owner;
};

export const assertOwnLeases = (leases, required, env = process.env, now = Date.now()) => {
  const owner = runnerOwner(env);
  for (const [resource, key] of required) {
    const lease = leases[resource];
    assert(lease?.owner === owner && typeof env[key] === 'string' && lease.leaseId === env[key]
      && lease.reviewAfter * 1000 > now, resource);
  }
  return owner;
};
