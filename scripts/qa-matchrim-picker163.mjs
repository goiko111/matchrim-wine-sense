import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { guard122 } from './experiment-matchrim-vision122.mjs';

// Isolated rendering of the real native-only picker. Transport is deliberately mocked.
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out = path.resolve(process.argv[2]);
const damagedMode = process.argv[3] === 'damaged171';
const broadMode = process.argv[3] === 'broad172';
const knownMode = process.argv[3] === 'known168' || damagedMode;
assert(process.argv[3] === undefined || knownMode || broadMode);
assert(out.startsWith(process.cwd() + '/qa-artifacts/continuation161-20261022/picker163-'));
assert(!fs.existsSync(out));
const check = () => guard122(JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases,
  process.env, fs.statfsSync('.', { bigint: true }));
check(); fs.mkdirSync(out, { mode: 0o700 });
const fixture = JSON.parse(fs.readFileSync('qa-fixtures/global103/winerim-public.observed.json')).vidure.wine;
const rows = Array.from({ length: broadMode ? 96 : 23 }, (_, i) => ({ ...fixture, id: i + 1, vintage: i < 20 ? null : '2022' }));
const listRows = rows.map(row => damagedMode && row.id === 22 ? { ...row, slugname: '' } : row);
const total = damagedMode ? 22 : rows.length, filteredTotal = broadMode ? 76 : damagedMode ? 2 : 3;
const sourceFiles = ['src/components/wine-import/NativeGlobalCatalogue103.tsx', 'src/utils/nativeCataloguePage163.ts',
  'src/utils/nativeGlobalCatalogue103.ts', 'src/utils/nativeSavedCatalogue168.ts', 'src/utils/nativeRescanVerdict159.ts', 'src/index.css'];
