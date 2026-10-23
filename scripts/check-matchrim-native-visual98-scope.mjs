import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { nativeVisual98Baseline, restoreNativeVisual98, restoreNativeVisual98Guard } from './native-visual98-scope.mjs';
import { restoreNativeCellar97 } from './native-cellar97-scope.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const sheetFile = 'src/utils/winerimOriginalSheet.ts';
const pageFile = 'src/pages/MyWines.tsx';
const guardFile = 'scripts/check-matchrim-recognition96.ts';
const read = file => readFileSync(resolve(root, file), 'utf8');
const gitBytes = (revision, file) => execFileSync('git', ['show', `${revision}:${file}`], { cwd: root });
const digest = source => createHash('sha256').update(source).digest('hex');
const sources = new Map([sheetFile, pageFile].map(file => [file, read(file)]));
const priorSources = new Map([sheetFile, pageFile].map(file => [file, gitBytes(nativeVisual98Baseline, file)]));

for (const file of sources.keys()) {
  test(`Exact git589dda9 bytes and idempotence: ${file}`, () => {
    const restored = restoreNativeVisual98(file, sources.get(file));
    assert.deepEqual(Buffer.from(restored), priorSources.get(file));
    assert.equal(restoreNativeVisual98(file, restored), restored);
  });
  test(`Whole-file rejection outside reviewed hunks, current and already-restored: ${file}`, () => {
    for (const source of [sources.get(file), priorSources.get(file).toString('utf8')]) {
      for (const changed of [source + '\n// undeclared98 edit\n', '\n' + source, source.replaceAll('\n', '\r\n')]) {
        assert.notEqual(changed, source);
        assert.throws(() => restoreNativeVisual98(file, changed), { code: 'ERR_ASSERTION' });
      }
    }
  });
}

test('Only the two named source paths are projected', () => {
  const text = sources.get(sheetFile);
  for (const file of ['src/utils/wineAffinityExplanation.ts', 'src/pages/Auth.tsx', guardFile, 'other/MyWines.tsx']) {
    assert.equal(restoreNativeVisual98(file, text), text);
  }
});

test('Native98 and both historical97 grid inputs retain the exact old cellar inverse', () => {
  const baseline = gitBytes('8327ee7', pageFile);
  for (const source of [sources.get(pageFile), priorSources.get(pageFile).toString('utf8'),
    gitBytes('0031c703fe6d20ead4e8aab8d85c09b0fb8ae5b2', pageFile).toString('utf8')]) {
    assert.deepEqual(Buffer.from(restoreNativeCellar97(pageFile, source)), baseline);
    assert.throws(() => restoreNativeCellar97(pageFile, source + '\n// undeclared97 edit\n'));
  }
});

test('The unchanged recognition96 identity oracle holds after the98 inverse', () => {
  const added = '  !hasLabelProducerRoleConflict(input, wine)\n  && !hasLabelProducerRoleConflict(wine, input)\n  && (';
  const restored98 = restoreNativeVisual98(sheetFile, sources.get(sheetFile));
  assert.equal(restored98.split(added).length, 2);
  const restored96 = restored98
    .replace('canonicalProducerKey, hasLabelProducerRoleConflict, isSafeCanonicalLabelMatch', 'canonicalProducerKey, isSafeCanonicalLabelMatch')
    .replace(added, '  (');
  assert.deepEqual(Buffer.from(restored96), gitBytes('ebee038059778f1f10bdb5dd647bccb8324fb580', sheetFile));
});

