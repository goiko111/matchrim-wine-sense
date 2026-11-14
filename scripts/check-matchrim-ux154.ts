// 154: the wine list and restaurant mode take the relief; a saved wine's drawn bottle has a colour without waiting for the store.
import fs from 'node:fs';
import { guessWineType154, rememberedWineType154, rememberWineType154 } from '../src/utils/wineTypeGuess154';
let failed = 0;
const ok = (name: string, pass: boolean, note = '') => { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${note ? ` — ${note}` : ''}`); if (!pass) failed += 1; };
const read = (file: string) => fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');

ok('the name says the type', guessWineType154('Martín Berdugo Rosado') === 'rosado' && guessWineType154('Parxet Brut Nature') === 'espumoso' && guessWineType154('Viña Tondonia Reserva') === 'tinto' && guessWineType154('Tío Pepe Fino') === 'generoso');
ok('the grapes say it when the name does not', guessWineType154('Mar de Frades', ['Albariño']) === 'blanco' && guessWineType154('Pago de Cirsus Cuvée Especial', ['Cabernet Sauvignon', 'Shiraz/Syrah']) === 'tinto');
ok('white garnacha is white; mixed or unknown grapes give no colour', guessWineType154('X', ['Garnacha blanca']) === 'blanco' && guessWineType154('X', ['Garnacha', 'Viura']) === null && guessWineType154('PSI', null) === null && guessWineType154('Portia') === null);
{
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) }, configurable: true });
  rememberWineType154('a', 'Tinto'); rememberWineType154('b', null);
  ok('what the store said is remembered on the phone', rememberedWineType154('a') === 'Tinto' && rememberedWineType154('b') === null);
  for (let index = 0; index < 320; index += 1) rememberWineType154(`w${index}`, 'Blanco');
  ok('at most 300 wines are remembered', Object.keys(JSON.parse(store.get('matchrim.wine_types154')!)).length === 300 && rememberedWineType154('a') === null);
}
const item = read('components/NativeCellarItem98.tsx'), menu = read('components/wine-import/WineMenuScanner.tsx'), rest = read('pages/Restaurant.tsx'), css = read('index.css');
ok('the row asks the store, then memory, then the guess; nothing is stored with the wine', item.includes('storeHit?.type ?? rememberedWineType154(identityKey) ?? guessWineType154(wine.name') && !read('utils/wineTypeGuess154.ts').includes('supabase'));
ok('wine list: the best wine is the dark block and keeps its words', menu.includes('data-best154={menuDecision.best ?') && menu.includes('El que más encaja contigo de esta carta') && css.includes('[data-best154] :is(p, span, summary, button):not([data-keep154], [data-keep154] *)'));
ok('wine list: each row carries a coloured score tag marked as an estimate', menu.includes('<ScorePill150 score={verdict.score} estimate />'));
ok('restaurant: lifted cards and a coloured pairing band', (rest.match(/\$\{card150\}/g) ?? []).length === 4 && rest.includes("'bg-emerald-700 text-white' : pair.band === 'possible' ? 'bg-amber-100 text-amber-900'") && rest.includes('data-testid="restaurant-personal138"'));
if (failed) { console.error(`${failed} FAILED`); process.exit(1); }
console.log('check-matchrim-ux154 OK');
