import { EdgeFunctionError } from './edgeFunctionResilience';
import { ImagePreparationError } from './imageAnalysis';
import { RestaurantDocumentError91 } from './restaurantDocuments91';
import { FoodScanResponseError } from './foodScanResponse';

export const nativeFoodScanFailure = (failure: unknown) => {
  if (failure instanceof ImagePreparationError) return failure.message;
  if (failure instanceof RestaurantDocumentError91) {
    if (failure.code === 'password_pdf') return 'Este PDF tiene contraseña. Elige una copia sin contraseña o una foto de la carta.';
    if (failure.code === 'pdf_page_limit') return 'El PDF supera las 50 páginas. Divídelo antes de importarlo.';
    if (failure.code === 'file_size_limit') return 'El archivo supera los 25 MB. Elige un archivo más ligero.';
    return 'No he podido abrir este documento. Elige otro PDF o una foto de la carta.';
  }
  if (failure instanceof EdgeFunctionError && [402, 429].includes(failure.status ?? 0)) {
    return 'El servicio ha alcanzado su límite de uso. Conservo el archivo; vuelve a intentarlo más tarde.';
  }
  if (failure instanceof FoodScanResponseError
    || failure instanceof EdgeFunctionError && failure.errorCode === 'invalid_model_response') {
    return 'No he recibido una lectura fiable. Puedes reintentar el mismo archivo o elegir otra foto.';
  }
  if (failure instanceof EdgeFunctionError && failure.errorCode === 'provider_timeout') {
    return 'La lectura tardó demasiado. Conservo el archivo; prueba con fotos más cercanas de cada parte de la carta.';
  }
  const message = failure instanceof Error ? failure.message : '';
  if (/timed?\s*out|timeout|tiempo|deadline|agot[oó]/i.test(message)) {
    return 'La lectura tardó demasiado. Conservo el archivo para que puedas reintentarlo o elegir una foto más cercana.';
  }
  if (/network|fetch|offline|internet/i.test(message)) {
    return 'No se ha podido conectar. Comprueba tu conexión; el archivo sigue disponible para reintentar.';
  }
  return 'No he podido analizar este archivo ahora. Puedes reintentarlo o elegir otra foto.';
};

// Settle locally even when a transport ignores abort; never publish its late result.
export const runNativeFoodRead95 = <T>(
  run: (signal: AbortSignal) => Promise<T>, signal: AbortSignal, timeoutMs = 90_000,
): Promise<T> => new Promise((resolve, reject) => {
  const controller = new AbortController();
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined = undefined;
  const finish = (complete: () => void) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
    controller.abort();
    complete();
  };
  const cancel = () => finish(() => reject(new DOMException('Cancelled', 'AbortError')));
  if (signal.aborted) { cancel(); return; }
  signal.addEventListener('abort', cancel, { once: true });
  timer = setTimeout(() => finish(() => reject(new Error('Food read timeout'))), Math.min(90_000, Math.max(1, timeoutMs)));
  Promise.resolve().then(() => {
    if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    return run(controller.signal);
  }).then(value => finish(() => resolve(value)), error => finish(() => reject(error)));
});

export const confirmsNativeFoodSave95 = (
  receipt: unknown, expected: { ownerId: string; name: string; favorite: boolean; id?: string },
) => {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return false;
  const row = receipt as Record<string, unknown>;
  return typeof row.id === 'string' && row.id.trim().length > 0 && (!expected.id || row.id === expected.id)
    && row.user_id === expected.ownerId && row.name === expected.name && row.status === 'wishlist'
    && row.is_favorite === expected.favorite && row.use_for_profile_training === false
    && row.sensory_attributes === null && row.matchrim_affinity === null;
};
