import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from '/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const repo = process.cwd();
const preparation = JSON.parse(fs.readFileSync(path.resolve(process.argv[2], 'preparation.json')));
const folder = path.resolve(process.argv[3]);
const sha = value => createHash('sha256').update(value).digest('hex');
const fixture = { localCandidate: { name: 'Vidure', producer: 'Pago de Cirsus', vintage: 2020 }, ocrLines: ['VIDURE', 'Pago de Cirsus', '2020'] };
const globalObserved = JSON.parse(fs.readFileSync('qa-artifacts/native102-20261021/global-store103-r1/04-body.json'));
let scenario = 'observed-NV-reference';
const image = '/Users/GOIKO/Downloads/IMG_8324.PNG';
const guard = () => {
  const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases['heavy-local'];
  assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d'
    && lease.leaseId === process.env.MATCHRIM102_HEAVY_LEASE_ID && lease.reviewAfter * 1000 > Date.now(), 'Own render lease required');
  const disk = fs.statfsSync(path.dirname(folder));
  assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
guard();
assert(preparation.passed && preparation.typecheck === 'PASS');
for (const [name, hash] of Object.entries(preparation.sourceFingerprints)) assert.equal(sha(fs.readFileSync(path.join(repo, name))), hash, name);
assert(!fs.existsSync(folder)); fs.mkdirSync(folder, { mode: 0o700 });
const origin = 'http://127.0.0.1:4898';
const owner = '00000000-0000-4000-8000-000000010201';
const profile = { potente: 4, acidez: 3, dulce: 1, tanico: 3, afrutado: 4 };
const user = { id: owner, aud: 'authenticated', role: 'authenticated', email: 'native102@example.invalid',
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-10-21T00:00:00Z' };
const jwt = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.'
  + Buffer.from(JSON.stringify({ sub: owner, exp: 4102444800, role: 'authenticated' })).toString('base64url') + '.synthetic-not-a-real-signature';
const report = { startedUTC: new Date().toISOString(), sourceCommit: preparation.commit,
  scope: 'Production-mode React native branch in isolated Chromium portrait emulation; synthetic account, detector and candidate transport. User screenshot uploaded to fully intercepted test transport. Real saved public Vidure response replay plus synthetic exact2020 variant, NOT live recognition, paid image analysis or UIKit/device approval.',
  imageHash: sha(fs.readFileSync(image)), preparation: preparation.root, requests: [], snapshots: [], pageErrors: [], consoleErrors: [],
  paidModelStarts: 0, forwardedRequests: 0, realAccountsCreated: 0, productionWrites: 0, masterConnectionActive: false,
  captureMode: 'Responsive desktop Chromium viewport with native Capacitor CSS branch and touch; not mobile-browser engine. Avoids known Chromium mobile fixed-layer screenshot duplication after viewport/text resizing.' };
const write = (name, value) => fs.writeFileSync(path.join(folder, name), typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2), { mode: 0o600 });
let browser, context;
try {
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    proxy: { server: 'http://127.0.0.1:9' }, args: ['--disable-background-networking', '--disable-sync', '--no-first-run', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
  context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: false, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.routeWebSocket('**/*', socket => socket.close());
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    const json = (value, headers = {}) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value), headers: { 'Access-Control-Allow-Origin': origin, ...headers } });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (url.origin === origin) {
      let name = decodeURIComponent(url.pathname).slice(1);
      if (!name || !Object.hasOwn(preparation.webResources, name) && !path.extname(name)) name = 'index.html';
      if (!Object.hasOwn(preparation.webResources, name)) return route.fulfill({ status: 404, body: '' });
      const bytes = fs.readFileSync(path.join(preparation.web, name)); assert.equal(sha(bytes), preparation.webResources[name]);
      return route.fulfill({ body: bytes, contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' })[path.extname(name)] || 'application/octet-stream' });
    }
    report.requests.push({ method: request.method(), host: url.hostname, path: url.pathname });
    if (url.pathname === '/auth/v1/user') return json(user);
    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.split('/').at(-1);
      if (table === 'quiz_results') return json(url.searchParams.get('select')?.includes('id') ? [{ id: 'qa-quiz', ...profile }] : profile);
      if (table === 'user_wines') return json([], { 'Content-Range': '0-0/0' });
      return json(table === 'profiles' ? { id: owner, preferred_language: 'ES' } : []);
    }
    if (url.pathname.endsWith('/detect-wine-regions-v72')) return json({ regions: [{ box: { x: 3, y: 5, width: 94, height: 90 }, confidence: .99,
      object_type: 'bottle', quality: { glare: 'low', occlusion: 'low', legibility: 'good' } }],
      coverage: { status: 'reported_complete', detected_objects: 1, estimated_visible_objects: 1, confidence: .99 } });
    if (url.pathname.endsWith('/analyze-wine-region-v72')) return json({ candidates: [{ ...fixture.localCandidate,
      confidence: .95, source: 'label', evidence: fixture.ocrLines, inferred_fields: [], uncertainty_reasons: [] }] });
    if (url.hostname === 'app.winerim.com' && url.pathname.startsWith('/images/wines/')) return route.fulfill({ body: fs.readFileSync('qa-artifacts/global103-20261021/vidure-public-photo.png'), contentType: 'image/png' });
    if (url.hostname === 'app.winerim.com' && url.pathname.includes('/00000000-0000-0000-0000-000000000001/wines')) {
      const row = { ...globalObserved, ...(scenario === 'synthetic-exact2020' ? { vintage: '2020' } : {}) };
      return json(url.searchParams.has('text') ? { count: 1, page: 1, results: [row] } : row);
    }
    report.unexpectedRemote = [...(report.unexpectedRemote || []), { host: url.hostname, path: url.pathname }];
    return route.abort('blockedbyclient');
  });
  await context.addInitScript(({ user, jwt, profile, owner }) => {
    window.CapacitorCustomPlatform = { name: 'ios' };
    localStorage.setItem('sb-cbjynrbvrhcmpaojmqdp-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'synthetic-only', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user }));
    localStorage.setItem('matchrim.local_profile_owner.v1', owner);
    localStorage.setItem('matchrim_quiz_result', JSON.stringify(profile));
  }, { user, jwt, profile, owner });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  const capture = async name => {
    guard();
    const geometry = await page.evaluate(() => ({ viewport: innerWidth, viewportHeight: innerHeight, document: document.documentElement.scrollWidth,
      dialog: (() => { const r = document.querySelector('[role=dialog]')?.getBoundingClientRect(); return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null; })() }));
    assert(geometry.document <= geometry.viewport + 1, name + ' page overflow');
    if (geometry.dialog) {
      assert(geometry.dialog.left >= -1 && geometry.dialog.right <= geometry.viewport + 1, name + ' dialog overflow');
      assert(geometry.dialog.top >= -1 && geometry.dialog.bottom <= geometry.viewportHeight + 1, name + ' dialog vertical overflow');
      const close = page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true });
      const bounds = await close.boundingBox();
      assert(bounds && bounds.width >= 43.5 && bounds.height >= 43.5 && bounds.y >= 0
        && bounds.y + bounds.height <= geometry.viewportHeight + 1, name + ' footer remains reachable');
      geometry.closeButton = bounds;
    }
    // A full-page Chromium capture resizes the layout viewport and tiles fixed drawers.
    // Keep overlay evidence at the actual device viewport, not a stitched tall page.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    write(name + '.png', await page.screenshot({ fullPage: false, animations: 'disabled' }));
    write(name + '-aria.txt', await page.locator('body').ariaSnapshot());
    report.snapshots.push({ name, geometry });
  };
  for (const state of ['observed-NV-reference', 'synthetic-exact2020']) {
    scenario = state;
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(origin + '/escanear/etiqueta', { waitUntil: 'networkidle' });
    const privacy = page.getByRole('checkbox', { name: 'He leído el aviso de privacidad del escáner' });
    if (await privacy.isVisible()) {
      await privacy.check();
      await page.getByRole('button', { name: 'Entiendo y continuar', exact: true }).click();
    }
    await page.locator('input[type=file]').nth(1).setInputFiles(image);
    await page.getByRole('button', { name: 'Revisar vinos', exact: true }).waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: 'Revisar vinos', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.waitForFunction(() => { const el = document.querySelector('[role=dialog]'); return el && Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42) < 1; });
    const dialog = page.getByRole('dialog');
    await dialog.getByTestId('global-wine-reference').waitFor();
    const primary = await dialog.getByTestId('native-wine-primary').innerText();
    if (state === 'observed-NV-reference') {
      assert(primary.includes('Por su estilo:'), 'Reference style is useful but distinct from vintage affinity');
      assert(!primary.includes('Afinidad pendiente'), 'Do not bury the catalogue answer under generic pending');
      assert(primary.includes('no confirma los datos de esa cosecha'));
      assert.equal(await dialog.getByTestId('global-style-estimate').count(), 1);
    } else {
      assert(!primary.includes('Por su estilo:'));
      assert.equal(await dialog.getByTestId('global-style-estimate').count(), 0);
      assert.match(await dialog.innerText(), /no especifica si el perfil sensorial/i);
    }
    const photo = dialog.getByTestId('global-wine-reference').locator('img');
    await photo.evaluate(img => img.decode());
    assert(await photo.evaluate(img => img.naturalWidth > 0));
    for (const [width, height, text] of [[393,852,100], [320,568,100], [393,852,200]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100); }, text);
      await capture(state + '-' + width + '-' + text);
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = '100%'; document.documentElement.classList.remove('matchrim-accessibility-text'); });
    if (state === 'observed-NV-reference') {
      await page.setViewportSize({ width: 393, height: 852 });
      await dialog.getByRole('button', { name: 'Corregir identificación', exact: true }).click();
      await dialog.getByRole('button', { name: 'Buscar otra referencia en Winerim', exact: true }).click();
      await dialog.getByLabel('Nombre del vino o bodega').fill('Vidure');
      await dialog.getByRole('button', { name: 'Buscar', exact: true }).click();
      await dialog.getByRole('button', { name: 'Esta es mi referencia', exact: true }).waitFor();
      assert((await dialog.innerText()).includes('Elegir esta referencia no confirma la cosecha'));
      await capture('manual-global-proposals');
      await dialog.getByRole('button', { name: 'Esta es mi referencia', exact: true }).click();
      await dialog.getByTestId('global-style-estimate').waitFor();
      assert((await dialog.innerText()).includes('Vidure · 2020'), 'NV choice does not erase the photographed year');
      await dialog.locator('.matchrim-scan-region-body').evaluate(el => { el.scrollTop = 0; });
      await capture('manual-global-confirmed');
    }
  }
  assert.equal(report.unexpectedRemote?.length || 0, 0);
  assert.equal(report.pageErrors.length, 0);
  assert.equal(report.consoleErrors.length, 0);
  report.passed = true;
} catch (error) { report.passed = false; report.error = error.stack || String(error); }
finally {
  await context?.close(); await browser?.close(); report.finishedUTC = new Date().toISOString();
  write('report.json', report);
}
console.log(JSON.stringify({ passed: report.passed, snapshots: report.snapshots.length, folder, error: report.error }));
process.exitCode = report.passed ? 0 : 1;

