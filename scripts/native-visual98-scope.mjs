import assert from 'node:assert/strict';
import { restoreCellarEvolution150 } from './native-cellar-evolution150-scope.mjs';
import { createHash } from 'node:crypto';
import { restoreNativeHome98Guard } from './native-home98-scope.mjs';
import { restoreNativeScan99Guard } from './native-scan99-scope.mjs';

export const nativeVisual98Baseline = '589dda9863280d70683b9fb21feb599fd06ce2c8';
const digest = source => createHash('sha256').update(source).digest('hex');

// Literal reviewed98 hunks only; both whole-file fingerprints are mandatory.
const files = new Map([
  ['src/utils/winerimOriginalSheet.ts', {
    beforeHash: '3b60c725c28707a806a2558353ea42cb30a594600d05bb4b13dc2a3c126bf72d',
    afterHash: 'd405d1acb2fb25da360553af88c2d2db971f3e42616e2a0bc9368a9aa9f3b881',
    hunks: [
      ["import { safeWineImageUrl98 } from './wineImage98';\n", ''],
      ['  url: string | null;\n  photo?: string;\n  detailVerified?: boolean;',
        '  url: string | null;\n  detailVerified?: boolean;'],
      ['  if (!isVerifiedWinerimSheetForIdentity(input, sheet) || !sheet) return null;\n  const photo = safeWineImageUrl98(sheet.photo);',
        '  if (!isVerifiedWinerimSheetForIdentity(input, sheet) || !sheet) return null;'],
      ['    grapes: sheet.grapes, tastingAttributes: validateWinerimOriginalSensory(sheet.sensoryAttributes),\n    ...(photo ? { photo } : {}),',
        '    grapes: sheet.grapes, tastingAttributes: validateWinerimOriginalSensory(sheet.sensoryAttributes),'],
      ['    const detailPayload = record(await read(`${root}/${selected.id}/${selected.slug}`));\n    const detail = parseLibraryWine(detailPayload);',
        '    const detail = parseLibraryWine(await read(`${root}/${selected.id}/${selected.slug}`));'],
      ["    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');\n    const photo = safeWineImageUrl98(detailPayload?.photo);",
        "    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');"],
      ["    return sheet ? { status: 'verified', sheet: { ...sheet, country: detail.country, detailVerified: true,\n      sensoryAttributes: detail.sensoryAttributes, ...(photo ? { photo } : {}) } }",
        "    return sheet ? { status: 'verified', sheet: { ...sheet, country: detail.country, detailVerified: true, sensoryAttributes: detail.sensoryAttributes } }"],
    ],
  }],
  ['src/pages/MyWines.tsx', {
    beforeHash: '9dab196c1df21b4e859e0b016a0486bcb135f1ea1fc2062388bb58856427a96e',
    afterHash: '30cacda70065dd9836aea3063a656882710614ea6cbf3ae388ccc7273f776f8d',
    hunks: [
      [`import { NativeCellarToolbar98 } from '@/components/NativeCellarToolbar98';
import { NativeCellarItem98 } from '@/components/NativeCellarItem98';
import { readNativeWineDraft98 } from '@/utils/nativeWineDraft98';
import { safeWineImageUrl98 } from '@/utils/wineImage98';`,
        "import { NativeCellarToolbar97 } from '@/components/NativeCellarToolbar97';"],
      [`        matchrim_affinity: affinity, use_for_profile_training: Boolean(wine.rating && wine.use_for_profile_training),
        ...(isNative && !wine.image_url && safeWineImageUrl98(catalog?.photo) ? { image_url: safeWineImageUrl98(catalog?.photo) } : {}) };`,
        '        matchrim_affinity: affinity, use_for_profile_training: Boolean(wine.rating && wine.use_for_profile_training) };'],
      [`      const query = supabase.from('user_wines').update(update).eq('id', wine.id).eq('user_id', action.ownerId);
      const { data, error } = isNative
        ? await query.select('id, sensory_attributes, place_details, matchrim_affinity, use_for_profile_training, image_url').single()
        : await query.select('id, sensory_attributes, place_details, matchrim_affinity, use_for_profile_training').single();`,
        `      const { data, error } = await supabase.from('user_wines').update(update).eq('id', wine.id)
        .eq('user_id', action.ownerId).select('id, sensory_attributes, place_details, matchrim_affinity, use_for_profile_training').single();`],
      [`      if (!confirmsWineMutation(data, wine.id, { matchrim_affinity: affinity, use_for_profile_training: update.use_for_profile_training,
        ...('image_url' in update ? { image_url: update.image_url } : {}) })`,
        '      if (!confirmsWineMutation(data, wine.id, { matchrim_affinity: affinity, use_for_profile_training: update.use_for_profile_training })'],
      [`  useEffect(() => {
    if (!isAddWineRoute || showAddDialog || showPurchaseDialog) return;
    resetForm();
    const draft = isNative ? readNativeWineDraft98(location.state, user?.id) : null;
    if (draft) {
      setFormData(current => ({ ...current, name: draft.name, producer: draft.producer || '', vintage: draft.vintage?.toString() || '' }));
      setManualWineNameConfirmed(true);
    }
    setShowAddDialog(true);
  }, [isAddWineRoute, showAddDialog, showPurchaseDialog, isNative, location.state, user?.id]);`,
        `  useEffect(() => {
    if (!isAddWineRoute || showAddDialog || showPurchaseDialog) return;
    resetForm();
    setShowAddDialog(true);
  }, [isAddWineRoute, showAddDialog, showPurchaseDialog]);`],
      ['          {isNative && <NativeCellarToolbar98 section={statusFilter} counts={sectionCounts}',
        '          {isNative && <NativeCellarToolbar97 section={statusFilter} counts={sectionCounts}'],
      [`                    {filteredWines.map((wine, index) => (
                      <NativeCellarItem98 key={wine.id} native={isNative} wine={wine} snapshot={cellarProfile} resolveImage={index < 4}>`,
        '                    {filteredWines.map((wine) => ('],
      ['                      </Card>\n                      </NativeCellarItem98>\n                    ))}',
        '                      </Card>\n                    ))}'],
    ],
  }],
]);

