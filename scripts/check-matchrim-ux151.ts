// 151: the next step after finding a wine stands out, each rating has its colour, and a copied photo can be pasted.
import fs from 'node:fs';
import { pastedPhoto151 } from '../src/utils/pastePhoto151';

let failed = 0;
const ok = (name: string, pass: boolean, note = '') => { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${note ? ` — ${note}` : ''}`); if (!pass) failed += 1; };
const read = (file: string) => fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
const clipboard = (value: unknown) => Object.defineProperty(globalThis, 'navigator', { value: { clipboard: value }, configurable: true });
const item = (types: string[]) => ({ types, getType: async (type: string) => new Blob(['x'], { type }) });

clipboard(undefined);
ok('no clipboard: says so instead of failing', await pastedPhoto151() === 'unavailable');
clipboard({ read: async () => [item(['text/plain'])] });
ok('copied text is not a photo', await pastedPhoto151() === 'none');
clipboard({ read: async () => { throw new DOMException('denied', 'NotAllowedError'); } });
ok('paste declined ends in the advice, not in an error', await pastedPhoto151() === 'none');
clipboard({ read: async () => [item(['text/html']), item(['text/plain', 'image/jpeg'])] });
{
  const file = await pastedPhoto151();
  ok('a copied photo comes back as an image file', file instanceof File && file.type === 'image/jpeg' && file.name === 'foto-pegada.jpg');
}

const save = read('components/NativeSaveChoice142.tsx'), scanner = read('components/wine-import/MultiWineLabelScanner.tsx');
ok('the save choices sit in a titled block', save.includes('data-panel151') && save.includes('¿Qué haces con este vino?') && save.includes('bg-red-950'));
ok('the three places stay equal (none filled as if chosen)', (save.match(/bg-red-900\/10 text-red-900/g) ?? []).length === 1 && !/place === 'wishlist' \? 'bg-red/.test(save));
ok('each rating has its own colour', ['bg-emerald-700 text-white', 'bg-amber-100 text-amber-900', 'bg-stone-200 text-stone-700'].every(tone => save.includes(tone)));
ok('the rating values are the three the database accepts', save.includes("'love' | 'ok' | 'not_for_me'") && !save.includes("'like'"));
ok('a saved wine without rating asks for it in the dark block', read('components/NativeCellarItem98.tsx').includes('data-ask151'));
ok('saved-wine rating icons are coloured on iPhone', ['text-emerald-700', 'text-amber-600', 'text-stone-500'].every(tone => read('pages/MyWines.tsx').includes(tone)));
ok('the scanner offers to paste a photo, on iPhone only', scanner.includes('{isNative && <Button') && scanner.includes('data-testid="paste-photo151"') && scanner.includes('await startScan(file)'));
ok('the wine sheet cards take the relief', read('components/WineSheet142.tsx').includes('const card = card150'));
if (failed) { console.error(`${failed} FAILED`); process.exit(1); }
console.log('check-matchrim-ux151 OK');
