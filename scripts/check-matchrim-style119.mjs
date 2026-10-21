import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { pathToFileURL } from 'node:url';
import { SAVE, COMPLETE, METHOD, evaluate, makePlan, reserveSave, runStyle119 } from './qa-matchrim-style119.mjs';

const log = () => ["Test Case '-[MatchrimStyle119Tests testExistingQAStyleRoundtrip119]' started.", SAVE,
  'STYLE119_SAVED_SCORE_VERIFIED', 'STYLE119_RELAUNCHED_SCORE_VERIFIED', COMPLETE,
  "Test Case '-[MatchrimStyle119Tests testExistingQAStyleRoundtrip119]' passed (1 seconds).",
  'Executed 1 test, with 0 failures (0 unexpected) in 1 seconds.'].join('\n') + '\n';

// All write paths, descriptors, process events and native helpers below are in memory.
function mock({ compileFail = false, setupFail = false, runtimeFail = false, leaseFail = false, nativeFail = false } = {}) {
  const repo = '/virtual', base = repo + '/qa-artifacts/night105-20261021';
  const app = base + '/candidate/build/derived/Build/Products/Debug-iphonesimulator/App.app';
  const output = base + '/style119-mock', prepDir = base + '/prep';
  const files = new Map(), dirs = new Set([base]), descriptors = new Map(), events = [];
  let next = 10;
  const put = (file, value) => files.set(file, typeof value === 'string' ? value : JSON.stringify(value));
  const harness = repo + '/qa-artifacts/native99-20261021/native-audit-project';
  const original = { testTargets: [{ target: { name: 'Probe97', identifier: 'target' } }] };
  put(harness + '/Probe97.xctestplan', original); put(harness + '/Probe97.xcodeproj/project.pbxproj', 'project');
  dirs.add(harness + '/Probe97.xcodeproj');
  put(prepDir + '/preparation.json', { startedUTC: new Date().toISOString(), sourceFingerprints: {
    'src/utils/nativeSingleLabel109.ts': 'bound', 'src/utils/cellarReferenceStyle110.ts': 'bound',
    'src/components/CellarReferenceStyle110.tsx': 'bound' } });
  put(base + '/candidate/RESULT.json', {});
  for (const name of ['OCR-INPUTS.json', 'REPORT.json', 'prepared/img-001.jpg'])
    put(repo + '/qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/' + name, 'mock-media-binding');
  for (const name of ['MatchrimStyle119Probe.swift', 'qa-matchrim-style119.mjs', 'qa-matchrim-account114.mjs', 'check-matchrim-style119.mjs']) put(repo + '/scripts/' + name, name);
  const environment = {};
  const leases = {};
  for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]) {
    environment[key] = resource;
    leases[resource] = { leaseId: resource, owner: '019f9da7-ae96-7c60-a1b4-fafb75b04d6d', reviewAfter: Date.now() / 1000 + (leaseFail ? -60 : 3600) };
  }
  put('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', { leases });
  const io = {
    existsSync: file => files.has(file) || dirs.has(file),
    readFileSync(file, encoding) { assert(files.has(file), 'Unexpected read: ' + file); return encoding ? files.get(file) : Buffer.from(files.get(file)); },
    writeFileSync(file, value, options) {
      const target = typeof file === 'number' ? descriptors.get(file) : file;
      if (options?.flag === 'wx' && files.has(target)) throw Object.assign(new Error('EEXIST'), { code: 'EEXIST' });
      events.push(['write', target]); files.set(target, String(value));
    },
    openSync(file, flags, mode) {
      if (flags === 'wx') {
        assert.equal(mode, 0o600);
        if (files.has(file)) throw Object.assign(new Error('EEXIST'), { code: 'EEXIST' });
        files.set(file, ''); events.push(['exclusive', file]);
      }
      descriptors.set(next, file); return next++;
    },
    closeSync(fd) { descriptors.delete(fd); },
    fsyncSync(fd) { events.push(['sync', descriptors.get(fd)]); },
    mkdirSync(file, options) { assert.equal(options.mode, 0o700); dirs.add(file); },
    statSync: () => ({ mode: 0o700 }), statfsSync: () => ({ bavail: 8 * 1024 ** 3, bsize: 1 }),
    cpSync(from, to) {
      dirs.add(to);
      for (const [file, value] of [...files]) if (file.startsWith(from + '/')) put(to + file.slice(from.length), value);
    },
    readdirSync(folder) {
      const names = new Set([...files.keys(), ...dirs].filter(file => file.startsWith(folder + '/'))
        .map(file => file.slice(folder.length + 1).split('/')[0]));
      return [...names].map(name => ({ name, isDirectory: () => dirs.has(folder + '/' + name) }));
    },
  };
  const exec = (file, args) => {
    assert.equal(file, '/usr/bin/xcrun'); events.push(['simctl', args.join(' ')]);
    if (setupFail) throw new Error('SETUP_INTERRUPTED');
    return args.at(-1) === 'content_size' ? 'large\n' : '';
  };
  const start = (file, args, options) => {
    assert(file.endsWith('/xcodebuild')); assert(options.detached);
    const runtime = args[0] === 'test-without-building';
    events.push([runtime ? 'runtime' : 'compile']);
    if (runtime) {
      assert(files.has(base + '/style119-save-reservation.json'));
      assert(events.some(event => event[0] === 'sync' && event[1] === base));
      assert.equal(args.filter(arg => arg.startsWith('-only-testing:')).length, 1);
      assert(args.includes('-only-testing:Probe97/' + METHOD));
      assert(!args.includes('-test-iterations'), 'Xcode rejects the one-iteration CLI flag');
      assert(!args.includes('-test-repetition-relaunch-enabled'));
    }
    const child = new EventEmitter(); child.pid = 999; child.kill = () => {};
    io.writeFileSync(options.stdio[1], runtime ? log() : 'compile only\n');
    queueMicrotask(() => child.emit('close', runtime ? (runtimeFail ? 1 : 0) : (compileFail ? 1 : 0), null));
    return child;
  };
  return { files, events, base, output, io, options: { argv: [prepDir, app, output], repo, io, exec, start, environment,
    verifyNative: () => { if (nativeFail) throw new Error('NATIVE_BINDING_HOLD'); },
    photoVerifier: () => ({ path: '/virtual/img-001.jpg', sha256: 'mock-only' }) } };
}

