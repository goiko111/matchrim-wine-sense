import { Capacitor, registerPlugin } from '@capacitor/core';
import type { OcrLine143 } from './menuPositions143';

// 143: the lines of a wine-list page with their boxes, read on the device by the MatchrimOCR plugin (Apple Vision;
// the photo never leaves the phone). `recognizeLines` returns every line of the page; a binary without it answers
// through the label reader's `recognize` (up to 100 lines, no repeated text), which is enough for a short list.
// Whatever goes wrong — no plugin, busy, slow, a strange reply — the answer is null and the list stays as it was.

export interface PageLinesTransport143 {
  recognizeLines?(input: { requestId: string; image: string }): Promise<unknown>;
  recognize(input: { requestId: string; image: string }): Promise<unknown>;
  cancel(input: { requestId: string }): Promise<unknown>;
}
/** `aspect` is the page's height divided by its width, as the reader saw it. */
export type PageLines143 = { lines: OcrLine143[]; aspect: number };

const native = registerPlugin<PageLinesTransport143>('MatchrimOCR');
const available = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('MatchrimOCR');
const requestId = () => {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const value = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return [value.slice(0, 8), value.slice(8, 12), value.slice(12, 16), value.slice(16, 20), value.slice(20)].join('-');
};
const unit = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1.001;
/** Only what the matcher needs is kept; a line without text or with a box outside the page is dropped, not trusted. */
const parse = (raw: unknown, id: string): PageLines143 | null => {
  const reply = raw as { requestId?: unknown; width?: unknown; height?: unknown; lines?: unknown } | null;
  if (!reply || typeof reply !== 'object' || reply.requestId !== id || !Array.isArray(reply.lines)) return null;
  const lines: OcrLine143[] = [];
  for (const item of reply.lines.slice(0, 400) as { text?: unknown; box?: { x?: unknown; y?: unknown; width?: unknown; height?: unknown } | null }[]) {
    const box = item?.box;
    if (typeof item?.text !== 'string' || !item.text.trim() || !box || !unit(box.x) || !unit(box.y) || !unit(box.width) || !unit(box.height)
      || box.width <= 0 || box.height <= 0) continue;
    lines.push({ text: item.text.trim().slice(0, 1000), box: { x: box.x, y: box.y, width: box.width, height: box.height } });
  }
  const width = reply.width, height = reply.height;
  return { lines, aspect: typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0 ? height / width : 4 / 3 };
};
const unimplemented = (error: unknown) => (error as { code?: unknown } | null)?.code === 'UNIMPLEMENTED'
  || /not implemented|unimplemented/i.test(String((error as { message?: unknown } | null)?.message ?? ''));

/** The transport is injected so the checks can stand in for the phone; `wait` is how long one read may take. */
export const createPageLines143 = (transport: PageLinesTransport143 | null, makeId: () => string = requestId, wait = 22000) =>
  async (image: string): Promise<PageLines143 | null> => {
    if (!transport || typeof image !== 'string' || image.length > 18 * 1024 * 1024
      || !/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) return null;
    const ask = async (method: 'recognizeLines' | 'recognize'): Promise<PageLines143 | null> => {
      const id = makeId();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const late = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('OCR_TIMEOUT')), wait); });
        return parse(await Promise.race([transport[method]!({ requestId: id, image }), late]), id);
      } catch (error) {
        // A read that is too slow is told to stop, so the single worker is free for the label scanner.
        if ((error as Error | null)?.message === 'OCR_TIMEOUT') { try { void Promise.resolve(transport.cancel({ requestId: id })).catch(() => undefined); } catch { /* Nothing to stop. */ } }
        throw error;
      } finally { clearTimeout(timer); }
    };
    try {
      // Only a binary that does not have the page method falls back; a busy or failed read is not asked twice.
      if (typeof transport.recognizeLines === 'function') {
        try { return await ask('recognizeLines'); } catch (error) { if (!unimplemented(error)) return null; }
      }
      return await ask('recognize');
    } catch { return null; }
  };

export const readPageLines143 = (image: string): Promise<PageLines143 | null> => createPageLines143(available() ? native : null)(image);
