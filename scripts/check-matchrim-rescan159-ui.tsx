import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { NativeAffinitySummary } from '../src/components/NativeAffinitySummary';
import * as scan from '../src/utils/multiWineScan';
import * as consumer from '../src/utils/multiWineConsumer95';
import * as progress from '../src/utils/scanRegionProgress';
import * as pins from '../src/utils/screenOverlayPins';
import * as notice from '../src/utils/manualWineIdentityNotice';
import * as global from '../src/utils/nativeGlobalCatalogue103';
import * as master from '../src/utils/nativeMasterCatalog102';
import * as single from '../src/utils/nativeSingleLabel109';
import * as verdicts from '../src/utils/nativeRescanVerdict159';

const file = 'src/components/wine-import/MultiWineLabelScanner.tsx';
// tsx uses classic JSX for imported components under the repository's root config.
Object.assign(globalThis, { React });
const current = fs.readFileSync(file, 'utf8');
const before = execFileSync('git', ['show', '233442a:' + file], { encoding: 'utf8' });
globalThis.fetch = async () => { throw Error('NO_LIVE_NETWORK'); };
const observed = JSON.parse(fs.readFileSync('qa-fixtures/global103/winerim-public.observed.json', 'utf8')).vidure.wine;
const profile = { potente: 4, acidez: 3, dulce: 1, tanico: 3, afrutado: 4 };
const original: scan.WineCandidate = { id: 'synthetic-159', name: 'Vidure', producer: 'Pago de Cirsus', vintage: 2020,
  region: null, country: null, grapes: [], alcohol: null, confidence: .8, source: 'label',
  evidence: ['Vidure', 'Pago de Cirsus', '2020'], uncertaintyReasons: [], inferredFields: [] };
const row = { ...observed, vintage: '2020' };
const lookup = await global.createGlobalCatalogue103(async url => Response.json(String(url).includes('?')
  ? { count: 1, page: 1, results: [row] } : row)).lookup(original);
assert('wine' in lookup);
const candidate = global.applyGlobalCatalogue103(original, profile, lookup.wine);
const saved = { id: 'synthetic-cellar159', user_id: 'owner-a', name: lookup.wine.name,
  producer: lookup.wine.producer, vintage: 2020, region: lookup.wine.region, country: lookup.wine.country,
  rating: 'not_for_me', place_details: null };
const region: scan.ScanRegion = { id: 'region-a', index: 1, objectType: 'bottle',
  box: { x: 10, y: 10, width: 40, height: 50 }, detectionConfidence: .9,
  quality: { glare: 'low', occlusion: 'low', legibility: 'good' }, status: 'recognized',
  candidates: [candidate], selectedCandidateId: candidate.id, duplicateCount: 1,
  cropDataUrl: 'data:image/png;base64,synthetic' };
type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };
const walk = (value: unknown): Element[] => Array.isArray(value) ? value.flatMap(walk)
  : value && typeof value === 'object' && 'type' in value && 'props' in value
    ? [value as Element, ...walk((value as Element).props.children)] : [];
