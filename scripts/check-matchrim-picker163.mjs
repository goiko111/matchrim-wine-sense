import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { nativeCataloguePage163 } from '../src/utils/nativeCataloguePage163.ts';
import { createGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103.ts';
import { nativeSavedCatalogue168 } from '../src/utils/nativeSavedCatalogue168.ts';
import { nativeVerdictsSnapshot159 } from '../src/utils/nativeRescanVerdict159.ts';
import { isPendingLocalIdentity109 } from '../src/utils/nativeSingleLabel109.ts';
import { globalRecoveryQueries104 } from '../src/utils/globalWineProposals104.ts';

const require = createRequire(import.meta.url), React = require('react'), ts = require('typescript');
const source = fs.readFileSync('src/components/wine-import/NativeGlobalCatalogue103.tsx', 'utf8');
const fixture = JSON.parse(fs.readFileSync('qa-fixtures/global103/winerim-public.observed.json')).vidure.wine;
const rows = Array.from({ length: 23 }, (_, i) => ({ ...fixture, id: i + 1, vintage: i < 20 ? null : '2022' }));
const walk = node => Array.isArray(node) ? node.flatMap(walk) : React.isValidElement(node) ? [node, ...walk(node.props.children)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children) : ['string', 'number'].includes(typeof node) ? String(node) : '';
const tick = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
function host(client, deferEffects = false, initialName = 'Vidure') {
  const state = [], refs = [], effects = [], confirmations = [], pendingEffects = new Map();
  let cursor = 0, mounted = true, lateWrites = 0;
  const props = { candidate: { name: initialName, producer: null, vintage: null }, contextKey: 'owner-a', disabled: false,
    profile: null, onConfirmed: value => confirmations.push(value) };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, AbortController,
    require(name) {
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'react') return {
        useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { if (!mounted) lateWrites++; state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
        useRef(initial) { const i = cursor++; return refs[i] ||= { current: initial }; },
        useEffect(work, deps) { const i = cursor++, old = effects[i]; if (!old || deps.some((v, j) => v !== old.deps[j])) {
          if (deferEffects) pendingEffects.set(i, { deps, work });
          else { old?.cleanup?.(); effects[i] = { deps, cleanup: work() }; }
        } },
      };
      if (name === 'lucide-react') return Object.fromEntries(['BookOpen', 'Check', 'ChevronLeft', 'ChevronRight', 'Loader2', 'Search', 'X'].map(k => [k, k]));
      if (name === 'react-router-dom') return { Link: 'a' };
      if (name.endsWith('/button')) return { Button: 'button' };
      if (name.endsWith('/input')) return { Input: 'input' };
      if (name.endsWith('/nativeCataloguePage163')) return { nativeCataloguePage163 };
      if (name.endsWith('/nativeSavedCatalogue168')) return { nativeSavedCatalogue168 };
      if (name.endsWith('/nativeSingleLabel109')) return { isPendingLocalIdentity109 };
      if (name.endsWith('/globalWineProposals104')) return { globalRecoveryQueries104 };
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
  const flush = () => { for (const [i, next] of pendingEffects) {
    effects[i]?.cleanup?.(); effects[i] = { deps: next.deps, cleanup: next.work() };
  } pendingEffects.clear(); };
  button('Buscar otra referencia en Winerim').onClick(); render(); flush();
  return { render, elements, button, submit, props, confirmations,
    flush, lateWrites: () => lateWrites,
    unmount: () => { mounted = false; pendingEffects.clear(); effects.forEach(e => e?.cleanup?.()); } };
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
await test('Explicit server-page action keeps the same client and loads exactly one page, without auto-confirm', async () => {
  const all = Array.from({ length: 96 }, (_, i) => ({ ...fixture, id: i + 1, vintage: i < 20 ? null : '2022' }));
  const calls = [], client = createGlobalCatalogue103(async input => {
    const url = new URL(String(input)); calls.push(url.href); const number = Number(url.searchParams.get('page'));
    return Response.json({ count: 96, page: number, results: all.slice((number - 1) * 20, number * 20) });
  });
  const h = host(client); h.submit(); await tick(); assert.equal(calls.length, 1);
  assert(text(h.render()).includes('20 de 96 referencias cargadas'));
  const load = h.button('Cargar más referencias de Winerim'); assert.equal(load.disabled, false); load.onClick(); await tick();
  assert.equal(calls.length, 2); assert(text(h.render()).includes('40 de 96 referencias cargadas'));
  assert.equal(h.confirmations.length, 0); assert.equal(h.elements('select').find(n => n.props['aria-label'] === 'Filtrar por añada').props.children[1][0].props.value, '2022');
  h.unmount();
});
await test('Refinement uses literal OCR only, resets pagination, and does not send an implicit query', async () => {
  let calls = 0;
  const client = createGlobalCatalogue103(async () => { calls++; return Response.json({ count: 96, page: 1, results: rows.slice(0, 20) }); });
  const h = host(client); h.props.candidate.evidence = ['Cuvee Horizon', 'TREBBIANO', 'https://invalid.test', 'Independent Estate'];
  h.submit(); await tick();
  const select = h.elements('select').find(n => n.props['aria-label'] === 'Acotar con texto de la etiqueta');
  assert(select); assert(!text(select).includes('TREBBIANO')); assert(!text(select).includes('invalid.test'));
  select.props.onChange({ target: { value: 'Invented Wine' } }); assert.equal(h.elements('input')[0].props.value, 'Vidure');
  select.props.onChange({ target: { value: 'Cuvee Horizon' } }); assert.equal(h.elements('input')[0].props.value, 'Cuvee Horizon');
  assert(!text(h.render()).includes('20 de 96')); assert.equal(calls, 1); assert.equal(h.confirmations.length, 0); h.unmount();
});
await test('A delayed server page cannot leak after query or owner changes', async () => {
  for (const changed of ['query', 'owner']) {
    let resolve, calls = 0; const pending = new Promise(r => { resolve = r; });
    const client = createGlobalCatalogue103(async () => ++calls === 1 ? Response.json({ count: 96, page: 1, results: rows.slice(0, 20) }) : pending);
    const h = host(client); h.submit(); await tick(); h.button('Cargar más referencias de Winerim').onClick();
    if (changed === 'query') h.elements('input')[0].props.onChange({ target: { value: 'Other' } }); else h.props.contextKey = 'owner-b';
    h.render(); resolve(Response.json({ count: 96, page: 2, results: Array.from({ length: 20 }, (_, i) => ({ ...fixture, id: i + 21 })) })); await tick();
    assert(!text(h.render()).includes('40 de 96')); assert.equal(h.confirmations.length, 0); h.unmount();
  }
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
await test('Render-time owner and disabled guards precede deferred passive cleanup', async () => {
  for (const changed of ['owner', 'disabled']) {
    let resolve; const pending = new Promise(r => { resolve = r; });
    const h = host({ searchProposals: async () => ({ status: 'complete', rows }), confirmSelection: () => pending }, true);
    h.submit(); await tick(); h.elements('button').find(n => text(n).trim() === 'Esta es mi referencia').props.onClick();
    if (changed === 'owner') h.props.contextKey = 'owner-b'; else h.props.disabled = true;
    h.render(); resolve({ wine: rows[0] }); await tick();
    assert.equal(h.confirmations.length, 0, changed); h.flush(); h.unmount();
  }
});
await test('Cancel followed immediately by a fresh request cannot inherit the old response', async () => {
  let resolveOld, resolveNew, calls = 0;
  const old = new Promise(r => { resolveOld = r; }), newer = new Promise(r => { resolveNew = r; });
  const h = host({ searchProposals: () => ++calls === 1 ? old : newer });
  h.submit(); h.button('Cancelar').onClick(); h.submit();
  resolveOld({ status: 'complete', rows }); await tick();
  assert(!text(h.render()).includes('23 referencias')); assert.equal(h.button('Buscar').disabled, true);
  resolveNew({ status: 'complete', rows: [rows[22]] }); await tick();
  assert(text(h.render()).includes('1 referencia')); assert(!text(h.render()).includes('1 referencias')); assert.equal(h.button('Buscar').disabled, false); h.unmount();
});
await test('Unmount while detail is pending cannot confirm or write state', async () => {
  let resolve; const pending = new Promise(r => { resolve = r; });
  const h = host({ searchProposals: async () => ({ status: 'complete', rows }), confirmSelection: () => pending });
  h.submit(); await tick(); h.elements('button').find(n => text(n).trim() === 'Esta es mi referencia').props.onClick();
  h.unmount(); resolve({ wine: rows[0] }); await tick();
  assert.equal(h.confirmations.length, 0); assert.equal(h.lateWrites(), 0);
});
await test('Saved exact public ID is first without dropping duplicate rows or bypassing detail', async () => {
  const picked = [], target = rows[22];
  const bottle = { name: target.name, producer: target.winery, vintage: 2022, region: target.region ?? null, country: target.country ?? null };
  const snapshot = nativeVerdictsSnapshot159('owner-a', [{ ...bottle, id: 'saved', user_id: 'owner-a', rating: 'love', sensory_attributes: null,
    place_details: { winerim_public_catalogue: { version: 1, namespace: 'winerim-public-store', id: target.id,
      slug: target.slugname, catalogue_vintage: '2022', bottle_identity: bottle } } }], 1);
  const h = host({ searchProposals: async () => ({ status: 'complete', rows }),
    confirmSelection: async (_, selected) => { picked.push(selected); return { wine: selected }; } });
  h.props.ownerId = 'owner-a'; h.props.savedVerdicts = snapshot; h.render(); h.submit(); await tick();
  assert.equal(walk(h.render()).filter(n => n.type === 'p' && text(n) === 'Ya en tu Bodega').length, 1);
  assert(text(h.render()).includes('23 referencias')); assert.equal(picked.length, 0);
  h.elements('button').find(n => text(n).trim() === 'Esta es mi referencia').props.onClick(); await tick();
  assert.equal(picked[0], target); assert.equal(h.confirmations[0].globalRecord.id, 23); h.unmount();
});
await test('Owner/saved-snapshot render changes veto late verification even before effect cleanup', async () => {
  for (const changed of ['ownerId', 'savedVerdicts']) {
    let resolve; const pending = new Promise(r => { resolve = r; });
    const h = host({ searchProposals: async () => ({ status: 'complete', rows }), confirmSelection: () => pending }, true);
    h.submit(); await tick(); h.elements('button').find(n => text(n).trim() === 'Esta es mi referencia').props.onClick();
    if (changed === 'ownerId') h.props.ownerId = 'other'; else h.props.savedVerdicts = nativeVerdictsSnapshot159('other', [], 0);
    h.render(); resolve({ wine: rows[0] }); await tick(); assert.equal(h.confirmations.length, 0); h.flush(); h.unmount();
  }
});
await test('A refreshed saved snapshot releases busy state without reusing a stale search', async () => {
  let resolve; const old = new Promise(r => { resolve = r; });
  const h = host({ searchProposals: () => old }, true); h.submit();
  assert.equal(h.button('Buscar').disabled, true);
  h.props.savedVerdicts = nativeVerdictsSnapshot159('owner-a', [], 0); h.render(); h.flush();
  assert.equal(h.button('Buscar').disabled, false);
  resolve({ status: 'complete', rows }); await tick();
  assert(!text(h.render()).includes('23 referencias')); h.unmount();
});
await test('Unidentified sentinel is not a search query and proper names are not autocorrected', () => {
  for (const name of ['Etiqueta por identificar', '  ETIQUETA  POR IDENTIFICAR ', '']) {
    const h = host({ searchProposals: () => { throw Error('No implicit request'); } }, false, name);
    const input = h.elements('input')[0].props;
    assert.equal(input.value, ''); assert.equal(h.button('Buscar').disabled, true);
    assert.equal(input.autoCorrect, 'off'); assert.equal(input.autoCapitalize, 'none'); assert.equal(input.spellCheck, false); h.unmount();
  }
});
await test('Search stays alongside input and dismisses keyboard before starting retrieval', async () => {
  const order = [], h = host({ searchProposals: async () => { order.push('search'); return { status: 'complete', rows: [] }; } });
  const input = h.elements('input')[0];
  assert.equal(input.props.enterKeyHint, 'search');
  input.ref.current = { blur: () => order.push('blur') };
  assert(h.elements('form')[0].props.className.includes('items-end'));
  assert.equal(h.button('Buscar')['aria-label'], 'Buscar');
  assert.equal(h.button('Buscar').title, 'Buscar');
  h.submit(); await tick(); assert.deepEqual(order, ['blur', 'search']); h.unmount();
});
console.log(JSON.stringify({ groups, realNetworkCalls: 0, modelStarts: 0, scope: 'Actual TSX handlers and actual bounded catalogue parser with controlled transport, not native visual QA' }));
