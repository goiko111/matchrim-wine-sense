import { Capacitor, registerPlugin } from '@capacitor/core';

// 151: «a veces tengo una captura de una botella y desde la app no la encuentro buscando fotos; con otras apps la
// copio y la pego» (13-nov). The scanner takes a photo copied in Fotos, WhatsApp or the browser: the person copies
// it there and taps «Pegar foto» here. iOS asks for permission to paste each time; nothing is read without that tap.
// 152: on the phone the page's own clipboard read came back empty with a photo copied in Fotos (owner's video of
// 151). The iOS app now asks the system pasteboard through its native plugin; the page's read stays as the fallback.
export interface NativePasteTransport152 { pasteImage(): Promise<unknown> }
const native = registerPlugin<NativePasteTransport152>('MatchrimOCR');
const nativePaste152 = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('MatchrimOCR') ? native : null;
const MAX_DATA_URL = 24 * 1024 * 1024;

const fromNative152 = async (transport: NativePasteTransport152): Promise<File | 'none' | null> => {
  let raw: unknown;
  // A shell without the method (an older build) rejects: the page's own read is tried instead.
  try { raw = await transport.pasteImage(); } catch { return null; }
  const result = raw as { status?: unknown; image?: unknown } | null;
  if (result?.status === 'empty') return 'none';
  const image = result?.status === 'captured' ? result.image : null;
  if (typeof image !== 'string' || image.length > MAX_DATA_URL || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) return null;
  const binary = atob(image.slice(image.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], 'foto-pegada.jpg', { type: 'image/jpeg', lastModified: Date.now() });
};

export const pastedPhoto151 = async (transport: NativePasteTransport152 | null = nativePaste152()): Promise<File | 'none' | 'unavailable'> => {
  if (transport) { const pasted = await fromNative152(transport); if (pasted) return pasted; }
  if (typeof navigator === 'undefined' || typeof navigator.clipboard?.read !== 'function') return 'unavailable';
  try {
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find(value => value.startsWith('image/'));
      if (!type) continue;
      const blob = await item.getType(type);
      return new File([blob], `foto-pegada.${type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'}`, { type });
    }
    return 'none';
  } catch {
    // Permission declined, or a clipboard with nothing readable: both end in the same advice.
    return 'none';
  }
};
export const PASTE_HELP151 = 'No hay ninguna foto copiada. Abre la foto, toca Compartir y «Copiar foto»; después vuelve y toca «Pegar foto». Si iOS pregunta, toca «Permitir pegar».';
