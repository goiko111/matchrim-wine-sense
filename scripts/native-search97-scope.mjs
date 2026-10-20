import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const restoreNativeSearch97 = (file, source) => {
  if (file !== 'src/components/wine-import/WineSearchBar.tsx') return source;
  const deltas = [
    ["import { NativeWineSearch97 } from './NativeWineSearch97';\n", ''],
    ['const LegacyWineSearchBar97 = ({ onSelectWine }: WineSearchBarProps) => {',
      'export const WineSearchBar = ({ onSelectWine }: WineSearchBarProps) => {'],
    [`
export const WineSearchBar = (props: WineSearchBarProps) => Capacitor.isNativePlatform()
  ? <NativeWineSearch97 onSelectWine={props.onSelectWine} />
  : <LegacyWineSearchBar97 {...props} />;
`, ''],
  ];
  for (const [current, prior] of deltas) {
    assert.equal(source.split(current).length, 2, 'Exactly one reviewed native-only search wrapper delta');
    source = source.replace(current, prior);
  }
  assert.equal(createHash('sha256').update(source).digest('hex'),
    '8b298f947d8b90f14d06b673230666c25978463feabccdcb79b09517a264c14e',
    'Complete legacy web search body is unchanged');
  return source;
};
