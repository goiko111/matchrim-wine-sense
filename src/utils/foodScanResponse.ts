import { z } from 'zod';

// Legacy model percentages are accepted as input, never promoted to personal affinity.
const score = z.number().finite().min(0).max(100).nullable().transform(() => null);
const text = z.string();
const sensoryValue = z.number().finite().min(1).max(5).nullable();
const sensory = z.object({
  potencia: sensoryValue, acidez: sensoryValue,
  dulzura: sensoryValue, taninos: sensoryValue, afrutado: sensoryValue,
});
const recommendation = z.object({
  nombre: text.trim().min(1), tipo: text.nullable().transform((value) => value ?? ''),
  uvas: z.array(text).optional(), match: score, razon: text,
  atributos: sensory.nullable().optional(),
});
const dish = z.object({
  nombre: text.trim().min(1), categoria: text.nullable().transform((value) => value ?? ''),
  match: score, razon: text, recomendaciones: z.array(recommendation),
  source_text: text.optional(), source_order: z.number().int().nonnegative().optional(),
  confidence: z.number().finite().min(0).max(100).nullable().optional(),
  segmentation: z.enum(['direct', 'split']).optional(),
});
const foodScanResponse = z.object({
  mode: z.enum(['menu', 'dish']), summary: text,
  dishes: z.array(dish).max(60), has_profile: z.boolean(),
  profile_source: z.enum(['auth', 'client', 'none']).optional(), scan_version: text.optional(),
  coverage: z.object({
    estimated_visible_dishes: z.number().int().nonnegative().nullable().optional(),
    returned_dishes: z.number().int().nonnegative().optional(),
    unreadable_dishes: z.number().int().nonnegative().nullable().optional(),
    truncated: z.boolean().optional(), notes: z.array(text).optional(),
  }).optional(),
});

export type FoodScanResult = z.infer<typeof foodScanResponse>;
export type FoodDishResult = z.infer<typeof dish>;
export type FoodWineRecommendation = z.infer<typeof recommendation>;

export class FoodScanResponseError extends Error {}

export const parseFoodScanResponse = (value: unknown): FoodScanResult => {
  const parsed = foodScanResponse.safeParse(value);
  if (!parsed.success) {
    // Invalid confidence/affinity must not be clamped into a convincing score.
    throw new FoodScanResponseError('La respuesta del analisis no es valida. Vuelve a intentarlo con la misma foto o elige otra.');
  }
  return {
    ...parsed.data,
    summary: `${parsed.data.dishes.length} lecturas devueltas. La cobertura y disponibilidad no están verificadas.`,
    dishes: parsed.data.dishes.map((item) => ({
      ...item,
      // A wine questionnaire does not establish dietary, dessert or dish preferences.
      razon: '',
    })),
  };
};
