import { optionalScanNumber } from '../_shared/matchrim-scan-values.ts';

export const MAX_MENU_DISHES = 60;
export const MAX_MENU_TILE_DISHES = 30;
export const MAX_DISH_RECOMMENDATIONS = 2;

type RawRecord = Record<string, unknown>;

export type FoodSourceBox = { x: number; y: number; width: number; height: number };
export type FoodMenuRegionContext = {
  id: 'left' | 'right' | 'top' | 'bottom' | 'center'; box: FoodSourceBox; tile_count: 2 | 3;
  max_dishes: 30; coordinate_space: 'crop_percent';
};

export type FoodRecommendation = {
  nombre: string;
  tipo: string | null;
  uvas: string[];
  match: null;
  razon: string;
  atributos: Record<string, unknown> | null;
};

export type FoodDish = {
  nombre: string;
  categoria: string | null;
  match: null;
  razon: string;
  recomendaciones: FoodRecommendation[];
  source_order: number;
  source_text: string;
  confidence: number | null;
  segmentation: "direct" | "split";
  region_id: string | null;
  source_box: FoodSourceBox | null;
  segmentation_evidence: "model_source_rows" | "unverified";
};

export type FoodRegionCoverage = {
  id: string;
  box: FoodSourceBox | null;
  estimated_visible_dishes: number | null;
  returned_dishes: number;
  unreadable_dishes: number;
  truncated: boolean;
};

export type FoodScanCoverage = {
  estimated_visible_dishes: number | null;
  returned_dishes: number;
  unreadable_dishes: number;
  truncated: boolean;
  partial: boolean;
  model_counts_reported: boolean;
  split_rows: number;
  duplicate_rows: number;
  unresolved_rows: number;
  verification: "model_reported_not_pixel_verified";
  regions: FoodRegionCoverage[];
  notes: string[];
};

const isRecord = (value: unknown): value is RawRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string";
const nonemptyText = (value: unknown): value is string => isText(value) && value.trim().length > 0;
const optionalText = (value: unknown) => value == null || isText(value);
const isCount = (value: unknown) => value == null || (
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
);
const isFiniteNumber = (value: unknown) => value == null || (
  typeof value === "number" && Number.isFinite(value)
);
const isSourceBox = (value: unknown): value is FoodSourceBox => isRecord(value)
  && [value.x, value.y, value.width, value.height].every((part) => typeof part === "number" && Number.isFinite(part))
  && Number(value.x) >= 0 && Number(value.y) >= 0 && Number(value.width) > 0 && Number(value.height) > 0
  && Number(value.x) + Number(value.width) <= 100.000001 && Number(value.y) + Number(value.height) <= 100.000001;
export const parseFoodMenuRegionContext = (value: unknown): FoodMenuRegionContext | null => {
  if (!isRecord(value) || (value.id !== 'left' && value.id !== 'right' && value.id !== 'top' && value.id !== 'bottom' && value.id !== 'center') || !isSourceBox(value.box)
    || (value.tile_count !== 2 && value.tile_count !== 3) || (value.id === 'center' && value.tile_count !== 3)
    || value.max_dishes !== MAX_MENU_TILE_DISHES || value.coordinate_space !== 'crop_percent') return null;
  return { id: value.id, box: { x: value.box.x, y: value.box.y, width: value.box.width, height: value.box.height },
    tile_count: value.tile_count, max_dishes: 30, coordinate_space: 'crop_percent' };
};
const boxWithin = (inner: FoodSourceBox, outer: FoodSourceBox) => inner.x >= outer.x && inner.y >= outer.y
  && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
const boxesOverlap = (a: FoodSourceBox, b: FoodSourceBox) => Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x)
  && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y);
const isSourceRow = (value: unknown): value is RawRecord => isRecord(value)
  && nonemptyText(value.nombre) && nonemptyText(value.source_text)
  && nonemptyText(value.region_id) && isCount(value.source_order) && value.source_order != null
  && isSourceBox(value.source_box);

