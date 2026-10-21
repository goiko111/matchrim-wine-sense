import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isInt = (v: unknown) => v !== null && v !== undefined && /^-?\d+$/.test(String(v).trim());

const REQUIRED = ['userPower', 'userAcidity', 'userFruity', 'userSweetness', 'userTannin'] as const;
// Quiz profile keys (what the app sends in `profile`) -> backend query params.
const PROFILE_KEYS: Record<(typeof REQUIRED)[number], string> = {
  userPower: 'potente',
  userAcidity: 'acidez',
  userFruity: 'afrutado',
  userSweetness: 'dulce',
  userTannin: 'tanico',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const clampInt = (v: unknown, def: number, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Math.min(max, Math.max(min, Number.isFinite(n) && n !== 0 ? n : def));
};

// Normalises both input shapes (POST JSON body from the app, legacy GET query string).
const readInput = async (req: Request): Promise<Record<string, unknown>> => {
  if (req.method === 'POST') {
    const body = await req.json().catch(() => null);
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  }
  return Object.fromEntries(new URL(req.url).searchParams.entries());
};

export const createHandler = (apiUrl: string, fetchImpl: typeof fetch = fetch) =>
  async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      const input = await readInput(req);

      const restaurantUuid = String(input.restaurantUuid ?? '').trim();
      if (!UUID_RE.test(restaurantUuid)) {
        return json(400, { error: 'Invalid or missing restaurantUuid' });
      }

      const endpoint = input.endpoint === 'wines' ? 'wines' : 'match';
      const base = apiUrl.replace(/\/$/, '');
      const upstream = new URL(`${base}/api/v1/restaurant/${restaurantUuid}/${endpoint === 'wines' ? 'wines' : 'wines/match'}`);

      if (endpoint === 'wines') {
        upstream.searchParams.set('page', String(clampInt(input.page, 1, 1, Number.MAX_SAFE_INTEGER)));
        upstream.searchParams.set('limit', String(clampInt(input.limit, 100, 1, 250)));
      } else {
        const profile = (input.profile && typeof input.profile === 'object'
          ? input.profile
          : {}) as Record<string, unknown>;
        for (const k of REQUIRED) {
          const value = input[k] ?? profile[PROFILE_KEYS[k]];
          if (!isInt(value)) return json(400, { error: `Invalid or missing param: ${k}` });
          upstream.searchParams.set(k, String(value).trim());
        }
        const matchrimCode = String(input.matchrimCode ?? '').trim();
        if (matchrimCode) upstream.searchParams.set('matchrimCode', matchrimCode);
      }

      const upstreamRes = await fetchImpl(upstream.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      const bodyText = await upstreamRes.text();
      return new Response(bodyText, {
        status: upstreamRes.status,
        headers: {
          ...corsHeaders,
          'Content-Type': upstreamRes.headers.get('content-type') ?? 'application/json',
        },
      });
    } catch (err) {
      console.error('[winerim-wines] upstream error', err);
      return json(502, { error: 'Upstream request failed', detail: (err as Error).message });
    }
  };
