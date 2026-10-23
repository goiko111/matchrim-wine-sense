import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from '/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const prep = JSON.parse(fs.readFileSync(path.resolve(process.argv[2], 'preparation.json')));
const fixture = JSON.parse(fs.readFileSync(path.resolve(process.argv[3], 'visual-fixture.json')));
const output = path.resolve(process.argv[4]);
assert(output.startsWith(path.resolve('qa-artifacts/continuation187-20261023') + path.sep));
assert(!fs.existsSync(output));
const hash = value => createHash('sha256').update(value).digest('hex');
const guard = () => {
  const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases['heavy-local'];
  assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d'
    && lease.leaseId === process.env.MATCHRIM102_HEAVY_LEASE_ID && lease.reviewAfter * 1000 > Date.now());
  const disk = fs.statfsSync(path.dirname(output)); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
guard(); assert(prep.passed && !prep.sourceDirty);
for (const [file, expected] of Object.entries(prep.sourceFingerprints)) assert.equal(hash(fs.readFileSync(file)), expected, file);
fs.mkdirSync(output, { mode: 0o700 });
const owner = fixture.wines[0].user_id, origin = 'http://127.0.0.1:4898';
const user = { id: owner, aud: 'authenticated', role: 'authenticated', email: 'qa187@example.invalid',
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-10-23T00:00:00Z' };
const jwt = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url') + '.'
  + Buffer.from(JSON.stringify({ sub: owner, exp: 4102444800, role: 'authenticated' })).toString('base64url') + '.synthetic-not-a-real-signature';
const report = { sourceCommit: prep.commit, build: prep.build, startedUTC: new Date().toISOString(),
  scope: 'Isolated production React native branch with synthetic owner/profile/fiche/history and stored local bottle photo. No live backend, recognition, saved-user mutation, UIKit or human taste accuracy claim.',
  captures: [], requests: [], unexpected: [], pageErrors: [], consoleErrors: [], forwardedRequests: 0, modelStarts: 0, writes: 0 };
let browser, context;
try {
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    proxy: { server: 'http://127.0.0.1:9' }, args: ['--disable-background-networking', '--disable-sync', '--no-first-run', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
  context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.routeWebSocket('**/*', socket => socket.close());
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    const json = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value), headers: { 'Access-Control-Allow-Origin': origin } });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (url.origin === origin) {
      let name = decodeURIComponent(url.pathname).slice(1);
      if (!name || !Object.hasOwn(prep.webResources, name) && !path.extname(name)) name = 'index.html';
      if (!Object.hasOwn(prep.webResources, name)) return route.fulfill({ status: 404, body: '' });
      const bytes = fs.readFileSync(path.join(prep.web, name)); assert.equal(hash(bytes), prep.webResources[name]);
      return route.fulfill({ body: bytes, contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' })[path.extname(name)] || 'application/octet-stream' });
    }
    report.requests.push({ method: request.method(), host: url.hostname, path: url.pathname });
    if (url.href === fixture.wines[0].image_url) return route.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync('qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared/img-119.jpg') });
    if (url.pathname === '/auth/v1/user') return json(user);
    if (request.method() === 'GET' && url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.split('/').at(-1);
      if (table === 'user_wines') return json(fixture.wines);
      if (table === 'quiz_results') return json(url.searchParams.get('select')?.includes('id') ? [{ id: 'qa187', ...fixture.profile }] : fixture.profile);
      if (table === 'profiles') return json({ id: owner, preferred_language: 'ES' });
      return json([]);
    }
    report.unexpected.push({ method: request.method(), host: url.hostname, path: url.pathname });
    if (!['GET', 'HEAD'].includes(request.method())) report.writes++;
    return route.abort('blockedbyclient');
  });
  await context.addInitScript(({ user, jwt, profile, owner }) => {
    window.CapacitorCustomPlatform = { name: 'ios' };
    localStorage.setItem('sb-cbjynrbvrhcmpaojmqdp-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'synthetic-only', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user }));
    localStorage.setItem('matchrim.local_profile_owner.v1', owner);
    localStorage.setItem('matchrim_quiz_result', JSON.stringify(profile));
  }, { user, jwt, profile: fixture.profile, owner });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  await page.goto(origin + '/my-wines', { waitUntil: 'networkidle' });
  await page.getByTestId('native-cellar-item98').waitFor();
  await page.getByTestId('native-cellar-item98').click();
  await page.getByRole('dialog').waitFor();
  for (const [width, height, text] of [[393,852,100], [320,568,100], [393,852,200]]) {
    guard(); await page.setViewportSize({ width, height });
    await page.evaluate(async text => {
      document.documentElement.style.fontSize = text + '%';
      document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100);
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, text);
    const panel = page.getByTestId('cellar-wine-affinity');
    await panel.getByText('≈25/100', { exact: true }).waitFor();
    assert.match(await panel.innerText(), /Al guardar: 24\/100/);
    assert.match(await panel.innerText(), /esta diferencia no indica que hayan cambiado tus gustos/);
    assert(!/\+1 punto/.test(await panel.innerText()));
    await panel.scrollIntoViewIfNeeded();
    const dimensions = await panel.evaluate(el => ({ viewport: innerWidth, document: document.documentElement.scrollWidth,
      panelWidth: el.getBoundingClientRect().width, panelScroll: el.scrollWidth,
      buttons: [...el.querySelectorAll('button')].map(button => ({ label: button.textContent, width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })) }));
    assert(dimensions.document <= width + 1 && dimensions.panelScroll <= dimensions.panelWidth + 1);
    assert(dimensions.buttons.every(button => button.height >= 43.5));
    const name = `cellar187-${width}-${text}`;
    fs.writeFileSync(path.join(output, name + '.png'), await page.screenshot({ fullPage: false, animations: 'disabled' }), { mode: 0o600 });
    fs.writeFileSync(path.join(output, name + '-aria.txt'), await page.locator('body').ariaSnapshot(), { mode: 0o600 });
    report.captures.push({ name, dimensions });
  }
  assert.equal(report.unexpected.length, 0); assert.equal(report.pageErrors.length, 0); assert.equal(report.consoleErrors.length, 0);
  report.passed = true;
} catch (error) { report.passed = false; report.error = error.stack; }
finally {
  await context?.close(); await browser?.close(); report.finishedUTC = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'RESULT.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify(report)); if (!report.passed) process.exitCode = 1;
