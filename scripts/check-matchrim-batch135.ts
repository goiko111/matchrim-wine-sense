// 135: Spanish confirmation dialogs on iOS, native section names, aiRIM chat kept per session,
// lighter gallery decoding, local purchase date. Offline, no network. Run: npx tsx scripts/check-matchrim-batch135.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createConfirm135 } from '../src/utils/nativeConfirm135';
import { nativeDuplicateWineGroups261 } from '../src/utils/nativeMasterDuplicates261';
import type { ScanRegion, WineCandidate } from '../src/utils/multiWineScan';
import { authErrorText135 } from '../src/utils/authErrorText135';
import { createGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103';

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
await test('Two bottles of the same wine: the one that read the vintage represents the group (own candidate, nothing copied)', () => {
  const wine = (id: string, vintage: number | null, confidence: number): WineCandidate => ({ id, name: 'Viña Tondonia Reserva', producer: 'López de Heredia',
    vintage, region: 'Rioja', country: 'España', grapes: [], alcohol: null, confidence, source: 'label', evidence: [], inferredFields: [], uncertaintyReasons: [] });
  const region = (id: string, value: WineCandidate): ScanRegion => ({ id, index: 1, objectType: 'bottle', box: { x: 0, y: 0, width: 20, height: 80 },
    detectionConfidence: .9, quality: { glare: 'low', occlusion: 'low', legibility: 'good' }, status: 'recognized',
    candidates: [value], selectedCandidateId: value.id, duplicateCount: 1, error: null });
  const undated = wine('a', null, .95), dated = wine('b', 2012, .8);
  const groups = nativeDuplicateWineGroups261([region('r1', undated), region('r2', dated)]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].candidate, dated);
  assert.deepEqual(groups[0].regionIds, ['r2', 'r1']);
  const conflicting = nativeDuplicateWineGroups261([region('r1', undated), region('r2', dated), region('r3', wine('c', 2014, .7))]);
  assert.ok(conflicting.every(group => group.candidate !== undated || group.regionIds[0] === 'r1'), 'disagreeing vintages keep the previous choice');
});
await test('Sign-in and recovery errors are Spanish on iOS; the destination survives recovery; Back does not bounce to /auth', () => {
  assert.equal(authErrorText135('Load failed', 'x'), 'No hay conexión. Comprueba la red y vuelve a intentarlo.');
  assert.equal(authErrorText135('For security purposes, you can only request this after 37 seconds.', 'x'), 'Espera 37 segundos antes de pedir otro enlace.');
  assert.equal(authErrorText135('Request rate limit reached', 'x'), 'Demasiados intentos. Espera unos minutos y vuelve a probar.');
  assert.equal(authErrorText135('Something else', 'Genérico'), 'Genérico');
  const auth = read('src/pages/Auth.tsx');
  assert.match(auth, /navigate\(redirectPath, isNative \? \{ replace: true \} : undefined\)/);
  assert.match(auth, /`\/forgot-password\?redirect=\$\{encodeURIComponent\(redirectPath\)\}`/);
  const forgot = read('src/pages/ForgotPassword.tsx');
  assert.match(forgot, /navigate\(authPath, isNative \? \{ replace: true \} : undefined\)/);
  assert.match(forgot, /authErrorText135\(error\.message/);
  assert.match(read('src/contexts/AuthContext.tsx'), /else if \(Capacitor\.isNativePlatform\(\)\) \{\s*errorMessage = authErrorText135/);
  assert.doesNotMatch(read('src/components/wine-import/NativeMasterLookup259.tsx'), /Tu etiqueta sigue aquí/);
});
await test('A failed "load more" gives the page cursor back; a successful one still consumes it', async () => {
  let fail = true;
  const row = (id: number) => ({ id, name: `Cuvee ${id}`, winery: 'Independent Estate', vintage: null, slugname: `cuvee-${id}` });
  const client = createGlobalCatalogue103(async input => {
    const page = Number(new URL(String(input)).searchParams.get('page'));
    if (page === 2 && fail) throw new TypeError('Load failed');
    return Response.json({ count: 96, page, results: Array.from({ length: Math.min(20, 96 - (page - 1) * 20) }, (_, i) => row((page - 1) * 20 + i + 1)) });
  });
  const first = await client.searchProposals('Cuvee');
  assert.ok('next' in first && first.next);
  const cursor = first.next!;
  assert.equal((await client.browseProposals('Cuvee', cursor)).status, 'unavailable');
  fail = false;
  const second = await client.browseProposals('Cuvee', cursor);
  assert.equal(second.rows.length, 20);
  assert.equal((await client.browseProposals('Cuvee', cursor)).status, 'identity-required', 'single use after success');
  assert.match(read('src/components/wine-import/NativeGlobalCatalogue103.tsx'), /result\.next \?\? \(result\.status === 'unavailable' \? priorNext : null\)/);
});
await test('An empty catalogue search offers adding the wine by hand from Inicio', () => {
  assert.match(read('src/components/wine-import/NativeWineSearch97.tsx'), /Añadir «\$\{visible\.query\}» a mano/);
  assert.match(read('src/components/NativeHome98.tsx'), /onManualEntry=\{name => \{[\s\S]{0,300}createNativeWineDraft98\(\{ name \}, ownerId\)/);
});
assert.equal(groups, 10);
console.log(`Matchrim batch 135: ${groups}/10 PASS`);
