const hasUnsafePathCharacters = (value: string) =>
  Array.from(value).some((character) => character === '\\' || character.charCodeAt(0) <= 32);

export const getSafeRedirectPath = (value: string | null | undefined, fallback = '/') => {
  if (!value) return fallback;
  if (hasUnsafePathCharacters(value)) return fallback;
  let path = value.split(/[?#]/, 1)[0];
  for (let depth = 0; depth < 4; depth += 1) {
    if (!path.startsWith('/') || path.startsWith('//') || hasUnsafePathCharacters(path)) return fallback;
    try {
      const decoded = decodeURIComponent(path);
      if (decoded === path) return value;
      path = decoded;
    } catch { return fallback; }
  }
  // Do not send repeatedly encoded paths through another navigation decoder.
  if (path.includes('%') || path.startsWith('//') || hasUnsafePathCharacters(path)) return fallback;
  return value;
};

export const buildAuthRedirectPath = (redirectPath: string) =>
  `/auth?redirect=${encodeURIComponent(getSafeRedirectPath(redirectPath))}`;

export const buildRegistrationRedirectPath = (redirectPath: string) =>
  `/registration?redirect=${encodeURIComponent(getSafeRedirectPath(redirectPath))}`;
