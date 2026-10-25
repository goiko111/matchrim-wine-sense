import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const transports = [], storage = new Map(), events = new Map();
class XHR { open(...args) { transports.push(['xhr', ...args]); } }
const context = { URL, location: new URL('capacitor://localhost/index.html'), XMLHttpRequest: XHR,
  navigator: {}, localStorage: { setItem: (key, value) => storage.set(key, value) },
  addEventListener: (name, handler) => events.set(name, handler), fetch: async (...args) => { transports.push(['fetch', ...args]); return { ok: true }; } };
context.window = context;
vm.runInNewContext(fs.readFileSync('scripts/matchrim-offline220.js', 'utf8'), context, { timeout: 1000 });
for (const input of ['https://example.invalid/wine', 'http://127.0.0.1:1234/', 'capacitor://other/data', { url: 'https://example.invalid/request' }]) {
  await assert.rejects(context.fetch(input), /QA220_EXTERNAL_NETWORK_DISABLED/);
}
assert.throws(() => new context.XMLHttpRequest().open('GET', 'https://example.invalid/xhr'), /QA220_EXTERNAL_NETWORK_DISABLED/);
assert.throws(() => new context.WebSocket('wss://example.invalid/socket'), /QA220_EXTERNAL_NETWORK_DISABLED/);
assert.throws(() => new context.EventSource('https://example.invalid/events'), /QA220_EXTERNAL_NETWORK_DISABLED/);
assert.equal(context.navigator.sendBeacon('https://example.invalid/beacon'), false);
assert.equal(transports.length, 0, 'No external attempt may reach a transport');
assert((await context.fetch('/qa220-label.jpg')).ok);
assert.equal(transports.length, 1); assert.equal(transports[0][1], '/qa220-label.jpg');
const blocked = JSON.parse(storage.get('matchrim.qa220.blocked'));
assert.equal(blocked.length, 8);
assert(events.has('securitypolicyviolation')); assert(events.has('DOMContentLoaded'));
console.log(JSON.stringify({ passed: true, deniedTransports: blocked.length, localTransport: 1, liveCalls: 0,
  scope: 'VM replay of actual QA guard; not a packet capture or a native app-flow result.' }));
