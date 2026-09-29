export interface WineMenuIdentityFields {
  nombre?: string | null;
  tipo?: string | null;
  seccion?: string | null;
}

const nonWinePattern = /\b(vermut|vermouth|cerveza|beer|bier|sidra|cider|whisky|whiskey|ginebra|gin|vodka|ron|rum|cocktail|coctel|licor|destilado|destilados|spirits?)\b/i;
const wineTypePattern = /\b(tinto|blanco|rosado|espumoso|generoso|dulce|fortificado|orange|natural|champagne|cava|sherry|jerez)\b/i;
const genericIdentityPattern = /^(cha|chat|chate|chateau|champagne|cava|vino|wine|blanco|tinto|rosado|reserva|brut)$/i;

export const isWineMenuItem = (wine: WineMenuIdentityFields) => {
  const nameAndType = `${wine.nombre || ''} ${wine.tipo || ''}`.trim();
  if (!nameAndType || nonWinePattern.test(nameAndType)) return false;
  if (genericIdentityPattern.test((wine.nombre || '').trim())) return false;
  return !nonWinePattern.test(wine.seccion || '') || wineTypePattern.test(wine.tipo || '');
};
