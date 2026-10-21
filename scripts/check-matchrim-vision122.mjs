import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants122 as c, resources122, sha122, transform122, options122, guard122, inputs122, results122, run122 } from './experiment-matchrim-vision122.mjs';

// Only these source files are read. All experiment files/processes are in memory.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(repo, c.plugin), 'utf8');
const probe = fs.readFileSync(path.join(repo, c.probe));
const runner = fs.readFileSync(path.join(repo, c.runner));
let checks = 0;
const test = async (name, fn) => { await fn(); checks++; console.log('PASS', name); };
const id = '00000000-0000-4000-8000-000000000122';
const success = { source: 'apple-vision-device', requestId: id, customWords: [], width: 100, height: 100, totalMs: 1, revision: 3, lines: [] };
const once = response => ({ response, settlements: 1 });
const raw = () => ({ results: [
  { file: 'img-001.jpg', requestId: id, ...once({ ok: true, data: structuredClone(success) }) },
  ...[['invalid-id', 'INVALID_REQUEST_ID'], ['invalid-base64', 'INVALID_BASE64'], ['wrong-signature', 'IMAGE_TYPE_MISMATCH']]
    .map(([name, code]) => ({ case: name, ...once({ ok: false, code }) })),
  { case: 'busy', result: once({ ok: false, code: 'BUSY' }) },
  { case: 'cancel', result: once({ ok: false, code: 'CANCELLED' }), ack: once({ ok: true, data: { cancelled: true, requestId: id } }) },
  { case: 'late-settlement', count: 1 },
] });
const env = Object.fromEntries(resources122.map(([, key], i) => [key, `own-${i}`]));
const leases = Object.fromEntries(resources122.map(([resource, key]) => [resource, { owner: c.owner, leaseId: env[key], reviewAfter: Date.now() / 1000 + 3600 }]));
const disk = { bavail: 5n * 1024n ** 3n, bsize: 1n };
const args = ['qa-artifacts/night105-20261021/vision122-mock', '/memory/Frameworks', 'cpu-default', '1', '1'];
function rig(fault) {
  const root = '/memory/repo', files = new Map(), dirs = new Set([path.join(root, c.base)]), writes = [], calls = [];
  const set = (file, value) => files.set(file, Buffer.isBuffer(value) ? value : Buffer.from(value));
  set(c.leases, JSON.stringify({ leases }));
  set(path.join(root, c.plugin), source); set(path.join(root, c.probe), probe);
  set(path.join(root, c.runner), runner); set(path.join(root, c.baseline), 'baseline');
  const manifest = { expectedNamesGivenToOCR: false, prepared: Array.from({ length: 200 }, (_, i) => ({ imageId: `img-${String(i + 1).padStart(3, '0')}`, sha256: sha122('image') })) };
  set(path.join(root, c.prepared, 'REPORT.json'), JSON.stringify(manifest));
  set(path.join(root, c.prepared, 'prepared/img-001.jpg'), 'image');
  for (const [name, packageName] of [['Capacitor', 'Capacitor'], ['Cordova', 'CapacitorCordova']]) {
    set(`/memory/Frameworks/${name}.framework/${name}`, name);
    const packageDir = path.resolve('/memory/Frameworks', '../..', packageName);
    set(`${packageDir}/${name}.framework/${name}`, fault === 'framework-mismatch' ? 'changed' : name);
    dirs.add(`${packageDir}/${name}.framework/Modules/module.modulemap`);
  }
  const io = {
    readFileSync(file) { assert(files.has(file), `UNEXPECTED_READ: ${file}`); return files.get(file); },
    existsSync: file => files.has(file) || dirs.has(file), realpathSync: file => file,
    statfsSync: () => fault === 'disk' ? { bavail: 1n, bsize: 1n } : disk,
    mkdirSync(file, options) { assert.equal(options.mode, 0o700); assert(!dirs.has(file)); dirs.add(file); },
    writeFileSync(file, bytes, options) { assert.deepEqual(options, { flag: 'wx', mode: 0o600 }); assert(!files.has(file)); set(file, bytes); writes.push(file); },
    chmodSync(file, mode) { assert(files.has(file)); assert.equal(mode, 0o700); },
  };
  const execute = async (binary, argv, options) => {
    options.guard(); calls.push([binary, argv]); let stdout = '';
    if (argv[0] === '-version') stdout = 'Xcode 26.0.1\nBuild version mock\n';
    else if (argv.includes('--show-sdk-path')) stdout = c.developer + '/Platforms/iPhoneSimulator.platform/mock.sdk\n';
    else if (argv.includes('--find')) stdout = c.developer + '/Toolchains/mock/swiftc\n';
    else if (argv.includes('-parse-as-library')) {
      assert(argv.includes(path.join(root, args[0], 'MatchrimOCRPlugin106.swift')));
      assert(!argv.includes(path.join(root, c.plugin)));
      assert(!argv.some(value => /REPORT|img-|ground.?truth|catalogue/i.test(value)));
      set(argv.at(-1), 'binary');
    } else if (argv.includes('devices')) stdout = JSON.stringify({ devices: { mock: [{ udid: c.device, isAvailable: true, state: 'Booted' }] } });
    else if (argv.includes('spawn')) {
      assert.equal(argv.filter(value => value.endsWith('.jpg')).length, 1);
      stdout = fault === 'raw' ? '{}' : fault === 'empty' ? '' : JSON.stringify(raw());
      if (fault === 'drift') set(path.join(root, c.plugin), source + '\n');
      if (fault === 'input-drift') set(path.join(root, c.prepared, 'prepared/img-001.jpg'), 'changed');
    } else assert.fail('UNEXPECTED_COMMAND');
    return { status: 0, stdout, stderr: '' };
  };
  if (fault === 'collision') dirs.add(path.join(root, args[0]));
  const environment = fault === 'lease' ? { ...env, MATCHRIM102_HEAVY_LEASE_ID: 'foreign' } : env;
  return { files, writes, calls, run: () => run122(args, { repo: root, environment, io, execute }) };
}

