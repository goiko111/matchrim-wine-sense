import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const constants122 = Object.freeze({
  owner: '019f9da7-ae96-7c60-a1b4-fafb75b04d6d',
  device: 'B18822EF-BFBD-4A6A-89B2-33539BDE4127',
  developer: '/Applications/Xcode-26.0.1.app/Contents/Developer',
  leases: '/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json',
  base: 'qa-artifacts/night105-20261021',
  prepared: 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2',
  plugin: 'ios/App/App/MatchrimOCRPlugin106.swift',
  probe: 'scripts/MatchrimOCR106Probe.swift',
  baseline: 'scripts/qa-matchrim-native-ocr106.mjs',
  runner: 'scripts/experiment-matchrim-vision122.mjs',
});
export const resources122 = [
  ['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'],
  ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID'],
  ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID'],
];
export const sha122 = bytes => createHash('sha256').update(bytes).digest('hex');
const loadedRunnerSHA122 = sha122(fs.readFileSync(fileURLToPath(import.meta.url)));
const replacements = Object.freeze({
  'cpu-default': ['request.usesCPUOnly = true', 'request.usesCPUOnly = false'],
  'auto-language': ['request.automaticallyDetectsLanguage = false', 'request.automaticallyDetectsLanguage = true'],
  'expanded-latin': ['["es-ES", "en-US", "fr-FR"].filter { supported.contains($0) }',
    '["es-ES", "en-US", "fr-FR", "it-IT", "de-DE", "pt-PT"].filter { supported.contains($0) }'],
});
export function transform122(source, variant) {
  assert(Object.hasOwn(replacements, variant), 'INVALID_VARIANT');
  assert.equal(source.split('request.customWords = []').length, 2, 'CUSTOM_DICTIONARY_NOT_EMPTY');
  assert(!/request\.customWords\s*=(?! \[\])/m.test(source), 'CUSTOM_DICTIONARY_NOT_EMPTY');
  const [from, to] = replacements[variant];
  assert.equal(source.split(from).length, 2, 'VARIANT_ANCHOR_NOT_UNIQUE');
  return source.replace(from, to);
}
export function options122(args, repo) {
  assert.equal(args.length, 5, 'Usage: OUTPUT FRAMEWORKS VARIANT START COUNT');
  const [out, frameworks, variant, startText, countText] = args;
  assert(Object.hasOwn(replacements, variant), 'INVALID_VARIANT');
  assert(/^[1-9]\d*$/.test(startText) && /^[1-9]\d*$/.test(countText), 'INVALID_RANGE');
  const start = Number(startText), count = Number(countText);
  assert(Number.isSafeInteger(start) && start >= 1 && count >= 1 && count <= 20 && start + count - 1 <= 200, 'INVALID_RANGE');
  const output = path.resolve(repo, out), base = path.join(repo, constants122.base);
  assert.equal(path.dirname(output), base, 'OUTPUT_OUTSIDE_EXPERIMENT_ROOT');
  assert(/^vision122-[A-Za-z0-9][A-Za-z0-9-]*$/.test(path.basename(output)), 'INVALID_OUTPUT_NAME');
  return { output, base, framework: path.resolve(repo, frameworks), variant, start, count,
    names: Array.from({ length: count }, (_, i) => `img-${String(start + i).padStart(3, '0')}.jpg`) };
}
export function guard122(leases, env, disk, now = Date.now()) {
  for (const [resource, key] of resources122) {
    const lease = leases?.[resource];
    assert(typeof env[key] === 'string' && env[key].length > 0 && lease?.owner === constants122.owner
      && lease.leaseId === env[key] && Number.isFinite(lease.reviewAfter) && lease.reviewAfter * 1000 > now,
    `LEASE_REQUIRED: ${resource}`);
  }
  assert(BigInt(disk.bavail) * BigInt(disk.bsize) >= 5n * 1024n ** 3n, 'LOW_DISK_HOLD');
}
export function verify122(bindings, read) {
  for (const [file, expected] of Object.entries(bindings)) assert.equal(sha122(read(file)), expected, `SOURCE_OR_INPUT_DRIFT: ${file}`);
}
export function inputs122(manifest, names, read) {
  assert.equal(manifest.expectedNamesGivenToOCR, false);
  assert.equal(manifest.prepared?.length, 200, 'INVALID_PREPARED_REPORT');
  const rows = new Map();
  for (const [i, item] of manifest.prepared.entries()) {
    const id = `img-${String(i + 1).padStart(3, '0')}`;
    assert.equal(item.imageId, id, 'NON_NEUTRAL_INPUT');
    assert(/^[a-f0-9]{64}$/.test(item.sha256), 'INVALID_INPUT_HASH');
    rows.set(id + '.jpg', item.sha256);
  }
  return names.map(name => {
    const bytes = read(name); assert.equal(sha122(bytes), rows.get(name), 'PREPARED_INPUT_HASH_MISMATCH');
    return { name, bytes, sha256: rows.get(name) };
  });
}
export function results122(raw, names) {
  const data = JSON.parse(raw);
  assert(Array.isArray(data.results), 'INVALID_RAW_RESULTS');
  const images = data.results.filter(row => Object.hasOwn(row, 'file'));
  assert.deepEqual(images.map(row => row.file).sort(), [...names].sort(), 'RAW_RESULT_SET');
  assert.equal(data.results.length, names.length + 6, 'RAW_CASE_SET');
  const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
  const once = row => { assert.equal(row?.settlements, 1); assert(row.response); return row.response; };
  for (const image of images) {
    const response = once(image); assert.equal(response.ok, true);
    const value = response.data;
    assert.equal(value?.source, 'apple-vision-device');
    assert(uuid.test(image.requestId)); assert.equal(value.requestId, image.requestId);
    assert.deepEqual(value.customWords, []);
    for (const dimension of [value.width, value.height]) assert(Number.isInteger(dimension) && dimension > 0 && dimension <= 2400);
    assert(Number.isFinite(value.totalMs) && value.totalMs >= 0);
    assert(Number.isInteger(value.revision) && value.revision > 0);
    assert(Array.isArray(value.lines) && value.lines.length <= 100);
    for (const line of value.lines) {
      assert(typeof line.text === 'string' && line.text.length > 0 && line.text.length <= 1000);
      assert(Number.isFinite(line.confidence) && line.confidence >= 0 && line.confidence <= 1);
      const b = line.box; assert(b && [b.x, b.y, b.width, b.height].every(Number.isFinite));
      assert(b.x >= 0 && b.y >= 0 && b.width > 0 && b.height > 0 && b.x + b.width <= 1.001 && b.y + b.height <= 1.001);
    }
  }
  const item = name => {
    const rows = data.results.filter(row => row.case === name); assert.equal(rows.length, 1, `MISSING_OR_DUPLICATE_CASE: ${name}`); return rows[0];
  };
  for (const [name, code] of [['invalid-id', 'INVALID_REQUEST_ID'], ['invalid-base64', 'INVALID_BASE64'], ['wrong-signature', 'IMAGE_TYPE_MISMATCH']]) {
    const response = once(item(name)); assert.equal(response.ok, false); assert.equal(response.code, code);
  }
  for (const [name, code] of [['busy', 'BUSY'], ['cancel', 'CANCELLED']]) {
    const response = once(item(name).result); assert.equal(response.ok, false); assert.equal(response.code, code);
  }
  const ack = once(item('cancel').ack); assert.equal(ack.ok, true); assert.equal(ack.data?.cancelled, true);
  assert(uuid.test(ack.data.requestId));
  assert.equal(item('late-settlement').count, 1);
  return data;
}

