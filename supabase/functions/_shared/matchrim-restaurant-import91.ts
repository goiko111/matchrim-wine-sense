import { parse, type DefaultTreeAdapterMap } from 'npm:parse5@7.3.0';
import ipaddr from 'npm:ipaddr.js@2.2.0';

export const RESTAURANT_IMPORT_LIMITS91 = Object.freeze({
  fileBytes: 25 * 1024 * 1024,
  htmlBytes: 1024 * 1024,
  requestBytes: 8192,
  textCharacters: 40_000,
  links: 20,
  redirects: 3,
  timeoutMs: 20_000,
  domNodes: 50_000,
  domDepth: 256,
});

export class RestaurantImportError91 extends Error {
  constructor(readonly code: string, message: string, readonly status = 422) {
    super(message);
    this.name = 'RestaurantImportError91';
  }
}

export type RestaurantImportPayload91 =
  | { kind: 'file'; mime: string; name: string; base64: string; sourceUrl: string }
  | { kind: 'text'; text: string; sourceUrl: string; links: Array<{ url: string; label: string }> };

export interface RestaurantImportDependencies91 {
  resolve: (hostname: string, signal: AbortSignal) => Promise<string[]>;
  fetch: (url: string, init: RequestInit, addresses: readonly string[]) => Promise<Response>;
}

export function restaurantPublicUrl91(input: unknown): URL {
  if (typeof input !== 'string' || input.length > 2048 || !input.length || /[\s\\]/.test(input)
    || Array.from(input).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
    throw new RestaurantImportError91('invalid_url', 'Introduce una URL HTTPS publica valida.', 400);
  }
  let url: URL;
  try { url = new URL(input); } catch { throw new RestaurantImportError91('invalid_url', 'Introduce una URL HTTPS publica valida.', 400); }
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port
    || ipaddr.isValid(hostname) || hostname.includes(':') || hostname.endsWith('.') || !hostname.includes('.')
    || !hostname.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
    || /(?:^|\.)(?:localhost|local|internal|invalid|test|example|onion|arpa)$/.test(hostname)) {
    throw new RestaurantImportError91('unsafe_url', 'Solo se admiten URL HTTPS publicas, sin credenciales, IP ni puertos personalizados.', 400);
  }
  url.hash = '';
  return url;
}

export function restaurantPublicAddress91(address: string): boolean {
  try {
    if (address.includes('%')) return false;
    const parsed = ipaddr.parse(address);
    if (parsed.kind() === 'ipv6') {
      // Only global unicast, excluding transition, mapped, documentation and special ranges.
      return parsed.range() === 'unicast' && parsed.match(ipaddr.parseCIDR('2000::/3'))
        && !parsed.match(ipaddr.parseCIDR('2001::/23'))
        && !parsed.match(ipaddr.parseCIDR('3fff::/20'));
    }
    return parsed.range() === 'unicast'
      && !parsed.match(ipaddr.parseCIDR('192.0.0.0/24'));
  } catch { return false; }
}

function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw signal.reason ?? new DOMException('Cancelled', 'AbortError');
}

export function restaurantAbortable91<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    // The supplied operation may have started already; always observe its rejection.
    void promise.catch(() => undefined);
    return Promise.reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

export async function readRestaurantBody91(response: Response, maxBytes: number, signal: AbortSignal): Promise<Uint8Array> {
  const declared = response.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    void response.body?.cancel().catch(() => undefined);
    throw new RestaurantImportError91('body_size_limit', 'El recurso supera el limite de tamano permitido.', 413);
  }
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let complete = false;
  try {
    while (true) {
      checkAbort(signal);
      const part = await restaurantAbortable91(reader.read(), signal);
      if (part.done) { complete = true; break; }
      size += part.value.byteLength;
      if (size > maxBytes) throw new RestaurantImportError91('body_size_limit', 'El recurso supera el limite de tamano permitido.', 413);
      chunks.push(part.value);
    }
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return result;
  } finally {
    if (!complete) void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export function restaurantFileMime91(bytes: Uint8Array): string | null {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  if (head.startsWith('%PDF-')) return 'application/pdf';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return 'image/png';
  if (/^GIF8[79]a/.test(head)) return 'image/gif';
  if (head.startsWith('RIFF') && head.substring(8, 12) === 'WEBP') return 'image/webp';
  if (head.substring(4, 8) === 'ftyp') {
    const brands = head.substring(8, 64);
    if (/(?:avif|avis)/.test(brands)) return 'image/avif';
    if (/(?:heic|heix|hevc|hevx|heim|heis)/.test(brands)) return 'image/heic';
    if (/(?:mif1|msf1)/.test(brands)) return 'image/heif';
  }
  return null;
}

type Node91 = DefaultTreeAdapterMap['node'];
type Element91 = DefaultTreeAdapterMap['element'];
const omittedTags = new Set(['head', 'script', 'style', 'template', 'noscript', 'iframe', 'object', 'embed', 'svg', 'canvas', 'input']);
const blockTags = new Set(['p', 'div', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'br', 'hr']);

function isHidden91(element: Element91): boolean {
  const attrs = new Map(element.attrs.map(({ name, value }) => [name, value]));
  return omittedTags.has(element.tagName) || attrs.has('hidden') || attrs.has('inert')
    || attrs.get('aria-hidden')?.toLowerCase() === 'true'
    || /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden)\s*(?:!important\s*)?(?:;|$)/i.test(attrs.get('style') ?? '');
}

