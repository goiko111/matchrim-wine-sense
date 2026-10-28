import assert from 'node:assert/strict';
import { validateAuthorization129, validatePair129, validateVisual129 } from './distribute-matchrim129.mjs';

const commit = 'a'.repeat(40);
const auth = { build: 129, sourceCommit: commit, privateBetaOnly: true, humanExplicitUpload: true, knownLimitationsAccepted: true,
  exactHumanReply: 'SYNTHETIC TEST ONLY: explicit limited-beta upload request for build 129', knownLimitations: ['200-label recognition not approved'] };
const prep = { passed: true, typecheck: 'PASS', build: 129, version: '1.0', sourceDirty: false, commit,
  publicConfiguration: { fixtures: false, project: 'cbjynrbvrhcmpaojmqdp' } };
const archive = { passed: true, signatureVerified: true, build: 129, version: '1.0', bundleId: 'wine.matchrim.app', sourceCommit: commit };
const proof = (key, name) => ({ passed: true, build: 129, sourceCommit: commit, liveAccountsUsed: false, syntheticAccount: true,
  catalogueDataInjected: true, ownAppTerminated: true, contentSizeRestored: true, [key]: { networkCallsAllowed: 0, realAccountUsed: false },
  stages: [{ name, size: name === 'normal' ? 'large' : 'accessibility-extra-extra-extra-large', result: { code: 0, signal: null }, stopped: null }] });
const proofs = () => ({ master259: { normal: proof('master259', 'normal'), max: proof('master259', 'max') },
  vintage283: { normal: proof('vintage283', 'normal'), max: proof('vintage283', 'max') } });
let groups = 0;
const test = (name, work) => { work(); groups++; console.log('PASS ' + name); };

test('The exact authorized, clean, signed 129 with four focal proofs is accepted', () => {
  validateAuthorization129(auth); validatePair129(prep, archive, auth); validateVisual129(prep, proofs());
});
test('Authorization must be explicit, private, for129 and list accepted limitations', () => {
  for (const patch of [{ build: 128 }, { privateBetaOnly: false }, { humanExplicitUpload: false }, { knownLimitationsAccepted: false },
    { exactHumanReply: 'ok' }, { knownLimitations: [] }, { sourceCommit: 'main' }]) {
    assert.throws(() => validateAuthorization129({ ...auth, ...patch }), /EXPLICIT_LIMITED_BETA_AUTHORIZATION_REQUIRED/, JSON.stringify(patch));
  }
});
test('A dirty, different, failed or fixture-enabled candidate or a mismatched archive is refused', () => {
  for (const patch of [{ sourceDirty: true }, { commit: 'b'.repeat(40) }, { build: 128 }, { typecheck: 'FAIL' }, { passed: false },
    { publicConfiguration: { fixtures: true, project: 'cbjynrbvrhcmpaojmqdp' } }]) assert.throws(() => validatePair129({ ...prep, ...patch }, archive, auth));
  for (const patch of [{ signatureVerified: false }, { sourceCommit: 'b'.repeat(40) }, { bundleId: 'wine.matchrim.qa' }, { build: 128 }])
    assert.throws(() => validatePair129(prep, { ...archive, ...patch }, auth));
});
test('Every scenario and size needs its own passing, offline, synthetic proof', () => {
  for (const [scenario, name] of [['master259', 'normal'], ['master259', 'max'], ['vintage283', 'normal'], ['vintage283', 'max']]) {
    const missing = proofs(); delete missing[scenario][name];
    assert.throws(() => validateVisual129(prep, missing), new RegExp(`VISUAL_PROOF_${scenario}_${name}`));
    for (const patch of [{ passed: false }, { liveAccountsUsed: true }, { syntheticAccount: false }, { contentSizeRestored: false },
      { build: 128 }, { sourceCommit: 'b'.repeat(40) }]) {
      const changed = proofs(); changed[scenario][name] = { ...changed[scenario][name], ...patch };
      assert.throws(() => validateVisual129(prep, changed), undefined, `${scenario}.${name} ${JSON.stringify(patch)}`);
    }
    const network = proofs(); network[scenario][name][scenario].networkCallsAllowed = 1;
    assert.throws(() => validateVisual129(prep, network));
  }
  const swapped = proofs(); swapped.vintage283.max = proof('vintage283', 'normal');
  assert.throws(() => validateVisual129(prep, swapped), 'A normal-size run cannot stand in for MAX');
});
assert.equal(groups, 4);
console.log(`Matchrim distribute129 validators: ${groups}/4 PASS (no export or upload performed)`);