// Each command owns a host process group. Lease loss, signals and timeout stop it;
// no simulator shutdown or unrelated process cleanup is attempted.
export function child122(binary, args, { env, cwd, timeout, guard, signal }) {
  return new Promise(resolve => {
    guard();
    const child = spawn(binary, args, { env, cwd, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', failure, killTimer;
    const kill = signalName => { try { process.kill(-child.pid, signalName); } catch (error) { if (error.code !== 'ESRCH') failure ||= error; } };
    const stop = error => {
      if (failure) return;
      failure = error; kill('SIGTERM'); killTimer = setTimeout(() => kill('SIGKILL'), 1000);
    };
    const capture = key => chunk => {
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) + chunk.length > 16 * 1024 ** 2) return stop(Error('CHILD_OUTPUT_LIMIT'));
      if (key === 'stdout') stdout += chunk.toString(); else stderr += chunk.toString();
    };
    child.stdout.on('data', capture('stdout')); child.stderr.on('data', capture('stderr'));
    const abort = () => stop(Error('RUNNER_CANCELLED'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    const timer = setTimeout(() => stop(Error('CHILD_TIMEOUT')), timeout);
    const watch = setInterval(() => { try { guard(); } catch (error) { stop(error); } }, 1000);
    child.on('error', error => { failure ||= error; });
    child.on('close', (status, childSignal) => {
      clearTimeout(timer); clearInterval(watch); clearTimeout(killTimer);
      if (failure) kill('SIGKILL');
      signal.removeEventListener('abort', abort);
      resolve({ status, signal: childSignal, stdout, stderr, error: failure?.message });
    });
  });
}

export async function run122(args, { repo = process.cwd(), environment = process.env, io = fs, execute = child122 } = {}) {
  const o = options122(args, repo), bindings = {}, c = constants122;
  const read = file => io.readFileSync(file);
  const guard = () => guard122(JSON.parse(read(c.leases)).leases, environment, io.statfsSync(o.base, { bigint: true }));
  guard();
  assert.equal(io.realpathSync(o.base), o.base, 'SYMLINK_OUTPUT_ROOT');
  assert(!io.existsSync(o.output), 'OUTPUT_COLLISION');
  io.mkdirSync(o.output, { mode: 0o700 });
  const write = (name, bytes) => io.writeFileSync(path.join(o.output, name), bytes, { flag: 'wx', mode: 0o600 });
  const json = value => JSON.stringify(value, null, 2) + '\n';
  const receipt = { scope: 'simulatorVisionexperiment', networkRequestsIssuedByRunner: 0,
    networkObservation: 'Runner API accounting only; not packet capture.',
    eligibleForBound112: false, expectedNamesGivenToOCR: false, fixtureDictionary: false,
    variant: o.variant, corpusStart: o.start, corpusCount: o.count, device: c.device,
    developer: c.developer, framework: o.framework, startedUTC: new Date().toISOString(), passed: false, stages: [] };
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
  const bind = file => { const bytes = read(file); bindings[file] = sha122(bytes); return bytes; };
  const stable = () => { guard(); assert(!controller.signal.aborted, 'RUNNER_CANCELLED'); verify122(bindings, read); };
  const env = { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: environment.HOME,
    DEVELOPER_DIR: c.developer, TMPDIR: path.join(o.output, 'tmp') };
  const command = async (label, binary, argv, timeout = 120000) => {
    stable();
    const result = await execute(binary, argv, { env, cwd: o.output, timeout, guard, signal: controller.signal });
    write(label + '.stdout', result.stdout || ''); write(label + '.stderr', result.stderr || '');
    receipt.stages.push({ label, status: result.status, signal: result.signal, error: result.error });
    assert(!result.error && result.status === 0, `CHILD_FAILED: ${label}: ${result.error || result.status}`);
    stable(); return result.stdout;
  };
  try {
    write('STARTED.json', json(receipt));
    for (const dir of ['tmp', 'inputs', 'module-cache']) io.mkdirSync(path.join(o.output, dir), { mode: 0o700 });
    const plugin = bind(path.join(repo, c.plugin));
    const probe = bind(path.join(repo, c.probe));
    bind(path.join(repo, c.baseline)); bind(path.join(repo, c.runner));
    assert.equal(bindings[path.join(repo, c.runner)], loadedRunnerSHA122, 'LOADED_RUNNER_DRIFT');
    receipt.originalPluginSHA256 = sha122(plugin); receipt.probeSHA256 = sha122(probe);
    receipt.runnerSHA256 = bindings[path.join(repo, c.runner)];
    const variant = transform122(plugin.toString('utf8'), o.variant);
    write('MatchrimOCRPlugin106.swift', variant); write('MatchrimOCR106Probe.swift', probe);
    receipt.variantSHA256 = sha122(variant);
    bind(path.join(o.output, 'MatchrimOCRPlugin106.swift')); bind(path.join(o.output, 'MatchrimOCR106Probe.swift'));
    const prepared = path.join(repo, c.prepared);
    const manifest = JSON.parse(bind(path.join(prepared, 'REPORT.json')));
    const inputs = inputs122(manifest, o.names, name => bind(path.join(prepared, 'prepared', name)));
    receipt.inputs = Object.fromEntries(inputs.map(item => [item.name, item.sha256]));
    for (const item of inputs) { write('inputs/' + item.name, item.bytes); bind(path.join(o.output, 'inputs', item.name)); }
    const moduleDirs = [];
    receipt.frameworkSHA256 = {};
    for (const [name, packageName] of [['Capacitor', 'Capacitor'], ['Cordova', 'CapacitorCordova']]) {
      const installed = path.join(o.framework, name + '.framework', name);
      const bytes = bind(installed); receipt.frameworkSHA256[name] = sha122(bytes);
      const candidates = [o.framework, path.resolve(o.framework, '../..', packageName)];
      const moduleDir = candidates.find(dir => io.existsSync(path.join(dir, name + '.framework', 'Modules', 'module.modulemap')));
      assert(moduleDir, 'MISSING_REAL_CAPACITOR_MODULES');
      assert.equal(sha122(bind(path.join(moduleDir, name + '.framework', name))), sha122(bytes), 'CAPACITOR_FRAMEWORK_MISMATCH');
      moduleDirs.push(moduleDir);
    }
    assert((await command('xcode-version', '/usr/bin/xcodebuild', ['-version'])).startsWith('Xcode 26.0.1\n'), 'WRONG_XCODE');
    const sdk = (await command('sdk', '/usr/bin/xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'])).trim();
    assert(sdk.startsWith(c.developer + '/Platforms/iPhoneSimulator.platform/'), 'WRONG_SDK');
    const swift = (await command('swift', '/usr/bin/xcrun', ['--find', 'swiftc'])).trim();
    assert(swift.startsWith(c.developer + '/Toolchains/'), 'WRONG_SWIFT');
    const binary = path.join(o.output, 'vision122-probe');
    await command('compile', swift, ['-parse-as-library', '-sdk', sdk, '-target', 'arm64-apple-ios16.0-simulator',
      '-module-cache-path', path.join(o.output, 'module-cache'), ...[...new Set(moduleDirs)].flatMap(dir => ['-F', dir]),
      '-framework', 'Capacitor', '-Xlinker', '-rpath', '-Xlinker', o.framework,
      path.join(o.output, 'MatchrimOCRPlugin106.swift'), path.join(o.output, 'MatchrimOCR106Probe.swift'), '-o', binary]);
    io.chmodSync(binary, 0o700); bind(binary);
    const devices = JSON.parse(await command('devices', '/usr/bin/xcrun', ['simctl', 'list', 'devices', '--json'])).devices;
    const selected = Object.values(devices).flat().find(row => row.udid === c.device);
    assert(selected?.isAvailable && ['Shutdown', 'Booted'].includes(selected.state), 'DEDICATED_SIMULATOR_UNAVAILABLE');
    if (selected.state === 'Shutdown') {
      await command('boot', '/usr/bin/xcrun', ['simctl', 'boot', c.device]);
      await command('bootstatus', '/usr/bin/xcrun', ['simctl', 'bootstatus', c.device, '-b']);
    }
    const raw = await command('recognize', '/usr/bin/xcrun', ['simctl', 'spawn', c.device, binary,
      ...o.names.map(name => path.join(o.output, 'inputs', name))], Math.max(120000, o.count * 25000 + 30000));
    const data = results122(raw, o.names);
    write('OCR.json', json(data));
    receipt.outputsSHA256 = Object.fromEntries(['OCR.json', 'recognize.stdout'].map(name => [name, sha122(read(path.join(o.output, name)))]));
    receipt.metrics = data.results.filter(row => row.file).map(row => ({ file: row.file, lines: row.response.data.lines.length, totalMs: row.response.data.totalMs }));
    stable(); receipt.passed = true;
  } catch (error) {
    receipt.passed = false; receipt.error = String(error.stack || error);
  } finally {
    process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
    receipt.bindingsSHA256 = bindings;
    receipt.finishedUTC = new Date().toISOString();
    write('RESULT.json', json(receipt));
  }
  return receipt;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.umask(0o077);
  try {
    const receipt = await run122(process.argv.slice(2));
    console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
