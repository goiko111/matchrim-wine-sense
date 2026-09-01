export interface OverlayPinPoint<T> {
  key: string;
  order: number;
  x: number;
  y: number;
  value: T;
}

export interface OverlayPinCluster<T> {
  key: string;
  x: number;
  y: number;
  items: OverlayPinPoint<T>[];
}

interface OverlayPinClusterOptions {
  zoom?: number;
  thresholdX?: number;
  thresholdY?: number;
  maxItems?: number;
}

const clampPercentage = (value: number) => Math.max(4, Math.min(96, value));

export const clusterOverlayPins = <T>(
  points: OverlayPinPoint<T>[],
  {
    zoom = 1,
    thresholdX = 14,
    thresholdY = 10,
    maxItems = 4,
  }: OverlayPinClusterOptions = {},
): OverlayPinCluster<T>[] => {
  const safeZoom = Math.max(1, zoom);
  const xLimit = thresholdX / safeZoom;
  const yLimit = thresholdY / safeZoom;
  const clusters: OverlayPinCluster<T>[] = [];

  [...points]
    .sort((left, right) => left.y - right.y || left.x - right.x || left.order - right.order)
    .forEach((point) => {
      const candidate = clusters
        .filter((cluster) => cluster.items.length < maxItems)
        .map((cluster) => ({
          cluster,
          distance: Math.hypot((point.x - cluster.x) / xLimit, (point.y - cluster.y) / yLimit),
        }))
        .filter(({ cluster }) => Math.abs(point.x - cluster.x) <= xLimit && Math.abs(point.y - cluster.y) <= yLimit)
        .sort((left, right) => left.distance - right.distance)[0]?.cluster;

      if (!candidate) {
        clusters.push({
          key: point.key,
          x: clampPercentage(point.x),
          y: clampPercentage(point.y),
          items: [point],
        });
        return;
      }

      candidate.items.push(point);
      candidate.x = clampPercentage(candidate.items.reduce((sum, item) => sum + item.x, 0) / candidate.items.length);
      candidate.y = clampPercentage(candidate.items.reduce((sum, item) => sum + item.y, 0) / candidate.items.length);
      candidate.key = candidate.items.map((item) => item.key).join('-');
    });

  return clusters.sort((left, right) => (
    Math.min(...left.items.map((item) => item.order))
    - Math.min(...right.items.map((item) => item.order))
  ));
};
