// 137: usability pass as first-time users (answer first after a scan, everyday wording, guided restaurant flow,
// Home that says what the app is for). Offline, no network. Run: npx tsx scripts/check-matchrim-ux137.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildConsumerAffinity } from '../src/utils/consumerAffinity95';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');

test('Affinity reasons describe the wine in everyday words; a low tannin is never the first reason', () => {
  const profile = { potente: 2, acidez: 4.5, dulce: 1, tanico: 1, afrutado: 4 };
  const white = buildConsumerAffinity({ score: 90, catalogIdentityLinked: true, sensorySource: 'catalog', profile,
    attributes: { scale: 'winerim-0-5', power: 2, acidity: 4.5, sweetness: 1, tannin: 1, fruity: 4 } as never });
  assert.equal(white.state, 'ready');
  if (white.state !== 'ready') return;
  assert.equal(white.matches.length, 2);
  assert(white.matches.every(text => !/taninos? están cerca|cerca de tu gusto/.test(text)), white.matches.join(' | '));
  assert(!/aspereza|tanino/.test(white.matches[0]), white.matches[0]);
  const source = read('src/utils/consumerAffinity95.ts');
  for (const phrase of ['Es fresco, con la acidez viva que te gusta.', 'Es seco, como sueles preferir.', 'Es suave en boca, sin aspereza, como prefieres.'])
    assert(source.includes(phrase), phrase);
});
test('Home says what the app is for and puts the three scans one tap away', () => {
  const home = read('src/components/NativeHome98.tsx');
  assert.match(home, /¿Te va a gustar ese vino\?/);
  for (const route of ['/escanear/etiqueta', '/escanear/carta', '/restaurante']) assert(home.includes(`['${route}',`), route);
  assert.match(home, /!hasProfile \? <div[^>]*data-testid="native-home-taste137"/);
  assert.match(home, /aria-label="Conocer mis gustos" onClick=\{\(\) => navigate\('\/matchrim'\)\}/, 'native probe name kept');
  assert.doesNotMatch(home, /por estilo/);
});
test('A scanned bottle opens its verdict; several open the list; one bottle saves in one tap', () => {
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.match(scanner, /setNativeResultView\('wines'\);\n\s+if \(regions\.length === 1 && nativeReviewTarget\) setSelectedRegionId\(current => current \?\? nativeReviewTarget\.id\);/);
  assert.match(scanner, /if \(saveSingle137\) void confirmBatch\(\);/);
  assert.match(scanner, /'Guardar este vino en Por probar'/);
  for (const jargon of ['Lote listo para revisar', 'Leyendo cada región por separado', 'Hay referencias disponibles para confirmar', "['scene', 'Escena']"])
    assert(!scanner.includes(jargon), jargon);
  const probe = read('scripts/MatchrimOffline220.swift');
  assert(probe.includes('app.buttons["Ver si me gustará"]') && !probe.includes('app.buttons["Revisar vinos"]'), 'gate probe follows the renamed control');
});
test('A scanned wine list shows the best match first, with its price', () => {
  const menu = read('src/components/wine-import/WineMenuScanner.tsx');
  const results = menu.indexOf('<div ref={resultsRef}'), decision = menu.indexOf('data-testid="native-menu-decision"'), heading = menu.indexOf("'Vinos de la carta'");
  assert(results > 0 && decision > results && decision < heading, 'decision precedes the list heading');
  assert.match(menu, /El que más encaja contigo de esta carta/);
  assert.match(menu, /listPriceText\(menuDecision\.best\.wine, menuDecision\.best\.index\)/);
  assert(!menu.includes('lecturas para revisar') && !menu.includes("'Lecturas de la carta'"));
});
test('Restaurant: a photo is read at once and each step leads to the next', () => {
  const page = read('src/pages/Restaurant.tsx');
  assert.match(page, /if \(readAfter && user && mounted\.current && !controller\.signal\.aborted && !errors\.length\) void analyze\(kind\);/);
  assert.match(page, /addFiles\(files, tab, files\.every\(file => file\.type\.startsWith\('image\/'\)\)\)/);
  assert.match(page, /if \(toPairs && foods\.length && wines\.length && !state\.pairs\.length\) void compare\(\);/);
  assert.match(page, /tabTitles137 = \{ food: '1 · Platos', wine: '2 · Vinos', pairs: '3 · Maridajes' \}/);
  for (const jargon of ['Eliminar sesión', 'Analizar pendientes', 'lectura de IA sin confirmar', 'Lecturas para revisar', 'Posibles fricciones'])
    assert(!page.includes(jargon), jargon);
});
test('First steps explain themselves: quiz intro, aiRIM examples, readable passport, profile in words', () => {
  assert.match(read('src/components/QuizIntro.tsx'), /No hace falta saber de vino\./);
  const chat = read('src/components/NativeAiRimChat99.tsx');
  assert.match(chat, /data-testid="airim-examples137"/);
  assert.match(chat, /onClick=\{\(\) => props\.onInput\(example\)\}/, 'an example fills the box; the person still sends it');
  assert.match(read('src/pages/UseMatchrim.tsx'), /\[html\.matchrim-native-platform_&\]:bg-white/);
  assert.match(read('src/pages/Profile.tsx'), /data-testid="profile-taste-words137">En pocas palabras: te gustan los vinos/);
});

console.log(`Matchrim UX 137: ${groups}/6 PASS`);
