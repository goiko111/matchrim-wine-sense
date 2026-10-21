// Run: node scripts/check-matchrim-local-scan109.mjs
// Synthetic handler contracts only: no native OCR, image decoding, GUI, network or E2E.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = new URL('../', import.meta.url);
const scannerPath = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const parse = path => ts.createSourceFile(path, readFileSync(new URL(path, root), 'utf8'),
  ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const scanner = parse(scannerPath);
const compile = (source, filename) => new vm.Script(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: filename,
}).outputText, { filename });

function declarations(tree, names, container = tree) {
  const found = new Map();
  const visit = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
      && names.includes(node.name.text) && node.initializer) {
      assert(!found.has(node.name.text), `Duplicate source declaration: ${node.name.text}`);
      found.set(node.name.text, node.initializer.getText(tree));
    }
    ts.forEachChild(node, visit);
  };
  visit(container);
  return names.map(name => {
    assert(found.has(name), `Missing actual source declaration: ${name}`);
    return `const ${name} = ${found.get(name)};`;
  }).join('\n');
}

// Load only the real candidate builder and its pure year parser; never the native bridge.
const pureModules = new Map();
function loadPure(path) {
  if (pureModules.has(path)) return pureModules.get(path);
  assert(['src/utils/nativeSingleLabel109.ts', 'src/utils/wineYearRole105.ts'].includes(path));
  const exports = {};
  compile(readFileSync(new URL(path, root), 'utf8'), path).runInNewContext({ exports,
    require(name) {
      if (name === 'zod') return require('zod');
      if (path === 'src/utils/nativeSingleLabel109.ts' && name === './wineYearRole105') {
        return loadPure('src/utils/wineYearRole105.ts');
      }
      throw Error(`Unexpected runtime dependency: ${path} -> ${name}`);
    },
  }, { timeout: 1000 });
  pureModules.set(path, exports);
  return exports;
}
const { isPendingLocalIdentity109, localSingleCandidate109 } = loadPure('src/utils/nativeSingleLabel109.ts');

const handlerNames = ['updateRegion', 'startScan', 'cancelScan', 'continueScan',
  'reanalyzeSelected', 'confirmSelectedCandidate', 'editCandidate', 'confirmBatch'];
const session = scanner.statements.find(node => ts.isVariableStatement(node)
  && node.declarationList.declarations.some(decl => decl.name.getText(scanner) === 'MultiWineLabelScannerSession'));
assert(session, 'Actual scanner session must exist');
const handlerCode = compile(`${declarations(scanner, handlerNames, session)}
  globalThis.handlers = { ${handlerNames.join(', ')} };`, scannerPath);

// Extract real pure identity/grouping and quality/preflight helpers, not rewritten guards.
const identityNames = ['getSelectedCandidate', 'normalizeIdentity', 'buildCanonicalWineKey',
  'identityTokens', 'producerStopWords', 'genericWineNameTokens', 'hasUnresolvedProducerGeographyConflict',
  'hasWineIdentityConflict', 'areLikelyDuplicateWines', 'groupDuplicateWines', 'getConfirmableWineGroups',
  'confirmWineCandidateIdentity', 'correctWineCandidateIdentity', 'summarizeScanRegions',
  'fullDetectionTile', 'getFullWineDetectionTile'];
const qualityNames = ['shouldRejectTextAnalysis', 'NATIVE_IMAGE_PREPARATION_LIMITS'];
const policyNames = ['regionPreflight', 'deferRegion'];
const helperCode = compile([
  declarations(parse('src/utils/multiWineScan.ts'), identityNames),
  declarations(parse('src/utils/imageAnalysis.ts'), qualityNames),
  declarations(parse('src/utils/imageCropGeometry.ts'), ['getCropGeometry']),
  declarations(parse('src/utils/scanAnalysisPolicy.ts'), policyNames),
  `globalThis.helpers = { ${[...identityNames, ...qualityNames, ...policyNames].join(', ')} };`,
].join('\n'), 'local-scan109-pure-extracts.ts');

