import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { globalRecoveryQueries104, rankGlobalProposals104 } from '../src/utils/globalWineProposals104.ts';
const require = createRequire(import.meta.url), ts = require('typescript');
const React = require('react');
const source = fs.readFileSync('src/components/wine-import/GlobalWineRecovery104.tsx', 'utf8');
const row = JSON.parse(fs.readFileSync('qa-fixtures/global103/winerim-public.observed.json')).vidure.wine;
const candidate = { id: 'local', name: 'Vidure', producer: null, vintage: 2020, grapes: ['Wrong grape'], alcohol: 17, evidence: ['VIDURE', '2020'], source: 'label' };
const walk = node => Array.isArray(node) ? node.flatMap(walk) : React.isValidElement(node) ? [node, ...walk(node.props.children)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children) : typeof node === 'string' ? node : '';
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function host(client, input = candidate) {
  const state = [], effects = [], refs = [], confirmations = [], props = { candidate: input, contextKey: 'owner1-region1-profile1',
    disabled: false, profile: { potente: 3 }, onConfirmed: value => confirmations.push(value) };
  let cursor = 0;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, AbortController, console,
    require(name) {
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'react') return {
        useState(init) { const i = cursor++; if (!(i in state)) state[i] = init; return [state[i], v => { state[i] = v; }]; },
        useRef(init) { const i = cursor++; return refs[i] ||= { current: init }; },
        useEffect(work, deps) { const i = cursor++, old = effects[i]; if (!old || deps.some((d, index) => d !== old.deps[index])) {
          old?.cleanup?.(); effects[i] = { deps, cleanup: work() };
        } },
      };
      if (name.endsWith('/button')) return { Button: 'button' };
      if (name === 'lucide-react') return Object.fromEntries(['BookOpen', 'Check', 'Loader2', 'X'].map(k => [k, k]));
      if (name.endsWith('/nativeGlobalCatalogue103')) return { createGlobalCatalogue103: () => client,
        independentGlobalProducer103: () => false,
        applyGlobalCatalogue103: (value, profile, wine, manual) => ({ ...value, globalRecord: wine, appliedProfile: profile, manual }) };
      if (name.endsWith('/nativeCatalogAdmission97')) return { canAdmitNativeCatalogLookup97: () => false };
      if (name.endsWith('/globalWineProposals104')) return { globalRecoveryQueries104, rankGlobalProposals104 };
      if (name.endsWith('/wineImage98')) return { safeWineImageUrl98: value => value };
      throw Error('UNEXPECTED_IMPORT:' + name);
    },
  });
  const render = () => { cursor = 0; return exports.GlobalWineRecovery104(props); };
  const button = name => { const b = walk(render()).find(n => n.type === 'button' && text(n).trim() === name); assert(b, name); return b.props; };
  return { props, render, button, confirmations, unmount: () => effects.forEach(e => e.cleanup?.()) };
}
let groups = 0;
const test = async (name, run) => { await run(); groups++; console.log('PASS', name); };
await test('No catalogue query on render; missing producer offers explicit choice without affinity', async () => {
  const calls = [];
  const h = host({ search: async query => { calls.push(query); return { rows: [row], status: 'complete' }; }, lookup: () => { throw Error('No automatic lookup'); } });
  assert.equal(calls.length, 0); h.render(); assert.equal(calls.length, 0);
  h.button('Encontrar mi vino en Winerim').onClick(); await tick();
  assert.deepEqual(calls, ['Vidure']); assert.equal(h.confirmations.length, 0);
  assert(text(h.render()).includes('Comprueba la bodega'));
  assert(!text(h.render()).includes('%')); h.unmount();
});
await test('Explicit choice verifies its ID, preserves photographed vintage for NV and current profile', async () => {
  const calls = [];
  const h = host({ search: async () => ({ rows: [row], status: 'partial' }), confirmSelection: async (...args) => { calls.push(args); return { status: 'reference', wine: row }; } });
  h.button('Encontrar mi vino en Winerim').onClick(); await tick();
  h.button('Confirmar esta referencia').onClick(); await tick();
  assert.equal(calls.length, 1); assert.equal(calls[0][1], row);
  assert.equal(calls[0][0].vintage, 2020); assert.equal(calls[0][0].source, 'manual');
  assert.equal(h.confirmations.length, 1); assert.equal(h.confirmations[0].manual, true);
  assert.equal(h.confirmations[0].alcohol, null); assert.deepEqual(Array.from(h.confirmations[0].grapes), []);
  assert.equal(h.confirmations[0].appliedProfile, h.props.profile); h.unmount();
});
await test('A grape spelling proposal warns explicitly and never creates an automatic affinity', async () => {
  const grape = { ...row, name: 'Ghost Block Cabernet Sauvignon', winery: 'Ghost Block' };
  const h = host({ search: async () => ({ rows: [grape], status: 'complete' }) }, {
    ...candidate, name: 'Ghost Block', evidence: ['GHOST BLOCK', 'CABERNET SALVIGNON'],
  });
  h.button('Encontrar mi vino en Winerim').onClick(); await tick();
  assert(text(h.render()).includes('La lectura de la uva puede contener una errata'));
  assert(text(h.render()).includes('Confirmar esta referencia')); assert.equal(h.confirmations.length, 0); h.unmount();
});
await test('Cancellation suppresses late adapter responses even when abort is ignored; retry works', async () => {
  const wait = deferred(); let first = true;
  const h = host({ search: () => first ? (first = false, wait.promise) : Promise.resolve({ rows: [row], status: 'complete' }) });
  h.button('Encontrar mi vino en Winerim').onClick();
  h.button('Cancelar').onClick(); wait.resolve({ rows: [row], status: 'complete' }); await tick();
  assert(text(h.render()).includes('Búsqueda cancelada'));
  assert(!text(h.render()).includes('Confirmar esta referencia')); assert.equal(h.confirmations.length, 0);
  h.button('Encontrar mi vino en Winerim').onClick(); await tick(); assert(text(h.render()).includes('Confirmar esta referencia')); h.unmount();
});
await test('Owner/profile/region changes and unmount cannot receive stale verification', async () => {
  for (const change of ['context', 'disabled', 'unmount']) {
    const wait = deferred();
    const h = host({ search: async () => ({ rows: [row], status: 'complete' }), confirmSelection: () => wait.promise });
    h.button('Encontrar mi vino en Winerim').onClick(); await tick(); h.button('Confirmar esta referencia').onClick();
    if (change === 'context') h.props.contextKey = 'other-owner-region-profile';
    if (change === 'disabled') h.props.disabled = true;
    if (change === 'unmount') h.unmount(); else h.render();
    wait.resolve({ wine: row }); await tick(); assert.equal(h.confirmations.length, 0, change); h.unmount();
  }
});
await test('Unavailable and rejected detail leave wine unchanged; no model retry', async () => {
  const offline = host({ search: async () => ({ rows: [], status: 'unavailable' }) });
  offline.button('Encontrar mi vino en Winerim').onClick(); await tick(); assert(text(offline.render()).includes('No podemos conectar')); assert.equal(offline.confirmations.length, 0); offline.unmount();
  const changed = host({ search: async () => ({ rows: [row], status: 'complete' }), confirmSelection: async () => ({ status: 'ambiguous' }) });
  changed.button('Encontrar mi vino en Winerim').onClick(); await tick(); changed.button('Confirmar esta referencia').onClick(); await tick();
  assert(text(changed.render()).includes('Tu vino no ha cambiado')); assert.equal(changed.confirmations.length, 0); changed.unmount();
});
await test('Actual scanner confirmation enables saving and clears obsolete errors, but rejects stale regions', () => {
  const scanner = fs.readFileSync('src/components/wine-import/MultiWineLabelScanner.tsx', 'utf8');
  const ast = ts.createSourceFile('scanner.tsx', scanner, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  const visit = node => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'GlobalWineRecovery104') callback = node.attributes.properties.find(a => a.name?.getText(ast) === 'onConfirmed').initializer.expression.getText(ast);
    ts.forEachChild(node, visit);
  }; visit(ast); assert(callback);
  for (const scenario of ['valid', 'owner-change', 'discarded', 'candidate-change', 'forged']) {
    const selectedCandidate = { ...candidate }, selectedRegion = { id: 'r1' };
    const manualLookupContext = { owner: 'owner1', candidate: selectedCandidate };
    const manualLookupKey = JSON.stringify(manualLookupContext);
    const original = { id: 'r1', status: scenario === 'discarded' ? 'discarded' : 'uncertain', error: 'old-error', fallback: { message: 'old' }, selectedCandidateId: 'local',
      candidates: [{ ...selectedCandidate, ...(scenario === 'candidate-change' ? { name: 'another' } : {}) }] };
    const confirmed = { ...candidate, source: 'manual', globalRecord: { id: 1 } };
    let actual = original; const exports = {};
    vm.runInNewContext(ts.transpileModule('exports.handler = ' + callback + ';', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, selectedCandidate, selectedRegion, manualLookupContext, manualLookupKey,
      currentManualLookupKey: { current: scenario === 'owner-change' ? 'other' : manualLookupKey },
      updateRegion: (id, update) => { assert.equal(id, 'r1'); actual = update(actual); },
      isGlobalWine103: value => scenario !== 'forged' && value === confirmed,
    });
    exports.handler(confirmed);
    if (scenario === 'valid') { assert.equal(actual.status, 'recognized'); assert.equal(actual.error, null); assert.equal(actual.fallback, null); assert.equal(actual.candidates[0], confirmed); }
    else assert.equal(actual, original, scenario);
  }
});
console.log(JSON.stringify({ groups, source: 'Actual TSX handlers with isolated hooks/transport; not browser layout or native QA', liveCalls: 0, modelStarts: 0 }));
