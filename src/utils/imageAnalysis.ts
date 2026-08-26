import type { NormalizedBox } from '@/utils/multiWineScan';

export interface ImageQualityReport {
  width: number;
  height: number;
  megapixels: number;
  brightness: number | null;
  contrast: number | null;
  status: 'good' | 'warning' | 'poor';
  warnings: string[];
}

export interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
  quality: ImageQualityReport;
}

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen'));
  reader.readAsDataURL(file);
});

const loadImage = (dataUrl: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('El dispositivo no puede abrir este formato de imagen'));
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
  if (!sampleContext) return { brightness: null, contrast: null };
  sampleContext.drawImage(context.canvas, 0, 0, sampleWidth, sampleHeight);
  const pixels = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
  const values: number[] = [];
  for (let index = 0; index < pixels.length; index += 4) {
    values.push(pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722);
  }
  const brightness = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  const variance = values.reduce((sum, value) => sum + Math.pow(value - brightness, 2), 0) / Math.max(values.length, 1);
  return { brightness: Math.round(brightness), contrast: Math.round(Math.sqrt(variance)) };
};

export const prepareImageForAnalysis = async (file: File, maxDimension = 2400): Promise<PreparedImage> => {
  const originalDataUrl = await fileToDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('No se pudo preparar la imagen');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  const { brightness, contrast } = inspectPixels(context, width, height);
  const warnings: string[] = [];
  if (Math.min(image.naturalWidth, image.naturalHeight) < 700) warnings.push('Resolucion limitada para leer texto pequeno.');
  if (brightness !== null && brightness < 48) warnings.push('La foto esta oscura; algunas etiquetas pueden quedar dudosas.');
  if (brightness !== null && brightness > 225) warnings.push('Hay mucha luz; revisa reflejos y zonas quemadas.');
  if (contrast !== null && contrast < 22) warnings.push('El contraste es bajo; acerca la camara si el texto es pequeno.');
  const status: ImageQualityReport['status'] = warnings.length >= 3 ? 'poor' : warnings.length ? 'warning' : 'good';

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
      status,
      warnings,
    },
  };
};

export const cropImageRegion = async (
  dataUrl: string,
  box: NormalizedBox,
  paddingPercent = 2,
  maxDimension = 1600,
) => {
  const image = await loadImage(dataUrl);
  const paddingX = image.naturalWidth * paddingPercent / 100;
  const paddingY = image.naturalHeight * paddingPercent / 100;
  const sourceX = Math.max(0, image.naturalWidth * box.x / 100 - paddingX);
  const sourceY = Math.max(0, image.naturalHeight * box.y / 100 - paddingY);
  const sourceWidth = Math.min(image.naturalWidth - sourceX, image.naturalWidth * box.width / 100 + paddingX * 2);
  const sourceHeight = Math.min(image.naturalHeight - sourceY, image.naturalHeight * box.height / 100 + paddingY * 2);
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo recortar la region');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  return canvasToDataUrl(canvas, 0.92);
};
