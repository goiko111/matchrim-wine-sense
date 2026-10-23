import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
const once = (source, after, before) => {
  assert.equal(source.split(after).length, 2, 'One exact native186 source inverse');
  return source.replace(after, before);
};
export function restoreNativeLearning186(file, source) {
  if (file !== 'supabase/functions/_shared/matchrim-profile95.ts') return source;
  const before = 'd1d3ec837920db9ccdd72993e5020bb2dba1ca07c7ca61f4ad8271092c3acfe0';
  if (hash(source) === before) return source;
  assert.equal(hash(source), '9339dc69de5fb72a38a7c1af46fa5dad4ff96f0eefce87724d608283a55f27e6');
  source = once(source, 'const readTraining = (value: unknown, native = false): Training95 | null => {',
    'const readTraining = (value: unknown): Training95 | null => {');
  source = once(source, "  if (native && evidence.canonical_id.startsWith('winerim-public-store:')) return null;\n", '');
  source = once(source, '    const row = readTraining(value, strengthAware);', '    const row = readTraining(value);');
  assert.equal(hash(source), before, 'Every pre186 server byte restored for old source oracles');
  return source;
}
export function restoreFeedbackScope186(source) {
  const before = 'f573d3589b891e1511136494bba182f1590dfb6313e9680f03cb6d3e34c805d9';
  if ([before, '3bc133a4db6b944b49124423edca11fb4893cfb499f35f0a5eeb7c7752a4757a'].includes(hash(source))) return source;
  source = once(source, "import { restoreNativeLearning186 } from './native-learning186-scope.mjs';\n", '');
  source = once(source, '  source = restoreNativeLearning186(file, source);\n', '');
  assert.equal(hash(source), before, 'Every previous feedback scope assertion remains exact');
  return source;
}
