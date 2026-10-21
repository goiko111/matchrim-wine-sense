import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/lib/nativeKeyboardViewport.ts', import.meta.url), 'utf8');
const fixture = ({ native = true, platform = 'ios', auth = false, catalogSearch = false } = {}) => {
  const classes = new Set(), frames = new Map(), events = new Map(), plugin = new Map(), scrolls = [], calls = [];
  const attributes = new Map();
  let nextFrame = 0;
  const root = {
    classList: { contains: key => classes.has(key), add: key => classes.add(key), remove: key => classes.delete(key) },
    setAttribute: (key, value) => attributes.set(key, value),
  };
  const field = { matches: () => true, closest: selector => (
    (auth && selector.includes('.matchrim-native-auth'))
    || (catalogSearch && selector.includes('[data-testid="native-wine-search97"]'))
  ) ? {} : null,
    bounds: { top: 100, bottom: 144, height: 44 },
    getBoundingClientRect: () => field.bounds };
  const document = { documentElement: root, activeElement: field };
  const window = {
    scrollY: 80, innerWidth: 440, innerHeight: 956, location: { pathname: '/my-wines' },
    visualViewport: { height: 956, offsetTop: 0, events: new Map(),
      addEventListener(key, callback) { this.events.set(key, callback); } },
    addEventListener: (key, callback) => events.set(key, callback),
    scrollTo: options => { scrolls.push({ ...options }); window.scrollY = options.top; },
    scrollBy: options => { scrolls.push({ ...options, relative: true }); window.scrollY += options.top; },
  };
  const Keyboard = {
    setAccessoryBarVisible: options => { calls.push(['accessory', options]); return Promise.resolve(); },
    addListener: (key, callback) => { plugin.set(key, callback); return Promise.resolve(); },
  };
  const sandbox = {
    exports: {}, document, window,
    getComputedStyle: () => ({ getPropertyValue: () => '62px' }),
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
    require: id => {
      if (id === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native, getPlatform: () => platform } };
      assert.equal(id, '@capacitor/keyboard'); return { Keyboard };
    },
  };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, sandbox);
  sandbox.exports.installNativeKeyboardViewport();
  const emit = key => { assert.ok(plugin.has(key), key); plugin.get(key)(); };
  const flush = () => { for (const [id, callback] of [...frames]) { frames.delete(id); callback(); } };
  const diagnostic = () => JSON.parse(attributes.get('data-matchrim-keyboard-viewport') ?? 'null');
  return { classes, frames, events, plugin, scrolls, calls, field, document, window, attributes, emit, flush, diagnostic };
};

const results = [];
const check = (name, run) => {
  try { run(); results.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, passed: false, error: String(error) }); console.error('FAIL', name, String(error)); }
};

