// 135: Spanish confirmation dialogs on iOS, native section names, aiRIM chat kept per session,
// lighter gallery decoding, local purchase date. Offline, no network. Run: npx tsx scripts/check-matchrim-batch135.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createConfirm135 } from '../src/utils/nativeConfirm135';

let groups = 0;
const test = async (name: string, fn: () => Promise<void> | void) => { await fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');

await test('The native dialog answers with its own Spanish labels; a missing method falls back to window.confirm', async () => {
  const asked: unknown[] = [];
  const confirm = createConfirm135({ confirm: async options => { asked.push(options); return { value: true }; } }, () => { throw new Error('no fallback'); });
  assert.equal(await confirm('¿Eliminar?', { ok: 'Eliminar', destructive: true }), true);
  assert.deepEqual(asked, [{ message: '¿Eliminar?', ok: 'Eliminar', cancel: 'Cancelar', destructive: true }]);
  assert.equal(await createConfirm135({ confirm: async () => ({ value: false }) }, () => true)('x'), false);
  assert.equal(await createConfirm135({ confirm: async () => null }, () => true)('x'), false, 'malformed reply is a no');
  let fallback = 0;
  assert.equal(await createConfirm135({ confirm: async () => { throw new Error('UNIMPLEMENTED'); } }, () => { fallback += 1; return true; })('x'), true);
  assert.equal(await createConfirm135(null, () => { fallback += 1; return false; })('x'), false);
  assert.equal(fallback, 2);
  const swift = read('ios/App/App/MatchrimOCRPlugin106.swift');
  assert.match(swift, /CAPPluginMethod\(name: "confirm", returnType: CAPPluginReturnPromise\)/);
  assert.match(swift, /UIAlertAction\(title: cancel, style: \.cancel\)/);
  assert.doesNotMatch(swift.slice(swift.indexOf('@objc func confirm')), /URLSession|URLRequest|http/i);
});
await test('No app screen reachable on iOS still calls window.confirm directly', () => {
  for (const file of ['src/pages/MyWines.tsx', 'src/pages/Restaurant.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx']) {
    const source = read(file);
    assert.doesNotMatch(source, /window\.confirm\(|[^.\w]confirm\("/, file);
    assert.match(source, /confirm135\(/, file);
  }
});
await test('Shared screens name the iOS sections as the tabs do', () => {
  assert.match(read('src/components/wine-import/WineMenuScanner.tsx'), /guardado en \$\{isNative \? 'Probados' : 'Ya Probados'\}/);
  assert.match(read('src/components/wine-import/FoodPairingScanner.tsx'), /isNative \? "Guardar en Por probar" : "Guardar en Quiero Probar"/);
  assert.match(read('src/components/wine-import/MultiWineLabelScanner.tsx'), /isNative \? 'Guardado en Por probar' : 'Guardado en Quiero Probar'/);
  assert.match(read('src/pages/MyWines.tsx'), /wine\.status === 'tasted' && \(isNative \? 'Probado' : 'Ya Probado'\)/);
});
await test('aiRIM keeps the chat per owner for the app session, at most 40 messages, without a dangling question', () => {
  const chat = read('src/components/AiRimConversation.tsx');
  assert.match(chat, /sessionStorage\.getItem\(airimStoreKey135\(ownerId\)\)/);
  assert.match(chat, /useState<ConversationMessage\[\]>\(\(\) => isNative \? readAiRimMessages135\(ownerId\) : \[AIRIM_WELCOME\]\)/);
  assert.match(chat, /messages\.slice\(1\)\.slice\(-39\)/);
  assert.match(chat, /while \(valid\.length > 1 && valid\[valid\.length - 1\]\.role === 'user'\) valid\.pop\(\)/);
  assert.match(chat, /`matchrim\.airim_messages135:\$\{ownerId \?\? 'anonymous'\}`/);
});
await test('iOS gallery photos decode from an object URL (revoked); the web keeps the data URL', () => {
  const image = read('src/utils/imageAnalysis.ts');
  assert.match(image, /options\?\.compositeOnWhite === true && typeof URL !== 'undefined'[\s\S]{0,120}URL\.createObjectURL\(file\)/);
  assert.match(image, /finally \{\s*if \(objectUrl\) URL\.revokeObjectURL\(objectUrl\);/);
  assert.match(image, /objectUrl \?\? await fileToDataUrl\(file, signal\)/);
});
await test('The default purchase date is the local day', () => {
  assert.match(read('src/components/wine-import/PurchaseInfoSelector.tsx'), /now\.getTime\(\) - now\.getTimezoneOffset\(\) \* 60_000/);
});
assert.equal(groups, 6);
console.log(`Matchrim batch 135: ${groups}/6 PASS`);
