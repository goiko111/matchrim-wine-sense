import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { build } from 'vite';
import react from '@vitejs/plugin-react-swc';

const repo = process.cwd();
const root = path.resolve(process.argv[2] || 'qa-artifacts/native102-20261021/final-r1');
const candidateBuild = Number(process.argv[3] || '101');
assert(Number.isSafeInteger(candidateBuild) && candidateBuild > 100, 'Uploaded100 is frozen; use a new candidate number');
const owner = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d';
const sha = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const guard = () => {
  const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
  for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]) {
    const lease = leases[resource];
    assert(lease?.owner === owner && lease.leaseId === process.env[key] && lease.reviewAfter * 1000 > Date.now(), resource);
  }
  const disk = fs.statfsSync(path.dirname(root));
  assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
guard();
assert(!fs.existsSync(root), 'Fresh output required');
const commit = git('rev-parse', 'HEAD');
const files = git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'src', 'public', 'ios', 'index.html', 'package.json', 'package-lock.json', 'tailwind.config.ts', 'postcss.config.js', 'tsconfig.app.json').split('\n').filter(Boolean);
const fingerprints = () => Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(file))]));
const sourceFingerprints = fingerprints();
fs.mkdirSync(root, { mode: 0o700 });
const receipt = { startedUTC: new Date().toISOString(), commit, sourceFingerprints,
  sourceDirty: Boolean(git('status', '--porcelain=v1')), build: candidateBuild, version: '1.0', root,
  noWebPublish: true, noBackendDeployment: true, noTestFlightUpload: true,
  masterConnectionActive: false, hostedMasterReferenceActive: true, hostedMasterAutomaticLookups: false,
  publicGlobalCatalogueActive: true, paidModelStarts: 0, lovableAgentTurns: 0 };
try {
  const log = fs.openSync(path.join(root, 'typecheck.log'), 'wx', 0o600);
  const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.app.json', '--noEmit'], {
    stdio: ['ignore', log, log], timeout: 120000,
  });
  fs.closeSync(log);
  assert.equal(result.status, 0, result.error?.message || 'TYPECHECK_FAILED');
  receipt.typecheck = 'PASS';
  guard();
  const previous = path.join(repo, 'qa-artifacts/native99-20261021/preview-r4/web/assets');
  const keys = new Set();
  for (const name of fs.readdirSync(previous).filter(name => name.endsWith('.js'))) {
    for (const [value] of fs.readFileSync(path.join(previous, name), 'utf8').matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
      try {
        const claims = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString());
        if (claims.role === 'anon' && claims.ref === 'cbjynrbvrhcmpaojmqdp') keys.add(value);
      } catch { /* Ignore unrelated tokens; only an existing public anon key is accepted. */ }
    }
  }
  assert.equal(keys.size, 1, 'EXACT_PUBLIC_ANON_CONFIGURATION_REQUIRED');
  const publicEnv = { VITE_SUPABASE_URL: 'https://cbjynrbvrhcmpaojmqdp.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: [...keys][0], VITE_MATCHRIM_EDGE_RELEASE: '75',
    VITE_SUPABASE_DB_SCHEMA: 'public', VITE_MATCHRIM_QA_FIXTURES: 'false', VITE_APP_ANALYTICS_ENABLED: 'false',
    VITE_MATCHRIM_NATIVE_GUIDE_ENABLED: 'true', VITE_MATCHRIM_ONBOARDING_PREVIEW: 'false',
    VITE_MATCHRIM_SHARE_ORIGIN: 'https://matchrim-wine-sense.lovable.app', VITE_MATCHRIM_MASTER_CATALOG_URL: '' };
  const web = path.join(root, 'web');
  await build({ root: repo, configFile: false, envDir: false, envPrefix: 'NO_IMPLICIT_MATCHRIM102_ENV_', mode: 'production',
    plugins: [react()], resolve: { alias: { '@': path.join(repo, 'src') } },
    define: Object.fromEntries(Object.entries(publicEnv).map(([key, value]) => ['import.meta.env.' + key, JSON.stringify(value)])),
    build: { outDir: web, emptyOutDir: false, sourcemap: false } });
  guard();
  const production = path.join(root, 'production');
  fs.mkdirSync(production);
  fs.cpSync(path.join(repo, 'ios'), path.join(production, 'ios'), { recursive: true,
    filter: file => !['build', 'public', 'DerivedData', 'xcuserdata'].includes(path.basename(file)) });
  fs.symlinkSync(path.join(repo, 'node_modules'), path.join(production, 'node_modules'), 'dir');
  const app = path.join(production, 'ios/App/App');
  fs.cpSync(web, path.join(app, 'public'), { recursive: true });
  const projectFile = path.join(production, 'ios/App/App.xcodeproj/project.pbxproj');
  const projectSource = fs.readFileSync(projectFile, 'utf8');
  assert(/CURRENT_PROJECT_VERSION = \d+;/.test(projectSource));
  fs.writeFileSync(projectFile, projectSource.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${candidateBuild};`));
  const configFile = path.join(app, 'capacitor.config.json');
  const config = JSON.parse(fs.readFileSync(configFile));
  assert.equal(config.appId, 'wine.matchrim.app');
  if (config.server) delete config.server.url;
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
  assert.deepEqual(fingerprints(), sourceFingerprints, 'SOURCE_CHANGED_DURING_BUILD');
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  Object.assign(receipt, { web, production, passed: true,
    webResources: Object.fromEntries(walk(web).map(file => [path.relative(web, file), sha(fs.readFileSync(file))])),
    publicConfiguration: { project: 'cbjynrbvrhcmpaojmqdp', schema: 'public', edgeRelease: '75', fixtures: false, analytics: false, envDir: false, masterConfigured: false } });
} catch (error) {
  receipt.passed = false; receipt.error = error.stack || String(error);
} finally {
  receipt.finishedUTC = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'preparation.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ root, commit, passed: receipt.passed, typecheck: receipt.typecheck, masterConnectionActive: false }));
process.exitCode = receipt.passed ? 0 : 1;
