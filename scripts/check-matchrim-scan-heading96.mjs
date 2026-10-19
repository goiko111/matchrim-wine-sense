import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { restoreMenuResultsGuard96, restoreMenuResultsPackage96 } from './matchrim-menu-results-first96-scope.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = 'df2d5b168515b59931c3360597a07d9a1f38e4f0';
const hubFile = 'src/components/wine-import/ScanHub.tsx';
const scanFile = 'src/pages/Scan.tsx';
const svgGuard = 'scripts/check-matchrim-scan-hub-svg96.mjs';
const lookupGuard = 'scripts/check-matchrim-manual-lookup-bridge96.mjs';
const read = file => readFileSync(path.join(root, file), 'utf8');
const previous = file => execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, encoding: 'utf8' });
const oldHeading = '<h2 id="more-scan-options-title" className="text-sm font-bold text-slate-950">También puedes</h2>';
const newHeading = `<h2 id="more-scan-options-title" className="text-sm font-bold text-slate-950" style={isNative ? { minHeight: 44 } : undefined} aria-label={isNative ? "También puedes" : undefined}>
            {isNative ? <span aria-hidden="true">También puedes</span> : "También puedes"}
          </h2>`;
const once = (source, from, to) => {
  assert.equal(source.split(from).length, 2, 'Exactly one named-heading amendment');
  return source.replace(from, to);
};

export function restoreNativeScanHeading96(file, source) {
  if (file !== hubFile) return source;
  if (source === previous(file)) return source;
  const restored = once(source, newHeading, oldHeading);
  assert.equal(restored, previous(file), 'Whole df2 Hub, not an arbitrary heading exemption');
  return restored;
}

// These are the only historical-guard edits. Every other assertion remains byte-exact.
const guardEdits = {
  [svgGuard]: [
    ["import { restoreNativeScanHeading96, restoreNativeHeadingTree96 } from './check-matchrim-scan-heading96.mjs';\n", ''],
    ['  source = restoreNativeScanHeading96(file, source);\n', ''],
    ['  restoreNativeHeadingTree96(copy);\n', ''],
  ],
  [lookupGuard]: [
    ["import { restoreNativeHeadingGuard96 } from './check-matchrim-scan-heading96.mjs';\n", ''],
    ["  if (kind === 'guard') source = restoreNativeHeadingGuard96(file, source);\n", ''],
    ["  const source = restoreNativeHeadingGuard96(row.file, readFileSync(resolve(root, row.file), 'utf8'));", "  const source = readFileSync(resolve(root, row.file), 'utf8');"],
  ],
};
export function restoreNativeHeadingGuard96(file, source) {
  source = restoreMenuResultsGuard96(file, source);
  const edits = guardEdits[file];
  if (!edits) return source;
  const before = previous(file);
  // Older layers also supply their already-restored a625/e3fd guard sources.
  if (!source.includes(edits[0][0])) return source;
  for (const [from, to] of edits) source = once(source, from, to);
  assert.equal(source, before, 'Every historical guard byte retained: ' + file);
  return source;
}
const walk = tree => tree.flatMap(node => typeof node === 'string' ? [] : [node, ...walk(node.children)]);
const heading = tree => {
  const matches = walk(tree).filter(node => node.attrs.id === 'more-scan-options-title');
  assert.equal(matches.length, 1);
  return matches[0];
};
function assertNativeHeading(tree) {
  const node = heading(tree);
  assert.equal(node.tag, 'h2', 'Implicit heading level2 retained');
  assert.deepEqual(Object.keys(node.attrs).sort(), ['aria-label', 'className', 'id', 'style']);
  assert.equal(node.attrs['aria-label'], 'También puedes');
  assert.equal(node.attrs.className, 'text-sm font-bold text-slate-950');
  assert.equal(JSON.stringify(node.attrs.style), '{"minHeight":44}');
  assert.equal(node.children.length, 1);
  const child = node.children[0];
  assert.equal(child.tag, 'span');
  assert.deepEqual(Object.keys(child.attrs), ['aria-hidden']);
  assert.equal(String(child.attrs['aria-hidden']), 'true');
  assert.equal(JSON.stringify(child.children), '["También puedes"]');
  return node;
}
export function restoreNativeHeadingTree96(tree) {
  const node = assertNativeHeading(tree);
  delete node.attrs.style;
  delete node.attrs['aria-label'];
  node.children = ['También puedes'];
  return tree;
}

