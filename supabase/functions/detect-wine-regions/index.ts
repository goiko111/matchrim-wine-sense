import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const DETECTOR_VERSION = 'matchrim-region-detector-v4-candidate';

const parseJsonObject = (raw: string) => {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('El detector no devolvio JSON valido');
  return JSON.parse(cleaned.slice(first, last + 1)) as Record<string, unknown>;
};

const normalizeLevel = (value: unknown, allowed: string[], fallback: string) => {
  const normalized = typeof value === 'string' ? value.toLowerCase().trim() : '';
  return allowed.includes(normalized) ? normalized : fallback;
};

const normalizeRegion = (value: unknown, index: number) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const boxRaw = raw.box && typeof raw.box === 'object' ? raw.box as Record<string, unknown> : raw;
  const x = Number(boxRaw.x);
  const y = Number(boxRaw.y);
  const width = Number(boxRaw.width);
  const height = Number(boxRaw.height);
  if (![x, y, width, height].every(Number.isFinite) || width < 2 || height < 2) return null;
  const quality = raw.quality && typeof raw.quality === 'object'
    ? raw.quality as Record<string, unknown>
    : {};
  const normalizedX = clamp(x, 0, 98);
  const normalizedY = clamp(y, 0, 98);

  return {
    id: `region-${index + 1}`,
    object_type: raw.object_type === 'label' ? 'label' : 'bottle',
    box: {
      x: normalizedX,
      y: normalizedY,
      width: clamp(width, 2, 100 - normalizedX),
      height: clamp(height, 2, 100 - normalizedY),
    },
    confidence: clamp(Number(raw.confidence) || 0.5, 0, 1),
    quality: {
      glare: normalizeLevel(quality.glare, ['low', 'medium', 'high'], 'medium'),
      occlusion: normalizeLevel(quality.occlusion, ['low', 'medium', 'high'], 'medium'),
      legibility: normalizeLevel(quality.legibility, ['good', 'limited', 'poor'], 'limited'),
    },
  };
};

type NormalizedRegion = NonNullable<ReturnType<typeof normalizeRegion>>;

const intersectionOverUnion = (left: NormalizedRegion, right: NormalizedRegion) => {
  const leftRight = left.box.x + left.box.width;
  const leftBottom = left.box.y + left.box.height;
  const rightRight = right.box.x + right.box.width;
  const rightBottom = right.box.y + right.box.height;
  const overlapWidth = Math.max(0, Math.min(leftRight, rightRight) - Math.max(left.box.x, right.box.x));
  const overlapHeight = Math.max(0, Math.min(leftBottom, rightBottom) - Math.max(left.box.y, right.box.y));
  const intersection = overlapWidth * overlapHeight;
  if (!intersection) return 0;
  const union = left.box.width * left.box.height + right.box.width * right.box.height - intersection;
  return union > 0 ? intersection / union : 0;
};

