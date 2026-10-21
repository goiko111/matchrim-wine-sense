import { z } from 'zod';
import type { WineCandidate } from './multiWineScan';
import type { LocalOCRResult106 } from './nativeOCR106';
import { wineYearRoles105 } from './wineYearRole105';

export const isPendingLocalIdentity109 = (candidate: Pick<WineCandidate, 'name'> | null | undefined) => {
  const name = (candidate?.name || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  return !name || name === 'etiqueta por identificar';
};

const box109 = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
  width: z.number().finite().positive().max(1),
  height: z.number().finite().positive().max(1),
}).refine(box => box.x + box.width <= 1.001 && box.y + box.height <= 1.001);

// Validate raw lengths without the transport's trim transform: evidence is verbatim.
const reading109 = z.object({
  source: z.literal('apple-vision-device'),
  requestId: z.string().uuid(),
  width: z.number().int().positive().max(2400),
  height: z.number().int().positive().max(2400),
  totalMs: z.number().finite().nonnegative(),
  revision: z.number().int().positive(),
  customWords: z.array(z.string()).length(0),
  lines: z.array(z.object({
    text: z.string().min(1).max(1000),
    confidence: z.number().finite().min(0).max(1),
    box: box109,
  })).max(100),
});

// Only for explicit user-selected single-label local mode, never an automatic fallback.
export const localSingleCandidate109 = (reading: LocalOCRResult106, id: string): WineCandidate | null => {
  if (typeof id !== 'string' || !id.trim() || !Array.isArray(reading?.lines)
    || reading.lines.length > 100 || !Array.isArray(reading.customWords) || reading.customWords.length !== 0) return null;
  const parsed = reading109.safeParse(reading);
  if (!parsed.success || !parsed.data.lines.some(line => /[\p{L}\p{N}]/u.test(line.text))) return null;

  const { lines } = parsed.data as LocalOCRResult106;
  const years = wineYearRoles105(lines);
  const eligible = years.roles.filter(value => value.role === 'vintage' || value.role === 'unclassified');
  // The role parser examines at most eight year occurrences per line. Do not
  // promote a year if that cap might have hidden another date or conflicting role.
  const completeYears = lines.every(line => (line.text.match(/\b(?:19|20)\d{2}\b/g)?.length ?? 0) <= 8);
  const vintage = years.supported && completeYears && eligible.length === 1 ? eligible[0].year : null;

  return {
    id,
    name: 'Etiqueta por identificar',
    producer: null,
    vintage,
    region: null,
    country: null,
    grapes: [],
    alcohol: null,
    confidence: 0,
    source: 'label',
    evidence: lines.map(line => line.text),
    inferredFields: vintage === null ? ['name', 'producer', 'vintage'] : ['name', 'producer'],
    uncertaintyReasons: [
      'Texto leido en el dispositivo. El nombre y la bodega siguen sin identificar; revisa la etiqueta antes de confirmarlos.',
      vintage === null
        ? 'No hay una unica cosecha respaldada por la lectura; las fechas de premios o fundacion no se usan como cosecha.'
        : `La fecha ${vintage} es solo una pista leida en la etiqueta; confirma que corresponde a la cosecha.`,
    ],
    canonicalId: null,
    masterRecord: null,
    globalRecord: null,
    originalSheet: null,
    sensorySource: null,
    sensoryAttributes: null,
    affinity: null,
    affinityConfidence: null,
    affinityReason: null,
  };
};
