import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

type Prepared199 = { imageId: string; sha256: string; sourceSHA256: string; originalResidentPath: string };
type Review199 = { imageId: string; visibleName: string; visibleProducer: string | null;
  vintage: string | null; nominalCandidate?: number; rejectedCanonicalId?: number; note: string };
type RetainedWine199 = { mantalakWineId: number; name: string; winery: string };
const read = (file: string): unknown => JSON.parse(fs.readFileSync(file, 'utf8'));
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const wine = (value: unknown): value is RetainedWine199 => object(value)
  && Number.isSafeInteger(value.mantalakWineId) && typeof value.name === 'string' && typeof value.winery === 'string';

// Export filenames are provenance hints only. They must never enter the photo
// recognizer, identity confirmation, affinity or learning as label evidence.
const assetHint199 = (imageId: string, filename: string) => {
  const match = /^(\d{3})-([1-9]\d*)-(.+)\.(png|jpe?g)$/i.exec(path.basename(filename));
  if (!match || imageId !== `img-${match[1]}` || !Number.isSafeInteger(Number(match[2]))) return null;
  return { exportIdHint: Number(match[2]), filenameNameHint: match[3], namespaceVerified: false as const };
};

const main = () => {
  const preparedPath = 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/REPORT.json';
  const reviewPath = 'qa-fixtures/master197/visual-review.json';
  const prepared = (read(preparedPath) as { prepared: Prepared199[] }).prepared;
  const review = (read(reviewPath) as { cases: Review199[] }).cases;
  assert.equal(review.length, 19);
  for (const [imageId, filename] of [['img-003', '004-217494-Name.png'], ['img-003', '003-0-Name.png'],
    ['img-003', '003-99999999999999999999-Name.png'], ['img-003', '003-217494-Name.exe']]) {
    assert.equal(assetHint199(imageId, filename), null);
  }
  const retained: { file: string; wine: RetainedWine199; kind: 'search-row' | 'detail' }[] = [];
  for (let n = 1; n <= 40; n++) {
    const file = `qa-fixtures/master194/responses/${String(n).padStart(2, '0')}-BODY.json`;
    const payload = read(file); assert(object(payload));
    if (wine(payload)) retained.push({ file, wine: payload, kind: 'detail' });
    const resultRows = 'results' in payload ? payload.results : undefined;
    if (Array.isArray(resultRows)) for (const row of resultRows) {
      assert(wine(row)); retained.push({ file, wine: row, kind: 'search-row' });
    }
  }
  const rows = review.map(observation => {
    const source = prepared.find(row => row.imageId === observation.imageId); assert(source);
    const sourceBasename = path.basename(source.originalResidentPath);
    const hint = assetHint199(observation.imageId, sourceBasename); assert(hint);
    const matches = retained.filter(row => row.wine.mantalakWineId === hint.exportIdHint);
    return { imageId: observation.imageId, sourceBasename, sourceSHA256: source.sourceSHA256,
      preparedSHA256: source.sha256, ...hint,
      visibleEvidence: { name: observation.visibleName, producer: observation.visibleProducer, vintage: observation.vintage },
      retainedCanonicalIdMatches: matches.map(row => ({ file: row.file, kind: row.kind,
        mantalakWineId: row.wine.mantalakWineId, name: row.wine.name, winery: row.wine.winery })),
      absentFromRetainedResponsesDoesNotMeanAbsentFromCatalogue: true,
      imageIdentityConfirmed: false, affinityAttributes: null, learningEligible: false };
  });
  assert.equal(new Set(rows.map(row => row.exportIdHint)).size, 19);
  const byId = (id: string) => { const row = rows.find(item => item.imageId === id); assert(row); return row; };
  assert.equal(byId('img-193').exportIdHint, 217304);
  assert.notEqual(byId('img-193').exportIdHint, 215213); // Repaired Giacondi route was a search candidate, not this asset's source ID.
  assert.equal(byId('img-200').exportIdHint, 217297);
  assert.notEqual(byId('img-200').exportIdHint, 215439);
  assert.equal(byId('img-200').filenameNameHint, 'Scattola-Seleccion');
  assert.equal(byId('img-200').visibleEvidence.name, 'Altotinto Seleccion');
  assert.equal(byId('img-163').exportIdHint, 217334); // Generic source name cannot erase visible Seleccion.
  assert(byId('img-151').retainedCanonicalIdMatches.some(row => row.kind === 'detail'));
  assert.equal(byId('img-151').visibleEvidence.vintage, '2022');
  assert.equal(byId('img-017').retainedCanonicalIdMatches.length, 0);
  return { scope: 'Existing export filename provenance versus retained responses and separate manual visual observations. Not blind ground truth or recognition input.',
    sourceManifest: preparedPath, visualReview: reviewPath, rows,
    summary: { scenes: rows.length, sourceIdHintSeenInRetainedResponses: rows.filter(row => row.retainedCanonicalIdMatches.length).length,
      sourceIdHintNotSeen: rows.filter(row => !row.retainedCanonicalIdMatches.length).length,
      confirmedPhotoIdentities: 0, newCatalogueRequests: 0, modelCalls: 0, newOcrRuns: 0, appChanges: false } };
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_NETWORK_IN_ASSET_PROVENANCE199'); };
try {
  const report = main();
  const output = process.argv[2];
  if (output) {
    const target = path.resolve(output), root = path.resolve('qa-artifacts/continuation199-20261024') + path.sep;
    if (!target.startsWith(root) || !target.endsWith('.json') || fs.existsSync(target)) throw new Error('NEW_OWN_REPORT_REQUIRED');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  }
  console.log(JSON.stringify(report.summary));
} finally { globalThis.fetch = originalFetch; }
