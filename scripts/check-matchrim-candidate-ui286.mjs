// Candidate recovery UI (286): actual TSX handlers with isolated hooks and controlled transports.
// No network, model, simulator or real user. Run: npx tsx scripts/check-matchrim-candidate-ui286.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { globalRecoveryQueries104 } from '../src/utils/globalWineProposals104.ts';
import * as recognition from '../src/utils/candidateRecognition286.ts';
import { wineYearRoles105 } from '../src/utils/wineYearRole105.ts';
import { suggestLocalOCRFragments108 } from '../src/utils/localOCRFragments108.ts';
const require = createRequire(import.meta.url), ts = require('typescript');
const React = require('react');
const source = fs.readFileSync('src/components/wine-import/CandidateRecovery286.tsx', 'utf8');
const row = (id, name, winery, vintage = null) => Object.freeze({ id, name, winery, slugname: `w-${id}`, vintage, subname: null,
  type: 'tinto', region: 'Ribera del Duero', country: 'ES', photo: `https://app.winerim.com/images/wines/${id}.png` });
const catalogue = [row(1, 'Pesquera Crianza', 'Tinto Pesquera', '2019'), row(2, 'Pesquera Reserva', 'Tinto Pesquera', '2018'),
  row(3, 'Pesquera Gran Reserva', 'Tinto Pesquera', '2016'), row(4, 'Viña Pedrosa Crianza', 'Pérez Pascuas', '2019')];
const box = (y, height = 0.05) => ({ x: 0.1, y, width: 0.6, height });
const reading = { lines: [{ text: 'PESOUERA', confidence: 0.9, box: box(0.1, 0.12) }, { text: 'CRIANZA', confidence: 1, box: box(0.4) },
  { text: '2019', confidence: 1, box: box(0.6) }, { text: 'RIBERA DEL DUERO', confidence: 1, box: box(0.7) }] };
const candidate = { id: 'local', name: 'Etiqueta por identificar', producer: null, vintage: null, evidence: reading.lines.map(l => l.text), source: 'label' };
const walk = node => Array.isArray(node) ? node.flatMap(walk) : React.isValidElement(node) ? [node, ...walk(node.props.children)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children)
  : typeof node === 'string' || typeof node === 'number' ? String(node) : '';
const tick = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
// Emulates the observed public search: every query word is a fragment of the name or winery.
const fold = value => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const search = calls => async query => { calls.push(query);
  const keys = fold(query).split(/[^a-z0-9]+/).filter(Boolean);
  return { status: 'complete', rows: catalogue.filter(r => keys.every(k => fold(`${r.name} ${r.winery}`).includes(k))) }; };

function host({ calls = [], confirm = async () => ({ wine: { id: 'store' } }), master = async () => ({ status: 'not-found' }), ownerId = 'owner1', input = candidate, local = reading } = {}) {
  const state = [], effects = [], refs = [], confirmations = [], masterCalls = [], storeCalls = [];
  const props = { candidate: input, contextKey: 'owner1-region1', disabled: false, reading: local, ownerId, profile: { potente: 3 },
    invoke: async () => { throw Error('invoke is only reached through resolveMasterCandidate259'); }, onConfirmed: value => confirmations.push(value) };
  let cursor = 0;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022 } }).outputText, { exports, AbortController, console, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react') return {
      useState(init) { const i = cursor++; if (!(i in state)) state[i] = init; return [state[i], v => { state[i] = typeof v === 'function' ? v(state[i]) : v; }]; },
      useRef(init) { const i = cursor++; return refs[i] ||= { current: init }; },
      useEffect(work, deps) { const i = cursor++, old = effects[i];
        if (!old || deps.some((d, index) => d !== old.deps[index])) { old?.cleanup?.(); effects[i] = { deps, cleanup: undefined }; effects[i].cleanup = work(); } },
    };
    if (name.endsWith('/button')) return { Button: 'button' };
    if (name.endsWith('/input')) return { Input: 'input' };
    if (name === 'lucide-react') return Object.fromEntries(['BookOpen', 'Check', 'Loader2', 'Search', 'X'].map(k => [k, k]));
    if (name.endsWith('/nativeGlobalCatalogue103')) return {
      createGlobalCatalogue103: () => ({ searchProposals: search(calls), confirmSelection: async (manual, picked, signal) => { storeCalls.push({ manual, picked }); return confirm(manual, picked, signal); } }),
      applyGlobalCatalogue103: (value, profile, wine, manual) => ({ ...value, globalRecord: wine, manual }) };
    if (name.endsWith('/globalWineProposals104')) return { globalRecoveryQueries104 };
    if (name.endsWith('/candidateRecognition286')) return recognition;
    if (name.endsWith('/nativeMasterLink259')) return { resolveMasterCandidate259: async (manual, invoke, signal, timeout, profile) => {
      masterCalls.push({ manual, profile }); return master(manual, signal); } };
    if (name.endsWith('/wineImage98')) return { safeWineImageUrl98: value => value };
    if (name.endsWith('/wineYearRole105')) return { wineYearRoles105 };
    if (name.endsWith('/localOCRFragments108')) return { suggestLocalOCRFragments108 };
    // 130: the pilot feedback link is a plain mailto anchor; checked in check-matchrim-pilot-feedback130.ts.
    if (name.endsWith('/PilotFeedback130')) return { PilotFeedback130: 'pilot-feedback130' };
    throw Error('UNEXPECTED_IMPORT:' + name);
  } });
  const render = () => { cursor = 0; return exports.CandidateRecovery286(props); };
  const buttons = name => walk(render()).filter(n => n.type === 'button' && text(n).trim() === name);
  const tree = () => text(render());
  return { props, render, tree, buttons, calls, confirmations, masterCalls, storeCalls, unmount: () => effects.forEach(e => e.cleanup?.()) };
}
let groups = 0;
const test = async (name, run) => { await run(); groups++; console.log('PASS', name); };

