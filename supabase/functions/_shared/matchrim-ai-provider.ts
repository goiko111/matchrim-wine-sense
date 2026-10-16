import { getMatchrimOpenAiEffort, getMatchrimOpenAiKey, getMatchrimOpenAiModel } from './matchrim-openai.ts';

type MatchrimAiRequest = {
  prompt: string;
  image?: string;
  maxTokens: number;
  allowLovable?: boolean;
  signal?: AbortSignal;
};

export type MatchrimAiResult = {
  text: string;
  provider: 'anthropic' | 'lovable' | 'openai';
  model: string;
  complete: boolean;
};

// The compatibility flag stays in the request type; no call can select a different provider.
export const runMatchrimAi = async ({ prompt, image, maxTokens, signal }: MatchrimAiRequest): Promise<MatchrimAiResult> => {
  if (signal?.aborted) throw signal.reason;
  const apiKey = getMatchrimOpenAiKey();
  if (!apiKey) throw new Error('Configura la clave openai_matchrim en el backend antes de analizar.');
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 32768) throw new Error('Limite de tokens no valido.');
  const model = getMatchrimOpenAiModel(image ? 'vision' : maxTokens <= 512 ? 'fast' : 'quality');
  const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: prompt }];
  if (image) {
    if (!/^data:image\/(?:jpeg|png|gif|webp);base64,[\s\S]+$/i.test(image)) {
      throw new Error('El proveedor independiente requiere una imagen JPEG, PNG, GIF o WebP.');
    }
    content.push({ type: 'input_image', image_url: image, detail: 'high' });
  }
  const deadline = AbortSignal.timeout(55000);
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: [{ role: 'user', content }], max_output_tokens: maxTokens,
      reasoning: { effort: getMatchrimOpenAiEffort(model) }, store: false }),
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  });
  if (!response.ok) {
    // Provider bodies may echo private source text; never put them in backend logs.
    await response.body?.cancel();
    if (response.status === 429) throw new Error('Demasiadas solicitudes. Espera un momento e intenta de nuevo.');
    if (response.status === 402) throw new Error('Creditos del proveedor agotados.');
    throw new Error('El proveedor de IA rechazo la solicitud (' + response.status + ').');
  }
  const data = await response.json() as {
    status?: string; error?: unknown; incomplete_details?: unknown;
    output?: Array<{ type?: string; role?: string; status?: string; content?: Array<{ type?: string; text?: string }> }>;
  };
  const messages = (data.output ?? []).filter(item => item.type === 'message');
  if (!messages.length || messages.some(item => item.role !== 'assistant' || item.content?.some(block => block.type === 'refusal'))) {
    throw new SyntaxError('OpenAI no devolvio una lectura utilizable.');
  }
  const text = messages.flatMap(item => (item.content ?? [])
    .filter(block => block.type === 'output_text' && typeof block.text === 'string')
    .map(block => block.text)).join('\n').trim();
  if (!text) throw new SyntaxError('OpenAI no devolvio contenido analizable.');
  const complete = data.status === 'completed' && !data.error && !data.incomplete_details
    && messages.every(item => item.status === 'completed')
    && (data.output ?? []).every(item => item.type === 'message' || item.type === 'reasoning')
    && messages.every(item => item.content?.every(block => block.type === 'output_text'));
  return { text, provider: 'openai', model, complete };
};
