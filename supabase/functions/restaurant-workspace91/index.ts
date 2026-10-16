import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { runMatchrimAi } from '../_shared/matchrim-ai-provider.ts';
import {
  buildRestaurantReadPrompt91, buildRestaurantRankPrompt91,
  parseRestaurantRequest91, parseRestaurantRead91, parseRestaurantPairs91,
  restaurantRankCandidates91, RestaurantContractError91,
} from '../_shared/matchrim-restaurant91.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'sb-error-code',
};
const MAX_BODY_BYTES = 10500000;

export type RestaurantWorkspaceDependencies91 = {
  authenticate: (request: Request) => Promise<boolean>;
  runAi: typeof runMatchrimAi;
  timeoutMs?: number;
};

class WorkspaceError91 extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly reason: string) {
    super(code);
  }
}

const authenticate = async (request: Request): Promise<boolean> => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !key) throw new WorkspaceError91(503, 'auth_not_configured', 'configuration');
  const authorization = request.headers.get('Authorization') ?? '';
  const token = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1];
  if (!token) return false;
  const client = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  return !error && Boolean(data?.user?.id);
};

const json = (payload: unknown, status = 200, code?: string) => new Response(JSON.stringify(payload), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(code ? { 'sb-error-code': code } : {}) },
});

const errorResponse = (status: number, code: string, reason: string) => json({
  error: code, reason,
  message: status === 401 ? 'Inicia sesion para analizar la carta.'
    : status === 429 ? 'Demasiadas solicitudes. Vuelve a intentarlo manualmente mas tarde.'
    : status === 400 ? 'Revisa las fuentes y opciones de la solicitud.'
    : 'No se pudo completar un analisis valido. Puedes volver a intentarlo manualmente.',
  recoverable: true, retryable: false,
}, status, code);

const readBody = async (request: Request): Promise<unknown> => {
  const length = request.headers.get('Content-Length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    throw new RestaurantContractError91('invalid_request', 'body_too_large');
  }
  if (!request.body) throw new RestaurantContractError91('invalid_request', 'missing_body');
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RestaurantContractError91('invalid_request', 'body_too_large');
      }
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof RestaurantContractError91) throw error;
    throw new RestaurantContractError91('invalid_request', 'invalid_json');
  } finally {
    reader.releaseLock();
  }
};

const providerFailure = (error: unknown): WorkspaceError91 => {
  if (error instanceof WorkspaceError91) return error;
  const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
  const message = error instanceof Error ? error.message : '';
  // The existing provider helper uses a plain Error for 429; retain its meaning
  // without returning provider details, keys or upstream response bodies.
  if (status === 429 || /demasiadas solicitudes|too many requests|rate.?limit|\b429\b/i.test(message)) {
    return new WorkspaceError91(429, 'rate_limited', 'provider_rate_limit');
  }
  return new WorkspaceError91(502, 'provider_error', 'provider_failure');
};

const runBoundedAi = (
  input: Parameters<typeof runMatchrimAi>[0], request: Request, dependencies: RestaurantWorkspaceDependencies91,
): ReturnType<typeof runMatchrimAi> => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    cleanup();
    reject(new WorkspaceError91(502, 'provider_error', 'provider_timeout'));
  }, dependencies.timeoutMs ?? 55000);
  const aborted = () => {
    cleanup();
    reject(new RestaurantContractError91('invalid_request', 'request_aborted'));
  };
  const cleanup = () => {
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', aborted);
  };
  if (request.signal.aborted) { aborted(); return; }
  request.signal.addEventListener('abort', aborted, { once: true });
  // This bounds our response wait only: the shared helper has no AbortSignal
  // parameter. Never retry or claim the upstream paid request was cancelled.
  Promise.resolve().then(() => dependencies.runAi(input)).then(
    (result) => { cleanup(); resolve(result); },
    (error) => { cleanup(); reject(providerFailure(error)); },
  );
});

export const handleRequest = async (
  request: Request,
  dependencies: RestaurantWorkspaceDependencies91 = { authenticate, runAi: runMatchrimAi },
): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') {
    const response = errorResponse(405, 'method_not_allowed', 'use_post');
    response.headers.set('Allow', 'POST, OPTIONS');
    return response;
  }
  try {
    if (!/^Bearer\s+\S+$/i.test(request.headers.get('Authorization') ?? '')) return errorResponse(401, 'unauthorized', 'missing_token');
    let authorized: boolean;
    try { authorized = await dependencies.authenticate(request); }
    catch (error) {
      if (error instanceof WorkspaceError91) throw error;
      return errorResponse(401, 'unauthorized', 'invalid_session');
    }
    if (!authorized) return errorResponse(401, 'unauthorized', 'invalid_session');
    const input = parseRestaurantRequest91(await readBody(request));
    if (request.signal.aborted) return errorResponse(400, 'invalid_request', 'request_aborted');
    if (input.operation === 'rank') {
      const candidates = restaurantRankCandidates91(input.foods, input.wines, input);
      if (!candidates.foods.length || !candidates.wines.length) {
        return json({ pairs: [], warnings: [...candidates.warnings, 'No hay suficientes filas elegibles con evidencia para formar parejas.'] });
      }
    }
    const prompt = input.operation === 'rank'
      ? buildRestaurantRankPrompt91(input)
      : buildRestaurantReadPrompt91(input);
    let result: Awaited<ReturnType<typeof runMatchrimAi>>;
    try {
      result = await runBoundedAi({
        prompt, image: input.operation === 'rank' ? undefined : input.image,
        maxTokens: input.operation === 'rank' ? 8192 : 16384,
        allowLovable: false,
      }, request, dependencies);
    } catch (error) {
      if (error instanceof RestaurantContractError91) throw error;
      throw providerFailure(error);
    }
    if (result.complete !== true) throw new RestaurantContractError91('invalid_model_response', 'incomplete_response');
    if (input.operation === 'rank') return json(parseRestaurantPairs91(result.text, input.foods, input.wines, input));
    const read = parseRestaurantRead91(result.text, input.kind, input.pageId);
    // Text-only extraction can be checked against the actual submitted source.
    // Image OCR remains explicitly a model reading, not verified pixel accuracy.
    if (!input.image && input.text) {
      const literal = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
      if (read.rows.some((row) => !literal(input.text!).includes(literal(row.sourceText)))) {
        throw new RestaurantContractError91('invalid_model_response', 'source_not_in_page');
      }
    }
    return json(read);
  } catch (error) {
    if (error instanceof RestaurantContractError91) return errorResponse(error.code === 'invalid_request' ? 400 : 502, error.code, error.reason);
    if (error instanceof WorkspaceError91) return errorResponse(error.status, error.code, error.reason);
    return errorResponse(502, 'analysis_failed', 'unexpected_failure');
  }
};

serve((request: Request) => handleRequest(request));
