// Cancels the scanner's wait, not the catalog request running in the background.
export const awaitMenuCatalog = <Result>(
  lookup: () => Promise<Result>,
  signal: AbortSignal,
): Promise<Result> => {
  if (signal.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'));

  return new Promise<Result>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return false;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      return true;
    };
    const onAbort = () => {
      if (finish()) reject(new DOMException('Cancelled', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });

    try {
      lookup().then(
        (result) => { if (finish()) resolve(result); },
        (error) => { if (finish()) reject(error); },
      );
    } catch (error) {
      if (finish()) reject(error);
    }
  });
};
