import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = source => createHash('sha256').update(source).digest('hex');
const once = (source, current, previous) => {
  assert.equal(source.split(current).length, 2, 'One exact native97 auth amendment');
  return source.replace(current, previous);
};

export function restoreNativeAuth97(file, source) {
  if (file !== 'src/pages/Auth.tsx') return source;
  const baseline = 'fd0d99adc829afdf619de56a0084813821d80d7be1e7f480eec0c136042c47de';
  if (hash(source) === baseline) return source;
  const changes = [
    ["'mb-7 mt-8 text-left'", "'matchrim-native-auth-brand mb-7 mt-8 text-left'"],
    ["'min-w-0 p-0 pb-[16px] [overflow-wrap:anywhere]'", "'matchrim-native-auth-intro min-w-0 p-0 pb-[16px] [overflow-wrap:anywhere]'"],
    ["'grid h-auto w-full min-w-0 grid-cols-2 gap-[4px] p-[4px] [.matchrim-accessibility-text_&]:grid-cols-1 [.matchrim-accessibility-text_&]:md:grid-cols-2'", "'grid h-auto w-full min-w-0 grid-cols-2 gap-[4px] p-[4px]'"],
  ];
  for (const [current, previous] of changes) source = once(source, current, previous);
  assert.equal(hash(source), baseline, 'Whole prior auth module preserved beneath three native presentation changes');
  return source;
}

export function restoreNativeAuth97Guard(file, source) {
  if (file !== 'scripts/check-matchrim-cloud-snapshot.ts' || !source.includes("from './native-auth97-scope.mjs'")) return source;
  source = once(source, "import { restoreNativeAuth97 } from './native-auth97-scope.mjs';\n", '');
  source = once(source, '  source = restoreNativeAuth97(path, source);\n', '');
  source = once(source, "['scripts/check-matchrim-consumer95-auth.ts', 24]", "['scripts/check-matchrim-consumer95-auth.ts', 22]");
  source = once(source,
    "? Buffer.from(restoreNativePolicy97(row.path, readFileSync(row.path, 'utf8'))) : row.path === 'src/pages/Auth.tsx'\n      ? Buffer.from(restoreNativeAuth97(row.path, readFileSync(row.path, 'utf8'))) : readFileSync(row.path);",
    "? Buffer.from(restoreNativePolicy97(row.path, readFileSync(row.path, 'utf8'))) : readFileSync(row.path);");
  assert.equal(hash(source), '7157215be192ffa6aa7521baddbd712736f80d4f04506148eab5997865b81c1d',
    'Whole previous cloud oracle preserved, with two additive auth checks and a bounded native inverse');
  return source;
}
