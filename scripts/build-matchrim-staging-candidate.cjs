const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const keyFile = process.argv[2];
if (!keyFile) throw new Error('Usage: node scripts/build-matchrim-staging-candidate.cjs <staging-api-keys.json>');
const keys = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
const key = keys.find((entry) => entry.name === 'anon')?.api_key;
const claims = key ? JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()) : {};
if (!key || claims.role !== 'anon' || claims.ref !== 'qpbmqvfnunkylvtvnyyx') {
  throw new Error('An anonymous staging client key is required; secret/service keys are refused');
}
const env = {
  ...process.env,
  VITE_SUPABASE_URL: 'https://qpbmqvfnunkylvtvnyyx.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: key,
  VITE_SUPABASE_DB_SCHEMA: 'matchrim_qa',
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
  // Capacitor changes these generated files even when their semantics are unchanged.
  for (const [file, bytes] of configs) fs.writeFileSync(file, bytes);
}
const index = path.resolve('ios/App/App/public/index.html');
if (!fs.existsSync(index)) throw new Error('Native assets were not copied');
console.log('Staging candidate assets ready; fixture mode and anonymous telemetry disabled.');
