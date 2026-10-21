import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from '/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { image128, names128, detection128, reading128 } from './matchrim-dense128-fixture.mjs';
import { makeProfiles131, session131 } from './matchrim-profiles131-fixture.mjs';

const repo = process.cwd();
const preparation = JSON.parse(fs.readFileSync(path.resolve(process.argv[2], 'preparation.json')));
const folder = path.resolve(process.argv[3]);
const sha = value => createHash('sha256').update(value).digest('hex');
const fixture = { localCandidate: { name: 'Vidure', producer: 'Pago de Cirsus', vintage: 2020 }, ocrLines: ['VIDURE', 'Pago de Cirsus', '2020'] };
const scenarios = process.argv[4] ? [process.argv[4]] : ['observed-NV-reference', 'synthetic-exact2020', 'assisted-missing-producer'];
assert(scenarios.every(state => ['observed-NV-reference', 'synthetic-exact2020', 'assisted-missing-producer', 'award-year-inline', 'saved-NV-reference', 'local-ocr106', 'local-first109', 'profile-history116', 'quiz-history118', 'dense128', 'profiles50-131'].includes(state)));
const globalObserved = JSON.parse(fs.readFileSync('qa-artifacts/native102-20261021/global-store103-r1/04-body.json'));
const awardObserved = JSON.parse(fs.readFileSync('qa-artifacts/global103-20261021/ocr200-r1/response-358.json')).results.find(row => row.id === 375658);
const localOCR = scenarios.some(state => ['local-ocr106', 'local-first109'].includes(state)) ? JSON.parse(fs.readFileSync('qa-artifacts/night105-20261021/native-ocr106-r3/OCR.json')).results.find(row => row.file === 'img-061.jpg').response.data : null;
const localRequest = localOCR && JSON.parse(fs.readFileSync('qa-artifacts/global103-20261021/ocr200-r1/REQUESTS.json')).find(row => new URL(row.url).searchParams.get('text') === 'BIOGRAFO');
const localRows = localRequest ? JSON.parse(fs.readFileSync(path.join('qa-artifacts/global103-20261021/ocr200-r1', localRequest.body))).results : [];
let scenario = 'observed-NV-reference';
let savedWines = [];
let profileHistoryHealthy = false;
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
let activeProfile = profile;
const profileEmail116 = 'synthetic-account115-' + 'long'.repeat(24) + '@example.invalid';
const profiles131 = makeProfiles131(owner);
const user = scenarios.includes('profiles50-131') ? profiles131[0].user : { id: owner, aud: 'authenticated', role: 'authenticated', email: scenarios.includes('profile-history116') ? profileEmail116 : 'native102@example.invalid',
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-10-21T00:00:00Z' };
const jwt = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.'
  + Buffer.from(JSON.stringify({ sub: owner, exp: 4102444800, role: 'authenticated' })).toString('base64url') + '.synthetic-not-a-real-signature';
const report = { startedUTC: new Date().toISOString(), sourceCommit: preparation.commit,
  scope: 'Production-mode React native branch in isolated Chromium portrait emulation; synthetic account, detector and candidate transport. User screenshot uploaded to fully intercepted test transport. Real saved public Vidure response replay plus synthetic exact2020 variant, NOT live recognition, paid image analysis or UIKit/device approval.',
  imageHash: sha(fs.readFileSync(image)), preparation: preparation.root, requests: [], snapshots: [], pageErrors: [], consoleErrors: [],
  imageInputs: [], awardScenarioScope: 'If selected: img184 preserved prepared photo with synthetic inline LYON GOLD2026 evidence, not a real model response or runtime spatial OCR. Saved public search row projected without catalogue photo (asset unobserved); no fabricated detail/affinity.',
  paidModelStarts: 0, forwardedRequests: 0, realAccountsCreated: 0, productionWrites: 0, masterConnectionActive: false,
  scenarios, captureMode: 'Responsive desktop Chromium viewport with native Capacitor CSS branch and touch; not mobile-browser engine. Avoids known Chromium mobile fixed-layer screenshot duplication after viewport/text resizing.' };
report.harnessSHA256 = sha(fs.readFileSync('scripts/qa-matchrim-global103.mjs'));
report.dense128FixtureSHA256 = sha(fs.readFileSync('scripts/matchrim-dense128-fixture.mjs'));
report.profiles131FixtureSHA256 = sha(fs.readFileSync('scripts/matchrim-profiles131-fixture.mjs'));
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
    if (scenario === 'profiles50-131') {
      if (url.pathname === '/auth/v1/user' || url.pathname.startsWith('/rest/v1/')) {
        assert.equal(request.method(), 'GET', 'Synthetic owner transitions must not issue account/data writes');
        const token = request.headers().authorization?.replace(/^Bearer /i, '');
        const subject = token && JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub;
        const person = profiles131.find(row => row.user.id === subject); assert(person, 'Only synthetic owner tokens are accepted');
        if (url.pathname === '/auth/v1/user') return json(person.user);
        const table = url.pathname.split('/').at(-1);
        if (['quiz_results', 'user_wines'].includes(table)) {
          assert.equal(url.searchParams.get('user_id'), 'eq.' + subject, 'Every personal read must match its current token owner');
          report.profiles131Reads = [...(report.profiles131Reads || []), { table, owner: subject }];
          return json(table === 'user_wines' ? [] : [{ id: 'qa131-' + subject, user_id: subject,
            ...person.profile, created_at: '2026-10-21T00:00:00Z', wine_recommendations: [] }]);
        }
        if (table === 'profiles') return json({ id: subject, preferred_language: 'ES' });
        return json([]);
      }
      if (url.pathname.endsWith('/matchrim-recommendations')) return json([]);
    }
    if (url.pathname === '/auth/v1/user') return json(user);
    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.split('/').at(-1);
      if (table === 'quiz_results' && ['profile-history116', 'quiz-history118'].includes(scenario)) {
        assert.equal(request.method(), 'GET', 'History visual checks must not write quiz data');
        if (!profileHistoryHealthy) return route.fulfill({ status: 503, contentType: 'application/json',
          body: JSON.stringify({ message: 'Controlled offline regression', code: 'QA116' }), headers: { 'Access-Control-Allow-Origin': origin } });
        return json([{ id: 'qa-quiz116', ...activeProfile, created_at: '2026-10-21T00:00:00Z', wine_recommendations: [] }]);
      }
      if (table === 'quiz_results') return json(url.searchParams.get('select')?.split(',').includes('id') ? [{ id: 'qa-quiz', ...activeProfile }] : activeProfile);
      if (table === 'user_wines') {
        if (request.method() === 'POST') {
          assert.equal(scenario, 'saved-NV-reference', 'Unexpected simulated write');
          const payload = request.postDataJSON(); assert(!Array.isArray(payload));
          assert.equal(payload.place_details.winerim_public_catalogue.catalogue_vintage, null);
          assert.equal(payload.place_details.winerim_public_catalogue.bottle_identity.vintage, 2020);
          assert.equal(payload.sensory_attributes, null); assert.equal(payload.matchrim_affinity, null);
          assert.equal(payload.place_details.matchrim_reference_style110.initial.score, report.initialReferenceStyle);
          savedWines = [{ ...payload, id: '00000000-0000-4000-8000-000000010701', created_at: '2026-10-21T19:00:00Z', updated_at: '2026-10-21T19:00:00Z', rating: null }];
          report.simulatedSave = { referenceId: payload.place_details.winerim_public_catalogue.id,
            vintage: payload.vintage, sensory: null, affinity: null, productionWrite: false };
          return json(savedWines[0]);
        }
        return json(savedWines, { 'Content-Range': savedWines.length ? '0-0/1' : '0-0/0' });
      }
      return json(table === 'profiles' ? { id: owner, preferred_language: 'ES' } : []);
    }
    if (['profile-history116', 'quiz-history118'].includes(scenario) && url.pathname.endsWith('/matchrim-recommendations')) return json([]);
    if (scenario === 'dense128' && url.pathname.endsWith('/detect-wine-regions-v72')) {
      report.dense128DetectorCalls = (report.dense128DetectorCalls || 0) + 1;
      return json(detection128());
    }
    if (scenario === 'dense128' && url.pathname.endsWith('/analyze-wine-region-v72')) {
      const index = request.postDataJSON().region_index;
      report.dense128AnalysisCalls = [...(report.dense128AnalysisCalls || []), index];
      return json(reading128(index));
    }
    if (url.pathname.endsWith('/detect-wine-regions-v72')) return json({ regions: [{ box: { x: 3, y: 5, width: 94, height: 90 }, confidence: .99,
      object_type: 'bottle', quality: { glare: 'low', occlusion: 'low', legibility: 'good' } }],
      coverage: { status: 'reported_complete', detected_objects: 1, estimated_visible_objects: 1, confidence: .99 } });
    if (url.pathname.endsWith('/analyze-wine-region-v72') && scenario === 'award-year-inline') return json({ candidates: [{
      name: 'Muscadet La Cuvée Lucien', producer: null, vintage: 2026, confidence: .95, source: 'label',
      evidence: ['MUSCADET', 'LA CUVÉE LUCIEN', 'MAILLARD', 'LYON GOLD 2026'], inferred_fields: [], uncertainty_reasons: [],
    }] });
    if (url.pathname.endsWith('/analyze-wine-region-v72') && scenario === 'local-ocr106') return json({ candidates: [{
      name: 'Biografo', producer: null, vintage: null, confidence: .9, source: 'label', evidence: ['BIOGRAFO'], inferred_fields: [], uncertainty_reasons: [],
    }] });
    if (url.pathname.endsWith('/analyze-wine-region-v72')) return json({ candidates: [{ ...fixture.localCandidate,
      ...(scenario === 'assisted-missing-producer' ? { producer: null } : {}),
      confidence: .95, source: 'label', evidence: scenario === 'assisted-missing-producer' ? ['VIDURE', '2020'] : fixture.ocrLines, inferred_fields: [], uncertainty_reasons: [] }] });
    if (url.hostname === 'app.winerim.com' && url.pathname.startsWith('/images/wines/')) return route.fulfill({ body: fs.readFileSync('qa-artifacts/global103-20261021/vidure-public-photo.png'), contentType: 'image/png' });
    if (url.hostname === 'app.winerim.com' && url.pathname.includes('/00000000-0000-0000-0000-000000000001/wines')) {
      if (scenario === 'local-ocr106' || scenario === 'local-first109') {
        assert(url.searchParams.has('text'), 'Local OCR visual scenario does not fabricate independent detail');
        return json({ count: localRows.length, page: 1, results: localRows.map(row => ({ ...row, photo: null })) });
      }
      if (scenario === 'award-year-inline') {
        assert(url.searchParams.has('text'), 'Award scenario must not fabricate independent detail verification');
        return json({ count: 1, page: 1, results: [{ ...awardObserved, photo: null }] });
      }
      const row = { ...globalObserved, ...(scenario === 'synthetic-exact2020' ? { vintage: '2020' } : {}) };
      return json(url.searchParams.has('text') ? { count: 1, page: 1, results: [row] } : row);
    }
    report.unexpectedRemote = [...(report.unexpectedRemote || []), { host: url.hostname, path: url.pathname }];
    return route.abort('blockedbyclient');
  });
  await context.addInitScript(({ user, jwt, profile, owner, localOCR }) => {
    window.CapacitorCustomPlatform = { name: 'ios' };
    if (localOCR) {
      window.__localOCRCalls106 = 0;
      window.Capacitor = { PluginHeaders: [{ name: 'MatchrimOCR', methods: [{ name: 'recognize', rtype: 'promise' }, { name: 'cancel', rtype: 'promise' }] }],
        nativePromise: async (plugin, method, options) => {
          if (plugin !== 'MatchrimOCR') throw Error('Unexpected native plugin');
          if (method === 'cancel') return { requestId: options.requestId, cancelled: true };
          if (!/^data:image\/(jpeg|png);base64,/.test(options.image)) throw Error('Local crop missing');
          window.__localOCRCalls106++; return { ...localOCR, requestId: options.requestId };
        } };
    }
    localStorage.setItem('sb-cbjynrbvrhcmpaojmqdp-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'synthetic-only', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user }));
    localStorage.setItem('matchrim.local_profile_owner.v1', owner);
    localStorage.setItem('matchrim_quiz_result', JSON.stringify(profile));
  }, { user, jwt, profile, owner, localOCR });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push(String(error)));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    if (['profile-history116', 'quiz-history118'].includes(scenario) && message.location().url.includes('/rest/v1/quiz_results')
      && /503/.test(message.text())) {
      report.expectedOfflineConsoleErrors = [...(report.expectedOfflineConsoleErrors || []), message.text()];
    } else report.consoleErrors.push(message.text());
  });
  const capture = async name => {
    guard();
    const geometry = await page.evaluate(() => ({ viewport: innerWidth, viewportHeight: innerHeight, document: document.documentElement.scrollWidth,
      dialog: (() => { const r = document.querySelector('[role=dialog]')?.getBoundingClientRect(); return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null; })() }));
    assert(geometry.document <= geometry.viewport + 1, name + ' page overflow');
    if (geometry.dialog) {
      assert(geometry.dialog.left >= -1 && geometry.dialog.right <= geometry.viewport + 1, name + ' dialog overflow');
      assert(geometry.dialog.top >= -1 && geometry.dialog.bottom <= geometry.viewportHeight + 1, name + ' dialog vertical overflow');
      const close = page.getByRole('dialog').getByRole('button', { name: /^(Cerrar|Cerrar vino)$/ });
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
  for (const state of scenarios) {
    scenario = state;
    savedWines = [];
    activeProfile = profile;
    await page.setViewportSize({ width: 393, height: 852 });
    if (state === 'profiles50-131') {
      report.profiles131Scope = '50 synthetic auth-state sessions through the actual client BroadcastChannel listener in one mounted Profile route. Fully intercepted read-only transports, empty training/collection fixtures. No signup, real account, real taste/learning study, physical iPhone or provider call.';
      await page.goto(origin + '/profile', { waitUntil: 'networkidle' });
      report.profiles131 = [];
      const axes = [['Potente','potente'], ['Acidez','acidez'], ['Dulce','dulce'], ['Tánico','tanico'], ['Afrutado','afrutado']];
      for (const [index, person] of profiles131.entries()) {
        if (index > 0) {
          await page.evaluate(session => {
            const key = 'sb-cbjynrbvrhcmpaojmqdp-auth-token';
            localStorage.setItem(key, JSON.stringify(session));
            const channel = new BroadcastChannel(key);
            channel.postMessage({ event: 'SIGNED_IN', session });
            setTimeout(() => channel.close(), 100);
          }, session131(person.user));
        }
        await page.getByText(person.user.email, { exact: true }).waitFor();
        await page.getByRole('meter', { name: 'Potente: perfil actual', exact: true }).waitFor();
        const observed = {};
        for (const [label, key] of axes) {
          const meter = page.getByRole('meter', { name: label + ': perfil actual', exact: true });
          const value = Number(await meter.getAttribute('aria-valuenow'));
          assert.equal(value, person.profile[key], 'Current account profile must not reuse the prior account vector');
          assert.equal(await meter.getAttribute('aria-valuemin'), '0');
          assert.equal(await meter.getAttribute('aria-valuemax'), '5'); observed[key] = value;
        }
        const emails = await page.locator('body').innerText();
        assert.deepEqual(emails.match(/qa-profile131-\d{2}@example\.invalid/g), [person.user.email]);
        report.profiles131.push({ number: index+1, owner: person.user.id, exactProfile: observed });
        write('profiles131-progress.json', report.profiles131);
        if ([0,24,49].includes(index)) {
          await page.getByRole('heading', { name: /Tu perfil sensorial/ }).scrollIntoViewIfNeeded();
          await capture('profiles131-' + String(index+1).padStart(2,'0'));
        }
      }
      assert.equal(new Set(report.profiles131.map(row => JSON.stringify(row.exactProfile))).size, 50);
      for (const [width, height, text] of [[320,568,100], [393,852,200]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100); }, text);
        await page.getByRole('heading', { name: /Tu perfil sensorial/ }).scrollIntoViewIfNeeded();
        await capture('profiles131-final-' + width + '-' + text);
      }
      continue;
    }
    if (state === 'quiz-history118') {
      report.quizScope118 = 'Actual native-branch React saved-quiz503/retry and explicit-retake route with fully intercepted synthetic auth/history. No new quiz completed or saved; not real native/device QA.';
      await page.goto(origin + '/matchrim', { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'No hemos podido cargar tu test guardado', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Comenzar el test', exact: true }).count(), 0);
      for (const [width, height, text] of [[393,852,100], [320,568,100], [393,852,200]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100); }, text);
        const retry = page.getByRole('button', { name: 'Reintentar carga', exact: true });
        await retry.evaluate(element => element.scrollIntoView({ block: 'center' }));
        const box = await retry.boundingBox(); assert(box && box.height >= 43.5 && box.x >= 0 && box.x + box.width <= width + 1);
        assert(await retry.evaluate(element => { const r = element.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height * .9); return hit === element || element.contains(hit); }));
        await capture('quiz118-error-' + width + '-' + text);
      }
      profileHistoryHealthy = true;
      await page.getByRole('button', { name: 'Reintentar carga', exact: true }).click();
      await page.getByRole('heading', { name: 'Tu perfil', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Comenzar el test', exact: true }).count(), 0);
      await page.evaluate(() => { document.documentElement.style.fontSize = '100%'; document.documentElement.classList.remove('matchrim-accessibility-text'); });
      await page.setViewportSize({ width: 393, height: 852 });
      await capture('quiz118-recovered-saved-profile');
      await page.goto(origin + '/profile', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Realizar Nuevo Test', exact: true }).click();
      await page.waitForURL(origin + '/matchrim?retake=1');
      await page.getByRole('heading', { name: 'Test de paladar', exact: true }).waitFor();
      for (const [width, height, text] of [[320,568,100], [393,852,200]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100); }, text);
        await page.getByRole('button', { name: 'Comenzar el test', exact: true }).evaluate(element => element.scrollIntoView({ block: 'center' }));
        await capture('quiz118-explicit-retake-' + width + '-' + text);
      }
      assert(!report.requests.some(row => row.method !== 'GET'), 'Quiz recovery/retake must not silently save any answers');
      report.quizHistory118 = { errorDistinctFromEmpty: true, retryRestoredSavedProfile: true,
        explicitRetakeReachedIntro: true, quizWrites: 0, productionWrites: 0 };
      continue;
    }
    if (state === 'profile-history116') {
      report.profileScope116 = 'Actual native-branch React Profile with fully intercepted synthetic auth and503/history recovery. Not a real account, native runtime, model or production write.';
      const email = profileEmail116;
      await page.goto(origin + '/profile', { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'No hemos podido cargar tu test', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Realizar Test de Perfil', exact: true }).count(), 0);
      for (const [width, height, text] of [[393,852,100], [320,568,100], [393,852,200]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100); }, text);
        const retry = page.getByRole('button', { name: 'Reintentar perfil', exact: true });
        await retry.evaluate(element => element.scrollIntoView({ block: 'center' }));
        const bounds = await retry.boundingBox(); assert(bounds && bounds.height >= 43.5);
        assert(await retry.evaluate(element => {
          const rect = element.getBoundingClientRect();
          return [.5, .9].every(fraction => { const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height * fraction);
            return hit === element || element.contains(hit); });
        }), 'Retry must be physically reachable above the fixed navigation, not merely intersect the viewport');
        await capture('profile116-error-' + width + '-' + text);
      }
      profileHistoryHealthy = true;
      await page.getByRole('button', { name: 'Reintentar perfil', exact: true }).click();
      await page.getByRole('heading', { name: 'Mi Perfil', exact: true }).waitFor();
      await page.getByRole('tab', { name: 'Perfil Sensorial', exact: true }).waitFor();
      assert.equal(await page.getByRole('heading', { name: 'No hemos podido cargar tu test', exact: true }).count(), 0);
      for (const [width, height, text] of [[393,852,100], [320,568,100], [393,852,200]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100); }, text);
        await page.getByText('Tu cuenta', { exact: true }).scrollIntoViewIfNeeded();
        assert(await page.getByText(email, { exact: true }).isVisible());
        const settings = await page.getByRole('button', { name: 'Ajustes de cuenta', exact: true }).boundingBox();
        assert(settings && settings.width >= 43.5 && settings.height >= 43.5 && settings.x >= 0 && settings.x + settings.width <= width + 1);
        await capture('profile115-account-' + width + '-' + text);
      }
      report.profileHistory116 = { errorDistinctFromEmpty: true, retryRecovered: true, minimumTouchTargets: true,
        syntheticLongEmailVisible: true, productionWrites: 0 };
      continue;
    }
    await page.goto(origin + '/escanear/etiqueta', { waitUntil: 'networkidle' });
    const privacy = page.getByRole('checkbox', { name: 'He leído el aviso de privacidad del escáner' });
    if (await privacy.isVisible()) {
      await privacy.check();
      await page.getByRole('button', { name: 'Entiendo y continuar', exact: true }).click();
    }
    if (state === 'local-first109') await page.getByRole('button', { name: 'Una etiqueta', exact: true }).click();
    const activeImage = state === 'dense128' ? image128 : ['award-year-inline', 'local-ocr106', 'local-first109'].includes(state) ? path.resolve('qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared', state === 'award-year-inline' ? 'img-184.jpg' : 'img-061.jpg') : image;
    report.imageInputs.push({ scenario: state, path: activeImage, sha256: sha(fs.readFileSync(activeImage)) });
    await page.locator('input[type=file]').nth(1).setInputFiles(activeImage);
    if (state !== 'local-first109') {
      await page.getByRole('button', { name: 'Revisar vinos', exact: true }).waitFor({ timeout: 20000 });
      await page.getByRole('button', { name: 'Revisar vinos', exact: true }).click();
    }
    await page.getByRole('dialog').waitFor();
    await page.waitForFunction(() => { const el = document.querySelector('[role=dialog]'); return el && Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42) < 1; });
    const dialog = page.getByRole('dialog');
    if (state === 'dense128') {
      report.dense128Scope = 'Real preserved dense photo, synthetic30 detector boxes and six repeated synthetic identities plus one unreadable response. Fully intercepted transport, including intentionally unverified99 score. UI/budget/deduplication/comparison only; no real recognition, model, account, save or inventory accuracy claim.';
      await dialog.getByRole('heading', { level: 2 }).waitFor();
      assert(!(await dialog.innerText()).includes('99/100'), 'An unverified model number is not an affinity');
      await capture('dense128-first-review');
      await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
      for (let pass = 0; pass < 3; pass++) {
        const next = page.getByTestId('scan-continue-batch').getByRole('button');
        if (!await next.isVisible()) break;
        await next.click();
        await page.waitForFunction(() => {
          const button = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === 'Revisar vinos');
          return button && !button.disabled;
        }, null, { timeout: 20000 });
      }
      assert.equal(report.dense128DetectorCalls, 1, 'No unplanned detector refinement in a complete interface fixture');
      assert.equal(report.dense128AnalysisCalls.length, 30);
      assert.equal(new Set(report.dense128AnalysisCalls).size, 30, 'Continuation must not reread previous regions');
      await page.getByRole('tab', { name: 'Escena', exact: true }).click();
      const stage = page.locator('.matchrim-scan-stage');
      await stage.scrollIntoViewIfNeeded();
      for (const [width, height, text] of [[393,852,100], [320,568,100], [393,852,200]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100); }, text);
        await stage.scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const pins = await stage.locator('button').evaluateAll(nodes => nodes.map(node => {
          const r = node.getBoundingClientRect(); return { label: node.textContent.trim(), x: r.x, y: r.y, w: r.width, h: r.height };
        }));
        assert(pins.length > 0 && pins.length <= 30);
        for (const pin of pins) assert(/^(?:\+)?\d+$/.test(pin.label) && pin.w >= 43.5 && pin.h >= 43.5);
        for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
          const a = pins[i], b = pins[j];
          assert(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x) <= .5
            || Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y) <= .5, 'Dense pin touch targets overlap');
        }
        await capture('dense128-scene-' + width + '-' + text);
      }
      await page.setViewportSize({ width: 393, height: 852 });
      await page.evaluate(() => { document.documentElement.style.fontSize = '100%'; document.documentElement.classList.remove('matchrim-accessibility-text'); });
      await page.getByRole('tab', { name: /^Vinos/ }).click();
      assert.equal(await page.getByRole('button', { name: /^Abrir detalle de QA/ }).count(), 6, 'Six references, not thirty duplicate rows');
      for (const value of await page.getByTestId('scan-affinity-value').allTextContents()) assert(!/\d/.test(value), 'Unverified scores stay pending');
      await page.getByRole('tab', { name: 'Comparar', exact: true }).click();
      const boxes = page.getByRole('checkbox', { name: /^Comparar QA/ });
      assert.equal(await boxes.count(), 6);
      for (const box of await boxes.all()) if (await box.isChecked()) await box.uncheck();
      for (let i = 0; i < 2; i++) await boxes.nth(i).check();
      await page.getByText('2/5 seleccionados', { exact: true }).waitFor();
      for (let i = 2; i < 5; i++) await boxes.nth(i).check();
      await page.getByText('5/5 seleccionados', { exact: true }).waitFor();
      assert.equal(await boxes.nth(5).isDisabled(), true);
      await page.getByRole('button', { name: 'Servicio', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Servicio', exact: true }).getAttribute('aria-pressed'), 'true');
      for (const [width, height, text] of [[393,852,100], [320,568,100], [393,852,200]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100); }, text);
        await page.getByRole('heading', { name: 'Comparar 2–5 vinos', exact: true }).scrollIntoViewIfNeeded();
        await capture('dense128-comparison-' + width + '-' + text);
      }
      assert(!/99\/100/.test(await page.locator('body').innerText()));
      report.dense128Comparison = { references: names128.length, maximumSelection: 5, serviceMode: true, fakeAffinityHidden: true };
      continue;
    }
    if (state === 'local-ocr106' || state === 'local-first109') {
      const recovery = dialog.getByTestId('global-recovery104');
      if (state === 'local-ocr106') {
        const read = recovery.getByRole('button', { name: 'Releer recorte en este iPhone', exact: true }); await read.waitFor();
        await read.click();
      }
      await recovery.getByRole('button', { name: 'Confirmar esta referencia', exact: true }).waitFor();
      assert.match(await recovery.innerText(), /Biógrafo del Vino/i);
      assert.equal(await page.evaluate(() => window.__localOCRCalls106), 1);
      assert.equal(await dialog.getByTestId('global-wine-reference').count(), 0, 'No automatic identity from local OCR');
      if (state === 'local-first109') {
        assert.equal(report.requests.filter(row => row.path.startsWith('/functions/v1/')).length, 0, 'No cloud analysis function may be dispatched by explicit local mode');
        assert((await dialog.getByRole('heading', { level: 2 }).innerText()).includes('Etiqueta por identificar'));
        report.localFirst109 = { noCloudFunctions: true, automaticCanonicalIdentity: false, userSelectedOneLabel: true };
      }
      report.localOCRScope = 'Replays actual simulator106 whole-image OCR for img061 through emulated Capacitor nativePromise into the crop recovery UI. Not live WebView-to-Vision E2E or independent crop OCR; no independent detail fabricated.';
      for (const [width, height, text] of [[393,852,100], [320,568,100], [393,852,200]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100); }, text);
        await recovery.getByRole('button', { name: 'Confirmar esta referencia', exact: true }).first().scrollIntoViewIfNeeded();
        await capture((state === 'local-first109' ? 'local-first109' : 'local-ocr-proposals') + '-' + width + '-' + text);
      }
      continue;
    }
    if (state === 'saved-NV-reference') {
      await dialog.getByTestId('global-style-estimate').waitFor();
      report.initialReferenceStyle = Number((await dialog.getByTestId('global-style-estimate').innerText()).match(/≈(\d+)\/100/)[1]);
      await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
      await page.getByRole('button', { name: 'Confirmar 1 referencia', exact: true }).click();
      await page.getByRole('button', { name: 'Lote confirmado', exact: true }).waitFor();
      assert.equal(savedWines.length, 1);
      await page.goto(origin + '/my-wines/wishlist', { waitUntil: 'networkidle' });
      await page.getByTestId('native-cellar-item98').getByText('Vidure', { exact: true }).click();
      const link = page.getByTestId('cellar-public-reference107'); await link.waitFor();
      assert.equal(await page.getByRole('dialog').getByRole('button', { name: 'Ficha original Winerim', exact: true }).count(), 0,
        'A linked public fiche must not also offer the legacy partial-Library lookup');
      assert.equal(await link.getAttribute('href'), `https://web.winerim.com/matchrim/store/${globalObserved.id}/${globalObserved.slugname}`);
      assert((await page.getByRole('dialog').innerText()).includes('Referencia sin añada'));
      const style = page.getByTestId('cellar-reference-style110'); await style.waitFor();
      assert((await style.innerText()).includes(`Al guardar: ≈${report.initialReferenceStyle}/100`));
      for (const [width, height, text] of [[393,852,100], [320,568,100], [393,852,200]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100); }, text);
        await style.scrollIntoViewIfNeeded(); await capture('saved-NV-fiche-' + width + '-' + text);
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = '100%'; document.documentElement.classList.remove('matchrim-accessibility-text'); });
      await page.setViewportSize({ width: 393, height: 852 });
      activeProfile = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByTestId('native-cellar-item98').getByText('Vidure', { exact: true }).click();
      const evolved = page.getByTestId('cellar-reference-style110'); await evolved.waitFor();
      const current = Number((await evolved.innerText()).match(/≈(\d+)\/100/)[1]);
      assert.notEqual(current, report.initialReferenceStyle, 'Current style follows the new profile');
      assert((await evolved.innerText()).includes(`Al guardar: ≈${report.initialReferenceStyle}/100`));
      assert.equal(savedWines[0].place_details.matchrim_reference_style110.initial.score, report.initialReferenceStyle);
      report.styleProfileEvolution = { initial: report.initialReferenceStyle, current, syntheticProfiles: 2, serverHistoryUnchanged: true };
      await evolved.scrollIntoViewIfNeeded(); await capture('saved-NV-style-profile-evolved');
      continue;
    }
    if (state === 'award-year-inline') {
      assert(!(await dialog.getByRole('heading', { level: 2 }).first().innerText()).includes('2026'), 'Award year is not a vintage in the identity header');
      assert.equal(await dialog.getByTestId('global-wine-reference').count(), 0);
      const recovery = dialog.getByTestId('global-recovery104');
      await recovery.getByRole('button', { name: 'Encontrar mi vino en Winerim', exact: true }).click();
      await recovery.getByRole('button', { name: 'Confirmar esta referencia', exact: true }).waitFor();
      assert((await recovery.innerText()).includes('cambiará tu añada a 2025'));
      assert.equal(await dialog.getByTestId('global-style-estimate').count(), 0);
      for (const [width, height, text] of [[393,852,100], [320,568,100], [393,852,200]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100); }, text);
        await recovery.getByRole('button', { name: 'Confirmar esta referencia', exact: true }).scrollIntoViewIfNeeded();
        await capture('award-year-proposal-' + width + '-' + text);
      }
      continue;
    }
    if (state === 'assisted-missing-producer') {
      const recovery = dialog.getByTestId('global-recovery104');
      await recovery.waitFor();
      assert.equal(await dialog.getByTestId('global-wine-reference').count(), 0);
      await recovery.getByRole('button', { name: 'Encontrar mi vino en Winerim', exact: true }).click();
      await recovery.getByRole('button', { name: 'Confirmar esta referencia', exact: true }).waitFor();
      assert((await recovery.innerText()).includes('Comprueba la bodega'));
      assert.equal(await dialog.getByTestId('global-style-estimate').count(), 0);
      for (const [width, height, text] of [[393,852,100], [320,568,100], [393,852,200]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; document.documentElement.classList.toggle('matchrim-accessibility-text', text > 100); }, text);
        await recovery.getByRole('button', { name: 'Confirmar esta referencia', exact: true }).scrollIntoViewIfNeeded();
        await capture('assisted-proposal-' + width + '-' + text);
      }
      await recovery.getByRole('button', { name: 'Confirmar esta referencia', exact: true }).click();
      await dialog.getByTestId('global-style-estimate').waitFor();
      assert((await dialog.innerText()).includes('Vidure · 2020'));
      await dialog.locator('.matchrim-scan-region-body').evaluate(el => { el.scrollTop = 0; });
      await capture('assisted-confirmed');
      continue;
    }
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

