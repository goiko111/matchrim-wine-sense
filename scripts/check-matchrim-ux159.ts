// 159 (owner, 19-nov, «mete las cuatro»): two questions before the taste test, a wine as the app shows it inside the
// tour, photographs of places instead of icons, and two «what this is for» screens inside the test.
// Offline. Run: npx tsx scripts/check-matchrim-ux159.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { firstScan159 } from '../src/utils/intent159';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');

test('The two questions are optional, stay on the phone and only reword the first scan', () => {
  const util = read('src/utils/intent159.ts'), cover = read('src/components/QuizIntro.tsx'), ask = read('src/components/NativeIntent159.tsx');
  assert(!/supabase|fetch\(/.test(util + ask), 'never sent anywhere');
  assert.match(cover, /<NativeIntent159 ownerId=\{ownerId \?\? null\} \/>\n\s+<Button type="button" onClick=\{onStart\}/, 'the start button does not depend on them');
  for (const label of ['Elegir en el restaurante', 'Comprar para casa', 'Acertar con un regalo', 'Solo curiosidad', 'Poca', 'Algo', 'Bastante']) assert(ask.includes(`'${label}'`), label);
  assert.equal(firstScan159('restaurant').title, 'Fotografía la carta del restaurante');
  assert.equal(firstScan159('home').title, 'Escanea una botella en la tienda');
  assert.equal(firstScan159(undefined).title, 'Escanea tu primer vino');
  for (const goal of ['restaurant', 'home', 'gift', 'curious', undefined] as const) assert.equal(firstScan159(goal).to, '/escanear/etiqueta');
  assert(read('src/components/NativeFirstSteps158.tsx').includes('...firstScan159(readIntent159(ownerId).goal)'));
});

test('The tour shows places and one wine marked as an example', () => {
  const guide = read('src/components/MatchrimQuickGuide.tsx');
  assert(guide.includes("src={[brindis159, '', tienda159, '', casa159, restaurante159][step]}"));
  const example = guide.slice(guide.indexOf('data-testid="tour-example159"'), guide.indexOf('data-testid="tour-photo159"'));
  assert(example.includes('>Ejemplo</p>') && example.includes('Un rioja crianza') && example.includes('Muy de tu estilo'));
  assert(!/CVNE|Imperial|Tondonia|Vega Sicilia/.test(example), 'no real wine is given a score');
  for (const name of ['brindis', 'tienda', 'casa', 'restaurante']) assert(fs.statSync(`src/assets/tour159/${name}.jpg`).size < 120_000, name);
  assert.equal((read('docs/MATCHRIM_157_FOTOS.md').match(/https:\/\/www\.pexels\.com\/photo\/[a-z0-9-]+-\d+\//g) ?? []).length >= 5, true, 'credits');
});

test('The test stops twice to say what it is for, once each, and a new test starts clean', () => {
  const page = read('src/pages/Matchrim.tsx'), pause = read('src/components/QuizBreak159.tsx');
  assert.match(pause, /QUIZ_BREAKS159: Record<number, [^>]+> = \{\n\s+7: \{[^\n]+\n\s+14: \{/);
  assert.match(page, /if \(isNative && QUIZ_BREAKS159\[next\] && !breaksSeen159\.current\.has\(next\)\) \{ breaksSeen159\.current\.add\(next\); setBreak159\(next\); \}/);
  assert(page.includes("{currentStep === 'quiz' && break159 === null && ("), 'the question waits behind the pause');
  assert(page.includes('if (currentQuestionIndex === 0) breaksSeen159.current.clear();'));
  assert(!/answers|profile\b/.test(pause.replace(/\/\/[^\n]*/g, '').replace(/'[^']*'/g, '')), 'the pause computes nothing from the answers');
});

console.log(`check-matchrim-ux159: ${groups}/3 groups`);
