// 157: the owner's answers to the design proposals: full-bleed photographs in the taste test and an answer that
// moves on by itself; rating from the list; the label photo kept with every saved scan; the flavours a tasting note
// names as pictures; and what the person already rated from the same zone and grape.
// Offline. Run: npx tsx scripts/check-matchrim-ux157.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { flavours157 } from '../src/utils/flavours157';
import { historyLines157 } from '../src/utils/history157';
import { labelFit157 } from '../src/utils/labelFit157';
import { matchListing139 } from '../src/utils/storeListing139';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');

test('An answer moves the test on by itself; «Anterior» stays and an answered question can be passed', () => {
  const question = read('src/components/QuizQuestion.tsx');
  assert.match(question, /onClick=\{\(\) => advanceSoon\(value\)\}/);
  assert.match(question, /pending\.current = window\.setTimeout\(\(\) => \{ pending\.current = null; continueRef\.current\?\.\(\); \}, 280\)/);
  assert.match(question, /\{currentAnswer && <Button type="button" onClick=\{onContinue\}[^>]*data-testid="quiz-forward157"/);
  assert.match(question, /useEffect\(\(\) => \(\) => \{ if \(pending\.current !== null\) \{ window\.clearTimeout\(pending\.current\)/, 'a pending advance is cancelled when the question changes');
  assert(!/\(\?<[!=]/.test(read('src/utils/flavours157.ts')), 'no lookbehind (iOS 14-16.3)');
});

test('Twenty photographs and their credits', () => {
  for (let id = 1; id <= 20; id += 1) assert(fs.statSync(`src/assets/quiz157/q${id}.jpg`).size < 260_000, `q${id} stays light`);
  const credits = read('docs/MATCHRIM_157_FOTOS.md');
  assert.equal((credits.match(/https:\/\/(unsplash\.com\/photos|www\.pexels\.com\/photo)\//g) ?? []).length >= 7, true);
});

test('A wine can be rated from the list with the page\'s own handler', () => {
  const item = read('src/components/NativeCellarItem98.tsx'), page = read('src/pages/MyWines.tsx');
  assert.match(item, /\{!wine\.rating && onRate && <div [^>]*data-testid="native-cellar-quick157">/);
  for (const label of ['Me encantó', 'Correcto', 'No me gustó']) assert(item.includes(`'${label}'`), label);
  assert.match(item, /className=\{`flex h-11 w-11 items-center justify-center rounded-full/, '44 pt targets');
  assert.match(page, /onRate=\{isNative \? rating => \{ void handleRating\(wine\.id, rating\); \} : undefined\} rateBusy=\{savingWineActions\.has\(wine\.id\)\}/);
  assert(!/<button[^>]*data-testid="native-cellar-item98"[^>]*>[\s\S]{0,2200}<button/.test(item.split('native-cellar-quick157')[0]), 'no button inside the row button');
});

test('The label photo stays with a wine saved from the scan sheet or kept without a Winerim sheet', () => {
  const save = read('src/components/NativeSaveChoice142.tsx');
  assert.match(save, /if \(row\) await saveOwnWinePhoto133\(row\.id, wine\.labelPhoto\);/);
  assert.match(save, /if \(wine\.labelPhoto && !wine\.photo\) void saveOwnWinePhoto133\(had\.id, wine\.labelPhoto\);/);
  assert(!/image_url: wine\.labelPhoto/.test(save), 'never uploaded');
  assert.match(read('src/components/wine-import/KeepUnlisted156.tsx'), /source: 'label', labelPhoto \}\}/);
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.equal((scanner.match(/labelPhoto[:=]\{? ?selectedRegion\??\.cropDataUrl \|\| preview/g) ?? []).length, 2);
});

test('Flavours come only from the note\'s words, in its order, and a denied one is not shown', () => {
  assert.deepEqual(flavours157(['Aromas de cereza madura, violetas y un fondo de vainilla, sin madera marcada.', 'En boca mora y regaliz.']).map(item => item.id), ['roja', 'flor', 'vainilla', 'negra', 'especias']);
  assert.deepEqual(flavours157([null, undefined, '']), []);
  assert.deepEqual(flavours157(['Vino tinto con crianza']).map(item => item.id), []);
  assert.equal(flavours157(['limón manzana flor mineral almendra brioche cuero trufa miel mango']).length, 6);
  const cards = read('src/components/FlavourCards157.tsx');
  assert.match(cards, /if \(found\.length < 2\) return null;/);
  for (const file of fs.readdirSync('src/assets/flavour157')) assert(cards.includes(`'@/assets/flavour157/${file}'`), file);
});

test('«Lo que ya has probado» counts only the person\'s ratings, from two wines up', () => {
  const rated = [{ rating: 'love', region: 'Rioja', grape_varieties: ['Tempranillo'] }, { rating: 'love', region: 'rioja ', grape_varieties: ['Tempranillo', 'Graciano'] },
    { rating: 'not_for_me', region: 'Rioja', grape_varieties: ['Garnacha'] }, { rating: null, region: 'Rioja', grape_varieties: ['Tempranillo'] }, { rating: 'not_for_me', region: 'Rueda', grape_varieties: ['Verdejo'] }];
  const lines = historyLines157(rated, { region: 'Rioja', grapes: ['Tempranillo', 'Graciano', 'Mazuelo'] });
  assert.deepEqual(lines.map(item => [item.key, item.face]), [['region', 'good'], ['grape-tempranillo', 'good']]);
  assert.equal(lines[0].text, 'Vinos de Rioja: te encantaron 2 de los 3 que has valorado');
  assert.deepEqual(historyLines157(rated, { region: 'Rueda', grapes: ['Verdejo'] }), [], 'one wine is not a history');
  assert.deepEqual(historyLines157([], { region: 'Rioja', grapes: ['Tempranillo'] }), []);
  assert.match(read('src/components/WineSheet142.tsx'), /\{history\.length > 0 && <section [^>]*data-testid="wine-history157">/);
});

test('Video of 156: candidates the label does not back wait folded; a winery written longer on the label still matches', () => {
  const nine = ['NINE', 'MINERVOIS', "APPELLATION D'ORIGINE CONTRÔLÉE", 'PARLOTTE', 'JEAN BAPTISTE SÉNAT', 'PRODUIT DE FRANCE'];
  for (const [name, winery] of [['Jean Baptiste Eclats', 'Jean-Baptiste Audy'], ['Aurore Minervoise', 'Domaine de Montahuc'], ['Ses Nines Negre', 'Tianna Negre'], ['Red Blend 689 - Six Eight Nine', '689 - Six Eight Nine']])
    assert.equal(labelFit157(nine, name, winery), false, name);
  assert.equal(labelFit157(nine, 'La Nine', 'Domaine Jean-Baptiste Sénat'), true);
  assert.equal(labelFit157(['PSI', '2023', 'RIBERA DEL DUERO'], 'PSI', 'Dominio de Pingus'), true, 'a label that names only the wine');
  assert.equal(labelFit157(['Imperial', 'Reserva', 'CVNE'], 'Imperial Gran Reserva', 'CVNE'), true);
  assert.equal(labelFit157([], 'Anything', 'Anyone'), true, 'no reading, no sifting');
  const recovery = read('src/components/wine-import/CandidateRecovery286.tsx');
  assert.match(recovery, /const sift157 = decision\?\.mode === 'choose' && labelLines157\.length > 0 && !typed\.trim\(\);/);
  assert.match(recovery, /const more = sift157 \? \[\.\.\.found157\.filter\(value => !fits157\(value\)\), \.\.\.rest157\] : rest157;/, 'nothing is thrown away');
  const row = (id: number, name: string, winery: string) => ({ id, name, winery, slugname: '_', vintage: null, subname: null, type: 'Tinto', region: null, country: null, photo: null, grapes: [],
    tastingAttributes: { power: 3, acidity: 3, sweetness: 1, tannin: 3, fruity: 3 } });
  const zorrera = matchListing139({ name: 'Chivite La Zorrera', producer: 'J. Chivite Family Estates', vintage: 2015 }, [row(1, 'La Zorrera', 'Chivite')] as never);
  assert.equal(zorrera?.kind, 'exact');
  assert.equal(matchListing139({ name: 'La Zorrera', producer: 'Marqués de Riscal' }, [row(1, 'La Zorrera', 'Chivite')] as never)?.kind ?? null, null, 'another winery still does not match');
  assert(!read('src/components/wine-import/RowEstimate156.tsx').includes('!identity.producer?.trim()'));
});
console.log(`check-matchrim-ux157: ${groups}/7 groups passed`);
