import { EdgeFunctionError } from './edgeFunctionResilience';

export const nativeMenuScanFailure = (failure: unknown) => {
  if (failure instanceof EdgeFunctionError && [402, 429].includes(failure.status ?? 0)) {
    return 'El servicio ha alcanzado su límite de uso. Conservo la foto; vuelve a intentarlo más tarde.';
  }
  const message = failure instanceof Error ? failure.message : '';
  if (/timed?\s*out|timeout|tiempo|deadline/i.test(message)) {
    return 'La lectura tardó demasiado. Puedes reintentar la foto o analizarla por zonas más pequeñas.';
  }
  if (failure instanceof EdgeFunctionError && failure.errorCode === 'invalid_model_response') {
    return 'No he recibido una lectura fiable. Conservo la foto para que puedas reintentarla o analizarla por zonas.';
  }
  if (/network|fetch|offline|internet/i.test(message)) {
    return 'No se ha podido conectar. Comprueba tu conexión; la foto sigue disponible para reintentar.';
  }
  return 'No he podido analizar esta carta ahora. Conservo la foto para que puedas reintentarla o elegir otra imagen.';
};
