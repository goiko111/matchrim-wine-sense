import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { ACCOUNT, OWNER, AUTH_METHOD, SUBMISSION, COMPLETION, checkLeases, checkHistory,
  reserveAuth, makePrivatePlan, evaluateAuthResult, nativeReceiptPath, runAccount114 } from './qa-matchrim-account114.mjs';

// All runner I/O is injected. No real filesystem, process, simulator or account access.
const hash = value => createHash('sha256').update(value).digest('hex');
class MemoryFS {
  entries = new Map(); descriptors = new Map(); nextFD = 10; reads = []; syncs = [];
  seed(file, value, mode = 0o600) {
    const parent = path.dirname(file);
    if (parent !== file && !this.entries.has(parent)) this.seedDir(parent);
    this.entries.set(file, { bytes: Buffer.from(value), mode, directory: false });
  }
  seedDir(folder, mode = 0o700) {
    const parent = path.dirname(folder);
    if (parent !== folder && !this.entries.has(parent)) this.seedDir(parent);
    this.entries.set(folder, { mode, directory: true });
  }
  existsSync = file => this.entries.has(file);
  statSync = file => {
    const entry = this.entries.get(file); assert(entry, 'Mock path missing: ' + file);
    return { mode: entry.mode, isDirectory: () => entry.directory, isFile: () => !entry.directory };
  };
  lstatSync = file => this.statSync(file);
  statfsSync = () => ({ bavail: 10 * 1024 ** 3, bsize: 1 });
  readFileSync = (file, encoding) => {
    this.reads.push(file); const entry = this.entries.get(file);
    assert(entry && !entry.directory, 'Unseeded mock read; real FS is never used: ' + file);
    return encoding ? entry.bytes.toString(encoding) : Buffer.from(entry.bytes);
  };
  writeFileSync = (file, bytes, options = {}) => {
    if (typeof file === 'number') file = this.descriptors.get(file);
    if (options.flag === 'wx' && this.existsSync(file)) throw Object.assign(new Error('Mock EEXIST'), { code: 'EEXIST' });
    this.seed(file, bytes, this.entries.get(file)?.mode ?? options.mode ?? 0o600);
  };
  mkdirSync = (folder, options = {}) => { assert(!this.existsSync(folder)); this.seedDir(folder, options.mode ?? 0o700); };
  readdirSync = (folder, options = {}) => {
    assert(this.statSync(folder).isDirectory());
    const names = [...this.entries.keys()].filter(file => file !== folder && path.dirname(file) === folder).map(file => path.basename(file));
    return options.withFileTypes ? names.map(name => ({ name, isDirectory: () => this.entries.get(path.join(folder, name)).directory })) : names;
  };
  openSync = (file, flag, mode) => {
    if (flag === 'wx') this.writeFileSync(file, '', { mode, flag }); else assert(this.existsSync(file));
    const fd = this.nextFD++; this.descriptors.set(fd, file); return fd;
  };
  closeSync = fd => { assert(this.descriptors.delete(fd)); };
  fsyncSync = fd => { assert(this.descriptors.has(fd)); this.syncs.push(this.descriptors.get(fd)); };
  cpSync = (source, target) => {
    for (const [file, entry] of [...this.entries]) {
      if (file !== source && !file.startsWith(source + '/')) continue;
      const dest = target + file.slice(source.length);
      if (entry.directory) this.seedDir(dest, entry.mode); else this.seed(dest, entry.bytes, entry.mode);
    }
  };
}

