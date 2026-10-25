const BASE = 'https://app.winerim.com/api/v1/matchrim/wines';
const REQUEST_BYTES = 12288;
const RESPONSE_BYTES = 262144;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const object = (value: unknown): value is Record<string, unknown> => value !== null
  && typeof value === 'object' && !Array.isArray(value);
const only = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key));
const id = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const hasControl = (value: string) => Array.from(value).some(char => {
  const code = char.charCodeAt(0);
  return code < 32 || (code >= 127 && code <= 159)
    || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
});

// An operation, never an arbitrary URL. Identity/affinity validation remains a
// separate client contract; this transport does not promote search proposals.
export const masterRequestUrl194 = (input: unknown): string | null => {
  if (!object(input)) return null;
  if (input.operation === 'detail' && only(input, ['operation', 'mantalakWineId']) && id(input.mantalakWineId)) {
    return `${BASE}/${input.mantalakWineId}`;
  }
  if (input.operation === 'ids' && only(input, ['operation', 'publicIds']) && Array.isArray(input.publicIds)) {
    const ids = input.publicIds;
    if (!ids.length || ids.length > 100 || !ids.every(id) || new Set(ids).size !== ids.length) return null;
    return `${BASE}/ids?${new URLSearchParams({ publicIds: ids.join(',') })}`;
  }
  if (input.operation !== 'search' || !only(input, ['operation', 'query']) || !object(input.query)) return null;
  const query = input.query;
  if (!only(query, ['q', 'name', 'winery', 'vintage', 'vintageMatch', 'page', 'limit', 'includeUnlisted'])) return null;
  const params = new URLSearchParams(), words: string[] = [];
  for (const field of ['name', 'winery', 'q']) {
    if (query[field] === undefined) continue;
    if (typeof query[field] !== 'string') return null;
    const value = query[field].trim(), tokens = [...new Set(value.split(/\s+/))];
    if (value.length < 2 || value.length > 100 || hasControl(value) || tokens.length > 6) return null;
    words.push(...tokens); params.set(field, value);
  }
  if (!words.some(word => [...word].length >= 3)) return null;
  if (query.vintage !== undefined) {
    if (typeof query.vintage !== 'string' || !/^(19|20)\d{2}$/.test(query.vintage)) return null;
    params.set('vintage', query.vintage);
  }
  if (query.vintageMatch !== undefined) {
    if (!query.vintage || (query.vintageMatch !== 'only' && query.vintageMatch !== 'prefer')) return null;
    params.set('vintageMatch', query.vintageMatch);
  }
  if (query.includeUnlisted !== undefined) {
    const flag = query.includeUnlisted;
    if (flag === true || flag === '1') params.set('includeUnlisted', '1');
    else if (flag === false || flag === '0') params.set('includeUnlisted', '0');
    else return null;
  }
  const page = query.page === undefined ? 1 : query.page, limit = query.limit === undefined ? 10 : query.limit;
  if (!id(page) || !id(limit) || limit > 50 || page * limit > 10000) return null;
  params.set('limit', String(limit)); params.set('page', String(page));
  return `${BASE}/search?${params}`;
};

export type MasterBridgeDependencies194 = {
  authenticate: (token: string, signal: AbortSignal) => Promise<string | null>;
  readSecret: () => string | undefined;
  fetcher: typeof fetch;
  timeoutMs?: number;
};
const json = (status: number, body: unknown, extra: Record<string, string> = {}) => Response.json(body,
  { status, headers: { ...cors, ...extra } });
