import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { pinCache179 } from './pin-matchrim-cache179';
import { captureSources112, sha112, verifySources112, type loadCache112 } from './benchmark-matchrim-native112';
import { createGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103';

type Scene180 = { imageId: string; eligible: boolean; queries: string[];
  inputSHA256: string; reading: { lines: { text: string }[] };
  pages: { query: string; status: string; rows: number }[] };
type Cache180 = ReturnType<typeof loadCache112>;
export function bundle180(scenes: Scene180[], cache: Cache180) {
  const cases = scenes.filter(scene => !scene.eligible).map(scene => {
    assert(/^img-\d{3}$/.test(scene.imageId) && /^[a-f0-9]{64}$/.test(scene.inputSHA256));
    const queries = scene.pages.map(page => {
      const observations = [...cache].filter(([url]) => new URL(url).searchParams.get('text') === page.query).map(([url, receipt]) => {
        const address = new URL(url);
        assert(address.origin === 'https://app.winerim.com' && address.pathname === '/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines'
          && !address.username && !address.password && !address.hash && address.searchParams.get('store') === '1');
        const body = JSON.parse(receipt.bytes.toString('utf8'));
        assert(receipt.status === 200 && Number.isSafeInteger(body.count) && body.count >= 0
          && Number.isSafeInteger(body.page) && body.page === Number(address.searchParams.get('page')) && Array.isArray(body.results));
        return { url, page: body.page as number, count: body.count as number, returned: body.results.length,
          sha256: receipt.sha256, sourceReceipt: receipt.sourceReceipt,
          malformedRecords: body.results.filter((row: { slugname?: unknown }) => row.slugname === '').map((row: {
            id: number; name: string; winery: string; slugname: string; vintage: string | number | null;
          }) => ({ namespace: 'winerim-public-store', id: row.id, name: row.name, producer: row.winery,
            slug: row.slugname, vintage: row.vintage, issue: 'EMPTY_DETAIL_SLUG', guessedReplacement: null })) };
      }).sort((a, b) => a.page - b.page);
      assert(observations.length > 0, 'VERIFIED_RESPONSE_REQUIRED');
      return { query: page.query, clientStatus: page.status, clientRows: page.rows, observations,
        observedCountsConsistent: new Set(observations.map(item => item.count)).size === 1,
        automaticLimit: 80, manualLimit: 400, knownDefects: observations.flatMap(item => item.malformedRecords) };
    });
    return { imageId: scene.imageId, inputSHA256: scene.inputSHA256,
      observedText: scene.reading.lines.map(line => line.text), queries,
      resolution: 'OPEN', confirmedIdentity: null, verifiedVintage: null, affinity: null };
  });
  assert(new Set(cases.map(row => row.imageId)).size === cases.length, 'DUPLICATE_CASE');
  const blockers = cases.flatMap(scene => scene.queries.filter(query => query.clientStatus !== 'complete'));
  const counts = blockers.flatMap(query => query.clientStatus === 'partial' ? query.observations.map(item => item.count) : []);
  return { scope: 'Retained verified public responses and actual OCR only. No expected identities, source repair, new reads or recognition approval.',
    openCases: cases.length, broadOnlyCases: cases.filter(scene => scene.queries.every(query => query.clientStatus !== 'incomplete')).length,
    schemaOrMixedCases: cases.filter(scene => scene.queries.some(query => query.clientStatus === 'incomplete')).length,
    partialQueries: blockers.filter(query => query.clientStatus === 'partial').length,
    broadCountRange: counts.length ? { min: Math.min(...counts), max: Math.max(...counts) } : null,
    partialQueriesBeyondManualBound: blockers.filter(query => query.clientStatus === 'partial'
      && query.observations.some(item => item.count > 400)).length,
    sourceRepairsRequired: blockers.flatMap(query => query.knownDefects),
    proposedBackendCapabilities: ['Read-only filtered lookup by independent wine/producer fields; documented accent/alias semantics',
      'Stable pagination/count/order or snapshot-bound cursor with no silent truncation',
      'Canonical/reference/vintage identities and explicitly documented namespace mapping',
      'Detail readback without guessed slugs; trustworthy sensory source, scale, vintage applicability and missing values',
      'Read-only scoped access or authorized offline export; no client secret or administrative write permission'],
    proposedAlternative: 'An authorized backend export of the200 source wines, aliases, canonical/vintage IDs, detail/photo URLs and sourced sensory data can unblock offline integration without new paid vision calls.',
    cases };
}

export async function main180() {
  const repo = process.cwd(), reportPath = 'qa-artifacts/night105-20261021/native112-corpus200-r21/REPORT.json';
  const output = 'qa-artifacts/continuation180-20261023'; assert(!fs.existsSync(output));
  const source = fs.readFileSync(reportPath), report = JSON.parse(source.toString('utf8'));
  assert(report.summary.sourceIntegrityVerified && report.rows.length === 200 && report.summary.incompleteScenes === 19);
  verifySources112(repo, report.sourceFingerprints); const sources = captureSources112(repo);
  const cache = pinCache179(repo, JSON.parse(fs.readFileSync(path.dirname(reportPath) + '/CACHE_READS.json', 'utf8')));
  const bundle = bundle180(report.rows, cache); assert.equal(bundle.openCases, 19);
  const replay = [], calls: string[] = [];
  const deny = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('LIVE_NETWORK_FORBIDDEN180'); };
  try {
    const client = createGlobalCatalogue103(async (input, init) => {
      assert(init?.method === 'GET' && init.credentials === 'omit' && init.redirect === 'error' && init.body === undefined);
      const receipt = cache.get(String(input)); assert(receipt, 'EXACT_RETAINED_RESPONSE_REQUIRED');
      calls.push(String(input)); return new Response(receipt.bytes, { status: receipt.status, headers: receipt.headers });
    });
    for (const scene of bundle.cases) for (const query of scene.queries) {
      const page = await client.searchProposals(query.query);
      assert.equal(page.status, query.clientStatus); assert.equal(page.rows.length, query.clientRows);
      for (const bad of query.knownDefects) assert(!page.rows.some(row => row.id === bad.id), 'MALFORMED_RECORD_MUST_NOT_BE_SELECTABLE');
      replay.push({ imageId: scene.imageId, query: query.query, status: page.status, rows: page.rows.length,
        malformedIDsExcluded: query.knownDefects.map(row => row.id), automaticIdentityCreated: false });
    }
  } finally { globalThis.fetch = deny; }
  verifySources112(repo, sources); assert.equal(sha112(fs.readFileSync(reportPath)), sha112(source));
  const altotinto = bundle.cases.find(scene => scene.imageId === 'img-200')!.queries.find(query => query.query === 'ALTOTINTO')!;
  assert(altotinto.observedCountsConsistent && altotinto.observations.every(page => page.count === 60));
  assert.equal(altotinto.knownDefects.length, 1);
  fs.mkdirSync(output, { mode: 0o700 });
  const save = (name: string, body: unknown) => fs.writeFileSync(output + '/' + name, JSON.stringify(body, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  save('DEVELOPMENT_CASES.json', { generatedUTC: new Date().toISOString(), reportPath, reportSHA256: sha112(source), ...bundle });
  save('OFFLINE_REPLAY.json', { passed: true, sources, cases: bundle.cases.length, queries: replay.length,
    cacheReads: calls.length, realGET: 0, models: 0, uploads: 0, lovableTurns: 0, productionWrites: 0, replay,
    countCorrection: 'ALTOTINTO retained and fresh pages both count60; empty slug is the demonstrated defect, not count drift.',
    scope: 'Lightweight actual client/parser response replay only, not visual/native/recognition/affinity QA' });
  console.log(JSON.stringify({ output, open: bundle.openCases, broad: bundle.broadOnlyCases, schema: bundle.schemaOrMixedCases,
    partialQueries: bundle.partialQueries, partialBeyondManualBound: bundle.partialQueriesBeyondManualBound,
    queriesChecked: replay.length, realGET: 0, models: 0 }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main180().catch(error => { console.error(error); process.exitCode = 1; });
