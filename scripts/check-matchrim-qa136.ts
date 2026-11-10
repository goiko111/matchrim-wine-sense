// 136: findings of the simulator E2E battery and the learner exam (cellar affinity save, "Ver todos",
// offline manual add, legal sheets in registration, dislike-only learning, batch save past a rejection,
// Spanish/a11y polish). Offline, no network. Run: npx tsx scripts/check-matchrim-qa136.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';
import { saveLabelBatch, type LabelSaveBatch, type LabelSaveCallback } from '../src/utils/labelScanSave';

let groups = 0;
const test = async (name: string, fn: () => Promise<void> | void) => { await fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
const KEYS = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const row = (t: number[], rating: string, i: number) => ({ id: `w${i}`, name: `W${i}`, rating, use_for_profile_training: true,
  sensory_attributes: { scale: 'winerim-0-5', potencia: t[0], acidez: t[1], dulzura: t[2], taninos: t[3], afrutado: t[4] },
  created_at: new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString() });

await test('Dislikes alone stay near the quiz and report low confidence; mixed evidence still learns', () => {
  const base = { potente: 3, acidez: 3, dulce: 1, tanico: 3, afrutado: 3 };
  const wines = [[5, 1, 0, 5, 2], [1, 5, 4, 0, 4], [4, 2, 1, 4, 1], [2, 4, 3, 1, 5], [5, 3, 0, 5, 3]];
  const dislikes = Array.from({ length: 50 }, (_, i) => row(wines[i % wines.length], 'not_for_me', i));
  const learned = calculateLearnedMatchrimProfile(base, dislikes as never, { evidenceStrength: 'native-v4' });
  const moved = Math.max(...KEYS.map(key => Math.abs(learned.profile[key] - base[key])));
  assert(moved <= 2, `dislike-only profile moved ${moved}`);
  assert(learned.confidence <= 40, `confidence ${learned.confidence}`);
  const loves = Array.from({ length: 20 }, (_, i) => row([4, 4, 1, 4, 4], 'love', i));
  const mixed = calculateLearnedMatchrimProfile(base, [...loves, ...dislikes.slice(0, 5)] as never, { evidenceStrength: 'native-v4' });
  assert(mixed.profile.potente >= 3.5 && mixed.profile.acidez >= 3.5, JSON.stringify(mixed.profile));
  assert(mixed.confidence > 40);
  // One like no longer restores forty dislikes at full weight (smooth cap).
  const oneLike = calculateLearnedMatchrimProfile(base, [row([4, 4, 1, 4, 4], 'love', 99), ...dislikes.slice(0, 40)] as never, { evidenceStrength: 'native-v4' });
  const drift = Math.max(...KEYS.map(key => Math.abs(oneLike.profile[key] - base[key])));
  assert(drift <= 2, `one like + 40 dislikes moved ${drift}`);
});
await test('A rejected bottle no longer blocks the rest of the batch; uncertain results still stop it', async () => {
  const saved = { status: 'saved', rowId: 'row', ownerId: 'owner' } as const;
  const batch = (): LabelSaveBatch => ({ ownerId: 'owner', wines: [{ nombre: 'A' }, { nombre: 'B' }, { nombre: 'C' }] as never, results: [] });
  let calls = 0;
  const rejectSecond: LabelSaveCallback = async () => ++calls === 2 ? { status: 'rejected' } : saved;
  const first = batch();
  assert.equal(await saveLabelBatch(first, rejectSecond, () => true, () => {}), 'incomplete');
  assert.deepEqual(first.results.map(result => result?.status), ['saved', 'rejected', 'saved']);
  assert.equal(await saveLabelBatch(first, rejectSecond, () => true, () => {}), 'confirmed', 'retry inserts only the rejected one');
  assert.equal(calls, 4);
  calls = 0;
  const uncertain = batch();
  await saveLabelBatch(uncertain, async () => ++calls === 2 ? { status: 'ambiguous' } : saved, () => true, () => {});
  assert.equal(calls, 2, 'an uncertain insert still stops the batch');
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.match(scanner, /result\.status !== 'saved' && result\.status !== 'rejected'\)\n\s+\?\? saveResults\.find/);
});
await test('"Guardar afinidad de hoy" uses the verified sheet instead of failing on a catalogue miss', () => {
  const source = read('src/pages/MyWines.tsx');
  assert.match(source, /const verified = isNative && savedDetails\?\.bodega_sensory_evidence \? readCellarSensoryEvidence\(wine, true\) : null;/);
  assert.match(source, /\.catch\(error => \{ if \(!verified\) throw error; return null; \}\)/);
  assert.match(source, /const attributes = verified \?\? \(/);
  assert.match(source, /countsUnknown=\{wineLoadFailed\}/);
  assert.match(read('src/components/NativeCellarToolbar98.tsx'), /\{!countsUnknown && <span/);
  assert.match(read('src/components/NativeCellarToolbar98.tsx'), /countsUnknown \? 'Favoritos' : `Favoritos · \$\{counts\.favorites\}`/);
});
await test('Home "Ver todos" opens the full recommendation list, not the restaurant screen', () => {
  const home = read('src/components/NativeHome98.tsx');
  assert.doesNotMatch(home, /onClick=\{\(\) => navigate\('\/usar-matchrim'\)\}>Ver todos/);
  assert.match(home, /recommendations\.length > 3 && <button[^>]*onClick=\{\(\) => setAllOpen\(true\)\}>Ver todos/);
  assert.match(home, /data-testid="native-home-all136">\{recommendations\.map\(wine => renderWine\(wine, true\)\)\}/);
  assert.match(home, /onSelect\(wine, fromList \? allButton\.current \?\? undefined : event\?\.currentTarget\)/, 'focus returns to Ver todos');
  assert.match(read('src/pages/Index.tsx'), /selectUnseenWineRecommendations\(wines, savedWines, Capacitor\.isNativePlatform\(\) \? 20 : 3\)/);
});
await test('Offline search offers the manual form; aiRIM keeps the unsent question', () => {
  assert.match(read('src/components/wine-import/NativeWineSearch97.tsx'), /\(visible\?\.phase === 'ready' \|\| visible\?\.phase === 'error'\) && onManualEntry/);
  const airim = read('src/components/AiRimConversation.tsx');
  assert.match(airim, /matchrim\.airim_draft136:/);
  assert.match(airim, /useState\(\(\) => initialQuestion \|\| \(isNative \? readAiRimDraft136\(ownerId\) : ''\)\)/);
  assert.match(airim, /setInput\(isNative \? readAiRimDraft136\(ownerId\) : ''\);/, 'owner switch restores the incoming draft');
});
await test('Registration opens terms and privacy in a sheet on iOS; the web keeps the new-tab link', () => {
  for (const file of ['src/components/registration/FinalStep.tsx', 'src/components/registration/ConsentStep.tsx']) {
    const source = read(file);
    assert.doesNotMatch(source, /<a href="\/(terms|privacy)"/, file);
    assert.equal(source.match(/<LegalLink136 doc="(terms|privacy)"/g)?.length, 2, file);
  }
  const link = read('src/components/registration/LegalLink136.tsx');
  assert.match(link, /if \(!Capacitor\.isNativePlatform\(\)\) \{\n\s+return <a href=\{doc === 'terms' \? '\/terms' : '\/privacy'\} target="_blank"/);
  assert.match(link, /event\.preventDefault\(\); event\.stopPropagation\(\); setShown\(doc\); setOpen\(true\);/);
  // Review: inside the sheet no link may leave the registration form.
  assert.match(link, /<Terms embedded onOpenPrivacy=\{\(\) => setShown\('privacy'\)\} \/>/);
  assert.match(read('src/pages/Terms.tsx'), /\{embedded \? <button type="button"[^>]*onClick=\{onOpenPrivacy\}>/);
  assert.match(read('src/pages/PrivacyPolicy.tsx'), /\{embedded \? 'eliminar cuenta' : <Link to="\/account\/delete"/);
  assert.match(read('src/pages/Terms.tsx'), /const Terms = \(\{ embedded = false, onOpenPrivacy \}: \{ embedded\?: boolean; onOpenPrivacy\?: \(\) => void \} = \{\}\)/);
  assert.match(read('src/pages/PrivacyPolicy.tsx'), /const PrivacyPolicy = \(\{ embedded = false \}: \{ embedded\?: boolean \} = \{\}\)/);
});
await test('Spanish and accessibility polish', () => {
  for (const file of ['src/components/ui/dialog.tsx', 'src/components/ui/sheet.tsx']) {
    assert.match(read(file), /sr-only">Cerrar</, file);
    assert.doesNotMatch(read(file), /sr-only">Close</, file);
  }
  const legal = read('src/pages/Terms.tsx') + read('src/pages/PrivacyPolicy.tsx');
  for (const word of ['Ultima actualizacion', 'Terminos de uso', 'Politica de privacidad', 'informacion', 'senal', 'imagenes', 'analisis', 'eliminacion', 'Tambien'])
    assert(!legal.includes(word), word);
  assert(!read('src/components/NativeAccountActions.tsx').includes("'Sesion iniciada'"));
  const styles = read('src/pages/WineStyles.tsx');
  assert.match(styles, /<Link\s+to="\/matchrim"[\s\S]{0,300}?Hacer Test Matchrim/);
  assert.match(styles, /<Link\s+to="\/inteligencia-liquida"[\s\S]{0,300}?Explorar aiRIM/);
  assert.match(read('src/components/wine-import/PurchaseInfoSelector.tsx'), /CardTitle className="flex flex-col items-start gap-2 pr-12 \[overflow-wrap:break-word\]/);
  assert.match(read('src/pages/UseMatchrim.tsx'), /TabsTrigger value="scanner" className="min-h-11/);
  assert.match(read('src/pages/Restaurant.tsx'), /if \(parsed\.pairs\.length\) requestAnimationFrame\(\(\) => \{ pairsList\.current\?\.scrollIntoView/, 'results scrolled into view');
  const master = read('src/components/wine-import/NativeMasterLookup259.tsx');
  assert.match(master, /to=\{buildAuthRedirectPath\('\/my-wines\/add'\)\}/, 'signed-out lookup continues in Añadir vino');
  assert.match(master, /stashSignedOutWineDraft134\(\{ name: candidate\.name, producer: candidate\.producer, vintage: candidate\.vintage \}\)/);
  assert.doesNotMatch(master, /tendrás que volver a hacer la foto/);
  const css = read('src/index.css');
  assert.match(css, /matchrim-accessibility-text :is\(h1, h2, h3\) \{\n  -webkit-hyphens: auto;\n  hyphens: auto;/, 'titles hyphenate at large text');
  assert.doesNotMatch(css, /matchrim-accessibility-text :is\([^)]*button[^)]*\) \{\n  -webkit-hyphens/, 'buttons keep whole words');
});

console.log(`Matchrim QA 136: ${groups}/7 PASS`);
