import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import type { LocalOCRResult106 } from '../src/utils/nativeOCR106';
import type { PublicGlobalRow103 } from '../src/utils/nativeGlobalCatalogue103';

export const sha112 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const script112 = 'scripts/benchmark-matchrim-native112.ts';
const loadedScriptSHA112 = sha112(fs.readFileSync(fileURLToPath(import.meta.url)));
const plugin112 = 'ios/App/App/MatchrimOCRPlugin106.swift';
const probe112 = 'scripts/MatchrimOCR106Probe.swift';
const runner112 = 'scripts/qa-matchrim-native-ocr106.mjs';
const root112 = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines';
const legacy112: Record<string, string> = {
  'qa-artifacts/global103-20261021/ocr200-r1': '6592be63d01631f571f30330d9d9e5f1d5ec21dc2d6f4e7c31f5dbe58c606ad8',
  'qa-artifacts/night105-20261021/public-pages111-r1': '409317f41966b195ce5a53b4ab350bf263ecc15742820c4def458419f42c05e6',
};
type Read112 = (file: string) => Buffer;
type Runtime112 = Awaited<ReturnType<typeof loadRuntime112>>;
export async function loadRuntime112() {
  const catalogue = await import('../src/utils/nativeGlobalCatalogue103');
  const proposals = await import('../src/utils/globalWineProposals104');
  const single = await import('../src/utils/nativeSingleLabel109');
  const fragments = await import('../src/utils/localOCRFragments108');
  const identity = await import('../src/utils/winerimLabelIdentity');
  const years = await import('../src/utils/wineYearRole105');
  const ocr = await import('../src/utils/nativeOCR106');
  return { ...catalogue, ...proposals, ...single, ...fragments, ...identity, ...years, ...ocr };
}

// Snapshot the repository runtime import closure before importing production code.
// The component and producer are comparison/provenance sources, not executed here.
export function captureSources112(repo: string, read: Read112 = fs.readFileSync) {
  const hashes: Record<string, string> = {};
  const visit = (file: string) => {
    if (hashes[file]) return;
    const bytes = read(path.join(repo, file)); hashes[file] = sha112(bytes);
    const tree = ts.createSourceFile(file, bytes.toString('utf8'), ts.ScriptTarget.Latest, true);
    const dependency = (specifier: string) => {
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return;
      const stem = specifier.startsWith('@/') ? path.join(repo, 'src', specifier.slice(2)) : path.resolve(repo, path.dirname(file), specifier);
      assert(stem.startsWith(repo + '/'), 'SOURCE_OUTSIDE_REPOSITORY');
      const candidates = [stem, ...['.ts', '.tsx', '.mjs', '.js', '.cjs', '/index.ts', '/index.tsx'].map(ext => stem + ext)];
      for (const target of candidates) {
        try { read(target); } catch { continue; }
        visit(path.relative(repo, target)); return;
      }
      throw new Error(`UNRESOLVED_EXECUTION_MODULE: ${specifier}`);
    };
    const walk = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause;
        const onlyTypes = clause?.isTypeOnly || (clause && !clause.name && clause.namedBindings
          && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length > 0
          && clause.namedBindings.elements.every(item => item.isTypeOnly));
        if (!onlyTypes) dependency((node.moduleSpecifier as ts.StringLiteral).text);
      } else if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier) {
        dependency((node.moduleSpecifier as ts.StringLiteral).text);
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        assert(ts.isStringLiteral(node.arguments[0]), 'UNBOUND_DYNAMIC_EXECUTION_IMPORT');
        dependency(node.arguments[0].text);
      }
      ts.forEachChild(node, walk);
    };
    walk(tree);
  };
  visit(script112);
  for (const file of [plugin112, probe112, runner112, 'src/components/wine-import/GlobalWineRecovery104.tsx', 'package.json', 'package-lock.json'])
    hashes[file] = sha112(read(path.join(repo, file)));
  return hashes;
}
export function verifySources112(repo: string, hashes: Record<string, string>, read: Read112 = fs.readFileSync) {
  for (const [file, hash] of Object.entries(hashes)) assert.equal(sha112(read(path.join(repo, file))), hash, `SOURCE_DRIFT: ${file}`);
}
export function assertLeases112(leases: Record<string, { owner: string; leaseId: string; reviewAfter: number }>, env: NodeJS.ProcessEnv, now = Date.now()) {
  for (const [resource, key] of [['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID'], ['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID']]) {
    const lease = leases[resource];
    assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && Boolean(env[key])
      && lease.leaseId === env[key] && lease.reviewAfter * 1000 > now, `LEASE_REQUIRED: ${resource}`);
  }
}

