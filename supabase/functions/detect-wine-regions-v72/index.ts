import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { runMatchrimAi } from '../_shared/matchrim72/matchrim-ai-provider.ts';
import { optionalScanNumber } from '../_shared/matchrim72/matchrim-scan-values.ts';
import { parseStructuredObject, structuredResponseError, STRUCTURED_RESPONSE_ERROR_STATUS } from '../_shared/structured-response.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const DETECTOR_VERSION = 'matchrim-region-detector-2026-10-18-safety-v5-alias72';

const normalizeLevel = (value: unknown, allowed: string[], fallback: string) => {
  const normalized = typeof value === 'string' ? value.toLowerCase().trim() : '';
  return allowed.includes(normalized) ? normalized : fallback;
};

const normalizeRegion = (value: unknown, index: number) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const boxRaw = raw.box && typeof raw.box === 'object' ? raw.box as Record<string, unknown> : raw;
  const x = optionalScanNumber(boxRaw.x);
  const y = optionalScanNumber(boxRaw.y);
  const width = optionalScanNumber(boxRaw.width);
  const height = optionalScanNumber(boxRaw.height);
  if (x === null || y === null || width === null || height === null || width < 2 || height < 2) return null;
  const quality = raw.quality && typeof raw.quality === 'object'
    ? raw.quality as Record<string, unknown>
    : {};
  const normalizedX = clamp(x, 0, 100);
  const normalizedY = clamp(y, 0, 100);
  const clippedWidth = Math.min(100, x + width) - normalizedX;
  const clippedHeight = Math.min(100, y + height) - normalizedY;
  if (clippedWidth < 2 || clippedHeight < 2) return null;

  return {
    id: `region-${index + 1}`,
    object_type: raw.object_type === 'label' ? 'label' : 'bottle',
    box: {
      x: normalizedX,
      y: normalizedY,
      width: clippedWidth,
      height: clippedHeight,
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
    const body = await request.json().catch(() => null);
    const image = typeof body?.image === 'string' ? body.image : '';
    if (!image.startsWith('data:image/')) return new Response(JSON.stringify({ error: 'Falta una imagen valida', regions: [] }), {
      status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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

    const ai = await runMatchrimAi({ prompt, image, maxTokens: 4096 });
    const decoded = parseStructuredObject(ai.text);
    if (ai.complete === false || !decoded.ok || !Array.isArray(decoded.value.regions)) {
      const error = ai.complete === false ? structuredResponseError('incomplete_response')
        : decoded.ok ? structuredResponseError('invalid_schema') : decoded.error;
      return new Response(JSON.stringify({ ...error, regions: [], detector_version: DETECTOR_VERSION }), {
        status: STRUCTURED_RESPONSE_ERROR_STATUS,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'sb-error-code': error.error },
      });
    }
    const parsed = decoded.value;
    const rawRegions = parsed.regions as unknown[];
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
      ai_provider: ai.provider,
      ai_model: ai.model,
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
