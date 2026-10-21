// "Same wine" inside one list of a user's collection.
// Most reliable id first: the Winerim catalogue id stored in place_details
// (winerim_wine_id). Rows without it fall back to name + producer + vintage,
// normalised (case, accents, punctuation, extra spaces).
// Different status (collection / wishlist / tasted) is a different list.

export interface WineIdentityRow {
  name?: string | null;
  producer?: string | null;
  vintage?: number | string | null;
  place_details?: unknown;
}

const norm = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const winerimId = (details: unknown): string | null => {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const id = (details as Record<string, unknown>).winerim_wine_id;
  return id === null || id === undefined || id === '' ? null : String(id);
};

export const wineIdentityKey = (row: WineIdentityRow): string | null => {
  const id = winerimId(row.place_details);
  if (id) return `winerim:${id}`;
  const name = norm(row.name);
  if (!name) return null;
  const vintage = row.vintage === null || row.vintage === undefined || row.vintage === '' ? '' : String(Number(row.vintage));
  return `name:${name}|${norm(row.producer)}|${vintage}`;
};

type Groupable = WineIdentityRow & {
  id: string;
  status: string;
  created_at: string;
  quantity: number | null;
  matchrim_affinity: number | null;
};

export type GroupedWine<T> = T & {
  duplicate_ids: string[];
  own_quantity: number | null;
};

// Collapses rows that are the same wine in the same list into one. Nothing is
// deleted: the representative is the newest row (preferring one with affinity > 0)
// and its quantity is the sum of the group (own_quantity keeps the row's real value).
export const groupDuplicateWines = <T extends Groupable>(rows: T[]): Array<GroupedWine<T>> => {
  const groups = new Map<string, T[]>();
  const order: string[] = [];

  rows.forEach((row) => {
    const identity = wineIdentityKey(row);
    const key = identity ? `${row.status}|${identity}` : `row|${row.id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(row);
  });

  return order.map((key) => {
    const members = groups.get(key)!;
    const ranked = [...members].sort(
      (a, b) =>
        Number((b.matchrim_affinity ?? 0) > 0) - Number((a.matchrim_affinity ?? 0) > 0) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const rep = ranked[0];
    const hasQuantity = members.some((m) => m.quantity !== null);
    return {
      ...rep,
      quantity: hasQuantity ? members.reduce((sum, m) => sum + (m.quantity ?? 0), 0) : null,
      own_quantity: rep.quantity,
      duplicate_ids: members.map((m) => m.id),
    };
  });
};
