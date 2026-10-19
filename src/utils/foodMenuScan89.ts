import { cropImageRegion } from './imageAnalysis';
import { getCropGeometry } from './imageCropGeometry';
import { FoodScanResponseError, parseFoodScanResponse, type FoodScanResult, type FoodDishResult } from './foodScanResponse';

export const FOOD_MENU_TILE_LIMIT = 30;
export const FOOD_MENU_SCAN_TIMEOUT_MS = 90_000;
export type FoodMenuBox = { x: number; y: number; width: number; height: number };
export type FoodMenuTile = { id: 'left' | 'right' | 'top' | 'bottom' | 'center'; box: FoodMenuBox; crop_box: FoodMenuBox; tile_count: 2 | 3 };
export type FoodMenuDish89 = FoodDishResult & {
  source_box: FoodMenuBox | null;
  region_id: string | null;
  source_tile_ids: string[];
};
type TileCoverage = {
  id: string; box: FoodMenuBox; status: 'read' | 'failed';
  estimated_visible_dishes: number | null; unreadable_dishes: number | null;
  returned_dishes: number; partial: boolean;
};
export type FoodMenuScanResult89 = Omit<FoodScanResult, 'dishes' | 'coverage'> & {
  dishes: FoodMenuDish89[];
  orchestration_version: 'food-menu-bounded-crops89-v2';
  coverage: NonNullable<FoodScanResult['coverage']> & {
    partial: true; duplicate_rows: number; tiles: TileCoverage[];
    coordinate_space: 'original_percent';
  };
};
type TileRead = { tile: FoodMenuTile; result: FoodScanResult; dishes: FoodMenuDish89[]; coverage: TileCoverage };
type TileOutcome = { ok: true; read: TileRead } | { ok: false; tile: FoodMenuTile; error: unknown };
type ScanOptions = {
  image: string; width: number; height: number; signal: AbortSignal;
  context?: { restaurantName?: string; matchrimProfile?: unknown; matchrimLearningModel?: unknown };
  invoke: (body: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>;
  crop?: typeof cropImageRegion;
  timeoutMs?: number;
};

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const box = (value: unknown): value is FoodMenuBox => record(value)
  && [value.x, value.y, value.width, value.height].every((n) => typeof n === 'number' && Number.isFinite(n))
  && Number(value.x) >= 0 && Number(value.y) >= 0 && Number(value.width) > 0 && Number(value.height) > 0
  && Number(value.x) + Number(value.width) <= 100.000001 && Number(value.y) + Number(value.height) <= 100.000001;
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const invalid = () => new FoodScanResponseError('La respuesta del recorte no es valida. Puedes volver a intentarlo manualmente.');
const abortError = () => new DOMException('Cancelled', 'AbortError');
const checkAbort = (signal: AbortSignal) => { if (signal.aborted) throw abortError(); };

// Race against cancellation as well as forwarding it, so even an uncooperative
// decoder/transport cannot publish a late result or hold the operation open.
const cancellable = <T>(task: Promise<T>, signal: AbortSignal): Promise<T> => new Promise((resolve, reject) => {
  const aborted = () => { cleanup(); reject(abortError()); };
  const cleanup = () => signal.removeEventListener('abort', aborted);
  task.then((value) => { cleanup(); resolve(value); }, (error) => { cleanup(); reject(error); });
  if (signal.aborted) aborted();
  else signal.addEventListener('abort', aborted, { once: true });
});

export const planFoodMenuTiles89 = (width: number, height: number): FoodMenuTile[] => {
  if (![width, height].every((n) => Number.isSafeInteger(n) && n > 0)) throw new Error('Invalid image dimensions');
  // Aspect chooses a crop axis, not a claim about the menu's actual columns.
  const planned = height > width ? [
    { id: 'top' as const, box: { x: 0, y: 0, width: 100, height: 56 } },
    { id: 'bottom' as const, box: { x: 0, y: 44, width: 100, height: 56 } },
  ] : [
    { id: 'left' as const, box: { x: 0, y: 0, width: 56, height: 100 } },
    { id: 'right' as const, box: { x: 44, y: 0, width: 56, height: 100 } },
  ];
  // A wide photo may contain a panel straddling both side crops. Preserve a
  // complete middle view without claiming that aspect ratio detects columns.
  const withCenter = width / height >= 1.3
    ? [...planned, { id: 'center' as const, box: { x: 22, y: 0, width: 56, height: 100 } }]
    : planned;
  return withCenter.map((tile) => ({ ...tile, tile_count: withCenter.length as 2 | 3,
    crop_box: tile.box, box: getCropGeometry(width, height, tile.box, 0).sourceBox }));
};

export const mapFoodMenuBox89 = (local: FoodMenuBox, tile: FoodMenuTile): FoodMenuBox => ({
  x: tile.box.x + local.x * tile.box.width / 100,
  y: tile.box.y + local.y * tile.box.height / 100,
  width: local.width * tile.box.width / 100,
  height: local.height * tile.box.height / 100,
});

export const parseFoodMenuTile89 = (value: unknown, tile: FoodMenuTile): TileRead => {
  const parsed = parseFoodScanResponse(value);
  if (parsed.mode !== 'menu' || !record(value) || !Array.isArray(value.dishes)) throw invalid();
  const sourceContext = value.scan_region;
  const contextBox = record(sourceContext) ? sourceContext.box : null;
  const contextual = record(sourceContext) && sourceContext.id === tile.id
    && sourceContext.coordinate_space === 'crop_percent' && sourceContext.max_dishes === FOOD_MENU_TILE_LIMIT
    && sourceContext.tile_count === tile.tile_count && box(contextBox)
    && (['x', 'y', 'width', 'height'] as const).every((key) => Math.abs(contextBox[key] - tile.box[key]) < 0.000001);
  if (sourceContext != null && !contextual) throw invalid();
  const rawCoverage = record(value.coverage) ? value.coverage : {};
  for (const key of ['partial', 'model_counts_reported']) {
    if (rawCoverage[key] !== undefined && typeof rawCoverage[key] !== 'boolean') throw invalid();
  }
  let missingGeometry = false;
  const rawDishes = value.dishes;
  const dishes = parsed.dishes.slice(0, FOOD_MENU_TILE_LIMIT).map((dish, index): FoodMenuDish89 => {
    const raw = rawDishes[index];
    if (!record(raw) || (raw.source_box != null && !box(raw.source_box))
      || (raw.region_id != null && typeof raw.region_id !== 'string')) throw invalid();
    if (!contextual || !box(raw.source_box)) missingGeometry = true;
    return { ...dish, recomendaciones: dish.recomendaciones.slice(0, 2),
      source_box: contextual && box(raw.source_box) ? mapFoodMenuBox89(raw.source_box, tile) : null,
      region_id: contextual && typeof raw.region_id === 'string' ? `${tile.id}:${raw.region_id}` : null,
      source_tile_ids: [tile.id],
    };
  });
  const modelCounts = contextual && rawCoverage.model_counts_reported === true;
  const estimated = modelCounts ? count(rawCoverage.estimated_visible_dishes) : null;
  const unreadable = modelCounts ? count(rawCoverage.unreadable_dishes) : null;
  return { tile, result: parsed, dishes, coverage: { id: tile.id, box: tile.box, status: 'read',
    estimated_visible_dishes: estimated, unreadable_dishes: unreadable, returned_dishes: dishes.length,
    partial: !contextual || missingGeometry || estimated === null || unreadable === null
      || rawCoverage.partial === true || rawCoverage.truncated === true || (unreadable ?? 0) > 0
      || (estimated !== null && estimated > dishes.length) || parsed.dishes.length >= FOOD_MENU_TILE_LIMIT,
  } };
};

const key = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const samePhysicalRow = (a: FoodMenuDish89, b: FoodMenuDish89) => {
  if (!a.source_box || !b.source_box || !a.source_text || !b.source_text
    || a.source_tile_ids.some((id) => b.source_tile_ids.includes(id))
    || key(a.nombre) !== key(b.nombre) || key(a.source_text) !== key(b.source_text)) return false;
  const first = a.source_box, second = b.source_box;
  const intersection = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x))
    * Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));
  const union = first.width * first.height + second.width * second.height - intersection;
  return intersection / union >= 0.65;
};

