import { prepareImageForAnalysis, cropImageRegionWithQuality } from '../../src/utils/imageAnalysis';
const input = document.querySelector<HTMLInputElement>('input')!;
const preview = document.querySelector<HTMLImageElement>('#preview')!;
const status = document.querySelector<HTMLElement>('#status')!;
let controller: AbortController | null = null;
input.addEventListener('change', async () => {
  const file = input.files?.[0];
  if (!file) return;
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  status.textContent = 'Preparando';
  try {
    const prepared = await prepareImageForAnalysis(file, 2400, signal);
    // Same old interface fixture boxes; no new image, OCR, scoring or dataset.
    for (const box of [{ x: 3, y: 15, width: 16, height: 68 }, { x: 22, y: 18, width: 17, height: 64 }, { x: 42, y: 13, width: 16, height: 70 }, { x: 61, y: 17, width: 16, height: 66 }]) {
      await cropImageRegionWithQuality(prepared.dataUrl, box, 2, 1600, signal);
    }
    if (signal.aborted) return;
    preview.src = prepared.dataUrl;
    status.textContent = 'Preparada';
  } catch (error) {
    status.textContent = error instanceof DOMException && error.name === 'AbortError' ? 'Cancelada' : 'Error local';
  }
});
document.querySelector('#reset')!.addEventListener('click', () => {
  controller?.abort();
  controller = null;
  preview.removeAttribute('src');
  input.value = '';
  status.textContent = 'Sin imagen';
});