/** Inert HTML5 parse: no scripts, subresources, base-href overrides or automatic link fetching. */
export function extractRestaurantHtml91(html: string, source: string): RestaurantImportPayload91 & { kind: 'text' } {
  const sourceUrl = restaurantPublicUrl91(source);
  const document = parse(html, { scriptingEnabled: true });
  const chunks: string[] = [];
  const candidates: Array<{ href: string; chunks: string[] }> = [];
  const stack: Array<{ node: Node91; depth: number; anchor?: { href: string; chunks: string[] }; end?: boolean }> = [{ node: document, depth: 0 }];
  let nodes = 0;
  let textSize = 0;
  while (stack.length) {
    const item = stack.pop()!;
    const { node, depth } = item;
    if (item.end) { chunks.push('\n'); continue; }
    if (++nodes > RESTAURANT_IMPORT_LIMITS91.domNodes || depth > RESTAURANT_IMPORT_LIMITS91.domDepth) {
      throw new RestaurantImportError91('html_complexity_limit', 'La web es demasiado compleja. Sube el PDF o la imagen de la carta.', 413);
    }
    if (node.nodeName === '#text' && 'value' in node) {
      const value = node.value.replace(/\s+/g, ' ');
      textSize += value.length;
      if (textSize > RESTAURANT_IMPORT_LIMITS91.textCharacters) {
        throw new RestaurantImportError91('text_size_limit', 'La web supera el limite de 40000 caracteres. Selecciona un enlace de carta mas concreto o sube su PDF.', 413);
      }
      chunks.push(value);
      item.anchor?.chunks.push(value);
      continue;
    }
    let anchor = item.anchor;
    if ('tagName' in node) {
      const element = node as Element91;
      if (isHidden91(element)) continue;
      if (blockTags.has(element.tagName)) {
        chunks.push('\n');
        stack.push({ node, depth, end: true });
      }
      if (element.tagName === 'a') {
        const href = element.attrs.find((attr) => attr.name === 'href')?.value;
        if (href) { anchor = { href, chunks: [] }; candidates.push(anchor); }
      }
    }
    if ('childNodes' in node) {
      for (let index = node.childNodes.length - 1; index >= 0; index--) stack.push({ node: node.childNodes[index], depth: depth + 1, anchor });
    }
  }
  const links: Array<{ url: string; label: string }> = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    let url: URL;
    try { url = restaurantPublicUrl91(new URL(candidate.href, sourceUrl).href); } catch { continue; }
    if (url.hostname !== sourceUrl.hostname || seen.has(url.href) || url.href === sourceUrl.href) continue;
    const label = candidate.chunks.join(' ').replace(/\s+/g, ' ').trim();
    if (!/\.pdf$/i.test(url.pathname) && !/(?:menu|men[u\u00fa]|carta|wine|vino|food|comida)/i.test(`${url.pathname} ${label}`)) continue;
    seen.add(url.href);
    links.push({ url: url.href, label: label && label.length <= 256 ? label : 'Carta / menu' });
    if (links.length > RESTAURANT_IMPORT_LIMITS91.links) {
      throw new RestaurantImportError91('link_count_limit', 'La web contiene mas de 20 enlaces de carta. Introduce una URL mas concreta.', 413);
    }
  }
  const text = chunks.join('').replace(/[^\S\n]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length > RESTAURANT_IMPORT_LIMITS91.textCharacters) throw new RestaurantImportError91('text_size_limit', 'El texto supera el limite de 40000 caracteres. Sube el PDF de la carta.', 413);
  if (!text && !links.length) throw new RestaurantImportError91('empty_html', 'La web no ofrece texto HTML accesible ni enlaces de carta. Puede requerir JavaScript o bloquear el acceso; sube el archivo directamente.');
  // Static visibility only. External CSS and JavaScript are deliberately not evaluated.
  return { kind: 'text', text, sourceUrl: sourceUrl.href, links };
}

function base64File91(bytes: Uint8Array): string {
  const chunks: string[] = [];
  // A multiple of three preserves base64 grouping without spreading a 25 MB array.
  for (let offset = 0; offset < bytes.length; offset += 24_576) {
    chunks.push(btoa(String.fromCharCode(...bytes.subarray(offset, offset + 24_576))));
  }
  return chunks.join('');
}

function fileName91(url: URL, mime: string): string {
  const extensions: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif', 'image/heic': 'heic', 'image/heif': 'heif' };
  let leaf = url.pathname.split('/').pop() || 'restaurant-menu';
  try { leaf = decodeURIComponent(leaf); } catch { leaf = 'restaurant-menu'; }
  const stem = leaf.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9._-]/g, '-').substring(0, 140) || 'restaurant-menu';
  return `${stem}.${extensions[mime]}`;
}