const literalRow89 = (text: string) => text.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en');
const terminalPrice89 = (text: string) => {
  if (/[\r\n/]/.test(text)) return null;
  const match = /^(.*?)\s+(\d+(?:[.,]\d{1,2})?)\s*(zł|PLN|EUR|€|GBP|£|USD|\$|CHF)$/iu.exec(text.trim());
  return match ? { body: literalRow89(match[1]), amount: Number(match[2].replace(',', '.')),
    currency: ({ 'zł': 'PLN', '€': 'EUR', '£': 'GBP' } as Record<string, string>)[match[3].toLowerCase()]
      ?? match[3].toUpperCase() } : null;
};
const nativeRowSection89 = (dish: FoodMenuDish89) => {
  const prefix = `${dish.source_tile_ids[0]}:`;
  const section = dish.region_id?.startsWith(prefix) ? dish.region_id.slice(prefix.length) : null;
  return section?.trim() ? section : null;
};
const nativeRowContext89 = (a: FoodMenuDish89, b: FoodMenuDish89) => literalRow89(a.nombre) === literalRow89(b.nombre)
  && Boolean(a.categoria && literalRow89(a.categoria)) && Boolean(b.categoria && literalRow89(b.categoria))
  && literalRow89(a.categoria) === literalRow89(b.categoria)
  && Number.isSafeInteger(a.source_order) && (a.source_order ?? -1) >= 0 && a.source_order === b.source_order
  && Boolean(nativeRowSection89(a)) && nativeRowSection89(a) === nativeRowSection89(b);