// Validate known model fields before normalization; objects/numbers must never become text.
export const isFoodScanPayload = (value: RawRecord): value is RawRecord & { summary?: string; dishes: RawRecord[] } => {
  if (!optionalText(value.summary) || !Array.isArray(value.dishes)) return false;
  const validDishes = value.dishes.every((dish) => isRecord(dish)
    && nonemptyText(dish.nombre) && optionalText(dish.categoria) && optionalText(dish.razon)
    && optionalText(dish.source_text) && optionalText(dish.region_id)
    && (dish.source_box == null || isSourceBox(dish.source_box))
    && isCount(dish.source_order) && isFiniteNumber(dish.match)
    && isFiniteNumber(dish.confidence)
    && (dish.confidence == null || (Number(dish.confidence) >= 0 && Number(dish.confidence) <= 100))
    && (dish.source_rows === undefined || (Array.isArray(dish.source_rows) && dish.source_rows.every(isSourceRow)))
    && (dish.recomendaciones === undefined || (Array.isArray(dish.recomendaciones)
      && dish.recomendaciones.every((rec) => isRecord(rec) && nonemptyText(rec.nombre)
        && optionalText(rec.tipo) && optionalText(rec.razon) && isFiniteNumber(rec.match)
        && (rec.uvas === undefined || (Array.isArray(rec.uvas) && rec.uvas.every(isText)))
        && (rec.atributos == null || (isRecord(rec.atributos) && Object.values(rec.atributos).every(isFiniteNumber)))))));
  if (!validDishes || (value.coverage !== undefined && !isRecord(value.coverage))) return false;
  const coverage = value.coverage as RawRecord | undefined;
  return !coverage || (isCount(coverage.estimated_visible_dishes) && isCount(coverage.unreadable_dishes)
    && (coverage.truncated === undefined || typeof coverage.truncated === "boolean")
    && (coverage.notes === undefined || (Array.isArray(coverage.notes) && coverage.notes.every(isText)))
    && (coverage.regions === undefined || (Array.isArray(coverage.regions) && coverage.regions.length <= MAX_MENU_DISHES
      && coverage.regions.every((region) => isRecord(region) && nonemptyText(region.id)
        && (region.box == null || isSourceBox(region.box))
        && isCount(region.estimated_visible_dishes) && isCount(region.unreadable_dishes)
        && (region.truncated === undefined || typeof region.truncated === "boolean"))
      && new Set(coverage.regions.map((region) => (region as RawRecord).id)).size === coverage.regions.length)));
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeKey = (value: string) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

const toCount = (value: unknown): number | null => {
  const numeric = optionalScanNumber(value);
  return numeric !== null && numeric >= 0 ? Math.round(numeric) : null;
};

const toConfidence = (value: unknown): number | null => {
  const numeric = optionalScanNumber(value);
  if (numeric === null || numeric < 0 || numeric > 100) return null;
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return clamp(Math.round(percent), 0, 100);
};

const normalizeSensoryAttributes = (value: unknown): Record<string, number | null> | null => {
  if (!isRecord(value)) return null;
  const source = value;
  const keys = ["potencia", "acidez", "dulzura", "taninos", "afrutado"];
  const normalized = Object.fromEntries(keys.map((key) => {
    const numeric = optionalScanNumber(source[key]);
    if (numeric === null || numeric <= 0) return [key, null];
    const scaled = numeric > 10 ? numeric / 20 : numeric > 5 ? numeric / 2 : numeric;
    return [key, clamp(Math.round(scaled), 1, 5)];
  }));
  return Object.values(normalized).some((item) => item !== null) ? normalized : null;
};

const cloneRecommendation = (raw: unknown): FoodRecommendation | null => {
  if (!isRecord(raw)) return null;
  const source = raw;
  const nombre = isText(source.nombre) ? source.nombre.trim() : "";
  if (!nombre) return null;
  return {
    nombre,
    tipo: isText(source.tipo) ? source.tipo : null,
    uvas: Array.isArray(source.uvas) ? source.uvas.filter(isText).filter(Boolean) : [],
    match: null,
    razon: isText(source.razon) ? source.razon : "",
    atributos: normalizeSensoryAttributes(source.atributos),
  };
};

export const normalizeFoodScan = (
  rawDishes: unknown[],
  rawCoverage: unknown,
  mode: "menu" | "dish",
  menuLimit = MAX_MENU_DISHES,
): { dishes: FoodDish[]; coverage: FoodScanCoverage } => {
  const expanded: FoodDish[] = [];
  let splitRows = 0;
  let unresolvedRows = 0;
  const coverageSource = isRecord(rawCoverage) ? rawCoverage : {};
  const rawRegions = Array.isArray(coverageSource.regions)
    ? coverageSource.regions.filter(isRecord).filter((region) => nonemptyText(region.id))
    : [];
  const regionIds = new Set(rawRegions.map((region) => String(region.id)));
  const containsLiteral = (text: string, label: string) => {
    const key = normalizeKey(label);
    return key.length > 0 && ` ${normalizeKey(text)} `.includes(` ${key} `);
  };

  rawDishes.forEach((raw, index) => {
    if (!isRecord(raw)) return;
    const source = raw;
    const sourceName = isText(source.nombre) ? source.nombre.trim() : "";
    if (!sourceName) return;
    const sourceText = nonemptyText(source.source_text) ? source.source_text.trim() : sourceName;
    const sourceRows = mode === "menu" && Array.isArray(source.source_rows) && source.source_rows.length > 0
      ? source.source_rows : null;
    const validSourceRows = sourceRows && sourceRows.length >= 2 && sourceRows.length <= MAX_MENU_DISHES
      && sourceRows.every((row, rowIndex) => {
        if (!isSourceRow(row) || !isSourceBox(row.source_box)) return false;
        const region = rawRegions.find((region) => region.id === row.region_id);
        return region && isSourceBox(region.box) && boxWithin(row.source_box, region.box)
          && (!isSourceBox(source.source_box) || boxWithin(row.source_box, source.source_box))
          && containsLiteral(String(row.source_text), String(row.nombre))
          && containsLiteral(sourceText, String(row.source_text))
          && sourceRows.slice(0, rowIndex).every((previous) => isSourceRow(previous)
            && isSourceBox(previous.source_box) && !boxesOverlap(row.source_box as FoodSourceBox, previous.source_box));
      })
      && new Set(sourceRows.map((row) => JSON.stringify([
        (row as RawRecord).region_id, (row as RawRecord).source_order,
      ]))).size === sourceRows.length;
    // Delimiters alone do not prove separate dishes. Only bounded source rows may split.
    const rows: RawRecord[] = validSourceRows ? sourceRows as RawRecord[]
      : [{ nombre: sourceName, source_text: sourceText, source_box: source.source_box,
        region_id: source.region_id, source_order: source.source_order }];
    const names = rows.map((row) => String(row.nombre));
    const sourceRegion = rawRegions.find((region) => region.id === source.region_id);
    const hasBoundary = isSourceBox(source.source_box) && sourceRegion && isSourceBox(sourceRegion.box)
      && boxWithin(source.source_box, sourceRegion.box);
    // A list-like label may be an unresolved aggregate, not proof of new dishes.
    const ambiguousAggregate = mode === "menu" && (sourceName.match(/[/;\r\n\u2022\u00b7]/g)?.length ?? 0) >= 2;
    const conflictingEvidence = Boolean(sourceRows && !validSourceRows)
      || (names.length === 1 && !containsLiteral(sourceText, sourceName))
      || (names.length === 1 && ambiguousAggregate)
      || (source.source_box != null && !hasBoundary && mode === "menu");
    const unresolved = conflictingEvidence || (names.length === 1 && mode === "menu" && !hasBoundary);
    if (unresolved) unresolvedRows += 1;
    if (names.length > 1) splitRows += 1;
    const recommendations = Array.isArray(source.recomendaciones)
      ? source.recomendaciones
        .map(cloneRecommendation)
        .filter((item): item is FoodRecommendation => Boolean(item))
        .slice(0, MAX_DISH_RECOMMENDATIONS)
      : [];

    names.forEach((nombre, splitIndex) => {
      const row = rows[splitIndex];
      expanded.push({
        nombre,
        categoria: names.length === 1 && isText(source.categoria) ? source.categoria : null,
        match: null,
        razon: names.length === 1 && !conflictingEvidence && isText(source.razon) ? source.razon : "",
        recomendaciones: names.length === 1 && !conflictingEvidence ? recommendations : [],
        source_order: toCount(row.source_order) ?? index + 1,
        source_text: String(row.source_text),
        confidence: names.length === 1 && !unresolved ? toConfidence(source.confidence) : null,
        segmentation: splitIndex === 0 && names.length === 1 ? "direct" : "split",
        region_id: nonemptyText(row.region_id) && regionIds.has(row.region_id) ? row.region_id : null,
        source_box: isSourceBox(row.source_box) ? row.source_box : null,
        segmentation_evidence: validSourceRows ? "model_source_rows" : "unverified",
      });
    });
  });

  const seen = new Set<string>();
  let duplicateRows = 0;
  const deduplicated = expanded.filter((dish) => {
    if (!dish.region_id || !dish.source_box) return true;
    const key = JSON.stringify([dish.region_id, dish.source_order, dish.source_box.x, dish.source_box.y,
      dish.source_box.width, dish.source_box.height, normalizeKey(dish.source_text), normalizeKey(dish.nombre)]);
    if (seen.has(key)) {
      duplicateRows += 1;
      return false;
    }
    seen.add(key);
    return true;
  });
  // Different dish names attached to the same literal row are competing readings,
  // not independent menu entries. Preserve the row without inventing a winner.
  const distinct: FoodDish[] = [];
  let conflictingRows = 0;
  const sameRow = (first: FoodDish, second: FoodDish) => {
    if (!first.region_id || first.region_id !== second.region_id || !first.source_box || !second.source_box
      || normalizeKey(first.source_text) !== normalizeKey(second.source_text)) return false;
    const a = first.source_box, b = second.source_box;
    const intersection = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
      * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    const union = a.width * a.height + b.width * b.height - intersection;
    return intersection / union >= 0.8;
  };
  for (const dish of deduplicated) {
    const previous = mode === 'menu' ? distinct.find((row) => sameRow(row, dish)) : undefined;
    if (!previous) {
      distinct.push({ ...dish });
    } else if (normalizeKey(previous.nombre) === normalizeKey(dish.nombre)) {
      duplicateRows += 1;
    } else {
      previous.nombre = previous.source_text;
      previous.confidence = null;
      previous.razon = '';
      previous.recomendaciones = [];
      previous.segmentation_evidence = 'unverified';
      conflictingRows += 1;
    }
  }
  unresolvedRows += conflictingRows;
  const limit = mode === "menu"
    ? (Number.isSafeInteger(menuLimit) && menuLimit > 0 ? Math.min(menuLimit, MAX_MENU_DISHES) : MAX_MENU_DISHES) : 1;
  const dishes = distinct.slice(0, limit);
  const regions: FoodRegionCoverage[] = rawRegions.map((region) => {
    const returned = dishes.filter((dish) => dish.region_id === region.id).length;
    const estimated = toCount(region.estimated_visible_dishes);
    const unreadable = toCount(region.unreadable_dishes) ?? 0;
    return { id: String(region.id), box: isSourceBox(region.box) ? region.box : null,
      estimated_visible_dishes: estimated, returned_dishes: returned,
      unreadable_dishes: unreadable,
      truncated: region.truncated === true || unreadable > 0 || (estimated !== null && estimated > returned) };
  });
  const estimatedVisible = toCount(coverageSource.estimated_visible_dishes);
  const providerTruncated = coverageSource.truncated === true;
  const unreadableDishes = toCount(coverageSource.unreadable_dishes) ?? 0;
  const truncated = providerTruncated || distinct.length > limit || unresolvedRows > 0 || unreadableDishes > 0
    || regions.some((region) => region.truncated) || (
    estimatedVisible !== null && estimatedVisible > dishes.length
  );
  const notes = Array.isArray(coverageSource.notes)
    ? coverageSource.notes.filter(isText).map((note) => note.trim()).filter(Boolean).slice(0, 8)
    : [];

  if (splitRows > 0) notes.push("Se separaron filas que contenían varios platos.");
  if (duplicateRows > 0) notes.push("Se descartaron filas duplicadas.");
  if (conflictingRows > 0) notes.push("Varias interpretaciones de una misma linea se conservan como una fila literal sin maridaje atribuido.");
  if (truncated) notes.push("La lectura es parcial o tiene limites de segmentacion pendientes.");
  if (unresolvedRows > 0) notes.push("Hay filas cuya separacion no esta resuelta; no se infieren platos ni maridajes adicionales.");
  notes.push("Texto, regiones y recuentos declarados por el modelo; no son verificacion independiente de los pixeles.");
  if (mode === "menu" && (!regions.length || dishes.some((dish) => !dish.region_id))) {
    notes.push("Falta evidencia de cobertura por columna o seccion; pueden faltar platos.");
  }

  return {
    dishes,
    coverage: {
      estimated_visible_dishes: estimatedVisible,
      returned_dishes: dishes.length,
      unreadable_dishes: unreadableDishes,
      truncated,
      partial: truncated,
      model_counts_reported: typeof coverageSource.estimated_visible_dishes === 'number'
        && typeof coverageSource.unreadable_dishes === 'number',
      split_rows: splitRows,
      duplicate_rows: duplicateRows,
      unresolved_rows: unresolvedRows,
      verification: "model_reported_not_pixel_verified",
      regions,
      notes: [...new Set(notes)],
    },
  };
};
