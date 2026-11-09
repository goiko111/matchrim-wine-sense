// 135 (iOS): sign-in and password-recovery errors reached the person as raw English
// ("Load failed", "Request rate limit reached", "you can only request this after 37 seconds").
export const authErrorText135 = (message: unknown, fallback: string): string => {
  const raw = String(message ?? '').toLowerCase();
  const wait = raw.match(/after (\d+) seconds?/);
  if (wait) return `Espera ${wait[1]} segundos antes de pedir otro enlace.`;
  if (raw.includes('invalid login credentials')) return 'Credenciales incorrectas. Verifica tu email y contraseña.';
  if (raw.includes('email not confirmed')) return 'Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.';
  if (raw.includes('rate limit') || raw.includes('too many')) return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
  if (raw.includes('load failed') || raw.includes('failed to fetch') || raw.includes('network')) return 'No hay conexión. Comprueba la red y vuelve a intentarlo.';
  if (raw.includes('email') && raw.includes('invalid')) return 'El formato del email no es válido.';
  return fallback;
};
