const hasUnsafeControl = (value: string) => Array.from(value).some(char => {
  const code = char.charCodeAt(0);
  return code < 32 || (code >= 127 && code <= 159) || (code >= 0x200b && code <= 0x200f)
    || (code >= 0x202a && code <= 0x202e) || (code >= 0x2060 && code <= 0x206f);
});

// URL syntax only: no fetch, MIME inference or canonical identity authority.
export const safeWineImageUrl98 = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value || /[\\\s]/u.test(value) || hasUnsafeControl(value)
    || /%(?![a-f0-9]{2})/i.test(value)) return null;
  const relative = value.startsWith('/') && !value.startsWith('//');
  const authority = /^https:\/\/([^/?#]+)/i.exec(value)?.[1];
  if (!relative && (!authority || authority.includes('@'))) return null;
  try {
    const url = new URL(value, 'https://wine-image.invalid');
    const path = decodeURIComponent(url.pathname);
    const decoded = decodeURIComponent(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password
      || path.endsWith('/') || decoded.includes('\\') || hasUnsafeControl(decoded)
      || /\.svg(?:z|\.gz)?(?:$|[/?#\s])/i.test(path)
      || (relative && url.pathname !== value.split(/[?#]/, 1)[0])) return null;
    return value;
  } catch { return null; }
};

// Existing owner-supplied raster captures are displayable, never catalogue evidence.
export const safeOwnedWineImage98 = (value: unknown): string | null => {
  const url = safeWineImageUrl98(value);
  if (url) return url;
  if (typeof value !== 'string' || value.length > 20_000_000) return null;
  return /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : null;
};
