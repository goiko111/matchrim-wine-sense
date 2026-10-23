import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { sha112, verifySources112 } from './benchmark-matchrim-native112';

const root = 'qa-artifacts/continuation176-20261023';
const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
const original = read(root + '/visual-revalidated-r3/RESULT.json');
const red = read(root + '/visual-revalidated-r4/RESULT.json');
const green = read(root + '/visual-revalidated-r5/RESULT.json');
assert(original.passed && !red.passed && red.error.includes('PRIMARY_WINE_WORD_SPLIT:Taubenschuss'));
assert(green.passed && green.screenshots.length === 18 && green.errors.length === 0);
assert.equal(green.realGET, 0); assert.equal(green.models, 0);
verifySources112(process.cwd(), green.sources);
const sourceChanges = Object.keys(green.sources).filter(file => green.sources[file] !== original.sources[file]);
assert.deepEqual(sourceChanges, ['src/components/wine-import/GlobalWineRecovery104.tsx']);
const comparisons = green.screenshots.map((name: string) => ({ name,
  beforeSHA256: sha112(fs.readFileSync(root + '/visual-revalidated-r3/' + name)),
  afterSHA256: sha112(fs.readFileSync(root + '/visual-revalidated-r5/' + name)) }));
const normal = comparisons.filter((row: { name: string }) => !row.name.includes('-large'));
assert.equal(normal.length, 12); assert(normal.every(row => row.beforeSHA256 === row.afterSHA256));
const preparationPath = 'qa-artifacts/night105-20261021/candidate106-r1/preparation.json';
const nativePath = 'qa-artifacts/night105-20261021/uikit106-r1/RESULT.json';
const prep = read(preparationPath), native = read(nativePath);
assert(prep.passed && prep.typecheck === 'PASS' && prep.build === 106 && prep.sourceDirty === false);
assert(native.passed && native.buildOnly && native.installed && native.build === 106 && native.contentSizeRestored);
assert.equal(native.sourceCommit, prep.commit); assert.equal(native.uploaded, false);
for (const [file, hash] of Object.entries(prep.sourceFingerprints)) assert.equal(sha112(fs.readFileSync(file)), hash);
for (const [file, hash] of Object.entries(prep.webResources)) assert.equal(sha112(fs.readFileSync(path.join(native.app, 'public', file))), hash);
const output = 'qa-artifacts/continuation182-20261023'; assert(!fs.existsSync(output));
fs.mkdirSync(output, { mode: 0o700 });
fs.writeFileSync(output + '/CHECKPOINT.json', JSON.stringify({ generatedUTC: new Date().toISOString(),
  productCommit: prep.commit, localVersion: '1.0 (106)', sourceChanges,
  visual: { passed: true, screenshotCount: 18, originalMechanicalPass: root + '/visual-revalidated-r3/RESULT.json',
    retainedReadabilityFailure: root + '/visual-revalidated-r4/RESULT.json', final: root + '/visual-revalidated-r5/RESULT.json',
    originalLowDiskHoldRetained: root + '/visual-revalidated-r2/RESULT.json', normalByteIdentical: 12, comparisons,
    manuallyReviewedChangedMax: ['img-094-375-large.png', 'img-099-375-large.png', 'img-190-375-large.png', 'img-193-375-large.png'],
    errors: green.errors, scope: green.scope },
  preparationPath, nativePath, sourceAndInstalledResourcesVerified: true,
  focusedChecks: ['Exact one-class native-only thumbnail delta', 'Actual TSX recovery18 groups', 'App TypeScript', 'Focused lint', 'Native-only production bundle', 'iOS Simulator compile/install'],
  nativeScope: native.scope, cataloguePending: { broad: 17, schemaOrMixed: 2, total: 19, unchanged: true },
  sources: green.sources, newCatalogueGET: 0, models: 0, uploads: 0, lovableTurns: 0, productionWrites: 0,
  webPublished: false, testFlightUploaded: false, recognitionMetricsRecomputed: false,
  heartbeat: 'Paused after closing this targeted visual scope; app/release not declared complete',
  release: 'NO-GO:19 catalogue cases and separate full native/physical/intelligence gates remain',
}, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ output, visualPassed: true, captures: 18, normalByteIdentical: 12,
  localVersion: '1.0 (106)', compileInstallPassed: true, catalogueStillOpen: 19, testFlightUploaded: false }));
