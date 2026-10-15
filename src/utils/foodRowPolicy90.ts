type FoodRow = { nombre?: string; source_text?: string };
export type FoodRowPolicy90 = {
  status: 'unknown' | 'coming_soon' | 'unavailable' | 'conditional' | 'needs_clarification';
  pairingAllowed: boolean;
  label: string;
  evidence: string | null;
};

// These are explicit OCR-text safeguards, not verification of restaurant stock,
// current date, dish identity, dietary suitability or the original pixels.
export const foodRowPolicy90 = (dish: FoodRow): FoodRowPolicy90 => {
  const evidence = dish.source_text?.trim() || null;
  const text = (evidence ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\bcoming\s+soon\b|\bproximamente\b/.test(text)) {
    return { status: 'coming_soon', pairingAllowed: false, label: 'Próximamente · no disponible', evidence };
  }
  if (/\bask\s+us\b|\bconsult(?:a|ar|anos)\b|\bpreguntanos\b/.test(text)) {
    return { status: 'needs_clarification', pairingAllowed: false, label: 'Confirmar plato con el restaurante', evidence };
  }
  const words = text.match(/[\p{L}]+/gu) ?? [];
  if (/\d/.test(text) && words.every((word) => ['sm', 'lg', 'small', 'large', 'lb', 'lbs', 'kg', 'g', 'oz', 'eur', 'usd'].includes(word))) {
    return { status: 'needs_clarification', pairingAllowed: false, label: 'Falta identificar el plato de esta línea', evidence };
  }
  const englishDays = '(?:weekends?|weekdays?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)';
  const conditional = new RegExp(`\\b${englishDays}\\s+only\\b|\\b(?:unavailable|not available|only|except|on)\\s+${englishDays}\\b`).test(text)
    || /\b(?:sat|sun)\s*:|\b(?:solo|excepto)\s+(?:los\s+)?(?:lunes|martes|miercoles|jueves|viernes|sabados?|domingos?|fines?\s+de\s+semana)\b/.test(text);
  if (conditional) {
    return { status: 'conditional', pairingAllowed: true, label: 'Disponibilidad según el día · confirmar', evidence };
  }
  if (!/\bnot\s+unavailable\b/.test(text)
    && /\bsold\s+out\b|\bnot\s+available\b|\bunavailable\b|\bagotad[oa]s?\b|\bno\s+disponible\b/.test(text)) {
    return { status: 'unavailable', pairingAllowed: false, label: 'No disponible según la lectura', evidence };
  }
  return { status: 'unknown', pairingAllowed: true, label: 'Disponibilidad sin confirmar', evidence };
};

export const foodPairingContext90 = (dishes: FoodRow[]): string => dishes
  .filter((dish) => foodRowPolicy90(dish).pairingAllowed)
  .map((dish) => dish.source_text || dish.nombre || '').filter(Boolean).join('\n').slice(0, 12000);
