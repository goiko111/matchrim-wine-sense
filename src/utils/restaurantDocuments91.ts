import { prepareImageForAnalysis } from './imageAnalysis';

export const RESTAURANT_DOCUMENT_LIMITS91 = Object.freeze({
  files: 20,
  fileBytes: 25 * 1024 * 1024,
  pdfPages: 50,
  batchPages: 100,
  imageDimension: 2400,
  textCharacters: 40_000,
  links: 20,
});

export interface RestaurantFileInspection91 {
  digest: string;
  pageCount: number;
  type: 'pdf' | 'image';
  name: string;
  size: number;
}

export type RestaurantQueuedFile91 = RestaurantFileInspection91 & { file: File };
export type RestaurantUrlImport91 =
  | { kind: 'file'; file: File; sourceUrl: string }
  | { kind: 'text'; text: string; sourceUrl: string; links: Array<{ url: string; label: string }> };

export class RestaurantDocumentError91 extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'RestaurantDocumentError91';
  }
}

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  checkAbort(signal);
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Cancelled', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

function checkSize(file: File) {
  if (!file.size) throw new RestaurantDocumentError91('empty_file', `${file.name}: el archivo esta vacio.`);
  if (file.size > RESTAURANT_DOCUMENT_LIMITS91.fileBytes) {
    throw new RestaurantDocumentError91('file_size_limit', `${file.name}: supera el limite de 25 MB por archivo.`);
  }
}

// Inspect bytes, not extensions or caller-controlled MIME types. SVG is intentionally unsupported.
function fileType(bytes: Uint8Array): 'pdf' | 'image' {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  if (head.startsWith('%PDF-')) return 'pdf';
  if ((bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    || [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte) || /^GIF8[79]a/.test(head)
    || (head.startsWith('RIFF') && head.substring(8, 12) === 'WEBP')
    || (head.substring(4, 8) === 'ftyp' && /(?:avif|avis|heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(head.substring(8, 64)))) return 'image';
  throw new RestaurantDocumentError91('unsupported_file', 'Formato no admitido. Elige PDF, JPEG, PNG, GIF, WebP, AVIF o HEIC/HEIF.');
}

type PdfJs91 = typeof import('pdfjs-dist');
type PdfDocument91 = Awaited<ReturnType<PdfJs91['getDocument']>['promise']>;
let pdfJsPromise: Promise<{ library: PdfJs91; workerUrl: string }> | undefined;
const inspections = new WeakMap<File, RestaurantFileInspection91>();

async function loadPdfJs91() {
  if (!pdfJsPromise) {
    pdfJsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.mjs?url'),
    ]).then(([library, worker]) => ({ library, workerUrl: worker.default }));
    pdfJsPromise.catch(() => { pdfJsPromise = undefined; });
  }
  const { library, workerUrl } = await pdfJsPromise;
  library.GlobalWorkerOptions.workerSrc = workerUrl;
  return library;
}

async function withPdf91<T>(file: File, signal: AbortSignal | undefined, run: (pdf: PdfDocument91) => Promise<T>): Promise<T> {
  const library = await abortable(loadPdfJs91(), signal);
  const data = await abortable(file.arrayBuffer(), signal);
  checkAbort(signal);
  const task = library.getDocument({
    data, isEvalSupported: false, disableAutoFetch: true, disableStream: true,
    stopAtErrors: true, canvasMaxAreaInBytes: 32_000_000,
  });
  let passwordRequired = false;
  const destroy = () => { void task.destroy().catch(() => undefined); };
  task.onPassword = () => { passwordRequired = true; destroy(); };
  signal?.addEventListener('abort', destroy, { once: true });
  try {
    const pdf = await abortable(task.promise, signal);
    checkAbort(signal);
    if (!Number.isInteger(pdf.numPages) || pdf.numPages < 1) {
      throw new RestaurantDocumentError91('invalid_pdf', `${file.name}: PDF sin paginas validas.`);
    }
    if (pdf.numPages > RESTAURANT_DOCUMENT_LIMITS91.pdfPages) {
      throw new RestaurantDocumentError91('pdf_page_limit', `${file.name}: contiene ${pdf.numPages} paginas. El maximo es 50; divide el PDF antes de importarlo.`);
    }
    return await run(pdf);
  } catch (error) {
    checkAbort(signal);
    if (passwordRequired) throw new RestaurantDocumentError91('password_pdf', `${file.name}: elimina la contrasena del PDF antes de importarlo.`);
    if (error instanceof RestaurantDocumentError91) throw error;
    throw new RestaurantDocumentError91('invalid_pdf', `${file.name}: no se pudo leer el PDF. ${error instanceof Error ? error.message : ''}`);
  } finally {
    signal?.removeEventListener('abort', destroy);
    await task.destroy().catch(() => undefined);
  }
}

