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

// 138: on iOS the three detailed notes sit under a short summary; the notes themselves are unchanged, so the
// exact inverse puts them back in place and the historical byte-exact proofs keep covering them.
// 139: the checkbox sits beside its sentence at a normal size (it was a 44px square on its own line).
const layout139 = [
  [
    "isNative ? 'mt-[12px] flex min-w-0 min-h-[44px] cursor-pointer items-center gap-[12px] text-sm text-slate-700'",
    "isNative ? 'mt-[16px] grid min-w-0 min-h-[44px] cursor-pointer gap-[8px] text-sm text-slate-700'"
  ],
  [
    "className={isNative ? 'h-[28px] w-[28px] shrink-0 [&_svg]:h-[20px] [&_svg]:w-[20px]' : undefined}",
    "className={isNative ? 'h-[44px] w-[44px] [&_svg]:h-[20px] [&_svg]:w-[20px]' : undefined}"
  ],
  [
    "<span className={isNative ? 'min-w-0 flex-1 [overflow-wrap:normal]' : undefined}>",
    "<span className={isNative ? 'min-w-0 w-full [overflow-wrap:normal]' : undefined}>"
  ]
];
export const restoreScanPrivacy138 = (source) => {
  for (const [next, previous] of layout139) if (source.includes(next)) { assert.equal(source.split(next).length, 2, 'One reviewed 139 privacy layout literal'); source = source.replace(next, previous); }
  const open = '  const detail = (\n', close = '  );\n\n  return (\n    <section';
  const blockStart = '      {/* 138: the short version first', blockEnd = '      </details> : detail}\n';
  if (!source.includes(blockStart)) return source;
  for (const literal of [open, close, blockStart, blockEnd]) assert.equal(source.split(literal).length, 2, 'One reviewed 138 privacy literal: ' + literal.trim().slice(0, 40));
  const from = source.indexOf(open), to = source.indexOf(close);
  const rail = source.slice(from + open.length, to);
  assert.equal(rail.split("matchrim-data-rail mt-[4px] min-w-0").length, 2);
  source = source.slice(0, from) + source.slice(to + '  );\n\n'.length);
  const start = source.indexOf(blockStart), end = source.indexOf(blockEnd) + blockEnd.length;
  return source.slice(0, start) + rail.replace('matchrim-data-rail mt-[4px] min-w-0', 'matchrim-data-rail mt-[16px] min-w-0') + '\n' + source.slice(end);
};

export const restoreNativePrivacy97 = (source) => {
  const baseline = execFileSync('git', ['show', `8327ee7:${file}`], { encoding: 'utf8' });
  if (!source.includes('@/utils/nativePrivacy97')) return source;
  source = restoreScanPrivacy138(source);
  for (const [next, previous] of changes) {
    assert.equal(source.split(next).length, 2, 'One reviewed native privacy edit: ' + next.slice(0, 70));
    source = source.replace(next, previous);
  }
  assert.equal(source, baseline, 'Only provider notice and native acknowledgement version change; web/layout/listeners remain exact.');
  return source;
};
