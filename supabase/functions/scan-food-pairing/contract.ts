export const MAX_MENU_DISHES = 60;
export const MAX_DISH_RECOMMENDATIONS = 2;

type RawRecord = Record<string, unknown>;

export type FoodRecommendation = {
  nombre: string;
  tipo: string | null;
  uvas: string[];
  match: number;
  razon: string;
  atributos: Record<string, unknown> | null;
};

export type FoodDish = {
  nombre: string;
  categoria: string | null;
  match: number;
  razon: string;
  recomendaciones: FoodRecommendation[];
  source_order: number;
  source_text: string;
  confidence: number | null;
  segmentation: "direct" | "split";
};

export type FoodScanCoverage = {
  estimated_visible_dishes: number | null;
  returned_dishes: number;
  unreadable_dishes: number;
  truncated: boolean;
  split_rows: number;
  duplicate_rows: number;
  notes: string[];
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeKey = (value: string) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const toCount = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : null;
};

const toConfidence = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return clamp(Math.round(percent), 0, 100);
};

const normalizeSensoryAttributes = (value: unknown): Record<string, number | null> | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as RawRecord;
  const keys = ["potencia", "acidez", "dulzura", "taninos", "afrutado"];
  const normalized = Object.fromEntries(keys.map((key) => {
    const numeric = Number(source[key]);
    if (!Number.isFinite(numeric)) return [key, null];
    const scaled = numeric > 10 ? numeric / 20 : numeric > 5 ? numeric / 2 : numeric;
    return [key, clamp(Math.round(scaled), 1, 5)];
  }));
  return Object.values(normalized).some((item) => item !== null) ? normalized : null;
};

const splitMergedDishName = (name: string): string[] => {
  const normalized = name.replace(/[\r\n•·]+/g, "/");
  if (!normalized.includes("/") && !normalized.includes(";")) return [name.trim()];

  const segments = normalized
    .split(/\s*(?:\/|;)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  // A slash can be part of a legitimate dish name. Split only when every part looks
  // like a standalone label and the row contains at least three labels.
  if (segments.length < 3 || segments.some((part) => normalizeKey(part).length < 3)) {
    return [name.trim()];
  }
  return segments;
};

const cloneRecommendation = (raw: unknown): FoodRecommendation | null => {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as RawRecord;
  const nombre = String(source.nombre ?? "").trim();
  if (!nombre) return null;
  return {
    nombre,
    tipo: source.tipo ? String(source.tipo) : null,
    uvas: Array.isArray(source.uvas) ? source.uvas.map(String).filter(Boolean) : [],
    match: clamp(Math.round(Number(source.match) || 0), 0, 100),
    razon: source.razon ? String(source.razon) : "",
    atributos: normalizeSensoryAttributes(source.atributos),
  };
};

export const normalizeFoodScan = (
  rawDishes: unknown[],
  rawCoverage: unknown,
  mode: "menu" | "dish",
): { dishes: FoodDish[]; coverage: FoodScanCoverage } => {
  const expanded: FoodDish[] = [];
  let splitRows = 0;

  rawDishes.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") return;
    const source = raw as RawRecord;
    const sourceName = String(source.nombre ?? "").trim();
    if (!sourceName) return;
    const names = mode === "menu" ? splitMergedDishName(sourceName) : [sourceName];
    if (names.length > 1) splitRows += 1;
    const recommendations = Array.isArray(source.recomendaciones)
      ? source.recomendaciones
        .map(cloneRecommendation)
        .filter((item): item is FoodRecommendation => Boolean(item))
        .slice(0, MAX_DISH_RECOMMENDATIONS)
      : [];

    names.forEach((nombre, splitIndex) => {
      expanded.push({
        nombre,
        categoria: source.categoria ? String(source.categoria) : null,
        match: clamp(Math.round(Number(source.match) || 0), 0, 100),
        razon: source.razon ? String(source.razon) : "",
        recomendaciones: recommendations,
        source_order: toCount(source.source_order) ?? index + 1,
        source_text: source.source_text ? String(source.source_text) : sourceName,
        confidence: toConfidence(source.confidence),
        segmentation: splitIndex === 0 && names.length === 1 ? "direct" : "split",
      });
    });
  });

  const seen = new Set<string>();
  let duplicateRows = 0;
  const distinct = expanded.filter((dish) => {
    const key = normalizeKey(dish.nombre);
    if (!key || seen.has(key)) {
      duplicateRows += 1;
      return false;
    }
    seen.add(key);
    return true;
  });
  const limit = mode === "menu" ? MAX_MENU_DISHES : 1;
  const dishes = distinct.slice(0, limit);
  const coverageSource = rawCoverage && typeof rawCoverage === "object"
    ? rawCoverage as RawRecord
    : {};
  const estimatedVisible = toCount(coverageSource.estimated_visible_dishes);
  const providerTruncated = coverageSource.truncated === true;
  const truncated = providerTruncated || distinct.length > limit || (
    estimatedVisible !== null && estimatedVisible > dishes.length
  );
  const notes = Array.isArray(coverageSource.notes)
    ? coverageSource.notes.map(String).map((note) => note.trim()).filter(Boolean).slice(0, 8)
    : [];

  if (splitRows > 0) notes.push("Se separaron filas que contenían varios platos.");
  if (duplicateRows > 0) notes.push("Se descartaron filas duplicadas.");
  if (truncated) notes.push("La lectura no cubre todos los platos visibles.");

  return {
    dishes,
    coverage: {
      estimated_visible_dishes: estimatedVisible,
      returned_dishes: dishes.length,
      unreadable_dishes: toCount(coverageSource.unreadable_dishes) ?? 0,
      truncated,
      split_rows: splitRows,
      duplicate_rows: duplicateRows,
      notes: [...new Set(notes)],
    },
  };
};