export async function inspectRestaurantFile(file: File, signal?: AbortSignal): Promise<RestaurantFileInspection91> {
  checkAbort(signal);
  checkSize(file);
  const cached = inspections.get(file);
  if (cached) return { ...cached };
  const type = fileType(new Uint8Array(await abortable(file.slice(0, 1024).arrayBuffer(), signal)));
  const bytes = await abortable(file.arrayBuffer(), signal);
  const hash = await abortable(crypto.subtle.digest('SHA-256', bytes), signal);
  const digest = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const pageCount = type === 'pdf' ? await withPdf91(file, signal, async (pdf) => pdf.numPages) : 1;
  checkAbort(signal);
  const result: RestaurantFileInspection91 = { digest, pageCount, type, name: file.name, size: file.size };
  inspections.set(file, result);
  return { ...result };
}

/** Atomic admission: callers retain their existing queue when any selected file fails. */
export async function inspectRestaurantFiles91(
  files: readonly File[],
  signal?: AbortSignal,
  existing: readonly RestaurantFileInspection91[] = [],
): Promise<RestaurantQueuedFile91[]> {
  checkAbort(signal);
  if (files.length + existing.length > RESTAURANT_DOCUMENT_LIMITS91.files) {
    throw new RestaurantDocumentError91('file_count_limit', 'El lote admite un maximo de 20 archivos. Quita archivos antes de continuar.');
  }
  const digests = new Set<string>();
  let pages = 0;
  for (const entry of existing) {
    if (!Number.isInteger(entry.pageCount) || entry.pageCount < 1 || entry.pageCount > RESTAURANT_DOCUMENT_LIMITS91.pdfPages
      || entry.size > RESTAURANT_DOCUMENT_LIMITS91.fileBytes || !entry.digest || digests.has(entry.digest)) {
      throw new RestaurantDocumentError91('invalid_queue', 'La cola existente no es valida. Vuelve a seleccionar los archivos.');
    }
    digests.add(entry.digest);
    pages += entry.pageCount;
  }
  const result: RestaurantQueuedFile91[] = [];
  for (const file of files) {
    const inspection = await inspectRestaurantFile(file, signal);
    if (digests.has(inspection.digest)) throw new RestaurantDocumentError91('duplicate_file', `${file.name}: este archivo ya esta en el lote (contenido duplicado).`);
    digests.add(inspection.digest);
    pages += inspection.pageCount;
    if (pages > RESTAURANT_DOCUMENT_LIMITS91.batchPages) {
      throw new RestaurantDocumentError91('batch_page_limit', 'El lote supera el maximo de 100 paginas. Divide la seleccion en varios lotes.');
    }
    result.push({ file, ...inspection });
  }
  if (pages > RESTAURANT_DOCUMENT_LIMITS91.batchPages) throw new RestaurantDocumentError91('batch_page_limit', 'El lote supera el maximo de 100 paginas.');
  checkAbort(signal);
  return result;
}

