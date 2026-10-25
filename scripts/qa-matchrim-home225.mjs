import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';

const repo = process.cwd(), out = path.resolve(process.argv[2] ?? '');
assert(path.dirname(out) === path.join(repo, 'qa-artifacts/home225-20261025') && /^visual-r\d+$/.test(path.basename(out)) && !fs.existsSync(out));
const owner = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d';
const guard = () => {
  const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
  for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]) {
    const lease = leases[resource]; assert(lease?.owner === owner && lease.leaseId === process.env[key] && lease.reviewAfter * 1000 > Date.now(), resource);
  }
  const disk = fs.statfsSync(repo); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const paths = ['src/pages/Index.tsx', 'src/components/NativeHome98.tsx', 'src/components/NativeAppHome.tsx', 'src/utils/nativeHomeRead225.ts'];
const sources = Object.fromEntries(paths.map(file => [file, hash(file)]));
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useLocation}from'react-router-dom';
import{NativeHome98}from'/src/components/NativeHome98.tsx';import'/src/index.css';
const mode=new URLSearchParams(location.search).get('mode')||'profile';
function App(){const route=useLocation();const[failed,setFailed]=React.useState(true);const[count,setCount]=React.useState(0);return <>
<output className="sr-only" data-testid="route225">{route.pathname}</output><output className="sr-only" data-testid="retry225">{count}</output>
<NativeHome98 ownerId="synthetic-home225" hasProfile={!failed} loading={false} unavailable={false} exhausted={false}
recommendations={[]} profile={null} recent={[]} onSelect={()=>{throw Error('No wines in this fixture')}} detail={null}
readError={failed?mode:null} onRetry={()=>{setCount(c=>c+1);setFailed(false)}}/></>}
document.documentElement.classList.add('matchrim-native-platform');
createRoot(document.getElementById('root')).render(<MemoryRouter><App/></MemoryRouter>);`;
let server, browser;
const errors = [], checks = [], screenshots = [];
const receipt = { startedUTC: new Date().toISOString(), passed: false, sources,
  scope: 'Actual NativeHome98 component in isolated mobile Chromium with synthetic read-error props and in-memory retry callback. Home controller separately exercised by check-matchrim-home-profile225. Search and bottom nav leaves are inert. Not UIKit, actual auth/RLS, catalogue, Photos, account save or TestFlight approval.',
  externalRequests: 0, paidCalls: 0 };
try {
  guard(); fs.mkdirSync(out, { recursive: true, mode: 0o700 });
  server = await createServer({ root: repo, envDir: false, configFile: false,
    plugins: [{ name: 'home225-isolated-entry', enforce: 'pre',
      resolveId(id) {
        if (id === '/home225.jsx') return '\0home225.jsx';
        if (id.endsWith('/components/wine-import/NativeWineSearch97')) return '\0home225-search';
        if (id.endsWith('/components/MobileBottomNav')) return '\0home225-nav';
      },
      load(id) {
        if (id === '\0home225.jsx') return entry;
        if (id === '\0home225-search') return 'export const NativeWineSearch97=()=>null;';
        if (id === '\0home225-nav') return 'export default function Nav(){return null}';
      },
      configureServer(s) { s.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/home225?')) return next();
        res.setHeader('Content-Type', 'text/html');
        res.end(await s.transformIndexHtml('/home225', '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/home225.jsx"></script></html>'));
      }); },
    }, react()], resolve: { alias: { '@': path.join(repo, 'src') } }, server: { host: '127.0.0.1', port: 0 } });
  await server.listen(); const address = server.httpServer.address(); assert(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;
  const require = createRequire(import.meta.url);
  const { chromium } = require('/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--disable-background-networking'] });
  const context = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    errors.push('OUTBOUND_BLOCKED:' + new URL(route.request().url()).origin); return route.abort();
  });
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (const [width, large] of [[320, false], [393, true]]) for (const mode of ['profile', 'wines']) {
    guard(); await page.setViewportSize({ width, height: 852 });
    await page.goto(origin + '/home225?mode=' + mode); await page.waitForLoadState('networkidle');
    if (large) await page.addStyleTag({ content: 'html{font-size:32px!important}html{--matchrim-safe-top:47px;--matchrim-safe-bottom:34px}' });
    const alert = page.getByRole('alert'); await alert.waitFor();
    assert((await alert.innerText()).includes(mode === 'profile' ? 'No necesitas repetir el test' : 'Necesitamos tus vinos y valoraciones'));
    assert.equal(await page.getByText('Afinidad por calcular', { exact: true }).count(), 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'HORIZONTAL_OVERFLOW');
    for (const control of await page.getByRole('button').all()) {
      await control.scrollIntoViewIfNeeded(); const box = await control.boundingBox();
      assert(box && box.width >= 43.5 && box.height >= 43.5, 'TOUCH_TARGET');
      assert(box.x >= -1 && box.x + box.width <= width + 1 && box.y >= -1 && box.y + box.height <= 853, 'CONTROL_NOT_REACHABLE');
    }
    await alert.scrollIntoViewIfNeeded();
    const screenshot = `${mode}-${width}${large ? '-large-text' : ''}.png`;
    await page.screenshot({ path: path.join(out, screenshot), fullPage: true }); screenshots.push(screenshot);
    await page.getByRole('button', { name: 'Mis gustos', exact: true }).click();
    assert.equal(await page.getByTestId('route225').innerText(), '/profile');
    await page.getByRole('button', { name: 'Reintentar carga', exact: true }).click();
    assert.equal(await page.getByTestId('retry225').innerText(), '1');
    assert.equal(await page.getByRole('alert').count(), 0);
    assert.equal(await page.getByRole('heading', { name: 'Para tu paladar', exact: true }).count(), 1);
    checks.push({ mode, width, largeText: large, retry: 'PASS', existingProfileRoute: 'PASS', noOverflow: true });
  }
  assert.deepEqual(errors, []); for (const [file, expected] of Object.entries(sources)) assert.equal(hash(file), expected, file);
  receipt.passed = true;
} catch (error) { receipt.error = String(error.stack || error); }
finally {
  await browser?.close(); await server?.close();
  Object.assign(receipt, { finishedUTC: new Date().toISOString(), errors, checks,
    screenshots: screenshots.map(file => ({ file, sha256: hash(path.join(out, file)) })) });
  if (fs.existsSync(out)) fs.writeFileSync(path.join(out, 'RESULT.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
