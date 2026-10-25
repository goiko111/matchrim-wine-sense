export const NATIVE_HOME_READ_TIMEOUT_MS225 = 8000;

export const withNativeHomeRead225 = async <T>(
  read: PromiseLike<T>, signal: AbortSignal, abortTransport: () => void,
  timeoutMs = NATIVE_HOME_READ_TIMEOUT_MS225,
): Promise<T> => {
  if (signal.aborted) {
    // The caller may already have started its read; absorb its eventual failure.
    void Promise.resolve(read).catch(() => undefined);
    throw new DOMException('Cancelled', 'AbortError');
  }
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    const result = await Promise.race([
      read,
      new Promise<never>((_resolve, reject) => {
        onAbort = () => reject(new DOMException('Cancelled', 'AbortError'));
        signal.addEventListener('abort', onAbort, { once: true });
        if (signal.aborted) { onAbort(); return; }
        deadline = setTimeout(() => {
          reject(new Error('NATIVE_HOME_READ_TIMEOUT'));
          abortTransport();
        }, timeoutMs);
      }),
    ]);
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    return result;
  } finally {
    clearTimeout(deadline);
    if (onAbort) signal.removeEventListener('abort', onAbort);
  }
};
