import type { NormalizedBox } from '@/utils/multiWineScan';
import type { WinerimOriginalSheet } from './winerimOriginalSheet';
import { canLookupWinerimOriginal, isVerifiedWinerimSheetForIdentity } from './winerimOriginalSheet';

export interface MenuScanPosition {
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  confidence?: number | null;
  confianza?: number | null;
}

import { optionalScanNumber } from '../../supabase/functions/_shared/matchrim-scan-values';
import { normalizeScanPrice, resolveScanCurrency } from './scanMoney';
import { isLiteralWineStyle95 } from './menuLiteralStyle95';

export interface MenuManualPriceAssignment {
  format: 'copa' | 'botella';
  amount: number;
  currency: string;
  prices: { copa: number | null; botella: number | null };
  original: {
    amount: number | null;
    raw_currency: string | null;
    currency: string | null;
    prices: { copa: number | null; botella: number | null; llevar: number | null };
    origin: 'manual' | 'scan';
    inferred: boolean;
  };
}

export interface MenuScanWine {
  canonicalId?: string | null;
  originalSheet?: WinerimOriginalSheet | null;
  sensorySource?: 'catalog' | 'inference';
  nombre: string;
  productor: string | null;
  anada: number | null;
  region: string | null;
  pais: string | null;
  precio: number | null;
  precio_origen?: 'manual';
  precio_manual_pendiente?: boolean;
  precio_manual_asignacion?: MenuManualPriceAssignment;
  moneda?: string | null;
  tipo: string;
  descripcion: string | null;
  uvas?: string[];
  atributos?: {
    scale?: 'winerim-0-5';
    potencia: number;
    acidez: number;
    dulzura: number;
    taninos: number;
    afrutado: number;
  } | null;
  compatibilidad?: number | null;
  affinity_calibrated?: boolean;
  razon?: string | null;
  texto_fuente?: string | null;
  dudas?: string[] | null;
  campos_inferidos?: string[] | null;
  confidence?: number | null;
  servicio?: 'copa' | 'botella' | 'ambos' | null;
  formato?: string | null;
  seccion?: string | null;
  precios?: {
    copa?: number | null;
    botella?: number | null;
    llevar?: number | null;
  } | null;
  posicion?: MenuScanPosition | null;
  // Client-only uncertainty, never identity or scoring evidence.
  lecturas_alternativas?: MenuReadingAlternative96[];
}

export interface MenuScanResponse {
  vinos?: MenuScanWine[];
  has_profile?: boolean;
  scan_version?: string;
  moneda?: string | null;
  layout?: 'columns' | 'rows' | 'unknown';
  coverage?: {
    status?: 'reported_complete' | 'partial' | 'unknown';
    extracted_wines?: number;
    estimated_visible_wines?: number | null;
    notes?: string[];
  };
}

export interface MenuScanTile {
  id: 'full' | 'left' | 'right' | 'right-focus' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  box: NormalizedBox;
}

export interface MenuTileResult {
  tile: MenuScanTile;
  response: MenuScanResponse;
}

export interface MenuReadingAlternative96 {
  tile: MenuScanTile;
  rawIndex: number;
  nombre: string;
  productor: string | null;
  texto_fuente: string;
}

export const isMenuIdentityConfirmed = (wine: MenuScanWine) => (Boolean(wine.canonicalId
  && wine.canonicalId === wine.originalSheet?.id && isVerifiedWinerimSheetForIdentity({
    name: wine.nombre, producer: wine.productor, vintage: wine.anada, region: wine.region, country: wine.pais,
    inferredFields: wine.campos_inferidos,
  }, wine.originalSheet)) || (wine.confidence ?? 0) >= 0.85
  && !(wine.dudas?.length)
  && !(wine.campos_inferidos ?? []).some((field) => /^(nombre|name|productor|producer|winery|bodega|anada|añada|vintage|year)$/i.test(field)));

export const canResolveMenuCatalogIdentity = (wine: MenuScanWine) => {
  if ((wine.confidence ?? 0) < 0.72 || !wine.texto_fuente?.trim()) return false;
  const words = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const visible = new Set(words(wine.texto_fuente));
  return canLookupWinerimOriginal({ name: wine.nombre, producer: wine.productor, vintage: wine.anada,
    inferredFields: wine.campos_inferidos })
    && words(`${wine.nombre} ${wine.productor || ''}`).every(word => visible.has(word));
};

const fullTile: MenuScanTile = {
  id: 'full',
  box: { x: 0, y: 0, width: 100, height: 100 },
};

export const getFullMenuScanTile = () => ({ ...fullTile, box: { ...fullTile.box } });
export const getRightFocusMenuScanTile = (): MenuScanTile => ({
  id: 'right-focus',
  box: { x: 64, y: 0, width: 36, height: 100 },
});

export const shouldRunRightFocusMenuScan = (
  coverageStatus: 'reported_complete' | 'partial' | 'unknown' | undefined,
  extractedWines: number,
  completeColumnScans = false,
) => !completeColumnScans && (coverageStatus !== 'reported_complete' || extractedWines >= 8);

export const mayHaveUnreadMenuColumn = (response: MenuScanResponse) => response.layout === 'columns'
  || (response.coverage?.status !== 'reported_complete' && (response.vinos?.length ?? 0) >= 12);

export interface MenuScanTileOptions96 { preserveRowContext?: boolean; }

export const buildMenuScanTiles = (width: number, height: number, layout: MenuScanResponse['layout'] = 'unknown',
  options: MenuScanTileOptions96 = {}): MenuScanTile[] => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return [getFullMenuScanTile()];
  }

  // Native whole-row crops retain names and their distant price columns together.
  // The 12% overlap protects seam rows; it does not supply missing service headers.
  return options.preserveRowContext !== true && width >= height && layout === 'columns'
    ? [
        { id: 'left', box: { x: 0, y: 0, width: 56, height: 100 } },
        { id: 'right', box: { x: 44, y: 0, width: 56, height: 100 } },
      ]
    : [
        { id: 'top', box: { x: 0, y: 0, width: 100, height: 56 } },
        { id: 'bottom', box: { x: 0, y: 44, width: 100, height: 56 } },
      ];
};