test('The minimal recognition98 wiring has an exact inverse through the unchanged frozen96 guard proof', () => {
  const source = read(guardFile);
  let restored = restoreNativeVisual98Guard(guardFile, source);
  assert.deepEqual(Buffer.from(restored), gitBytes(nativeVisual98Baseline, guardFile));
  assert.equal(restoreNativeVisual98Guard(guardFile, restored), restored);
  const scope = JSON.parse(read('scripts/matchrim-manual-lookup96-scope.json'));
  const row = scope.files.find(row => row.file === guardFile && row.kind === 'guard');
  assert.equal(digest(restored), row.afterHash);
  for (const hunk of row.hunks.slice().reverse()) {
    assert.equal(restored.split(hunk.after).length, 2);
    restored = restored.replace(hunk.after, hunk.before);
  }
  assert.equal(digest(restored), row.beforeHash);
  assert.deepEqual(Buffer.from(restored), gitBytes(scope.baseline, guardFile));
  assert.equal(restoreNativeVisual98Guard(guardFile, restored), restored);
  assert.throws(() => restoreNativeVisual98Guard(guardFile, restored.replace('assert.equal(', 'assert.notEqual(')));
  for (const [from, to] of [
    ['assert.equal(', 'assert.notEqual('],
    ['restoreNativeVisual98(path, readFileSync', 'restoreNativeVisual98(path, changedReadFileSync'],
    ['const baseline =', 'const alteredBaseline ='],
  ]) {
    assert(source.includes(from));
    assert.throws(() => restoreNativeVisual98Guard(guardFile, source.replace(from, to)));
  }
  assert.throws(() => restoreNativeVisual98Guard(guardFile, source + '\n// undeclared guard edit\n'));
});

test('Original frozen scope data and hashes were not replaced', () => {
  for (const file of ['scripts/matchrim-manual-lookup96-scope.json', 'scripts/native-label97-scope.json']) {
    assert.deepEqual(readFileSync(resolve(root, file)), gitBytes(nativeVisual98Baseline, file));
  }
});

test('Every original cellar97 inverse hunk, hash and assertion remains byte exact', () => {
  const file = 'scripts/native-cellar97-scope.mjs';
  let source = read(file);
  for (const added of ["import { restoreNativeVisual98 } from './native-visual98-scope.mjs';\n",
    '    source = restoreNativeVisual98(file, source);\n']) {
    assert.equal(source.split(added).length, 2);
    source = source.replace(added, '');
  }
  assert.deepEqual(Buffer.from(source), gitBytes(nativeVisual98Baseline, file));
});

const mutations = [
  [sheetFile, 'input producer role', '!hasLabelProducerRoleConflict(input, wine)', 'true'],
  [sheetFile, 'source producer role', '!hasLabelProducerRoleConflict(wine, input)', 'true'],
  [sheetFile, 'producer identity', '&& hasExactWinerimProducer(input.producer, wine.producer)', '&& true'],
  [sheetFile, 'geographic identity', '&& !hasWinerimGeographyConflict({', '&& hasWinerimGeographyConflict({'],
  [sheetFile, 'detail identity', '|| !matchesLibraryIdentity(input, detail)', '|| false'],
  [sheetFile, 'detail slug', 'detail.slug !== selected.slug', 'false'],
  [sheetFile, 'verification before photo', 'if (!isVerifiedWinerimSheetForIdentity(input, sheet) || !sheet) return null;', 'if (!sheet) return null;'],
  [sheetFile, 'sensory scale', 'Number(attrs[key]) <= 5', 'Number(attrs[key]) <= 10'],
  [sheetFile, 'sensory projection beside photo', 'tastingAttributes: validateWinerimOriginalSensory(sheet.sensoryAttributes)', 'tastingAttributes: sheet.sensoryAttributes'],
  [sheetFile, 'optional photo contract', 'photo?: string;', 'photo: string;'],
  [sheetFile, 'catalog photo sanitization', 'safeWineImageUrl98(sheet.photo)', 'sheet.photo'],
  [sheetFile, 'detail photo sanitization', 'safeWineImageUrl98(detailPayload?.photo)', 'detailPayload?.photo'],
  [sheetFile, 'photo parser', 'const detail = parseLibraryWine(detailPayload);', 'const detail = detailPayload;'],
  [pageFile, 'web copy', 'Mis Vinos', 'Changed web title'],
  [pageFile, 'load handler', 'const loadWines = async () => {', 'const loadWines = async () => { throw Error();'],
  [pageFile, 'affinity formula', 'const affinity = cellarAffinityView(enriched, snapshot, isNative).current;', 'const affinity = 99;'],
  [pageFile, 'training eligibility in photo update', 'Boolean(wine.rating && wine.use_for_profile_training)', 'true'],
  [pageFile, 'photo native-only gate', 'isNative && !wine.image_url && safeWineImageUrl98(catalog?.photo)', 'true && !wine.image_url && safeWineImageUrl98(catalog?.photo)'],
  [pageFile, 'existing photo protection', '!wine.image_url && safeWineImageUrl98(catalog?.photo)', 'safeWineImageUrl98(catalog?.photo)'],
  [pageFile, 'photo write owner', ".eq('id', wine.id).eq('user_id', action.ownerId);", ".eq('id', wine.id);"],
  [pageFile, 'stale mutation guard', 'if (!action.isCurrent()) return;', 'if (false) return;'],
  [pageFile, 'write confirmation', '!confirmsWineMutation(data, wine.id, { matchrim_affinity: affinity,', 'false && !confirmsWineMutation(data, wine.id, { matchrim_affinity: affinity,'],
  [pageFile, 'confirmed image value', '{ image_url: update.image_url }', "{ image_url: 'forged' }"],
  [pageFile, 'draft native gate', 'const draft = isNative ? readNativeWineDraft98(location.state, user?.id) : null;', 'const draft = readNativeWineDraft98(location.state, user?.id);'],
  [pageFile, 'draft owner', 'readNativeWineDraft98(location.state, user?.id)', 'readNativeWineDraft98(location.state, undefined)'],
  [pageFile, 'draft reset', '    resetForm();\n    const draft =', '    const draft ='],
  [pageFile, 'draft identity', "name: draft.name, producer: draft.producer || ''", "name: draft.name, producer: 'forged'"],
  [pageFile, 'toolbar native ownership', '{isNative && <NativeCellarToolbar98', '{true && <NativeCellarToolbar98'],
  [pageFile, 'section callback', "navigateToWineSection(section); setFilterType('all');", "navigateToWineSection(section); setFilterType('high_affinity');"],
  [pageFile, 'item native ownership', 'native={isNative} wine={wine}', 'native={true} wine={wine}'],
  [pageFile, 'item image budget', 'resolveImage={index < 4}', 'resolveImage={true}'],
  [pageFile, 'item identity', '<NativeCellarItem98 key={wine.id}', '<NativeCellarItem98 key={index}'],
  [pageFile, 'item callback ownership', 'onSelectWine={handleSearchWineSelect}', 'onSelectWine={() => undefined}'],
];

