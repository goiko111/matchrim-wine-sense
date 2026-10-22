import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { assertLeases112, boundedFetch112, captureSources112, freeze112, isSearchCacheURL112, latestRanges112, loadCache112,
  loadReadings112, loadRuntime112, newState112, parseReading112, predict112, publicHeaders112, sha112, summarize112, verifySources112, evaluateExpected112 } from './benchmark-matchrim-native112.ts';

// All producer, image, catalogue and persistence fixtures live in memory.
globalThis.fetch = () => { throw Error('REAL_NETWORK_FORBIDDEN'); };
const runtime = await loadRuntime112();
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const memoryRepo = '/memory/repo', base = memoryRepo + '/qa-artifacts/night105-20261021';
const root = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines';
const files = ['ios/App/App/MatchrimOCRPlugin106.swift', 'scripts/MatchrimOCR106Probe.swift', 'scripts/qa-matchrim-native-ocr106.mjs'];
const sources = Object.fromEntries(files.map(file => [file, sha112(file)]));
const id = '00000000-0000-4000-8000-000000000112';
const line = (text, x = .1, y = .1, width = .3, height = .012) => ({ text, confidence: .99, box: { x, y, width, height } });
const reading = (lines = [line('Synthetic Cuvee')]) => ({ source: 'apple-vision-device', requestId: id,
  width: 1000, height: 2000, totalMs: 1, revision: 3, customWords: [], lines });
const item = value => ({ reading: value, inputSHA256: sha112('image'), receipt: '/memory/RESULT.json',
  receiptSHA256: sha112('receipt'), ocrSHA256: sha112('ocr'), stdoutSHA256: sha112('stdout') });
const readMap = map => file => { assert(map.has(file), `MISSING_MEMORY_FILE: ${file}`); return map.get(file); };
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
let groups = 0;
const test = async (name, run) => { await run(); groups++; console.log('PASS', name); };

await test('Search cache excludes pinned historical detail routes without admitting arbitrary endpoints', () => {
  assert.equal(isSearchCacheURL112(root + '?page=1&text=Synthetic&store=1', true), true);
  assert.equal(isSearchCacheURL112(root + '/376474/Synthetic-Cuvee-FR', false), false);
  for (const [url, preserved] of [[root + '/376474/Synthetic-Cuvee-FR', true],
    [root + '/376474/Synthetic-Cuvee-FR?text=test', false], [root + '/admin', false],
    [root.replace('app.winerim.com', 'example.invalid') + '/376474/Synthetic', false],
    [root.replace('https://', 'https://user@'), false], [root + '#fragment', false]])
    assert.throws(() => isSearchCacheURL112(url, preserved), /UNEXPECTED_CACHE/);
});

function fixture(revision = 2, start = 1) {
  const map = new Map(), folder = `vision112-${String(start).padStart(3, '0')}-${String(start + 19).padStart(3, '0')}-r${revision}`;
  const dir = base + '/' + folder, inputs = {};
  const raw = { results: Array.from({ length: 20 }, (_, offset) => {
    const file = `img-${String(start + offset).padStart(3, '0')}.jpg`, bytes = Buffer.from(file);
    inputs[file] = sha112(bytes);
    map.set(memoryRepo + '/qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared/' + file, bytes);
    return { file, requestId: id, response: { ok: true, data: reading(offset === 0 ? [] : undefined) }, settlements: 1 };
  }) };
  const receipt = { passed: true, expectedNamesGivenToOCR: false, corpusStart: start, corpusCount: 20, inputs,
    runnerSHA256: sources[files[2]], sourceSHA256: { [files[0]]: sources[files[0]], [files[1]]: sources[files[1]] }, outputsSHA256: {} };
  const rebind = () => {
    const ocr = json(raw), stdout = Buffer.from(JSON.stringify(raw) + '\n');
    map.set(dir + '/OCR.json', ocr); map.set(dir + '/recognize.stdout', stdout);
    receipt.outputsSHA256 = { 'OCR.json': sha112(ocr), 'recognize.stdout': sha112(stdout) };
    map.set(dir + '/RESULT.json', json(receipt));
  };
  rebind();
  return { map, folder, dir, raw, receipt, rebind, load: () => loadReadings112(memoryRepo, base, runtime, sources, readMap(map), [folder]) };
}
const row = index => ({ id: index + 1, name: `Synthetic Cuvee ${index}`, winery: 'Synthetic Winery', slugname: `synthetic-${index}`, vintage: null });
const page = (count = 0, number = 1) => ({ count, page: number,
  results: Array.from({ length: Math.min(20, Math.max(0, count - (number - 1) * 20)) }, (_, i) => row((number - 1) * 20 + i)) });