export function runNativeScanHeading96Checks() {
  const require = createRequire(path.join(root, 'package.json'));
  const ts = require('typescript');
  const React = require('react');
  const icons = require('lucide-react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const fixture = previous(svgGuard);
  const parsed = ts.createSourceFile(svgGuard, fixture, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const functions = new Map();
  const find = node => {
    if (ts.isFunctionDeclaration(node) && ['mount', 'html'].includes(node.name?.text)) functions.set(node.name.text, node.getText(parsed));
    ts.forEachChild(node, find);
  };
  find(parsed); assert.equal(functions.size, 2, 'Reuse the exact existing actual-render fixture');
  const nativeSupport = ['src/components/MobileBottomNav.tsx', 'src/components/AiRimMark.tsx'];
  const support = Object.fromEntries(nativeSupport.map(file => [file, read(file)]));
  const deny = () => { throw new Error('No transport/selected scanner in heading source fixture'); };
  const context = vm.createContext({ React, ts, icons, renderToStaticMarkup, assert, vm, URLSearchParams, scanFile, hubFile, nativeSupport, support, deny });
  vm.runInContext(`${functions.get('mount')}\n${functions.get('html')}\nthis.fixture96 = { mount, html };`, context, { timeout: 3000 });
  const { mount, html } = context.fixture96;
  const before = Object.fromEntries([hubFile, scanFile].map(file => [file, previous(file)]));
  const actual = Object.fromEntries([hubFile, scanFile].map(file => [file, read(file)]));
  const groups = [];
  const check = (name, action) => { action(); groups.push(name); };
  const buttons = tree => walk(tree).filter(node => node.tag === 'button');
  const actionShape = tree => buttons(tree).map(({ tag, attrs, children }) => ({ tag, attrs: Object.fromEntries(Object.entries(attrs).filter(([, value]) => typeof value !== 'function')), children }));
  check('one combined heading amendment, complete Hub inverse and untouched Scan host', () => {
    assert.equal(restoreNativeScanHeading96(hubFile, actual[hubFile]), before[hubFile]);
    assert.equal(actual[scanFile], before[scanFile]);
  });
  check('actual native h2 keeps level2/name/44 style and only its visible span is AX-hidden', () => {
    assertNativeHeading(mount(actual, true).scan());
    assertNativeHeading(mount(actual, true).hub({ isNative: true }));
  });
  check('actual full web DOM byte-exact for owner/anonymous and Hub omitted/false opt-outs', () => {
    for (const owner of [null, 'synthetic-owner']) {
      const tree = mount(actual, false, owner).scan(), node = heading(tree);
      assert.equal(html(tree), html(mount(before, false, owner).scan()));
      assert.equal(node.attrs.style, undefined); assert.equal(node.attrs['aria-label'], undefined);
      assert.equal(JSON.stringify(node.children), '["También puedes"]');
    }
    for (const native of [false, true]) for (const props of [{}, { isNative: false }]) {
      assert.equal(html(mount(actual, native).hub(props)), html(mount(before, native).hub(props)));
    }
  });
  check('native full DOM changes only the combined heading; all12 SVGs/actions preserved', () => {
    const tree = mount(actual, true).scan();
    assert.equal(html(restoreNativeHeadingTree96(tree)), html(mount(before, true).scan()));
    assert.equal(buttons(tree).flatMap(node => walk([node])).filter(node => node.tag === 'svg' && String(node.attrs['aria-hidden']) === 'true').length, 12);
    assert.equal(JSON.stringify(actionShape(tree)), JSON.stringify(actionShape(mount(before, true).scan())));
  });
  check('all six handlers and selected/legacy mode branches remain current and unchanged', () => {
    const observed = [];
    for (const files of [before, actual]) {
      const rendered = mount(files, true);
      for (const action of buttons(rendered.scan())) action.attrs.onClick();
      observed.push(JSON.stringify({ routes: rendered.routes, events: rendered.events, updates: rendered.updates }));
    }
    assert.equal(observed[0], observed[1]);
    for (const variant of ['selected', 'legacy']) for (const initialMode of ['label', 'wine-menu', 'food-menu', 'dish', 'shop-link']) {
      const props = { variant, initialMode, isNative: true };
      assert.equal(html(mount(actual, true).hub(props)), html(mount(before, true).hub(props)));
    }
  });
  const mutations = [];
  check('directed heading/web/control render mutations reject, not merely changed bytes', () => {
    const negatives = [
      [newHeading.replace('minHeight: 44', 'minHeight: 43'), 'native43'],
      [newHeading.replace('<h2 ', '<h3 ').replace('</h2>', '</h3>'), 'wrong level'],
      [newHeading.replace('<h2 ', '<h2 aria-hidden="true" '), 'hidden heading'],
      [newHeading.replace('<h2 ', '<h2 role="button" '), 'interactive heading'],
      [newHeading.replace('<h2 ', '<h2 tabIndex={0} '), 'focusable heading'],
      [newHeading.replace('<span aria-hidden="true">', '<span aria-hidden="true" onClick={() => undefined}>'), 'interactive child'],
      [newHeading.replace('<span aria-hidden="true">', '<span>'), 'duplicate exposed text'],
      [newHeading.replace('"También puedes" : undefined', '"Otro nombre" : undefined'), 'wrong accessible name'],
      [newHeading.replace('>También puedes</span>', '>Otro texto</span>'), 'changed visible text'],
      [newHeading.replace('id="more-scan-options-title"', 'id="wrong-heading-target"'), 'wrong target'],
      [newHeading.replace(': undefined}', ': { minHeight: 44 }}'), 'web style leak'],
      [newHeading.replace(': "También puedes"}', ': <span>También puedes</span>}'), 'web child changed'],
    ];
    for (const [replacement, name] of negatives) {
      const source = once(actual[hubFile], newHeading, replacement), files = { ...actual, [hubFile]: source };
      assert.throws(() => {
        assertNativeHeading(mount(files, true).scan());
        assert.equal(html(mount(files, false).scan()), html(mount(before, false).scan()));
      }, undefined, name);
      assert.throws(() => restoreNativeScanHeading96(hubFile, source)); mutations.push(name);
    }
    const hiddenControl = once(actual[hubFile], 'key={option.id}\n                type="button"', 'key={option.id}\n                type="button" aria-hidden="true"');
    assert.notEqual(hiddenControl, actual[hubFile]);
    assert.throws(() => assert.equal(JSON.stringify(actionShape(mount({ ...actual, [hubFile]: hiddenControl }, true).scan())), JSON.stringify(actionShape(mount(before, true).scan()))));
    assert.throws(() => restoreNativeScanHeading96(hubFile, hiddenControl)); mutations.push('hidden control');
  });
  let sourceGuardNegatives = 0;
  check('whole historical guard inverses and old-assertion mutation negatives remain enforced', () => {
    for (const file of Object.keys(guardEdits)) {
      const current = read(file);
      assert.ok(current.includes(guardEdits[file][0][0]), 'Actual new guard bridge required');
      assert.equal(restoreNativeHeadingGuard96(file, current), previous(file));
      const changed = current.replace('assert.equal(', 'assert.notEqual(');
      assert.notEqual(changed, current);
      assert.throws(() => restoreNativeHeadingGuard96(file, changed)); sourceGuardNegatives++;
    }
    const wrongBridge = read(svgGuard).replace('restoreNativeHeadingTree96(copy);', 'restoreNativeHeadingTree96(nativeBefore);');
    assert.throws(() => restoreNativeHeadingGuard96(svgGuard, wrongBridge)); sourceGuardNegatives++;
    const oldCommands = JSON.parse(previous('package.json')).scripts['test:closure96'];
    assert.equal(JSON.parse(restoreMenuResultsPackage96(read('package.json'))).scripts['test:closure96'], oldCommands + ' && node scripts/check-matchrim-scan-heading96.mjs');
  });
  return { passed: groups.length, failed: 0, groups, rejectedMutations: mutations.length, sourceGuardNegatives,
    wholeFileInverse: true, webDOMByteExact: true, currentHandlersPreserved: true, externalCalls: 0, SDK: 0,
    audit: 'SOURCE_CANDIDATE_ONLY_ORIGINAL_AND_MINHEIGHT_ONLY_FAIL_RETAINED',
    limits: 'Actual React/Hub/Scan/Lucide render with existing controlled hooks/router, not WK AX/name/level exposure, physical44, UIKit, VoiceOver or cause proof.' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(runNativeScanHeading96Checks()));