const placeholder = 'Etiqueta por identificar';
const file = Object.freeze({ name: 'synthetic-local109.jpg', type: 'image/jpeg', size: 109 });
const line = (text, y = .1) => ({ text, confidence: .95, box: { x: .1, y, width: .6, height: .03 } });
const reading = (lines = [line('  SYNTHETIC Z109  '), line('Cosecha 2020', .4),
  line('Gold Medal 2026', .7), line('  SYNTHETIC Z109  ', .9)], requestId = '00000000-0000-4000-8000-000000010901') => ({
  source: 'apple-vision-device', requestId, width: 1200, height: 1800, totalMs: 10,
  revision: 3, customWords: [], lines,
});
const clone = value => structuredClone(value);
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const until = async predicate => {
  for (let i = 0; i < 40; i++) { if (predicate()) return; await Promise.resolve(); }
  assert.fail('Synthetic stage was not reached');
};
const hosts = [];

function host(options = {}) {
  const state = { localBatch: false, localReading: null, preview: null, quality: null,
    scanProfile: null, regions: [], coverage: null, selectedRegionId: null, phase: 'idle',
    analysisProgress: 0, analysisConcurrency: 0, scanMetrics: null, errorMessage: null,
    confirmed: false, saving: false, batchLocked: false, saveResults: [], nativeResultView: 'scene' };
  const refs = { savingRef: { current: false }, saveLifetime: { current: { active: true, generation: 0 } },
    batchRef: { current: null }, abortRef: { current: null }, continuationRef: { current: null },
    lastFileRef: { current: null }, preparedSizeRef: { current: null }, scanProfileRef: { current: null } };
  const calls = { prepare: [], profile: [], ocr: [], budgets: [], reserves: [], edge: [],
    forbidden: [], writes: [], errors: [], toasts: [], groups: [], saves: [], events: [] };
  const forbidden = name => (...args) => {
    calls.forbidden.push({ name, args });
    throw Error(`FORBIDDEN_SYNTHETIC_CALL:${name}`);
  };
  const prepared = freeze({ dataUrl: 'data:image/jpeg;base64,U1lOVEhFVElDMTA5', width: 1200, height: 1800,
    quality: { width: 1200, height: 1800, megapixels: 2.16, brightness: 128, contrast: 42, sharpness: 60,
      ...(options.rejectQuality ? { width: 320, height: 480, sharpness: 2 } : {}) } });
  const profile = freeze({ profile: { potencia: 3, acidez: 2 }, ownerId: 'synthetic-owner109' });
  const scope = { ...refs, Error, DOMException, AbortController, performance,
    isNative: options.isNative ?? true, scanMode: options.scanMode ?? 'local-single',
    user: { id: 'synthetic-owner109' }, isMatchrimFixtureQaEnabled: false,
    navigator: { onLine: true }, exports: {},
    console: { error: (...args) => calls.errors.push(args), warn: (...args) => calls.errors.push(args) },
    toast: { error: message => calls.toasts.push(message), success: message => calls.toasts.push(message) },
    localSingleCandidate109,
    isPendingLocalIdentity109,
    prepareImageForAnalysis: async (...args) => {
      calls.prepare.push(args); return options.prepare ? options.prepare(...args) : prepared;
    },
    loadMatchrimScanProfile: async (...args) => {
      calls.profile.push(args); return options.profile ? options.profile(...args) : profile;
    },
    readLocalWineText106: async (...args) => {
      calls.ocr.push(args); return options.ocr ? options.ocr(...args) : reading();
    },
    createScanRequestBudget: (...args) => {
      calls.budgets.push(args);
      let used = 0;
      return { get used() { return used; }, get remaining() { return 24 - used; },
        reserve(signal) {
          calls.reserves.push(signal);
          if (!options.cloudSentinel) return forbidden('budget.reserve')(signal);
          used++;
        } };
    },
    invokeWithEdgeFunctionRetry: async work => work(),
    invokeEdgeFunction: async (...args) => {
      calls.edge.push(args);
      if (options.cloudSentinel) throw Error('SYNTHETIC_CLOUD_DETECTOR109');
      return forbidden('invokeEdgeFunction')(...args);
    },
    userFacingScanError: error => error.message,
    trackAppEvent: (...args) => calls.events.push(args),
    nativeMasterAudit102: () => null,
    isGlobalWine103: () => false,
    saveLabelBatch: async (...args) => {
      calls.saves.push(args);
      if (!options.allowSyntheticSave) return forbidden('saveLabelBatch')(...args);
      return 'partial';
    },
    onExtractComplete: forbidden('onExtractComplete'),
    MAX_MANUAL_REGION_REQUESTS: 4,
  };
  for (const name of ['analyzeRegion', 'enrichCandidate', 'findWinerimWineForLabel',
    'lookupNativeMaster102', 'applyNativeMaster102', 'lookupGlobalCatalogue103', 'applyGlobalCatalogue103',
    'applyScanWineEvidence', 'catalogWineFromVerifiedSheet', 'planAdditionalRegionAnalysis',
    'planRegionAnalysis', 'normalizeDetectedRegions', 'normalizeScanCoverage', 'cropImageRegion',
    'cropImageRegionWithQuality', 'getRegionAnalysisConcurrency', 'mapWithConcurrency',
    'makeCellarCatalogEvidence', 'makeCellarPublicReference107', 'withCellarInitialAffinity',
    'recordOwnedScanHistory', 'fetch', 'XMLHttpRequest', 'WebSocket',
    'hasWinerimGeographyConflict']) scope[name] = forbidden(name);
  for (const key of Object.keys(state)) {
    Object.defineProperty(scope, key, { get: () => state[key], configurable: true });
    scope[`set${key[0].toUpperCase()}${key.slice(1)}`] = value => {
      state[key] = typeof value === 'function' ? value(state[key]) : value;
      calls.writes.push(key);
    };
  }
  const context = vm.createContext(scope);
  const helperScope = { hasWinerimGeographyConflict: forbidden('hasWinerimGeographyConflict') };
  helperCode.runInNewContext(helperScope, { timeout: 1000 });
  Object.assign(scope, helperScope.helpers);
  const realGroups = scope.getConfirmableWineGroups;
  scope.getConfirmableWineGroups = regions => {
    const groups = realGroups(regions); calls.groups.push(clone(groups)); return groups;
  };
  Object.defineProperties(scope, {
    loading: { get: () => ['quality', 'profile', 'detecting', 'analyzing'].includes(state.phase) },
    selectedRegion: { get: () => state.regions.find(region => region.id === state.selectedRegionId) ?? null },
    selectedCandidate: { get: () => scope.selectedRegion ? scope.getSelectedCandidate(scope.selectedRegion) : null },
    summary: { get: () => scope.summarizeScanRegions(state.regions) },
  });
  handlerCode.runInContext(context, { timeout: 1000 });
  const result = { ...scope.handlers, state, refs, calls, scope, prepared, profile,
    candidate: () => scope.selectedCandidate };
  hosts.push({ ...result, cloudSentinel: Boolean(options.cloudSentinel) });
  return result;
}

