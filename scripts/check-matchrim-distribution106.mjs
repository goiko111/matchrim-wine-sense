import assert from 'node:assert/strict';
import { validatePair106, validateOptions106, acknowledged106 } from './distribute-matchrim106.mjs';

const prep = { passed: true, typecheck: 'PASS', build: 106, version: '1.0', sourceDirty: false,
  publicConfiguration: { fixtures: false, project: 'cbjynrbvrhcmpaojmqdp' }, commit: 'frozen-product' };
const archive = { passed: true, signatureVerified: true, build: 106, version: '1.0',
  bundleId: 'wine.matchrim.app', sourceCommit: prep.commit };
validatePair106(prep, archive);
for (const patch of [{ build: 100 }, { sourceDirty: true }, { sourceDirty: undefined }, { typecheck: 'FAIL' }, { publicConfiguration: { fixtures: true, project: 'cbjynrbvrhcmpaojmqdp' } }])
  assert.throws(() => validatePair106({ ...prep, ...patch }, archive));
for (const patch of [{ signatureVerified: false }, { sourceCommit: 'other' }, { bundleId: 'wine.matchrim.qa99review' }, { build: 105 }])
  assert.throws(() => validatePair106(prep, { ...archive, ...patch }));
const options = { method: 'app-store-connect', teamID: '8X3XTD6XYX', signingStyle: 'automatic', destination: 'upload',
  manageAppVersionAndBuildNumber: false, uploadSymbols: true };
validateOptions106(options, 'upload');
for (const patch of [{ manageAppVersionAndBuildNumber: true }, { teamID: 'other' }, { destination: 'export' }, { newPermission: true }])
  assert.throws(() => validateOptions106({ ...options, ...patch }, 'upload'));
const ok = { code: 0, signal: null }, log = 'Upload succeeded\nUploaded package is processing\nEXPORT SUCCEEDED';
assert(acknowledged106(ok, log));
assert(!acknowledged106({ code: 1, signal: null }, log)); assert(!acknowledged106(ok, 'EXPORT SUCCEEDED'));
assert(!acknowledged106({ code: 0, signal: 'SIGINT' }, log));
console.log('PASS release pair, fixed build/team/options and Apple acknowledgement safeguards; no signing/export/upload/network');
