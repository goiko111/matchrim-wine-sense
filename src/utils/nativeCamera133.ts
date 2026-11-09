import { Capacitor, registerPlugin } from '@capacitor/core';

// 133: inside the iOS app the web file input ignores capture="environment" and shows a
// Photo Library / Take Photo / Choose File menu. "Hacer foto" asks the native plugin to open
// the camera directly and hands the photo to the same input, so every scanner keeps its
// existing onChange path. Without a camera (simulator) or outside the app, the input opens as before.
export interface NativeCameraTransport133 {
  takePhoto(): Promise<unknown>;
}
const native = registerPlugin<NativeCameraTransport133>('MatchrimOCR');
const nativeCameraAvailable133 = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('MatchrimOCR');
const MAX_DATA_URL = 24 * 1024 * 1024;

export type NativeCameraOutcome133 = { status: 'captured'; file: File } | { status: 'cancelled' } | { status: 'unavailable' };

export const createNativeCamera133 = (transport: NativeCameraTransport133) => async (): Promise<NativeCameraOutcome133> => {
  let raw: unknown;
  try { raw = await transport.takePhoto(); } catch { return { status: 'unavailable' }; }
  const result = raw as { status?: unknown; image?: unknown } | null;
  if (result?.status === 'cancelled') return { status: 'cancelled' };
  const image = result?.status === 'captured' ? result.image : null;
  if (typeof image !== 'string' || image.length > MAX_DATA_URL || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) return { status: 'unavailable' };
  const binary = atob(image.slice(image.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { status: 'captured', file: new File([bytes], `foto-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }) };
};

// Puts the file on the input and fires the change event React listens to.
export const deliverFileToInput133 = (input: HTMLInputElement, file: File) => {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

export const openCamera133 = async (input: HTMLInputElement | null, camera = nativeCameraAvailable133() ? createNativeCamera133(native) : null) => {
  if (!input || input.disabled) return;
  if (!camera) { input.click(); return; }
  const outcome = await camera();
  if (outcome.status === 'captured') deliverFileToInput133(input, outcome.file);
  else if (outcome.status === 'unavailable') input.click();
};
