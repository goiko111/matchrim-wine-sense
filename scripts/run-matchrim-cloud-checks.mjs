import { spawnSync } from 'node:child_process';
// The cloud gate uses the snapshot rather than absent Mac-only Git objects.
// Existing historical gates remain unchanged and require their documented refs.
const checks = [
  'check-matchrim-identity75.ts', 'check-matchrim-edge-routing.ts',
  'check-matchrim-scan-evidence.ts', 'check-matchrim-dense-gate.ts',
  'check-matchrim-original-sheet.ts',
  'check-matchrim-profile-boundaries83.ts',
  'check-matchrim-provider-stop83.ts',
  'check-matchrim-menu-food-evidence.ts', 'check-matchrim-scan-profile.ts',
  'check-matchrim-onboarding-owner.ts', 'check-integral-regressions.ts',
  'check-matchrim-wine-mutation.ts', 'check-matchrim-history-owner.ts',
  'check-matchrim-continuation89.ts', 'check-matchrim-vision-handler89.ts', 'check-matchrim-provider89.ts',
  'check-matchrim-structured-response.ts', 'check-matchrim-food-robustness.ts', 'check-matchrim-food-menu-tiles89.ts',
  'check-matchrim-original-library89.ts', 'check-matchrim-public-catalog-handler89.ts', 'check-matchrim-intelligence89.ts',
  'check-matchrim-label-save.ts', 'check-matchrim-food-client.ts', 'check-matchrim-screen-overlay.ts', 'check-matchrim-menu-integration-oct13.ts',
];
const results = checks.map(file => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', `scripts/${file}`], { encoding: 'utf8' });
  if (result.status !== 0) process.stderr.write(result.stderr || result.stdout || String(result.error));
  return { file, status: result.status, passed: result.status === 0 };
});
console.log(JSON.stringify({ scope: 'Reproducible internal contracts, not historical evidence reruns', results }, null, 2));
if (results.some(row => !row.passed)) process.exitCode = 1;
