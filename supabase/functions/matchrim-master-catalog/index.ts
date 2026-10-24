import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { createMasterBridge194 } from '../_shared/matchrim-master194.ts';

// Prepared only; no native client uses this route until deployment is verified.
// MATCHRIM_GOIKO_KEY is server-only and must never be a VITE/native setting.
Deno.serve(createMasterBridge194({
  authenticate: async (token, signal) => {
    const url = Deno.env.get('SUPABASE_URL'), anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !anonKey || token === anonKey || signal.aborted) return false;
    const auth = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` },
        fetch: (input, init) => fetch(input, { ...init, signal }) },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await auth.auth.getUser(token);
    return !error && Boolean(data.user?.id)
      && (data.user as { is_anonymous?: boolean } | null)?.is_anonymous !== true && !signal.aborted;
  },
  readSecret: () => Deno.env.get('MATCHRIM_GOIKO_KEY'),
  fetcher: fetch,
}));
