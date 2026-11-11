// 142: one wine sheet built from Winerim's own data, with the visual order learnt from a walk through Vivino on the
// owner's iPhone; «why it fits» in sentences; saving a wine where it belongs. Offline. Run: npx tsx scripts/check-matchrim-ux142.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compatLines142, pairingLabel142, parseWinerimDetail142 } from '../src/utils/winerimDetail142';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');

test('The Winerim detail is read into plain, bounded text (shape observed 2026-11-11)', () => {
  const detail = parseWinerimDetail142({ pairings: [{ name: 'pasta' }, { name: 'pescado-blanco' }, { name: 'carne-aves' }, { name: '<b>x</b>' }, { name: 'pasta' }],
    tastingNote: { nose: 'Cítricos frescos  y melocotón.', palate: '<script>', appearance: 'x' }, quickSheet: { origin: 'O Rosal y Cambados.', personality: 'Fresco y elegante.' },
    storytelling: { narrative: 'En las brumas de Rías Baixas…' }, wineDetails: { alcohol: 125, serviceTemperature: '8-10' },
    relatedWines: [{ id: 1, name: 'Godello', winery: 'Bodega', slugname: 'Godello', photo: 'https://evil.example/x.png', tastingAttributes: { power: 3 } }, { id: 'x', name: 'bad' }] });
  assert.deepEqual(detail.pairings, ['Pasta', 'Pescado blanco', 'Aves']);
  assert.equal(detail.nose, 'Cítricos frescos y melocotón.'); assert.equal(detail.palate, null, 'markup is dropped');
  assert.equal(detail.alcohol, '12,5 % vol.'); assert.equal(detail.temperature, '8–10 °C');
  assert.equal(detail.related.length, 1); assert.equal(detail.related[0].photo, null, 'only Winerim images');
  assert.deepEqual(parseWinerimDetail142(null).pairings, []); assert.equal(pairingLabel142('queso-curado'), 'Queso curado');
});
test('«Por qué encaja» is one sentence per trait with a face', () => {
  const lines = compatLines142([{ key: 'dulce', tone: 'positive', direction: 'aligned', wineValue: 1 }, { key: 'potente', tone: 'negative', direction: 'higher', wineValue: 5 },
    { key: 'acidez', tone: 'neutral', direction: 'lower', wineValue: 3 }, { key: 'otra', tone: 'positive', direction: 'aligned', wineValue: 1 }]);
  assert.deepEqual(lines.map(line => [line.face, line.text]), [['good', 'El dulzor es como te gusta'], ['far', 'Tiene más cuerpo de lo que sueles preferir'], ['fair', 'Es menos fresco de lo que sueles preferir, por poco']]);
});
test('One sheet: search, scan, saved wines and recommendations share the Winerim block; nothing frames the web', () => {
  assert.match(read('src/components/NativeSearchWine138.tsx'), /<WineSheet142 key=\{shown\.id\} row=\{shown\}/);
  assert.match(read('src/components/NativeWinerimFacts140.tsx'), /<WinerimRich142 row=\{row\}/);
  for (const file of ['src/components/NativeCellarItem98.tsx', 'src/components/WineCard.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx']) assert.match(read(file), /NativeWinerimFacts140 identity=[^>]*part="facts"/, file);
  for (const file of fs.readdirSync('src/components').filter(name => name.endsWith('.tsx') && name !== 'WinerimWebSheet141.tsx')) assert(!read('src/components/' + file).includes('<WinerimWebSheet141'), file);
  const sheet = read('src/components/WineSheet142.tsx');
  assert.match(sheet, /filter\(\(\[key\]\) => !\(key === 'tannin' && attributes\.tannin === 0\)\)/, 'no tannin bar where it does not apply');
});
test('Saving asks where: to try, already tasted (with how it was), or at home; never flavour data or training', () => {
  const save = read('src/components/NativeSaveChoice142.tsx');
  for (const text of ['Quiero probarlo', 'Ya lo he probado', 'Lo tengo en casa', '¿Qué te pareció?']) assert(save.includes(text), text);
  assert.match(save, /matchrim_affinity: null, sensory_attributes: null, use_for_profile_training: false/);
  assert.match(save, /status: place, quantity: place === 'collection' \? 1 : null, rating,/);
  assert.match(read('src/components/NativeHome98.tsx'), /data-testid="native-home-last-scan142"/);
});
console.log(`check-matchrim-ux142: ${groups}/4 groups passed`);
