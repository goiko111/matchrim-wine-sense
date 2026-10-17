import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as consumer from '../src/utils/aiRimConsumer95';
import { resolveScanProfile, type ScanProfileSnapshot } from '../src/utils/scanProfile';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '../src/utils/matchrimLearning';
import { cellarTrainingRows, makeCellarCatalogEvidence } from '../src/utils/bodegaAffinity';
import { generateMatchrimCode } from '../src/utils/matchrimPassport';
import { AIRIM_EVIDENCE_GUARDRAILS } from '../src/utils/aiRimGrounding';
import * as restaurant from '../src/utils/restaurantPairingContext';

const root = new URL('../', import.meta.url);
const before = process.argv.find(arg => arg.startsWith('--before='))?.slice(9);
const baselineRef = 'c25b282';
const base = { potente: 0, acidez: 2.4, dulce: 0, tanico: 0, afrutado: 5 };
const attributes = { scale: 'winerim-0-5' as const, potencia: 0, acidez: 2.4, dulzura: 0, taninos: 0, afrutado: 5 };
const identity = { name: 'Synthetic verified control95', producer: 'Synthetic producer95', vintage: null };
const wine = { ...identity, id: 'controlled-verified', rating: 'love' as const, use_for_profile_training: true,
  sensory_attributes: attributes, place_details: { bodega_sensory_evidence: makeCellarCatalogEvidence(identity, 950095, attributes) } };
const quiz = (extra: Partial<ScanProfileSnapshot> = {}): ScanProfileSnapshot => ({
  profile: { ...base }, source: 'quiz', samples: 0, status: 'ready', note: '', ...extra,
});
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
type Element95 = { type: string; props: Record<string, unknown>; children: unknown[] };
const nodes = (tree: unknown): Element95[] => Array.isArray(tree) ? tree.flatMap(nodes)
  : tree && typeof tree === 'object' && 'type' in tree ? [tree as Element95, ...nodes((tree as Element95).children)] : [];
const text = (tree: unknown): string => Array.isArray(tree) ? tree.map(text).join('')
  : tree && typeof tree === 'object' && 'children' in tree ? text((tree as Element95).children)
    : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
const normalize = (tree: unknown): unknown => {
  if (Array.isArray(tree)) return tree.flat(Infinity).filter(x => x !== false && x != null).map(normalize);
  if (tree && typeof tree === 'object' && 'type' in tree) {
    const node = tree as Element95;
    return { type: node.type, props: Object.fromEntries(Object.entries(node.props)
      .filter(([key]) => key !== 'children').map(([key, value]) => [key, typeof value === 'function' ? '[function]' : value])), children: normalize(node.children) };
  }
  return tree;
};

