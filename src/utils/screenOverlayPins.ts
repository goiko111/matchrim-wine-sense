import { clusterOverlayPins, type OverlayPinPoint, type OverlayPinCluster } from './overlayPins';

/** Display-only grouping. Original regions, OCR boxes, identities and list order
 * remain untouched; the cluster merely shares a measured screen hit target. */
export const clusterScreenOverlayPins = <T>(
  points: OverlayPinPoint<T>[],
  viewport: { width: number; height: number; targetSize: number } | null,
): OverlayPinCluster<T>[] => {
  if (!viewport || viewport.width <= 0 || viewport.height <= 0) return clusterOverlayPins(points);
  const { width, height, targetSize } = viewport;
  const thresholdX = Math.min(100, (targetSize + 2) / width * 100);
  const thresholdY = Math.min(100, (targetSize + 2) / height * 100);
  const clamp = (value: number, pixels: number) => {
    const edge = Math.min(50, targetSize / 2 / pixels * 100);
    return Math.max(edge, Math.min(100 - edge, value));
  };
  const clusters = clusterOverlayPins(points, { thresholdX, thresholdY, maxItems: Infinity })
    .map(cluster => ({ ...cluster, x: clamp(cluster.x, width), y: clamp(cluster.y, height) }));
  // Greedy centroid movement can bring two earlier groups together. Merge those
  // groups until every remaining rectangular hit target is disjoint.
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < clusters.length && !merged; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const left = clusters[i], right = clusters[j];
        if (Math.abs(left.x - right.x) >= thresholdX || Math.abs(left.y - right.y) >= thresholdY) continue;
        const items = [...left.items, ...right.items].sort((a, b) => a.order - b.order);
        clusters[i] = {
          key: items.map(item => item.key).join('-'), items,
          x: clamp(items.reduce((sum, item) => sum + item.x, 0) / items.length, width),
          y: clamp(items.reduce((sum, item) => sum + item.y, 0) / items.length, height),
        };
        clusters.splice(j, 1); merged = true; break;
      }
    }
  }
  return clusters.sort((a, b) => Math.min(...a.items.map(p => p.order)) - Math.min(...b.items.map(p => p.order)));
};
