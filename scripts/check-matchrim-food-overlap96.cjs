const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const base = 'a625e04b0e805214bf5f3482302c85f67712196a';
const file = 'src/utils/foodMenuScan89.ts';
const before = execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' });
const after = fs.readFileSync(file, 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const json = value => JSON.parse(JSON.stringify(value));

// Exact inverse of the narrow type/native-merge wiring. Parser, tile/crop planning,
// request construction, cancellation, deadlines and default merge body stay exact.
const helperStart = after.indexOf('const literalRow89 =');
const helperEnd = after.indexOf('export const mergeFoodMenuTiles89 =', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart);
const predicate = `      const duplicate = dishes.find((existing) => {
        if (!samePhysicalRow(existing, dish)) return false;
        if (!nativeClippedPrices) return true;
        if (!nativeRowContext89(existing, dish)) return false;
        const firstPrice = existing.source_text ? terminalPrice89(existing.source_text) : null;
        const secondPrice = dish.source_text ? terminalPrice89(dish.source_text) : null;
        return !firstPrice || !secondPrice
          || (firstPrice.amount === secondPrice.amount && firstPrice.currency === secondPrice.currency);
      });`;
let inverse = after.slice(0, helperStart) + after.slice(helperEnd);
inverse = inverse.replace('matchrimProfile?: unknown; matchrimLearningModel?: unknown', 'matchrimProfile?: unknown')
  .replace('(outcomes: TileOutcome[], nativeClippedPrices = false)', '(outcomes: TileOutcome[])')
  .replace(predicate, '      const duplicate = dishes.find((existing) => samePhysicalRow(existing, dish));')
  .replace('  const merged: FoodMenuScanResult89 = { ...first,', '  return { ...first,')
  .replace('  return nativeClippedPrices ? mergeNativeClippedPrices89(merged, outcomes) : merged;\n', '')
  .replace("return mergeFoodMenuTiles89(outcomes, options.context?.matchrimLearningModel === 'native-evidence-strength-v2');", 'return mergeFoodMenuTiles89(outcomes);');
assert.equal(inverse, before, 'Full source inverse outside native merge/type wiring');
assert.ok(after.includes('intersection / union >= 0.65'), 'Default IoU remains .65');
function loader(override) {
  const cache = new Map();
  const load = filename => {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const source = filename === path.resolve(file) ? override : fs.readFileSync(filename, 'utf8');
    const output = ts.transpileModule(source, { fileName: filename, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
    assert.ok(!(output.diagnostics ?? []).some(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error));
    const module = { exports: {} };
    cache.set(filename, module);
    const context = vm.createContext({ module, exports: module.exports,
      require: name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name.endsWith('.ts') ? name : name + '.ts')) : require(name),
      AbortController, AbortSignal, DOMException, Error, setTimeout, clearTimeout,
      fetch: () => { throw new Error('Network forbidden'); } });
    vm.runInContext(output.outputText, context, { timeout: 1000, filename });
    return module.exports;
  };
  return load(path.resolve(file));
}
const old = loader(before), current = loader(after);
const tiles = current.planFoodMenuTiles89(1800, 2400);
const name = 'Chilled vegetable soup';
const raw = tiles.map((tile, index) => ({
  mode: 'menu', summary: 'Synthetic', has_profile: false, profile_source: 'none',
  scan_region: { id: tile.id, box: tile.box, tile_count: tile.tile_count,
    max_dishes: 30, coordinate_space: 'crop_percent' },
  dishes: [{ nombre: name, categoria: 'soup', match: null, razon: '', recomendaciones: [],
    source_text: name + (index ? ' 42 PLN' : ''), source_order: 4, confidence: 90,
    source_box: { x: 32, y: index ? 19 : 97.8, width: 36, height: index ? 4 : 2.2 }, region_id: 'soups' }],
  coverage: { model_counts_reported: true, estimated_visible_dishes: 1, unreadable_dishes: 0,
    truncated: false, partial: false },
}));
const outcomes = tiles.map((tile, index) => ({ ok: true, read: current.parseFoodMenuTile89(raw[index], tile) }));
const originalOutcomeBytes = JSON.stringify(outcomes);
const legacy = current.mergeFoodMenuTiles89(outcomes);
const baseline = old.mergeFoodMenuTiles89(outcomes);
assert.deepEqual(json(legacy), json(baseline), 'Default result exact legacy semantics');
assert.equal(legacy.dishes.length, 2);
assert.equal(legacy.coverage.duplicate_rows, 0);
const native = current.mergeFoodMenuTiles89(outcomes, true);
assert.equal(native.dishes.length, 1);
assert.equal(native.coverage.duplicate_rows, 1);
assert.equal(native.coverage.partial, true);
assert.equal(native.coverage.estimated_visible_dishes, null);
assert.equal(native.coverage.unreadable_dishes, null);
const matched = native.dishes.filter(dish => dish.nombre === name);
assert.equal(matched.length, 1);
assert.equal(matched[0].source_text, name + ' 42 PLN');
assert.equal(matched[0].region_id, 'bottom:soups');
assert.deepEqual([...matched[0].source_tile_ids].sort(), ['bottom', 'top']);
assert.ok(native.dishes.every(dish => dish.match === null && dish.recomendaciones.every(wine => wine.match === null && wine.atributos == null)));
assert.equal(JSON.stringify(outcomes), originalOutcomeBytes, 'Raw parse inputs immutable');
const pair = outcomes.map(outcome => ({ ...json(outcome), read: { ...json(outcome.read), dishes: json(outcome.read.dishes.filter(dish => dish.nombre === name)) } }));
assert.ok(pair.every(outcome => outcome.read.dishes.length === 1));
const a = pair[0].read.dishes[0].source_box, b = pair[1].read.dishes[0].source_box;
const intersection = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
const iou = intersection / (a.width * a.height + b.width * b.height - intersection);
assert.ok(iou < .65 && Math.abs(iou - .55) < .00000001);
const negatives = [];
function reject(id, edit, expected = 2) {
  const copy = json(pair);
  edit(copy[0].read.dishes[0], copy[1].read.dishes[0], copy);
  assert.equal(current.mergeFoodMenuTiles89(copy, true).dishes.length, expected, id);
  negatives.push({ id, keptDistinct: true });
}
reject('small-portion-not-large', (a) => { a.nombre = 'Small ' + a.nombre; a.source_text = 'Small ' + a.source_text; });
reject('different-variant-name', (a) => { a.nombre += ' z kurczakiem'; a.source_text += ' z kurczakiem'; });
reject('cross-section', (a) => { a.region_id = 'top:other-section'; });
reject('category-conflict', (a) => { a.categoria = 'entrante'; });
reject('missing-category', (a) => { a.categoria = ''; });
reject('blank-category', (a, b) => { a.categoria = ' '; b.categoria = ' '; });
reject('negative-source-order', (a, b) => { a.source_order = -1; b.source_order = -1; });
reject('blank-section', (a, b) => { a.region_id = 'top: '; b.region_id = 'bottom: '; });
reject('source-order-conflict', (a) => { a.source_order = 3; });
reject('same-tile', (a) => { a.source_tile_ids = ['bottom']; a.region_id = 'bottom:soups'; });
reject('missing-tile-provenance', (a) => { a.source_tile_ids = []; });
reject('unknown-tile', (a) => { a.source_tile_ids = ['unknown']; a.region_id = 'unknown:soups'; });
reject('region-prefix-does-not-bind-tile', (a) => { a.region_id = 'bottom:soups'; });
reject('not-on-crop-edge', (a) => { a.source_box.y -= .01; });
reject('wrong-geometric-row', (a) => { a.source_box.y -= 3; });
reject('wrong-column', (a) => { a.source_box.x -= 10; });
reject('noncontaining-fuller-row', (a, b) => { b.source_box.y += .5; });
reject('fuller-box-is-many-rows', (a, b) => { b.source_box.height = 10; });
reject('missing-geometry', (a) => { a.source_box = null; });
reject('invalid-geometry', (a) => { a.source_box.width = -1; });
reject('incorrect-tile-box', (a, b, list) => { list[0].read.tile.box.height = 60; });
reject('ambiguous-tile-id', (a, b, list) => { list.push(json(list[0])); }, 3);
reject('tile-count-conflict', (a, b, list) => { list[0].read.tile.tile_count = 3; });
reject('different-source-body', (a, b) => { b.source_text = name + ' z koperkiem 42 zł'; });
reject('unsupported-price-suffix', (a, b) => { b.source_text = name + ' 42 points'; });
reject('multiline-source', (a) => { a.source_text = 'Chilled\nvegetable soup'; });
reject('variant-list-source', (a, b) => { a.nombre += ' / wariant'; b.nombre = a.nombre; a.source_text = a.nombre; b.source_text = a.nombre + ' 42 zł'; });
reject('conflicting-amounts', (a) => { a.source_text += ' 41 zł'; });
reject('conflicting-currencies', (a) => { a.source_text += ' 42 EUR'; });
reject('same-amount-different-symbols-even-with-high-IoU', (a, b) => {
  a.source_text += ' 42 €'; b.source_text = name + ' 42 $'; a.source_box = json(b.source_box);
});
reject('category-conflict-even-with-high-IoU-exact-source', (a, b) => {
  a.source_text = b.source_text; a.source_box = json(b.source_box); a.categoria = 'other-category';
});
reject('cross-section-even-with-high-IoU-exact-source', (a, b) => {
  a.source_text = b.source_text; a.source_box = json(b.source_box); a.region_id = 'top:other-section';
});
reject('multiple-existing-edge-candidates-no-arbitrary-choice', (a, b, list) => { list[0].read.dishes.push(json(a)); }, 3);
const reversed = current.mergeFoodMenuTiles89([...json(pair)].reverse(), true);
assert.equal(reversed.dishes.length, 1);
assert.equal(reversed.dishes[0].source_text, name + ' 42 PLN');

async function scan(module, tag, fail = false) {
  const invokes = [], crops = [];
  const controller = new AbortController();
  const result = await module.scanFoodMenu89({ image: 'OFFLINE_NO_IMAGE_GENERATED', width: 1800, height: 2400,
    signal: controller.signal, context: tag === undefined ? { restaurantName: 'OFFLINE' } : { restaurantName: 'OFFLINE', matchrimLearningModel: tag },
    crop: async (...args) => { crops.push(args.slice(1, 4)); return 'OFFLINE_CAPTURE_PLACEHOLDER'; },
    invoke: async body => { invokes.push(json(body)); if (fail) throw new Error('OFFLINE_PROVIDER_FAILURE');
      return json(raw[body.scan_region.id === 'top' ? 0 : 1]); },
  });
  return { result, invokes, crops };
}
(async () => {
  const tags = [undefined, null, '', 'native-v2', 'native-evidence-strength-v2 ', 'native-evidence-strength-v2'];
  const wiring = [];
  for (const tag of tags) {
    const before = await scan(old, tag), after = await scan(current, tag);
    assert.deepEqual(after.invokes, before.invokes, 'Request forwarding unchanged');
    assert.deepEqual(json(after.crops), json(before.crops), 'Crop arguments unchanged across isolated VM realms');
    assert.equal(after.invokes.length, 2);
    if (tag !== 'native-evidence-strength-v2') assert.deepEqual(json(after.result), json(before.result), 'Default/unknown/web output unchanged');
    else assert.equal(after.result.dishes.length, 1);
    wiring.push({ tag: tag ?? 'absent-or-null', calls: after.invokes.length, rows: after.result.dishes.length, passed: true });
  }
  let failureCalls = 0;
  await assert.rejects(() => current.scanFoodMenu89({ image: 'OFFLINE', width: 4010, height: 5346,
    signal: new AbortController().signal, context: { matchrimLearningModel: 'native-evidence-strength-v2' },
    crop: async () => 'OFFLINE', invoke: async () => { failureCalls++; throw new Error('OFFLINE'); } }));
  assert.equal(failureCalls, 2, 'No fallback or retry after either failed crop');
  let abortedCalls = 0;
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(() => current.scanFoodMenu89({ image: 'OFFLINE', width: 4010, height: 5346, signal: cancelled.signal,
    invoke: async () => { abortedCalls++; return {}; } }));
  assert.equal(abortedCalls, 0);
  assert.equal(JSON.stringify(outcomes), originalOutcomeBytes);
  console.log(JSON.stringify({ passed: true, base, sourceSha256: hash(after),
    fullSourceInverse: true, defaultLegacyUnchanged: true, defaultIoU: .65,
    syntheticPair: { beforeRows: 2, beforeDuplicates: 0, nativeRows: 1, nativeDuplicates: 1,
      candidateIoU: iou, topBox: a, bottomBox: b, preservedSource: matched[0].source_text },
    publicSyntheticOnly: true, genericAffinityNotPromoted: true,
    negatives, negativeCount: negatives.length, wiring, failureCalls, abortedCalls,
    syntheticParsedInputsUnchanged: true, HTTP: 0, SDK: false, deploy: false,
    limits: 'Actual parser/merge/scanner orchestration with synthetic rows; crop/invoke are mocks. No customer data, private paths, images or captures required.' }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
