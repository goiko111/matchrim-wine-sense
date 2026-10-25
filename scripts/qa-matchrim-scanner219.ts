import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { lookupWinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import { confirmedLabelCatalogIdentity95 } from '../src/utils/confirmedCatalogIdentity95';
import type { WineCandidate } from '../src/utils/multiWineScan';

const repo = process.cwd(), inspectOnly = process.argv[2] === '--check-instrumentation', out = path.resolve(process.argv[2] ?? '');
if (!inspectOnly) assert(path.dirname(out) === path.join(repo, 'qa-artifacts/native218-20261025') && /^scanner219-r\d+$/.test(path.basename(out)) && !fs.existsSync(out));
const guard = () => {
  const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases['heavy-local'];
  assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && lease.leaseId === process.env.MATCHRIM102_HEAVY_LEASE_ID && lease.reviewAfter * 1000 > Date.now());
  const disk = fs.statfsSync(repo); assert(Number(disk.bavail) * Number(disk.bsize) >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const scannerPath = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const source = fs.readFileSync(scannerPath, 'utf8');
const cached = JSON.parse(fs.readFileSync('qa-fixtures/consumer95/public-nv-catalogue.projected.json', 'utf8'));
const sheet = await lookupWinerimOriginalSheet({ name: 'Manzanilla La Gitana', producer: 'Bodegas Hidalgo La Gitana' }, undefined, async url => {
  const row = cached.reads.find((value: { url: string }) => value.url === String(url)); assert(row, 'NO_LIVE_FALLBACK');
  return Response.json(row.body, { status: row.status });
}); assert(sheet.status === 'verified');
const profile = { potente: 2, acidez: 4, dulce: 1, tanico: 0, afrutado: 1 };
const seed: WineCandidate = { id: 'fixture219', name: 'Control', producer: null, vintage: null, region: null, country: null,
  grapes: [], alcohol: null, source: 'manual', confidence: 1, evidence: [], uncertaintyReasons: [], inferredFields: [] };
const known = confirmedLabelCatalogIdentity95(seed, sheet.sheet, profile)!;
const region = (id: string, index: number, candidate: WineCandidate) => ({ id, index, objectType: 'label', box: { x: 10, y: 10, width: 60, height: 60 },
  detectionConfidence: 1, quality: { glare: 'low', occlusion: 'low', legibility: 'good' }, status: 'recognized', candidates: [candidate],
  selectedCandidateId: candidate.id, duplicateCount: 1, cropDataUrl: null, error: null, fallback: null });
const fixture = { regions: [region('r219a', 1, known), region('r219b', 2, { ...known, id: 'second219', name: 'Referencia independiente controlada',
  producer: 'Otra bodega de prueba', vintage: 2023, canonicalId: null, originalSheet: null, sensoryAttributes: null, affinity: null, source: 'manual' })],
  snapshot: { profile, source: 'quiz', samples: 0, status: 'ready', note: 'Perfil controlado sin cuenta real' },
  preview: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' };
const tree = ts.createSourceFile(scannerPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const expression = (code: string) => {
  const value = (ts.createSourceFile('expression.ts', `const v=${code};`, ts.ScriptTarget.Latest, true).statements[0] as ts.VariableStatement).declarationList.declarations[0].initializer!;
  // Foreign source ranges would make the printer read literal text from the
  // scanner rather than this fixture expression.
  const synthesize = (node: ts.Node) => { ts.forEachChild(node, synthesize); ts.setTextRange(node, { pos: -1, end: -1 }); node.flags |= ts.NodeFlags.Synthesized; };
  synthesize(value); return value;
};
let nativeReplacements = 0, resetReplacements = 0;
const transformed = ts.transform(tree, [ctx => {
  const visit: ts.Visitor = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'isNative') {
      nativeReplacements++; return ctx.factory.updateVariableDeclaration(node, node.name, node.exclamationToken, node.type, ctx.factory.createTrue());
    }
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect' && node.arguments[0]
      && node.arguments[0].getText(tree).includes('setRegions([])') && node.arguments[0].getText(tree).includes('lastFileRef.current = null')) {
      resetReplacements++;
      return ctx.factory.updateCallExpression(node, node.expression, node.typeArguments, [expression(`()=>{
        const fixture=globalThis.__matchrim219;setRegions(fixture.regions);setPreview(fixture.preview);setSelectedRegionId(null);
        setScanProfile(fixture.snapshot);scanProfileRef.current=fixture.snapshot;setNativeVerdicts(null);setLocalReading(null);
        setLocalBatch(false);setPhase('ready');setNativeResultView('wines');return()=>abortRef.current?.abort();
      }`), ...node.arguments.slice(1)]);
    }
    return ts.visitEachChild(node, visit, ctx);
  }; return root => ts.visitNode(root, visit) as ts.SourceFile;
}]);
const instrumented = ts.createPrinter().printFile(transformed.transformed[0] as ts.SourceFile); transformed.dispose();
assert.equal(nativeReplacements, 1); assert.equal(resetReplacements, 1);
if (inspectOnly) {
  const parsed = ts.createSourceFile('instrumented.tsx', instrumented, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const diagnostics = (parsed as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics;
  assert.equal(diagnostics.length, 0, diagnostics.map(d => `${ts.flattenDiagnosticMessageText(d.messageText, ' ')}: ${instrumented.slice((d.start ?? 0) - 40, (d.start ?? 0) + 80)}`).join('\n'));
  assert(instrumented.includes("setPhase('ready')") && instrumented.includes('setRegions(fixture.regions)'));
  console.log(JSON.stringify({ passed: true, nativeReplacements, resetReplacements, sourceSHA256: hash(source),
    scope: 'Lightweight instrumentation syntax/seed checks only, no browser/network/recognition.' })); process.exit(0);
}
const entry = `import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
import{MultiWineLabelScanner}from'/src/components/wine-import/MultiWineLabelScanner.tsx';import'/src/index.css';
globalThis.__matchrim219=${JSON.stringify(fixture)};globalThis.__writes219=[];
createRoot(document.getElementById('root')).render(<MemoryRouter><main style={{padding:16,maxWidth:440,margin:'auto'}}><MultiWineLabelScanner onExtractComplete={async(wine)=>{globalThis.__writes219.push(wine);return{status:'saved',rowId:'local219',ownerId:'synthetic219'}}}/></main></MemoryRouter>);`;
let server: Awaited<ReturnType<typeof createServer>> | undefined, browser: { close(): Promise<void> } | undefined;
const checks: string[] = [], screenshots: string[] = [], errors: string[] = [];
const receipt: Record<string, unknown> = { startedUTC: new Date().toISOString(), passed: false, sourceSHA256: hash(source),
  instrumentedSHA256: hash(instrumented), replacedOnly: ['native platform branch', 'initial account-reset fixture seeding', 'AuthContext synthetic hook', 'fail-closed database client module'],
  scope: 'Actual scanner/Drawer/effects/handlers with retained/synthetic regions/profile and local save callback. Network blocked. Not full app, UIKit keyboard/VoiceOver, recognition, hosted persistence or TestFlight QA.', liveCalls: 0 };
guard(); fs.mkdirSync(out, { mode: 0o700 });
try {
  server = await createServer({ root: repo, configFile: false, envDir: false, plugins: [{ name: 'scanner219-instrumentation', enforce: 'pre',
    resolveId(id) { if (id === '/scanner219.jsx') return '\0scanner219.jsx'; },
    load(id) { if (id === '\0scanner219.jsx') return entry;
      if (id === path.join(repo, scannerPath)) return instrumented;
      if (id === path.join(repo, 'src/contexts/AuthContext.tsx')) return `export const useAuth=()=>({user:{id:'synthetic219'}});`;
      if (id === path.join(repo, 'src/integrations/supabase/client.ts')) return `export const supabase=new Proxy({},{get(){throw Error('REMOTE_CLIENT_DISABLED_219')}});`; },
    configureServer(s) { s.middlewares.use(async (req, res, next) => {
      if (req.url === '/scanner219') { res.setHeader('Content-Type', 'text/html'); res.end(await s.transformIndexHtml('/scanner219', '<!doctype html><html lang="es" class="matchrim-native-platform"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/scanner219.jsx"></script></html>')); return; } next();
    }); },
  }, react()], resolve: { alias: { '@': path.join(repo, 'src') } }, server: { host: '127.0.0.1', port: 0 } });
  await server.listen(); const address = server.httpServer!.address(); assert(address && typeof address === 'object'); const origin = 'http://127.0.0.1:' + address.port;
  const require = createRequire(import.meta.url), { chromium } = require('/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  const actual = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--disable-background-networking'] }); browser = actual;
  const context = await actual.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  await context.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin === origin) return route.continue(); errors.push('OUTBOUND_BLOCKED:' + url.origin); return route.abort(); });
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const shot = async (name: string) => { await page.screenshot({ path: path.join(out, name + '.png') }); screenshots.push(name + '.png'); };
  for (const [width, large] of [[320, false], [393, true]] as const) {
    guard(); await page.setViewportSize({ width, height: 852 }); await page.goto(origin + '/scanner219');
    if (large) await page.addStyleTag({ content: 'html{font-size:32px!important}' });
    await page.evaluate(large => document.documentElement.classList.toggle('matchrim-accessibility-text', large), large);
    await page.getByRole('button', { name: 'Revisar vinos', exact: true }).click(); const dialog = page.getByRole('dialog'); await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Corregir identificación' }).click(); const input = page.getByLabel('Vino', { exact: true });
    await page.waitForFunction(() => document.activeElement?.id === 'region-wine-name');
    assert(await page.getByTestId('native-reference-details').evaluate(el => (el as HTMLDetailsElement).open)); await shot('correct-focus-' + width);
    const year = page.getByLabel('Añada (opcional)'); await year.fill('2023');
    const before = await page.getByTestId('native-wine-primary').innerText(); assert(before.includes('Añada no indicada'));
    assert.equal(await page.evaluate(() => globalThis.__writes219.length), 0);
    await page.setViewportSize({ width, height: 450 }); await year.focus(); await page.waitForTimeout(100);
    const box = await year.boundingBox(); assert(box && box.y >= 0 && box.y + box.height <= 451, 'FOCUSED_YEAR_HIDDEN_BY_SHORT_VIEWPORT'); await shot('keyboard-proxy-' + width);
    await page.setViewportSize({ width, height: 852 }); await dialog.getByRole('button', { name: 'Aplicar corrección' }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="native-wine-primary"]')?.textContent?.includes('2023'));
    assert.equal(await dialog.getByTestId('native-affinity-summary').count(), 0); await shot('applied-' + width);
    await dialog.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="native-wine-primary"]')?.textContent?.includes('Referencia independiente controlada'));
    const top = await page.getByTestId('native-wine-primary').boundingBox(); assert(top && top.y >= 0 && top.y < 450, 'NEXT_INHERITED_SCROLL'); await shot('next-reset-' + width);
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => globalThis.__writes219.length), 0); checks.push('actual-drawer/focus/year/short-viewport/next/close-no-autosave-' + width);
  }
  assert.deepEqual(errors, []); assert.equal(hash(fs.readFileSync(scannerPath)), hash(source)); receipt.passed = true;
} catch (error) { receipt.error = String(error); }
finally { await browser?.close(); await server?.close(); Object.assign(receipt, { checks, screenshots, errors, finishedUTC: new Date().toISOString() });
  fs.writeFileSync(out + '/RESULT.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
console.log(JSON.stringify(receipt, null, 2)); process.exitCode = receipt.passed ? 0 : 1;