// Only a missing terminal price on a provably crop-edge-clipped overlapping read.
// Geometry and text remain model claims, not independent physical-row verification.
const nativeClippedPriceRow89 = (a: FoodMenuDish89, b: FoodMenuDish89, tiles: FoodMenuTile[]) => {
  if (!a.source_box || !b.source_box || !a.source_text || !b.source_text
    || a.source_tile_ids.length !== 1 || b.source_tile_ids.length !== 1
    || a.source_tile_ids[0] === b.source_tile_ids[0]
    || !nativeRowContext89(a, b)) return null;
  const firstPrice = terminalPrice89(a.source_text), secondPrice = terminalPrice89(b.source_text);
  if (Boolean(firstPrice) === Boolean(secondPrice)) return null;
  const priced = firstPrice ? a : b, clipped = firstPrice ? b : a;
  const price = firstPrice ?? secondPrice;
  if (!price || !Number.isFinite(price.amount) || /[\r\n/]/.test(clipped.source_text!)
    || price.body !== literalRow89(clipped.source_text!) || price.body !== literalRow89(clipped.nombre)) return null;
  const pricedTiles = tiles.filter(tile => tile.id === priced.source_tile_ids[0]);
  const clippedTiles = tiles.filter(tile => tile.id === clipped.source_tile_ids[0]);
  if (pricedTiles.length !== 1 || clippedTiles.length !== 1) return null;
  const fullTile = pricedTiles[0], cutTile = clippedTiles[0];
  if (fullTile.tile_count !== cutTile.tile_count
    || !box(fullTile.box) || !box(cutTile.box) || !box(priced.source_box) || !box(clipped.source_box)) return null;
  const full = priced.source_box!, cut = clipped.source_box!;
  const epsilon = 0.000001; // Same percent-coordinate rounding tolerance as crop-context validation.
  const contains = (outer: FoodMenuBox, inner: FoodMenuBox) => inner.x >= outer.x - epsilon
    && inner.y >= outer.y - epsilon && inner.x + inner.width <= outer.x + outer.width + epsilon
    && inner.y + inner.height <= outer.y + outer.height + epsilon;
  if (!contains(fullTile.box, full) || !contains(cutTile.box, cut) || !contains(full, cut)
    || full.width * full.height <= cut.width * cut.height) return null;
  if ((fullTile.box.y > 0 && full.y <= fullTile.box.y + epsilon)
    || (fullTile.box.x > 0 && full.x <= fullTile.box.x + epsilon)
    || (fullTile.box.y + fullTile.box.height < 100 && full.y + full.height >= fullTile.box.y + fullTile.box.height - epsilon)
    || (fullTile.box.x + fullTile.box.width < 100 && full.x + full.width >= fullTile.box.x + fullTile.box.width - epsilon)) return null;
  const overlap: FoodMenuBox = {
    x: Math.max(fullTile.box.x, cutTile.box.x), y: Math.max(fullTile.box.y, cutTile.box.y),
    width: Math.min(fullTile.box.x + fullTile.box.width, cutTile.box.x + cutTile.box.width) - Math.max(fullTile.box.x, cutTile.box.x),
    height: Math.min(fullTile.box.y + fullTile.box.height, cutTile.box.y + cutTile.box.height) - Math.max(fullTile.box.y, cutTile.box.y),
  };
  if (!box(overlap) || !contains(overlap, cut)) return null;
  const vertical = Math.abs(full.x - cut.x) <= epsilon && Math.abs(full.width - cut.width) <= epsilon && full.height <= cut.height * 2 && (
    (cutTile.box.y > 0 && Math.abs(cut.y - cutTile.box.y) <= epsilon && full.y < cutTile.box.y - epsilon)
    || (cutTile.box.y + cutTile.box.height < 100 && Math.abs(cut.y + cut.height - cutTile.box.y - cutTile.box.height) <= epsilon
      && full.y + full.height > cutTile.box.y + cutTile.box.height + epsilon));
  const horizontal = Math.abs(full.y - cut.y) <= epsilon && Math.abs(full.height - cut.height) <= epsilon && full.width <= cut.width * 2 && (
    (cutTile.box.x > 0 && Math.abs(cut.x - cutTile.box.x) <= epsilon && full.x < cutTile.box.x - epsilon)
    || (cutTile.box.x + cutTile.box.width < 100 && Math.abs(cut.x + cut.width - cutTile.box.x - cutTile.box.width) <= epsilon
      && full.x + full.width > cutTile.box.x + cutTile.box.width + epsilon));
  return vertical || horizontal ? priced : null;
};