function assertPlaceholder(candidate, raw) {
  assert(candidate);
  assert.equal(candidate.name, placeholder);
  assert.equal(candidate.confidence, 0);
  assert.equal(candidate.source, 'label');
  assert.deepEqual(clone(candidate.evidence), raw.lines.map(value => value.text));
  for (const key of ['producer', 'region', 'country', 'alcohol', 'canonicalId', 'masterRecord',
    'globalRecord', 'originalSheet', 'sensorySource', 'sensoryAttributes', 'affinity', 'affinityConfidence', 'affinityReason']) {
    assert.equal(candidate[key], null, key);
  }
  assert.deepEqual(clone(candidate.grapes), []);
}

let groups = 0;
const failures = [];
async function test(name, work) {
  const firstHost = hosts.length;
  try {
    await work();
    for (const h of hosts.slice(firstHost)) {
      assert.deepEqual(h.calls.forbidden, [], 'No forbidden cloud/enrichment/network/save calls');
      if (!h.cloudSentinel) {
        assert.equal(h.calls.edge.length, 0, 'No edge functions, including detect/analyze');
        assert.equal(h.calls.reserves.length, 0, 'No budget.reserve');
      }
    }
    groups++;
    console.log('PASS', name);
  } catch (error) {
    failures.push({ name, error: String(error) });
    console.error('FAIL', name, '\n', error.stack);
  }
}

