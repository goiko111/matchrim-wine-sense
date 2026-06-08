export const WINE_TYPES = [
  'Espumoso',
  'Blanco',
  'Tinto',
  'Rosado',
  'Dulce',
  'Fortificado',
] as const;

export type WineType = (typeof WINE_TYPES)[number];

export const DIAGNOSTIC_STYLE = 'Sin encaje por tipo' as const;

export const PUBLIC_WINE_STYLES = [
  'Tinto Versátil',
  'Tinto de Estructura',
  'Tinto Goloso',
  'Tinto Ligero',
  'Blanco Goloso',
  'Blanco Vital',
  'Blanco de Carácter',
  'Brut Elegante',
  'Burbuja Fresca',
  'Rosado Ligero',
  'Rosado Gastronómico',
  'Dulce Ligero',
  'Dulce Intenso',
  'Oxidativo/Maduro',
  'Experimental',
  'Vino de Terruño',
] as const;

export type PublicWineStyle = (typeof PUBLIC_WINE_STYLES)[number];
export type WinerimStyle = PublicWineStyle | typeof DIAGNOSTIC_STYLE;

export type ReassignmentFlag =
  | 'directo'
  | 'auto_reasignado'
  | 'auto_reasignado_revisar'
  | 'sin_encaje';

type AttributeKey = 'P' | 'A' | 'D' | 'T' | 'Af';
type Range = readonly [number, number];
type StyleRanges = Record<AttributeKey, Range>;

export interface SensoryAttributes {
  potente: number | string;
  acidez: number | string;
  dulzura: number | string;
  taninos: number | string;
  afrutado: number | string;
}

export interface ClassificationAlternative {
  estilo: PublicWineStyle;
  encaje: number;
}

export interface WineClassification {
  estiloFinal: WinerimStyle;
  estiloOrigen: PublicWineStyle;
  encajePct: number;
  flag: ReassignmentFlag;
  alternativas: ClassificationAlternative[];
}

export interface WineStyleCatalogItem {
  id: number;
  estilo: WinerimStyle;
  tiposCompatibles: WineType[];
  rangos: StyleRanges | null;
  combinacionesV3: number;
  casosMatrizV41: number;
  visiblePublicamente: boolean;
}

export const AUTO_SILENT_THRESHOLD = 90;
export const AUTO_REVIEW_THRESHOLD = 75;
const EXCLUDED_FROM_REASSIGNMENT = new Set<PublicWineStyle>(['Experimental']);

export const STYLE_COMPATIBILITY: Record<PublicWineStyle, WineType[]> = {
  'Tinto Versátil': ['Tinto'],
  'Tinto de Estructura': ['Tinto'],
  'Tinto Goloso': ['Tinto'],
  'Tinto Ligero': ['Tinto'],
  'Blanco Goloso': ['Blanco'],
  'Blanco Vital': ['Blanco'],
  'Blanco de Carácter': ['Blanco'],
  'Brut Elegante': ['Espumoso'],
  'Burbuja Fresca': ['Espumoso'],
  'Rosado Ligero': ['Rosado'],
  'Rosado Gastronómico': ['Rosado'],
  'Dulce Ligero': ['Dulce'],
  'Dulce Intenso': ['Dulce'],
  'Oxidativo/Maduro': ['Fortificado'],
  Experimental: ['Espumoso', 'Blanco', 'Tinto', 'Rosado', 'Dulce', 'Fortificado'],
  'Vino de Terruño': ['Tinto', 'Blanco'],
};

