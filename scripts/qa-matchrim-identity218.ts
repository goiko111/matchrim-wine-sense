import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { lookupWinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import { confirmedLabelCatalogIdentity95 } from '../src/utils/confirmedCatalogIdentity95';
import type { WineCandidate } from '../src/utils/multiWineScan';

const repo = process.cwd(), out = path.resolve(process.argv[2] ?? '');
assert(path.dirname(out) === path.join(repo, 'qa-artifacts/native218-20261025') && /^visual-r\d+$/.test(path.basename(out)) && !fs.existsSync(out));
const guard = () => {
  const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases['heavy-local'];
  assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && lease.leaseId === process.env.MATCHRIM102_HEAVY_LEASE_ID && lease.reviewAfter * 1000 > Date.now());
  const disk = fs.statfsSync(repo); assert(Number(disk.bavail) * Number(disk.bsize) >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
guard(); fs.mkdirSync(out, { mode: 0o700 });
const hash = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sources = Object.fromEntries(['src/utils/nativeIdentityCorrection218.ts', 'src/components/wine-import/NativeLabelIdentityEditor218.tsx',
  'src/components/wine-import/MultiWineLabelScanner.tsx', 'src/components/wine-import/LabelAnalysisView.tsx',
  'src/components/CellarWineAffinity.tsx', 'src/utils/labelScanSave.ts'].map(file => [file, hash(file)]));
const capture = JSON.parse(fs.readFileSync('qa-fixtures/consumer95/public-nv-catalogue.projected.json', 'utf8'));
const sheet = await lookupWinerimOriginalSheet({ name: 'Manzanilla La Gitana', producer: 'Bodegas Hidalgo La Gitana' }, undefined, async url => {
  const row = capture.reads.find((value: { url: string }) => value.url === String(url)); assert(row, 'NO_NETWORK_FALLBACK');
  return Response.json(row.body, { status: row.status });
}); assert(sheet.status === 'verified');
const profile = { potente: 2, acidez: 4, dulce: 1, tanico: 0, afrutado: 1 };
const seed: WineCandidate = { id: 'fixture218', name: 'Control', producer: null, vintage: null, region: null, country: null,
  grapes: [], alcohol: null, source: 'manual', confidence: 1, evidence: [], uncertaintyReasons: [], inferredFields: [] };
const known = confirmedLabelCatalogIdentity95(seed, sheet.sheet, profile)!; assert(known);
const entry = `import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
import{NativeLabelIdentityEditor218}from'/src/components/wine-import/NativeLabelIdentityEditor218.tsx';
import{LabelAnalysisView}from'/src/components/wine-import/LabelAnalysisView.tsx';import{NativeAffinitySummary}from'/src/components/NativeAffinitySummary.tsx';
import{CellarWineAffinity}from'/src/components/CellarWineAffinity.tsx';import{correctNativeIdentity218}from'/src/utils/nativeIdentityCorrection218.ts';
import{nativeWineConsumerResult}from'/src/utils/multiWineConsumer95.ts';import{saveLabelBatch}from'/src/utils/labelScanSave.ts';
import{makeCellarCatalogEvidence,withCellarInitialAffinity}from'/src/utils/bodegaAffinity.ts';import'/src/index.css';
const known=${JSON.stringify(known)},profile=${JSON.stringify(profile)};
const snapshot={profile,source:'quiz',samples:0,status:'ready',note:'Perfil controlado sin cuenta'};
function App(){const[wine,setWine]=React.useState(known),[editor,setEditor]=React.useState(false),[saved,setSaved]=React.useState(null),[writes,setWrites]=React.useState(0),[locked,setLocked]=React.useState(false);
const consumer=nativeWineConsumerResult(wine,profile);async function save(){const identity={name:wine.name,producer:wine.producer,vintage:wine.vintage,region:wine.region,country:wine.country};
const evidence=wine.sensorySource==='catalog'&&wine.canonicalId&&wine.sensoryAttributes?makeCellarCatalogEvidence(identity,wine.canonicalId,wine.sensoryAttributes):null;
const row={...identity,id:'controlled-save218',sensory_attributes:wine.sensoryAttributes,place_details:evidence?withCellarInitialAffinity({...identity,sensory_attributes:wine.sensoryAttributes,place_details:{bodega_sensory_evidence:evidence}},snapshot,'saved','2026-10-25T15:00:00Z',true):null};
const batch={ownerId:'synthetic218',wines:[{nombre:wine.name,productor:wine.producer,anada:wine.vintage}],results:[]};
const outcome=await saveLabelBatch(batch,async()=>{setWrites(c=>c+1);return{status:'saved',rowId:row.id,ownerId:'synthetic218'}},()=>true,()=>{});if(outcome==='confirmed')setSaved(row)}
return <main style={{padding:16,maxWidth:440,margin:'auto',overflowWrap:'anywhere'}}><h1 className="text-xl font-semibold">Vino seleccionado</h1>
<output className="sr-only" data-testid="writes">{writes}</output><output className="sr-only" data-testid="identity">{JSON.stringify([wine.name,wine.producer,wine.vintage])}</output>
<LabelAnalysisView isNativePlatform identity={wine} identityLabel={consumer.identityLabel} catalogIdentityLinked={consumer.catalogIdentityLinked}
canExplainAffinity={consumer.canExplainAffinity} hasProfile pendingAffinity={consumer.pending} lookup={null} disabled={locked} onFindSheet={()=>{}} onCorrect={()=>{setEditor(true);setTimeout(()=>document.getElementById('region-wine-name')?.focus(),0)}}
affinity={<NativeAffinitySummary score={wine.affinity} attributes={wine.sensoryAttributes} sensorySource={wine.sensorySource} profile={profile} catalogIdentityLinked={consumer.catalogIdentityLinked}/>}/>
{editor&&<NativeLabelIdentityEditor218 identity={wine} disabled={locked} onApply={next=>setWine(current=>correctNativeIdentity218(current,next)||current)}/>}
<div className="my-4 flex flex-wrap gap-2">{[['Volver a leer fixture',()=>{setWine(known);setEditor(false)}],['Guardar en bodega local',save],['Bloquear edición',()=>setLocked(v=>!v)],['Cambiar selección',()=>setWine({...known,id:'second218',name:'Segunda referencia controlada',producer:'Otra bodega'})]].map(([name,action])=><button key={name} type="button" className="min-h-11 min-w-0 border px-3 py-2 text-left" onClick={action}>{name}</button>)}</div>
{saved&&<section aria-label="Bodega local controlada"><h2 className="text-lg font-semibold">{saved.name}</h2><CellarWineAffinity wine={saved} snapshot={snapshot} resolving={false} onResolve={()=>{}} onRetryProfile={()=>{}}/></section>}</main>}
createRoot(document.getElementById('root')).render(<MemoryRouter><App/></MemoryRouter>);`;
let server: Awaited<ReturnType<typeof createServer>> | undefined;
let browser: { close(): Promise<void> } | undefined;
const checks: string[] = [], screenshots: string[] = [], errors: string[] = [];
const receipt: Record<string, unknown> = { startedUTC: new Date().toISOString(), passed: false, sources,
  scope: 'Actual native editor/label/affinity/cellar components plus real local save ledger, controlled retained/synthetic state. Not full app, UIKit, native OCR, remote saving, learning, 200-label recognition or TestFlight QA.', liveCalls: 0 };
try {
  server = await createServer({ root: repo, envDir: false, configFile: false, plugins: [{ name: 'identity218',
    resolveId(id) { if (id === '/identity218.jsx') return '\0identity218.jsx'; }, load(id) { if (id === '\0identity218.jsx') return entry; },
    configureServer(s) { s.middlewares.use(async (req, res, next) => {
      if (req.url === '/identity218') { res.setHeader('Content-Type', 'text/html'); res.end(await s.transformIndexHtml('/identity218', '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/identity218.jsx"></script></html>')); return; } next();
    }); },
  }, react()], resolve: { alias: { '@': path.join(repo, 'src') } }, server: { host: '127.0.0.1', port: 0 } });
  await server.listen(); const address = server.httpServer!.address(); assert(address && typeof address === 'object');
  const origin = 'http://127.0.0.1:' + address.port;
  const require = createRequire(import.meta.url), { chromium } = require('/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  const actual = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--disable-background-networking'] }); browser = actual;
  const context = await actual.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  await context.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin === origin) return route.continue(); errors.push('OUTBOUND_BLOCKED:' + url.origin); return route.abort(); });
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const capturePage = async (name: string) => { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true }); screenshots.push(name + '.png'); };
  const layout = async (width: number) => {
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'OVERFLOW');
    for (const control of await page.locator('button,input,a,summary').all()) {
      const box = await control.boundingBox(); assert(box && box.width >= 43.5 && box.height >= 43.5, 'TOUCH_TARGET');
      assert(box.x >= -1 && box.x + box.width <= width + 1, 'OUTSIDE_WIDTH'); await control.scrollIntoViewIfNeeded();
      const visible = await control.boundingBox(); assert(visible && visible.y >= -1 && visible.y + visible.height <= 853, 'UNREACHABLE_CONTROL');
    }
  };
  for (const [width, large] of [[320, false], [393, true]] as const) {
    guard(); await page.setViewportSize({ width, height: 852 }); await page.goto(origin + '/identity218'); await page.waitForLoadState('networkidle');
    if (large) await page.addStyleTag({ content: 'html{font-size:32px!important}' });
    await page.getByTestId('native-affinity-summary').waitFor(); const before = await page.getByTestId('identity').innerText();
    await page.getByRole('button', { name: 'Corregir identificación' }).click(); await page.getByLabel('Añada (opcional)').fill('2023');
    assert.equal(await page.getByTestId('identity').innerText(), before); assert.equal(await page.getByTestId('writes').innerText(), '0');
    assert(await page.getByRole('status').getByText('Cambios sin aplicar').isVisible()); await layout(width); await capturePage('draft-' + width);
    if (process.argv[3] === 'layout-only') {
      for (const name of ['Aplicar corrección', 'Descartar cambios']) {
        const box = await page.getByRole('button', { name }).boundingBox(); assert(box && box.height <= (large ? 120 : 80), 'EDITOR_BUTTON_WORD_FRAGMENTATION');
      }
      checks.push('stacked-editor-controls-' + width); continue;
    }
    await page.getByRole('button', { name: 'Descartar cambios' }).click(); assert.equal(await page.getByLabel('Añada (opcional)').inputValue(), '');
    await page.getByLabel('Añada (opcional)').fill('20xx'); await page.getByRole('button', { name: 'Aplicar corrección' }).click();
    assert(await page.getByRole('alert').isVisible()); assert(await page.getByLabel('Añada (opcional)').evaluate(el => el === document.activeElement));
    assert.equal(await page.getByTestId('identity').innerText(), before); await capturePage('invalid-' + width);
    await page.getByLabel('Añada (opcional)').fill('2023'); await page.getByRole('button', { name: 'Aplicar corrección' }).click();
    await page.getByTestId('native-label-next-step').waitFor(); assert.equal(await page.getByTestId('native-affinity-summary').count(), 0);
    assert((await page.getByTestId('identity').innerText()).includes('2023')); assert.equal(await page.getByTestId('writes').innerText(), '0');
    await layout(width); await capturePage('changed-harvest-' + width); checks.push('draft/cancel/invalid/apply/invalidation-' + width);
    await page.getByRole('button', { name: 'Guardar en bodega local' }).click(); await page.getByRole('region', { name: 'Bodega local controlada' }).waitFor();
    const cellar = page.getByRole('region', { name: 'Bodega local controlada' }); assert((await cellar.innerText()).includes('Por calcular'));
    assert.equal(await page.getByTestId('writes').innerText(), '1'); await capturePage('saved-without-old-score-' + width);
    await page.getByRole('button', { name: 'Volver a leer fixture' }).click(); await page.getByTestId('native-affinity-summary').waitFor();
    await page.getByRole('button', { name: 'Guardar en bodega local' }).click(); assert.equal(await page.getByTestId('writes').innerText(), '2');
    assert((await cellar.innerText()).includes('Al guardar:')); await layout(width); await capturePage('rescan-and-initial-' + width); checks.push('local-ledger/cellar/rescan-' + width);
    await page.getByRole('button', { name: 'Corregir identificación' }).click(); await page.getByLabel('Vino', { exact: true }).fill('V'.repeat(240));
    await page.getByRole('button', { name: 'Cambiar selección' }).click();
    await page.waitForFunction(() => document.querySelector<HTMLInputElement>('[name="correction-name"]')?.value === 'Segunda referencia controlada');
    assert.equal(await page.getByLabel('Vino', { exact: true }).inputValue(), 'Segunda referencia controlada');
    await page.getByLabel('Vino', { exact: true }).fill('V'.repeat(240)); await page.getByRole('button', { name: 'Aplicar corrección' }).click();
    await layout(width); await capturePage('long-name-' + width); await page.getByRole('button', { name: 'Bloquear edición' }).click();
    assert(await page.getByLabel('Añada (opcional)').isDisabled()); assert(await page.getByRole('button', { name: 'Aplicar corrección' }).isDisabled());
    checks.push('selection/MAX/long/locked-' + width);
  }
  assert.deepEqual(errors, []); for (const [file, expected] of Object.entries(sources)) assert.equal(hash(file), expected); receipt.passed = true;
} catch (error) { receipt.error = String(error); }
finally { await browser?.close(); await server?.close(); Object.assign(receipt, { finishedUTC: new Date().toISOString(), checks, screenshots, errors });
  fs.writeFileSync(path.join(out, 'RESULT.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
console.log(JSON.stringify(receipt, null, 2)); process.exitCode = receipt.passed ? 0 : 1;
