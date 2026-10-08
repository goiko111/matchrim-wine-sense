import type { NormalizedBox } from '@/utils/multiWineScan';

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

export interface MenuScanWine {
  nombre: string;
  productor: string | null;
  anada: number | null;
  region: string | null;
  pais: string | null;
  precio: number | null;
  moneda?: string | null;
  tipo: string;
  descripcion: string | null;
  uvas?: string[];
  atributos?: {
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
  seccion?: string | null;
  precios?: {
    copa?: number | null;
    botella?: number | null;
    llevar?: number | null;
  } | null;
  posicion?: MenuScanPosition | null;
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
  id: 'full' | 'left' | 'right' | 'right-focus' | 'top' | 'bottom';
  box: NormalizedBox;
}

export interface MenuTileResult {
  tile: MenuScanTile;
  response: MenuScanResponse;
}

export const isMenuIdentityConfirmed = (wine: MenuScanWine) => (wine.confidence ?? 0) >= 0.85
  && !(wine.dudas?.length)
  && !(wine.campos_inferidos ?? []).some((field) => /^(nombre|name|productor|producer)$/.test(field));

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

export const buildMenuScanTiles = (width: number, height: number, layout: MenuScanResponse['layout'] = 'unknown'): MenuScanTile[] => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return [getFullMenuScanTile()];
  }

  // A 12% overlap preserves rows close to a fold without making both calls near-duplicates.
  return width >= height && layout === 'columns'
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

const isOverlapDuplicate = (left: MenuScanWine, right: MenuScanWine) => {
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

const richerWine = (left: MenuScanWine, right: MenuScanWine): MenuScanWine => {
  const preferred = (right.confidence ?? 0) > (left.confidence ?? 0) ? right : left;
  const fallback = preferred === left ? right : left;
  const conflictingPrice = typeof left.precio === 'number' && typeof right.precio === 'number'
    && Math.abs(left.precio - right.precio) > 0.5
    && (!left.servicio || !right.servicio || left.servicio === right.servicio);
  const conflictingCurrency = Boolean(left.moneda && right.moneda && left.moneda !== right.moneda);
  const mergePrice = (key: 'copa' | 'botella' | 'llevar') => {
    const a = normalizeScanPrice(left.precios?.[key]);
    const b = normalizeScanPrice(right.precios?.[key]);
    return conflictingCurrency || (a !== null && b !== null && Math.abs(a - b) > 0.5)
      ? null : normalizeScanPrice(preferred.precios?.[key]) ?? normalizeScanPrice(fallback.precios?.[key]);
  };
  return {
    ...fallback,
    ...preferred,
    productor: preferred.productor || fallback.productor,
    anada: preferred.anada ?? fallback.anada,
    region: preferred.region || fallback.region,
    pais: preferred.pais || fallback.pais,
    precio: conflictingPrice || conflictingCurrency ? null : preferred.precio ?? fallback.precio,
    moneda: conflictingCurrency ? null : preferred.moneda ?? fallback.moneda ?? null,
    precios: {
      copa: mergePrice('copa'), botella: mergePrice('botella'), llevar: mergePrice('llevar'),
    },
    servicio: preferred.servicio === fallback.servicio
      ? preferred.servicio
      : preferred.servicio && fallback.servicio
        ? 'ambos'
        : preferred.servicio || fallback.servicio,
    texto_fuente: preferred.texto_fuente || fallback.texto_fuente,
    posicion: preferred.posicion || fallback.posicion,
    dudas: Array.from(new Set([
      ...(left.dudas ?? []), ...(right.dudas ?? []),
      ...(conflictingPrice ? ['Precio contradictorio entre recortes; revisa la carta.'] : []),
      ...(conflictingCurrency ? ['Moneda contradictoria entre recortes; revisa la carta.'] : []),
    ])),
    campos_inferidos: Array.from(new Set([...(left.campos_inferidos ?? []), ...(right.campos_inferidos ?? [])])),
  };
};

export const mergeMenuTileResults = (results: MenuTileResult[]): MenuScanResponse => {
  const wines: MenuScanWine[] = [];
  results.forEach(({ tile, response }) => {
    (response.vinos ?? []).map((wine) => mapMenuWineFromTile({
      ...wine,
      precio: normalizeScanPrice(wine.precio),
      moneda: resolveScanCurrency(wine.moneda, wine.texto_fuente, response.moneda),
    }, tile)).forEach((wine) => {
      const duplicateIndex = wines.findIndex((existing) => isOverlapDuplicate(existing, wine));
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
      else wines[duplicateIndex] = richerWine(wines[duplicateIndex], wine);
    });
  });

  // A column crop can return the grapes/price from an already captured complete
  // row as a second wine. Collapse only a uniquely corroborated description.
  const resolvedWines = wines.filter((fragment) => {
    if (fragment.productor || !isGrapeOnly(fragment.nombre)) return true;
    const words = normalizeText(fragment.nombre).split(' ');
    const price = normalizeScanPrice(fragment.precio);
    if (price === null) return true;
    const completeRows = wines.filter((row) => row !== fragment
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

export const resolveMenuTileResults = (results: MenuTileResult[]): MenuScanResponse => {
  const fullResult = results.find((result) => result.tile.id === 'full');
  const focusResults = results.filter((result) => result.tile.id === 'right-focus');
  const regionalResults = results.filter((result) => result.tile.id !== 'full' && result.tile.id !== 'right-focus');
  if (!fullResult) return mergeMenuTileResults(results);
  if (regionalResults.length === 0) return mergeMenuTileResults([fullResult, ...focusResults]);

  const fullWines = mergeMenuTileResults([fullResult]).vinos ?? [];
  const regionalWines = mergeMenuTileResults(regionalResults).vinos ?? [];
  const overlappingRegionalRows = regionalWines.filter((regionalWine) => (
    fullWines.some((fullWine) => isOverlapDuplicate(fullWine, regionalWine)
      || tokenOverlap(fullWine.nombre, regionalWine.nombre) >= 0.8)
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

  return mergeMenuTileResults([...baseResults, ...focusResults]);
};
