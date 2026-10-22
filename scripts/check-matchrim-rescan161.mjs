import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { runRescan161, makePlan, sanitizedEnvironment, evaluate, verifyInstalled, verifyEvidence,
  DEVICE, METHOD, MARKERS, VIEWS, REQUIRED_SOURCES, LEASE_FILE, parseReadback,
  INPUT_SHA256, INPUT_FILE, PUBLIC_FILE, BASELINE_FILE, BASELINE_SHA256, PUBLIC_SHA256, SELECTION_SCOPE,
  MEDIA, PHOTO_SQL, attestPhoto, bindLatestAsset, queryLatestRows, verifyRetainedContext } from './qa-matchrim-rescan161.mjs';
import { OWNER, nativeReceiptPath } from './qa-matchrim-account114.mjs';

const syntheticRecord = (runId, current = 43) => ({
  schemaVersion: 1, runId, inputSHA256: INPUT_SHA256, account: 'info@winerim.com',
  name: 'Flor de Muga Blanco', producer: 'Muga', vintage: 2022, vintagePhotoCertified: false,
  vintageWarning: 'Elegirla cambiará tu añada a', selectionScope: SELECTION_SCOPE, selectedPublicId: null,
  proposalCount: 1, personalRating: 'love', personalVerdictTitle: 'Tu valoración: te encanta',
  current, currentLabel: 'Afinidad orientativa: ' + current + ' de 100',
  dimensions: ['potencia', 'acidez', 'dulzor', 'tanino', 'fruta'].map(axis => axis + ': tu perfil 3.0/5; este vino 2.0/5'),
  provenance: 'Fuente: ficha pública Winerim. No especifica si el perfil sensorial procede de una cata o de datos generados.',
  newSavePersistenceValidated: false,
});
const sha = value => createHash('sha256').update(value).digest('hex');
const testName = '-[Probe97.MatchrimRescan161Tests testExistingQAReadOnlyRescan161]';
const green = `Test Case '${testName}' started.\n${MARKERS.join('\n')}\nTest Case '${testName}' passed (1.0 seconds).\nExecuted 1 test, with 0 failures (0 unexpected) in 1.0 seconds\n`;
const resources = [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID'],
  ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']];

function fixture() {
  const entries = new Map(), fds = new Map(), reads = [], writes = [], calls = [], spawns = [], signals = [], scheduled = new Map();
  const repo = '/mock/repo', base = repo + '/qa-artifacts/continuation161-20261022', output = base + '/rescan161-mock';
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
  const environment = { MATCHRIM161_RUN_READONLY: 'YES', MATCHRIM114_PASSWORD: 'SYNTHETIC_SECRET',
    VITE_MATCHRIM_QA_FIXTURES: 'true', SIMCTL_CHILD_INJECT: 'bad', DYLD_INSERT_LIBRARIES: 'bad',
    XCTestConfigurationFilePath: 'bad', CUSTOM_ENV: 'bad', HOME: '/mock/home',
    ...Object.fromEntries(resources.map(([, key]) => [key, key])) };
  const leases = Object.fromEntries(resources.map(([resource, key]) => [resource, { owner: OWNER, leaseId: key, reviewAfter: Date.now() / 1000 + 3600 }]));
  const save = () => {
    put('/mock/prep/preparation.json', JSON.stringify(prep)); put(nativeReceiptPath(app), JSON.stringify(built));
    put(LEASE_FILE, JSON.stringify({ leases }));
  };
  save();
  for (const name of ['MatchrimRescan161Probe.swift', 'qa-matchrim-rescan161.mjs', 'check-matchrim-rescan161.mjs', 'qa-matchrim-account114.mjs']) put(repo + '/scripts/' + name, 'mock source');
  for (const file of [INPUT_FILE, PUBLIC_FILE, BASELINE_FILE]) put(repo + '/' + file, 'retained bytes');
  const harness = repo + '/qa-artifacts/native99-20261021/native-audit-project';
  put(harness + '/Probe97.xcodeproj', '', 0o755, true); put(harness + '/Probe97.xcodeproj/project.pbxproj', 'project');
  const original = { testTargets: [{ target: { name: 'Probe97UITests', identifier: '000000000000000000000004', containerPath: 'container:Probe97.xcodeproj', injected: 'bad' }, skippedTests: [METHOD] }],
    defaultOptions: { maximumTestRepetitions: 99, environmentVariableEntries: [{ key: 'PASSWORD', value: 'SYNTHETIC_SECRET' }] },
    configurations: [{ options: { commandLineArgumentEntries: [{ argument: 'bad' }] } }] };
  put(harness + '/Probe97.xctestplan', JSON.stringify(original));
  const state = { disk: 10 * 1024 ** 3, clock: Date.now(), compileCode: 0, runtimeCode: 0, log: green, compileLog: 'compile only',
    afterCompile: null, afterRuntime: null, timeout: false, watch: false, exportFailure: false,
    spawnError: false, spawnThrow: false, runtimeSignal: null, resultMissing: false, evidenceMutation: null,
    photoFailure: false, changedPhoto: false, photoCalls: 0, contextFailure: false };
  const clean = env => {
    assert(!Object.values(env).includes('SYNTHETIC_SECRET'));
    assert.deepEqual(Object.keys(env).sort(), ['DEVELOPER_DIR', 'HOME', 'MATCHRIM102_HEAVY_LEASE_ID',
      'MATCHRIM102_WRITER_LEASE_ID', 'MATCHRIM104_SIMULATOR_LEASE_ID', 'PATH'].sort());
  };
  const evidence = () => {
    put(output + '/attachments', '', 0o755, true);
    const runId = JSON.parse(entries.get(output + '/project/Probe97.xctestplan').data).defaultOptions.environmentVariableEntries[0].value;
    const attachments = [...VIEWS.flatMap(view => [[view, 'png'], [view + '-ax', 'txt']]),
      ['first-image-ax', 'txt'], ['selected-proposal-ax', 'txt'], ['selected-vintage-scope', 'txt'],
      ['detail-audit', 'txt'], ['scope', 'txt'], ['readback', 'json']].map(([name, extension], index) => {
      const exportedFileName = 'evidence-' + index + '.' + extension;
      let bytes = 'synthetic evidence';
      if (extension === 'json') {
        const record = syntheticRecord(runId); state.recordMutation?.(record); bytes = JSON.stringify(record);
      }
      put(output + '/attachments/' + exportedFileName, bytes);
      return { configurationName: 'Rescan161Once', deviceId: DEVICE, repetitionNumber: 1,
        isAssociatedWithFailure: false, exportedFileName, suggestedHumanReadableName: 'rescan161-' + name + '_0_UUID.' + extension };
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
    assert(args.includes('id=' + DEVICE)); assert(args.includes('Rescan161Once'));
    if (!compile) {
      assert(entries.has(output + '/PHOTO-ATTESTATION.json')); assert(state.photoCalls >= 2);
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
  const photoAttestor = () => {
    state.photoCalls++; if (state.photoFailure) throw new Error('LATEST_ADDED_NOT_RESCAN161_INPUT');
    return { prepared: repo + '/' + INPUT_FILE, sha256: INPUT_SHA256,
      resident: MEDIA + '/DCIM/100APPLE/' + (state.changedPhoto ? 'changed.PNG' : 'current.PNG'), added: 100 };
  };
  const contextVerifier = () => {
    if (state.contextFailure) throw new Error('RETAINED_CONTEXT_CHANGED');
    return { baseline: 'cellar144-r5', baselineSHA256: BASELINE_SHA256, publicObservationSHA256: PUBLIC_SHA256 };
  };
  const run = (overrides = {}) => runRescan161({ repo, argv: ['/mock/prep', app, output], io, exec, start, environment,
    photoAttestor, contextVerifier, timers, now: () => state.clock, killGroup: (pid, signal) => { assert.equal(pid, 123); signals.push(['group', signal]); }, ...overrides });
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
  assert.deepEqual(plan.defaultOptions.environmentVariableEntries.map(row => row.key), ['MATCHRIM161_RUN_ID', 'MATCHRIM161_INPUT_SHA256']);
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
await test('mock success binds existing installed app, exact method, twelve evidence pairs, strict rescan record, saved love and unfiltered detail audit', async () => {
  const f = fixture(), { receipt } = await f.run(); assert.equal(receipt.passed, true, JSON.stringify(receipt));
  assert.equal(receipt.authSubmissionsRequested, 0);
  assert.equal(receipt.cloudAnalysisControlsRequested, 0); assert.equal(receipt.selectedPublicId, null); assert.equal(receipt.dataMutationsRequested, 0);
  assert.deepEqual(f.spawns.map(args => args[0]), ['build-for-testing', 'test-without-building']);
  assert.equal(f.entries.get(f.output).mode, 0o700);
  for (const [file, entry] of f.entries) if (file.startsWith(f.output + '/')) assert.equal(entry.mode, entry.directory ? 0o700 : 0o600, file);
  assert.equal(f.scheduled.size, 0); assert.equal(f.fds.size, 0); assert.deepEqual(f.signals, []);
  assert.equal((await f.run()).receipt.reason, 'FRESH_OUTPUT_REQUIRED'); assert.equal(f.spawns.length, 2);
});

for (const [name, mutate] of [
  ['explicit authorization missing', f => { delete f.environment.MATCHRIM161_RUN_READONLY; }],
  ['foreign heavy lease', f => { f.leases['heavy-local'].owner = 'foreign'; }],
  ['expired simulator lease', f => { f.leases['ios-simulator'].reviewAfter = 0; }],
  ['foreign writer lease', f => { f.leases['writer-matchrim-native99'].leaseId = 'foreign'; }],
  ['missing heavy and simulator IDs', f => { delete f.environment.MATCHRIM102_HEAVY_LEASE_ID; delete f.environment.MATCHRIM104_SIMULATOR_LEASE_ID; }],
  ['photo byte mismatch', f => { f.state.photoFailure = true; }],
  ['retained baseline drift', f => { f.state.contextFailure = true; }],
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
await test('bad args, non-rescan output and preexisting output fail closed', async () => {
  for (const argv of [[], ['/mock/prep', fixture().app, '/mock/repo/qa-artifacts/continuation161-20261022/ref136-other'],
    ['/mock/prep', fixture().app, '/tmp/rescan161-other']]) {
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
  ['post-compile photo changed', f => { f.state.afterCompile = () => { f.state.changedPhoto = true; }; }],
  ['post-compile new photo bytes wrong', f => { f.state.afterCompile = () => { f.state.photoFailure = true; }; }],
  ['post-compile public context drift', f => { f.state.afterCompile = () => f.put(f.repo + '/' + PUBLIC_FILE, 'drift'); }],
  ['post-compile retained baseline drift', f => { f.state.afterCompile = () => f.put(f.repo + '/' + BASELINE_FILE, 'drift'); }],
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
  ['live photo drift', f => { f.state.changedPhoto = true; }],
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
  ['wrong method', green.replaceAll('testExistingQAReadOnlyRescan161', 'testOther')],
  ['repeated method', green + green], ['duplicate completion', green + MARKERS.at(-1) + '\n'],
  ['missing identity', green.replace(MARKERS[0], '')], ['missing view audit', green.replace(MARKERS[4], '')],
  ['swapped views', green.replace(MARKERS[1], 'TEMP').replace(MARKERS[2], MARKERS[1]).replace('TEMP', MARKERS[2])],
  ['skipped method', green.replace('passed (1.0 seconds)', 'skipped (1.0 seconds)')],
  ['failed method', green.replace('passed (1.0 seconds)', 'failed (1.0 seconds)')],
  ['zero-test summary', green.replace('Executed 1 test', 'Executed 0 tests')],
  ['extra-test summary', green + 'Executed 2 tests, with 0 failures in 2 seconds\n'],
  ['failure marker', green + 'RESCAN161_FAILURE\n'], ['audit issue', green + 'RESCAN161_AUDIT_ISSUE\n'],
  ['auth action', green + 'ACCOUNT114_AUTH_SUBMITTED_ONCE\n'], ['save action', green + 'STYLE119_SAVE_SUBMITTED_ONCE\n'],
  ['unknown action', green + 'RESCAN161_UNKNOWN_CONTROL\n'], ['retry', green + 'Retrying failed test\n'],
  ['markers outside method', green.split('\n').filter(line => !line.startsWith('RESCAN161_')).join('\n') + MARKERS.join('\n') + '\n'],
  ['unsupported start boundary with pre-test markers', MARKERS.join('\n') + '\n'
    + green.split('\n').filter(line => !line.startsWith('RESCAN161_')).join('\n').replace('started.', 'started')],
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
  f.put(f.output + '/attachments/evidence-0.png', ''); assert.throws(() => verifyEvidence({ io: f.io, output: f.output, runId: JSON.parse(f.entries.get(f.output + '/RESULT.json').data).runId }));
  f.put(f.output + '/attachments/evidence-0.png', 'bytes'); f.entries.get(f.output + '/attachments/evidence-0.png').symlink = true;
  assert.throws(() => verifyEvidence({ io: f.io, output: f.output }));
});
await test('installed binding rejects foreign device and changed config', () => {
  const f = fixture();
  assert.throws(() => verifyInstalled({ io: f.io, installed: '/foreign/App.app', app: f.app, prep: f.prep }));
  f.put(f.installed + '/capacitor.config.json', '{}');
  assert.throws(() => verifyInstalled({ io: f.io, installed: f.installed, app: f.app, prep: f.prep }));
});

await test('strict readback accepts arbitrary native scores, never historical expected math', () => {
  const runId = randomUUID();
  for (const current of [0, 1, 43, 99, 100]) {
    const row = syntheticRecord(runId, current); assert.equal(parseReadback(row, runId), row);
  }
  const row = syntheticRecord(runId); row.proposalCount = 4;
  assert.equal(parseReadback(row, runId).selectedPublicId, null);
});
for (const [name, mutate] of [
  ['unknown schema key', row => { row.untrusted = true; }],
  ['missing input hash', row => { delete row.inputSHA256; }],
  ['old benchmark input hash', row => { row.inputSHA256 = 'a6e1e36b8c3f5220a6174320af42e788826103d5fb09d7b25bb0bc1bbc194409'; }],
  ['foreign run', row => { row.runId = randomUUID(); }],
  ['foreign account', row => { row.account = 'other@example.test'; }],
  ['another wine', row => { row.name = 'Flor de Muga Tinto'; }],
  ['another producer', row => { row.producer = 'Other producer'; }],
  ['another vintage', row => { row.vintage = 2021; }],
  ['unknown vintage', row => { row.vintage = null; }],
  ['photo certified year claim', row => { row.vintagePhotoCertified = true; }],
  ['missing vintage warning', row => { row.vintageWarning = ''; }],
  ['unexposed canonical ID claim', row => { row.selectedPublicId = 279035; }],
  ['missing selection limitation', row => { row.selectionScope = 'Selected canonical279035'; }],
  ['zero literal proposals', row => { row.proposalCount = 0; }],
  ['unbounded proposals', row => { row.proposalCount = 21; }],
  ['fractional proposal count', row => { row.proposalCount = 1.1; }],
  ['another personal verdict', row => { row.personalRating = 'not_for_me'; }],
  ['forecast title instead of saved verdict', row => { row.personalVerdictTitle = 'Encaja mucho contigo'; }],
  ['score absent', row => { row.current = null; }],
  ['score string', row => { row.current = '43'; }],
  ['score fractional', row => { row.current = 43.5; }],
  ['score outside range', row => { row.current = 101; }],
  ['negative score', row => { row.current = -1; }],
  ['score-label disagreement', row => { row.currentLabel = 'Afinidad orientativa: 44 de 100'; }],
  ['missing axis', row => { row.dimensions.pop(); }],
  ['duplicate axis', row => { row.dimensions[4] = row.dimensions[0]; }],
  ['invalid profile axis', row => { row.dimensions[0] = 'potencia: tu perfil 5.1/5; este vino 2.0/5'; }],
  ['invalid wine axis', row => { row.dimensions[0] = 'potencia: tu perfil 3.0/5; este vino -1.0/5'; }],
  ['NaN axis', row => { row.dimensions[0] = 'potencia: tu perfil NaN/5; este vino 2.0/5'; }],
  ['unknown dimension name', row => { row.dimensions[0] = 'unknown: tu perfil 3.0/5; este vino 2.0/5'; }],
  ['missing provenance', row => { row.provenance = ''; }],
  ['new save persistence claim', row => { row.newSavePersistenceValidated = true; }],
]) await test(name + ' fails both parser and full evidence gate', async () => {
  const runId = randomUUID(), row = syntheticRecord(runId); mutate(row);
  assert.throws(() => parseReadback(row, runId));
  const f = fixture(); f.state.recordMutation = mutate;
  const { receipt } = await f.run();
  assert.equal(receipt.passed, false); assert.equal(receipt.stage, 'post-runtime-evidence-hold');
});

for (const missing of ['first-image-ax', 'selected-proposal-ax', 'selected-vintage-scope', 'detail-audit', 'scope', 'readback']) {
  await test('missing ' + missing + ' fails evidence gate', async () => {
    const f = fixture();
    f.state.evidenceMutation = rows => {
      rows[0].attachments = rows[0].attachments.filter(row => !row.suggestedHumanReadableName.startsWith('rescan161-' + missing + '_'));
    };
    assert.equal((await f.run()).receipt.passed, false);
  });
}
await test('unknown custom evidence and duplicate readback are rejected', async () => {
  for (const mutate of [
    rows => { rows[0].attachments.push({ ...rows[0].attachments[0], suggestedHumanReadableName: 'unrelated custom' }); },
    rows => { rows[0].attachments.push(rows[0].attachments.at(-1)); },
  ]) {
    const f = fixture(); f.state.evidenceMutation = mutate; assert.equal((await f.run()).receipt.passed, false);
  }
});
await test('Xcode diagnostics may coexist but never substitute required custom evidence', async () => {
  const f = fixture();
  f.state.evidenceMutation = rows => {
    f.put(f.output + '/attachments/system-diagnostic', 'snapshot');
    rows[0].attachments.push({ ...rows[0].attachments[0], exportedFileName: 'system-diagnostic',
      suggestedHumanReadableName: 'UI Snapshot 2026-10-22 at 03.00' });
  };
  assert.equal((await f.run()).receipt.passed, true);
  const g = fixture();
  g.state.evidenceMutation = rows => { rows[0].attachments[0].suggestedHumanReadableName = 'UI Snapshot 2026-10-22'; };
  assert.equal((await g.run()).receipt.passed, false);
});
await test('optional two-stage picker completion evidence must retain every screenshot and AX pair', async () => {
  const f = fixture();
  f.state.evidenceMutation = rows => {
    for (const phase of ['before', 'after']) for (const [suffix, ext] of [['', 'png'], ['-ax', 'txt']]) {
      const name = '07-completion-0-' + phase + suffix, file = 'completion-' + phase + suffix + '.' + ext;
      f.put(f.output + '/attachments/' + file, 'picker evidence');
      rows[0].attachments.push({ ...rows[0].attachments[0], exportedFileName: file,
        suggestedHumanReadableName: 'rescan161-' + name + '_0_UUID.' + ext });
    }
  };
  assert.equal((await f.run()).receipt.passed, true);
  const g = fixture();
  g.state.evidenceMutation = rows => {
    rows[0].attachments.push({ ...rows[0].attachments[0],
      suggestedHumanReadableName: 'rescan161-07-completion-0-before_0_UUID.png' });
  };
  assert.equal((await g.run()).receipt.passed, false);
});
await test('symlinked readback and manifest fail before reading their bytes', async () => {
  const f = fixture(); const { receipt } = await f.run(); assert.equal(receipt.passed, true);
  const manifest = JSON.parse(f.entries.get(f.output + '/attachments/manifest.json').data);
  for (const file of [f.output + '/attachments/' + manifest[0].attachments.at(-1).exportedFileName,
    f.output + '/attachments/manifest.json']) {
    f.entries.get(file).symlink = true; const before = f.reads.length;
    assert.throws(() => verifyEvidence({ io: f.io, output: f.output, runId: receipt.runId }));
    assert(!f.reads.slice(before).includes(file)); f.entries.get(file).symlink = false;
  }
});
await test('receipt is exclusive-create; previous failures and photos are never overwritten', async () => {
  const f = fixture(); assert.equal((await f.run()).receipt.passed, true);
  const prior = Buffer.from(f.entries.get(f.output + '/RESULT.json').data);
  assert.equal((await f.run()).receipt.passed, false);
  assert.deepEqual(f.entries.get(f.output + '/RESULT.json').data, prior);
  assert.equal(f.writes.filter(file => file.endsWith('/RESULT.json')).length, 1);
  assert.equal(f.writes.filter(file => file.endsWith('/PHOTO-ATTESTATION.json')).length, 1);
});

await test('latest-added binding uses actual new PNG bytes, not an old filename/index', () => {
  const bytes = fs.readFileSync(new URL('../' + INPUT_FILE, import.meta.url));
  assert.equal(sha(bytes), INPUT_SHA256);
  const row = { filename: 'NEW_PUBLIC_BOTTLE.PNG', directory: 'DCIM/999APPLE', added: 200 };
  const io = { realpathSync: file => file, lstatSync: () => ({ isFile: () => true, isSymbolicLink: () => false }),
    readFileSync: () => bytes };
  assert.equal(bindLatestAsset([row, { added: 199 }], { io }).sha256, INPUT_SHA256);
  for (const rows of [[], [row, { added: 200 }], [row, { added: 201 }], [{ ...row, directory: '../other' }],
    [{ ...row, filename: '../other' }], [{ ...row, added: null }], [{ ...row, added: '200' }]]) {
    assert.throws(() => bindLatestAsset(rows, { io }));
  }
  assert.throws(() => bindLatestAsset([row], { io: { ...io, readFileSync: () => Buffer.from('img-001 bytes') } }), /LATEST_ADDED/);
  assert.throws(() => bindLatestAsset([row], { io: { ...io, realpathSync: () => '/outside' } }), /PATH_HOLD/);
  assert.throws(() => bindLatestAsset([row], { io: { ...io,
    lstatSync: () => ({ isFile: () => true, isSymbolicLink: () => true }) } }), /PATH_HOLD/);
});
await test('photo attestor checks input before a readonly WAL-aware metadata query', () => {
  const bytes = fs.readFileSync(new URL('../' + INPUT_FILE, import.meta.url));
  const rows = [{ filename: 'FRESH.PNG', directory: 'DCIM/100APPLE', added: 100 }], env = { PATH: '/usr/bin' };
  const io = { realpathSync: file => file, lstatSync: () => ({ isFile: () => true, isSymbolicLink: () => false }),
    readFileSync: () => bytes };
  let calls = 0;
  const exec = (command, args, options) => {
    calls++; assert.equal(command, '/usr/bin/sqlite3');
    assert.deepEqual(args, ['-readonly', '-json', '-cmd', '.timeout 1000', MEDIA + '/PhotoData/Photos.sqlite', PHOTO_SQL]);
    assert.equal(options.env, env); assert.equal(options.timeout, 3000); assert.equal(options.maxBuffer, 65536);
    return JSON.stringify(rows);
  };
  const bound = attestPhoto({ repo: '/mock', io, exec, env });
  assert.equal(calls, 1); assert.equal(bound.prepared, '/mock/' + INPUT_FILE); assert.equal(bound.sha256, INPUT_SHA256);
  assert(PHOTO_SQL.startsWith('PRAGMA query_only=ON; SELECT '));
  assert(PHOTO_SQL.includes('ZTRASHEDSTATE = 0 ORDER BY ZADDEDDATE DESC LIMIT 2'));
  assert(!/INSERT|UPDATE|DELETE|CHECKPOINT|immutable/i.test(PHOTO_SQL));
  assert.throws(() => attestPhoto({ repo: '/mock', io: { ...io, readFileSync: () => Buffer.from('old benchmark') },
    exec: () => assert.fail('No metadata query'), env }), /RESCAN161_INPUT_CHANGED/);
  assert.throws(() => queryLatestRows({ io, exec: () => 'malformed', env }));
});
await test('actual retained public observation and saved-love baseline are hash-bound without live calls', () => {
  const repo = path.resolve(new URL('..', import.meta.url).pathname);
  const context = verifyRetainedContext({ repo });
  assert.equal(context.baselineSHA256, BASELINE_SHA256); assert.equal(context.rating, 'love');
  assert.equal(context.libraryIdContextOnly, 279035);
  for (const target of [PUBLIC_FILE, BASELINE_FILE]) {
    const io = { ...fs, readFileSync: (file, ...args) => file === path.join(repo, target)
      ? Buffer.from('changed context') : fs.readFileSync(file, ...args) };
    assert.throws(() => verifyRetainedContext({ repo, io }), /RETAINED_CONTEXT_CHANGED/);
  }
});

await test('Swift is one unsaved named local-gallery rescan; selection does not claim canonical ID or photo year', () => {
  const source = fs.readFileSync(new URL('./MatchrimRescan161Probe.swift', import.meta.url), 'utf8');
  assert.equal((source.match(/func test\w+\(/g) || []).length, 1);
  assert(source.includes('testExistingQAReadOnlyRescan161'));
  for (const forbidden of ['typeText(', 'press(forDuration:', 'launchArguments', 'launchEnvironment', 'URLSession',
    'Confirmar 1 referencia', 'Lote confirmado', 'Guardar afinidad', 'Entiendo y continuar',
    'app.collectionViews', 'cells.firstMatch', 'addmedia', 'password', 'img-001']) assert(!source.includes(forbidden), forbidden);
  for (const required of [INPUT_SHA256, 'MATCHRIM161_RUN_ID', 'info@winerim.com', 'Flor de Muga Blanco',
    'private let producer = "Muga"', '"2022"', 'Tu valoraci\\u{00f3}n: te encanta',
    'Sort and Filter', 'Ordenar por fecha de adici\\u{00f3}n', 'added.isSelected', 'Photo Library',
    'PXGGridLayout-Info', 'query.count == 1', 'proposals.count <= 20', 'ordered.dropFirst().allSatisfy',
    'exact(proposal, warning).count == 1', 'No hemos confirmado el vino.', 'estimates.count == 1',
    '(0...100).contains(affinity)', 'dimensions.count == 5', 'dimensions.allSatisfy(validDimension)',
    'value.isFinite && (0...5).contains(value)', '"selectedPublicId": NSNull()', '"vintagePhotoCertified": false',
    'personalTitle).count == 1', 'No conflicting saved verdict or forecast headline',
    'performAccessibilityAudit(for: [.contrast, .sufficientElementDescription, .textClipped, .trait])',
    'try require(issues == 0', 'return false', 'public.json', 'rescan161-readback']) assert(source.includes(required), required);
  assert.equal((source.match(/coordinate\(withNormalizedOffset:/g) || []).length, 1);
  assert(source.includes('first.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()'));
  assert(source.indexOf('try photo(app)') > source.indexOf('RESCAN161_LOCAL_MODE_SELECTED'));
  assert(source.indexOf('let selectedName =') < source.indexOf('try tapUnique(proposal.buttons.matching'));
  for (const marker of MARKERS) assert.equal(source.split('"' + marker + '"').length - 1, 1, marker);
});
await test('selectors are grounded in retained136 AX and current UI source, not invented user data', () => {
  const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const proposalAX = read('qa-artifacts/night105-20261021/ref136-r4/attachments/53E087D1-5ADE-4BFB-BC6D-D7E0847377C9.txt');
  for (const value of ["label: 'Propuestas de Winerim'", "label: 'Propuesta de catálogo:", "label: 'Confirmar esta referencia'",
    "label: 'Elegirla cambiará tu añada a'"]) assert(proposalAX.includes(value), value);
  const detailAX = read('qa-artifacts/night105-20261021/ref136-r4/attachments/8608513F-7D89-4D08-839B-F4CE5FAEA0DA.txt');
  assert(detailAX.includes('cuadro de diálogo de web')); assert(detailAX.includes('Ver el detalle de afinidad'));
  assert(read('src/components/NativeAffinitySummary.tsx').includes('Tu valoración: te encanta'));
  assert(read('src/components/wine-import/GlobalWineRecovery104.tsx').includes('Elegirla cambiará tu añada a'));
  for (const file of REQUIRED_SOURCES) assert(read(file).length > 0, file);
});
await test('runner retains wall/owner/source/native binary/evidence guards and exposes no mutation entrypoints', () => {
  const source = fs.readFileSync(new URL('./qa-matchrim-rescan161.mjs', import.meta.url), 'utf8');
  for (const forbidden of ["'install'", "'addmedia'", "'boot'", "'erase'", "'uninstall'", "'ui'", 'fetch(',
    'reserveAuth', 'reserveSave', 'PRIVATE-ACCESS', 'rmSync', 'unlinkSync', 'execSync(', "'killall'", "'pkill'"])
    assert(!source.includes(forbidden), forbidden);
  for (const required of ['now() + 240000', 'await hardDone', 'checkLeases(', 'verifyArtifact(',
    'verifyInstalled(', 'verifyEvidence(', 'regular(file)', 'photo();', 'INPUT_SHA256']) assert(source.includes(required), required);
  for (const file of ['src/utils/nativeRescanVerdict159.ts', 'src/services/nativeScanContext159.ts',
    'src/components/wine-import/WineComparisonWorkspace.tsx']) assert(REQUIRED_SOURCES.includes(file), file);
});
console.log('Rescan161: ' + checks + ' mock/source checks passed. No real child process, GUI, Swift compilation, simulator, network, credentials or output artifacts used. Runtime remains unrun.');
