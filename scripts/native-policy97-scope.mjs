import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const digest = value => createHash('sha256').update(value).digest('hex');
export function restoreNativePolicy97(file, source) {
  if (file !== 'src/pages/PrivacyPolicy.tsx') return source;
  if (digest(source) === 'ac35ed55d35ef1af82a2f1dbd74bd168392e96bec5a95c2445db7adc4bc1fc6b') return source;
  const nativeMain = "className={isNative ? 'mx-auto max-w-4xl pl-[calc(1rem+var(--matchrim-safe-left))] pr-[calc(1rem+var(--matchrim-safe-right))] pb-[calc(8rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]' : 'mx-auto max-w-4xl px-4 py-10'}";
  if (source.includes(nativeMain)) {
    assert.equal(source.split(nativeMain).length, 2, 'One exact native legal safe-area amendment');
    source = source.replace(nativeMain, 'className="mx-auto max-w-4xl px-4 py-10"');
  }
  assert.equal(digest(source), '937e2f6f1ac14a780130ebef2f05b332bcd4ac62ac419aa0d2f5aba70df0ed87', 'Exact native provider policy97 input');
  const edits = [
    ["import { Capacitor } from '@capacitor/core';\n", ''],
    ["import { nativePrivacySections97 } from '@/utils/nativePrivacy97';\n", ''],
    ["const PrivacyPolicy = () => {\n  const isNative = Capacitor.isNativePlatform();\n  const displayedSections = isNative ? nativePrivacySections97(sections) : sections;\n  return (", 'const PrivacyPolicy = () => ('],
    ["{isNative ? 'Ultima actualizacion: 20 de octubre de 2026' : 'Ultima actualizacion: 26 de agosto de 2026'}", 'Ultima actualizacion: 26 de agosto de 2026'],
    ['{displayedSections.map((section) => (', '{sections.map((section) => ('],
    ['  );\n};\n\nexport default PrivacyPolicy;', ');\n\nexport default PrivacyPolicy;'],
  ];
  for (const [current, prior] of edits) {
    assert.equal(source.split(current).length, 2, 'One exact native policy97 amendment');
    source = source.replace(current, prior);
  }
  assert.equal(digest(source), 'ac35ed55d35ef1af82a2f1dbd74bd168392e96bec5a95c2445db7adc4bc1fc6b', 'Whole pre97 policy preserved, no legal text exemption');
  return source;
}