export const STYLE_RANGES: Record<PublicWineStyle, StyleRanges> = {
  'Tinto Versátil': { P: [0, 5], A: [2, 5], D: [0, 4], T: [2, 5], Af: [0, 3] },
  'Tinto de Estructura': { P: [4, 5], A: [0, 5], D: [0, 4], T: [4, 5], Af: [0, 5] },
  'Tinto Goloso': { P: [0, 3], A: [0, 5], D: [0, 4], T: [2, 5], Af: [4, 5] },
  'Tinto Ligero': { P: [0, 2], A: [0, 5], D: [0, 4], T: [2, 3], Af: [0, 3] },
  'Blanco Goloso': { P: [0, 5], A: [0, 5], D: [2, 4], T: [0, 1], Af: [3, 5] },
  'Blanco Vital': { P: [0, 5], A: [4, 5], D: [0, 2], T: [0, 1], Af: [0, 2] },
  'Blanco de Carácter': { P: [0, 5], A: [2, 5], D: [0, 2], T: [0, 1], Af: [0, 2] },
  'Brut Elegante': { P: [0, 5], A: [4, 5], D: [0, 1], T: [0, 2], Af: [3, 5] },
  'Burbuja Fresca': { P: [0, 5], A: [3, 5], D: [2, 3], T: [0, 2], Af: [3, 5] },
  'Rosado Ligero': { P: [0, 2], A: [0, 5], D: [0, 3], T: [0, 3], Af: [3, 5] },
  'Rosado Gastronómico': { P: [3, 5], A: [0, 5], D: [0, 3], T: [0, 3], Af: [3, 5] },
  'Dulce Ligero': { P: [0, 2], A: [0, 5], D: [4, 5], T: [0, 3], Af: [0, 5] },
  'Dulce Intenso': { P: [3, 5], A: [0, 5], D: [4, 5], T: [0, 5], Af: [0, 5] },
  'Oxidativo/Maduro': { P: [0, 5], A: [0, 3], D: [0, 5], T: [0, 5], Af: [0, 2] },
  Experimental: { P: [0, 5], A: [0, 5], D: [0, 5], T: [0, 5], Af: [0, 5] },
  'Vino de Terruño': { P: [0, 5], A: [2, 5], D: [0, 4], T: [4, 5], Af: [0, 3] },
};

export const WINE_STYLE_CATALOG: WineStyleCatalogItem[] = [
  { id: 1, estilo: 'Tinto Versátil', tiposCompatibles: ['Tinto'], rangos: STYLE_RANGES['Tinto Versátil'], combinacionesV3: 572, casosMatrizV41: 1468, visiblePublicamente: true },
  { id: 2, estilo: 'Tinto de Estructura', tiposCompatibles: ['Tinto'], rangos: STYLE_RANGES['Tinto de Estructura'], combinacionesV3: 624, casosMatrizV41: 1076, visiblePublicamente: true },
  { id: 3, estilo: 'Tinto Goloso', tiposCompatibles: ['Tinto'], rangos: STYLE_RANGES['Tinto Goloso'], combinacionesV3: 352, casosMatrizV41: 2170, visiblePublicamente: true },
  { id: 4, estilo: 'Tinto Ligero', tiposCompatibles: ['Tinto'], rangos: STYLE_RANGES['Tinto Ligero'], combinacionesV3: 672, casosMatrizV41: 2060, visiblePublicamente: true },
  { id: 5, estilo: 'Blanco Goloso', tiposCompatibles: ['Blanco'], rangos: STYLE_RANGES['Blanco Goloso'], combinacionesV3: 1008, casosMatrizV41: 2778, visiblePublicamente: true },
  { id: 6, estilo: 'Blanco Vital', tiposCompatibles: ['Blanco'], rangos: STYLE_RANGES['Blanco Vital'], combinacionesV3: 216, casosMatrizV41: 444, visiblePublicamente: true },
  { id: 7, estilo: 'Blanco de Carácter', tiposCompatibles: ['Blanco'], rangos: STYLE_RANGES['Blanco de Carácter'], combinacionesV3: 648, casosMatrizV41: 1014, visiblePublicamente: true },
  { id: 8, estilo: 'Brut Elegante', tiposCompatibles: ['Espumoso'], rangos: STYLE_RANGES['Brut Elegante'], combinacionesV3: 432, casosMatrizV41: 2232, visiblePublicamente: true },
  { id: 9, estilo: 'Burbuja Fresca', tiposCompatibles: ['Espumoso'], rangos: STYLE_RANGES['Burbuja Fresca'], combinacionesV3: 432, casosMatrizV41: 4500, visiblePublicamente: true },
  { id: 10, estilo: 'Rosado Ligero', tiposCompatibles: ['Rosado'], rangos: STYLE_RANGES['Rosado Ligero'], combinacionesV3: 264, casosMatrizV41: 3870, visiblePublicamente: true },
  { id: 11, estilo: 'Rosado Gastronómico', tiposCompatibles: ['Rosado'], rangos: STYLE_RANGES['Rosado Gastronómico'], combinacionesV3: 264, casosMatrizV41: 3690, visiblePublicamente: true },
  { id: 12, estilo: 'Dulce Ligero', tiposCompatibles: ['Dulce'], rangos: STYLE_RANGES['Dulce Ligero'], combinacionesV3: 648, casosMatrizV41: 3708, visiblePublicamente: true },
  { id: 13, estilo: 'Dulce Intenso', tiposCompatibles: ['Dulce'], rangos: STYLE_RANGES['Dulce Intenso'], combinacionesV3: 648, casosMatrizV41: 3888, visiblePublicamente: true },
  { id: 14, estilo: 'Oxidativo/Maduro', tiposCompatibles: ['Fortificado'], rangos: STYLE_RANGES['Oxidativo/Maduro'], combinacionesV3: 360, casosMatrizV41: 7596, visiblePublicamente: true },
  { id: 15, estilo: 'Experimental', tiposCompatibles: [...WINE_TYPES], rangos: STYLE_RANGES.Experimental, combinacionesV3: 180, casosMatrizV41: 1080, visiblePublicamente: true },
  { id: 16, estilo: 'Vino de Terruño', tiposCompatibles: ['Tinto', 'Blanco'], rangos: STYLE_RANGES['Vino de Terruño'], combinacionesV3: 456, casosMatrizV41: 4182, visiblePublicamente: true },
  { id: 17, estilo: DIAGNOSTIC_STYLE, tiposCompatibles: [], rangos: null, combinacionesV3: 0, casosMatrizV41: 900, visiblePublicamente: false },
];

