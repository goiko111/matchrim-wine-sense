import { Capacitor, registerPlugin } from '@capacitor/core';
import { z } from 'zod';

const box = z.object({ x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1),
  width: z.number().finite().positive().max(1), height: z.number().finite().positive().max(1) })
  .refine(value => value.x + value.width <= 1.001 && value.y + value.height <= 1.001);
const response = z.object({ source: z.literal('apple-vision-device'), requestId: z.string().uuid(),
  width: z.number().int().positive().max(2400), height: z.number().int().positive().max(2400),
  totalMs: z.number().finite().nonnegative(), revision: z.number().int().positive(), customWords: z.array(z.string()).length(0),
  lines: z.array(z.object({ text: z.string().trim().min(1).max(1000), confidence: z.number().finite().min(0).max(1), box })).max(100) });
export interface LocalOCRResult106 {
  source: 'apple-vision-device'; requestId: string; width: number; height: number;
  totalMs: number; revision: number; customWords: string[];
  lines: { text: string; confidence: number; box: { x: number; y: number; width: number; height: number } }[];
}
export interface LocalOCRTransport106 {
  recognize(input: { requestId: string; image: string }): Promise<unknown>;
  cancel(input: { requestId: string }): Promise<unknown>;
}
const native = registerPlugin<LocalOCRTransport106>('MatchrimOCR');
export const localOCRAvailable106 = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('MatchrimOCR');
const requestId = () => {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const value = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return [value.slice(0, 8), value.slice(8, 12), value.slice(12, 16), value.slice(16, 20), value.slice(20)].join('-');
};

// Transport factory follows the catalogue reader pattern: tests inject only the
// native bridge, never a canonical wine or expected OCR dictionary.
export const createLocalOCR106 = (transport: LocalOCRTransport106, makeId = requestId) => async (image: string, signal?: AbortSignal): Promise<LocalOCRResult106> => {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (typeof image !== 'string' || image.length > 18 * 1024 * 1024 || !/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) throw new Error('OCR_INVALID_IMAGE');
  const id = makeId();
  if (!z.string().uuid().safeParse(id).success) throw new Error('OCR_INVALID_REQUEST');
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error: Error | null, value?: LocalOCRResult106) => {
      if (settled) return; settled = true;
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(value!);
    };
    const cancel = () => {
      try { void Promise.resolve(transport.cancel({ requestId: id })).catch(() => undefined); } catch { /* Cancellation still settles locally. */ }
    };
    const abort = () => { if (settled) return; cancel(); finish(new DOMException('Cancelled', 'AbortError')); };
    const timer = setTimeout(() => { cancel(); finish(new Error('OCR_TIMEOUT')); }, 22000);
    signal?.addEventListener('abort', abort, { once: true });
    void Promise.resolve().then(() => {
      if (settled) return null;
      if (signal?.aborted) { abort(); return null; }
      return transport.recognize({ requestId: id, image });
    }).then(raw => {
      if (settled) return;
      const parsed = response.safeParse(raw);
      if (!parsed.success || parsed.data.requestId !== id) { finish(new Error('OCR_INVALID_RESPONSE')); return; }
      for (const line of parsed.data.lines) { Object.freeze(line.box); Object.freeze(line); }
      Object.freeze(parsed.data.lines); finish(null, Object.freeze(parsed.data) as LocalOCRResult106);
    }, () => finish(new Error('OCR_UNAVAILABLE')));
  });
};
export const readLocalWineText106 = (image: string, signal?: AbortSignal) => {
  if (!localOCRAvailable106()) return Promise.reject(new Error('OCR_NOT_AVAILABLE'));
  return createLocalOCR106(native)(image, signal);
};
