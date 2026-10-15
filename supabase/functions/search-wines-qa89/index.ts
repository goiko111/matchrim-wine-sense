import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { parsePublicLibraryInput, parsePublicLibraryPage, publicLibraryUuid, verifyPublicLibraryDetail,
  PublicLibraryInputError } from '../_shared/matchrim-public-library89.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const headers = { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const source = 'winerim-public-library';
const metadata = (status: string, sourceCount: number | null = null, returnedCount = 0, originalDetail = 'not-requested') => ({
  source, status, scope: 'public-library-only', sourceCount, returnedCount, page: 1, originalDetail,
});
class BoundedReadError extends Error {}
class RequestSizeError extends Error {}

const readJson = async (body: ReadableStream<Uint8Array> | null, max: number, signal: AbortSignal, sizeError: Error,
  consume?: (bytes: number) => void): Promise<unknown> => {
  if (!body) throw new BoundedReadError('Missing body');
  const reader = body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener('abort', cancel, { once: true });
  let text = '', size = 0;
  try {
    if (signal.aborted) throw new BoundedReadError('Aborted');
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) throw new BoundedReadError('Aborted');
      if (done) break;
      size += value.byteLength;
      if (size > max) throw sizeError;
      consume?.(value.byteLength);
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
};

// New public-source adapter only. Gateway JWT verification is configured by
// deployment, not bypassed here. No database, privileged key or model is used.
serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response(JSON.stringify({ wines: [], error: 'Method not allowed', meta: metadata('invalid-input') }), {
    status: 405, headers: { ...headers, Allow: 'POST, OPTIONS' },
  });
  const controller = new AbortController(), abort = () => controller.abort();
  req.signal.addEventListener('abort', abort, { once: true });
  if (req.signal.aborted) controller.abort();
  const timeout = setTimeout(abort, 10000);
  let reads = 0, bytes = 0;
  const reply = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers });
  // Observed public Winerim client contract, 2026-10-15. Resolver supplies the
  // Library UUID; query, IDs and slugs can never control the upstream origin.
  const get = async (path: string, max = 262144): Promise<unknown> => {
    if (controller.signal.aborted || ++reads > 3) throw new BoundedReadError('Read budget');
    const response = await fetch(`https://app.winerim.com/api/v1/${path}`, {
      method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json' }, signal: controller.signal,
    });
    if (!response.ok || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') || '')) {
      await response.body?.cancel().catch(() => undefined);
      throw new BoundedReadError('Upstream unavailable');
    }
    return readJson(response.body, max, controller.signal, new BoundedReadError('Response too large'), count => {
      bytes += count;
      if (bytes > 524288) throw new BoundedReadError('Total response budget');
    });
  };
  try {
    if (Number(req.headers.get('content-length')) > 4096) throw new RequestSizeError('Request too large');
    let body: unknown;
    try { body = await readJson(req.body, 4096, controller.signal, new RequestSizeError('Request too large')); }
    catch (error) {
      if (error instanceof RequestSizeError || controller.signal.aborted) throw error;
      throw new PublicLibraryInputError('Invalid JSON');
    }
    const { query, limit } = parsePublicLibraryInput(body);
    if (query.length < 2) return reply(200, { wines: [], meta: metadata('empty-query') });
    const uuid = publicLibraryUuid(await get('whoami/slugname?s=the-library', 16384));
    if (!uuid) throw new BoundedReadError('Invalid resolver');
    const root = `restaurant/${uuid}/wines`;
    const page = parsePublicLibraryPage(await get(`${root}?${new URLSearchParams({ page: '1', text: query })}`), limit);
    if (page.status !== 'complete') return reply(page.status === 'malformed' ? 502 : 200,
      { wines: [], meta: metadata(page.status, page.sourceCount) });
    let wines = page.wines, originalDetail = 'not-requested';
    if (wines.length === 1) {
      const listed = wines[0];
      let detail: unknown;
      try { detail = await get(`${root}/${listed.id}/${listed.slugname}`); }
      catch {
        if (controller.signal.aborted) throw new BoundedReadError('Aborted');
        // Search rows remain real first-party records, but no original-fiche
        // assertion/link is attached when the detail could not be read.
        originalDetail = 'unavailable';
      }
      if (originalDetail !== 'unavailable') {
        const verified = verifyPublicLibraryDetail(listed, detail, uuid);
        if (!verified) return reply(200, { wines: [], meta: metadata('ambiguous', page.sourceCount, 0, 'mismatch') });
        wines = [verified]; originalDetail = 'verified';
      }
    }
    return reply(200, { wines, meta: metadata('complete', page.sourceCount, wines.length, originalDetail) });
  } catch (error) {
    if (error instanceof PublicLibraryInputError) return reply(400, { wines: [], error: error.message, meta: metadata('invalid-input') });
    if (error instanceof RequestSizeError) return reply(413, { wines: [], error: 'Request too large', meta: metadata('invalid-input') });
    return reply(controller.signal.aborted ? 504 : 502, { wines: [], error: 'Public catalog unavailable', meta: metadata('unavailable') });
  } finally {
    clearTimeout(timeout);
    req.signal.removeEventListener('abort', abort);
    controller.abort();
  }
});
