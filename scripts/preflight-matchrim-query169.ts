import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { globalRecoveryQueries104 } from '../src/utils/globalWineProposals104';
import { localSingleCandidate109 } from '../src/utils/nativeSingleLabel109';
import { suggestLocalOCRFragments108 } from '../src/utils/localOCRFragments108';
import { wineYearRoles105 } from '../src/utils/wineYearRole105';
import { loadCache112 } from './benchmark-matchrim-native112';

// Query-allocation inventory only. It never reads expected names or evaluates accuracy.
const source = 'qa-artifacts/night105-20261021/native112-corpus200-r11/REPORT.json';
const bytes = fs.readFileSync(source), baseline = JSON.parse(bytes.toString('utf8'));
assert(baseline.summary.sourceIntegrityVerified && baseline.rows.length === 200);
const receipts = JSON.parse(fs.readFileSync('qa-artifacts/night105-20261021/native112-corpus200-r11/CACHE_READS.json', 'utf8'));
const folders = [...new Set<string>(receipts.map((r: { sourceReceipt: string }) => path.dirname(r.sourceReceipt.split('#')[0])))];
const cache = loadCache112(process.cwd(), folders);
const changed = [], missing = new Set<string>();
for (const { imageId, reading, queries } of baseline.rows) {
  const candidate = localSingleCandidate109(reading, imageId), years = wineYearRoles105(reading.lines);
  if (!candidate || !years.supported) continue;
  const fragments = suggestLocalOCRFragments108(reading.lines);
  const evidence = [...reading.lines.map((line: { text: string }) => line.text), ...fragments.alternatives.map(line => line.text)].slice(0, 100);
  const possible = reading.lines.every((line: { text: string }) => (line.text.match(/\b(?:19|20)\d{2}\b/g)?.length ?? 0) <= 8)
    ? years.roles.filter(role => role.role === 'vintage' || role.role === 'unclassified') : [];
  const vintage = possible.length === 1 ? possible[0].year : null;
  const next = globalRecoveryQueries104(candidate.name, evidence, false, vintage);
  if (JSON.stringify(next) !== JSON.stringify(queries)) changed.push({ imageId, before: queries, after: next });
  for (const query of next) {
    const url = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines?'
      + new URLSearchParams({ page: '1', text: query, store: '1' });
    if (!cache.has(url)) missing.add(query);
  }
}
const output = path.resolve(process.argv[2]);
assert(output.startsWith(process.cwd() + '/qa-artifacts/continuation169-20261022/'));
assert(!fs.existsSync(output));
const result = { source, sourceSHA256: createHash('sha256').update(bytes).digest('hex'), changed,
  newFirstPageQueries: [...missing], expectedNamesGivenToQueries: false, networkCalls: 0, modelStarts: 0,
  scope: 'Planning inventory from retained OCR; not a benchmark, recognition, full pagination or E2E approval' };
fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(result, null, 2));
