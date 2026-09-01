import type { NormalizedBox } from '@/utils/multiWineScan';

export interface MenuScanPosition {
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  confidence?: number | null;
  confianza?: number | null;
}

export interface MenuScanWine {
  nombre: string;
  productor: string | null;
  anada: number | null;
  region: string | null;
  pais: string | null;
  precio: number | null;
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
  coverage?: {
    status?: 'reported_complete' | 'partial' | 'unknown';
    extracted_wines?: number;
    estimated_visible_wines?: number | null;
    notes?: string[];
  };
}

export interface MenuScanTile {
  id: 'full' | 'left' | 'right' | 'top' | 'bottom';
  box: NormalizedBox;
}

export interface MenuTileResult {
  tile: MenuScanTile;
  response: MenuScanResponse;
}

const fullTile: MenuScanTile = {
  id: 'full',
  box: { x: 0, y: 0, width: 100, height: 100 },
};

export const getFullMenuScanTile = () => ({ ...fullTile, box: { ...fullTile.box } });

export const buildMenuScanTiles = (width: number, height: number): MenuScanTile[] => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return [getFullMenuScanTile()];
  }

  // A 12% overlap preserves rows close to a fold without making both calls near-duplicates.
  return width >= height
    ? [
        { id: 'left', box: { x: 0, y: 0, width: 56, height: 100 } },
        { id: 'right', box: { x: 44, y: 0, width: 56, height: 100 } },
      ]
    : [
        { id: 'top', box: { x: 0, y: 0, width: 100, height: 56 } },
        { id: 'bottom', box: { x: 0, y: 44, width: 100, height: 56 } },
      ];
};

const percentage = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : null;
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

const isOverlapDuplicate = (left: MenuScanWine, right: MenuScanWine) => {
  const identityOverlap = tokenOverlap(
    `${left.productor ?? ''} ${left.nombre}`,
    `${right.productor ?? ''} ${right.nombre}`,
  );
  if (identityOverlap < 0.72) return false;

  const leftSource = normalizeText(left.texto_fuente);
  const rightSource = normalizeText(right.texto_fuente);
  const sameSource = Boolean(leftSource && rightSource && (
    leftSource === rightSource
    || (Math.min(leftSource.length, rightSource.length) >= 14 && (leftSource.includes(rightSource) || rightSource.includes(leftSource)))
  ));
  const leftAnchor = positionAnchor(left);
  const rightAnchor = positionAnchor(right);
  const samePosition = Boolean(leftAnchor && rightAnchor
    && Math.abs(leftAnchor.x - rightAnchor.x) <= 7
    && Math.abs(leftAnchor.y - rightAnchor.y) <= 7);

  return sameSource || samePosition;
};

const richerWine = (left: MenuScanWine, right: MenuScanWine): MenuScanWine => {
  const preferred = (right.confidence ?? 0) > (left.confidence ?? 0) ? right : left;
  const fallback = preferred === left ? right : left;
  return {
    ...fallback,
    ...preferred,
    productor: preferred.productor || fallback.productor,
    anada: preferred.anada ?? fallback.anada,
    region: preferred.region || fallback.region,
    pais: preferred.pais || fallback.pais,
    precio: preferred.precio ?? fallback.precio,
    texto_fuente: preferred.texto_fuente || fallback.texto_fuente,
    posicion: preferred.posicion || fallback.posicion,
    dudas: Array.from(new Set([...(left.dudas ?? []), ...(right.dudas ?? [])])),
    campos_inferidos: Array.from(new Set([...(left.campos_inferidos ?? []), ...(right.campos_inferidos ?? [])])),
  };
};

export const mergeMenuTileResults = (results: MenuTileResult[]): MenuScanResponse => {
  const wines: MenuScanWine[] = [];
  results.forEach(({ tile, response }) => {
    (response.vinos ?? []).map((wine) => mapMenuWineFromTile(wine, tile)).forEach((wine) => {
      const duplicateIndex = wines.findIndex((existing) => isOverlapDuplicate(existing, wine));
      if (duplicateIndex === -1) wines.push(wine);
      else wines[duplicateIndex] = richerWine(wines[duplicateIndex], wine);
    });
  });

  const statuses = results.map((result) => result.response.coverage?.status ?? 'unknown');
  const status = statuses.includes('partial')
    ? 'partial'
    : statuses.every((value) => value === 'reported_complete')
      ? 'reported_complete'
      : 'unknown';
  const notes = Array.from(new Set(results.flatMap((result) => result.response.coverage?.notes ?? [])));
  const estimates = results
    .map((result) => result.response.coverage?.estimated_visible_wines)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  return {
    vinos: wines,
    has_profile: results.some((result) => result.response.has_profile),
    scan_version: Array.from(new Set(results.map((result) => result.response.scan_version).filter(Boolean))).join('+') || undefined,
    coverage: {
      status,
      extracted_wines: wines.length,
      estimated_visible_wines: estimates.length === results.length ? Math.max(wines.length, ...estimates) : null,
      notes,
    },
  };
};

export const resolveMenuTileResults = (results: MenuTileResult[]): MenuScanResponse => {
  const fullResult = results.find((result) => result.tile.id === 'full');
  if (
    fullResult
    && fullResult.response.coverage?.status === 'reported_complete'
    && (fullResult.response.vinos?.length ?? 0) > 0
  ) {
    return mergeMenuTileResults([fullResult]);
  }
  const regionalResults = results.filter((result) => result.tile.id !== 'full');
  return mergeMenuTileResults(regionalResults.length ? regionalResults : results);
};
