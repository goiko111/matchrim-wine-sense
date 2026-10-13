type MutationValue = string | number | boolean | null;

// A successful transport alone does not confirm that a filtered mutation affected a row.
export const confirmsWineMutation = (
  data: unknown,
  wineId: string,
  expected: Record<string, MutationValue> = {},
): boolean => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const row = data as Record<string, unknown>;
  if (row.id !== wineId) return false;
  return Object.entries(expected).every(([key, value]) => {
    if (key === 'consumption_date' && typeof value === 'string' && typeof row[key] === 'string') {
      const expectedTime = Date.parse(value);
      return Number.isFinite(expectedTime) && Date.parse(row[key]) === expectedTime;
    }
    return row[key] === value;
  });
};
