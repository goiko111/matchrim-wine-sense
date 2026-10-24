import { z } from 'zod';

// Release 827's documented wire format. Parsing does not attest a live response
// or grant affinity authority to default-bearing sensory estimates.
const id = z.number().int().positive().safe();
const label = z.string().trim().min(1).max(240).refine(value => !Array.from(value).some(char => {
  const code = char.charCodeAt(0);
  return code < 32 || (code >= 127 && code <= 159)
    || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
}));
const year = z.union([z.number().int().min(1900).max(2099), z.string().regex(/^(19|20)\d{2}$/)])
  .transform(String);
const years = z.array(year).max(200).refine(values => new Set(values).size === values.length);
const safeUrl = (origin: string, prefix: string) => z.string().max(2048).refine(value => {
  try {
    const url = new URL(value);
    return url.origin === origin && url.pathname.startsWith(prefix)
      && !url.username && !url.password && !url.hash && !url.search;
  } catch { return false; }
});
const web = safeUrl('https://web.winerim.com', '/matchrim/store/').nullable();
const photo = safeUrl('https://app.winerim.com', '/images/wines/').nullable();
const linkedPublicId = (url: string | null, publicId: number | null) => url === null
  || (publicId !== null && new URL(url).pathname.split('/').length === 5
    && new URL(url).pathname.split('/')[3] === String(publicId));
// Observed catalogue names can contain a tab as a word separator. This is
// response formatting only; query text and other control characters stay strict.
const responseName = z.preprocess(value => typeof value === 'string' && value.length <= 240
  ? value.replace(/\t+/g, ' ') : value, label);
const identity = {
  mantalakWineId: id, name: responseName, winery: label, type: label.nullable(),
  country: label.nullable(), region: label.nullable(), grapes: z.array(label).max(100),
  vintages: years, photo, slugname: label.nullable(), webUrl: web,
};
const searchRow = z.object({ ...identity, id, representativePublicId: id, tastingAttributes: z.unknown() })
  .refine(row => row.id === row.representativePublicId && linkedPublicId(row.webUrl, row.id));
const page = z.object({ results: z.array(searchRow).max(50), count: z.number().int().min(0).max(50),
  total: z.number().int().nonnegative().safe(), page: z.number().int().positive().safe(),
  limit: z.number().int().min(1).max(50), pageCount: z.number().int().nonnegative().safe() });
const sensoryAxes = ['power', 'sweetness', 'acidity', 'tannin', 'fruity'] as const;
const axis = z.number().int().min(0).max(5);
const sensoryRow = z.object({ vintage: year.nullable(), power: axis, sweetness: axis, acidity: axis,
  tannin: axis, fruity: axis, aging: axis.nullable(), source: z.object({
    type: z.literal('ai'), model: label, confidence: z.number().finite().min(0).max(1),
    generatedAt: z.string().datetime({ offset: true }),
  }).nullable() });
const detail = z.object({ ...identity, representativePublicId: id.nullable(), tastingAttributes: z.object({
  scale: z.object({ min: z.literal(0), max: z.literal(5), notApplicable: z.literal(0),
    axes: z.array(z.enum(sensoryAxes)).length(5).refine(value => new Set(value).size === 5) }),
  dependsOnVintage: z.boolean(), attributesByVintage: z.array(sensoryRow).max(201),
}) });

export type MasterPage188 = z.infer<typeof page>;
export type MasterDetail188 = z.infer<typeof detail>;
export type MasterQuery188 = { name?: string; winery?: string; q?: string; vintage?: string;
  vintageMatch?: 'prefer' | 'only'; page?: number; limit?: number };

export const masterSearchParams188 = (query: MasterQuery188): URLSearchParams | null => {
  const params = new URLSearchParams();
  const words: string[] = [];
  for (const field of ['name', 'winery', 'q'] as const) {
    const value = query[field]?.trim();
    if (value === undefined) continue;
    const tokens = [...new Set(value.split(/\s+/))];
    if (!label.safeParse(value).success || value.length < 2 || value.length > 100 || tokens.length > 6) return null;
    words.push(...tokens); params.set(field, value);
  }
  if (!words.some(word => [...word].length >= 3)) return null;
  if (query.vintage !== undefined) {
    if (!year.safeParse(query.vintage).success) return null;
    params.set('vintage', query.vintage);
  }
  if (query.vintageMatch !== undefined) {
    if (!['prefer', 'only'].includes(query.vintageMatch) || !query.vintage) return null;
    params.set('vintageMatch', query.vintageMatch);
  }
  const limit = query.limit ?? 10, pageNumber = query.page ?? 1;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50
    || !Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber * limit > 10000) return null;
  params.set('limit', String(limit)); params.set('page', String(pageNumber));
  return params;
};

