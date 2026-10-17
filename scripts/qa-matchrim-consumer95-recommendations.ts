import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync, appendFileSync, existsSync, chmodSync } from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { performance } from 'node:perf_hooks';
import vm from 'node:vm';
import ts from 'typescript';

// QA sidecar only. No browser, Supabase SDK, Vite client initialization, sessions,
// simulator, native app, vision/AI calls, direct Winerim calls, or writes to APIs.
const REPO = '/Users/GOIKO/2matchrim76-recognition-20261008';
const A95 = '/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-eight-hours-20261017';
const PRIVATE = path.join(A95, 'recommendations95');
const PROFILES_FILE = path.join(A95, 'personas/synthetic-profiles.json');
const PROFILES_SHA = '00061bd5b722b9e62f12337c64fc17cbf7342f93dd19e9a5623987b39c34272c';
const REF = 'cbjynrbvrhcmpaojmqdp';
const ORIGIN = `https://${REF}.supabase.co`;
const ENDPOINT = '/functions/v1/matchrim-recommendations';
const AXES = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const ATTRS = ['power', 'acidity', 'sweetness', 'tannin', 'fruity'] as const;
const MAX_GETS = 42;
const MAX_BODY = 2 * 1024 * 1024;
const TIMEOUT_MS = 12000;
const STOP_CODES = new Set([401, 402, 403, 429]);
type Row = Record<string, unknown>;
type Profile = Record<typeof AXES[number], number>;
type Sensory = Record<typeof ATTRS[number], number>;
interface Wine extends Row {
  id: string | number; name: string; matchPercentage: number;
  tastingAttributes: (Sensory & { scale?: string }) | null;
  prices?: { isKindInferred?: boolean }[];
}
interface PureApi extends Row {
  calculateLocalMatchrimAffinity(profile: Profile, attrs: Row): number | null;
  normalizeMatchrimProfileForClassifier(profile: Profile): Profile;
  suggestWineStylesForProfile(profile: Profile, limit: number): unknown[];
}
interface ScoreCall { profile: Profile; attrs: Row; score: number | null }
interface ClientApi extends Row {
  fetchWinesByAttributes(profile: Profile): Promise<Wine[]>;
  getWinerimWineResultsMeta(wines: Wine[]): Row;
  normalizeWinerimWine(wine: Row, index: number): Wine;
  normalizeTastingAttributes(wine: Row): Sensory | null;
  scoreCalls: ScoreCall[];
}
type Persona = { id: string; base: Profile; expectedQuiz: Profile; synthetic: true; realPerson: false };
type Captured = { key: string; status: number; body: Buffer; complete: boolean; latencyMs: number;
  elapsedMs: number; sequence: number; error?: string; bodySha256: string; source: string };

class QAError extends Error {
  constructor(readonly code: string) { super(code); }
}
function requireQA(value: unknown, code: string): asserts value { if (!value) throw new QAError(code); }
const digest = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const copy = <T>(value: T): T => structuredClone(value);
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const quietConsole = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const sourceFiles = {
  service: 'src/services/winerimApi.ts',
  affinity: 'src/utils/wineAffinityExplanation.ts',
  passport: 'src/utils/matchrimPassport.ts',
  sensory: 'src/utils/winerimOriginalSheet.ts',
  scanValues: 'supabase/functions/_shared/matchrim-scan-values.ts',
  classifier: 'src/lib/winerimClassifier.ts',
  proxy: 'supabase/functions/matchrim-recommendations/index.ts',
};

function insidePrivate(value: string) {
  const absolute = path.resolve(value);
  requireQA(absolute.startsWith(PRIVATE + path.sep), 'PRIVATE_OUTPUT_PATH_REQUIRED');
  return absolute;
}

// Private evidence is exclusive-create. No credential-bearing headers or request
// objects are serialized. The guard also withholds a body that reflects a key.
let forbiddenCredential: string | undefined;
function noCredentials(data: string | Buffer) {
  const text = Buffer.isBuffer(data) ? data.toString('utf8') : data;
  requireQA(!forbiddenCredential || !text.includes(forbiddenCredential), 'CREDENTIAL_REFLECTION_BODY_WITHHELD');
  requireQA(!/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/.test(text), 'TOKEN_LIKE_MATERIAL_BODY_WITHHELD');
  requireQA(!text.includes('-----BEGIN PRIVATE KEY-----'), 'PRIVATE_KEY_MATERIAL_WITHHELD');
}
function writeBytes(file: string, data: Buffer | string) {
  insidePrivate(file); noCredentials(data);
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, data, { flag: 'wx', mode: 0o600 });
}
const save = (file: string, value: unknown) => writeBytes(file, JSON.stringify(value, null, 2) + '\n');

function readPersonas(): Persona[] {
  const bytes = readFileSync(PROFILES_FILE);
  requireQA(digest(bytes) === PROFILES_SHA, 'IMMUTABLE_PROFILE_SOURCE_HASH_CHANGED');
  const profiles = JSON.parse(bytes.toString()) as Persona[];
  requireQA(profiles.length === 50 && new Set(profiles.map(p => p.id)).size === 50, 'EXACTLY_50_IMMUTABLE_PROFILES_REQUIRED');
  for (const p of profiles) {
    requireQA(p.synthetic === true && p.realPerson === false, 'SYNTHETIC_PROFILES_ONLY');
    requireQA(AXES.every(k => typeof p.base[k] === 'number' && Number.isFinite(p.base[k]) && p.base[k] >= 0 && p.base[k] <= 5), 'BASE_PROFILE_RANGE');
  }
  return profiles;
}

function variableNames(source: string, filename: string) {
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  return ast.statements.flatMap(statement => ts.isVariableStatement(statement)
    ? statement.declarationList.declarations.flatMap(d => ts.isIdentifier(d.name) ? [d.name.text] : []) : []);
}

function selectActualDeclarations(source: string, filename: string, names: string[]) {
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const diagnostics = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true }).diagnostics || [];
  requireQA(!diagnostics.some(d => d.category === ts.DiagnosticCategory.Error), 'SOURCE_PARSE_FAILED');
  const wanted = new Set(names), found = new Set<string>();
  const parts: string[] = [];
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && wanted.has(declaration.name.text)) {
        requireQA(!found.has(declaration.name.text), 'DUPLICATE_SELECTED_DECLARATION');
        found.add(declaration.name.text);
        parts.push('const ' + declaration.getText(ast) + ';');
      }
    }
  }
  requireQA(found.size === wanted.size, 'SOURCE_DECLARATION_CONTRACT_CHANGED');
  return parts.join('\n');
}

const compile = (source: string) => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  reportDiagnostics: true,
}).outputText;

