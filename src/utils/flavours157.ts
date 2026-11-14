// 157: «A qué sabe» was only prose. Winerim's tasting note names what the wine smells and tastes of; the words it
// uses are matched to a few families so the sheet can show them as pictures (the owner's OK to idea 5). Only what
// the note says is shown: nothing is inferred from the wine's type or grape, and «sin madera» shows no wood.
export type FlavourId157 = 'roja' | 'negra' | 'citricos' | 'manzana' | 'hueso' | 'tropical' | 'flor' | 'hierbas' | 'especias' | 'vainilla'
  | 'tostados' | 'frutosSecos' | 'madera' | 'cuero' | 'tierra' | 'mineral' | 'miel' | 'bolleria';
const FAMILIES: [FlavourId157, string, RegExp][] = [
  ['roja', 'Fruta roja', /cereza|guinda|fresa|frambuesa|grosella|frutas? rojas?|frutos rojos/],
  ['negra', 'Fruta negra', /\bmoras?\b|arandano|ciruela|cassis|frutas? negras?|frutos negros/],
  ['citricos', 'Cítricos', /limon|\blima\b|pomelo|citric|naranja|mandarina/],
  ['manzana', 'Manzana y pera', /manzana|\bperas?\b|membrillo|frutas? blancas?/],
  ['hueso', 'Fruta de hueso', /melocoton|albaricoque|nectarina|frutas? de hueso/],
  ['tropical', 'Fruta tropical', /mango|\bpina\b|maracuya|tropical|platano|lichi/],
  ['flor', 'Flores', /\bflor(es)?\b|floral|violeta|\brosas?\b|jazmin|azahar|lavanda/],
  ['hierbas', 'Hierbas', /hierba|herbace|menta|eucalipto|tomillo|romero|hinojo|monte bajo|balsamic/],
  ['especias', 'Especias', /especia|pimienta|\bclavo\b|canela|\banis\b|regaliz/],
  ['vainilla', 'Vainilla', /vainilla|\bcoco\b/],
  ['tostados', 'Tostados y café', /tostad|\bcafe\b|torrefact|ahumad|cacao|chocolate/],
  ['frutosSecos', 'Frutos secos', /avellana|almendra|\bnuez\b|nueces|frutos secos/],
  ['madera', 'Madera', /madera|\broble\b|cedro|barrica/],
  ['cuero', 'Cuero', /cuero|tabaco/],
  ['tierra', 'Tierra y trufa', /trufa|terros|sotobosque|champin|\bsetas?\b|hongos/],
  ['mineral', 'Mineral', /mineral|pizarra|pedernal|salin|\btiza\b/],
  ['miel', 'Miel y fruta pasa', /\bmiel\b|\bpasas?\b|datil|\bhigos?\b|orejon|confitad|compota|mermelada/],
  ['bolleria', 'Mantequilla y bollería', /mantequilla|brioche|bolleria|levadura|panaderia|pan tostado/],
];
const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/** Families named by the note, in the order the note names them (at most `max`). */
export const flavours157 = (texts: (string | null | undefined)[], max = 6): { id: FlavourId157; label: string }[] => {
  // A denied flavour («sin madera», «nada de vainilla», «no hay notas de cuero») is dropped with the two words after it.
  const text = fold(texts.filter(Boolean).join(' . ')).replace(/\b(sin|nada de|ni|no hay|no tiene|ausencia de)\s+(notas? de\s+|rastro de\s+)?\S+(\s+\S+)?/g, ' ');
  return FAMILIES.map(([id, label, pattern]) => ({ id, label, at: text.search(pattern) })).filter(item => item.at >= 0)
    .sort((a, b) => a.at - b.at).slice(0, max).map(({ id, label }) => ({ id, label }));
};
