import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// The gateway already verified the JWT (verify_jwt = true in config.toml); we only
// read who it belongs to, so the backend can rate-limit per user and not per edge IP.
const userIdFromJwt = (req: Request): string | null => {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.sub === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
};

export const createHandler = (apiUrl: string, searchKey: string, fetchImpl: typeof fetch = fetch) =>
  async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!searchKey) return json(503, { error: 'Catalogue search is not configured' });

    try {
      const body = await req.json().catch(() => null);
      const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

      const query = String(input.query ?? '').trim();
      if (query.length < 2) return json(200, { results: [], count: 0 });

      const upstream = new URL(`${apiUrl.replace(/\/$/, '')}/api/v1/matchrim/wines/search`);
      upstream.searchParams.set('q', query.slice(0, 100));
      const vintage = String(input.vintage ?? '').trim();
      if (/^\d{4}$/.test(vintage)) upstream.searchParams.set('vintage', vintage);
      const limit = Math.round(Number(input.limit));
      if (Number.isFinite(limit) && limit > 0) upstream.searchParams.set('limit', String(Math.min(limit, 20)));

      const headers: Record<string, string> = { Accept: 'application/json', 'X-Matchrim-Key': searchKey };
      const userId = userIdFromJwt(req);
      if (userId) headers['X-Matchrim-User'] = userId;

      const upstreamRes = await fetchImpl(upstream.toString(), { method: 'GET', headers });
      const bodyText = await upstreamRes.text();

      // The backend answers 400 for text it cannot search (too short, only stopwords…):
      // for the app that is just "no matches", not an error to show.
      if (upstreamRes.status === 400) return json(200, { results: [], count: 0 });

      return new Response(bodyText, {
        status: upstreamRes.status,
        headers: {
          ...corsHeaders,
          'Content-Type': upstreamRes.headers.get('content-type') ?? 'application/json',
        },
      });
    } catch (err) {
      console.error('[catalog-search] upstream error', err);
      return json(502, { error: 'Upstream request failed', detail: (err as Error).message });
    }
  };
