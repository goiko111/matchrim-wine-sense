const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
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
const PROJECT_REF = 'cbjynrbvrhcmpaojmqdp';
const PERSONA_REPORT = process.env.MATCHRIM_25_PERSONA_REPORT || path.resolve(
  'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/persona-results.json',
);
const OUTPUT_DIR = process.env.MATCHRIM_25_PERSONA_UI_DIR || path.resolve(
  'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01',
);
const OUTPUT = path.join(OUTPUT_DIR, 'ui-results.json');
const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME = existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined;

const b64url = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64url');
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};

const uuidFor = (index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
const tokenFor = (userId, index) => [
  b64url({ alg: 'HS256', typ: 'JWT' }),
  b64url({ sub: userId, email: `qa-persona-${index + 1}@matchrim.invalid`, exp: 1_900_000_000 }),
  `qa-persona-${index + 1}-signature`,
].join('.');

const noHorizontalOverflow = (page) => page.evaluate(
  () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
);

const minTarget = async (locator, name) => {
  const box = await locator.boundingBox();
  check(box, `${name}: target is not measurable`);
  check(box.width >= 44 && box.height >= 44, `${name}: ${box.width}x${box.height} is below 44px`);
  return { width: Number(box.width.toFixed(1)), height: Number(box.height.toFixed(1)) };
};

const main = async () => {
  const source = JSON.parse(readFileSync(PERSONA_REPORT, 'utf8'));
  check(source.personaCount === 25, `Expected 25 personas, received ${source.personaCount}`);
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const results = [];
  const globalErrors = [];
  const priorWineNames = [];
  const screenshotPersonas = new Set([
    'principiante-cero',
    'sumiller-tintos',
    'etiqueta-oculta',
    'baja-vision',
    'movilidad-reducida',
  ]);

  try {
    for (const [index, persona] of source.personas.entries()) {
      const userId = uuidFor(index);
      const email = `qa-persona-${index + 1}@matchrim.invalid`;
      const token = tokenFor(userId, index);
      const user = {
        id: userId,
        aud: 'authenticated',
        role: 'authenticated',
        email,
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { qa_persona: persona.id },
        created_at: '2026-10-01T00:00:00Z',
      };
      const session = {
        access_token: token,
        refresh_token: `qa-persona-${index + 1}-refresh`,
        expires_in: 86400,
        expires_at: 1_900_000_000,
        token_type: 'bearer',
        user,
      };
      const wineName = `QA ${persona.id}`;
      const profile = persona.learnedProfile;
      const quizHistory = [{
        id: `quiz-${userId}`,
        user_id: userId,
        ...profile,
        profile_description: persona.job,
        created_at: '2026-10-01T00:00:00Z',
        wine_recommendations: [],
      }];
      const userWines = [{
        id: `wine-${userId}`,
        user_id: userId,
        name: wineName,
        producer: `Bodega ${persona.id}`,
        vintage: 2023,
        region: 'Región QA',
        country: 'España',
        grape_varieties: ['Variedad QA'],
        alcohol_content: 13,
        tasting_notes: persona.job,
        image_url: null,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
        is_favorite: index % 2 === 0,
        rating: index % 3 === 0 ? 'love' : 'correct',
        personal_note: null,
        consumption_place: null,
        consumption_place_type: null,
        consumption_date: null,
        matchrim_affinity: 60 + (index % 35),
        sensory_attributes: {
          potencia: profile.potente,
          acidez: profile.acidez,
          dulzura: profile.dulce,
          taninos: profile.tanico,
          afrutado: profile.afrutado,
        },
        use_for_profile_training: true,
        status: 'collection',
        quantity: 1,
        price: 10 + index,
        place_details: null,
      }];

      const context = await browser.newContext({
        viewport: { width: 430, height: 932 },
        deviceScaleFactor: 3,
        reducedMotion: 'reduce',
      });
      await context.addInitScript(({ storageKey, authSession, localProfile, largeText }) => {
        window.CapacitorCustomPlatform = { name: 'ios' };
        window.Capacitor = window.Capacitor || {};
        window.Capacitor.getPlatform = () => 'ios';
        window.Capacitor.isNativePlatform = () => true;
        localStorage.setItem(storageKey, JSON.stringify(authSession));
        localStorage.setItem('matchrim_quiz_result', JSON.stringify(localProfile));
        const applyDisplaySettings = () => {
          if (!document.documentElement) return;
          document.documentElement.style.setProperty('--matchrim-native-safe-top', '59px');
          document.documentElement.style.setProperty('--matchrim-native-safe-bottom', '34px');
          if (largeText) document.documentElement.style.fontSize = '125%';
        };
        applyDisplaySettings();
        window.addEventListener('DOMContentLoaded', applyDisplaySettings, { once: true });
      }, {
        storageKey: `sb-${PROJECT_REF}-auth-token`,
        authSession: session,
        localProfile: profile,
        largeText: persona.id === 'baja-vision',
      });

      const errors = [];
      const page = await context.newPage();
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });
      page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
      await page.route('**/*', async (route) => {
        const url = route.request().url();
        const fulfill = (body, headers = {}) => route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(body),
        });
        if (url.includes('/auth/v1/user')) return fulfill(user);
        if (url.includes('/rest/v1/quiz_results')) return fulfill(quizHistory, { 'content-range': '0-0/1' });
        if (url.includes('/rest/v1/user_wines')) return fulfill(userWines, { 'content-range': '0-0/1' });
        if (url.includes('/rest/v1/wine_styles')) return fulfill([]);
        if (url.includes('/functions/v1/matchrim-recommendations')) return fulfill({
          results: [{
            id: `recommendation-${index + 1}`,
            name: wineName,
            winery: `Bodega ${persona.id}`,
            region: 'Región QA',
            vintage: 2023,
            matchPercentage: 60 + (index % 35),
          }],
          total: 1,
        });
        if (url.includes('/functions/v1/')) return fulfill({ wines: [], results: [] });
        if (url.includes('/rest/v1/')) return fulfill([]);
        if (!url.startsWith(BASE_URL)) return fulfill({});
        return route.continue();
      });

      const checks = [];
      try {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: '¿Qué quieres elegir?' }).waitFor({ timeout: 15000 });
        check(await noHorizontalOverflow(page), `${persona.id}: Home overflows horizontally`);
        checks.push('home');

        await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: 'Mi Perfil' }).waitFor({ timeout: 15000 });
        check(await page.getByText(persona.passportMatchrimName, { exact: true }).count() > 0, `${persona.id}: Matchrim passport name mismatch`);
        check(await page.getByText(persona.passportMatchrimCode, { exact: true }).count() > 0, `${persona.id}: Matchrim passport code mismatch`);
        check(await noHorizontalOverflow(page), `${persona.id}: Profile overflows horizontally`);
        checks.push('profile');

        await page.goto(`${BASE_URL}/my-wines`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: 'Mis Vinos' }).waitFor({ timeout: 15000 });
        check(await page.getByText(wineName, { exact: true }).count() > 0, `${persona.id}: own wine is missing`);
        for (const priorWine of priorWineNames.slice(-3)) {
          check(await page.getByText(priorWine, { exact: true }).count() === 0, `${persona.id}: leaked ${priorWine}`);
        }
        check(await noHorizontalOverflow(page), `${persona.id}: Bodega overflows horizontally`);
        checks.push('bodega-isolation');

        await page.goto(`${BASE_URL}/escanear`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: 'Escanear', exact: true }).waitFor({ timeout: 15000 });
        check(await page.getByText('Etiqueta de vino', { exact: true }).isVisible(), `${persona.id}: label entry missing`);
        check(await page.getByText('Carta de vinos', { exact: true }).isVisible(), `${persona.id}: wine-list entry missing`);
        check(await noHorizontalOverflow(page), `${persona.id}: Scan overflows horizontally`);
        checks.push('scan-entry');

        if (persona.id === 'etiqueta-oculta') {
          await page.getByText('Etiqueta de vino', { exact: true }).click();
          const consent = page.getByRole('checkbox', { name: 'He leído el aviso de privacidad del escáner' });
          await consent.waitFor();
          const continueButton = page.getByRole('button', { name: 'Entiendo y continuar' });
          check(!(await continueButton.isEnabled()), 'Privacy gate must block before consent');
          await consent.check();
          check(await continueButton.isEnabled(), 'Privacy gate must unlock after consent');
          checks.push('privacy-gate');
        }

        if (persona.id === 'voiceover') {
          const navNames = await page.locator('nav a, nav button').evaluateAll((nodes) => nodes.map((node) => ({
            text: (node.textContent || '').trim(),
            aria: node.getAttribute('aria-label'),
          })));
          check(navNames.every((item) => item.text || item.aria), 'VoiceOver persona found unnamed navigation control');
          checks.push('accessible-names');
        }

        if (persona.id === 'movilidad-reducida') {
          await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
          const targets = {
            profileTab: await minTarget(page.getByRole('tab', { name: 'Perfil Sensorial' }), 'profile tab'),
            historyTab: await minTarget(page.getByRole('tab', { name: 'Historial' }), 'history tab'),
            copy: await minTarget(page.getByRole('button', { name: 'Copiar código Matchrim' }), 'copy code'),
          };
          checks.push({ touchTargets: targets });
        }

        if (persona.id === 'baja-vision') {
          check(await noHorizontalOverflow(page), 'Large-text Profile overflows horizontally');
          checks.push('dynamic-type-125');
        }

        if (index % 5 === 4) {
          await page.setViewportSize({ width: 932, height: 430 });
          await page.goto(`${BASE_URL}/escanear`, { waitUntil: 'domcontentloaded' });
          check(await noHorizontalOverflow(page), `${persona.id}: landscape Scan overflows horizontally`);
          checks.push('landscape');
        }

        if (screenshotPersonas.has(persona.id)) {
          await page.setViewportSize({ width: 430, height: 932 });
          await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
          await page.screenshot({ path: path.join(OUTPUT_DIR, `${persona.id}.png`), fullPage: true });
        }

        const relevantErrors = errors.filter((message) => !message.includes('Failed to load resource'));
        check(relevantErrors.length === 0, `${persona.id}: ${relevantErrors.join(' | ')}`);
        results.push({
          index: index + 1,
          persona: persona.id,
          userId,
          profile,
          passportMatchrimCode: persona.passportMatchrimCode,
          passportMatchrimName: persona.passportMatchrimName,
          learnedMatchrimCode: persona.matchrimCode,
          learnedMatchrimName: persona.matchrimName,
          scanScenario: persona.scanScenario,
          checks,
          consoleErrors: relevantErrors,
          status: 'PASS',
        });
        process.stdout.write(`[${index + 1}/25] ${persona.id}: PASS\n`);
      } catch (error) {
        results.push({
          index: index + 1,
          persona: persona.id,
          userId,
          checks,
          consoleErrors: errors,
          status: 'FAIL',
          error: error instanceof Error ? error.message : String(error),
        });
        globalErrors.push(`${persona.id}: ${error instanceof Error ? error.message : String(error)}`);
        process.stdout.write(`[${index + 1}/25] ${persona.id}: FAIL - ${error instanceof Error ? error.message : String(error)}\n`);
      } finally {
        priorWineNames.push(wineName);
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const report = {
    release: 'Matchrim 1.0 (66)',
    qualification: '25 isolated synthetic sessions against compiled local assets; all Supabase and Winerim traffic intercepted',
    realHumans: 0,
    productionReads: false,
    productionWrites: false,
    personaCount: results.length,
    passed: results.filter((result) => result.status === 'PASS').length,
    failed: results.filter((result) => result.status === 'FAIL').length,
    allPassed: globalErrors.length === 0 && results.length === 25,
    results,
    errors: globalErrors,
  };
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    personaCount: report.personaCount,
    passed: report.passed,
    failed: report.failed,
    allPassed: report.allPassed,
    errors: report.errors,
  }, null, 2)}\n`);
  if (!report.allPassed) process.exitCode = 1;
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