await test('Exactly one configuration replacement; supported-language filter and empty dictionary stay intact', () => {
  for (const [variant, from, to] of [
    ['cpu-default', 'request.usesCPUOnly = true', 'request.usesCPUOnly = false'],
    ['auto-language', 'request.automaticallyDetectsLanguage = false', 'request.automaticallyDetectsLanguage = true'],
    ['expanded-latin', '["es-ES", "en-US", "fr-FR"]', '["es-ES", "en-US", "fr-FR", "it-IT", "de-DE", "pt-PT"]'],
  ]) {
    const changed = transform122(source, variant);
    assert.equal(changed, source.replace(from, to));
    assert.equal(changed.replace(to, from), source);
    assert(changed.includes('request.customWords = []'));
    assert(changed.includes('.filter { supported.contains($0) }'));
    assert.throws(() => transform122(source + '\n' + source, variant));
    assert.throws(() => transform122(source.replace(from, ''), variant));
  }
  assert.throws(() => transform122(source, 'other'));
  assert.throws(() => transform122(source.replace('request.customWords = []', 'request.customWords = ["synthetic"]'), 'cpu-default'));
});
await test('Neutral bounded integer ranges including count one and upper boundary', () => {
  for (const [start, count] of [['1', '1'], ['181', '20'], ['200', '1']]) assert.equal(options122([...args.slice(0, 3), start, count], '/memory/repo').count, Number(count));
  for (const [start, count] of [['0', '1'], ['201', '1'], ['190', '20'], ['1', '21'], ['1', '0'], ['1.1', '1'], ['1', '1e1'], ['1', 'NaN']])
    assert.throws(() => options122([...args.slice(0, 3), start, count], '/memory/repo'));
  assert.throws(() => options122(['qa-artifacts/night105-20261021/vision112-x', ...args.slice(1)], '/memory/repo'));
  assert.throws(() => options122(['/elsewhere/vision122-x', ...args.slice(1)], '/memory/repo'));
});
await test('Every own live lease and at least 5 GiB required', () => {
  guard122(leases, env, disk);
  for (const [resource, key] of resources122) {
    for (const patch of [{ owner: 'foreign' }, { leaseId: 'foreign' }, { reviewAfter: 0 }])
      assert.throws(() => guard122({ ...leases, [resource]: { ...leases[resource], ...patch } }, env, disk), /LEASE_REQUIRED/);
    assert.throws(() => guard122(leases, { ...env, [key]: '' }, disk));
  }
  assert.throws(() => guard122(leases, env, { bavail: disk.bavail - 1n, bsize: 1n }), /LOW_DISK_HOLD/);
});
await test('Prepared report hashes and neutral names are mandatory; no extra manifest data enters inputs', () => {
  const manifest = { expectedNamesGivenToOCR: false, prepared: Array.from({ length: 200 }, (_, i) => ({ imageId: `img-${String(i + 1).padStart(3, '0')}`, sha256: sha122('bytes'), originalFilename: 'excluded', groundTruth: 'excluded' })) };
  assert.deepEqual(Object.keys(inputs122(manifest, ['img-001.jpg'], () => Buffer.from('bytes'))[0]), ['name', 'bytes', 'sha256']);
  assert.throws(() => inputs122(manifest, ['img-001.jpg'], () => Buffer.from('changed')));
  manifest.prepared[0].imageId = 'original'; assert.throws(() => inputs122(manifest, ['img-001.jpg'], () => Buffer.from('bytes')));
});
await test('Empty OCR valid; missing raw, duplicate rows, custom dictionary and settlement faults fail', () => {
  assert.equal(results122(JSON.stringify(raw()), ['img-001.jpg']).results[0].response.data.lines.length, 0);
  for (const text of ['', '{}', '{"results":[]}', 'not json']) assert.throws(() => results122(text, ['img-001.jpg']));
  for (const mutate of [data => data.results.pop(), data => data.results.push(data.results[0]),
    data => { data.results[0].settlements = 2; }, data => { data.results[0].response.data.customWords = ['synthetic']; },
    data => { data.results[4].result.settlements = 2; }, data => { data.results[5].ack.response.data.cancelled = false; },
    data => { data.results[6].count = 2; }]) {
    const data = raw(); mutate(data); assert.throws(() => results122(JSON.stringify(data), ['img-001.jpg']));
  }
});
await test('Full mocked success binds unchanged probe, original, variant, runner and immutable inputs', async () => {
  const r = rig(), receipt = await r.run(); assert.equal(receipt.passed, true, receipt.error);
  assert.equal(receipt.scope, 'simulatorVisionexperiment'); assert.equal(receipt.networkRequestsIssuedByRunner, 0);
  assert.equal(receipt.eligibleForBound112, false); assert.equal(receipt.originalPluginSHA256, sha122(source));
  assert.equal(receipt.probeSHA256, sha122(probe)); assert.equal(receipt.runnerSHA256, sha122(runner));
  assert.equal(receipt.variantSHA256, sha122(transform122(source, 'cpu-default')));
  assert(r.writes.every(file => file.startsWith('/memory/repo/' + args[0] + '/')));
  assert(r.writes.some(file => file.endsWith('/STARTED.json')) && r.writes.some(file => file.endsWith('/RESULT.json')));
});
await test('Preflight holds/collision create nothing and launch nothing', async () => {
  for (const fault of ['lease', 'disk', 'collision']) {
    const r = rig(fault); await assert.rejects(r.run()); assert.equal(r.writes.length, 0); assert.equal(r.calls.length, 0);
  }
});
await test('Real package layout uses Cordova module from CapacitorCordova, with identical installed binary', async () => {
  const r = rig(), receipt = await r.run();
  assert.equal(receipt.passed, true, receipt.error);
  const compile = r.calls.find(([, args]) => args.includes('-parse-as-library'))[1];
  assert(compile.includes('/CapacitorCordova'));
  assert(!compile.some(value => value.includes('CapacitorCordova.framework')));
  const bad = rig('framework-mismatch'), failed = await bad.run();
  assert.equal(failed.passed, false);
  assert(failed.error.includes('CAPACITOR_FRAMEWORK_MISMATCH'));
  assert.equal(bad.calls.length, 0);
});
await test('Exit zero cannot pass invalid raw or source/input drift; failure logs and receipt preserved', async () => {
  for (const fault of ['raw', 'empty', 'drift', 'input-drift']) {
    const r = rig(fault), receipt = await r.run(); assert.equal(receipt.passed, false, fault);
    assert(r.writes.some(file => file.endsWith('/recognize.stdout')));
    assert(r.writes.some(file => file.endsWith('/RESULT.json')));
    assert.equal(r.calls.filter(([, argv]) => argv.includes('spawn')).length, 1);
  }
});
console.log(`${checks} mocked groups passed; no real children, network, OCR or artifact generation.`);
