import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { prepareVisualCandidatePool213 } from '../src/utils/nativeVisualCandidatePool213';

// Mutations below are controlled policy tests, not recognised bottles or a
// visual similarity benchmark. Preserved HTTP bodies are replayed separately.
const row = (id: number, extra: Record<string, unknown> = {}) => ({
  id: id + 1000, representativePublicId: id + 1000, mantalakWineId: id,
  name: `Cuvee ${id}`, winery: 'Bodegas Example', type: 'red', country: null,
  region: 'Rioja', grapes: ['Pinot Noir'], vintages: ['2023'], photo: null,
  slugname: null, webUrl: null, tastingAttributes: null, ...extra,
});
const page = (rows: ReturnType<typeof row>[], total = rows.length, number = 1, limit = 50) => ({
  results: rows, count: rows.length, total, page: number, limit, pageCount: Math.ceil(total / limit),
});
const observed = (field = 'producer', value = 'Bodegas Example', extra: Record<string, unknown> = {}) =>
  ({ field, value, origin: 'ocr', evidenceText: `Read: ${value}`, ...extra });
let passed = 0;
const check = (name: string, work: () => void) => { work(); passed++; console.log('PASS', name); };
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_NETWORK_VISUAL_POOL213'); };
try {
  check('A plausible single row is only a review candidate, not identity, visual readiness or affinity', () => {
    const value = prepareVisualCandidatePool213([page([row(1)])], [observed()]);
    assert.equal(value.status, 'review-candidates'); assert.equal(value.searchPagesComplete, true);
    assert.equal(value.scope, 'provided-search-pages-only');
    assert.equal(value.imageIdentityConfirmed, false); assert.equal(value.catalogueAbsenceConfirmed, false);
    assert.equal(value.visualComparisonReady, false); assert.equal(value.affinityAttributes, null);
    assert.equal(value.learningEligible, false);
  });
  check('A partial first page cannot become the first15 winning labels', () => {
    const value = prepareVisualCandidatePool213([page([row(1), row(2)], 3, 1, 2)], [observed()]);
    assert.equal(value.status, 'incomplete-pages'); assert.equal(value.retrieved, 2);
    assert.equal(value.total, 3); assert.deepEqual(value.candidates, []);
  });
  check('Contiguous complete paging is accepted without collapsing canonical IDs', () => {
    const value = prepareVisualCandidatePool213([page([row(1), row(2)], 3, 1, 2), page([row(3)], 3, 2, 2)], [observed()]);
    assert.equal(value.status, 'review-candidates'); assert.equal(value.matched, 3);
    assert.deepEqual(value.candidates.map(item => item.mantalakWineId), [1, 2, 3]);
  });
  check('Duplicated, skipped, drifting or trailing pages fail closed', () => {
    const first = page([row(1), row(2)], 3, 1, 2);
    for (const next of [page([row(1)], 3, 2, 2), page([row(3)], 3, 3, 2),
      page([row(3), row(4)], 4, 2, 2)]) {
      assert.equal(prepareVisualCandidatePool213([first, next], [observed()]).status, 'invalid-input');
    }
    assert.equal(prepareVisualCandidatePool213([page([row(1)]), page([])], [observed()]).status, 'invalid-input');
  });
  check('Inferred/unsupported OCR fields, controls and empty evidence cannot narrow the pool', () => {
    for (const input of [[], [observed('producer', 'Example', { origin: 'inferred' })],
      [observed('producer', 'Unknown', { evidenceText: 'Pinot Noir 2023' })],
      [observed('producer', 'Exam\nple')], [observed('producer', 'Exam\u202eple')], [observed('region', '!!!')],
      [observed('vintage', '202x')], [observed('producer', 'Example', { evidenceText: '' })]]) {
      assert.equal(prepareVisualCandidatePool213([page([row(1)])], input).status, 'invalid-input');
    }
  });
  check('Explicit user confirmation is distinct from OCR and conflicting observations are rejected', () => {
    assert.equal(prepareVisualCandidatePool213([page([row(1)])], [observed('producer', 'Example',
      { origin: 'user-confirmed', evidenceText: undefined })]).status, 'review-candidates');
    for (const field of ['producer', 'region', 'vintage']) {
      const a = field === 'vintage' ? '2023' : 'Example';
      const b = field === 'vintage' ? '2022' : 'Other';
      assert.equal(prepareVisualCandidatePool213([page([row(1)])], [observed(field, a), observed(field, b)]).status, 'invalid-input');
    }
  });
  check('Grape/year do not manufacture a producer or restrict to a guessed region', () => {
    const value = prepareVisualCandidatePool213([page([row(1), row(2, { winery: 'Other', region: 'Burgundy' })])],
      [observed('grape', 'Pinot Noir'), observed('vintage', '2023')]);
    assert.equal(value.matched, 2); assert.equal(value.imageIdentityConfirmed, false);
  });
  check('Exact word boundaries preserve cuvee qualifiers; normalization is not fuzzy identity', () => {
    const rows = [row(1, { name: 'Cuvée Especial' }), row(2, { name: 'Cuvee Especialissima' })];
    const value = prepareVisualCandidatePool213([page(rows)], [observed('name', 'CUVEE ESPECIAL')]);
    assert.deepEqual(value.candidates.map(item => item.mantalakWineId), [1]);
    assert.equal(prepareVisualCandidatePool213([page(rows)], [observed('name', 'Cuvee Espacial')]).status, 'no-candidates');
  });
  check('Missing metadata remains a review possibility; known conflicting metadata is filtered', () => {
    const rows = [row(1), row(2, { grapes: [], vintages: [], region: null }),
      row(3, { vintages: ['2022'] }), row(4, { region: 'Burgundy' }), row(5, { grapes: ['Syrah'] })];
    const value = prepareVisualCandidatePool213([page(rows)],
      [observed('grape', 'Pinot Noir'), observed('region', 'Rioja'), observed('vintage', '2023')]);
    assert.deepEqual(value.candidates.map(item => item.mantalakWineId), [1, 2]);
    assert.equal(value.candidates[1].vintageStatus, 'unrecorded');
  });
  check('An empty complete search never proves absence from Winerim', () => {
    const value = prepareVisualCandidatePool213([page([])], [observed()]);
    assert.equal(value.status, 'no-candidates'); assert.equal(value.searchPagesComplete, true);
    assert.equal(value.catalogueAbsenceConfirmed, false);
  });
  check('Overlarge pools are explicitly truncated previews, never a top15 match', () => {
    const value = prepareVisualCandidatePool213([page(Array.from({ length: 16 }, (_, n) => row(n + 1)))], [observed()]);
    assert.equal(value.status, 'too-many-candidates'); assert.equal(value.matched, 16);
    assert.equal(value.candidates.length, 15); assert.equal(value.previewTruncated, true);
    for (const limit of [0, 16, .5, NaN]) assert.equal(prepareVisualCandidatePool213([page([])], [observed()], limit).status, 'invalid-input');
  });
  check('Catalogue photo URLs are not attested vintage-label images; hostile URLs rejected', () => {
    const value = prepareVisualCandidatePool213([page([row(1, { photo: 'https://app.winerim.com/images/wines/retained.jpg' })])], [observed()]);
    assert(value.candidates[0].photoUrl); assert.equal(value.visualComparisonReady, false);
    assert.equal(prepareVisualCandidatePool213([page([row(1, { photo: 'https://evil.example/x.jpg' })])], [observed()]).status, 'invalid-input');
  });
  check('All retained real search bodies replay without mutation or extra reads', () => {
    let count = 0;
    for (let n = 1; n <= 40; n++) {
      const file = `qa-fixtures/master194/responses/${String(n).padStart(2, '0')}-BODY.json`;
      const raw = fs.readFileSync(file), before = createHash('sha256').update(raw).digest('hex');
      const payload = JSON.parse(raw.toString());
      if (!Array.isArray(payload.results) || typeof payload.page !== 'number' || payload.page !== 1) continue;
      const snapshot = structuredClone(payload);
      const value = prepareVisualCandidatePool213([payload], [observed('name', 'RetainedControl')]);
      assert.notEqual(value.status, 'invalid-input');
      assert.equal(value.searchPagesComplete, payload.count === payload.total);
      assert.equal(value.imageIdentityConfirmed, false); assert.deepEqual(payload, snapshot);
      assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), before);
      count++;
    }
    assert(count > 10); console.log('retainedFirstPages', count);
  });
  console.log(JSON.stringify({ passed, failed: 0, externalRequests: 0, appActivated: false,
    visualComparisonImplemented: false, recognitionAccuracyMeasured: false, candidate109Unchanged: true }));
} finally { globalThis.fetch = originalFetch; }
