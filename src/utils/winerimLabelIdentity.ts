import { hasSpecificWineIdentity } from '../../supabase/functions/_shared/matchrim-menu-grounding';
import { isNonWineIdentity } from './wineCategory';

type LabelIdentity = {
  id?: string | number;
  name?: string | null;
  producer?: string | null;
  vintage?: string | number | null;
  region?: string | null;
  country?: string | null;
  tastingAttributes?: unknown;
  tasting_attributes?: unknown;
};

const normalize = (value: string | null | undefined) => (value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim();
const words = (value: string | null | undefined) => normalize(value).split(' ').filter(Boolean);
const nameWords = (identity: LabelIdentity) => {
  const value = words(identity.name);
  if (identity.vintage && value.at(-1) === String(identity.vintage)) value.pop();
  return value;
};
export const canonicalProducerKey = (value?: string | null) => normalize(value)
  .replace(/^(bodega|bodegas|winery) /, '')
  .replace(/ (s a|s l|sa|sl|ltd|limited)$/, '');
const producerWords = (value: string | null | undefined) => canonicalProducerKey(value).split(' ').filter(Boolean);

// A repeated location is not independent winery evidence. Keep explicit names
// such as "Bodegas Rioja" distinct from the bare geographical value "Rioja".
export const hasLabelProducerRoleConflict = (identity: LabelIdentity, other?: LabelIdentity): boolean => {
  const producer = normalize(identity.producer);
  if (!producer) return false;
  const locations = [identity.region, identity.country, other?.region, other?.country]
    .flatMap(value => typeof value === 'string' ? [value, ...value.split(/[/|;,]/)] : [])
    .map(normalize).filter(Boolean);
  return locations.includes(producer)
    || [identity, other].some(value => value?.region && value.country
      && producer === normalize(`${value.region} ${value.country}`));
};

// The catalog searches name and producer columns separately; producer evidence
// is checked on returned candidates, not appended to the name substring.
export const canonicalLabelSearchQuery = (input: LabelIdentity): string =>
  (input.name || '').trim().slice(0, 120);

export const isSafeCanonicalLabelMatch = (input: LabelIdentity, candidate: LabelIdentity): boolean => {
  if (isNonWineIdentity(input.name, candidate.name)) return false;
  if (hasLabelProducerRoleConflict(input, candidate) || hasLabelProducerRoleConflict(candidate, input)) return false;
  const inputName = nameWords(input);
  const candidateName = nameWords(candidate);
  if (!inputName.length || !candidateName.length) return false;
  const inputProducer = producerWords(input.producer);
  const candidateProducer = producerWords(candidate.producer);
  if (!hasSpecificWineIdentity(input.name || '', input.producer || '')) return false;
  if (inputProducer.length && inputProducer.join(' ') !== candidateProducer.join(' ')) return false;
  const inputIdentity = new Set([...inputName, ...inputProducer]);
  const candidateIdentity = new Set([...candidateName, ...candidateProducer]);
  // Neither a shared brand nor a matching region can erase a visible cuvee qualifier.
  if (!inputName.every(word => candidateIdentity.has(word)) || !candidateName.every(word => inputIdentity.has(word))) return false;
  if (input.vintage && candidate.vintage && String(input.vintage) !== String(candidate.vintage)) return false;
  return true;
};

export const hasAmbiguousCanonicalMatches = (input: LabelIdentity, candidates: LabelIdentity[]): boolean => {
  const stable = (value: unknown): unknown => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)])) : value;
  const identities = new Set(candidates.filter((candidate) => isSafeCanonicalLabelMatch(input, candidate))
    .map((candidate) => JSON.stringify([
      [...new Set([...nameWords(candidate), ...producerWords(candidate.producer)])].sort().join(' '),
      producerWords(candidate.producer).join(' '), String(candidate.vintage ?? ''), candidate.id == null ? null : String(candidate.id),
      normalize(candidate.region), normalize(candidate.country),
      stable(candidate.tastingAttributes ?? candidate.tasting_attributes ?? null),
    ])));
  return identities.size > 1;
};
