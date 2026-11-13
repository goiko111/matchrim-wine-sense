// 153: the relief reaches Escanear, Perfil, aiRIM and the recommended wines; the scan sheet saves right under the verdict.
import fs from 'node:fs';
let failed = 0;
const ok = (name: string, pass: boolean) => { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); if (!pass) failed += 1; };
const read = (file: string) => fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
const hub = read('components/NativeScanHub99.tsx'), profile = read('components/NativeProfileBody138.tsx'), airim = read('components/NativeAiRimChat99.tsx');
const card = read('components/WineCard.tsx'), summary = read('components/NativeAffinitySummary.tsx'), view = read('components/wine-import/LabelAnalysisView.tsx'), estimate = read('components/wine-import/NativeStoreEstimate139.tsx');
ok('Escanear: the camera is the one filled door, «Comida y vino» a card', (hub.match(/look="main"/g) ?? []).length === 1 && hub.includes('look="card"') && hub.includes('data-testid="native-scan-primary99"'));
ok('Escanear keeps the labels the native probe taps', hub.includes('Botellas y cartas · Una foto') && hub.includes('Comida y vinos del restaurante · Comida y vino') && hub.includes('aria-label="Más"'));
ok('Perfil: the sentence is the one dark block', (profile.match(/bg-red-950/g) ?? []).length === 1 && profile.includes('data-hero153') && profile.includes('aria-label="Tu paladar"'));
ok('Perfil: lists are lifted cards, not bordered boxes', profile.includes('${card150}') && !profile.includes('rounded-2xl border border-stone-200 bg-white'));
ok('aiRIM: the invitation is the dark block only while the chat is empty', airim.includes('data-hero153') && airim.includes("props.messages.every(item => item.id === 'welcome') ? 'rounded-b-2xl bg-red-950"));
ok('recommended wines: score tag, type dot and a bottle in the wine colour', card.includes('<ScorePill150 score={ready.score} />') && card.includes('<TypeDot150 type={wine.type} />') && card.includes('type={wine.type} identity='));
ok('the verdict offers a slot and both verdicts fill it', read('components/verdictSlot153.ts').includes('export const VerdictSlot153') && summary.includes('useVerdictSlot153(') && estimate.includes('useVerdictSlot153(') && summary.includes('data-testid="verdict-slot153"') && estimate.includes('data-testid="verdict-slot153"'));
ok('the scan sheet shows the save block once: under the verdict, or below when no verdict takes it', view.includes('<VerdictSlot153.Provider value={slot153}>') && view.includes('slotTaken153 === 0 && (canExplainAffinity || estimate)') && view.includes('useCallback('));
if (failed) { console.error(`${failed} FAILED`); process.exit(1); }
console.log('check-matchrim-ux153 OK');
