import { buildMenuScanTiles, type MenuScanTile } from './wineMenuScan';

export type MenuRecoveryLayout = 'auto' | 'columns' | 'rows' | 'quadrants';

export const menuRecoveryTiles95 = (width: number, height: number, layout: MenuRecoveryLayout, columnSplit = 50): MenuScanTile[] => {
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) return [];
  if (!['auto', 'columns', 'rows', 'quadrants'].includes(layout)) return [];
  if (!Number.isFinite(columnSplit) || columnSplit < 20 || columnSplit > 80) return [];
  const leftEnd = columnSplit + 6;
  const rightStart = columnSplit - 6;
  if (layout === 'auto') return buildMenuScanTiles(width, height, width >= height ? 'columns' : 'rows');
  if (layout === 'columns') return [
    { id: 'left', box: { x: 0, y: 0, width: leftEnd, height: 100 } },
    { id: 'right', box: { x: rightStart, y: 0, width: 100 - rightStart, height: 100 } },
  ];
  if (layout === 'rows') return [
    { id: 'top', box: { x: 0, y: 0, width: 100, height: 56 } },
    { id: 'bottom', box: { x: 0, y: 44, width: 100, height: 56 } },
  ];
  return [
    { id: 'top-left', box: { x: 0, y: 0, width: leftEnd, height: 56 } },
    { id: 'top-right', box: { x: rightStart, y: 0, width: 100 - rightStart, height: 56 } },
    { id: 'bottom-left', box: { x: 0, y: 44, width: leftEnd, height: 56 } },
    { id: 'bottom-right', box: { x: rightStart, y: 44, width: 100 - rightStart, height: 56 } },
  ];
};