export async function checkStyle119() {
  assert(evaluate(log(), { code: 0 }).passed);
  for (const bad of ['', log().replace(SAVE, ''), log() + SAVE + '\n', log().replace(COMPLETE, COMPLETE + '_suffix'),
    log().replace('passed (1 seconds)', 'skipped (1 seconds)'), log().replace('Executed 1 test', 'Executed 0 tests'),
    log().replace('testExistingQAStyleRoundtrip119', 'testOther'), log() + 'STYLE119_FAILURE\n',
    log().replace('STYLE119_RELAUNCHED_SCORE_VERIFIED', '')]) assert(!evaluate(bad, { code: 0 }).passed);
  assert(!evaluate(log(), { code: 1 }).passed);
  assert(!evaluate(log(), { code: 0 }, 'WALL_LIMIT').passed);
  assert(!evaluate(log(), { code: 0, spawnError: true }).passed);
  const plan = makePlan({ testTargets: [{ target: { name: 'Probe97' }, skippedTests: ['x'] }], defaultOptions: { environmentVariableEntries: [{ key: 'PASSWORD', value: 'no' }] } }, 'reservation');
  assert.equal(plan.defaultOptions.maximumTestRepetitions, 1);
  assert.deepEqual(plan.defaultOptions.environmentVariableEntries, [{ key: 'MATCHRIM119_RESERVATION_ID', value: 'reservation' }]);
  assert(!JSON.stringify(plan).includes('skippedTests'));
  const interrupted = mock();
  interrupted.io.fsyncSync = () => { throw new Error('SYNC_INTERRUPTED'); };
  assert.throws(() => reserveSave(interrupted.io, interrupted.base, {}), /SYNC_INTERRUPTED/);
  assert(interrupted.files.has(interrupted.base + '/style119-save-reservation.json'));
  assert.throws(() => reserveSave(interrupted.io, interrupted.base, {}), /EEXIST/);
  for (const failure of [{ leaseFail: true }, { nativeFail: true }, { compileFail: true }]) {
    const m = mock(failure), { receipt } = await runStyle119(m.options);
    assert(!receipt.passed); assert(!m.files.has(m.base + '/style119-save-reservation.json'));
    assert(!m.events.some(event => event[0] === 'runtime'));
  }
  for (const failure of [{ setupFail: true }, { runtimeFail: true }, {}]) {
    const m = mock(failure), { receipt } = await runStyle119(m.options);
    assert.equal(receipt.passed, !failure.setupFail && !failure.runtimeFail);
    assert(m.files.has(m.base + '/style119-save-reservation.json'));
    assert.equal(m.events.filter(event => event[0] === 'compile').length, 1);
    assert(m.events.filter(event => event[0] === 'runtime').length <= 1);
    assert.throws(() => reserveSave(m.io, m.base, {}), /EEXIST/);
    assert(!m.events.some(event => /account114-auth-reservation|PRIVATE-ACCESS/.test(String(event[1]))));
  }
  const source = fs.readFileSync(new URL('./MatchrimStyle119Probe.swift', import.meta.url), 'utf8');
  assert.equal((source.match(/@MainActor func test/g) || []).length, 1);
  assert.equal((source.match(/try durableSaveMarker\(reservation\)/g) || []).length, 1);
  assert(/try durableSaveMarker\(reservation\)\s*confirm.firstMatch.tap\(\)/.test(source));
  assert(source.includes('options: .withoutOverwriting') && source.includes('try handle.synchronize()'));
  assert(!/typeText|launchArguments|launchEnvironment/.test(source));
  assert(source.includes('PXGGridLayout-Info') && source.includes('PUOneUpBarButtonItemIdentifierAssetExplorerReviewScreenDone'));
  return { passed: true, scope: 'In-memory lifecycle/preflight/one-write-cap/strict completion checks only; no real native persistence or taste validation', filesystemArtifacts: 0, processes: 0, network: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await checkStyle119()));
}
