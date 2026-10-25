import { z } from 'zod';
import { canonicalProducerKey } from './winerimLabelIdentity';
import { appendMasterPage188, parseMasterPage188, startMasterPages188 } from './nativeMasterContract188';

const text = z.string().trim().min(1).max(240).refine(value => !Array.from(value).some(char => {
  const code = char.charCodeAt(0);
  return code < 32 || (code >= 127 && code <= 159)
    || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
}));
const observation = z.object({
  field: z.enum(['name', 'producer', 'region', 'grape', 'vintage']),
  value: text,
  origin: z.enum(['ocr', 'user-confirmed']),
  evidenceText: text.optional(),
});
const observations = z.array(observation).min(1).max(12);
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const containsPhrase = (value: string, phrase: string) => ` ${normalize(value)} `.includes(` ${normalize(phrase)} `);
type State213 = 'invalid-input' | 'incomplete-pages' | 'no-candidates' | 'too-many-candidates' | 'review-candidates';
type Candidate213 = { mantalakWineId: number; name: string; winery: string;
  photoUrl: string | null; requestedVintage: string | null; vintageStatus: 'known' | 'unrecorded' | 'unspecified' };
export type VisualCandidatePool213 = {
  status: State213; retrieved: number; total: number | null; matched: number;
  candidates: Candidate213[]; previewTruncated: boolean;
  searchPagesComplete: boolean; scope: 'provided-search-pages-only';
  catalogueAbsenceConfirmed: false; imageIdentityConfirmed: false;
  visualComparisonReady: false; affinityAttributes: null; learningEligible: false;
};
const result = (status: State213, values: Partial<VisualCandidatePool213> = {}): VisualCandidatePool213 => ({
  status, retrieved: 0, total: null, matched: 0, candidates: [], previewTruncated: false,
  searchPagesComplete: false, scope: 'provided-search-pages-only', ...values,
  catalogueAbsenceConfirmed: false, imageIdentityConfirmed: false, visualComparisonReady: false,
  affinityAttributes: null, learningEligible: false,
});

// Local, inactive preparation only. A catalogue photo URL is not a versioned
// label/vintage asset; this selector cannot authorize visual matching or affinity.
export const prepareVisualCandidatePool213 = (
  suppliedPages: readonly unknown[], suppliedObservations: unknown, previewLimit = 15,
): VisualCandidatePool213 => {
  const parsed = observations.safeParse(suppliedObservations);
  if (!parsed.success || !Number.isInteger(previewLimit) || previewLimit < 1 || previewLimit > 15
    || !Array.isArray(suppliedPages) || !suppliedPages.length || suppliedPages.length > 200) return result('invalid-input');
  const evidence = parsed.data;
  if (evidence.some(item => !normalize(item.value) || (item.origin === 'ocr'
    && (!item.evidenceText || !containsPhrase(item.evidenceText, item.value)))
    || (item.field === 'vintage' && !/^(19|20)\d{2}$/.test(item.value)))) return result('invalid-input');
  for (const field of ['producer', 'region', 'vintage'] as const) {
    const values = evidence.filter(item => item.field === field).map(item => field === 'producer'
      ? canonicalProducerKey(item.value) : normalize(item.value));
    if (values.some(value => !value) || new Set(values).size > 1) return result('invalid-input');
  }
  const firstRaw = suppliedPages[0];
  const limit = typeof firstRaw === 'object' && firstRaw !== null && 'limit' in firstRaw ? firstRaw.limit : null;
  if (typeof limit !== 'number') return result('invalid-input');
  const first = parseMasterPage188(firstRaw, 1, limit);
  let pages = first && startMasterPages188(first);
  if (!pages) return result('invalid-input');
  for (let index = 1; index < suppliedPages.length; index++) {
    const next = parseMasterPage188(suppliedPages[index], index + 1, limit);
    if (!next || pages.lastPage >= pages.pageCount) return result('invalid-input');
    pages = appendMasterPage188(pages, next);
    if (!pages) return result('invalid-input');
  }
  const count = { retrieved: pages.rows.length, total: pages.total };
  if (pages.rows.length !== pages.total) return result('incomplete-pages', count);
  const vintage = evidence.find(item => item.field === 'vintage')?.value ?? null;
  // Unknown vintage/grape/region is retained for review, never interpreted as a
  // known mismatch or used to fill missing identity fields.
  const matching = pages.rows.filter(row => evidence.every(item => {
    switch (item.field) {
      case 'producer': return canonicalProducerKey(row.winery) === canonicalProducerKey(item.value);
      case 'name': return containsPhrase(row.name, item.value);
      case 'region': return row.region === null || normalize(row.region) === normalize(item.value);
      case 'grape': return row.grapes.length === 0 || row.grapes.some(grape => normalize(grape) === normalize(item.value));
      case 'vintage': return row.vintages.length === 0 || row.vintages.includes(item.value);
    }
  }));
  const candidates = matching.slice(0, previewLimit).map(row => ({
    mantalakWineId: row.mantalakWineId, name: row.name, winery: row.winery, photoUrl: row.photo,
    requestedVintage: vintage,
    vintageStatus: vintage === null ? 'unspecified' as const : row.vintages.includes(vintage) ? 'known' as const : 'unrecorded' as const,
  }));
  return result(!matching.length ? 'no-candidates' : matching.length > previewLimit ? 'too-many-candidates' : 'review-candidates', {
    ...count, searchPagesComplete: true, matched: matching.length, candidates,
    previewTruncated: matching.length > previewLimit,
  });
};
