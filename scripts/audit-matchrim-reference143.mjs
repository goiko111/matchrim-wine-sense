import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = process.cwd();
const base = path.join(repo, 'qa-artifacts/night105-20261021');
const output = path.resolve(process.argv[2] || '');
assert.equal(path.dirname(output), base);
assert(/^reference143-[a-z0-9-]+$/.test(path.basename(output)) && !fs.existsSync(output));
const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases['writer-matchrim-native99'];
assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && lease.leaseId === process.env.MATCHRIM102_WRITER_LEASE_ID
  && lease.reviewAfter * 1000 > Date.now(), 'OWN_LIVE_WRITER_REQUIRED');
process.umask(0o077);
globalThis.fetch = async () => { throw Error('NO_NETWORK_IN_REFERENCE143'); };
const pins = new Map();
const read = file => {
  const bytes = fs.readFileSync(file);
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (pins.has(file)) assert.equal(pins.get(file), digest, 'INPUT_CHANGED'); else pins.set(file, digest);
  return bytes;
};
const json = file => JSON.parse(read(file).toString('utf8'));
read(fileURLToPath(import.meta.url));
const reference = path.join(base, 'ref136-r4');
const native = json(reference + '/RESULT.json');
assert.equal(native.passed, true);
assert.equal(native.stage, 'readonly-reference-proven');
const preparation = json(path.join(base, 'candidate103-r11/preparation.json'));
assert.equal(preparation.commit, native.sourceCommit);
assert.equal(preparation.sourceDirty, false);
const modules = ['src/utils/wineAffinityExplanation.ts', 'supabase/functions/_shared/matchrim-scan-values.ts',
  'src/utils/nativeGlobalCatalogue103.ts', 'src/utils/winerimOriginalSheet.ts'];
