import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { canonicalProducerKey, isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';

// Expected metadata evaluates catalogue availability only. It never enters OCR,
// scan matching, a production cache, or a claimed verified identity.
globalThis.fetch = async () => { throw new Error('OFFLINE_CATALOGUE_AUDIT'); };
const root = fs.realpathSync(process.argv[2]);
const output = path.join(root, 'OFFLINE-COVERAGE.json');
assert(!fs.existsSync(output), 'Preserve prior evidence; choose a fresh output root');
const read = (file: string) => {
  const bytes = fs.readFileSync(path.join(root, file));
  return { value: JSON.parse(bytes.toString()), sha256: createHash('sha256').update(bytes).digest('hex') };
};
const local = read('LOCAL-CATALOGUE.json');
const expected = read('EXACT200-CATALOGUE-COVERAGE.json');
type Wine = { id: string; name: string; producer: string | null; vintage: number | null; region: string | null };
type Expected = { image_id: string; mantalak_id: string; expected_name: string; expected_producer: string };
const catalogue: Wine[] = local.value.rows;
const references: Expected[] = expected.value.rows;
assert.equal(catalogue.length, 6781);
assert.equal(references.length, 200);
assert.equal(new Set(references.map(row => row.image_id)).size, 200);
const fold = (value: string | null) => (value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const byProducer = new Map<string, Wine[]>();
for (const wine of catalogue) {
  assert(typeof wine.id === 'string' && typeof wine.name === 'string');
  const producer = canonicalProducerKey(wine.producer);
  if (producer) byProducer.set(producer, [...(byProducer.get(producer) || []), wine]);
}
const rows = references.map(row => {
  const input = { name: row.expected_name, producer: row.expected_producer };
  const nameMatches = catalogue.filter(wine => fold(wine.name) === fold(input.name));
  const sameProducer = byProducer.get(canonicalProducerKey(input.producer)) || [];
  const possible = sameProducer.filter(wine => isSafeCanonicalLabelMatch(input, wine));
  return {
    imageId: row.image_id, expectedMantalakId: row.mantalak_id,
    expectedName: input.name, expectedProducer: input.producer,
    foldedNameMatches: nameMatches.length,
    exactProducerAndFoldedNameMatches: nameMatches.filter(wine => canonicalProducerKey(wine.producer) === canonicalProducerKey(input.producer)).length,
    compatibleReferenceCandidates: possible.map(wine => ({ localUUID: wine.id, name: wine.name, producer: wine.producer, vintage: wine.vintage })),
    rejectedNameCollisions: nameMatches.filter(wine => !isSafeCanonicalLabelMatch(input, wine))
      .map(wine => ({ localUUID: wine.id, name: wine.name, producer: wine.producer, vintage: wine.vintage })),
    requestedVintageChecked: false, canonicalIdentityVerified: false,
    originalWinerimSheet: null, affinityCalculated: false,
  };
});
const summary = {
  denominator: rows.length, catalogueRows: catalogue.length,
  referencesWithFoldedName: rows.filter(row => row.foldedNameMatches).length,
  referencesWithExactProducerAndFoldedName: rows.filter(row => row.exactProducerAndFoldedNameMatches).length,
  referencesWithCompatibleCandidate: rows.filter(row => row.compatibleReferenceCandidates.length).length,
  referencesWithRejectedNameCollision: rows.filter(row => row.rejectedNameCollisions.length).length,
  rejectedNameCollisionRows: rows.reduce((sum, row) => sum + row.rejectedNameCollisions.length, 0),
  verifiedIdentities: 0, paidCalls: 0, networkCalls: 0,
};
const report = {
  observedUTC: new Date().toISOString(),
  scope: 'Offline reference-level catalogue availability; NOT recognition, vintage coverage, sensory provenance or full master coverage',
  inputs: { catalogueSHA256: local.sha256, expectedEvaluationOnlySHA256: expected.sha256 },
  summary, rows,
};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(summary));
