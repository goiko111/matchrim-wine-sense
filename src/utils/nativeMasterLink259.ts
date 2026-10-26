import type { WineCandidate } from './multiWineScan';
import { lookupMasterReference195, type MasterInvoke195, type MasterReferenceOutcome195 } from './nativeMasterReference195';
import { masterVintageEvidence188, type MasterDetail188 } from './nativeMasterContract188';

export type NativeMasterLink259 = Readonly<{
  candidateId: string; name: string; producer: string | null; vintage: number | null;
  wine: MasterDetail188;
}>;
const issued = new WeakSet<object>();
const freeze = <T,>(value: T): T => {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
};
export const nativeMasterLink259 = (candidate: WineCandidate | null): NativeMasterLink259 | null => {
  const link = candidate?.masterLink259;
  return candidate && link && issued.has(link) && link.candidateId === candidate.id
    && link.name === candidate.name && link.producer === candidate.producer && link.vintage === candidate.vintage
    && candidate.canonicalId === `mantalak-master:${link.wine.mantalakWineId}` ? link : null;
};

export const resolveMasterCandidate259 = async (candidate: WineCandidate, invoke: MasterInvoke195,
  signal?: AbortSignal, timeoutMs = 8000): Promise<{
    status: 'reference-ready'; candidate: WineCandidate;
  } | Exclude<MasterReferenceOutcome195, { status: 'reference-match' }>> => {
  const result = await lookupMasterReference195(candidate, invoke, signal, timeoutMs, {
    includeUnlisted: true, limit: 10, ...(candidate.source === 'manual' ? { humanIdentity: true } : {}),
  });
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (result.status !== 'reference-match') return result;
  // Only a successful bounded resolver can issue this link. JSON/storage copies
  // are not trusted; correcting/reanalysing an identity requires a new lookup.
  const link = freeze({ candidateId: candidate.id, name: candidate.name, producer: candidate.producer,
    vintage: candidate.vintage, wine: structuredClone(result.wine) });
  issued.add(link);
  return { status: 'reference-ready', candidate: { ...candidate,
    canonicalId: `mantalak-master:${result.wine.mantalakWineId}`, masterLink259: link,
    masterRecord: null, globalRecord: null, originalSheet: null, sensoryAttributes: null,
    sensorySource: 'catalog', affinity: null, affinityConfidence: null,
    affinityReason: 'Referencia encontrada en Winerim; faltan datos sensoriales utilizables para calcular tu afinidad.' } };
};

export const masterAffinityGap259 = (link: NativeMasterLink259) => {
  const evidence = masterVintageEvidence188(link.wine, link.vintage == null ? null : String(link.vintage));
  const missing = evidence.scope === 'missing';
  const year = link.vintage == null ? 'La cosecha de tu botella' : `Tu cosecha de ${link.vintage}`;
  return { reason: 'sensory' as const, title: 'Vino encontrado; faltan datos para compararlo contigo',
    summary: missing ? 'Ficha sin datos de sabor' : 'Datos de sabor sin respaldo suficiente',
    description: missing
      ? 'Winerim tiene esta referencia, pero su ficha no incluye los datos de cuerpo, acidez, dulzor, tanino y fruta necesarios para calcular tu afinidad.'
      : 'Winerim tiene esta referencia y algunos valores de sabor, pero no permite distinguir cuáles tienen una fuente y cuáles son valores de relleno. No los usamos para puntuar ni aprender tus gustos.',
    nextStep: evidence.status === 'known'
      ? 'La añada figura en el catálogo. Falta completar y respaldar su ficha sensorial; confirmar el nombre no resuelve ese dato.'
      : `${year} tampoco está verificada en esta ficha. Puedes conservar la referencia; no tomaremos datos de otra añada como si fueran los tuyos.` };
};
