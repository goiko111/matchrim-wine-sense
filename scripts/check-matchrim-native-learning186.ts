import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { calculateLearnedMatchrimProfile95 as server, readMatchrimLearningOptions96,
  NATIVE_MATCHRIM_LEARNING_MODEL, type MatchrimProfile95 as Profile } from '../supabase/functions/_shared/matchrim-profile95';
import { calculateLearnedMatchrimProfile as client } from '../src/utils/matchrimLearning';
import { cellarTrainingRows, makeCellarCatalogEvidence, withCellarInitialAffinity, readCellarInitialAffinity } from '../src/utils/bodegaAffinity';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import { makeProfiles131 } from './matchrim-profiles131-fixture.mjs';

const output = path.resolve(process.argv.find(arg => arg.startsWith('--output='))?.slice(9) ?? '');
assert(output.startsWith(path.resolve('qa-artifacts/continuation186-20261023') + path.sep));
assert(!fs.existsSync(output));
const sourcePath = 'supabase/functions/_shared/matchrim-profile95.ts';
const source = fs.readFileSync(sourcePath, 'utf8');
const historicalSource = execFileSync('git', ['show', 'a0bf1c5:' + sourcePath], { encoding: 'utf8' });
const historical = { exports: {} as { calculateLearnedMatchrimProfile95: typeof server } };
vm.runInNewContext(ts.transpileModule(historicalSource, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
} }).outputText, historical);
const native = readMatchrimLearningOptions96(NATIVE_MATCHRIM_LEARNING_MODEL);
const all = (value: number): Profile => ({ potente: value, acidez: value, dulce: value, tanico: value, afrutado: value });
const attributes = (p: Profile, marked = true) => ({ ...(marked ? { scale: 'winerim-0-5' as const } : {}),
  potencia: p.potente, acidez: p.acidez, dulzura: p.dulce, taninos: p.tanico, afrutado: p.afrutado });
const wine = (id: string, p: Profile, canonical = 'SYN-TRUSTED186', marked = true, rating: 'love' | 'ok' | 'not_for_me' = 'love') => {
  const row = { id, name: 'Synthetic186 wine', producer: 'Synthetic producer', vintage: 2024, region: 'Synthetic', country: 'ES',
    rating, use_for_profile_training: true, sensory_attributes: attributes(p, marked) };
  return { ...row, place_details: { matchrim_rating_at: '2026-10-23T00:00:00.000Z',
    bodega_sensory_evidence: makeCellarCatalogEvidence(row, canonical, row.sensory_attributes) } };
};
const nativeClient = (base: Profile, rows: ReturnType<typeof wine>[]) => {
  const learned = client(base, cellarTrainingRows(rows, true), { evidenceStrength: 'native-v2' });
  return { profile: learned.profile, samples: learned.samples, confidence: learned.confidence };
};
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
const profiles = makeProfiles131('00000000-0000-4000-8000-000000018600').map(value => value.profile as Profile);
assert.equal(profiles.length, 50); assert.equal(new Set(profiles.map(value => JSON.stringify(value))).size, 50);
const checks: Array<{ name: string; passed: boolean; error?: string; actual?: unknown; expected?: unknown }> = [];
const check = (name: string, run: () => void) => {
  try { run(); checks.push({ name, passed: true }); }
  catch (error) { const failure = error as Error & { actual?: unknown; expected?: unknown };
    checks.push({ name, passed: false, error: failure.message, actual: failure.actual, expected: failure.expected }); }
};

check('native public all-three proof is quarantined on server exactly as on client', () => {
  const rows = [wine('public', all(3), 'winerim-public-store:186')];
  assert.deepEqual(nativeClient(all(1), rows), { profile: all(1), samples: 0, confidence: 0 });
  assert.deepEqual(server(all(1), rows, native), nativeClient(all(1), rows));
});

