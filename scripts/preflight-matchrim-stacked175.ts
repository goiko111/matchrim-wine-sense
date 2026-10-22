import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { globalRecoveryQueries104 } from '../src/utils/globalWineProposals104';
import { nativeStackedQueries175 } from '../src/utils/nativeStackedQueries175';
import { localSingleCandidate109 } from '../src/utils/nativeSingleLabel109';
import { suggestLocalOCRFragments108 } from '../src/utils/localOCRFragments108';
import { loadCache112, sha112 } from './benchmark-matchrim-native112';
import type { LocalOCRResult106 } from '../src/utils/nativeOCR106';

const source = 'qa-artifacts/night105-20261021/native112-corpus200-r16/REPORT.json';
const bytes = fs.readFileSync(source);
// Expected identities and proxy outcome fields are deliberately not passed into this inventory.
const rows = JSON.parse(bytes.toString()).rows as { imageId: string; reading: LocalOCRResult106; queries: string[]; candidateVintage: number | null }[];
const receipts = JSON.parse(fs.readFileSync(path.dirname(source) + '/CACHE_READS.json', 'utf8')) as { sourceReceipt: string }[];
const folders = [...new Set(receipts.map(row => path.dirname(row.sourceReceipt.split('#')[0]))), path.resolve(path.dirname(source))];
const cache = loadCache112(process.cwd(), folders), missing = new Set<string>(), changed = [];
for (const { imageId, reading, queries, candidateVintage } of rows) {
  const candidate = localSingleCandidate109(reading, imageId);
  if (!candidate) continue;
  const fragments = suggestLocalOCRFragments108(reading.lines);
  const evidence = [...reading.lines.map(line => line.text), ...fragments.alternatives.map(line => line.text)].slice(0, 100);
  const next = globalRecoveryQueries104(candidate.name, evidence, false, candidateVintage, reading.lines);
  if (JSON.stringify(queries) !== JSON.stringify(next)) changed.push({ imageId, before: queries, after: next,
    provenance: nativeStackedQueries175(reading.lines, evidence, value => globalRecoveryQueries104('Etiqueta por identificar', [value]).length > 0) });
  for (const query of next) {
    const url = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines?'
      + new URLSearchParams({ page: '1', text: query, store: '1' });
    if (!cache.has(url)) missing.add(query);
  }
}
const output = process.argv[2] || 'qa-artifacts/continuation174-20261022/PREFLIGHT175.json';
assert(/^qa-artifacts\/continuation174-20261022\/PREFLIGHT175(?:-r[1-9]\d*)?\.json$/.test(output) && !fs.existsSync(output));
const result = { source, sourceSHA256: sha112(bytes), changed, newFirstPages: [...missing], requests: 0, models: 0,
  expectedNamesGivenToQueries: false, scope: 'Query-only preflight, no predicted closure gain or identity claim' };
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
