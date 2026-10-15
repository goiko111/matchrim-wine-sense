import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }
const output = process.env.MATCHRIM_ORIGINAL_QA_OUTPUT || '/tmp/matchrim-original-library89-qa';
await mkdir(output, { recursive: true });
const virtual = 'virtual:original-sheet-qa';
const source = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { WinerimSheetLookup } from '/src/components/WinerimSheetLookup.tsx';
import { WinerimOriginalSheet } from '/src/components/WinerimOriginalSheet.tsx';
import '/src/index.css';
const A = { name: 'Luna Reserva', producer: 'Bodegas Ejemplo', vintage: 2021, country: 'Spain', region: 'Rioja' };
const B = { name: 'Otra Reserva', producer: 'Bodegas Ejemplo', vintage: 2020, country: 'Spain', region: 'Rioja' };
function Harness() {
  const [identity, setIdentity] = React.useState(A), [visible, setVisible] = React.useState(true);
  const [raw, setRaw] = React.useState(null);
  window.sheetQA = { setIdentity, setVisible, setRaw, A, B };
  return React.createElement('main', { style: { maxWidth: 560, padding: 16, margin: '0 auto' } },
    visible ? raw ? React.createElement(WinerimOriginalSheet, { sheet: raw }) : React.createElement(WinerimSheetLookup, { identity }) : null);
}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(Harness)));
`;
const server = await createServer({ server: { host: '127.0.0.1', port: 0, hmr: false }, plugins: [{
  name: 'original-sheet-qa',
  resolveId(id) { if (id === virtual) return '\0' + virtual; },
  load(id) { if (id === '\0' + virtual) return source; },
  configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url?.split('?')[0] !== '/__original-sheet-qa') return next();
      res.setHeader('Content-Type', 'text/html');
      res.end(await vite.transformIndexHtml(req.url, `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import '${virtual}';</script></body></html>`));
    });
  },
}] });
let browser;
let checks = 0, interceptedReads = 0;
const pass = (name) => { checks++; console.log('PASS', name); };
try {
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  await context.addInitScript(() => {
    window.CapacitorCustomPlatform = { name: 'ios' };
    const nativeFetch = window.fetch.bind(window);
    // Deliberately ignore abort in stale-response tests to exercise component lifetime guards.
    window.fetch = (url, init) => nativeFetch(url, window.ignoreSheetAbort && String(url).startsWith('https://app.winerim.com/') ? { ...init, signal: undefined } : init);
  });
  const wine = { id: 123, name: 'Luna Reserva', winery: 'Bodegas Ejemplo', vintage: '2021', slugname: 'Luna-Reserva_2021',
    country: 'ES', region: 'Rioja', grapes: [['Tempranillo']], tastingAttributes: { power: 2.4, acidity: 4, sweetness: 1, tannin: 0, fruity: 3 } };
  const other = { ...wine, id: 124, name: 'Otra Reserva', vintage: '2020', slugname: 'Otra-Reserva_2020' };
  let mode = 'success', releaseOld = null, held = false;
  const errors = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin) return route.continue();
    if (url.origin !== 'https://app.winerim.com') return route.abort();
    assert.equal(request.method(), 'GET'); assert.equal(request.postData(), null);
    interceptedReads++;
    const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (mode === 'error') return route.fulfill({ status: 503, headers, body: '{}' });
    let body;
    if (url.pathname.endsWith('/slugname')) body = { restaurant: 'b653e084-e8e1-448c-bc03-507a1cea3810' };
    else if (url.searchParams.has('text')) {
      const row = url.searchParams.get('text') === other.name ? other : wine;
      const results = mode === 'empty' ? [] : mode === 'ambiguous' ? [row, { ...row, id: 999 }] : [row];
      body = { results, count: mode === 'incomplete' ? 25 : results.length, page: 1, limit: 20 };
    } else {
      const row = url.pathname.includes('/124/') ? other : wine;
      body = mode === 'missing-sensory' ? { ...row, tastingAttributes: null } : row;
      if (mode === 'held' && row.id === 123) {
        held = true;
        await new Promise(resolve => { releaseOld = resolve; });
      }
    }
    await route.fulfill({ headers, body: JSON.stringify(body) }).catch(error => {
      if (!/closed|handled|aborted|Invalid InterceptionId/i.test(String(error))) throw error;
    });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  const load = async () => { await page.goto(origin + '/__original-sheet-qa'); await page.waitForFunction(() => Boolean(window.sheetQA)); };
  const search = () => page.getByRole('button', { name: /^Ficha original Winerim:/ }).click();
  const verified = () => page.getByRole('link', { name: 'Ver ficha original Winerim', exact: true });
  const paint = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const waitHeld = async () => { for (let i = 0; i < 100 && !held; i++) await new Promise(resolve => setTimeout(resolve, 10)); assert.ok(held); };
  const reset = async (nextMode) => { mode = nextMode; await load(); };

  await reset('success'); await search(); await verified().waitFor();
  assert.equal(await page.getByTestId('winerim-original-sheet').count(), 1);
  assert.equal(await verified().getAttribute('href'), 'https://web.winerim.com/the-library/wines/123/Luna-Reserva_2021');
  assert.ok(await page.getByText('0/5', { exact: true }).isVisible());
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Ficha original Winerim: Luna Reserva');
  pass('Actual components: verified link, zero sensory and accessible result focus');
  for (const [width, height] of [[320, 700], [393, 852], [852, 393], [1280, 800]]) {
    await page.setViewportSize({ width, height });
    await paint();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, `verified-${width}.png`), fullPage: true });
    pass(`Verified layout has no horizontal overflow at ${width}x${height}`);
  }
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await paint();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: path.join(output, 'verified-320-text200.png'), fullPage: true });
  pass('Verified layout has no overflow at 320px and 200% text');

  for (const [nextMode, expected] of [['empty', /No se ha podido enlazar/], ['ambiguous', /no permite identificar una/],
    ['incomplete', /consulta es incompleta/], ['error', /No se ha podido consultar/]]) {
    await reset(nextMode); await search(); await page.getByRole('status').filter({ hasText: expected }).waitFor();
    assert.equal(await verified().count(), 0);
    assert.ok(await page.getByRole('button', { name: /^Ficha original Winerim:/ }).isEnabled());
    pass(`${nextMode} fallback stays inert and permits explicit retry`);
  }
  mode = 'success'; await search(); await verified().waitFor(); pass('Explicit retry recovers after outage');
  await reset('missing-sensory'); await search(); await verified().waitFor();
  assert.ok(await page.getByText(/No se recalcula la afinidad a partir de esta ficha/).isVisible());
  assert.equal(await page.getByText(/Afinidad pendiente/).count(), 0);
  assert.equal(await page.getByText('Atributos de la ficha original', { exact: true }).count(), 0);
  pass('Missing sensory never contradicts an independently valid active affinity');

  await reset('success');
  const beforeMissing = interceptedReads;
  await page.evaluate(() => window.sheetQA.setIdentity({ ...window.sheetQA.A, producer: null }));
  assert.ok(await page.getByRole('button', { name: /^Ficha original Winerim:/ }).isDisabled());
  assert.equal(interceptedReads, beforeMissing); pass('Incomplete identity has visible fallback and zero network');

  await reset('held'); held = false;
  await page.evaluate(() => { window.ignoreSheetAbort = true; });
  await search(); await waitHeld();
  await page.getByRole('button', { name: 'Cancelar búsqueda de ficha', exact: true }).click();
  mode = 'success'; releaseOld();
  await page.waitForTimeout(100);
  assert.equal(await verified().count(), 0);
  assert.ok(await page.getByRole('button', { name: /^Ficha original Winerim:/ }).isEnabled());
  await search(); await verified().waitFor(); pass('Cancel suppresses an unabortable late response and allows retry');

  await reset('held'); held = false;
  await page.evaluate(() => { window.ignoreSheetAbort = true; });
  await search(); await waitHeld();
  await page.evaluate(() => window.sheetQA.setIdentity(window.sheetQA.B));
  assert.equal(await verified().count(), 0);
  mode = 'success'; await search(); await verified().waitFor(); releaseOld();
  await page.waitForTimeout(100);
  assert.equal(await verified().getAttribute('href'), 'https://web.winerim.com/the-library/wines/124/Otra-Reserva_2020');
  assert.equal(await page.getByText('Luna Reserva', { exact: true }).count(), 0);
  pass('Identity change cannot inherit an old sheet or be overwritten by a stale response');

  await reset('held'); held = false;
  await page.evaluate(() => { window.ignoreSheetAbort = true; });
  await search(); await waitHeld();
  await page.evaluate(() => window.sheetQA.setVisible(false));
  await page.evaluate(() => window.sheetQA.setVisible(true));
  mode = 'success'; releaseOld(); await page.waitForTimeout(100);
  assert.equal(await verified().count(), 0);
  assert.ok(await page.getByRole('button', { name: /^Ficha original Winerim:/ }).isEnabled());
  await search(); await verified().waitFor(); pass('Unmount/remount discards old request and starts clean');

  await page.evaluate(() => window.sheetQA.setIdentity({ ...window.sheetQA.A, inferredFields: ['producer'] }));
  assert.equal(await verified().count(), 0);
  assert.ok(await page.getByRole('button', { name: /^Ficha original Winerim:/ }).isDisabled());
  pass('Same visible identity becoming inferred invalidates the previous verified sheet');

  for (const url of ['https://evil.winerim.com/the-library/wines/123/x', 'https://web.winerim.com/the-library/wines/999/x']) {
    await page.evaluate(url => window.sheetQA.setRaw({ id: '123', name: 'Unsafe sheet', producer: 'Ejemplo', vintage: '2021', region: null,
      grapes: [], url, detailVerified: true, sensoryAttributes: { power: 4, acidity: 4, sweetness: 4, tannin: 4, fruity: 4 } }), url);
    assert.equal(await verified().count(), 0);
    assert.equal(await page.getByText('Atributos de la ficha original', { exact: true }).count(), 0);
    pass('Restored host/ID mismatch cannot create a link or verified sensory UI');
  }
  assert.deepEqual(errors, []); pass('No browser exceptions');
  await context.close();
  console.log(JSON.stringify({ checks, passed: checks, interceptedReads, remoteReads: 0, mutations: 0, screenshots: output, scope: 'Isolated actual-component fixtures in React StrictMode, not native device or recognition QA' }));
} finally {
  await browser?.close();
  await server.close();
}