await test('Explicit native local-single creates one user-indicated full region, not detected bottles', async () => {
  const raw = freeze(reading()), before = clone(raw);
  const h = host({ ocr: async () => raw });
  await h.startScan(file);
  assert.equal(h.state.phase, 'ready');
  assert.equal(h.state.localBatch, true);
  assert.equal(h.state.regions.length, 1);
  const region = h.state.regions[0];
  assert.equal(region.id, `local-single-${raw.requestId}`);
  assert.equal(region.index, 1);
  assert.deepEqual(clone(region.box), { x: 0, y: 0, width: 100, height: 100 });
  assert.equal(region.objectType, 'label');
  assert.equal(region.detectionConfidence, 0);
  assert.equal(region.duplicateCount, 1);
  assert.equal(region.status, 'uncertain');
  assert.equal(region.candidates.length, 1);
  assert.equal(region.selectedCandidateId, h.candidate().id);
  assert.equal(region.cropDataUrl, h.prepared.dataUrl);
  assert.equal(h.state.selectedRegionId, region.id);
  assertPlaceholder(h.candidate(), raw);
  assert.equal(h.candidate().vintage, 2020);
  assert.equal(h.state.coverage.status, 'unknown');
  assert.equal(h.state.coverage.detectedObjects, 0);
  assert.equal(h.state.coverage.estimatedVisibleObjects, null);
  assert.equal(h.state.coverage.confidence, null);
  assert.match(h.state.coverage.notes.join(' '), /indicada por ti/);
  assert.equal(h.state.localReading.value, raw);
  assert.deepEqual(raw, before);
  assert.equal(h.state.analysisProgress, 100);
  for (const key of ['detectionMs', 'detectionCalls', 'edgeRequests', 'retries', 'deferred']) {
    assert.equal(h.state.scanMetrics[key], 0, key);
  }
  assert.equal(h.state.scanMetrics.detectionRefined, false);
  assert.equal(h.calls.prepare.length, 1);
  assert.equal(h.calls.prepare[0][0], file);
  assert.equal(h.calls.prepare[0][1], 2400);
  assert.equal(h.calls.prepare[0][3], h.scope.NATIVE_IMAGE_PREPARATION_LIMITS);
  const signal = h.refs.abortRef.current.signal;
  assert.equal(h.calls.prepare[0][2], signal);
  assert.equal(h.calls.profile.length, 1);
  assert.deepEqual(h.calls.profile[0], ['synthetic-owner109', signal]);
  assert.deepEqual(h.calls.ocr, [[h.prepared.dataUrl, signal]]);
  assert.equal(h.state.scanProfile, h.profile);
  assert.equal(h.refs.scanProfileRef.current, h.profile);
});

await test('Empty or punctuation-only local OCR is unrecognized, not a guessed identity', async () => {
  for (const lines of [[], [line('... ---')]]) {
    const raw = reading(lines), h = host({ ocr: async () => raw });
    await h.startScan(file);
    assert.equal(h.state.phase, 'ready');
    assert.equal(h.state.regions[0].status, 'unrecognized');
    assert.equal(h.state.regions[0].candidates.length, 0);
    assert.equal(h.state.regions[0].selectedCandidateId, null);
    assert.equal(h.state.regions[0].fallback.code, 'insufficient_visible_text');
    assert.equal(h.state.localReading.value, raw);
    assert.equal(h.state.coverage.detectedObjects, 0);
    await h.confirmBatch();
    assert.equal(h.calls.saves.length, 0);
  }
});

await test('Prepared quality rejection exits before profile, OCR and cloud', async () => {
  const h = host({ rejectQuality: true });
  await h.startScan(file);
  assert.equal(h.state.phase, 'error');
  assert.match(h.state.errorMessage, /demasiado/);
  assert.equal(h.state.preview, h.prepared.dataUrl);
  assert.equal(h.state.regions.length, 0);
  assert.equal(h.calls.profile.length, 0);
  assert.equal(h.calls.ocr.length, 0);
});

await test('Local OCR error, preparation error and profile error never fall back to cloud', async () => {
  for (const stage of ['prepare', 'profile', 'ocr']) {
    const h = host({ [stage]: async () => { throw Error(`synthetic-${stage}-failure`); } });
    await h.startScan(file);
    assert.equal(h.state.phase, 'error', stage);
    assert.match(h.state.errorMessage, /La foto no se ha enviado/, stage);
    assert.equal(h.state.regions.length, 0);
    assert.equal(h.state.localReading, null);
    assert.equal(h.calls.ocr.length, stage === 'ocr' ? 1 : 0);
  }
});

