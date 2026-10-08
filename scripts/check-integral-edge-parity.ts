import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { calculateEdgeLearnedProfileAudit } from '../supabase/functions/_shared/matchrim-learning';
import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';

async function main() {
  const baselinePath = '/private/tmp/matchrim72-production-candidate/supabase/functions/_shared/matchrim-learning.ts';
  const sourceSha256 = createHash('sha256').update(readFileSync(baselinePath)).digest('hex');
  const manifest = JSON.parse(readFileSync('../../matchrim72/backend-source-manifest.json', 'utf8'));
  const deployed = manifest.files.find((file: { path: string }) => file.path.endsWith('/matchrim-learning.ts'));
  assert.equal(sourceSha256, deployed.sha256, 'Recorded v72 learning helper must match the baseline under test');
  const baseline = await import(pathToFileURL(baselinePath).href);
  const base = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
  const results = [];
  for (const invalid of [null, '', false, [], {}, undefined]) {
    const sensory = Object.fromEntries(['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado'].map(key => [key, invalid]));
    const rows = [{ rating: 'love', sensory_attributes: sensory }];
    const before = baseline.calculateEdgeLearnedProfileAudit(base, rows);
    const after = calculateEdgeLearnedProfileAudit(base, rows);
    const client = calculateLearnedMatchrimProfile(base, rows);
    assert.equal(after.samples, 0);
    assert.deepEqual(after.profile, base);
    assert.deepEqual(after, { profile: client.profile, confidence: client.confidence, samples: client.samples });
    results.push({ input: invalid === undefined ? 'undefined' : JSON.stringify(invalid), expectedSamples: 0,
      baselineSamples: before.samples, localEdgeSamples: after.samples, clientParity: true });
  }
  const report = { baselineSourceSha256: sourceSha256, recordedV72HashMatches: true, environment: 'local pure function; no server calls',
    productionChanged: false, versionedNamespaceDeploymentPending: true, results };
  writeFileSync('../edge-parity.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
