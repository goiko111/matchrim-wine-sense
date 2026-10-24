import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';

const read = (path: string) => JSON.parse(fs.readFileSync(path, 'utf8'));
type VisualCase197 = { imageId: string; visibleName: string; visibleProducer: string | null; vintage: string | null;
  rejectedCanonicalId?: number; rejectedName?: string; rejectedProducer?: string;
  nonVintageNumbers?: { value: string; role: string }[] };
const review = read('qa-fixtures/master197/visual-review.json') as {
  observedSource: string; preparedManifest: string; cases: VisualCase197[];
};
const observed = read(review.observedSource) as { cases: { imageId: string; inputSHA256: string }[] };
const prepared = read(review.preparedManifest).prepared as { imageId: string; sha256: string; path: string }[];
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_NETWORK_IN_VISUAL197'); };
try {
  assert.equal(review.cases.length, 19);
  assert.equal(new Set(review.cases.map(row => row.imageId)).size, 19);
  let rejected = 0;
  for (const row of review.cases) {
    const source = prepared.find(item => item.imageId === row.imageId);
    const ocr = observed.cases.find(item => item.imageId === row.imageId);
    assert(source && ocr, row.imageId);
    assert.equal(source.sha256, ocr.inputSHA256, row.imageId);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source.path)).digest('hex'), source.sha256, row.imageId);
    // Manual literal inputs, not provider output or a synthetic confidence score.
    if (row.rejectedCanonicalId) {
      assert.equal(isSafeCanonicalLabelMatch({ name: row.visibleName, producer: row.visibleProducer },
        { name: row.rejectedName, producer: row.rejectedProducer }), false, row.imageId);
      rejected++;
    }
    for (const number of row.nonVintageNumbers ?? []) assert.notEqual(row.vintage, number.value, row.imageId);
  }
  assert.equal(rejected, 8);
  const byId = (id: string) => { const row = review.cases.find(row => row.imageId === id); assert(row); return row; };
  assert.equal(byId('img-118').vintage, '1995');
  assert.equal(byId('img-151').vintage, '2022');
  assert.equal(byId('img-195').visibleProducer, null);
  assert.equal(byId('img-198').vintage, null);
  console.log(JSON.stringify({ photosHashVerified: 19, unsafePairsRejected: rejected,
    externalRequests: 0, newOcrRuns: 0, blindGroundTruth: false, confirmedPhotoIdentities: 0,
    scope: 'Existing source continuity and conservative matching of manually inspected literal labels; not a 200-image recognition benchmark' }));
} finally { globalThis.fetch = originalFetch; }
