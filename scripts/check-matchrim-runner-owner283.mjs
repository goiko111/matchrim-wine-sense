import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CODEX_RUNNER_OWNER, assertOwnLeases, runnerOwner } from './matchrim-runner-owner.mjs';

const claude = 'claude-ed58a3cc-3582-48ae-9e29-8583bf9f8edd', now = 1_000_000;
const lease = (owner, leaseId, seconds = 60) => ({ owner, leaseId, acquiredAt: now / 1000, reviewAfter: now / 1000 + seconds });
const required = [['heavy-local', 'HEAVY'], ['writer-matchrim-native99', 'WRITER']];
const runners = ['scripts/prepare-matchrim-native102.mjs', 'scripts/qa-matchrim-compile218.mjs', 'scripts/qa-matchrim-native220.mjs',
  'scripts/archive-matchrim-native102.mjs'];
let groups = 0;
const test = (name, work) => { work(); groups++; console.log('PASS ' + name); };

test('Without a declared owner the runners keep the historical Codex identity', () => {
  assert.equal(runnerOwner({}), CODEX_RUNNER_OWNER);
});
test('Only Codex or a full Claude session owner can be declared', () => {
  assert.equal(runnerOwner({ MATCHRIM_RUNNER_OWNER: claude }), claude);
  for (const owner of ['', 'claude', 'claude-91e0dc1a', 'claude-code-44d13861', '019f9da8-56d0-7000-8000-000000000000',
    claude.toUpperCase(), claude + ' ', 'other-' + claude]) {
    assert.throws(() => runnerOwner({ MATCHRIM_RUNNER_OWNER: owner }), /UNVERIFIABLE_RUNNER_OWNER/, owner);
  }
});
test('Every required resource needs the declared owner, its exact leaseId and an unexpired review time', () => {
  const env = { MATCHRIM_RUNNER_OWNER: claude, HEAVY: 'h-1', WRITER: 'w-1' };
  const leases = { 'heavy-local': lease(claude, 'h-1'), 'writer-matchrim-native99': lease(claude, 'w-1') };
  assert.equal(assertOwnLeases(leases, required, env, now), claude);
  assert.throws(() => assertOwnLeases({ ...leases, 'heavy-local': lease(CODEX_RUNNER_OWNER, 'h-1') }, required, env, now), /heavy-local/,
    'Another owner\'s lease is never usable, even with a copied leaseId');
  assert.throws(() => assertOwnLeases(leases, required, { ...env, WRITER: 'w-2' }, now), /writer-matchrim-native99/);
  assert.throws(() => assertOwnLeases(leases, required, { MATCHRIM_RUNNER_OWNER: claude, HEAVY: 'h-1' }, now), /writer-matchrim-native99/);
  assert.throws(() => assertOwnLeases({ 'heavy-local': leases['heavy-local'] }, required, env, now), /writer-matchrim-native99/);
  assert.throws(() => assertOwnLeases({ ...leases, 'heavy-local': lease(claude, 'h-1', 0) }, required, env, now), /heavy-local/);
});
test('Claude leases do not satisfy a Codex run, and Codex leases do not satisfy a Claude run', () => {
  const ids = { HEAVY: 'h-1', WRITER: 'w-1' };
  const ofClaude = { 'heavy-local': lease(claude, 'h-1'), 'writer-matchrim-native99': lease(claude, 'w-1') };
  const ofCodex = { 'heavy-local': lease(CODEX_RUNNER_OWNER, 'h-1'), 'writer-matchrim-native99': lease(CODEX_RUNNER_OWNER, 'w-1') };
  assert.throws(() => assertOwnLeases(ofClaude, required, ids, now), /heavy-local/);
  assert.throws(() => assertOwnLeases(ofCodex, required, { ...ids, MATCHRIM_RUNNER_OWNER: claude }, now), /heavy-local/);
  assert.equal(assertOwnLeases(ofCodex, required, ids, now), CODEX_RUNNER_OWNER);
});
test('The four runners use the shared guard, record their owner and keep disk/freshness/source checks', () => {
  for (const file of runners) {
    const source = fs.readFileSync(file, 'utf8');
    assert(source.includes("from './matchrim-runner-owner.mjs'") && source.includes('runnerOwner()') && source.includes('assertOwnLeases(leases, ['), file);
    assert(!source.includes(CODEX_RUNNER_OWNER), file + ' must not hardcode an owner');
    assert(source.includes('runnerOwner: owner'), file + ' must record the owner in its receipt');
    assert(/5 \* 1024 \*\* 3/.test(source) && source.includes("'heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'")
      && source.includes("'writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID'"), file);
  }
  const prepare = fs.readFileSync(runners[0], 'utf8'), compile = fs.readFileSync(runners[1], 'utf8'), native = fs.readFileSync(runners[2], 'utf8');
  assert(prepare.includes("'Fresh output required'") && prepare.includes("'SOURCE_CHANGED_DURING_BUILD'") && prepare.includes("sourceDirty: Boolean(git('status', '--porcelain=v1'))"));
  assert(compile.includes('!prep.sourceDirty') && compile.includes("prep.typecheck === 'PASS'"));
  assert(native.includes("['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID']") && native.includes("['mac-desktop', 'MATCHRIM220_DESKTOP_LEASE_ID']")
    && native.includes("'ALL_TESTS_MUST_USE_THE_NEW_OWNED_CONTAINER'"));
});
assert.equal(groups, 5);
console.log(`Matchrim runner owner283: ${groups}/5 PASS`);
