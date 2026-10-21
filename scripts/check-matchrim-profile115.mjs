import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { runProfile115, makePlan, evaluateProfileResult, METHOD, IDENTITY, COMPLETION, DEVICE, MAXIMUM_TYPE } from './qa-matchrim-profile115.mjs';
import { OWNER, nativeReceiptPath } from './qa-matchrim-account114.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const testName = '-[Probe97.MatchrimProfile115Tests testExistingQAProfileMaximumType115]';
const green = `Test Case '${testName}' started.\n${IDENTITY}\n${COMPLETION}\nTest Case '${testName}' passed (1.0 seconds).\nExecuted 1 test, with 0 failures (0 unexpected) in 1.0 seconds\n`;
const resources = [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']];

function fixture() {
  const entries = new Map(), fds = new Map(), reads = [], calls = [], spawns = [];
  const repo = '/mock/repo', base = repo + '/qa-artifacts/night105-20261021', output = base + '/profile115-mock';
  const app = '/mock/native/build/derived/Build/Products/Debug-iphonesimulator/App.app';
  const put = (file, data = '', mode = 0o600, directory = false) => entries.set(file, { data: Buffer.from(data), mode, directory });
  const io = {
    existsSync: file => entries.has(file),
    readFileSync(file, encoding) {
      reads.push(file); assert(!/PRIVATE|reservation|AUTH-SUBMITTED/i.test(file), 'Forbidden auth read');
      assert(entries.has(file), 'Unseeded mock read: ' + file);
      return encoding ? entries.get(file).data.toString(encoding) : entries.get(file).data;
    },
    writeFileSync(file, data, options = {}) {
      file = fds.get(file) || file;
      assert(!/reservation|AUTH-SUBMITTED/i.test(file), 'Forbidden auth write');
      if (options.flag === 'wx') assert(!entries.has(file));
      put(file, data, entries.get(file)?.mode ?? options.mode ?? 0o600);
    },
    mkdirSync(file, options) { assert(!entries.has(file)); put(file, '', options.mode, true); },
    statSync(file) { assert(entries.has(file)); return { mode: entries.get(file).mode }; },
    chmodSync(file, mode) { entries.get(file).mode = mode; },
    statfsSync: () => ({ bavail: state.disk, bsize: 1 }),
    readdirSync(folder) {
      return [...entries].filter(([file]) => path.dirname(file) === folder).map(([file, entry]) => ({
        name: path.basename(file), isDirectory: () => entry.directory, isSymbolicLink: () => false,
      }));
    },
    cpSync(source, target) {
      for (const [file, entry] of [...entries]) if (file === source || file.startsWith(source + '/')) {
        put(target + file.slice(source.length), entry.data, entry.mode, entry.directory);
      }
    },
    openSync(file, flag, mode) { assert.equal(flag, 'wx'); assert(!entries.has(file)); put(file, '', mode); const fd = fds.size + 10; fds.set(fd, file); return fd; },
    closeSync(fd) { assert(fds.delete(fd)); },
  };
  put(base, '', 0o700, true);
  const config = JSON.stringify({ webDir: 'dist', server: { iosScheme: 'capacitor' } });
  const html = '<script src="/assets/local.js"></script>';
  put(repo + '/src/mock.ts', 'source'); put(app + '/App', 'exe'); put(app + '/Info.plist', 'plist');
  put(app + '/capacitor.config.json', config); put('/mock/prod/ios/App/App/capacitor.config.json', config); put(app + '/public/index.html', html);
  const prep = { passed: true, typecheck: 'PASS', build: 115, commit: 'mock', production: '/mock/prod',
    sourceFingerprints: { 'src/mock.ts': hash('source') }, webResources: { 'index.html': hash(html) } };
  const built = { passed: true, app, sourceCommit: 'mock', build: 115, nativeArtifact: {
    executableSHA256: hash('exe'), infoPlistSHA256: hash('plist'), capacitorConfigSHA256: hash(config) } };
  const environment = Object.fromEntries(resources.map(([, key]) => [key, key]));
  environment.MATCHRIM114_PASSWORD = 'synthetic-do-not-forward';
  const leases = Object.fromEntries(resources.map(([resource, key]) => [resource, { owner: OWNER, leaseId: key, reviewAfter: Date.now() / 1000 + 3600 }]));
  const save = () => {
    put('/mock/prep/preparation.json', JSON.stringify(prep)); put(nativeReceiptPath(app), JSON.stringify(built));
    put('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', JSON.stringify({ leases }));
  };
  save();
  for (const file of ['MatchrimProfile115Probe.swift', 'qa-matchrim-profile115.mjs', 'qa-matchrim-account114.mjs']) put(repo + '/scripts/' + file, 'mock source');
  const old = repo + '/qa-artifacts/native99-20261021/native-audit-project';
  put(old + '/Probe97.xcodeproj', '', 0o755, true); put(old + '/Probe97.xcodeproj/project.pbxproj', 'project');
  const original = { testTargets: [{ target: { name: 'Probe97UITests' }, skippedTests: [METHOD] }],
    defaultOptions: { maximumTestRepetitions: 99, environmentVariableEntries: [{ key: 'PASSWORD', value: 'never' }] } };
  put(old + '/Probe97.xctestplan', JSON.stringify(original));
  const state = { disk: 10 * 1024 ** 3, size: 'accessibility-large', compileCode: 0, log: green, afterCompile: null, afterRuntime: null };
  const exec = (command, args, options) => {
    calls.push(args); assert(!options.env?.MATCHRIM114_PASSWORD);
    if (command === '/usr/bin/plutil') return ({ CFBundleVersion: '115', CFBundleIdentifier: 'wine.matchrim.qa99review', CFBundleExecutable: 'App' })[args[1]];
    assert.equal(command, '/usr/bin/xcrun'); assert.equal(args[0], 'simctl'); assert.equal(args[2], DEVICE);
    if (args[1] === 'ui') { if (args.length === 5) state.size = args[4]; return state.size; }
    assert.equal(args[1], 'install'); assert.equal(args[3], app); return '';
  };
  const start = (command, args, options) => {
    assert(command.endsWith('/xcodebuild')); assert(!options.env.MATCHRIM114_PASSWORD); spawns.push(args);
    const compile = args[0] === 'build-for-testing';
    assert(compile || args[0] === 'test-without-building');
    if (!compile) {
      assert.equal(state.size, MAXIMUM_TYPE);
      assert(args.includes('-only-testing:Probe97UITests/' + METHOD));
      assert.equal(args[args.indexOf('-test-iterations') + 1], '1');
      assert.equal(args[args.indexOf('-test-repetition-relaunch-enabled') + 1], 'NO');
    }
    io.writeFileSync(options.stdio[1], compile ? 'compile only' : state.log);
    const child = new EventEmitter(); child.pid = 123; child.kill = () => {};
    queueMicrotask(() => { (compile ? state.afterCompile : state.afterRuntime)?.(); child.emit('close', compile ? state.compileCode : 0, null); });
    return child;
  };
  const run = () => runProfile115({ repo, argv: ['/mock/prep', app, output], io, exec, start, environment,
    killGroup: () => assert.fail('No actual process signals') });
  return { io, entries, reads, calls, spawns, state, leases, prep, built, save, run, put, repo, app, output, original };
}

let checks = 0;
async function test(name, body) { await body(); checks++; console.log('PASS ' + name); }
await test('one readonly method; inherited credentials, retries and filters dropped', () => {
  const f = fixture(), plan = makePlan(f.original);
  assert.equal(plan.testTargets.length, 1); assert.deepEqual(plan.testTargets[0].selectedTests, [METHOD]);
  assert.equal(plan.defaultOptions.maximumTestRepetitions, 1); assert.equal(plan.defaultOptions.testRepetitionRelaunchEnabled, false);
  assert(!JSON.stringify(plan).includes('PASSWORD')); assert(!plan.testTargets[0].skippedTests);
});
await test('compile before runtime; maximum size; exact restore; private output; no auth reads or writes', async () => {
  const f = fixture(), { receipt } = await f.run(); assert.equal(receipt.passed, true, JSON.stringify(receipt));
  assert.deepEqual(f.spawns.map(args => args[0]), ['build-for-testing', 'test-without-building']);
  assert.equal(f.state.size, 'accessibility-large'); assert.equal(receipt.contentSizeRestored, true);
  assert.equal(f.entries.get(f.output).mode, 0o700); assert.equal(f.entries.get(f.output + '/runtime.log').mode, 0o600);
  assert.equal((await f.run()).receipt.reason, 'FRESH_OUTPUT_REQUIRED'); assert.equal(f.spawns.length, 2);
});
for (const [name, mutate] of [
  ['heavy ownership', f => { f.leases['heavy-local'].owner = 'other'; }],
  ['sim expiry', f => { f.leases['ios-simulator'].reviewAfter = 0; }],
  ['writer id', f => { f.leases['writer-matchrim-native99'].leaseId = 'other'; }],
  ['disk', f => { f.state.disk = 5 * 1024 ** 3 - 1; }],
  ['source hash', f => f.put(f.repo + '/src/mock.ts', 'drift')],
  ['bound artifact', f => f.put(f.app + '/App', 'drift')],
  ['bound plist', f => f.put(f.app + '/Info.plist', 'drift')],
  ['receipt', f => { f.built.build = 114; }],
  ['local config', f => {
    const bytes = JSON.stringify({ webDir: 'dist', server: { url: 'https://example.invalid' } });
    f.put(f.app + '/capacitor.config.json', bytes); f.put('/mock/prod/ios/App/App/capacitor.config.json', bytes);
    f.built.nativeArtifact.capacitorConfigSHA256 = hash(bytes);
  }],
]) await test(name + ' preflight blocks processes', async () => {
  const f = fixture(); mutate(f); f.save(); assert.equal((await f.run()).receipt.passed, false); assert.equal(f.spawns.length, 0);
  assert(!f.calls.some(args => args[0] === 'simctl'));
});
await test('compile failure blocks simulator operations', async () => {
  const f = fixture(); f.state.compileCode = 65;
  assert.equal((await f.run()).receipt.reason, 'COMPILE_PREFLIGHT_FAILED'); assert.equal(f.spawns.length, 1);
  assert(!f.calls.some(args => args[0] === 'simctl'));
});
await test('probe drift after compile blocks runtime', async () => {
  const f = fixture(); f.state.afterCompile = () => f.put(f.repo + '/scripts/MatchrimProfile115Probe.swift', 'drift');
  assert.equal((await f.run()).receipt.reason, 'SOURCE_OR_HARNESS_CHANGED'); assert.equal(f.spawns.length, 1);
});
await test('source drift after runtime fails and still restores exact size', async () => {
  const f = fixture(); f.state.afterRuntime = () => f.put(f.repo + '/src/mock.ts', 'drift');
  assert.equal((await f.run()).receipt.passed, false); assert.equal(f.state.size, 'accessibility-large');
});
for (const [name, log] of [
  ['empty exit zero', ''], ['suite only', 'Executed 1 test, with 0 failures in 1 second'],
  ['no identity', green.replace(IDENTITY, '')], ['no completion', green.replace(COMPLETION, '')],
  ['duplicate marker', green + COMPLETION + '\n'], ['repeated method', green + green],
  ['wrong method', green.replaceAll('testExistingQAProfileMaximumType115', 'testOther')],
  ['skipped', green.replace('passed (1.0 seconds)', 'skipped (1.0 seconds)')],
  ['zero executed', green.replace('Executed 1 test', 'Executed 0 tests')],
  ['failure marker', green + 'PROFILE115_FAILURE\n'],
  ['auth marker', green + 'ACCOUNT114_AUTH_SUBMITTED_ONCE\n'],
]) await test(name + ' cannot pass', () => assert.equal(evaluateProfileResult(log, { code: 0 }).passed, false));
await test('stop and nonzero status override markers', () => {
  assert.equal(evaluateProfileResult(green, { code: 0 }, 'HOLD').passed, false);
  assert.equal(evaluateProfileResult(green, { code: 65 }).passed, false);
  assert.equal(evaluateProfileResult(green.replaceAll('\n', '\r\n'), { code: 0 }).passed, true);
});
console.log(`Profile115: ${checks} mocked checks passed; no actual processes, generated files, UI or network.`);
