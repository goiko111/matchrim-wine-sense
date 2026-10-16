type OpenAiTier = 'fast' | 'quality' | 'vision';

export const getMatchrimOpenAiKey = (): string | undefined =>
  Deno.env.get('openai_matchrim')?.trim() || Deno.env.get('OPENAI_API_KEY')?.trim() || undefined;

export const hasMatchrimOpenAiKey = (): boolean => Boolean(getMatchrimOpenAiKey());

export const getMatchrimOpenAiModel = (tier: OpenAiTier): string => {
  const configured = Deno.env.get(`MATCHRIM_OPENAI_${tier.toUpperCase()}_MODEL`)?.trim();
  return configured || (tier === 'fast' ? 'gpt-6-luna' : 'gpt-6-astra');
};

export const getMatchrimOpenAiEffort = (model: string): 'none' | 'low' => {
  if (/^gpt-6-(?:luna|sol)(?:-|$)/.test(model)) return 'none';
  if (/^gpt-6(?:\.1)?-(?:astra|sol)(?:-|$)/.test(model)) return 'low';
  throw new Error('El modelo OpenAI configurado requiere validar sus parametros antes de usarlo.');
};

const failure = (status: number, code: string): Response => new Response(JSON.stringify({
  error: { code, message: status === 429 ? 'Limite de solicitudes del proveedor. Intentalo mas tarde.'
    : 'No se ha podido completar el analisis de IA.' },
}), { status, headers: { 'Content-Type': 'application/json' } });

const normalizeMessages = (value: unknown): unknown[] => {
  if (!Array.isArray(value) || !value.length || value.length > 50) throw new Error('Conversacion de IA no valida.');
  return value.map(message => {
    if (!message || typeof message !== 'object' || Array.isArray(message)) throw new Error('Mensaje de IA no valido.');
    const row = message as Record<string, unknown>;
    if (!['system', 'developer', 'user', 'assistant'].includes(String(row.role))) throw new Error('Rol de IA no valido.');
    if (typeof row.content === 'string') return { role: row.role, content: row.content };
    if (!Array.isArray(row.content)) throw new Error('Contenido de IA no valido.');
    return { role: row.role, content: row.content.map((item: unknown) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Adjunto de IA no valido.');
      const part = item as Record<string, unknown>;
      if (part.type === 'text' && typeof part.text === 'string') return { type: 'text', text: part.text };
      if (part.type === 'image_url' && part.image_url && typeof part.image_url === 'object') {
        const url = (part.image_url as Record<string, unknown>).url;
        if (typeof url !== 'string') throw new Error('Imagen de IA no valida.');
        if (/^data:application\/pdf;base64,/i.test(url)) return { type: 'file', file: { filename: 'carta.pdf', file_data: url } };
        if (!/^data:image\/(?:jpeg|png|gif|webp);base64,/i.test(url)) throw new Error('Solo se permiten imagenes adjuntas, no URLs remotas de IA.');
        return { type: 'image_url', image_url: { url, detail: 'high' } };
      }
      throw new Error('Formato de adjunto de IA no compatible.');
    }) };
  });
};

// Keeps existing JSON/SSE consumers while centralizing the only provider credential.
export const fetchMatchrimAiChat = async (init: RequestInit): Promise<Response> => {
  if (init.signal?.aborted) throw init.signal.reason;
  const key = getMatchrimOpenAiKey();
  if (!key) return failure(503, 'provider_not_configured');
  if (typeof init.body !== 'string' || init.body.length > 40 * 1024 * 1024) return failure(400, 'invalid_ai_request');
  let input: Record<string, unknown>;
  let messages: unknown[];
  try {
    input = JSON.parse(init.body);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid');
    if (input.tools || input.tool_choice || input.functions) throw new Error('Tool use requires its own reviewed Responses contract.');
    if (input.modalities) throw new Error('Image generation is not a verified bottle image source.');
    messages = normalizeMessages(input.messages);
  } catch { return failure(400, 'invalid_ai_request'); }
  const hasAttachments = messages.some(message => {
    const content = (message as { content?: unknown }).content;
    return Array.isArray(content) && content.some(part => part.type === 'image_url' || part.type === 'file');
  });
  const tier = hasAttachments ? 'vision'
    : typeof input.model === 'string' && /(?:pro|astra)/.test(input.model) ? 'quality' : 'fast';
  const model = getMatchrimOpenAiModel(tier);
  const effort = getMatchrimOpenAiEffort(model);
  const maxTokens = input.max_completion_tokens ?? input.max_tokens ?? 8192;
  if (!Number.isInteger(maxTokens) || Number(maxTokens) < 1 || Number(maxTokens) > 32768) return failure(400, 'invalid_token_limit');
  const signal = init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(85000)]) : AbortSignal.timeout(85000);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: input.stream === true, store: false,
      max_completion_tokens: maxTokens, reasoning_effort: effort,
      ...(effort === 'none' && typeof input.temperature === 'number' ? { temperature: input.temperature } : {}),
      ...(input.response_format ? { response_format: input.response_format } : {}),
    }),
    signal,
  });
  if (!response.ok) {
    await response.body?.cancel();
    return failure(response.status, response.status === 429 ? 'rate_limited' : 'provider_error');
  }
  if (input.stream === true) {
    if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
      await response.body?.cancel();
      return failure(502, 'invalid_model_stream');
    }
    return response;
  }
  let data: { choices?: Array<{ finish_reason?: string; message?: { content?: unknown; refusal?: unknown; tool_calls?: unknown } }> };
  try { data = await response.json(); } catch { return failure(502, 'invalid_model_response'); }
  const choice = data?.choices?.[0];
  if (data?.choices?.length !== 1 || choice?.finish_reason !== 'stop' || choice.message?.refusal
    || choice.message?.tool_calls || typeof choice.message?.content !== 'string' || !choice.message.content.trim()) {
    return failure(502, 'incomplete_model_response');
  }
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};