const render = (source: string, native: boolean, overrides: Record<string, unknown> = {}, owner = 'owner-a') => {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.initializer
      && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(ast) === 'useState') {
      names.push(node.name.elements[0].getText(ast));
    }
    ts.forEachChild(node, visit);
  }; visit(ast);
  const state: Record<string, unknown> = { preview: 'data:image/png;base64,synthetic', quality: {
    width: 800, height: 1000, megapixels: .8, brightness: 120, contrast: 40, warnings: [] },
    scanProfile: { profile, note: 'Synthetic profile159' }, regions: [region],
    coverage: { status: 'complete', detectedObjects: 1, estimatedVisibleObjects: 1, confidence: .8, notes: [] },
    selectedRegionId: region.id, phase: 'ready', analysisProgress: 100, nativeResultView: 'wines',
    nativeVerdicts: verdicts.nativeVerdictsSnapshot159('owner-a', [saved], 1), ...overrides };
  let slot = 0;
  const inert = new Proxy({}, { get: (_, name) => () => { throw Error('Unexpected service: ' + String(name)); } });
  const components = new Proxy({}, { get: (_, name) => String(name) });
  const sandbox = { exports: {}, console, DOMException, AbortController, navigator: { onLine: true },
    require: (name: string) => {
      if (name === 'react/jsx-runtime') return jsx;
      if (name === 'react') return { useState: (initial: unknown) => {
        const key = names[slot++]; assert(key);
        if (!(key in state)) state[key] = typeof initial === 'function' ? initial() : initial;
        return [state[key], () => { throw Error('No UI mutation in render test'); }];
      }, useMemo: (body: () => unknown) => body(), useRef: (value: unknown) => ({ current: value }),
      useEffect() {}, useLayoutEffect() {} };
      if (name === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
      if (name === '@/contexts/AuthContext') return { useAuth: () => ({ user: owner ? { id: owner } : null }) };
      if (name === '@/hooks/useOverlayViewport') return { useOverlayViewport: () => ({ ref: null, viewport: { width: 390, height: 500 } }) };
      if (name === '@/utils/multiWineScan') return scan;
      if (name === '@/utils/multiWineConsumer95') return consumer;
      if (name === '@/utils/scanRegionProgress') return progress;
      if (name === '@/utils/screenOverlayPins') return pins;
      if (name === '@/utils/manualWineIdentityNotice') return notice;
      if (name === '@/utils/nativeGlobalCatalogue103') return global;
      if (name === '@/utils/nativeMasterCatalog102') return master;
      if (name === '@/utils/nativeSingleLabel109') return single;
      if (name === '@/utils/nativeRescanVerdict159') return verdicts;
      if (name === '@/utils/nativeOCR106') return { localOCRAvailable106: () => false };
      if (name === '@/utils/matchrimQaMode') return { isMatchrimFixtureQaEnabled: false };
      if (name === '@/components/NativeAffinitySummary') return { NativeAffinitySummary };
      if (name.startsWith('@/components/') || name === 'lucide-react') return components;
      return inert;
    } };
  vm.runInNewContext(ts.transpileModule(source.replaceAll('import.meta.env.VITE_MATCHRIM_MASTER_CATALOG_URL', 'undefined')
    + '\nexports.subject = MultiWineLabelScannerSession;', { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, sandbox);
  return (sandbox.exports as { subject: (props: unknown) => unknown }).subject({ onExtractComplete: () => { throw Error('NO_SAVE'); } });
};
const shape = (value: unknown): unknown => JSON.parse(JSON.stringify(value, (key, item) => {
  if (key === '_owner' || key === 'ref') return undefined;
  if (key === 'children' && Array.isArray(item)) return item.flat(Infinity).filter(child => child != null && typeof child !== 'boolean');
  if (typeof item === 'function') return '[callback]';
  if (typeof item === 'symbol') return item.description;
  return item;
}));
let nativeCases = 0, webCases = 0;
for (const rating of ['love', 'ok', 'not_for_me'] as const) {
  const tree = render(current, true, { nativeVerdicts: verdicts.nativeVerdictsSnapshot159('owner-a', [{ ...saved, rating }], 1) });
  const analysis = walk(tree).find(node => node.type === 'LabelAnalysisView'); assert(analysis);
  const affinity = analysis.props.affinity as Element;
  assert.equal(affinity.type, NativeAffinitySummary); assert.equal(affinity.props.personalRating, rating);
  const html = renderToStaticMarkup(affinity as never);
  assert(html.includes(verdicts.personalVerdictTitle159(rating)));
  assert.equal(walk(tree).filter(node => node.props['data-testid'] === 'native-rescan-personal-verdict').length, 1);
  assert.equal(affinity.props.score, candidate.affinity); nativeCases++;
}
for (const owner of ['owner-b', '']) {
  const tree = render(current, true, {}, owner), analysis = walk(tree).find(node => node.type === 'LabelAnalysisView');
  assert.equal((analysis!.props.affinity as Element).props.personalRating, null);
  assert.equal(walk(tree).filter(node => node.props['data-testid'] === 'native-rescan-personal-verdict').length, 0); nativeCases++;
}
{
  const tree = render(current, true, { nativeVerdicts: verdicts.nativeVerdictsSnapshot159('owner-a', null, null) });
  const analysis = walk(tree).find(node => node.type === 'LabelAnalysisView'); assert(analysis);
  const affinity = analysis.props.affinity as Element;
  assert.equal(affinity.props.personalRating, null); assert.equal(affinity.props.personalHistoryUnavailable, true);
  const html = renderToStaticMarkup(affinity as never);
  assert(html.includes('Comparación de estilo provisional'));
  assert(html.includes('No se pudieron consultar tus valoraciones guardadas.'));
  assert.equal(affinity.props.score, candidate.affinity); nativeCases++;
}
for (const view of ['scene', 'wines', 'compare']) for (const selected of [null, region.id]) {
  const state = { nativeResultView: view, selectedRegionId: selected };
  assert.deepEqual(shape(render(current, false, state)), shape(render(before, false, state)), 'Actual web render must stay identical'); webCases++;
}
console.log(JSON.stringify({ nativeCases, webCases, actualScannerRender: true, actualSummarySSR: true,
  realCalls: 0, userWrites: 0, scope: 'Synthetic owner/records in actual component closure; not live rescan or UIKit proof.' }));
