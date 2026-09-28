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

const BASE_URL = process.env.MATCHRIM_QA_URL || 'http://127.0.0.1:4173';
const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME = process.env.MATCHRIM_QA_CHROME || (existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined);
const OUTPUT = process.env.MATCHRIM_PERSONALIZATION_UI_OUTPUT || path.resolve(
  __dirname,
  '..',
  'docs',
  'qa-evidence',
  'matchrim-build64-personalization-2026-09-28',
  'ui-navigation-state-results.json',
);

const RECOMMENDATIONS = {
  results: [
    {
      id: 'qa-atlantico',
      name: 'Albariño atlántico QA',
      winery: 'Bodega QA Atlántica',
      region: 'Rías Baixas',
      vintage: 2023,
      matchPercentage: 91,
    },
    {
      id: 'qa-clasico',
      name: 'Rioja reserva QA',
      winery: 'Bodega QA Tradición',
      region: 'Rioja',
      vintage: 2020,
      matchPercentage: 86,
    },
  ],
  total: 2,
};

const LOCAL_PROFILE_SCRIPT = `
  localStorage.setItem('matchrim_quiz_result', JSON.stringify({
    potente: 3, acidez: 4, dulce: 1, tanico: 2, afrutado: 4
  }));
`;

const check = (condition, message) => {
  if (!condition) throw new Error(message);
};

const noHorizontalOverflow = (page) => page.evaluate(
  () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
);

const installRecommendationRoute = async (page, status = 200, payload = RECOMMENDATIONS) => {
  await page.route('**/functions/v1/matchrim-recommendations?**', (route) => route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  }));
};

const createPage = async (browser) => {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  await context.addInitScript(LOCAL_PROFILE_SCRIPT);
  return { context, page: await context.newPage() };
};

const main = async () => {
  const cases = [];
  const expectedConsoleErrors = [];
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });

  try {
    {
      const { context, page } = await createPage(browser);
      await installRecommendationRoute(page);
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: '¿Qué quieres elegir?' }).waitFor();
      check(await page.getByRole('link', { name: 'Inicio' }).getAttribute('aria-current') === 'page', 'Inicio must be active');
      check(await page.getByRole('button', { name: /Pregunta a aiRIM/ }).isVisible(), 'aiRIM CTA must be prominent on Home');

      await page.getByRole('link', { name: 'Escanear', exact: true }).click();
      await page.waitForURL('**/escanear');
      await page.getByRole('heading', { name: 'Escanear', exact: true }).waitFor();
      check(await page.getByText('Etiqueta de vino', { exact: true }).isVisible(), 'Label scan entry must be visible');
      check(await page.getByText('Carta de vinos', { exact: true }).isVisible(), 'Wine-list scan entry must be visible');
      check(await page.getByRole('link', { name: 'Escanear' }).getAttribute('aria-current') === 'page', 'Scan must be active');

      await page.getByRole('link', { name: 'aiRIM', exact: true }).click();
      await page.waitForURL('**/inteligencia-liquida');
      await page.getByRole('heading', { name: '¿Qué necesitas decidir?' }).waitFor();
      check(await page.getByRole('link', { name: 'aiRIM' }).getAttribute('aria-current') === 'page', 'aiRIM must be active');
      check(await page.getByText(/Las fotos siguen en el flujo Escanear/).isVisible(), 'aiRIM must state its boundary with Scan');
      check(await noHorizontalOverflow(page), 'Main routes must not overflow horizontally');
      cases.push({
        case: 'home_scan_airim_separation',
        actual: 'PASS: three distinct routes, active tabs and explicit photo boundary',
      });
      await context.close();
    }

    {
      const { context, page } = await createPage(browser);
      await installRecommendationRoute(page, 200, { results: [], total: 0 });
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.getByText('Explora vinos compatibles con tu perfil Matchrim.', { exact: true }).waitFor();
      check(await page.getByText(/No pude actualizar el catálogo/).count() === 0, 'Empty state must not look like an error');
      cases.push({
        case: 'recommendations_empty',
        actual: 'PASS: empty catalog stays distinct from service failure',
      });
      await context.close();
    }

    {
      const { context, page } = await createPage(browser);
      page.on('console', (message) => {
        if (message.type() === 'error') expectedConsoleErrors.push(message.text());
      });
      await installRecommendationRoute(page, 503, { error: 'synthetic QA outage' });
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.getByText(/No pude actualizar el catálogo/).waitFor();
      check(await page.getByText(/Explora vinos compatibles/).count() === 0, 'Error state must not look empty');
      cases.push({
        case: 'recommendations_error',
        actual: 'PASS: recoverable service message shown without empty-state ambiguity',
      });
      await context.close();
    }

    {
      const { context, page } = await createPage(browser);
      await installRecommendationRoute(page);
      const airimRequests = [];
      page.on('request', (request) => {
        if (request.url().includes('ai-wine-chat')) airimRequests.push(request.url());
      });
      await page.route('**/*ai-wine-chat*', (route) => route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'synthetic QA outage' }),
      }));
      await page.goto(`${BASE_URL}/inteligencia-liquida`, { waitUntil: 'networkidle' });
      const question = 'Vino fresco para lubina, máximo 25 EUR';
      await page.getByLabel('Pregunta para aiRIM', { exact: true }).fill(question);
      await page.getByRole('button', { name: 'Abrir conversación' }).click();
      await page.getByRole('heading', { name: 'Decide con contexto' }).waitFor();
      await page.getByRole('button', { name: 'Enviar pregunta' }).click();
      await page.waitForFunction(
        (expected) => document.querySelector('#airim-question')?.value === expected,
        question,
      );
      check(airimRequests.length > 0, 'Synthetic aiRIM request must be intercepted');
      check(await page.getByLabel('Pregunta para aiRIM', { exact: true }).inputValue() === question, 'Question must be restored');
      check(
        await page.getByLabel('Conversación con aiRIM').getByText(question, { exact: true }).isVisible(),
        'Sent question must remain in the transcript',
      );
      check(await noHorizontalOverflow(page), 'aiRIM error state must not overflow horizontally');
      cases.push({
        case: 'airim_error_preserves_question',
        actual: 'PASS: sent question remains visible and is restored for retry',
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const report = {
    fixtureScope: 'synthetic intercepted QA only; no real accounts or production writes',
    allPassed: true,
    cases,
    expectedConsoleErrors,
  };
  mkdirSync(path.dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