const mergeNativeClippedPrices89 = (baseline: FoodMenuScanResult89, outcomes: TileOutcome[]): FoodMenuScanResult89 => {
  const tiles = outcomes.flatMap(outcome => outcome.ok ? [outcome.read.tile] : []);
  const dishes: FoodMenuDish89[] = [];
  let duplicates = 0;
  for (const dish of baseline.dishes) {
    const candidates = dishes.flatMap((existing, index) => {
      const preferred = nativeClippedPriceRow89(existing, dish, tiles);
      return preferred ? [{ index, preferred }] : [];
    });
    if (candidates.length !== 1) { dishes.push(dish); continue; }
    const { index, preferred } = candidates[0];
    dishes[index] = { ...preferred, source_tile_ids: [...dishes[index].source_tile_ids, ...dish.source_tile_ids] };
    duplicates += 1;
  }
  return { ...baseline, dishes,
    summary: `${dishes.length} lecturas devueltas. La cobertura y disponibilidad no están verificadas.`,
    coverage: { ...baseline.coverage, returned_dishes: dishes.length, duplicate_rows: baseline.coverage.duplicate_rows + duplicates },
  };
};

export const mergeFoodMenuTiles89 = (outcomes: TileOutcome[], nativeClippedPrices = false): FoodMenuScanResult89 => {
  const reads = outcomes.flatMap((outcome) => outcome.ok === true ? [outcome.read] : []);
  if (!reads.length) throw outcomes.flatMap((outcome) => outcome.ok === false ? [outcome.error] : [])[0]
    ?? new Error('No se pudo leer el menu.');
  const dishes: FoodMenuDish89[] = [];
  let duplicates = 0;
  for (const read of reads) {
    for (const dish of read.dishes) {
      const duplicate = dishes.find((existing) => {
        if (!samePhysicalRow(existing, dish)) return false;
        if (!nativeClippedPrices) return true;
        if (!nativeRowContext89(existing, dish)) return false;
        const firstPrice = existing.source_text ? terminalPrice89(existing.source_text) : null;
        const secondPrice = dish.source_text ? terminalPrice89(dish.source_text) : null;
        return !firstPrice || !secondPrice
          || (firstPrice.amount === secondPrice.amount && firstPrice.currency === secondPrice.currency);
      });
      if (duplicate) {
        duplicate.source_tile_ids.push(...dish.source_tile_ids);
        duplicates += 1;
      } else dishes.push({ ...dish, source_tile_ids: [...dish.source_tile_ids] });
    }
  }
  const first = reads[0].result;
  const profileAgrees = reads.every((read) => read.result.has_profile === first.has_profile
    && read.result.profile_source === first.profile_source);
  const merged: FoodMenuScanResult89 = { ...first, mode: 'menu', dishes, orchestration_version: 'food-menu-bounded-crops89-v2',
    has_profile: profileAgrees && first.has_profile, profile_source: profileAgrees ? first.profile_source : 'none',
    summary: `${dishes.length} lecturas devueltas. La cobertura y disponibilidad no están verificadas.`,
    coverage: { estimated_visible_dishes: null, unreadable_dishes: null, returned_dishes: dishes.length,
      truncated: true, partial: true, duplicate_rows: duplicates, coordinate_space: 'original_percent',
      tiles: outcomes.map((outcome) => outcome.ok === true ? outcome.read.coverage : {
        id: outcome.tile.id, box: outcome.tile.box, status: 'failed', estimated_visible_dishes: null,
        unreadable_dishes: null, returned_dishes: 0, partial: true,
      }),
      notes: [
        'Lectura por recortes solapados; cobertura global no verificada. No se suman sus estimaciones.',
        ...(outcomes.some((outcome) => !outcome.ok) ? ['Un recorte no termino o no devolvio una respuesta valida; faltan zonas por revisar.'] : []),
        ...(reads.some((read) => read.coverage.partial) ? ['Hay limites de lectura, geometria o recuento en los recortes.'] : []),
        'Las cajas y textos proceden del modelo, no de una verificacion independiente de los pixeles.',
      ],
    },
  };
  return nativeClippedPrices ? mergeNativeClippedPrices89(merged, outcomes) : merged;
};

