import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = process.argv[2];
if (!output) throw Error('Pass a completed cloud memory evidence directory');
const data = JSON.parse(readFileSync(resolve(output, 'results.json'), 'utf8'));
assert.equal(data.failure, null, 'The entire diagnostic session must complete');
assert.equal(data.boundedWaits, true, 'Discarded Python Locator.wait_for handles invalidate this gate');
assert.equal(data.allExternalRequestsIntercepted, true);
assert.equal(data.runtimeErrors.length, 0);
for (const key of ['realRemoteAppCalls', 'realWrites', 'realAccounts', 'paidCalls']) assert.equal(data[key], 0);
if (data.requestedCycles) assert.equal(data.cycles.length, data.requestedCycles, 'Requested deterministic cycles must all complete');
assert.ok(data.cycles.length >= 30, 'At least 30 completed varied scanner cycles');
assert.ok(new Set(data.cycles.map(row => row.kind)).size >= 3);
assert.ok(new Set(data.cycles.map(row => row.orientation)).size >= 2);
const gc = data.cycles.flatMap(row => row.metricsAfterExplicitGc ? [row.metricsAfterExplicitGc] : []);
assert.ok(gc.length >= 3, 'At least three explicit-GC samples');
const range = field => Math.max(...gc.map(row => row[field])) - Math.min(...gc.map(row => row[field]));
assert.ok(range('Nodes') <= 50, `CDP post-GC node range ${range('Nodes')} exceeds diagnostic tolerance`);
assert.ok(range('JSEventListeners') <= 12, `CDP post-GC listener range ${range('JSEventListeners')} exceeds diagnostic tolerance`);
for (const row of data.cycles) {
  assert.equal(row.passed, true);
  for (const field of ['images', 'canvases', 'dialogs', 'toasts']) assert.equal(row.liveDomAfterReset[field], 0);
}
const listeners = JSON.parse(readFileSync(resolve(output, 'document-listeners.json'), 'utf8'));
assert.equal(listeners.finalAfterIdle?.visibilitychange ?? 0, 0);
console.log(JSON.stringify({ scope: 'Client/CDP retention regression, not all-browser or native memory certification', cycles: data.cycles.length, nodesRange: range('Nodes'), listenersRange: range('JSEventListeners'), browserVersion: data.browserVersion }));
