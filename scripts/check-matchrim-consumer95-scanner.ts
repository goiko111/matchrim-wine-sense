import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as scan from '../src/utils/multiWineScan';
import * as consumer from '../src/utils/multiWineConsumer95';
import * as progress from '../src/utils/scanRegionProgress';
import * as pins from '../src/utils/screenOverlayPins';
import * as manualNotice from '../src/utils/manualWineIdentityNotice';
import { applyScanWineEvidence } from '../src/utils/scanWineEvidence';
import { createWinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import { restoreManualLookup96 } from './check-matchrim-manual-lookup-bridge96.mjs';
import { restoreNativeLabel97 } from './native-label97-scope.mjs';

// Synthetic local actors only. Imported services/components are inert; unexpected calls fail.
const path = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const baseline = 'c25b28287d431e50239e45a25baebe8965f5077d';
const source = restoreNativeLabel97(path, readFileSync(path, 'utf8'));
const before = execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
const parse = (text: string) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = (text: string) => {
  const tree = parse(text), values = new Map<string, string>(), states: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      if (ts.isIdentifier(node.name)) values.set(node.name.text, node.initializer.getText(tree));
      if (ts.isArrayBindingPattern(node.name) && ts.isCallExpression(node.initializer)
        && node.initializer.expression.getText(tree) === 'useState') {
        const first = node.name.elements[0];
        if (ts.isBindingElement(first)) states.push(first.name.getText(tree));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree); return { tree, values, states };
};
const current = declarations(source), prior = declarations(before);
type Props = Record<string, unknown> & { children?: Child };
type Element = { type: string | symbol; props: Props };
type FlatChild = Element | string | number;
type Child = FlatChild | boolean | null | undefined | Child[];
type State = Record<string, unknown>;
const fragment = Symbol('fragment');
const jsx = (type: Element['type'], props: Props): Element => ({ type, props: props ?? {} });
const unexpected = (name: string) => () => { throw Error(`Unexpected service call: ${name}`); };
const runtime = (text: string, native: boolean, initial: State) => {
  const state = { ...initial }, writes: string[] = [], names = declarations(text).states;
  const correctionDetails = { open: false }, focusEvents: string[] = [];
  let slot = 0;
  const imported = new Proxy({}, { get: (_, name) => unexpected(String(name)) });
  const components = new Proxy({}, { get: (_, name) => String(name) });
  const sandbox = {
    exports: {}, console, DOMException, AbortController,
    navigator: { onLine: true },
    document: { getElementById: () => ({
      scrollIntoView() { assert.equal(correctionDetails.open, true); focusEvents.push('scroll'); },
      focus() { assert.equal(correctionDetails.open, true); focusEvents.push('focus'); },
      closest: () => correctionDetails,
    }) },
    require: (id: string) => {
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: fragment };
      if (id === 'react') return {
        useState: (value: unknown) => {
          const name = names[slot++]; assert.ok(name, 'Unexpected state hook');
          if (!(name in state)) state[name] = typeof value === 'function' ? value() : value;
          return [state[name], (next: unknown) => {
            state[name] = typeof next === 'function' ? next(state[name]) : next; writes.push(name);
          }];
        },
        useMemo: (fn: () => unknown) => fn(), useRef: (value: unknown) => ({ current: value }),
        useEffect() {}, useLayoutEffect() {},
      };
      if (id === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
      if (id === '@/contexts/AuthContext') return { useAuth: () => ({ user: { id: 'synthetic-owner' } }) };
      if (id === '@/hooks/useOverlayViewport') return { useOverlayViewport: () => ({ ref: null, viewport: { width: 390, height: 500 } }) };
      if (id === '@/utils/multiWineScan') return scan;
      if (id === '@/utils/multiWineConsumer95') return consumer;
      if (id === '@/utils/scanRegionProgress') return progress;
      if (id === '@/utils/screenOverlayPins') return pins;
      if (id === '@/utils/manualWineIdentityNotice') return manualNotice;
      if (id === '@/utils/matchrimQaMode') return { isMatchrimFixtureQaEnabled: false };
      if (id.startsWith('@/components/') || id === 'lucide-react') return components;
      return imported;
    },
  };
  const compiled = ts.transpileModule(text + '\nexports.subject = MultiWineLabelScannerSession;', {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(compiled, sandbox);
  const subject = (sandbox.exports as { subject: (props: Props) => Element }).subject;
  const render = () => { slot = 0; return subject({ onExtractComplete: unexpected('save callback') }); };
  return { state, writes, render, correctionDetails, focusEvents };
};
const children = (child: Child): FlatChild[] => Array.isArray(child) ? child.flatMap(children)
  : child == null || typeof child === 'boolean' ? []
    : typeof child === 'object' && child.type === fragment ? children(child.props.children) : [child];
const elements = (child: Child, visible = false, ancestors: Element[] = []): Array<{ node: Element; ancestors: Element[] }> => children(child).flatMap(item => {
  if (typeof item !== 'object' || item === null) return [];
  if (visible && (item.props.hidden || (item.type === 'Drawer' && !item.props.open))) return [];
  const nested = visible && item.type === 'details' && !item.props.open
    ? children(item.props.children).filter(value => typeof value === 'object' && value?.type === 'summary') : item.props.children;
  return [{ node: item, ancestors }, ...elements(nested, visible, [...ancestors, item])];
});
const textOf = (child: Child): string => children(child).map(item => typeof item === 'object' ? textOf(item.props.children) : String(item)).join('');
const find = (tree: Child, predicate: (node: Element) => boolean) => elements(tree).find(item => predicate(item.node))?.node;
const button = (tree: Child, label: string) => find(tree, node => ['Button', 'button'].includes(String(node.type)) && String(node.props['aria-label'] ?? textOf(node.props.children)).trim() === label);
const click = (node?: Element) => { assert.ok(node); assert.ok(!node.props.disabled); (node.props.onClick as () => void)(); };
const shape = (child: Child): unknown => {
  const result: unknown[] = [];
  for (const value of children(child)) {
    if (typeof value !== 'object') {
      const last = result[result.length - 1];
      if (typeof last === 'string') result[result.length - 1] = last + String(value);
      else result.push(String(value));
    } else {
      const props = Object.fromEntries(Object.entries(value.props).filter(([key, item]) => key !== 'children' && key !== 'ref'
        && item !== undefined && !(value.type === 'AiRimContextGuide' && key === 'catalogIdentityLinked'))
        .map(([key, item]) => [key, typeof item === 'function' ? '[callback]' : item]));
      // Callback-bearing guide actions are checked separately by source identity and invocation.
      for (const key of ['primaryAction', 'secondaryAction']) if (props[key]) {
        props[key] = { label: (props[key] as { label: string }).label, onClick: '[callback]' };
      }
      result.push({ type: value.type, props, children: shape(value.props.children) });
    }
  }
  return result;
};
let checks = 0;
const check = (name: string, fn: () => void) => { fn(); checks++; console.log('PASS', name); };
const profile = { potente: 3, acidez: 3, dulce: 1, tanico: 3, afrutado: 4 };
const candidate: scan.WineCandidate = {
  id: 'candidate-a', name: 'Luna Reserva', producer: 'Bodegas Ejemplo', vintage: 2021, region: 'Rioja', country: 'Spain',
  grapes: [], alcohol: null, confidence: 0.5, source: 'label', evidence: ['Texto visible'],
  uncertaintyReasons: ['Reflejo en la etiqueta'], inferredFields: [], sensorySource: 'inference',
  affinity: 88, affinityConfidence: 0.4, affinityReason: 'Datos pendientes',
  sensoryAttributes: { potencia: 3, acidez: 3, dulzura: 1, taninos: 3, afrutado: 4 },
};
const region = (patch: Partial<scan.ScanRegion> = {}): scan.ScanRegion => ({
  id: 'region-a', index: 1, objectType: 'bottle', box: { x: 10, y: 10, width: 40, height: 50 },
  detectionConfidence: 0.9, quality: { glare: 'low', occlusion: 'low', legibility: 'good' },
  status: 'uncertain', candidates: [candidate], selectedCandidateId: candidate.id, duplicateCount: 1,
  cropDataUrl: 'data:image/png;base64,crop', ...patch,
});
const stateFor = (regions = [region()], patch: State = {}): State => ({
  preview: 'data:image/png;base64,photo', quality: { width: 800, height: 1000, megapixels: 0.8, brightness: 120, contrast: 40, warnings: [] },
  scanProfile: { profile, note: 'Perfil local sintético' }, regions, coverage: { status: 'partial', detectedObjects: 1, estimatedVisibleObjects: 2, confidence: 0.8, notes: ['Detalle de cobertura'] },
  selectedRegionId: regions[0]?.id ?? null, phase: 'ready', analysisProgress: 100,
  scanMetrics: { totalMs: 2500, detectionRefined: true, retries: 1 }, nativeResultView: 'wines', ...patch,
});
const sheet = createWinerimOriginalSheet({ id: 123, name: candidate.name, winery: candidate.producer!, vintage: candidate.vintage!,
  region: candidate.region!, originalSheetSource: 'winerim-api', originalSheetUrl: 'https://web.winerim.com/the-library/wines/123/Luna-Reserva_2021' })!;
sheet.detailVerified = true;
sheet.country = candidate.country;
sheet.sensoryAttributes = { power: 3, acidity: 3, sweetness: 1, tannin: 3, fruity: 4 };
const verified = applyScanWineEvidence(candidate, profile, {
  id: 123, name: candidate.name, winery: candidate.producer!, vintage: 2021, region: 'Rioja', country: 'Spain',
  verifiedOriginalSheet: sheet,
});

check('Existing scan lifecycle is identical outside the explicit native-only image admission guard', () => {
  for (const name of ['enrichCandidate', 'analyzeRegion', 'startScan', 'cancelScan', 'resetScan', 'retryScan', 'continueScan',
    'reanalyzeSelected', 'handleFileSelect', 'discardSelected', 'selectCandidate', 'confirmSelectedCandidate',
    'editCandidate', 'identifySelectedManually', 'moveSelection', 'confirmBatch']) {
    assert.ok(prior.values.has(name), name);
    let actual = current.values.get(name);
    if (name === 'startScan') {
      const admitted = 'prepareImageForAnalysis(file, 2400, controller.signal, isNative ? NATIVE_IMAGE_PREPARATION_LIMITS : undefined)';
      assert.equal(actual?.split(admitted).length, 2, 'Exactly one native-only guard; no other lifecycle change');
      actual = actual?.replace(admitted, 'prepareImageForAnalysis(file, 2400, controller.signal)');
    }
    assert.equal(actual, prior.values.get(name), name);
  }
  const lookup = (tree: ts.SourceFile) => {
    let result = '';
    const visit = (node: ts.Node) => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === 'WinerimSheetLookup') result = ts.createPrinter().printNode(ts.EmitHint.Unspecified, node, tree);
      ts.forEachChild(node, visit);
    };
    visit(tree); return result;
  };
  assert.equal(lookup(parse(restoreManualLookup96(path, source))), lookup(prior.tree));
});
check('Web JSX output equals baseline across phases, identities, missing data and save states', () => {
  const scenarios: State[] = [stateFor([], { preview: null }), stateFor([]), stateFor([region()], { selectedRegionId: null }),
    stateFor([region()], { saving: true, batchLocked: true }), stateFor([region()], { confirmed: true }),
    stateFor([region()], { saveResults: [{ status: 'rejected' }], batchLocked: true }),
    stateFor([region()], { saveResults: [{ status: 'unknown' }], batchLocked: true })];
  for (const phase of ['idle', 'quality', 'profile', 'detecting', 'analyzing', 'ready', 'cancelled', 'error']) scenarios.push(stateFor([region()], { phase }));
  for (const status of ['recognized', 'uncertain', 'unrecognized', 'deferred', 'discarded', 'pending', 'analyzing'] as const) {
    scenarios.push(stateFor([region({ status })]));
    scenarios.push(stateFor([region({ status, candidates: [], selectedCandidateId: null, error: 'Error sintético' })]));
  }
  for (const c of [candidate, { ...candidate, source: 'manual' as const }, verified, { ...candidate, affinity: null }, { ...candidate, evidence: [], uncertaintyReasons: [], affinityReason: null }]) {
    scenarios.push(stateFor([region({ candidates: [c], selectedCandidateId: c.id })]));
  }
  scenarios.push(stateFor([region({ candidates: [candidate, { ...candidate, id: 'candidate-b', name: 'Otro vino' }] })], { scanProfile: null }));
  scenarios.push(stateFor([region()], { quality: null, scanMetrics: null }));
  scenarios.push(stateFor([region()], { quality: { warnings: ['Foto oscura'], brightness: 10 } }));
  scenarios.push(stateFor([region({ candidates: [], selectedCandidateId: null, fallback: { code: 'not_wine', message: 'Otra bebida', suggestedActions: ['Revisar foto'] } })]));
  scenarios.push(stateFor([region({ candidates: [], selectedCandidateId: null, status: 'deferred', deferral: { code: 'request_limit', message: 'Lectura pendiente' } })]));
  const serializable = (value: unknown) => JSON.parse(JSON.stringify(value));
  for (const initial of scenarios) assert.deepEqual(serializable(shape(runtime(source, false, initial).render())), serializable(shape(runtime(before, false, initial).render())));
  console.log(`  ${scenarios.length} web result states matched`);
});
check('Native diagnostics collapsed; main title and pending state are consumer-facing', () => {
  const tree = runtime(source, true, stateFor()).render();
  assert.equal(textOf(find(tree, node => node.type === 'DrawerTitle')!.props.children), 'Vino 1');
  const primary = find(tree, node => node.props['data-testid'] === 'native-wine-primary')!;
  assert.match(textOf(primary.props.children), /Luna Reserva.*Afinidad pendiente/);
  const visible = elements(tree, true);
  assert.ok(!visible.some(({ node }) => /matchrim-data-rail/.test(String(node.props.className))));
  assert.ok(!visible.some(({ node }) => ['scan-region-progress', 'scan-performance-summary'].includes(String(node.props['data-testid']))));
  for (const { node, ancestors } of elements(tree)) if (/matchrim-data-rail/.test(String(node.props.className))) {
    assert.ok(ancestors.some(parent => parent.type === 'details' && !parent.props.open));
  }
  for (const testid of ['native-scan-diagnostics', 'native-scene-diagnostics', 'native-wine-diagnostics', 'native-reference-details']) {
    const detail = find(tree, node => node.props['data-testid'] === testid)!;
    assert.equal(detail.type, 'details'); assert.ok(!detail.props.open);
    assert.match(String(find(detail, node => node.type === 'summary')?.props.className), /min-h-11/);
  }
  assert.ok(!find(tree, node => node.type === 'AffinityExplanation'));
  const guide = find(tree, node => node.type === 'AiRimContextGuide')!;
  assert.equal(guide.props.affinity, null); assert.equal(guide.props.attributes, null);
  assert.equal(guide.props.catalogIdentityLinked, false);
  const comparison = find(tree, node => node.type === 'WineComparisonWorkspace')!;
  const wine = (comparison.props.wines as Array<Record<string, unknown>>)[0];
  assert.equal(wine.affinity, null); assert.equal(wine.attributes, null); assert.equal(wine.identityConfirmed, false);
});
check('Zero-confirmable native batch opens review; does not invoke save or mutate identity', () => {
  const actor = runtime(source, true, stateFor([region()], { selectedRegionId: null }));
  const tree = actor.render();
  assert.ok(!button(tree, 'Confirmar 0 referencias'));
  click(button(tree, 'Revisar una referencia'));
  assert.equal(actor.state.selectedRegionId, 'region-a');
  assert.deepEqual(actor.state.regions, [region()]);
  assert.deepEqual(actor.writes, ['selectedRegionId']);
});
check('Native review entry switches to wines and preserves the selected original region', () => {
  const actor = runtime(source, true, stateFor([region()], { nativeResultView: 'scene', selectedRegionId: null }));
  click(button(actor.render(), 'Revisar vinos'));
  assert.equal(actor.state.nativeResultView, 'wines'); assert.equal(actor.state.selectedRegionId, 'region-a');
});
check('Review confirmation preserves the existing identity transition and pending affinity', () => {
  const actor = runtime(source, true, stateFor());
  const guide = find(actor.render(), node => node.type === 'AiRimContextGuide')!;
  (guide.props.primaryAction as { onClick: () => void }).onClick();
  const expected = scan.confirmWineCandidateIdentity(candidate);
  assert.deepEqual((actor.state.regions as scan.ScanRegion[])[0].candidates[0], expected);
  assert.equal((actor.state.regions as scan.ScanRegion[])[0].status, 'recognized');
  assert.ok(!find(actor.render(), node => node.type === 'AffinityExplanation'));
});
check('Correction and alternative selection invoke existing handlers; navigation remains labelled', () => {
  const other = { ...candidate, id: 'candidate-b', name: 'Otra referencia' };
  const second = region({ id: 'region-b', index: 2 });
  const actor = runtime(source, true, stateFor([region({ candidates: [candidate, other] }), second]));
  let tree = actor.render();
  click(button(tree, 'Corregir identificación'));
  assert.equal(actor.correctionDetails.open, true); assert.deepEqual(actor.focusEvents, ['scroll', 'focus']);
  const alternatives = elements(tree).filter(({ node }) => node.props['aria-pressed'] !== undefined);
  click(alternatives[1].node);
  assert.equal((actor.state.regions as scan.ScanRegion[])[0].selectedCandidateId, other.id);
  tree = actor.render();
  const input = find(tree, node => node.props.id === 'region-wine-name')!;
  (input.props.onChange as (event: unknown) => void)({ target: { value: 'Nombre corregido' } });
  assert.deepEqual((actor.state.regions as scan.ScanRegion[])[0].candidates[1], scan.correctWineCandidateIdentity(other, { name: 'Nombre corregido' }));
  tree = actor.render();
  click(find(tree, node => node.props.title === 'Siguiente'));
  assert.equal(actor.state.selectedRegionId, second.id);
  click(find(actor.render(), node => node.props.title === 'Anterior'));
  assert.equal(actor.state.selectedRegionId, 'region-a');
});
check('Loading and frozen batches keep identity actions locked', () => {
  for (const patch of [{ phase: 'analyzing' }, { batchLocked: true }]) {
    const tree = runtime(source, true, stateFor([region()], patch)).render();
    assert.equal(button(tree, 'Corregir identificación')!.props.disabled, true);
    assert.equal(find(tree, node => node.props.id === 'region-wine-name')!.props.disabled, true);
    const guide = find(tree, node => node.type === 'AiRimContextGuide')!;
    assert.equal(guide.props.primaryAction, null); assert.equal(guide.props.secondaryAction, null);
  }
});
check('All discarded / empty results provide another-photo action, with no Confirm 0', () => {
  for (const regions of [[], [region({ status: 'discarded' })]]) {
    const actor = runtime(source, true, stateFor(regions));
    const tree = actor.render(); assert.ok(!button(tree, 'Confirmar 0 referencias'));
    click(button(tree, 'Elegir otra foto'));
    assert.equal(actor.state.preview, null); assert.equal(actor.state.phase, 'idle');
  }
});
check('Verified matched sensory sheet is the only native affinity explanation path', () => {
  assert.ok(verified.originalSheet?.detailVerified);
  assert.equal(consumer.nativeWineConsumerResult(verified, profile).canExplainAffinity, true);
  const tree = runtime(source, true, stateFor([region({ status: 'recognized', candidates: [verified] })])).render();
  const explanation = find(tree, node => node.type === 'AffinityExplanation')!;
  assert.ok(explanation); assert.equal(explanation.props.score, verified.affinity);
  assert.equal(find(tree, node => node.type === 'AiRimContextGuide')!.props.catalogIdentityLinked, true);
  assert.equal(consumer.nativeWineConsumerResult(verified, profile).affinityValue, `≈${verified.affinity}/100`);
  assert.equal(calculateLocalMatchrimAffinity(profile, verified.sensoryAttributes), verified.affinity);
});
check('Changed profile cannot reuse the old candidate affinity; current score restores native summary', () => {
  const changedProfile = { potente: 1, acidez: 5, dulce: 5, tanico: 1, afrutado: 1 };
  const calculated = calculateLocalMatchrimAffinity(changedProfile, verified.sensoryAttributes);
  assert.notEqual(calculated, null); assert.notEqual(calculated, verified.affinity);
  const before = JSON.stringify(verified);
  assert.equal(consumer.nativeWineConsumerResult(verified, changedProfile).canExplainAffinity, false);
  assert.equal(consumer.nativeWineConsumerResult(verified, changedProfile).affinityValue, 'Pendiente');
  const initial = stateFor([region({ status: 'recognized', candidates: [verified] })], { scanProfile: { profile: changedProfile } });
  const nativeTree = runtime(source, true, initial).render();
  assert.ok(!find(nativeTree, node => node.type === 'AffinityExplanation'));
  assert.equal(find(nativeTree, node => node.type === 'AiRimContextGuide')!.props.affinity, null);
  const comparison = find(nativeTree, node => node.type === 'WineComparisonWorkspace')!;
  assert.equal((comparison.props.wines as Array<Record<string, unknown>>)[0].affinity, null);
  const currentScore = { ...verified, affinity: calculated };
  const ready = consumer.nativeWineConsumerResult(currentScore, changedProfile);
  assert.equal(ready.canExplainAffinity, true); assert.equal(ready.affinityValue, `≈${calculated}/100`);
  const restored = runtime(source, true, stateFor([region({ candidates: [currentScore] })], { scanProfile: { profile: changedProfile } })).render();
  assert.ok(find(restored, node => node.type === 'AffinityExplanation'));
  assert.equal(JSON.stringify(verified), before);
  const webTree = runtime(source, false, initial).render();
  assert.equal(find(webTree, node => node.type === 'AffinityExplanation')!.props.score, verified.affinity);
});
check('Finite stale scores including near-equal values cannot bypass exact current-score equality', () => {
  for (const affinity of [0, verified.affinity! - 1, verified.affinity! + 1, verified.affinity! + 0.001]) {
    const stale = { ...verified, affinity };
    assert.equal(consumer.nativeWineConsumerResult(stale, profile).canExplainAffinity, false);
    const tree = runtime(source, true, stateFor([region({ status: 'recognized', candidates: [stale] })])).render();
    assert.ok(!find(tree, node => node.type === 'AffinityExplanation'));
    assert.equal(textOf(find(tree, node => node.props['data-testid'] === 'scan-affinity-value')!.props.children), 'Pendiente');
  }
});
check('Native contextual linkage uses validated identity/route, not a raw detailVerified flag', () => {
  for (const c of [{ ...verified, name: 'Otro vino' }, { ...verified, originalSheet: { ...sheet, url: 'https://example.invalid/wine' } }]) {
    const initial = stateFor([region({ candidates: [c] })]);
    assert.equal(find(runtime(source, true, initial).render(), node => node.type === 'AiRimContextGuide')!.props.catalogIdentityLinked, false);
    assert.equal(find(runtime(source, false, initial).render(), node => node.type === 'AiRimContextGuide')!.props.catalogIdentityLinked, true);
  }
});
check('Native affinity answer precedes fiche, correction fields and evidence, exactly once', () => {
  const tree = runtime(source, true, stateFor([region({ status: 'recognized', candidates: [verified] })])).render();
  const nodes = elements(tree);
  const explanations = nodes.filter(({ node }) => node.type === 'AffinityExplanation');
  assert.equal(explanations.length, 1);
  assert.ok(explanations[0].ancestors.some(node => node.props['data-testid'] === 'native-wine-primary'));
  const affinityIndex = nodes.findIndex(({ node }) => node.type === 'AffinityExplanation');
  for (const target of [nodes.findIndex(({ node }) => node.type === 'WinerimOriginalSheet'),
    nodes.findIndex(({ node }) => node.props.id === 'region-wine-name'),
    nodes.findIndex(({ node }) => node.type === 'details' && node.props['data-testid'] === 'native-wine-diagnostics')]) {
    assert.ok(target > affinityIndex, `Affinity at ${affinityIndex}, detail at ${target}`);
  }
  for (const { node, ancestors } of nodes) if (node.type === 'WinerimOriginalSheet' || node.props.id === 'region-wine-name') {
    assert.ok(ancestors.some(parent => parent.type === 'details' && !parent.props.open));
  }
  const pending = runtime(source, true, stateFor()).render();
  assert.equal(elements(pending, true).filter(({ node }) => node.type === 'p' && textOf(node.props.children) === 'Afinidad pendiente').length, 1);
});
check('Proposals/manual review/forged flags/incomplete data never mount native sensory explanation', () => {
  const cases: scan.WineCandidate[] = [candidate, { ...candidate, source: 'manual', confidence: 1 },
    { ...candidate, source: 'catalog', sensorySource: 'catalog', canonicalId: '123' },
    { ...verified, sensorySource: 'inference' }, { ...verified, canonicalId: '999' },
    { ...verified, originalSheet: { ...sheet, detailVerified: false } },
    { ...verified, originalSheet: { ...sheet, url: 'https://example.invalid/wine' } },
    { ...verified, name: 'Vino diferente' }, { ...verified, producer: 'Otra bodega' },
    { ...verified, vintage: 2020 }, { ...verified, inferredFields: ['name'] },
    { ...verified, sensoryAttributes: { potencia: 3 } },
    { ...verified, sensoryAttributes: { ...verified.sensoryAttributes, acidez: 1 } },
    { ...verified, originalSheet: { ...sheet, sensoryAttributes: null } },
    ...[null, NaN, Infinity, -1, 101].map(affinity => ({ ...verified, affinity }))];
  for (const c of cases) {
    const tree = runtime(source, true, stateFor([region({ status: 'recognized', candidates: [c] })])).render();
    assert.ok(!find(tree, node => node.type === 'AffinityExplanation'), JSON.stringify(c));
    assert.equal(textOf(find(tree, node => node.props['data-testid'] === 'scan-affinity-value')!.props.children), 'Pendiente');
  }
  for (const p of [null, { potente: 3 }]) {
    const tree = runtime(source, true, stateFor([region({ candidates: [verified] })], { scanProfile: { profile: p } })).render();
    assert.ok(!find(tree, node => node.type === 'AffinityExplanation'));
  }
});
check('Long names retain wrapping, and presentation helpers neither mutate nor manufacture data', () => {
  const long = { ...candidate, name: 'Nombre'.repeat(80), producer: 'Bodega'.repeat(80) };
  const tree = runtime(source, true, stateFor([region({ candidates: [long] })])).render();
  const primary = find(tree, node => node.props['data-testid'] === 'native-wine-primary')!;
  assert.match(String(primary.props.className), /overflow-wrap:anywhere/);
  assert.ok(textOf(primary.props.children).includes(long.name));
  const frozen = Object.freeze({ ...verified });
  const saved = JSON.stringify(frozen); consumer.nativeWineConsumerResult(frozen, Object.freeze(profile));
  assert.equal(JSON.stringify(frozen), saved);
  const reviewRegions = [region({ status: 'discarded' }), region({ id: 'verified', status: 'recognized' }), region({ id: 'pending', status: 'deferred', candidates: [] })];
  assert.equal(consumer.nextNativeWineReview(reviewRegions)?.id, 'pending');
  assert.equal(consumer.nextNativeWineReview([]), null);
});
console.log(`Consumer95 scanner: ${checks} checks passed. No service/provider/native runtime used.`);