// Execute the real component, effects, JSX and event closures with deterministic hooks.
// No import of the live client, browser, account or provider transport is possible here.
function mount(componentName: 'AiRimConversation' | 'MatchrimFunction', native: boolean, baseline = false) {
  const file = `src/components/${componentName}.tsx`;
  const source = baseline ? before ? readFileSync(resolve(before, file), 'utf8')
    : execFileSync('git', ['show', `${baselineRef}:${file}`], { cwd: root, encoding: 'utf8' })
    : readFileSync(new URL(file, root), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const code = ast.statements.filter(n => !ts.isImportDeclaration(n) && !ts.isExportAssignment(n)).map(n => n.getText(ast)).join('\n')
    + `\nglobalThis.Component95 = ${componentName};`;
  const slots: { value?: unknown; deps?: unknown[]; cleanup?: () => void }[] = [];
  const effects: (() => void)[] = [];
  let cursor = 0;
  let owner: string | null = 'owner-a95';
  let user: { id: string } | null = { id: owner };
  let tree: unknown;
  const invokes: { body: { message: string; context: string }; signal: AbortSignal }[] = [];
  const streams: unknown[] = [];
  const loads: string[] = [];
  const profileReply = { value: quiz() };
  let profileLoad: (id: string, signal: AbortSignal) => Promise<ScanProfileSnapshot> = async () => profileReply.value;
  let invoke: (body: { message: string; context: string }) => Promise<unknown> = async () => ({ data: { success: true, response: componentName === 'AiRimConversation'
    ? 'Podr\u00eda funcionar con una preparaci\u00f3n suave; escanea la etiqueta para contrastar el vino.'
    : JSON.stringify({ options: [{ wine: 'Estilo fresco', dish: 'Lubina', reason: 'Podr\u00eda funcionar si la salsa es ligera; confirmar la preparaci\u00f3n.' }] }) }, error: null });
  const props = componentName === 'AiRimConversation' ? { onBack: () => {}, initialQuestion: 'Consulta controlada95' }
    : { functionType: 'wine-for-dish', onBack: () => {}, initialInput1: 'Lubina' };
  const supabase = {
    functions: { invoke: async (_name: string, request: typeof invokes[number]) => { invokes.push(request); return invoke(request.body); } },
    from: (table: string) => {
      const result = { data: table === 'quiz_results' ? base : [wine], error: null };
      const query = { select: () => query, eq: () => query, order: () => query, limit: () => query, not: () => query,
        maybeSingle: async () => result, then: (resolve: (r: unknown) => unknown) => Promise.resolve(result).then(resolve) };
      return query;
    },
  };
  const depsChanged = (old: unknown[] | undefined, next: unknown[]) => !old || old.length !== next.length || old.some((v, i) => v !== next[i]);
  const h = {
    useState: (initial: unknown) => {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, (value: unknown) => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }];
    },
    useRef: (initial: unknown) => {
      const i = cursor++; if (!slots[i]) slots[i] = { value: { current: initial } }; return slots[i].value;
    },
    useMemo: (run: () => unknown) => run(),
    useEffect: (run: () => (() => void) | void, deps: unknown[]) => {
      const i = cursor++; const slot = slots[i] ?? (slots[i] = {});
      if (depsChanged(slot.deps, deps)) {
        slot.deps = deps;
        effects.push(() => { slot.cleanup?.(); slot.cleanup = run() || undefined; });
      }
    },
  };
  const globals: Record<string, unknown> = {
    ...h, ...consumer, ...restaurant, AbortController, DOMException, console,
    Date: class extends Date { static now() { return 950095; } },
    React: { createElement: (tag: string, p: Record<string, unknown> | null, ...children: unknown[]) => ({ type: tag, props: p || {}, children }) },
    Capacitor: { isNativePlatform: () => native }, useAuth: () => ({ user }), useNavigate: () => () => {},
    useToast: () => ({ toast: () => {} }), toast: { error: () => {} }, supabase,
    calculateLearnedMatchrimProfile, cellarTrainingRows, generateMatchrimCode, AIRIM_EVIDENCE_GUARDRAILS,
    loadMatchrimScanProfile: (id: string, signal: AbortSignal) => { loads.push(id); return profileLoad(id, signal); },
    streamAiRimResponse: async (request: unknown, onData: (s: string) => void) => { streams.push(request); onData('Controlled legacy stream95'); },
  };
  for (const name of ['ArrowLeft', 'BrainCircuit', 'LoaderCircle', 'ScanLine', 'Send', 'Sparkles', 'UserRound', 'Loader', 'Wine', 'ChefHat', 'Scale', 'X',
    'Button', 'Input', 'Textarea', 'AiRimMark', 'WineRecommendationCard', 'DishRecommendationCard', 'PairingAnalysisCard']) globals[name] = name;
  const context = vm.createContext(globals);
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  const render = (runEffects = true) => {
    cursor = 0; tree = context.Component95(props);
    if (runEffects) while (effects.length) effects.shift()!();
    return tree;
  };
  const flush = async () => { for (let i = 0; i < 8; i++) { render(); await new Promise<void>(r => setImmediate(r)); } return tree; };
  const button = (label: string) => nodes(tree).find(n => n.type === 'Button' && (n.props['aria-label'] === label || text(n).trim() === label))!;
  const send = () => {
    const node = button(componentName === 'AiRimConversation' ? 'Enviar pregunta' : 'Analizar');
    assert(node, 'Actual send button exists');
    (node.props.onClick as () => void)();
  };
  const unmount = () => { for (const slot of slots) slot.cleanup?.(); };
  render();
  return { render, flush, send, button, unmount, invokes, streams, loads, profileReply,
    text: () => text(tree), tree: () => tree,
    inputValue: () => nodes(tree).find(n => n.props.id === (componentName === 'AiRimConversation' ? 'airim-question' : 'airim-guided-input-1'))?.props.value,
    setOwner: (id: string | null) => { owner = id; user = owner ? { id: owner } : null; },
    setProfileLoad: (load: typeof profileLoad) => { profileLoad = load; },
    setInvoke: (load: typeof invoke) => { invoke = load; },
    setInput: (value: string) => {
      const input = nodes(tree).find(n => n.props.id === (componentName === 'AiRimConversation' ? 'airim-question' : 'airim-guided-input-1'))!;
      (input.props.onChange as (event: unknown) => void)({ target: { value } }); render();
    },
  };
}

