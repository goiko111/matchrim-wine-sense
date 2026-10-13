import type { NormalizedBox } from './multiWineScan';

export interface CropGeometry {
  sourceBox: NormalizedBox;
  pixels: { x: number; y: number; width: number; height: number };
}

export const getCropGeometry = (
  width: number, height: number, box: NormalizedBox, paddingPercent = 0,
): CropGeometry => {
  if (![width, height, box.x, box.y, box.width, box.height, paddingPercent].every(Number.isFinite)
    || width < 1 || height < 1 || box.width <= 0 || box.height <= 0 || paddingPercent < 0) {
    throw new Error('Invalid crop geometry');
  }
  // Intersect edges before rounding; clamping only the origin shifts an edge crop.
  const x = Math.max(0, Math.floor(width * (box.x - paddingPercent) / 100));
  const y = Math.max(0, Math.floor(height * (box.y - paddingPercent) / 100));
  const right = Math.min(width, Math.ceil(width * (box.x + box.width + paddingPercent) / 100));
  const bottom = Math.min(height, Math.ceil(height * (box.y + box.height + paddingPercent) / 100));
  if (right <= x || bottom <= y) throw new Error('Empty crop');
  return {
    pixels: { x, y, width: right - x, height: bottom - y },
    sourceBox: { x: x / width * 100, y: y / height * 100, width: (right - x) / width * 100, height: (bottom - y) / height * 100 },
  };
};

// Padding is relative to the narrow side, not two percent of a dense scene.
export const labelCropPadding = (box: NormalizedBox) => Math.min(1, Math.min(box.width, box.height) * 0.08);
