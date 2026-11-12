// 150: a label on its side is read turned, and the pieces that give the screens relief.
import fs from 'node:fs';
import { linesRunDown150, readingWeight150, readLabelAnyWay150, turnBox150, worthTurning150 } from '../src/utils/labelTurn150';
import { scoreTone150, wineTone150 } from '../src/components/Relief150';

let failed = 0;
const ok = (name: string, pass: boolean, note = '') => { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${note ? ` — ${note}` : ''}`); if (!pass) failed += 1; };
const line = (text: string, confidence: number, box: [number, number, number, number]) => ({ text, confidence, box: { x: box[0], y: box[1], width: box[2], height: box[3] } });
const reading = (lines: ReturnType<typeof line>[], width = 1400, height = 1000) => ({ lines, width, height });

// What the phone's reader gave for the owner's lying bottle (measured with the same reader on the video frame).
const upright = reading([line('VINEA NOCTIS', 0.5, [0.45, 0.3, 0.1, 0.37])]);
const clockwise = reading([line('VINEA NOCTIE', 1, [0.3, 0.45, 0.37, 0.1])], 1000, 1400);
const anticlockwise = reading([line('VINEA NOCTIS', 1, [0.33, 0.45, 0.37, 0.1]), line('Seisivn s', 0.3, [0.1, 0.9, 0.14, 0.02])], 1000, 1400);
const normal = reading([line('RAMÓN BILBAO', 1, [0.2, 0.3, 0.6, 0.08]), line('Crianza 2019', 1, [0.3, 0.42, 0.4, 0.05])], 1000, 1400);

ok('a normal label is not turned', !worthTurning150(normal) && !linesRunDown150(normal));
ok('a label on its side is turned', worthTurning150(upright) && linesRunDown150(upright), `peso ${readingWeight150(upright)}`);
{
  let reads = 0;
  const result = await readLabelAnyWay150('up', async image => { reads += 1; return image === 'up' ? normal : clockwise; }, async () => 'turned');
  ok('a normal photo is read once', reads === 1 && result.turned === 0 && result.image === 'up');
}
{
  const seen: string[] = [];
  const result = await readLabelAnyWay150('up', async image => { seen.push(image); return image === 'up' ? upright : image === 't1' ? clockwise : anticlockwise; }, async (_, turns) => `t${turns}`);
  const texts = result.reading.lines.map(value => value.text);
  ok('the lying bottle is read three ways', seen.join() === 'up,t1,t3');
  ok('the turned reading wins and its photo is kept', result.turned === 1 && result.image === 't1');
  ok('the lines only the other turn saw are kept (the right spelling)', texts.includes('VINEA NOCTIE') && texts.includes('VINEA NOCTIS'), texts.join(' | '));
  ok('added boxes stay inside the photo', result.reading.lines.every(value => value.box.x >= 0 && value.box.y >= 0 && value.box.x + value.box.width <= 1.001 && value.box.y + value.box.height <= 1.001));
}
{
  const result = await readLabelAnyWay150('up', async image => image === 'up' ? upright : reading([]), async () => null);
  ok('a turn that cannot be drawn leaves the first reading', result.turned === 0 && result.reading === upright);
  let threw = false;
  try { await readLabelAnyWay150('up', async image => { if (image !== 'up') throw new DOMException('Cancelled', 'AbortError'); return upright; }, async () => 't'); } catch (error) { threw = (error as Error).name === 'AbortError'; }
  ok('cancelling during a turn cancels the scan', threw);
}
{
  const box = { x: 0.1, y: 0.2, width: 0.3, height: 0.05 };
  const round = turnBox150(turnBox150(box, 1), 3);
  ok('a quarter there and back is the same box', Math.abs(round.x - box.x) < 1e-9 && Math.abs(round.y - box.y) < 1e-9 && round.width === box.width);
  const half = turnBox150(box, 2);
  ok('half a turn mirrors the box', Math.abs(half.x - 0.6) < 1e-9 && Math.abs(half.y - 0.75) < 1e-9);
}
ok('four score levels', new Set([90, 70, 50, 30].map(scoreTone150)).size === 4 && scoreTone150(80) === scoreTone150(95) && scoreTone150(65) === scoreTone150(79));
ok('wine colours by type', wineTone150('Tinto').label === 'Tinto' && wineTone150('rosado').label === 'Rosado' && wineTone150('Espumoso').label === 'Espumoso'
  && wineTone150('blanco').label === 'Blanco' && wineTone150('fortificado').label === 'Generoso' && wineTone150(null).label === '' && wineTone150('sidra').label === '');
const read = (file: string) => fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
const scanner = read('components/wine-import/MultiWineLabelScanner.tsx'), recovery = read('components/wine-import/CandidateRecovery286.tsx'), css = read('index.css');
ok('the single-label scan reads any way round', scanner.includes('readLabelAnyWay150(prepared.dataUrl'));
ok('the mode choice is a switch, with both modes still buttons that say if they are on', scanner.includes('data-testid="scan-mode150"') && scanner.includes("aria-pressed={scanMode === mode}")
  && scanner.includes("'Una etiqueta'") && scanner.includes("'Varias botellas'"));
ok('while searching, the list hides its search box and marks itself busy', recovery.includes('data-busy150={busy || linking || undefined}') && recovery.includes('{!searching150 && <form'));
ok('the sheet hides the extra buttons while busy', css.includes(':has([data-busy150])') && css.includes('[data-needs-candidates150]'));
ok('no photo draws a bottle, not «Sin foto» in a grey box', read('components/NativeWinePhoto98.tsx').includes('<Bottle150 type={type} />'));
ok('Home: one filled door and coloured scores', read('components/NativeHome98.tsx').includes('data-main150') && read('components/NativeHome98.tsx').includes('<ScorePill150'));
if (failed) { console.error(`${failed} FAILED`); process.exit(1); }
console.log('check-matchrim-ux150 OK');
