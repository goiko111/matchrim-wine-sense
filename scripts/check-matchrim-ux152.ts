// 152: «Pegar foto» reads the system pasteboard through the native plugin; rating notices say only what happened.
import fs from 'node:fs';
import { pastedPhoto151 } from '../src/utils/pastePhoto151';

let failed = 0;
const ok = (name: string, pass: boolean, note = '') => { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${note ? ` — ${note}` : ''}`); if (!pass) failed += 1; };
const read = (file: string) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const clipboard = (value: unknown) => Object.defineProperty(globalThis, 'navigator', { value: { clipboard: value }, configurable: true });
const jpeg = `data:image/jpeg;base64,${Buffer.from('foto').toString('base64')}`;

clipboard({ read: async () => { throw new Error('the page read must not be used'); } });
{
  const file = await pastedPhoto151({ pasteImage: async () => ({ status: 'captured', image: jpeg }) });
  ok('the native pasteboard photo comes back as a JPEG file', file instanceof File && file.type === 'image/jpeg' && file.size === 4);
}
ok('an empty pasteboard (or a refusal) ends in the advice, without asking the page', await pastedPhoto151({ pasteImage: async () => ({ status: 'empty' }) }) === 'none');
clipboard({ read: async () => [{ types: ['image/png'], getType: async (type: string) => new Blob(['x'], { type }) }] });
{
  const file = await pastedPhoto151({ pasteImage: async () => { throw new Error('UNIMPLEMENTED'); } });
  ok('a shell without the method falls back to the page read', file instanceof File && file.type === 'image/png');
}
{
  const file = await pastedPhoto151({ pasteImage: async () => ({ status: 'captured', image: 'data:text/html;base64,AAAA' }) });
  ok('a malformed native answer is not used: the page read answers', file instanceof File && file.type === 'image/png');
}
const swift = read('ios/App/App/MatchrimOCRPlugin106.swift');
ok('the plugin exposes pasteImage and reads the system pasteboard', swift.includes('CAPPluginMethod(name: "pasteImage"') && swift.includes('UIPasteboard.general') && swift.includes('board.hasImages'));
ok('the pasted photo is sized like a camera photo', /pasteImage[\s\S]{0,400}Self\.cameraJPEG\(image\)/.test(swift));
const wines = read('src/pages/MyWines.tsx');
ok('the rating notice on iPhone has no jargon', wines.includes('!hasSensoryAttributes && !isNative') && !wines.includes('guardada; stock'));
if (failed) { console.error(`${failed} FAILED`); process.exit(1); }
console.log('check-matchrim-ux152 OK');
