import { wineYearRoles105, type YearLine105 } from './wineYearRole105';
import { hasConflictingNativeVintage100 } from './nativeVintageEvidence100';

// 139: a clear label links by itself. Until now nothing was linked without a tap (286), so a bottle that plainly
// read «Pago de Cirsus · VIDURE · 2020» still made the person pick from ten wines of the winery. The decision is
// pure and deliberately narrow: exact whole words only (no misread tolerance), one single candidate, no contradiction.
// The same three steps in the scanner and in the candidate search, so the wait reads as one process.
export const SCAN_STEPS139 = ['Leyendo la etiqueta', 'Buscando el vino en Winerim', 'Comparando con tus gustos'] as const;

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss');
const words = (value: string) => fold(value).split(/[^a-z0-9]+/).filter(Boolean);
const stop = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'le', 'les', 'du', 'des', 'di', 'da', 'do', 'dos', 'das', 'et', 'y', 'e',
  'i', 'and', 'the', 'of', 'en', 'a', 'd', 'l', 'von', 'van', 'der', 'und', 'al']);
// A label rarely prints the producer's legal form («Bodegas», «S.L.»): it is not asked of the text read.
const legal = new Set(['bodega', 'bodegas', 'celler', 'cellers', 'adega', 'adegas', 'cellar', 'cellars', 'winery', 'wines', 'vinos',
  'vins', 'vini', 'sl', 'sa', 'slu', 'sat', 'scl', 'sca', 'coop', 'cooperativa', 'sociedad', 'cia', 'co', 'ltd', 'srl', 'spa', 'gmbh', 's', 'c']);
// Style, colour and grape words: a name made only of these («Tinto», «Cabernet Sauvignon») never links by itself.
const generic = new Set(('vino vin wine vinho tinto tinta blanco blanca rosado rose rouge blanc red white crianza reserva gran grand '
  + 'reserve brut nature extra seco sec dry semi dulce sweet roble joven barrica cosecha vendimia vintage edicion limitada especial '
  + 'seleccion tempranillo garnacha grenache mencia godello albarino verdejo viura macabeo monastrell syrah shiraz merlot cabernet '
  + 'sauvignon chardonnay pinot noir riesling malbec cava champagne').split(' '));
const year = /^(19|20)\d{2}$/;
const nameWords = (value: string) => [...new Set(words(value).filter(word => !stop.has(word) && !year.test(word)))];
const wineryWords = (value: string) => {
  const all = nameWords(value), own = all.filter(word => !legal.has(word));
  return own.length ? own : all;
};

export type AutoLinkCandidate139 = Readonly<{
  name: string; row: Readonly<{ winery?: string | null; vintage?: string | number | null }>;
  conflicts?: readonly string[]; vintageConflict?: boolean;
}>;

/** The text read has, as whole words, every word of the wine name and of its winery, and the name says enough. */
export const isClearLabel139 = (text: readonly string[], candidate: AutoLinkCandidate139) => {
  const read = new Set(text.flatMap(words)), name = nameWords(candidate.name), winery = wineryWords(candidate.row.winery ?? '');
  // Fewer than four letters («Uno», «PX») or only style words is not a name a phone reading can be trusted with.
  if (!winery.length || name.join('').length < 4 || name.every(word => generic.has(word))) return false;
  // A wine named exactly like its winery adds nothing to having read the winery: any sibling would pass too.
  if (name.every(word => winery.includes(word))) return false;
  return name.every(word => read.has(word)) && winery.every(word => read.has(word));
};

/**
 * 'fresh-read' is the automatic search right after a new reading. A search the person typed and an identity the
 * person corrected by hand never link by themselves: they are already choosing.
 */
export type AutoLinkSource139 = 'fresh-read' | 'typed-search' | 'manual-correction';

export const autoLink139 = <T extends AutoLinkCandidate139>(input: {
  source: AutoLinkSource139; text: readonly string[]; candidates: readonly T[]; vintage: number | null;
}): T | null => {
  if (input.source !== 'fresh-read' || !input.text.length || input.text.length > 100
    || input.text.some(line => typeof line !== 'string' || line.length > 1000)) return null;
  const clear = input.candidates.filter(candidate => isClearLabel139(input.text, candidate));
  if (clear.length !== 1) return null;
  const [only] = clear, harvest = only.row.vintage == null ? null : Number(only.row.vintage);
  // A visible colour, appellation or qualifier the sheet contradicts needs the person; so does a sheet of another
  // harvest, or a sheet with a harvest when the label gave none: linking it would invent the bottle's vintage.
  if (only.conflicts?.length || only.vintageConflict || (harvest !== null && harvest !== input.vintage)
    || hasConflictingNativeVintage100({ name: only.name, vintage: only.row.vintage ?? null })) return null;
  return only;
};

// 140: on the owner's bottle the label printed a huge «·2020·» and the sheet still said «Añada no indicada». The
// reading also held «Esta es la botella número 1927»: two bare years, so none was taken. A numbered bottle or lot, or
// digits glued to a larger number or decimal, are not a harvest; and a year printed alone on its line is the vintage.
const numbered140 = (text: string, year: number) => new RegExp(`(?:\\b(?:numero|num|nro|no|n|botella|bottle|bouteille|bottiglia|garrafa|flasche|lote|lot)\\s*[.:ºo°]*\\s*|[#º°]\\s*)${year}\\b`).test(text)
  || new RegExp(`\\d[.,/-]${year}\\b|\\b${year}[.,/]\\d`).test(text);
/** «2020», «·2020·», «- 2 0 2 0 -»: nothing but one 19xx/20xx year on the line. */
const alone140 = (text: string) => {
  const core = text.replace(/[^\p{L}\p{N}]+/gu, '');
  return year.test(core) ? Number(core) : null;
};

/**
 * The bottle's vintage when the text read supports exactly one: a 19xx/20xx year that is not in the future and is not
 * a medal, a foundation, a bottling date (105) or a bottle/lot number. With several possible years, one explicitly
 * marked («Cosecha 2020») is taken; failing that, the only one printed alone on its line; otherwise none, never a guess.
 */
export const labelVintage139 = (input: readonly YearLine105[]): number | null => {
  // 105 examines at most eight years per line: beyond that a hidden date could change the answer.
  if (!Array.isArray(input) || input.some(line => (line?.text?.match?.(/\b(?:19|20)\d{2}\b/g)?.length ?? 0) > 8)) return null;
  // Large digits are often read spaced («2 0 2 0»): a line that is only a year is given to 105 as that year.
  const lines = input.map(line => typeof line?.text === 'string' && alone140(line.text) !== null ? { ...line, text: String(alone140(line.text)) } : line);
  const years = wineYearRoles105(lines);
  if (!years.supported) return null;
  const folded = lines.map(line => fold(line.text));
  const possible = years.roles.filter(role => (role.role === 'vintage' || role.role === 'unclassified')
    // A year that only ever appears as a number («botella número 1927», «L-12/2020») is left out; marked ones stay.
    && (role.role === 'vintage' || folded.some(text => new RegExp(`\\b${role.year}\\b`).test(text) && !numbered140(text, role.year))));
  if (possible.length === 1) return possible[0].year;
  const marked = possible.filter(role => role.role === 'vintage');
  if (marked.length) return marked.length === 1 ? marked[0].year : null;
  const single = possible.filter(role => lines.some(line => alone140(line.text) === role.year));
  return single.length === 1 ? single[0].year : null;
};
