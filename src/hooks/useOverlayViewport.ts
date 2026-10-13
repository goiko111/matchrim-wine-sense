import { useLayoutEffect, useRef, useState } from 'react';

/** Observe only this overlay and its first target; disconnect on session teardown. */
export const useOverlayViewport = (generation: number) => {
  const ref = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number; targetSize: number } | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let observedTarget: HTMLButtonElement | null = null;
    const update = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const target = element.querySelector<HTMLButtonElement>('button[data-testid]');
      if (target !== observedTarget) {
        if (observedTarget) observer.unobserve(observedTarget);
        if (target) observer.observe(target);
        observedTarget = target;
      }
      const targetSize = target?.getBoundingClientRect().width ?? 44;
      setViewport(current => current && Math.abs(current.width - rect.width) < .25
        && Math.abs(current.height - rect.height) < .25 && current.targetSize === targetSize
        ? current : { width: rect.width, height: rect.height, targetSize });
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, [generation]);
  return { ref, viewport };
};
