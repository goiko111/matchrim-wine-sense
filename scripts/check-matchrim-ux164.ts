// 164: a wine that changes in the glass, the Matchrim style word, the aromas game and the Winerim map.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readEvolution164, evolutionAdvice164, evolutionPattern164, EVOLUTION_KEY164 } from '../src/utils/evolution164';
import { matchRegion164, nearby164, tastedMap164, mapUrl164, type Region164 } from '../src/utils/wineMap164';

let passed = 0; const ok = (name: string, run: () => void) => { run(); passed += 1; console.log(`  ✓ ${name}`); };
const regions: Region164[] = (JSON.parse(fs.readFileSync('src/assets/map164/regions164.json', 'utf8')) as Array<[string, string, string, 0 | 1 | 2, string, number, number, number]>)
  .map(([name, country, deeplink, tier, parent, lon, lat, extent]) => ({ name, country, deeplink, tier, parent, lon, lat, extent }));

ok('evolution is read only from its own key and only two values', () => {
  assert.equal(readEvolution164({ [EVOLUTION_KEY164]: 'better' }), 'better');
  assert.equal(readEvolution164({ [EVOLUTION_KEY164]: 'meh' }), null);
  assert.equal(readEvolution164(null), null); assert.equal(readEvolution164([]), null);
  assert.match(evolutionAdvice164('better')!, /dale tiempo/); assert.equal(evolutionAdvice164(null), null);
});
ok('a pattern is said only when it repeats', () => {
  const wine = (value: string | null) => ({ place_details: value ? { [EVOLUTION_KEY164]: value } : {} });
  assert.equal(evolutionPattern164([wine('better'), wine(null)]), null);
  assert.match(evolutionPattern164([wine('better'), wine('better'), wine('worse')])!, /2 vinos te han gustado más/);
  assert.equal(evolutionPattern164([wine('better'), wine('better'), wine('worse'), wine('worse')]), null);
});
ok('a wine region text finds its zone on the map', () => {
  assert.equal(matchRegion164(regions, 'Rioja', 'ES')?.deeplink, 'rioja');
  assert.equal(matchRegion164(regions, 'D.O. Toro', 'España')?.deeplink, 'toro');
  assert.equal(matchRegion164(regions, 'Rioja Alavesa', 'ES')?.parent, 'Rioja');
  assert.equal(matchRegion164(regions, 'DOCa Rioja, Rioja Alta', 'ES')?.name.startsWith('Rioja'), true);
  assert.equal(matchRegion164(regions, 'Ribera del Duero', null)?.deeplink, 'ribera-del-duero');
  assert.equal(matchRegion164(regions, 'Zona inventada', 'ES'), null);
  assert.equal(matchRegion164(regions, 'Rioja', 'FR'), null);
  assert.equal(mapUrl164({ deeplink: 'rioja-alavesa' }), 'https://map.winerim.wine/?region=rioja-alavesa');
});
ok('neighbouring denominations are near and exclude the known ones', () => {
  const rioja = matchRegion164(regions, 'Rioja', 'ES')!;
  const near = nearby164(regions, rioja);
  assert.equal(near.length, 3); assert(near.every(region => region.tier === 1 && region.deeplink !== 'rioja'));
  assert(near.some(region => region.name === 'Navarra'));
  const without = nearby164(regions, rioja, new Set([near[0].deeplink]));
  assert(!without.some(region => region.deeplink === near[0].deeplink));
  console.log('    vecinas de Rioja:', near.map(region => region.name).join(', '));
});
ok('the tasted map counts rated wines by zone and proposes what is next to the favourite', () => {
  const result = tastedMap164(regions, [{ region: 'Rioja', country: 'ES', rating: 'love' }, { region: 'Rioja', country: 'ES', rating: 'ok' },
    { region: 'Toro', country: 'ES', rating: 'not_for_me' }, { region: 'Rioja', country: 'ES', rating: null }, { region: null, rating: 'love' }]);
  assert.deepEqual(result.tasted.map(zone => [zone.region.deeplink, zone.wines, zone.loved, zone.disliked]), [['rioja', 2, 1, 0], ['toro', 1, 0, 1]]);
  assert.equal(result.favourite?.region.deeplink, 'rioja');
  assert(result.next.length > 0 && !result.next.some(region => ['rioja', 'toro'].includes(region.deeplink)));
});
ok('the pieces are wired into the app', () => {
  const read = (file: string) => fs.readFileSync(file, 'utf8');
  assert.match(read('src/pages/MyWines.tsx'), /CellarEvolution164 value=\{readEvolution164\(wine\.place_details\)\}/);
  assert.match(read('src/components/wine-import/MultiWineLabelScanner.tsx'), /native-rescan-evolution164/);
  assert.match(read('src/components/WineSheet142.tsx'), /style-word164/);
  assert.match(read('src/components/WineSheet142.tsx'), /WineOrigin164 region=\{row\.region\}/);
  assert.match(read('src/components/FlavourCards157.tsx'), /aromas-game164/);
  assert.match(read('src/components/NativeProfileBody138.tsx'), /TastedMap164 wines=\{ratedZones\}/);
  assert.match(read('src/utils/styleWord164.ts'), /from\('wine_styles'\)/);
});
console.log(`check-matchrim-ux164: ${passed}/6`);
