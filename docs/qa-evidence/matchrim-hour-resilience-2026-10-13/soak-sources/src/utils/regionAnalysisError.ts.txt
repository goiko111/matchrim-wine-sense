import { EdgeFunctionError } from './edgeFunctionResilience';

export const regionAnalysisErrorMessage = (error: unknown, online = true): string => {
  if (!online) return 'No hay conexión. Esta región no se ha podido analizar.';
  if (error instanceof TypeError) return 'No se pudo conectar con el servicio de lectura. Esta región sigue pendiente.';
  if (error instanceof EdgeFunctionError) {
    if (error.status === 429) return 'El servicio de lectura está temporalmente limitado. Esta región no se ha podido analizar.';
    if (error.status === 401 || error.status === 403) return 'No se pudo autorizar la lectura de esta región. Revisa tu sesión antes de reintentar.';
    if (error.status === 408 || error.status === 425 || error.status >= 500) return 'El servicio de lectura no pudo completar esta región. Puedes reintentarla.';
  }
  return 'El servicio de lectura no pudo analizar esta región. No podemos evaluar su legibilidad.';
};
