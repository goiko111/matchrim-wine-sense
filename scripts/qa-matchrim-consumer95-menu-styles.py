"""Offline actual menu-style UI replay against a parent-confirmed frozen build.

Python entry point uses the already bundled Node Playwright runtime; no install,
server, real profile/account, provider request or production write is needed.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path


NODE_RUNNER = r'''
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
const cfg = JSON.parse(fs.readFileSync(process.argv[2]));
const { chromium } = await import(pathToFileURL(cfg.playwright).href);
const { expect } = await import(pathToFileURL(path.join(path.dirname(cfg.playwright), 'test.mjs')).href);
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const root = cfg.build, output = cfg.output, base = 'http://127.0.0.1:4600';
const frozen = new Map(cfg.buildFiles.map(f => {
  const bytes = fs.readFileSync(path.join(root, f.file));
  if (sha(bytes) !== f.sha256) throw new Error('Build changed before replay');
  return ['/' + f.file, bytes];
}));
const captured = JSON.parse(fs.readFileSync(cfg.trace));
const source = captured.find(r => r.function === 'scan-wine-menu-v72' && r.status === 200);
if (!source || source.payload.vinos.length !== 13) throw new Error('Expected existing 13-row receipt');
const rawRows = source.payload.vinos;
const controls = JSON.parse(fs.readFileSync(cfg.controls)).cases.find(c => c.id === 'mixed-drinks');
const names = controls.rows.map(r => r.literal_name).sort();
const profile = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
const specs = [['portrait393', 393, 852, 1], ['landscape852', 852, 393, 1], ['text200-320', 320, 700, 2]];
const browser = await chromium.launch({ headless: true, executablePath: cfg.chrome,
  args: ['--disable-background-networking', '--host-resolver-rules=MAP * ~NOTFOUND'] });
const results = [];
const layoutAudit = scope => {
  const issues = [], walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const el = node.parentElement;
    if (!el || el.closest('svg,[aria-hidden="true"],.sr-only') || !el.getClientRects().length) continue;
    for (const m of node.textContent.matchAll(/\p{L}[\p{L}\p{M}]{2,}/gu)) {
      const range = document.createRange(); range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
      const rects = [...range.getClientRects()].filter(r => r.width > .5 && r.height > .5);
      if (new Set(rects.map(r => Math.round(r.y * 2) / 2)).size > 1) {
        issues.push({ word: m[0], text: node.textContent.slice(0, 160), rects: rects.map(r => ({ x: r.x, y: r.y, w: r.width, h: r.height })) });
      }
    }
  }
  return { brokenWords: issues.slice(0, 30), horizontalOverflow: scope.scrollWidth > scope.clientWidth + 1 };
};
const readWineState = () => {
  const node = document.querySelector('button[aria-label^="Abrir estilo "]');
  const key = node && Object.keys(node).find(k => k.startsWith('__reactFiber$'));
  let fiber = key ? node[key] : null;
  const choices = [];
  for (let depth = 0; fiber && depth < 60; depth++, fiber = fiber.return) {
    for (let hook = fiber.memoizedState, i = 0; hook && i < 100; i++, hook = hook.next) {
      const value = hook.memoizedState;
      if (Array.isArray(value) && value.length && value.every(r => r && typeof r === 'object' && typeof r.nombre === 'string' && 'texto_fuente' in r)) {
        choices.push(value.map(r => ({ nombre: r.nombre, productor: r.productor ?? null, anada: r.anada ?? null,
          confidence: r.confidence ?? null, canonicalId: r.canonicalId ?? null, originalSheet: r.originalSheet ?? null,
          atributos: r.atributos ?? null, compatibilidad: r.compatibilidad ?? null, affinity_calibrated: r.affinity_calibrated,
          sensorySource: r.sensorySource, precio: r.precio ?? null, moneda: r.moneda ?? null, precios: r.precios,
          servicio: r.servicio, formato: r.formato ?? null, campos_inferidos: r.campos_inferidos ?? [], dudas: r.dudas ?? [], texto_fuente: r.texto_fuente })));
      }
    }
  }
  const count = document.querySelectorAll('button[aria-label^="Abrir estilo "]').length;
  return choices.find(rows => rows.length === count) ?? null;
};
try {
  for (const [label, width, height, scale] of specs) {
    if (cfg.case && cfg.case !== label) continue;
    const context = await browser.newContext({ viewport: { width, height }, locale: 'es-ES', isMobile: true, hasTouch: true,
      reducedMotion: 'reduce', serviceWorkers: 'block' });
    context.setDefaultTimeout(10000);
    const calls = [], unexpected = [], errors = [], checks = [], layoutFindings = [], details = [], saveCards = [];
    let scans = 0;
    const reply = (route, payload) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload),
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
    await context.route('**/*', async route => {
      const req = route.request(), u = new URL(req.url());
      const call = { method: req.method(), host: u.hostname, path: u.pathname, mocked: true }; calls.push(call);
      if (u.origin === base) {
        const key = ['/', '/escanear/carta-vinos'].includes(u.pathname) ? '/index.html' : decodeURIComponent(u.pathname);
        if (frozen.has(key)) return route.fulfill({ body: frozen.get(key), contentType: key.endsWith('.html') ? 'text/html'
          : key.endsWith('.css') ? 'text/css' : /\.(?:mjs|js)$/.test(key) ? 'application/javascript'
            : /\.png$/.test(key) ? 'image/png' : /\.jpe?g$/.test(key) ? 'image/jpeg' : 'application/octet-stream' });
        call.missingFrozenAsset = true; return route.fulfill({ status: 404, body: 'Not in frozen build' });
      }
      if (req.method() === 'OPTIONS') return reply(route, {});
      if (u.hostname === 'cbjynrbvrhcmpaojmqdp.supabase.co') {
        if (u.pathname === '/functions/v1/scan-wine-menu-v72' && req.method() === 'POST') {
          scans++; if (scans > 12) throw new Error('Bounded replay exhausted');
          const body = req.postDataJSON(); call.requestKeys = Object.keys(body);
          call.responseReceiptSha256 = cfg.traceSha256; call.responseRows = rawRows.length;
          return reply(route, source.payload);
        }
        if (u.pathname.startsWith('/rest/v1/') && req.method() === 'GET') return reply(route, []);
      }
      unexpected.push(call); return route.abort('blockedbyclient');
    });
    await context.routeWebSocket(/.*/, ws => ws.close({ code: 1008, reason: 'No outbound sockets in offline replay' }));
    await context.addInitScript(({ profile, scale }) => {
      window.CapacitorCustomPlatform = { name: 'ios' };
      localStorage.setItem('matchrim.local_profile_owner.v1', 'anonymous');
      localStorage.setItem('matchrim.onboarding.v2:anonymous', JSON.stringify({ version: 2, result: 'skipped' }));
      localStorage.setItem('matchrim.scan_privacy_notice.v2', 'accepted');
      localStorage.setItem('matchrim_quiz_result', JSON.stringify(profile));
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.style.fontSize = 16 * scale + 'px';
        if (scale > 1) document.documentElement.classList.add('matchrim-accessibility-text');
      });
    }, { profile, scale });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(String(e)));
    const check = (name, passed, observation) => { checks.push({ name, passed: Boolean(passed), ...(observation === undefined ? {} : { observation }) }); };
    let state = [], list = [], formatAssessment = null;
    try {
      await page.goto(base + '/escanear/carta-vinos', { waitUntil: 'networkidle' });
      await page.locator('input[type=file]').first().setInputFiles(cfg.image);
      const rows = page.getByRole('button', { name: /^Abrir estilo \d+:/ });
      await expect(rows.first()).toBeVisible({ timeout: 45000 });
      await expect(page.getByRole('heading', { name: /^Lecturas de la carta/ })).toBeVisible();
      await expect.poll(() => rows.count()).toBeGreaterThanOrEqual(5);
      list = await rows.evaluateAll(els => els.map(el => ({ aria: el.getAttribute('aria-label'), text: el.innerText })));
      check('All five literal styles visible in actual native list', JSON.stringify([...new Set(list.map(r => r.aria.replace(/^Abrir estilo \d+: /, '')))].sort()) === JSON.stringify(names));
      check('Observed format count bounded by receipt, not forced to thirteen', list.length >= 5 && list.length <= 13, { actual: list.length, receipt: 13 });
      check('No named-wine aria for generic styles', await page.getByRole('button', { name: /^Abrir vino \d+:/ }).count() === 0);
      check('List has no original fiche or numeric affinity rail', list.every(r => !/Ficha original vinculada|\u2248\s*\d|\d\s*%/.test(r.text)));
      state = await page.evaluate(readWineState);
      check('Read-only actual component state captured, not helper recomputation', Array.isArray(state) && state.length === list.length);
      if (!Array.isArray(state)) throw new Error('Cannot inspect actual scanner wine state');
      check('All actual rows have identity confidence, canonical, original attrs and score cleared', state.every(r => r.confidence === null && r.canonicalId === null
        && r.originalSheet === null && r.atributos === null && r.compatibilidad === null && r.affinity_calibrated === false && r.sensorySource === 'inference'));
      check('No producer/vintage or currency invented', state.every(r => r.productor === null && r.anada === null && r.moneda === null));
      check('Shared RED price inference remains explicit', state.filter(r => ['Merlot', 'Shiraz'].includes(r.nombre))
        .every(r => r.campos_inferidos.includes('precio') && r.campos_inferidos.includes('precios')));
      check('No new prices outside captured style or filled FIZZ glass blank', state.every(r => {
        const original = rawRows.filter(o => o.nombre === r.nombre);
        const allowed = new Set(original.flatMap(o => [o.precio, ...Object.values(o.precios ?? {})]).filter(v => v != null));
        return (r.precio == null || allowed.has(r.precio)) && Object.values(r.precios ?? {}).every(v => v == null || allowed.has(v))
          && (r.nombre !== 'Prosecco' || r.precios?.copa == null);
      }));
      check('Unknown currency is not displayed as a confirmed ISO/symbol', list.every(r => !/[\u00a3\u20ac$]|\b(?:GBP|EUR|USD)\b/.test(r.text)));
      formatAssessment = names.map(name => {
        const input = rawRows.filter(r => r.nombre === name).map(r => ({ service: r.servicio, format: r.formato ?? null, price: r.precio, prices: r.precios }));
        const observed = state.filter(r => r.nombre === name).map(r => ({ service: r.servicio, format: r.formato, price: r.precio, prices: r.precios, inferred: r.campos_inferidos }));
        return { name, inputRows: input.length, observedRows: observed.length, rowReduction: input.length - observed.length, input, observed,
          distinctInputGlassUnits: [...new Set(input.filter(r => r.service === 'copa').map(r => r.format))],
          distinctObservedGlassUnits: [...new Set(observed.filter(r => r.service === 'copa').map(r => r.format))] };
      });
      const listLayout = await page.locator('main').first().evaluate(layoutAudit); layoutFindings.push({ area: 'list', ...listLayout });
      check('List words are not broken inside a word', listLayout.brokenWords.length === 0, listLayout.brokenWords);
      check('List has no horizontal overflow', !listLayout.horizontalOverflow && !await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1));
      await page.screenshot({ path: path.join(output, label + '-list.png'), fullPage: true });
      for (let index = 0; index < list.length; index++) {
        await rows.nth(index).click();
        const dialog = page.getByRole('dialog'), content = page.getByRole('region', { name: 'Contenido del vino', exact: true });
        await expect(content).toBeVisible();
        await page.evaluate(() => new Promise((resolve, reject) => {
          let previous = null, stable = 0, frames = 0;
          const tick = () => {
            const el = document.querySelector('[role=dialog]'); if (!el) return reject(new Error('Drawer disappeared'));
            const r = el.getBoundingClientRect(); stable = previous !== null && Math.abs(r.top - previous) < .1 ? stable + 1 : 0;
            previous = r.top; if (++frames > 240) return reject(new Error('Drawer never settled'));
            if (stable >= 12 && Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42) < 1) return resolve();
            requestAnimationFrame(tick);
          }; requestAnimationFrame(tick);
        }));
        const prefix = `Detail ${index + 1} ${state[index].nombre}: `;
        check(prefix + 'style pending, not personal affinity', await content.getByTestId('native-affinity-pending').count() === 1
          && await content.getByTestId('native-affinity-summary').count() === 0
          && (await content.innerText()).includes('Es un estilo, no una botella identificada'));
        check(prefix + 'no canonical original fiche', await content.getByTestId('winerim-original-sheet').count() === 0
          && await content.getByRole('link', { name: 'Ver ficha original Winerim', exact: true }).count() === 0);
        const read = content.getByText('Qu\u00e9 he le\u00eddo en la carta', { exact: true });
        await read.click(); await expect(content).toContainText('Texto visible:');
        check(prefix + 'actual literal source and style uncertainty useful', (await content.innerText()).includes(state[index].texto_fuente)
          && (await content.innerText()).includes('La carta indica un estilo, no una botella identificada.'));
        const rect = await content.boundingBox(), drect = await dialog.boundingBox();
        const nav = await Promise.all(['Anterior', 'Siguiente'].map(name => dialog.getByRole('button', { name, exact: true }).boundingBox()));
        check(prefix + 'useful scrollable reading area', rect && rect.height >= Math.min(200, height * .24), rect);
        check(prefix + 'drawer within viewport and reading before stable footer', drect && drect.y >= -1 && drect.y + drect.height <= height + 2
          && nav.every(r => r && r.width >= 43.5 && r.height >= 43.5) && rect.y + rect.height <= Math.min(...nav.map(r => r.y)) + 1, { drawer: drect, content: rect, navigation: nav });
        const layout = await dialog.evaluate(layoutAudit); layoutFindings.push({ area: `detail-${index + 1}`, ...layout });
        check(prefix + 'no broken words or horizontal overlap', layout.brokenWords.length === 0 && !layout.horizontalOverflow, layout);
        await page.screenshot({ path: path.join(output, label + `-detail-${index + 1}.png`) });
        details.push({ index, name: state[index].nombre, text: await content.innerText(), content: rect, drawer: drect, navigation: nav });
        await dialog.getByRole('button', { name: 'Cerrar detalle', exact: true }).click(); await expect(dialog).toHaveCount(0);
      }
      await page.getByText('Ver fichas completas y acciones', { exact: true }).click();
      for (let index = 0; index < list.length; index++) {
        const expand = page.locator(`button[aria-controls="wine-actions-${index}"]`); await expand.click();
        const card = page.locator(`#wine-actions-${index}`);
        for (const name of ['Quiero Probar', 'Lo he probado', 'A\u00f1adir favorito']) {
          check(`Save ${index + 1} ${name} disabled for literal style`, await card.getByRole('button', { name, exact: true }).isDisabled());
        }
        const cardText = await card.innerText();
        const copy = cardText.split('\n').find(line => line.includes('Corrige')) ?? null;
        check(`Save ${index + 1} correction-before-save copy`, cardText.includes('Corrige la identificaci\u00f3n'), copy);
        const cardLayout = await card.evaluate(layoutAudit); layoutFindings.push({ area: `save-card-${index + 1}`, ...cardLayout });
        check(`Save ${index + 1} no broken words or horizontal overlap`, cardLayout.brokenWords.length === 0 && !cardLayout.horizontalOverflow, cardLayout);
        saveCards.push({ index, name: state[index].nombre, text: cardText, correctionCopy: copy });
        if (index === 0) {
          await card.getByRole('button', { name: 'Quiero Probar', exact: true }).scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, label + '-save-disabled.png') });
        }
        await expand.click();
      }
      check('No catalog lookup at all for generic styles', !calls.some(c => c.host === 'app.winerim.com'));
      check('No account/save/confirmed production mutations requested', !calls.some(c => c.path.startsWith('/auth/') || c.path.startsWith('/rest/') && !['GET', 'OPTIONS'].includes(c.method)));
      check('No model/provider path changed; exact existing scan endpoint replayed', scans > 0 && calls.filter(c => c.responseRows).every(c => c.path === '/functions/v1/scan-wine-menu-v72'));
      check('No required unknown outbound traffic', unexpected.length === 0, unexpected);
      check('No browser runtime exceptions', errors.length === 0, errors);
      results.push({ case: label, passed: checks.every(c => c.passed), viewport: { width, height, textScale: scale }, checks, calls, errors, unexpected,
        list, actualState: state, formatAssessment, details, saveCards, layoutFindings });
    } catch (error) {
      await page.screenshot({ path: path.join(output, label + '-failure.png'), fullPage: true });
      results.push({ case: label, passed: false, error: String(error), checks, calls, errors, unexpected, list, actualState: state, formatAssessment, details, saveCards, layoutFindings });
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
const changed = cfg.buildFiles.filter(f => sha(fs.readFileSync(path.join(root, f.file))) !== f.sha256);
const report = { scope: 'Actual parent-confirmed build16 offline UI. Captured 13-row mixed-drinks response, existing source photo, synthetic anonymous palate; no new recognition or taste benchmark.',
  results, passed: results.filter(r => r.passed).length, total: results.length, build: root, buildLabel: cfg.buildLabel,
  runnerSha256: sha(fs.readFileSync(cfg.pythonScript)), frozenBuildManifestSha256: cfg.buildManifestSha256,
  traceSha256: cfg.traceSha256, imageSha256: cfg.imageSha256, controlsSha256: cfg.controlsSha256,
  changedBuildFiles: changed, origin: base, serverBound: false, realNetworkCalls: 0, providerCalls: 0, productionWrites: 0,
  limits: 'Read-only React component-state projection corroborates cleared fields; no globals, keys or account data dumped. Format reductions are reported rather than silently equating 13 response rows to 13 observed formats. Parent build/properflags confirmation supplies provenance; no rebuild or source edit.' };
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, total: report.total, observedRows: results.map(r => ({ case: r.case, rows: r.list.length })),
  failures: results.filter(r => !r.passed).map(r => ({ case: r.case, error: r.error, checks: r.checks.filter(c => !c.passed) })), changedBuildFiles: changed.length }));
if (report.passed !== report.total || changed.length) process.exitCode = 1;
'''


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build', type=Path, required=True)
    parser.add_argument('--build-label', default='build16-parent-confirmed-properflags')
    parser.add_argument('--trace', type=Path, required=True)
    parser.add_argument('--controls', type=Path, required=True)
    parser.add_argument('--image', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--case', choices=['portrait393', 'landscape852', 'text200-320'])
    parser.add_argument('--playwright-module', type=Path, default=Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')
    parser.add_argument('--chrome', type=Path, default=Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'))
    args = parser.parse_args()
    assert not args.output.exists(), 'Preserve prior UI evidence; use a new output directory'
    assert args.output.name.startswith('ui'), 'Use the private ui* evidence area'
    assert (args.build / 'index.html').is_file() and args.playwright_module.is_file()
    assert shutil.which('node'), 'Use an existing Node runtime; do not install dependencies'
    files = []
    for file in sorted(args.build.rglob('*')):
        assert not file.is_symlink(), 'Frozen builds must not contain symlinks'
        if file.is_file():
            files.append({'file': str(file.relative_to(args.build)), 'bytes': file.stat().st_size, 'sha256': digest(file)})
    args.output.mkdir(parents=True)
    frozen = {'build': str(args.build.resolve()), 'label': args.build_label, 'files': files,
              'provenance': 'Parent explicitly confirmed build16 ready/properflags; no rebuild and no credentials/config reads.'}
    manifest = args.output / 'frozen-build.json'
    manifest.write_text(json.dumps(frozen, indent=2) + '\n')
    config = {'build': str(args.build.resolve()), 'buildLabel': args.build_label, 'buildFiles': files,
              'output': str(args.output.resolve()), 'trace': str(args.trace.resolve()), 'controls': str(args.controls.resolve()),
              'image': str(args.image.resolve()), 'playwright': str(args.playwright_module.resolve()), 'chrome': str(args.chrome),
              'case': args.case, 'pythonScript': str(Path(__file__).resolve()), 'traceSha256': digest(args.trace),
              'imageSha256': digest(args.image), 'controlsSha256': digest(args.controls), 'buildManifestSha256': digest(manifest)}
    (args.output / 'config.json').write_text(json.dumps(config, indent=2) + '\n')
    runner = args.output / 'runner.mjs'
    runner.write_text(NODE_RUNNER)
    return subprocess.run([shutil.which('node'), str(runner.resolve()), str((args.output / 'config.json').resolve())], check=False).returncode


if __name__ == '__main__':
    raise SystemExit(main())
