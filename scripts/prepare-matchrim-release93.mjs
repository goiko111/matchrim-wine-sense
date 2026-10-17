import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.argv[2];
const buildNumber = Number(process.argv.find(arg => arg.startsWith('--build='))?.slice(8) ?? 93);
const uiSuite = process.argv.find(arg => arg.startsWith('--ui-tests='))?.slice(11) ?? 'release93';
if (!['release93', 'consumer95'].includes(uiSuite)) throw new Error('Unknown native UI suite');
const uiTestSource = `scripts/native-matchrim-${uiSuite === 'consumer95' ? 'consumer95' : 'release93'}-tests.swift`;
if (!Number.isSafeInteger(buildNumber) || buildNumber < 93 || !root?.startsWith(`/private/tmp/Matchrim${buildNumber}-`) || fs.existsSync(root)) throw new Error('A new isolated /private/tmp/Matchrim<build>-* directory is required');
const repo = process.cwd();
process.loadEnvFile(path.join(repo, '.env'));
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const claims = key ? JSON.parse(Buffer.from(key.split('.')[1], 'base64url')) : {};
if (claims.role !== 'anon' || claims.ref !== 'cbjynrbvrhcmpaojmqdp'
  || process.env.VITE_SUPABASE_URL !== 'https://cbjynrbvrhcmpaojmqdp.supabase.co') throw new Error('Verified production public client configuration required');
const env = { ...process.env, VITE_MATCHRIM_EDGE_RELEASE: '75', VITE_SUPABASE_DB_SCHEMA: 'public',
  VITE_MATCHRIM_QA_FIXTURES: 'false', VITE_APP_ANALYTICS_ENABLED: 'false',
  VITE_MATCHRIM_NATIVE_GUIDE_ENABLED: 'true', VITE_MATCHRIM_ONBOARDING_PREVIEW: 'false',
  VITE_MATCHRIM_SHARE_ORIGIN: 'https://matchrim-wine-sense.lovable.app',
  DEVELOPER_DIR: '/Applications/Xcode-26.0.1.app/Contents/Developer' };
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = () => Object.fromEntries([...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '--',
  'src', 'public', 'ios', 'supabase', 'index.html', 'package.json', 'package-lock.json', 'capacitor.config.ts',
  'vite.config.*', 'tailwind.config.*', 'postcss.config.*', 'tsconfig*.json', '.npmrc', 'components.json')
  .trim().split('\n').filter(Boolean))].sort()
  .map(file => [file, sha(fs.readFileSync(file))]));
const before = inputs();
const sourceCommit = git('rev-parse', 'HEAD').trim();
fs.mkdirSync(root);
const web = path.join(root, 'web');
const build = spawnSync('npm', ['run', 'build', '--', '--outDir', web], { env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
fs.writeFileSync(path.join(root, 'web-build.log'), (build.stdout ?? '') + (build.stderr ?? ''));
if (build.status !== 0) throw new Error('Web build failed; see isolated log');
for (const kind of ['production', 'live']) {
  const target = path.join(root, kind);
  fs.mkdirSync(target);
  fs.cpSync(path.join(repo, 'ios'), path.join(target, 'ios'), { recursive: true,
    filter: file => !['build', 'public', 'DerivedData'].includes(path.basename(file)) });
  fs.symlinkSync(path.join(repo, 'node_modules'), path.join(target, 'node_modules'), 'dir');
  const app = path.join(target, 'ios/App/App');
  fs.cpSync(web, path.join(app, 'public'), { recursive: true });
  const project = path.join(target, 'ios/App/App.xcodeproj/project.pbxproj');
  fs.writeFileSync(project, fs.readFileSync(project, 'utf8').replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`));
  const configFile = path.join(app, 'capacitor.config.json');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  delete config.server?.url;
  if (kind === 'live') {
    const pbx = path.join(target, 'ios/App/App.xcodeproj/project.pbxproj');
    fs.writeFileSync(pbx, fs.readFileSync(pbx, 'utf8').replaceAll('wine.matchrim.app', 'wine.matchrim.qa91live'));
    config.appId = 'wine.matchrim.qa91live';
    execFileSync('/usr/libexec/PlistBuddy', ['-c', `Set :CFBundleDisplayName Matchrim ${buildNumber} Live`, path.join(app, 'Info.plist')]);
  }
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
}
const runner = path.join(root, 'ui');
fs.mkdirSync(runner);
fs.cpSync(path.join(repo, 'scripts/native-matchrim-qa.xcodeproj'), path.join(runner, 'Matchrim73QA.xcodeproj'), { recursive: true });
fs.copyFileSync(path.join(repo, uiTestSource), path.join(runner, 'MatchrimCandidateUITests.swift'));
if (JSON.stringify(inputs()) !== JSON.stringify(before) || git('rev-parse', 'HEAD').trim() !== sourceCommit) throw new Error('Sources changed during preparation; preserve attempt and freeze before retry');
const walk = folder => fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)]);
const receipt = { root, web, production: path.join(root, 'production'), live: path.join(root, 'live'), runner,
  sourceCommit, sourceDirty: Boolean(git('status', '--porcelain=v1').trim()), build: buildNumber, version: '1.0',
  simulatorBundle: 'wine.matchrim.qa91live', productionBundle: 'wine.matchrim.app',
  uiTests: { suite: uiSuite, source: uiTestSource, sha256: sha(fs.readFileSync(path.join(repo, uiTestSource))) },
  preparer: { source: 'scripts/prepare-matchrim-release93.mjs', sha256: sha(fs.readFileSync(path.join(repo, 'scripts/prepare-matchrim-release93.mjs'))) },
  publicClient: { ref: claims.ref, role: claims.role, edgeRelease: '75', fixtures: false, analytics: false },
  inputs: before, webResources: Object.fromEntries(walk(web).map(file => [path.relative(web, file), sha(fs.readFileSync(file))])),
};
fs.writeFileSync(path.join(root, 'preparation.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ root, sourceCommit, sourceDirty: receipt.sourceDirty, build: buildNumber, resources: Object.keys(receipt.webResources).length }));
