import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeWineAttributesForInsight } from '../src/utils/wineAffinityExplanation';

const [root, output] = process.argv.slice(2);
if (!root) throw new Error('Usage: tsx scripts/audit-matchrim-recorded-catalog.ts <recorded-root> [output.json]');
const traces = [];
for (const scene of readdirSync(root).sort()) {
  const path = join(root, scene, 'backend-trace.json');
  if (!existsSync(path)) continue;
  const raw = readFileSync(path);
  const calls = JSON.parse(raw.toString()).filter(c => c.function === 'search-wines');
  if (!calls.length) continue;
  const rows = calls.flatMap(c => Array.isArray(c.payload?.wines) ? c.payload.wines : []);
  traces.push({ scene, trace_sha256: createHash('sha256').update(raw).digest('hex'), calls: calls.length,
    rows: rows.length, rows_with_id: rows.filter(w => w.id != null).length,
    rows_with_sensory: rows.filter(w => normalizeWineAttributesForInsight(w.tastingAttributes ?? w.tasting_attributes)).length });
}
const result = { scope: 'Read-only recorded response audit. Rows may repeat; not a census of production catalog.',
  remote_calls: 0, traces, totals: traces.reduce((a, t) => ({ calls: a.calls + t.calls, rows: a.rows + t.rows,
    rows_with_id: a.rows_with_id + t.rows_with_id, rows_with_sensory: a.rows_with_sensory + t.rows_with_sensory }),
  { calls: 0, rows: 0, rows_with_id: 0, rows_with_sensory: 0 }) };
const serialized = JSON.stringify(result, null, 2) + '\n';
if (output) writeFileSync(output, serialized);
console.log(serialized);
