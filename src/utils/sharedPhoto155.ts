import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

// 155: «Compartir → Matchrim». The share extension leaves a photo for the app; the native plugin says so when the
// app comes to the front, and the page takes it (once) and hands it to the label scanner, the same door as a photo
// chosen from the gallery. Without the plugin (web, an older shell) nothing happens.
export interface SharedPhotoTransport155 {
  takeSharedImage(): Promise<unknown>;
  addListener?(event: 'sharedImage', listener: () => void): Promise<PluginListenerHandle>;
}
const native = registerPlugin<SharedPhotoTransport155>('MatchrimOCR');
const transport155 = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('MatchrimOCR') ? native : null;
const MAX_DATA_URL = 24 * 1024 * 1024;
export const SHARED_PHOTO_EVENT155 = 'matchrim:shared-photo155';
export const SHARED_PHOTO_ROUTE155 = '/escanear/etiqueta';

export const takeSharedPhoto155 = async (transport: SharedPhotoTransport155): Promise<File | null> => {
  let raw: unknown;
  try { raw = await transport.takeSharedImage(); } catch { return null; }
  const result = raw as { status?: unknown; image?: unknown } | null;
  const image = result?.status === 'captured' ? result.image : null;
  if (typeof image !== 'string' || image.length > MAX_DATA_URL || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) return null;
  const binary = atob(image.slice(image.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], 'foto-compartida.jpg', { type: 'image/jpeg', lastModified: Date.now() });
};

// The photo waits here between «the app took it» and «the scanner is on screen».
let waiting155: File | null = null;
export const stashSharedPhoto155 = (file: File) => { waiting155 = file; };
export const takeStashedSharedPhoto155 = (): File | null => { const file = waiting155; waiting155 = null; return file; };

/** Mounted once in the iOS app: takes a shared photo at start and each time the app comes to the front with one waiting. */
export const useSharedPhoto155 = (transport: SharedPhotoTransport155 | null = transport155()) => {
  const navigate = useNavigate(), { pathname } = useLocation();
  useEffect(() => {
    if (!transport) return;
    let live = true, handle: PluginListenerHandle | undefined;
    const take = async () => {
      const file = await takeSharedPhoto155(transport);
      if (!file || !live) return;
      stashSharedPhoto155(file);
      if (window.location.pathname === SHARED_PHOTO_ROUTE155) window.dispatchEvent(new Event(SHARED_PHOTO_EVENT155));
      else navigate(SHARED_PHOTO_ROUTE155);
    };
    void take();
    void transport.addListener?.('sharedImage', () => { void take(); }).then(value => { if (live) handle = value; else void value.remove(); }, () => undefined);
    return () => { live = false; void handle?.remove(); };
    // The route is read when the photo arrives; re-subscribing on every navigation would drop a photo in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport]);
  return pathname;
};
