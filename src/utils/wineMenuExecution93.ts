import type { MenuScanResponse } from './wineMenuScan';

export type MenuScanPhase93 = 'quality' | 'profile' | 'ocr' | 'refinement' | 'ranking';
export type MenuScanMetrics93 = {
  startedAt: number; elapsedMs: number; requests: number; completed: number; failed: number;
  phase: MenuScanPhase93; phasesMs: Partial<Record<MenuScanPhase93, number>>;
  outcome?: 'completed' | 'failed' | 'cancelled';
};

// Identity doubts stay visible; only missing coverage warrants another whole-page pass.
export const needsNativeMenuRefinement93 = (response: MenuScanResponse): boolean => {
  const count = response.vinos?.length ?? 0;
  return response.coverage?.status !== 'reported_complete'
    || (response.coverage.estimated_visible_wines ?? 0) > count;
};

export class MenuScanLimitError93 extends Error {
  constructor(public readonly reason: 'deadline' | 'request_limit') {
    super(reason === 'deadline'
      ? 'Se ha alcanzado el tiempo de lectura. Conserva la foto y reintenta una seccion mas pequena.'
      : 'Se ha alcanzado el limite de zonas de esta lectura. Revisa las zonas pendientes.');
    this.name = 'MenuScanLimitError';
  }
}

export const createMenuScanRun93 = (options: {
  signal: AbortSignal; now?: () => number; totalMs?: number; requestMs?: number;
  maxRequests?: number; onChange?: (metrics: MenuScanMetrics93) => void;
}) => {
  const now = options.now ?? (() => performance.now());
  const startedAt = now();
  const totalMs = options.totalMs ?? 90_000;
  const requestMs = options.requestMs ?? 58_000;
  const maxRequests = options.maxRequests ?? 3;
  let phaseStartedAt = startedAt;
  let finished = false;
  const metrics: MenuScanMetrics93 = {
    startedAt, elapsedMs: 0, requests: 0, completed: 0, failed: 0,
    phase: 'quality', phasesMs: {},
  };
  const snapshot = (): MenuScanMetrics93 => ({
    ...metrics, elapsedMs: finished ? metrics.elapsedMs : Math.max(0, now() - startedAt), phasesMs: { ...metrics.phasesMs },
  });
  const emit = () => options.onChange?.(snapshot());
  const accrue = () => {
    metrics.phasesMs[metrics.phase] = (metrics.phasesMs[metrics.phase] ?? 0) + Math.max(0, now() - phaseStartedAt);
    phaseStartedAt = now();
  };
  return {
    snapshot,
    phase(phase: MenuScanPhase93) {
      if (finished || metrics.phase === phase) return;
      accrue(); metrics.phase = phase; emit();
    },
    async request<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
      if (options.signal.aborted) throw options.signal.reason;
      if (finished || metrics.requests >= maxRequests) throw new MenuScanLimitError93('request_limit');
      const remaining = totalMs - (now() - startedAt);
      if (remaining <= 0) throw new MenuScanLimitError93('deadline');
      const controller = new AbortController();
      const cancelled = () => controller.abort(options.signal.reason);
      options.signal.addEventListener('abort', cancelled, { once: true });
      const timeout = setTimeout(() => controller.abort(new MenuScanLimitError93('deadline')), Math.min(requestMs, remaining));
      let onAbort: (() => void) | undefined;
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () => reject(controller.signal.reason);
        controller.signal.addEventListener('abort', onAbort, { once: true });
      });
      metrics.requests++; emit();
      try {
        // The race bounds UI waiting even if session lookup or an adapter ignores abort.
        const value = await Promise.race([Promise.resolve().then(() => {
          if (controller.signal.aborted) throw controller.signal.reason;
          return operation(controller.signal);
        }), aborted]);
        if (controller.signal.aborted) throw controller.signal.reason;
        metrics.completed++;
        return value;
      } catch (error) {
        metrics.failed++;
        throw error;
      } finally {
        clearTimeout(timeout);
        options.signal.removeEventListener('abort', cancelled);
        if (onAbort) controller.signal.removeEventListener('abort', onAbort);
        if (!finished) emit();
      }
    },
    finish(outcome: NonNullable<MenuScanMetrics93['outcome']>) {
      if (!finished) {
        accrue(); metrics.elapsedMs = Math.max(0, now() - startedAt);
        metrics.outcome = outcome; finished = true; emit();
      }
      return snapshot();
    },
  };
};
