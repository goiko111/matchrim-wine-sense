import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

// Uses an already installed Playwright runtime, never installs packages or calls AI.
const { chromium } = await import(process.env.MATCHRIM_PLAYWRIGHT_MODULE || 'playwright');
const port = Number(process.env.MATCHRIM_FOOD_QA_PORT || 5191);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
server.stdout.on('data', (value) => { log += value; });
server.stderr.on('data', (value) => { log += value; });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null) throw new Error(log);
    try { ready = (await fetch(`${origin}/@vite/client`)).ok; } catch { /* Server startup only. */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, log);
  browser = await chromium.launch({ headless: true,
    ...(process.env.MATCHRIM_QA_CHROME ? { executablePath: process.env.MATCHRIM_QA_CHROME } : { channel: 'chrome' }) });
  const results = [];
  for (const viewport of [{ width: 393, height: 852 }, { width: 852, height: 393 }]) {
    for (const portrait of [false, true]) {
    const page = await browser.newPage({ viewport });
    const forbidden = [];
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) { forbidden.push(url.origin); await route.abort(); return; }
      if (url.pathname === '/__food_canvas89__') {
        await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Food crop contract</title>' });
      } else await route.continue();
    });
    await page.goto(`${origin}/__food_canvas89__`);
    await page.waitForLoadState('networkidle');
    const result = await page.evaluate(async (portrait) => {
      const { scanFoodMenu89 } = await import('/src/utils/foodMenuScan89.ts');
      const width = portrait ? 800 : 1000, height = portrait ? 1000 : 800;
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      const stripe = (start, size, color) => {
        context.fillStyle = color;
        if (portrait) context.fillRect(0, start, width, size);
        else context.fillRect(start, 0, size, height);
      };
      stripe(0, 440, '#003cff'); stripe(440, 120, '#00c800'); stripe(560, 440, '#ff1400');
      const image = canvas.toDataURL('image/png');
      const samples = [];
      const result = await scanFoodMenu89({ image, width, height, signal: new AbortController().signal,
        invoke: async (body, signal) => {
          if (signal.aborted) throw new Error('Unexpected cancellation');
          const tile = body.scan_region;
          const img = new Image(); img.src = body.image; await img.decode();
          const cropped = document.createElement('canvas'); cropped.width = img.naturalWidth; cropped.height = img.naturalHeight;
          const pixels = cropped.getContext('2d'); pixels.drawImage(img, 0, 0);
          const rgb = (position) => Array.from(pixels.getImageData(portrait ? 100 : position, portrait ? position : 100, 1, 1).data).slice(0, 3);
          const first = tile.id === 'left' || tile.id === 'top';
          samples.push({ id: tile.id, width: cropped.width, height: cropped.height,
            edge: rgb(first ? 10 : 550), overlap: rgb(first ? 500 : 60), different: body.image !== image });
          const original = portrait ? { x: 10, y: 46, width: 4, height: 8 } : { x: 46, y: 10, width: 8, height: 4 };
          return { mode: 'menu', summary: '', has_profile: false, profile_source: 'none', scan_region: tile,
            coverage: { model_counts_reported: true, estimated_visible_dishes: 1, unreadable_dishes: 0, truncated: false },
            dishes: [{ nombre: 'Overlap fixture', source_text: 'Overlap fixture', source_order: 1, region_id: 'fixture',
              categoria: null, match: null, razon: '', recomendaciones: [], source_box: {
                x: (original.x - tile.box.x) / tile.box.width * 100, y: (original.y - tile.box.y) / tile.box.height * 100,
                width: original.width / tile.box.width * 100, height: original.height / tile.box.height * 100,
              } }],
          };
        } });
      return { samples, rows: result.dishes.length, originalBox: result.dishes[0].source_box, partial: result.coverage.partial };
    }, portrait);
    assert.equal(forbidden.length, 0, 'No external requests are permitted');
    assert.equal(result.samples.length, 2);
    assert.equal(result.rows, 1);
    assert.deepEqual(result.originalBox, portrait ? { x: 10, y: 46, width: 4, height: 8 } : { x: 46, y: 10, width: 8, height: 4 });
    assert.deepEqual(result.samples.map((sample) => sample.id), portrait ? ['top', 'bottom'] : ['left', 'right']);
    for (const sample of result.samples) {
      assert.equal(sample.width, portrait ? 800 : 560); assert.equal(sample.height, portrait ? 560 : 800); assert.equal(sample.different, true);
      assert.ok(sample.overlap[1] > 180 && sample.overlap[0] < 20 && sample.overlap[2] < 20);
      assert.ok(sample.id === 'left' || sample.id === 'top' ? sample.edge[2] > 220 && sample.edge[0] < 20 : sample.edge[0] > 220 && sample.edge[2] < 20);
    }
    results.push({ viewport, portrait_image: portrait, ...result });
    await page.close();
    }
  }
  const widePage = await browser.newPage();
  await widePage.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { await route.abort(); return; }
    if (url.pathname === '/__food_canvas89__') await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Wide crop</title>' });
    else await route.continue();
  });
  await widePage.goto(`${origin}/__food_canvas89__`);
  await widePage.waitForLoadState('networkidle');
  const wide = await widePage.evaluate(async () => {
    const { scanFoodMenu89 } = await import('/src/utils/foodMenuScan89.ts');
    const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1440;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1920, 1440);
    ctx.fillStyle = '#00c800'; ctx.fillRect(1920 * 0.4, 0, 1920 * 0.25, 1440);
    const samples = [];
    await scanFoodMenu89({ image: canvas.toDataURL('image/png'), width: 1920, height: 1440,
      signal: new AbortController().signal, invoke: async (body) => {
        const tile = body.scan_region;
        const img = new Image(); img.src = body.image; await img.decode();
        if (tile.id === 'center') {
          const target = document.createElement('canvas'); target.width = img.naturalWidth; target.height = img.naturalHeight;
          const pixels = target.getContext('2d'); pixels.drawImage(img, 0, 0);
          for (const percent of [41, 64]) {
            const x = Math.round((percent - tile.box.x) / tile.box.width * target.width);
            samples.push(Array.from(pixels.getImageData(x, 100, 1, 1).data).slice(0, 3));
          }
        }
        return { mode: 'menu', summary: '', has_profile: false, profile_source: 'none', scan_region: tile,
          dishes: [], coverage: { model_counts_reported: true, estimated_visible_dishes: 0, unreadable_dishes: 0, truncated: false } };
      } });
    return samples;
  });
  assert.equal(wide.length, 2);
  assert.ok(wide.every((pixel) => pixel[1] > 180 && pixel[0] < 20 && pixel[2] < 20), 'Central board edges both survive actual crop decoding');
  results.push({ wide_center_image: true, actual_central_edge_pixels: wide });
  await widePage.close();
  console.log(JSON.stringify({ scope: 'Actual cropImageRegion and Canvas pixels; synthetic fixture; zero AI/remote calls', results }, null, 2));
} finally {
  if (browser) await browser.close();
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((resolve) => server.once('exit', resolve));
  }
}