export const needsMenuRefinement = (response: MenuScanResponse) => {
  const wines = response.vinos ?? [];
  return response.coverage?.status !== 'reported_complete'
    || wines.length >= 30
    || wines.some((wine) => (wine.confidence ?? 0) < 0.7
      || (wine.dudas ?? []).some((doubt) => /linea|columna|asociacion|nombre/i.test(doubt)))
    || (response.coverage?.estimated_visible_wines ?? 0) > wines.length;
};

const percentage = (value: unknown) => {
  const numeric = optionalScanNumber(value);
  return numeric === null ? null : Math.max(0, Math.min(100, numeric));
};

export const mapMenuWineFromTile = (wine: MenuScanWine, tile: MenuScanTile): MenuScanWine => {
  const x = percentage(wine.posicion?.x);
  const y = percentage(wine.posicion?.y);
  if (x === null || y === null) return wine;

  const width = percentage(wine.posicion?.width);
  const height = percentage(wine.posicion?.height);
  return {
    ...wine,
    posicion: {
      ...wine.posicion,
      x: tile.box.x + x * tile.box.width / 100,
      y: tile.box.y + y * tile.box.height / 100,
      width: width === null ? null : width * tile.box.width / 100,
      height: height === null ? null : height * tile.box.height / 100,
    },
  };
};

const normalizeText = (value: unknown) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const tokenOverlap = (left: string, right: string) => {
  const leftTokens = new Set(normalizeText(left).split(' ').filter(Boolean));
  const rightTokens = new Set(normalizeText(right).split(' ').filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) return 0;
  return [...leftTokens].filter((token) => rightTokens.has(token)).length / Math.min(leftTokens.size, rightTokens.size);
};

const positionAnchor = (wine: MenuScanWine) => {
  const x = percentage(wine.posicion?.x);
  const y = percentage(wine.posicion?.y);
  if (x === null || y === null) return null;
  const width = percentage(wine.posicion?.width) ?? 0;
  const height = percentage(wine.posicion?.height) ?? 0;
  return { x: x + width / 2, y: y + height / 2 };
};

const commonPrefixRatio = (left: string, right: string) => {
  const maxComparableLength = Math.min(left.length, right.length);
  let commonLength = 0;
  while (commonLength < maxComparableLength && left[commonLength] === right[commonLength]) commonLength += 1;
  return commonLength / Math.max(1, maxComparableLength);
};

const variantWords = new Set('crianza reserva gran especial blanco tinto rosado rose brut nature demi sec extra ultra'.split(' '));
const grapeWords = new Set('cabernet sauvignon merlot pinot noir blanc grigio chardonnay syrah shiraz riesling gewurztraminer tempranillo garnacha grenache albarino godello mourvedre mouverdre sangiovese canaiolo zinfandel malbec monastrell prosecco spumante'.split(' '));
const isGrapeOnly = (name: string) => {
  const words = normalizeText(name).split(' ').filter(Boolean);
  return words.length > 0 && words.every((word) => grapeWords.has(word));
};

const hasConflictingVariant = (left: MenuScanWine, right: MenuScanWine) => {
  const a = normalizeText(left.nombre).split(' ');
  const b = normalizeText(right.nombre).split(' ');
  return [...new Set([...a, ...b])].some((word) => variantWords.has(word)
    && a.includes(word) !== b.includes(word)
    && !(a.includes(word) ? b : a).some((fragment) => fragment.length >= 3 && word.startsWith(fragment)));
};

const sourceHeading = (wine: MenuScanWine) => normalizeText((wine.texto_fuente || '')
  .split(/\r?\n|\b(?:zona|zone|uva|grapes?|crianza|aging)\s*[:/]/i)[0]);

const descriptionField = /\b(?:zona|zone|uva|grapes?|crianza|aging|alcohol|abv)\s*[:/]/i;
const priceLabel = /\b(?:precio|price|copa|glass|botella|bottle|llevar|takeaway)\b/i;
const serviceLabels = {
  copa: /\b(?:copa|glass)\b/i,
  botella: /\b(?:botella|bottle)\b/i,
  llevar: /\b(?:llevar|takeaway)\b/i,
};

const groundMenuPrices = (wine: MenuScanWine, tile: MenuScanTile): MenuScanWine => {
  const source = wine.texto_fuente ?? '';
  const descriptionStart = source.search(descriptionField);
  if (descriptionStart < 0) return wine;

  // A number following grapes/aging is not row-bound price evidence. This is a
  // consistency check on model text, not independent verification of its digits.
  const heading = source.slice(0, descriptionStart).trim();
  const priceLines = source.slice(descriptionStart).split(/\r?\n/).filter((line) => (
    !descriptionField.test(line)
    && (priceLabel.test(line) || resolveScanCurrency(null, line) !== null || /[$]/.test(line))
  ));
  const boundAmount = (value: unknown, service?: keyof typeof serviceLabels) => {
    const amount = normalizeScanPrice(value);
    if (amount === null) return null;
    const supported = [heading, ...priceLines].some((line) => {
      if (normalizeText(line) === normalizeText(wine.nombre)) return false;
      const labels = [...line.matchAll(/\b(?:copa|glass|botella|bottle|llevar|takeaway)\b/gi)];
      const contexts = service && labels.length ? labels.flatMap((label, index) => serviceLabels[service].test(label[0])
        ? [line.slice(label.index, labels[index + 1]?.index)] : []) : [line];
      if (!priceLabel.test(line) && amount === wine.anada) return false;
      return contexts.some((context) => [...context.matchAll(/\d+(?:[.,]\d+)*/g)].some((match) => (
        /^\d+(?:[.,]\d+)?$/.test(match[0]) && Number(match[0].replace(',', '.')) === amount
        && context[(match.index ?? 0) - 1] !== '-'
        && !/^\s*(?:%|ml\b|cl\b|l\b|a[n\u00f1]os?\b|years?\b|meses?\b|months?\b|abv\b|vol\b)/i.test(context.slice((match.index ?? 0) + match[0].length))
      )));
    });
    return supported ? amount : null;
  };
  const precio = boundAmount(wine.precio);
  const precios = {
    copa: boundAmount(wine.precios?.copa, 'copa'),
    botella: boundAmount(wine.precios?.botella, 'botella'),
    llevar: boundAmount(wine.precios?.llevar, 'llevar'),
  };
  const removed = normalizeScanPrice(wine.precio) !== precio
    || (Object.keys(precios) as Array<keyof typeof precios>).some((key) => normalizeScanPrice(wine.precios?.[key]) !== precios[key]);
  if (!removed) return wine;
  return {
    ...wine, precio, precios,
    dudas: Array.from(new Set([...(wine.dudas ?? []),
      `Precio omitido (${tile.id}): el texto no vincula el importe a esta fila y servicio; puede proceder de otra columna. Revisa la carta.`])),
    campos_inferidos: Array.from(new Set([...(wine.campos_inferidos ?? []), 'precio', 'precios',
      ...(precio === null && Object.values(precios).every((value) => value === null) ? ['servicio'] : [])])),
  };
};

