const tokens = (value: string) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z0-9]{2,}/g) ?? [];

const genericTokens = new Set([
  'wine', 'wines', 'vino', 'vin', 'champagne', 'sparkling', 'vintage', 'fifth', 'tenth',
  'bottle', 'bottles', 'botella', 'magnum', 'linea', 'line', 'section', 'seccion',
  'brut', 'cava', 'reserve', 'reserva', 'blanco', 'tinto', 'rosado', 'rose', 'sec',
  'of', 'the', 'by', 'a', 'an', 'de', 'del', 'la', 'el', 'los', 'las',
  'glass', 'glasses', 'copa', 'copas', 'house', 'casa', 'red', 'white',
]);

export const hasGroundedMenuName = (name: string, source: string, producer = '') => {
  if (/\((?:wine|vino)\s*\d+\)/i.test(name)) return false;
  const visible = new Set(tokens(source));
  if (/^\d{3,4}$/.test(name.trim())) return visible.has(name.trim());
  const distinctive = (value: string) => tokens(value)
    .filter((token) => !genericTokens.has(token) && !/^\d+$/.test(token));
  const nameTokens = distinctive(name);
  return nameTokens.length > 0
    ? nameTokens.some((token) => visible.has(token))
    : distinctive(producer).some((token) => visible.has(token));
};