export const parseMasterPage188 = (value: unknown, expectedPage: number, expectedLimit: number): MasterPage188 | null => {
  const parsed = page.safeParse(value);
  if (!parsed.success) return null;
  const row = parsed.data;
  if (row.page !== expectedPage || row.limit !== expectedLimit || row.count !== row.results.length
    || row.count > row.limit || row.pageCount !== Math.ceil(row.total / row.limit)
    || new Set(row.results.map(wine => wine.mantalakWineId)).size !== row.count) return null;
  const expectedCount = Math.max(0, Math.min(row.limit, row.total - (row.page - 1) * row.limit));
  return row.count === expectedCount ? row : null;
};

export type MasterPages188 = { rows: MasterPage188['results']; lastPage: number;
  total: number; limit: number; pageCount: number };
export const startMasterPages188 = (first: MasterPage188): MasterPages188 | null => first.page === 1
  ? { rows: first.results, lastPage: 1, total: first.total, limit: first.limit, pageCount: first.pageCount } : null;
export const appendMasterPage188 = (previous: MasterPages188, next: MasterPage188): MasterPages188 | null => {
  if (next.page !== previous.lastPage + 1 || next.total !== previous.total || next.limit !== previous.limit
    || next.pageCount !== previous.pageCount) return null;
  const ids = new Set(previous.rows.map(wine => wine.mantalakWineId));
  if (next.results.some(wine => ids.has(wine.mantalakWineId))) return null;
  return { ...previous, lastPage: next.page, rows: [...previous.rows, ...next.results] };
};

export const parseMasterDetail188 = (value: unknown, expectedId: number): MasterDetail188 | null => {
  const parsed = detail.safeParse(value);
  if (!parsed.success || parsed.data.mantalakWineId !== expectedId
    || !linkedPublicId(parsed.data.webUrl, parsed.data.representativePublicId)) return null;
  const rows = parsed.data.tastingAttributes.attributesByVintage;
  if (new Set(rows.map(row => row.vintage)).size !== rows.length
    || rows.some(row => row.vintage !== null && !parsed.data.vintages.includes(row.vintage))
    || parsed.data.tastingAttributes.dependsOnVintage !== rows.some(row => row.vintage !== null)) return null;
  return parsed.data;
};

export const masterVintageEvidence188 = (wine: MasterDetail188, requested: string | null) => {
  const known = requested !== null && wine.vintages.includes(requested);
  const exact = requested === null ? undefined : wine.tastingAttributes.attributesByVintage.find(row => row.vintage === requested);
  const generic = wine.tastingAttributes.attributesByVintage.find(row => row.vintage === null);
  const selected = exact ?? generic ?? null;
  const status = requested === null ? 'unspecified' : known ? 'known' : wine.vintages.length ? 'other-vintages-only' : 'unrecorded';
  return { status, requested, scope: exact ? 'exact' : selected ? 'generic' : 'missing',
    sensory: selected, affinityAttributes: null, learningEligible: false,
    // Even recorded AI provenance does not distinguish default 3 per axis.
    reason: 'default-values-not-distinguishable' } as const;
};

const mapping = z.object({ results: z.array(z.object({ publicId: id, mantalakWineId: id,
  vintage: year.nullable(), webUrl: web })).max(100), notFound: z.array(id).max(100) });
export const parseMasterMapping188 = (value: unknown, requested: readonly number[]) => {
  const parsed = mapping.safeParse(value);
  const unique = [...new Set(requested)];
  if (!parsed.success || !unique.length || unique.length > 100 || unique.some(value => !id.safeParse(value).success)) return null;
  const row = parsed.data, found = row.results.map(item => item.publicId);
  if (row.results.some(item => !linkedPublicId(item.webUrl, item.publicId))) return null;
  const all = [...found, ...row.notFound];
  if (new Set(all).size !== all.length || all.length !== unique.length || all.some(value => !unique.includes(value))) return null;
  if (found.some((value, index) => index > 0 && unique.indexOf(value) <= unique.indexOf(found[index - 1]))) return null;
  return row;
};
