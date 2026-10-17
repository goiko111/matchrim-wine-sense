import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as candidate from '../src/utils/winerimCandidateSearch95';
import { canLookupWinerimOriginal, isVerifiedWinerimSheetForIdentity,
  type WinerimOriginalLookupResult, type WinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';

const root = new URL('../', import.meta.url);
const uuid = 'b653e084-e8e1-448c-bc03-507a1cea3810';
const origin = 'https://app.winerim.com';
const apiRoot = `/api/v1/restaurant/${uuid}/wines`;
// Public identity projection of the immutable captured94 La Gitana control;
// sensory values belong to the detail replay, never to proposal output.
const row = { id: 278688, name: 'Manzanilla La Gitana', subname: null, winery: 'Bodegas Hidalgo La Gitana',
  vintage: null, slugname: 'Manzanilla-La-Gitana', type: 'fortificado', region: 'Jerez-X\u00e9r\u00e8s-Sherry',
  country: 'ES', grapes: [['Palomino Fino']], tastingAttributes: { power: 2, acidity: 4, sweetness: 1, tannin: 0, fruity: 1 } };
const detail = { ...row, grapes: [{ name: 'Palomino Fino' }] };
const proposal: candidate.WinerimCandidate95 = Object.freeze({ id: '278688', name: row.name, winery: row.winery,
  vintage: null, slug: row.slugname, type: row.type, region: row.region });
const sheet: WinerimOriginalSheet = { id: proposal.id, name: proposal.name, producer: proposal.winery, vintage: null,
  region: proposal.region, country: 'ES', grapes: ['Palomino Fino'], detailVerified: true,
  url: `https://web.winerim.com/the-library/wines/${proposal.id}/${proposal.slug}`, sensoryAttributes: row.tastingAttributes };
type Receipt = { case: string; url: string; method?: string; credentials?: string; redirect?: string; headers: string[] };
const receipts: Receipt[] = [];
const groups: { name: string; passed: boolean }[] = [];
let currentCase = '', blockedRealFetch = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { blockedRealFetch++; throw new Error('Real network forbidden in catalogue picker95 tests'); };
const check = async (name: string, run: () => unknown | Promise<unknown>) => {
  currentCase = name;
  await run(); groups.push({ name, passed: true }); console.log('PASS', name);
};
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise<void>(r => setImmediate(r));
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
function mock(handler: (url: URL, init: RequestInit, index: number) => Response | Promise<Response>) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, origin); assert.equal(url.username, ''); assert.equal(url.password, '');
    assert.equal(init.method, 'GET'); assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
    assert.equal(init.referrerPolicy, 'no-referrer');
    const headers = new Headers(init.headers);
    assert.deepEqual([...headers.keys()], ['accept']); assert.equal(headers.get('accept'), 'application/json');
    assert(init.signal instanceof AbortSignal);
    receipts.push({ case: currentCase, url: url.href, method: init.method, credentials: init.credentials,
      redirect: init.redirect, headers: [...headers.keys()] });
    calls.push({ url, init });
    return handler(url, init, calls.length - 1);
  };
  return { fetcher, calls };
}
function library(rows: unknown[] = [row], record: unknown = detail, page: Record<string, unknown> = {}) {
  return mock(url => {
    if (url.pathname === '/api/v1/whoami/slugname') {
      assert.equal(url.search, '?s=the-library'); return json({ restaurant: uuid });
    }
    if (url.pathname === apiRoot) {
      assert.equal(url.searchParams.get('page'), '1'); assert.deepEqual([...url.searchParams.keys()], ['page', 'text']);
      return json({ page: 1, count: rows.length, limit: 20, results: rows, ...page });
    }
    assert.match(url.pathname, new RegExp(`^${apiRoot}/[a-z0-9_-]+/[a-z0-9_-]+$`, 'i'));
    assert.equal(url.search, ''); return json(record);
  });
}
async function searchWith(rows: unknown[] = [row], page: Record<string, unknown> = {}) {
  const net = library(rows, detail, page);
  return { outcome: await candidate.searchWinerimCandidates95('La Gitana', undefined, net.fetcher), net };
}

type Element95 = { type: string | ((props: unknown) => unknown); props: Record<string, unknown>; children: unknown[] };
const nodes = (tree: unknown): Element95[] => Array.isArray(tree) ? tree.flatMap(nodes)
  : tree && typeof tree === 'object' && 'type' in tree ? [tree as Element95, ...nodes((tree as Element95).children)] : [];
const text = (tree: unknown): string => Array.isArray(tree) ? tree.map(text).join('')
  : tree && typeof tree === 'object' && 'children' in tree ? text((tree as Element95).children)
    : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';

