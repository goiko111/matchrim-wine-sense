export const getSafeRedirectPath = (value: string | null | undefined, fallback = '/') => {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || /[\r\n]/.test(value)) {
    return fallback;
  }
  return value;
};

export const buildAuthRedirectPath = (redirectPath: string) =>
  `/auth?redirect=${encodeURIComponent(getSafeRedirectPath(redirectPath))}`;