for (const module of modules) {
  read(path.join(repo, module));
  const committed = execFileSync('git', ['show', `${preparation.commit}:${module}`], { cwd: repo });
  const frozenHash = createHash('sha256').update(committed).digest('hex');
  assert.equal(pins.get(path.join(repo, module)), frozenHash, 'FORMULA_OR_MAPPING_CHANGED_SINCE_NATIVE_FLOW');
  if (preparation.sourceFingerprints[module]) assert.equal(preparation.sourceFingerprints[module], frozenHash);
}
const { globalSensory103 } = await import('../src/utils/nativeGlobalCatalogue103.ts');
const { calculateLocalMatchrimAffinity, buildAffinityInsights } = await import('../src/utils/wineAffinityExplanation.ts');
const { validateWinerimOriginalSensory } = await import('../src/utils/winerimOriginalSheet.ts');
read(path.join(repo, 'scripts/matchrim-profiles131-fixture.mjs'));
const { makeProfiles131 } = await import('./matchrim-profiles131-fixture.mjs');
const attachment = (folder, prefix) => {
  const manifest = json(folder + '/attachments/manifest.json');
  const rows = manifest.flatMap(row => row.attachments).filter(row => row.suggestedHumanReadableName.startsWith(prefix));
  assert.equal(rows.length, 1, 'UNIQUE_ATTACHMENT_REQUIRED');
  const row = rows[0];
  assert.equal(row.deviceId, 'B18822EF-BFBD-4A6A-89B2-33539BDE4127');
  assert.equal(row.repetitionNumber, 1);
  assert(/^[A-Z0-9-]+\.txt$/.test(row.exportedFileName));
  return read(folder + '/attachments/' + row.exportedFileName).toString('utf8');
};
const profileFolder = path.join(base, 'nav138-r4');
const profileRun = json(profileFolder + '/RESULT.json');
assert.equal(profileRun.sourceCommit, 'b24b7315a421e3c08aff38a205d954193de795ac');
const profileAX = attachment(profileFolder, 'nav138-01-profile-ax_');
assert(profileAX.includes("label: 'info@winerim.com'"));
const profile = {};
for (const [key, label] of [['potente', 'Potente'], ['acidez', 'Acidez'], ['dulce', 'Dulce'], ['tanico', 'Tánico'], ['afrutado', 'Afrutado']]) {
  const lines = profileAX.split(/\r?\n/).filter(line => line.includes(`label: '${label}: perfil actual'`));
  assert.equal(lines.length, 1, 'UNIQUE_CURRENT_METER_REQUIRED');
  const match = lines[0].match(/, value: ([0-5](?:[.,]\d+)?) de 5(?:;|,|$)/);
  assert(match, 'CURRENT_METER_VALUE_REQUIRED');
  const value = Number(match[1].replace(',', '.')); assert(value >= 0 && value <= 5);
  profile[key] = value;
}
const scope = attachment(reference, 'ref136-affinity-scope_');
const scoreMatch = scope.match(/^Current unsaved affinity: (\d{1,3})\/100 for the explicitly chosen2020 public reference\./);
assert(scoreMatch); const actualUIScore = Number(scoreMatch[1]); assert(actualUIScore <= 100);
const corpus = json(path.join(base, 'native112-corpus200-r8/REPORT.json'));
assert.equal(corpus.summary.sourceIntegrityVerified, true);
const scene = corpus.rows.find(row => row.imageId === 'img-001'); assert(scene?.eligible);
assert.equal(scene.inputSHA256, json(reference + '/PHOTO-ATTESTATION.json').sha256);
assert.equal(scene.proposals.length, 1);
const row = scene.proposals[0].row;
assert.equal(row.name, "Terre d'Aigle Quarts de Chaume Grand Cru");
assert.equal(row.winery, 'Domaine Aguilas'); assert.equal(String(row.vintage), '2020');
const sensory = validateWinerimOriginalSensory(row.tastingAttributes); assert(sensory);
// A mapping-only input, not a trusted/canonical record or new detail response.
const attributes = globalSensory103({ sensory });
const score = calculateLocalMatchrimAffinity(profile, attributes);
const insights = buildAffinityInsights(profile, attributes); assert(insights);
const equal = score === actualUIScore;
const counterfactual = makeProfiles131('00000000-0000-4000-8000-000000010201').map((person, index) => ({
  index, synthetic: true, profile: person.profile, score: calculateLocalMatchrimAffinity(person.profile, attributes),
}));
assert.equal(counterfactual.length, 50);
assert(counterfactual.every(row => Number.isInteger(row.score) && row.score >= 0 && row.score <= 100));
const distinctScores = new Set(counterfactual.map(row => row.score)).size;
assert(distinctScores > 1, 'PERSONALIZATION_MUST_NOT_BE_CONSTANT');
for (const [file, digest] of pins) assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), digest, 'INPUT_CHANGED');
const report = { observedUTC: new Date().toISOString(), mathematicalAgreement: equal, actualUIScore, replayedScore: score,
  currentProfileFromNativeAX: profile, cachedPublicWine: { id: row.id, name: row.name, producer: row.winery, vintage: row.vintage, attributes: sensory },
  dimensions: insights.insights, bestMatches: insights.positives.map(row => row.key), frictions: insights.negatives.map(row => row.key),
  counterfactualExisting131Profiles: counterfactual, distinctCounterfactualScores: distinctScores, realUsersSimulated: 0,
  nativeReferenceFlowPassed: native.passed, profileAuditSuitePassed: profileRun.passed,
  inputSHA256: scene.inputSHA256, sourceFingerprints: Object.fromEntries([...pins].map(([file, digest]) => [path.relative(repo, file), digest])),
  networkCalls: 0, modelStarts: 0, writesToApplication: 0, canonicalIdentitiesCreated: 0,
  scope: 'Post-run arithmetic consistency only. Actual native current-profile AX plus the recorded UI66 and cached public search-row attributes. Does not capture the live detail packet, prove its same publicID/attributes, verify photo vintage, establish human taste accuracy, or approve the failed accessibility suite. Expected identities never enter OCR or queries.' };
fs.mkdirSync(output, { mode: 0o700 });
fs.writeFileSync(output + '/REPORT.json', JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ mathematicalAgreement: equal, actualUIScore, replayedScore: score, dimensions: insights.insights.length,
  existingSyntheticProfiles: counterfactual.length, distinctCounterfactualScores: distinctScores, networkCalls: 0 }));
process.exitCode = equal ? 0 : 1;
