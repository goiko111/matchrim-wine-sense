import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
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

test('client retains dish single-call branch, owner lifetime aborts and save protections', () => {
  const source = readFileSync('src/components/wine-import/FoodPairingScanner.tsx', 'utf8');
  assert.match(source, /mode === 'menu'\s*\? await scanFoodMenu89/);
  assert.match(source, /: parseFoodScanResponse\(await invokeEdgeFunction/);
  assert.match(source, /prepareImageForAnalysis\(imageFile, 2400, controller.signal\)/);
  assert.match(source, /scanController.current\?\.abort\(\)/);
  assert.match(source, /scanController.current !== controller/);
  assert.match(source, /if \(savingRef.current \|\| savedKeys.has\(saveKey\)\) return/);
  assert.match(source, /use_for_profile_training: false/);
  assert.doesNotMatch(source, /Faltan platos por revisar/);
});
