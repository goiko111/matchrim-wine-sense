// Inspect identity/type fields only: tasting notes and mixed section headings
// can mention spirits without changing the category of a grape wine.
const normalize = (value: unknown) => typeof value === 'string'
  ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
const excludedCategory = /\b(sake|sakee|nihonshu|junmai|ginjo|daiginjo|honjozo|shochu|soju|tequila|mezcal|baileys|irish cream|whisky|whiskey|vodka|ginebra|gin|rum|ron|brandy|cognac|armagnac|beer|bier|cerveza|cider|sidra|vermut|vermouth|cocktail|coctel|liqueur|liquor|licor|destilados?|spirits?)\b/;

export const isNonWineIdentity = (...fields: unknown[]): boolean =>
  fields.some((field) => excludedCategory.test(normalize(field)));
