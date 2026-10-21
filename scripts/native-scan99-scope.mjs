import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const nativeScan99Baseline = 'd7d81e18e5219b1aedcca641f71ae4d46980faf8';
const digest = source => createHash('sha256').update(source).digest('hex');
const once = (source, current, previous) => {
  assert.equal(source.split(current).length, 2, 'One exact reviewed Scan99 inverse literal: ' + current);
  return source.replace(current, previous);
};
const scanImport = 'import { NativeScanHub99 } from "@/components/NativeScanHub99";\n';
const scanBranch = `  if (isNative && !activeMode) {
    return (
      <div className="matchrim-app-shell min-h-screen bg-[#fafafa] pb-[calc(var(--matchrim-bottom-nav-height,88px)+16px)] text-stone-950">
        <main className="mx-auto w-full max-w-xl pb-[24px] pl-[calc(16px+var(--matchrim-safe-left))] pr-[calc(16px+var(--matchrim-safe-right))] pt-[calc(16px+var(--matchrim-safe-top))]">
          <NativeScanHub99
            ownerId={user?.id ?? null}
            options={scanOptions}
            onSelectMode={(mode) => {
              trackAppEvent("scan_option_selected", { userId: user?.id, metadata: { option: mode } });
              navigate(\`/escanear/\${scanModePaths[mode]}\`);
            }}
            onOpenRestaurant={() => navigate("/restaurante")}
            onOpenRecent={(route) => navigate(route)}
          />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

`;

export function restoreNativeScan99(file, source) {
  if (file !== 'src/pages/Scan.tsx') return source;
  const beforeHash = 'c4e06832831ce77cd773d1cb21d02f28bf984503bdc0becb848c4ab765111bed';
  if (digest(source) === beforeHash) return source;
  const importAnchor = 'import MobileBottomNav from "@/components/MobileBottomNav";\n';
  const routeGuard = '  if (modeParam && !activeMode) {\n    return <Navigate to="/escanear" replace />;\n  }\n\n';
  source = once(source, importAnchor + scanImport, importAnchor);
  source = once(source, routeGuard + scanBranch, routeGuard);
  assert.equal(digest(source), beforeHash,
    `Every ${nativeScan99Baseline} Scan byte restored: consent, owner, save, route, events and complete web/selected JSX`);
  return source;
}

const oldSvgScope = 'Actual Scan/Hub/Nav and React/Lucide in isolated VM; controlled owner/router/history and inert selected scanners. DOM/name/class/source proof, not physical44, UIKit, VoiceOver or audit cause. Syntax transpilation only.';
const legacySvgScope = 'Legacy Scan96 after the exact Scan99 inverse, unchanged Hub/Nav and React/Lucide in isolated VM; controlled owner/router/history and inert selected scanners. Current NativeScanHub99 is tested separately by check-matchrim-native-scan99. DOM/name/class/source proof, not current Scan99 UI, physical44, UIKit, VoiceOver or audit cause. Syntax transpilation only.';
const oldHeadingLimits = 'Actual React/Hub/Scan/Lucide render with existing controlled hooks/router, not WK AX/name/level exposure, physical44, UIKit, VoiceOver or cause proof.';
const legacyHeadingLimits = 'Legacy Scan96 after the exact Scan99 inverse with unchanged React/Hub/Lucide and existing controlled hooks/router. Current NativeScanHub99 is tested separately by check-matchrim-native-scan99; this is not current Scan99 UI, WK AX/name/level exposure, physical44, UIKit, VoiceOver or cause proof.';
const guards = new Map([
  ['scripts/check-matchrim-scan-hub-svg96.mjs', {
    beforeHash: '4cfe088be40f56ba55b2639df17a03913beb61094478275a0ba9769153a3359b',
    historicalHashes: [
      '34d6467d2649ab6231fb2f2251c0b9bf4ee6c59217d30a4990a7e43457805e24', // df2d5b1, before heading96
      '011785b7ac48e6c3d8517b25b132b689b230ff899c8e121afc5234801979b59d', // sealed SVG96 guard
    ],
    hunks: [
      ["import { restoreNativeScanHeading96, restoreNativeHeadingTree96 } from './check-matchrim-scan-heading96.mjs';\nimport { restoreNativeScan99 } from './native-scan99-scope.mjs';\n",
        "import { restoreNativeScanHeading96, restoreNativeHeadingTree96 } from './check-matchrim-scan-heading96.mjs';\n"],
      ['export function restoreNativeHubSvg96(file, source) {\n  source = restoreNativeScan99(file, source);\n  source = restoreNativeScanHeading96(file, source);',
        'export function restoreNativeHubSvg96(file, source) {\n  source = restoreNativeScanHeading96(file, source);'],
      ['const candidate = Object.fromEntries([scanFile, hubFile].map((f) => [f, restoreNativeScan99(f, read(path.join(root, f)))]));',
        'const candidate = Object.fromEntries([scanFile, hubFile].map((f) => [f, read(path.join(root, f))]));'],
      [legacySvgScope, oldSvgScope],
    ],
  }],
  ['scripts/check-matchrim-scan-heading96.mjs', {
    beforeHash: 'ddc2f90a4bd71c7fb4ad2847ab82a43b6d9a047279b3a13651470e8bfff4c21a',
    historicalHashes: ['e79c3baf6500ae5c3d58c81ba1acefe0e6fe48f020c267acc009da16a925a4d1'], // 8af2104
    hunks: [
      ["import { restoreMenuResultsGuard96, restoreMenuResultsPackage96 } from './matchrim-menu-results-first96-scope.mjs';\nimport { restoreNativeScan99 } from './native-scan99-scope.mjs';\n",
        "import { restoreMenuResultsGuard96, restoreMenuResultsPackage96 } from './matchrim-menu-results-first96-scope.mjs';\n"],
      ['  const actual = Object.fromEntries([hubFile, scanFile].map(file => [file, restoreNativeScan99(file, read(file))]));',
        '  const actual = Object.fromEntries([hubFile, scanFile].map(file => [file, read(file)]));'],
      [legacyHeadingLimits, oldHeadingLimits],
    ],
  }],
  ['scripts/native-visual98-scope.mjs', {
    // Exact reviewed Home98 reader bridge from the previous task turn, before this Scan99 bridge.
    beforeHash: '3a660b55d14b4154c094a7a6dddd7c938d35438777cbb3a4119f417bebd6ff7b',
    historicalHashes: ['8138a14aa88aa24bfb6d9c5d207f014dc7d31b0c7e440dfa1e04745666a78923'], // d7d81e1
    hunks: [
      ["import { restoreNativeHome98Guard } from './native-home98-scope.mjs';\nimport { restoreNativeScan99Guard } from './native-scan99-scope.mjs';\n",
        "import { restoreNativeHome98Guard } from './native-home98-scope.mjs';\n"],
      ['export function restoreNativeVisual98Guard(file, source) {\n  source = restoreNativeScan99Guard(file, source);\n  source = restoreNativeHome98Guard(file, source);',
        'export function restoreNativeVisual98Guard(file, source) {\n  source = restoreNativeHome98Guard(file, source);'],
    ],
  }],
]);

export function restoreNativeScan99Guard(file, source) {
  const row = guards.get(file);
  if (!row) return source;
  if ([row.beforeHash, ...(row.historicalHashes ?? [])].includes(digest(source))) return source;
  for (const [current, previous] of row.hunks) source = once(source, current, previous);
  assert.equal(digest(source), row.beforeHash,
    `Whole reviewed pre-Scan99 guard restored with every old baseline/case/count/pin/negative: ${file}`);
  return source;
}
