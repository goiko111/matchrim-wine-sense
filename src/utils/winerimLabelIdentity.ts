import { hasSpecificWineIdentity } from '../../supabase/functions/_shared/matchrim-menu-grounding';

type LabelIdentity = {
  name?: string | null;
  producer?: string | null;
  vintage?: string | number | null;
};

const normalize = (value: string | null | undefined) => (value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim();
const words = (value: string | null | undefined) => normalize(value).split(' ').filter(Boolean);
const producerWords = (value: string | null | undefined) => words(value)
  .filter(word => !['bodega', 'bodegas', 'winery', 'sl', 'sa', 's', 'a'].includes(word));

// The catalog searches name and producer columns separately; producer evidence
// is checked on returned candidates, not appended to the name substring.
export const canonicalLabelSearchQuery = (input: LabelIdentity): string =>
  (input.name || '').trim().slice(0, 120);

export const isSafeCanonicalLabelMatch = (input: LabelIdentity, candidate: LabelIdentity): boolean => {
  const inputName = words(input.name);
  const candidateName = words(candidate.name);
  if (!inputName.length || !candidateName.length) return false;
  const inputProducer = producerWords(input.producer);
  const candidateProducer = producerWords(candidate.producer);
  if (!hasSpecificWineIdentity(input.name || '', input.producer || '')) return false;
  if (inputProducer.length && (!candidateProducer.length || !inputProducer.every(word => candidateProducer.includes(word)))) return false;
  const inputIdentity = new Set([...inputName, ...inputProducer]);
  const candidateIdentity = new Set([...candidateName, ...candidateProducer]);
  // Neither a shared brand nor a matching region can erase a visible cuvee qualifier.
  if (!inputName.every(word => candidateIdentity.has(word)) || !candidateName.every(word => inputIdentity.has(word))) return false;
  if (input.vintage && candidate.vintage && String(input.vintage) !== String(candidate.vintage)) return false;
  return true;
};