function jpegFile(dataUrl: string, name: string): File {
  const prefix = 'data:image/jpeg;base64,';
  if (!dataUrl.startsWith(prefix)) throw new RestaurantDocumentError91('invalid_image', 'No se pudo preparar la imagen como JPEG.');
  const binary = atob(dataUrl.substring(prefix.length));
  return new File([Uint8Array.from(binary, (char) => char.charCodeAt(0))], name, { type: 'image/jpeg' });
}

let renderTail: Promise<unknown> = Promise.resolve();

/** One-based; serialized even when callers accidentally request pages concurrently. */
export async function renderRestaurantPage(file: File, pageNumber: number, signal?: AbortSignal): Promise<File> {
  checkAbort(signal);
  const result = renderTail.then(async () => {
    checkAbort(signal);
    const info = await inspectRestaurantFile(file, signal);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > info.pageCount) {
      throw new RestaurantDocumentError91('invalid_page', `${file.name}: pagina ${pageNumber} fuera del intervalo 1-${info.pageCount}.`);
    }
    const outputName = `${file.name.replace(/\.[^.]+$/, '')}-page-${pageNumber}.jpg`;
    if (info.type === 'image') {
      const prepared = await prepareImageForAnalysis(file, RESTAURANT_DOCUMENT_LIMITS91.imageDimension, signal);
      checkAbort(signal);
      return jpegFile(prepared.dataUrl, outputName);
    }
    return withPdf91(file, signal, async (pdf) => {
      const page = await abortable(pdf.getPage(pageNumber), signal);
      const canvas = document.createElement('canvas');
      let render: ReturnType<typeof page.render> | undefined;
      const cancelRender = () => render?.cancel();
      try {
        const unscaled = page.getViewport({ scale: 1 });
        const dimension = Math.max(unscaled.width, unscaled.height);
        if (!Number.isFinite(dimension) || dimension <= 0 || unscaled.width <= 0 || unscaled.height <= 0) {
          throw new RestaurantDocumentError91('invalid_pdf', 'El PDF contiene una pagina con dimensiones invalidas.');
        }
        const viewport = page.getViewport({ scale: Math.min(2, RESTAURANT_DOCUMENT_LIMITS91.imageDimension / dimension) });
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        const context = canvas.getContext('2d');
        if (!context) throw new RestaurantDocumentError91('canvas_unavailable', 'No se pudo preparar la pagina del PDF.');
        checkAbort(signal);
        render = page.render({ canvasContext: context, viewport, canvas, background: '#ffffff' });
        signal?.addEventListener('abort', cancelRender, { once: true });
        await abortable(render.promise, signal);
        const blob = await abortable(new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo convertir la pagina a JPEG.')), 'image/jpeg', 0.92);
        }), signal);
        checkAbort(signal);
        return new File([blob], outputName, { type: 'image/jpeg' });
      } finally {
        signal?.removeEventListener('abort', cancelRender);
        render?.cancel();
        if (render) await render.promise.catch(() => undefined);
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    });
  });
  renderTail = result.then(() => undefined, () => undefined);
  return abortable(result, signal);
}

/** No pre-rendering: consume/scan the yielded File before requesting the next page. */
export async function* iterateRestaurantPages91(files: readonly File[], signal?: AbortSignal) {
  const queue = await inspectRestaurantFiles91(files, signal);
  for (const source of queue) {
    for (let pageNumber = 1; pageNumber <= source.pageCount; pageNumber++) {
      checkAbort(signal);
      yield { source, pageNumber, file: await renderRestaurantPage(source.file, pageNumber, signal) };
    }
  }
}

function hasControlCharacters91(value: string): boolean {
  return Array.from(value).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
}

