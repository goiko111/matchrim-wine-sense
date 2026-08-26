import { supabase } from '@/integrations/supabase/client';
import { ensureMatchrimQaProfile, isMatchrimFixtureQaEnabled } from '@/utils/matchrimQaMode';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const invokeEdgeFunction = async <ResponseBody>(
  functionName: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ResponseBody> => {
  if (isMatchrimFixtureQaEnabled) {
    const { resolveMatchrimQaFixture } = await import('@/utils/matchrimQaFixtures');
    const fixture = await resolveMatchrimQaFixture(functionName, body, signal);
    if (fixture.handled) {
      ensureMatchrimQaProfile();
      return fixture.payload as ResponseBody;
    }
  }

  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.access_token || SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : `Error ${response.status}`;
    throw new Error(message);
  }
  return payload as ResponseBody;
};
