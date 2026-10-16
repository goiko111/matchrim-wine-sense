import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const [output, webOutput, runner] = process.argv.slice(2);
if (![output, webOutput, runner].every(value => value?.startsWith('/private/tmp/Matchrim91-'))) throw new Error('Three new isolated /private/tmp/Matchrim91-* paths required');
if ([output, webOutput, runner].some(file => fs.existsSync(file))) throw new Error('Preserve prior isolated builds');
const repo = process.cwd();
const evidence = '/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts';
const project = path.join(evidence, 'matchrim84-bodega-realqa-20261014/physical/native-project/qa/native-candidate75/Matchrim73QA.xcodeproj');
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const result = spawnSync('npm', ['run', 'build', '--', '--outDir', webOutput], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, VITE_SUPABASE_URL: 'https://matchrim91-offline.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'offline-qa91-not-a-real-key',
    VITE_APP_ANALYTICS_ENABLED: 'false', VITE_MATCHRIM_QA_FIXTURES: 'false', VITE_MATCHRIM_NATIVE_GUIDE_ENABLED: 'true',
    VITE_MATCHRIM_ONBOARDING_PREVIEW: 'false', VITE_MATCHRIM_EDGE_RELEASE: '75' },
});
if (result.status !== 0) { process.stderr.write(result.stderr + result.stdout); throw new Error('Offline web build failed'); }
fs.mkdirSync(output, { recursive: false });
fs.cpSync(path.join(repo, 'ios'), path.join(output, 'ios'), { recursive: true,
  filter: source => !['build', 'public', 'DerivedData'].includes(path.basename(source)),
});
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(output, 'node_modules'), 'dir');
const pbx = path.join(output, 'ios/App/App.xcodeproj/project.pbxproj');
fs.writeFileSync(pbx, fs.readFileSync(pbx, 'utf8').replaceAll('wine.matchrim.app', 'wine.matchrim.qa91').replace(/CURRENT_PROJECT_VERSION = \d+;/g, 'CURRENT_PROJECT_VERSION = 91;'));
const info = path.join(output, 'ios/App/App/Info.plist');
fs.writeFileSync(info, fs.readFileSync(info, 'utf8').replace('<string>Matchrim</string>', '<string>Matchrim Restaurant QA91 Offline</string>'));
fs.cpSync(webOutput, path.join(output, 'ios/App/App/public'), { recursive: true });
const config = path.join(output, 'ios/App/App/capacitor.config.json');
if (fs.existsSync(config)) {
  const parsed = JSON.parse(fs.readFileSync(config, 'utf8'));
  parsed.appId = 'wine.matchrim.qa91'; delete parsed.server?.url;
  fs.writeFileSync(config, JSON.stringify(parsed, null, 2));
}
fs.mkdirSync(runner);
fs.cpSync(project, path.join(runner, 'Matchrim73QA.xcodeproj'), { recursive: true });
const runnerPbx = path.join(runner, 'Matchrim73QA.xcodeproj/project.pbxproj');
fs.writeFileSync(runnerPbx, fs.readFileSync(runnerPbx, 'utf8')
  .replaceAll('wine.matchrim.build61.blackbox.uitests', 'wine.matchrim.qa91.uitests')
  .replaceAll('SDKROOT = iphoneos;', 'SDKROOT = iphonesimulator;\n\t\t\t\tSUPPORTED_PLATFORMS = iphonesimulator;\n\t\t\t\tCODE_SIGNING_ALLOWED = NO;')
  .replaceAll('DEVELOPMENT_TEAM = 8X3XTD6XYX;', 'DEVELOPMENT_TEAM = "";')
  .replace('path = Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS18.0.sdk/System/Library/Frameworks/Foundation.framework; sourceTree = DEVELOPER_DIR;', 'path = System/Library/Frameworks/Foundation.framework; sourceTree = SDKROOT;'));
fs.copyFileSync(path.join(repo, 'scripts/native-matchrim-restaurant91-tests.swift'), path.join(runner, 'MatchrimCandidateUITests.swift'));
const receipt = { output, webOutput, runner, bundle: 'wine.matchrim.qa91', build: 91, offline: true, production: false,
  sourceCommit: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
  appDelegateSha256: sha(path.join(repo, 'ios/App/App/AppDelegate.swift')),
  restaurantSha256: sha(path.join(repo, 'src/pages/Restaurant.tsx')),
  nativeTestSha256: sha(path.join(repo, 'scripts/native-matchrim-restaurant91-tests.swift')),
  inputHashes: Object.fromEntries([
    'src/App.tsx', 'src/index.css', 'src/pages/Restaurant.tsx', 'src/pages/Scan.tsx', 'src/pages/LiquidIntelligence.tsx',
    'src/components/MobileBottomNav.tsx', 'src/utils/restaurantSession91.ts', 'src/utils/restaurantDocuments91.ts',
    'src/utils/restaurantRanking91.ts', 'supabase/functions/_shared/matchrim-restaurant91.ts',
    'ios/App/App/AppDelegate.swift', 'ios/App/App.xcodeproj/project.pbxproj', 'package-lock.json',
  ].map(file => [file, sha(path.join(repo, file))])),
};
fs.writeFileSync(path.join(output, 'preparation.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt));