export function latestRanges112(names: string[]) {
  const ranges = new Map<string, { folder: string; start: number; end: number; revision: number }>();
  for (const folder of names) {
    const match = /^vision112-(\d{3})-(\d{3})-r([1-9]\d*)$/.exec(folder); if (!match) continue;
    const start = Number(match[1]), end = Number(match[2]), revision = Number(match[3]);
    assert(start >= 1 && end >= start && end <= 200 && end - start < 20 && Number.isSafeInteger(revision), 'INVALID_CORPUS_RANGE');
    const key = `${start}-${end}`, previous = ranges.get(key);
    if (!previous || revision > previous.revision) ranges.set(key, { folder, start, end, revision });
  }
  const chosen = [...ranges.values()].sort((a, b) => a.start - b.start);
  for (let i = 1; i < chosen.length; i++) assert(chosen[i].start > chosen[i - 1].end, 'OVERLAPPING_CORPUS_RANGES');
  assert(chosen.length, 'NO_BOUND_NATIVE_BATCHES'); return chosen;
}
export async function parseReading112(data: LocalOCRResult106, requestId: string, runtime: Runtime112) {
  // Production transport validation only: dummy bytes are never decoded or sent.
  return runtime.createLocalOCR106({ recognize: async () => data, cancel: async () => undefined }, () => requestId)('data:image/jpeg;base64,AAAA');
}
type Reading112 = { reading: LocalOCRResult106; inputSHA256: string; receipt: string; receiptSHA256: string; ocrSHA256: string; stdoutSHA256: string };
export async function loadReadings112(repo: string, base: string, runtime: Runtime112, sources: Record<string, string>, read: Read112 = fs.readFileSync, names = fs.readdirSync(base)) {
  const readings = new Map<string, Reading112>();
  for (const batch of latestRanges112(names)) {
    const folder = path.join(base, batch.folder), receiptFile = path.join(folder, 'RESULT.json');
    // Never fall back to an older revision, including when the latest is unfinished.
    const receiptBytes = read(receiptFile), receipt = JSON.parse(receiptBytes.toString('utf8'));
    assert.equal(receipt.passed, true, `LATEST_BATCH_NOT_PASSED: ${batch.folder}`);
    assert.equal(receipt.expectedNamesGivenToOCR, false);
    assert.equal(receipt.corpusStart, batch.start); assert.equal(receipt.corpusCount, batch.end - batch.start + 1);
    for (const file of [plugin112, probe112]) assert.equal(receipt.sourceSHA256?.[file], sources[file], `OCR_SOURCE_BINDING: ${file}`);
    assert.equal(receipt.runnerSHA256, sources[runner112], 'OCR_RUNNER_BINDING');
    const ocrBytes = read(path.join(folder, 'OCR.json')), stdoutBytes = read(path.join(folder, 'recognize.stdout'));
    assert.equal(sha112(ocrBytes), receipt.outputsSHA256?.['OCR.json'], 'OCR_OUTPUT_BINDING');
    assert.equal(sha112(stdoutBytes), receipt.outputsSHA256?.['recognize.stdout'], 'OCR_STDOUT_BINDING');
    const raw = JSON.parse(ocrBytes.toString('utf8'));
    assert.deepEqual(raw, JSON.parse(stdoutBytes.toString('utf8')), 'OCR_STDOUT_DISAGREEMENT');
    assert(Array.isArray(raw.results), 'INVALID_OCR_RESULTS');
    const expectedFiles = Array.from({ length: receipt.corpusCount }, (_, i) => `img-${String(batch.start + i).padStart(3, '0')}.jpg`);
    assert.deepEqual(Object.keys(receipt.inputs).sort(), expectedFiles, 'OCR_INPUT_SET');
    const rows = raw.results.filter((item: { file?: unknown }) => Object.hasOwn(item, 'file'));
    assert.deepEqual(rows.map((row: { file: string }) => row.file).sort(), expectedFiles, 'OCR_RESULT_SET');
    for (const row of rows) {
      assert.equal(row.response?.ok, true); assert.equal(row.settlements, 1);
      const id = row.file.replace('.jpg', ''); assert(!readings.has(id), 'DUPLICATE_OCR_IMAGE');
      const image = path.join(repo, 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared', row.file);
      assert.equal(sha112(read(image)), receipt.inputs[row.file], 'OCR_IMAGE_BINDING');
      const reading = await parseReading112(row.response.data, row.requestId, runtime);
      readings.set(id, { reading, inputSHA256: receipt.inputs[row.file], receipt: receiptFile, receiptSHA256: sha112(receiptBytes),
        ocrSHA256: sha112(ocrBytes), stdoutSHA256: sha112(stdoutBytes) });
    }
  }
  assert(readings.size >= 20 && readings.size <= 200); return readings;
}

type Cache112 = { bytes: Buffer; status: number; headers: Record<string, string>; responseURL: string; redirected: boolean;
  metadata: 'preserved' | 'legacy-assumedJSON'; sourceReceipt: string; sha256: string };
export function isSearchCacheURL112(value: string, preserved: boolean) {
  const url = new URL(value), endpoint = url.origin + url.pathname;
  assert(!url.username && !url.password && !url.hash, 'UNEXPECTED_CACHE_URL');
  if (endpoint === root112) return true;
  // The pinned historical manifest also contains independent detail receipts.
  // They cannot answer a search and must never enter this search-only cache.
  const root = new URL(root112), suffix = url.pathname.slice(root.pathname.length);
  assert(!preserved && url.origin === root.origin && url.pathname.startsWith(root.pathname + '/')
    && !url.search && /^\/[1-9]\d{0,9}\/[A-Za-z0-9_-]{1,200}$/.test(suffix), 'UNEXPECTED_CACHE_ENDPOINT');
  return false;
}
export function loadCache112(repo: string, folders: string[], read: Read112 = fs.readFileSync) {
  const cache = new Map<string, Cache112>();
  for (const folder of folders) {
    assert(folder.startsWith(path.join(repo, 'qa-artifacts') + '/'));
    const manifest = path.join(folder, 'REQUESTS.json'), receiptBytes = read(manifest), receipts = JSON.parse(receiptBytes.toString('utf8'));
    assert(Array.isArray(receipts));
    for (const receipt of receipts) {
      if (receipt.state === 'started' || receipt.state === 'failed' || receipt.status === 0) continue;
      const preserved = receipt.metadata === 'preserved';
      if (!preserved) {
        assert.equal(sha112(receiptBytes), legacy112[path.relative(repo, folder)], 'UNVERIFIED_LEGACY_CACHE');
        if (receipt.status !== 200) continue;
      }
      assert(/^response-\d{3}\.json$/.test(receipt.body));
      const bytes = read(path.join(folder, receipt.body)); assert.equal(sha112(bytes), receipt.sha256); assert.equal(bytes.length, receipt.bytes);
      assert(bytes.length <= 262144);
      if (!isSearchCacheURL112(receipt.url, preserved)) continue;
      if (preserved) {
        assert(receipt.state === 'completed' && receipt.headers && typeof receipt.headers === 'object' && !Array.isArray(receipt.headers));
        assert(Object.values(receipt.headers).every(value => typeof value === 'string'));
        assert.equal(receipt.responseURL, receipt.url); assert.equal(receipt.redirected, false);
        assert(Number.isInteger(receipt.status) && receipt.status >= 200 && receipt.status <= 599);
      }
      const entry: Cache112 = { bytes, status: receipt.status, headers: preserved ? receipt.headers : { 'content-type': 'application/json' },
        responseURL: preserved ? receipt.responseURL : receipt.url, redirected: false, metadata: preserved ? 'preserved' : 'legacy-assumedJSON',
        sourceReceipt: `${manifest}#${receipt.body}`, sha256: receipt.sha256 };
      const prior = cache.get(receipt.url);
      if (!prior || preserved || prior.metadata !== 'preserved') cache.set(receipt.url, entry);
    }
  }
  return cache;
}
export const newState112 = () => ({ starts: 0, cacheReads: 0, missingCache: 0, held: false,
  requests: [] as Record<string, unknown>[], cacheReceipts: [] as Record<string, unknown>[], failures: [] as { reason: string; url?: string }[] });
type State112 = ReturnType<typeof newState112>;
export function boundedFetch112(options: { cache: Map<string, Cache112>; live: boolean; maximum: number; state: State112;
  wire: typeof fetch; guard: () => void; saveBody: (name: string, bytes: Buffer) => void; persist: () => void }) {
  const { cache, live, maximum, state, wire, guard, saveBody, persist } = options;
  assert(Number.isSafeInteger(maximum) && maximum >= 0 && maximum <= 600 && (live || maximum === 0));
  const replay = (entry: Cache112) => new Response([204, 205, 304].includes(entry.status) ? null : entry.bytes,
    { status: entry.status, headers: entry.headers });
  return (async (input, init) => {
    const url = new URL(String(input));
    try { guard(); assert.equal(url.origin + url.pathname, root112); assert.equal(init?.method, 'GET');
      assert.equal(init?.credentials, 'omit'); assert.equal(init?.body, undefined); assert.equal(init?.redirect, 'error');
      assert.equal(init?.referrerPolicy, 'no-referrer');
    } catch (error) { state.held = true; state.failures.push({ reason: String(error), url: url.href }); throw error; }
    const cached = cache.get(url.href);
    if (cached) {
      state.cacheReads++; state.cacheReceipts.push({ url: url.href, sourceReceipt: cached.sourceReceipt, sha256: cached.sha256, metadata: cached.metadata });
      return replay(cached);
    }
    if (!live) { state.missingCache++; state.failures.push({ reason: 'CACHE_MISS_NO_NETWORK', url: url.href }); throw Error('CACHE_MISS_NO_NETWORK'); }
    if (state.starts >= maximum) { state.held = true; state.failures.push({ reason: 'PUBLIC_GET_LIMIT', url: url.href }); throw Error('PUBLIC_GET_LIMIT'); }
    const body = `response-${String(++state.starts).padStart(3, '0')}.json`, started = performance.now();
    const receipt: Record<string, unknown> = { url: url.href, body, status: 0, state: 'started', metadata: 'preserved' };
    state.requests.push(receipt); persist();
    const controller = new AbortController(), abort = () => controller.abort();
    init?.signal?.addEventListener('abort', abort, { once: true });
    if (init?.signal?.aborted) abort();
    const timer = setTimeout(abort, 12000);
    const bound = <T,>(pending: Promise<T>) => new Promise<T>((resolve, reject) => {
      const stop = () => reject(Error('PUBLIC_GET_ABORTED'));
      void pending.catch(() => undefined);
      if (controller.signal.aborted) { stop(); return; }
      controller.signal.addEventListener('abort', stop, { once: true });
      void pending.then(value => { controller.signal.removeEventListener('abort', stop); resolve(value); }, error => {
        controller.signal.removeEventListener('abort', stop); reject(error);
      });
    });
    try {
      const pending = wire(url, { ...init, signal: controller.signal });
      void pending.then(response => { if (controller.signal.aborted) void response.body?.cancel().catch(() => undefined); }, () => undefined);
      const response = await bound(pending);
      Object.assign(receipt, { status: response.status, headers: Object.fromEntries(response.headers), responseURL: response.url, redirected: response.redirected });
      assert(!response.redirected && response.url === url.href, 'PUBLIC_RESPONSE_URL');
      const reader = response.body?.getReader(); assert(reader, 'PUBLIC_RESPONSE_BODY');
      const chunks: Uint8Array[] = []; let size = 0;
      try { while (true) { const next = await bound(reader.read()); if (next.done) break;
        size += next.value.byteLength; assert(size <= 262144, 'PUBLIC_RESPONSE_BOUND'); chunks.push(next.value);
      } } finally { void reader.cancel().catch(() => undefined); try { reader.releaseLock(); } catch { /* Aborted pending read. */ } }
      assert(!controller.signal.aborted, 'PUBLIC_GET_ABORTED'); guard();
      const bytes = Buffer.concat(chunks); saveBody(body, bytes);
      Object.assign(receipt, { sha256: sha112(bytes), bytes: size, state: 'completed' });
      const entry: Cache112 = { bytes, status: response.status, headers: Object.fromEntries(response.headers), responseURL: response.url,
        redirected: response.redirected, metadata: 'preserved', sourceReceipt: body, sha256: sha112(bytes) };
      cache.set(url.href, entry);
      if (!response.ok || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
        state.held = true; state.failures.push({ reason: 'PUBLIC_HTTP_OR_CONTENT_TYPE_FAILURE', url: url.href });
      }
      return replay(entry);
    } catch (error) { receipt.error = String(error); receipt.state = 'failed'; state.held = true;
      state.failures.push({ reason: String(error), url: url.href }); throw error;
    } finally { clearTimeout(timer); init?.signal?.removeEventListener('abort', abort); controller.abort();
      receipt.elapsedMs = Math.round(performance.now() - started); persist(); }
  }) as typeof fetch;
}

type Scene112 = Reading112 & { imageId: string; status: 'complete' | 'abstained' | 'incomplete'; eligible: boolean; reason?: string;
  candidateVintage: number | null; reconstructed: ReturnType<Runtime112['suggestLocalOCRFragments108']>['alternatives'];
  queries: string[]; pages: { query: string; status: string; rows: number }[]; proposals: ReturnType<Runtime112['rankGlobalProposals104']> };
export async function predict112(readings: Map<string, Reading112>, runtime: Runtime112, client: ReturnType<Runtime112['createGlobalCatalogue103']>,
  state: State112, guard: () => void, progress: (scenes: Scene112[]) => void = () => undefined) {
  const predictions: Scene112[] = [];
  for (const [imageId, item] of [...readings.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const scene: Scene112 = { ...item, imageId, status: 'incomplete', eligible: false, candidateVintage: null, reconstructed: [], queries: [], pages: [], proposals: [] };
    try {
      guard();
      if (state.held) scene.reason = 'RUN_HELD_BEFORE_SCENE';
      else {
        const text = await parseReading112(item.reading, item.reading.requestId, runtime);
        const candidate = runtime.localSingleCandidate109(text, imageId);
        const years = runtime.wineYearRoles105(text.lines);
        if (!candidate || !years.supported) {
          scene.status = 'abstained'; scene.eligible = true;
          scene.reason = !candidate ? 'NO_USEFUL_LOCAL_TEXT' : 'UNSUPPORTED_YEAR_EVIDENCE';
        } else {
          const fragments = runtime.suggestLocalOCRFragments108(text.lines);
          const evidence = [...text.lines.map(line => line.text), ...fragments.alternatives.map(line => line.text)].slice(0, 100);
          const possible = text.lines.every(line => (line.text.match(/\b(?:19|20)\d{2}\b/g)?.length ?? 0) <= 8)
            ? years.roles.filter(role => role.role === 'vintage' || role.role === 'unclassified') : [];
          const vintage = possible.length === 1 ? possible[0].year : null;
          scene.candidateVintage = vintage; scene.reconstructed = fragments.alternatives;
          scene.queries = runtime.globalRecoveryQueries104(candidate.name, evidence);
          const rows: PublicGlobalRow103[] = [];
          for (const query of scene.queries) {
            if (state.held) break;
            const page = await client.searchProposals(query); rows.push(...page.rows);
            scene.pages.push({ query, status: page.status, rows: page.rows.length });
          }
          scene.proposals = runtime.rankGlobalProposals104(evidence, rows, vintage);
          scene.eligible = scene.pages.length === scene.queries.length && scene.pages.every(page => page.status === 'complete');
          scene.status = scene.eligible ? 'complete' : 'incomplete';
          if (!scene.eligible) scene.reason = state.held ? 'RUN_HELD_DURING_SCENE' : 'INCOMPLETE_QUERY_RESULTS';
        }
      }
    } catch (error) { scene.reason = String(error); state.failures.push({ reason: String(error) }); }
    predictions.push(scene); progress(predictions);
  }
  return predictions;
}
export function freeze112<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze112(child);
    if (!Object.isFrozen(value)) Object.freeze(value);
  }
  return value;
}
export function summarize112(scenes: { eligible: boolean; status: string; proposals: unknown[]; top1Hit?: boolean; top3Hit?: boolean }[], total: number, integrity: boolean, state: State112) {
  const evaluated = integrity ? scenes.filter(scene => scene.eligible) : [];
  const complete = integrity && scenes.length === total && scenes.every(scene => scene.eligible) && !state.failures.length;
  return { complete, evaluated: evaluated.length, recognitionProxyDenominator: evaluated.length,
    incompleteScenes: integrity ? scenes.filter(scene => !scene.eligible).length : total,
    abstentions: evaluated.filter(scene => scene.status === 'abstained').length,
    withProposals: evaluated.filter(scene => scene.proposals.length).length,
    top1Expected: evaluated.filter(scene => scene.top1Hit).length, top3Expected: evaluated.filter(scene => scene.top3Hit).length,
    listsWithoutExpected: evaluated.filter(scene => scene.proposals.length && !scene.top3Hit).length,
    exitCode: complete ? 0 : 1 };
}

