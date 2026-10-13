import type { MenuScanWine } from './wineMenuScan';
import { confirmsMenuInsert } from './menuWineSave';

export type MenuSavePayload = Parameters<typeof confirmsMenuInsert>[1];
export interface SavedMenuCard {
  rowId: string;
  ownerId: string;
  identity: string;
  payload: MenuSavePayload;
}

// Exact card identity, not a cross-card/name/SKU deduplication key.
export const menuCardIdentity = (wine: MenuScanWine): string => JSON.stringify([
  wine.nombre, wine.productor, wine.anada, wine.region, wine.pais, wine.tipo, wine.uvas ?? [],
]);

export const menuIntentChanges = (
  saved: SavedMenuCard,
  status: 'wishlist' | 'tasted',
  favorite: boolean,
): Partial<Pick<MenuSavePayload, 'status' | 'is_favorite'>> => {
  const changes: Partial<Pick<MenuSavePayload, 'status' | 'is_favorite'>> = {};
  if (status === 'tasted' && saved.payload.status !== 'tasted') changes.status = 'tasted';
  if (favorite && !saved.payload.is_favorite) changes.is_favorite = true;
  return changes;
};

export const confirmsMenuAction = (data: unknown, expected: MenuSavePayload, rowId: string): boolean =>
  Boolean(data && typeof data === 'object' && !Array.isArray(data)
    && (data as Record<string, unknown>).id === rowId
    && (data as Record<string, unknown>).rating === null && confirmsMenuInsert(data, expected));
