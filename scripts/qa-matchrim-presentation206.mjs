import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';

const repo = process.cwd(), out = path.resolve(process.argv[2]);
const scrollOnly = process.argv[3] === 'scroll';
assert(process.argv[3] === undefined || scrollOnly);
const baselineFocus = process.argv[4] === 'baseline';
assert(process.argv[4] === undefined || (scrollOnly && baselineFocus));
assert(path.dirname(out) === path.join(repo, 'qa-artifacts/presentation206-20261024') && /^visual-r\d+$/.test(path.basename(out)) && !fs.existsSync(out));
const guard = () => {
  const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases['heavy-local'];
  assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && lease.leaseId === process.env.MATCHRIM102_HEAVY_LEASE_ID && lease.reviewAfter * 1000 > Date.now(), 'HEAVY_LEASE_REQUIRED');
  const disk = fs.statfsSync(repo); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
guard(); fs.mkdirSync(out, { mode: 0o700 });
const files = ['NativeAppHome', 'NativeHome98', 'WineCard', 'NativeAffinitySummary'].map(name => `src/components/${name}.tsx`);
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sources = Object.fromEntries(files.map(file => [file, hash(file)]));
const report = JSON.parse(fs.readFileSync('qa-artifacts/night105-20261021/native112-corpus200-r21/REPORT.json'));
const ids = ['img-021', 'img-001'];
const wines = ids.map((id, index) => ({ ...report.rows.find(row => row.imageId === id).proposals[0].row,
  photo: `/input206/${id}.jpg`, originalSheetSource: 'winerim-api',
  tastingAttributes: { scale: 'winerim-0-5', power: 3 + index, acidity: 4, sweetness: 1 + index * 3, tannin: 0, fruity: 3 + index } }));
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useLocation}from'react-router-dom';
import NativeAppHome from'/src/components/NativeAppHome.tsx';import{NativeAffinitySummary}from'/src/components/NativeAffinitySummary.tsx';import{I18nProvider}from'/src/i18n/index.tsx';
import{calculateLocalMatchrimAffinity,currentLocalAffinityModel187}from'/src/utils/wineAffinityExplanation.ts';import'/src/index.css';
const mode=new URLSearchParams(location.search).get('mode')||'home';const profile=mode==='opposite'?{potente:5,acidez:0,dulce:5,tanico:5,afrutado:5}:{potente:3,acidez:4,dulce:1,tanico:0,afrutado:3};
const wines=${JSON.stringify(wines)}.map(wine=>({...wine,affinityModel:currentLocalAffinityModel187(wine.tastingAttributes),matchPercentage:calculateLocalMatchrimAffinity(profile,wine.tastingAttributes)}));
function App(){const route=useLocation();return <><output data-testid="route206" className="sr-only">{route.pathname}</output><output data-testid="state206" className="sr-only">{JSON.stringify(route.state)}</output>{mode.startsWith('personal')||mode==='pending'?<main style={{padding:16,maxWidth:440,margin:'auto'}}><NativeAffinitySummary profile={profile} attributes={wines[1].tastingAttributes} score={wines[1].matchPercentage} sensorySource="catalog" catalogIdentityLinked={mode!=='pending'} personalRating={mode==='personal-negative'?'not_for_me':mode==='personal-positive'?'love':null}/></main>:<NativeAppHome hasQuizResults={mode!=='no-profile'} matchrimCode={mode==='no-profile'?'':'QA206'} activeProfile={mode==='no-profile'?null:profile} recommendations={['empty','error','loading'].includes(mode)?[]:wines} loadingRecommendations={mode==='loading'} recommendationsUnavailable={mode==='error'}/>}</>}
createRoot(document.getElementById('root')).render(<I18nProvider><MemoryRouter><App/></MemoryRouter></I18nProvider>);`;
let server, browser, page;
const errors = [], screenshots = [], checks = [];
const receipt = { startedUTC: new Date().toISOString(), passed: false, sources, realGET: 0, models: 0,
  baselineFocus,
  scope: 'Actual native Home -> WineCard -> AffinitySummary composition in isolated mobile Chromium; synthetic owner/profile/sensory inputs. Retained local bottle photographs and cached display names only, not confirmed image identities, new recognition, real users, UIKit or catalogue/sensory validation.' };
try {
  server = await createServer({ root: repo, configFile: false, envDir: false, plugins: [{ name: 'isolated-auth206', enforce: 'pre',
    resolveId(id) { if (baselineFocus && ['/src/components/NativeAppHome.tsx', path.join(repo, 'src/components/NativeAppHome.tsx')].includes(id)) return '\0baseline206.tsx'; if (id === '@/contexts/AuthContext' || id.replace(/\.tsx?$/, '') === path.join(repo, 'src/contexts/AuthContext')) return '\0auth206'; if (id === '@/integrations/supabase/client' || id.replace(/\.tsx?$/, '') === path.join(repo, 'src/integrations/supabase/client')) return '\0client206'; if (id === '/presentation206.jsx') return '\0entry206.jsx'; },
    load(id) { if (id === '\0baseline206.tsx') return execFileSync('git', ['show', '0098fdc:src/components/NativeAppHome.tsx'], { encoding: 'utf8' }); if (id === '\0auth206') return 'export const useAuth=()=>({user:{id:"qa206-synthetic"},loading:false});'; if (id === '\0client206') return 'export const supabase={};'; if (id === '\0entry206.jsx') return entry; },
    configureServer(s) { s.middlewares.use(async (req, res, next) => {
      if (req.url.startsWith('/presentation206?')) { res.setHeader('Content-Type', 'text/html'); return res.end(await s.transformIndexHtml('/presentation206', '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><script>window.CapacitorCustomPlatform={name:"ios"}</script><div id="root"></div><script type="module" src="/presentation206.jsx"></script></html>')); }
      const id = ids.find(id => req.url === `/input206/${id}.jpg`);
      if (id) { res.setHeader('Content-Type', 'image/jpeg'); return res.end(fs.readFileSync(`qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared/${id}.jpg`)); }
      next();
    }); },
  }, react()], resolve: { alias: { '@': path.join(repo, 'src') } }, server: { host: '127.0.0.1', port: 0 } });
  await server.listen(); const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const require = createRequire(import.meta.url);
  const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await context.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin === origin) return route.continue(); errors.push('UNEXPECTED_OUTBOUND:' + url.origin + url.pathname); return route.abort(); });
  page = await context.newPage(); page.on('pageerror', e => errors.push(e.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const audit = async name => {
    guard(); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + ':horizontal overflow');
    for (const control of await page.locator('button,a,summary').all()) {
      if (!await control.isVisible()) continue;
      const b = await control.boundingBox(); assert(b && b.width >= 43.5 && b.height >= 43.5, name + ':touch target:' + await control.innerText());
      assert(b.x >= -1 && b.x + b.width <= page.viewportSize().width + 1, name + ':control outside viewport');
    }
    const photos = await page.locator('[data-testid="native-wine-photo98"] img').evaluateAll(images => images.map(i => ({ complete: i.complete, width: i.naturalWidth })));
    assert(photos.every(p => p.complete && p.width > 0), name + ':photo missing');
    await page.screenshot({ path: out + '/' + name + '.png', fullPage: await page.getByRole('dialog').count() === 0 }); screenshots.push(name + '.png'); checks.push(name);
  };
  if (scrollOnly) {
    for (const [width, large] of [[320, false], [393, true]]) {
      await page.setViewportSize({ width, height: 852 }); await page.goto(origin + '/presentation206?mode=home'); await page.waitForLoadState('networkidle');
      if (large) { await page.addStyleTag({ content: 'html{font-size:32px!important}' }); await page.evaluate(() => document.documentElement.classList.add('matchrim-accessibility-text')); }
      const trigger = page.getByTestId('native-home-wines98').getByRole('button').first(); await trigger.click();
      const dialog = page.getByRole('dialog'); await dialog.waitFor(); await audit('dialog-top-' + width + (large ? '-max' : ''));
      await dialog.getByText('Ver el detalle de afinidad', { exact: true }).click(); assert.equal(await dialog.locator('dd').count(), 5);
      const save = dialog.getByRole('button', { name: 'Guardar en Mis vinos' }); await save.scrollIntoViewIfNeeded();
      const box = await save.boundingBox(); assert(box.y >= 0 && box.y + box.height <= 852, 'Save must be entirely reachable');
      await audit('dialog-bottom-' + width + (large ? '-max' : ''));
      if (large) { await save.click(); assert.equal(await page.getByTestId('route206').innerText(), '/my-wines/add');
        assert.deepEqual(JSON.parse(await page.getByTestId('state206').innerText()), { nativeWineDraft98: { ownerId: 'qa206-synthetic', name: wines[0].name, producer: wines[0].winery, vintage: wines[0].vintage } }); checks.push('save-bound-owner-draft-no-write'); }
      await page.keyboard.press('Escape'); assert.equal(await dialog.count(), 0);
      await page.waitForFunction(() => document.activeElement === document.querySelector('[data-testid="native-home-wines98"] button'), null, { timeout: 3000 }); checks.push('escape-focus-' + width);
    }
  } else {
  for (const width of [320, 393, 440]) {
    await page.setViewportSize({ width, height: 852 }); await page.goto(origin + '/presentation206?mode=home'); await page.waitForLoadState('networkidle');
    await page.getByTestId('native-home98').waitFor(); await audit('home-' + width);
    await page.getByTestId('native-home-wines98').getByRole('button').first().click();
    const dialog = page.getByRole('dialog'); await dialog.waitFor(); assert.match(await dialog.innerText(), /Encaja mucho contigo/);
    assert.equal(await dialog.locator('details[open]').count(), 0); await audit('detail-' + width);
    await dialog.getByText('Ver el detalle de afinidad', { exact: true }).click(); await audit('detail-expanded-' + width);
    await page.getByRole('button', { name: 'Cerrar explicación del vino' }).click(); assert.equal(await dialog.count(), 0);
  }
  await page.setViewportSize({ width: 393, height: 852 });
  for (const mode of ['home', 'opposite', 'personal-negative', 'personal-positive', 'pending', 'no-profile', 'empty', 'error', 'loading']) {
    await page.goto(origin + '/presentation206?mode=' + mode); await page.waitForLoadState('networkidle');
    await page.addStyleTag({ content: 'html{font-size:32px!important}' }); await page.evaluate(() => document.documentElement.classList.add('matchrim-accessibility-text'));
    if (mode.startsWith('personal')) {
      const section = page.getByTestId('native-affinity-summary'); assert.match(await section.innerText(), /Tu valoración:/); assert.doesNotMatch(await section.innerText(), /≈|Por qué encaja|Por estilo/);
    }
    await audit(mode + '-max');
  }
  await page.goto(origin + '/presentation206?mode=home'); await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /¿Qué vas a comer/ }).click(); assert.equal(await page.getByTestId('route206').innerText(), '/restaurante'); checks.push('food-route');
  }
  assert.deepEqual(errors, []); for (const file of files) assert.equal(hash(file), sources[file], 'SOURCE_CHANGED'); receipt.passed = true;
} catch (error) { receipt.error = String(error.stack || error); if (page) await page.screenshot({ path: out + '/failure.png', fullPage: true }); }
finally { await browser?.close(); await server?.close(); Object.assign(receipt, { finishedUTC: new Date().toISOString(), checks, errors, screenshots }); fs.writeFileSync(out + '/RESULT.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
console.log(JSON.stringify({ passed: receipt.passed, error: receipt.error, checks: checks.length, screenshots: screenshots.length, errors })); process.exitCode = receipt.passed ? 0 : 1;
