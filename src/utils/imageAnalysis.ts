import type { NormalizedBox } from '@/utils/multiWineScan';
import { getCropGeometry } from './imageCropGeometry';

export interface ImageQualityReport {
  width: number;
  height: number;
  megapixels: number;
  brightness: number | null;
  contrast: number | null;
  sharpness: number | null;
  status: 'good' | 'warning' | 'poor';
  warnings: string[];
}

export interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
  quality: ImageQualityReport;
}

export interface ImagePreparationOptions {
  maxFileBytes?: number;
  maxImagePixels?: number;
  compositeOnWhite?: boolean;
}

export const NATIVE_IMAGE_PREPARATION_LIMITS = Object.freeze({
  maxFileBytes: 25 * 1024 * 1024,
  maxImagePixels: 64_000_000,
  compositeOnWhite: true,
});

const imagePreparationMessages = {
  read: 'No se pudo leer la imagen. Elige otra foto o vuelve a capturarla.',
  decode: 'El dispositivo no puede abrir este formato de imagen. Elige una foto JPEG o PNG.',
  prepare: 'No se pudo preparar la imagen. Elige otra foto o vuelve a capturarla.',
  file_size_limit: 'No se puede preparar esta foto por su tamaño. Elige una foto más ligera o vuelve a capturarla.',
  image_pixel_limit: 'La resolución de esta foto es demasiado grande o no es válida. Elige una foto de menor resolución o vuelve a capturarla.',
} as const;

export class ImagePreparationError extends Error {
  constructor(readonly code: keyof typeof imagePreparationMessages) {
    super(imagePreparationMessages[code]);
    this.name = 'ImagePreparationError';
  }
}

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
};

const fileToDataUrl = (file: File, signal?: AbortSignal) => new Promise<string>((resolve, reject) => {
  if (signal?.aborted) {
    reject(new DOMException('Cancelled', 'AbortError'));
    return;
  }
  const reader = new FileReader();
  const cleanup = () => {
    reader.onload = null;
    reader.onerror = null;
    reader.onabort = null;
    signal?.removeEventListener('abort', onAbort);
  };
  const onAbort = () => {
    cleanup();
    if (reader.readyState === FileReader.LOADING) reader.abort();
    reject(new DOMException('Cancelled', 'AbortError'));
  };
  reader.onload = () => {
    const result = reader.result as string;
    cleanup();
    resolve(result);
  };
  reader.onerror = () => { cleanup(); reject(new ImagePreparationError('read')); };
  reader.onabort = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
  signal?.addEventListener('abort', onAbort, { once: true });
  try { reader.readAsDataURL(file); }
  catch { cleanup(); reject(new ImagePreparationError('read')); }
});

const loadImage = (dataUrl: string, signal?: AbortSignal) => new Promise<HTMLImageElement>((resolve, reject) => {
  if (signal?.aborted) {
    reject(new DOMException('Cancelled', 'AbortError'));
    return;
  }
  const image = new Image();
  const cleanup = () => {
    image.onload = null;
    image.onerror = null;
    signal?.removeEventListener('abort', onAbort);
  };
  const onAbort = () => {
    cleanup();
    image.removeAttribute('src');
    reject(new DOMException('Cancelled', 'AbortError'));
  };
  image.onload = () => { cleanup(); resolve(image); };
  image.onerror = () => { cleanup(); reject(new ImagePreparationError('decode')); };
  signal?.addEventListener('abort', onAbort, { once: true });
  image.src = dataUrl;
});

const canvasToDataUrl = (canvas: HTMLCanvasElement, quality = 0.9) => (
  canvas.toDataURL('image/jpeg', quality)
);

const inspectPixels = (context: CanvasRenderingContext2D, width: number, height: number) => {
  const sampleWidth = Math.min(96, width);
  const sampleHeight = Math.min(96, height);
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = sampleWidth;
  sampleCanvas.height = sampleHeight;
  const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!sampleContext) return { brightness: null, contrast: null, sharpness: null };
  sampleContext.drawImage(context.canvas, 0, 0, sampleWidth, sampleHeight);
  const pixels = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
  const values: number[] = [];
  for (let index = 0; index < pixels.length; index += 4) {
    values.push(pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722);
  }
  const brightness = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  const variance = values.reduce((sum, value) => sum + Math.pow(value - brightness, 2), 0) / Math.max(values.length, 1);
  let edgeEnergy = 0;
  let edgeSamples = 0;
  for (let y = 1; y < sampleHeight - 1; y += 1) {
    for (let x = 1; x < sampleWidth - 1; x += 1) {
      const index = y * sampleWidth + x;
      const laplacian = Math.abs(
        values[index] * 4
        - values[index - 1]
        - values[index + 1]
        - values[index - sampleWidth]
        - values[index + sampleWidth]
      );
      edgeEnergy += laplacian;
      edgeSamples += 1;
    }
  }
  return {
    brightness: Math.round(brightness),
    contrast: Math.round(Math.sqrt(variance)),
    sharpness: edgeSamples ? Math.round((edgeEnergy / edgeSamples) * 10) / 10 : null,
  };
};

