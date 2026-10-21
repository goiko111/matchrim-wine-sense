import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLocalOCR106 } from '../src/utils/nativeOCR106';
const id = '00000000-0000-4000-8000-000000010601', image = 'data:image/jpeg;base64,/9j/AA==';
const good = { requestId: id, source: 'apple-vision-device', width: 1000, height: 2000, totalMs: 100, revision: 3,
  customWords: [], lines: [{ text: 'VIDURE', confidence: .95, box: { x: .2, y: .2, width: .5, height: .1 } }] };
let groups = 0;
const test = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); groups++; console.log('PASS', name); };
await test('Bridge response preserves raw OCR and bounded top-left geometry, never identity or affinity', async () => {
  let calls = 0;
  const result = await createLocalOCR106({ recognize: async input => { calls++; assert.equal(input.image, image); return good; }, cancel: async () => ({}) }, () => id)(image);
  assert.equal(calls, 1); assert.equal(result.lines[0].text, 'VIDURE'); assert(Object.isFrozen(result.lines[0].box));
  assert.equal(Object.hasOwn(result, 'canonicalId'), false); assert.equal(Object.hasOwn(result, 'affinity'), false);
});
await test('Wrong request, source, geometry, line count or expected-word dictionaries fail validation', async () => {
  const cases = [{ ...good, requestId: '00000000-0000-4000-8000-000000010602' }, { ...good, source: 'model' },
    { ...good, customWords: ['Expected wine'] }, { ...good, lines: Array(101).fill(good.lines[0]) },
    { ...good, lines: [{ ...good.lines[0], box: { x: .8, y: .1, width: .8, height: .1 } }] }];
  for (const raw of cases) await assert.rejects(createLocalOCR106({ recognize: async () => raw, cancel: async () => ({}) }, () => id)(image), /OCR_INVALID_RESPONSE/);
});
await test('Abort before start performs no OCR; abort during work cancels once and ignores late success', async () => {
  let calls = 0, cancellations = 0, complete: (value: unknown) => void = () => {};
  const controller = new AbortController(); controller.abort();
  const read = createLocalOCR106({ recognize: async () => { calls++; return good; }, cancel: async () => ({}) }, () => id);
  await assert.rejects(read(image, controller.signal), { name: 'AbortError' }); assert.equal(calls, 0);
  const active = new AbortController();
  const pending = createLocalOCR106({ recognize: () => new Promise(resolve => { complete = resolve; }),
    cancel: async input => { assert.equal(input.requestId, id); cancellations++; return {}; } }, () => id)(image, active.signal);
  await Promise.resolve(); active.abort(); await assert.rejects(pending, { name: 'AbortError' }); complete(good);
  assert.equal(cancellations, 1);
});
await test('Remote URLs, invalid image types and invalid request IDs cannot reach native decoding', async () => {
  let calls = 0;
  const bridge = { recognize: async () => { calls++; return good; }, cancel: async () => ({}) };
  const read = createLocalOCR106(bridge, () => id);
  for (const input of ['https://invalid.test/wine.jpg', 'data:image/svg+xml;base64,AA==', 'data:image/jpeg;base64,%%%']) await assert.rejects(read(input), /OCR_INVALID_IMAGE/);
  await assert.rejects(createLocalOCR106(bridge, () => 'invalid')(image), /OCR_INVALID_REQUEST/); assert.equal(calls, 0);
});
await test('Immediate abort never starts decoding or cancels twice, even if native cancellation throws', async () => {
  let calls = 0, cancellations = 0;
  const controller = new AbortController();
  const pending = createLocalOCR106({ recognize: async () => { calls++; return good; }, cancel: () => { cancellations++; throw Error('Unavailable'); } }, () => id)(image, controller.signal);
  controller.abort(); await assert.rejects(pending, { name: 'AbortError' }); await Promise.resolve();
  assert.equal(calls, 0); assert.equal(cancellations, 1);
});
await test('Capacitor debug bridge logging is disabled before image payloads cross the bridge', () => {
  assert.equal(JSON.parse(readFileSync('ios/App/App/capacitor.config.json', 'utf8')).loggingBehavior, 'none');
  assert.match(readFileSync('capacitor.config.ts', 'utf8'), /loggingBehavior:\s*'none'/);
});
console.log(JSON.stringify({ groups, realVisionCalls: 0, networkCalls: 0, modelStarts: 0, scope: 'TypeScript bridge contract only; native plugin not certified by these mocks' }));