export async function main112(args = process.argv.slice(2)) {
  const repo = process.cwd(), base = path.join(repo, 'qa-artifacts/night105-20261021');
  assert(args[0] && ['live', 'cache'].includes(args[1]), 'Usage: benchmark-matchrim-native112.ts OUTPUT live|cache MAX_GETS [CACHE]');
  const output = path.resolve(args[0]), live = args[1] === 'live', maximum = Number(args[2] || 0);
  assert(Number.isSafeInteger(maximum) && maximum >= 0 && maximum <= 600 && (live || maximum === 0));
  assert(output.startsWith(base + '/') && !fs.existsSync(output));
  const guard = () => {
    const { leases } = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8'));
    assertLeases112(leases, process.env);
    const disk = fs.statfsSync(base); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
  };
  guard();
  const sources = captureSources112(repo); assert.equal(sources[script112], loadedScriptSHA112, 'LOADED_BENCHMARK_SOURCE_DRIFT');
  fs.mkdirSync(output, { mode: 0o700 });
  const write = (name: string, value: unknown) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  const state = newState112(), errors: string[] = [];
  const persist = () => { write('REQUESTS.json', state.requests); write('CACHE_READS.json', state.cacheReceipts); };
  let readings = new Map<string, Reading112>(), predictions: Scene112[] = [], integrity = false;
  let runtime: Runtime112 | undefined;
  try {
    runtime = await loadRuntime112(); verifySources112(repo, sources); guard();
    readings = await loadReadings112(repo, base, runtime, sources);
    const folders = [...Object.keys(legacy112).map(folder => path.join(repo, folder)), ...(args[3] ? [path.resolve(args[3])] : [])];
    const cache = loadCache112(repo, folders);
    const fetcher = boundedFetch112({ cache, live, maximum, state, wire: globalThis.fetch, guard, persist,
      saveBody: (name, bytes) => fs.writeFileSync(path.join(output, name), bytes, { flag: 'wx', mode: 0o600 }) });
    predictions = await predict112(readings, runtime, runtime.createGlobalCatalogue103(fetcher), state, guard, scenes => {
      write('PROGRESS.json', { attempted: scenes.length, completed: scenes.filter(scene => scene.eligible).length, starts: state.starts, predictions: scenes });
    });
    guard(); verifySources112(repo, sources); integrity = true;
  } catch (error) { errors.push(String(error)); state.failures.push({ reason: String(error) }); }
  // Expected identities are loaded only after immutable retrieval decisions and source verification.
  freeze112(predictions);
  let expectedSHA256: string | null = null, expectedLoadedAfterRanking = false;
  let evaluated: (Scene112 & { top1Hit?: boolean; top3Hit?: boolean; expected?: unknown })[] = predictions;
  if (integrity && runtime) {
    try {
      const bytes = fs.readFileSync(path.join(repo, 'qa-artifacts/lovable-connection101-20261021/EXACT200-CATALOGUE-COVERAGE.json'));
      const expected = JSON.parse(bytes.toString('utf8')).rows; expectedSHA256 = sha112(bytes); expectedLoadedAfterRanking = true;
      evaluated = predictions.map(scene => {
        if (!scene.eligible) return scene;
        const truth = expected.find((row: { image_id: string }) => row.image_id === scene.imageId); assert(truth);
        const hits = scene.proposals.map(proposal => runtime!.isSafeCanonicalLabelMatch({ name: truth.expected_name, producer: truth.expected_producer },
          { name: proposal.name, producer: proposal.row.winery }));
        return { ...scene, expected: { name: truth.expected_name, producer: truth.expected_producer }, top1Hit: Boolean(hits[0]), top3Hit: hits.some(Boolean) };
      });
      guard(); verifySources112(repo, sources);
    } catch (error) { integrity = false; errors.push(String(error)); state.failures.push({ reason: String(error) }); }
  }
  const summary = { ...summarize112(evaluated, readings.size, integrity, state), actualNativeVisionImages: readings.size,
    attempted: predictions.length, publicGETStarts: state.starts, maximumPublicGETStarts: maximum, cacheReads: state.cacheReads,
    missingCache: state.missingCache, held: state.held, sourceIntegrityVerified: integrity,
    legacyAssumedJSONReads: state.cacheReceipts.filter(receipt => receipt.metadata === 'legacy-assumedJSON').length,
    nonemptyOCR: integrity ? evaluated.filter(row => row.eligible && row.reading.lines.length).length : 0,
    modelStarts: 0, imageUploads: 0, canonicalIdentitiesCreated: 0, productionWrites: 0 };
  persist();
  write('REPORT.json', { summary, mode: live ? 'live' : 'cache', observedUTC: new Date().toISOString(), expectedLoadedAfterRanking, expectedSHA256,
    sourceScriptSHA256: sources[script112], sourceFingerprints: sources, errors, failures: state.failures,
    cacheMetadataParity: summary.legacyAssumedJSONReads ? 'legacy-assumedJSON-not-metadata-parity' : 'preserved',
    scope: 'Digest-bound simulator Vision replay through production local recovery functions. Recognition proxies include only completed scenes, including valid abstentions. Not gallery E2E, physical iPhone, automatic identity precision or expert ground truth. Legacy snapshot replay assumes JSON headers explicitly.', rows: evaluated });
  console.log(JSON.stringify(summary)); return summary.exitCode;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main112().then(code => { process.exitCode = code; }, error => { console.error(error); process.exitCode = 1; });
}
