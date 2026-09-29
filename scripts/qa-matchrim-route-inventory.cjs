const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
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

const BASE_URL = process.env.MATCHRIM_QA_URL || 'http://127.0.0.1:4173';
const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME = process.env.MATCHRIM_QA_CHROME || (existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined);
const OUTPUT_DIR = path.resolve(
  process.env.MATCHRIM_ROUTE_QA_OUTPUT_DIR
    || 'docs/qa-evidence/matchrim-integral-qa-2026-09-29/routes',
);
const HEAD = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();

const routes = [
  { route: '/', objective: 'Inicio de decisión y acceso a escaneo, aiRIM y recomendaciones', surface: 'consumer', capture: 'home' },
  { route: '/auth', objective: 'Inicio de sesión y acceso a registro', surface: 'auth', capture: 'auth' },
  { route: '/forgot-password', objective: 'Solicitar recuperación de contraseña', surface: 'auth' },
  { route: '/reset-password', objective: 'Establecer contraseña desde sesión de recuperación', surface: 'auth' },
  { route: '/registration', objective: 'Crear cuenta en tres pasos con consentimiento', surface: 'auth' },
  { route: '/matchrim', objective: 'Completar quiz sensorial y obtener perfil', surface: 'consumer', capture: 'quiz' },
  { route: '/usar-matchrim', objective: 'Explorar recomendaciones y cartas con el perfil', surface: 'consumer' },
  { route: '/escanear', objective: 'Elegir modalidad de captura', surface: 'scan', capture: 'scan-hub' },
  { route: '/escanear/etiqueta', objective: 'Escanear una o varias etiquetas/botellas', surface: 'scan' },
  { route: '/escanear/carta-vinos', objective: 'Escanear carta o pizarra de vinos y comparar', surface: 'scan', capture: 'scan-menu' },
  { route: '/escanear/menu-comida', objective: 'Extraer platos y proponer vino', surface: 'scan' },
  { route: '/escanear/plato', objective: 'Fotografiar un plato para maridaje', surface: 'scan' },
  { route: '/escanear/encontrar-vino', objective: 'Buscar por presupuesto, ocasión o tienda', surface: 'scan' },
  { route: '/inteligencia-liquida', objective: 'Consultar aiRIM y abrir decisiones guiadas', surface: 'airim', capture: 'airim' },
  { route: '/wine-styles', objective: 'Descubrir estilos de vino', surface: 'discovery' },
  { route: '/wine-styles/tinto-versatil', objective: 'Entender un estilo concreto', surface: 'discovery' },
  { route: '/wines/qa-route-probe', objective: 'Consultar ficha canónica de vino', surface: 'discovery' },
  { route: '/my-wines', objective: 'Gestionar la colección personal', surface: 'cellar' },
  { route: '/my-wines/collection', objective: 'Gestionar botellas disponibles', surface: 'cellar' },
  { route: '/my-wines/wishlist', objective: 'Gestionar vinos pendientes', surface: 'cellar' },
  { route: '/my-wines/tasted', objective: 'Puntuar vinos probados y aprendizaje', surface: 'cellar' },
  { route: '/my-wines/favorites', objective: 'Consultar favoritos', surface: 'cellar' },
  { route: '/my-wines/rejected', objective: 'Consultar vinos rechazados', surface: 'cellar' },
  { route: '/my-wines/add', objective: 'Añadir vino manualmente', surface: 'cellar' },
  { route: '/profile', objective: 'Entender perfil, aprendizaje y recomendaciones', surface: 'profile' },
  { route: '/privacy', objective: 'Comprender tratamiento de datos e imágenes', surface: 'legal', capture: 'privacy' },
  { route: '/terms', objective: 'Consultar términos de uso', surface: 'legal' },
  { route: '/account/delete', objective: 'Solicitar eliminación de cuenta y datos', surface: 'legal', capture: 'account-delete' },
  { route: '/admin', objective: 'Administración, fuera del producto consumidor', surface: 'admin' },
  { route: '/import-csv', objective: 'Importación administrativa', surface: 'admin' },
  { route: '/data-viewer', objective: 'Visor administrativo de datos', surface: 'admin' },
  { route: '/wine-search', objective: 'Búsqueda administrativa', surface: 'admin' },
  { route: '/wine-import', objective: 'Importación administrativa de vino', surface: 'admin' },
  { route: '/ruta-inexistente-qa', objective: 'Recuperarse de una URL desconocida', surface: 'error' },
];

const main = async () => {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const results = [];

  try {
    for (const route of routes) {
      const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(String(error)));

      let navigationError = null;
      try {
        await page.goto(`${BASE_URL}${route.route}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page.waitForTimeout(900);
      } catch (error) {
        navigationError = String(error);
      }

      const bodyText = await page.locator('body').innerText().catch(() => '');
      const headings = await page.locator('h1, h2').allTextContents().catch(() => []);
      const finalUrl = page.url();
      const horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ).catch(() => null);
      const errorBoundary = bodyText.includes('Algo no ha cargado bien');
      const blank = bodyText.trim().length < 20;

      if (route.capture) {
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `${route.capture}-430x932.png`),
          fullPage: true,
        });
      }

      results.push({
        ...route,
        finalPath: (() => {
          try { return new URL(finalUrl).pathname; } catch { return finalUrl; }
        })(),
        headings: headings.map((heading) => heading.trim()).filter(Boolean).slice(0, 5),
        bodyExcerpt: bodyText.replace(/\s+/g, ' ').trim().slice(0, 220),
        horizontalOverflow,
        consoleErrors,
        pageErrors,
        navigationError,
        rendered: !blank && !errorBoundary && !navigationError,
        qualification: route.surface === 'cellar' || route.surface === 'profile' || route.surface === 'admin'
          ? 'anonymous route/guard smoke only; authenticated behavior not exercised'
          : 'anonymous local render smoke; no backend write',
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: '2026-09-29',
    build: `local HEAD ${HEAD} plus current QA working-tree fixes`,
    scope: 'anonymous local route inventory; no account creation and no production writes',
    totals: {
      routes: results.length,
      rendered: results.filter((result) => result.rendered).length,
      overflow: results.filter((result) => result.horizontalOverflow).length,
      pageErrors: results.filter((result) => result.pageErrors.length > 0).length,
      consoleErrors: results.filter((result) => result.consoleErrors.length > 0).length,
    },
    routes: results,
  };
  writeFileSync(path.join(OUTPUT_DIR, 'route-inventory.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.table(results.map((result) => ({
    route: result.route,
    final: result.finalPath,
    rendered: result.rendered,
    overflow: result.horizontalOverflow,
    errors: result.consoleErrors.length + result.pageErrors.length,
    heading: result.headings[0] || '',
  })));
  console.log(JSON.stringify(report.totals, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
