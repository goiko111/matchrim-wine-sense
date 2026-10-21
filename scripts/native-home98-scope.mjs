import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const nativeHome98Baseline = '589dda9863280d70683b9fb21feb599fd06ce2c8';
export const nativeHome98GuardBaseline = 'd7d81e18e5219b1aedcca641f71ae4d46980faf8';
const digest = source => createHash('sha256').update(source).digest('hex');
const once = (source, current, previous) => {
  assert.equal(source.split(current).length, 2, 'One exact reviewed NativeHome98 inverse literal: ' + current);
  return source.replace(current, previous);
};
const homeImport = "import { NativeHome98 } from '@/components/NativeHome98';\n";
const homeBranch = `  if (isNative) return <NativeHome98 key={ownerId ?? 'anonymous'} ownerId={ownerId} hasProfile={hasCode}
    loading={loadingCode || loadingRecommendations} unavailable={recommendationsUnavailable}
    exhausted={recommendationsExhausted} recommendations={recommendations} profile={activeProfile}
    recent={recentScans} onSelect={wine => setSelection({ wine, ownerId })}
    detail={<DialogPrimitive.Root open={Boolean(selectedWine)} onOpenChange={open => { if (!open) setSelection(null); }}>
      <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <DialogPrimitive.Content aria-describedby="home-wine98-description" className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-lg bg-white text-stone-950">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-2">
            <DialogPrimitive.Title className="text-base font-semibold">El vino y t\u00fa</DialogPrimitive.Title>
            <DialogPrimitive.Close className="flex h-11 w-11 items-center justify-center" aria-label="Cerrar explicaci\u00f3n del vino"><X className="h-5 w-5" aria-hidden="true" /></DialogPrimitive.Close>
          </div>
          <div className="min-h-0 overflow-y-auto px-4 pb-[calc(1rem+var(--matchrim-safe-bottom))]">
            <DialogPrimitive.Description id="home-wine98-description" className="sr-only">La botella, su ficha y c\u00f3mo encaja con tus gustos.</DialogPrimitive.Description>
            {selectedWine && <WineCard wine={selectedWine} index={0} profile={activeProfile} />}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>} />;

`;

// Restores a historical contract, not the NativeHome98 presentation leaf.
export function restoreNativeHome98(file, source) {
  if (file !== 'src/components/NativeAppHome.tsx') return source;
  const beforeHash = '04d35a6fcfb4536b060fa701e86a168b81ac7320368ef7e3eae3a689a46cfca1';
  if (digest(source) === beforeHash) return source;
  source = once(once(source, homeImport, ''), homeBranch, '');
  assert.equal(digest(source), beforeHash,
    `Every ${nativeHome98Baseline} Home controller/web/owner/selection/history byte restored; no blanket node deletion`);
  return source;
}

const oldHomeScope = 'Actual Home JSX/CSS contracts, exact12-rule nativeAX initial-upload amendment plus one exact initial-only landscape padding rule and native=false parity. No WK AX hitpoint, VoiceOver, browser or simulator acceptance claim.';
const projectedHomeScope = 'Legacy Home96 JSX/CSS contracts after the literal NativeHome98 inverse, exact12-rule nativeAX initial-upload amendment plus one exact initial-only landscape padding rule and native=false parity. This is not current NativeHome98 UI evidence; its actual composition is tested separately by consumer95-native-recommendation. No WK AX hitpoint, VoiceOver, browser or simulator acceptance claim.';
const guardRows = new Map([
  ['scripts/check-matchrim-native-home-accessibility96.ts', {
    baselineHash: '962bdbb1a8f7d3ca3d7afbd7b39464abdb880e00243b989261f39df7bfd2f9ce',
    hunks: [
      ["import { restoreNativeHome98 } from './native-home98-scope.mjs';\n", ''],
      ["const current = restoreNativeHome98(file, readFileSync(file, 'utf8'));", "const current = readFileSync(file, 'utf8');"],
      [projectedHomeScope, oldHomeScope],
    ],
  }],
  ['scripts/matchrim-menu-results-first96-scope.mjs', {
    baselineHash: 'd43f4217ccaca43666f8287545c4181cc86fac64fe28c68b2353135baf3f2cad',
    historicalHashes: ['cae81a59e1de3731a8d83aac83dade0007da3b46ea011dfc273ea56580ea1a22'],
    hunks: [
      ["import { restoreNativeHome98 } from './native-home98-scope.mjs';\n", ''],
      ['  value = restoreNativeHome98(file, value);\n', ''],
    ],
  }],
  ['scripts/native-visual98-scope.mjs', {
    baselineHash: '8138a14aa88aa24bfb6d9c5d207f014dc7d31b0c7e440dfa1e04745666a78923',
    hunks: [
      ["import { restoreNativeHome98Guard } from './native-home98-scope.mjs';\n", ''],
      ['  source = restoreNativeHome98Guard(file, source);\n', ''],
    ],
  }],
]);

export function restoreNativeHome98Guard(file, source) {
  const row = guardRows.get(file);
  if (!row) return source;
  if ([row.baselineHash, ...(row.historicalHashes ?? [])].includes(digest(source))) return source;
  for (const [current, previous] of row.hunks) source = once(source, current, previous);
  assert.equal(digest(source), row.baselineHash,
    `Every ${nativeHome98GuardBaseline} guard assertion, count, pin and negative restored: ${file}`);
  return source;
}
