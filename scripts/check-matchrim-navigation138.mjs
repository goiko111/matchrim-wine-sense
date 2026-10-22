import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { runNavigation138, makePlan, sanitizedEnvironment, evaluate, verifyInstalled, verifyEvidence,
  DEVICE, METHOD, MARKERS, VIEWS, REQUIRED_SOURCES, LEASE_FILE } from './qa-matchrim-navigation138.mjs';
import { OWNER, nativeReceiptPath } from './qa-matchrim-account114.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const testName = '-[Probe97.MatchrimNavigation138Tests testExistingQAReadOnlyNavigation138]';
const green = `Test Case '${testName}' started.\n${MARKERS.join('\n')}\nTest Case '${testName}' passed (1.0 seconds).\nExecuted 1 test, with 0 failures (0 unexpected) in 1.0 seconds\n`;
const resources = [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID'],
  ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']];

function fixture() {
  const entries = new Map(), fds = new Map(), reads = [], writes = [], calls = [], spawns = [], signals = [], scheduled = new Map();
  const repo = '/mock/repo', base = repo + '/qa-artifacts/night105-20261021', output = base + '/nav138-mock';
  const app = '/mock/native/build/derived/Build/Products/Debug-iphonesimulator/App.app';
  const installed = `/Users/GOIKO/Library/Developer/CoreSimulator/Devices/${DEVICE}/data/Containers/Bundle/Application/TEST/App.app`;
  const put = (file, data = '', mode = 0o600, directory = false) => entries.set(file, { data: Buffer.from(data), mode, directory });
  const stat = file => {
    assert(entries.has(file), 'Unseeded mock stat: ' + file);
    const entry = entries.get(file);
    return { mode: entry.mode, size: entry.data.length, isDirectory: () => entry.directory,
      isFile: () => !entry.directory, isSymbolicLink: () => Boolean(entry.symlink) };
  };
  const io = {
    existsSync: file => entries.has(file), statSync: stat, lstatSync: stat,
    realpathSync: file => { assert(entries.has(file), 'Unseeded realpath: ' + file); return entries.get(file).realpath || file; },
    readFileSync(file, encoding) {
      reads.push(file);
      assert(!/PRIVATE|reservation|Keychain|Cookies|Preferences|Photos\.sqlite|\/Media\//i.test(file), 'Forbidden sensitive read');
      assert(entries.has(file), 'Unseeded mock read: ' + file);
      return encoding ? entries.get(file).data.toString(encoding) : entries.get(file).data;
    },
    writeFileSync(file, data, options = {}) {
      file = fds.get(file) || file;
      assert(file.startsWith(output + '/'), 'Write outside owned fresh output: ' + file);
      if (options.flag === 'wx') assert(!entries.has(file), 'Not fresh: ' + file);
      writes.push(file); put(file, data, entries.get(file)?.mode ?? options.mode ?? 0o600);
    },
    mkdirSync(file, options) {
      assert(file === output || file.startsWith(output + '/')); assert(!entries.has(file)); put(file, '', options.mode, true);
    },
    chmodSync(file, mode) { assert(file === output || file.startsWith(output + '/')); entries.get(file).mode = mode; },
    statfsSync: () => ({ bavail: state.disk, bsize: 1 }),
    readdirSync: folder => [...entries].filter(([file]) => path.dirname(file) === folder).map(([file, entry]) => ({
      name: path.basename(file), isDirectory: () => entry.directory, isSymbolicLink: () => Boolean(entry.symlink),
    })),
    cpSync(source, target) {
      assert(target.startsWith(output + '/'));
      for (const [file, entry] of [...entries]) if (file === source || file.startsWith(source + '/')) {
        put(target + file.slice(source.length), entry.data, entry.mode, entry.directory);
      }
    },
    openSync(file, flag, mode) {
      assert(file.startsWith(output + '/')); assert.equal(flag, 'wx'); assert(!entries.has(file));
      put(file, '', mode); const fd = fds.size + 10; fds.set(fd, file); return fd;
    },
    closeSync: fd => assert(fds.delete(fd)),
  };
  let nextTimer = 0;
  const timers = {
    setTimeout(fn, ms) {
      assert(ms > 0 && ms <= 235000); const id = ++nextTimer; scheduled.set(id, { fn, ms });
      if (ms === 3000) queueMicrotask(() => { if (scheduled.has(id)) { scheduled.delete(id); fn(); } });
      return id;
    },
    clearTimeout: id => scheduled.delete(id),
    setInterval(fn, ms) { assert.equal(ms, 2000); const id = ++nextTimer; scheduled.set(id, { fn, interval: true }); return id; },
    clearInterval: id => scheduled.delete(id),
  };
  put(base, '', 0o700, true); put(installed, '', 0o755, true);
  const config = JSON.stringify({ webDir: 'dist', server: { iosScheme: 'capacitor' } });
  const html = '<script src="/assets/local.js"></script>';
  for (const [file, bytes] of [['App', 'exe'], ['Info.plist', 'plist'], ['capacitor.config.json', config], ['public/index.html', html]]) {
    put(app + '/' + file, bytes); put(installed + '/' + file, bytes);
  }
  put('/mock/prod/ios/App/App/capacitor.config.json', config);
  for (const file of REQUIRED_SOURCES) put(repo + '/' + file, 'source');
  const prep = { passed: true, typecheck: 'PASS', build: 138, commit: 'mock', production: '/mock/prod', startedUTC: new Date().toISOString(),
    publicConfiguration: { fixtures: false, analytics: false, masterConfigured: false, envDir: false },
    sourceFingerprints: Object.fromEntries(REQUIRED_SOURCES.map(file => [file, sha('source')])), webResources: { 'index.html': sha(html) } };
  const built = { passed: true, app, sourceCommit: 'mock', build: 138, nativeArtifact: {
    executableSHA256: sha('exe'), infoPlistSHA256: sha('plist'), capacitorConfigSHA256: sha(config) } };
  const environment = { MATCHRIM138_RUN_READONLY: 'YES', MATCHRIM114_PASSWORD: 'SYNTHETIC_SECRET',
    VITE_MATCHRIM_QA_FIXTURES: 'true', SIMCTL_CHILD_INJECT: 'bad', DYLD_INSERT_LIBRARIES: 'bad',
    XCTestConfigurationFilePath: 'bad', CUSTOM_ENV: 'bad', HOME: '/mock/home',
    ...Object.fromEntries(resources.map(([, key]) => [key, key])) };
  const leases = Object.fromEntries(resources.map(([resource, key]) => [resource, { owner: OWNER, leaseId: key, reviewAfter: Date.now() / 1000 + 3600 }]));
  const save = () => {
    put('/mock/prep/preparation.json', JSON.stringify(prep)); put(nativeReceiptPath(app), JSON.stringify(built));
    put(LEASE_FILE, JSON.stringify({ leases }));
  };
  save();
  for (const name of ['MatchrimNavigation138Probe.swift', 'qa-matchrim-navigation138.mjs', 'check-matchrim-navigation138.mjs', 'qa-matchrim-account114.mjs']) put(repo + '/scripts/' + name, 'mock source');
  const harness = repo + '/qa-artifacts/native99-20261021/native-audit-project';
  put(harness + '/Probe97.xcodeproj', '', 0o755, true); put(harness + '/Probe97.xcodeproj/project.pbxproj', 'project');
  const original = { testTargets: [{ target: { name: 'Probe97UITests', identifier: '000000000000000000000004', containerPath: 'container:Probe97.xcodeproj', injected: 'bad' }, skippedTests: [METHOD] }],
    defaultOptions: { maximumTestRepetitions: 99, environmentVariableEntries: [{ key: 'PASSWORD', value: 'SYNTHETIC_SECRET' }] },
    configurations: [{ options: { commandLineArgumentEntries: [{ argument: 'bad' }] } }] };
  put(harness + '/Probe97.xctestplan', JSON.stringify(original));
  const state = { disk: 10 * 1024 ** 3, clock: Date.now(), compileCode: 0, runtimeCode: 0, log: green, compileLog: 'compile only',
    afterCompile: null, afterRuntime: null, timeout: false, watch: false, exportFailure: false,
    spawnError: false, spawnThrow: false, runtimeSignal: null, resultMissing: false, evidenceMutation: null };
  const clean = env => {
    assert(!Object.values(env).includes('SYNTHETIC_SECRET'));
    assert.deepEqual(Object.keys(env).sort(), ['DEVELOPER_DIR', 'HOME', 'MATCHRIM102_HEAVY_LEASE_ID',
      'MATCHRIM102_WRITER_LEASE_ID', 'MATCHRIM104_SIMULATOR_LEASE_ID', 'PATH'].sort());
  };
  const evidence = () => {
    put(output + '/attachments', '', 0o755, true);
    const attachments = [...VIEWS.flatMap(view => [[view, 'png'], [view + '-ax', 'txt'],
      [view + '-geometry', 'txt'], [view + '-audit', 'txt']]), ['scope', 'txt']].map(([name, extension], index) => {
      const exportedFileName = 'evidence-' + index + '.' + extension;
      put(output + '/attachments/' + exportedFileName, 'synthetic evidence');
      return { configurationName: 'Navigation138Once', deviceId: DEVICE, repetitionNumber: 1,
        isAssociatedWithFailure: false, exportedFileName, suggestedHumanReadableName: 'nav138-' + name + '_0_UUID.' + extension };
    });
    const manifest = [{ testIdentifier: METHOD + '()', attachments }];
    state.evidenceMutation?.(manifest);
    put(output + '/attachments/manifest.json', JSON.stringify(manifest));
  };
  const exec = (command, args, options) => {
    calls.push({ command, args }); clean(options.env); assert(options.timeout > 0 && options.timeout <= 235000);
    if (command === '/usr/bin/plutil') return ({ CFBundleVersion: '138', CFBundleIdentifier: 'wine.matchrim.qa99review', CFBundleExecutable: 'App' })[args[1]];
    assert.equal(command, '/usr/bin/xcrun');
    if (args[0] === 'simctl') {
      assert.deepEqual(args, ['simctl', 'get_app_container', DEVICE, 'wine.matchrim.qa99review', 'app']); return installed;
    }
    assert.deepEqual(args, ['xcresulttool', 'export', 'attachments', '--path', output + '/result.xcresult', '--output-path', output + '/attachments']);
    if (state.exportFailure) throw new Error('arbitrary private detail');
    evidence(); return '';
  };
  const start = (command, args, options) => {
    assert(command.endsWith('/xcodebuild')); assert(options.detached); clean(options.env); spawns.push(args);
    assert(!args.some(arg => /test-iterations|test-repetition-relaunch|retry-tests/.test(arg)));
    const compile = args[0] === 'build-for-testing'; assert(compile || args[0] === 'test-without-building');
    assert(args.includes('id=' + DEVICE)); assert(args.includes('Navigation138Once'));
    if (!compile) {
      assert(args.includes('-only-testing:Probe97UITests/' + METHOD));
      if (!state.resultMissing) put(output + '/result.xcresult', '', 0o755, true);
    }
    io.writeFileSync(options.stdio[1], compile ? state.compileLog : state.log);
    if (state.spawnThrow) throw new Error('spawn private error');
    const child = new EventEmitter(); child.pid = 123; child.kill = signal => signals.push(['child', signal]);
    queueMicrotask(() => {
      (compile ? state.afterCompile : state.afterRuntime)?.();
      if (!compile && state.timeout) [...scheduled.values()].find(row => row.ms > 3000)?.fn();
      if (!compile && state.watch) [...scheduled.values()].find(row => row.interval)?.fn();
      if (state.spawnError) child.emit('error', new Error('private spawn error'));
      else child.emit('close', compile ? state.compileCode : state.runtimeCode, compile ? null : state.runtimeSignal);
    });
    return child;
  };
  const run = (overrides = {}) => runNavigation138({ repo, argv: ['/mock/prep', app, output], io, exec, start, environment,
    timers, now: () => state.clock, killGroup: (pid, signal) => { assert.equal(pid, 123); signals.push(['group', signal]); }, ...overrides });
  return { io, entries, reads, writes, calls, spawns, signals, scheduled, fds, state, leases, environment, prep, built, original,
    save, run, put, repo, app, installed, output, harness };
}

let checks = 0;
async function test(name, body) { await body(); checks++; console.log('PASS ' + name); }

await test('single-method plan rebuild discards inherited filters, arguments, secrets and retries', () => {
  const f = fixture(), plan = makePlan(f.original, randomUUID());
  assert.deepEqual(plan.testTargets[0].selectedTests, [METHOD]); assert.equal(plan.testTargets.length, 1);
  assert.equal(plan.defaultOptions.maximumTestRepetitions, 1); assert.equal(plan.defaultOptions.testRepetitionRelaunchEnabled, false);
  assert.equal(plan.testTargets[0].parallelizable, false);
  assert(!/PASSWORD|SYNTHETIC_SECRET|injected|skippedTests|commandLineArgument/.test(JSON.stringify(plan)));
  assert.deepEqual(plan.defaultOptions.environmentVariableEntries.map(row => row.key), ['MATCHRIM138_RUN_ID']);
  for (const original of [{ testTargets: [...f.original.testTargets, ...f.original.testTargets] },
    { testTargets: [{ target: { ...f.original.testTargets[0].target, name: 'Foreign' } }] },
    { testTargets: [{ target: { ...f.original.testTargets[0].target, containerPath: 'container:Other.xcodeproj' } }] }]) {
    assert.throws(() => makePlan(original, randomUUID()), /AMBIGUOUS_TARGET/);
  }
  assert.throws(() => makePlan(f.original, '-'.repeat(36)), /INVALID_RUN_ID/);
});
await test('environment allowlist strips opaque secrets and test injection', () => {
  assert.deepEqual(sanitizedEnvironment({ OPAQUE: 'secret', PATH: '/bad', HOME: '/home', XCTestConfigurationFilePath: 'bad' }),
    { HOME: '/home', PATH: '/usr/bin:/bin:/usr/sbin:/sbin', DEVELOPER_DIR: '/Applications/Xcode-26.0.1.app/Contents/Developer' });
});
await test('mock success binds existing installed app, exact method, private outputs and all five evidence pairs', async () => {
  const f = fixture(), { receipt } = await f.run(); assert.equal(receipt.passed, true, JSON.stringify(receipt));
  assert.equal(receipt.voiceOverSpeechClaimed, false); assert.equal(receipt.authSubmissionsRequested, 0);
  assert.equal(receipt.analysisOrMatchingActionsRequested, 0); assert.equal(receipt.dataMutationsRequested, 0);
  assert.deepEqual(f.spawns.map(args => args[0]), ['build-for-testing', 'test-without-building']);
  assert.equal(f.entries.get(f.output).mode, 0o700);
  for (const [file, entry] of f.entries) if (file.startsWith(f.output + '/')) assert.equal(entry.mode, entry.directory ? 0o700 : 0o600, file);
  assert.equal(f.scheduled.size, 0); assert.equal(f.fds.size, 0); assert.deepEqual(f.signals, []);
  assert.equal((await f.run()).receipt.reason, 'FRESH_OUTPUT_REQUIRED'); assert.equal(f.spawns.length, 2);
});

for (const [name, mutate] of [
  ['explicit authorization missing', f => { delete f.environment.MATCHRIM138_RUN_READONLY; }],
  ['foreign heavy lease', f => { f.leases['heavy-local'].owner = 'foreign'; }],
  ['expired simulator lease', f => { f.leases['ios-simulator'].reviewAfter = 0; }],
  ['foreign writer lease', f => { f.leases['writer-matchrim-native99'].leaseId = 'foreign'; }],
  ['missing heavy and simulator IDs', f => { delete f.environment.MATCHRIM102_HEAVY_LEASE_ID; delete f.environment.MATCHRIM104_SIMULATOR_LEASE_ID; }],
  ['disk below 5GiB', f => { f.state.disk = 5 * 1024 ** 3 - 1; }],
  ['stale prep', f => { f.prep.startedUTC = new Date(f.state.clock - 86400001).toISOString(); }],
  ['future prep', f => { f.prep.startedUTC = new Date(f.state.clock + 10000).toISOString(); }],
  ['failed prep', f => { f.prep.passed = false; }],
  ['fixtures enabled', f => { f.prep.publicConfiguration.fixtures = true; }],
  ['analytics enabled', f => { f.prep.publicConfiguration.analytics = true; }],
  ['master configured', f => { f.prep.publicConfiguration.masterConfigured = true; }],
  ['implicit environment', f => { delete f.prep.publicConfiguration.envDir; }],
  ['missing route binding', f => { delete f.prep.sourceFingerprints[REQUIRED_SOURCES[0]]; }],
  ['source drift', f => f.put(f.repo + '/' + REQUIRED_SOURCES[0], 'drift')],
  ['source symlink', f => { f.entries.get(f.repo + '/' + REQUIRED_SOURCES[0]).symlink = true; }],
  ['source traversal', f => { f.prep.sourceFingerprints['src/../../PRIVATE.json'] = sha('bad'); }],
  ['source absolute path', f => { f.prep.sourceFingerprints['/PRIVATE.json'] = sha('bad'); }],
  ['source dotfile', f => { f.prep.sourceFingerprints['src/.env'] = sha('bad'); }],
  ['web traversal', f => { f.prep.webResources['../PRIVATE.json'] = sha('bad'); }],
  ['web symlink', f => { f.entries.get(f.app + '/public/index.html').realpath = '/outside'; }],
  ['native drift', f => f.put(f.app + '/App', 'drift')],
  ['native receipt mismatch', f => { f.built.build = 137; }],
  ['installed drift', f => f.put(f.installed + '/App', 'different')],
  ['installed symlink', f => { f.entries.get(f.installed).realpath = '/outside'; }],
  ['foreign project target', f => { f.original.testTargets[0].target.name = 'Other'; f.put(f.harness + '/Probe97.xctestplan', JSON.stringify(f.original)); }],
  ['harness symlink', f => { f.entries.get(f.harness + '/Probe97.xcodeproj').symlink = true; }],
]) await test(name + ' blocks before any child or output write', async () => {
  const f = fixture(); mutate(f); f.save(); assert.equal((await f.run()).receipt.passed, false);
  assert.equal(f.spawns.length, 0); assert.equal(f.writes.length, 0);
});
await test('bad args, non-nav output and preexisting output fail closed', async () => {
  for (const argv of [[], ['/mock/prep', fixture().app, '/mock/repo/qa-artifacts/night105-20261021/ref136-other'],
    ['/mock/prep', fixture().app, '/tmp/nav138-other']]) {
    const f = fixture(); assert.equal((await f.run({ argv })).receipt.passed, false); assert.equal(f.spawns.length, 0);
  }
  const f = fixture(); f.put(f.output, '', 0o700, true);
  assert.equal((await f.run()).receipt.reason, 'FRESH_OUTPUT_REQUIRED'); assert.equal(f.spawns.length, 0);
});
await test('exact 5GiB boundary is accepted', async () => {
  const f = fixture(); f.state.disk = 5 * 1024 ** 3; assert.equal((await f.run()).receipt.passed, true);
});
await test('real preparation includes inert tracked ios gitignore without permitting env files', async () => {
  const f = fixture(); f.prep.sourceFingerprints['ios/.gitignore'] = sha('ignore rules');
  f.put(f.repo + '/ios/.gitignore', 'ignore rules'); f.save(); assert.equal((await f.run()).receipt.passed, true);
});

for (const [name, mutate] of [
  ['compile failure', f => { f.state.compileCode = 65; }],
  ['compile launched a test', f => { f.state.compileLog = green; }],
  ['post-compile source drift', f => { f.state.afterCompile = () => f.put(f.repo + '/' + REQUIRED_SOURCES[0], 'drift'); }],
  ['post-compile source symlink', f => { f.state.afterCompile = () => { f.entries.get(f.repo + '/' + REQUIRED_SOURCES[0]).realpath = '/outside'; }; }],
  ['post-compile installed drift', f => { f.state.afterCompile = () => f.put(f.installed + '/public/index.html', 'drift'); }],
  ['post-compile harness drift', f => { f.state.afterCompile = () => f.put(f.output + '/project/AutomationModeProbe.swift', 'drift'); }],
  ['post-compile prep drift', f => { f.state.afterCompile = () => f.put('/mock/prep/preparation.json', '{}'); }],
  ['post-compile foreign lease', f => { f.state.afterCompile = () => { f.leases['heavy-local'].owner = 'foreign'; f.save(); }; }],
  ['post-compile low disk', f => { f.state.afterCompile = () => { f.state.disk = 1; }; }],
  ['post-compile deadline', f => { f.state.afterCompile = () => { f.state.clock += 235001; }; }],
]) await test(name + ' prevents UI runtime', async () => {
  const f = fixture(); mutate(f); assert.equal((await f.run()).receipt.passed, false); assert.equal(f.spawns.length, 1);
  assert.equal(f.fds.size, 0); assert.equal(f.scheduled.size, 0);
});
await test('timeout cleans only owned group including descendants after leader closes', async () => {
  const f = fixture(); f.state.timeout = true; assert.equal((await f.run()).receipt.passed, false);
  assert.deepEqual(f.signals, [['group', 'SIGINT'], ['group', 'SIGKILL']]); assert.equal(f.scheduled.size, 0);
});
for (const [name, mutate] of [
  ['foreign live lease', f => { f.leases['ios-simulator'].owner = 'foreign'; f.save(); }],
  ['live low disk', f => { f.state.disk = 1; }],
  ['live source drift', f => f.put(f.repo + '/' + REQUIRED_SOURCES[0], 'drift')],
]) await test(name + ' watcher stops only owned child', async () => {
  const f = fixture(); f.state.watch = true; f.state.afterRuntime = () => mutate(f);
  assert.equal((await f.run()).receipt.passed, false);
  assert.deepEqual(f.signals, [['group', 'SIGINT'], ['group', 'SIGKILL']]); assert.equal(f.scheduled.size, 0);
});
await test('spawn failures never pass and descriptors/listeners/timers are cleaned', async () => {
  for (const key of ['spawnError', 'spawnThrow']) {
    const f = fixture(); f.state[key] = true; assert.equal((await f.run()).receipt.passed, false);
    assert.equal(f.fds.size, 0); assert.equal(f.scheduled.size, 0);
    assert.equal(f.spawns.length, 1);
  }
});
await test('failed leader still triggers owned descendant cleanup', async () => {
  for (const key of ['compileCode', 'runtimeCode']) {
    const f = fixture(); f.state[key] = 65; assert.equal((await f.run()).receipt.passed, false);
    assert.deepEqual(f.signals, [['group', 'SIGINT'], ['group', 'SIGKILL']]); assert.equal(f.scheduled.size, 0);
  }
  const f = fixture(); f.state.runtimeSignal = 'SIGTERM';
  assert.equal((await f.run()).receipt.passed, false);
  assert.deepEqual(f.signals, [['group', 'SIGINT'], ['group', 'SIGKILL']]);
});
await test('group cleanup fallback only targets this child', async () => {
  const f = fixture(); f.state.timeout = true;
  assert.equal((await f.run({ killGroup: () => { throw new Error('group unavailable'); } })).receipt.passed, false);
  assert.deepEqual(f.signals, [['child', 'SIGINT'], ['child', 'SIGKILL']]); assert.equal(f.scheduled.size, 0);
});
await test('replaced output root cannot receive final receipt or export', async () => {
  const f = fixture(); let writesBeforeSwap;
  f.state.afterRuntime = () => {
    writesBeforeSwap = f.writes.length;
    f.entries.get(f.output).realpath = '/outside'; f.entries.get(f.output).symlink = true;
  };
  const { receipt } = await f.run(); assert.equal(receipt.passed, false); assert.equal(receipt.reason, 'OUTPUT_PRIVACY_HOLD');
  assert.equal(f.writes.length, writesBeforeSwap); assert(!f.entries.has(f.output + '/RESULT.json'));
  assert(!f.calls.some(call => call.args[0] === 'xcresulttool'));
});
await test('post-runtime artifact drift, missing xcresult and export failure override success', async () => {
  for (const mutate of [f => { f.state.afterRuntime = () => f.put(f.installed + '/App', 'drift'); },
    f => { f.state.resultMissing = true; }, f => { f.state.exportFailure = true; }]) {
    const f = fixture(); mutate(f); const { receipt } = await f.run(); assert.equal(receipt.passed, false);
    assert.equal(receipt.stage, 'post-runtime-evidence-hold'); assert(!JSON.stringify(receipt).includes('arbitrary private detail'));
  }
});

for (const [name, log] of [
  ['empty exit-zero log', ''], ['summary only', 'Executed 1 test, with 0 failures in 1 second'],
  ['wrong method', green.replaceAll('testExistingQAReadOnlyNavigation138', 'testOther')],
  ['repeated method', green + green], ['duplicate completion', green + MARKERS.at(-1) + '\n'],
  ['missing identity', green.replace(MARKERS[0], '')], ['missing view audit', green.replace(MARKERS[4], '')],
  ['swapped views', green.replace(MARKERS[1], 'TEMP').replace(MARKERS[2], MARKERS[1]).replace('TEMP', MARKERS[2])],
  ['skipped method', green.replace('passed (1.0 seconds)', 'skipped (1.0 seconds)')],
  ['failed method', green.replace('passed (1.0 seconds)', 'failed (1.0 seconds)')],
  ['zero-test summary', green.replace('Executed 1 test', 'Executed 0 tests')],
  ['extra-test summary', green + 'Executed 2 tests, with 0 failures in 2 seconds\n'],
  ['failure marker', green + 'NAV138_FAILURE\n'], ['audit issue', green + 'NAV138_AUDIT_ISSUE\n'],
  ['auth action', green + 'ACCOUNT114_AUTH_SUBMITTED_ONCE\n'], ['save action', green + 'STYLE119_SAVE_SUBMITTED_ONCE\n'],
  ['unknown action', green + 'NAV138_UNKNOWN_CONTROL\n'], ['retry', green + 'Retrying failed test\n'],
  ['markers outside method', green.split('\n').filter(line => !line.startsWith('NAV138_')).join('\n') + MARKERS.join('\n') + '\n'],
  ['unsupported start boundary with pre-test markers', MARKERS.join('\n') + '\n'
    + green.split('\n').filter(line => !line.startsWith('NAV138_')).join('\n').replace('started.', 'started')],
]) await test(name + ' is rejected even with exit zero', async () => {
  assert.equal(evaluate(log, { code: 0 }).passed, false);
  const f = fixture(); f.state.log = log; assert.equal((await f.run()).receipt.passed, false);
});
await test('Observed Xcode single fixed iteration is accepted, never a repeated or ambiguous iteration count', () => {
  const log = green.replace('started.', 'started (Iteration 1 of 1).');
  assert.equal(evaluate(log, { code: 0, signal: null }).passed, true);
  for (const value of ['0 of 1', '2 of 1', '1 of 2', '1 of 10', '01 of 1', '1 of 1 extra']) {
    assert.equal(evaluate(log.replace('Iteration 1 of 1', 'Iteration ' + value), { code: 0, signal: null }).passed, false);
  }
});
await test('CRLF exact pass; exit, signal, spawn error and stop override markers', () => {
  assert.equal(evaluate(green.replaceAll('\n', '\r\n'), { code: 0 }).passed, true);
  for (const result of [{ code: 65 }, { code: null }, { code: 0, signal: 'SIGINT' }, { code: 0, spawnError: true }]) {
    assert.equal(evaluate(green, result).passed, false);
  }
  assert.equal(evaluate(green, { code: 0 }, 'HOLD').passed, false);
});

for (const [name, mutate] of [
  ['missing screenshot', manifest => { manifest[0].attachments.shift(); }],
  ['missing AX', manifest => { manifest[0].attachments.splice(1, 1); }],
  ['duplicate evidence', manifest => { manifest[0].attachments.push(manifest[0].attachments[0]); }],
  ['repeated run evidence', manifest => { manifest[0].attachments[0].repetitionNumber = 2; }],
  ['foreign simulator evidence', manifest => { manifest[0].attachments[0].deviceId = 'foreign'; }],
  ['foreign configuration evidence', manifest => { manifest[0].attachments[0].configurationName = 'Other'; }],
  ['failed audit evidence', manifest => { manifest[0].attachments[0].isAssociatedWithFailure = true; }],
  ['foreign method evidence', manifest => { manifest[0].testIdentifier = 'Other'; }],
  ['traversal evidence', manifest => { manifest[0].attachments[0].exportedFileName = '../image.png'; }],
]) await test(name + ' cannot pass exported-evidence gate', async () => {
  const f = fixture(); f.state.evidenceMutation = mutate;
  const { receipt } = await f.run(); assert.equal(receipt.passed, false); assert.equal(receipt.stage, 'post-runtime-evidence-hold');
});
await test('empty or symlinked exported files are rejected', async () => {
  const f = fixture(); assert.equal((await f.run()).receipt.passed, true);
  f.put(f.output + '/attachments/evidence-0.png', ''); assert.throws(() => verifyEvidence({ io: f.io, output: f.output }));
  f.put(f.output + '/attachments/evidence-0.png', 'bytes'); f.entries.get(f.output + '/attachments/evidence-0.png').symlink = true;
  assert.throws(() => verifyEvidence({ io: f.io, output: f.output }));
});
await test('installed binding rejects foreign device and changed config', () => {
  const f = fixture();
  assert.throws(() => verifyInstalled({ io: f.io, installed: '/foreign/App.app', app: f.app, prep: f.prep }));
  f.put(f.installed + '/capacitor.config.json', '{}');
  assert.throws(() => verifyInstalled({ io: f.io, installed: f.installed, app: f.app, prep: f.prep }));
});
await test('Swift is exactly one navigation-only test with unfiltered audits and retained evidence', () => {
  const source = fs.readFileSync(new URL('./MatchrimNavigation138Probe.swift', import.meta.url), 'utf8');
  assert.equal((source.match(/func test\w+\(/g) || []).length, 1);
  assert(source.includes('testExistingQAReadOnlyNavigation138'));
  assert.equal((source.match(/\.tap\(\)/g) || []).length, 1);
  assert(source.includes('link.tap()'));
  for (const name of ['profile', 'home', 'airim', 'scan', 'cellar']) assert(source.includes('try navigate(.' + name + ', app)'));
  for (const forbidden of ['typeText(', '.swipe', 'coordinate(', 'launchArguments', 'launchEnvironment', 'URLSession',
    'XCUIDevice.shared.orientation =', 'Entiendo y continuar', 'Elegir de galer', 'Photo Library', 'Confirmar esta referencia',
    'Guardar en Mis vinos', 'Cerrar sesi', 'return true']) assert(!source.includes(forbidden), forbidden);
  for (const required of ['info@winerim.com', 'app.launch()', 'XCUIScreen.main.screenshot()', 'app.debugDescription',
    '[.contrast, .sufficientElementDescription, .textClipped, .trait]', 'return false', 'issues == 0',
    'frame.width >= 44 && frame.height >= 44', 'link-limitation', 'No offscreen coverage', 'VoiceOver speech/focus-order claim']) assert(source.includes(required), required);
  assert(source.includes('continueAfterFailure = true'));
  assert(source.includes('continueAfterFailure = priorFailureMode'));
  assert(source.includes('try require(!auditHadIssues, app,'));
  assert(source.includes('NAV138_VIEW_AUDIT_FAILED'));
  assert(source.includes('mustFullyVisible: true'));
  assert(source.includes('window.intersects(frame)'));
  assert(source.includes('!mustFullyVisible || fullyVisible'));
  assert(source.includes('Partially exposed scroll content:'));
  for (const marker of MARKERS) assert.equal(source.split('"' + marker + '"').length - 1, 1, marker);
  assert(source.indexOf('NAV138_EXISTING_QA_IDENTITY') < source.indexOf('try captureAndAudit(app, "01-profile"'));
});
await test('Profile load uses Profile115-r5 contains-heading AX with exactly one match, not an exact emoji-sensitive lookup', () => {
  const source = fs.readFileSync(new URL('./MatchrimNavigation138Probe.swift', import.meta.url), 'utf8');
  assert(source.includes('let sensory = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Tu perfil sensorial"))'));
  assert(source.includes('sensory.count == 1 && sensory.firstMatch.exists'));
  assert(!source.includes('staticTexts["Tu perfil sensorial"]'));
  assert(source.includes('Home recommendation GETs through passthroughWinerim and aiRIM before-send profile GETs'));
});
await test('Contextual account text requires unique exact visible identity, never tappability of a noninteractive AX container', () => {
  for (const name of ['MatchrimNavigation138Probe.swift', 'MatchrimCellar144Probe.swift', 'MatchrimReference136Probe.swift']) {
    const source = fs.readFileSync(new URL('./' + name, import.meta.url), 'utf8');
    assert(source.includes('label == %@", "Correo de tu cuenta: info@winerim.com"'));
    assert(source.includes('identity.count == 1'));
    assert(source.includes('!identity.firstMatch.frame.isEmpty'));
    assert(source.includes('app.windows.firstMatch.frame.contains(identity.firstMatch.frame)'));
    assert(!source.includes('identity.firstMatch.isHittable'));
  }
  const source = fs.readFileSync(new URL('./MatchrimProfile115Probe.swift', import.meta.url), 'utf8');
  assert(source.includes('emails.count == 1 && !email.frame.isEmpty'));
  assert(source.includes('try insideVisibleBounds(email, app)'));
  assert(source.includes('settings.isHittable && settings.isEnabled'));
  assert(!source.includes('email.isHittable'));
});
await test('runner has no install/import/auth storage/settings/network/global cleanup commands', () => {
  const source = fs.readFileSync(new URL('./qa-matchrim-navigation138.mjs', import.meta.url), 'utf8');
  for (const forbidden of ["'install'", "'addmedia'", "'boot'", "'erase'", "'uninstall'", "'ui'", 'fetch(',
    'reserveAuth', 'reserveSave', 'PRIVATE-ACCESS', 'sqlite', 'Cookies', 'Keychain', 'rmSync', 'unlinkSync',
    'execSync(', "'killall'", "'pkill'"]) assert(!source.includes(forbidden), forbidden);
  assert(source.includes('now() + 240000')); assert(source.includes('await hardDone'));
  assert(source.includes('/^nav138-')); assert(source.includes("'get_app_container', DEVICE, bundle, 'app'"));
});

console.log(`Navigation138: ${checks} mock/source checks passed. No real Xcode, simulator, app, child process, network, credentials or output artifacts used.`);
