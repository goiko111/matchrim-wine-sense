import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const output = process.argv[2] && resolve(process.argv[2]);
if (!output || existsSync(output)) throw new Error('An explicit new output file is required. No deployment is performed.');
const root = process.cwd();
const allowed = new Set([
  'supabase/functions/restaurant-workspace91/index.ts',
  'supabase/functions/restaurant-import91/index.ts',
  'supabase/functions/_shared/matchrim-ai-provider.ts',
  'supabase/functions/_shared/matchrim-openai.ts',
  'supabase/functions/_shared/matchrim-restaurant91.ts',
  'supabase/functions/_shared/matchrim-restaurant-import91.ts',
  'supabase/functions/_shared/matchrim-restaurant-url-transport91.ts',
]);
const definitions = ['restaurant-workspace91', 'restaurant-import91'].map(name => ({
  name, entrypoint: `supabase/functions/${name}/index.ts`, verify_jwt: true,
}));
const files = new Map();
const externalImports = new Set();
function collect(path) {
  if (!allowed.has(path)) throw new Error(`Dependency outside the reviewed deployment scope: ${path}`);
  if (files.has(path)) return;
  const content = readFileSync(resolve(root, path), 'utf8');
  files.set(path, { path, content, sha256: createHash('sha256').update(content).digest('hex') });
  for (const imported of ts.preProcessFile(content, true, true).importedFiles) {
    if (imported.fileName.startsWith('.')) {
      collect(relative(root, resolve(root, dirname(path), imported.fileName)));
    } else externalImports.add(imported.fileName);
  }
}
for (const definition of definitions) collect(definition.entrypoint);
if (files.size !== allowed.size) throw new Error('Unexpected deployment source closure.');
const git = (...args) => {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Cannot record Git provenance.');
  return result.stdout.trim();
};
const manifest = {
  schema: 'matchrim-restaurant91-deployment-v1',
  projectId: '7e9b6f66-d4ee-404a-8678-c9afab22de75',
  backendRef: 'cbjynrbvrhcmpaojmqdp',
  sourceCommit: git('rev-parse', 'HEAD'),
  sourceDirty: Boolean(git('status', '--porcelain')),
  deploymentPerformed: false,
  functions: definitions,
  additiveConfigPatch: definitions.map(item => `[functions.${item.name}]\nverify_jwt = true`).join('\n\n'),
  preserveExistingConfig: true,
  preservePublishedWeb: true,
  externalAi: { required: 'openai', supported: ['openai'],
    dedicatedKey: 'openai_matchrim', standardKeyAlias: 'OPENAI_API_KEY',
    modelSettings: ['MATCHRIM_OPENAI_FAST_MODEL', 'MATCHRIM_OPENAI_QUALITY_MODEL', 'MATCHRIM_OPENAI_VISION_MODEL'],
    lovableAiAllowed: false, retries: 0 },
  externalImports: [...externalImports].sort(),
  files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)),
};
mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ output, files: files.size, functions: definitions.map(item => item.name),
  sourceCommit: manifest.sourceCommit, sourceDirty: manifest.sourceDirty, deploymentPerformed: false,
  sha256: createHash('sha256').update(readFileSync(output)).digest('hex') }));
