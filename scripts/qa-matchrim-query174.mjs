import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { loadRuntime112, captureSources112, verifySources112, assertLeases112 } from './benchmark-matchrim-native112.ts';
import { pinCache179 } from './pin-matchrim-cache179.ts';

const repo = process.cwd(), out = path.resolve(process.argv[2]);
const stackedMode = process.argv[3] === 'stacked175';
const revalidatedMode = process.argv[3] === 'revalidated177';
assert(process.argv[3] === undefined || stackedMode || revalidatedMode);
assert(path.dirname(out) === path.join(repo, revalidatedMode ? 'qa-artifacts/continuation176-20261023' : 'qa-artifacts/continuation174-20261022')
  && /^visual(?:-stacked|-revalidated)?-r[1-9]\d*$/.test(path.basename(out)) && !fs.existsSync(out));
const check = () => {
  assertLeases112(JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases, process.env);
  const disk = fs.statfsSync(repo); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
check(); fs.mkdirSync(out, { mode: 0o700 });
const reportPath = 'qa-artifacts/night105-20261021/native112-corpus200-' + (revalidatedMode ? 'r21' : stackedMode ? 'r17' : 'r16') + '/REPORT.json';
const report = JSON.parse(fs.readFileSync(reportPath));
const receipts = JSON.parse(fs.readFileSync(path.dirname(reportPath) + '/CACHE_READS.json'));
const cache = pinCache179(repo, receipts), runtime = await loadRuntime112(), sources = captureSources112(repo);
const ids = revalidatedMode ? ['img-084', 'img-094', 'img-099', 'img-190', 'img-193', 'img-200']
  : stackedMode ? ['img-002', 'img-089', 'img-195'] : ['img-021', 'img-116', 'img-184', 'img-106'];
const scenes = ids.map(id => {
  const row = report.rows.find(item => item.imageId === id); assert(row);
  const image = path.resolve('qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared/' + id + '.jpg');
  assert.equal(runtime.localSingleCandidate109(row.reading, id).name, 'Etiqueta por identificar');
  return { id, row, image, candidate: runtime.localSingleCandidate109(row.reading, id) };
});
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
let server, browser, page;
const errors = [], requests = [], screenshots = [];
const result = { passed: false, startedUTC: new Date().toISOString(), realGET: 0, models: 0, sourceReport: reportPath,
  sources, scope: 'Actual native recovery TSX in isolated Chromium. Retained actual Vision text and hash-verified catalogue responses; network intercepted. Source photo shown; catalogue thumbnails are controlled placeholders. Not fresh recognition, UIKit, human taste accuracy or a confirmed identity.' };
try {
  server = await createServer({ configFile: false, envDir: false, root: repo, plugins: [react(), {
    name: 'isolated-query174', configureServer(s) { s.middlewares.use(async (req, res, next) => {
      const id = new URL(req.url, 'http://local').searchParams.get('id');
      if (req.url.startsWith('/query174?') && ids.includes(id)) {
        res.setHeader('Content-Type', 'text/html');
        return res.end(await s.transformIndexHtml('/query174', '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/query174.jsx?id=' + id + '"></script></html>'));
      }
      const scene = scenes.find(item => req.url === '/input174/' + item.id + '.jpg');
      if (scene) { res.setHeader('Content-Type', 'image/jpeg'); return res.end(fs.readFileSync(scene.image)); }
      next();
    }); }, resolveId(id) { if (id.startsWith('/query174.jsx?')) return '\0' + id; },
    load(id) {
      if (!id.startsWith('\0/query174.jsx?')) return;
      const scene = scenes.find(item => id.endsWith('id=' + item.id)); assert(scene);
      return `import React from 'react';import{createRoot}from'react-dom/client';import{GlobalWineRecovery104}from'/src/components/wine-import/GlobalWineRecovery104.tsx';import'/src/index.css';
function App(){const[selected,setSelected]=React.useState(null);return React.createElement('main',{style:{padding:16,maxWidth:440,margin:'auto'}},React.createElement('img',{src:'/input174/${scene.id}.jpg',alt:'Imagen original',style:{width:'100%',height:200,objectFit:'contain',marginBottom:16}}),React.createElement(GlobalWineRecovery104,{candidate:${JSON.stringify(scene.candidate)},reading:${JSON.stringify(scene.row.reading)},contextKey:'${scene.id}',disabled:false,profile:null,autoSearch:true,onConfirmed:setSelected}),selected&&React.createElement('p',{'data-testid':'confirmed174'},selected.name))}createRoot(document.getElementById('root')).render(React.createElement(App));`;
    },
  }], resolve: { alias: { '@': path.resolve('src') } }, server: { host: '127.0.0.1', port: 0 } });
  await server.listen(); const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin) return route.continue();
    if (request.method() === 'GET' && cache.has(url.href)) {
      const receipt = cache.get(url.href); requests.push({ url: url.href, source: receipt.sourceReceipt, sha256: receipt.sha256 });
      return route.fulfill({ status: receipt.status, headers: { 'content-type': receipt.headers['content-type'] }, body: receipt.bytes });
    }
    if (url.origin === 'https://app.winerim.com' && url.pathname.startsWith('/images/wines/'))
      return route.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync('src/assets/wine-bottle-placeholder.png') });
    errors.push('UNEXPECTED_OUTBOUND:' + request.method() + ':' + url.origin + url.pathname); return route.abort();
  });
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  for (const scene of scenes) {
    check(); verifySources112(repo, sources); const before = requests.length;
    await page.goto(origin + '/query174?id=' + scene.id); await page.waitForLoadState('networkidle');
    const incomplete = scene.row.pages.some(row => row.status !== 'complete');
    const unavailable = scene.row.pages.some(row => row.status === 'unavailable');
    const notice = scene.row.proposals.length ? incomplete
      ? 'La búsqueda está incompleta. Estas son algunas propuestas; compara la etiqueta y elige solo si coincide.'
      : 'No hemos confirmado el vino. Compara la etiqueta y elige solo si coincide.'
      : unavailable ? 'No podemos conectar con Winerim. Puedes reintentar sin cambiar tu vino.'
        : incomplete ? 'No hemos podido completar la búsqueda. No significa que tu vino no esté en Winerim. Corrige el nombre completo o prueba una foto más cercana.'
          : 'No hay una propuesta suficientemente parecida. Corrige el nombre o prueba una foto más cercana.';
    await page.getByRole('status').filter({ hasText: notice }).waitFor();
    const actualQueries = [...new Set(requests.slice(before).map(item => new URL(item.url).searchParams.get('text')))];
    assert.deepEqual(actualQueries, scene.row.queries);
    assert.equal(await page.getByRole('button', { name: 'Confirmar esta referencia', exact: true }).count(), scene.row.proposals.length);
    assert.equal(await page.getByTestId('confirmed174').count(), 0);
    for (const [width, large] of [[375, false], [440, false], [375, true]]) {
      await page.setViewportSize({ width, height: 900 });
      const style = large ? await page.addStyleTag({ content: 'html{font-size:32px!important}' }) : null;
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      for (const button of await page.getByRole('button').all()) {
        const b = await button.boundingBox(); assert(b && b.width >= 44 && b.height >= 44 && b.x >= 0 && b.x + b.width <= width + 1);
      }
      if (revalidatedMode) {
        const splitWords = await page.evaluate(() => {
          const split = [];
          for (const title of document.querySelectorAll('[data-testid="global-recovery104"] li p.font-semibold')) {
            const text = title.firstChild; if (!text || text.nodeType !== Node.TEXT_NODE) continue;
            for (const word of text.textContent.matchAll(/\p{L}{5,}/gu)) {
              const range = document.createRange(); range.setStart(text, word.index); range.setEnd(text, word.index + word[0].length);
              if (range.getClientRects().length > 1) split.push(word[0]);
            }
          }
          return split;
        });
        assert.deepEqual(splitWords, [], 'PRIMARY_WINE_WORD_SPLIT:' + splitWords.join(','));
      }
      const name = `${scene.id}-${width}${large ? '-large' : ''}.png`;
      await page.screenshot({ path: out + '/' + name, fullPage: true }); screenshots.push(name);
      if (style) await style.evaluate(element => element.remove());
    }
  }
  assert.deepEqual(errors, []); check(); verifySources112(repo, sources); result.passed = true;
} catch (error) {
  result.error = String(error.stack || error);
  if (page) await page.screenshot({ path: out + '/failure.png', fullPage: true });
} finally {
  await browser?.close(); await server?.close();
  Object.assign(result, { finishedUTC: new Date().toISOString(), errors, requests, screenshots });
  fs.writeFileSync(out + '/RESULT.json', JSON.stringify(result, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
}
console.log(JSON.stringify({ passed: result.passed, error: result.error, screenshots: screenshots.length }));
process.exitCode = result.passed ? 0 : 1;
