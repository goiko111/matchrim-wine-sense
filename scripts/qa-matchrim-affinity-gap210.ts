import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nativeWineConsumerResult } from '../src/utils/multiWineConsumer95';
import { confirmedLabelCatalogIdentity95 } from '../src/utils/confirmedCatalogIdentity95';
import { lookupWinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import type { WineCandidate } from '../src/utils/multiWineScan';

const repo = process.cwd(), out = path.resolve(process.argv[2] ?? '');
assert(path.dirname(out) === path.join(repo, 'qa-artifacts/affinity210-20261025') && /^visual-r\d+$/.test(path.basename(out)) && !fs.existsSync(out));
const guard = () => {
  const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases['heavy-local'];
  assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && lease.leaseId === process.env.MATCHRIM102_HEAVY_LEASE_ID && lease.reviewAfter * 1000 > Date.now());
  const disk = fs.statfsSync(repo); assert(Number(disk.bavail) * Number(disk.bsize) >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
guard(); fs.mkdirSync(out, { mode: 0o700 });
const sourceFiles = ['src/utils/multiWineConsumer95.ts', 'src/components/wine-import/LabelAnalysisView.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx'];
const hash = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sources = Object.fromEntries(sourceFiles.map(file => [file, hash(file)]));
const cached = JSON.parse(fs.readFileSync('qa-fixtures/consumer95/public-nv-catalogue.projected.json', 'utf8'));
const result = await lookupWinerimOriginalSheet({ name: 'Manzanilla La Gitana', producer: 'Bodegas Hidalgo La Gitana' }, undefined, async url => {
  const value = cached.reads.find((row: { url: string }) => row.url === String(url)); assert(value, 'NO_LIVE_FALLBACK');
  return Response.json(value.body, { status: value.status });
});
assert(result.status === 'verified');
const profile = { potente: 2, acidez: 4, dulce: 1, tanico: 0, afrutado: 1 };
const candidate: WineCandidate = { id: 'qa210', name: 'Referencia de prueba', producer: 'Productor de prueba', vintage: null,
  source: 'manual', confidence: 0, evidence: [], inferredFields: [], uncertaintyReasons: [], region: null, country: null, grapes: [], alcohol: null };
const known = confirmedLabelCatalogIdentity95(candidate, result.sheet, profile)!;
const cases = [
  { id: 'identity', wine: { ...candidate, name: 'Etiqueta por identificar', producer: null, vintage: 2023, source: 'label' as const }, profile },
  { id: 'link', wine: candidate, profile },
  { id: 'profile', wine: known, profile: null },
  { id: 'profile-partial', wine: known, profile: { ...profile, acidez: NaN } },
  { id: 'sensory', wine: confirmedLabelCatalogIdentity95(candidate, { ...result.sheet, sensoryAttributes: null }, profile)!, profile },
  { id: 'score', wine: { ...known, affinity: known.affinity! - 1 }, profile },
].map(item => ({ ...item, consumer: nativeWineConsumerResult(item.wine, item.profile) }));
const sourcePhoto = 'qa-artifacts/example207-20261025/source/user-label.jpeg';
assert.equal(hash(sourcePhoto), '109348469c88dbdc7c7cfdc3cd00c435e53d887687d6460548dcc6f8468f66a0');
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useLocation}from'react-router-dom';
import{LabelAnalysisView}from'/src/components/wine-import/LabelAnalysisView.tsx';import'/src/index.css';
const cases=${JSON.stringify(cases)};const mode=new URLSearchParams(location.search).get('mode');const item=cases.find(c=>c.id===mode)||cases[0];
function App(){const route=useLocation();const[count,setCount]=React.useState(0);return <main style={{padding:16,maxWidth:440,margin:'auto'}}>
<output className="sr-only" data-testid="route210">{route.pathname}</output><output className="sr-only" data-testid="actions210">{count}</output>
{item.id==='identity'&&<img src="/photo210.jpg" alt="Foto de prueba aportada" style={{width:'100%',height:200,objectFit:'contain',background:'#f5f5f5'}}/>}
<LabelAnalysisView isNativePlatform identity={item.wine} identityLabel={item.consumer.identityLabel} catalogIdentityLinked={item.consumer.catalogIdentityLinked}
canExplainAffinity={false} hasProfile={!!item.profile} pendingAffinity={item.consumer.pending} affinity={null} lookup={null} disabled={false}
onFindSheet={()=>setCount(c=>c+1)} onCorrect={()=>setCount(c=>c+1)}/></main>}
createRoot(document.getElementById('root')).render(<MemoryRouter><App/></MemoryRouter>);`;
let server: Awaited<ReturnType<typeof createServer>> | undefined;
let browser: { close(): Promise<void> } | undefined;
const checks: string[] = [], screenshots: string[] = [], errors: string[] = [];
const receipt: Record<string, unknown> = { startedUTC: new Date().toISOString(), passed: false, sources,
  catalogueCalls: 0, models: 0, scope: 'Actual native LabelAnalysisView in isolated mobile Chromium, controlled retained/synthetic inputs. Not full scanner E2E, UIKit, visual recognition, external research or TestFlight QA.' };
try {
  server = await createServer({ root: repo, envDir: false, configFile: false, plugins: [{ name: 'gap210-entry',
    resolveId(id) { if (id === '/gap210.jsx') return '\0gap210.jsx'; },
    load(id) { if (id === '\0gap210.jsx') return entry; },
    configureServer(s) { s.middlewares.use(async (req, res, next) => {
      if (req.url?.startsWith('/gap210?')) { res.setHeader('Content-Type', 'text/html'); res.end(await s.transformIndexHtml('/gap210', '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/gap210.jsx"></script></html>')); return; }
      if (req.url === '/photo210.jpg') { res.setHeader('Content-Type', 'image/jpeg'); res.end(fs.readFileSync(sourcePhoto)); return; }
      next();
    }); },
  }, react()], resolve: { alias: { '@': path.join(repo, 'src') } }, server: { host: '127.0.0.1', port: 0 } });
  await server.listen(); const address = server.httpServer!.address(); assert(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;
  const require = createRequire(import.meta.url);
  const { chromium } = require('/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  const actualBrowser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--disable-background-networking'] }); browser = actualBrowser;
  const context = await actualBrowser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  await context.route('**/*', (route: { request(): { url(): string }; continue(): Promise<void>; abort(): Promise<void> }) => {
    const url = new URL(route.request().url()); if (url.origin === origin) return route.continue();
    errors.push('OUTBOUND_BLOCKED:' + url.origin); return route.abort();
  });
  await context.routeWebSocket('**/*', (socket: { close(): void }) => socket.close());
  const page = await context.newPage();
  page.on('pageerror', (error: Error) => errors.push(error.message));
  page.on('console', (message: { type(): string; text(): string }) => { if (message.type() === 'error') errors.push(message.text()); });
  for (const [width, large] of [[320, false], [393, true]] as const) {
    await page.setViewportSize({ width, height: 852 });
    for (const item of cases.filter(item => process.argv[3] === 'actions' ? ['profile-partial', 'sensory', 'score'].includes(item.id)
      : process.argv[3] === 'identity' ? item.id === 'identity' : true)) {
      guard(); await page.goto(origin + '/gap210?mode=' + item.id); await page.waitForLoadState('networkidle');
      if (large) await page.addStyleTag({ content: 'html{font-size:32px!important}' });
      const section = page.getByTestId('native-label-next-step'); await section.waitFor();
      assert((await section.innerText()).includes(item.consumer.pending!.title));
      assert((await section.innerText()).includes(item.consumer.pending!.nextStep));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'HORIZONTAL_OVERFLOW');
      for (const control of await page.locator('button,a').all()) {
        const box = await control.boundingBox(); assert(box && box.width >= 43.5 && box.height >= 43.5, 'TOUCH_TARGET');
        assert(box.x >= -1 && box.x + box.width <= width + 1, 'CONTROL_OUTSIDE_VIEWPORT');
        await control.scrollIntoViewIfNeeded(); const visible = await control.boundingBox(); assert(visible && visible.y >= -1 && visible.y + visible.height <= 853, 'CONTROL_NOT_REACHABLE');
      }
      if (item.id === 'identity') assert(await page.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0));
      await page.evaluate(() => window.scrollTo(0, 0));
      const name = `${item.id}-${width}${large ? '-max' : ''}.png`; await page.screenshot({ path: path.join(out, name), fullPage: true }); screenshots.push(name);
      await page.getByRole('button', { name: 'Corregir identificación' }).click(); assert.equal(await page.getByTestId('actions210').innerText(), '1');
      if (item.id.startsWith('profile')) { await page.getByRole('link', { name: 'Completar mi test', exact: true }).click(); assert.equal(await page.getByTestId('route210').innerText(), '/matchrim'); }
      if (['sensory', 'score'].includes(item.id)) { await page.getByRole('button', { name: 'Revisar ficha', exact: true }).click(); assert.equal(await page.getByTestId('actions210').innerText(), '2'); }
      checks.push(name);
    }
  }
  assert.deepEqual(errors, []); for (const [file, expected] of Object.entries(sources)) assert.equal(hash(file), expected);
  receipt.passed = true;
} catch (error) { receipt.error = String(error); }
finally { await browser?.close(); await server?.close(); Object.assign(receipt, { finishedUTC: new Date().toISOString(), checks, screenshots, errors });
  fs.writeFileSync(path.join(out, 'RESULT.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