function publicHttpsUrl91(value: unknown): URL {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\\]/.test(value) || hasControlCharacters91(value)) {
    throw new RestaurantDocumentError91('invalid_url', 'Introduce una URL HTTPS publica valida.');
  }
  let url: URL;
  try { url = new URL(value); } catch { throw new RestaurantDocumentError91('invalid_url', 'Introduce una URL HTTPS publica valida.'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !host.includes('.')
    || /^[\d.]+$/.test(host) || host.includes(':') || host.endsWith('.')
    || /(?:^|\.)(?:localhost|local|internal|invalid|test|example|onion|arpa)$/.test(host)) {
    throw new RestaurantDocumentError91('invalid_url', 'Solo se admiten URL HTTPS publicas, sin credenciales, IP ni puertos personalizados.');
  }
  url.hash = '';
  return url;
}

/** Adapter returns the decoded Edge payload; the parent owns the authenticated invocation. */
export async function importRestaurantUrl91(
  url: string,
  invoke: (body: { url: string }, signal?: AbortSignal) => Promise<unknown>,
  signal?: AbortSignal,
): Promise<RestaurantUrlImport91> {
  checkAbort(signal);
  const requested = publicHttpsUrl91(url.trim());
  const raw = await abortable(invoke({ url: requested.href }, signal), signal);
  checkAbort(signal);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new RestaurantDocumentError91('invalid_import_response', 'Respuesta de importacion no valida.');
  const result = raw as Record<string, unknown>;
  if (typeof result.error === 'string') throw new RestaurantDocumentError91(typeof result.code === 'string' ? result.code : 'import_failed', result.error);
  const sourceUrl = publicHttpsUrl91(result.sourceUrl).href;
  if (result.kind === 'text') {
    if (typeof result.text !== 'string' || result.text.length > RESTAURANT_DOCUMENT_LIMITS91.textCharacters
      || !Array.isArray(result.links) || result.links.length > RESTAURANT_DOCUMENT_LIMITS91.links) {
      throw new RestaurantDocumentError91('invalid_import_response', 'El texto o los enlaces importados superan los limites permitidos.');
    }
    const links = result.links.map((link: unknown) => {
      if (!link || typeof link !== 'object') throw new RestaurantDocumentError91('invalid_import_response', 'Enlace importado no valido.');
      const { url: href, label } = link as Record<string, unknown>;
      const parsed = publicHttpsUrl91(href);
      if (parsed.hostname !== new URL(sourceUrl).hostname || typeof label !== 'string' || label.length > 256) {
        throw new RestaurantDocumentError91('invalid_import_response', 'Enlace importado fuera del dominio permitido.');
      }
      return { url: parsed.href, label };
    });
    if (!result.text.trim() && !links.length) throw new RestaurantDocumentError91('empty_html', 'La web no contiene texto accesible ni enlaces de carta. Sube el archivo directamente.');
    return { kind: 'text', text: result.text, sourceUrl, links };
  }
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'];
  if (result.kind !== 'file' || typeof result.mime !== 'string' || !allowedMimes.includes(result.mime)
    || typeof result.name !== 'string' || !result.name || result.name.length > 200 || /[\\/]/.test(result.name) || hasControlCharacters91(result.name)
    || typeof result.base64 !== 'string' || !result.base64.length
    || result.base64.length > 4 * Math.ceil(RESTAURANT_DOCUMENT_LIMITS91.fileBytes / 3)
    || result.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(result.base64)) {
    throw new RestaurantDocumentError91('invalid_import_response', 'Archivo importado no valido o demasiado grande.');
  }
  let binary: string;
  try { binary = atob(result.base64); } catch { throw new RestaurantDocumentError91('invalid_import_response', 'El archivo importado no tiene una codificacion valida.'); }
  const file = new File([Uint8Array.from(binary, (char) => char.charCodeAt(0))], result.name, { type: result.mime });
  checkSize(file);
  const type = fileType(new Uint8Array(await abortable(file.slice(0, 1024).arrayBuffer(), signal)));
  if ((type === 'pdf') !== (result.mime === 'application/pdf')) throw new RestaurantDocumentError91('invalid_import_response', 'El contenido no corresponde al tipo de archivo importado.');
  checkAbort(signal);
  return { kind: 'file', file, sourceUrl };
}
