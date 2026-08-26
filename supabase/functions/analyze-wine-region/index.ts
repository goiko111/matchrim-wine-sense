import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { evaluateCandidateGrounding, normalizeGroundingTokens } from './grounding.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const ANALYSIS_VERSION = 'matchrim-region-analysis-v3-grounded';

const parseJsonObject = (raw: string) => {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('El analisis no devolvio JSON valido');
  return JSON.parse(cleaned.slice(first, last + 1)) as Record<string, unknown>;
};

const stringArray = (value: unknown) => Array.isArray(value)
  ? value.filter((item) => typeof item === 'string' && item.trim()).slice(0, 8)
  : [];

const normalizeCandidate = (value: unknown, visibleText: string[]) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name || name.toLowerCase() === 'sin nombre') return null;
  const vintage = Number(raw.vintage);
  const alcohol = Number(raw.alcohol);
  const sensory = raw.sensory_attributes && typeof raw.sensory_attributes === 'object'
    ? raw.sensory_attributes as Record<string, unknown>
    : null;
  const normalizeSensory = (key: string) => {
    const numeric = Number(sensory?.[key]);
    return Number.isFinite(numeric) ? clamp(Math.round(numeric), 1, 5) : null;
  };
  const evidence = stringArray(raw.evidence);
  const uncertaintyReasons = stringArray(raw.uncertainty_reasons);
  const inferredFields = stringArray(raw.inferred_fields);
  const grounding = evaluateCandidateGrounding({
    name,
    producer: raw.producer,
    vintage: raw.vintage,
    visibleText,
    evidence,
  });
  const { identityMatches, groundedEvidence } = grounding;
  if (grounding.visibleTokenCount < 2 || identityMatches.length === 0) return null;

  const identitySignals = [raw.producer, raw.vintage, raw.region, raw.country]
    .filter((signal) => typeof signal === 'number' || (typeof signal === 'string' && signal.trim())).length;
  let confidence = clamp(Number(raw.confidence) || 0.35, 0, 1);
  if (groundedEvidence.length === 0) confidence = Math.min(confidence, 0.4);
  else if (groundedEvidence.length < 2) confidence = Math.min(confidence, 0.62);
  if (identityMatches.length < 2) confidence = Math.min(confidence, 0.62);
  if (identitySignals === 0) confidence = Math.min(confidence, 0.62);
  if (uncertaintyReasons.length > 0) confidence = Math.min(confidence, 0.78);
  if (inferredFields.some((field) => ['name', 'nombre', 'producer', 'productor'].includes(field.toLowerCase()))) {
    confidence = Math.min(confidence, 0.55);
  }

  return {
    name,
    producer: typeof raw.producer === 'string' && raw.producer.trim() ? raw.producer.trim() : null,
    vintage: Number.isFinite(vintage) ? vintage : null,
    region: typeof raw.region === 'string' && raw.region.trim() ? raw.region.trim() : null,
    country: typeof raw.country === 'string' && raw.country.trim() ? raw.country.trim() : null,
    grapes: stringArray(raw.grapes),
    alcohol: Number.isFinite(alcohol) ? alcohol : null,
    confidence: Math.round(confidence * 100) / 100,
    source: 'label',
    evidence: groundedEvidence,
    uncertainty_reasons: uncertaintyReasons,
    inferred_fields: inferredFields,
    sensory_attributes: sensory ? {
      potencia: normalizeSensory('potencia'),
      acidez: normalizeSensory('acidez'),
      dulzura: normalizeSensory('dulzura'),
      taninos: normalizeSensory('taninos'),
      afrutado: normalizeSensory('afrutado'),
      madera: normalizeSensory('madera'),
      intensidad: normalizeSensory('intensidad'),
    } : null,
  };
};

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await request.json();
    const image = typeof body?.image === 'string' ? body.image : '';
    if (!image.startsWith('data:image/')) throw new Error('Falta el recorte de etiqueta');
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY no configurada');

    const prompt = `Analiza UN SOLO recorte de botella o etiqueta de vino. El recorte procede de un detector previo y puede estar parcialmente oculto, desenfocado o contener reflejos.

Objetivo: proponer hasta 3 identidades candidatas sin inventar. Transcribe primero las senales visibles y separa lo leido de lo inferido.

Reglas:
- Si no hay texto suficiente para identificar el vino, devuelve candidates vacio. El color, la capsula o el diseno por si solos nunca bastan.
- No afirmes haber consultado Internet ni fuentes externas.
- confidence es la confianza en la identidad completa, no solo en una palabra visible.
- Un candidato por encima de 0.72 requiere nombre claramente visible y al menos otra senal coherente (productor, anada, region o diseno distintivo).
- Los candidatos alternativos deben explicar la ambiguedad.
- evidence debe copiar fragmentos que tambien aparezcan literalmente en visible_text. Exige al menos dos fragmentos visuales independientes para cualquier confidence >= 0.72. No cuentes conocimiento general como evidencia visual.
- El nombre o productor propuesto debe compartir palabras distintivas con visible_text. Si no las comparte, omite el candidato.
- sensory_attributes es una inferencia 1-5. Usa null cuando la identidad o el estilo no permitan estimarlo.
- inferred_fields enumera cualquier campo no leido literalmente en la imagen.

Responde SOLO JSON:
{
  "visible_text": ["fragmentos realmente legibles"],
  "candidates": [
    {
      "name": "Nombre",
      "producer": "Bodega o null",
      "vintage": 2021,
      "region": "Region o null",
      "country": "Pais o null",
      "grapes": [],
      "alcohol": null,
      "confidence": 0.78,
      "evidence": ["texto visible que apoya el candidato"],
      "uncertainty_reasons": ["reflejo en la primera palabra"],
      "inferred_fields": ["country"],
      "sensory_attributes": {
        "potencia": 3,
        "acidez": 4,
        "dulzura": 1,
        "taninos": 2,
        "afrutado": 4,
        "madera": null,
        "intensidad": 3
      }
    }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } },
          ],
        }],
        max_tokens: 3072,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Region analysis API error:', response.status, detail);
      if (response.status === 429) throw new Error('Demasiadas solicitudes. Espera un momento.');
      throw new Error('No se pudo analizar esta region');
    }

    const data = await response.json();
    const parsed = parseJsonObject(data.choices?.[0]?.message?.content || '{}');
    const visibleText = stringArray(parsed.visible_text);
    const rawCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    const candidates = rawCandidates
      .map((candidate) => normalizeCandidate(candidate, visibleText))
      .filter(Boolean)
      .sort((left, right) => (right?.confidence ?? 0) - (left?.confidence ?? 0))
      .slice(0, 3);
    const recognitionStatus = candidates.length === 0
      ? 'unreadable'
      : (candidates[0]?.confidence ?? 0) >= 0.72 && (candidates[0]?.uncertainty_reasons.length ?? 0) === 0
        ? 'identified'
        : 'uncertain';
    const fallback = candidates.length > 0 ? null : {
      code: visibleText.length === 0 || normalizeGroundingTokens(visibleText).length < 2
        ? 'insufficient_visible_text'
        : 'ungrounded_identity',
      message: visibleText.length === 0 || normalizeGroundingTokens(visibleText).length < 2
        ? 'No hay texto legible suficiente para identificar este vino.'
        : 'El texto visible no respalda con seguridad ninguna identidad.',
      suggested_actions: [
        'Acerca la camara a una sola etiqueta.',
        'Evita reflejos y enfoca el nombre o la bodega.',
        'Introduce la identidad manualmente si la conoces.',
      ],
    };

    return new Response(JSON.stringify({
      visible_text: visibleText,
      candidates,
      recognition_status: recognitionStatus,
      fallback,
      analysis_version: ANALYSIS_VERSION,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('analyze-wine-region failed:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Error desconocido',
      candidates: [],
      analysis_version: ANALYSIS_VERSION,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
