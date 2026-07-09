/**
 * Lightweight localStorage-backed history of recent scans (label, wine menu, food menu, dish).
 * Consumed by ScanHub to render "Últimos escaneos" and by scanners to attach lookups
 * (e.g. Winerim Library match on a label scan).
 */

export type ScanHistoryType = "label" | "wine-menu" | "food-menu" | "dish" | "shop-link";

export interface ScanHistoryItem {
  id: string;
  type: ScanHistoryType;
  title: string;
  subtitle?: string | null;
  route: string;
  externalUrl?: string | null;
  actionLabel?: string | null;
  createdAt: number;
  payload?: Record<string, unknown> | null;
}

const STORAGE_KEY = "matchrim.scan_history.v1";
const MAX_ITEMS = 8;

export const SCAN_HISTORY_UPDATED_EVENT = "matchrim:scan-history-updated";

const isBrowser = () => typeof window !== "undefined";

const emitUpdate = () => {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(SCAN_HISTORY_UPDATED_EVENT));
};

const readAll = (): ScanHistoryItem[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ScanHistoryItem =>
        item && typeof item === "object" && typeof item.id === "string" && typeof item.title === "string",
    );
  } catch (error) {
    console.warn("[scanHistory] Failed to read history:", error);
    return [];
  }
};

const writeAll = (items: ScanHistoryItem[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    emitUpdate();
  } catch (error) {
    console.warn("[scanHistory] Failed to write history:", error);
  }
};

const generateId = () => {
  if (isBrowser() && "crypto" in window && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getScanHistory = (): ScanHistoryItem[] => readAll();

export const recordScanHistory = (
  input: Omit<ScanHistoryItem, "id" | "createdAt"> & { id?: string; createdAt?: number },
): ScanHistoryItem | null => {
  if (!isBrowser()) return null;
  const item: ScanHistoryItem = {
    id: input.id || generateId(),
    type: input.type,
    title: input.title,
    subtitle: input.subtitle ?? null,
    route: input.route,
    externalUrl: input.externalUrl ?? null,
    actionLabel: input.actionLabel ?? null,
    payload: input.payload ?? null,
    createdAt: input.createdAt ?? Date.now(),
  };

  const existing = readAll().filter((entry) => entry.id !== item.id);
  writeAll([item, ...existing]);
  return item;
};

export const updateScanHistoryItem = (
  id: string,
  patch: Partial<Pick<ScanHistoryItem, "title" | "subtitle" | "route" | "externalUrl" | "actionLabel" | "payload">>,
): ScanHistoryItem | null => {
  if (!isBrowser()) return null;
  const items = readAll();
  const index = items.findIndex((entry) => entry.id === id);
  if (index === -1) return null;

  const current = items[index];
  const updated: ScanHistoryItem = {
    ...current,
    ...patch,
    payload:
      patch.payload !== undefined
        ? { ...(current.payload ?? {}), ...(patch.payload ?? {}) }
        : current.payload,
  };
  items[index] = updated;
  writeAll(items);
  return updated;
};

export const clearScanHistory = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  emitUpdate();
};
