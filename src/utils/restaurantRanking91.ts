import {
  parseRestaurantPairs91, type RestaurantFocus91, type RestaurantPair91, type RestaurantRow91,
} from '../../supabase/functions/_shared/matchrim-restaurant91';

export const planRestaurantRanking91 = (
  foods: RestaurantRow91[], wines: RestaurantRow91[], focus: RestaurantFocus91,
) => {
  const selectedFoods = focus.selectedFoodId ? foods.filter(row => row.id === focus.selectedFoodId) : foods;
  const selectedWines = focus.selectedWineId ? wines.filter(row => row.id === focus.selectedWineId) : wines;
  if (!selectedFoods.length || !selectedWines.length) throw new Error('Selecciona un plato y un vino que sigan presentes en las cartas.');
  const chunks = (rows: RestaurantRow91[]) => Array.from({ length: Math.ceil(rows.length / 120) }, (_, i) => rows.slice(i * 120, (i + 1) * 120));
  const batches = chunks(selectedFoods).flatMap(foodRows => chunks(selectedWines).map(wineRows => ({ foods: foodRows, wines: wineRows, ...focus })));
  if (batches.length > 32) throw new Error('Las cartas requieren más de 32 bloques de comparación. Elige un plato o un vino para acotar el análisis; no se ha omitido ninguna página.');
  return batches;
};

export const runRestaurantRanking91 = async (
  batches: ReturnType<typeof planRestaurantRanking91>, signal: AbortSignal,
  invoke: (body: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>,
  progress: (completed: number, total: number) => void,
): Promise<{ pairs: RestaurantPair91[]; warnings: string[] }> => {
  const pairs = new Map<string, RestaurantPair91>();
  const warnings = new Set<string>();
  const check = () => { if (signal.aborted) throw new DOMException('Cancelado', 'AbortError'); };
  // One in-flight bounded block at a time. No hidden retry or truncated prefix.
  for (const [index, batch] of batches.entries()) {
    check(); progress(index, batches.length); check();
    const controller = new AbortController();
    const abort = () => controller.abort(new DOMException('Cancelado', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error('Un bloque de combinaciones agotó su tiempo. No se muestran resultados como si el análisis estuviera completo.')), 100_000);
    let onAbort: (() => void) | undefined;
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', onAbort, { once: true });
    });
    try {
      // Bound local waiting even when the transport ignores its abort signal.
      const raw = await Promise.race([Promise.resolve().then(() => {
        if (controller.signal.aborted) throw controller.signal.reason;
        return invoke({ operation: 'rank', ...batch }, controller.signal);
      }), aborted]);
      check();
      if (controller.signal.aborted) throw controller.signal.reason;
      const result = parseRestaurantPairs91(raw, batch.foods, batch.wines, batch);
      for (const pair of result.pairs) pairs.set(`${pair.foodId}\0${pair.wineId}`, pair);
      for (const warning of result.warnings) warnings.add(warning);
    } finally {
      clearTimeout(timer); signal.removeEventListener('abort', abort);
      if (onAbort) controller.signal.removeEventListener('abort', onAbort);
    }
  }
  check(); progress(batches.length, batches.length);
  if (batches.length > 1) warnings.add(`Se han comparado ${batches.length} bloques completos. El orden agrupa el encaje orientativo de cada bloque; no es una puntuación global calibrada.`);
  const order = { strong: 0, possible: 1, uncertain: 2 };
  return { pairs: [...pairs.values()].sort((a, b) => order[a.band] - order[b.band]), warnings: [...warnings] };
};
