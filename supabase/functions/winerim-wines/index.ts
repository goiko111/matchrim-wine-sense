import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const WINERIM_API_URL = Deno.env.get('WINERIM_API_URL') ?? 'https://app.winerim.com';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isInt = (v: string | null) => v !== null && /^-?\d+$/.test(v);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sp = url.searchParams;

    const restaurantUuid = (sp.get('restaurantUuid') ?? '').trim();
    if (!UUID_RE.test(restaurantUuid)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing restaurantUuid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const required = ['userPower', 'userAcidity', 'userFruity', 'userSweetness', 'userTannin'];
    for (const k of required) {
      if (!isInt(sp.get(k))) {
        return new Response(
          JSON.stringify({ error: `Invalid or missing param: ${k}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const upstream = new URL(
      `${WINERIM_API_URL.replace(/\/$/, '')}/api/v1/restaurant/${restaurantUuid}/wines/match`
    );
    for (const k of required) upstream.searchParams.set(k, sp.get(k)!);
    const matchrimCode = sp.get('matchrimCode');
    if (matchrimCode) upstream.searchParams.set('matchrimCode', matchrimCode);

    const upstreamRes = await fetch(upstream.toString(), {
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
    return new Response(
      JSON.stringify({ error: 'Upstream request failed', detail: (err as Error).message }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