await test('Cancellation suppresses late success/error at preparation, profile and OCR boundaries', async () => {
  for (const stage of ['prepare', 'profile', 'ocr']) for (const outcome of ['resolve', 'reject']) {
    const gate = deferred(), h = host({ [stage]: () => gate.promise });
    const work = h.startScan(file);
    await until(() => h.calls[stage].length === 1);
    const controller = h.refs.abortRef.current;
    h.cancelScan();
    assert.equal(controller.signal.aborted, true);
    assert.equal(h.state.phase, 'cancelled');
    const writes = h.calls.writes.length;
    if (outcome === 'reject') gate.reject(new DOMException('Synthetic cancellation', 'AbortError'));
    else gate.resolve(stage === 'prepare' ? h.prepared : stage === 'profile' ? h.profile : reading());
    await work;
    assert.equal(h.calls.writes.length, writes, `${stage}/${outcome}`);
    assert.equal(h.state.phase, 'cancelled');
    assert.equal(h.state.localReading, null);
    assert.equal(h.state.regions.length, 0);
  }
});

await test('New actual scan aborts the old controller; ignored abort cannot publish over its successor', async () => {
  for (const outcome of ['resolve', 'reject']) {
    const gate = deferred(); let reads = 0;
    const current = reading([line('SYNTHETIC NEW SCAN')], '00000000-0000-4000-8000-000000010902');
    const h = host({ ocr: () => ++reads === 1 ? gate.promise : Promise.resolve(current) });
    const oldWork = h.startScan(file);
    await until(() => h.calls.ocr.length === 1);
    const oldController = h.refs.abortRef.current;
    await h.startScan({ ...file, name: 'synthetic-successor109.jpg' });
    assert.equal(oldController.signal.aborted, true);
    assert.notEqual(h.refs.abortRef.current, oldController);
    const before = clone(h.state), writes = h.calls.writes.length;
    if (outcome === 'reject') gate.reject(Error('synthetic-obsolete-error'));
    else gate.resolve(reading());
    await oldWork;
    assert.deepEqual(clone(h.state), before);
    assert.equal(h.calls.writes.length, writes);
    assert.equal(h.state.localReading.value, current);
  }
});

await test('Controller identity alone suppresses obsolete scan OCR success and rejection', async () => {
  for (const outcome of ['resolve', 'reject']) {
    const gate = deferred(), h = host({ ocr: () => gate.promise });
    const work = h.startScan(file);
    await until(() => h.calls.ocr.length === 1);
    const oldController = h.refs.abortRef.current;
    h.refs.abortRef.current = new AbortController();
    assert.equal(oldController.signal.aborted, false);
    const writes = h.calls.writes.length;
    if (outcome === 'reject') gate.reject(Error('synthetic-stale-error'));
    else gate.resolve(reading());
    await work;
    assert.equal(h.calls.writes.length, writes);
    assert.equal(h.state.localReading, null);
  }
});

await test('Local reanalysis uses the selected crop, actual candidate helper and no cloud even after mode changes', async () => {
  const fresh = freeze(reading([line('  FRESH SYNTHETIC Z109  ')])); let count = 0;
  const h = host({ ocr: async () => ++count === 1 ? reading() : fresh });
  await h.startScan(file);
  h.scope.scanMode = 'cloud';
  h.state.regions[0].cropDataUrl = 'data:image/jpeg;base64,U1lOVEhFVElDLUNST1A=';
  h.state.regions[0].error = 'obsolete-error';
  const budgets = h.calls.budgets.length;
  await h.reanalyzeSelected();
  assert.equal(h.state.phase, 'ready');
  assert.equal(h.calls.ocr.length, 2);
  assert.equal(h.calls.ocr[1][0], h.state.regions[0].cropDataUrl);
  assert.equal(h.calls.ocr[1][1], h.refs.abortRef.current.signal);
  assert.equal(h.calls.budgets.length, budgets);
  assertPlaceholder(h.candidate(), fresh);
  assert.equal(h.candidate().vintage, null);
  assert.equal(h.state.regions[0].status, 'uncertain');
  assert.equal(h.state.regions[0].error, null);
  assert.equal(h.state.localReading.value, fresh);
});

