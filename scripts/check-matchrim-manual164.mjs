import assert from 'node:assert/strict';
import fs from 'node:fs';
import { combinedProbe164, evaluate164, parseManual164, MARKERS164 } from './qa-matchrim-manual164.mjs';
const parent = fs.readFileSync('scripts/MatchrimRescan161Probe.swift', 'utf8'), probe = fs.readFileSync('scripts/MatchrimManual164Probe.swift', 'utf8');
const combined = combinedProbe164(parent, probe);
assert(combined.includes('class MatchrimRescan161Tests: XCTestCase'));
assert(combined.includes('@MainActor fileprivate func photo('));
assert(combined.includes('fileprivate func validDimension('));
assert(combined.endsWith(probe)); assert(parent.includes('final class MatchrimRescan161Tests: XCTestCase'));
assert.throws(() => combinedProbe164(parent.replace('final class', 'class'), probe));
assert.throws(() => combinedProbe164(parent, 'invalid'));
const started = "Test Case '-[Probe97UITests.MatchrimManual164Tests testExistingQAManualRecovery164]' started.";
const passed = "Test Case '-[Probe97UITests.MatchrimManual164Tests testExistingQAManualRecovery164]' passed (121.0 seconds).";
const markers = [MARKERS164[0], 'RESCAN161_PHOTOS_ADDED_ORDER_VERIFIED', 'RESCAN161_ATTESTED_PHOTO_SELECTED', ...MARKERS164.slice(1)];
const log = [started, ...markers, passed, 'Executed 1 test, with 0 failures (0 unexpected)'].join('\n');
assert(evaluate164(log, 0));
const iteration = log.replace('started.', 'started (Iteration 1 of 1).'); assert(evaluate164(iteration, 0));
assert(!evaluate164(iteration.replace(started, '').replace('MANUAL164_OWNER\n', '') + '\nMANUAL164_OWNER', 0));
assert(!evaluate164([markers[0], ...iteration.split('\n').filter(line => line !== markers[0])].join('\n'), 0));
for (const marker of markers) {
  assert(!evaluate164(log.replace(marker + '\n', ''), 0), 'Missing ' + marker);
  assert(!evaluate164(log.replace(marker, marker + '\n' + marker), 0), 'Duplicated ' + marker);
}
for (const bad of [log.replace('Executed 1 test', 'Executed 2 tests'), log.replace('with 0 failures', 'with 1 failures'),
  log + '\nAUTH_SUBMITTED', log + '\nSAVE_SUBMITTED', log + '\nRESCAN161_FAILURE', log + '\nMANUAL164_UNKNOWN',
  log.replace(started, passed), log.replace('MANUAL164_EXPLICIT_VINTAGE', 'MANUAL164_COMPLETE'),
  log.replace('RESCAN161_ATTESTED_PHOTO_SELECTED\n', '').replace(passed, 'RESCAN161_ATTESTED_PHOTO_SELECTED\n' + passed)]) assert(!evaluate164(bad, 0));
assert(!evaluate164(log, 1)); assert(!evaluate164(log, 0, 'RESOURCE_HOLD'));
const record = { runId: 'run', inputSHA256: '8d213ff13a2a9c79ce6131180afe7a599bcda88b94cecf1cf853d2c6658cc1f9',
  name: 'Flor de Muga Blanco', producer: 'Muga', vintage: 2022, current: 71, personalRating: 'love',
  personalVerdictTitle: 'Tu valoración: te encanta', selection: 'manual-query-and-explicit-vintage',
  photoCertifiedVintage: false, automaticIdentityProven: false, newSavePersistenceValidated: false, selectedPublicId: null, accessibilityIssues: 0,
  dimensions: ['potencia', 'acidez', 'dulzor', 'tanino', 'fruta'].map(axis => `${axis}: tu perfil 1.4/5; este vino 4.0/5`) };
assert.equal(parseManual164(record, 'run'), record);
for (const mutate of [r => { r.vintage = 2021; }, r => { r.current = NaN; }, r => { r.current = 101; },
  r => { r.personalRating = 'ok'; }, r => { r.photoCertifiedVintage = true; }, r => { r.automaticIdentityProven = true; },
  r => { r.newSavePersistenceValidated = true; }, r => { r.selectedPublicId = 279035; }, r => { r.accessibilityIssues = 1; },
  r => { r.dimensions[4] = r.dimensions[0]; }, r => { r.dimensions[0] = 'potencia: tu perfil 6.0/5; este vino 4.0/5'; }]) {
  const changed = structuredClone(record); mutate(changed); assert.throws(() => parseManual164(changed, 'run'));
}
for (const token of ['info@winerim.com', 'Flor de Muga Blanco', '2022', 'performAccessibilityAudit', 'manual164-record', 'manual-query-and-explicit-vintage']) assert(probe.includes(token));
console.log(JSON.stringify({ passed: true, negativeCases: markers.length * 2 + 11 + 11 + 2, runtimeStarted: false, scope: '164 evaluator/readback/source guards only; not simulator execution' }));
