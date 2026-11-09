// 134: fixes from the afternoon audit (cellar, profile/quiz, scan, restaurant, account). Offline, no network.
// Run: npx tsx scripts/check-matchrim-tarde134.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';
import { calibrateQuizProfile132 } from '../src/utils/quizCalibration132';
import { nativeTasteSummary240 } from '../src/utils/nativeTasteSummary240';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createNativeCamera133, openCamera133 } from '../src/utils/nativeCamera133';

const ts = createRequire(import.meta.url)('typescript');
const quizModule = { exports: {} as Record<string, unknown> };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/data/quizData.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
  { module: quizModule, exports: quizModule.exports, require: (id: string) => { assert(id.startsWith('@/assets/quiz/')); return { __esModule: true, default: id }; } }, { timeout: 1000 });
const { questions } = quizModule.exports as { questions: { id: number; scores: Record<'potente' | 'acidez' | 'dulce' | 'tanico' | 'afrutado', number> }[] };
const store = new Map<string, string>();
(globalThis as { sessionStorage?: unknown }).sessionStorage = {
  getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); },
  removeItem: (key: string) => { store.delete(key); },
};
const { stashSignedOutWineDraft134, takeSignedOutWineDraft134 } = await import('../src/utils/nativeWineDraft98');

let groups = 0;
const test = async (name: string, fn: () => Promise<void> | void) => { await fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
const keys = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const rated = (t: number[], rating: 'love' | 'ok' | 'not_for_me') => ({ id: 'w', rating, use_for_profile_training: true,
  sensory_attributes: { scale: 'winerim-0-5' as const, potencia: t[0], acidez: t[1], dulzura: t[2], taninos: t[3], afrutado: t[4] },
  created_at: '2026-11-01T00:00:00.000Z' });

await test('"No va" or "Bien" on a wine exactly on the profile now moves it; "Me encanta" there still does not', () => {
  const quiz = { potente: 3, acidez: 3, dulce: 1, tanico: 2, afrutado: 4 };
  const same = keys.map(key => quiz[key]);
  for (const rating of ['not_for_me', 'ok'] as const) {
    const learned = calculateLearnedMatchrimProfile(quiz, [rated(same, rating)], { evidenceStrength: 'native-v4' });
    assert.ok(keys.some(key => learned.profile[key] !== quiz[key]), rating);
  }
  const loved = calculateLearnedMatchrimProfile(quiz, [rated(same, 'love')], { evidenceStrength: 'native-v4' });
  assert.deepEqual(loved.profile, quiz);
});
await test('Answering every question the same reads as the middle, not "Con cuerpo / Viva / Intensa"', () => {
  for (const answer of ['si', 'indiferente', 'no']) {
    const answers = Object.fromEntries(questions.map(question => [question.id, answer]));
    const profile = calibrateQuizProfile132(answers, questions);
    assert.deepEqual([profile.potente, profile.acidez, profile.afrutado], [3, 3, 3], answer);
    const summary = nativeTasteSummary240(profile)!;
    assert.deepEqual(summary.rows.filter(row => ['potente', 'acidez', 'afrutado'].includes(row.key)).map(row => row.description),
      ['Intermedio', 'Equilibrada', 'Presente'], answer);
  }
});
await test('A second tap while the camera is open does nothing; it never opens the file menu', async () => {
  const busy = await createNativeCamera133({ takePhoto: async () => { throw Object.assign(new Error('open'), { code: 'BUSY' }); } })();
  assert.deepEqual(busy, { status: 'busy' });
  let clicks = 0;
  const input = { disabled: false, click() { clicks += 1; } } as unknown as HTMLInputElement;
  await openCamera133(input, async () => ({ status: 'busy' }));
  assert.equal(clicks, 0);
  let release!: () => void, calls = 0;
  const slow = () => { calls += 1; return new Promise<{ status: 'cancelled' }>(resolve => { release = () => resolve({ status: 'cancelled' }); }); };
  const first = openCamera133(input, slow);
  await openCamera133(input, slow);
  release(); await first;
  assert.equal(calls, 1);
  assert.equal(clicks, 0);
  const swift = read('ios/App/App/MatchrimOCRPlugin106.swift');
  assert.match(swift, /while let next = top\.presentedViewController/);
  assert.match(swift, /picker\.presentingViewController == nil, Self\.pendingCameraCall === call/);
});
await test('A signed-out pick survives sign-in once, for 30 minutes, and only for a signed-in owner', () => {
  stashSignedOutWineDraft134({ name: 'Viña Tondonia Reserva', winery: 'López de Heredia', vintage: 2012 });
  assert.equal(takeSignedOutWineDraft134(null), null);
  assert.deepEqual(takeSignedOutWineDraft134('owner-1'), { name: 'Viña Tondonia Reserva', producer: 'López de Heredia', vintage: 2012 });
  assert.equal(takeSignedOutWineDraft134('owner-1'), null, 'consumed once');
  stashSignedOutWineDraft134({ name: 'Old pick' });
  const stale = JSON.parse(store.get('matchrim.signed_out_wine_draft134')!);
  store.set('matchrim.signed_out_wine_draft134', JSON.stringify({ ...stale, savedAt: Date.now() - 31 * 60_000 }));
  assert.equal(takeSignedOutWineDraft134('owner-1'), null);
  for (const file of ['src/components/NativeHome98.tsx', 'src/components/NativeWineSave98.tsx'])
    assert.match(read(file), /if \(!(?:ownerId|user)\) stashSignedOutWineDraft134\(wine\)/, file);
  assert.match(read('src/pages/MyWines.tsx'), /readNativeWineDraft98\(location\.state, user\?\.id\) \?\? takeSignedOutWineDraft134\(user\?\.id\)/);
});
await test('Cellar: reloads keep the list, the open sheet and the profile; filtered empty state; bottles; VoiceOver', () => {
  const cellar = read('src/pages/MyWines.tsx');
  assert.match(cellar, /if \(loading && !\(isNative && loadedSection134\.current === `\$\{user\?\.id\}:\$\{statusFilter\}`\)\)/);
  assert.match(cellar, /if \(cellarProfileOwner\.current !== ownerId\) setCellarProfile\(null\)/);
  assert.match(cellar, /Ningún vino de esta sección tiene alta afinidad[\s\S]{0,400}setFilterType\('all'\)/);
  assert.equal((cellar.match(/aria-pressed=\{wine\.rating === '(?:love|ok|not_for_me)'\}/g) || []).length, 3);
  assert.match(cellar, /const handleDrinkBottle134[\s\S]{0,900}confirmsWineMutation\(data, wine\.id, update\)/);
  assert.match(cellar, /if \(isNative\) void deleteOwnWinePhoto133\(id\)/);
  assert.match(cellar, /if \(!open && isNative && isAddWineRoute\) setShowAddDialog\(true\)/);
  const item = read('src/components/NativeCellarItem98.tsx');
  assert.match(item, /aria-label=\{rowLabel\}/);
  assert.match(item, /const sheetPhoto = wine\.image_url \? null : ownPhoto \|\|/);
  const own = read('src/utils/ownWinePhoto133.ts');
  assert.match(own, /export const deleteOwnWinePhoto133/);
  assert.match(own, /store\.getAll\(\)/);
});
await test('Scan: a failed or cancelled re-read keeps the batch saveable; confirmed local identity is not re-read; shelf photo not used as own photo', () => {
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.match(scanner, /if \(isNative\) \{\s*const snapshot = reanalyzeSnapshot134\.current\?\.region;[\s\S]{0,160}setPhase\('ready'\);\s*return;/);
  assert.match(scanner, /if \(isNative && reread && abortRef\.current === reread\.controller\)[\s\S]{0,200}setPhase\('ready'\)/);
  assert.match(scanner, /disabled=\{regionActionsLocked \|\| \(localBatch && selectedRegion\.status === 'recognized'\)\}/);
  assert.match(scanner, /\(localBatch && batch\.groups\.length === 1 \? preview : null\)/);
  assert.match(scanner, /if \(isNative\) event\.target\.value = '';/);
});
await test('Profile, quiz and registration', () => {
  assert.match(read('src/pages/Profile.tsx'), /value >= rawRange\[0\] && value <= max/);
  assert.match(read('src/pages/Profile.tsx'), /\{!isNative && <Button[\s\S]{0,400}Ver Detalles/);
  const quiz = read('src/hooks/useQuizResults.ts');
  assert.match(quiz, /const recommendations = native \? \[\] : await getDiverseWineRecommendations/);
  assert.ok(quiz.indexOf("if (quizError) throw quizError;") < quiz.indexOf('recommendations.push(...await getDiverseWineRecommendations'));
  assert.match(read('src/pages/Matchrim.tsx'), /if \(!quizResult \|\| isNative\) return;/);
  assert.match(read('src/pages/Matchrim.tsx'), /¿Salir del test\?/);
  assert.match(read('src/pages/Registration.tsx'), /if \(isNative && currentStep > 1\) \{ handlePrevious\(\); return; \}/);
  assert.doesNotMatch(read('src/hooks/useRegistrationData.ts'), /description: signUpError\.message/);
  assert.match(read('src/components/registration/BasicInfoStep.tsx'), /data\.password\.length >= 6/);
});
await test('Account, restaurant and menus', () => {
  const auth = read('src/contexts/AuthContext.tsx');
  assert.match(auth, /if \(error && Capacitor\.isNativePlatform\(\)\)[\s\S]{0,200}signOut\(\{ scope: 'local' \}\)/);
  const restaurant = read('src/pages/Restaurant.tsx');
  assert.match(restaurant, /const selectedFood = foods\.some\(row => row\.id === selectedFoodState\)/);
  assert.match(restaurant, /setBudget\(''\); setCurrency\('EUR'\); setService\('any'\)/);
  assert.match(restaurant, /formatScanPrice\(row\.price, row\.currency\)/);
  const menu = read('src/components/wine-import/WineMenuScanner.tsx');
  assert.equal((menu.match(/parseNullableNumber\(scanMaxPrice\.replace\(',', '\.'\)\)/g) || []).length, 2);
  assert.match(menu, /filters and row state from the previous menu/);
  assert.match(read('src/components/wine-import/WineComparisonWorkspace.tsx'), /budget\.trim\(\)\.replace\(',', '\.'\)/);
  assert.match(read('src/pages/AccountDeletion.tsx'), /requested: 'recibida'/);
});
await test('No unaccented Spanish left in the strings fixed today', () => {
  const files = ['src/pages/Registration.tsx', 'src/pages/AccountDeletion.tsx', 'src/pages/Profile.tsx', 'src/components/wine-import/WineComparisonWorkspace.tsx',
    'src/components/wine-import/MultiWineLabelScanner.tsx', 'src/components/wine-import/GlobalWineRecovery104.tsx'];
  const text = files.map(read).join('\n');
  for (const bad of ['enlace de confirmacion', 'Despues podras', 'Ir a iniciar sesion', 'Tambien puedes', 'Todavia no hay', 'Opcion provisional',
    'recomendacion final', 'esta disponible en esta version', 'foto mas cercana', 'esta recibiendo', 'deteccion multibotella', 'La busqueda en Winerim',
    'Identificacion manual', 'quedara pendiente', 'imagen valida']) assert.ok(!text.includes(bad), bad);
});
await test('Sign-out: the web keeps its exact behaviour; offline on iOS the session closes on this device', async () => {
  const source = read('src/contexts/AuthContext.tsx');
  const start = source.indexOf('  const signOut = async () => {');
  const end = source.indexOf('\n  };\n', start) + 5;
  const compiled = ts.transpileModule(source.slice(start, end).replace('const signOut', 'globalThis.actual'), { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 } }).outputText;
  const run = async (native: boolean, failGlobal: boolean) => {
    const events: unknown[] = [];
    const sandbox = vm.createContext({ console: { error() {} }, toast: (payload: unknown) => events.push(payload),
      Capacitor: { isNativePlatform: () => native },
      supabase: { auth: { signOut: async (options?: { scope?: string }) => {
        events.push(`signOut:${options?.scope ?? 'global'}`);
        return { error: failGlobal && options?.scope !== 'local' ? { message: 'Load failed' } : null };
      } } } });
    vm.runInContext(compiled, sandbox);
    return { value: await (sandbox as { actual: () => Promise<boolean> }).actual(), events: JSON.parse(JSON.stringify(events)) };
  };
  assert.deepEqual(await run(false, true), { value: false, events: ['signOut:global', { title: 'Error al cerrar sesión', description: 'Load failed', variant: 'destructive' }] });
  assert.deepEqual(await run(false, false), { value: true, events: ['signOut:global', { title: 'Sesión cerrada', description: 'Has cerrado sesión exitosamente.' }] });
  assert.deepEqual(await run(true, true), { value: true, events: ['signOut:global', 'signOut:local', { title: 'Sesión cerrada', description: 'Has cerrado sesión exitosamente.' }] });
});
assert.equal(groups, 10);
console.log(`Matchrim tarde 134: ${groups}/10 PASS`);
