import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { NATIVE_MATCHRIM_LEARNING_MODEL } from '@/utils/matchrimLearningPlatform';

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

interface AiRimStreamOptions {
  signal?: AbortSignal;
  ownerId?: string | null;
}

// Bound the entire operation, including session lookup, without another paid call.
const RESPONSE_TIMEOUT_MS = 90_000;

const abortable = <T>(operation: () => PromiseLike<T>, signal: AbortSignal): Promise<T> => (
  new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new DOMException('Consulta cancelada', 'AbortError'));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve().then(() => {
      if (signal.aborted) throw signal.reason;
      return operation();
    }).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  })
);

export const streamAiRimResponse = async (
  payload: AiRimStreamPayload,
  onResponse: (response: string) => void,
  options: AiRimStreamOptions = {},
) => {
  const controller = new AbortController();
  const { signal } = controller;
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  const timeout = setTimeout(() => controller.abort(new DOMException('aiRIM ha tardado demasiado.', 'TimeoutError')), RESPONSE_TIMEOUT_MS);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let unsubscribe: (() => void) | undefined;
  const cancelReader = () => { void reader?.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancelReader, { once: true });

  try {
    if (signal.aborted) throw signal.reason;
    if (options.ownerId !== undefined) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || (session?.user?.id ?? null) !== options.ownerId) {
          controller.abort(new DOMException('La sesión ha cambiado.', 'AbortError'));
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    }
    const { data, error } = await abortable(() => supabase.auth.getSession(), signal);
    if (signal.aborted) throw signal.reason;
    if (error) throw new Error('No se pudo comprobar la sesión de aiRIM.');
    if (options.ownerId !== undefined && (data.session?.user?.id ?? null) !== options.ownerId) {
      throw new DOMException('La sesión ha cambiado.', 'AbortError');
    }
    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const accessToken = data.session?.access_token ?? publishableKey;
    const supabaseUrl =
      (supabase as unknown as { supabaseUrl?: string }).supabaseUrl ??
      import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || !accessToken) throw new Error('No se pudo conectar con aiRIM.');

    const resp = await abortable(() => fetch(`${supabaseUrl}/functions/v1/ai-wine-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: publishableKey,
      },
      body: JSON.stringify(Capacitor.isNativePlatform()
        ? { ...payload, matchrimLearningModel: NATIVE_MATCHRIM_LEARNING_MODEL } : payload),
      signal,
    }).then(response => {
      if (signal.aborted) void response.body?.cancel().catch(() => {});
      return response;
    }), signal);
    if (signal.aborted) throw signal.reason;
    if (!resp.ok || !resp.headers.get('content-type')?.includes('text/event-stream') || !resp.body) {
      void resp.body?.cancel().catch(() => {});
      throw new Error('No se recibió una respuesta válida de aiRIM.');
    }

    reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let accumulatedResponse = '';
    let streamDone = false;
    let finished = false;
    let dataLines: string[] = [];
    let eventType = '';

    const dispatchEvent = () => {
      if (signal.aborted) throw signal.reason;
      if (eventType === 'error') throw new Error('aiRIM no pudo completar la respuesta.');
      if (!dataLines.length) { eventType = ''; return; }
      const json = dataLines.join('\n').trim();
      dataLines = [];
      eventType = '';
      if (json === '[DONE]') { streamDone = true; return; }
      let parsed;
      try { parsed = JSON.parse(json); } catch { throw new Error('aiRIM devolvió una respuesta incompleta.'); }
      if (!parsed || parsed.error || parsed.success === false || parsed.type === 'error') {
        throw new Error('aiRIM no pudo completar la respuesta.');
      }
      const choice = parsed.choices?.[0];
      if (choice?.finish_reason) {
        if (choice.finish_reason !== 'stop') throw new Error('aiRIM no pudo completar la respuesta.');
        finished = true;
      }
      const content = choice?.delta?.content;
      if (content != null && typeof content !== 'string') throw new Error('aiRIM devolvió una respuesta no válida.');
      if (content) {
        accumulatedResponse += content;
        onResponse(accumulatedResponse);
        if (signal.aborted) throw signal.reason;
      }
    };

    const processLine = (line: string) => {
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line) { dispatchEvent(); return; }
      if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
      else if (line.startsWith('event:')) eventType = line.slice(6).trim();
    };

    while (!streamDone) {
      const { done, value } = await abortable(() => reader!.read(), signal);
      if (signal.aborted) throw signal.reason;
      textBuffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while (!streamDone && (newline = textBuffer.indexOf('\n')) !== -1) {
        processLine(textBuffer.slice(0, newline));
        textBuffer = textBuffer.slice(newline + 1);
      }
      if (done) {
        if (!streamDone) {
          if (textBuffer) processLine(textBuffer);
          dispatchEvent();
        }
        break;
      }
    }

    if (signal.aborted) throw signal.reason;
    if (!accumulatedResponse.trim()) throw new Error('aiRIM devolvió una respuesta vacía.');
    if (!streamDone && !finished) throw new Error('aiRIM devolvió una respuesta incompleta.');
    return accumulatedResponse;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
    signal.removeEventListener('abort', cancelReader);
    unsubscribe?.();
    cancelReader();
    reader?.releaseLock();
  }
};