const deduplicateRegions = (regions: NormalizedRegion[]) => {
  const kept: NormalizedRegion[] = [];
  [...regions]
    .sort((left, right) => right.confidence - left.confidence)
    .forEach((region) => {
      if (!kept.some((candidate) => intersectionOverUnion(region, candidate) >= 0.72)) {
        kept.push(region);
      }
    });
  return kept
    .sort((left, right) => left.box.y - right.box.y || left.box.x - right.box.x)
    .map((region, index) => ({ ...region, id: `region-${index + 1}` }));
};

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await request.json();
    const image = typeof body?.image === 'string' ? body.image : '';
    if (!image.startsWith('data:image/')) throw new Error('Falta una imagen valida');

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY no configurada');

    const prompt = `Actua solo como detector visual. No identifiques marcas ni nombres de vino.

Localiza TODAS las botellas o etiquetas de vino que podrian analizarse de forma independiente en esta foto. La foto puede contener una sola etiqueta, varias botellas alineadas, un expositor con oclusiones o reflejos, o elementos que no son vino.

Reglas:
- Devuelve entre 1 y 30 regiones reales. Haz una segunda pasada visual de izquierda a derecha y de arriba abajo antes de responder. No uses una caja unica para toda la foto si hay varias botellas.
- Cada botella fisica visible debe tener su propia caja, incluso cuando varias sean la misma referencia.
- Si la imagen es un primer plano de UNA etiqueta o botella, devuelve una sola caja que abarque sus paneles visibles. No dividas la etiqueta principal, la contraetiqueta, el cuello o un sello de la misma botella en regiones separadas.
- La caja debe cubrir la etiqueta y suficiente cuerpo/cuello para distinguir la botella, sin incluir botellas vecinas si es evitable.
- Incluye botellas parcialmente ocultas cuando haya evidencia suficiente.
- No inventes regiones para huecos, reflejos, copas, latas, estantes o texto de una carta.
- Las coordenadas son porcentajes 0-100 respecto a la imagen completa, con origen arriba a la izquierda.
- confidence expresa confianza de deteccion, no confianza en la identidad.
- Si hay mas de 30 objetos, selecciona las 30 etiquetas o botellas con mayor legibilidad y marca coverage.status como partial. estimated_visible_objects debe estimar todos los objetos, no solo los devueltos.
- reported_complete solo es valido si la segunda pasada no encuentra ninguna botella adicional fuera de regions.

Responde SOLO JSON:
{
  "image_kind": "single_label|multi_bottle|wine_menu|board|unknown",
  "regions": [
    {
      "object_type": "bottle|label",
      "box": { "x": 10, "y": 12, "width": 18, "height": 72 },
      "confidence": 0.91,
      "quality": { "glare": "low|medium|high", "occlusion": "low|medium|high", "legibility": "good|limited|poor" }
    }
  ],
  "coverage": {
    "status": "reported_complete|partial|unknown",
    "estimated_visible_objects": 12,
    "confidence": 0.72,
    "notes": ["motivo concreto de cobertura parcial o incierta"]
  },
  "notes": ["motivo breve si faltan objetos o la imagen es dudosa"]
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
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Region detection API error:', response.status, detail);
      if (response.status === 429) throw new Error('Demasiadas solicitudes. Espera un momento.');
      throw new Error('No se pudieron localizar las botellas');
    }

    const data = await response.json();
    const parsed = parseJsonObject(data.choices?.[0]?.message?.content || '{}');
    const rawRegions = Array.isArray(parsed.regions) ? parsed.regions : [];
    const normalizedRegions = rawRegions.map(normalizeRegion).filter((region): region is NormalizedRegion => Boolean(region));
    const regions = deduplicateRegions(normalizedRegions).slice(0, 30);
    const rawCoverage = parsed.coverage && typeof parsed.coverage === 'object' && !Array.isArray(parsed.coverage)
      ? parsed.coverage as Record<string, unknown>
      : {};
    let coverageStatus = rawCoverage.status === 'reported_complete' || rawCoverage.status === 'partial'
      ? rawCoverage.status
      : 'unknown';
    const estimatedVisibleObjects = Number(rawCoverage.estimated_visible_objects);
    const coverageConfidence = Number(rawCoverage.confidence);
    if (Number.isFinite(estimatedVisibleObjects) && estimatedVisibleObjects > regions.length) {
      coverageStatus = 'partial';
    }

    return new Response(JSON.stringify({
      image_kind: typeof parsed.image_kind === 'string' ? parsed.image_kind : 'unknown',
      regions,
      coverage: {
        status: coverageStatus,
        detected_objects: regions.length,
        estimated_visible_objects: Number.isFinite(estimatedVisibleObjects) && estimatedVisibleObjects >= regions.length
          ? Math.round(estimatedVisibleObjects)
          : null,
        confidence: Number.isFinite(coverageConfidence) ? clamp(coverageConfidence, 0, 1) : null,
        notes: Array.isArray(rawCoverage.notes)
          ? rawCoverage.notes.filter((note) => typeof note === 'string').slice(0, 5)
          : [],
      },
      notes: Array.isArray(parsed.notes) ? parsed.notes.filter((note) => typeof note === 'string').slice(0, 5) : [],
      detector_version: DETECTOR_VERSION,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('detect-wine-regions failed:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Error desconocido',
      regions: [],
      coverage: {
        status: 'unknown',
        detected_objects: 0,
        estimated_visible_objects: null,
        confidence: null,
        notes: ['La deteccion no termino.'],
      },
      detector_version: DETECTOR_VERSION,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
