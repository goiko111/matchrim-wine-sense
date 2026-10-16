import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import {
  importRestaurantResource91,
  readRestaurantBody91,
  restaurantAbortable91,
  RestaurantImportError91,
  RESTAURANT_IMPORT_LIMITS91,
} from '../_shared/matchrim-restaurant-import91.ts';
import { fetchPinnedRestaurantUrl91, restaurantPinnedTransportAvailable91 } from '../_shared/matchrim-restaurant-url-transport91.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

/* Target requests exclusively use literal-IP TCP + original-hostname TLS, with peer
 * verification before the HTTP write. No operator attestation enables native fetch.
 * Missing connect/startTls/DNS support fails closed. Gateway limits and rate limiting
 * remain platform concerns; no deployment or platform configuration is made here.
 */
serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Metodo no permitido.', code: 'method_not_allowed' }, 405);
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = /^Bearer\s+(\S+)$/i.exec(authHeader)?.[1];
  if (!token || token.length > 8192) return json({ error: 'Inicia sesion para importar una URL.', code: 'unauthorized' }, 401);
  const controller = new AbortController();
  const cancel = () => controller.abort(request.signal.reason ?? new DOMException('Cancelled', 'AbortError'));
  if (request.signal.aborted) cancel();
  else request.signal.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new RestaurantImportError91('import_timeout', 'La importacion ha tardado demasiado.', 504)), RESTAURANT_IMPORT_LIMITS91.timeoutMs);
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader }, fetch: (input, init) => fetch(input, { ...init, signal: controller.signal }) },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await restaurantAbortable91(client.auth.getUser(token), controller.signal);
    if (error || !data?.user?.id) return json({ error: 'La sesion no es valida. Inicia sesion de nuevo.', code: 'unauthorized' }, 401);
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Se requiere JSON.', code: 'invalid_body' }, 415);
    const bytes = await readRestaurantBody91(new Response(request.body, { headers: request.headers }), RESTAURANT_IMPORT_LIMITS91.requestBytes, controller.signal);
    let body: unknown;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { return json({ error: 'JSON no valido.', code: 'invalid_body' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => key !== 'url')) {
      return json({ error: 'Se requiere unicamente el campo url.', code: 'invalid_body' }, 400);
    }
    if (!restaurantPinnedTransportAvailable91(Deno)) {
      return json({
        error: 'La importacion por URL requiere transporte TLS con IP fijada, no disponible en este entorno. Sube el PDF o la imagen directamente.',
        code: 'pinned_transport_unavailable', retryable: false,
      }, 503);
    }
    const result = await importRestaurantResource91((body as { url?: unknown }).url, {
      fetch: (url, init, addresses) => fetchPinnedRestaurantUrl91(url, init, addresses),
      resolve: async (hostname, signal) => {
        if (typeof Deno.resolveDns !== 'function') throw new RestaurantImportError91('dns_unavailable', 'Este entorno no permite verificar DNS de forma segura. Sube el archivo directamente.', 503);
        const addresses: string[] = [];
        for (const type of ['A', 'AAAA'] as const) {
          try { addresses.push(...await restaurantAbortable91(Deno.resolveDns(hostname, type), signal)); }
          catch (error) {
            if (!(error instanceof Deno.errors.NotFound)) throw error;
          }
        }
        return addresses;
      },
    }, controller.signal);
    return json(result);
  } catch (error) {
    const reason = controller.signal.aborted ? controller.signal.reason : error;
    if (reason instanceof RestaurantImportError91) return json({ error: reason.message, code: reason.code, retryable: false }, reason.status);
    if (reason instanceof DOMException && reason.name === 'AbortError') return json({ error: 'Importacion cancelada.', code: 'cancelled', retryable: false }, 499);
    return json({ error: 'No se pudo importar la URL. Sube el archivo directamente.', code: 'import_unavailable', retryable: false }, 502);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', cancel);
  }
});
