import { Buffer } from 'node:buffer';
import { HTTPParser } from 'npm:http-parser-js@0.5.10';
import ipaddr from 'npm:ipaddr.js@2.2.0';
import {
  restaurantAbortable91,
  restaurantPublicAddress91,
  restaurantPublicUrl91,
  RestaurantImportError91,
  RESTAURANT_IMPORT_LIMITS91,
} from './matchrim-restaurant-import91.ts';

interface Connection91 {
  remoteAddr: { transport?: string; hostname: string; port: number };
  read(buffer: Uint8Array): Promise<number | null>;
  write(buffer: Uint8Array): Promise<number>;
  close(): void;
}
interface TlsConnection91 extends Connection91 {
  handshake(): Promise<unknown>;
}
export interface RestaurantPinnedRuntime91 {
  connect(options: { hostname: string; port: number; transport: 'tcp' }): Promise<Connection91>;
  startTls(connection: Connection91, options: { hostname: string; alpnProtocols: string[] }): Promise<TlsConnection91>;
}

export function restaurantPinnedTransportAvailable91(runtime: unknown): runtime is RestaurantPinnedRuntime91 {
  return !!runtime && typeof (runtime as RestaurantPinnedRuntime91).connect === 'function'
    && typeof (runtime as RestaurantPinnedRuntime91).startTls === 'function';
}

function samePeer91(connection: Connection91, address: string, tls = false): boolean {
  try {
    // Deno 2.1 startTls preserves host/port but omits the TCP transport discriminator.
    return (connection.remoteAddr.transport === 'tcp' || (tls && connection.remoteAddr.transport === undefined)) && connection.remoteAddr.port === 443
      && ipaddr.parse(connection.remoteAddr.hostname).toNormalizedString() === ipaddr.parse(address).toNormalizedString();
  } catch { return false; }
}

/* Verified source semantics:
 * Supabase edge-runtime/ext/runtime/js/denoOverrides.js exports connect/startTls.
 * deno v2.1.4/ext/net/ops_tls.rs::op_tls_start takes the existing TCP resource,
 * obtains peer_addr(), and uses hostname only as rustls ServerName (SNI + verification).
 * node:https is intentionally NOT used: Supabase's http.ts rejects options.lookup.
 * No fetch, proxy, hostname connect, connection pool or fallback is used here.
 */
