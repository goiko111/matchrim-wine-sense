import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const file = 'src/components/ScanPrivacyGate.tsx';
const changes = [
  ["import { NATIVE_SCAN_PRIVACY_KEY97, NATIVE_SCAN_PROVIDER_NOTICE97 } from '@/utils/nativePrivacy97';\n", ''],
  ['const hasAcknowledgedNotice = (isNative = false) => {', 'const hasAcknowledgedNotice = () => {'],
  ["window.localStorage.getItem(isNative ? NATIVE_SCAN_PRIVACY_KEY97 : ACKNOWLEDGEMENT_KEY)", 'window.localStorage.getItem(ACKNOWLEDGEMENT_KEY)'],
  ['useState(() => hasAcknowledgedNotice(isNative))', 'useState(hasAcknowledgedNotice)'],
  ["window.localStorage.setItem(isNative ? NATIVE_SCAN_PRIVACY_KEY97 : ACKNOWLEDGEMENT_KEY, 'accepted')", "window.localStorage.setItem(ACKNOWLEDGEMENT_KEY, 'accepted')"],
  ["{isNative ? NATIVE_SCAN_PROVIDER_NOTICE97 : 'La imagen y sus recortes se envían a funciones de Matchrim y a proveedores de IA para detectar texto y vinos. No subas imágenes con personas o datos sensibles.'}", 'La imagen y sus recortes se envían a funciones de Matchrim y a proveedores de IA para detectar texto y vinos. No subas imágenes con personas o datos sensibles.'],
];

export const restoreNativePrivacy97 = (source) => {
  const baseline = execFileSync('git', ['show', `8327ee7:${file}`], { encoding: 'utf8' });
  if (!source.includes('@/utils/nativePrivacy97')) return source;
  for (const [next, previous] of changes) {
    assert.equal(source.split(next).length, 2, 'One reviewed native privacy edit: ' + next.slice(0, 70));
    source = source.replace(next, previous);
  }
  assert.equal(source, baseline, 'Only provider notice and native acknowledgement version change; web/layout/listeners remain exact.');
  return source;
};