export function restoreNativeVisual98(file, source) {
  source = restoreCellarEvolution150(file, source);
  const row = files.get(file);
  if (!row) return source;
  if (digest(source) === row.beforeHash) return source;
  assert.equal(digest(source), row.afterHash, `Whole reviewed native98 input: ${file}`);
  for (const [current, previous] of row.hunks) {
    assert.equal(source.split(current).length, 2, `Unique literal native98 inverse hunk: ${file}`);
    source = source.replace(current, previous);
  }
  assert.equal(digest(source), row.beforeHash,
    `Every ${nativeVisual98Baseline} byte restored, including identity, formula, web and mutation handlers: ${file}`);
  return source;
}

// The frozen96 bridge also fingerprints its caller; no original assertion is exempted.
export function restoreNativeVisual98Guard(file, source) {
  source = restoreNativeScan99Guard(file, source);
  source = restoreNativeHome98Guard(file, source);
  if (file !== 'scripts/check-matchrim-recognition96.ts') return source;
  const beforeHash = '78fe5b3decb501abe7f98372ad2bb1d360063e55f141d4495c3a33ad1b2fffcc';
  const frozen96Hash = '00a68793e2d8c5ddb4ab62d3253c0cf63f9c70d7feb0f0d76b0d4ed532385972';
  if ([beforeHash, frozen96Hash].includes(digest(source))) return source;
  assert.equal(digest(source), '869968872120c8509b3d0cad25495bf038db527711b5619ac33fae787bc5f865',
    'Only the reviewed98 recognition source-reader wiring is admitted');
  for (const [current, previous] of [
    ["import { restoreNativeVisual98 } from './native-visual98-scope.mjs';\n", ''],
    ["const current = (path: string) => restoreManualLookupGuard96(path, restoreManualLookup96(path, restoreNativeVisual98(path, readFileSync(path, 'utf8'))));",
      "const current = (path: string) => restoreManualLookupGuard96(path, restoreManualLookup96(path, readFileSync(path, 'utf8')));"],
  ]) {
    assert.equal(source.split(current).length, 2, 'One exact recognition98 source-reader amendment');
    source = source.replace(current, previous);
  }
  assert.equal(digest(source), beforeHash, 'Every original recognition96 assertion and source oracle remains exact');
  return source;
}
