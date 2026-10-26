import assert from 'node:assert/strict';
import { validatePair125, validateAuthorization125, validateVisual125 } from './distribute-matchrim125.mjs';
const source = '10076dda2cfc3eeb6a97f4a30443098b7fadec90';
const prep = { passed: true, typecheck: 'PASS', build: 125, version: '1.0', sourceDirty: false,
  publicConfiguration: { fixtures: false, project: 'cbjynrbvrhcmpaojmqdp' }, commit: source };
const archive = { passed: true, signatureVerified: true, build: 125, version: '1.0', bundleId: 'wine.matchrim.app', sourceCommit: source };
validatePair125(prep, archive);
for (const patch of [{ build: 106 }, { sourceDirty: true }, { sourceDirty: undefined }, { commit: 'other' },
  { commit: 'ae8ec225210eb97178dc7aedf0c72ef891c22388' }, { typecheck: 'FAIL' },
  { publicConfiguration: { fixtures: true, project: 'cbjynrbvrhcmpaojmqdp' } }]) assert.throws(() => validatePair125({ ...prep, ...patch }, archive));
for (const patch of [{ signatureVerified: false }, { sourceCommit: 'other' }, { bundleId: 'wine.matchrim.qa125' }, { build: 124 }])
  assert.throws(() => validatePair125(prep, { ...archive, ...patch }));
const auth = { build: 125, sourceCommit: source, privateBetaOnly: true, humanExplicitUpload: true,
  knownLimitationsAccepted: true, exactHumanReply: 'Synthetic permission for negative gate tests only' };
validateAuthorization125(auth);
for (const patch of [{ build: 106 }, { sourceCommit: 'other' }, { privateBetaOnly: false }, { humanExplicitUpload: false },
  { knownLimitationsAccepted: false }, { exactHumanReply: '' }]) assert.throws(() => validateAuthorization125({ ...auth, ...patch }));
const proof = (name, size) => ({ passed: true, build: 125, sourceCommit: source, liveAccountsUsed: false,
  syntheticAccount: true, catalogueDataInjected: true, ownAppTerminated: true, contentSizeRestored: true,
  master259: { networkCallsAllowed: 0 }, stages: [{ name, size, result: { code: 0, signal: null }, stopped: null }] });
const normal = proof('normal', 'large'), maximum = proof('max', 'accessibility-extra-extra-extra-large');
validateVisual125(prep, normal, maximum);
for (const patch of [{ passed: false }, { build: 124 }, { sourceCommit: 'other' }, { liveAccountsUsed: true },
  { syntheticAccount: false }, { contentSizeRestored: false }, { master259: { networkCallsAllowed: 1 } },
  { stages: [] }, { stages: normal.stages }]) assert.throws(() => validateVisual125(prep, normal, { ...maximum, ...patch }));
console.log('PASS125 fixed new source/archive/version, normal/MAX guards and explicit limited-beta authorization; no signing/export/upload/network');
