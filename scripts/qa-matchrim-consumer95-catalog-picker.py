"""Frozen actual Label/Menu picker E2E, with every transport fulfilled offline.

Public94 Library replay, synthetic recognition/profile/auth controls, real clicks
and screenshots. No recognition accuracy, human taste or live coverage claim.
Uses the existing bundled Node Playwright because system Python lacks Playwright.
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
import assert from 'node:assert/strict';
const cfg = JSON.parse(fs.readFileSync(process.argv[2]));
const { chromium } = await import(pathToFileURL(cfg.playwright).href);
const { expect } = await import(pathToFileURL(path.join(path.dirname(cfg.playwright), 'test.mjs')).href);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const frozen = new Map(cfg.files.map(f => {
  const bytes = fs.readFileSync(path.join(cfg.snapshot, f.file)); assert.equal(sha(bytes), f.sha256);
  return ['/' + f.file, bytes];
}));
const capture = JSON.parse(fs.readFileSync(cfg.catalog));
const records = capture.reads.filter(r => r.case === 'public-nv-control'); assert.equal(records.length, 3);
const [resolver, listing, source] = records.map(r => r.body);
assert.equal(source.id, 278688); assert.equal(source.vintage, null);
const base = 'http://127.0.0.1:4600', sb = 'cbjynrbvrhcmpaojmqdp.supabase.co';
const ownerA = '95000000-0000-4000-8000-000000000095', ownerB = '95000000-0000-4000-8000-000000000096';
const nv = { potente: 2, acidez: 4, dulce: 1, tanico: 0, afrutado: 1 };
const opposite = { potente: 5, acidez: 0, dulce: 5, tanico: 5, afrutado: 5 };
const attributes = { scale: 'winerim-0-5', potencia: 2, acidez: 4, dulzura: 1, taninos: 0, afrutado: 1 };
const norm = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const training = { id: 'synthetic-training95', name: source.name, producer: source.winery, vintage: null,
  region: source.region, country: source.country, rating: 'love', use_for_profile_training: true,
  sensory_attributes: attributes, place_details: { bodega_sensory_evidence: {
    version: 2, scale: 'winerim-0-5', source: 'catalog', canonical_id: String(source.id),
    identity_signature: JSON.stringify([norm(source.name), norm(source.winery), null, norm(source.region), norm(source.country)]),
    attribute_signature: JSON.stringify(['winerim-0-5', 2, 4, 1, 0, 1]),
  }, matchrim_rating_at: '2026-10-17T00:00:00.000Z' } };
const fakeSession = owner => {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const user = { id: owner, aud: 'authenticated', role: 'authenticated', email: 'picker95@qa.invalid', app_metadata: {}, user_metadata: {} };
  return { user, access_token: encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: owner, exp: 4102444800 }) + '.synthetic-invalid',
    refresh_token: 'synthetic-invalid', expires_at: 4102444800, expires_in: 86400, token_type: 'bearer' };
};
const extras = [1, 2].map(i => ({ id: 950095 + i, name: `Synthetic catalogue control ${i}`, winery: 'Synthetic producer95',
  vintage: null, slugname: `Synthetic-catalogue-control-${i}`, type: 'tinto', region: 'Synthetic region95' }));
const proposalPage = { ...listing, results: [listing.results[0], ...extras], count: 3, page: 1, limit: 20 };
const rawLabel = { name: 'La Gitana', producer: null, vintage: 2021, region: null, country: null, grapes: [], confidence: .78,
  source: 'label', evidence: ['Synthetic visible text: La Gitana', 'Synthetic visible year: 2021'],
  uncertainty_reasons: ['Control sint\u00e9tico: falta confirmar la bodega.'], inferred_fields: ['sensory_attributes'],
  affinity: null, affinity_confidence: null, sensory_attributes: { potencia: 5, acidez: 1, dulzura: 5, taninos: 5, afrutado: 5 } };
const rawMenu = { nombre: 'La Gitana', productor: null, anada: 2021, region: null, pais: null, confidence: .78,
  tipo: 'generoso', seccion: 'VINOS', texto_fuente: 'VINOS | La Gitana 2021 | Botella 20',
  precio: 20, moneda: null, precios: { botella: 20, copa: null, llevar: null }, servicio: 'botella',
  campos_inferidos: ['atributos'], dudas: ['Control sint\u00e9tico: falta confirmar la bodega.'],
  atributos: { potencia: 5, acidez: 1, dulzura: 5, taninos: 5, afrutado: 5 }, compatibilidad: null };
const detection = { coverage: { status: 'reported_complete', detected_objects: 1, estimated_visible_objects: 1, confidence: .99,
  notes: ['Synthetic one-region transport control, not recognition evidence.'] }, regions: [{ box: { x: 8, y: 8, width: 80, height: 80 },
  confidence: .99, object_type: 'bottle', quality: { glare: 'low', occlusion: 'low', legibility: 'good' } }] };
fs.writeFileSync(path.join(cfg.output, 'contracts.json'), JSON.stringify({ scope: 'Synthetic controls, not new ground truth',
  nv, opposite, training, rawLabel, rawMenu, detection, proposalPage, source,
  profileVariants: ['nv', 'opposite', 'missing', 'learned', 'training-error'] }, null, 2) + '\n');
const views = [['portrait393', 393, 852, 16], ['landscape852', 852, 393, 16], ['text200-320', 320, 700, 32]];
const specs = [];
for (const flow of ['label', 'menu']) {
  for (const profile of ['nv', 'opposite', 'missing', 'learned', 'training-error'])
    for (const [view, width, height, font] of views) specs.push({ id: `${flow}-${profile}-${view}`, flow, profile, mode: 'confirm', view, width, height, font });
  for (const mode of ['cancel-list', 'late-query', 'cancel-detail', 'unmount-detail', 'owner-detail', 'mismatch-detail', 'incomplete-search'])
    specs.push({ id: `${flow}-${mode}`, flow, profile: mode === 'owner-detail' ? 'learned' : 'nv', mode, view: 'portrait393', width: 393, height: 852, font: 16 });
}
const layoutAudit = scope => {
  const brokenWords = [], walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent || parent.closest('svg,.sr-only,[aria-hidden=true]') || !parent.getClientRects().length) continue;
    for (const m of node.textContent.matchAll(/\p{L}[\p{L}\p{M}]{2,}/gu)) {
      const range = document.createRange(); range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
      const rects = [...range.getClientRects()].filter(r => r.width > .5 && r.height > .5);
      if (new Set(rects.map(r => Math.round(r.y * 2) / 2)).size > 1) brokenWords.push({ word: m[0], text: node.textContent.slice(0, 160) });
    }
  }
  const r = scope.getBoundingClientRect();
  const controls = [...scope.querySelectorAll('button,input')].filter(el => el.getClientRects().length).map(el => {
    const box = el.getBoundingClientRect(); return { label: el.getAttribute('aria-label') || el.textContent.trim(),
      width: box.width, height: box.height, left: box.left, right: box.right, named: !!(el.getAttribute('aria-label') || el.textContent.trim() || el.labels?.length) };
  });
  return { brokenWords, overflow: scope.scrollWidth > scope.clientWidth + 1, left: r.left, right: r.right, controls };
};
const readIdentity = flow => {
  const elements = [...document.querySelectorAll('[role=dialog] button,[role=dialog] input')];
  const choices = [];
  for (const el of elements.slice(0, 25)) {
    const key = Object.keys(el).find(k => k.startsWith('__reactFiber$')); let fiber = key ? el[key] : null;
    for (let depth = 0; fiber && depth < 55; depth++, fiber = fiber.return) {
      for (let hook = fiber.memoizedState, i = 0; hook && i < 100; hook = hook.next, i++) {
        const rows = hook.memoizedState;
        if (!Array.isArray(rows) || !rows.length) continue;
        if (flow === 'menu' && rows.every(r => r && typeof r.nombre === 'string' && 'texto_fuente' in r)) choices.push(...rows.map(r => ({
          name: r.nombre, producer: r.productor ?? null, vintage: r.anada ?? null, canonicalId: r.canonicalId ?? null,
          originalSheetId: r.originalSheet?.id ?? null, sheetVintage: r.originalSheet?.vintage ?? null,
          sensorySource: r.sensorySource, attributes: r.atributos ?? null,
        })));
        if (flow === 'label' && rows.every(r => r && Array.isArray(r.candidates) && typeof r.status === 'string'))
          choices.push(...rows.flatMap(r => r.candidates.map(c => ({ name: c.name, producer: c.producer ?? null, vintage: c.vintage ?? null,
            canonicalId: c.canonicalId ?? null, originalSheetId: c.originalSheet?.id ?? null,
            sheetVintage: c.originalSheet?.vintage ?? null, sensorySource: c.sensorySource, attributes: c.sensoryAttributes ?? null }))));
      }
    }
  }
  return choices.find(c => c.originalSheetId === '278688') ?? choices[0] ?? null;
};
const viewportAudit = content => {
  const dialog = content.closest('[role=dialog]');
  const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
  let scrollport = content;
  while (scrollport !== dialog && !(/auto|scroll/.test(getComputedStyle(scrollport).overflowY)
    && scrollport.clientHeight > 0 && scrollport.scrollHeight > scrollport.clientHeight + 1)) scrollport = scrollport.parentElement;
  return { dialog: rect(dialog), content: rect(content), scrollport: rect(scrollport),
    scrollportClass: scrollport.className, scrollportClientHeight: scrollport.clientHeight,
    scrollHeight: scrollport.scrollHeight, scrollTop: scrollport.scrollTop, overflowY: getComputedStyle(scrollport).overflowY,
    wholePanelScroll: scrollport.classList.contains('matchrim-scan-region-layout'), viewport: { width: innerWidth, height: innerHeight } };
};
const browser = await chromium.launch({ headless: true, executablePath: cfg.chrome,
  proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1,localhost' },
  args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--host-resolver-rules=MAP * ~NOTFOUND'] });
const results = [];
const persist = () => fs.writeFileSync(path.join(cfg.output, 'report.json'), JSON.stringify({ build: cfg.build, snapshot: cfg.snapshot,
  scope: 'Actual frozen build20 Label/Menu UI, controlled transport/profile/auth. Not native-device, recognition, taste or live catalogue coverage.',
  scriptSha256: cfg.scriptSha256, manifestSha256: cfg.manifestSha256, catalogSha256: cfg.catalogSha256,
  results, passed: results.filter(r => r.passed).length, total: results.length, scheduledCases: specs.length,
  realNetworkCalls: 0, modelCalls: 0, productionWrites: 0, serverBound: false, origin: base,
  limits: 'Source94 first Library record replayed. Other two proposals, OCR 2021 and all profile/auth fixtures are synthetic. Existing public images are transport/crop fixtures, not claims that La Gitana occurs in the pixels. No real accounts, provider calls or saves. Source/compiled assets never patched.' }, null, 2) + '\n');
try {
  for (const spec of specs) {
    if (cfg.cases?.length && !cfg.cases.includes(spec.id)) continue;
    const folder = path.join(cfg.output, spec.id); fs.mkdirSync(folder);
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, locale: 'es-ES', isMobile: true,
      hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
    context.setDefaultTimeout(12000);
    const calls = [], unexpected = [], errors = [], checks = [], screenshots = [], geometry = [];
    const held = []; let holdList = spec.mode === 'cancel-list' || spec.mode === 'late-query', holdDetail = false;
    let syntheticOwner = ownerA;
    const authenticated = ['learned', 'training-error'].includes(spec.profile);
    const reply = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body),
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' } });
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const call = { method: req.method(), host: url.hostname, path: url.pathname }; calls.push(call);
      if (url.origin === base) {
        const key = ['/', '/escanear/etiqueta', '/escanear/carta-vinos'].includes(url.pathname) ? '/index.html' : decodeURIComponent(url.pathname);
        if (!frozen.has(key)) { unexpected.push({ ...call, missingFrozenAsset: true }); return route.fulfill({ status: 404, body: 'No frozen asset' }); }
        return route.fulfill({ body: frozen.get(key), contentType: key.endsWith('.html') ? 'text/html' : key.endsWith('.css') ? 'text/css'
          : /\.(?:mjs|js)$/.test(key) ? 'application/javascript' : /\.jpe?g$/.test(key) ? 'image/jpeg' : key.endsWith('.png') ? 'image/png' : 'application/octet-stream' });
      }
      if (req.method() === 'OPTIONS') return reply(route, {});
      if (url.hostname === sb) {
        if (req.method() === 'GET' && url.pathname === '/auth/v1/user') return reply(route, fakeSession(syntheticOwner).user);
        if (req.method() === 'GET' && url.pathname.startsWith('/rest/v1/')) {
          const table = url.pathname.split('/').pop();
          if (table === 'quiz_results') return reply(route, spec.profile === 'missing' ? null : nv);
          if (table === 'user_wines') return spec.profile === 'training-error' ? reply(route, { message: 'Synthetic training read unavailable' }, 503)
            : reply(route, spec.profile === 'learned' ? [{ ...training, user_id: syntheticOwner }] : []);
          return reply(route, []);
        }
        if (req.method() === 'POST' && url.pathname.startsWith('/functions/v1/')) {
          const endpoint = url.pathname.split('/').pop(); call.requestKeys = Object.keys(req.postDataJSON() ?? {});
          if (endpoint === 'detect-wine-regions-v72') return reply(route, detection);
          if (endpoint === 'analyze-wine-region-v72') return reply(route, { candidates: [rawLabel] });
          if (endpoint === 'scan-wine-menu-v72') return reply(route, { vinos: [rawMenu], layout: 'rows', moneda: null,
            coverage: { status: 'reported_complete', extracted_wines: 1, notes: ['Synthetic single menu identity contract'] } });
          if (endpoint === 'search-wines-v75') return reply(route, { wines: [] });
        }
      }
      if (url.hostname === 'app.winerim.com' && req.method() === 'GET') {
        call.query = url.search;
        call.hasAuthorization = !!req.headers().authorization; call.hasCookie = !!req.headers().cookie;
        if (url.pathname === '/api/v1/whoami/slugname' && url.search === '?s=the-library') return reply(route, resolver);
        const root = `/api/v1/restaurant/${resolver.restaurant}/wines`;
        if (url.pathname === root) {
          if (holdList) { holdList = false; held.push({ route, kind: 'list', body: proposalPage }); return; }
          return reply(route, spec.mode === 'incomplete-search' ? { ...proposalPage, count: 21 } : proposalPage);
        }
        if (url.pathname === root + '/278688/Manzanilla-La-Gitana') {
          const body = spec.mode === 'mismatch-detail' ? { ...source, winery: 'Synthetic mismatched producer95' } : source;
          if (holdDetail) { holdDetail = false; held.push({ route, kind: 'detail', body }); return; }
          return reply(route, body);
        }
      }
      unexpected.push(call); return route.abort('blockedbyclient');
    });
    await context.routeWebSocket(/.*/, ws => ws.close({ code: 1008, reason: 'Controlled offline picker QA' }));
    await context.addInitScript(({ profile, nv, opposite, authenticated, session, font, ignoreAbort }) => {
      window.CapacitorCustomPlatform = { name: 'ios' };
      const owner = authenticated ? session.user.id : 'anonymous';
      localStorage.setItem('matchrim.local_profile_owner.v1', owner);
      localStorage.setItem('matchrim.onboarding.v2:' + owner, JSON.stringify({ version: 2, result: 'skipped' }));
      localStorage.setItem('matchrim.scan_privacy_notice.v2', 'accepted');
      if (profile !== 'missing') localStorage.setItem('matchrim_quiz_result', JSON.stringify(profile === 'opposite' ? opposite : nv));
      if (authenticated) localStorage.setItem('sb-cbjynrbvrhcmpaojmqdp-auth-token', JSON.stringify(session));
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.style.fontSize = font + 'px';
        if (font === 32) document.documentElement.classList.add('matchrim-accessibility-text');
      });
      const original = window.fetch;
      window.__picker95Requests = []; window.__picker95Resolved = 0;
      window.fetch = async (input, init) => {
        if (!String(input).startsWith('https://app.winerim.com/')) return original(input, init);
        const receipt = { url: String(input), credentials: init?.credentials, redirect: init?.redirect,
          method: init?.method, signalBound: !!init?.signal, aborted: false };
        window.__picker95Requests.push(receipt);
        init?.signal?.addEventListener('abort', () => { receipt.aborted = true; }, { once: true });
        const response = await original(input, ignoreAbort ? { ...init, signal: undefined } : init);
        window.__picker95Resolved++; return response;
      };
    }, { profile: spec.profile, nv, opposite, authenticated, session: fakeSession(ownerA), font: spec.font,
      ignoreAbort: spec.mode !== 'confirm' });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(String(e)));
    const check = (name, passed, observation) => checks.push({ name, passed: !!passed, ...(observation === undefined ? {} : { observation }) });
    const captureScreen = async stage => {
      const file = stage + '.png'; await page.screenshot({ path: path.join(folder, file) }); screenshots.push(file);
      fs.writeFileSync(path.join(folder, stage + '.txt'), await page.locator('body').innerText());
    };
    const pending = async (content, stage) => {
      check(stage + ': no personal affinity', await content.getByTestId('native-affinity-summary').count() === 0);
      check(stage + ': no verified original fiche', await content.getByTestId('winerim-original-sheet').count() === 0);
      check(stage + ': no score label', await content.locator('[aria-label^="Afinidad orientativa:"]').count() === 0);
    };
    const settle = async () => page.waitForFunction(() => {
      const el = document.querySelector('[role=dialog]'); if (!el) return false;
      return Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42) < 1;
    });
    const content = () => page.getByRole('region', { name: spec.flow === 'label' ? 'Contenido de la regi\u00f3n 1' : 'Contenido del vino', exact: true });
    const openDrawer = async () => {
      if (spec.flow === 'label') await page.getByRole('button', { name: 'Revisar vinos', exact: true }).click();
      else await page.getByRole('button', { name: /^Abrir vino 1:/ }).click();
      await expect(content()).toBeVisible(); await settle();
      if (spec.flow === 'label') await content().getByTestId('native-reference-details').locator('summary').click();
    };
    const releaseHeld = async () => {
      const count = held.length;
      const resolved = await page.evaluate(() => window.__picker95Resolved);
      for (const item of held.splice(0)) { try { await reply(item.route, item.body); } catch { /* Aborted browser routes are expected. */ } }
      if (count) {
        await expect.poll(() => page.evaluate(() => window.__picker95Resolved)).toBeGreaterThanOrEqual(resolved + count);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        check('Ignored-signal late transport actually resolved before stale-commit assertions', true, { released: count });
      }
    };
    let beforeState = null, afterState = null, score = null, fetchAudit = [], error = null;
    try {
      await page.goto(base + (spec.flow === 'label' ? '/escanear/etiqueta' : '/escanear/carta-vinos'), { waitUntil: 'networkidle' });
      await page.locator('input[type=file]').nth(spec.flow === 'label' ? 1 : 0).setInputFiles(spec.flow === 'label' ? cfg.labelImage : cfg.menuImage);
      if (spec.flow === 'label') await expect(page.getByText('Lote listo para revisar', { exact: true })).toBeVisible({ timeout: 45000 });
      else await expect(page.getByRole('button', { name: /^Abrir vino 1:/ })).toBeVisible({ timeout: 45000 });
      await openDrawer(); await pending(content(), 'Before picker');
      beforeState = await page.evaluate(readIdentity, spec.flow);
      check('Initial synthetic photograph/menu year is 2021 with no producer', beforeState?.vintage === 2021 && beforeState?.producer === null, beforeState);
      check('No automatic public Library query for incomplete producer', !calls.some(c => c.host === 'app.winerim.com'));
      await content().getByRole('button', { name: 'Buscar por nombre', exact: true }).click();
      const panel = content().getByRole('region', { name: 'Buscar referencia en Winerim', exact: true });
      await panel.getByRole('button', { name: 'Cerrar b\u00fasqueda', exact: true }).click();
      await expect(panel).toHaveCount(0);
      check('Actual close click leaves no public requests or affinity', !calls.some(c => c.host === 'app.winerim.com')
        && await content().getByTestId('native-affinity-summary').count() === 0);
      await content().getByRole('button', { name: 'Buscar por nombre', exact: true }).click();
      const input = panel.getByLabel('Nombre del vino', { exact: true });
      await input.fill('x'); check('Invalid typed name leaves Search disabled', await panel.getByRole('button', { name: 'Buscar', exact: true }).isDisabled());
      await input.fill(spec.mode === 'late-query' ? 'Old query95' : 'La Gitana');
      await panel.getByRole('button', { name: 'Buscar', exact: true }).click();
      if (spec.mode === 'cancel-list' || spec.mode === 'late-query') {
        await expect.poll(() => held.length).toBe(1);
        if (spec.mode === 'cancel-list') {
          await panel.getByRole('button', { name: 'Cancelar', exact: true }).click(); await releaseHeld();
          await expect(panel).toContainText('Consulta cancelada'); await pending(content(), 'Cancelled search');
          check('Late cancelled list never creates proposal buttons', await panel.getByRole('button', { name: 'Esta es mi botella', exact: true }).count() === 0);
          check('Cancelled list never starts strict detail', !calls.some(c => c.path.endsWith('/278688/Manzanilla-La-Gitana')));
          await captureScreen('cancelled-list');
        } else {
          await input.fill('La Gitana'); await panel.getByRole('button', { name: 'Buscar', exact: true }).click();
          await expect(panel.getByRole('button', { name: 'Esta es mi botella', exact: true }).first()).toBeVisible();
          held[0].body = { ...proposalPage, results: [{ ...extras[0], name: 'Old query stale proposal95' }], count: 1 };
          await releaseHeld(); await expect.poll(() => page.evaluate(() => window.__picker95Resolved)).toBeGreaterThanOrEqual(4);
          check('Edited query ignores a late stale list', !(await panel.innerText()).includes('Old query stale proposal95') && await panel.locator('li').count() === 3);
          await pending(content(), 'Late query'); await captureScreen('late-query');
        }
      } else if (spec.mode === 'incomplete-search') {
        await expect(panel).toContainText('Concreta el nombre'); await pending(content(), 'Incomplete results');
        check('Incomplete >20 count produces no selectable proposals', await panel.getByRole('button', { name: 'Esta es mi botella', exact: true }).count() === 0);
        await captureScreen('incomplete');
      } else {
        await expect(panel.getByRole('button', { name: 'Esta es mi botella', exact: true }).first()).toBeVisible();
        await pending(content(), 'Proposals only');
        check('Actual list shows top three proposals', await panel.locator('li').count() === 3);
        check('Unknown vintage is not called NV or a verified bottle harvest', (await panel.innerText()).includes('A\u00f1ada no indicada')
          && (await panel.innerText()).includes('elegirla no verifica la cosecha de tu botella.'));
        const layout = await panel.evaluate(layoutAudit); geometry.push({ stage: 'proposals', ...layout });
        check('Proposal list has no broken words or horizontal overflow', !layout.overflow && layout.brokenWords.length === 0, layout);
        check('All picker controls >=44px high, named and fit panel', layout.controls.every(c => c.height >= 43.5 && c.named && c.left >= layout.left - 1 && c.right <= layout.right + 1), layout.controls);
        const close = panel.getByRole('button', { name: 'Cerrar b\u00fasqueda', exact: true }); await close.scrollIntoViewIfNeeded();
        const closeBox = await close.boundingBox(); check('Close target is at least 44x44 with accessible name', closeBox?.width >= 43.5 && closeBox?.height >= 43.5, closeBox);
        await captureScreen('proposals-top');
        const confirm = panel.getByRole('button', { name: 'Esta es mi botella', exact: true }).first(); await confirm.scrollIntoViewIfNeeded();
        const frame = await content().evaluate(viewportAudit); geometry.push({ stage: 'proposal-scrollport', ...frame });
        check('Actual picker scrollport is bounded by viewport and drawer', frame.dialog.y >= -1 && frame.dialog.bottom <= spec.height + 2
          && frame.scrollport.y >= frame.dialog.y - 1 && frame.scrollport.bottom <= frame.dialog.bottom + 1
          && frame.scrollportClientHeight >= Math.min(200, spec.height * .24), frame);
        await captureScreen('proposal-confirm');
        if (['cancel-detail', 'unmount-detail', 'owner-detail'].includes(spec.mode)) holdDetail = true;
        await confirm.click();
        if (holdDetail || held.length) await expect.poll(() => held.length).toBe(1);
        if (spec.mode === 'cancel-detail') {
          await panel.getByRole('button', { name: 'Cancelar', exact: true }).click(); await releaseHeld();
          await expect(panel).toContainText('Consulta cancelada'); await pending(content(), 'Cancelled strict detail');
          afterState = await page.evaluate(readIdentity, spec.flow);
          check('Cancelled strict detail leaves original unconfirmed identity/year', afterState?.canonicalId === null && afterState?.vintage === 2021, afterState);
          await captureScreen('cancelled-detail');
        } else if (spec.mode === 'unmount-detail') {
          await page.getByRole('dialog').getByRole('button', { name: spec.flow === 'label' ? 'Cerrar' : 'Cerrar detalle', exact: true }).click();
          await expect(page.getByRole('dialog')).toHaveCount(0); await releaseHeld(); await openDrawer();
          await pending(content(), 'Unmounted late strict detail'); afterState = await page.evaluate(readIdentity, spec.flow);
          check('Unmount ignores late source, retaining unconfirmed row', afterState?.canonicalId === null && afterState?.vintage === 2021, afterState);
          await captureScreen('unmounted-detail');
        } else if (spec.mode === 'owner-detail') {
          syntheticOwner = ownerB;
          await page.evaluate(session => {
            localStorage.setItem('sb-cbjynrbvrhcmpaojmqdp-auth-token', JSON.stringify(session));
            const channel = new BroadcastChannel('sb-cbjynrbvrhcmpaojmqdp-auth-token');
            channel.postMessage({ event: 'SIGNED_IN', session }); setTimeout(() => channel.close(), 100);
          }, fakeSession(ownerB));
          await expect(page.getByRole('dialog')).toHaveCount(0); await releaseHeld();
          check('Owner change clears prior scan and cannot commit late source', await page.getByTestId('native-affinity-summary').count() === 0
            && await page.getByTestId('winerim-original-sheet').count() === 0);
          await captureScreen('owner-changed');
        } else if (spec.mode === 'mismatch-detail') {
          await expect(panel).toContainText('La identidad y la afinidad siguen pendientes'); await pending(content(), 'Mismatched detail');
          afterState = await page.evaluate(readIdentity, spec.flow); check('List/detail disagreement cannot bind canonical identity', afterState?.canonicalId === null, afterState);
          await captureScreen('mismatch-detail');
        } else {
          await expect(content().getByTestId('winerim-original-sheet')).toBeVisible();
          afterState = await page.evaluate(readIdentity, spec.flow);
          check('Explicit NV selection binds selected public record, never previous OCR year', afterState?.canonicalId === '278688' && afterState?.originalSheetId === '278688'
            && afterState?.vintage === null && afterState?.sheetVintage === null && afterState?.producer === source.winery, afterState);
          const summaries = content().getByTestId('native-affinity-summary');
          if (spec.profile === 'missing') {
            const pendingStatus = await content().getByTestId('native-affinity-pending').count() > 0
              || await content().getByText('Afinidad pendiente', { exact: true }).count() > 0;
            check('Verified sheet without profile is still affinity pending', await summaries.count() === 0 && pendingStatus
              && await content().locator('[aria-label^="Afinidad orientativa:"]').count() === 0);
          } else {
            await expect(summaries).toHaveCount(1); const label = await summaries.locator('[aria-label^="Afinidad orientativa:"]').getAttribute('aria-label');
            score = Number(label.match(/(\d+) de 100/)[1]);
            check('Matching NV profile is approximately 93, opposite profile is distinct', spec.profile === 'opposite' ? score !== 93 && score < 70 : score === 93, { score, profile: spec.profile });
            check('One consumer answer precedes optional original fiche', await summaries.evaluate(el => !!(el.compareDocumentPosition(document.querySelector('[data-testid=winerim-original-sheet]')) & Node.DOCUMENT_POSITION_FOLLOWING)));
            await summaries.locator('summary').click();
            check('Verified source zero is preserved in actual dimensions', (await summaries.innerText()).includes('Este vino: 0.0/5'));
            await summaries.scrollIntoViewIfNeeded();
          }
          check('Original public source link is exact selected id/slug', await content().getByRole('link', { name: 'Ver ficha original Winerim', exact: true }).getAttribute('href')
            === 'https://web.winerim.com/the-library/wines/278688/Manzanilla-La-Gitana');
          if (spec.flow === 'menu' && spec.profile === 'training-error') check('Learning read failure remains explicit, not fictional zero samples',
            (await page.getByRole('dialog').getByTestId('scan-profile-source').textContent()).includes('no se pudieron cargar las valoraciones'));
          if (spec.flow === 'label' && spec.profile === 'training-error') check('Learning read failure remains explicit, not fictional zero samples',
            (await page.locator('body').innerText()).includes('no se pudieron cargar las valoraciones'));
          if (spec.profile === 'learned') check('Strict verified synthetic training was actually included', spec.flow === 'label'
            ? (await page.locator('body').innerText()).includes('Perfil ajustado con 1 valoraci\u00f3n')
            : (await page.getByRole('dialog').getByTestId('scan-profile-source').textContent()).includes('tus valoraciones'));
          await captureScreen('confirmed-source');
        }
      }
      fetchAudit = await page.evaluate(() => window.__picker95Requests);
      check('Every public request omits credentials and rejects redirects', fetchAudit.every(r => r.credentials === 'omit' && r.redirect === 'error' && r.method === 'GET' && r.signalBound));
      check('No auth identity, cookie or authorization on public catalogue requests', calls.filter(c => c.host === 'app.winerim.com')
        .every(c => !c.hasAuthorization && !c.hasCookie && !c.query?.includes(ownerA) && !c.query?.includes(ownerB)));
      check('No strict detail fetched before explicit selection', !['cancel-list', 'late-query', 'incomplete-search'].includes(spec.mode)
        || !calls.some(c => c.path.endsWith('/278688/Manzanilla-La-Gitana')));
      check('No actual account/save production mutation attempted', !calls.some(c => c.host === sb && c.method !== 'GET' && c.method !== 'OPTIONS' && !c.path.startsWith('/functions/v1/')));
      check('No changed provider function paths or unknown outbound requests', unexpected.length === 0, unexpected);
      check('No browser runtime exception', errors.length === 0, errors);
      check('Root never horizontally overflows viewport', !await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1));
      const body = await content().count() ? await content().boundingBox() : null;
      if (body) check('Useful reading area remains', body.height >= Math.min(200, spec.height * .24), body);
      if (spec.mode === 'confirm') {
        const frame = await content().evaluate(viewportAudit); geometry.push({ stage: 'confirmed-scrollport', ...frame });
        check('Confirmed result retains bounded actual reading scrollport', frame.dialog.y >= -1 && frame.dialog.bottom <= spec.height + 2
          && frame.scrollport.y >= frame.dialog.y - 1 && frame.scrollport.bottom <= frame.dialog.bottom + 1
          && frame.scrollportClientHeight >= Math.min(200, spec.height * .24), frame);
        const close = page.getByRole('dialog').getByRole('button', { name: spec.flow === 'label' ? 'Cerrar' : 'Cerrar detalle', exact: true });
        await close.scrollIntoViewIfNeeded(); const box = await close.boundingBox();
        check('Actual result close remains reachable inside viewport, >=44px', box && box.height >= 43.5 && box.width >= 43.5
          && box.y >= -1 && box.y + box.height <= spec.height + 1, box);
        await captureScreen('result-close-reachable'); await close.click(); await expect(page.getByRole('dialog')).toHaveCount(0);
        check('Actual close click dismisses confirmed detail', true);
      }
    } catch (e) { error = String(e); await captureScreen('failure').catch(() => {}); }
    finally {
      await releaseHeld();
      const result = { ...spec, passed: !error && checks.every(c => c.passed), error, checks, calls, unexpected, errors,
        screenshots, geometry, beforeState, afterState, score, fetchAudit };
      results.push(result); fs.writeFileSync(path.join(folder, 'result.json'), JSON.stringify(result, null, 2) + '\n');
      await context.close(); persist();
      console.log(JSON.stringify({ case: spec.id, passed: result.passed, error, failedChecks: checks.filter(c => !c.passed).map(c => c.name) }));
    }
  }
} finally { await browser.close(); }
const changed = cfg.files.filter(f => sha(fs.readFileSync(path.join(cfg.build, f.file))) !== f.sha256
  || sha(fs.readFileSync(path.join(cfg.snapshot, f.file))) !== f.sha256);
const final = JSON.parse(fs.readFileSync(path.join(cfg.output, 'report.json'))); final.changedBuildFiles = changed;
fs.writeFileSync(path.join(cfg.output, 'report.json'), JSON.stringify(final, null, 2) + '\n');
console.log(JSON.stringify({ passed: final.passed, total: final.total, changedBuildFiles: changed.length, output: cfg.output }));
if (final.passed !== final.total || changed.length) process.exitCode = 1;
'''


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build', type=Path, required=True)
    parser.add_argument('--catalog', type=Path, required=True)
    parser.add_argument('--label-image', type=Path, required=True)
    parser.add_argument('--menu-image', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--cases', nargs='+')
    parser.add_argument('--playwright-module', type=Path, default=Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')
    parser.add_argument('--chrome', default='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    args = parser.parse_args()
    assert not args.output.exists(), 'Keep earlier PASS/FAIL evidence immutable'
    assert (args.build / 'index.html').is_file() and args.playwright_module.is_file()
    assert '/catalog-picker95/' in str(args.output.resolve()), 'Use the private catalogue picker evidence area'
    args.output.mkdir(parents=True)
    shutil.copyfile(Path(__file__), args.output / 'harness.py')
    snapshot = args.output / 'frozen-build'
    files = []
    for file in sorted(args.build.rglob('*')):
        assert not file.is_symlink(), 'No symlinks in frozen build'
        if file.is_file():
            relative = file.relative_to(args.build)
            target = snapshot / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(file, target)
            assert digest(file) == digest(target)
            files.append({'file': str(relative), 'bytes': file.stat().st_size, 'sha256': digest(file)})
    manifest = args.output / 'build-manifest.json'
    manifest.write_text(json.dumps({'parentConfirmedBuild': str(args.build.resolve()), 'snapshot': str(snapshot.resolve()),
                                    'files': files, 'provenance': 'Parent explicitly confirmed proper build20 ready. No rebuild, bundle edits or app source changes.'}, indent=2) + '\n')
    config = {'build': str(args.build.resolve()), 'snapshot': str(snapshot.resolve()), 'files': files,
              'catalog': str(args.catalog.resolve()), 'catalogSha256': digest(args.catalog),
              'labelImage': str(args.label_image.resolve()), 'labelImageSha256': digest(args.label_image),
              'menuImage': str(args.menu_image.resolve()), 'menuImageSha256': digest(args.menu_image),
              'output': str(args.output.resolve()), 'cases': args.cases, 'chrome': args.chrome,
              'playwright': str(args.playwright_module.resolve()), 'manifestSha256': digest(manifest),
              'scriptSha256': digest(Path(__file__))}
    (args.output / 'config.json').write_text(json.dumps(config, indent=2) + '\n')
    runner = args.output / 'runner.mjs'
    runner.write_text(NODE_RUNNER)
    return subprocess.run([shutil.which('node'), str(runner.resolve()), str((args.output / 'config.json').resolve())], check=False).returncode


if __name__ == '__main__':
    raise SystemExit(main())
