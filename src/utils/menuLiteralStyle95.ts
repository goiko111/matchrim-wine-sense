import { isNonWineIdentity } from './wineCategory';
import { isWineMenuItem, type WineMenuIdentityFields } from './wineMenuGrounding';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const containsPhrase = (source: string, phrase: string) => (` ${source} `).includes(` ${phrase} `);

// Complete varietal/family names, not a bag of grape tokens or bottle identities.
const styles = new Set([
  'aglianico', 'agiorgitiko', 'albarino', 'assyrtiko', 'barbera', 'cabernet franc', 'cabernet sauvignon',
  'carignan', 'carmenere', 'chardonnay', 'chenin blanc', 'cortese', 'falanghina', 'fiano', 'glera', 'graciano', 'grillo',
  'gewurztraminer', 'godello', 'garnacha', 'grenache', 'gruner veltliner', 'malbec', 'merlot',
  'mencia', 'monastrell', 'mourvedre', 'moscatel', 'moscato', 'nebbiolo', 'nero d avola',
  'muller thurgau', 'petit verdot', 'pinotage', 'pinot blanc', 'pinot grigio', 'pinot gris', 'pinot noir', 'riesling', 'sangiovese',
  'sauvignon blanc', 'semillon', 'shiraz', 'syrah', 'tempranillo', 'torrontes', 'trebbiano',
  'touriga nacional', 'verdicchio', 'verdejo', 'vermentino', 'viognier', 'zinfandel', 'macabeo', 'parellada', 'xarel lo',
  'prosecco', 'cava', 'champagne', 'cremant', 'spumante', 'frizzante',
  'sherry', 'jerez', 'fino', 'manzanilla', 'amontillado', 'oloroso', 'palo cortado', 'port', 'oporto',
]);
const modifiers = [
  'blush', 'rose', 'rosado', 'rosada', 'rosato', 'red', 'white', 'tinto', 'tinta', 'blanco', 'blanca',
  'rosso', 'bianco', 'dry', 'seco', 'seca', 'sweet', 'dulce', 'semi seco', 'semiseco',
  'off dry', 'brut', 'extra brut', 'brut nature', 'extra dry', 'demi sec', 'sec', 'doux',
];
const headings = new Set([
  'wine', 'wines', 'vino', 'vinos', 'vin', 'vins', 'white', 'red', 'rose', 'blanc',
  'blanco', 'blancos', 'tinto', 'tintos', 'rosado', 'rosados', 'rosada', 'rosadas', 'rosato', 'rosso', 'bianco',
  'sparkling', 'fizz', 'espumoso', 'espumosos', 'fortified', 'fortificado', 'fortificados', 'generoso', 'generosos', 'dessert',
]);
const contextWords = new Set([
  ...headings, ...[...styles, ...modifiers].flatMap(phrase => phrase.split(' ')),
  'list', 'lista', 'carta', 'section', 'seccion', 'btl', 'bottle', 'bottles', 'botella', 'botellas',
  'glass', 'glasses', 'copa', 'copas', 'ml', 'cl', 'l', 'eur', 'gbp', 'usd', 'chf', 'mxn', 'jpy',
]);
const servingPhrases = (value: string) => value.replace(/\b(?:by (?:the )?|per )(?:glass|bottle)\b/g, '').trim();
const allowedContext = (source: string) => servingPhrases(source).split(' ').filter(Boolean)
  .every(word => contextWords.has(word) || /^\d+(?:ml|cl|l)?$/.test(word));
const completeStyle = (name: string) => {
  let candidates = new Set([name]);
  // At most two literal colour/dryness modifiers around one complete style.
  for (let depth = 0; depth <= 2; depth++) {
    if ([...candidates].some(value => styles.has(value))) return true;
    candidates = new Set([...candidates].flatMap(value => modifiers.flatMap(modifier => [
      ...(value.startsWith(modifier + ' ') ? [value.slice(modifier.length + 1)] : []),
      ...(value.endsWith(' ' + modifier) ? [value.slice(0, -modifier.length - 1)] : []),
    ])));
  }
  return false;
};

// Vocabulary reuse only: this does not classify or confirm any bottle identity.
export const isLiteralWineStyleName95 = (name: string): boolean => typeof name === 'string'
  && name.trim().length > 0 && name.length <= 120 && completeStyle(normalize(name));

/** Retain a literal generic style as pending, never as a confirmed/named bottle.
 * Does not validate prices, supply identity, attributes, affinity or save authority.
 * Requires bounded row/section source; unknown prose/brands fail closed.
 */
export const isLiteralWineStyle95 = (input: WineMenuIdentityFields): boolean => {
  if (!input || typeof input !== 'object') return false;
  for (const value of [input.nombre, input.productor, input.texto_fuente, input.tipo, input.seccion]) {
    if (value != null && typeof value !== 'string') return false;
  }
  const rawName = input.nombre?.trim() ?? '';
  if (!rawName || rawName.length > 120 || !/^[\p{L}\p{M}\s'\u2019\u00b7-]+$/u.test(rawName)
    || input.productor?.trim() || !input.texto_fuente?.trim() || input.texto_fuente.length > 6000) return false;
  const name = normalize(rawName), source = normalize(input.texto_fuente);
  const section = normalize(input.seccion ?? ''), type = normalize(input.tipo ?? '');
  if (!completeStyle(name) || !containsPhrase(source, name)
    || isNonWineIdentity(rawName, input.tipo, input.seccion, input.texto_fuente)) return false;
  if (section && (!containsPhrase(source, section) || !allowedContext(section))) return false;
  if (type && !type.split(' ').every(word => headings.has(word) || modifiers.includes(word))) return false;
  // No source fallback to the candidate name, producer guess, or inferred category.
  const outsideName = (` ${source} `).split(` ${name} `).join(' ');
  return outsideName.split(' ').some(word => headings.has(word)) && allowedContext(source);
};

// Native opt-in only. Both booleans are inclusion predicates, not identity gates.
export const isNativeWineMenuItem95 = (input: WineMenuIdentityFields): boolean =>
  isWineMenuItem(input) || isLiteralWineStyle95(input);