// Execute actual component/wrapper hooks, JSX and event closures. Imports of the
// live auth client are removed; useAuth is a local identity-only hook mock.
function mount95(net = library(), native = true) {
  const file = 'src/components/WinerimCandidatePicker95.tsx';
  const source = readFileSync(new URL(file, root), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const code = ast.statements.filter(n => !ts.isImportDeclaration(n)).map(n => n.getText(ast)).join('\n')
    + '\nglobalThis.Component95 = CandidatePicker95; globalThis.Wrapper95 = exports.WinerimCandidatePicker95;';
  type Slot = { value?: unknown; deps?: unknown[]; cleanup?: () => void };
  const outer: Slot[] = []; let inner: Slot[] = [], slots: Slot[] = outer, cursor = 0;
  const effects: (() => void)[] = [];
  let owner: string | null = 'owner-a95', contextKey = 'row-a95', initialQuery = 'Model-suggested unconfirmed name';
  let tree: unknown, key: unknown, child: Element95 | null = null, attached = false;
  const callbacks: { owner: string | null; sheet: WinerimOriginalSheet }[] = [];
  const searches: { query: string; signal: AbortSignal }[] = [];
  const selections: { proposal: candidate.WinerimCandidate95; signal: AbortSignal }[] = [];
  let search = (query: string, signal: AbortSignal) => candidate.searchWinerimCandidates95(query, signal, net.fetcher, 1000);
  let confirm = (value: candidate.WinerimCandidate95, signal: AbortSignal) => candidate.confirmWinerimCandidate95(value, signal, net.fetcher);
  const changed = (old: unknown[] | undefined, next: unknown[]) => !old || old.length !== next.length || old.some((v, i) => v !== next[i]);
  const globals = {
    exports: {}, AbortController, DOMException, console,
    React: { createElement: (tag: Element95['type'], props: Record<string, unknown> | null, ...children: unknown[]) => ({ type: tag, props: props || {}, children }) },
    useState: (initial: unknown) => {
      const i = cursor++; if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      const state = slots[i]; return [state.value, (value: unknown) => { state.value = typeof value === 'function' ? value(state.value) : value; }];
    },
    useRef: (initial: unknown) => {
      const i = cursor++; if (!slots[i]) slots[i] = { value: { current: initial } }; return slots[i].value;
    },
    useId: () => {
      const i = cursor++; if (!slots[i]) slots[i] = { value: `picker95-${i}` }; return slots[i].value;
    },
    useLayoutEffect: (run: () => (() => void) | void, deps: unknown[]) => {
      const i = cursor++; const slot = slots[i] ?? (slots[i] = {});
      if (changed(slot.deps, deps)) { slot.deps = deps; effects.push(() => { slot.cleanup?.(); slot.cleanup = run() || undefined; }); }
    },
    useAuth: () => ({ user: owner ? { id: owner } : null }), Capacitor: { isNativePlatform: () => native },
    Button: 'Button', Input: 'Input', Check: 'Check', Loader2: 'Loader2', Search: 'Search', X: 'X',
    isWinerimCandidateQuery95: candidate.isWinerimCandidateQuery95,
    searchWinerimCandidates95: (query: string, signal: AbortSignal) => { searches.push({ query, signal }); return search(query, signal); },
    confirmWinerimCandidate95: (value: candidate.WinerimCandidate95, signal: AbortSignal) => { selections.push({ proposal: value, signal }); return confirm(value, signal); },
  };
  const context = vm.createContext(globals);
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  const cleanup = () => { for (const slot of inner) slot.cleanup?.(); attached = false; };
  const renderOuter = () => {
    slots = outer; cursor = 0;
    child = context.Wrapper95({ initialQuery, contextKey, onConfirmed: (value: WinerimOriginalSheet) => callbacks.push({ owner, sheet: value }) });
    return child;
  };
  const render = () => {
    renderOuter();
    if (!child) { cleanup(); tree = null; return tree; }
    if (!attached || key !== child.props.key) { cleanup(); inner = []; key = child.props.key; attached = true; }
    slots = inner; cursor = 0; tree = context.Component95(child.props);
    while (effects.length) effects.shift()!();
    return tree;
  };
  const flush = async () => { for (let i = 0; i < 10; i++) { render(); await tick(); } return tree; };
  const button = (label: string) => nodes(tree).find(n => n.type === 'Button' && (n.props['aria-label'] === label || text(n).trim() === label));
  const click = (label: string) => { const b = button(label); assert(b, label); (b.props.onClick as () => void)(); };
  const choose = (index = 0) => {
    const b = nodes(tree).filter(n => n.type === 'Button' && text(n).trim() === 'Esta es mi botella')[index];
    assert(b); (b.props.onClick as () => void)();
  };
  const submit = () => { const form = nodes(tree).find(n => n.type === 'form'); assert(form); (form.props.onSubmit as (event: unknown) => void)({ preventDefault: () => {} }); };
  render();
  return { net, callbacks, searches, selections, render, renderOuter, flush, click, choose, submit, button,
    tree: () => tree, text: () => text(tree), unmount: cleanup,
    setInput: (value: string) => { const input = nodes(tree).find(n => n.type === 'Input'); assert(input); (input.props.onChange as (event: unknown) => void)({ target: { value } }); render(); },
    setOwner: (value: string | null) => { owner = value; }, setContext: (value: string) => { contextKey = value; },
    setInitialQuery: (value: string) => { initialQuery = value; },
    setSearch: (run: typeof search) => { search = run; }, setConfirm: (run: typeof confirm) => { confirm = run; },
  };
}

async function main() {
  await check('Public La Gitana proposal projects only seven identity fields, no sensory/score/photos', async () => {
    const { outcome, net } = await searchWith([{ ...row, score: 99, profile: { personal: true }, photo: 'https://invalid.invalid/photo' }]);
    assert.equal(outcome.status, 'proposals');
    if (outcome.status !== 'proposals') return;
    assert.deepEqual(outcome.proposals, [proposal]); assert.equal(outcome.total, 1);
    assert.deepEqual(Object.keys(outcome.proposals[0]).sort(), ['id', 'name', 'region', 'slug', 'type', 'vintage', 'winery']);
    assert(Object.isFrozen(outcome.proposals)); assert(Object.isFrozen(outcome.proposals[0]));
    assert.equal(net.calls.length, 2);
    assert.equal(net.calls[1].url.href, `${origin}${apiRoot}?page=1&text=La+Gitana`);
  });
  for (const query of ['', 'x', 'x'.repeat(121), 'La\nGitana', 'La\u0000Gitana', 'La\u202eGitana', 'https://evil.invalid/x', '//evil.invalid/x', 'La\\Gitana']) {
    await check(`Invalid query ${JSON.stringify(query.slice(0, 32))} makes zero requests`, async () => {
      const net = library(); assert.equal((await candidate.searchWinerimCandidates95(query, undefined, net.fetcher)).status, 'invalid-query');
      assert.equal(net.calls.length, 0);
    });
  }
  await check('Bounded malicious punctuation remains one encoded text parameter on fixed public origin', async () => {
    const net = library(); const value = 'Gitana&text=other#../?page=999%00';
    assert.equal((await candidate.searchWinerimCandidates95(value, undefined, net.fetcher)).status, 'proposals');
    assert.equal(net.calls[1].url.searchParams.get('text'), value); assert.equal(net.calls[1].url.hash, '');
    assert.equal(net.calls[1].url.searchParams.getAll('text').length, 1);
    assert.equal(net.calls[1].url.searchParams.get('page'), '1');
  });
  await check('Accents and literal whitespace are preserved, never a producer/year guess', async () => {
    const net = library(); await candidate.searchWinerimCandidates95('  Cuv\u00e9e Especial  ', undefined, net.fetcher);
    assert.equal(net.calls[1].url.searchParams.get('text'), 'Cuv\u00e9e Especial');
  });
  for (const restaurant of ['the-library', '../foreign', 'https://evil.invalid', uuid + '/other', null, 1]) {
    await check(`Invalid resolver ${JSON.stringify(restaurant)} stops before list`, async () => {
      const net = mock(() => json({ restaurant }));
      assert.equal((await candidate.searchWinerimCandidates95('Gitana', undefined, net.fetcher)).status, 'unavailable'); assert.equal(net.calls.length, 1);
    });
  }
  for (const [name, page] of Object.entries({
    'truncated count': { count: 21 }, 'wrong page': { page: 2 }, 'fractional count': { count: 1.1 },
    'negative count': { count: -1 }, 'string count': { count: '1' }, 'missing results': { results: null },
    'oversize page limit': { limit: 100 }, 'inconsistent zero count': { count: 0 },
  })) {
    await check(`Incomplete ${name} asks refine without proposals`, async () => { assert.deepEqual((await searchWith([row], page)).outcome, { status: 'refine' }); });
  }
  await check('21 rows refine; no truncation or uniqueness claim', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({ ...row, id: i + 1 }));
    assert.deepEqual((await searchWith(rows)).outcome, { status: 'refine' });
  });
  await check('Complete 20 rows bounded; empty is local query result, not catalogue absence', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ ...row, id: i + 1 }));
    const result = (await searchWith(rows)).outcome; assert.equal(result.status, 'proposals');
    if (result.status === 'proposals') assert.equal(result.proposals.length, 20);
    assert.deepEqual((await searchWith([])).outcome, { status: 'empty' });
  });
  for (const [name, edit] of Object.entries({
    'missing producer': { winery: null }, 'empty producer': { winery: '' }, 'unbounded producer': { winery: 'x'.repeat(161) },
    'missing name': { name: null }, 'control character': { name: 'Gitana\n2021' }, 'placeholder name': { name: 'Vino' },
    'bad id': { id: '../other' }, 'synthetic id': { id: 'winerim-278688' }, 'zero id': { id: 0 },
    'fractional id': { id: 2.5 }, 'unsafe integer': { id: Number.MAX_SAFE_INTEGER + 1 }, 'URL slug': { slugname: 'https://evil.invalid' },
    'encoded path slug': { slugname: 'Gitana%2fother' }, 'unknown year string': { vintage: 'NV' },
    'year object': { vintage: {} }, 'invalid year': { vintage: 1899 }, 'nonwine name': { name: 'Beer La Gitana' },
    'nonwine type': { type: 'cocktail' }, 'region object': { region: {} }, 'type object': { type: {} },
  })) {
    await check(`Malformed public row: ${name} fails closed, no partial proposals`, async () => {
      assert.deepEqual((await searchWith([row, { ...row, id: 950096, ...edit }])).outcome, { status: 'refine' });
    });
  }
  for (const second of [row, { ...row, winery: 'Other winery' }, { ...row, id: String(row.id) }]) {
    await check(`Duplicate id (${second.winery}, ${typeof second.id}) asks refine`, async () => {
      assert.deepEqual((await searchWith([row, second])).outcome, { status: 'refine' });
    });
  }
  await check('Source subname is included exactly once for selected strict identity', async () => {
    const result = (await searchWith([{ ...row, name: 'Manzanilla', subname: 'La Gitana' }])).outcome;
    assert.equal(result.status, 'proposals'); if (result.status === 'proposals') assert.equal(result.proposals[0].name, row.name);
    const same = (await searchWith([{ ...row, subname: 'La Gitana' }])).outcome;
    assert.equal(same.status, 'proposals'); if (same.status === 'proposals') assert.equal(same.proposals[0].name, row.name);
  });
  for (const [name, response] of Object.entries({
    'non JSON': () => new Response('{}', { headers: { 'Content-Type': 'text/html' } }),
    'invalid JSON': () => new Response('{', { headers: { 'Content-Type': 'application/json' } }),
    'misleading MIME': () => new Response('{}', { headers: { 'Content-Type': 'text/html; x=application/json' } }),
    'HTTP error': () => json({}, 503),
    'redirect': () => new Response(null, { status: 302, headers: { Location: 'https://evil.invalid' } }),
    'foreign final URL': () => { const r = json({ restaurant: uuid }); Object.defineProperty(r, 'url', { value: 'https://evil.invalid' }); return r; },
    'followed redirect': () => { const r = json({ restaurant: uuid }); Object.defineProperty(r, 'redirected', { value: true }); return r; },
    'oversize content length': () => json({}, 200, { 'Content-Length': '262145' }),
    'invalid content length': () => json({}, 200, { 'Content-Length': 'oops' }),
    'invalid UTF8': () => new Response(new Uint8Array([0xff]), { headers: { 'Content-Type': 'application/json' } }),
  })) {
    await check(`Transport ${name} unavailable with one attempt, no alternative host/path`, async () => {
      const net = mock(response); assert.deepEqual(await candidate.searchWinerimCandidates95('Gitana', undefined, net.fetcher), { status: 'unavailable' });
      assert.equal(net.calls.length, 1);
    });
  }
  await check('Oversize streaming bytes cancel body even without Content-Length', async () => {
    let cancelled = 0;
    const net = mock(() => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(262145)); }, cancel() { cancelled++; } }),
      { headers: { 'Content-Type': 'application/json' } }));
    assert.equal((await candidate.searchWinerimCandidates95('Gitana', undefined, net.fetcher)).status, 'unavailable'); assert.equal(cancelled, 1);
  });
  await check('Exactly 256 KiB response accepted; UTF8 byte rather than character bound', async () => {
    const base = JSON.stringify({ restaurant: uuid });
    const padded = base + ' '.repeat(262144 - Buffer.byteLength(base));
    const net = mock((_url, _init, index) => index === 0 ? new Response(padded, { headers: { 'Content-Type': 'application/json' } }) : json({ page: 1, count: 0, results: [] }));
    assert.equal((await candidate.searchWinerimCandidates95('Gitana', undefined, net.fetcher)).status, 'empty');
    const huge = mock(() => json({ restaurant: uuid, padding: '\u00e9'.repeat(140000) }));
    assert.equal((await candidate.searchWinerimCandidates95('Gitana', undefined, huge.fetcher)).status, 'unavailable');
  });
  await check('Hung ignored-signal fetch times out once and cancels late response body', async () => {
    const late = deferred<Response>(); let cancelled = 0;
    const net = mock(() => late.promise);
    assert.equal((await candidate.searchWinerimCandidates95('Gitana', undefined, net.fetcher, 5)).status, 'unavailable');
    assert.equal(net.calls.length, 1); assert(net.calls[0].init.signal?.aborted);
    late.resolve(new Response(new ReadableStream({ cancel() { cancelled++; } }), { headers: { 'Content-Type': 'application/json' } }));
    await tick(); assert.equal(cancelled, 1);
  });
  await check('Hung response stream times out and cancels reader', async () => {
    let cancelled = 0;
    const net = mock(() => new Response(new ReadableStream({ cancel() { cancelled++; } }), { headers: { 'Content-Type': 'application/json' } }));
    assert.equal((await candidate.searchWinerimCandidates95('Gitana', undefined, net.fetcher, 5)).status, 'unavailable'); assert.equal(cancelled, 1);
  });
  await check('The second-stage list is independently byte-bounded and never retried', async () => {
    let cancelled = 0;
    const net = mock((_url, _init, index) => index === 0 ? json({ restaurant: uuid })
      : new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(262145)); }, cancel() { cancelled++; } }),
        { headers: { 'Content-Type': 'application/json' } }));
    assert.equal((await candidate.searchWinerimCandidates95('Gitana', undefined, net.fetcher)).status, 'unavailable');
    assert.equal(net.calls.length, 2); assert.equal(cancelled, 1);
  });
  await check('Hung second-stage fetch and hung stream cancellation cannot keep search pending', async () => {
    const never = deferred<Response>();
    const net = mock((_url, _init, index) => index === 0 ? json({ restaurant: uuid }) : never.promise);
    assert.equal((await candidate.searchWinerimCandidates95('Gitana', undefined, net.fetcher, 5)).status, 'unavailable');
    assert.equal(net.calls.length, 2); never.resolve(json({ page: 1, count: 0, results: [] }));
    const hangingCancel = mock(() => new Response(new ReadableStream({ cancel() { return new Promise(() => {}); } }),
      { headers: { 'Content-Type': 'application/json' } }));
    assert.equal((await candidate.searchWinerimCandidates95('Gitana', undefined, hangingCancel.fetcher, 5)).status, 'unavailable');
  });
  await check('External cancellation rejects before fetch and during ignored transport', async () => {
    const first = new AbortController(); first.abort(); const net = library();
    await assert.rejects(candidate.searchWinerimCandidates95('Gitana', first.signal, net.fetcher), { name: 'AbortError' });
    assert.equal(net.calls.length, 0);
    const late = deferred<Response>(), c = new AbortController(), hung = mock(() => late.promise);
    const pending = candidate.searchWinerimCandidates95('Gitana', c.signal, hung.fetcher); c.abort();
    await assert.rejects(pending, { name: 'AbortError' }); late.resolve(json({ restaurant: uuid })); await tick(); assert.equal(hung.calls.length, 1);
  });
  await check('Selected genuine unknown-vintage identity uses unchanged strict lookup and preserves actual zero', async () => {
    const net = library(); const result = await candidate.confirmWinerimCandidate95(proposal, undefined, net.fetcher);
    assert.equal(result.status, 'verified'); if (result.status !== 'verified') return;
    assert.equal(result.sheet.vintage, null); assert.deepEqual(result.sheet.sensoryAttributes, row.tastingAttributes);
    assert.equal(result.sheet.sensoryAttributes?.tannin, 0); assert.equal(net.calls.length, 3);
    assert.equal(net.calls[1].url.searchParams.get('text'), proposal.name);
    assert(isVerifiedWinerimSheetForIdentity(candidate.winerimCandidateIdentity95(proposal), result.sheet));
    assert.equal(canLookupWinerimOriginal({ name: 'La Gitana', producer: null, vintage: null }), false);
    assert.equal(isVerifiedWinerimSheetForIdentity({ name: proposal.name, producer: 'Other' }, result.sheet), false);
  });
  await check('Omitted source vintage remains unknown; no invented NV or year label', async () => {
    const { outcome } = await searchWith([{ ...row, vintage: undefined }]); assert.equal(outcome.status, 'proposals');
    if (outcome.status === 'proposals') assert.equal(outcome.proposals[0].vintage, null);
  });
  await check('Actual strict confirmation cancels before request and during ignored late detail fetch', async () => {
    const controller = new AbortController(); controller.abort(); const untouched = library();
    await assert.rejects(candidate.confirmWinerimCandidate95(proposal, controller.signal, untouched.fetcher), { name: 'AbortError' });
    assert.equal(untouched.calls.length, 0);
    const late = deferred<Response>(), normal = library(), cancel = new AbortController(); let cancelled = 0;
    const net = mock((url, init, index) => index === 2 ? late.promise : normal.fetcher(url, init));
    const pending = candidate.confirmWinerimCandidate95(proposal, cancel.signal, net.fetcher);
    await tick(); assert.equal(net.calls.length, 3); cancel.abort();
    await assert.rejects(pending, { name: 'AbortError' });
    late.resolve(new Response(new ReadableStream({ cancel() { cancelled++; } }), { headers: { 'Content-Type': 'application/json' } }));
    await tick(); assert.equal(cancelled, 1);
  });
  await check('Selected literal year is preserved, never borrowed from initial model query', async () => {
    const dated = { ...row, vintage: '2021' }; const net = library([dated], { ...detail, vintage: '2021' });
    const result = await candidate.confirmWinerimCandidate95({ ...proposal, vintage: '2021' }, undefined, net.fetcher);
    assert.equal(result.status, 'verified'); if (result.status === 'verified') assert.equal(result.sheet.vintage, '2021');
  });
  for (const [name, change] of Object.entries({
    name: { name: 'Other wine' }, producer: { winery: 'Other winery' }, vintage: { vintage: '2021' },
    id: { id: 950096 }, slug: { slugname: 'Other-Slug' }, region: { region: 'Bordeaux' }, country: { country: 'FR' },
  })) {
    await check(`Source list/detail ${name} mismatch never confirms`, async () => {
      const result = await candidate.confirmWinerimCandidate95(proposal, undefined, library([row], { ...detail, ...change }).fetcher);
      assert.notEqual(result.status, 'verified');
    });
  }
  await check('Same identity at a different id/slug cannot replace selected record', async () => {
    const replacement = { ...row, id: 950096, slugname: 'Different-Record' };
    assert.deepEqual(await candidate.confirmWinerimCandidate95(proposal, undefined, library([replacement], { ...detail, ...replacement }).fetcher), { status: 'ambiguous' });
  });
  await check('Duplicate identity records in strict re-search remain ambiguous', async () => {
    assert.deepEqual(await candidate.confirmWinerimCandidate95(proposal, undefined, library([row, { ...row, id: 950096 }]).fetcher), { status: 'ambiguous' });
  });
  await check('Detail without sensory axes does not invent fallback attributes or score', async () => {
    const result = await candidate.confirmWinerimCandidate95(proposal, undefined, library([row], { ...detail, tastingAttributes: null }).fetcher);
    assert.equal(result.status, 'verified'); if (result.status === 'verified') {
      assert.equal(result.sheet.sensoryAttributes, null); assert.equal('score' in result.sheet, false);
    }
  });
  await check('Injected fields and invalid candidate cannot bypass public proposal contract', async () => {
    const net = library();
    for (const edit of [{ winery: '' }, { vintage: 'NV' }, { slug: '../other' }, { score: 99 }, { sensoryAttributes: row.tastingAttributes }]) {
      assert.equal((await candidate.confirmWinerimCandidate95({ ...proposal, ...edit }, undefined, net.fetcher)).status, 'identity-required');
    }
    assert.equal(net.calls.length, 0);
  });
  await check('Candidate snapshot cannot mutate its id while strict detail is pending', async () => {
    const late = deferred<Response>(); const normal = library();
    const net = mock((url, init, index) => index === 0 ? late.promise : normal.fetcher(url, init));
    const mutable = { ...proposal }; const pending = candidate.confirmWinerimCandidate95(mutable, undefined, net.fetcher);
    mutable.id = '950096'; mutable.slug = 'Changed'; late.resolve(json({ restaurant: uuid }));
    const result = await pending; assert.equal(result.status, 'verified'); if (result.status === 'verified') assert.equal(result.sheet.id, proposal.id);
  });

  await check('Actual component is opt-in: neither mount, open nor edited model text automatically searches/binds', async () => {
    const h = mount95(); try {
      await h.flush(); assert.equal(h.searches.length, 0); assert.equal(h.callbacks.length, 0);
      h.click('Buscar por nombre'); await h.flush(); h.setInput('La Gitana'); await h.flush();
      assert.equal(h.net.calls.length, 0); assert.equal(h.selections.length, 0);
      h.submit(); await h.flush(); assert.equal(h.searches.length, 1); assert.equal(h.net.calls.length, 2);
      assert.equal(h.callbacks.length, 0); assert.equal(h.selections.length, 0);
      assert.match(h.text(), /A\u00f1ada no indicada/); assert.doesNotMatch(h.text(), /NV|\d\s*%|acidez|tanino/i);
    } finally { h.unmount(); }
  });
  await check('Actual explicit confirmation uses selected catalogue identity and invokes onConfirmed exactly once', async () => {
    const h = mount95(); try {
      h.click('Buscar por nombre'); await h.flush(); h.submit(); await h.flush();
      const old = h.button('Esta es mi botella')!;
      h.choose(); await h.flush(); assert.equal(h.callbacks.length, 1); assert.equal(h.selections.length, 1);
      assert.deepEqual(h.selections[0].proposal, proposal); assert.equal(h.callbacks[0].sheet.id, proposal.id);
      assert(h.callbacks[0].sheet.detailVerified); assert.equal(h.net.calls.length, 5);
      assert.equal(h.net.calls[3].url.searchParams.get('text'), proposal.name);
      (old.props.onClick as () => void)(); await h.flush(); assert.equal(h.callbacks.length, 1); assert.equal(h.selections.length, 1);
      assert.match(h.text(), /Ficha original verificada/);
    } finally { h.unmount(); }
  });
  await check('Actual 20-result UI shows only top three, with bounded count and refine copy; no uniqueness claim', async () => {
    const h = mount95(library(Array.from({ length: 20 }, (_, i) => ({ ...row, id: i + 1 })))); try {
      h.click('Buscar por nombre'); await h.flush(); h.submit(); await h.flush();
      assert.equal(nodes(h.tree()).filter(n => n.type === 'li').length, 3);
      assert.match(h.text(), /3 de 20 propuestas/); assert.match(h.text(), /Concreta el nombre/);
      assert.doesNotMatch(h.text(), /\u00fanic[ao]|coincidencia exacta/i); assert.equal(h.callbacks.length, 0);
    } finally { h.unmount(); }
  });
  await check('Actual incomplete and unavailable UI reports safe pending, not absence or a guessed fiche', async () => {
    const h = mount95(library([row], detail, { count: 100 })); try {
      h.click('Buscar por nombre'); await h.flush(); h.submit(); await h.flush(); assert.match(h.text(), /Concreta el nombre/);
      assert.equal(h.button('Esta es mi botella'), undefined); assert.equal(h.callbacks.length, 0);
      h.setSearch(async () => ({ status: 'unavailable' })); h.submit(); await h.flush(); assert.match(h.text(), /identidad y la afinidad siguen pendientes/);
    } finally { h.unmount(); }
  });
  await check('Actual mismatch in strict detail never invokes confirmation callback', async () => {
    const h = mount95(library([row], { ...detail, winery: 'Other winery' })); try {
      h.click('Buscar por nombre'); await h.flush(); h.submit(); await h.flush(); h.choose(); await h.flush();
      assert.equal(h.callbacks.length, 0); assert.match(h.text(), /siguen pendientes/);
    } finally { h.unmount(); }
  });
  await check('Actual invalid input closure guards disabled button without a request', async () => {
    const h = mount95(); try {
      h.click('Buscar por nombre'); await h.flush(); h.setInput('x'); assert.equal(h.button('Buscar')!.props.disabled, true);
      h.submit(); await h.flush(); assert.equal(h.net.calls.length, 0); assert.match(h.text(), /entre 2 y 120/);
    } finally { h.unmount(); }
  });
  await check('Actual cancellation ignores a late search even when transport ignores AbortSignal', async () => {
    const h = mount95(), late = deferred<candidate.WinerimCandidateSearchResult95>(); try {
      h.setSearch(() => late.promise); h.click('Buscar por nombre'); await h.flush(); h.submit(); await h.flush();
      h.click('Cancelar'); assert(h.searches[0].signal.aborted); late.resolve({ status: 'proposals', query: 'old', total: 1, proposals: [proposal] });
      await h.flush(); assert.equal(h.button('Esta es mi botella'), undefined); assert.equal(h.callbacks.length, 0);
      assert.match(h.text(), /cancelada/);
    } finally { h.unmount(); }
  });
  for (const reason of ['cancel', 'query edit', 'owner', 'context', 'initial query', 'unmount', 'close'] as const) {
    await check(`Actual ${reason} invalidates late detail and former selection event`, async () => {
      const h = mount95(), late = deferred<WinerimOriginalLookupResult>(); try {
        h.click('Buscar por nombre'); await h.flush(); h.submit(); await h.flush();
        const previous = h.button('Esta es mi botella')!;
        h.setConfirm(() => late.promise); h.choose(); await h.flush();
        if (reason === 'cancel') h.click('Cancelar');
        else if (reason === 'query edit') h.setInput('Edited bottle');
        else if (reason === 'owner') { h.setOwner('owner-b95'); h.renderOuter(); }
        else if (reason === 'context') { h.setContext('edited-row'); h.renderOuter(); }
        else if (reason === 'initial query') { h.setInitialQuery('New name'); h.renderOuter(); }
        else if (reason === 'unmount') h.unmount();
        else h.click('Cerrar b\u00fasqueda');
        late.resolve({ status: 'verified', sheet }); await tick(); await tick();
        assert.equal(h.callbacks.length, 0);
        if (['owner', 'context', 'initial query'].includes(reason)) h.render();
        if (reason !== 'cancel') { (previous.props.onClick as () => void)(); await tick(); assert.equal(h.selections.length, 1); }
        if (reason !== 'unmount') await h.flush();
        assert(h.selections[0].signal.aborted); assert.equal(h.callbacks.length, 0);
      } finally { h.unmount(); late.resolve({ status: 'verified', sheet }); }
    });
  }
  await check('Actual changing selected proposal cancels prior detail and ignores its late result', async () => {
    const second = { ...row, id: 950096, name: 'Synthetic second control95', slugname: 'Synthetic-second-control95' };
    const h = mount95(library([row, second])), first = deferred<WinerimOriginalLookupResult>(), next = deferred<WinerimOriginalLookupResult>();
    try {
      h.click('Buscar por nombre'); await h.flush(); h.submit(); await h.flush();
      h.setConfirm(value => value.id === proposal.id ? first.promise : next.promise);
      h.choose(0); await h.flush(); h.choose(1); await h.flush(); assert(h.selections[0].signal.aborted);
      first.resolve({ status: 'verified', sheet }); await h.flush(); assert.equal(h.callbacks.length, 0);
      next.resolve({ status: 'verified', sheet: { ...sheet, id: '950096', name: second.name,
        url: `https://web.winerim.com/the-library/wines/950096/${second.slugname}` } });
      await h.flush(); assert.equal(h.callbacks.length, 1); assert.equal(h.callbacks[0].sheet.id, '950096');
    } finally { h.unmount(); first.resolve({ status: 'unavailable' }); next.resolve({ status: 'unavailable' }); }
  });
  await check('Actual stale owner before layout cleanup cannot start or confirm via an old closure', async () => {
    const h = mount95(); try {
      h.click('Buscar por nombre'); await h.flush(); h.submit(); await h.flush();
      const old = h.button('Esta es mi botella')!; h.setOwner(null); h.renderOuter();
      (old.props.onClick as () => void)(); assert.equal(h.selections.length, 0); assert.equal(h.callbacks.length, 0);
      h.render(); await h.flush(); assert.equal(h.button('Esta es mi botella'), undefined);
    } finally { h.unmount(); }
  });
  await check('Actual web wrapper returns null with no requests or changed legacy rendering', async () => {
    const h = mount95(library(), false); try { await h.flush(); assert.equal(h.tree(), null); assert.equal(h.net.calls.length, 0); } finally { h.unmount(); }
  });
  await check('Actual public anonymous picker remains opt-in and cancels when owner logs in', async () => {
    const h = mount95(), late = deferred<candidate.WinerimCandidateSearchResult95>(); try {
      h.setOwner(null); h.render(); h.click('Buscar por nombre'); await h.flush(); h.setSearch(() => late.promise); h.submit(); await h.flush();
      h.setOwner('owner-new95'); h.render(); late.resolve({ status: 'proposals', query: 'old', total: 1, proposals: [proposal] });
      await h.flush(); assert(h.searches[0].signal.aborted); assert.equal(h.button('Esta es mi botella'), undefined); assert.equal(h.callbacks.length, 0);
    } finally { h.unmount(); }
  });
  await check('Actual pending detail and unknown vintage render ordinary UTF8, not literal escapes', async () => {
    const h = mount95(), late = deferred<WinerimOriginalLookupResult>(); try {
      h.click('Buscar por nombre'); await h.flush(); h.submit(); await h.flush();
      assert(h.text().includes('A\u00f1ada no indicada'));
      assert(h.button('Cerrar b\u00fasqueda'));
      h.setConfirm(() => late.promise); h.choose(); await h.flush();
      const statuses = nodes(h.tree()).filter(n => n.props.role === 'status').map(text);
      assert(statuses.includes('Verificando la ficha de tu elecci\u00f3n...'));
      assert.doesNotMatch(h.text(), /\\u[0-9a-f]{4}/i);
      h.click('Cancelar'); late.resolve({ status: 'verified', sheet }); await h.flush();
      assert.equal(h.callbacks.length, 0);
    } finally { h.unmount(); late.resolve({ status: 'unavailable' }); }
  });
  await check('Unknown-year proposal warns that bottle harvest is not verified; dated proposal does not', async () => {
    for (const vintage of [null, '2021']) {
      const h = mount95(library([{ ...row, vintage }], { ...detail, vintage })); try {
        h.click('Buscar por nombre'); await h.flush(); h.submit(); await h.flush();
        const warning = 'Esta referencia no indica a\u00f1ada; elegirla no verifica la cosecha de tu botella.';
        assert.equal(h.text().includes(warning), vintage === null);
        assert.equal(h.text().includes('A\u00f1ada no indicada'), vintage === null);
        assert.equal(h.callbacks.length, 0);
        h.choose(); await h.flush(); assert.equal(h.callbacks.length, 1);
        assert.equal(h.callbacks[0].sheet.vintage, vintage);
      } finally { h.unmount(); }
    }
  });
  await check('Public requests and sheet-only callback expose no auth owner; changing owner clears confirmed UI', async () => {
    const h = mount95(); try {
      h.click('Buscar por nombre'); await h.flush(); h.submit(); await h.flush(); h.choose(); await h.flush();
      assert.equal(h.callbacks.length, 1);
      assert.deepEqual(Object.keys(h.callbacks[0].sheet).sort(),
        ['country', 'detailVerified', 'grapes', 'id', 'name', 'producer', 'region', 'sensoryAttributes', 'url', 'vintage']);
      assert.doesNotMatch(JSON.stringify(h.callbacks[0].sheet), /owner-a95|owner-b95|authorization|access_token|refresh_token/);
      for (const call of h.net.calls) {
        assert.equal(call.init.body, undefined);
        assert.doesNotMatch(call.url.href, /owner-a95|owner-b95|authorization|access_token|refresh_token/);
        assert.deepEqual([...new Headers(call.init.headers).keys()], ['accept']);
        assert.equal(call.init.credentials, 'omit');
      }
      assert.doesNotMatch(JSON.stringify(h.tree()), /owner-a95|owner-b95/);
      h.setOwner('owner-b95'); h.render(); await h.flush();
      assert(h.button('Buscar por nombre')); assert.equal(h.button('Referencia confirmada'), undefined);
      assert.doesNotMatch(h.text(), /Manzanilla|Bodegas Hidalgo|Ficha original verificada/);
      assert.equal(h.callbacks.length, 1);
    } finally { h.unmount(); }
  });
  await check('Actual TSX source has no Unicode escape in direct JSX text or quoted JSX attributes', () => {
    const file = 'src/components/WinerimCandidatePicker95.tsx';
    const ast = ts.createSourceFile(file, readFileSync(new URL(file, root), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node) || ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
        assert.doesNotMatch(node.getText(ast), /\\u(?:[0-9a-f]{4}|\{[0-9a-f]+\})/i);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  });
  await check('Actual controls have >=44px class constraints, multiline buttons and no nested cards or literal Unicode escapes', async () => {
    const h = mount95(); try {
      h.click('Buscar por nombre'); await h.flush(); h.submit(); await h.flush();
      for (const n of nodes(h.tree()).filter(n => ['Button', 'Input'].includes(String(n.type)))) {
        assert.match(String(n.props.className), /(?:min-h-11|h-11)/);
        if (n.type === 'Button' && !n.props['aria-label']) assert.match(String(n.props.className), /h-auto.*whitespace-normal/);
      }
      assert.equal(nodes(h.tree()).filter(n => /Card|img/.test(String(n.type))).length, 0);
      assert.equal(nodes(h.tree()).some(n => 'dangerouslySetInnerHTML' in n.props), false);
      const s = nodes(h.tree()).find(n => n.type === 'section')!;
      assert.deepEqual(JSON.parse(JSON.stringify(s.props.style)), { overflowWrap: 'anywhere', wordBreak: 'normal' });
      assert.doesNotMatch(h.text() + nodes(h.tree()).map(n => n.props['aria-label'] ?? '').join(''), /\\u[0-9a-f]{4}/i);
    } finally { h.unmount(); }
  });
  assert.equal(blockedRealFetch, 0, 'Every request must use an injected mock, not even blocked global fetch');
  const sourceFiles = ['src/utils/winerimCandidateSearch95.ts', 'src/components/WinerimCandidatePicker95.tsx',
    'scripts/check-matchrim-consumer95-catalog-picker.ts', 'src/utils/winerimOriginalSheet.ts', 'src/utils/winerimLabelIdentity.ts',
    'src/components/WinerimSheetLookup.tsx'];
  const sources = sourceFiles.map(file => ({ file, sha256: createHash('sha256').update(readFileSync(new URL(file, root))).digest('hex') }));
  const report = { scope: 'Unit mock fetch + actual TSX wrapper/effect/event closures. No browser or live catalogue claim.',
    passed: groups.length, total: groups.length, groups, mockRequests: receipts.length, receipts, sources,
    realNetworkCalls: 0, blockedRealFetch, accountActions: 0, paidCalls: 0, productionWrites: 0,
    limits: 'La Gitana public projection is a replay; synthetic mutations exercise paths, not independent catalogue coverage. Text200 layout is constrained in source only, not visually measured here. Parent owns integration, manual identity reconciliation and app QA. No global catalogue precision/coverage or real bottle identity claim.' };
  const output = process.argv.find(arg => arg.startsWith('--evidence='))?.slice(11);
  if (output) {
    const folder = resolve(output);
    assert(folder.includes('/artifacts/matchrim95-eight-hours-20261017/catalog-picker95/'), 'Use new private catalogue picker evidence subdirectory');
    mkdirSync(folder, { recursive: true });
    writeFileSync(resolve(folder, 'test-report.json'), JSON.stringify(report, null, 2) + '\n');
    for (const file of sourceFiles.slice(0, 3)) {
      const target = resolve(folder, 'source', file); mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(new URL(file, root)));
    }
  }
  console.log(JSON.stringify({ passed: report.passed, total: report.total, mockRequests: report.mockRequests,
    realNetworkCalls: 0, blockedRealFetch, sources }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { globalThis.fetch = originalFetch; });
