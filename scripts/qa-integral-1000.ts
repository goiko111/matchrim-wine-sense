import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import type { MatchrimProfileLike } from '../src/utils/matchrimPassport';

async function main() {
  const phase = process.argv[2] || 'local-fixed';
  const source = phase === 'baseline' ? '/private/tmp/matchrim72-production-candidate' : resolve('.');
  const { calculateLearnedMatchrimProfile: learn, scoreMatchrimProfileAgainstSensory: score } =
    await import(pathToFileURL(`${source}/src/utils/matchrimLearning.ts`).href);
  const { readMatchrimLocalProfile } = await import(pathToFileURL(`${source}/src/utils/matchrimLocalProfile.ts`).href);
  const seed = 721007;
  let state = seed;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
  const sensoryKeys = ['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado'] as const;
  const archetypes = [
    'novato-sin-test', 'novato-frutal', 'aficionado-atlantico', 'tinto-clasico', 'dulce-aromatico',
    'baja-acidez', 'alto-tanino', 'bajo-tanino', 'explorador', 'conservador', 'presupuesto-estricto',
    'premium', 'restaurante-copa', 'marisco', 'sumiller-tinto', 'sumiller-blanco', 'tienda-expositor',
    'coleccionista', 'gusto-contradictorio', 'cambio-de-gusto', 'guarda-no-puntua', 'rechazos',
    'baja-vision', 'lector-pantalla',
  ];
  const catalog = Array.from({ length: 96 }, (_, i) => ({
    id: `fixture-wine-${i}`, name: `Vino sintetico ${i}`, price: 8 + Math.floor(random() * 85),
    sensory_attributes: Object.fromEntries(sensoryKeys.map(key => [key, 1 + Math.floor(random() * 5)])),
  }));
  const regressions: { id: string; expected: unknown; observed: unknown; status: string }[] = [];
  const check = (id: string, expected: unknown, observed: unknown) => {
    regressions.push({ id, expected, observed, status: JSON.stringify(expected) === JSON.stringify(observed) ? 'PASS' : 'FAIL' });
  };
  const neutral = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
  const nullSensory = Object.fromEntries(sensoryKeys.map(key => [key, null]));
  check('missing-sensory-is-unknown-not-zero', null, score(neutral, nullSensory));
  check('missing-sensory-cannot-train', 0, learn(neutral, [{ rating: 'love', sensory_attributes: nullSensory }]).samples);
  for (const invalid of [null, '', false, [], {}]) {
    const value = JSON.stringify({ ...neutral, acidez: invalid });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => value } });
    check(`invalid-local-profile-${JSON.stringify(invalid)}`, null, readMatchrimLocalProfile());
  }
  const profiles = [];
  let assertions = 0;
  let eventsCount = 0;
  const started = performance.now();
  for (let i = 0; i < 1000; i += 1) {
    const archetype = archetypes[i % archetypes.length];
    const base = Object.fromEntries(axes.map(key => [key, Number((1 + random() * 4).toFixed(4))])) as MatchrimProfileLike;
    const persona = {
      id: `synthetic-${String(i + 1).padStart(4, '0')}`, archetype, adultAge: 21 + (i % 55),
      knowledge: i % 3, budget: 10 + Math.floor(random() * 75), curiosity: Number(random().toFixed(4)),
      technology: i % 4, locale: i % 5 === 0 ? 'EN' : 'ES', frequency: i % 4,
      accessibility: i % 24 === 22 ? 'large-text' : i % 24 === 23 ? 'screen-reader' : 'default',
      base, explicitNegativePreference: axes[(i + 2) % 5],
    };
    const wines = new Map<string, { rating: 'love' | 'ok' | 'not_for_me' | null; sensory_attributes: Record<string, number>; updated_at: string; train: boolean }>();
    const events = [];
    const before = learn(base, []);
    let maxSingleShift = 0;
    for (let step = 0; step < 20; step += 1) {
      const previous = learn(base, [...wines.values()].filter(w => w.train));
      const action = step % 10;
      const targetStep = action === 6 ? step - 1 : action === 7 ? step - 2 : action === 8 ? step - 3 : step;
      const wine = catalog[(i * 7 + targetStep * 11) % catalog.length];
      let key = wine.id;
      if (action === 8) wines.delete(key);
      else if (action === 9 && wines.size) {
        const first = [...wines.entries()].find(([, value]) => value.train) || [...wines.entries()][0];
        key = first[0];
        first[1].train = false;
      } else if (action === 7) {
        const existing = wines.get(key);
        assert.ok(existing, 'Repeat must target the same existing reference'); assertions += 1;
        wines.set(key, { ...existing });
      } else {
        let rating: 'love' | 'ok' | 'not_for_me' | null = null;
        if (action > 1 && archetype !== 'guarda-no-puntua') {
          const affinity = score(base, wine.sensory_attributes) || 0;
          rating = archetype === 'rechazos' ? 'not_for_me' : affinity > 75 ? 'love' : affinity < 50 ? 'not_for_me' : 'ok';
          if (archetype === 'gusto-contradictorio') rating = step % 2 ? 'love' : 'not_for_me';
          if (archetype === 'cambio-de-gusto' && step > 10) rating = rating === 'love' ? 'not_for_me' : 'love';
          if (action === 6) rating = wines.get(key)?.rating === 'love' ? 'not_for_me' : 'love';
        }
        wines.set(key, { rating, sensory_attributes: wine.sensory_attributes,
          updated_at: new Date(Date.UTC(2026, 0, 1 + step * 18)).toISOString(), train: rating !== null });
      }
      const evidence = [...wines.values()].filter(w => w.train);
      const after = learn(base, evidence);
      if (action === 7) { assert.deepEqual(after, previous); assertions += 1; }
      assert.deepEqual(after, learn(base, evidence)); assertions += 1;
      assert.deepEqual(after, learn(base, JSON.parse(JSON.stringify(evidence)))); assertions += 1;
      assert.ok(axes.every(key => Number.isFinite(after.profile[key]) && after.profile[key] >= 0 && after.profile[key] <= 5)); assertions += 1;
      assert.ok(after.confidence >= 0 && after.confidence <= 100); assertions += 1;
      assert.equal(after.samples, evidence.filter(w => w.rating).length); assertions += 1;
      const shift = Math.max(...axes.map(key => Math.abs(after.profile[key] - previous.profile[key])));
      if (after.samples === 1) maxSingleShift = Math.max(maxSingleShift, shift);
      const ranked = catalog.map(w => ({ id: w.id, score: score(after.profile, w.sensory_attributes) })).sort((a, b) => b.score - a.score);
      const unseen = ranked.filter(w => !wines.has(w.id));
      assert.ok(unseen.every(w => !wines.has(w.id))); assertions += 1;
      events.push({ step, day: 1 + step * 18, action: ['save', 'save', 'rate', 'rate', 'rate', 'rate', 'edit', 'repeat', 'delete', 'exclude'][action],
        wineId: key, samples: after.samples, confidence: after.confidence, profile: after.profile, top: ranked.slice(0, 3),
        unseenTop: unseen[0]?.id, inBudgetCount: catalog.filter(w => w.price <= persona.budget).length });
      eventsCount += 1;
    }
    if (archetype === 'guarda-no-puntua') { assert.deepEqual(learn(base, [...wines.values()]).profile, base); assertions += 1; }
    profiles.push({ ...persona, before, events, final: learn(base, [...wines.values()].filter(w => w.train)), maxSingleShift });
  }
  assert.equal(new Set(profiles.map(p => JSON.stringify(p.base))).size, 1000);
  const directory = resolve('../simulation'); mkdirSync(directory, { recursive: true });
  const report = { task: 'MATCHRIM72-QA-20261007', phase, seed, environment: 'local pure engine; no network/accounts/LLM',
    limitation: 'Synthetic labels derive from the same sensory distance; this tests consistency, NOT predictive sensory accuracy. Storage snapshots are local maps, NOT database/device persistence.',
    profiles: profiles.length, uniqueTasteVectors: 1000, archetypes: archetypes.length, sequences: profiles.length, events: eventsCount,
    invariantAssertions: assertions, runtimeMs: Math.round(performance.now() - started), regressions,
    failedRegressions: regressions.filter(r => r.status === 'FAIL').length,
    cohortSha256: createHash('sha256').update(JSON.stringify(profiles)).digest('hex'),
    archetypeSummary: archetypes.map(name => ({ name, count: profiles.filter(p => p.archetype === name).length,
      heuristic: name === 'guarda-no-puntua' ? 'Guardar no prueba preferencia ni consumo; perfil no cambia.' : 'Revisar lenguaje y coherencia con este trabajo; no es opinion humana.' })),
  };
  writeFileSync(`${directory}/${phase}-profiles.json`, JSON.stringify(profiles));
  writeFileSync(`${directory}/${phase}-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
