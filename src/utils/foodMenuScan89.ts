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
  context?: { restaurantName?: string; matchrimProfile?: unknown };
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

export const mergeFoodMenuTiles89 = (outcomes: TileOutcome[]): FoodMenuScanResult89 => {
  const reads = outcomes.flatMap((outcome) => outcome.ok === true ? [outcome.read] : []);
  if (!reads.length) throw outcomes.flatMap((outcome) => outcome.ok === false ? [outcome.error] : [])[0]
    ?? new Error('No se pudo leer el menu.');
  const dishes: FoodMenuDish89[] = [];
  let duplicates = 0;
  for (const read of reads) {
    for (const dish of read.dishes) {
      const duplicate = dishes.find((existing) => samePhysicalRow(existing, dish));
      if (duplicate) {
        duplicate.source_tile_ids.push(...dish.source_tile_ids);
        duplicates += 1;
      } else dishes.push({ ...dish, source_tile_ids: [...dish.source_tile_ids] });
    }
  }
  const first = reads[0].result;
  const profileAgrees = reads.every((read) => read.result.has_profile === first.has_profile
    && read.result.profile_source === first.profile_source);
  return { ...first, mode: 'menu', dishes, orchestration_version: 'food-menu-bounded-crops89-v2',
    has_profile: profileAgrees && first.has_profile, profile_source: profileAgrees ? first.profile_source : 'none',
    summary: `${dishes.length} platos devueltos. La cobertura de la carta no esta verificada.`,
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
    return mergeFoodMenuTiles89(outcomes);
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener('abort', cancelled);
    controller.abort();
  }
};
