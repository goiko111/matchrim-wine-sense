import assert from 'node:assert/strict';
import { validatePair125, validateAuthorization125 } from './distribute-matchrim125.mjs';
const source = 'ae8ec225210eb97178dc7aedf0c72ef891c22388';
const prep = { passed: true, typecheck: 'PASS', build: 125, version: '1.0', sourceDirty: false,
  publicConfiguration: { fixtures: false, project: 'cbjynrbvrhcmpaojmqdp' }, commit: source };
const archive = { passed: true, signatureVerified: true, build: 125, version: '1.0', bundleId: 'wine.matchrim.app', sourceCommit: source };
validatePair125(prep, archive);
for (const patch of [{ build: 106 }, { sourceDirty: true }, { sourceDirty: undefined }, { commit: 'other' }, { typecheck: 'FAIL' },
  { publicConfiguration: { fixtures: true, project: 'cbjynrbvrhcmpaojmqdp' } }]) assert.throws(() => validatePair125({ ...prep, ...patch }, archive));
for (const patch of [{ signatureVerified: false }, { sourceCommit: 'other' }, { bundleId: 'wine.matchrim.qa125' }, { build: 124 }])
  assert.throws(() => validatePair125(prep, { ...archive, ...patch }));
const auth = { build: 125, sourceCommit: source, privateBetaOnly: true, humanExplicitUpload: true,
  knownLimitationsAccepted: true, exactHumanReply: 'Synthetic permission for negative gate tests only' };
validateAuthorization125(auth);
for (const patch of [{ build: 106 }, { sourceCommit: 'other' }, { privateBetaOnly: false }, { humanExplicitUpload: false },
  { knownLimitationsAccepted: false }, { exactHumanReply: '' }]) assert.throws(() => validateAuthorization125({ ...auth, ...patch }));
console.log('PASS125 fixed source/archive/version and explicit limited-beta authorization safeguards; no signing/export/upload/network');
