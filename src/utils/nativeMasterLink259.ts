import type { WineCandidate } from './multiWineScan';
import type { MatchrimProfileLike } from './matchrimPassport';
import { lookupMasterReference195, type MasterInvoke195, type MasterReferenceOutcome195 } from './nativeMasterReference195';
import { masterVintageEvidence188, type MasterDetail188 } from './nativeMasterContract188';
import { calculateLocalMatchrimAffinity } from './wineAffinityExplanation';

export type NativeMasterLink259 = Readonly<{
  candidateId: string; name: string; producer: string | null; vintage: number | null;
  region: string | null; country: string | null;
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
    && link.region === candidate.region && link.country === candidate.country
    && candidate.canonicalId === `mantalak-master:${link.wine.mantalakWineId}` ? link : null;
};

// Winerim's own 0-5 taste values (285, owner decision): the row for the bottle's
// harvest, or the general row of a reference that does not depend on vintage.
// A row of another harvest is never borrowed.
export const masterSensory259 = (link: Pick<NativeMasterLink259, 'vintage' | 'wine'>) => {
  const evidence = masterVintageEvidence188(link.wine, link.vintage == null ? null : String(link.vintage));
  const row = evidence.sensory;
  if (evidence.scope === 'missing' || !row) return null;
  return { scope: evidence.scope, vintage: row.vintage, attributes: { scale: 'winerim-0-5' as const,
    potencia: row.power, acidez: row.acidity, dulzura: row.sweetness, taninos: row.tannin, afrutado: row.fruity } };
};
const sensoryNote259 = (sensory: NonNullable<ReturnType<typeof masterSensory259>>) => sensory.scope === 'exact'
  ? `Datos de sabor de Winerim para la añada ${sensory.vintage}` : 'Datos de sabor generales de Winerim para esta referencia';

export const resolveMasterCandidate259 = async (candidate: WineCandidate, invoke: MasterInvoke195,
  signal?: AbortSignal, timeoutMs = 8000, profile: MatchrimProfileLike | null = null): Promise<{
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
    vintage: candidate.vintage, region: candidate.region, country: candidate.country, wine: structuredClone(result.wine) });
  issued.add(link);
  const sensory = masterSensory259(link);
  const affinity = sensory ? calculateLocalMatchrimAffinity(profile, sensory.attributes) : null;
  return { status: 'reference-ready', candidate: { ...candidate,
    canonicalId: `mantalak-master:${result.wine.mantalakWineId}`, masterLink259: link,
    masterRecord: null, globalRecord: null, originalSheet: null, sensoryAttributes: sensory?.attributes ?? null,
    sensorySource: 'catalog', affinity, affinityConfidence: null,
    affinityReason: !sensory ? 'Referencia encontrada en Winerim; su ficha no tiene datos de sabor para esta añada.'
      : affinity === null ? `${sensoryNote259(sensory)}. Completa tu perfil para calcular tu afinidad.`
        : `Afinidad orientativa con tu perfil. ${sensoryNote259(sensory)} (escala 0–5).` } };
};
export const masterSensorySummary259 = (link: NativeMasterLink259) => {
  const sensory = masterSensory259(link);
  return sensory ? { title: 'Vino encontrado en Winerim', description: `${sensoryNote259(sensory)}: cuerpo, acidez, dulzor, tanino y fruta en una escala de 0 a 5.` } : null;
};

const years259 = (values: readonly string[]) => {
  const sorted = [...new Set(values)].sort(), shown = sorted.slice(0, 3), rest = sorted.length - shown.length;
  return rest > 0 ? `${shown.join(', ')} y ${rest} más`
    : shown.length > 1 ? `${shown.slice(0, -1).join(', ')} y ${shown[shown.length - 1]}` : shown[0] ?? '';
};
const vintages259 = (values: readonly string[]) => `${values.length > 1 ? 'las añadas' : 'la añada'} ${years259(values)}`;

export const masterAffinityGap259 = (link: NativeMasterLink259) => {
  const requested = link.vintage == null ? null : String(link.vintage);
  const evidence = masterVintageEvidence188(link.wine, requested);
  // Year-specific rows are not "no data", but none applies to this bottle's
  // stated or missing cosecha and they are never borrowed for another one.
  const rowYears = link.wine.tastingAttributes.attributesByVintage.flatMap(row => row.vintage === null ? [] : [row.vintage]);
  const otherYears = evidence.scope === 'missing' && rowYears.length > 0;
  return { reason: 'sensory' as const, title: 'Vino encontrado; faltan datos para compararlo contigo',
    summary: otherYears ? `Datos de sabor solo de ${years259(rowYears)}` : 'Ficha sin datos de sabor',
    description: otherYears
      ? `Winerim tiene valores de sabor de esta referencia solo para ${vintages259(rowYears)}. No los aplicamos a otra cosecha ni a una sin indicar.`
      : 'Winerim tiene esta referencia, pero su ficha no incluye los datos de cuerpo, acidez, dulzor, tanino y fruta necesarios para calcular tu afinidad.',
    nextStep: evidence.status === 'known'
      ? 'La añada figura en el catálogo, pero su ficha sensorial está incompleta; confirmar el nombre no resuelve ese dato.'
      : evidence.status === 'other-vintages-only'
        ? `Esta ficha solo recoge ${vintages259(link.wine.vintages)} y tu botella figura como de ${requested}. Si la añada no es correcta, corrígela en «Ficha e identificación» y vuelve a buscar; no usaremos datos de otra cosecha como si fueran de ${requested}.`
        : evidence.status === 'unrecorded'
          ? `La ficha no indica añadas, así que no confirma tu cosecha de ${requested}. Puedes conservar la referencia; tu afinidad quedará pendiente hasta que la ficha tenga datos de sabor.`
          : link.wine.vintages.length
            ? `Indica la añada de tu botella en «Ficha e identificación» y vuelve a buscar: esta ficha recoge ${vintages259(link.wine.vintages)}. No usaremos datos de una cosecha como si fueran de otra.`
            : 'Puedes conservar la referencia. Tu afinidad quedará pendiente hasta que Winerim complete su ficha de sabor.' };
};