for (const [file, label, from, to] of mutations) {
  test(`Reject semantic mutation: ${label}`, () => {
    const source = sources.get(file);
    assert(source.includes(from), `Applicable negative control: ${label}`);
    const changed = source.replace(from, to);
    assert.notEqual(changed, source);
    assert.throws(() => restoreNativeVisual98(file, changed), { code: 'ERR_ASSERTION' });
    if (file === pageFile) assert.throws(() => restoreNativeCellar97(file, changed), { code: 'ERR_ASSERTION' });
    const prior = priorSources.get(file).toString('utf8');
    if (prior.includes(from)) assert.throws(() => restoreNativeVisual98(file, prior.replace(from, to)), { code: 'ERR_ASSERTION' });
  });
}

for (const [file, marker] of [
  [sheetFile, "import { safeWineImageUrl98 } from './wineImage98';\n"],
  [sheetFile, '  photo?: string;\n'],
  [sheetFile, '  const photo = safeWineImageUrl98(sheet.photo);\n'],
  [sheetFile, '    ...(photo ? { photo } : {}),\n'],
  [sheetFile, '    const detail = parseLibraryWine(detailPayload);\n'],
  [sheetFile, '    const photo = safeWineImageUrl98(detailPayload?.photo);\n'],
  [pageFile, "import { NativeCellarItem98 } from '@/components/NativeCellarItem98';\n"],
  [pageFile, '    const draft = isNative ? readNativeWineDraft98(location.state, user?.id) : null;\n'],
  [pageFile, '                      </NativeCellarItem98>\n'],
  [pageFile, "                    style={isNative ? { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))' } : undefined}>\n"],
]) {
  test(`Reject missing or duplicate reviewed marker: ${marker.trim()}`, () => {
    const source = sources.get(file);
    assert.equal(source.split(marker).length, 2);
    for (const changed of [source.replace(marker, ''), source.replace(marker, marker + marker)]) {
      assert.throws(() => restoreNativeVisual98(file, changed), { code: 'ERR_ASSERTION' });
      if (file === pageFile) assert.throws(() => restoreNativeCellar97(file, changed), { code: 'ERR_ASSERTION' });
    }
  });
}