await test('Empty local reanalysis clears the candidate; OCR failure has no cloud fallback', async () => {
  for (const outcome of ['empty', 'error']) {
    let count = 0;
    const h = host({ ocr: async () => {
      if (++count === 1) return reading();
      if (outcome === 'error') throw Error('synthetic-local-reanalysis-failure');
      return reading([]);
    } });
    await h.startScan(file);
    h.state.regions[0].cropDataUrl = null;
    await h.reanalyzeSelected();
    assert.equal(h.calls.ocr[1][0], h.state.preview);
    if (outcome === 'empty') {
      assert.equal(h.state.phase, 'ready');
      assert.equal(h.state.regions[0].status, 'unrecognized');
      assert.equal(h.candidate(), null);
      assert.equal(h.state.regions[0].fallback.code, 'insufficient_visible_text');
    } else {
      assert.equal(h.state.phase, 'error');
      assert.match(h.state.errorMessage, /La foto no se ha enviado/);
      assert.equal(h.candidate().name, placeholder);
    }
  }
});

await test('Cancelled local reanalysis ignores both late success and late non-abort errors', async () => {
  for (const outcome of ['resolve', 'reject']) {
    const gate = deferred(); let count = 0;
    const h = host({ ocr: () => ++count === 1 ? Promise.resolve(reading()) : gate.promise });
    await h.startScan(file);
    const work = h.reanalyzeSelected();
    await until(() => h.calls.ocr.length === 2);
    h.cancelScan();
    const before = clone(h.state), writes = h.calls.writes.length;
    if (outcome === 'reject') gate.reject(Error('synthetic-late-reanalysis-error'));
    else gate.resolve(reading([line('SYNTHETIC OBSOLETE REANALYSIS')]));
    await work;
    assert.deepEqual(clone(h.state), before);
    assert.equal(h.calls.writes.length, writes);
  }
});

for (const outcome of ['resolve', 'reject']) {
  await test(`Stale local reanalysis ${outcome} cannot publish after a controller-only replacement`, async () => {
    const gate = deferred(); let count = 0;
    const h = host({ ocr: () => ++count === 1 ? Promise.resolve(reading()) : gate.promise });
    await h.startScan(file);
    const work = h.reanalyzeSelected();
    await until(() => h.calls.ocr.length === 2);
    const oldController = h.refs.abortRef.current;
    h.refs.abortRef.current = new AbortController();
    h.state.phase = 'ready';
    assert.equal(oldController.signal.aborted, false);
    const before = clone(h.state), writes = h.calls.writes.length;
    if (outcome === 'reject') gate.reject(Error('synthetic-obsolete-reanalysis-error'));
    else gate.resolve(reading([line('SYNTHETIC OBSOLETE REANALYSIS')]));
    await work;
    assert.equal(h.calls.writes.length, writes, 'Obsolete reanalysis must not publish errors or phase');
    assert.deepEqual(clone(h.state), before);
  });
}

await test('Local continuation guard exits even with a pending region and otherwise eligible host', async () => {
  const h = host(); await h.startScan(file);
  h.state.regions[0].status = 'pending';
  assert.equal(h.scope.loading, false);
  assert(h.state.preview && h.refs.preparedSizeRef.current);
  assert.equal(h.refs.batchRef.current, null);
  assert.equal(h.refs.savingRef.current, false);
  assert.equal(h.refs.continuationRef.current, null);
  const before = clone(h.state), writes = h.calls.writes.length, budgets = h.calls.budgets.length;
  await h.continueScan();
  assert.deepEqual(clone(h.state), before);
  assert.equal(h.calls.writes.length, writes);
  assert.equal(h.calls.budgets.length, budgets);
  assert.equal(h.refs.continuationRef.current, null);
});

