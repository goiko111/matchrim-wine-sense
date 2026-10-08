const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const clientEnvFile = process.argv[2];
if (!clientEnvFile) throw new Error('Usage: node scripts/build-matchrim-production-candidate.cjs <production-client.env>');
process.loadEnvFile(clientEnvFile);
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const claims = key ? JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()) : {};
if (!key || claims.role !== 'anon' || claims.ref !== 'cbjynrbvrhcmpaojmqdp'
  || process.env.VITE_SUPABASE_URL !== 'https://cbjynrbvrhcmpaojmqdp.supabase.co') {
  throw new Error('An anonymous production client key is required; secret/service keys are refused');
}
const env = {
  ...process.env,
  VITE_SUPABASE_URL: 'https://cbjynrbvrhcmpaojmqdp.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: key,
  VITE_SUPABASE_DB_SCHEMA: 'public',
  VITE_MATCHRIM_EDGE_RELEASE: '75',
  VITE_MATCHRIM_NATIVE_GUIDE_ENABLED: 'true',
  VITE_MATCHRIM_ONBOARDING_PREVIEW: 'false',
  VITE_MATCHRIM_SHARE_ORIGIN: 'https://matchrim-wine-sense.lovable.app',
  VITE_APP_ANALYTICS_ENABLED: 'false',
  VITE_MATCHRIM_QA_FIXTURES: 'false',
};
const run = (command, args) => {
  const result = spawnSync(command, args, { env, encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) throw result.error;
  if (result.status !== 0 || /copy ios - failed|\[error\]/.test(result.stdout || '')) {
    throw new Error(`${command} failed`);
  }
};
run('npm', ['run', 'build']);
const configPaths = ['ios/App/App/capacitor.config.json', 'ios/App/App/config.xml'];
const configs = configPaths.map((file) => [file, fs.readFileSync(file)]);
try {
  run('npx', ['cap', 'copy', 'ios']);
} finally {
  for (const [file, bytes] of configs) fs.writeFileSync(file, bytes);
}
if (!fs.existsSync('ios/App/App/public/index.html')) throw new Error('Native assets were not copied');
console.log('Production candidate 75 assets ready; versioned catalog75/affinity73/vision72, public schema, no fixtures.');
