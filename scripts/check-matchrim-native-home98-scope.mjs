import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { nativeHome98Baseline, nativeHome98GuardBaseline, restoreNativeHome98, restoreNativeHome98Guard as restoreHomeGuard } from './native-home98-scope.mjs';
import { restoreNativeVisual98Guard } from './native-visual98-scope.mjs';
import { restoreNativeScan99Guard } from './native-scan99-scope.mjs';

const restoreNativeHome98Guard = (file, source) => restoreHomeGuard(file, restoreNativeScan99Guard(file, source));

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const prior = (file, revision = nativeHome98GuardBaseline) => execFileSync('git', ['show', `${revision}:${file}`], { cwd: root, encoding: 'utf8' });
const home = 'src/components/NativeAppHome.tsx';
const guard = 'scripts/check-matchrim-native-home-accessibility96.ts';
const menuScope = 'scripts/matchrim-menu-results-first96-scope.mjs';
const visualScope = 'scripts/native-visual98-scope.mjs';
let passed = 0, negatives = 0;
const check = (name, run) => { run(); passed++; console.log('PASS ' + name); };

check('NativeHome98 inverse restores the complete literal pre98 Home source and is idempotent', () => {
  const original = prior(home, nativeHome98Baseline);
  assert.equal(restoreNativeHome98(home, read(home)), original);
  assert.equal(restoreNativeHome98(home, original), original);
  for (const file of ['src/components/NativeHome98.tsx', 'src/pages/Index.tsx', 'other/NativeAppHome.tsx']) {
    assert.equal(restoreNativeHome98(file, 'unrelated source'), 'unrelated source');
  }
});

check('Owner/selection/history/profile/formula/web edits are rejected on current and historical Home inputs', () => {
  const changes = [
    ['selection?.ownerId === ownerId', 'true'],
    ['recommendations.includes(selection.wine)', 'true'],
    ['[ownerId, activeProfile, recommendations]', '[ownerId]'],
    ['getScanHistory(ownerId).slice(0, 3)', 'getScanHistory(null).slice(0, 3)'],
    ["navigate('/escanear/etiqueta')", "navigate('/wrong99')"],
    ['buildNativeRecommendation95(wine, activeProfile)', 'buildNativeRecommendation95(wine, null)'],
    ['Tu vino, con contexto', 'Changed web copy99'],
  ];
  for (const source of [read(home), prior(home, nativeHome98Baseline)]) {
    for (const [from, to] of changes) {
      const candidate = source.replace(from, to); assert.notEqual(candidate, source, from);
      assert.throws(() => restoreNativeHome98(home, candidate)); negatives++;
    }
    for (const candidate of [source + '\n// extra99\n', source.replaceAll('\n', '\r\n')]) {
      assert.throws(() => restoreNativeHome98(home, candidate)); negatives++;
    }
  }
});

check('Native early-return owner/key/selection/detail and native-only gates cannot be altered or duplicated', () => {
  const source = read(home);
  for (const [from, to] of [
    ['if (isNative) return <NativeHome98', 'if (true) return <NativeHome98'],
    ["key={ownerId ?? 'anonymous'}", 'key="shared99"'],
    ['setSelection({ wine, ownerId })', 'setSelection({ wine, ownerId: null })'],
    ['profile={activeProfile}', 'profile={null}'],
    ['open={Boolean(selectedWine)}', 'open={true}'],
    ['<WineCard wine={selectedWine}', '<WineCard wine={recommendations[0]}'],
  ]) {
    const candidate = source.replace(from, to); assert.notEqual(candidate, source, from);
    assert.throws(() => restoreNativeHome98(home, candidate)); negatives++;
  }
  const importLine = "import { NativeHome98 } from '@/components/NativeHome98';\n";
  for (const candidate of [source.replace(importLine, ''), source.replace(importLine, importLine + importLine)]) {
    assert.throws(() => restoreNativeHome98(home, candidate)); negatives++;
  }
});

check('Three reader/report amendments restore every whole d7d81e1 script and preserve old guard layers', () => {
  for (const file of [guard, menuScope, visualScope]) {
    const original = prior(file);
    assert.equal(restoreNativeHome98Guard(file, read(file)), original);
    assert.equal(restoreNativeHome98Guard(file, original), original);
    // The already-reviewed97 reader calls this exact visual98 guard before its original hashes.
    assert.equal(restoreNativeVisual98Guard(file, read(file)), original);
  }
  const historical = prior(menuScope, '8327ee7e31fe73ab8edd90303de514147d13978d');
  assert.equal(restoreNativeHome98Guard(menuScope, historical), historical);
  for (const file of ['scripts/matchrim-manual-lookup96-scope.json', 'scripts/native-label97-scope.json',
    'scripts/check-matchrim-consumer95-native-layout.ts', 'scripts/native-label97-scope.mjs',
    'scripts/check-matchrim-consumer95-native-recommendation.ts']) assert.equal(read(file), prior(file), file);
});

check('Old baseline/assertion/count/CSS/negative-control pins and projected legacy reporting cannot drift', () => {
  const mutations = [
    [guard, 'assert.deepEqual(statements(next.body), statements(old.body));', 'assert.ok(true);'],
    [guard, "const baseline = 'ebee038059778f1f10bdb5dd647bccb8324fb580';", "const baseline = 'HEAD';"],
    [guard, 'assert.equal(uploadRules.length, 12);', 'assert.equal(uploadRules.length, 11);'],
    [guard, 'assert.throws(() => assert.deepEqual(project(render(mutated.body)), expected));', 'assert.ok(true);'],
    [guard, 'Legacy Home96 JSX/CSS contracts after the literal NativeHome98 inverse', 'Actual current Home JSX'],
    [menuScope, 'All15 original layout groups', 'Only14 layout groups'],
    [menuScope, '  value = restoreNativeHome98(file, value);', '  value = value;'],
    [visualScope, '  source = restoreNativeHome98Guard(file, source);', '  source = source;'],
  ];
  for (const [file, from, to] of mutations) {
    const source = read(file), candidate = source.replace(from, to); assert.notEqual(candidate, source, from);
    assert.throws(() => restoreNativeHome98Guard(file, candidate)); negatives++;
  }
  for (const file of [guard, menuScope, visualScope]) for (const source of [read(file), prior(file)]) {
    assert.throws(() => restoreNativeHome98Guard(file, source + '\n// unchecked guard99\n')); negatives++;
  }
});

console.log(JSON.stringify({ nativeHome98Scope: true, passed, failed: 0, baseline: nativeHome98Baseline,
  guardBaseline: nativeHome98GuardBaseline, wholeSourceInverses: 1, wholeGuardInverses: 3, negativeControls: negatives,
  oldAssertionsRemoved: 0, oldCountsChanged: 0, legacyHome96ProjectionOnly: true,
  currentNativeUiEvidence: false, networkCalls: 0, browser: false, device: false }));
