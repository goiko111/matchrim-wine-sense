type MatchrimAiRequest = {
  prompt: string;
  image?: string;
  maxTokens: number;
  allowLovable?: boolean;
};

export type MatchrimAiResult = {
  text: string;
  provider: 'anthropic' | 'lovable' | 'openai';
  model: string;
  complete: boolean;
};

const parseImageDataUrl = (image: string) => {
  const match = image.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,([\s\S]+)$/i);
  if (!match) {
    throw new Error('El proveedor independiente requiere una imagen JPEG, PNG, GIF o WebP.');
  }
  return { mediaType: match[1].toLowerCase(), data: match[2] };
};

const providerError = async (response: Response) => {
  const detail = await response.text();
  console.error('Matchrim AI provider error:', response.status, detail.slice(0, 500));
  if (response.status === 429) return new Error('Demasiadas solicitudes. Espera un momento e intenta de nuevo.');
  if (response.status === 402) return new Error('Créditos del proveedor agotados.');
  return new Error(`El proveedor de IA rechazó la solicitud (${response.status}).`);
};

const runAnthropic = async ({ prompt, image, maxTokens }: MatchrimAiRequest): Promise<MatchrimAiResult> => {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada');
  const model = Deno.env.get('MATCHRIM_ANTHROPIC_MODEL')?.trim() || 'claude-sonnet-4-6';
  const content: Array<Record<string, unknown>> = [];
  if (image) {
    const parsed = parseImageDataUrl(image);
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: parsed.mediaType, data: parsed.data },
    });
  }
  content.push({ type: 'text', text: prompt });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!response.ok) throw await providerError(response);
  const data = await response.json() as { content?: Array<{ type?: string; text?: string }>; stop_reason?: string };
  const text = (data.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
  if (!text) throw new Error('Anthropic no devolvió contenido analizable.');
  return { text, provider: 'anthropic', model, complete: data.stop_reason === 'end_turn' };
};

const runLovable = async ({ prompt, image, maxTokens }: MatchrimAiRequest): Promise<MatchrimAiResult> => {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY no configurada');
  const model = Deno.env.get('MATCHRIM_LOVABLE_MODEL')?.trim() || 'google/gemini-2.5-flash';
  const content: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }];
  if (image) content.push({ type: 'image_url', image_url: { url: image } });
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) throw await providerError(response);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  if (!text) throw new Error('Lovable no devolvió contenido analizable.');
  return { text, provider: 'lovable', model, complete: data.choices?.[0]?.finish_reason === 'stop' };
};

const runRestaurantOpenAi = async ({ prompt, image, maxTokens }: MatchrimAiRequest): Promise<MatchrimAiResult> => {
  const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  const model = Deno.env.get('MATCHRIM_RESTAURANT91_OPENAI_MODEL')?.trim();
  if (!apiKey || !model) throw new Error('Configura OPENAI_API_KEY y el modelo de restaurante antes de analizar.');
  const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: prompt }];
  if (image) {
    parseImageDataUrl(image);
    content.push({ type: 'input_image', image_url: image, detail: 'high' });
  }
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: [{ role: 'user', content }], max_output_tokens: maxTokens, store: false }),
  });
  if (!response.ok) {
    // Provider bodies may echo private source text; never put them in backend logs.
    if (response.status === 429) throw new Error('Demasiadas solicitudes. Espera un momento e intenta de nuevo.');
    if (response.status === 402) throw new Error('Créditos del proveedor agotados.');
    throw new Error(`El proveedor de IA rechazó la solicitud (${response.status}).`);
  }
  const data = await response.json() as {
    status?: string; error?: unknown; incomplete_details?: unknown;
    output?: Array<{ type?: string; role?: string; status?: string; content?: Array<{ type?: string; text?: string }> }>;
  };
  const messages = (data.output ?? []).filter(item => item.type === 'message');
  if (!messages.length || messages.some(item => item.role !== 'assistant' || item.content?.some(block => block.type === 'refusal'))) {
    throw new Error('OpenAI no devolvio una lectura utilizable.');
  }
  const text = messages.flatMap(item => (item.content ?? [])
    .filter(block => block.type === 'output_text' && typeof block.text === 'string')
    .map(block => block.text)).join('\n').trim();
  if (!text) throw new Error('OpenAI no devolvio contenido analizable.');
  const complete = data.status === 'completed' && !data.error && !data.incomplete_details
    && messages.every(item => item.status === 'completed')
    && (data.output ?? []).every(item => item.type === 'message' || item.type === 'reasoning')
    && messages.every(item => item.content?.every(block => block.type === 'output_text'));
  return { text, provider: 'openai', model, complete };
};

export const runMatchrimAi = async (request: MatchrimAiRequest): Promise<MatchrimAiResult> => {
  const configured = Deno.env.get('MATCHRIM_AI_PROVIDER')?.trim().toLowerCase();
  if (request.allowLovable === false) {
    const independent = Deno.env.get('MATCHRIM_RESTAURANT91_AI_PROVIDER')?.trim().toLowerCase() || configured;
    if (independent === 'openai') return runRestaurantOpenAi(request);
    if ((independent && independent !== 'anthropic') || !Deno.env.get('ANTHROPIC_API_KEY')?.trim()) {
      throw new Error('Configura el proveedor independiente para este analisis. Lovable AI no esta permitido.');
    }
    return runAnthropic(request);
  }
  if (configured === 'anthropic') return runAnthropic(request);
  if (configured === 'lovable') return runLovable(request);
  if (Deno.env.get('ANTHROPIC_API_KEY')) return runAnthropic(request);
  return runLovable(request);
};
