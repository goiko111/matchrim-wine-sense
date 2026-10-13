export interface EdgeFunctionErrorOptions {
  status: number;
  errorCode: string | null;
  retryAfterMs: number | null;
}

export class EdgeFunctionError extends Error {
  readonly status: number;
  readonly errorCode: string | null;
  readonly retryAfterMs: number | null;

  constructor(message: string, options: EdgeFunctionErrorOptions) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.status = options.status;
    this.errorCode = options.errorCode;
    this.retryAfterMs = options.retryAfterMs;
  }
}

export const parseRetryAfterMs = (value: string | null) => {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : null;
};

export const isRetryableEdgeFunctionError = (error: unknown) => {
  if (error instanceof EdgeFunctionError) {
    return error.status === 408
      || error.status === 425
      || error.status === 429
      || (error.status >= 500 && error.status <= 599);
  }
  return error instanceof TypeError;
};

export const edgeFunctionRetryDelay = (error: unknown, attempt: number) => {
  if (error instanceof EdgeFunctionError && error.retryAfterMs !== null) {
    return Math.min(Math.max(error.retryAfterMs, 250), 10_000);
  }
  return Math.min(600 * Math.pow(2, Math.max(0, attempt - 1)), 4_800);
};

export const waitForAbortableDelay = (delayMs: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) {
    reject(new DOMException('Cancelled', 'AbortError'));
    return;
  }
  const timeoutId = globalThis.setTimeout(() => {
    signal.removeEventListener('abort', onAbort);
    resolve();
  }, delayMs);
  const onAbort = () => {
    globalThis.clearTimeout(timeoutId);
    reject(new DOMException('Cancelled', 'AbortError'));
  };
  signal.addEventListener('abort', onAbort, { once: true });
});

interface EdgeFunctionRetryOptions {
  maxAttempts?: number;
  onRetry?: (error: unknown, attempt: number) => void;
}

export const invokeWithEdgeFunctionRetry = async <Result>(
  operation: (attempt: number) => Promise<Result>,
  signal: AbortSignal,
  options: EdgeFunctionRetryOptions = {},
) => {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      if (attempt >= maxAttempts || !isRetryableEdgeFunctionError(error)) throw error;
      options.onRetry?.(error, attempt);
      await waitForAbortableDelay(edgeFunctionRetryDelay(error, attempt), signal);
    }
  }
  throw new Error('Retry loop ended unexpectedly');
};
