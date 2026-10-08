import { readFileSync, writeFileSync } from 'node:fs';
import { isWineMenuItem } from '../src/utils/wineMenuGrounding';

const report = JSON.parse(readFileSync('../live-independent25/report.json', 'utf8'));
const scenes = report.results.filter((result: {mode: string}) => result.mode === 'carta-vinos').map((result: {
  fixture: string; backend: {items: {name: string; producer?: string; source_text?: string; type?: string}[]};
}) => {
  const items = result.backend.items || [];
  const accepted = items.filter(item => isWineMenuItem({
    nombre: item.name, productor: item.producer, texto_fuente: item.source_text, tipo: item.type,
  }));
  return { scene: result.fixture, before: items, after: accepted, rejected: items.filter(item => !accepted.includes(item)) };
});
writeFileSync('../menu-grounding-replay.json', JSON.stringify({
  scope: 'offline replay of real recorded backend items, not a new model run or independent holdout',
  providerCalls: 0, scenes,
}, null, 2));
console.log(scenes.map((scene: {scene: string;before: unknown[];after: unknown[];rejected: unknown[]}) => ({
  scene: scene.scene, before: scene.before.length, after: scene.after.length, rejected: scene.rejected.length,
})));