await test('Searches on its own with the text read, shows one leading wine, and links nothing without a tap', async () => {
  const h = host(); h.render(); await tick();
  assert(h.calls.length >= 1 && h.calls.length <= 7, 'bounded searches');
  assert(h.tree().includes('¿Es este tu vino?'), h.tree());
  assert(h.tree().includes('Pesquera Crianza') && h.tree().includes('Tinto Pesquera · 2019'));
  assert.equal(h.confirmations.length, 0);
  assert(h.tree().includes('No es este: ver otros candidatos'));
  h.unmount();
});
await test('A tap verifies against the Winerim master first and applies its reference', async () => {
  const masterCandidate = { id: 'local', canonicalId: 'mantalak-master:9', masterLink259: { wine: { mantalakWineId: 9 } } };
  const h = host({ master: async () => ({ status: 'reference-ready', candidate: masterCandidate }) }); h.render(); await tick();
  h.buttons('Sí, es este')[0].props.onClick(); await tick();
  assert.equal(h.masterCalls.length, 1);
  assert.equal(h.masterCalls[0].manual.name, 'Pesquera Crianza'); assert.equal(h.masterCalls[0].manual.producer, 'Tinto Pesquera');
  assert.equal(h.masterCalls[0].manual.vintage, 2019); assert.equal(h.masterCalls[0].manual.source, 'manual');
  assert.equal(h.storeCalls.length, 0); assert.deepEqual(h.confirmations, [masterCandidate]);
  h.unmount();
});
await test('Without a unique master match, or without a session, the public sheet is verified instead', async () => {
  for (const ownerId of ['owner1', null]) {
    const h = host({ ownerId }); h.render(); await tick();
    h.buttons('Sí, es este')[0].props.onClick(); await tick();
    assert.equal(h.masterCalls.length, ownerId ? 1 : 0);
    assert.equal(h.storeCalls.length, 1); assert.equal(h.storeCalls[0].picked.id, 1);
    assert.equal(h.confirmations.length, 1); assert.deepEqual(h.confirmations[0].globalRecord, { id: 'store' });
    h.unmount();
  }
  const failed = host({ confirm: async () => ({ status: 'ambiguous' }) }); failed.render(); await tick();
  failed.buttons('Sí, es este')[0].props.onClick(); await tick();
  assert.equal(failed.confirmations.length, 0); assert(failed.tree().includes('No hemos podido verificar esa ficha'));
  failed.unmount();
});
await test('Siblings without a clear lead are asked as "¿Es alguno de estos?" with up to three photos', async () => {
  const lines = [{ text: 'PESQUERA', confidence: 1, box: box(0.1, 0.12) }, { text: 'RIBERA DEL DUERO', confidence: 1, box: box(0.7) }];
  const h = host({ local: { lines }, input: { ...candidate, evidence: lines.map(l => l.text) } }); h.render(); await tick();
  assert(h.tree().includes('¿Es alguno de estos?'), h.tree());
  const cards = walk(h.render()).filter(n => n.props?.['data-testid'] === 'candidate286');
  assert(cards.length >= 2 && cards.length <= 3);
  assert(walk(h.render()).filter(n => n.type === 'img').length >= 2);
  assert.equal(h.confirmations.length, 0);
  h.unmount();
});
await test('Typed search uses only what the user wrote as query and keeps the reading for ranking', async () => {
  const h = host({ local: { lines: [{ text: '???', confidence: 0.2, box: box(0.1) }] }, input: { ...candidate, evidence: ['???'] } });
  h.render(); await tick();
  assert(h.tree().includes('Busca por nombre o bodega'));
  const field = walk(h.render()).find(n => n.type === 'input'); field.props.onChange({ target: { value: 'Pedrosa' } });
  const before = h.calls.length;
  walk(h.render()).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); await tick();
  assert.equal(h.calls[before], 'Pedrosa');
  assert(h.tree().includes('Viña Pedrosa Crianza'));
  h.unmount();
});
await test('Changing context or disabling aborts pending work; a stale answer is never applied', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const h = host({ master: async () => { await gate; return { status: 'reference-ready', candidate: { id: 'stale' } }; } });
  h.render(); await tick();
  h.buttons('Sí, es este')[0].props.onClick(); await tick();
  h.props.disabled = true; h.render(); release(); await tick();
  assert.equal(h.confirmations.length, 0);
  h.unmount();
});
await test('The scanner only uses it for an unidentified local label and accepts a master or verified public reference', () => {
  const scanner = fs.readFileSync('src/components/wine-import/MultiWineLabelScanner.tsx', 'utf8');
  assert.match(scanner, /fallback=\{localBatch && selectedCandidate\.source !== 'manual' && isPendingLocalIdentity109\(selectedCandidate\)\s*\? <CandidateRecovery286/);
  assert.match(scanner, /!\(nativeMasterLink259\(confirmed\) \|\| isGlobalWine103\(confirmed, confirmed\.globalRecord\)\)\) return region;/);
});
assert.equal(groups, 7);
console.log(JSON.stringify({ groups, liveCalls: 0, modelStarts: 0, scope: 'Actual TSX handlers with isolated hooks and controlled transports; not browser layout or native QA' }));