const hashes = () => Object.fromEntries(sourceFiles.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const bound = hashes(), errors = [], screenshots = [], requests = [];
const target = rows[22], bottle = { name: target.name, producer: target.winery, vintage: 2022, region: target.region ?? null, country: target.country ?? null };
const savedRow = { ...bottle, id: 'isolated-saved', user_id: 'isolated-qa', rating: 'love', sensory_attributes: null,
  place_details: { winerim_public_catalogue: { version: 1, namespace: 'winerim-public-store', id: 23,
    slug: target.slugname, catalogue_vintage: '2022', bottle_identity: bottle } } };
const module = `import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';import{GlobalWinePicker103}from'/src/components/wine-import/NativeGlobalCatalogue103.tsx';import{nativeVerdictsSnapshot159}from'/src/utils/nativeRescanVerdict159.ts';import'/src/index.css';
const snapshot=${knownMode ? `nativeVerdictsSnapshot159('isolated-qa',[${JSON.stringify(savedRow)}],1)` : 'null'};
function App(){const[selected,setSelected]=React.useState(null);return React.createElement('main',{style:{padding:16,maxWidth:440,margin:'auto'}},React.createElement(GlobalWinePicker103,{candidate:{name:'Vidure',producer:null,vintage:null,evidence:['Vidure','Pago de Cirsus','Cabernet Sauvignon']},contextKey:'isolated-qa',disabled:false,profile:null,onConfirmed:setSelected,ownerId:'isolated-qa',savedVerdicts:snapshot}),selected&&React.createElement('p',{role:'status'},'Referencia elegida: '+selected.name+', '+selected.vintage+', ID '+selected.globalRecord.id))}createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(App)));`;
let server, browser, page;
const result = { passed: false, startedUTC: new Date().toISOString(), sourceHashes: bound, modelStarts: 0, realCatalogueRequests: 0,
  knownMode, damagedMode, broadMode,
  scope: 'Real native-only picker in isolated Chromium mobile rendering; 23 synthetic observed-contract rows, mocked GET transport. Not iOS/WebKit, real recognition, physical device, or deployed catalogue approval.' };
try {
  server = await createServer({ configFile: false, envDir: false, root: process.cwd(), plugins: [react(), {
    name: 'isolated-picker163', configureServer(s) { s.middlewares.use(async (req, res, next) => {
      if (req.url === '/picker163') { res.setHeader('Content-Type', 'text/html'); res.end(await s.transformIndexHtml('/picker163', '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/picker163.jsx"></script></html>')); }
      else next();
    }); }, resolveId(id) { if (id === '/picker163.jsx') return '\0picker163.jsx'; },
    load(id) { if (id === '\0picker163.jsx') return module; },
  }], resolve: { alias: { '@': path.resolve('src') } }, server: { host: '127.0.0.1', port: 0 } });
  await server.listen(); const address = server.httpServer.address();
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await context.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.origin === origin) return route.continue();
    if (u.origin === 'https://app.winerim.com' && route.request().method() === 'GET' && u.pathname.includes('/wines')) {
      requests.push(u.pathname + u.search);
      const selectedId = Number(u.pathname.split('/').at(-2));
      const number = Number(u.searchParams.get('page'));
      const payload = u.search ? { count: rows.length, page: number, results: listRows.slice((number - 1) * 20, number * 20) } : rows.find(row => row.id === selectedId);
      assert(payload);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
    }
    return route.abort();
  });
  page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + '/picker163');
  await page.getByRole('button', { name: 'Buscar otra referencia en Winerim', exact: true }).click();
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  if (broadMode) {
    await page.getByText('20 referencias · Página 1 de 7', { exact: true }).waitFor();
    await page.getByText('20 de 96 referencias cargadas. El filtro de añada solo incluye las cargadas.', { exact: true }).waitFor();
    assert.equal(requests.length, 1);
    assert.equal(await page.getByRole('combobox', { name: 'Acotar con texto de la etiqueta', exact: true }).count(), 1);
    for (const large of [false, true]) {
      const style = large ? await page.addStyleTag({ content: 'html { font-size: 32px !important; }' }) : null;
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Partial-results horizontal overflow');
      assert(await page.getByRole('combobox', { name: 'Acotar con texto de la etiqueta', exact: true }).evaluate(element => {
        const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
        context.font = getComputedStyle(element).font;
        return context.measureText(element.selectedOptions[0].text).width <= element.clientWidth - 48;
      }), 'Closed refinement selector clips its selected text');
      const button = await page.getByRole('button', { name: 'Cargar más referencias de Winerim', exact: true }).boundingBox();
      assert(button.width >= 44 && button.height >= 44 && button.x >= 0 && button.x + button.width <= 376);
      const name = large ? '375-partial-large-text' : '375-partial';
      await page.screenshot({ path: out + '/' + name + '.png', fullPage: true }); screenshots.push(name);
      if (style) await style.evaluate(element => element.remove());
    }
    for (const count of [40, 60, 80, 96]) {
      await page.getByRole('button', { name: 'Cargar más referencias de Winerim', exact: true }).click();
      await page.getByText(new RegExp('^' + count + ' referencias · Página')).waitFor();
    }
    assert.equal(requests.length, 5);
    assert.equal(await page.getByRole('button', { name: 'Cargar más referencias de Winerim', exact: true }).count(), 0);
  } else await page.getByText(total + ' referencias · Página 1 de 8', { exact: true }).waitFor();
  if (damagedMode) await page.getByText('No se ha podido completar la búsqueda. Concreta el nombre o busca por bodega.', { exact: true }).waitFor();
  assert.equal(requests.length, broadMode ? 5 : 2);
  if (!broadMode) {
    await page.getByRole('button', { name: 'Referencias siguientes', exact: true }).click();
    await page.getByText(total + ' referencias · Página 2 de 8', { exact: true }).waitFor();
  }
  await page.getByRole('combobox', { name: 'Filtrar por añada' }).selectOption('2022');
  await page.getByText(filteredTotal + ' referencias · Página 1 de ' + (broadMode ? '26' : '1'), { exact: true }).waitFor();
  assert.equal(await page.getByText('Ya en tu Bodega', { exact: true }).count(), knownMode ? 1 : 0);
  const screenshot = async name => {
    check(); assert.deepEqual(hashes(), bound);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow');
    const buttons = await page.getByRole('button', { name: 'Esta es mi referencia', exact: true }).all();
    assert.equal(buttons.length, Math.min(3, filteredTotal));
    for (const button of buttons) { const b = await button.boundingBox(); assert(b.width >= 44 && b.height >= 44); }
    await page.screenshot({ path: out + '/' + name + '.png', fullPage: true }); screenshots.push(name);
  };
  await screenshot('375-vintage2022'); await page.setViewportSize({ width: 440, height: 956 }); await screenshot('440-vintage2022');
  await page.addStyleTag({ content: 'html { font-size: 32px !important; }' }); await screenshot('440-large-text');
  await page.getByRole('button', { name: 'Esta es mi referencia', exact: true }).first().click();
  await page.getByText('Referencia elegida: Vidure, 2022, ID ' + (knownMode ? '23' : '21'), { exact: true }).waitFor();
  assert.equal(requests.length, broadMode ? 6 : 3); assert.deepEqual(errors, []);
  Object.assign(result, { passed: true, screenshots, requests, errors });
} catch (error) {
  result.error = String(error.stack || error); result.errors = errors;
  if (page) { await page.screenshot({ path: out + '/failure.png', fullPage: true }); fs.writeFileSync(out + '/failure.html', await page.content(), { mode: 0o600, flag: 'wx' }); }
}
finally {
  await browser?.close(); await server?.close(); result.finishedUTC = new Date().toISOString();
  fs.writeFileSync(out + '/RESULT.json', JSON.stringify(result, null, 2), { mode: 0o600, flag: 'wx' });
}
console.log(JSON.stringify({ passed: result.passed, error: result.error, screenshots }));
process.exitCode = result.passed ? 0 : 1;