const TYPE_ALIASES: Record<string, WineType> = {
  espumoso: 'Espumoso',
  sparkling: 'Espumoso',
  cava: 'Espumoso',
  champagne: 'Espumoso',
  blanco: 'Blanco',
  white: 'Blanco',
  tinto: 'Tinto',
  red: 'Tinto',
  rosado: 'Rosado',
  rose: 'Rosado',
  rosé: 'Rosado',
  dulce: 'Dulce',
  sweet: 'Dulce',
  postre: 'Dulce',
  dessert: 'Dulce',
  fortificado: 'Fortificado',
  fortified: 'Fortificado',
  generoso: 'Fortificado',
  jerez: 'Fortificado',
  oporto: 'Fortificado',
  sherry: 'Fortificado',
  port: 'Fortificado',
};

const roundOneDecimal = (value: number) => Math.round(value * 10) / 10;

export const normalizeWineType = (value: unknown): WineType | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return TYPE_ALIASES[normalized] ?? null;
};

const normalizeAttribute = (name: string, value: number | string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${name} debe ser un entero entre 0 y 5`);
  }
  if (parsed < 0 || parsed > 5) {
    throw new Error(`${name} debe estar entre 0 y 5`);
  }
  return parsed;
};

export const clasificarPorAtributos = (
  potente: number | string,
  acidez: number | string,
  dulzura: number | string,
  taninos: number | string,
  afrutado: number | string,
): PublicWineStyle => {
  const p = normalizeAttribute('potente', potente);
  const a = normalizeAttribute('acidez', acidez);
  const d = normalizeAttribute('dulzura', dulzura);
  const t = normalizeAttribute('taninos', taninos);
  const af = normalizeAttribute('afrutado', afrutado);

  if (d === 5) return p >= 3 ? 'Dulce Intenso' : 'Dulce Ligero';

  if (a >= 4 && af >= 3 && d <= 3) {
    return d <= 1 ? 'Brut Elegante' : 'Burbuja Fresca';
  }

  if (t <= 1) {
    if (a >= 4 && d <= 2) return 'Blanco Vital';
    if (d >= 2 && af >= 3) return 'Blanco Goloso';
    if (a >= 2) return 'Blanco de Carácter';
    return 'Blanco Goloso';
  }

  if (t >= 2 && t <= 3 && af >= 4) {
    return p <= 2 ? 'Rosado Ligero' : 'Rosado Gastronómico';
  }

  if (t >= 2) {
    if (af >= 4 && p <= 3) return 'Tinto Goloso';
    if (p <= 2 && t <= 3) return 'Tinto Ligero';
    if (p >= 4 && t >= 4) return 'Tinto de Estructura';
    if (t >= 4 && af <= 2 && a <= 2) return 'Oxidativo/Maduro';
    if (t >= 4 && a >= 2) return 'Vino de Terruño';
    if (a >= 4 && t >= 2 && af <= 2) return 'Experimental';
    return 'Tinto Versátil';
  }

  if (af >= 4) return 'Blanco Goloso';
  if (a >= 4) return 'Blanco Vital';
  return 'Blanco de Carácter';
};

export const esCompatible = (estilo: PublicWineStyle, tipo: WineType): boolean =>
  STYLE_COMPATIBILITY[estilo]?.includes(tipo) ?? false;

export const calcularEncaje = (
  potente: number | string,
  acidez: number | string,
  dulzura: number | string,
  taninos: number | string,
  afrutado: number | string,
  estilo: PublicWineStyle,
): number => {
  const ranges = STYLE_RANGES[estilo];
  const values: Record<AttributeKey, number> = {
    P: normalizeAttribute('potente', potente),
    A: normalizeAttribute('acidez', acidez),
    D: normalizeAttribute('dulzura', dulzura),
    T: normalizeAttribute('taninos', taninos),
    Af: normalizeAttribute('afrutado', afrutado),
  };

  const encaje = (Object.keys(values) as AttributeKey[]).reduce((total, key) => {
    const [min, max] = ranges[key];
    const value = values[key];
    if (value >= min && value <= max) return total + 20;

    const distance = Math.min(Math.abs(value - min), Math.abs(value - max));
    return total + Math.max(0, 20 - (distance / 5) * 20);
  }, 0);

  return roundOneDecimal(encaje);
};

const specificity = (estilo: PublicWineStyle): number =>
  Object.values(STYLE_RANGES[estilo]).reduce((total, [min, max]) => total + max - min, 0);

export const estilosDelTipo = (tipo: WineType, incluirExcluidos = false): PublicWineStyle[] =>
  PUBLIC_WINE_STYLES.filter((estilo) => {
    if (!STYLE_COMPATIBILITY[estilo].includes(tipo)) return false;
    return incluirExcluidos || !EXCLUDED_FROM_REASSIGNMENT.has(estilo);
  });

export const calcularAlternativas = (
  potente: number | string,
  acidez: number | string,
  dulzura: number | string,
  taninos: number | string,
  afrutado: number | string,
  tipo: WineType,
): ClassificationAlternative[] =>
  estilosDelTipo(tipo)
    .map((estilo) => ({
      estilo,
      encaje: calcularEncaje(potente, acidez, dulzura, taninos, afrutado, estilo),
    }))
    .sort((a, b) => b.encaje - a.encaje || specificity(a.estilo) - specificity(b.estilo) || a.estilo.localeCompare(b.estilo, 'es'));

export const clasificarVino = (
  potente: number | string,
  acidez: number | string,
  dulzura: number | string,
  taninos: number | string,
  afrutado: number | string,
  tipoInput: WineType | string,
): WineClassification => {
  const p = normalizeAttribute('potente', potente);
  const a = normalizeAttribute('acidez', acidez);
  const d = normalizeAttribute('dulzura', dulzura);
  const t = normalizeAttribute('taninos', taninos);
  const af = normalizeAttribute('afrutado', afrutado);
  const tipo = normalizeWineType(tipoInput);

  if (!tipo) {
    throw new Error(`Tipo invalido. Debe ser uno de: ${WINE_TYPES.join(', ')}`);
  }

  const estiloOrigen = clasificarPorAtributos(p, a, d, t, af);

  if (esCompatible(estiloOrigen, tipo)) {
    return {
      estiloFinal: estiloOrigen,
      estiloOrigen,
      encajePct: 100,
      flag: 'directo',
      alternativas: [],
    };
  }

  const alternativas = calcularAlternativas(p, a, d, t, af, tipo);
  const best = alternativas[0];

  if (!best) {
    return {
      estiloFinal: DIAGNOSTIC_STYLE,
      estiloOrigen,
      encajePct: 0,
      flag: 'sin_encaje',
      alternativas: [],
    };
  }

  if (best.encaje >= AUTO_SILENT_THRESHOLD) {
    return {
      estiloFinal: best.estilo,
      estiloOrigen,
      encajePct: best.encaje,
      flag: 'auto_reasignado',
      alternativas: alternativas.slice(0, 3),
    };
  }

  if (best.encaje >= AUTO_REVIEW_THRESHOLD) {
    return {
      estiloFinal: best.estilo,
      estiloOrigen,
      encajePct: best.encaje,
      flag: 'auto_reasignado_revisar',
      alternativas: alternativas.slice(0, 3),
    };
  }

  return {
    estiloFinal: DIAGNOSTIC_STYLE,
    estiloOrigen,
    encajePct: best.encaje,
    flag: 'sin_encaje',
    alternativas: alternativas.slice(0, 3),
  };
};

export const inferWineTypeFromStyle = (
  estiloInput?: string | null,
  attributes?: Partial<SensoryAttributes>,
): WineType | null => {
  const estilo = PUBLIC_WINE_STYLES.find((style) => style.toLowerCase() === estiloInput?.trim().toLowerCase());
  if (estilo) {
    const compatibleTypes = STYLE_COMPATIBILITY[estilo];
    if (compatibleTypes.length === 1) return compatibleTypes[0];
    if (estilo === 'Vino de Terruño') return 'Tinto';
  }

  if (!attributes) return null;

  const dulzura = attributes.dulzura === undefined ? null : Number(attributes.dulzura);
  const taninos = attributes.taninos === undefined ? null : Number(attributes.taninos);
  const acidez = attributes.acidez === undefined ? null : Number(attributes.acidez);
  const afrutado = attributes.afrutado === undefined ? null : Number(attributes.afrutado);
  const potente = attributes.potente === undefined ? null : Number(attributes.potente);

  if (dulzura !== null && dulzura >= 4) return 'Dulce';
  if (acidez !== null && afrutado !== null && taninos !== null && acidez >= 4 && afrutado >= 3 && taninos <= 2) return 'Espumoso';
  if (taninos !== null && afrutado !== null && potente !== null && taninos <= 3 && afrutado >= 3 && potente <= 3) return 'Rosado';
  if (taninos !== null && taninos <= 1) return 'Blanco';

  return 'Tinto';
};

export const suggestWineStylesForProfile = (
  profile: { potente: number; acidez: number; dulce?: number; dulzura?: number; tanico?: number; taninos?: number; afrutado: number },
  limit = 3,
): PublicWineStyle[] => {
  const dulzura = profile.dulzura ?? profile.dulce ?? 0;
  const taninos = profile.taninos ?? profile.tanico ?? 0;
  const origin = clasificarPorAtributos(profile.potente, profile.acidez, dulzura, taninos, profile.afrutado);
  const ranked = PUBLIC_WINE_STYLES
    .filter((style) => style !== origin)
    .map((style) => ({ style, encaje: calcularEncaje(profile.potente, profile.acidez, dulzura, taninos, profile.afrutado, style) }))
    .sort((a, b) => b.encaje - a.encaje || specificity(a.style) - specificity(b.style) || a.style.localeCompare(b.style, 'es'))
    .map(({ style }) => style);

  return [origin, ...ranked].slice(0, limit);
};