/** Every hop supplies its validated DNS snapshot to the IP-pinned transport. */
export async function importRestaurantResource91(
  input: unknown,
  deps: RestaurantImportDependencies91,
  parentSignal?: AbortSignal,
): Promise<RestaurantImportPayload91> {
  let url = restaurantPublicUrl91(input);
  const controller = new AbortController();
  const cancel = () => controller.abort(parentSignal?.reason ?? new DOMException('Cancelled', 'AbortError'));
  const timer = setTimeout(() => controller.abort(new RestaurantImportError91('import_timeout', 'La web ha tardado demasiado. Sube el archivo directamente.', 504)), RESTAURANT_IMPORT_LIMITS91.timeoutMs);
  if (parentSignal?.aborted) cancel();
  else parentSignal?.addEventListener('abort', cancel, { once: true });
  const signal = controller.signal;
  try {
    for (let hop = 0; hop <= RESTAURANT_IMPORT_LIMITS91.redirects; hop++) {
      checkAbort(signal);
      let addresses: string[];
      try { addresses = await restaurantAbortable91(deps.resolve(url.hostname, signal), signal); }
      catch (error) {
        checkAbort(signal);
        if (error instanceof RestaurantImportError91) throw error;
        throw new RestaurantImportError91('dns_unavailable', 'No se pudo verificar el DNS publico de esta web. Sube el archivo directamente.', 503);
      }
      if (!addresses.length || addresses.length > 32 || addresses.some((address) => !restaurantPublicAddress91(address))) {
        throw new RestaurantImportError91('unsafe_dns', 'La URL no resuelve exclusivamente a direcciones publicas. No se puede importar.', 400);
      }
      const response = await restaurantAbortable91(deps.fetch(url.href, {
        method: 'GET', signal, redirect: 'manual', credentials: 'omit', referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/pdf,image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,text/html' },
      }, Object.freeze([...addresses])).then((response) => {
        if (signal.aborted) void response.body?.cancel().catch(() => undefined);
        return response;
      }), signal);
      // A runtime/adapter that auto-follows redirects would bypass the hop checks.
      if (response.redirected || (response.url && response.url !== url.href)) {
        void response.body?.cancel().catch(() => undefined);
        throw new RestaurantImportError91('unsafe_redirect', 'No se pudo verificar la redireccion de forma segura.', 502);
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        void response.body?.cancel().catch(() => undefined);
        if (hop === RESTAURANT_IMPORT_LIMITS91.redirects) throw new RestaurantImportError91('redirect_limit', 'La URL supera el limite de 3 redirecciones.', 422);
        const location = response.headers.get('location');
        if (!location) throw new RestaurantImportError91('invalid_redirect', 'La web devolvio una redireccion sin destino.', 502);
        try { url = restaurantPublicUrl91(new URL(location, url).href); }
        catch { throw new RestaurantImportError91('unsafe_redirect', 'La web redirige a una URL no permitida.', 400); }
        continue;
      }
      if (!response.ok) {
        void response.body?.cancel().catch(() => undefined);
        throw new RestaurantImportError91('upstream_blocked', `La web no permite importar este recurso (HTTP ${response.status}). Sube el archivo directamente.`, 422);
      }
      const contentType = response.headers.get('content-type') ?? '';
      const mime = contentType.split(';')[0].trim().toLowerCase();
      const html = mime === 'text/html';
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'];
      if (!html && !allowed.includes(mime)) {
        void response.body?.cancel().catch(() => undefined);
        throw new RestaurantImportError91('unsupported_content_type', 'La URL no devuelve HTML, PDF o una imagen compatible. Sube el archivo directamente.', 415);
      }
      const bytes = await readRestaurantBody91(response, html ? RESTAURANT_IMPORT_LIMITS91.htmlBytes : RESTAURANT_IMPORT_LIMITS91.fileBytes, signal);
      checkAbort(signal);
      if (html) {
        const charset = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1] ?? 'utf-8';
        let decoded: string;
        try { decoded = new TextDecoder(charset).decode(bytes); }
        catch { throw new RestaurantImportError91('unsupported_charset', 'No se puede leer la codificacion de esta web. Sube el archivo directamente.', 415); }
        return extractRestaurantHtml91(decoded, url.href);
      }
      const detected = restaurantFileMime91(bytes);
      if (detected !== mime) throw new RestaurantImportError91('content_type_mismatch', 'El contenido de la URL no corresponde al tipo de archivo anunciado.', 415);
      return { kind: 'file', mime, name: fileName91(url, mime), base64: base64File91(bytes), sourceUrl: url.href };
    }
    throw new RestaurantImportError91('redirect_limit', 'Demasiadas redirecciones.');
  } catch (error) {
    checkAbort(signal);
    if (error instanceof RestaurantImportError91) throw error;
    throw new RestaurantImportError91('import_unavailable', 'No se pudo acceder al recurso publico. Puede bloquear las importaciones; sube el archivo directamente.', 502);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', cancel);
  }
}