function executeActual<T = Row>(declarations: string, names: string[], dependencies: Row = {}): T {
  const sandbox = vm.createContext({ console: quietConsole, URL, URLSearchParams, Request, Response, Headers,
    DOMException, AbortController, ...dependencies }, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(compile(declarations + '\nglobalThis.__qa95 = {' + names.join(',') + '};'), sandbox, { timeout: 3000 });
  return sandbox.__qa95 as T;
}

const serviceNames = [
  'winerimWineResultsMeta', 'getWinerimWineResultsMeta', 'textFromUnknown', 'normalizeCurrency', 'inferPriceKind',
  'normalizePrice', 'asRecord', 'normalizeAttributeTo5', 'normalizeTastingAttributes', 'normalizeWineId',
  'normalizeMatchPercentage', 'stringValue', 'normalizeGrapes', 'normalizeWinerimWine', 'extractWineResults',
  'extractTotalCount', 'calculateProfileMatchPercentage', 'classifyWineByV41Style', 'mergeUniqueWines',
  'isFallbackRestaurantUuid', 'invokeMatchrimRecommendations', 'fetchWinesByAttributes',
];

class ActualClient {
  readonly sources: Record<string, string> = {};
  readonly declarations: Record<string, string> = {};
  readonly pure: PureApi;
  constructor(snapshot?: string) {
    const expected = snapshot ? JSON.parse(readFileSync(path.join(snapshot, 'manifest.json'), 'utf8')).sourceHashes : undefined;
    for (const [key, filename] of Object.entries(sourceFiles)) {
      this.sources[key] = readFileSync(snapshot ? path.join(snapshot, 'sources', key + '.ts') : path.join(REPO, filename), 'utf8');
      if (expected) requireQA(digest(this.sources[key]) === expected[key]?.sha256, 'REPLAY_SOURCE_SNAPSHOT_HASH_MISMATCH');
    }
    const scanNames = ['optionalScanNumber', 'normalizeScanSensoryValue'];
    this.declarations.scanValues = selectActualDeclarations(this.sources.scanValues, sourceFiles.scanValues, scanNames);
    const scan = executeActual(this.declarations.scanValues, scanNames);
    const affinityNames = ['clampAttribute', 'normalizeProfileAttribute', 'normalizeWineAttributesForInsight', 'calculateLocalMatchrimAffinity'];
    this.declarations.affinity = selectActualDeclarations(this.sources.affinity, sourceFiles.affinity, affinityNames);
    const affinity = executeActual(this.declarations.affinity, affinityNames, scan);
    const passportNames = ['clamp', 'normalizeMatchrimProfileForClassifier'];
    this.declarations.passport = selectActualDeclarations(this.sources.passport, sourceFiles.passport, passportNames);
    const passport = executeActual(this.declarations.passport, passportNames);
    const sensoryNames = ['record', 'validateWinerimOriginalSensory'];
    this.declarations.sensory = selectActualDeclarations(this.sources.sensory, sourceFiles.sensory, sensoryNames);
    const sensory = executeActual(this.declarations.sensory, sensoryNames);
    const classifierNames = variableNames(this.sources.classifier, sourceFiles.classifier);
    this.declarations.classifier = selectActualDeclarations(this.sources.classifier, sourceFiles.classifier, classifierNames);
    const classifier = executeActual(this.declarations.classifier, classifierNames);
    this.declarations.service = selectActualDeclarations(this.sources.service, sourceFiles.service, serviceNames);
    this.pure = { ...scan, ...affinity, ...passport, ...sensory, ...classifier } as PureApi;
  }

  make(fetcher: (url: string, init?: RequestInit) => Promise<Response>, key?: string) {
    const scoreCalls: ScoreCall[] = [];
    const unavailable = () => { throw new QAError('NON_GLOBAL_OR_NON_NATIVE_BRANCH_FORBIDDEN'); };
    const api = executeActual(this.declarations.service, serviceNames, {
      ...this.pure, Capacitor: { isNativePlatform: () => true },
      WINERIM_RESTAURANT_UUID: undefined, SUPABASE_URL: ORIGIN, SUPABASE_PUBLISHABLE_KEY: key,
      invokeWinerimEndpoint: unavailable, fetchStyleRangeWines: unavailable,
      buildMatchrimAffinityCalibration: unavailable, fetch: fetcher,
      calculateLocalMatchrimAffinity: (profile: Profile, attrs: Row) => {
        const score = this.pure.calculateLocalMatchrimAffinity(profile, attrs);
        scoreCalls.push({ profile: copy(profile), attrs: copy(attrs), score });
        return score;
      },
    });
    return { ...api, scoreCalls } as ClientApi;
  }

  snapshot(out: string) {
    const hashes: Row = {};
    for (const [key, text] of Object.entries(this.sources)) {
      writeBytes(path.join(out, 'sources', key + '.ts'), text);
      hashes[key] = { path: sourceFiles[key as keyof typeof sourceFiles], sha256: digest(text),
        selectedDeclarationSha256: this.declarations[key] ? digest(this.declarations[key]) : undefined };
    }
    return hashes;
  }

  async replay(data: unknown, profile: Profile) {
    const calls: string[] = [];
    const client = this.make(async (url: string, init: RequestInit) => {
      validateRequest(url, init);
      calls.push(url);
      return new Response(JSON.stringify(data), { status: 200 });
    });
    const result = await client.fetchWinesByAttributes(copy(profile));
    return { result: copy(result), meta: copy(client.getWinerimWineResultsMeta(result)), scoreCalls: client.scoreCalls,
      query: new URL(calls[0]).searchParams.toString(), callCount: calls.length };
  }
}

function validateRequest(input: string, init: RequestInit = {}) {
  const url = new URL(input);
  requireQA(url.origin === ORIGIN && url.pathname === ENDPOINT && !url.hash && !url.username && !url.password && !url.port, 'NETWORK_ALLOWLIST_URL_REJECTED');
  requireQA(init.method === 'GET' && init.body == null && init.credentials !== 'include', 'GET_ONLY_NO_BODY_OR_COOKIES');
  const keys = [...url.searchParams.keys()];
  requireQA(keys.length === 5 && new Set(keys).size === 5 && ATTRS.every(k => keys.includes(k) && /^[0-5]$/.test(url.searchParams.get(k) || '')), 'EXACT_FIVE_INTEGER_PARAMETERS_REQUIRED');
  const headers = new Headers(init.headers);
  requireQA([...headers.keys()].every(k => ['accept', 'apikey', 'authorization'].includes(k)), 'UNEXPECTED_REQUEST_HEADER_REJECTED');
  return url;
}

function loadPublicClient() {
  const selected: Record<string, string> = {};
  const lines = readFileSync(path.join(REPO, '.env'), 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = /^(?:export\s+)?(VITE_SUPABASE_URL|VITE_SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_ANON_KEY)\s*=\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '').trim();
    requireQA(!selected[match[1]] && !value.includes('${') && !/[\r\n]/.test(value), 'PUBLIC_CLIENT_ENV_AMBIGUOUS');
    selected[match[1]] = value;
  }
  requireQA(selected.VITE_SUPABASE_URL?.replace(/\/$/, '') === ORIGIN, 'PUBLIC_CLIENT_PROJECT_MISMATCH');
  const key = selected.VITE_SUPABASE_PUBLISHABLE_KEY || selected.VITE_SUPABASE_ANON_KEY;
  requireQA(typeof key === 'string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key), 'ANON_JWT_ROLE_REF_VERIFICATION_REQUIRED');
  let claims: Row & { exp?: number }, header: Row;
  try {
    header = JSON.parse(Buffer.from(key.split('.')[0], 'base64url').toString());
    claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
  } catch { throw new QAError('PUBLIC_CLIENT_JWT_PARSE_REJECTED'); }
  requireQA(header.alg === 'HS256' && claims.role === 'anon' && claims.ref === REF && claims.iss === 'supabase', 'ONLY_ANON_CORRECT_PROJECT_JWT_ALLOWED');
  requireQA(!claims.exp || claims.exp > Date.now() / 1000, 'PUBLIC_CLIENT_JWT_EXPIRED');
  requireQA(process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0', 'TLS_VERIFICATION_MUST_REMAIN_ENABLED');
  forbiddenCredential = key;
  return key;
}

// No redirect code exists. Only this function can open a real socket. It never
// writes a request body, follows Location, stores cookies, or uses a proxy agent.
async function wireGet(url: URL, key: string): Promise<{ status: number; body: Buffer; complete: boolean; error?: string }> {
  return new Promise(resolve => {
    let settled = false, status = 0, size = 0;
    const chunks: Buffer[] = [];
    const finish = (complete: boolean, error?: string) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      resolve({ status, body: Buffer.concat(chunks), complete, error });
    };
    const request = https.request({ protocol: 'https:', hostname: REF + '.supabase.co', port: 443,
      path: ENDPOINT + url.search, method: 'GET', rejectUnauthorized: true, servername: REF + '.supabase.co',
      agent: false, headers: { Accept: 'application/json', 'Accept-Encoding': 'identity',
        apikey: key, Authorization: 'Bearer ' + key } }, response => {
      status = response.statusCode || 0;
      response.on('data', (chunk: Buffer) => {
        if (settled) return;
        const bytes = Buffer.from(chunk), remaining = MAX_BODY - size;
        if (bytes.length > remaining) {
          if (remaining > 0) chunks.push(bytes.subarray(0, remaining));
          size = MAX_BODY; finish(false, 'BODY_EXCEEDS_2MIB'); request.destroy(); return;
        }
        chunks.push(bytes); size += bytes.length;
      });
      response.on('end', () => finish(true));
      response.on('error', () => finish(false, 'RESPONSE_STREAM_ERROR'));
      response.on('aborted', () => finish(false, 'RESPONSE_STREAM_ABORTED'));
    });
    const timer = setTimeout(() => { finish(false, 'TIMEOUT_12S'); request.destroy(); }, TIMEOUT_MS);
    request.on('error', () => finish(false, 'NETWORK_OR_TLS_ERROR'));
    request.end();
  });
}

class BoundedTransport {
  readonly cache = new Map<string, Captured>();
  readonly requests: Captured[] = [];
  stopReason: string | null = null;
  cacheHits = 0;
  private lastStart = -Infinity;
  private inFlight = false;
  private started: number;
  constructor(private out: string, private sender: (url: URL) => ReturnType<typeof wireGet>,
              private key?: string, private clock = { now: () => performance.now(), sleep }) { this.started = clock.now(); }

  async fetch(input: string, init: RequestInit = {}): Promise<Response> {
    const url = validateRequest(input, init), query = url.searchParams.toString();
    const headers = new Headers(init.headers);
    if (this.key) requireQA(headers.get('apikey') === this.key && headers.get('authorization') === 'Bearer ' + this.key, 'PUBLIC_CREDENTIAL_HEADER_MISMATCH');
    requireQA(this.stopReason === null, 'STOP_ALREADY_LATCHED_NO_RETRY');
    const cached = this.cache.get(query);
    if (cached) {
      this.cacheHits++;
      return new Response(cached.body, { status: cached.status });
    }
    requireQA(this.requests.length < MAX_GETS, 'GET_BUDGET_EXHAUSTED');
    requireQA(!this.inFlight, 'SEQUENTIAL_GETS_ONLY');
    this.inFlight = true;
    while (this.clock.now() - this.lastStart < 1000) await this.clock.sleep(1000 - (this.clock.now() - this.lastStart));
    const start = this.clock.now(), sequence = this.requests.length + 1;
    this.lastStart = start;
    let wire: Awaited<ReturnType<typeof wireGet>>;
    try { wire = await this.sender(url); }
    catch { wire = { status: 0, body: Buffer.alloc(0), complete: false, error: 'NETWORK_FAILED_NO_RETRY' }; }
    finally { this.inFlight = false; }
    const captured: Captured = { key: query, ...wire, sequence, latencyMs: this.clock.now() - start,
      elapsedMs: start - this.started, bodySha256: digest(wire.body), source: 'exact-allowed-GET' };
    this.requests.push(captured);
    if (wire.error || !wire.complete) this.stopReason = wire.error || 'INCOMPLETE_BODY';
    if (STOP_CODES.has(wire.status)) this.stopReason = 'HARD_STOP_HTTP_' + wire.status;
    else if (wire.status < 200 || wire.status >= 300) this.stopReason = wire.status >= 300 && wire.status < 400 ? 'REDIRECT_ERROR_NO_FOLLOW' : 'UNHEALTHY_HTTP_' + wire.status;
    const stem = String(sequence).padStart(3, '0');
    try {
      writeBytes(path.join(this.out, 'network', stem + '.body'), captured.body);
    } catch (error) {
      this.stopReason = error instanceof QAError ? error.code : 'BODY_WITHHELD';
      save(path.join(this.out, 'network', stem + '.json'), { ...publicCapture(captured), stopReason: this.stopReason, bodyWithheld: true });
      throw new QAError(this.stopReason);
    }
    save(path.join(this.out, 'network', stem + '.json'), { ...publicCapture(captured), stopReason: this.stopReason });
    this.cache.set(query, captured);
    if (!wire.status || wire.error || !wire.complete || wire.status >= 300 && wire.status < 400) throw new QAError(this.stopReason || 'WIRE_FAILED');
    return new Response(wire.body, { status: wire.status });
  }
}

function publicCapture(c: Captured) {
  return { sequence: c.sequence, query: c.key, method: 'GET', endpoint: ORIGIN + ENDPOINT,
    status: c.status, bodySha256: c.bodySha256, bytes: c.body.length, bodyComplete: c.complete,
    latencyMs: Math.round(c.latencyMs * 100) / 100, elapsedMs: Math.round(c.elapsedMs * 100) / 100,
    error: c.error, source: c.source };
}

function strictSourceAttrs(raw: Row): Sensory | null {
  const attrs = raw.tastingAttributes || raw.tasting_attributes || raw.atributos;
  return attrs && !Array.isArray(attrs) && typeof attrs === 'object'
    && ATTRS.every(k => typeof (attrs as Row)[k] === 'number' && Number.isFinite((attrs as Row)[k])
      && ((attrs as Row)[k] as number) >= 0 && ((attrs as Row)[k] as number) <= 5)
    ? Object.fromEntries(ATTRS.map(k => [k, (attrs as Row)[k]])) as Sensory : null;
}

function independentScore(profile: Profile, attrs: Sensory) {
  const sum = AXES.reduce((total, axis, index) => total + (profile[axis] - attrs[ATTRS[index]]) ** 2, 0);
  const raw = 100 * (1 - Math.sqrt(sum) / Math.sqrt(125));
  return { raw, affinity: Math.round(50 + (raw - 50) * .85) };
}

function independentRows(data: Row): { shape: string; rows: Row[] } {
  const wines = data.wines as Row | undefined, nested = data.data as Row | undefined;
  const candidates: [string, unknown][] = [['results', data.results], ['wines', data.wines],
    ['wines.detail', wines?.detail], ['wines.home', wines?.home], ['data', data.data],
    ['data.results', nested?.results], ['data.wines', nested?.wines]];
  for (const [shape, rows] of candidates) if (Array.isArray(rows)) return { shape, rows };
  throw new QAError('UNRECOGNIZED_PUBLIC_RESPONSE_SHAPE');
}

const idKey = (id: unknown) => typeof id + ':' + String(id);
function expectedMeta(data: Row, directCount: number, displayedCount: number, primaryStyle: unknown) {
  const raw = data.count ?? data.totalCount ?? data.total_count ?? data.total;
  const numeric = Number(raw);
  return { totalCount: Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : directCount,
    displayedCount, directCount, styleRangeCount: 0, searchLevel: data.searchLevel, primaryStyle,
    isGlobalRecommendations: true };
}

async function proxyReplay(actual: ActualClient, capture: Captured) {
  const ast = ts.createSourceFile('proxy.ts', actual.sources.proxy, ts.ScriptTarget.Latest, true);
  const source = ast.statements.filter(s => !ts.isImportDeclaration(s)).map(s => s.getText(ast)).join('\n');
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const calls: Row[] = [];
  const sandbox = vm.createContext({ URL, Request, Response, Headers, console: quietConsole, corsHeaders: {},
    Deno: { env: { get: () => undefined }, serve: (fn: typeof handler) => { handler = fn; } },
    fetch: async (input: string, init: RequestInit) => {
      const url = new URL(input);
      requireQA(url.origin === 'https://app.winerim.com' && url.pathname === '/api/v1/matchrim/recommendations'
        && init.method === 'GET' && !init.body && url.searchParams.toString() === capture.key, 'PROXY_LOCAL_REPLAY_CONTRACT_CHANGED');
      calls.push({ method: init.method, query: url.searchParams.toString() });
      return new Response(capture.body, { status: capture.status, headers: { 'Content-Type': 'application/json' } });
    } }, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(compile(source), sandbox, { timeout: 3000 });
  requireQA(handler, 'PROXY_HANDLER_NOT_CAPTURED');
  const response = await handler(new Request(ORIGIN + ENDPOINT + '?' + capture.key, { method: 'GET' }));
  const body = Buffer.from(await response.arrayBuffer());
  return { localSourceReplayOnly: true, noAdditionalNetwork: true, expectedUpstreamGetCount: 1,
    actualUpstreamGetCount: calls.length, statusPreserved: response.status === capture.status,
    bodySha256Preserved: digest(body) === capture.bodySha256,
    passes: calls.length === 1 && response.status === capture.status && body.equals(capture.body) };
}

async function auditProfile(actual: ActualClient, persona: Persona, index: number, capture: Captured, coverage: string) {
  const data = JSON.parse(capture.body.toString()) as Row;
  const { shape, rows } = independentRows(data);
  const baseline = await actual.replay(data, persona.base);
  const analyzer = actual.make(async () => { throw new QAError('ANALYZER_NETWORK_FORBIDDEN'); });
  const last = new Map<string, { raw: Row; normalized: Wine; attrs: Sensory | null }>();
  const missing = { sourceRows: rows.length, missingId: 0, missingName: 0, missingProducer: 0,
    missingVintage: 0, missingPhoto: 0, missingPrice: 0, invalidOrMissingSensory: 0,
    officialZeroValues: 0, officialDecimalValues: 0, inferredPriceKinds: 0 };
  const invented: Row[] = [], sourceAttributeMismatches: Row[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const raw = rows[rowIndex];
    requireQA(raw && typeof raw === 'object' && !Array.isArray(raw), 'NON_OBJECT_CATALOG_ROW');
    const normalized = copy(analyzer.normalizeWinerimWine(raw, rowIndex));
    const attrs = strictSourceAttrs(raw);
    if (!attrs) missing.invalidOrMissingSensory++;
    else {
      missing.officialZeroValues += ATTRS.filter(k => attrs[k] === 0).length;
      missing.officialDecimalValues += ATTRS.filter(k => !Number.isInteger(attrs[k])).length;
      if (!same(normalized.tastingAttributes, { ...attrs, scale: 'winerim-0-5' })) sourceAttributeMismatches.push({ rowIndex, id: normalized.id });
    }
    if (attrs === null && normalized.tastingAttributes !== null) sourceAttributeMismatches.push({ rowIndex, id: normalized.id });
    const id = raw.id ?? raw.uuid ?? raw.wine_id ?? raw.wineId;
    if (!(typeof id === 'string' && id.trim() || typeof id === 'number' && Number.isFinite(id))) {
      missing.missingId++; invented.push({ rowIndex, field: 'id', value: normalized.id });
    }
    if (typeof raw.name !== 'string' && typeof raw.nombre !== 'string') {
      missing.missingName++; invented.push({ rowIndex, field: 'name', value: normalized.name });
    }
    if (!normalized.winery) missing.missingProducer++;
    if (normalized.vintage == null) missing.missingVintage++;
    if (!normalized.photo) missing.missingPhoto++;
    if (!normalized.prices?.length) missing.missingPrice++;
    missing.inferredPriceKinds += normalized.prices?.filter(p => p.isKindInferred).length || 0;
    last.set(idKey(normalized.id), { raw, normalized, attrs });
  }
  const expectedCount = [...last.values()].filter(v => v.attrs !== null).length;
  const expectedPrimary = actual.pure.suggestWineStylesForProfile(actual.pure.normalizeMatchrimProfileForClassifier(persona.base), 1)[0];
  const meta = expectedMeta(data, rows.length, expectedCount, expectedPrimary);
  const scoreRows = baseline.result.map(wine => {
    const source = last.get(idKey(wine.id));
    const expected = source?.attrs ? independentScore(persona.base, source.attrs) : null;
    return { id: wine.id, name: wine.name, officialAttributes: source?.attrs,
      expectedRawL2: expected?.raw, expected: expected?.affinity, actual: wine.matchPercentage,
      exact: expected !== null && expected.affinity === wine.matchPercentage,
      model: wine.affinityModel, noUpstreamPersonalScoreOrConfidence: wine.rawMatchPercentage === undefined && wine.affinityConfidence === undefined };
  });
  const descending = baseline.result.every((w, i) => i === 0 || baseline.result[i - 1].matchPercentage >= w.matchPercentage);
  const profilePreserved = baseline.scoreCalls.every(call => AXES.every(k => call.profile[k] === persona.base[k]));
  const poisoned = copy(data);
  const poisonRows = independentRows(poisoned).rows;
  poisonRows.forEach((wine, i) => {
    for (const field of ['matchPercentage', 'match_percentage', 'compatibility', 'compatibility_score', 'compatibilidad', 'match']) delete wine[field];
    wine.matchPercentage = i % 2 ? 100 : 0;
  });
  const poison = await actual.replay(poisoned, persona.base);
  const scoresBefore = new Map(baseline.result.map(w => [idKey(w.id), w.matchPercentage]));
  const ignoresRawScores = poison.result.length === baseline.result.length && poison.result.every(w => scoresBefore.get(idKey(w.id)) === w.matchPercentage);
  const upstreamTieOrderSensitive = !same(baseline.result.map(w => w.id), poison.result.map(w => w.id));
  const rawScorePoisoning = { additionalNetwork: 0,
    scope: 'In-memory mutation of upstream raw-score fields, retaining captured identities and official attributes',
    baseline: baseline.result.map(w => ({ id: w.id, affinity: w.matchPercentage })),
    poisoned: poison.result.map(w => ({ id: w.id, affinity: w.matchPercentage })),
    numericScoresUnchanged: ignoresRawScores, tieOrderChanged: upstreamTieOrderSensitive,
    topChoiceChangedOnEqualAffinity: baseline.result[0]?.id !== poison.result[0]?.id };
  let profileChange: Row = { status: 'NOT_DEMONSTRABLE_NO_VALID_RETURNED_ATTRIBUTES', additionalNetwork: 0 };
  if (scoreRows.length) {
    const first = scoreRows[0], attrs = first.officialAttributes!;
    const changed = Object.fromEntries(AXES.map((k, i) => [k, first.actual === 93 ? (attrs[ATTRS[i]] <= 2.5 ? 5 : 0) : attrs[ATTRS[i]]])) as Profile;
    const rescored = await actual.replay(data, changed);
    const changes = rescored.result.filter(w => scoresBefore.get(idKey(w.id)) !== w.matchPercentage).length;
    const exact = rescored.result.every(w => {
      const attrs = last.get(idKey(w.id))?.attrs;
      return attrs && independentScore(changed, attrs).affinity === w.matchPercentage;
    });
    profileChange = { status: changes > 0 && exact ? 'PASS' : 'FAIL', changedProfile: changed,
      changedScores: changes, expectedAllScoresExact: true, actualAllScoresExact: exact,
      additionalNetwork: 0, scope: 'Actual client re-executed on this same captured candidate set, not a second live upstream query' };
  }
  const checks = { nativeDisplayedCount: baseline.result.length === expectedCount,
    metadataExact: same(baseline.meta, meta), sourceZeroDecimalsPreserved: sourceAttributeMismatches.length === 0,
    profileZeroDecimalsPreserved: profilePreserved, allPersonalScoresExact: scoreRows.every(r => r.exact),
    noRawUpstreamPersonalScore: ignoresRawScores && scoreRows.every(r => r.noUpstreamPersonalScoreOrConfidence),
    nativeV2ModelOnly: scoreRows.every(r => r.model === 'scan-local-l2-0to5-v2'), descending,
    noInventedIdentityFields: invented.length === 0, oneActualClientGetInvocation: baseline.callCount === 1,
    profileChangeExactAndDemonstrated: scoreRows.length === 0 || profileChange.status === 'PASS' };
  return { persona: persona.id, index, exactBaseProfile: persona.base, upstreamRoundedProfile: copy(actual.pure.normalizeMatchrimProfileForClassifier(persona.base)),
    requestedQuery: baseline.query, responseQuery: capture.key, responseSha256: capture.bodySha256, coverage,
    responseShape: shape, expectedCount, actualCount: baseline.result.length, expectedMetadata: meta, actualMetadata: baseline.meta,
    checks, status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL', missingData: missing,
    inventedIdentityFields: invented, sourceAttributeMismatches, scores: scoreRows, topChoice: scoreRows[0] || null,
    currentProfileChange: profileChange, upstreamTieOrderSensitive, rawScorePoisoning,
    tieOrderQualification: 'Numeric affinities must ignore upstream scores. The source merge orders raw-score ties before the stable native score sort; tie-order sensitivity is reported separately.',
    dataMeaning: 'Official public API fields as returned, not producer ground truth, sensory validation, recognition or preference-prediction evidence' };
}

async function offlineContracts(actual: ActualClient, profiles: Persona[]) {
  const fixture = { id: 'QA95-offline-contract-not-real-wine', name: 'Offline boundary contract',
    winery: 'Synthetic fixture, not producer evidence', matchPercentage: 100,
    tastingAttributes: { power: 0, acidity: .4, sweetness: 1.7, tannin: 0, fruity: 5 } };
  const checks: string[] = [];
  const check = (condition: unknown, name: string) => { requireQA(condition, 'OFFLINE_CONTRACT_' + name); checks.push(name); };
  for (const profile of profiles) {
    const result = await actual.replay({ results: [fixture], total: 1 }, profile.base);
    check(result.result.length === 1 && result.result[0].matchPercentage === independentScore(profile.base, fixture.tastingAttributes).affinity,
      profile.id + '_exact_base_profile_independent_l2');
    check(result.scoreCalls.every(call => AXES.every(k => call.profile[k] === profile.base[k])), profile.id + '_decimal_profile_preserved');
  }
  const analyzer = actual.make(async () => { throw new QAError('OFFLINE_NETWORK_FORBIDDEN'); });
  for (const key of ATTRS) {
    for (const bad of [-1, 5.01, '0', false, null, undefined, NaN, Infinity]) {
      const attrs = { ...fixture.tastingAttributes, [key]: bad };
      check(analyzer.normalizeTastingAttributes({ ...fixture, tastingAttributes: attrs }) === null, 'invalid_' + key + '_' + String(bad));
    }
  }
  const malformed = await actual.replay({ results: [{ ...fixture, tastingAttributes: { ...fixture.tastingAttributes, power: null } }], total: 1 }, profiles[0].base);
  check(malformed.result.length === 0 && malformed.meta.displayedCount === 0 && malformed.meta.directCount === 1, 'invalid_source_rejected_by_actual_full_pipeline');
  const zero = await actual.replay({ results: [{ ...fixture, tastingAttributes: Object.fromEntries(ATTRS.map(k => [k, 0])) }] }, profiles[0].base);
  check(zero.result[0].matchPercentage === 93, 'zero_exact_match_93_not_legacy_rescale');
  const five = await actual.replay({ results: [{ ...fixture, tastingAttributes: Object.fromEntries(ATTRS.map(k => [k, 5])) }] }, profiles[0].base);
  check(five.result[0].matchPercentage === 8, 'opposite_corner_8');
  const decimalRow = { ...fixture, tastingAttributes: Object.fromEntries(ATTRS.map(k => [k, .05])) };
  const decimal = await actual.replay({ results: [decimalRow] }, profiles[0].base);
  check(same(decimal.result[0].tastingAttributes, { ...decimalRow.tastingAttributes, scale: 'winerim-0-5' }), 'tiny_source_decimals_not_rounded');
  for (const [input, init] of [[ORIGIN + '/rest/v1/wines', { method: 'GET' }],
    ['https://app.winerim.com/api/v1/matchrim/recommendations', { method: 'GET' }],
    [ORIGIN + ENDPOINT + '?power=0&acidity=0&sweetness=0&tannin=0&fruity=0', { method: 'POST' }],
    [ORIGIN + ENDPOINT + '?power=0.4&acidity=0&sweetness=0&tannin=0&fruity=0', { method: 'GET' }]] as [string, RequestInit][]) {
    let rejected = false; try { validateRequest(input, init); } catch { rejected = true; }
    check(rejected, 'network_allowlist_' + checks.length);
  }
  return { status: 'PASS', checks, count: checks.length, scope: 'Offline fixtures exercising actual AST client source, never real API coverage' };
}

function requestOrder(profiles: Persona[]) {
  // All decimal profiles get direct queries before the remaining binary corners.
  const probes = [0, 31, 1, 16, 49];
  const remaining = [...Array.from({ length: 18 }, (_, i) => i + 32), ...profiles.map((_, i) => i)];
  return [...new Set([...probes, ...remaining])];
}

function queryFor(actual: ActualClient, profile: Profile) {
  const normalized = actual.pure.normalizeMatchrimProfileForClassifier(profile);
  return new URLSearchParams(Object.fromEntries(ATTRS.map((k, i) => [k, String(normalized[AXES[i]])]))).toString();
}

type ProfileReport = Awaited<ReturnType<typeof auditProfile>> & { wireInvocationMatchesReplay?: boolean };

function describeDiversity(reports: ProfileReport[]) {
  const frequencies = new Map<string, number>();
  let noChoice = 0;
  for (const report of reports) {
    if (!report.topChoice) { noChoice++; continue; }
    const key = idKey(report.topChoice.id);
    frequencies.set(key, (frequencies.get(key) || 0) + 1);
  }
  return { profileCount: reports.length, uniqueTopChoiceIds: frequencies.size, profilesWithoutChoice: noChoice,
    frequencies: Object.fromEntries([...frequencies].sort((a, b) => b[1] - a[1])),
    interpretation: 'Descriptive candidate/score diversity only, not predictive accuracy or human preference validation' };
}

function latencySummary(requests: Captured[]) {
  const values = requests.map(r => r.latencyMs).sort((a, b) => a - b);
  return values.length ? { count: values.length, minMs: values[0], medianMs: values[Math.floor((values.length - 1) / 2)],
    p95Ms: values[Math.ceil(values.length * .95) - 1], maxMs: values.at(-1) } : { count: 0 };
}

async function runSelfTest(actual: ActualClient, out: string) {
  const checks: string[] = [];
  const basic = ORIGIN + ENDPOINT + '?power=0&acidity=0&sweetness=0&tannin=0&fruity=0';
  let fakeTime = 0;
  const clock = { now: () => fakeTime, sleep: async (ms: number) => { fakeTime += ms; } };
  for (const status of [401, 402, 403, 429, 302]) {
    let sent = 0;
    const transport = new BoundedTransport(path.join(out, 'transport-' + status), async () => {
      sent++; return { status, body: Buffer.from('{"error":"offline fixture"}'), complete: true };
    }, undefined, clock);
    try { await transport.fetch(basic, { method: 'GET' }); } catch { /* Expected stop response under test. */ }
    let latched = false; try { await transport.fetch(basic, { method: 'GET' }); } catch { latched = true; }
    requireQA(sent === 1 && latched && transport.stopReason, 'HARD_STOP_BOUNDARY_FAILED');
    checks.push('HTTP_' + status + '_one_attempt_no_retry_or_redirect');
  }
  let sent = 0;
  const transport = new BoundedTransport(path.join(out, 'transport-budget'), async () => {
    sent++; return { status: 200, body: Buffer.from('{"results":[]}'), complete: true };
  }, undefined, clock);
  await transport.fetch(basic, { method: 'GET' });
  await transport.fetch(basic, { method: 'GET' });
  requireQA(sent === 1 && transport.cacheHits === 1, 'QUERY_CACHE_FAILED');
  checks.push('identical_normalized_query_has_no_second_GET');
  for (let n = 1; n < 42; n++) {
    const digits = [n % 6, Math.floor(n / 6) % 6, Math.floor(n / 36) % 6, 0, 0];
    const query = new URLSearchParams(Object.fromEntries(ATTRS.map((k, i) => [k, String(digits[i])])));
    await transport.fetch(ORIGIN + ENDPOINT + '?' + query, { method: 'GET' });
  }
  let exhausted = false;
  try { await transport.fetch(ORIGIN + ENDPOINT + '?power=5&acidity=5&sweetness=5&tannin=5&fruity=5', { method: 'GET' }); }
  catch { exhausted = true; }
  requireQA(exhausted && Number(sent) === 42, 'MAX_42_BOUNDARY_FAILED');
  checks.push('hard_42_GET_ceiling');
  requireQA(transport.requests.every((r, i) => !i || r.elapsedMs - transport.requests[i - 1].elapsedMs >= 1000), 'ONE_PER_SECOND_BOUNDARY_FAILED');
  checks.push('sequential_starts_at_least_1000ms_apart_fake_clock');
  const replay = await proxyReplay(actual, transport.requests[0]);
  requireQA(replay.passes, 'ACTUAL_PROXY_PASS_THROUGH_FAILED');
  checks.push('actual_proxy_source_GET_status_body_pass_through_without_network');
  let heldTime = 0, releaseWait: (() => void) | undefined, concurrentSent = 0;
  const concurrentClock = { now: () => heldTime, sleep: async (ms: number) => {
    await new Promise<void>(resolve => { releaseWait = () => { heldTime += ms; resolve(); }; });
  } };
  const concurrent = new BoundedTransport(path.join(out, 'transport-concurrent'), async () => {
    concurrentSent++; return { status: 200, body: Buffer.from('{"results":[]}'), complete: true };
  }, undefined, concurrentClock);
  await concurrent.fetch(basic, { method: 'GET' });
  const waiting = concurrent.fetch(basic.replace('power=0', 'power=1'), { method: 'GET' });
  let concurrentRejected = false;
  try { await concurrent.fetch(basic.replace('power=0', 'power=2'), { method: 'GET' }); }
  catch { concurrentRejected = true; }
  requireQA(concurrentRejected && concurrentSent === 1 && releaseWait, 'CONCURRENT_RATE_WAIT_MUST_BE_LOCKED');
  releaseWait(); await waiting;
  requireQA(Number(concurrentSent) === 2, 'CONCURRENT_REJECTED_CALL_MUST_NOT_SEND');
  checks.push('concurrent_caller_rejected_during_rate_wait_no_extra_GET');
  // Execute this harness's actual wire function against in-memory request/stream
  // doubles. The tests cannot open sockets, and the timeout test does not wait.
  const ownSource = readFileSync(path.join(REPO, 'scripts/qa-matchrim-consumer95-recommendations.ts'), 'utf8');
  const ownAst = ts.createSourceFile('qa.ts', ownSource, ts.ScriptTarget.Latest, true);
  const wireDeclaration = ownAst.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'wireGet');
  requireQA(wireDeclaration, 'WIRE_TEST_DECLARATION_MISSING');
  for (const scenario of ['oversize', 'timeout']) {
    let requested = 0, destroyed = false, timeout = 0;
    type EventHandler = (...args: unknown[]) => void;
    const handlers = new Map<string, EventHandler>();
    const request = { on: (event: string, fn: EventHandler) => { handlers.set(event, fn); return request; },
      destroy: () => { destroyed = true; }, end: () => {} };
    const mockHttps = { request: (options: https.RequestOptions,
      callback: (response: { statusCode: number; on(event: string, fn: EventHandler): unknown }) => void) => {
      requested++;
      requireQA(options.hostname === REF + '.supabase.co' && options.path?.startsWith(ENDPOINT + '?') && options.method === 'GET'
        && options.rejectUnauthorized === true && options.agent === false, 'WIRE_OPTIONS_NOT_FAIL_CLOSED');
      if (scenario === 'oversize') queueMicrotask(() => {
        const events = new Map<string, EventHandler>();
        const response = { statusCode: 200, on: (event: string, fn: EventHandler) => { events.set(event, fn); return response; } };
        callback(response);
        events.get('data')!(Buffer.alloc(MAX_BODY + 1, 65));
      });
      return request;
    } };
    const local = executeActual<{ wireGet: typeof wireGet }>(wireDeclaration.getText(ownAst), ['wireGet'], { https: mockHttps, REF, ENDPOINT, MAX_BODY, TIMEOUT_MS, Buffer,
      setTimeout: (fn: () => void, ms: number) => { timeout = ms; if (scenario === 'timeout') queueMicrotask(fn); return 1; }, clearTimeout: () => {} });
    const wire = await local.wireGet(new URL(basic), 'offline-non-credential');
    requireQA(requested === 1 && destroyed && timeout === 12000, 'WIRE_TIMEOUT_OR_SINGLE_REQUEST_FAILED');
    requireQA(scenario === 'oversize' ? wire.error === 'BODY_EXCEEDS_2MIB' && wire.body.length === MAX_BODY && wire.complete === false
      : wire.error === 'TIMEOUT_12S' && wire.body.length === 0 && wire.complete === false, 'WIRE_BOUNDARY_FAILED');
    checks.push('actual_wire_' + scenario + '_no_sockets');
  }
  return { status: 'PASS', count: checks.length, checks, noRealNetwork: true };
}

async function main() {
  process.umask(0o077);
  const args = process.argv.slice(2);
  const mode = args.shift();
  requireQA(['--self-test', '--live-readonly', '--replay'].includes(mode || ''), 'EXPLICIT_MODE_REQUIRED');
  const options = new Map<string, string>();
  while (args.length) {
    const key = args.shift()!, value = args.shift();
    requireQA(['--out', '--from'].includes(key) && value && !options.has(key), 'INVALID_ARGUMENTS'); options.set(key, value);
  }
  requireQA(options.has('--out'), 'NEW_PRIVATE_OUT_REQUIRED');
  const out = insidePrivate(options.get('--out')!);
  mkdirSync(PRIVATE, { recursive: true, mode: 0o700 }); chmodSync(PRIVATE, 0o700);
  requireQA(!existsSync(out), 'OUTPUT_ALREADY_EXISTS_NO_OVERWRITE'); mkdirSync(out, { recursive: true, mode: 0o700 });
  const from = mode === '--replay' ? insidePrivate(options.get('--from') || '') : undefined;
  const actual = new ActualClient(from);
  const profiles = readPersonas();
  const sourceHashes = actual.snapshot(out);
  const order = requestOrder(profiles);
  const uniqueQueries = new Set(profiles.map(p => queryFor(actual, p.base))).size;
  const scope = 'Actual client TypeScript AST declarations executed in VM with Capacitor native=true; not a full Vite boot, WKWebView or UI run. Only the public recommendation GET can be real. Proxy execution is local captured-body replay.';
  save(path.join(out, 'manifest.json'), { mode, sourceHashes, runnerSha256: digest(readFileSync(path.join(REPO, 'scripts/qa-matchrim-consumer95-recommendations.ts'))),
    profilesFile: PROFILES_FILE, profilesSha256: PROFILES_SHA, profileCount: 50, uniqueNormalizedBaseQueries: uniqueQueries,
    expectedQuizUniqueVectors: new Set(profiles.map(p => JSON.stringify(AXES.map(k => p.expectedQuiz[k])))).size,
    initialFiveProbeIndices: order.slice(0, 5), maxRealGETs: MAX_GETS, minStartIntervalMs: 1000, timeoutMs: TIMEOUT_MS,
    maxBodyBytes: MAX_BODY, redirects: 'error, never followed', credentials: 'in-memory anon JWT role/ref inspection only; no cryptographic signature claim; never persisted',
    executedServiceEntryPoint: 'fetchWinesByAttributes', scope, oracle: { name: 'l2native-v2', raw: '100*(1-sqrt(sum five exact profile/official-attribute squared differences)/sqrt(125))', affinity: 'round(50+(raw-50)*0.85)', axes: AXES, attributes: ATTRS,
      source: 'Frozen QA formula independent of application implementation; no rounding of base profile or official sensory values' } });
  const offline = await offlineContracts(actual, profiles);
  save(path.join(out, 'offline-contracts.json'), offline);
  if (mode === '--self-test') {
    const boundaries = await runSelfTest(actual, out);
    save(path.join(out, 'summary.json'), { status: 'PASS', mode, realGETs: 0, offlineChecks: offline.count, boundaryChecks: boundaries, scope });
    console.log(JSON.stringify({ status: 'PASS', realGETs: 0, offlineChecks: offline.count, boundaryChecks: boundaries.count, out })); return;
  }

  const reports: ProfileReport[] = [], failures: Row[] = [], proxyChecks: Row[] = [];
  const historicalRequests: ReturnType<typeof publicCapture>[] = [];
  let transport: BoundedTransport | undefined, terminal: string | null = null;
  const captures = new Map<string, Captured>();
  if (mode === '--live-readonly') {
    const key = loadPublicClient();
    const lock = path.join(PRIVATE, 'live-authorization-consumed.json');
    let fd: number;
    try { fd = openSync(lock, 'wx', 0o600); } catch { throw new QAError('LIVE_AUTHORIZATION_ALREADY_CONSUMED_USE_REPLAY'); }
    try { writeFileSync(fd, JSON.stringify({ out, maxGETs: MAX_GETS, endpoint: ORIGIN + ENDPOINT, noRetry: true }) + '\n'); } finally { closeSync(fd); }
    transport = new BoundedTransport(out, async url => {
      appendFileSync(path.join(PRIVATE, 'real-get-ledger.jsonl'), JSON.stringify({ method: 'GET', query: url.searchParams.toString(), at: new Date().toISOString(), out }) + '\n', { mode: 0o600 });
      return wireGet(url, key);
    }, key);
    for (const index of order) {
      if (transport.requests.length >= MAX_GETS || transport.stopReason) break;
      const persona = profiles[index];
      const client = actual.make(transport.fetch.bind(transport), key);
      try {
        const result = await client.fetchWinesByAttributes(copy(persona.base));
        const query = queryFor(actual, persona.base), capture = transport.cache.get(query);
        requireQA(capture, 'ACTUAL_NATIVE_QUERY_NOT_CAPTURED');
        const data = JSON.parse(capture.body.toString()); independentRows(data);
        captures.set(query, capture);
        // Analyze captured bytes offline, then compare to the result of the real
        // client invocation, so a copied formatter cannot stand in for that path.
        const report: ProfileReport = await auditProfile(actual, persona, index, capture, 'DIRECT_PROFILE_SPECIFIC_PUBLIC_GET');
        report.wireInvocationMatchesReplay = same(copy(result), (await actual.replay(data, persona.base)).result)
          && same(copy(client.getWinerimWineResultsMeta(result)), report.actualMetadata);
        if (!report.wireInvocationMatchesReplay) report.status = 'FAIL';
        save(path.join(out, 'profiles', persona.id + '.json'), report); reports.push(report);
        const proxy = { query, ...await proxyReplay(actual, capture) };
        proxyChecks.push(proxy);
        console.log(JSON.stringify({ phase: transport.requests.length <= 5 ? 'bounded-five-probe' : 'bounded-matrix', profile: persona.id,
          GETs: transport.requests.length, HTTP: capture.status, displayed: report.actualCount, status: report.status }));
      } catch (error) {
        terminal = transport.stopReason || (error instanceof QAError ? error.code : 'ACTUAL_CLIENT_EXECUTION_FAILED');
        transport.stopReason = terminal;
        failures.push({ persona: persona.id, index, reason: terminal, observedHTTP: transport.requests.at(-1)?.status,
          rawBodyEvidence: transport.requests.length ? 'network/' + String(transport.requests.length).padStart(3, '0') + '.body' : null });
        break;
      }
    }
  } else {
    requireQA(from, 'REPLAY_SOURCE_REQUIRED');
    const previous = JSON.parse(readFileSync(path.join(from, 'summary.json'), 'utf8'));
    const count = previous.realGETs as number;
    requireQA(Number.isInteger(count) && count >= 0 && count <= 42, 'REPLAY_COUNT_REJECTED');
    for (let n = 1; n <= count; n++) {
      const stem = String(n).padStart(3, '0');
      const metadata = JSON.parse(readFileSync(path.join(from, 'network', stem + '.json'), 'utf8'));
      historicalRequests.push(metadata);
      if (!metadata.bodyComplete || metadata.status !== 200) continue;
      const body = readFileSync(path.join(from, 'network', stem + '.body'));
      requireQA(digest(body) === metadata.bodySha256, 'REPLAY_RAW_BODY_HASH_MISMATCH');
      independentRows(JSON.parse(body.toString()));
      captures.set(metadata.query, { key: metadata.query, status: metadata.status, body, complete: true,
        bodySha256: metadata.bodySha256, sequence: n, latencyMs: metadata.latencyMs, elapsedMs: metadata.elapsedMs, source: 'previously-captured-public-GET' });
    }
    terminal = previous.terminalReason || null;
  }

  // With 50 unique native queries and a 42 GET ceiling, eight profiles cannot
  // have their own live candidate query. Reuse is explicitly NOT a query cache hit.
  // A hard-stop also prevents all further live work, but valid bodies already
  // captured can still support qualified, network-free local score checks.
  const fallback = [...captures.values()].find(c => independentRows(JSON.parse(c.body.toString())).rows.some(r => strictSourceAttrs(r)));
  for (const index of order) {
    const persona = profiles[index];
    if (reports.some(r => r.index === index)) continue;
    const matching = captures.get(queryFor(actual, persona.base));
    const capture = matching || fallback;
    if (!capture) continue;
    try {
      const report = await auditProfile(actual, persona, index, capture,
        matching ? 'REPLAY_OF_OWN_PREVIOUS_PUBLIC_QUERY' : 'LOCAL_RECALC_ONLY_DIFFERENT_CAPTURED_CANDIDATE_QUERY_NOT_LIVE_PROFILE_COVERAGE');
      save(path.join(out, 'profiles', persona.id + '.json'), report); reports.push(report);
    } catch (error) { failures.push({ persona: persona.id, index, reason: error instanceof QAError ? error.code : 'LOCAL_REPLAY_ANALYSIS_FAILED' }); }
  }
  const network = transport?.requests || [];
  const direct = reports.filter(r => r.coverage === 'DIRECT_PROFILE_SPECIFIC_PUBLIC_GET');
  const localOnly = reports.filter(r => r.coverage.startsWith('LOCAL_RECALC_ONLY'));
  const coverageMissing = profiles.filter((_, i) => !reports.some(r => r.index === i)).map(p => p.id);
  const summary = { status: terminal ? 'STOPPED_' + terminal : reports.some(r => r.status !== 'PASS') || failures.length || proxyChecks.some(r => !r.passes) ? 'QA_FINDINGS'
      : reports.some(r => r.upstreamTieOrderSensitive) ? 'SCORES_PASS_WITH_TIE_ORDER_FINDING_AND_COVERAGE_LIMIT' : 'BOUNDED_PASS_WITH_EXPLICIT_COVERAGE_LIMIT',
    mode, terminalReason: terminal, realGETs: network.length, maxRealGETs: MAX_GETS, noRetries: true, noRedirects: true,
    initialFiveProbesCompleted: network.length >= 5 && network.slice(0, 5).every(c => c.status === 200 && c.complete),
    uniqueNormalizedBaseQueries: uniqueQueries, exactBaseProfilesAnalyzedOnActualCapturedData: reports.length,
    directLiveProfileQueries: direct.length, localRecalculationOnlyProfiles: localOnly.map(r => r.persona),
    missingCapturedDataProfileCoverage: coverageMissing, cacheHits: transport?.cacheHits || 0,
    historicalSourceGETs: historicalRequests.length, historicalSuccessfulSourceGETs: historicalRequests.filter(r => r.status === 200 && r.bodyComplete).length,
    historicalSourceLatency: latencySummary(historicalRequests.map(r => ({ latencyMs: r.latencyMs } as Captured))),
    failures, profileStatuses: reports.map(r => ({ id: r.persona, status: r.status, coverage: r.coverage, scores: r.scores.length })),
    scoreComparisons: reports.reduce((n, r) => n + r.scores.length, 0), scoreMismatches: reports.flatMap(r => r.scores.filter((s: Row) => !s.exact)).length,
    profileChangeDemonstrations: reports.filter(r => r.currentProfileChange.status === 'PASS').length,
    sourceAttributeMismatches: reports.reduce((n, r) => n + r.sourceAttributeMismatches.length, 0),
    profilesWithUpstreamTieOrderSensitivity: reports.filter(r => r.upstreamTieOrderSensitive).map(r => r.persona),
    profilesWithPoisonedEqualAffinityTopChoiceChange: reports.filter(r => r.rawScorePoisoning.topChoiceChangedOnEqualAffinity).map(r => r.persona),
    noInventedIdentityFields: reports.length ? reports.every(r => r.checks.noInventedIdentityFields) : null,
    missingData: reports.map(r => ({ persona: r.persona, ...r.missingData })),
    diversityLiveOnly: describeDiversity(direct), diversityAllAnalyzedCapturedCandidates: describeDiversity(reports),
    diversityOwnHistoricalQueryOnly: describeDiversity(reports.filter(r => r.coverage === 'REPLAY_OF_OWN_PREVIOUS_PUBLIC_QUERY')),
    latency: latencySummary(network), proxyLocalReplay: proxyChecks, offlineFixtureChecks: offline.count,
    safety: { allowedEndpoint: ORIGIN + ENDPOINT, GETOnly: true, timeoutMs: TIMEOUT_MS, bodyCapBytes: MAX_BODY,
      minimumStartIntervalMs: 1000, receivedCredentialsPersisted: false, userSessionReads: 0,
      accountAuthTableProviderWrites: 0, AIOrVisionCalls: 0, directWinerimOrOtherNetworkCalls: 0 },
    scope, notCertified: ['Model recognition', 'Prediction of human taste', 'Producer ground truth', 'Human study', 'Full native UI', 'Deployed proxy source equivalence', 'Live candidate coverage for locally replayed profiles'] };
  save(path.join(out, 'summary.json'), summary);
  save(path.join(out, 'proxy-local-replay.json'), proxyChecks);
  console.log(JSON.stringify({ status: summary.status, realGETs: summary.realGETs, analyzedProfiles: reports.length,
    directProfiles: direct.length, localOnlyProfiles: localOnly.length, missingProfiles: coverageMissing.length, scoreMismatches: summary.scoreMismatches, out }));
}

void main().catch(error => {
  // Never print arbitrary errors from a client, parser, response, .env or socket.
  console.error(JSON.stringify({ status: 'STOPPED', reason: error instanceof QAError ? error.code : 'HARNESS_FAILURE_NO_CREDENTIAL_DETAILS' }));
  process.exitCode = 1;
});
