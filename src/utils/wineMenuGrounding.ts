import { hasGroundedMenuName } from '../../supabase/functions/_shared/matchrim-menu-grounding';

export interface WineMenuIdentityFields {
  nombre?: string | null;
  productor?: string | null;
  texto_fuente?: string | null;
  tipo?: string | null;
  seccion?: string | null;
}

const nonWinePattern = /\b(vermut|vermouth|cerveza|beer|bier|sidra|cider|whisky|whiskey|ginebra|gin|vodka|ron|rum|cocktail|coctel|licor|destilado|destilados|spirits?)\b/i;
const wineTypePattern = /\b(tinto|blanco|rosado|espumoso|generoso|dulce|fortificado|orange|natural|champagne|cava|sherry|jerez)\b/i;
const genericIdentityPattern = /^(cha|chat|chate|chateau|champagne|cava|vino|wine|blanco|tinto|rosado|reserva|brut)$/i;

export const isWineMenuItem = (wine: WineMenuIdentityFields) => {
  const nameAndType = `${wine.nombre || ''} ${wine.tipo || ''}`.trim();
  if (!nameAndType || nonWinePattern.test(nameAndType)) return false;
  if (!hasGroundedMenuName(wine.nombre || '', wine.texto_fuente || wine.nombre || '', wine.productor || '')) return false;
  const hasSpecificProducer = Boolean((wine.productor || '').trim().match(/[a-z0-9]{3,}/i));
  const sourceSupportsProducer = hasSpecificProducer
    && (wine.texto_fuente || '').toLowerCase().includes((wine.productor || '').trim().toLowerCase());
  if (genericIdentityPattern.test((wine.nombre || '').trim()) && !sourceSupportsProducer) return false;
  return !nonWinePattern.test(wine.seccion || '') || wineTypePattern.test(wine.tipo || '');
};