const name = '-[Probe97.MatchrimAccount114Tests testExistingQAAccountReadOnly114]';
const successLog = `Test Case '${name}' started.\n${SUBMISSION}\n${COMPLETION}\nTest Case '${name}' passed (1.0 seconds).\nExecuted 1 test, with 0 failures (0 unexpected) in 1.0 seconds\n`;
const resources = [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']];
const mockAccessPath = '/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim97-physical-20261020/account/PRIVATE-ACCESS.json';
const mockLeasePath = '/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json';
function fixture() {
  const io = new MemoryFS(), repo = '/mock/repo', base = repo + '/qa-artifacts/night105-20261021';
  const app = '/mock/build-only103-r3/build/derived/Build/Products/Debug-iphonesimulator/App.app';
  const prepRoot = '/mock/preparation', output = base + '/account114-review-custom';
  const config = JSON.stringify({ appId: 'wine.matchrim.app', webDir: 'dist', server: { iosScheme: 'capacitor' } });
  const html = '<link rel="canonical" href="https://example.invalid"><script type="module" src="/assets/local.js"></script>';
  io.seedDir(base); io.seed(repo + '/src/App.tsx', 'mock source');
  io.seed(app + '/App', 'mock executable'); io.seed(app + '/Info.plist', 'mock plist');
  io.seed(app + '/capacitor.config.json', config); io.seed('/mock/production/ios/App/App/capacitor.config.json', config);
  io.seed(app + '/public/index.html', html);
  const prep = { passed: true, typecheck: 'PASS', build: 103, commit: 'mock-commit', production: '/mock/production',
    sourceFingerprints: { 'src/App.tsx': hash('mock source') }, webResources: { 'index.html': hash(html) } };
  const built = { passed: true, app, sourceCommit: prep.commit, build: prep.build, nativeArtifact: {
    executableSHA256: hash('mock executable'), capacitorConfigSHA256: hash(config), infoPlistSHA256: hash('mock plist') } };
  const environment = Object.fromEntries(resources.map(([, key], index) => [key, 'mock-lease-' + index]));
  const leases = Object.fromEntries(resources.map(([resource, key]) => [resource, { owner: OWNER, leaseId: environment[key], reviewAfter: Date.now() / 1000 + 3600 }]));
  const original = { version: 1, defaultOptions: { testRepetitionMode: 'retryOnFailure', maximumTestRepetitions: 9 },
    configurations: [{ name: 'Old', options: { testRepetitionMode: 'untilFailure' } }],
    testTargets: [{ target: { name: 'Probe97', identifier: 'mock-target', containerPath: 'container:Probe97.xcodeproj' }, skippedTests: [AUTH_METHOD] }] };
  const old = repo + '/qa-artifacts/native99-20261021/native-audit-project';
  io.seed(old + '/Probe97.xcodeproj/project.pbxproj', 'mock project'); io.seed(old + '/Probe97.xctestplan', JSON.stringify(original));
  io.seed(repo + '/scripts/qa-matchrim-account114.mjs', 'mock runner'); io.seed(repo + '/scripts/MatchrimAccount114Probe.swift', 'mock Swift');
  io.seed(mockAccessPath, JSON.stringify({ email: ACCOUNT, password: 'synthetic-only-not-a-secret' }));
  const save = () => {
    io.seed(prepRoot + '/preparation.json', JSON.stringify(prep));
    io.seed(nativeReceiptPath(app), JSON.stringify(built)); io.seed(mockLeasePath, JSON.stringify({ leases }));
  };
  save();
  const calls = [], spawns = [];
  const state = { compileCode: 0, runtimeCode: 0, runtimeSignal: null, runtimeLog: successLog, afterCompile: null, throwOnAuthStart: false };
  const exec = (command, args) => {
    calls.push({ command, args });
    if (command === '/usr/bin/plutil') return ({ CFBundleVersion: '103', CFBundleIdentifier: 'wine.matchrim.qa99review', CFBundleExecutable: 'App' })[args[1]] + '\n';
    assert.equal(command, '/usr/bin/xcrun'); assert.equal(args[0], 'simctl');
    return args[1] === 'ui' && args.length === 4 ? 'large\n' : '';
  };
  const start = (command, args, options) => {
    assert(command.endsWith('/xcodebuild')); spawns.push(args);
    const compile = args[0] === 'build-for-testing';
    assert(compile || args[0] === 'test-without-building');
    if (!compile) {
      assert(io.existsSync(base + '/account114-auth-reservation.json'));
      assert(io.syncs.includes(base + '/account114-auth-reservation.json') && io.syncs.includes(base));
      assert(args.includes('-only-testing:Probe97/' + AUTH_METHOD));
      assert(!args.includes('-test-iterations'), 'Xcode rejects the one-iteration CLI flag');
      assert(!args.includes('-test-repetition-relaunch-enabled'));
      if (state.throwOnAuthStart) throw new Error('Mock spawn interruption');
    }
    assert(!JSON.stringify(args).includes('synthetic-only-not-a-secret'));
    io.writeFileSync(options.stdio[1], compile ? 'Compile only\n' : state.runtimeLog);
    const child = new EventEmitter(); child.pid = 123456; child.kill = () => {};
    queueMicrotask(() => {
      if (compile) state.afterCompile?.();
      child.emit('close', compile ? state.compileCode : state.runtimeCode, compile ? null : state.runtimeSignal);
    });
    return child;
  };
  const run = async (destination = output) => runAccount114({ argv: [prepRoot, app, destination], repo, io, exec, start, environment,
    killGroup: () => { throw new Error('No real process signals in mocks'); } });
  return { io, repo, base, app, output, prep, built, leases, environment, original, state, calls, spawns, save, run };
}

let count = 0;
async function test(label, body) { await body(); count += 1; console.log('PASS ' + label); }
function noAuth(f) {
  assert.equal(f.spawns.filter(args => args[0] === 'test-without-building').length, 0);
  assert(!f.io.existsSync(f.base + '/account114-auth-reservation.json'));
}
function noPrivateOrProcesses(f) { noAuth(f); assert(!f.io.reads.includes(mockAccessPath)); assert.equal(f.spawns.length, 0); }

await test('valid lease snapshot', () => { const f = fixture(); checkLeases(f.leases, f.environment); });
for (const [label, mutate] of [
  ['foreign heavy lease', f => { f.leases['heavy-local'].owner = 'foreign'; }],
  ['expired simulator lease', f => { f.leases['ios-simulator'].reviewAfter = 0; }],
  ['wrong writer lease id', f => { f.leases['writer-matchrim-native99'].leaseId = 'foreign'; }],
]) {
  await test(label + ' persists pre-submit hold before private reads', async () => {
    const f = fixture(); mutate(f); f.save(); const { receipt } = await f.run();
    assert.equal(receipt.stage, 'pre-submit-hold'); assert.equal(receipt.passed, false);
    assert(receipt.reason.startsWith('RESOURCE_HOLD_')); noPrivateOrProcesses(f);
    assert.equal(f.io.statSync(f.output).mode, 0o700); assert.equal(f.io.statSync(f.output + '/RESULT.json').mode, 0o600);
    assert.equal(f.calls.length, 0);
  });
}
for (const [label, config, reason] of [
  ['remote server', { webDir: 'dist', server: { url: 'https://example.invalid' } }, 'REMOTE_SERVER_URL'],
  ['empty server URL', { webDir: 'dist', server: { url: '' } }, 'REMOTE_SERVER_URL'],
  ['remote webDir', { webDir: 'https://example.invalid' }, 'REMOTE_WEB_DIR'],
  ['protocol-relative webDir', { webDir: '//example.invalid/app' }, 'REMOTE_WEB_DIR'],
  ['whitespace remote webDir', { webDir: ' https://example.invalid' }, 'REMOTE_WEB_DIR'],
  ['remote iOS scheme', { webDir: 'dist', server: { iosScheme: 'https' } }, 'REMOTE_WEB_SCHEME'],
]) {
  await test(label + ' rejected even with matching artifact hashes', async () => {
    const f = fixture(), bytes = JSON.stringify(config);
    f.io.seed(f.app + '/capacitor.config.json', bytes); f.io.seed(f.prep.production + '/ios/App/App/capacitor.config.json', bytes);
    f.built.nativeArtifact.capacitorConfigSHA256 = hash(bytes); f.save();
    const { receipt } = await f.run(); assert.equal(receipt.reason, reason); noPrivateOrProcesses(f);
  });
}
await test('remote web entry rejected', async () => {
  const f = fixture(), html = '<script src="https://example.invalid/app.js"></script>';
  f.io.seed(f.app + '/public/index.html', html); f.prep.webResources['index.html'] = hash(html); f.save();
  assert.equal((await f.run()).receipt.reason, 'REMOTE_WEB_ENTRY'); noPrivateOrProcesses(f);
});
for (const [label, mutate, reason] of [
  ['old unbound receipt', f => { delete f.built.nativeArtifact; }, 'NATIVE_ARTIFACT_MISMATCH_executableSHA256'],
  ['modified executable', f => f.io.seed(f.app + '/App', 'changed'), 'NATIVE_ARTIFACT_MISMATCH_executableSHA256'],
  ['modified plist', f => f.io.seed(f.app + '/Info.plist', 'changed'), 'NATIVE_ARTIFACT_MISMATCH_infoPlistSHA256'],
  ['mismatched prepared config', f => f.io.seed(f.prep.production + '/ios/App/App/capacitor.config.json', '{}'), 'CAPACITOR_PREPARATION_MISMATCH'],
  ['wrong receipt app', f => { f.built.app = '/mock/old-r2/App.app'; }, 'NATIVE_RECEIPT_MISMATCH'],
  ['wrong source commit', f => { f.built.sourceCommit = 'other'; }, 'NATIVE_RECEIPT_MISMATCH'],
  ['wrong build', f => { f.built.build = 102; }, 'NATIVE_RECEIPT_MISMATCH'],
  ['failed receipt', f => { f.built.passed = false; }, 'NATIVE_RECEIPT_MISMATCH'],
]) {
  await test(label + ' fails before private reads', async () => {
    const f = fixture(); mutate(f); f.save(); const { receipt } = await f.run();
    assert.equal(receipt.reason, reason); noPrivateOrProcesses(f);
  });
}
for (const evidence of ['AUTH-SUBMITTED.json', 'runtime.log', 'RESULT.json']) {
  await test('nonstandard output history blocks via ' + evidence, async () => {
    const f = fixture(), prior = f.base + '/account114-custom-not-r-digits';
    f.io.seed(prior + '/' + evidence, evidence === 'runtime.log' ? SUBMISSION + '\n' : evidence === 'RESULT.json' ? '{"authReserved":true}' : '{}');
    const { receipt } = await f.run(); assert.equal(receipt.passed, false); assert(receipt.reason.startsWith('PRIOR_AUTH_')); noPrivateOrProcesses(f);
  });
}
await test('reservation survives interrupted/empty write and blocks forever', () => {
  const f = fixture(); f.io.seed(f.base + '/account114-auth-reservation.json', '');
  assert.throws(() => checkHistory(f.io, f.base), /AUTH_BUDGET_ALREADY_RESERVED/);
});
await test('atomic reservation is synced and cannot be reacquired', () => {
  const f = fixture(); reserveAuth(f.io, f.base, { state: 'reserved' });
  assert.equal(f.io.statSync(f.base + '/account114-auth-reservation.json').mode, 0o600);
  assert(f.io.syncs.includes(f.base)); assert.throws(() => reserveAuth(f.io, f.base, {}));
});
await test('concurrent reservation exclusive-create race fails closed', () => {
  const f = fixture(), open = f.io.openSync;
  f.io.openSync = (file, flag, mode) => {
    if (file.endsWith('/account114-auth-reservation.json') && flag === 'wx') f.io.seed(file, '{}');
    return open(file, flag, mode);
  };
  assert.throws(() => reserveAuth(f.io, f.base, {}), /AUTH_BUDGET_ALREADY_RESERVED/);
});
await test('reservation sync interruption prevents auth and permanently consumes budget', async () => {
  const f = fixture(), sync = f.io.fsyncSync;
  f.io.fsyncSync = fd => {
    if (f.io.descriptors.get(fd).endsWith('/account114-auth-reservation.json')) throw new Error('Mock sync interruption');
    sync(fd);
  };
  const { receipt } = await f.run(); assert.equal(receipt.passed, false); assert.equal(receipt.authBudgetConsumed, true);
  assert.equal(f.spawns.filter(args => args[0] === 'test-without-building').length, 0);
  assert.equal((await f.run(f.base + '/account114-after-sync-error')).receipt.reason, 'AUTH_BUDGET_ALREADY_RESERVED');
});
await test('compile failure leaves auth budget unused', async () => {
  const f = fixture(); f.state.compileCode = 65; const { receipt } = await f.run();
  assert.equal(receipt.stage, 'compile-preflight-failed'); assert.equal(receipt.reason, 'COMPILE_PREFLIGHT_FAILED'); noAuth(f);
  assert(!f.calls.some(call => call.command === '/usr/bin/xcrun'));
});
await test('source drift after compile prevents install and reservation', async () => {
  const f = fixture(); f.state.afterCompile = () => f.io.seed(f.repo + '/src/App.tsx', 'changed');
  const { receipt } = await f.run(); assert.equal(receipt.reason, 'SOURCE_CHANGED'); noAuth(f);
  assert(!f.calls.some(call => call.command === '/usr/bin/xcrun'));
});
await test('private plan drops inherited retries, filters and extra configurations', () => {
  const f = fixture(), plan = makePrivatePlan(f.original, { email: ACCOUNT, password: 'synthetic-only-not-a-secret' }, 'mock-id');
  assert.equal(plan.defaultOptions.testRepetitionMode, 'fixedIterations'); assert.equal(plan.defaultOptions.maximumTestRepetitions, 1);
  assert.equal(plan.defaultOptions.testRepetitionRelaunchEnabled, false); assert.equal(plan.configurations.length, 1);
  assert.deepEqual(plan.configurations[0].options, {}); assert(!Object.hasOwn(plan.testTargets[0], 'skippedTests'));
  assert.equal(plan.testTargets[0].parallelizable, false); assert.equal(plan.testTargets.length, 1);
});
await test('newline credential rejected without compile or reservation', async () => {
  const f = fixture(); f.io.seed(mockAccessPath, JSON.stringify({ email: ACCOUNT, password: 'synthetic-only\nnot-a-secret' }));
  const { receipt } = await f.run(); assert.equal(receipt.stage, 'private-environment-preflight-failed'); assert.equal(receipt.reason, 'PRIVATE_ENVIRONMENT_INVALID');
  noAuth(f); assert.equal(f.spawns.length, 0);
});
await test('private plan is 0600 under 0700 and compile precedes reserved auth', async () => {
  const f = fixture(); const { receipt } = await f.run(); assert.equal(receipt.passed, true);
  assert.deepEqual(f.spawns.map(args => args[0]), ['build-for-testing', 'test-without-building']);
  assert.equal(f.io.statSync(f.output + '/project').mode, 0o700);
  assert.equal(f.io.statSync(f.output + '/project/Probe97.xctestplan').mode, 0o600);
  assert(receipt.authReserved && receipt.authSubmitted && receipt.authAttemptMayHaveStarted);
  assert(!JSON.stringify(receipt).includes('synthetic-only-not-a-secret'));
});
await test('interruption after reservation is unknown and new output cannot rerun', async () => {
  const f = fixture(); f.state.runtimeLog = ''; f.state.runtimeCode = null; f.state.runtimeSignal = 'SIGINT';
  const first = await f.run(); assert.equal(first.receipt.stage, 'unknown-after-submit'); assert.equal(first.receipt.authReserved, true);
  const before = f.spawns.length; const second = await f.run(f.base + '/account114-another-custom-name');
  assert.equal(second.receipt.reason, 'AUTH_BUDGET_ALREADY_RESERVED'); assert.equal(f.spawns.length, before);
});
await test('spawn failure after reservation also blocks rerun', async () => {
  const f = fixture(); f.state.throwOnAuthStart = true;
  assert.equal((await f.run()).receipt.stage, 'unknown-after-submit');
  assert(f.io.existsSync(f.base + '/account114-auth-reservation.json'));
  assert.equal((await f.run(f.base + '/account114-after-spawn-error')).receipt.reason, 'AUTH_BUDGET_ALREADY_RESERVED');
});
await test('exit zero with skipped/zero tests fails closed and consumes reservation', async () => {
  const f = fixture(); f.state.runtimeLog = 'Executed 0 tests, with 0 failures in 0 seconds\n';
  const { receipt } = await f.run(); assert.equal(receipt.passed, false); assert.equal(receipt.stage, 'unknown-after-submit'); assert.equal(receipt.authReserved, true);
});
await test('post-login evidence exposure is private and distinct from unknown auth', async () => {
  const f = fixture(); f.state.runtimeLog += 'synthetic-only-not-a-secret\n';
  const { receipt } = await f.run(); assert.equal(receipt.passed, false); assert.equal(receipt.stage, 'post-login-evidence-hold');
  assert.equal(receipt.reason, 'PRIVATE_TEXT_EXPOSURE_HOLD'); assert.equal(receipt.authBudgetConsumed, true);
  assert(!JSON.stringify(receipt).includes('synthetic-only-not-a-secret'));
});
for (const [label, log] of [
  ['missing submission', successLog.replace(SUBMISSION + '\n', '')],
  ['missing completion', successLog.replace(COMPLETION + '\n', '')],
  ['duplicate submission', successLog + SUBMISSION + '\n'],
  ['duplicate completion', successLog + COMPLETION + '\n'],
  ['repeated method', successLog + successLog],
  ['wrong method', successLog.replaceAll('testExistingQAAccountReadOnly114', 'testOther')],
  ['skipped method', successLog.replace('passed (1.0 seconds)', 'skipped (1.0 seconds)')],
]) {
  await test(label + ' cannot produce PASS', () => assert.equal(evaluateAuthResult(log, { code: 0 }).passed, false));
}
for (const [marker, submitted, stage] of [
  ['PRE_SUBMIT_UI', false, 'pre-submit-ui-failure'], ['PRIVATE_ENVIRONMENT', false, 'private-environment-preflight-failed'],
  ['AUTH_REJECTED', true, 'authentication-rejected'], ['POST_LOGIN_ASSERTION', true, 'post-login-assertion-failed'],
  ['AUTH_OUTCOME_UNKNOWN', true, 'unknown-after-submit'],
]) {
  await test('classifies ' + stage, () => {
    const log = (submitted ? SUBMISSION + '\n' : '') + 'ACCOUNT114_FAILURE_' + marker + '\n';
    assert.equal(evaluateAuthResult(log, { code: 65 }).stage, stage);
  });
}
await test('stop overrides otherwise green markers', () => assert.equal(evaluateAuthResult(successLog, { code: 0 }, 'RESOURCE_HOLD').stage, 'unknown-after-submit'));
await test('strict positive case including CRLF', () => assert.equal(evaluateAuthResult(successLog.replaceAll('\n', '\r\n'), { code: 0 }).passed, true));
console.log(`Account114 mocked checks: ${count} passed; no real I/O, builds, GUI, network or credentials.`);
