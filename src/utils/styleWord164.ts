import { supabase } from '@/integrations/supabase/client';
import { cleanWineStyleName } from './wineStyleUtils';
import type { StoreAttributes138 } from './storeEstimate138';

// 164 (owner: «en estilos ponemos los de Matchrim»). The word next to the score is the Matchrim style that the
// wine_styles grid gives for the wine's five rounded attributes: the same names the profile uses. One small read per
// combination, remembered for the visit. A style whose colour contradicts the wine's type is not shown.
const cache = new Map<string, Promise<string | null>>();
const colour = (text: string | null | undefined) => /tint|red|rouge/i.test(text ?? '') ? 'tinto' : /rosad|ros[eé]/i.test(text ?? '') ? 'rosado' : /blanc|white/i.test(text ?? '') ? 'blanco' : null;
export const styleConflicts164 = (style: string, type: string | null | undefined) => { const a = colour(style), b = colour(type); return Boolean(a && b && a !== b); };
export const loadStyleWord164 = (attributes: StoreAttributes138 | null, type?: string | null): Promise<string | null> => {
  if (!attributes) return Promise.resolve(null);
  const values = [attributes.power, attributes.acidity, attributes.sweetness, attributes.tannin, attributes.fruity].map(value => Math.min(5, Math.max(0, Math.round(value))));
  const key = values.join(';');
  if (!cache.has(key)) cache.set(key, (async () => {
    try {
      const { data, error } = await supabase.from('wine_styles').select('name').eq('potente', values[0]).eq('acidez', values[1]).eq('dulce', values[2])
        .eq('tanico', values[3]).eq('afrutado', values[4]).limit(1).maybeSingle();
      if (error || !data?.name) { cache.delete(key); return null; }
      return cleanWineStyleName(data.name) || null;
    } catch { cache.delete(key); return null; }
  })());
  return cache.get(key)!.then(style => style && !styleConflicts164(style, type) ? style : null);
};
