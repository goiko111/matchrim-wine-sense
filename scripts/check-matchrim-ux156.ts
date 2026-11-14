// 156: scales drawn as a dot inside a ring, a way out when Winerim lacks the wine, the wine list in the scan switch,
// store estimates in the several-bottles list, and the restaurant steps.
import fs from 'node:fs';
import { labelName156, labelYear156 } from '../src/utils/labelName156';
let failed = 0;
const ok = (name: string, pass: boolean, note = '') => { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${note ? ` — ${note}` : ''}`); if (!pass) failed += 1; };
const read = (file: string) => fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
const line = (text: string, height: number, confidence = 1) => ({ text, confidence, box: { x: 0.2, y: 0.2, width: 0.6, height } });
// The owner's bottle (14-nov): «La Nine», Charlotte & Jean Baptiste Sénat, Minervois 2023. Winerim's store has no such wine.
const nine = [line('LA NiNE', 0.09), line('MINERVOIS 2023', 0.03), line("APPELLATION D'ORIGINE CONTRÔLÉE", 0.02), line('CHARLOTTE JEAN BAPTISTE SENAT', 0.04), line('13% vol.', 0.02)];
ok('the label’s largest line is offered as the name', labelName156(nine) === 'La Nine', labelName156(nine));
ok('the year comes from the label; nothing is made up without one', labelYear156(nine) === '2023' && labelYear156([line('LA NINE', 0.09)]) === '' && labelName156([]) === '' && labelName156([line('2023', 0.2), line('ab', 0.3)]) === '');
const keep = read('components/wine-import/KeepUnlisted156.tsx'), recovery = read('components/wine-import/CandidateRecovery286.tsx'), save = read('components/NativeSaveChoice142.tsx');
ok('a wine Winerim lacks can be kept from the candidates sheet, open when nothing was found', recovery.includes("<KeepUnlisted156 reading={reading} open={decision.mode === 'none'} onSaved={onKept} />") && keep.includes("source: 'label'"));
ok('it is saved as read from the label: no store link, no flavour data, no training', save.includes("wine.source === 'label' ? { source: 'label_only' }") && save.includes('sensory_attributes: null, use_for_profile_training: false') && !/supabase|fetch\(/.test(keep));
const scale = read('components/Scale156.tsx'), sheet = read('components/WineSheet142.tsx'), profile = read('components/NativeProfileBody138.tsx');
ok('one scale: track, five marks, the wine as a dot and the person as an open ring', scale.includes('[0, 1.25, 2.5, 3.75, 5]') && scale.includes('rounded-full bg-red-800') && /border-\[3px\] border-stone-950"/.test(scale) && !/border-stone-950 bg-white/.test(scale));
ok('dot and ring share one centre rule, so equal values are concentric', (scale.match(/-translate-x-1\/2 -translate-y-1\/2/g) ?? []).length >= 4 && scale.includes('style={{ left: at(wine) }}') && scale.includes('style={{ left: at(you) }}'));
ok('wine sheet and profile draw with it', sheet.includes('<ScaleMarks156 wine={attributes[key]} you={you} />') && sheet.includes('<ScaleMarks156 wine={data.agingLevel} />') && sheet.includes('<ScaleLegend156 />') && profile.includes('<ScaleMarks156 you={row.value}'));
const cellar = read('components/NativeCellarItem98.tsx'), scanner = read('components/wine-import/MultiWineLabelScanner.tsx');
ok('a rated wine still shows how it fitted on paper', cellar.includes('data-testid="native-cellar-fit156"') && cellar.includes('const fit156 = wine.rating ?') && cellar.includes('Por tus gustos encajaba'));
ok('the scan switch names the wine list; the two reading modes stay pressed buttons', scanner.includes('data-testid="scan-list156"') && scanner.includes("navigate('/escanear/carta-vinos')") && scanner.includes("[['local-single', Smartphone, 'Una etiqueta'], ['cloud', ScanLine, 'Varias botellas']]") && scanner.includes('grid-cols-3'));
ok('several bottles: each row asks the store; no «referencia» left on screen', scanner.includes('<RowEstimate156 identity={group.candidate}') && scanner.includes('Toca un vino para ver si te gustará y guardarlo.') && !scanner.includes('Revisar una referencia'));
ok('restaurant: three numbered steps on iPhone', read('pages/Restaurant.tsx').includes('data-testid="restaurant-steps156"') && read('pages/Restaurant.tsx').includes('Fotografía la carta de platos'));
if (failed) { console.error(`${failed} FAILED`); process.exit(1); }
console.log('check-matchrim-ux156 OK');