let groups = 0;
const check = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); groups++; console.log('PASS', name); };
async function main() {
  await check('Base preferences retain actual zero and decimal scale without technical confidence', () => {
    const c = consumer.buildAiRimConsumer95('owner-a95', quiz());
    assert.equal(c.state, 'base'); assert(c.context.includes('potencia 0, acidez 2.4'));
    assert.doesNotMatch(c.context, /\d\s*%|exploraci[o\u00f3]n\s*\d|confianza\s*\d/i);
  });
  await check('Learned context uses real strict verified training, with exact 0..5 axes', async () => {
    const snapshot = await resolveScanProfile('owner-a95', null, { base: async () => base,
      training: async () => cellarTrainingRows([wine], true) }, new AbortController().signal);
    const c = consumer.buildAiRimConsumer95('owner-a95', snapshot);
    assert.equal(c.state, 'learned'); assert.equal(c.samples, 1);
    assert(c.context.includes('potencia 0, acidez 2.4')); assert.doesNotMatch(c.context, /\d\s*%/);
  });
  await check('Unverified, edited identity and edited axes are excluded from native learning', async () => {
    const rows = [wine, { ...wine, id: 'unverified', place_details: {} }, { ...wine, id: 'wrong', producer: 'Changed' },
      { ...wine, id: 'changed-axes', sensory_attributes: { ...attributes, acidez: 4 } }];
    const strict = cellarTrainingRows(rows as TrainableWine[], true);
    assert.equal(strict.length, 1);
    assert.equal(calculateLearnedMatchrimProfile(base, strict).samples, 1);
  });
  await check('Query error is unavailable learning, not a fictional zero-sample result', async () => {
    const snapshot = await resolveScanProfile('owner-a95', null, { base: async () => base,
      training: async () => { throw new Error('Controlled query failure'); } }, new AbortController().signal);
    const c = consumer.buildAiRimConsumer95('owner-a95', snapshot);
    assert.equal(c.state, 'learning-unavailable'); assert.equal(c.samples, null);
    assert.match(c.notice, /no se pudieron consultar/); assert.doesNotMatch(c.context, /sin aprendizaje|no hay valoraciones|confianza\s*\d/i);
  });
  await check('Missing, invalid, anonymous and failed profiles are explicit general advice', () => {
    for (const s of [quiz({ source: 'unavailable', profile: null, status: 'base-error' }), quiz({ profile: null, status: 'missing' }),
      quiz({ profile: { ...base, potente: NaN }, status: 'invalid' })]) assert.equal(consumer.buildAiRimConsumer95('owner-a95', s).state, 'general');
    const anonymous = consumer.buildAiRimConsumer95(null, quiz());
    assert.equal(anonymous.state, 'general'); assert.doesNotMatch(anonymous.context, /potencia 0/);
  });
  await check('Pending or foreign owner cannot create request; request receipt is a frozen copy', () => {
    assert.equal(consumer.aiRimRequestContext95('owner-a95', consumer.pendingAiRimConsumer95('owner-a95')), null);
    const c = consumer.buildAiRimConsumer95('owner-a95', quiz());
    assert.equal(consumer.aiRimRequestContext95('owner-b95', c), null);
    const r = consumer.aiRimRequestContext95('owner-a95', c)!;
    assert.notEqual(c, r); assert(Object.isFrozen(r)); assert.equal(r.context, c.context);
  });
  await check('Ignored profile abort and timeout settle safely without retries or late context', async () => {
    const late = deferred<ScanProfileSnapshot>(); let reads = 0;
    const controller = new AbortController();
    const p = consumer.loadAiRimConsumer95('owner-a95', controller.signal, () => { reads++; return late.promise; });
    await Promise.resolve(); controller.abort(); await assert.rejects(p, /Cancelled/); late.resolve(quiz()); assert.equal(reads, 1);
    const never = deferred<ScanProfileSnapshot>();
    const timed = await consumer.loadAiRimConsumer95('owner-a95', new AbortController().signal, () => never.promise, 5);
    assert.equal(timed.state, 'general'); never.resolve(quiz());
  });
  await check('Native guardrails distinguish palate from bottle evidence and do not claim a human tasting', () => {
    const c = consumer.buildAiRimConsumer95('owner-a95', quiz());
    assert.match(c.context, /no aporta atributos sensoriales verificables/);
    assert.match(c.context, /nombre, bodega, uva o region/);
    assert.match(c.context, /escanear/); assert.match(c.context, /No has probado/);
    for (const value of ['Tu afinidad es 98%', 'Matchrim: 98', 'Afinidad personal de 98 sobre 100', 'Acidez: 4/5', 'Es ideal para ti', 'He probado ese vino', 'Ficha sensorial verificada']) {
      assert.throws(() => consumer.assertAiRimConsumerAnswer95(value));
    }
    assert.equal(consumer.assertAiRimConsumerAnswer95('Podr\u00eda ir con lubina si la salsa es ligera; escanea la etiqueta.'),
      'Podr\u00eda ir con lubina si la salsa es ligera; escanea la etiqueta.');
  });

  for (const component of ['AiRimConversation', 'MatchrimFunction'] as const) {
    await check(`${component}: actual pending button AND closure block requests`, async () => {
      const h = mount(component, true); const late = deferred<ScanProfileSnapshot>(); h.setProfileLoad(() => late.promise);
      try {
        await h.flush(); assert.equal(h.button(component === 'AiRimConversation' ? 'Enviar pregunta' : 'Analizar').props.disabled, true);
        h.send(); await h.flush(); assert.equal(h.invokes.length, 0); assert.match(h.text(), /Cargando tu perfil/);
        late.resolve(quiz()); await h.flush(); h.send(); await h.flush(); assert.equal(h.invokes.length, 1);
        assert(h.invokes[0].body.context.includes('potencia 0, acidez 2.4'));
        assert.match(h.text(), /Contexto enviado/);
      } finally { h.unmount(); late.resolve(quiz()); }
    });
    await check(`${component}: actual failed learning query remains explicit with base context`, async () => {
      const h = mount(component, true);
      h.setProfileLoad(async () => resolveScanProfile('owner-a95', null, { base: async () => base,
        training: async () => { throw new Error('Controlled query error'); } }, new AbortController().signal));
      try {
        await h.flush(); h.send(); await h.flush(); assert.equal(h.invokes.length, 1);
        assert.match(h.invokes[0].body.context, /no se pudieron consultar/);
        assert.doesNotMatch(h.invokes[0].body.context, /Sin aprendizaje|confianza\s*\d/);
        assert.match(h.text(), /valoraciones no disponibles/);
      } finally { h.unmount(); }
    });
    await check(`${component}: actual request receipt stays frozen for the in-flight request`, async () => {
      const h = mount(component, true); const response = deferred<unknown>();
      h.setInvoke(() => response.promise);
      try {
        await h.flush(); h.send(); await h.flush(); const sent = h.invokes[0].body.context;
        h.profileReply.value = quiz({ source: 'learned', samples: 8, profile: { ...base, acidez: 5 } });
        h.setOwner('owner-a95'); await h.flush();
        assert.equal(h.invokes[0].body.context, sent); assert.match(h.text(), /Perfil Matchrim base/);
        assert.doesNotMatch(h.text(), /Perfil \+ 8/);
      } finally { h.unmount(); response.resolve({ data: { success: true, response: 'Late old response' }, error: null }); }
    });
    await check(`${component}: actual owner render/effects discard old profile and ignored-abort response`, async () => {
      const h = mount(component, true); const response = deferred<unknown>(); const newProfile = deferred<ScanProfileSnapshot>();
      h.setInvoke(() => response.promise);
      try {
        await h.flush(); h.send(); await h.flush();
        h.setProfileLoad(() => newProfile.promise); h.setOwner('owner-b95'); h.render(false);
        assert.equal(h.text(), 'Actualizando el contexto de esta cuenta...');
        await h.flush(); response.resolve({ data: { success: true, response: 'SECRET OLD OWNER RESPONSE95' }, error: null });
        await h.flush(); assert.doesNotMatch(h.text(), /SECRET OLD OWNER|Contexto enviado/);
        newProfile.resolve(quiz({ profile: null, source: 'unavailable', status: 'missing' })); await h.flush();
        h.setInput('Nueva consulta95'); h.send(); await h.flush();
        assert.equal(h.loads.at(-1), 'owner-b95'); assert.match(h.invokes.at(-1)!.body.context, /No hay preferencias personales/);
      } finally { h.unmount(); newProfile.resolve(quiz()); response.resolve({}); }
    });
    await check(`${component}: actual late profile from the previous owner cannot settle the new owner's gate`, async () => {
      const h = mount(component, true); const old = deferred<ScanProfileSnapshot>(), current = deferred<ScanProfileSnapshot>();
      h.setProfileLoad(id => id === 'owner-a95' ? old.promise : current.promise);
      try {
        await h.flush(); h.setOwner('owner-b95'); await h.flush();
        old.resolve(quiz({ source: 'learned', samples: 12 })); await h.flush();
        assert.match(h.text(), /Cargando tu perfil/); assert.doesNotMatch(h.text(), /Perfil \+ 12/);
        h.send(); await h.flush(); assert.equal(h.invokes.length, 0);
        current.resolve(quiz({ profile: null, source: 'unavailable', status: 'base-error' })); await h.flush();
        h.setInput('Consulta nueva95'); h.send(); await h.flush();
        assert.equal(h.invokes.length, 1); assert.match(h.invokes[0].body.context, /No hay preferencias personales/);
      } finally { h.unmount(); old.resolve(quiz()); current.resolve(quiz()); }
    });
    await check(`${component}: actual cancel ignores late transport and immediately allows retry`, async () => {
      const h = mount(component, true); const late = deferred<unknown>(); h.setInvoke(() => late.promise);
      try {
        await h.flush(); h.send(); await h.flush();
        const cancel = h.button(component === 'AiRimConversation' ? 'Cancelar consulta' : 'Cancelar');
        (cancel.props.onClick as () => void)(); await h.flush();
        if (component === 'AiRimConversation') assert.equal(h.inputValue(), 'Consulta controlada95');
        late.resolve({ data: { success: true, response: 'LATE CANCELLED RESPONSE95' }, error: null }); await h.flush();
        assert.doesNotMatch(h.text(), /LATE CANCELLED RESPONSE95/);
        h.setInvoke(async () => ({ data: { success: true, response: component === 'AiRimConversation' ? 'Podr\u00eda funcionar; escanea.' : '{"options":[]}' }, error: null }));
        h.send(); await h.flush(); assert.equal(h.invokes.length, 2);
      } finally { h.unmount(); late.resolve({}); }
    });
    await check(`${component}: actual unsafe output cannot display a personal score or tasting claim`, async () => {
      const h = mount(component, true);
      h.setInvoke(async () => ({ data: { success: true, response: component === 'AiRimConversation' ? 'Tu afinidad es 98%; he probado ese vino.'
        : '{"options":[{"wine":"Nombre95","dish":"Lubina","reason":"Tu afinidad es 98%; he probado ese vino."}]}' }, error: null }));
      try {
        await h.flush(); h.send(); await h.flush(); assert.doesNotMatch(h.text(), /98%|he probado ese vino/);
        assert.match(h.text(), component === 'AiRimConversation' ? /no puedo afirmar una afinidad personal/ : /No la he mostrado/);
        assert.match(h.text(), /Escanear etiqueta o carta/);
      } finally { h.unmount(); }
    });
    await check(`${component}: legacy web render and actual request context match frozen pre-slice source`, async () => {
      const old = mount(component, false, true), current = mount(component, false);
      try {
        assert.deepEqual(normalize(current.tree()), normalize(old.tree()));
        await old.flush(); await current.flush(); assert.deepEqual(normalize(current.tree()), normalize(old.tree()));
        old.send(); current.send(); await old.flush(); await current.flush();
        assert.deepEqual(normalize(current.tree()), normalize(old.tree()));
        assert.equal(current.loads.length, 0);
        if (component === 'AiRimConversation') assert.equal(JSON.stringify(current.invokes[0].body), JSON.stringify(old.invokes[0].body));
        else assert.equal(JSON.stringify(current.streams), JSON.stringify(old.streams));
      } finally { old.unmount(); current.unmount(); }
    });
  }
  console.log(JSON.stringify({ passed: true, groups, actualComponentsAndClosures: true, realRequests: 0, providerCalls: 0,
    legacyWebComparedTo: before ?? `git show ${baselineRef}:<component>`, profileSource: 'Existing resolveScanProfile/cellarTrainingRows/learning functions, no formula edits',
    limitation: 'Deterministic hook/transport tests are not human tasting, provider quality, physical native or live account evidence.' }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
