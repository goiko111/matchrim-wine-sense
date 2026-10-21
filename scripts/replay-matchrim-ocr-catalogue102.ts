import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { canAdmitNativeCatalogLookup97 } from '../src/utils/nativeCatalogAdmission97';
import { canonicalProducerKey, isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';
import { hasMissingVisibleQualifier102 } from '../src/utils/nativeWineQualifier102';

globalThis.fetch = async () => { throw new Error('OFFLINE_OCR_CATALOGUE_REPLAY'); };
const output = path.resolve(process.argv[2]);
assert(output.startsWith(path.resolve('qa-artifacts') + '/') && !fs.existsSync(output));
const hash = (value: Buffer) => createHash('sha256').update(value).digest('hex');
const cataloguePath = 'qa-artifacts/lovable-connection101-20261021/LOCAL-CATALOGUE.json';
const globalPath = 'qa-artifacts/lovable-connection101-20261021/global-recommendations-schema-r2.body.json';
const catalogueBytes = fs.readFileSync(cataloguePath), globalBytes = fs.readFileSync(globalPath);
type Reference = { id: string | number; name: string; producer: string | null; vintage: string | number | null;
  region: string | null; country: string | null; scope: string };
const local: Reference[] = JSON.parse(catalogueBytes.toString()).rows.map((row: Reference) => ({ ...row, country: null, scope: 'local-copy' }));
const recommended: Reference[] = JSON.parse(globalBytes.toString()).wines.detail.map((row: { id: number; name: string; winery: string; vintage: string | null; region: string; country: string }) => ({
  id: row.id, name: row.name, producer: row.winery, vintage: row.vintage, region: row.region, country: row.country, scope: 'global-recommendation-sample',
}));
assert.equal(local.length, 6781); assert.equal(recommended.length, 30);
const corpus = 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2';
const manifest = JSON.parse(fs.readFileSync(path.join(corpus, 'REPORT.json'), 'utf8'));
assert.equal(manifest.expectedNamesGivenToOCR, false);
assert.equal(manifest.prepared.length, 200);
const tokens = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z0-9]+/g) || [];
const ignored = new Set(['de', 'del', 'la', 'el', 'of', 'the', 'y', 'and']);
const pool = [...local, ...recommended].map(row => ({ row, producerTokens: tokens(canonicalProducerKey(row.producer)).filter(token => !ignored.has(token)) }));
const started = performance.now();
// Only OCR receipts and independently fetched catalogue projections enter this loop.
const proposals = manifest.prepared.map((image: { imageId: string; sha256: string; sourceSHA256: string }) => {
  const bytes = fs.readFileSync(path.join(corpus, 'raw', `${image.imageId}.json`));
  const ocr = JSON.parse(bytes.toString());
  assert.equal(ocr.status, 'ok'); assert.equal(ocr.hashMatches, true);
  assert.equal(ocr.preparedSHA256, image.sha256); assert.equal(ocr.sourceSHA256, image.sourceSHA256);
  assert.deepEqual(ocr.customWords, []);
  const evidence: string[] = ocr.lines.map((line: { text: string }) => line.text);
  const visible = new Set(evidence.flatMap(tokens));
  const blockedQualifiers: Reference[] = [];
  const eligible = pool.filter(({ row, producerTokens }) => producerTokens.length
    && producerTokens.every(token => visible.has(token))
    && canAdmitNativeCatalogLookup97({ name: row.name, producer: row.producer,
      vintage: row.vintage, region: row.region, country: row.country,
      confidence: 1, evidence, inferredFields: [] } as Parameters<typeof canAdmitNativeCatalogLookup97>[0]))
    .filter(({ row }) => {
      if (!hasMissingVisibleQualifier102({ name: row.name, evidence })) return true;
      blockedQualifiers.push(row); return false;
    })
    .map(({ row }) => ({ ...row }));
  return Object.freeze({ imageId: image.imageId, ocrReceiptSHA256: hash(bytes),
    nonemptyOCR: evidence.length > 0, eligible: Object.freeze(eligible), blockedQualifiers,
    canonicalIdentityVerified: false, affinity: null });
});
Object.freeze(proposals);
// Expected names/producers are loaded only AFTER retrieval, solely for evaluation.
const expected = JSON.parse(fs.readFileSync('qa-artifacts/lovable-connection101-20261021/EXACT200-CATALOGUE-COVERAGE.json', 'utf8')).rows;
const evaluated = proposals.map((prediction: typeof proposals[number]) => {
  const truth = expected.find((row: { image_id: string }) => row.image_id === prediction.imageId);
  assert(truth);
  return { ...prediction, compatibleExpectedReferences: prediction.eligible.filter((row: Reference) =>
    isSafeCanonicalLabelMatch({ name: truth.expected_name, producer: truth.expected_producer }, row)).length };
});
const summary = { scenes: evaluated.length, nonemptyOCR: evaluated.filter((row: typeof evaluated[number]) => row.nonemptyOCR).length,
  localCatalogueRows: local.length, globalRecommendationSampleRows: recommended.length,
  imagesWithLiteralEligibleProposal: evaluated.filter((row: typeof evaluated[number]) => row.eligible.length).length,
  literalEligibleRows: evaluated.reduce((sum: number, row: typeof evaluated[number]) => sum + row.eligible.length, 0),
  rowsBlockedForMissingQualifier: evaluated.reduce((sum: number, row: typeof evaluated[number]) => sum + row.blockedQualifiers.length, 0),
  compatibleExpectedReferences: evaluated.reduce((sum: number, row: typeof evaluated[number]) => sum + row.compatibleExpectedReferences, 0),
  canonicalIdentitiesVerified: 0, canonicalPrecision: null, canonicalRecall: null,
  networkCalls: 0, paidStarts: 0, elapsedMs: Math.round(performance.now() - started) };
fs.writeFileSync(output, JSON.stringify({ observedUTC: new Date().toISOString(),
  scope: 'Literal eligibility only, not live master lookup or image recognition. Assumed confidence=1 isolates the existing lexical gate; OCR confidence is never promoted to identity confidence.',
  sourceCatalogueSHA256: hash(catalogueBytes), globalSampleSHA256: hash(globalBytes),
  expectedUsedBeforeRetrieval: false, summary, rows: evaluated }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(summary));
