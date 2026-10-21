import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { runReference136, makePlan, sanitizedEnvironment, evaluate, bindLatestAsset, attestPhoto, queryLatestRows,
  verifyInstalled, DEVICE, INPUT_SHA256, METHOD, MARKERS, LEASE_FILE, MEDIA, PHOTO_SQL } from './qa-matchrim-reference136.mjs';
import { OWNER, nativeReceiptPath } from './qa-matchrim-account114.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const testName = '-[Probe97.MatchrimReference136Tests testExistingQAReadOnlyReference136]';
const bodega = 'REF136_EXISTING_BODEGA_CAPTURED';
const green = `Test Case '${testName}' started.\n${MARKERS.slice(0, -1).join('\n')}\n${bodega}\n${MARKERS.at(-1)}\nTest Case '${testName}' passed (1.0 seconds).\nExecuted 1 test, with 0 failures (0 unexpected) in 1.0 seconds\n`;
const resources = [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID'],
  ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']];
const required = ['src/components/wine-import/MultiWineLabelScanner.tsx', 'src/utils/nativeSingleLabel109.ts',
  'src/utils/nativeOCR106.ts', 'src/utils/globalWineProposals104.ts', 'src/utils/nativeGlobalCatalogue103.ts',
  'src/components/wine-import/GlobalWineRecovery104.tsx', 'src/components/wine-import/NativeGlobalCatalogue103.tsx',
  'src/utils/cellarReferenceStyle110.ts', 'src/components/CellarReferenceStyle110.tsx', 'ios/App/App/MatchrimOCRPlugin106.swift'];

function fixture() {
  const entries = new Map(), fds = new Map(), reads = [], writes = [], calls = [], spawns = [], signals = [], scheduled = new Map();
  const repo = '/mock/repo', base = repo + '/qa-artifacts/night105-20261021', output = base + '/ref136-mock';
  const app = '/mock/native/build/derived/Build/Products/Debug-iphonesimulator/App.app';
  const installed = `/Users/GOIKO/Library/Developer/CoreSimulator/Devices/${DEVICE}/data/Containers/Bundle/Application/TEST/App.app`;
  const put = (file, data = '', mode = 0o600, directory = false) => entries.set(file, { data: Buffer.from(data), mode, directory });
  const stat = file => {
    assert(entries.has(file), 'Unseeded mock stat: ' + file);
    const entry = entries.get(file);
    return { mode: entry.mode, isFile: () => !entry.directory, isSymbolicLink: () => false };
  };
  const io = {
    existsSync: file => entries.has(file), statSync: stat, lstatSync: stat,
    realpathSync: file => { assert(entries.has(file), 'Unseeded realpath: ' + file); return file; },
    readFileSync(file, encoding) {
      reads.push(file);
      assert(!/PRIVATE|reservation|AUTH-SUBMITTED|Keychain|Cookies|Preferences|Library\/Application Support.*session/i.test(file), 'Forbidden sensitive read');
      assert(entries.has(file), 'Unseeded mock read: ' + file);
      return encoding ? entries.get(file).data.toString(encoding) : entries.get(file).data;
    },
    writeFileSync(file, data, options = {}) {
      file = fds.get(file) || file;
      assert(file.startsWith(output + '/'), 'Write outside fresh output: ' + file);
      if (options.flag === 'wx') assert(!entries.has(file), 'Not fresh: ' + file);
      writes.push(file); put(file, data, entries.get(file)?.mode ?? options.mode ?? 0o600);
    },
    mkdirSync(file, options) {
      assert(file === output || file.startsWith(output + '/')); assert(!entries.has(file)); put(file, '', options.mode, true);
    },
    chmodSync(file, mode) { assert(file === output || file.startsWith(output + '/')); entries.get(file).mode = mode; },
    statfsSync: () => ({ bavail: state.disk, bsize: 1 }),
    readdirSync: folder => [...entries].filter(([file]) => path.dirname(file) === folder).map(([file, entry]) => ({
      name: path.basename(file), isDirectory: () => entry.directory, isSymbolicLink: () => false,
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
  for (const file of required) put(repo + '/' + file, 'source');
  const prep = { passed: true, typecheck: 'PASS', build: 136, commit: 'mock', production: '/mock/prod', startedUTC: new Date().toISOString(),
    publicConfiguration: { fixtures: false, analytics: false, masterConfigured: false },
    sourceFingerprints: Object.fromEntries(required.map(file => [file, sha('source')])), webResources: { 'index.html': sha(html) } };
  const built = { passed: true, app, sourceCommit: 'mock', build: 136, nativeArtifact: {
    executableSHA256: sha('exe'), infoPlistSHA256: sha('plist'), capacitorConfigSHA256: sha(config) } };
  const environment = { MATCHRIM136_RUN_READONLY: 'YES', MATCHRIM114_PASSWORD: 'SYNTHETIC_SECRET',
    VITE_MATCHRIM_QA_FIXTURES: 'true', SIMCTL_CHILD_INJECT: 'bad', DYLD_INSERT_LIBRARIES: 'bad', CUSTOM_ENV: 'bad', HOME: '/mock/home',
    ...Object.fromEntries(resources.map(([, key]) => [key, key])) };
  const leases = Object.fromEntries(resources.map(([resource, key]) => [resource, { owner: OWNER, leaseId: key, reviewAfter: Date.now() / 1000 + 3600 }]));
  const save = () => {
    put('/mock/prep/preparation.json', JSON.stringify(prep)); put(nativeReceiptPath(app), JSON.stringify(built));
    put(LEASE_FILE, JSON.stringify({ leases }));
  };
  save();
  for (const name of ['MatchrimReference136Probe.swift', 'qa-matchrim-reference136.mjs', 'check-matchrim-reference136.mjs', 'qa-matchrim-account114.mjs']) put(repo + '/scripts/' + name, 'mock source');
  const prepared = repo + '/qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared/img-001.jpg';
  put(prepared, 'prepared');
  const old = repo + '/qa-artifacts/native99-20261021/native-audit-project';
  put(old + '/Probe97.xcodeproj', '', 0o755, true); put(old + '/Probe97.xcodeproj/project.pbxproj', 'project');
  const original = { testTargets: [{ target: { name: 'Probe97UITests', identifier: '000000000000000000000004', containerPath: 'container:Probe97.xcodeproj', injected: 'bad' }, skippedTests: [METHOD] }],
    defaultOptions: { maximumTestRepetitions: 99, environmentVariableEntries: [{ key: 'PASSWORD', value: 'SYNTHETIC_SECRET' }] },
    configurations: [{ options: { commandLineArgumentEntries: [{ argument: 'bad' }] } }] };
  put(old + '/Probe97.xctestplan', JSON.stringify(original));
  const state = { disk: 10 * 1024 ** 3, clock: Date.now(), compileCode: 0, runtimeCode: 0, log: green,
    afterCompile: null, afterRuntime: null, timeout: false, watch: false, photoFailure: false, photoCalls: 0, changedPhoto: false, exportFailure: false };
  const clean = env => {
    assert(!Object.values(env).includes('SYNTHETIC_SECRET'));
    for (const key of ['VITE_MATCHRIM_QA_FIXTURES', 'SIMCTL_CHILD_INJECT', 'DYLD_INSERT_LIBRARIES', 'CUSTOM_ENV', 'MATCHRIM136_RUN_READONLY']) assert(!env[key]);
  };
  const exec = (command, args, options) => {
    calls.push({ command, args }); clean(options.env); assert(options.timeout <= 235000);
    if (command === '/usr/bin/plutil') return ({ CFBundleVersion: '136', CFBundleIdentifier: 'wine.matchrim.qa99review', CFBundleExecutable: 'App' })[args[1]];
    assert.equal(command, '/usr/bin/xcrun');
    if (args[0] === 'simctl') {
      assert.deepEqual(args, ['simctl', 'get_app_container', DEVICE, 'wine.matchrim.qa99review', 'app']); return installed;
    }
    assert.deepEqual(args.slice(0, 3), ['xcresulttool', 'export', 'attachments']);
    if (state.exportFailure) throw new Error('arbitrary private detail');
    put(output + '/attachments', '', 0o755, true); put(output + '/attachments/ax.txt', 'private evidence'); return '';
  };
  const photoAttestor = () => {
    state.photoCalls++; if (state.photoFailure) throw new Error('LATEST_ADDED_NOT_IMG001');
    return { prepared, resident: MEDIA + '/DCIM/100APPLE/' + (state.changedPhoto ? 'changed.JPG' : 'current.JPG'),
      added: 100, sha256: INPUT_SHA256 };
  };
  const start = (command, args, options) => {
    assert(command.endsWith('/xcodebuild')); assert(options.detached); clean(options.env); spawns.push(args);
    assert(!args.some(arg => /test-iterations|test-repetition-relaunch/.test(arg)));
    const compile = args[0] === 'build-for-testing'; assert(compile || args[0] === 'test-without-building');
    if (!compile) {
      assert(args.includes('-only-testing:Probe97UITests/' + METHOD));
      assert(entries.has(output + '/PHOTO-ATTESTATION.json')); assert(state.photoCalls >= 2);
      put(output + '/result.xcresult', '', 0o755, true);
    }
    io.writeFileSync(options.stdio[1], compile ? 'compile only' : state.log);
    const child = new EventEmitter(); child.pid = 123; child.kill = signal => signals.push(['child', signal]);
    queueMicrotask(() => {
      (compile ? state.afterCompile : state.afterRuntime)?.();
      if (!compile && state.timeout) [...scheduled.values()].find(row => row.ms > 3000)?.fn();
      if (!compile && state.watch) [...scheduled.values()].find(row => row.interval)?.fn();
      child.emit('close', compile ? state.compileCode : state.runtimeCode, null);
    });
    return child;
  };
  const run = () => runReference136({ repo, argv: ['/mock/prep', app, output], io, exec, start, environment,
    photoAttestor, timers, now: () => state.clock, killGroup: (pid, signal) => { assert.equal(pid, 123); signals.push(['group', signal]); } });
  return { io, entries, reads, writes, calls, spawns, signals, scheduled, state, leases, environment, prep, built, original,
    save, run, put, repo, app, installed, output };
}

let checks = 0;
async function test(name, body) { await body(); checks++; console.log('PASS ' + name); }

await test('single sanitized method and target; no inherited plan injection', () => {
  const f = fixture(), plan = makePlan(f.original, randomUUID());
  assert.deepEqual(plan.testTargets[0].selectedTests, [METHOD]); assert.equal(plan.testTargets.length, 1);
  assert.equal(plan.defaultOptions.maximumTestRepetitions, 1); assert.equal(plan.defaultOptions.testRepetitionRelaunchEnabled, false);
  assert.equal(plan.testTargets[0].parallelizable, false);
  assert(!/PASSWORD|SYNTHETIC_SECRET|injected|skippedTests|commandLineArgument/.test(JSON.stringify(plan)));
  assert.deepEqual(plan.defaultOptions.environmentVariableEntries.map(row => row.key), ['MATCHRIM136_RUN_ID', 'MATCHRIM136_INPUT_SHA256']);
  assert.throws(() => makePlan({ testTargets: [...f.original.testTargets, ...f.original.testTargets] }, randomUUID()));
});
await test('environment is an explicit allowlist', () => {
  const env = sanitizedEnvironment({ OPAQUE_PRIVATE_VALUE: 'secret', PATH: '/untrusted', HOME: '/home', XCTestConfigurationFilePath: 'bad' });
  assert.deepEqual(Object.keys(env).sort(), ['DEVELOPER_DIR', 'HOME', 'PATH']); assert.equal(env.PATH, '/usr/bin:/bin:/usr/sbin:/sbin');
});
await test('read-only continuation uses no install/import/setting commands; private evidence only', async () => {
  const f = fixture(), { receipt } = await f.run(); assert.equal(receipt.passed, true, JSON.stringify(receipt));
  assert.equal(receipt.newSavePersistenceClaimed, false); assert.equal(receipt.existingBodegaScoresCaptured, true);
  assert.deepEqual(f.spawns.map(args => args[0]), ['build-for-testing', 'test-without-building']);
  assert.equal(f.entries.get(f.output).mode, 0o700);
  for (const file of ['/runtime.log', '/PHOTO-ATTESTATION.json', '/attachments/ax.txt', '/RESULT.json']) assert.equal(f.entries.get(f.output + file).mode, 0o600);
  assert.equal(f.scheduled.size, 0);
  assert.equal((await f.run()).receipt.reason, 'FRESH_OUTPUT_REQUIRED'); assert.equal(f.spawns.length, 2);
});
for (const [name, mutate] of [
  ['explicit authorization', f => { delete f.environment.MATCHRIM136_RUN_READONLY; }],
  ['foreign heavy', f => { f.leases['heavy-local'].owner = 'foreign'; }],
  ['only writer ownership', f => { delete f.environment.MATCHRIM102_HEAVY_LEASE_ID; delete f.environment.MATCHRIM104_SIMULATOR_LEASE_ID; }],
  ['expired simulator', f => { f.leases['ios-simulator'].reviewAfter = 0; }],
  ['writer mismatch', f => { f.leases['writer-matchrim-native99'].leaseId = 'foreign'; }],
  ['low disk', f => { f.state.disk = 1; }],
  ['stale preparation', f => { f.prep.startedUTC = new Date(Date.now() - 86400001).toISOString(); }],
  ['old candidate', f => { f.prep.build = 102; }],
  ['fixtures enabled', f => { f.prep.publicConfiguration.fixtures = true; }],
  ['analytics enabled', f => { f.prep.publicConfiguration.analytics = true; }],
  ['missing local source binding', f => { delete f.prep.sourceFingerprints[required[1]]; }],
  ['source drift', f => f.put(f.repo + '/' + required[0], 'drift')],
  ['native drift', f => f.put(f.app + '/App', 'drift')],
  ['installed mismatch', f => f.put(f.installed + '/App', 'other')],
  ['photo mismatch', f => { f.state.photoFailure = true; }],
]) await test(name + ' blocks runtime and compile', async () => {
  const f = fixture(); mutate(f); f.save(); assert.equal((await f.run()).receipt.passed, false); assert.equal(f.spawns.length, 0);
  assert.equal(f.writes.length, 0);
});
for (const [name, hook] of [
  ['failed compile', f => { f.state.compileCode = 65; }],
  ['source changed after compile', f => { f.state.afterCompile = () => f.put(f.repo + '/' + required[0], 'drift'); }],
  ['photo changed after compile', f => { f.state.afterCompile = () => { f.state.changedPhoto = true; }; }],
  ['lease changed after compile', f => { f.state.afterCompile = () => { f.leases['heavy-local'].owner = 'foreign'; f.save(); }; }],
  ['deadline after compile', f => { f.state.afterCompile = () => { f.state.clock += 235001; }; }],
]) await test(name + ' cannot launch UI', async () => {
  const f = fixture(); hook(f); assert.equal((await f.run()).receipt.passed, false); assert.equal(f.spawns.length, 1);
});
await test('own-child timeout kills group even after leader closes; no global cleanup', async () => {
  const f = fixture(); f.state.timeout = true;
  assert.equal((await f.run()).receipt.passed, false);
  assert.deepEqual(f.signals, [['group', 'SIGINT'], ['group', 'SIGKILL']]); assert.equal(f.scheduled.size, 0);
});
await test('runtime watcher catches photo drift and cleans up only own group', async () => {
  const f = fixture(); f.state.watch = true; f.state.afterRuntime = () => { f.state.changedPhoto = true; };
  assert.equal((await f.run()).receipt.passed, false);
  assert.deepEqual(f.signals, [['group', 'SIGINT'], ['group', 'SIGKILL']]);
});
await test('post-runtime drift and attachment failure cannot produce a pass or leak details', async () => {
  const f = fixture(); f.state.afterRuntime = () => f.put(f.installed + '/App', 'drift');
  const drift = (await f.run()).receipt;
  assert.equal(drift.passed, false); assert.equal(drift.stage, 'post-runtime-evidence-hold');
  const g = fixture(); g.state.exportFailure = true;
  const { receipt } = await g.run(); assert.equal(receipt.passed, false); assert.equal(receipt.reason, 'LOCAL_HOLD_DETAILS_WITHHELD');
});

for (const [name, log] of [
  ['empty', ''], ['summary only', 'Executed 1 test, with 0 failures in 1 second'],
  ['wrong method', green.replaceAll('testExistingQAReadOnlyReference136', 'testOther')],
  ['repeated method', green + green], ['duplicate completion', green + MARKERS.at(-1) + '\n'],
  ['missing sorting proof', green.replace(MARKERS[2], '')], ['missing fiche', green.replace(MARKERS[6], '')],
  ['order swapped', green.replace(MARKERS[1], 'TEMP').replace(MARKERS[2], MARKERS[1]).replace('TEMP', MARKERS[2])],
  ['skipped', green.replace('passed (1.0 seconds)', 'skipped (1.0 seconds)')],
  ['zero tests', green.replace('Executed 1 test', 'Executed 0 tests')],
  ['extra summary', green + 'Executed 2 tests, with 0 failures in 2 seconds\n'],
  ['failure', green + 'REF136_FAILURE\n'], ['auth marker', green + 'ACCOUNT114_AUTH_SUBMITTED_ONCE\n'],
  ['save marker', green + 'STYLE119_SAVE_SUBMITTED_ONCE\n'],
  ['ambiguous Bodega', green + 'REF136_EXISTING_BODEGA_UNAVAILABLE\n'],
  ['unknown marker', green + 'REF136_UNREVIEWED_ACTION\n'],
  ['markers outside method', green.split('\n').filter(line => !line.startsWith('REF136_')).join('\n')
    + MARKERS.slice(0, -1).join('\n') + '\n' + bodega + '\n' + MARKERS.at(-1) + '\n'],
]) await test(name + ' cannot pass completion evaluator', () => assert.equal(evaluate(log, { code: 0 }).passed, false));
await test('optional Bodega absence is honest; CRLF supported; exit/signal/stop override', () => {
  assert.equal(evaluate(green.replace(bodega, 'REF136_EXISTING_BODEGA_UNAVAILABLE'), { code: 0 }).existingBodegaScoresCaptured, false);
  assert.equal(evaluate(green.replace(bodega, 'REF136_EXISTING_BODEGA_UNAVAILABLE'), { code: 0 }).passed, true);
  assert.equal(evaluate(green.replaceAll('\n', '\r\n'), { code: 0 }).passed, true);
  for (const result of [{ code: 65 }, { code: 0, signal: 'SIGINT' }, { code: 0, spawnError: true }]) assert.equal(evaluate(green, result).passed, false);
  assert.equal(evaluate(green, { code: 0 }, 'HOLD').passed, false);
});

await test('resident binding uses current metadata plus bytes, never historical filename or index', () => {
  const bytes = Buffer.from('synthetic-gold-bottle'), expected = sha(bytes);
  const row = { filename: 'NEW_NAME.JPG', directory: 'DCIM/999APPLE', added: 200 };
  const io = { realpathSync: file => file, lstatSync: () => ({ isFile: () => true, isSymbolicLink: () => false }), readFileSync: () => bytes };
  const options = { io, expected };
  assert.equal(bindLatestAsset([row, { added: 199 }], options).resident, MEDIA + '/DCIM/999APPLE/NEW_NAME.JPG');
  for (const rows of [[], [row, { added: 200 }], [row, { added: 201 }], [{ ...row, directory: '../other' }],
    [{ ...row, filename: '../other' }], [{ ...row, added: null }], [{ ...row, added: '200' }]]) assert.throws(() => bindLatestAsset(rows, options));
  assert.throws(() => bindLatestAsset([row], { ...options, expected: sha('other bytes') }), /LATEST_ADDED_NOT_IMG001/);
  assert.throws(() => bindLatestAsset([row], { ...options, io: { ...io, realpathSync: () => '/outside' } }), /PATH_HOLD/);
  assert.throws(() => bindLatestAsset([row], { ...options, io: { ...io, lstatSync: () => ({ isFile: () => true, isSymbolicLink: () => true }) } }), /PATH_HOLD/);
});
await test('SQLite query is read-only, WAL-aware, unique latest-added and nontrashed', () => {
  assert(PHOTO_SQL.startsWith('PRAGMA query_only=ON; SELECT ')); assert(PHOTO_SQL.includes('ZTRASHEDSTATE = 0 ORDER BY ZADDEDDATE DESC LIMIT 2'));
  assert(!/INSERT|UPDATE|DELETE|CHECKPOINT|immutable|IMG_0021/i.test(PHOTO_SQL));
  let called = false;
  // A mismatching prepared input must fail before even querying the database.
  assert.throws(() => attestPhoto({ repo: '/mock', io: { readFileSync: () => Buffer.from('bad') }, exec: () => { called = true; } }), /PREPARED_IMG001_CHANGED/);
  assert.equal(called, false);
  const rows = [{ filename: 'DIFFERENT.JPG', directory: 'DCIM/100APPLE', added: 100 }], env = { PATH: '/usr/bin' };
  const io = { realpathSync: file => file, lstatSync: () => ({ isFile: () => true }) };
  const exec = (command, args, options) => {
    assert.equal(command, '/usr/bin/sqlite3');
    assert.deepEqual(args, ['-readonly', '-json', '-cmd', '.timeout 1000', MEDIA + '/PhotoData/Photos.sqlite', PHOTO_SQL]);
    assert.equal(options.env, env); assert.equal(options.timeout, 3000); assert.equal(options.maxBuffer, 65536);
    return JSON.stringify(rows);
  };
  assert.deepEqual(queryLatestRows({ io, exec, env }), rows);
  assert.throws(() => queryLatestRows({ io, exec: () => 'malformed', env }));
  assert.throws(() => queryLatestRows({ io: { ...io, realpathSync: () => '/foreign' }, exec: () => assert.fail('No query'), env }), /PATH_HOLD/);
});
await test('installed path must be owned simulator and byte-identical', () => {
  const f = fixture(); assert.throws(() => verifyInstalled({ io: f.io, installed: '/foreign/App.app', app: f.app, prep: f.prep }));
  verifyInstalled({ io: f.io, installed: f.installed, app: f.app, prep: f.prep });
  f.put(f.installed + '/public/index.html', 'other');
  assert.throws(() => verifyInstalled({ io: f.io, installed: f.installed, app: f.app, prep: f.prep }), /MISMATCH/);
});
await test('Swift source has exactly one read-only method; no text injection or data-write controls', () => {
  const source = fs.readFileSync(new URL('./MatchrimReference136Probe.swift', import.meta.url), 'utf8');
  assert.equal((source.match(/func test\w+\(/g) || []).length, 1);
  assert(source.includes('testExistingQAReadOnlyReference136'));
  for (const forbidden of ['typeText(', 'press(forDuration:', 'launchArguments', 'launchEnvironment', 'URLSession',
    'Confirmar 1 referencia', 'Lote confirmado', 'durableSaveMarker', 'MATCHRIM119_', 'Entiendo y continuar',
    'app.collectionViews', 'cells.firstMatch', 'addmedia', 'password']) assert(!source.includes(forbidden), forbidden);
  for (const required of ['Sort and Filter', 'Ordenar por fecha de adici\\u{00f3}n', 'added.isSelected',
    'PXGGridLayout-Info', 'Photo Library', '06-attested-first-image-before', '07-first-image-after',
    'names.count == 1', 'No hemos confirmado el vino.', 'score(estimate.label', 'No equality, new save or persistence assertion.']) assert(source.includes(required), required);
  assert(source.indexOf('try photo(app)') > source.indexOf('REF136_LOCAL_MODE_SELECTED'));
  assert(source.indexOf('names.count == 1') < source.indexOf('try tap(proposal.buttons[choice]'));
  assert(source.includes('first.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()'));
});
await test('runner source exposes no mutation, auth, network, lease-acquisition or global-kill entrypoints', () => {
  const source = fs.readFileSync(new URL('./qa-matchrim-reference136.mjs', import.meta.url), 'utf8');
  for (const forbidden of ["'install'", "'addmedia'", "'boot'", "'erase'", "'uninstall'", "'ui'", 'fetch(',
    'reserveSave', 'reserveAuth', 'PRIVATE-ACCESS', 'unlinkSync', 'rmSync', 'execSync(', "'killall'", "'pkill'"])
    assert(!source.includes(forbidden), forbidden);
  assert(source.includes("['-readonly', '-json', '-cmd', '.timeout 1000', database, PHOTO_SQL]"));
  assert(source.includes('now() + 240000'));
});

console.log(`Reference136: ${checks} mock/source checks passed. No real child processes, simulator, Xcode, network, credentials, or output artifacts used.`);
