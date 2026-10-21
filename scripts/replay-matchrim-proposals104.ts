import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createGlobalCatalogue103, type PublicGlobalRow103 } from '../src/utils/nativeGlobalCatalogue103';
import { rankGlobalProposals104 } from '../src/utils/globalWineProposals104';
import { isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';
import { wineYearRoles105, type YearLine105 } from '../src/utils/wineYearRole105';
import { suggestLocalOCRFragments108 } from '../src/utils/localOCRFragments108';
const source = 'qa-artifacts/global103-20261021/ocr200-r1';
const output = path.resolve(process.argv[2]);
assert(output.startsWith(path.resolve('qa-artifacts') + '/') && !fs.existsSync(output)); fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const requests = JSON.parse(fs.readFileSync(path.join(source, 'REQUESTS.json'), 'utf8'));
const progress = JSON.parse(fs.readFileSync(path.join(source, 'PROGRESS.json'), 'utf8'));
const cache = new Map<string, Buffer>();
for (const receipt of requests) {
  const body = fs.readFileSync(path.join(source, receipt.body));
  assert.equal(createHash('sha256').update(body).digest('hex'), receipt.sha256);
  if (receipt.status === 200) cache.set(receipt.url, body);
}
let reads = 0;
const client = createGlobalCatalogue103(async url => {
  const body = cache.get(String(url)); assert(body, 'No new requests permitted'); reads++;
  return new Response(body, { headers: { 'content-type': 'application/json' } });
});
const predictions = [];
for (const scene of progress.rows) {
  const ocr = JSON.parse(fs.readFileSync(`qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/raw/${scene.imageId}.json`, 'utf8'));
  assert.equal(ocr.hashMatches, true); assert.deepEqual(ocr.customWords, []);
  const rawEvidence = ocr.lines.map((line: { text: string }) => line.text);
  const fragments = suggestLocalOCRFragments108(ocr.lines.map((line: { text: string; confidence: number; box: { bottomLeft: NonNullable<YearLine105['box']> } }) => {
    const box = line.box.bottomLeft;
    return { text: line.text, confidence: line.confidence, box: { ...box, y: 1 - box.y - box.height } };
  }));
  const evidence = [...rawEvidence, ...fragments.alternatives.map(line => line.text)].slice(0, 100);
  const years = [...new Set<string>(evidence.flatMap((line: string) => line.trim().match(/^(?:19|20)\d{2}$/)?.[0] || []))];
  const inspectedYears = wineYearRoles105(ocr.lines.map((line: { text: string; box?: { bottomLeft?: YearLine105['box'] } }) => ({ text: line.text, box: line.box?.bottomLeft })));
  assert.equal(inspectedYears.supported, true, 'Unsupported year evidence must not silently enable ranking');
  const yearRoles = inspectedYears.roles;
  const excluded = new Set(yearRoles.filter(role => ['award', 'foundation', 'ambiguous', 'unsupported'].includes(role.role)).map(role => String(role.year)));
  const possibleYears = years.filter(year => !excluded.has(year));
  const rows: PublicGlobalRow103[] = [];
  for (const query of scene.queries) rows.push(...(await client.search(query.query, undefined, true)).rows);
  predictions.push({ imageId: scene.imageId, rawStandaloneYears: years, yearRoles,
    reconstructedFragments: fragments.alternatives,
    candidateVintageHint: possibleYears.length === 1 ? Number(possibleYears[0]) : null,
    proposals: rankGlobalProposals104(evidence, rows, possibleYears.length === 1 ? Number(possibleYears[0]) : null) });
}
Object.freeze(predictions);
// Expected metadata is loaded after ranking; it never supplies queries or candidates.
const truth = JSON.parse(fs.readFileSync('qa-artifacts/lovable-connection101-20261021/EXACT200-CATALOGUE-COVERAGE.json', 'utf8')).rows;
const rows = predictions.map(scene => {
  const expected = truth.find((row: { image_id: string }) => row.image_id === scene.imageId); assert(expected);
  const hits = scene.proposals.map(proposal => isSafeCanonicalLabelMatch({ name: expected.expected_name, producer: expected.expected_producer },
    { name: proposal.name, producer: proposal.row.winery, vintage: proposal.row.vintage }));
  return { ...scene, expected: { name: expected.expected_name, producer: expected.expected_producer }, top1Hit: hits[0] || false, top3Hit: hits.some(Boolean) };
});
const summary = { scenes: rows.length, scenesWithProposals: rows.filter(row => row.proposals.length).length,
  top1ExpectedReference: rows.filter(row => row.top1Hit).length, top3ExpectedReference: rows.filter(row => row.top3Hit).length,
  suggestionsWithoutExpectedReference: rows.filter(row => row.proposals.length && !row.top3Hit).length,
  cacheReads: reads, newNetworkCalls: 0, modelStarts: 0, canonicalIdentitiesCreated: 0 };
fs.writeFileSync(path.join(output, 'REPORT.json'), JSON.stringify({ scope: 'Assisted top3 ranking of each scene own frozen OCR-query pages. NOT automatic identification, live detector accuracy, all-catalogue recall or verified vintage affinity. Two initial OCR queries are unchanged from acquisition103, not a fresh validation of query generation104.',
  yearRoleScope: 'Uses frozen Mac OCR geometry, not freshly measured iPhone OCR. Initial provider evidence has text fragments; native106 explicit reread can supply device geometry but requires independent native validation. Reconstruction is suggestion-only, not canonical identity evidence.',
  sourceFingerprints: Object.fromEntries(['src/utils/globalWineProposals104.ts', 'src/utils/nativeGlobalCatalogue103.ts', 'src/utils/wineYearRole105.ts', 'src/utils/localOCRFragments108.ts', 'scripts/replay-matchrim-proposals104.ts'].map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),
  expectedUsedBeforeRanking: false, summary, rows }, null, 2), { mode: 0o600 });
console.log(JSON.stringify(summary));