if (!process.argv.includes('--red-only')) {
  for (const [index, base] of profiles.entries()) {
    for (const rating of ['love', 'ok', 'not_for_me'] as const) {
      const target = { potente: 0, acidez: .4, dulce: 1.7, tanico: 0, afrutado: 5 };
      const trusted = wine('trusted', target, 'SYN-TRUSTED186', true, rating);
      check(`profile${index}: selected native client/server decimals, ${rating}`, () => {
        const rows = [trusted], before = JSON.stringify({ base, rows });
        assert.deepEqual(server(base, rows, native), nativeClient(base, rows));
        assert.equal(JSON.stringify({ base, rows }), before);
      });
      for (const marked of [true, false]) check(`profile${index}: public-only and mixed quarantine ${rating}/v${marked ? 2 : 1}`, () => {
        for (const value of [0, 3, 4.4]) {
          const publicRow = wine('public', all(value), 'winerim-public-store:186', marked, rating);
          const rows = [publicRow], before = JSON.stringify({ base, rows });
          assert.deepEqual(server(base, rows, native), { profile: base, samples: 0, confidence: 0 });
          assert.deepEqual(server(base, rows, native), nativeClient(base, rows));
          assert.deepEqual(server(base, [trusted, publicRow], native), server(base, [trusted], native));
          assert.equal(JSON.stringify({ base, rows }), before);
        }
      });
    }
    check(`profile${index}: unbound, edited, invalid or excluded current rows never train`, () => {
      const valid = wine('binding', all(5));
      for (const row of [{ ...valid, place_details: {} }, { ...valid, name: 'Edited name' },
        { ...valid, vintage: 2025 }, { ...valid, use_for_profile_training: false }, { ...valid, rating: null }]) {
        assert.deepEqual(server(base, [row], native), { profile: base, samples: 0, confidence: 0 });
        assert.deepEqual(nativeClient(base, [row as ReturnType<typeof wine>]), { profile: base, samples: 0, confidence: 0 });
      }
    });
    check(`profile${index}: web/default and unknown tags remain byte-equivalent to pre186 output`, () => {
      const rows = [wine('public', all(3), 'winerim-public-store:186'), wine('trusted', all(5))];
      for (const tag of [undefined, null, '', false, {}, [], 'native-evidence-strength-v2 ', 'NATIVE-EVIDENCE-STRENGTH-V2']) {
        const options = readMatchrimLearningOptions96(tag);
        assert.equal(JSON.stringify(server(base, rows, options)), JSON.stringify(historical.exports.calculateLearnedMatchrimProfile95(base, rows, options)));
      }
    });
  }
  check('native independent LOVE/OK/rejection anchors preserve evidence strength', () => {
    const target = { potente: 0, acidez: .4, dulce: 1.7, tanico: 0, afrutado: 5 };
    for (const [rating, expected] of [
      ['love', { potente: 2.1, acidez: 2.2, dulce: 2.6, tanico: 2.1, afrutado: 3.6 }],
      ['not_for_me', { potente: 3.7, acidez: 3.6, dulce: 3.3, tanico: 3.7, afrutado: 2.5 }],
    ] as const) assert.deepEqual(server(all(3), [wine('anchor', target, 'SYN-TRUSTED186', true, rating)], native).profile, expected);
    assert.deepEqual(server(all(1), [wine('ok', all(5), 'SYN-TRUSTED186', true, 'ok')], native), { profile: all(1.3), samples: 1, confidence: 2 });
  });
  check('native exact numeric zero remains a valid positive control; malformed marked values fail closed', () => {
    assert.equal(server(all(3), [wine('zero', all(0))], native).samples, 1);
    const valid = wine('bad', all(3));
    for (const value of [6, 100, '0', null, undefined, NaN, Infinity, -1]) {
      const row = { ...valid, sensory_attributes: { ...valid.sensory_attributes, potencia: value } };
      assert.equal(server(all(3), [row], native).samples, 0);
    }
    assert.equal(server(all(3), [{ ...valid, sensory_attributes: { ...valid.sensory_attributes, scale: 'unknown' } }], native).samples, 0);
  });
  check('native rejected latest public revision cannot resurrect an older trusted row', () => {
    const trusted = wine('same-id', all(5));
    const rejected = { ...wine('same-id', all(3), 'winerim-public-store:186'),
      place_details: { ...wine('same-id', all(3), 'winerim-public-store:186').place_details, matchrim_rating_at: '2026-10-23T01:00:00.000Z' } };
    for (const rows of [[trusted, rejected], [rejected, trusted]]) assert.equal(server(all(1), rows, native).samples, 0);
    assert.equal(server(all(1), [trusted, trusted], native).samples, 1);
  });
  check('pre186 native counterexample is retained as RED evidence, not silently replaced', () => {
    const rows = [wine('public', all(3), 'winerim-public-store:186')];
    assert.deepEqual(plain(historical.exports.calculateLearnedMatchrimProfile95(all(1), rows, native)),
      { profile: all(1.6), samples: 1, confidence: 8 });
  });
  check('D4 remains explicit: existing v2 score24 and stored history are not rewritten to25', () => {
    const row = wine('v2-history', all(4)), base = { profile: all(0), source: 'quiz' as const, samples: 0, status: 'ready' as const, note: 'SYNTHETIC186' };
    assert.equal(calculateLocalMatchrimAffinity(all(0), row.sensory_attributes), 24);
    const details = withCellarInitialAffinity(row, base, 'saved', '2026-10-23T00:00:00.000Z');
    const saved = { ...row, place_details: details };
    assert.equal(readCellarInitialAffinity(saved)?.score, 24);
    assert.deepEqual(withCellarInitialAffinity(saved, { ...base, profile: all(3) }, 'first_verified'), details);
  });
}
const report = { scope: 'Current native-v2 client/profile95 conformance with 50 synthetic vectors; not deployed/API/recognition or human taste evidence.',
  sourceSha256: createHash('sha256').update(source).digest('hex'), profiles: profiles.length,
  passed: checks.filter(value => value.passed).length, failed: checks.filter(value => !value.passed).length, checks,
  historical101Reclassified: false, D4Correction: false, deploymentVerified: false, externalRequests: 0,
  open: ['D4 v2 rounding compatibility', 'Legacy web and generic Edge controls unchanged by request', 'Native shared helper deployment and live catalogue validation'] };
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
fs.writeFileSync(path.join(output, 'RESULT.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, profiles: report.profiles, output }));
if (report.failed) process.exitCode = 1;