export const scanFoodMenu89 = async (options: ScanOptions): Promise<FoodMenuScanResult89> => {
  checkAbort(options.signal);
  const tiles = planFoodMenuTiles89(options.width, options.height);
  const controller = new AbortController();
  const cancelled = () => controller.abort();
  options.signal.addEventListener('abort', cancelled, { once: true });
  const timeoutMs = Math.min(FOOD_MENU_SCAN_TIMEOUT_MS, Math.max(1, options.timeoutMs ?? FOOD_MENU_SCAN_TIMEOUT_MS));
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const crop = options.crop ?? cropImageRegion;
  try {
    // Two or three bounded jobs, no preflight, fallback, refinement or paid retry.
    const outcomes = await Promise.all(tiles.map(async (tile): Promise<TileOutcome> => {
      try {
        checkAbort(controller.signal);
        const image = await cancellable(crop(options.image, tile.crop_box, 0, 1800, controller.signal), controller.signal);
        checkAbort(controller.signal);
        const response = await cancellable(options.invoke({ ...options.context, image, mode: 'menu',
          scan_region: { id: tile.id, box: tile.box, tile_count: tile.tile_count, max_dishes: FOOD_MENU_TILE_LIMIT, coordinate_space: 'crop_percent' },
        }, controller.signal), controller.signal);
        checkAbort(controller.signal);
        return { ok: true, read: parseFoodMenuTile89(response, tile) };
      } catch (error) {
        return { ok: false, tile, error: controller.signal.aborted && !options.signal.aborted
          ? new Error('El analisis del menu agoto su tiempo. Puedes volver a intentarlo manualmente.') : error };
      }
    }));
    checkAbort(options.signal);
    return mergeFoodMenuTiles89(outcomes, options.context?.matchrimLearningModel === 'native-evidence-strength-v2');
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener('abort', cancelled);
    controller.abort();
  }
};
