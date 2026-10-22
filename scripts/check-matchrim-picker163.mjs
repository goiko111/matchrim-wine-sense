import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { nativeCataloguePage163 } from '../src/utils/nativeCataloguePage163.ts';
import { createGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103.ts';

const require = createRequire(import.meta.url), React = require('react'), ts = require('typescript');
const source = fs.readFileSync('src/components/wine-import/NativeGlobalCatalogue103.tsx', 'utf8');
const fixture = JSON.parse(fs.readFileSync('qa-fixtures/global103/winerim-public.observed.json')).vidure.wine;
const rows = Array.from({ length: 23 }, (_, i) => ({ ...fixture, id: i + 1, vintage: i < 20 ? null : '2022' }));
const walk = node => Array.isArray(node) ? node.flatMap(walk) : React.isValidElement(node) ? [node, ...walk(node.props.children)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children) : ['string', 'number'].includes(typeof node) ? String(node) : '';
const tick = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
function host(client) {
  const state = [], refs = [], effects = [], confirmations = [];
  let cursor = 0;
  const props = { candidate: { name: 'Vidure', producer: null, vintage: null }, contextKey: 'owner-a', disabled: false,
    profile: null, onConfirmed: value => confirmations.push(value) };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, AbortController,
    require(name) {
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'react') return {
        useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value; }]; },
        useRef(initial) { const i = cursor++; return refs[i] ||= { current: initial }; },
        useEffect(work, deps) { const i = cursor++, old = effects[i]; if (!old || deps.some((v, j) => v !== old.deps[j])) {
          old?.cleanup?.(); effects[i] = { deps, cleanup: work() };
        } },
      };
      if (name === 'lucide-react') return Object.fromEntries(['BookOpen', 'Check', 'ChevronLeft', 'ChevronRight', 'Loader2', 'Search', 'X'].map(k => [k, k]));
      if (name === 'react-router-dom') return { Link: 'a' };
      if (name.endsWith('/button')) return { Button: 'button' };
      if (name.endsWith('/input')) return { Input: 'input' };
      if (name.endsWith('/nativeCataloguePage163')) return { nativeCataloguePage163 };
      if (name.endsWith('/nativeGlobalCatalogue103')) return { createGlobalCatalogue103: () => client,
        applyGlobalCatalogue103: (value, profile, wine) => ({ ...value, globalRecord: wine }) };
      if (name.endsWith('/nativeCatalogAdmission97') || name.endsWith('/wineAffinityExplanation')) return {};
      throw Error('Unexpected import ' + name);
    },
  });
  const render = () => { cursor = 0; return exports.GlobalWinePicker103(props); };
  const elements = type => walk(render()).filter(node => node.type === type);
  const button = label => {
    const found = elements('button').filter(node => (node.props['aria-label'] || text(node).trim()) === label);
    assert.equal(found.length, 1, label); return found[0].props;
  };
  const submit = () => elements('form')[0].props.onSubmit({ preventDefault() {} });
  button('Buscar otra referencia en Winerim').onClick(); render();
  return { render, elements, button, submit, props, confirmations,
    unmount: () => effects.forEach(e => e?.cleanup?.()) };
}
let groups = 0;
const test = async (name, work) => { await work(); groups++; console.log('PASS', name); };
await test('Every observed ID is reachable exactly once without metadata deduplication', () => {
  const ids = [];
  for (let i = 0; i < 8; i++) ids.push(...nativeCataloguePage163(rows, 'all', i).rows.map(row => row.id));
  assert.deepEqual(ids, rows.map(row => row.id)); assert.equal(new Set(ids).size, 23);
  assert.equal(nativeCataloguePage163(rows, 'all', 999).current, 7);
  assert.equal(nativeCataloguePage163(rows, 'all', NaN).current, 0);
  assert.equal(nativeCataloguePage163([], 'all', 0).total, 0);
  assert.equal(nativeCataloguePage163(rows, 'invalid', 0).total, 0);
});
await test('Dated and undated references remain separate and filtering never changes rows', () => {
  const before = JSON.stringify(rows), dated = nativeCataloguePage163(rows, '2022', 0);
  assert.deepEqual(dated.rows.map(row => row.id), [21, 22, 23]);
  assert.deepEqual(dated.years, ['2022', 'undated']);
  assert.equal(nativeCataloguePage163(rows, 'undated', 0).total, 20);
  assert.equal(JSON.stringify(rows), before);
});
await test('Actual picker reaches page2 and a vintage from page2 of the real client contract', async () => {
  const calls = [];
  const client = createGlobalCatalogue103(async url => {
    calls.push(String(url)); const u = new URL(url);
    return Response.json(u.search ? { count: 23, page: Number(u.searchParams.get('page')), results: u.searchParams.get('page') === '1' ? rows.slice(0, 20) : rows.slice(20) } : rows[20]);
  });
  const h = host(client); assert.equal(calls.length, 0); h.submit(); await tick();
  assert.equal(calls.length, 2); assert(text(h.render()).includes('23 referencias'));
  assert.equal(h.button('Referencias anteriores').disabled, true);
  h.button('Referencias siguientes').onClick(); assert(text(h.render()).includes('Página 2 de 8'));
  const stale = h.elements('button').find(n => text(n).trim() === 'Esta es mi referencia').props.onClick;
  h.elements('select')[0].props.onChange({ target: { value: '2022' } }); h.render();
  stale(); await tick(); assert.equal(calls.length, 2, 'Old hidden row cannot verify');
  assert(text(h.render()).includes('3 referencias')); assert(text(h.render()).includes('tu añada se cambiará a 2022'));
  h.elements('button').find(n => text(n).trim() === 'Esta es mi referencia').props.onClick(); await tick();
  assert.equal(calls.length, 3); assert.equal(h.confirmations.length, 1);
  assert.equal(h.confirmations[0].vintage, 2022); assert.equal(h.confirmations[0].globalRecord.id, 21);
  h.unmount();
});
await test('Partial results are visible as incomplete, never a complete catalogue', async () => {
  const h = host({ searchProposals: async () => ({ status: 'partial', rows }) }); h.submit(); await tick();
  assert(text(h.render()).includes('Búsqueda incompleta')); assert.equal(h.confirmations.length, 0); h.unmount();
});
await test('Query change clears pages and ignores delayed results, preserving owner and cancellation guards', async () => {
  let resolve; const pending = new Promise(r => { resolve = r; });
  const h = host({ searchProposals: () => pending }); h.submit();
  h.elements('input')[0].props.onChange({ target: { value: 'Other' } }); h.render();
  resolve({ status: 'complete', rows }); await tick();
  assert(!text(h.render()).includes('23 referencias')); assert.equal(h.confirmations.length, 0); h.unmount();
});
await test('No confirmation after owner changes during independent detail verification', async () => {
  let resolve; const pending = new Promise(r => { resolve = r; });
  const h = host({ searchProposals: async () => ({ status: 'complete', rows }), confirmSelection: () => pending });
  h.submit(); await tick(); h.elements('button').find(n => text(n).trim() === 'Esta es mi referencia').props.onClick();
  h.props.contextKey = 'owner-b'; h.render(); resolve({ wine: rows[0] }); await tick();
  assert.equal(h.confirmations.length, 0); h.unmount();
});
console.log(JSON.stringify({ groups, realNetworkCalls: 0, modelStarts: 0, scope: 'Actual TSX handlers and actual bounded catalogue parser with controlled transport, not native visual QA' }));
