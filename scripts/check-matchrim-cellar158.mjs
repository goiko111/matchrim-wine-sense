import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const source = read('scripts/MatchrimCellar144Probe.swift');
const reveal = source.slice(source.indexOf('        func reveal('), source.indexOf('        func tap('));
assert(reveal.startsWith('        func reveal('));

// Exercise the source's control flow with geometry/XCUI doubles, not a second reveal implementation.
// This small syntax translation is not Swift compilation or simulator evidence.
const translated = reveal
  .replace('func reveal(_ item: XCUIElement) throws', 'function reveal(item)')
  .replace('func usable(_ frame: CGRect) -> Bool', 'function usable(frame)')
  .replace(/for _ in 0\.\.<(\d+) \{/g, 'for (let attempt = 0; attempt < $1; attempt++) {')
  .replace(/\bif ([^{\n]+) \{/g, 'if ($1) {')
  .replace(/^(\s*)let /gm, '$1const ')
  .replace(/try require\(/g, 'ensure(')
  .replace(/(frame\.(?:minX|maxX|minY|maxY))\.isFinite/g, 'Number.isFinite($1)');
assert(!/\bfunc\b|\bthrows\b|\btry\b|\.isFinite(?!\()|0\.\.</.test(translated));
const bind = new Function('app', 'ensure', translated + '\nreturn reveal;');

function rect(x, y, width, height) {
  return { minX: x, minY: y, maxX: x + width, maxY: y + height,
    isEmpty: width <= 0 || height <= 0, isNull: false,
    intersection(other) {
      const left = Math.max(x, other.minX), top = Math.max(y, other.minY);
      return rect(left, top, Math.min(x + width, other.maxX) - left, Math.min(y + height, other.maxY) - top);
    } };
}
const viewport = rect(0, 0, 440, 956);
function fixture({ target = rect(49, -2121, 170, 55), surfaceFrame = viewport, windowFrame = viewport,
  exists = true, surfaceExists = true, hit, step = 600, afterSwipe } = {}) {
  const trace = [];
  const item = { exists, frame: target, get isHittable() {
    return this.exists && (hit ? hit(this, trace) : this.frame.minY >= 0 && this.frame.maxY <= 956);
  } };
  const move = direction => {
    trace.push(direction);
    item.frame = rect(item.frame.minX, item.frame.minY + (direction === 'down' ? step : -step),
      item.frame.maxX - item.frame.minX, item.frame.maxY - item.frame.minY);
    afterSwipe?.(item, trace);
  };
  const surface = { exists: surfaceExists, frame: surfaceFrame,
    swipeDown: () => move('down'), swipeUp: () => move('up') };
  const app = { webViews: { firstMatch: surface }, windows: { firstMatch: { frame: windowFrame } } };
  return { item, trace, run: () => bind(app, (condition, message) => assert(condition, message))(item) };
}
let checks = 0;
function test(name, body) { body(); checks++; console.log('PASS max158 ' + name); }

test('retained offscreen score selects down immediately; all five dimensions remain present', () => {
  const ax = read('qa-artifacts/night105-20261021/cellar144-max158-r1/attachments/8B3057AD-25D2-4E54-A22A-0FF7D6FA5A2E.txt');
  const line = ax.split('\n').find(row => /StaticText,.*label: '\u2248[0-9]{1,3}\/100'/.test(row));
  const frame = line?.match(/\{\{(-?[0-9.]+), (-?[0-9.]+)\}, \{([0-9.]+), ([0-9.]+)\}\}/);
  assert(frame, 'Retained named score geometry required');
  assert.match(ax, /WebView,.*\{\{0.0, 0.0\}, \{440.0, 956.0\}\}/);
  for (const axis of ['potencia', 'acidez', 'dulzor', 'tanino', 'fruta']) {
    assert(ax.includes("label: '" + axis + ': tu perfil '), axis);
  }
  const f = fixture({ target: rect(...frame.slice(1).map(Number)) });
  f.run(); assert.deepEqual(f.trace, ['down', 'down', 'down', 'down']);
  assert(f.item.isHittable);
});
test('below and partially clipped targets use their current edges', () => {
  for (const [target, direction] of [[rect(49, 2558, 342, 1060), 'up'],
    [rect(49, -10, 170, 55), 'down'], [rect(49, 940, 170, 55), 'up']]) {
    const f = fixture({ target, hit: (_, trace) => trace.length === 1 });
    f.run(); assert.deepEqual(f.trace, [direction]);
  }
});
test('already hittable target needs no surface or geometry', () => {
  const f = fixture({ target: rect(NaN, NaN, 0, 0), surfaceExists: false, hit: () => true });
  f.run(); assert.deepEqual(f.trace, []);
});
test('direction is remeasured after overshoot, not fixed for the whole loop', () => {
  const f = fixture({ target: rect(49, -100, 170, 55), step: 1200,
    afterSwipe: (item, trace) => { if (trace.length === 2) item.frame = rect(49, 400, 170, 55); } });
  f.run(); assert.deepEqual(f.trace, ['down', 'up']);
});
test('eighth swipe may succeed, ninth swipe is never attempted', () => {
  const last = fixture({ target: rect(49, -4201, 170, 55) });
  last.run(); assert.equal(last.trace.length, 8); assert(last.item.isHittable);
  const beyond = fixture({ target: rect(49, -4801, 170, 55) });
  assert.throws(beyond.run, /Named element not reachable/);
  assert.deepEqual(beyond.trace, Array(8).fill('down'));
});
test('unknown target and missing surface stop without a discovery swipe', () => {
  for (const options of [{ exists: false }, { surfaceExists: false }]) {
    const f = fixture(options); assert.throws(f.run, /Unknown element|Known WebView/); assert.deepEqual(f.trace, []);
  }
});
test('empty, null, nonfinite and disjoint geometry stops before any swipe', () => {
  for (const options of [{ target: rect(49, -100, 0, 55) }, { target: rect(NaN, -100, 170, 55) },
    { target: rect(49, -Infinity, 170, 55) }, { target: { ...rect(49, -100, 170, 55), isNull: true } },
    { surfaceFrame: rect(0, 0, 0, 956) }, { surfaceFrame: rect(0, 0, Infinity, 956) },
    { windowFrame: rect(0, NaN, 440, 956) }, { windowFrame: rect(500, 0, 440, 956) },
    { target: rect(440, -100, 170, 55) }, { target: rect(-170, -100, 170, 55) }]) {
    const f = fixture(options); assert.throws(f.run, /frames required|overlap/); assert.deepEqual(f.trace, []);
  }
});
test('visible but occluded and viewport-spanning nonhittable targets do not trigger blind swipes', () => {
  for (const target of [rect(49, 300, 170, 55), rect(49, -100, 170, 1200)]) {
    const f = fixture({ target, hit: () => false });
    assert.throws(f.run, /No unambiguous vertical reveal direction/); assert.deepEqual(f.trace, []);
  }
});
test('viewport is clipped to the window rather than the full WebView frame', () => {
  const f = fixture({ target: rect(49, 50, 170, 55), surfaceFrame: rect(0, -500, 440, 2000),
    windowFrame: rect(0, 100, 440, 800), hit: (_, trace) => trace.length === 1 });
  f.run(); assert.deepEqual(f.trace, ['down']);
});
test('disappearance, stall, reversed movement and invalid post-swipe frame stop immediately', () => {
  for (const options of [{ afterSwipe: item => { item.exists = false; } }, { step: 0 }, { step: -10 },
    { afterSwipe: item => { item.frame = rect(49, NaN, 170, 55); } }]) {
    const f = fixture(options); assert.throws(f.run, /disappeared|did not move/); assert.equal(f.trace.length, 1);
  }
  const below = fixture({ target: rect(49, 2000, 170, 55), step: -10 });
  assert.throws(below.run, /did not move/); assert.deepEqual(below.trace, ['up']);
});
console.log(`Cellar158: ${checks} source-derived geometry checks passed. No Swift compilation, GUI, simulator, network or writes; swipe distances/hittability are simulated.`);
