import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { NATIVE_MATCHRIM_LEARNING_MODEL } from '@/utils/matchrimLearningPlatform';
import { EdgeFunctionError, parseRetryAfterMs } from '@/utils/edgeFunctionResilience';
import { ensureMatchrimQaProfile, isMatchrimFixtureQaEnabled } from '@/utils/matchrimQaMode';
import { resolveMatchrimEdgeFunctionName } from '@/utils/matchrimEdgeRouting';

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
  const requestBody = Capacitor.isNativePlatform()
    && ['detect-wine-regions', 'analyze-wine-region', 'scan-wine-menu'].includes(functionName)
    ? { ...body, matchrimLearningModel: NATIVE_MATCHRIM_LEARNING_MODEL }
    : body;
  const resolvedName = resolveMatchrimEdgeFunctionName(functionName, import.meta.env.VITE_MATCHRIM_EDGE_RELEASE);
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${resolvedName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.access_token || SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const invalidModel = payload?.error === 'invalid_model_response' && payload?.retryable === false;
    const message = invalidModel && typeof payload?.message === 'string' ? payload.message
      : typeof payload?.error === 'string' ? payload.error : `Error ${response.status}`;
    throw new EdgeFunctionError(message, {
      status: response.status,
      errorCode: invalidModel ? 'invalid_model_response' : response.headers.get('sb-error-code'),
      retryAfterMs: parseRetryAfterMs(response.headers.get('retry-after')),
    });
  }
  return payload as ResponseBody;
};