export const shouldRejectTextAnalysis = (quality: ImageQualityReport) => (
  Math.min(quality.width, quality.height) < 600
  && quality.sharpness !== null
  && quality.sharpness < 12
);

export const prepareImageForAnalysis = async (
  file: File,
  maxDimension = 2400,
  signal?: AbortSignal,
  options?: ImagePreparationOptions,
): Promise<PreparedImage> => {
  if (options?.maxFileBytes !== undefined) {
    throwIfAborted(signal);
    const size = file.size;
    if (!Number.isSafeInteger(options.maxFileBytes) || options.maxFileBytes <= 0
      || !Number.isSafeInteger(size) || size <= 0 || size > options.maxFileBytes) {
      throw new ImagePreparationError('file_size_limit');
    }
  }
  const originalDataUrl = await fileToDataUrl(file, signal);
  throwIfAborted(signal);
  const image = await loadImage(originalDataUrl, signal);
  throwIfAborted(signal);
  if (options?.maxImagePixels !== undefined) {
    const { naturalWidth, naturalHeight } = image;
    const pixels = naturalWidth * naturalHeight;
    if (!Number.isSafeInteger(options.maxImagePixels) || options.maxImagePixels <= 0
      || !Number.isSafeInteger(naturalWidth) || naturalWidth <= 0
      || !Number.isSafeInteger(naturalHeight) || naturalHeight <= 0
      || !Number.isSafeInteger(pixels) || pixels > options.maxImagePixels) {
      throw new ImagePreparationError('image_pixel_limit');
    }
  }
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new ImagePreparationError('prepare');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  // JPEG has no alpha; native packshots must not acquire a black backdrop.
  if (options?.compositeOnWhite === true) {
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(image, 0, 0, width, height);

  const { brightness, contrast, sharpness } = inspectPixels(context, width, height);
  const warnings: string[] = [];
  if (Math.min(image.naturalWidth, image.naturalHeight) < 700) warnings.push('Resolucion limitada para leer texto pequeno.');
  if (brightness !== null && brightness < 48) warnings.push('La foto esta oscura; algunas etiquetas pueden quedar dudosas.');
  if (brightness !== null && brightness > 225) warnings.push('Hay mucha luz; revisa reflejos y zonas quemadas.');
  if (contrast !== null && contrast < 22) warnings.push('El contraste es bajo; acerca la camara si el texto es pequeno.');
  if (sharpness !== null && sharpness < 12) warnings.push('La imagen esta desenfocada para leer texto pequeno.');
  const lowTextSignal = Math.min(image.naturalWidth, image.naturalHeight) < 600
    && sharpness !== null
    && sharpness < 12;
  const status: ImageQualityReport['status'] = lowTextSignal || warnings.length >= 3
    ? 'poor'
    : warnings.length
      ? 'warning'
      : 'good';

  return {
    dataUrl: canvasToDataUrl(canvas),
    width,
    height,
    quality: {
      width: image.naturalWidth,
      height: image.naturalHeight,
      megapixels: Math.round((image.naturalWidth * image.naturalHeight / 1_000_000) * 10) / 10,
      brightness,
      contrast,
      sharpness,
      status,
      warnings,
    },
  };
};

export const cropImageRegionWithQuality = async (
  dataUrl: string,
  box: NormalizedBox,
  paddingPercent = 2,
  maxDimension = 1600,
  signal?: AbortSignal,
) => {
  const image = await loadImage(dataUrl, signal);
  throwIfAborted(signal);
  const geometry = getCropGeometry(image.naturalWidth, image.naturalHeight, box, paddingPercent);
  const { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight } = geometry.pixels;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo recortar la region');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  return {
    dataUrl: canvasToDataUrl(canvas, 0.92),
    geometry,
    quality: inspectPixels(context, canvas.width, canvas.height),
  };
};

export const cropImageRegion = async (dataUrl: string, box: NormalizedBox, paddingPercent = 2, maxDimension = 1600, signal?: AbortSignal) => (
  (await cropImageRegionWithQuality(dataUrl, box, paddingPercent, maxDimension, signal)).dataUrl
);
