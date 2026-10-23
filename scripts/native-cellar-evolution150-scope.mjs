import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { restoreNativeSensory184 } from './native-sensory184-scope.mjs';

const hash = source => createHash('sha256').update(source).digest('hex');
const currentHash = 'da1238b2f6ec9a558239cf2fbd4dc7280de296d636a8d7bc388a520c3f58c73b';
const previousHash = '30cacda70065dd9836aea3063a656882710614ea6cbf3ae388ccc7273f776f8d';

// Remove only the reviewed native110/103/147 amendments before old98 oracles.
// Current style/affinity behavior is exercised directly, not through this inverse.
export const restoreCellarEvolution150 = (file, source) => {
  source = restoreNativeSensory184(file, source);
  if (file !== 'src/pages/MyWines.tsx' || hash(source) !== currentHash) return source;
  const hunks = [
    ["import { cellarDisplayAffinity110, isHighCellarAffinity110 } from '@/utils/cellarReferenceStyle110';\nimport { readCellarPublicReference107 } from '@/utils/cellarPublicReference107';\n", ''],
    ["        filtered = filtered.filter(w => isNative ? isHighCellarAffinity110(w, cellarProfile) : w.matchrim_affinity !== null && w.matchrim_affinity >= 70);\n        filtered.sort((a, b) => ((isNative ? cellarDisplayAffinity110(b, cellarProfile) : b.matchrim_affinity) ?? 0)\n          - ((isNative ? cellarDisplayAffinity110(a, cellarProfile) : a.matchrim_affinity) ?? 0));",
      "        filtered = filtered.filter(w => (isNative ? cellarAffinityView(w, cellarProfile).current : w.matchrim_affinity) !== null\n          && (isNative ? cellarAffinityView(w, cellarProfile).current! : w.matchrim_affinity!) >= 70);\n        filtered.sort((a, b) => ((isNative ? cellarAffinityView(b, cellarProfile).current : b.matchrim_affinity) ?? 0)\n          - ((isNative ? cellarAffinityView(a, cellarProfile).current : a.matchrim_affinity) ?? 0));"],
    ["Alta Afinidad ({wines.filter(w => isNative ? isHighCellarAffinity110(w, cellarProfile) : (w.matchrim_affinity ?? -1) >= 70).length})",
      "Alta Afinidad ({wines.filter(w => ((isNative ? cellarAffinityView(w, cellarProfile).current : w.matchrim_affinity) ?? -1) >= 70).length})"],
    ["<div className={isNative ? 'mx-auto mt-[12px] h-[144px] w-[88px] overflow-hidden bg-white' : 'w-full h-48 overflow-hidden rounded-t-lg bg-muted'}>",
      '<div className="w-full h-48 overflow-hidden rounded-t-lg bg-muted">'],
    ['{(!isNative || !readCellarPublicReference107(wine)) && <WinerimSheetLookup identity={{ name: wine.name, producer: wine.producer, vintage: wine.vintage, region: wine.region, country: wine.country }} />}',
      '<WinerimSheetLookup identity={{ name: wine.name, producer: wine.producer, vintage: wine.vintage, region: wine.region, country: wine.country }} />'],
    ['<summary aria-label="Tu perfil de gustos" className="min-h-11 cursor-pointer py-3 text-sm font-medium text-stone-700"><span aria-hidden="true">Tu perfil de gustos</span></summary>',
      '<summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-stone-700">Tu perfil de gustos</summary>'],
  ];
  for (const [current, previous] of hunks) {
    assert.equal(source.split(current).length, 2, 'One exact cellar evolution inverse hunk');
    source = source.replace(current, previous);
  }
  assert.equal(hash(source), previousHash, 'Every ec13656 MyWines byte restored for unchanged98 oracles');
  return source;
};

export const restoreCellarEvolutionGuard150 = (file, source) => {
  if (file !== 'scripts/native-visual98-scope.mjs'
    || hash(source) !== 'c29df3d1b56c4caf2d767bfdec21c58562f3845e487ba0e1ce86980adcf6cb30') return source;
  for (const added of ["import { restoreCellarEvolution150 } from './native-cellar-evolution150-scope.mjs';\n",
    '  source = restoreCellarEvolution150(file, source);\n']) {
    assert.equal(source.split(added).length, 2, 'One exact source-reader150 addition');
    source = source.replace(added, '');
  }
  assert.equal(hash(source), '4e237eaec111f53c0737e72c920ba4f6c134bc55fd379cff59dd344b6c8b91e1',
    'Every pre150 visual98 source oracle stays exact before the existing99 guard inverse');
  return source;
};
