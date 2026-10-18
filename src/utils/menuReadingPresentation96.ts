import type { MenuScanTile, MenuScanWine } from './wineMenuScan';
import { normalizeScanPrice } from './scanMoney';
import { formatMenuPriceAmount } from './menuPriceReview';

// Presentation only: takeaway never enters the glass/bottle comparison model.
export const nativeMenuTakeawayText96 = (wine: MenuScanWine, filteredFormat: 'glass' | 'bottle' | null = null): string | null => {
  if (filteredFormat || wine.precio_origen === 'manual' || wine.precio_manual_pendiente || wine.precio_manual_asignacion
    || (wine.campos_inferidos ?? []).some(field => /^(servicio|service|moneda|currency|precio|price|precios(?:\.llevar)?|prices(?:\.takeaway)?|formato|format)$/i.test(field))) return null;
  const amount = typeof wine.precios?.llevar === 'number' ? normalizeScanPrice(wine.precios.llevar) : null;
  const text = amount === null ? null : formatMenuPriceAmount(amount, wine.moneda);
  return text ? `Para llevar ${text}` : null;
};

export const menuReadingSourceLabel96 = (tile: MenuScanTile['id']): string => ({
  full: 'Foto completa', top: 'Parte superior', bottom: 'Parte inferior',
  left: 'Columna izquierda', right: 'Columna derecha', 'right-focus': 'Detalle de la columna derecha',
  'top-left': 'Parte superior izquierda', 'top-right': 'Parte superior derecha',
  'bottom-left': 'Parte inferior izquierda', 'bottom-right': 'Parte inferior derecha',
})[tile];