await test('Web local-single preference and explicit native/web cloud mode reach only a synthetic detector sentinel', async () => {
  for (const [isNative, scanMode] of [[false, 'local-single'], [true, 'cloud'], [false, 'cloud']]) {
    const h = host({ isNative, scanMode, cloudSentinel: true });
    await h.startScan(file);
    assert.equal(h.state.localBatch, false);
    assert.equal(h.calls.ocr.length, 0);
    assert.equal(h.calls.edge.length, 1);
    assert.equal(h.calls.edge[0][0], 'detect-wine-regions');
    assert.equal(h.calls.edge[0][1].image, h.prepared.dataUrl);
    assert.equal(h.calls.edge[0][2], h.refs.abortRef.current.signal);
    assert.equal(h.calls.reserves.length, 1);
    assert.equal(h.state.phase, 'error');
    assert.equal(h.state.errorMessage, 'SYNTHETIC_CLOUD_DETECTOR109');
    assert.equal(h.calls.prepare[0][3], isNative ? h.scope.NATIVE_IMAGE_PREPARATION_LIMITS : undefined);
  }
});

await test('Actual confirm/edit/batch guards reject a placeholder, including producer-only edits and recognized-state injection', async () => {
  const h = host(); await h.startScan(file);
  h.confirmSelectedCandidate();
  assert.equal(h.state.regions[0].status, 'uncertain');
  assert.equal(h.candidate().confidence, 0);
  assert.match(h.calls.toasts.at(-1), /nombre del vino/);
  await h.confirmBatch();
  h.editCandidate({ producer: 'Synthetic Producer Z109' });
  assert.equal(h.candidate().producer, 'Synthetic Producer Z109');
  assert.equal(h.candidate().name, placeholder);
  assert.equal(h.state.regions[0].status, 'uncertain');
  h.confirmSelectedCandidate();
  assert.equal(h.state.regions[0].status, 'uncertain');
  await h.confirmBatch();
  // Bypass the status gate to exercise confirmBatch's own placeholder filter.
  h.state.regions[0].status = 'recognized';
  await h.confirmBatch();
  assert.equal(h.calls.groups.at(-1).length, 1);
  assert.equal(h.calls.groups.at(-1)[0].candidate.name, placeholder);
  assert.equal(h.calls.saves.length, 0);
  assert.equal(h.refs.batchRef.current, null);
  assert.equal(h.state.confirmed, false);
  assert.equal(h.state.batchLocked, false);
});

await test('Whitespace, case, blank and compatibility-character edits cannot turn a placeholder into a savable wine', async () => {
  for (const name of [placeholder + ' ', ' ETIQUETA POR IDENTIFICAR ', 'Etiqueta\npor identificar', '', 'Ｅtiqueta por identificar']) {
    const h = host({ allowSyntheticSave: true }); await h.startScan(file);
    h.editCandidate({ name }); assert.equal(h.state.regions[0].status, 'uncertain');
    h.confirmSelectedCandidate(); assert.equal(h.state.regions[0].status, 'uncertain');
    h.state.regions[0].status = 'recognized'; await h.confirmBatch();
    assert.equal(h.calls.saves.length, 0); assert.equal(h.refs.batchRef.current, null);
  }
});

await test('Positive control: explicit name edit can reach the synthetic save transport without canonical or affinity enrichment', async () => {
  const h = host({ allowSyntheticSave: true }); await h.startScan(file);
  h.editCandidate({ name: 'Synthetic User Named Wine Z109' });
  assert.equal(h.state.regions[0].status, 'recognized');
  h.confirmSelectedCandidate();
  assert.equal(h.candidate().source, 'manual');
  await h.confirmBatch();
  assert.equal(h.calls.saves.length, 1);
  const batch = h.calls.saves[0][0];
  assert.equal(batch.wines.length, 1);
  assert.equal(batch.wines[0].nombre, 'Synthetic User Named Wine Z109');
  assert.equal(batch.wines[0].matchrim_affinity, null);
  assert.equal(batch.wines[0].sensory_attributes, null);
  assert.equal(batch.wines[0].affinity_details, null);
});

console.log(JSON.stringify({ passed: groups, failed: failures.length, failures,
  scope: 'Actual TS AST/VM handlers and actual localSingleCandidate109; injected state/refs, prepared image/profile and synthetic OCR/transport. Not native OCR or E2E.',
  dependencies: ['Node.js 20+', 'typescript', 'zod'], externalAPIs: 'none', liveCalls: 0,
  gui: false, build: false, extractedHandlers: handlerNames }));
if (failures.length) process.exitCode = 1;