const conflictingMenuIdentity = (left: MenuScanWine, right: MenuScanWine) => Boolean(
  (left.anada && right.anada && left.anada !== right.anada)
  || (left.productor && right.productor && normalizeText(left.productor) !== normalizeText(right.productor))
  || (left.servicio && right.servicio && left.servicio !== 'ambos' && right.servicio !== 'ambos' && left.servicio !== right.servicio)
);

const sameUncertainSourceRow = (left: MenuScanWine, right: MenuScanWine) => {
  if (conflictingMenuIdentity(left, right)) return false;
  const a = sourceHeading(left), b = sourceHeading(right);
  if (Math.min(a.length, b.length) < 8 || !(a.startsWith(b) || b.startsWith(a))) return false;
  const names = [normalizeText(left.nombre), normalizeText(right.nombre)];
  if (a === names[0] && b === names[1]) return false;
  if (names[0].split(' ').length !== names[1].split(' ').length) return false;
  const colourNames = names.map((name) => name.replace(/\brose\b/g, 'rosado'));
  const prefixNames = names[0].startsWith(names[1]) || names[1].startsWith(names[0]);
  if (names[0] === names[1] || (!prefixNames && colourNames[0] !== colourNames[1])) return false;
  // Only a visibly incomplete common heading can justify a translation or
  // expansion. Two separately transcribed complete cuvees remain distinct.
  const shortHeading = a.length < b.length ? a : b;
  if (!names.every((name) => name.startsWith(shortHeading) || shortHeading.startsWith(name))
    || !names.some((name) => name !== shortHeading)) return false;
  if (hasConflictingVariant(left, right) && colourNames[0] !== colourNames[1]
    && !names.some((name) => shortHeading.startsWith(name) && name !== shortHeading
      && !shortHeading.slice(name.length).startsWith(' '))) return false;
  const uncertainType = [left, right].some((wine) => (wine.campos_inferidos ?? []).includes('tipo'));
  if (left.tipo && right.tipo && left.tipo !== right.tipo && !uncertainType) return false;
  if (left.seccion && right.seccion && normalizeText(left.seccion) !== normalizeText(right.seccion)) return false;
  const leftAnchor = positionAnchor(left), rightAnchor = positionAnchor(right);
  const aw = percentage(left.posicion?.width), bw = percentage(right.posicion?.width);
  const ah = percentage(left.posicion?.height), bh = percentage(right.posicion?.height);
  if (!leftAnchor || !rightAnchor || !aw || !bw || !ah || !bh) return false;
  const horizontalOverlap = (aw + bw) / 2 - Math.abs(leftAnchor.x - rightAnchor.x);
  return horizontalOverlap >= Math.min(aw, bw) * 0.6
    && Math.abs(leftAnchor.y - rightAnchor.y) <= Math.max(ah, bh) * 1.5;
};

const overlappingLiteralRow = (left: MenuScanWine, right: MenuScanWine) => {
  const a = left.posicion;
  const b = right.posicion;
  if (!a || !b) return false;
  const ax = percentage(a.x), ay = percentage(a.y), aw = percentage(a.width), ah = percentage(a.height);
  const bx = percentage(b.x), by = percentage(b.y), bw = percentage(b.width), bh = percentage(b.height);
  if (ax === null || ay === null || !aw || !ah || bx === null || by === null || !bw || !bh) return false;
  const horizontal = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx)) / Math.min(aw, bw);
  const vertical = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by)) / Math.min(ah, bh);
  return horizontal >= 0.6 && vertical >= 0.6;
};

const sameLiteralSourceRow = (left: MenuScanWine, right: MenuScanWine) => {
  const heading = sourceHeading(left);
  const a = positionAnchor(left);
  const b = positionAnchor(right);
  const producer = normalizeText(left.productor);
  return heading.length >= 12 && heading === sourceHeading(right)
    && [normalizeText(left.nombre), normalizeText(right.nombre)].includes(heading)
    && Boolean(producer && producer === normalizeText(right.productor))
    && !(left.anada && right.anada && left.anada !== right.anada)
    && !(left.tipo && right.tipo && left.tipo !== right.tipo)
    && (Boolean(a && b && Math.abs(a.x - b.x) <= 25 && Math.abs(a.y - b.y) <= 2.5)
      || overlappingLiteralRow(left, right));
};

const conflictingNumericReference = (left: MenuScanWine, right: MenuScanWine) => {
  const a = normalizeText(left.nombre).match(/\d+/g) ?? [], b = normalizeText(right.nombre).match(/\d+/g) ?? [];
  return a.length > 0 && b.length > 0 && a.join(' ') !== b.join(' ');
};

const servingInference95 = /^(formato|format|servicio|service|volumen|volume|tamano|tamaño|size|medida)$/i;

