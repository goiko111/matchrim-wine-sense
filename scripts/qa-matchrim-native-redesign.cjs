const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(path.join(
    os.homedir(),
    '.cache',
    'codex-runtimes',
    'codex-primary-runtime',
    'dependencies',
    'node',
    'node_modules',
    'playwright',
  )));
}

const BASE_URL = process.env.MATCHRIM_QA_URL || 'http://127.0.0.1:4179';
const OUTPUT_DIR = path.resolve(process.env.MATCHRIM_NATIVE_QA_OUTPUT || 'docs/qa-evidence/matchrim-native-redesign');
const LABEL_FIXTURE = '/Users/GOIKO/Downloads/IMG_7605 2.jpg';
const MENU_FIXTURES = ['IMG_7547 2.jpg', 'IMG_7548 2.jpg', 'IMG_7552 2.jpg', 'IMG_7553 2.jpg']
  .map((name) => path.resolve('qa-artifacts/2026-09-28-learning-airim/fixtures', name));
const CHROME = existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : undefined;

const installNativeContext = async (context) => {
  await context.addInitScript(() => {
    window.CapacitorCustomPlatform = { name: 'ios' };
    window.Capacitor = window.Capacitor || {};
    window.Capacitor.getPlatform = () => 'ios';
    window.Capacitor.isNativePlatform = () => true;
    localStorage.setItem('matchrim.scan_privacy_notice.v2', 'accepted');
    localStorage.setItem('matchrim_quiz_result', JSON.stringify({
      potente: 4,
      acidez: 4,
      dulce: 1,
      tanico: 3,
      afrutado: 4,
    }));
  });
};

const noHorizontalOverflow = (page) => page.evaluate(
  () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
);

const main = async () => {
  for (const fixture of [LABEL_FIXTURE, ...MENU_FIXTURES]) {
    if (!existsSync(fixture)) throw new Error(`Missing fixture: ${fixture}`);
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const consoleErrors = [];
  const results = [];

  try {
    const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
    await installNativeContext(context);
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const navigationLabels = await page.getByRole('navigation', { name: 'Navegación principal' })
      .locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('aria-label')));
    if (navigationLabels.join('|') !== 'Inicio|Explora|Bodega|Perfil|Escanear') {
      throw new Error(`Unexpected native navigation: ${navigationLabels.join('|')}`);
    }
    if (!await noHorizontalOverflow(page)) throw new Error('Home overflows horizontally');
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'home-native.png'), fullPage: false });
    results.push({ case: 'native_navigation', actual: `PASS ${navigationLabels.join(', ')}` });

    await page.goto(`${BASE_URL}/escanear/etiqueta`, { waitUntil: 'networkidle' });
    const inputs = page.locator('input[type="file"]');
    await inputs.nth(1).setInputFiles(LABEL_FIXTURE);
    await page.getByRole('tab', { name: /Vinos/ }).waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByText('Lote listo para revisar', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });

    const tabs = page.getByRole('tab');
    if (await tabs.count() !== 3) throw new Error('Expected three native result views');
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'multi-scene.png'), fullPage: false });

    await page.getByRole('tab', { name: /Vinos/ }).click();
    await page.getByRole('button', { name: /Abrir detalle de/ }).first().waitFor({ state: 'visible' });
    if (await page.getByRole('heading', { name: 'Comparar 2–5 vinos' }).isVisible()) {
      throw new Error('Comparison workspace overlaps the wine list view');
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'multi-wines.png'), fullPage: false });

    await page.getByRole('tab', { name: 'Comparar' }).click();
    await page.getByRole('heading', { name: 'Comparar 2–5 vinos' }).waitFor({ state: 'visible' });
    if (await page.getByRole('button', { name: /Abrir detalle de/ }).first().isVisible()) {
      throw new Error('Wine list overlaps the comparison view');
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'multi-compare.png'), fullPage: false });
    if (!await noHorizontalOverflow(page)) throw new Error('Multi-wine result overflows horizontally');
    results.push({ case: 'multi_result_disclosure', actual: 'PASS scene, wines and comparison are mutually exclusive' });

    const menuResults = [];
    for (const [index, fixture] of MENU_FIXTURES.entries()) {
      await page.setViewportSize(index % 2 === 0 ? { width: 430, height: 932 } : { width: 932, height: 430 });
      await page.goto(`${BASE_URL}/escanear/carta-vinos`, { waitUntil: 'networkidle' });
      await page.locator('input[type="file"]').nth(0).setInputFiles(fixture);
      await page.getByText('Lista de la carta', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
      if (!await noHorizontalOverflow(page)) throw new Error(`${path.basename(fixture)} overflows horizontally`);
      const orientation = index % 2 === 0 ? 'portrait' : 'landscape';
      await page.screenshot({ path: path.join(OUTPUT_DIR, `${path.parse(fixture).name}-${orientation}.png`), fullPage: false });
      menuResults.push(`${path.basename(fixture)}:${orientation}`);
    }
    results.push({ case: 'four_real_menu_materials', actual: `PASS ${menuResults.join(', ')}` });

    await page.setViewportSize({ width: 430, height: 932 });

    await page.goto(`${BASE_URL}/inteligencia-liquida`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Elegir para una ocasión/ }).click();
    await page.getByRole('heading', { name: 'Vinos para momentos especiales' }).waitFor();
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'airim-occasions.png'), fullPage: false });
    if (!await noHorizontalOverflow(page)) throw new Error('aiRIM occasions overflows horizontally');
    results.push({ case: 'airim_identity_and_occasions', actual: 'PASS compact mark and native decision list' });

    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'auth-native.png'), fullPage: false });
    if (!await noHorizontalOverflow(page)) throw new Error('Native auth overflows horizontally');
    results.push({ case: 'native_auth', actual: 'PASS neutral native layout' });
    await context.close();
  } finally {
    await browser.close();
  }

  if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
  const report = { fixtureScope: 'local embedded fixtures only; no production traffic', allPassed: true, results };
  writeFileSync(path.join(OUTPUT_DIR, 'results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