const wireResponse = (url, payload = page(), status = 200, contentType = 'application/json') => ({
  url: String(url), redirected: false, status, ok: status >= 200 && status < 300,
  headers: new Headers({ 'content-type': contentType }), body: new Response(JSON.stringify(payload)).body,
});
function rig({ live = false, maximum = 0, wire = () => { throw Error('UNEXPECTED_WIRE'); }, cache = new Map() } = {}) {
  const state = newState112(), bodies = new Map(); let persists = 0;
  const fetcher = boundedFetch112({ cache, live, maximum, wire, state, guard: () => undefined,
    saveBody: (name, bytes) => { assert(!bodies.has(name)); bodies.set(name, bytes); }, persist: () => { persists++; } });
  const client = runtime.createGlobalCatalogue103(fetcher);
  return { state, bodies, cache, fetcher, client, persists: () => persists,
    predict: (values = [reading()]) => predict112(new Map(values.map((value, i) => [`img-${i}`, item(value)])), runtime, client, state, () => undefined) };
}

await test('Import is inert; latest numeric revision is selected independently per exact range', () => {
  assert.deepEqual(latestRanges112(['vision112-001-020-r2', 'vision112-001-020-r10', 'vision112-001-020-r1', 'vision112-021-040-r1'])
    .map(batch => batch.folder), ['vision112-001-020-r10', 'vision112-021-040-r1']);
  assert.throws(() => latestRanges112(['vision112-001-020-r2', 'vision112-010-029-r1']), /OVERLAPPING/);
});
await test('Bound r2 loads all 20; bound r1 is supported; empty OCR is valid', async () => {
  for (const revision of [1, 2]) {
    const start = revision === 1 ? 21 : 1;
    const values = await fixture(revision, start).load(); assert.equal(values.size, 20);
    assert.equal(values.get(`img-${String(start).padStart(3, '0')}`).reading.lines.length, 0);
  }
});
await test('Latest failed, unfinished, or unbound batch never falls back to old r1', async () => {
  for (const fault of ['failed', 'missing', 'unbound']) {
    const old = fixture(1), latest = fixture(2), map = new Map([...old.map, ...latest.map]);
    if (fault === 'failed') { latest.receipt.passed = false; map.set(latest.dir + '/RESULT.json', json(latest.receipt)); }
    if (fault === 'missing') map.delete(latest.dir + '/RESULT.json');
    if (fault === 'unbound') { delete latest.receipt.outputsSHA256; map.set(latest.dir + '/RESULT.json', json(latest.receipt)); }
    await assert.rejects(loadReadings112(memoryRepo, base, runtime, sources, readMap(map), [old.folder, latest.folder]));
  }
});
await test('OCR bytes, exact stdout bytes, parsed stdout and image bytes are independently bound', async () => {
  for (const fault of ['ocr', 'stdout-bytes', 'stdout-value', 'image', 'input-set', 'result-set']) {
    const f = fixture();
    if (fault === 'ocr') f.map.set(f.dir + '/OCR.json', json({ results: [] }));
    if (fault === 'stdout-bytes') f.map.set(f.dir + '/recognize.stdout', Buffer.concat([f.map.get(f.dir + '/recognize.stdout'), Buffer.from(' ')]));
    if (fault === 'stdout-value') {
      const bytes = json({ results: [] }); f.map.set(f.dir + '/recognize.stdout', bytes);
      f.receipt.outputsSHA256['recognize.stdout'] = sha112(bytes); f.map.set(f.dir + '/RESULT.json', json(f.receipt));
    }
    if (fault === 'image') f.map.set(memoryRepo + '/qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared/img-001.jpg', Buffer.from('changed'));
    if (fault === 'input-set') { delete f.receipt.inputs['img-001.jpg']; f.map.set(f.dir + '/RESULT.json', json(f.receipt)); }
    if (fault === 'result-set') { f.raw.results.pop(); f.rebind(); }
    await assert.rejects(f.load(), undefined, fault);
  }
});
await test('Current plugin, probe and producer runner fingerprints are mandatory', async () => {
  for (const file of files) {
    const f = fixture();
    if (file === files[2]) f.receipt.runnerSHA256 = sha112('changed'); else f.receipt.sourceSHA256[file] = sha112('changed');
    f.map.set(f.dir + '/RESULT.json', json(f.receipt)); await assert.rejects(f.load(), /BINDING/);
  }
});
await test('Production metadata validator rejects mock source, custom words, malformed geometry and request mismatch', async () => {
  const mutations = [data => { data.source = 'mock'; }, data => { data.customWords = ['GT_SENTINEL']; },
    data => { data.lines[0].box.x = 2; }, data => { data.requestId = '00000000-0000-4000-8000-000000000113'; }];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f.raw.results[1].response.data); f.rebind(); await assert.rejects(f.load());
  }
  const r = rig(), invalid = { ...reading(), source: 'mock' }, scenes = await r.predict([invalid]);
  assert.equal(scenes[0].eligible, false); assert.equal(scenes[0].queries.length, 0); assert.equal(r.state.missingCache, 0);
});
await test('Valid empty OCR and unsupported-year overflow abstain without catalogue requests', async () => {
  const r = rig(), scenes = await r.predict([reading([]), reading([line('Synthetic Cuvee'), line('2020 '.repeat(8) + '2021')])]);
  assert(scenes.every(scene => scene.status === 'abstained' && scene.eligible && !scene.queries.length));
  assert.equal(r.state.missingCache, 0);
  const summary = summarize112(scenes, 2, true, r.state); assert.equal(summary.abstentions, 2); assert.equal(summary.exitCode, 0);
});
await test('Production query, year and fragment geometry logic agree, including split award context', async () => {
  const source = fs.readFileSync(path.join(repo, 'src/components/wine-import/GlobalWineRecovery104.tsx'), 'utf8');
  const begin = source.indexOf('const fragments = suggestLocalOCRFragments108(text.lines);');
  const end = source.indexOf('\n      }\n      setProposalVintage', begin); assert(begin >= 0 && end > begin);
  const gate = source.slice(begin, end);
  const tree = ts.createSourceFile('GlobalWineRecovery104.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const calls = [];
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'globalRecoveryQueries104') calls.push(node);
    ts.forEachChild(node, visit);
  }; visit(tree); assert.equal(calls.length, 1);
  const invocation = calls[0].getText(tree);
  const samples = [reading([line('Synthetic Cuvee'), line('Cosecha 2020', .1, .7)]),
    reading([line('Synthetic Cuvee 2020'), line('Casa Atlas', .1, .7)]),
    reading([line('Synthetic Cuvee'), line('Añada 2020', .1, .7), line('Casa Atlas', .1, .8)]),
    reading([line('Synthetic Cuvee'), line('Bottled in 2020', .1, .7)]),
    reading([line('Synthetic Cuvee'), line('2026', .37, .55, .1), line('LYON', .53, .55, .1), line('GOLD', .49, .53, .1), line('2020', .36, .1, .1)]),
    reading([line('Synthetic Cuvee', .1, .4), line('S', .1, .7, .01, .02), line('ynthetic', .111, .7, .08, .02)]),
    reading([line('2020', .4, .2, .1, .012), line('LYON', .51, .2, .1, .012), line('GOLD', .51, .215, .1, .012), line('Cuvee Horizon', .1, .7), line('Casa Atlas', .1, .8)]),
    reading([line('CASA', .3, .4, .3, .04), line('HORIZONTE', .3, .444, .3, .04)])];
  for (const raw of samples) {
    const text = await parseReading112(raw, id, runtime), candidate = runtime.localSingleCandidate109(text, 'synthetic');
    const result = vm.runInNewContext('(()=>{let evidence,vintage,queryLines;' + gate + ';return {evidence,vintage,queryLines};})()', {
      text, candidate, suggestLocalOCRFragments108: runtime.suggestLocalOCRFragments108, wineYearRoles105: runtime.wineYearRoles105,
      setNotice: () => undefined, setReconstructed: () => undefined, setProposals: () => undefined,
    });
    assert(result);
    const r = rig({ live: true, maximum: 6, wire: async url => wireResponse(url) }), [scene] = await r.predict([text]);
    assert.equal(scene.candidateVintage, result.vintage);
    const context = { candidate, evidence: [...result.evidence], vintage: result.vintage, queryLines: result.queryLines, useLocalReading: true,
      globalRecoveryQueries104: runtime.globalRecoveryQueries104 };
    const actualComponentQueries = Array.from(vm.runInNewContext(invocation, context));
    assert.deepEqual(scene.queries, actualComponentQueries);
    if (text.lines[0].text === 'Synthetic Cuvee 2020') {
      const missingHint = ts.factory.updateCallExpression(calls[0], calls[0].expression, calls[0].typeArguments, calls[0].arguments.slice(0, 3));
      const mutant = ts.createPrinter().printNode(ts.EmitHint.Expression, missingHint, tree);
      assert.notDeepEqual(scene.queries, Array.from(vm.runInNewContext(mutant, context)), 'Parity must catch a missing fourth argument');
    }
    if ((text.lines[0].text === '2020' && text.lines[1].text === 'LYON') || text.lines[0].text === 'CASA') {
      const missingGeometry = ts.factory.updateCallExpression(calls[0], calls[0].expression, calls[0].typeArguments, calls[0].arguments.slice(0, 4));
      const mutant = ts.createPrinter().printNode(ts.EmitHint.Expression, missingGeometry, tree);
      assert.notDeepEqual(scene.queries, Array.from(vm.runInNewContext(mutant, context)), 'Parity must catch missing query geometry');
    }
    assert.deepEqual(scene.reconstructed, runtime.suggestLocalOCRFragments108(text.lines).alternatives);
  }
});
await test('Cache miss is explicitly incomplete, excluded from proxy denominator and exits nonzero', async () => {
  const r = rig(), scenes = await r.predict(), summary = summarize112(scenes, 1, true, r.state);
  assert.equal(r.state.starts, 0); assert.equal(r.state.missingCache, 1);
  assert.equal(summary.recognitionProxyDenominator, 0); assert.equal(summary.incompleteScenes, 1); assert.equal(summary.exitCode, 1);
});
await test('Zero cap and cap exhaustion during pagination never count interrupted or held scenes', async () => {
  for (const maximum of [0, 1]) {
    const r = rig({ live: true, maximum, wire: async url => wireResponse(url, page(21, Number(new URL(url).searchParams.get('page')))) });
    const scenes = await r.predict([reading(), reading()]); assert.equal(r.state.starts, maximum);
    assert.equal(scenes[0].eligible, false); assert.equal(scenes[1].reason, 'RUN_HELD_BEFORE_SCENE');
    assert.equal(summarize112(scenes, 2, true, r.state).recognitionProxyDenominator, 0);
  }
});
await test('Successful pagination counts starts; complete first scene remains scored after later cap', async () => {
  const r = rig({ live: true, maximum: 2, wire: async url => wireResponse(url, page(21, Number(new URL(url).searchParams.get('page')))) });
  const scenes = await r.predict([reading(), reading([line('Different Cuvee')])]);
  assert.equal(r.state.starts, 2); assert.equal(scenes[0].eligible, true); assert.equal(scenes[1].eligible, false);
  const summary = summarize112(scenes, 2, true, r.state); assert.equal(summary.evaluated, 1); assert.equal(summary.exitCode, 1);
});
await test('Bounded partial catalogue result is reported incomplete even if ranking could return proposals', async () => {
  const r = rig({ live: true, maximum: 1, wire: async url => wireResponse(url, page(81)) });
  const scenes = await r.predict(); assert.equal(scenes[0].pages[0].status, 'partial');
  assert.equal(r.state.starts, 1); assert.equal(scenes[0].pages[0].rows, 20);
  assert.equal(scenes[0].eligible, false); assert.equal(summarize112(scenes, 1, true, r.state).exitCode, 1);
});
await test('Proposal counts 61 and 80 complete in four pages without changing scene eligibility rules', async () => {
  for (const count of [61, 80]) {
    const r = rig({ live: true, maximum: 4, wire: async url => wireResponse(url, page(count, Number(new URL(url).searchParams.get('page')))) });
    const [scene] = await r.predict();
    assert.equal(r.state.starts, 4); assert.equal(scene.pages[0].rows, count);
    assert.equal(scene.pages[0].status, 'complete'); assert.equal(scene.eligible, true);
    assert.equal(summarize112([scene], 1, true, r.state).exitCode, 0);
  }
});
await test('Metadata-only local reading abstains without pretending to have queried the catalogue', async () => {
  const r = rig({ live: true, maximum: 1, wire: () => { throw Error('NO_NETWORK_EXPECTED'); } });
  const [scene] = await r.predict([reading([line('PET-NAT')])]);
  assert.equal(scene.status, 'abstained'); assert.equal(scene.eligible, true);
  assert.equal(scene.reason, 'NO_IDENTITY_BEARING_QUERY'); assert.equal(scene.queries.length, 0);
  assert.equal(r.state.starts, 0); assert.equal(summarize112([scene], 1, true, r.state).abstentions, 1);
});
await test('Complete generic style and viticulture role readings abstain without recognition or GETs', async () => {
  for (const text of ['Trebbiano', 'Carmenere', 'VINEYARDS']) {
    const r = rig({ live: true, maximum: 1, wire: () => { throw Error('NO_NETWORK_EXPECTED'); } });
    const [scene] = await r.predict([reading([line(text)])]);
    assert.equal(scene.status, 'abstained'); assert.equal(scene.eligible, true);
    assert.equal(scene.reason, 'NO_IDENTITY_BEARING_QUERY');
    assert.deepEqual(scene.queries, []); assert.deepEqual(scene.proposals, []); assert.equal(r.state.starts, 0);
    assert.equal(summarize112([scene], 1, true, r.state).abstentions, 1);
  }
});
await test('Schema-recovered valid proposals remain incomplete and excluded from accuracy metrics', async () => {
  const good = { ...row(0), name: 'Synthetic Cuvee' };
  const r = rig({ live: true, maximum: 1, wire: async url => wireResponse(url,
    { count: 2, page: 1, results: [good, { ...row(1), slugname: '' }] }) });
  const [scene] = await r.predict();
  assert.equal(scene.pages[0].status, 'incomplete'); assert.equal(scene.pages[0].rows, 1);
  assert.equal(scene.proposals.length, 1); assert.equal(scene.eligible, false);
  const summary = summarize112([scene], 1, true, r.state);
  assert.equal(summary.evaluated, 0); assert.equal(summary.withProposals, 0); assert.equal(summary.exitCode, 1);
});
await test('HTTP failure, fetch error and malformed JSON cannot produce a complete benchmark', async () => {
  for (const wire of [async url => wireResponse(url, {}, 503), async () => { throw Error('MOCK_TRANSPORT_ERROR'); },
    async url => ({ ...wireResponse(url), body: new Response('{').body })]) {
    const r = rig({ live: true, maximum: 2, wire }), scenes = await r.predict();
    assert.equal(scenes[0].eligible, false); assert.equal(summarize112(scenes, 1, true, r.state).exitCode, 1);
    assert.equal(r.state.starts, 1);
  }
});
await test('One HTTP500 remains failed but independent scenes continue without retrying its URL', async () => {
  let calls = 0;
  const r = rig({ live: true, maximum: 2, wire: async url => wireResponse(url, page(), ++calls === 1 ? 500 : 200) });
  const scenes = await r.predict([reading([line('Failed Reference')]), reading([line('Independent Reference')])]);
  assert.equal(r.state.held, false); assert.equal(r.state.starts, 2); assert.equal(r.state.failures.length, 1);
  assert.equal(scenes[0].eligible, false); assert.equal(scenes[1].eligible, true);
  const summary = summarize112(scenes, 2, true, r.state); assert.equal(summary.evaluated, 1); assert.equal(summary.exitCode, 1);
  await r.client.searchProposals('Failed Reference');
  assert.equal(calls, 2); assert.equal(r.state.failures.length, 2); assert.equal(r.state.held, false);
});
await test('Authentication and rate-limit responses remain global stops', async () => {
  for (const status of [401, 403, 429]) {
    const r = rig({ live: true, maximum: 2, wire: async url => wireResponse(url, page(), status) });
    const scenes = await r.predict([reading(), reading([line('Independent Reference')])]);
    assert.equal(r.state.held, true); assert.equal(r.state.starts, 1);
    assert.equal(scenes[1].reason, 'RUN_HELD_BEFORE_SCENE');
  }
});
await test('New receipt headers retain response classification, never session or authentication headers', () => {
  const headers = publicHeaders112(new Headers({ 'content-type': 'text/plain', date: 'synthetic-date',
    'set-cookie': 'SYNTHETIC-NOT-ACTUAL', authorization: 'SYNTHETIC-NOT-ACTUAL', 'x-api-key': 'SYNTHETIC-NOT-ACTUAL' }));
  assert.deepEqual(headers, { 'content-type': 'text/plain', date: 'synthetic-date' });
});
await test('Live text/plain stays unavailable on in-memory and reloaded cache replay', async () => {
  const r = rig({ live: true, maximum: 1, wire: async url => wireResponse(url, page(), 200, 'text/plain') });
  assert.equal((await r.client.searchProposals('Synthetic Cuvee')).status, 'unavailable');
  assert.equal((await r.client.searchProposals('Synthetic Cuvee')).status, 'unavailable');
  assert.equal(r.state.starts, 1); assert.equal(r.state.cacheReads, 1);
  const folder = memoryRepo + '/qa-artifacts/new-live-cache', map = new Map([[folder + '/REQUESTS.json', json(r.state.requests)]]);
  for (const [name, bytes] of r.bodies) map.set(folder + '/' + name, bytes);
  const cached = loadCache112(memoryRepo, [folder], readMap(map));
  const replay = rig({ cache: cached }); assert.equal((await replay.client.searchProposals('Synthetic Cuvee')).status, 'unavailable');
  assert.equal(replay.state.starts, 0); assert.equal(replay.state.cacheReceipts[0].metadata, 'preserved');
});
await test('Only pinned legacy manifest can assume JSON; altered bodies and arbitrary legacy caches fail', () => {
  const folder = memoryRepo + '/qa-artifacts/unverified';
  const manifest = [{ url: root + '?page=1&text=Synthetic&store=1', body: 'response-001.json', status: 200, sha256: sha112('{}'), bytes: 2 }];
  assert.throws(() => loadCache112(memoryRepo, [folder], readMap(new Map([[folder + '/REQUESTS.json', json(manifest)]]))), /UNVERIFIED_LEGACY/);
  // Read a single known snapshot, not the full200 replay or its 388 response files.
  const known = path.join(repo, 'qa-artifacts/global103-20261021/ocr200-r1'), bytes = fs.readFileSync(known + '/REQUESTS.json');
  const receipts = JSON.parse(bytes), body = fs.readFileSync(known + '/' + receipts[0].body);
  const onlyFirst = file => { if (file.endsWith('/REQUESTS.json')) return bytes;
    if (file === known + '/' + receipts[0].body) return body; throw Error('STOP_AFTER_FIRST_LEGACY_BODY'); };
  assert.throws(() => loadCache112(repo, [known], onlyFirst), /STOP_AFTER_FIRST/);
  const changed = file => file.endsWith('/REQUESTS.json') ? bytes : Buffer.from('changed');
  assert.throws(() => loadCache112(repo, [known], changed), /AssertionError/);
});
await test('Late aborted fetch cannot write a body, cache success, or rewrite receipts after completion', async () => {
  let resolveWire;
  const r = rig({ live: true, maximum: 1, wire: () => new Promise(resolve => { resolveWire = resolve; }) });
  const controller = new AbortController();
  const pending = r.fetcher(root + '?page=1&text=Synthetic&store=1', { method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal });
  controller.abort(); await assert.rejects(pending, /ABORTED/);
  const persists = r.persists(); resolveWire(wireResponse(root + '?page=1&text=Synthetic&store=1'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(r.bodies.size, 0); assert.equal(r.cache.size, 0); assert.equal(r.persists(), persists);
  assert.equal(r.state.requests[0].state, 'failed');
});
await test('Source snapshot covers transitive runtime, year and OCR validator; post-run drift invalidates metrics', () => {
  const hashes = captureSources112(repo);
  for (const file of ['src/utils/wineYearRole105.ts', 'src/utils/nativeOCR106.ts', 'src/utils/winerimOriginalSheet.ts',
    'supabase/functions/_shared/matchrim-menu-grounding.ts', ...files]) assert(hashes[file], file);
  const map = new Map(Object.keys(hashes).map(file => [path.join(repo, file), fs.readFileSync(path.join(repo, file))]));
  verifySources112(repo, hashes, readMap(map));
  map.set(path.join(repo, 'src/utils/wineYearRole105.ts'), Buffer.from('changed by parent'));
  assert.throws(() => verifySources112(repo, hashes, readMap(map)), /SOURCE_DRIFT/);
  assert.equal(summarize112([{ eligible: true, status: 'complete', proposals: [], top1Hit: true }], 1, false, newState112()).evaluated, 0);
});
await test('Own writer and heavy lease are both required, including expiry checks', () => {
  const owner = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d', now = 1000;
  const leases = { 'writer-matchrim-native99': { owner, leaseId: 'writer65b27b08', reviewAfter: 2 }, 'heavy-local': { owner, leaseId: 'heavy', reviewAfter: 2 } };
  const env = { MATCHRIM102_WRITER_LEASE_ID: 'writer65b27b08', MATCHRIM102_HEAVY_LEASE_ID: 'heavy' };
  assertLeases112(leases, env, now);
  for (const resource of Object.keys(leases)) {
    assert.throws(() => assertLeases112({ ...leases, [resource]: { ...leases[resource], owner: 'foreign' } }, env, now), /LEASE_REQUIRED/);
    assert.throws(() => assertLeases112(leases, env, 2000), /LEASE_REQUIRED/);
  }
  assert.throws(() => assertLeases112(leases, { ...env, MATCHRIM102_WRITER_LEASE_ID: '' }, now), /LEASE_REQUIRED/);
});
await test('Frozen predictions cannot be changed by evaluation; GT file access follows prediction freeze', () => {
  const value = freeze112([{ proposals: [{ name: 'Synthetic Cuvee' }] }]);
  assert.throws(() => { value[0].proposals[0].name = 'GT_SENTINEL'; }, TypeError);
  const row = Object.freeze({ grapes: ['Synthetic Grape'] }); freeze112(row);
  assert.throws(() => row.grapes.push('GT_SENTINEL'), TypeError);
  const source = fs.readFileSync(path.join(repo, 'scripts/benchmark-matchrim-native112.ts'), 'utf8');
  assert(source.indexOf('freeze112(predictions);') < source.indexOf('EXACT200-CATALOGUE-COVERAGE.json'));
  assert.equal(source.match(/EXACT200-CATALOGUE-COVERAGE\.json/g)?.length, 1);
});
await test('Every attempted scene gets review metadata, but incomplete retrieval never gets scored', () => {
  const scenes = freeze112([
    { imageId: 'img-001', eligible: true, status: 'complete', queries: ['Synthetic read'], proposals: [{ name: 'Cuvee Oriole', row: { winery: 'Casa Atlas' } }] },
    { imageId: 'img-002', eligible: false, status: 'incomplete', queries: ['Other read'], proposals: [{ name: 'GT_SENTINEL', row: { winery: 'GT_PRODUCER' } }] },
  ]);
  const expected = [{ image_id: 'img-001', expected_name: 'Cuvee Oriole', expected_producer: 'Casa Atlas' },
    { image_id: 'img-002', expected_name: 'GT_SENTINEL', expected_producer: 'GT_PRODUCER' }];
  let calls = 0;
  const evaluate = rows => evaluateExpected112(scenes, rows, (left, right) => { calls++; return runtime.isSafeCanonicalLabelMatch(left, right); });
  const results = evaluate(expected);
  assert.equal(calls, 1); assert.equal(results[0].top1Hit, true);
  assert.equal(results[1].expected.name, 'GT_SENTINEL');
  assert(!Object.hasOwn(results[1], 'top1Hit') && !Object.hasOwn(results[1], 'top3Hit'));
  for (let index = 0; index < 2; index++) {
    assert.equal(results[index].proposals, scenes[index].proposals);
    assert.equal(results[index].queries, scenes[index].queries);
    assert(!Object.hasOwn(scenes[index], 'expected'));
  }
  const summary = summarize112(results, 2, true, newState112());
  assert.equal(summary.evaluated, 1); assert.equal(summary.incompleteScenes, 1);
  assert.equal(summary.top1Expected, 1); assert.equal(summary.exitCode, 1); assert.equal(summary.complete, false);
  assert.throws(() => evaluate(expected.slice(0, 1)), /MISSING_EXPECTED_SCENE/);
  assert.throws(() => evaluate([expected[0], expected[0]]), /DUPLICATE_EXPECTED_ID/);
  assert.throws(() => evaluate([{ ...expected[0], expected_name: null }]), /INVALID_EXPECTED_ROW/);
});
console.log(JSON.stringify({ groups, passed: true, realNetworkCalls: 0, modelStarts: 0, diskWrites: 0, full200Runs: 0 }));
