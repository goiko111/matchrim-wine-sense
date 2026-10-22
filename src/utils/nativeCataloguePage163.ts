import type { PublicGlobalRow103 } from './nativeGlobalCatalogue103';

// Presentation only: keep each observed row and its ID for independent verification.
export const nativeCataloguePage163 = (rows: readonly PublicGlobalRow103[], vintage: string, page: number) => {
  const years = [...new Set(rows.map(row => row.vintage == null ? 'undated' : String(row.vintage)))].sort((a, b) =>
    a === 'undated' ? 1 : b === 'undated' ? -1 : Number(b) - Number(a));
  const filtered = vintage === 'all' ? rows : rows.filter(row =>
    (row.vintage == null ? 'undated' : String(row.vintage)) === vintage);
  const pages = Math.max(1, Math.ceil(filtered.length / 3));
  const current = Number.isSafeInteger(page) ? Math.max(0, Math.min(page, pages - 1)) : 0;
  return { years, current, pages, total: filtered.length, rows: filtered.slice(current * 3, current * 3 + 3) };
};