const literalServing95 = (wine: MenuScanWine): { key: string; label: string } | null => {
  if ((wine.servicio !== 'copa' && wine.servicio !== 'botella')
    || (wine.campos_inferidos ?? []).some(field => servingInference95.test(field))
    || typeof wine.formato !== 'string' || typeof wine.texto_fuente !== 'string'
    || wine.texto_fuente.length > 4000) return null;
  const volumeKey = (value: string): string | null => {
    const match = /^(\d+(?:[.,]\d+)?)\s*(ml|cl|l)$/i.exec(value.trim());
    if (!match || match[1].length > 80) return null;
    const [integer, fraction = ''] = match[1].replace(',', '.').split('.');
    let numerator = BigInt(integer + fraction) * ({ ml: 1n, cl: 10n, l: 1000n }[match[2].toLowerCase()] ?? 1n);
    let denominator = 10n ** BigInt(fraction.length);
    if (numerator === 0n) return null;
    let a = numerator, b = denominator;
    while (b) { const rest = a % b; a = b; b = rest; }
    numerator /= a; denominator /= a;
    return numerator.toString() + '/' + denominator.toString();
  };
  const key = volumeKey(wine.formato);
  if (!key) return null;
  const token = /\b\d+(?:[.,]\d+)?\s*(?:ml|cl|l)\b/gi;
  const source = wine.texto_fuente;
  const escapedName = wine.nombre.trim().split(/\s+/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  const namedPrefix = new RegExp('^\\s*' + escapedName + '(?=\\s|$)', 'iu');
  const sourceRows = source.split(/\r?\n|\u00b7/).map(line => line.trim()).filter(Boolean);
  const boundLines = sourceRows.filter(line => {
    const prefix = namedPrefix.exec(line);
    if (!prefix) return false;
    const suffix = line.slice(prefix[0].length).replace(token, '').replace(/\d+(?:[.,]\d+)?/g, '')
      .replace(/\b(?:glass|copa|bottle|botella|btl|eur|usd|gbp)\b/gi, '');
    return /^[\s/|\u00b7,.:;()[\]\u00a3\u20ac$-]*$/.test(suffix);
  });
  // A shared size header binds only its explicit section/list block, not sibling rows with their own sizes.
  if (sourceRows.length >= 3 && isLiteralWineStyle95(wine) && wine.seccion?.trim()) {
    const [header, sectionPrices, ...styleRows] = sourceRows;
    const headerRemainder = header.replace(token, '').replace(/\b(?:glass|copa|bottle|botella|btl)\b/gi, '');
    const section = sectionPrices.replace(/\d+(?:[.,]\d+)?/g, '').replace(/\b(?:eur|usd|gbp)\b/gi, '')
      .replace(/[\u00a3\u20ac$]/g, '');
    const names = styleRows.flatMap(line => line.split(/\s*[/|,&]\s*/));
    if (/^[\s/|,.:;()[\]-]*$/.test(headerRemainder)
      && [...header.matchAll(token)].length > 0
      && normalizeText(section) === normalizeText(wine.seccion)
      && names.some(name => normalizeText(name) === normalizeText(wine.nombre))
      && names.every(name => isLiteralWineStyle95({ ...wine, nombre: name, texto_fuente: wine.seccion + ' ' + name }))) {
      boundLines.push(header);
    }
  }
  for (const line of boundLines) {
    const literal = [...line.matchAll(token)].find(match => !/[-\d.,]/.test(line.charAt((match.index ?? 0) - 1))
      && volumeKey(match[0]) === key);
    if (literal) return { key, label: literal[0].replace(/\s+/g, ' ') };
  }
  return null;
};

type LiteralServingMemo95 = WeakMap<MenuScanWine, ReturnType<typeof literalServing95>>;

const readLiteralServing95 = (wine: MenuScanWine, memo?: LiteralServingMemo95): ReturnType<typeof literalServing95> => {
  if (!memo) return literalServing95(wine);
  if (memo.has(wine)) return memo.get(wine) ?? null;
  const serving = literalServing95(wine);
  memo.set(wine, serving);
  return serving;
};

const distinctLiteralServing95 = (left: MenuScanWine, right: MenuScanWine, memo?: LiteralServingMemo95) => {
  const a = readLiteralServing95(left, memo), b = readLiteralServing95(right, memo);
  return Boolean(a && b && a.key !== b.key);
};
export const literalMenuServingFormat95 = (wine: MenuScanWine): string | null => literalServing95(wine)?.label ?? null;

const isOverlapDuplicate = (left: MenuScanWine, right: MenuScanWine, preserveNumericReferences = false,
  preserveServingFormats = false, memo?: LiteralServingMemo95) => {
  if (preserveServingFormats && distinctLiteralServing95(left, right, memo)) return false;
  if (preserveNumericReferences && conflictingNumericReference(left, right)) return false;
  if (conflictingMenuIdentity(left, right)) return false;
  if (sameUncertainSourceRow(left, right)) return true;
  if (sameLiteralSourceRow(left, right)) return true;
  if (hasConflictingVariant(left, right)) return false;
  const normalizedLeftName = normalizeText(left.nombre);
  const normalizedRightName = normalizeText(right.nombre);
  const sameName = normalizedLeftName === normalizedRightName
    && normalizedLeftName.length >= 5;
  const strongOcrName = Math.min(normalizedLeftName.length, normalizedRightName.length) >= 8
    && normalizedLeftName !== normalizedRightName
    && commonPrefixRatio(normalizedLeftName, normalizedRightName) >= 0.9;
  const identityOverlap = tokenOverlap(
    `${left.productor ?? ''} ${left.nombre}`,
    `${right.productor ?? ''} ${right.nombre}`,
  );

  const leftSource = normalizeText(left.texto_fuente);
  const rightSource = normalizeText(right.texto_fuente);
  const sameSource = Boolean(leftSource && rightSource && (
    leftSource === rightSource
    || (Math.min(leftSource.length, rightSource.length) >= 14 && (leftSource.includes(rightSource) || rightSource.includes(leftSource)))
  ));
  const leftAnchor = positionAnchor(left);
  const rightAnchor = positionAnchor(right);
  const samePosition = Boolean(leftAnchor && rightAnchor
    && Math.abs(leftAnchor.x - rightAnchor.x) <= 4
    && Math.abs(leftAnchor.y - rightAnchor.y) <= 3);

  if (identityOverlap < 0.72 && !sameName && !strongOcrName) return false;

  const nearName = Math.min(normalizedLeftName.length, normalizedRightName.length) >= 8
    && (
      normalizedLeftName.includes(normalizedRightName)
      || normalizedRightName.includes(normalizedLeftName)
      || commonPrefixRatio(normalizedLeftName, normalizedRightName) >= 0.86
    );
  // Shared winery tokens and nearby OCR boxes do not identify the same cuvee.
  if (!sameName && !nearName && !strongOcrName) return false;
  const strongNearName = strongOcrName && nearName;
  const leftSection = normalizeText(left.seccion);
  const rightSection = normalizeText(right.seccion);
  const conflictingSection = Boolean(leftSection && rightSection && leftSection !== rightSection);
  const leftProducer = normalizeText(left.productor);
  const rightProducer = normalizeText(right.productor);
  const conflictingProducer = Boolean(leftProducer && rightProducer && leftProducer !== rightProducer);
  const missingProducer = !leftProducer || !rightProducer;
  const conflictingVintage = Boolean(left.anada && right.anada && left.anada !== right.anada);
  if (conflictingVintage || conflictingProducer || (conflictingSection
    && leftAnchor && rightAnchor && Math.abs(leftAnchor.y - rightAnchor.y) > 3)) return false;
  const conflictingPrice = Boolean(
    typeof left.precio === 'number'
    && typeof right.precio === 'number'
    && Math.abs(left.precio - right.precio) > 0.5
  );
  const matchingServicePrices = (['copa', 'botella', 'llevar'] as const).filter((service) => {
    const a = normalizeScanPrice(left.precios?.[service]);
    const b = normalizeScanPrice(right.precios?.[service]);
    return a !== null && b !== null && Math.abs(a - b) <= 0.5;
  }).length >= 2;
  const sameServiceRow = (sameName || strongOcrName) && matchingServicePrices
    && !conflictingSection && !conflictingVintage && !conflictingProducer
    && (!left.moneda || !right.moneda || left.moneda === right.moneda)
    && (!left.tipo || !right.tipo || left.tipo === right.tipo);
  const samePhysicalRow = Boolean(
    (sameName || strongOcrName)
    && !conflictingVintage
    && !conflictingProducer
    && (!left.tipo || !right.tipo || left.tipo === right.tipo)
    && leftAnchor && rightAnchor
    && Math.abs(leftAnchor.x - rightAnchor.x) <= 25
    && Math.abs(leftAnchor.y - rightAnchor.y) <= 2.5
  );
  const genericSource = [leftSource, rightSource].some((source) => (
    source === normalizeText(left.nombre)
    || source === normalizeText(right.nombre)
  ));
  const nearbyPartialIdentity = Boolean(
    (sameName || nearName)
    && missingProducer
    && genericSource
    && !conflictingVintage
    && !conflictingPrice
    && leftAnchor
    && rightAnchor
    && Math.abs(leftAnchor.x - rightAnchor.x) <= 15
    && Math.abs(leftAnchor.y - rightAnchor.y) <= 10
  );

  const sameProducer = Boolean(
    leftProducer && rightProducer && leftProducer === rightProducer
  );
  const plausiblySamePosition = !leftAnchor || !rightAnchor || (
    Math.abs(leftAnchor.x - rightAnchor.x) <= 25
    && Math.abs(leftAnchor.y - rightAnchor.y) <= 15
  );
  const sameCanonicalRow = Boolean(
    (sameName || nearName)
    && !conflictingVintage
    && (
      strongNearName
      || ((!conflictingSection || samePosition) && !conflictingPrice && (
        sameName
        || (sameProducer && plausiblySamePosition)
        || (missingProducer && plausiblySamePosition)
      ))
    )
  );

  return sameSource || samePosition || samePhysicalRow || sameServiceRow || nearbyPartialIdentity || sameCanonicalRow;
};

type NativeMenuMoneyConflicts95 = Record<'precio' | 'moneda' | 'copa' | 'botella' | 'llevar', boolean>;

const richerWine = (left: MenuScanWine, right: MenuScanWine, preserveServingFormats = false,
  moneyConflicts?: WeakMap<MenuScanWine, NativeMenuMoneyConflicts95>, memo?: LiteralServingMemo95): MenuScanWine => {
  const uncertainSourceRow = sameUncertainSourceRow(left, right);
  const nameDisagreement = normalizeText(left.nombre) !== normalizeText(right.nombre)
    && (sameLiteralSourceRow(left, right) || uncertainSourceRow);
  // A model-expanded name must not outrank the literal line just by confidence.
  const preferred = nameDisagreement
    ? (uncertainSourceRow
      ? (normalizeText(left.nombre).length <= normalizeText(right.nombre).length ? left : right)
      : (sourceHeading(left) === normalizeText(left.nombre) ? left : right))
    : (right.confidence ?? 0) > (left.confidence ?? 0) ? right : left;
  const fallback = preferred === left ? right : left;
  const servingWine = preserveServingFormats ? (readLiteralServing95(left, memo) ? left : readLiteralServing95(right, memo) ? right : null) : null;
  const mergedService = servingWine ? servingWine.servicio : preferred.servicio === fallback.servicio
    ? preferred.servicio
    : preferred.servicio && fallback.servicio ? 'ambos' : preferred.servicio || fallback.servicio;
  const inheritedConflict = (key: keyof NativeMenuMoneyConflicts95) => Boolean(moneyConflicts?.get(left)?.[key]
    || moneyConflicts?.get(right)?.[key]);
  const priceTolerance = preserveServingFormats ? 0 : 0.5;
  let conflictingPrice = inheritedConflict('precio') || (typeof left.precio === 'number' && typeof right.precio === 'number'
    && Math.abs(left.precio - right.precio) > priceTolerance
    && (!left.servicio || !right.servicio || left.servicio === right.servicio));
  const conflictingCurrency = inheritedConflict('moneda') || Boolean(left.moneda && right.moneda && left.moneda !== right.moneda);
  const conflicts: NativeMenuMoneyConflicts95 | undefined = moneyConflicts ? {
    precio: conflictingPrice, moneda: conflictingCurrency,
    copa: inheritedConflict('copa'), botella: inheritedConflict('botella'), llevar: inheritedConflict('llevar'),
  } : undefined;
  if (conflicts) {
    for (const key of ['copa', 'botella', 'llevar'] as const) {
      const a = normalizeScanPrice(left.precios?.[key]), b = normalizeScanPrice(right.precios?.[key]);
      const leftScalar = left.servicio === key ? normalizeScanPrice(left.precio) : null;
      const rightScalar = right.servicio === key ? normalizeScanPrice(right.precio) : null;
      const observedA = a ?? leftScalar, observedB = b ?? rightScalar;
      conflicts[key] ||= (observedA !== null && observedB !== null && observedA !== observedB)
        || (a !== null && leftScalar !== null && a !== leftScalar)
        || (b !== null && rightScalar !== null && b !== rightScalar);
    }
    if (mergedService === 'copa' || mergedService === 'botella') {
      conflicts[mergedService] ||= conflictingPrice;
      conflictingPrice ||= conflicts[mergedService];
      conflicts.precio = conflictingPrice;
    }
  }
  const mergePrice = (key: 'copa' | 'botella' | 'llevar') => {
    const a = normalizeScanPrice(left.precios?.[key]);
    const b = normalizeScanPrice(right.precios?.[key]);
    return conflictingCurrency || conflicts?.[key] || (a !== null && b !== null && Math.abs(a - b) > priceTolerance)
      ? null : normalizeScanPrice(preferred.precios?.[key]) ?? normalizeScanPrice(fallback.precios?.[key]);
  };
  const merged: MenuScanWine = {
    ...fallback,
    ...preferred,
    ...(nameDisagreement ? {
      canonicalId: null,
      originalSheet: null,
      sensorySource: 'inference' as const,
      confidence: Math.min(left.confidence ?? 0, right.confidence ?? 0),
      compatibilidad: null,
      atributos: null,
      razon: null,
      affinity_calibrated: false,
    } : {}),
    productor: uncertainSourceRow ? preferred.productor : preferred.productor || fallback.productor,
    anada: uncertainSourceRow ? preferred.anada : preferred.anada ?? fallback.anada,
    region: uncertainSourceRow ? preferred.region : preferred.region || fallback.region,
    pais: uncertainSourceRow ? preferred.pais : preferred.pais || fallback.pais,
    precio: conflictingPrice || conflictingCurrency ? null : preferred.precio ?? fallback.precio,
    moneda: conflictingCurrency ? null : preferred.moneda ?? fallback.moneda ?? null,
    precios: {
      copa: mergePrice('copa'), botella: mergePrice('botella'), llevar: mergePrice('llevar'),
    },
    ...(servingWine ? { formato: servingWine.formato } : {}),
    servicio: mergedService,
    texto_fuente: servingWine?.texto_fuente || preferred.texto_fuente || fallback.texto_fuente,
    posicion: preferred.posicion || fallback.posicion,
    dudas: Array.from(new Set([
      ...(left.dudas ?? []), ...(right.dudas ?? []),
      ...(nameDisagreement ? ['Nombre discrepante entre recortes; se conserva la lectura literal. Confirma la referencia antes de puntuar.'] : []),
      ...(conflictingPrice || conflicts && (conflicts.copa || conflicts.botella || conflicts.llevar)
        ? ['Precio contradictorio entre recortes; revisa la carta.'] : []),
      ...(conflictingCurrency ? ['Moneda contradictoria entre recortes; revisa la carta.'] : []),
    ])),
    campos_inferidos: Array.from(new Set([...(left.campos_inferidos ?? []), ...(right.campos_inferidos ?? []), ...(nameDisagreement ? ['nombre'] : [])])),
  };
  if (conflicts) moneyConflicts!.set(merged, conflicts);
  return merged;
};

export interface MenuMergeOptions95 {
  preserveNumericReferences?: boolean;
  preserveServingFormats?: boolean;
  preserveReadingAlternatives?: boolean;
}

const retainExcludedReadings96 = (resolved: MenuScanResponse, excluded: MenuTileResult[],
  included: Set<MenuScanWine>, memo?: LiteralServingMemo95): MenuScanResponse => {
  // Raw indices come from the original responses, not a filtered/reordered merge.
  const wines = (resolved.vinos ?? []).map(wine => {
    if (!Object.prototype.hasOwnProperty.call(wine, 'lecturas_alternativas')) return wine;
    const clean = { ...wine };
    delete clean.lecturas_alternativas;
    return clean;
  });
  const alternatives = new Map<number, MenuReadingAlternative96[]>();
  const reliablePosition = (wine: MenuScanWine) => {
    const value = optionalScanNumber(wine.posicion?.confidence ?? wine.posicion?.confianza);
    return value !== null && value <= 100 && (value > 1 ? value / 100 : value) >= 0.7;
  };
  const knownTiles: MenuScanTile['id'][] = ['full', 'left', 'right', 'right-focus', 'top', 'bottom',
    'top-left', 'top-right', 'bottom-left', 'bottom-right'];
  excluded.filter(({ tile }) => {
    const box = tile.box;
    return knownTiles.includes(tile.id) && box
      && [box.x, box.y, box.width, box.height].every(value => typeof value === 'number' && Number.isFinite(value))
      && box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0
      && box.x + box.width <= 100 && box.y + box.height <= 100;
  }).forEach(({ tile, response }) => (response.vinos ?? []).forEach((raw, rawIndex) => {
    if (included.has(raw) || typeof raw.nombre !== 'string' || !raw.nombre.trim() || raw.nombre.length > 300
      || typeof raw.texto_fuente !== 'string' || !raw.texto_fuente.trim() || raw.texto_fuente.length > 4000
      || (raw.productor != null && (typeof raw.productor !== 'string' || raw.productor.length > 300))
      || !normalizeText(raw.texto_fuente).includes(normalizeText(raw.nombre))) return;
    const reading = mapMenuWineFromTile(raw, tile);
    const matches = wines.flatMap((wine, index) => {
      if (!reliablePosition(wine) || !reliablePosition(reading) || !overlappingLiteralRow(wine, reading)
        || [...(wine.campos_inferidos ?? []), ...(reading.campos_inferidos ?? [])].some(field =>
          /^(servicio|service|formato|format|precio|price|precios(?:\.(?:copa|botella|llevar))?|moneda|currency)$/i.test(field))
        || tokenOverlap(wine.nombre, reading.nombre) < 0.6 || hasConflictingVariant(wine, reading)
        || conflictingNumericReference(wine, reading)
        || (wine.anada != null && reading.anada != null && wine.anada !== reading.anada)
        || !wine.servicio || wine.servicio !== reading.servicio
        || readLiteralServing95(wine, memo)?.key !== readLiteralServing95(reading, memo)?.key
        || resolveScanCurrency(wine.moneda, wine.texto_fuente) !== resolveScanCurrency(reading.moneda, reading.texto_fuente, response.moneda)) return [];
      const amounts = (row: MenuScanWine) => [row.precio, row.precios?.copa, row.precios?.botella, row.precios?.llevar].map(normalizeScanPrice);
      const a = amounts(wine), b = amounts(reading);
      return a.some(value => value !== null) && a.every((value, lane) => value === b[lane]) ? [index] : [];
    });
    // This associates an uncertain physical area, not two producer identities.
    if (matches.length !== 1) return;
    const index = matches[0];
    if (raw.nombre.trim() === wines[index].nombre.trim()) return;
    const entries = alternatives.get(index) ?? [];
    if (entries.length >= 3 || entries.some(entry => entry.tile.id === tile.id && entry.rawIndex === rawIndex)) return;
    entries.push({ tile: { id: tile.id, box: { ...tile.box } }, rawIndex,
      nombre: raw.nombre, productor: raw.productor ?? null, texto_fuente: raw.texto_fuente });
    alternatives.set(index, entries);
  }));
  return { ...resolved, vinos: wines.map((wine, index) => alternatives.has(index)
    ? { ...wine, lecturas_alternativas: alternatives.get(index) } : wine) };
};

const mergeMenuTileResults95 = (results: MenuTileResult[], options: MenuMergeOptions95,
  memo?: LiteralServingMemo95): MenuScanResponse => {
  const wines: MenuScanWine[] = [];
  // Batch-local provenance only: null output values cannot erase an earlier explicit conflict.
  const moneyConflicts = options.preserveServingFormats ? new WeakMap<MenuScanWine, NativeMenuMoneyConflicts95>() : undefined;
  const observations = results.flatMap(({ tile, response }) => (response.vinos ?? []).map((wine) => ({
    tile,
    wine: mapMenuWineFromTile(groundMenuPrices({
      ...wine,
      precio: normalizeScanPrice(wine.precio),
      moneda: resolveScanCurrency(wine.moneda, wine.texto_fuente, response.moneda),
    }, tile), tile),
  })));
  const ambiguousSourceMatch = (left: MenuScanWine, right: MenuScanWine) => sameUncertainSourceRow(left, right)
    && observations.some(({ wine: other }) => (
      (sameUncertainSourceRow(left, other) && !isOverlapDuplicate(right, other, options.preserveNumericReferences, options.preserveServingFormats, memo))
      || (sameUncertainSourceRow(right, other) && !isOverlapDuplicate(left, other, options.preserveNumericReferences, options.preserveServingFormats, memo))
    ));
  let ambiguousServingObservations = 0;
  const ambiguousServingBridge = (wine: MenuScanWine) => options.preserveServingFormats && !readLiteralServing95(wine, memo)
    && new Set(observations.filter(({ wine: other }) => readLiteralServing95(other, memo)
      && isOverlapDuplicate(wine, other, options.preserveNumericReferences, false, memo))
      .map(({ wine: other }) => readLiteralServing95(other, memo)!.key)).size > 1;
  observations.forEach(({ tile, wine }) => {
    if (ambiguousServingBridge(wine)) { ambiguousServingObservations++; return; }
    const duplicates = wines.map((existing, index) => isOverlapDuplicate(existing, wine, options.preserveNumericReferences, options.preserveServingFormats, memo)
      && !ambiguousSourceMatch(existing, wine) ? index : -1).filter((index) => index !== -1);
    // Never resolve an ambiguous truncated heading by the order of results.
    const duplicateIndex = duplicates.length === 1 ? duplicates[0] : -1;
    const groundedFocusEvidence = Boolean(
      normalizeText(wine.texto_fuente).length >= 5
      && tokenOverlap(
        wine.nombre,
        wine.texto_fuente ?? '',
      ) >= 0.4
    );
    const isUncorroboratedFocusGuess = tile.id === 'right-focus'
      && duplicateIndex === -1
      && ((wine.confidence ?? 0) < 0.4 || !groundedFocusEvidence);
    if (isUncorroboratedFocusGuess) return;
    if (duplicateIndex === -1) wines.push(wine);
    else wines[duplicateIndex] = richerWine(wines[duplicateIndex], wine, options.preserveServingFormats, moneyConflicts, memo);
  });

  // A column crop can return the grapes/price from an already captured complete
  // row as a second wine. Collapse only a uniquely corroborated description.
  const resolvedWines = wines.filter((fragment) => {
    if (fragment.productor || !isGrapeOnly(fragment.nombre)) return true;
    const words = normalizeText(fragment.nombre).split(' ');
    const price = normalizeScanPrice(fragment.precio);
    if (price === null) return true;
    const completeRows = wines.filter((row) => row !== fragment
      && (!options.preserveServingFormats || !distinctLiteralServing95(fragment, row, memo))
      && !isGrapeOnly(row.nombre)
      && normalizeText(row.nombre).length >= 4
      && normalizeScanPrice(row.precio) === price
      && normalizeText(row.seccion) === normalizeText(fragment.seccion)
      && (!row.moneda || !fragment.moneda || row.moneda === fragment.moneda)
      && (!row.anada || !fragment.anada || row.anada === fragment.anada)
      && words.every((word) => normalizeText(row.texto_fuente).split(' ').includes(word)));
    return completeRows.length !== 1;
  });
  const statuses = results.map((result) => result.response.coverage?.status ?? 'unknown');
  const status = statuses.includes('partial')
    ? 'partial'
    : statuses.every((value) => value === 'reported_complete')
      ? 'reported_complete'
      : 'unknown';
  const notes = Array.from(new Set(results.flatMap((result) => result.response.coverage?.notes ?? [])));
  if (ambiguousServingObservations) notes.push(`${ambiguousServingObservations} observaciones sin formato inequívoco no se usaron para unir tamaños distintos.`);
  if (resolvedWines.length < wines.length) notes.push(`${wines.length - resolvedWines.length} fragmentos de uvas y precio unidos a su fila completa.`);
  const estimates = results
    .map((result) => result.response.coverage?.estimated_visible_wines)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  return {
    vinos: resolvedWines,
    has_profile: results.some((result) => result.response.has_profile),
    scan_version: Array.from(new Set(results.map((result) => result.response.scan_version).filter(Boolean))).join('+') || undefined,
    coverage: {
      status,
      extracted_wines: resolvedWines.length,
      estimated_visible_wines: estimates.length === results.length ? Math.max(resolvedWines.length, ...estimates) : null,
      notes,
    },
  };
};

export const mergeMenuTileResults = (results: MenuTileResult[], options: MenuMergeOptions95 = {}): MenuScanResponse =>
  mergeMenuTileResults95(results, options, options.preserveServingFormats ? new WeakMap() : undefined);

export const resolveMenuTileResults = (results: MenuTileResult[], options: MenuMergeOptions95 = {}): MenuScanResponse => {
  // Pure literal facts live only for this aggregation, including its internal merges.
  const memo: LiteralServingMemo95 | undefined = options.preserveServingFormats ? new WeakMap() : undefined;
  const fullResult = results.find((result) => result.tile.id === 'full');
  const focusResults = results.filter((result) => result.tile.id === 'right-focus');
  const regionalResults = results.filter((result) => result.tile.id !== 'full' && result.tile.id !== 'right-focus');
  if (!fullResult) {
    const resolved = mergeMenuTileResults95(results, options, memo);
    return options.preserveReadingAlternatives ? retainExcludedReadings96(resolved, [], new Set(), memo) : resolved;
  }
  if (regionalResults.length === 0) {
    const resolved = mergeMenuTileResults95([fullResult, ...focusResults], options, memo);
    return options.preserveReadingAlternatives ? retainExcludedReadings96(resolved, [], new Set(), memo) : resolved;
  }

  const fullWines = mergeMenuTileResults95([fullResult], options, memo).vinos ?? [];
  const regionalWines = mergeMenuTileResults95(regionalResults, options, memo).vinos ?? [];
  const overlappingRegionalRows = regionalWines.filter((regionalWine) => (
    fullWines.some((fullWine) => (!options.preserveNumericReferences || !conflictingNumericReference(fullWine, regionalWine))
      && (isOverlapDuplicate(fullWine, regionalWine, options.preserveNumericReferences, options.preserveServingFormats, memo)
        || ((!options.preserveServingFormats || !distinctLiteralServing95(fullWine, regionalWine, memo))
          && tokenOverlap(fullWine.nombre, regionalWine.nombre) >= 0.8)))
  )).length;
  const overlapRatio = overlappingRegionalRows / Math.max(1, Math.min(fullWines.length, regionalWines.length));

  // A partial full-page scan and its tiles often repeat the same rows with slightly
  // different OCR or prices. Prefer one base when they substantially agree, then
  // add the narrow focus crop only for genuinely complementary content.
  const substantiallySameDocument = overlapRatio >= 0.6;
  const regionalMateriallyBroader = substantiallySameDocument
    && regionalWines.length >= fullWines.length + 3;
  const baseResults = fullResult.response.coverage?.status === 'reported_complete'
    ? (regionalMateriallyBroader ? regionalResults : [fullResult])
    : substantiallySameDocument
      ? (regionalMateriallyBroader ? regionalResults : [fullResult])
      : [fullResult, ...regionalResults];

  const baseWines = options.preserveServingFormats ? mergeMenuTileResults95(baseResults, options, memo).vinos ?? [] : [];
  const complementaryServingResults = options.preserveServingFormats
    ? [fullResult, ...regionalResults].filter(result => !baseResults.includes(result)).flatMap(result => {
      const vinos = (result.response.vinos ?? []).filter(wine => {
        const serving = readLiteralServing95(wine, memo);
        const mapped = mapMenuWineFromTile(wine, result.tile);
        const matches = baseWines.filter(base => (!serving || readLiteralServing95(base, memo)?.key === serving.key)
          && isOverlapDuplicate(base, mapped, options.preserveNumericReferences, true, memo));
        if (matches.length === 0) return Boolean(serving);
        if (matches.length !== 1) return false;
        const base = matches[0];
        return normalizeScanPrice(base.precio) !== normalizeScanPrice(wine.precio)
          || (['copa', 'botella', 'llevar'] as const).some(key => normalizeScanPrice(base.precios?.[key]) !== normalizeScanPrice(wine.precios?.[key]))
          || base.moneda !== resolveScanCurrency(wine.moneda, wine.texto_fuente, result.response.moneda);
      });
      return vinos.length ? [{ ...result, response: { ...result.response, vinos } }] : [];
    }) : [];
  const resolved = mergeMenuTileResults95([...baseResults, ...complementaryServingResults, ...focusResults], options, memo);
  return options.preserveReadingAlternatives ? retainExcludedReadings96(resolved,
    [fullResult, ...regionalResults].filter(result => !baseResults.includes(result)),
    new Set(complementaryServingResults.flatMap(result => result.response.vinos ?? [])), memo) : resolved;
};
