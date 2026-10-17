import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { NATIVE_IMAGE_PREPARATION_LIMITS } from '../src/utils/imageAnalysis';
import { parseFoodScanResponse } from '../src/utils/foodScanResponse';
import { runNativeFoodRead95 } from '../src/utils/foodScanRecovery95';
import {
  FOOD_MENU_TILE_LIMIT, FOOD_MENU_SCAN_TIMEOUT_MS, planFoodMenuTiles89,
  parseFoodMenuTile89, mergeFoodMenuTiles89, scanFoodMenu89, type FoodMenuTile, type FoodMenuBox,
} from '../src/utils/foodMenuScan89';
import { getCropGeometry } from '../src/utils/imageCropGeometry';
import { MAX_MENU_TILE_DISHES, parseFoodMenuRegionContext } from '../supabase/functions/scan-food-pairing/contract';

const tiles = planFoodMenuTiles89(1000, 800);
const dish = (nombre: string, source_box: FoodMenuBox | null = { x: 5, y: 10, width: 30, height: 4 }) => ({
  nombre, source_text: nombre, source_box, region_id: 'section', source_order: 1,
  categoria: null, match: null, razon: '', recomendaciones: [],
});
const payload = (tile: FoodMenuTile, dishes = [dish('Gambas')]) => ({
  mode: 'menu', summary: 'Model summary', has_profile: false, profile_source: 'none', dishes,
  scan_region: { id: tile.id, box: tile.box, tile_count: tile.tile_count, max_dishes: 30, coordinate_space: 'crop_percent' },
  coverage: { model_counts_reported: true, estimated_visible_dishes: dishes.length,
    unreadable_dishes: 0, truncated: false, partial: false },
});
const outcome = (tile: FoodMenuTile, value: unknown) => ({ ok: true as const, read: parseFoodMenuTile89(value, tile) });
const inverse = (original: FoodMenuBox, tile: FoodMenuTile): FoodMenuBox => ({
  x: (original.x - tile.box.x) / tile.box.width * 100,
  y: (original.y - tile.box.y) / tile.box.height * 100,
  width: original.width / tile.box.width * 100, height: original.height / tile.box.height * 100,
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

test('bounded real crop geometries cover the image with overlap, including odd pixel dimensions', () => {
  for (const [width, height] of [[1000, 800], [333, 221], [2400, 3199]]) {
    const planned = planFoodMenuTiles89(width, height);
    assert.equal(planned.length, width / height >= 1.3 ? 3 : 2);
    const vertical = height > width;
    assert.deepEqual(planned.map((tile) => tile.id), vertical ? ['top', 'bottom'] : width / height >= 1.3 ? ['left', 'right', 'center'] : ['left', 'right']);
    const origin = vertical ? 'y' : 'x', extent = vertical ? 'height' : 'width';
    assert.equal(planned[0].box[origin], 0);
    assert.ok(Math.abs(planned[1].box[origin] + planned[1].box[extent] - 100) < 0.000001);
    assert.ok(planned[0].box[extent] > planned[1].box[origin]);
    assert.ok(planned.every((tile) => vertical ? tile.box.width === 100 : tile.box.height === 100));
    for (const tile of planned) {
      assert.deepEqual(tile.box, getCropGeometry(width, height, tile.crop_box, 0).sourceBox);
      assert.ok(parseFoodMenuRegionContext(payload(tile).scan_region));
    }
  }
  assert.equal(FOOD_MENU_TILE_LIMIT, MAX_MENU_TILE_DISHES);
  assert.equal(FOOD_MENU_SCAN_TIMEOUT_MS, 90_000);
});

test('wide three-panel photos retain a complete central view within three concurrent requests', async () => {
  const planned = planFoodMenuTiles89(1920, 1440);
  const center = planned.find((tile) => tile.id === 'center')!;
  assert.ok(center.box.x <= 40 && center.box.x + center.box.width >= 65);
  const pending = deferred<void>(), started = deferred<void>();
  let requests = 0, active = 0, peak = 0;
  const scan = scanFoodMenu89({ image: 'wide', width: 1920, height: 1440,
    signal: new AbortController().signal, crop: async () => 'crop', invoke: async (body) => {
      requests += 1; active += 1; peak = Math.max(peak, active);
      if (requests === 3) started.resolve();
      await pending.promise; active -= 1;
      const tile = planned.find((tile) => tile.id === (body.scan_region as {id: string}).id)!;
      return payload(tile, [dish(tile.id)]);
    } });
  await started.promise;
  assert.equal(requests, 3); assert.equal(peak, 3);
  pending.resolve();
  const result = await scan;
  assert.equal(result.dishes.length, 3);
  assert.equal(result.coverage.partial, true);
});

test('portrait uses full-width top/bottom crops and maps rows back to original y coordinates', async () => {
  const portraitTiles = planFoodMenuTiles89(800, 1000);
  const seen: FoodMenuBox[] = [];
  const result = await scanFoodMenu89({ image: 'portrait', width: 800, height: 1000,
    signal: new AbortController().signal, crop: async (_image, cropBox) => { seen.push(cropBox); return 'crop'; },
    invoke: async (body) => {
      const tile = portraitTiles.find((tile) => tile.id === (body.scan_region as { id: string }).id)!;
      return payload(tile, [dish('Full-width name', { x: 5, y: 10, width: 90, height: 4 })]);
    } });
  assert.deepEqual(seen, portraitTiles.map((tile) => tile.crop_box));
  result.dishes.forEach((row, index) => {
    assert.equal(row.source_box?.x, 5); assert.equal(row.source_box?.width, 90);
    assert.ok(Math.abs(row.source_box!.y - [5.6, 49.6][index]) < 0.000001);
  });
});

test('dual-column rows are mapped to original coordinates and same names stay distinct', () => {
  const result = mergeFoodMenuTiles89(tiles.map((tile) => outcome(tile, payload(tile))));
  assert.equal(result.dishes.length, 2);
  result.dishes.forEach((row, index) => assert.ok(Math.abs(row.source_box!.x - [2.8, 46.8][index]) < 0.000001));
  assert.equal(result.coverage.duplicate_rows, 0);
  assert.equal(result.coverage.coordinate_space, 'original_percent');
  assert.equal(result.coverage.estimated_visible_dishes, null, 'overlapping counts cannot be added');
  assert.equal(result.coverage.unreadable_dishes, null);
  assert.equal(result.coverage.partial, true);
});

test('overlap duplicates merge only with literal agreement and physical box overlap', () => {
  const original = { x: 46, y: 10, width: 8, height: 4 };
  const result = mergeFoodMenuTiles89(tiles.map((tile) => outcome(tile,
    payload(tile, [dish('Gambas', inverse(original, tile))]))));
  assert.equal(result.dishes.length, 1);
  assert.deepEqual(result.dishes[0].source_box, original);
  assert.deepEqual(result.dishes[0].source_tile_ids, ['left', 'right']);
  assert.equal(result.coverage.duplicate_rows, 1);
});

test('same names on separate physical rows or conflicting source text are not deduplicated', () => {
  const original = { x: 46, y: 10, width: 8, height: 4 };
  for (const other of [
    dish('Gambas', inverse({ ...original, y: 20 }, tiles[1])),
    { ...dish('Gambas', inverse(original, tiles[1])), source_text: 'Gambas grandes' },
  ]) {
    const result = mergeFoodMenuTiles89([outcome(tiles[0], payload(tiles[0], [dish('Gambas', inverse(original, tiles[0]))])),
      outcome(tiles[1], payload(tiles[1], [other]))]);
    assert.equal(result.dishes.length, 2);
  }
});

test('legacy/fallback coverage and geometry are not promoted to contextual evidence', () => {
  const raw = payload(tiles[0]);
  const noContext: Record<string, unknown> = { ...raw };
  delete noContext.scan_region;
  const legacy = parseFoodMenuTile89(noContext, tiles[0]);
  assert.equal(legacy.dishes[0].source_box, null);
  assert.equal(legacy.coverage.estimated_visible_dishes, null);
  assert.equal(legacy.coverage.unreadable_dishes, null);
  const fallback = parseFoodMenuTile89({ ...raw, coverage: { ...raw.coverage, model_counts_reported: false } }, tiles[0]);
  assert.equal(fallback.coverage.estimated_visible_dishes, null);
  assert.equal(fallback.coverage.partial, true);
});

test('invalid schema, mismatched context and invalid boxes reject the whole tile', () => {
  const valid = payload(tiles[0]);
  for (const invalid of [null, {}, { ...valid, dishes: [{}] }, { ...valid, mode: 'dish' },
    { ...valid, scan_region: { ...valid.scan_region, id: 'right' } },
    { ...valid, dishes: [dish('Bad', { x: 99, y: 0, width: 20, height: 5 })] },
    { ...valid, coverage: { ...valid.coverage, partial: 'false' } }]) {
    assert.throws(() => parseFoodMenuTile89(invalid, tiles[0]));
  }
});

test('each tile is capped at 30, with partial coverage rather than invented missing rows', () => {
  const parsed = parseFoodMenuTile89(payload(tiles[0], Array.from({ length: 31 }, (_, i) => dish(`Row ${i}`))), tiles[0]);
  assert.equal(parsed.dishes.length, 30);
  assert.equal(parsed.coverage.partial, true);
  assert.equal(parsed.coverage.estimated_visible_dishes, 31);
});

test('orchestration sends exactly two cropped requests with maximum concurrency two and no full-scene call', async () => {
  let active = 0, peak = 0;
  const pending = deferred<unknown>();
  const started = deferred<void>();
  const bodies: Record<string, unknown>[] = [];
  const cropBoxes: FoodMenuBox[] = [];
  const resultPromise = scanFoodMenu89({ image: 'original', width: 1000, height: 800, signal: new AbortController().signal,
    context: { restaurantName: 'fixture' }, crop: async (_image, cropBox, padding, _size, signal) => {
      assert.equal(padding, 0); assert.ok(signal); cropBoxes.push(cropBox); return `crop:${cropBox.x}`;
    }, invoke: async (body, signal) => {
      assert.ok(signal); bodies.push(body); active += 1; peak = Math.max(peak, active);
      if (bodies.length === 2) started.resolve();
      await pending.promise; active -= 1;
      return payload(tiles[body.scan_region && (body.scan_region as { id: string }).id === 'left' ? 0 : 1]);
    } });
  await started.promise;
  assert.equal(peak, 2); assert.equal(bodies.length, 2);
  pending.resolve(null);
  const result = await resultPromise;
  assert.equal(result.dishes.length, 2);
  assert.deepEqual(cropBoxes, tiles.map((tile) => tile.crop_box));
  assert.ok(bodies.every((body) => body.image !== 'original' && body.mode === 'menu'
    && (body.scan_region as { max_dishes: number }).max_dishes === 30));
});

for (const failure of ['http', 'schema', 'crop']) {
  test(`one ${failure} tile failure retains the other tile as partial, without retries`, async () => {
    let requests = 0;
    const result = await scanFoodMenu89({ image: 'original', width: 1000, height: 800, signal: new AbortController().signal,
      crop: async (_image, cropBox) => { if (failure === 'crop' && cropBox.x === 0) throw new Error('crop'); return 'cropped'; },
      invoke: async (body) => {
        requests += 1;
        if ((body.scan_region as { id: string }).id === 'left') {
          if (failure === 'http') throw new Error('fixture network failure');
          return {};
        }
        return payload(tiles[1]);
      } });
    assert.equal(result.dishes.length, 1);
    assert.equal(result.coverage.tiles.filter((tile) => tile.status === 'failed').length, 1);
    assert.equal(result.coverage.partial, true);
    assert.equal(requests, failure === 'crop' ? 1 : 2);
  });
}

test('two invalid tiles reject, rather than returning empty success', async () => {
  await assert.rejects(scanFoodMenu89({ image: 'original', width: 1000, height: 800,
    signal: new AbortController().signal, crop: async () => 'cropped', invoke: async () => ({}) }));
});

test('pre-cancelled operation starts neither crops nor requests', async () => {
  const controller = new AbortController(); controller.abort(); let work = 0;
  await assert.rejects(scanFoodMenu89({ image: 'original', width: 1000, height: 800, signal: controller.signal,
    crop: async () => { work += 1; return 'crop'; }, invoke: async () => { work += 1; return {}; } }), { name: 'AbortError' });
  assert.equal(work, 0);
});

test('cancel during decoding prevents all late paid requests', async () => {
  const controller = new AbortController(), pending = deferred<string>(); let requests = 0;
  const result = scanFoodMenu89({ image: 'original', width: 1000, height: 800, signal: controller.signal,
    crop: () => pending.promise, invoke: async () => { requests += 1; return {}; } });
  controller.abort();
  await assert.rejects(result, { name: 'AbortError' });
  pending.resolve('late crop');
  await Promise.resolve();
  assert.equal(requests, 0);
});

test('owner/route cancellation aborts both requests and ignores transports that settle late', async () => {
  const controller = new AbortController(), pending = deferred<unknown>(), started = deferred<void>();
  const signals: AbortSignal[] = [];
  const result = scanFoodMenu89({ image: 'original', width: 1000, height: 800, signal: controller.signal,
    crop: async () => 'crop', invoke: (_body, signal) => {
      signals.push(signal); if (signals.length === 2) started.resolve(); return pending.promise;
    } });
  await started.promise; controller.abort();
  await assert.rejects(result, { name: 'AbortError' });
  assert.equal(signals.length, 2); assert.ok(signals.every((signal) => signal.aborted));
  pending.resolve(payload(tiles[0]));
  await Promise.resolve();
});

test('bounded timeout retains completed tile and aborts the stalled one without retry', async () => {
  let requests = 0; const signals: AbortSignal[] = [];
  const result = await scanFoodMenu89({ image: 'original', width: 1000, height: 800, timeoutMs: 10,
    signal: new AbortController().signal, crop: async () => 'crop', invoke: async (body, signal) => {
      requests += 1; signals.push(signal);
      if ((body.scan_region as { id: string }).id === 'left') return payload(tiles[0]);
      return new Promise(() => {});
    } });
  assert.equal(requests, 2); assert.ok(signals.every((signal) => signal.aborted));
  assert.equal(result.dishes.length, 1); assert.equal(result.coverage.partial, true);
});

test('timeout with no completed tile is a recoverable error, never empty success', async () => {
  let requests = 0;
  await assert.rejects(scanFoodMenu89({ image: 'original', width: 1000, height: 800, timeoutMs: 5,
    signal: new AbortController().signal, crop: async () => 'crop', invoke: () => {
      requests += 1; return new Promise(() => {});
    } }), /agoto su tiempo/);
  assert.equal(requests, 2);
});

const foodClientPath = 'src/components/wine-import/FoodPairingScanner.tsx';
const foodClient = readFileSync(foodClientPath, 'utf8');
const preparationCall = (source: string) => {
  const ast = ts.createSourceFile(foodClientPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'prepareImageForAnalysis') calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(calls.length, 1, 'Exactly one image preparation, never a second paid reading');
  return { text: calls[0].getText(ast), args: calls[0].arguments.map(argument => argument.getText(ast)) };
};
const oldFoodClient = execFileSync('git', ['show', `c25b282:${foodClientPath}`], { encoding: 'utf8' });
const oldPreparation = preparationCall(oldFoodClient);
const currentPreparation = preparationCall(foodClient);
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
// Keep the historical three-argument oracle on the exact web projection. Only
// the reviewed native safety argument is projected out, not other source logic.
assert.equal(sha256(oldPreparation.text), 'a6986249e1b236cb6ddc70758997cd9ef15ab1088df6a79c7e6738fdef46bde8');
assert.equal(sha256(currentPreparation.text), '9f605736fa5e00b213a6e8e4361f5e22db30381adb88350d6e72f5b4d6a46566');
assert.deepEqual(currentPreparation.args, [...oldPreparation.args, 'isNative ? NATIVE_IMAGE_PREPARATION_LIMITS : undefined']);
const declaration = (source: string, name: string) => {
  const ast = ts.createSourceFile(foodClientPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches: ts.VariableDeclaration[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(matches.length, 1, `Exactly one actual ${name} declaration`);
  return matches[0].getText(ast);
};
const oldRead = declaration(oldFoodClient, 'scanResult');
const currentRead = declaration(foodClient, 'read');
const currentDispatch = declaration(foodClient, 'scanResult');
assert.equal(sha256(oldRead), '5aa6914899d130bb7672ec75cbff75aca2810bd9e90d35060b3f1a3d3ead9f34');
assert.equal(sha256(currentRead), '6a41c2d85ea49a8e1d98dafa8b0b2dbc6eb2373687ce7d2bff782994c0b748e2');
assert.equal(sha256(currentDispatch), '5147ef3cdf801562e29505ed95f8c6e475289a2236b03d23e2b735c787e5e95a');
const oldSaveGuard = 'if (savingRef.current || savedKeys.has(saveKey)) return;';
const currentSaveGuard = 'if (savingRef.current || savedKeys.has(saveKey) || isNative && unconfirmedRowsRef.current.has(rowKey)) return;';
assert.equal(oldFoodClient.split(oldSaveGuard).length, 2);
assert.equal(foodClient.split(currentSaveGuard).length, 2);
const webFoodClient = foodClient.replace(currentPreparation.text, oldPreparation.text)
  .replace(currentRead, 'reviewed95Read').replace(currentDispatch, oldRead).replace(currentSaveGuard, oldSaveGuard);

test('actual save guard retains the independent busy/saved truth table and native-only unconfirmed lock', () => {
  const evaluate = new Function('savingRef', 'savedKeys', 'saveKey', 'isNative', 'unconfirmedRowsRef', 'rowKey',
    `${currentSaveGuard} return 'allowed';`);
  const oldEvaluate = new Function('savingRef', 'savedKeys', 'saveKey', `${oldSaveGuard} return 'allowed';`);
  for (const native of [false, true]) for (const busy of [false, true]) {
    for (const saved of [false, true]) for (const unconfirmed of [false, true]) {
      const args = [{ current: busy }, new Set(saved ? ['save'] : []), 'save'] as const;
      const actual = evaluate(...args, native, { current: new Set(unconfirmed ? ['row'] : []) }, 'row');
      assert.equal(actual, busy || saved || native && unconfirmed ? undefined : 'allowed');
      if (!native) assert.equal(actual, oldEvaluate(...args), 'Web duplicate-save policy is identical');
    }
  }
});

test('reviewed95 actual menu/dish read bodies preserve web results/errors, and native dispatch remains single-shot', async () => {
  const compile = (text: string) => ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const makeRun = (before: boolean, deps: Record<string, unknown>) => new Function(...Object.keys(deps),
    compile(before ? `return (async () => { const ${oldRead}; return scanResult; })();`
      : `return (async () => { const ${currentRead}; const ${currentDispatch}; return scanResult; })();`))(...Object.values(deps));
  for (const mode of ['menu', 'dish']) for (const failure of [false, true]) {
    const error = new Error('Synthetic controlled failure'), controller = new AbortController();
    const results: unknown[] = [], traces: unknown[] = [];
    for (const before of [true, false]) for (const native of before ? [false] : [false, true]) {
      let menuCalls = 0, edgeCalls = 0, wrappers = 0;
      const trace: unknown[] = [], context = { restaurantName: 'Synthetic', matchrimProfile: null };
      const raw = { mode, summary: 'Synthetic', dishes: [dish('Synthetic dish')], has_profile: false };
      const invoke = async (name: string, body: unknown, signal: AbortSignal) => {
        edgeCalls++; assert.equal(name, 'scan-food-pairing'); assert.equal(signal.aborted, false);
        if (!native) assert.equal(signal, controller.signal, 'Web keeps the exact original controller signal');
        trace.push({ name, body }); if (failure) throw error; return raw;
      };
      const deps = { mode, controller, context, image: 'synthetic-image', width: 1200, height: 800, isNative: native,
        parseFoodScanResponse, invokeEdgeFunction: invoke,
        scanFoodMenu89: async (options: { image: string; width: number; height: number; signal: AbortSignal;
          context: unknown; invoke: (body: unknown, signal: AbortSignal) => Promise<unknown> }) => {
          menuCalls++; assert.equal(options.signal.aborted, false);
          trace.push({ menu: { image: options.image, width: options.width, height: options.height, context: options.context } });
          return parseFoodScanResponse(await options.invoke({ crop: 'synthetic' }, options.signal));
        },
        runNativeFoodRead95: (read: (signal: AbortSignal) => Promise<unknown>, signal: AbortSignal) => {
          wrappers++; assert.equal(signal, controller.signal); return runNativeFoodRead95(read, signal);
        },
      };
      if (failure) await assert.rejects(makeRun(before, deps), value => value === error);
      else results.push(await makeRun(before, deps));
      traces.push(trace);
      assert.equal(menuCalls, mode === 'menu' ? 1 : 0); assert.equal(edgeCalls, 1);
      assert.equal(wrappers, native ? 1 : 0);
    }
    traces.slice(1).forEach(trace => assert.deepEqual(trace, traces[0], 'Actual web/native bodies preserve request payloads'));
    results.slice(1).forEach(result => assert.deepEqual(result, results[0], 'Actual parser result parity'));
    if (!failure) {
      const result = results[0] as ReturnType<typeof parseFoodScanResponse>;
      assert.equal(result.dishes.length, 1); assert.equal(result.dishes[0].nombre, 'Synthetic dish');
      assert.equal(result.dishes[0].match, null); assert.equal(result.dishes[0].razon, '');
    }
  }
});

test('reviewed95 actual preparation call preserves web arguments and native signal/limits without retry', async () => {
  assert.deepEqual(oldPreparation.args, ['imageFile', '2400', 'controller.signal']);
  assert.deepEqual(NATIVE_IMAGE_PREPARATION_LIMITS, { maxFileBytes: 25 * 1024 * 1024, maxImagePixels: 64_000_000 });
  assert.ok(Object.isFrozen(NATIVE_IMAGE_PREPARATION_LIMITS));
  for (const native of [false, true]) {
    for (const aborted of [false, true]) {
      const imageFile = { name: 'explicitly-synthetic.jpg' }, controller = new AbortController();
      if (aborted) controller.abort();
      const receipt = { dataUrl: 'synthetic-prepared', width: 1200, height: 800 };
      const calls: unknown[][] = [];
      const prepare = (...args: unknown[]) => { calls.push(args); return Promise.resolve(receipt); };
      const run = new Function('prepareImageForAnalysis', 'imageFile', 'controller', 'isNative', 'NATIVE_IMAGE_PREPARATION_LIMITS',
        `return ${currentPreparation.text};`);
      assert.equal(await run(prepare, imageFile, controller, native, NATIVE_IMAGE_PREPARATION_LIMITS), receipt);
      assert.equal(calls.length, 1); assert.equal(calls[0][0], imageFile);
      assert.equal(calls[0][1], 2400); assert.equal(calls[0][2], controller.signal);
      assert.equal((calls[0][2] as AbortSignal).aborted, aborted);
      assert.equal(calls[0][3], native ? NATIVE_IMAGE_PREPARATION_LIMITS : undefined);
      if (!native) {
        const beforeCalls: unknown[][] = [];
        new Function('prepareImageForAnalysis', 'imageFile', 'controller', `return ${oldPreparation.text};`)(
          (...args: unknown[]) => beforeCalls.push(args), imageFile, controller);
        assert.deepEqual(calls[0].slice(0, 3), beforeCalls[0]);
        assert.equal(beforeCalls[0].length, 3); assert.equal(calls[0].length, 4);
      }
    }
  }
});

test('client retains dish single-call branch, owner lifetime aborts and save protections', () => {
  const source = readFileSync('src/components/wine-import/FoodPairingScanner.tsx', 'utf8');
  assert.match(webFoodClient, /mode === 'menu'\s*\? await scanFoodMenu89/);
  assert.match(webFoodClient, /: parseFoodScanResponse\(await invokeEdgeFunction/);
  assert.match(webFoodClient, /prepareImageForAnalysis\(imageFile, 2400, controller.signal\)/);
  assert.match(source, /scanController.current\?\.abort\(\)/);
  assert.match(source, /scanController.current !== controller/);
  assert.match(webFoodClient, /if \(savingRef.current \|\| savedKeys.has\(saveKey\)\) return/);
  assert.match(source, /use_for_profile_training: false/);
  assert.doesNotMatch(source, /Faltan platos por revisar/);
});
