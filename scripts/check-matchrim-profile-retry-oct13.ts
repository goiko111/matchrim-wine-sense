import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { resolveScanProfile, ScanProfileReadFailure, canRetryScanProfile, type ScanProfileSnapshot } from '../src/utils/scanProfile';
import { refreshMenuProfileAffinity } from '../src/utils/menuProfileRecovery';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import type { MenuScanWine } from '../src/utils/wineMenuScan';

const output = process.argv[2];
if (!output) throw new Error('Pass a contract JSON path');
const base = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
const signal = new AbortController().signal;
const fail = async () => { throw new Error('SYN_PRIVATE_ERROR_DO_NOT_DISPLAY'); };
const empty = async () => [];
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = async (name: string, run: () => void | Promise<void>) => { try { await run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
await check('Base failure is not absence; private details do not surface', async () => {
  const result = await resolveScanProfile('SYN-contract', null, { base: fail, training: empty }, signal);
  assert.equal(result.status, 'base-error'); assert.equal(result.profile, null); assert.equal(canRetryScanProfile(result), true);
  assert.ok(!result.note.includes('SYN_PRIVATE_ERROR'));
});
await check('Known timer timeout differs from unspecified failure', async () => {
  const result = await resolveScanProfile('SYN-contract', null, { base: async () => { throw new ScanProfileReadFailure('timeout'); }, training: empty }, signal);
  assert.equal(result.status, 'base-timeout'); assert.equal(canRetryScanProfile(result), true);
});
await check('Successful no-row response is missing, not transient failure', async () => {
  let reads = 0;
  const result = await resolveScanProfile('SYN-contract', null, { base: async () => null, training: async () => { reads++; return []; } }, signal);
  assert.equal(result.status, 'missing'); assert.equal(canRetryScanProfile(result), false); assert.equal(reads, 0);
});
for (const [name, values] of [['incomplete', { potente: 3 }], ['zero', { ...base, dulce: 0 }], ['nonfinite', { ...base, acidez: Infinity }], ['string', { ...base, afrutado: '3' }]] as Array<[string, unknown]>) {
  await check('Invalid ' + name + ' profile is neither ready nor retryable error', async () => {
    const result = await resolveScanProfile('SYN-contract', null, { base: async () => values as typeof base, training: empty }, signal);
    assert.equal(result.status, 'invalid'); assert.equal(result.profile, null); assert.equal(canRetryScanProfile(result), false);
  });
}
await check('Valid mathematical payload stays ready/unchanged, not human persona', async () => {
  const result = await resolveScanProfile('SYN-contract', null, { base: async () => base, training: empty }, signal);
  assert.equal(result.status, 'ready'); assert.deepEqual(result.profile, base); assert.equal(result.samples, 0);
  assert.deepEqual(base, { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 });
});
for (const kind of ['failed', 'timeout'] as const) {
  await check('Training ' + kind + ' preserves quiz, not learned samples', async () => {
    const result = await resolveScanProfile('SYN-contract', null, { base: async () => base, training: async () => { throw new ScanProfileReadFailure(kind); } }, signal);
    assert.equal(result.status, kind === 'timeout' ? 'training-timeout' : 'training-error');
    assert.equal(result.source, 'quiz'); assert.equal(result.samples, null); assert.deepEqual(result.profile, base); assert.equal(canRetryScanProfile(result), true);
  });
}
await check('Anonymous missing data never reads/claims an account', async () => {
  const result = await resolveScanProfile(null, null, { base: fail, training: fail }, signal);
  assert.equal(result.status, 'missing'); assert.ok(result.note.includes('local')); assert.equal(canRetryScanProfile(result), false);
});
await check('Outer cancellation propagates abort, not retryable error', async () => {
  const abort = new AbortController();
  await assert.rejects(resolveScanProfile('SYN-contract', null, { base: async () => { abort.abort(); return base; }, training: empty }, abort.signal), { name: 'AbortError' });
});
const wine: MenuScanWine = JSON.parse(readFileSync('docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json', 'utf8')).bothContract.vinos[1];
await check('Recovered mathematical profile cannot promote model attributes/raw score', () => {
  const next = refreshMenuProfileAffinity({ ...wine, sensorySource: 'inference', canonicalId: null }, base);
  assert.equal(next.compatibilidad, null); assert.equal(next.affinity_calibrated, false); assert.ok(next.razon?.includes('ficha sensorial verificada'));
});
const mathSheet: MenuScanWine = { ...wine, nombre: 'CONTRACT_NOT_A_REAL_WINE', productor: null, canonicalId: 'SYN-CONTRACT-SHEET', sensorySource: 'catalog', confidence: 1, dudas: [], campos_inferidos: [] };
await check('Already-grounded mathematical sheet uses only existing local calculation', () => {
  const next = refreshMenuProfileAffinity(mathSheet, base);
  assert.equal(next.compatibilidad, calculateLocalMatchrimAffinity(base, mathSheet.atributos)); assert.equal(next.affinity_calibrated, true);
});
for (const changes of [{ canonicalId: null }, { sensorySource: 'inference' as const }, { atributos: null }, { confidence: 0.2 }]) {
  await check('Missing retained-sheet evidence stays pending: ' + Object.keys(changes)[0], () => assert.equal(refreshMenuProfileAffinity({ ...mathSheet, ...changes }, base).compatibilidad, null));
}
await check('Refresh changes only three affinity fields, not image boxes/prices/identity', () => {
  const next = refreshMenuProfileAffinity(wine, base);
  for (const key of Object.keys(wine).filter((key) => !['compatibilidad','affinity_calibrated','razon'].includes(key))) assert.deepEqual(next[key as keyof MenuScanWine], wine[key as keyof MenuScanWine]);
  assert.equal(next.posicion, wine.posicion); assert.equal(next.precios, wine.precios);
});
const path = 'src/components/wine-import/WineMenuScanner.tsx'; const source = readFileSync(path, 'utf8');
const collect = (text: string) => {
  const tree = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); const map = new Map<string,string>();
  const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) map.set(node.name.text,node.initializer.getText(tree)); ts.forEachChild(node,visit); };
  visit(tree); return map;
};
const current = collect(source), baseline = collect(execFileSync('git', ['show', '301d078854d3e1594645d76f1fb24dea61eb0be7:' + path], { encoding: 'utf8' }));
for (const name of ['saveScannedWine','updateScannedWine','resetSaveBatch','normalizeScannedWine','getWineDecision']) await check('Protected initializer unchanged: ' + name, () => assert.equal(current.get(name),baseline.get(name)));
const controller = { current: null as AbortController | null };
const lifetime = { current: { active: true, generation: 4, ownerId: '00000000-0000-4000-8000-000000000080' } };
const savedRow = JSON.parse(readFileSync('docs/qa-evidence/matchrim-menu-actions-2026-10-12/after/results.json','utf8')).results[0].rows[0];
const ledger = new Map([[0, savedRow.id]]);
let loads = 0, committed: ScanProfileSnapshot | null = null, rows: MenuScanWine[] = [{ ...wine, precio: 35, precio_origen: 'manual', precio_manual_pendiente: true }];
let resolveRead: (value: ScanProfileSnapshot) => void = () => {};
const read = new Promise<ScanProfileSnapshot>((resolve) => { resolveRead = resolve; });
const context = vm.createContext({ AbortController, canRetryScanProfile, refreshMenuProfileAffinity,
  user: { id: lifetime.current.ownerId }, loading: false, scannedWines: rows,
  scanProfile: { profile: null, source: 'unavailable', status: 'base-error', samples: null, note: 'SYN-safe' },
  profileRetryRef: controller, profileRetryLifetime: lifetime, savedCardsRef: { current: ledger },
  loadMatchrimScanProfile: () => { loads++; return read; }, setRetryingProfile: () => {},
  setScanProfile: (value: ScanProfileSnapshot) => { committed = value; }, setHasProfile: () => {},
  setScannedWines: (update: (current: MenuScanWine[]) => MenuScanWine[]) => { rows = update(rows); },
});
vm.runInContext(ts.transpileModule('globalThis.subject=' + current.get('retryScanProfile') + ';', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText,context);
await check('Active callback doubleclick makes one read, retains actual06 ID in simulated ref', async () => {
  const first = context.subject(); await context.subject(); assert.equal(loads,1); assert.equal(controller.current?.signal.aborted,false);
  resolveRead({ profile:null,source:'unavailable',status:'missing',samples:null,note:'SYN-valid-absence' }); await first;
  assert.equal(committed?.status,'missing'); assert.equal(ledger.get(0),savedRow.id); assert.equal(ledger.size,1);
  assert.equal(rows[0].precio,35); assert.equal(rows[0].precio_manual_pendiente,true); assert.equal(controller.current,null);
});
await check('Retry never resets ledger/scans/refetches canonical/writes SDK', () => {
  const body = current.get('retryScanProfile')!;
  for (const forbidden of ['resetSaveBatch','analyzeFile','invokeScan','invokeEdgeFunction','findWinerimWineForLabel','prepareImage','supabase','savedCardsRef','setPreview','setSelectedPinIndex']) assert.ok(!body.includes(forbidden),forbidden);
});
await check('New valid selection invalidates retry before batch reset', () => {
  const body=current.get('handleFileSelect')!; assert.ok(body.indexOf('invalidateProfileRetry()')<body.indexOf('resetSaveBatch()'));
});
writeFileSync(output, JSON.stringify({ scope: 'Only08 pure profile payload/math-sheet controls and active callback ref contract. No real human profile/catalog approval. Actual06 returned ID is replayed only in a simulated ref ledger; UI never inserts to prove it.', checks,
  sourceHashes: Object.fromEntries([path,'src/utils/scanProfile.ts','src/services/matchrimScanProfile.ts','src/utils/menuProfileRecovery.ts','scripts/check-matchrim-profile-retry-oct13.ts'].map((file)=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')])) },null,2)+String.fromCharCode(10));
console.log(JSON.stringify({ passed:checks.filter((c)=>c.passed).length,total:checks.length,failures:checks.filter((c)=>!c.passed) }));
if(checks.some((c)=>!c.passed))process.exitCode=1;
