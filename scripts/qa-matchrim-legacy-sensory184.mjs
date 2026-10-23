import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';

const repo = process.cwd(), out = path.resolve(process.argv[2] || 'qa-artifacts/continuation184-20261023/visual-r1');
const guard = () => {
  const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
  for (const [resource, env] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']])
    assert(leases[resource]?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d'
      && leases[resource].leaseId === process.env[env] && leases[resource].reviewAfter * 1000 > Date.now());
  const disk = fs.statfsSync(repo); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
guard(); assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true, mode: 0o700 });
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
import{GlobalWineReference103}from'/src/components/wine-import/NativeGlobalCatalogue103.tsx';
import{CellarWineAffinity}from'/src/components/CellarWineAffinity.tsx';
import{createGlobalCatalogue103,applyGlobalCatalogue103}from'/src/utils/nativeGlobalCatalogue103.ts';
import{makeCellarCatalogEvidence,withCellarInitialAffinity}from'/src/utils/bodegaAffinity.ts';import'/src/index.css';
const candidate={id:'synthetic184',name:'Vidure',producer:'Pago de Cirsus',vintage:2020,region:null,country:null,grapes:[],alcohol:null,confidence:.8,source:'label',evidence:['VIDURE','Pago de Cirsus','2020'],uncertaintyReasons:[],inferredFields:[]};
const profile={potente:3,acidez:3,dulce:3,tanico:3,afrutado:3},snapshot={profile,source:'quiz',samples:0,status:'ready',note:'Perfil sintético de QA'};
const row={id:91000001,name:'Vidure',winery:'Pago de Cirsus',vintage:'2020',slugname:'synthetic-vidure',photo:'/bottle184.png',tastingAttributes:{power:3,acidity:3,sweetness:3,tannin:3,fruity:3}};
let reads=0;const result=await createGlobalCatalogue103(async()=>Response.json(++reads===1?{count:1,page:1,results:[row]}:row)).lookup(candidate);
if(!('wine'in result))throw Error('FIXTURE_LOOKUP');
const wine=applyGlobalCatalogue103(candidate,profile,result.wine),attrs={scale:'winerim-0-5',potencia:3,acidez:3,dulzura:3,taninos:3,afrutado:3};
const base={...candidate,sensory_attributes:attrs,place_details:{bodega_sensory_evidence:makeCellarCatalogEvidence(candidate,'winerim-public-store:91000001',attrs)}};
const saved={...base,id:'synthetic-saved184',rating:'love',place_details:withCellarInitialAffinity(base,snapshot,'saved')};
function App(){const[expanded,setExpanded]=React.useState(false);return <MemoryRouter><main style={{padding:16,maxWidth:440,margin:'auto'}}><h1 className="mb-4 text-xl font-semibold">Tu vino</h1><GlobalWineReference103 candidate={wine} profile={profile}/><div className="mt-6"><CellarWineAffinity wine={saved} snapshot={snapshot} resolving={false} onResolve={()=>setExpanded(true)} onRetryProfile={()=>{}}/></div>{expanded&&<p role="status">Consulta no ejecutada en esta prueba local</p>}</main></MemoryRouter>}
createRoot(document.getElementById('root')).render(<App/>);`;
let server, browser;
const errors = [], external = [], captures = [];
const result = { passed: false, startedUTC: new Date().toISOString(), scope: 'Actual native components with controlled legacy data. No backend, recognition, real accounts, UIKit or human taste approval.' };
try {
  server = await createServer({ root: repo, configFile: false, envDir: false, plugins: [react(), {
    name: 'legacy-sensory184', configureServer(s) { s.middlewares.use(async (req, res, next) => {
      if (req.url === '/legacy184') { res.setHeader('content-type', 'text/html'); return res.end(await s.transformIndexHtml('/legacy184', '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/entry184.jsx"></script></html>')); }
      if (req.url === '/bottle184.png') { res.setHeader('content-type', 'image/png'); return res.end(fs.readFileSync('src/assets/wine-bottle-placeholder.png')); }
      next();
    }); }, resolveId(id) { if (id === '/entry184.jsx') return '\0entry184.jsx'; }, load(id) { if (id === '\0entry184.jsx') return entry; },
  }], resolve: { alias: { '@': path.join(repo, 'src') } }, server: { host: '127.0.0.1', port: 0 } });
  await server.listen(); const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ isMobile: true, hasTouch: true });
  await context.route('**/*', route => { const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue(); external.push(url.origin); return route.abort(); });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(String(error)));
  for (const [width, font] of [[375,16],[440,16],[375,32]]) {
    guard(); await page.setViewportSize({ width, height: 900 }); await page.goto(origin + '/legacy184');
    await page.getByTestId('global-wine-reference').waitFor();
    await page.evaluate(font => { document.documentElement.style.fontSize = font + 'px'; }, font);
    await page.getByText('Por qu\u00e9 no hay afinidad', { exact: true }).click();
    await page.getByText('Buscar ficha y calcular afinidad', { exact: true }).waitFor();
    const text = await page.locator('main').innerText();
    assert(text.includes('datos de sabor fiables') && text.includes('Ya sabes que te gusta'));
    assert(!text.includes('Esta cifra compara'));
    assert(!/\d+\s*\/\s*100|\d+\s*%/.test(text), 'LEGACY_SCORE_VISIBLE');
    assert.equal(await page.getByTestId('global-style-estimate').count(), 0);
    const checks = await page.evaluate(() => {
      const root = document.documentElement;
      return { overflow: root.scrollWidth > innerWidth + 1,
        buttons: [...document.querySelectorAll('main button, main a, main summary')].filter(el => el.getClientRects().length).map(el => {
          const r = el.getBoundingClientRect(); return { text: el.textContent, height: r.height, left: r.left, right: r.right }; }) };
    });
    assert(!checks.overflow); assert(checks.buttons.every(b => b.height >= 43 && b.left >= 0 && b.right <= width + 1));
    const file = `${width}-${font}.png`; await page.screenshot({ path: path.join(out, file), fullPage: true });
    captures.push({ file, width, font, checks });
  }
  assert.equal(errors.length, 0); assert.equal(external.length, 0); guard(); result.passed = true;
} catch (error) { result.error = String(error.stack || error); }
finally {
  await browser?.close(); await server?.close();
  fs.writeFileSync(path.join(out, 'RESULT.json'), JSON.stringify({ ...result, captures, errors, external, externalGET: 0, modelCalls: 0, finishedUTC: new Date().toISOString() }, null, 2) + '\n', { mode: 0o600 });
}
console.log(JSON.stringify({ out, passed: result.passed, captures: captures.length, error: result.error }));
process.exitCode = result.passed ? 0 : 1;
