import { masterSearchParams188, parseMasterPage216, type MasterQuery188, type MasterPage216 } from './nativeMasterContract188';

export type MasterQuery216 = MasterQuery188 & { includeUnlisted?: true };
export const masterSearchParams216 = (query: MasterQuery216): URLSearchParams | null => {
  if (query.includeUnlisted !== undefined && query.includeUnlisted !== true) return null;
  const params = masterSearchParams188(query);
  if (params && query.includeUnlisted === true) params.set('includeUnlisted', '1');
  return params;
};

// Offline collection only. The caller must bind pages to the same query and
// snapshot: response bodies themselves do not attest either of those facts.
export const collectMasterPages216 = (rawPages: readonly unknown[], limit: number) => {
  const rows: MasterPage216['results'] = [];
  const ids = new Set<number>();
  let total: number | null = null;
  const failed = () => ({ status: 'invalid' as const, rows: [], total: null,
    scope: 'provided-search-pages-only' as const, snapshotAttested: false as const });
  if (!rawPages.length || rawPages.length > 200) return failed();
  for (let index = 0; index < rawPages.length; index++) {
    const next = parseMasterPage216(rawPages[index], index + 1, limit);
    if (!next || (total !== null && next.total !== total)
      || (index > 0 && index + 1 > next.pageCount)) return failed();
    total = next.total;
    for (const row of next.results) {
      if (ids.has(row.mantalakWineId)) return failed();
      ids.add(row.mantalakWineId); rows.push(row);
    }
  }
  return { status: rows.length === total ? 'complete' as const : 'incomplete' as const,
    rows, total, scope: 'provided-search-pages-only' as const, snapshotAttested: false as const };
};
