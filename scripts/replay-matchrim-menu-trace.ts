import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolveMenuTileResults, type MenuTileResult } from '../src/utils/wineMenuScan';
import { isWineMenuItem } from '../src/utils/wineMenuGrounding';

const [tracePath, baselineModule] = process.argv.slice(2);
if (!tracePath) throw new Error('Usage: tsx scripts/replay-matchrim-menu-trace.ts trace.json [baseline-wineMenuScan.ts]');
const calls = JSON.parse(readFileSync(tracePath, 'utf8'));
const results: MenuTileResult[] = calls
  .filter((call: { status: number; request_payload?: { scan_region?: unknown } }) => call.status === 200 && call.request_payload?.scan_region)
  .map((call: { request_payload: { scan_region: MenuTileResult['tile'] }; payload: MenuTileResult['response'] }) => ({
    tile: call.request_payload.scan_region,
    response: call.payload,
  }));
const summarize = (resolver: typeof resolveMenuTileResults) => {
  const wines = (resolver(results).vinos ?? []).filter(isWineMenuItem);
  return {
    count: wines.length,
    wines: wines.map((wine) => ({ name: wine.nombre, producer: wine.productor, vintage: wine.anada,
      confidence: wine.confidence, affinity: wine.compatibilidad ?? null, doubts: wine.dudas ?? [] })),
  };
};
const before = baselineModule ? summarize((await import(pathToFileURL(baselineModule).href)).resolveMenuTileResults) : null;
console.log(JSON.stringify({
  scope: 'Offline client replay of recorded provider responses; no new vision request, no independent accuracy validation',
  successfulRegions: results.length,
  before,
  after: summarize(resolveMenuTileResults),
}, null, 2));
