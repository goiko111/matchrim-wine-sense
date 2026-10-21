/* eslint-disable @typescript-eslint/no-explicit-any -- Offline JSX/hook fixtures; unknown imports and remote APIs fail closed. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import tailwindcss from 'tailwindcss';
import tailwindConfig from '../tailwind.config';
import { nativeAiRim99Baseline, nativeAiRim99Paths, restoreNativeAiRim99, restoreNativeAiRim99FeedbackScope96, restoreNativeAiRim99FoodSummaryGuard96 } from './native-airim99-scope';

const root = new URL('../', import.meta.url);
const leafPath = 'src/components/NativeAiRimChat99.tsx';
const controllerPath = nativeAiRim99Paths[0], pagePath = nativeAiRim99Paths[1];
const scopePath = 'scripts/matchrim-feedback-server96-scope.ts';
const read = (file: string) => readFileSync(new URL(file, root), 'utf8');
const baselines = new Map<string, string>(), compiled = new Map<string, string>();
const prior = (file: string, revision = nativeAiRim99Baseline) => {
  const key = `${revision}:${file}`;
  if (!baselines.has(key)) baselines.set(key, execFileSync('git', ['show', key], { cwd: root, encoding: 'utf8' }));
  return baselines.get(key)!;
};
const parse = (file: string, source: string) => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const walk = (node: ts.Node, visit: (node: ts.Node) => void) => { visit(node); ts.forEachChild(node, child => walk(child, visit)); };
const nodes = (tree: any): any[] => Array.isArray(tree) ? tree.flatMap(nodes)
  : tree && typeof tree === 'object' && 'type' in tree ? [tree, ...nodes(tree.props.children)] : [];
const text = (tree: any): string => Array.isArray(tree) ? tree.map(text).join('')
  : tree == null || typeof tree === 'boolean' ? '' : typeof tree === 'object' ? text(tree.props?.children) : String(tree);
const plain = (value: any): any => typeof value === 'function' ? '[callback]'
  : Array.isArray(value) ? Array.from(value, plain) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, plain(v)])) : value;
const find = (tree: any, test: (node: any) => boolean) => { const result = nodes(tree).find(test); assert.ok(result, 'Actual JSX node exists'); return result; };
const button = (tree: any, label: string) => find(tree, node => ['button', 'Button'].includes(node.type)
  && (node.props['aria-label'] === label || text(node) === label));
const composer = (tree: any) => find(tree, node => node.type === 'Textarea');
const contextDisclosure = (tree: any) => find(tree, node => node.props['data-testid'] === 'airim-consumer-context');
const guided = (tree: any) => nodes(tree).find(node => node.type === 'details' && text(node).startsWith('Consultas guiadas'));
const actions = ['wine-for-dish', 'dish-for-wine', 'pairing-check', 'special-moments'];
const welcome = { id: 'welcome', role: 'assistant', text: 'Synthetic welcome99' };
let networkAttempts = 0, sourceNegatives = 0, presentationNegatives = 0;

function hooks() {
  const slots: any[] = [], effects: (() => void)[] = [];
  let cursor = 0, dirty = false;
  return {
    react: {
      useRef(initial: any) { const i = cursor++; return slots[i] ??= { current: initial }; },
      useState(initial: any) {
        const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
        return [slots[i], (next: any) => { const value = typeof next === 'function' ? next(slots[i]) : next;
          if (!Object.is(value, slots[i])) { slots[i] = value; dirty = true; } }];
      },
      useMemo(run: () => any) { return run(); },
      useEffect(run: () => any, deps: any[]) {
        const i = cursor++, old = slots[i];
        if (!old || !deps || deps.length !== old.deps.length || deps.some((v, n) => !Object.is(v, old.deps[n]))) {
          slots[i] = { deps };
          effects.push(() => { old?.cleanup?.(); slots[i].cleanup = run(); });
        }
      },
    },
    begin() { cursor = 0; dirty = false; },
    commit() { effects.splice(0).forEach(run => run()); return dirty; },
    dispose() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

function offlineVM(modules: Record<string, any>, file: string, source: string, globals: Record<string, any> = {}) {
  const blocked = (boundary: string): never => { networkAttempts++; throw Error('Forbidden offline boundary: ' + boundary); };
  if (!compiled.has(source)) {
    const result = ts.transpileModule(source, { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
    assert.equal(result.diagnostics?.length, 0, file); compiled.set(source, result.outputText);
  }
  const exports: any = {};
  const browser = new Proxy({}, { get: (_, key) => () => blocked(`window.${String(key)}`) });
  vm.runInNewContext(compiled.get(source)!, { exports, require(id: string) {
    if (!Object.hasOwn(modules, id)) throw Error('Unmodeled offline import: ' + id); return modules[id];
  }, window: browser, document: browser, navigator: browser, localStorage: browser, sessionStorage: browser,
  fetch: () => blocked('fetch'), XMLHttpRequest: function () { blocked('XHR'); },
  WebSocket: function () { blocked('WebSocket'); }, EventSource: function () { blocked('EventSource'); },
  setTimeout: () => blocked('timer'), setInterval: () => blocked('interval'), queueMicrotask: () => blocked('microtask'),
  ...globals }, { filename: file, timeout: 2000 });
  return exports;
}
const jsx = (type: any, props: any, key?: any): any => typeof type === 'function' ? type(props) : ({ type, props, ...(key === undefined ? {} : { key }) });
const uiModules = {
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
  'lucide-react': new Proxy({}, { get: (_, name) => `lucide:${String(name)}` }),
  '@/components/ui/button': { Button: 'Button' }, '@/components/ui/textarea': { Textarea: 'Textarea' },
  '@/components/AiRimMark': { default: 'AiRimMark' },
};

function leafFixture(source = read(leafPath)) {
  const h = hooks(), events: any[][] = [], scrollWrites: number[] = [];
  let top = 0, tree: any;
  const body = { scrollHeight: 1200, clientHeight: 400,
    get scrollTop() { return top; }, set scrollTop(value: number) { scrollWrites.push(value); top = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight)); } };
  const callback = (name: string) => (...values: any[]) => events.push([name, ...values]);
  const props: any = { input: 'Synthetic question99', messages: [welcome], loading: false, canSend: true,
    memoryLabel: 'Synthetic current profile99', notice: 'Synthetic current notice99', contextSent: false,
    onInput: callback('input'), onSend: callback('send'), onCancel: callback('cancel'), onBack: callback('back'),
    onProfile: callback('profile'), onScan: callback('scan'), onRestaurant: callback('restaurant'), onSelectFunction: callback('guided') };
  const component = offlineVM({ ...uiModules, react: h.react }, leafPath, source).NativeAiRimChat99;
  const render = (next: any = {}) => {
    Object.assign(props, next); h.begin(); tree = component(props);
    for (const node of nodes(tree)) if (node.props.ref && typeof node.props.ref === 'object') node.props.ref.current = body;
    h.commit(); return tree;
  };
  render();
  return { render, props, events, body, scrollWrites, get tree() { return tree; }, dispose: h.dispose,
    position(value: number) { top = value; find(tree, node => node.props['data-testid'] === 'native-airim-messages99').props.onScroll({ currentTarget: body }); } };
}

function assertComposer(source = read(leafPath)) {
  const f = leafFixture(source);
  try {
    for (const input of ['', ' \n\t ', 'Pregunta99', '  Pregunta99  ']) for (const loading of [false, true]) for (const canSend of [false, true]) {
      const tree = f.render({ input, loading, canSend });
      assert.equal(nodes(tree).filter(n => ['Textarea', 'textarea', 'Input', 'input'].includes(n.type) || n.props.contentEditable).length, 1);
      assert.equal(composer(tree).props.id, 'airim-question'); assert.equal(composer(tree).props.value, input);
      assert.equal(composer(tree).props.disabled, loading);
      assert.equal(nodes(tree).filter(n => n.props['aria-label'] === 'Enviar pregunta').length, 1);
      assert.equal(button(tree, 'Enviar pregunta').props.disabled, !input.trim() || loading || !canSend);
    }
    assert.deepEqual(f.events, []);
  } finally { f.dispose(); }
}

function assertKeyboard(source = read(leafPath)) {
  const f = leafFixture(source);
  try {
    for (const key of ['Enter', 'a', 'Escape']) for (const shiftKey of [false, true]) for (const isComposing of [false, true]) {
      let prevented = 0; f.events.length = 0;
      composer(f.tree).props.onKeyDown({ key, shiftKey, nativeEvent: { isComposing }, preventDefault() { prevented++; } });
      const submits = key === 'Enter' && !shiftKey && !isComposing;
      assert.equal(prevented, submits ? 1 : 0); assert.deepEqual(f.events, submits ? [['send']] : []);
    }
  } finally { f.dispose(); }
}

function assertCallbacks(source = read(leafPath)) {
  const f = leafFixture(source);
  try {
    assert.deepEqual(f.events, [], 'Neither module evaluation nor render dispatches');
    composer(f.tree).props.onChange({ target: { value: 'New\nquestion99' } });
    for (const label of ['Enviar pregunta', 'Volver desde aiRIM', 'Gestionar mis gustos', 'Escanear etiqueta o carta', 'Comida y vinos del restaurante']) button(f.tree, label).props.onClick();
    assert.deepEqual(f.events, [['input', 'New\nquestion99'], ['send'], ['back'], ['profile'], ['scan'], ['restaurant']]);
    f.events.length = 0;
    const disclosure = guided(f.tree); assert.ok(disclosure); assert.equal(disclosure.props.open, undefined);
    const buttons = nodes(disclosure).filter(n => n.type === 'button'); assert.equal(buttons.length, 4);
    buttons.forEach(n => n.props.onClick()); assert.deepEqual(f.events, actions.map(action => ['guided', action]));
    f.events.length = 0;
    const loading = f.render({ loading: true }); button(loading, 'Cancelar consulta').props.onClick();
    assert.deepEqual(f.events, [['cancel']]); assert.match(text(loading), /Contrastando tu perfil y la consulta/);
    assert.equal(nodes(f.render({ loading: false })).filter(n => text(n) === 'Cancelar consulta').length, 0);
  } finally { f.dispose(); }
}

function assertDisclosure(source = read(leafPath)) {
  const f = leafFixture(source);
  try {
    for (const contextSent of [false, true]) {
      const label = contextSent ? 'Synthetic frozen sent profile99' : 'Synthetic current profile99';
      const notice = contextSent ? 'Synthetic frozen sent notice99' : 'Synthetic current notice99';
      const d = contextDisclosure(f.render({ contextSent, memoryLabel: label, notice }));
      assert.equal(d.type, 'details'); assert.equal(d.props.open, undefined);
      assert.match(text(d), /Tu perfil y privacidad/); assert.equal(text(d).includes(label), true); assert.equal(text(d).includes(notice), true);
      assert.equal(text(d).includes(contextSent ? 'Contexto enviado en esta consulta' : 'Contexto para tu pr\u00f3xima consulta'), true);
      assert.equal(text(d).includes(contextSent ? 'Contexto para tu pr\u00f3xima consulta' : 'Contexto enviado en esta consulta'), false);
      assert.match(text(d), /Un consejo general no es una afinidad personal con una botella/);
      assert.match(text(d), /Las fotos siguen en Escanear y no se incorporan a memoria por conversar aqu\u00ed/);
    }
  } finally { f.dispose(); }
}

function nativeBinding(owner: string | null, select = true) {
  const source = read(controllerPath), ast = parse(controllerPath, source), branches: string[] = [];
  walk(ast, node => {
    if (ts.isIfStatement(node) && node.expression.getText(ast) === 'isNative' && ts.isReturnStatement(node.thenStatement)
      && node.thenStatement.expression?.getText(ast).startsWith('<NativeAiRimChat99 ')) branches.push(node.thenStatement.expression.getText(ast));
  });
  assert.equal(branches.length, 1);
  const events: any[][] = [], received: any[] = [];
  const current = { notice: 'Current notice99' }, sent = { notice: 'Frozen receipt99' };
  const globals = { input: 'Input99', messages: [welcome], isLoading: false, nativeCanSend: true, memoryLabel: 'Profile99',
    nativeContext: current, sentNativeContext: sent, user: owner ? { id: owner } : null,
    setInput: (value: string) => events.push(['input', value]), sendMessage: () => events.push(['send']),
    cancelNativeMessage: () => events.push(['cancel']), onBack: () => events.push(['back']),
    navigate: (route: string) => events.push(['navigate', route]),
    onSelectFunction: select ? (action: string) => events.push(['guided', action]) : undefined,
    NativeAiRimChat99: (props: any) => { received.push(props); return jsx('NativeAiRimChat99', props); } };
  offlineVM({ 'react/jsx-runtime': uiModules['react/jsx-runtime'] }, 'actual-native-binding.tsx', `exports.tree=(${branches[0]});`, globals);
  assert.equal(received.length, 1); return { props: received[0], events };
}

function pageFixture({ native = true, historical = false, query = '', owner = 'qa-owner99' as string | null } = {}) {
  const h = hooks(), navigation: any[][] = [], scrolls: any[] = [];
  const navigate = (...args: any[]) => navigation.push(args), params = new URLSearchParams(query);
  const location = { pathname: '/inteligencia-liquida', search: query ? '?' + query : '', state: null };
  const modules = { ...uiModules, react: h.react, '@capacitor/core': { Capacitor: { isNativePlatform: () => native } },
    'react-router-dom': { useNavigate: () => navigate, useLocation: () => location, useSearchParams: () => [params] },
    '@/contexts/AuthContext': { useAuth: () => ({ user: owner ? { id: owner } : null, loading: false }) },
    '@/components/AppNav': { default: 'AppNav' }, '@/components/MobileBottomNav': { default: 'MobileBottomNav' },
    '@/components/MatchrimFunction': { default: 'MatchrimFunction' }, '@/components/SpecialMomentsFlow': { default: 'SpecialMomentsFlow' },
    '@/components/AiRimConversation': { default: 'AiRimConversation' }, '@/components/ui/input': { Input: 'Input' },
    '@/utils/restaurantPairingContext': { readRestaurantCarry: () => null, restaurantCarryIsForeign: () => false } };
  const Page = offlineVM(modules, pagePath, historical ? prior(pagePath) : read(pagePath), { window: { scrollTo: (value: any) => scrolls.push(value) } }).default;
  const render = () => {
    for (let i = 0; i < 10; i++) { h.begin(); const tree = Page(); if (!h.commit()) return tree; }
    throw Error('Page fixture did not settle');
  };
  return { render, navigation, scrolls, dispose: h.dispose };
}

const checks: string[] = [];
const check = (name: string, run: () => void) => { run(); checks.push(name); console.log('PASS ' + name); };

check('Exact literal inverse restores both complete d7d81e1 source files, without AST node drops', () => {
  for (const file of nativeAiRim99Paths) {
    assert.equal(restoreNativeAiRim99(file, read(file)), prior(file));
    assert.equal(restoreNativeAiRim99(file, prior(file)), prior(file));
    for (const candidate of [read(file) + '\n// unreviewed99\n', read(file).replace('if (isNative) return <', 'if (true) return <')]) {
      assert.notEqual(candidate, read(file)); assert.throws(() => restoreNativeAiRim99(file, candidate)); sourceNegatives++;
    }
  }
  assert.throws(() => restoreNativeAiRim99(leafPath, read(leafPath))); sourceNegatives++;
});

const frozenPaths = ['src/utils/aiRimConsumer95.ts', 'src/utils/aiRimGrounding.ts', 'src/utils/matchrimLearning.ts',
  'src/utils/matchrimLearningPlatform.ts', 'src/utils/matchrimPassport.ts', 'src/utils/bodegaAffinity.ts', 'src/utils/scanProfile.ts',
  'src/services/matchrimScanProfile.ts', 'src/lib/aiRimStream.ts', 'src/utils/restaurantPairingContext.ts',
  'src/components/MatchrimFunction.tsx', 'src/components/SpecialMomentsFlow.tsx', 'src/pages/Restaurant.tsx',
  'supabase/functions/_shared/matchrim-profile95.ts', 'supabase/functions/ai-wine-chat/index.ts',
  'scripts/check-matchrim-feedback-server96.ts', 'scripts/check-matchrim-feedback-strength96.ts', 'scripts/check-matchrim-food-summary96.ts'];
const assertFrozen = (file: string, source: string) => {
  assert.ok(frozenPaths.includes(file));
  if (file === 'scripts/check-matchrim-food-summary96.ts') source = restoreNativeAiRim99FoodSummaryGuard96(source);
  assert.equal(source, prior(file), file);
};
check('Identity/formulas/services and old oracles remain exact after the literal Food-summary reader inverse', () => {
  frozenPaths.forEach(file => assertFrozen(file, read(file)));
});

check('Negative controls reject identity/owner/model/request/profile/abort/response/formula and web edits', () => {
  const mutations: [string, string, string][] = [
    [controllerPath, ".eq('user_id', user.id)", ".eq('user_id', 'foreign-owner99')"],
    [controllerPath, 'currentOwner.current !== ownerId', 'false'],
    [controllerPath, 'matchrimLearningModel: NATIVE_MATCHRIM_LEARNING_MODEL', "matchrimLearningModel: 'changed99'"],
    [controllerPath, "invoke('ai-wine-chat'", "invoke('other-chat99'"],
    [controllerPath, 'isNative ? requestContext!.context : profileContext', 'profileContext'],
    [controllerPath, 'if (controller.signal.aborted) throw', 'if (false) throw'],
    [controllerPath, 'answer = assertAiRimConsumerAnswer95(answer)', 'answer = String(answer)'],
    [controllerPath, 'Decide con contexto', 'Changed web heading99'],
    [pagePath, 'if (!question) return;', 'if (false) return;'],
    [pagePath, "setConversationQuestion(question);", "setConversationQuestion('changed99');"],
    [pagePath, 'Tu copiloto de vino', 'Changed web landing99'],
    ['src/utils/bodegaAffinity.ts', 'normalize(wine.producer)', "normalize('spoof99')"],
    ['src/utils/matchrimLearning.ts', 'weight * recencyWeight', 'weight + recencyWeight'],
    ['supabase/functions/_shared/matchrim-profile95.ts', '(strengthAware ? totalWeight : samples) / 12', '(strengthAware ? totalWeight : samples) / 10'],
  ];
  for (const [file, from, to] of mutations) {
    const source = read(file), candidate = source.replace(from, to); assert.notEqual(candidate, source, from);
    assert.throws(() => nativeAiRim99Paths.includes(file as typeof controllerPath)
      ? restoreNativeAiRim99(file, candidate) : assertFrozen(file, candidate)); sourceNegatives++;
  }
});

check('Actual leaf has one labelled controlled composer and the complete blank/loading/canSend disabled matrix', () => {
  assertComposer();
  const f = leafFixture();
  assert.equal(find(f.tree, n => n.type === 'label').props.htmlFor, composer(f.tree).props.id);
  assert.match(text(find(f.tree, n => n.type === 'h1')), /aiRIM/); f.dispose();
});

check('Actual mount/render/effect commits dispatch no callbacks, navigation, network, storage or timers', () => {
  const before = networkAttempts, f = leafFixture();
  f.render(); f.render({ loading: true }); f.render({ messages: [welcome, { id: 'answer99', role: 'assistant', text: 'Answer99' }] });
  assert.deepEqual(f.events, []); assert.equal(networkAttempts, before); f.dispose();
});

check('Real JSX callbacks forward input/send/back/profile/scan/restaurant/cancel and all four guided actions once', () => assertCallbacks());
check('Enter submits once; Shift+Enter, IME composition and other keys preserve their default behavior', () => assertKeyboard());
check('Closed privacy disclosure distinguishes current from sent context, exposes notices and avoids bottle-affinity claims', () => assertDisclosure());

check('Guided actions and restaurant entry are initial-only; transcript and privacy survive subsequent messages', () => {
  const f = leafFixture();
  assert.equal(guided(f.render({ onSelectFunction: undefined })), undefined);
  const messages = [welcome, { id: 'user99', role: 'user', text: '<script>synthetic private99</script>' }, { id: 'answer99', role: 'assistant', text: 'Synthetic answer99' }];
  const tree = f.render({ messages });
  assert.equal(guided(tree), undefined); assert.equal(nodes(tree).filter(n => n.props['aria-label'] === 'Comida y vinos del restaurante').length, 0);
  assert.ok(text(tree).includes(messages[1].text)); assert.ok(text(tree).includes(messages[2].text));
  assert.equal(nodes(tree).filter(n => n.type === 'script' || n.props.dangerouslySetInnerHTML).length, 0);
  assert.equal(find(tree, n => n.props['aria-label'] === 'Conversaci\u00f3n con aiRIM').props['aria-live'], 'polite');
  contextDisclosure(tree); composer(tree); f.dispose();
});

check('Actual controller JSX binds restaurant explicitly to /restaurante and preserves ordered cancel/navigation callbacks', () => {
  for (const owner of [null, 'qa-owner99']) {
    const f = nativeBinding(owner);
    assert.deepEqual(f.events, []); assert.equal(f.props.notice, 'Frozen receipt99'); assert.equal(f.props.contextSent, true);
    f.props.onInput('Changed99'); f.props.onSend(); f.props.onCancel(); f.props.onBack(); f.props.onProfile(); f.props.onScan(); f.props.onRestaurant();
    actions.forEach(action => f.props.onSelectFunction(action));
    assert.deepEqual(f.events, [['input', 'Changed99'], ['send'], ['cancel'], ['cancel'], ['back'],
      ['navigate', owner ? '/profile' : '/matchrim'], ['cancel'], ['navigate', '/escanear'], ['cancel'], ['navigate', '/restaurante'],
      ...actions.flatMap(action => [['cancel'], ['guided', action]])]);
  }
  assert.equal(nativeBinding('qa-owner99', false).props.onSelectFunction, undefined);
});

check('Actual page opens one native direct conversation, no landing composer, and all four existing guided workflows', () => {
  for (const action of actions) {
    const f = pageFixture(); let tree = f.render();
    assert.equal(nodes(tree).filter(n => n.type === 'AiRimConversation').length, 1);
    assert.equal(nodes(tree).filter(n => ['Input', 'Textarea'].includes(n.type)).length, 0);
    assert.equal(nodes(tree).filter(n => n.type === 'MobileBottomNav').length, 1);
    assert.deepEqual(f.navigation, []);
    const chat = find(tree, n => n.type === 'AiRimConversation'); assert.equal(chat.key, 'native-landing99');
    chat.props.onSelectFunction(action); tree = f.render();
    const flow = find(tree, n => n.type === (action === 'special-moments' ? 'SpecialMomentsFlow' : 'MatchrimFunction'));
    if (action !== 'special-moments') { assert.equal(flow.props.functionType, action); assert.equal(flow.props.initialInput1, ''); assert.equal(flow.props.initialInput2, ''); }
    flow.props.onBack(); tree = f.render();
    find(tree, n => n.type === 'AiRimConversation').props.onBack();
    assert.deepEqual(plain(f.navigation), [['/inteligencia-liquida', { replace: true }], ['/']]); f.dispose();
  }
});

check('Native query conversations preserve explicit question/key and web page JSX/effects/callback transitions equal d7d81e1', () => {
  const queries = ['', 'function=wine-fit&wine=Reserva99', 'function=similar-wine&wine=Blanco99',
    ...actions.map(action => `function=${action}&dish=Arroz99&wine=Reserva99`)];
  for (const query of queries) for (const owner of [null, 'qa-owner99']) {
    const current = pageFixture({ native: false, query, owner }), old = pageFixture({ native: false, historical: true, query, owner });
    let tree = current.render(), before = old.render(); assert.deepEqual(plain(tree), plain(before), `${owner}/${query}`);
    if (!query) {
      const input = find(tree, n => n.type === 'Input'), oldInput = find(before, n => n.type === 'Input');
      input.props.onChange({ target: { value: '  Question99  ' } }); oldInput.props.onChange({ target: { value: '  Question99  ' } });
      tree = current.render(); before = old.render();
      button(tree, 'Abrir conversaci\u00f3n').props.onClick(); button(before, 'Abrir conversaci\u00f3n').props.onClick();
      assert.deepEqual(plain(current.render()), plain(old.render()));
    }
    assert.deepEqual(plain(current.navigation), plain(old.navigation)); assert.deepEqual(plain(current.scrolls), plain(old.scrolls));
    current.dispose(); old.dispose();
  }
  for (const fn of ['wine-fit', 'similar-wine']) {
    const f = pageFixture({ query: `function=${fn}&wine=Reserva99` }), chat = find(f.render(), n => n.type === 'AiRimConversation');
    assert.ok(chat.props.initialQuestion.includes('Reserva99')); assert.equal(chat.key, 'native-request99:' + chat.props.initialQuestion);
    assert.equal(chat.props.onSelectFunction, undefined); f.dispose();
  }
});

check('Bounded autoscroll leaves welcome alone, follows near-bottom answers, and never moves older-message readers', () => {
  const f = leafFixture(); assert.deepEqual(f.scrollWrites, []);
  f.render({ messages: [welcome, { id: 'user99', role: 'user', text: 'Question99' }], loading: true });
  assert.deepEqual(f.scrollWrites, [1200]);
  const messages = [...f.props.messages, { id: 'answer99', role: 'assistant', text: 'Answer99' }];
  for (const gap of [0, 63, 64, 65, 400]) {
    f.position(f.body.scrollHeight - f.body.clientHeight - gap); const top = f.body.scrollTop, count = f.scrollWrites.length;
    f.body.scrollHeight += 100; f.render({ messages: messages.map(message => ({ ...message })) });
    assert.equal(f.scrollWrites.length, count + (gap < 64 ? 1 : 0), `Bottom gap ${gap}`);
    if (gap >= 64) assert.equal(f.body.scrollTop, top);
  }
  f.position(20); const count = f.scrollWrites.length; f.render({ loading: false });
  assert.equal(f.scrollWrites.length, count); assert.equal(f.body.scrollTop, 20); assert.deepEqual(f.events, []); f.dispose();
});

check('Semantic negative controls detect removed send guards, miswired callbacks/actions, disclosure and keyboard regressions', () => {
  const source = read(leafPath);
  const mutations: [string, string, (source: string) => void][] = [
    [' || !props.canSend', '', assertComposer], ['!props.input.trim() || ', '', assertComposer], [' || props.loading', '', assertComposer],
    ['onClick={props.onRestaurant}', 'onClick={props.onScan}', assertCallbacks],
    ['onClick={props.onCancel}', 'onClick={props.onBack}', assertCallbacks],
    ['props.onSelectFunction?.(action)', "props.onSelectFunction?.('wine-for-dish')", assertCallbacks],
    [' && !event.shiftKey', '', assertKeyboard], [' && !event.nativeEvent.isComposing', '', assertKeyboard],
    ["props.contextSent ? 'Contexto enviado", "!props.contextSent ? 'Contexto enviado", assertDisclosure],
  ];
  for (const [from, to, validate] of mutations) {
    const candidate = source.replace(from, to); assert.notEqual(candidate, source, from);
    assert.throws(() => validate(candidate), from); presentationNegatives++;
  }
});

check('Server96 bridge restores its entire original scope and preserves every old inverse pair, pin and oracle', () => {
  assert.equal(restoreNativeAiRim99FeedbackScope96(read(scopePath)), prior(scopePath));
  const source = read(scopePath);
  for (const candidate of [source.replace('assert.ok(file in pairs,', 'assert.ok(true,'), source.replace("'samples / 12'", "'samples / 10'")]) {
    assert.notEqual(candidate, source); assert.throws(() => restoreNativeAiRim99FeedbackScope96(candidate)); sourceNegatives++;
  }
});

check('Food-summary reader inverse preserves every original assertion/baseline/count and rejects oracle mutations', () => {
  const file = 'scripts/check-matchrim-food-summary96.ts', source = read(file), original = prior(file);
  assert.equal(restoreNativeAiRim99FoodSummaryGuard96(source), original);
  assert.equal(restoreNativeAiRim99FoodSummaryGuard96(original), original);
  for (const [from, to] of [
    ['assert.equal(value, before,', 'assert.notEqual(value, before,'],
    ['restoreNativeFoodSummaryScope96(scopeSource);', '// skipped scope oracle99'],
    ["const baseline = '55ee695ed51b5079e6eb0ab645c04b0b3420420a';", "const baseline = 'HEAD';"],
    ['passed: 6, failed: 0', 'passed: 5, failed: 0'],
    ['assert.throws(() => restoreNativeFoodSummaryScope96(scopeMutation));', '// skipped negative99'],
    ['  value = restoreNativeAiRim99FeedbackScope96(value);', '  value = value;'],
  ]) {
    const candidate = source.replace(from, to); assert.notEqual(candidate, source, from);
    assert.throws(() => restoreNativeAiRim99FoodSummaryGuard96(candidate)); sourceNegatives++;
  }
});

const disclosureCss = (await postcss([tailwindcss({ ...tailwindConfig,
  content: [{ raw: read(leafPath) + '\n' + read('src/components/ui/button.tsx'), extension: 'tsx' }] })]).process('@tailwind utilities;', { from: undefined })).css;
const disclosureRules: { classes: string[]; pseudos: string[]; tags: string[]; important: string[]; declarations: Record<string, string> }[] = [];
postcss.parse(disclosureCss).walkRules(rule => {
  selectorParser(selectors => selectors.each(selector => {
    const classes: string[] = [], pseudos: string[] = [], tags: string[] = [], important: string[] = [], declarations: Record<string, string> = {};
    selector.walkClasses(node => { classes.push(node.value); }); selector.walkPseudos(node => { pseudos.push(node.value); });
    selector.walkTags(node => { tags.push(node.value); });
    rule.walkDecls(declaration => { declarations[declaration.prop] = declaration.value; if (declaration.important) important.push(declaration.prop); });
    disclosureRules.push({ classes, pseudos, tags, important, declarations });
  })).processSync(rule.selector);
});
const utilityStyles = (className: string) => {
  const classes = new Set<string>(className.split(/\s+/));
  return Object.assign({}, ...disclosureRules.filter(rule => rule.classes.length === 1 && rule.tags.length === 0
    && rule.pseudos.length === 0 && classes.has(rule.classes[0])).map(rule => rule.declarations));
};
function assertDisclosureGeometry(tree: any) {
  const summaries = nodes(tree).filter(node => node.type === 'summary'); assert.equal(summaries.length, 2);
  for (const summary of summaries) {
    const classes = new Set<string>(summary.props.className.split(/\s+/));
    const styles = utilityStyles(summary.props.className);
    assert.equal(styles.display, 'flex'); assert.equal(styles['min-height'], '44px');
    assert.equal(styles['list-style-type'], 'none'); assert.equal(styles['align-items'], 'center');
    assert.equal(styles['justify-content'], 'space-between');
    assert.equal(styles.height, undefined, 'Text may grow beyond the physical minimum');
    assert.equal(disclosureRules.some(rule => rule.classes.length === 1 && classes.has(rule.classes[0])
      && rule.pseudos.includes('::-webkit-details-marker') && rule.declarations.display === 'none'), true);
    const childNodes = nodes(summary).slice(1);
    assert.equal(childNodes.filter(n => n.type === 'span').length, 1);
    const label = childNodes.find(n => n.type === 'span');
    assert.equal(summary.props['aria-label'], text(label)); assert.equal(summary.props['aria-hidden'], undefined);
    assert.equal(label.props['aria-hidden'], 'true');
    assert.equal(childNodes.filter(n => n.type === 'lucide:ChevronRight' && n.props['aria-hidden'] === 'true').length, 1);
    assert.equal(childNodes.filter(n => ['button', 'Button', 'a', 'summary'].includes(n.type)
      || n.props.role === 'button' || n.props.onClick || n.props.tabIndex !== undefined).length, 0);
    const details = find(tree, n => n.type === 'details' && nodes(n).includes(summary));
    assert.equal(details.props.className.split(/\s+/).includes('group'), true); assert.equal(details.props.open, undefined);
  }
}
check('Actual disclosures emit physical44px CSS, one parent accessible name and hidden decorative children; not UIKit evidence', () => {
  const f = leafFixture(); assertDisclosureGeometry(f.tree);
  for (const summary of nodes(f.tree).filter(node => node.type === 'summary')) {
    const original = summary.props.className;
    for (const token of ['flex', 'min-h-[44px]', 'list-none', '[&::-webkit-details-marker]:hidden']) {
      summary.props.className = original.split(/\s+/).filter((value: string) => value !== token).join(' ');
      assert.notEqual(summary.props.className, original); assert.throws(() => assertDisclosureGeometry(f.tree)); presentationNegatives++;
    }
    summary.props.className = original;
    const label = nodes(summary).find(node => node.type === 'span');
    const name = summary.props['aria-label'];
    summary.props['aria-label'] = undefined;
    assert.throws(() => assertDisclosureGeometry(f.tree)); presentationNegatives++;
    summary.props['aria-label'] = name;
    label.props['aria-hidden'] = undefined;
    assert.throws(() => assertDisclosureGeometry(f.tree)); presentationNegatives++;
    label.props['aria-hidden'] = 'true';
    summary.props['aria-hidden'] = 'true';
    assert.throws(() => assertDisclosureGeometry(f.tree)); presentationNegatives++;
    delete summary.props['aria-hidden'];
  }
  f.dispose();
});

function assertPhysicalIconPixels(tree: any) {
  const send = find(button(tree, 'Enviar pregunta'), node => node.type === 'lucide:Send');
  const loader = find(tree, node => node.type === 'lucide:LoaderCircle');
  const parentSvgRule = disclosureRules.find(rule => rule.classes.includes('[&_svg]:size-4') && rule.tags.includes('svg'));
  assert.ok(parentSvgRule, 'Actual Button descendant SVG sizing CSS is generated');
  assert.equal(parentSvgRule.declarations.width, '1rem'); assert.equal(parentSvgRule.declarations.height, '1rem');
  assert.equal(parentSvgRule.important.includes('width') || parentSvgRule.important.includes('height'), false);
  const loaderStyles = utilityStyles(loader.props.className);
  for (const rootPx of [16, 32, 49, 50]) for (const dimension of ['width', 'height']) {
    // Button's class+svg selector beats the icon utility class, but not normal inline pixels.
    const normalButtonSvgPx = rootPx;
    const sendPx = typeof send.props.style?.[dimension] === 'number' ? send.props.style[dimension] : normalButtonSvgPx;
    assert.equal(sendPx, 20, `Send ${dimension} at root ${rootPx}px`);
    assert.equal(loaderStyles[dimension], '16px', `Loader ${dimension} independent of root ${rootPx}px`);
  }
  assert.equal(send.props['aria-hidden'], 'true'); assert.equal(loader.props['aria-hidden'], 'true');
}
check('Actual Send inline20px wins Button rem-SVG specificity at root16/32/49/50; Loader remains16px', () => {
  const ast = parse('button.tsx', read('src/components/ui/button.tsx')), baseClasses: string[] = [];
  walk(ast, node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'buttonVariants' && node.initializer
      && ts.isCallExpression(node.initializer) && ts.isStringLiteral(node.initializer.arguments[0])) baseClasses.push(node.initializer.arguments[0].text);
  });
  assert.equal(baseClasses.length, 1); assert.equal(baseClasses[0].split(/\s+/).includes('[&_svg]:size-4'), true);
  const f = leafFixture(), tree = f.render({ loading: true }); assertPhysicalIconPixels(tree);
  const send = find(tree, node => node.type === 'lucide:Send'), loader = find(tree, node => node.type === 'lucide:LoaderCircle');
  const style = send.props.style, loaderClasses = loader.props.className;
  for (const dimension of ['width', 'height']) {
    send.props.style = { ...style, [dimension]: undefined };
    assert.throws(() => assertPhysicalIconPixels(tree)); presentationNegatives++;
  }
  send.props.style = style;
  for (const [from, to] of [['w-[16px]', 'w-4'], ['h-[16px]', 'h-4']]) {
    loader.props.className = loaderClasses.split(/\s+/).map((token: string) => token === from ? to : token).join(' ');
    assert.notEqual(loader.props.className, loaderClasses); assert.throws(() => assertPhysicalIconPixels(tree)); presentationNegatives++;
  }
  loader.props.className = loaderClasses; f.dispose();
});

assert.equal(networkAttempts, 0);
console.log(JSON.stringify({ nativeAiRim99: true, passed: checks.length, failed: 0, wholeSourceInverses: nativeAiRim99Paths.length,
  frozenSourceFiles: frozenPaths.length, negativeSourceControls: sourceNegatives, negativePresentationControls: presentationNegatives,
  actualLeafJSX: true, guidedActions: actions.length, webPageParity: true, boundedAutoscroll: true,
  disclosureGeometryCSS: true, disclosureAccessibleNameContract: true,
  physicalIconPixelsAtMAX: true,
  currentUIKitEvidence: false, networkCalls: networkAttempts, browser: false, device: false }));