export async function fetchPinnedRestaurantUrl91(
  input: string,
  init: RequestInit,
  addresses: readonly string[],
  runtime: RestaurantPinnedRuntime91 = Deno as unknown as RestaurantPinnedRuntime91,
): Promise<Response> {
  if (!restaurantPinnedTransportAvailable91(runtime)) {
    throw new RestaurantImportError91('pinned_transport_unavailable', 'Este entorno no dispone del transporte TLS con IP fijada. Sube el archivo directamente.', 503);
  }
  const url = restaurantPublicUrl91(input);
  if (init.method !== 'GET' || init.redirect !== 'manual' || !addresses.length || addresses.length > 32
    || addresses.some((address) => !restaurantPublicAddress91(address))) {
    throw new RestaurantImportError91('unsafe_transport_request', 'La solicitud no contiene exclusivamente IP publicas verificadas.', 400);
  }
  // One validated IP per hop; connection failure is explicit, never a hostname fallback.
  const address = addresses[0];
  const controller = new AbortController();
  const signal = controller.signal;
  let connection: Connection91 | undefined;
  const close = () => { try { connection?.close(); } catch { /* Already closed or transferred to TLS. */ } };
  const cancel = () => controller.abort(init.signal?.reason ?? new DOMException('Cancelled', 'AbortError'));
  const timer = setTimeout(() => controller.abort(new RestaurantImportError91('import_timeout', 'El transporte TLS ha tardado demasiado.', 504)), RESTAURANT_IMPORT_LIMITS91.timeoutMs);
  signal.addEventListener('abort', close, { once: true });
  if (init.signal?.aborted) cancel();
  else init.signal?.addEventListener('abort', cancel, { once: true });
  const awaitConnection = <T extends Connection91>(promise: Promise<T>) => restaurantAbortable91(promise.then((value) => {
    if (signal.aborted) { try { value.close(); } catch { /* Late connection after cancellation. */ } }
    return value;
  }), signal);
  try {
    if (signal.aborted) throw signal.reason;
    connection = await awaitConnection(runtime.connect({ hostname: address, port: 443, transport: 'tcp' }));
    if (!samePeer91(connection, address)) throw new RestaurantImportError91('pinned_peer_mismatch', 'La conexion no coincide con la IP publica verificada.', 502);
    connection = await awaitConnection(runtime.startTls(connection, { hostname: url.hostname, alpnProtocols: ['http/1.1'] }));
    if (!samePeer91(connection, address, true) || typeof (connection as TlsConnection91).handshake !== 'function') {
      throw new RestaurantImportError91('pinned_peer_mismatch', 'No se pudo verificar el destino TLS de la conexion.', 502);
    }
    // Must complete CA/hostname verification BEFORE transmitting the request path or headers.
    await restaurantAbortable91((connection as TlsConnection91).handshake(), signal);
    const request = new TextEncoder().encode(`GET ${url.pathname}${url.search} HTTP/1.1\r\nHost: ${url.hostname}\r\nAccept: application/pdf,image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,text/html\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n`);
    for (let offset = 0; offset < request.length;) {
      const written = await restaurantAbortable91(connection.write(request.subarray(offset)), signal);
      if (!Number.isInteger(written) || written <= 0 || written > request.length - offset) throw new Error('Invalid TLS write');
      offset += written;
    }
    const parser = new HTTPParser(HTTPParser.RESPONSE);
    parser.maxHeaderSize = 32_768;
    let status = 0;
    let headers = new Headers();
    let complete = false;
    let interim = 0;
    let size = 0;
    let wireBytes = 0;
    let maxBody: number = RESTAURANT_IMPORT_LIMITS91.fileBytes;
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    parser[HTTPParser.kOnHeadersComplete] = (info) => {
      if (complete || info.upgrade || info.versionMajor !== 1) throw new Error('Unsupported HTTP response');
      if (info.statusCode >= 100 && info.statusCode < 200) {
        if (info.statusCode === 101 || ++interim > 4) throw new Error('Unsupported HTTP interim response');
        status = info.statusCode;
        return;
      }
      status = info.statusCode;
      headers = new Headers();
      let headerBytes = 0;
      const seen = new Set<string>();
      for (let index = 0; index < info.headers.length; index += 2) {
        const key = info.headers[index].toLowerCase();
        const value = info.headers[index + 1];
        headerBytes += key.length + value.length + 4;
        if (headerBytes > 32_768) throw new RestaurantImportError91('header_size_limit', 'Las cabeceras de la web superan el limite permitido.', 413);
        if (['content-length', 'content-type', 'content-encoding', 'transfer-encoding', 'location'].includes(key)) {
          if (seen.has(key)) throw new Error('Ambiguous response headers');
          seen.add(key);
          headers.set(key, value);
        }
      }
      if (headers.has('transfer-encoding') && (headers.get('transfer-encoding')?.toLowerCase() !== 'chunked' || headers.has('content-length'))) throw new Error('Ambiguous HTTP framing');
      if (headers.has('content-encoding') && headers.get('content-encoding')?.toLowerCase() !== 'identity') {
        throw new RestaurantImportError91('unsupported_content_encoding', 'La web ignora la solicitud sin compresion. Sube el archivo directamente.', 415);
      }
      const mime = headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      maxBody = mime === 'text/html' ? RESTAURANT_IMPORT_LIMITS91.htmlBytes : RESTAURANT_IMPORT_LIMITS91.fileBytes;
      const length = headers.get('content-length');
      if (length && (!/^\d+$/.test(length) || Number(length) > maxBody)) throw new RestaurantImportError91('body_size_limit', 'El recurso supera el limite de tamano permitido.', 413);
      // Redirect/error bodies are irrelevant and never followed/read automatically.
      if (status < 200 || status >= 300 || status === 204) return 2;
    };
    parser[HTTPParser.kOnBody] = (chunk, offset, length) => {
      size += length;
      if (size > maxBody) throw new RestaurantImportError91('body_size_limit', 'El recurso supera el limite de tamano permitido.', 413);
      chunks.push(Uint8Array.from(chunk.subarray(offset, offset + length)));
    };
    parser[HTTPParser.kOnMessageComplete] = () => { if (status >= 200) complete = true; };
    const buffer = new Uint8Array(16_384);
    while (!complete) {
      const count = await restaurantAbortable91(connection.read(buffer), signal);
      if (count === null) {
        const error = parser.finish();
        if (error || !complete) throw error ?? new Error('Truncated HTTP response');
        break;
      }
      if (!Number.isInteger(count) || count <= 0 || count > buffer.length) throw new Error('Invalid TLS read');
      wireBytes += count;
      if (wireBytes > maxBody + 1024 * 1024) throw new RestaurantImportError91('wire_size_limit', 'La respuesta HTTP supera el limite permitido.', 413);
      const result = parser.execute(Buffer.from(buffer.buffer, buffer.byteOffset, count));
      if (result instanceof Error) throw result;
    }
    return new Response([204, 304].includes(status) ? null : new Blob(chunks), { status, headers });
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (error instanceof RestaurantImportError91) throw error;
    throw new RestaurantImportError91('pinned_transport_failed', 'No se pudo verificar TLS o leer la respuesta HTTP con IP fijada. Sube el archivo directamente.', 502);
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', cancel);
    signal.removeEventListener('abort', close);
    close();
  }
}