check('ordinary show/hide restores the pre-keyboard scroll without changing focus', () => {
  const f = fixture(); f.emit('keyboardWillShow'); f.window.scrollY = 220; f.emit('keyboardDidHide'); f.flush();
  assert.equal(f.scrolls.length, 1); assert.equal(f.scrolls[0].top, 80);
  assert.equal(f.scrolls[0].behavior, 'instant'); assert.equal(f.document.activeElement, f.field);
});
check('reproduction: hide frame must not scroll after a fresh show during rotation', () => {
  const f = fixture(); f.emit('keyboardWillShow'); f.window.scrollY = 220; f.emit('keyboardDidHide');
  f.window.innerWidth = 956; f.window.innerHeight = 168; f.emit('keyboardWillShow'); f.flush();
  assert.equal(f.scrolls.length, 0); assert.ok(f.classes.has('matchrim-keyboard-visible'));
});
check('reproduction: late keyboard hide must not undo an AppRoutes navigation scroll reset', () => {
  const f = fixture(); f.emit('keyboardWillShow'); f.window.location.pathname = '/profile'; f.window.scrollY = 0;
  f.emit('keyboardDidHide'); f.flush(); assert.equal(f.scrolls.length, 0); assert.equal(f.window.scrollY, 0);
});
check('a cancelled stale callback cannot override a newer keyboard session', () => {
  const f = fixture(); f.emit('keyboardWillShow'); f.emit('keyboardDidHide');
  const stale = [...f.frames.values()][0]; f.window.scrollY = 130; f.emit('keyboardWillShow'); stale();
  assert.equal(f.scrolls.length, 0); assert.ok(f.classes.has('matchrim-keyboard-visible'));
});
check('one hide restoration per latest session; duplicate hide callbacks do not accumulate', () => {
  const f = fixture(); f.emit('keyboardWillShow'); f.emit('keyboardDidHide'); f.emit('keyboardDidHide'); f.flush();
  assert.equal(f.scrolls.length, 1);
});
check('route change between hide notification and animation frame also invalidates restoration', () => {
  const f = fixture(); f.emit('keyboardWillShow'); f.emit('keyboardDidHide'); f.window.location.pathname = '/escanear'; f.flush();
  assert.equal(f.scrolls.length, 0);
});
check('repeated will-show while open does not replace the original pre-keyboard scroll', () => {
  const f = fixture(); f.emit('keyboardWillShow'); f.window.scrollY = 220; f.emit('keyboardWillShow');
  f.emit('keyboardDidHide'); f.flush(); assert.equal(f.scrolls.length, 1); assert.equal(f.scrolls[0].top, 80);
});
check('after a reshow, only the latest hide restores the new session scroll', () => {
  const f = fixture(); f.emit('keyboardWillShow'); f.emit('keyboardDidHide');
  const stale = [...f.frames.values()][0]; f.window.scrollY = 130; f.emit('keyboardWillShow'); f.window.scrollY = 250;
  f.emit('keyboardDidHide'); stale(); f.flush(); assert.equal(f.scrolls.length, 1); assert.equal(f.scrolls[0].top, 130);
});
check('web installer is an exact no-op', () => {
  const f = fixture({ native: false }); assert.equal(f.plugin.size, 0); assert.equal(f.events.size, 0);
  assert.equal(f.calls.length, 0); assert.equal(f.attributes.size, 0); assert.equal(f.frames.size, 0);
});
check('Android retains event contract but never configures the iOS accessory bar', () => {
  const f = fixture({ platform: 'android' }); assert.equal(f.calls.length, 0);
  f.emit('keyboardWillShow'); f.emit('keyboardDidHide'); f.flush(); assert.equal(f.scrolls.length, 1);
});
check('intentional blur/closure never refocuses or calls Keyboard.show', () => {
  const f = fixture(); f.emit('keyboardWillShow'); f.document.activeElement = null;
  f.events.get('focusout')?.(); f.emit('keyboardDidHide'); f.flush(); assert.equal(f.document.activeElement, null);
  assert.doesNotMatch(source, /\.focus\(|Keyboard\.(show|hide)\(/);
});
check('bounded native diagnostics distinguish focused hide from blur without field values or URLs', () => {
  const f = fixture(); f.field.value = 'PRIVATE-WINE-AND-NOTE'; f.emit('keyboardWillShow');
  f.emit('keyboardDidHide'); const hidden = f.diagnostic();
  assert.equal(hidden.events.at(-1).event, 'hide'); assert.equal(hidden.events.at(-1).editableFocused, true);
  f.document.activeElement = null; f.events.get('focusout')();
  assert.equal(f.diagnostic().events.at(-1).editableFocused, false);
  const text = JSON.stringify(f.diagnostic()); assert.ok(!text.includes('PRIVATE-WINE-AND-NOTE'));
  assert.ok(!text.includes('/my-wines')); assert.ok(!text.includes('value') && !text.includes('owner'));
});
check('rotation and viewport observations are bounded and have no focus/scroll side effects', () => {
  const f = fixture(); f.emit('keyboardWillShow');
  for (let i = 0; i < 30; i++) { f.window.innerWidth = 956; f.window.innerHeight = 168; f.events.get('resize')(); f.events.get('orientationchange')(); }
  const trace = f.diagnostic(); assert.equal(trace.events.length, 8); assert.equal(trace.events.at(-1).event, 'orientationchange');
  assert.equal(trace.events.at(-1).width, 956); assert.equal(trace.events.at(-1).height, 168);
  assert.equal(f.scrolls.length, 0); assert.equal(f.frames.size, 0); assert.equal(f.document.activeElement, f.field);
});
check('native visibility is reported as an event state, never asserted as proof of physical keyboard presence', () => {
  const f = fixture(); f.field.matches = () => false; f.emit('keyboardWillShow');
  const event = f.diagnostic().events.at(-1);
  assert.equal(event.nativeEventVisible, true); assert.equal(event.editableFocused, false);
  assert.deepEqual(Object.keys(event).sort(), ['editableFocused', 'event', 'height', 'nativeEventVisible', 'width']);
  assert.equal(f.attributes.size, 1);
});
check('iOS auth corrects a focused field hidden above the safe area after rotation without reading its value', () => {
  const f = fixture({ auth: true });
  f.field.bounds = { top: -40, bottom: 83, height: 123 };
  f.emit('keyboardWillShow'); f.flush();
  assert.equal(f.scrolls.length, 1); assert.equal(f.scrolls[0].top, -110);
  assert.equal(f.scrolls[0].relative, true); assert.equal(f.scrolls[0].behavior, 'instant');
  assert.equal(f.document.activeElement, f.field);
});
check('iOS auth keeps the focused field above the resized keyboard and does not move an already visible field', () => {
  const f = fixture({ auth: true }); f.window.visualViewport.height = 190;
  f.field.bounds = { top: 150, bottom: 194, height: 44 };
  f.emit('keyboardWillShow'); f.flush();
  assert.equal(f.scrolls[0].top, 12);
  f.field.bounds = { top: 90, bottom: 134, height: 44 };
  f.window.visualViewport.events.get('resize')(); f.flush(); assert.equal(f.scrolls.length, 1);
});
check('queued auth reveal is cancelled on hide and cannot act after route or focus changes', () => {
  const f = fixture({ auth: true }); f.field.bounds = { top: -40, bottom: 83, height: 123 };
  f.emit('keyboardWillShow'); const stale = [...f.frames.values()][0];
  f.emit('keyboardDidHide'); stale(); f.flush();
  assert.equal(f.scrolls.length, 1); assert.equal(f.scrolls[0].relative, undefined);
  f.emit('keyboardWillShow'); f.field.closest = () => null; f.flush(); assert.equal(f.scrolls.length, 1);
});
check('Android auth never uses the iOS focus-pan correction', () => {
  const f = fixture({ auth: true, platform: 'android' });
  f.field.bounds = { top: -40, bottom: 83, height: 123 };
  f.emit('keyboardWillShow'); f.events.get('orientationchange')(); f.flush();
  assert.equal(f.frames.size, 0); assert.equal(f.scrolls.length, 0);
});
check('physical97 regression: catalogue search hidden by landscape keyboard is revealed without changing its value', () => {
  const f = fixture({ catalogSearch: true });
  f.field.value = 'Muga';
  f.window.visualViewport.height = 170;
  f.field.bounds = { top: 180, bottom: 224, height: 44 };
  f.emit('keyboardWillShow'); f.flush();
  assert.equal(f.scrolls.length, 1);
  assert.equal(f.scrolls[0].top, 62);
  assert.equal(f.scrolls[0].relative, true);
  assert.equal(f.field.value, 'Muga');
  assert.equal(f.document.activeElement, f.field);
});
check('catalogue correction follows settled viewport events and cancels after blur', () => {
  const f = fixture({ catalogSearch: true });
  f.emit('keyboardWillShow'); f.flush();
  assert.equal(f.scrolls.length, 0);
  f.window.visualViewport.height = 170;
  f.field.bounds = { top: 180, bottom: 224, height: 44 };
  f.window.visualViewport.events.get('resize')();
  f.document.activeElement = null; f.flush();
  assert.equal(f.scrolls.length, 0);
  f.document.activeElement = f.field;
  f.window.visualViewport.events.get('resize')(); f.flush();
  assert.equal(f.scrolls.length, 1);
});
check('catalogue correction is absent on web, Android and unrelated native fields', () => {
  for (const options of [{ native: false, catalogSearch: true }, { platform: 'android', catalogSearch: true }, {}]) {
    const f = fixture(options);
    f.window.visualViewport.height = 170;
    f.field.bounds = { top: 180, bottom: 224, height: 44 };
    if (f.plugin.size) { f.emit('keyboardWillShow'); f.events.get('orientationchange')(); f.flush(); }
    assert.equal(f.scrolls.length, 0);
  }
});

console.log(JSON.stringify({ passed: results.filter(r => r.passed).length, total: results.length, results, scope: 'Actual helper in deterministic mocked event loop, not UIKit or reproduction of OS keyboard loss', SDK: 0, network: 0 }));
process.exitCode = results.every(r => r.passed) ? 0 : 1;