const usableKey = (key: string | undefined): key is string => {
  if (!key || !key.trim() || key.length > 2048
    || Array.from(key).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return false;
  try { return new Headers({ 'X-Matchrim-Key': key }).get('X-Matchrim-Key') === key; }
  catch { return false; }
};

export const createMasterBridge194 = (deps: MasterBridgeDependencies194) => async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' }, { Allow: 'POST, OPTIONS' });
  const token = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return json(401, { error: 'AUTH_REQUIRED' });
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    return json(415, { error: 'JSON_REQUIRED' });
  }
  const controller = new AbortController();
  let timedOut = false;
  let stop: () => void = () => undefined;
  const stopped = new Promise<never>((_resolve, reject) => { stop = () => reject(new Error('STOPPED')); });
  const abort = () => { controller.abort(); stop(); };
  request.signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; abort(); }, deps.timeoutMs ?? 12000);
  const bounded = <T,>(work: Promise<T>) => Promise.race([work, stopped]);
  const readJson = async (body: ReadableStream<Uint8Array> | null, max: number) => {
    if (!body) throw new Error('NO_BODY');
    const reader = body.getReader(), chunks: Uint8Array[] = [];
    let count = 0;
    try {
      while (true) {
        const part = await bounded(reader.read()); if (part.done) break;
        count += part.value.byteLength; if (count > max) throw new Error('BODY_LIMIT');
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(count); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return { raw, value: JSON.parse(raw) as unknown };
    } finally { void reader.cancel().catch(() => undefined); }
  };
  try {
    if (request.signal.aborted) return json(499, { error: 'CANCELLED' });
    // The callback verifies the session with Supabase Auth, not JWT metadata or
    // merely the presence of an Authorization header.
    const userId = await bounded(deps.authenticate(token, controller.signal));
    if (typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return json(401, { error: 'AUTH_REQUIRED' });
    }
    let url: string | null;
    try { url = masterRequestUrl194((await readJson(request.body, REQUEST_BYTES)).value); }
    catch { if (controller.signal.aborted) throw new Error('STOPPED'); return json(400, { error: 'INVALID_REQUEST' }); }
    if (!url) return json(400, { error: 'INVALID_REQUEST' });
    const key = deps.readSecret();
    if (!usableKey(key)) return json(503, { error: 'CATALOGUE_NOT_CONFIGURED' });
    const pending = deps.fetcher(url, { method: 'GET', redirect: 'error', credentials: 'omit',
      referrerPolicy: 'no-referrer', signal: controller.signal,
      // Internal quota identity comes only from Auth; never forward caller headers,
      // the JWT, email, profile or ratings to the catalogue.
      headers: { Accept: 'application/json', 'X-Matchrim-Key': key, 'X-Matchrim-User': userId.toLowerCase() } });
    void pending.then(response => { if (controller.signal.aborted) void response.body?.cancel().catch(() => undefined); }, () => undefined);
    const response = await bounded(pending);
    if (!response.ok || response.redirected || (response.url && response.url !== url)) {
      void response.body?.cancel().catch(() => undefined);
      if (response.status === 429) {
        const retry = response.headers.get('retry-after') ?? '';
        return json(429, { error: 'CATALOGUE_RATE_LIMITED' }, /^\d{1,4}$/.test(retry)
          ? { 'Retry-After': String(Math.max(1, Math.min(3600, Number(retry)))) } : {});
      }
      return json(response.status === 401 || response.status === 403 ? 503 : 502, { error: 'CATALOGUE_UNAVAILABLE' });
    }
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) {
      void response.body?.cancel().catch(() => undefined); return json(502, { error: 'CATALOGUE_INVALID_RESPONSE' });
    }
    const body = await readJson(response.body, RESPONSE_BYTES);
    const serialized = JSON.stringify(body.value);
    if (!object(body.value) || [key, token, userId, userId.toLowerCase()].some(privateValue =>
      body.raw.includes(privateValue) || serialized.includes(JSON.stringify(privateValue).slice(1, -1)))) {
      return json(502, { error: 'CATALOGUE_INVALID_RESPONSE' });
    }
    return json(200, body.value);
  } catch {
    // Do not echo upstream bodies, headers, exceptions, session tokens or keys.
    return json(timedOut ? 504 : request.signal.aborted ? 499 : 502,
      { error: timedOut ? 'CATALOGUE_TIMEOUT' : request.signal.aborted ? 'CANCELLED' : 'CATALOGUE_UNAVAILABLE' });
  } finally {
    clearTimeout(timer); request.signal.removeEventListener('abort', abort); controller.abort();
  }
};
