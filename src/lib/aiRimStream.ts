import { supabase } from '@/integrations/supabase/client';

export type AiRimFunctionType =
  | 'wine-for-dish'
  | 'dish-for-wine'
  | 'pairing-check'
  | 'special-moments';

export interface AiRimStreamPayload {
  functionType: AiRimFunctionType;
  input1: string;
  input2?: string | null;
  context?: string;
  eventDetails?: Record<string, string | null>;
}

const getSupabaseRuntime = async () => {
  const { data } = await supabase.auth.getSession();
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const accessToken = data.session?.access_token ?? publishableKey;
  const supabaseUrl =
    (supabase as unknown as { supabaseUrl?: string }).supabaseUrl ??
    import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl || !accessToken) {
    throw new Error('No se pudo conectar con aiRIM.');
  }

  return { accessToken, publishableKey, supabaseUrl };
};

export const streamAiRimResponse = async (
  payload: AiRimStreamPayload,
  onResponse: (response: string) => void,
) => {
  const { accessToken, publishableKey, supabaseUrl } = await getSupabaseRuntime();
  const resp = await fetch(`${supabaseUrl}/functions/v1/ai-wine-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: publishableKey,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(errorData.error || 'Error en la respuesta del servidor');
  }

  if (!resp.body) throw new Error('No se recibió respuesta del servidor');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = '';
  let accumulatedResponse = '';
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) {
          accumulatedResponse += content;
          onResponse(accumulatedResponse);
        }
      } catch {
        textBuffer = line + '\n' + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (raw.startsWith(':') || raw.trim() === '') continue;
      if (!raw.startsWith('data: ')) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) {
          accumulatedResponse += content;
          onResponse(accumulatedResponse);
        }
      } catch {
        // Ignore incomplete SSE leftovers after the stream closes.
      }
    }
  }

  return accumulatedResponse;
};
