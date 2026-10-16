import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMenuScanRun93, MenuScanLimitError93, needsNativeMenuRefinement93 } from '../src/utils/wineMenuExecution93';
import type { MenuScanMetrics93 } from '../src/utils/wineMenuExecution93';
import type { MenuScanResponse } from '../src/utils/wineMenuScan';

let checks = 0;
const check = (value: unknown) => { assert.ok(value); checks++; };
const page = (count: number, status: 'reported_complete' | 'partial' | 'unknown', estimate = count): MenuScanResponse => ({
  vinos: Array.from({ length: count }, (_, index) => ({ nombre: `Fixture ${index}`, productor: null,
    anada: null, region: null, pais: null, precio: null, tipo: 'Tinto', descripcion: null,
    confidence: 0.4, dudas: ['Nombre por confirmar'] })),
  layout: 'columns', coverage: { status, estimated_visible_wines: estimate },
});
for (const count of [0, 1, 8, 30, 60]) check(!needsNativeMenuRefinement93(page(count, 'reported_complete')));
for (const status of ['partial', 'unknown'] as const) check(needsNativeMenuRefinement93(page(8, status)));
check(needsNativeMenuRefinement93(page(8, 'reported_complete', 12)));
check(needsNativeMenuRefinement93({ vinos: [] }));

let clock = 100;
const traces: MenuScanMetrics93[] = [];
const run = createMenuScanRun93({ signal: new AbortController().signal, now: () => clock,
  onChange: metrics => traces.push(metrics) });
clock += 10; run.phase('profile'); clock += 20; run.phase('ocr');
let calls = 0;
assert.equal(await run.request(async signal => { check(!signal.aborted); calls++; clock += 30; return 'read'; }), 'read'); checks++;
clock += 40; run.phase('ranking'); clock += 50;
const done = run.finish('completed');
assert.deepEqual(done.phasesMs, { quality: 10, profile: 20, ocr: 70, ranking: 50 }); checks++;
assert.equal(done.elapsedMs, 150); checks++;
clock += 500;
assert.equal(run.snapshot().elapsedMs, 150); checks++;
assert.equal(run.snapshot().requests, 1); checks++;
assert.equal(run.snapshot().completed, 1); checks++;
check(traces.every(trace => trace.requests <= 1));
await assert.rejects(run.request(async () => { calls++; }), MenuScanLimitError93); checks++;
assert.equal(calls, 1); checks++;

const cap = createMenuScanRun93({ signal: new AbortController().signal });
await cap.request(async () => 1);
await Promise.all([cap.request(async () => 2), cap.request(async () => 3)]);
await assert.rejects(cap.request(async () => 4), error => error instanceof MenuScanLimitError93 && error.reason === 'request_limit'); checks++;
assert.equal(cap.snapshot().requests, 3); checks++;
cap.finish('completed');

let budgetClock = 0;
const budget = createMenuScanRun93({ signal: new AbortController().signal, now: () => budgetClock, totalMs: 100 });
await budget.request(async () => { budgetClock = 101; });
await assert.rejects(budget.request(async () => { throw new Error('must not run'); }), error => error instanceof MenuScanLimitError93 && error.reason === 'deadline'); checks++;
assert.equal(budget.snapshot().requests, 1); checks++;
budget.finish('failed');

for (const status of [401, 402, 403, 429, 500, 502]) {
  const operation = createMenuScanRun93({ signal: new AbortController().signal });
  let attempted = 0;
  const failure = new Error(`fixture HTTP ${status}`);
  await assert.rejects(operation.request(async () => { attempted++; throw failure; }), error => error === failure); checks++;
  assert.equal(attempted, 1); checks++;
  assert.equal(operation.snapshot().failed, 1); checks++;
  operation.finish('failed');
}

for (let index = 0; index < 20; index++) {
  const controller = new AbortController();
  const operation = createMenuScanRun93({ signal: controller.signal });
  let requestSignal: AbortSignal | undefined;
  const promise = operation.request(async signal => { requestSignal = signal; return new Promise<never>(() => {}); });
  await Promise.resolve();
  controller.abort();
  await assert.rejects(promise, error => error instanceof DOMException && error.name === 'AbortError'); checks++;
  check(requestSignal?.aborted);
  operation.finish('cancelled');
}
const preCancelled = new AbortController(); preCancelled.abort();
let forbidden = 0;
await assert.rejects(createMenuScanRun93({ signal: preCancelled.signal }).request(async () => { forbidden++; })); checks++;
assert.equal(forbidden, 0); checks++;

let finishIgnoredTransport: ((value: string) => void) | undefined;
let timedOutSignal: AbortSignal | undefined;
const timeout = createMenuScanRun93({ signal: new AbortController().signal, requestMs: 10 });
await assert.rejects(timeout.request(signal => { timedOutSignal = signal;
  return new Promise<string>(resolve => { finishIgnoredTransport = resolve; });
}), error => error instanceof MenuScanLimitError93 && error.reason === 'deadline'); checks++;
check(timedOutSignal?.aborted);
const timeoutDone = timeout.finish('failed');
finishIgnoredTransport?.('late result'); await Promise.resolve();
assert.equal(timeoutDone.completed, 0); checks++;
assert.equal(timeoutDone.failed, 1); checks++;
check(!/image|filename|authorization|token|user_id|wine_name/.test(JSON.stringify(timeoutDone)));

const component = readFileSync('src/components/wine-import/WineMenuScanner.tsx', 'utf8');
check(component.includes('if (nativeRun) return nativeRun.request('));
check(component.includes('if (!nativeRun && !isMatchrimFixtureQaEnabled && mayHaveUnreadMenuColumn'));
check(component.includes('needsNativeMenuRefinement93(fullResponse) : needsMenuRefinement(fullResponse)'));
check(component.includes("nativeRun.phase('profile')") && component.includes("nativeRun.phase('refinement')"));
check(component.includes('data-testid="menu-scan-metrics"'));
const catalog = readFileSync('src/services/winerimApi.ts', 'utf8');
check(catalog.includes('options.catalogOnly ?? Capacitor.isNativePlatform()'));
check(catalog.includes('catalogOnly ? setTimeout(abort, 5000)'));
console.log(JSON.stringify({ checks, passed: true, remoteCalls: 0,
  scope: 'Native coverage-vs-identity policy, bounded actual async execution, cancellation/late result/call caps and metrics; synthetic timing, not live latency' }));
