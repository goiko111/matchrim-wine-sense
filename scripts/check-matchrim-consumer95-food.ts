import assert from 'node:assert/strict';
import { confirmsNativeFoodSave95, nativeFoodScanFailure, runNativeFoodRead95 } from '../src/utils/foodScanRecovery95';
import { ImagePreparationError } from '../src/utils/imageAnalysis';
import { RestaurantDocumentError91 } from '../src/utils/restaurantDocuments91';
import { FoodScanResponseError } from '../src/utils/foodScanResponse';
import { EdgeFunctionError } from '../src/utils/edgeFunctionResilience';

let groups = 0;
const check = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); groups++; console.log('PASS', name); };
const aborted = (failure: unknown) => failure instanceof DOMException && failure.name === 'AbortError';
await check('Actual read receives a live signal, returns once and closes its resources', async () => {
  let received: AbortSignal | undefined, count = 0;
  const value = await runNativeFoodRead95(async signal => { received = signal; count++; assert.equal(signal.aborted, false); return 42; }, new AbortController().signal);
  assert.equal(value, 42); assert.equal(count, 1); assert.equal(received?.aborted, true);
});
await check('Already-cancelled operation cannot invoke a transport', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runNativeFoodRead95(async () => assert.fail('No transport call'), controller.signal), aborted);
});
await check('Cancellation settles even when the provider ignores its signal, without late publication', async () => {
  const controller = new AbortController(); let finish!: (value: string) => void;
  let forwarded: AbortSignal | undefined;
  const pending = runNativeFoodRead95(signal => { forwarded = signal; return new Promise(resolve => { finish = resolve; }); }, controller.signal);
  await Promise.resolve(); controller.abort();
  await assert.rejects(pending, aborted); assert.equal(forwarded?.aborted, true);
  finish('late'); await Promise.resolve();
});
await check('Bounded deadline settles a hanging provider without a hidden retry', async () => {
  let calls = 0, forwarded: AbortSignal | undefined;
  await assert.rejects(runNativeFoodRead95(signal => { calls++; forwarded = signal; return new Promise(() => undefined); }, new AbortController().signal, 2), /timeout/);
  assert.equal(calls, 1); assert.equal(forwarded?.aborted, true);
});
await check('Thrown and asynchronously rejected transport errors are preserved for classification', async () => {
  const failure = new Error('opaque upstream');
  await assert.rejects(runNativeFoodRead95(() => { throw failure; }, new AbortController().signal), error => error === failure);
  await assert.rejects(runNativeFoodRead95(async () => { throw failure; }, new AbortController().signal), error => error === failure);
});
await check('Success/error/cancel/deadline remove outer abort listeners', async () => {
  for (const mode of ['success', 'error', 'cancel', 'deadline']) {
    const controller = new AbortController(), listeners = new Set<EventListenerOrEventListenerObject>();
    const add = controller.signal.addEventListener.bind(controller.signal), remove = controller.signal.removeEventListener.bind(controller.signal);
    controller.signal.addEventListener = (type, listener, options) => { if (type === 'abort') listeners.add(listener); add(type, listener, options); };
    controller.signal.removeEventListener = (type, listener, options) => { if (type === 'abort') listeners.delete(listener); remove(type, listener, options); };
    const promise = runNativeFoodRead95(async () => {
      if (mode === 'success') return 1;
      if (mode === 'error') throw new Error('failure');
      return new Promise(() => undefined);
    }, controller.signal, 2);
    if (mode === 'cancel') controller.abort();
    await promise.catch(() => undefined); assert.equal(listeners.size, 0);
  }
});
await check('Consumer errors never expose raw provider errors or parser internals', () => {
  for (const failure of [new Error('Signal timed out.'), new Error('Food read timeout')]) assert.match(nativeFoodScanFailure(failure), /tardó demasiado/);
  assert.match(nativeFoodScanFailure(new TypeError('Failed to fetch')), /conexión/);
  assert.match(nativeFoodScanFailure(new FoodScanResponseError('opaque parser reason')), /lectura fiable/);
  assert.doesNotMatch(nativeFoodScanFailure(new Error('raw debug token')), /raw|debug|token/);
});
await check('Quota and invalid-model failures have different next actions', () => {
  for (const status of [402, 429]) assert.match(nativeFoodScanFailure(new EdgeFunctionError('raw', { status, errorCode: null, retryAfterMs: null })), /más tarde/);
  assert.match(nativeFoodScanFailure(new EdgeFunctionError('raw', { status: 502, errorCode: 'invalid_model_response', retryAfterMs: null })), /lectura fiable/);
});
await check('Typed preparation and PDF limits stay useful without exposing English decoder internals', () => {
  for (const code of ['file_size_limit', 'image_pixel_limit', 'read', 'decode', 'prepare'] as const) {
    const failure = new ImagePreparationError(code); assert.equal(nativeFoodScanFailure(failure), failure.message);
  }
  for (const [code, word] of [['password_pdf', 'contraseña'], ['pdf_page_limit', '50'], ['file_size_limit', '25 MB'], ['invalid_pdf', 'otro PDF']]) {
    const message = nativeFoodScanFailure(new RestaurantDocumentError91(code, 'raw PasswordException Missing PDF header'));
    assert.match(message, new RegExp(word)); assert.doesNotMatch(message, /Exception|header|raw/);
  }
});
const expected = { ownerId: 'controlled-owner', name: 'Idea de blanco fresco', favorite: false };
const receipt = { id: 'controlled-saved-row', user_id: expected.ownerId, name: expected.name, status: 'wishlist',
  is_favorite: false, use_for_profile_training: false, sensory_attributes: null, matchrim_affinity: null };
await check('A food style idea confirms only its own unscored, non-trainable wishlist representation', () => {
  assert.equal(confirmsNativeFoodSave95(receipt, expected), true);
  assert.equal(confirmsNativeFoodSave95({ ...receipt, is_favorite: true }, { ...expected, favorite: true, id: receipt.id }), true);
});
await check('Partial, foreign, stale, personal-score or training-enabled receipts cannot confirm a food save', () => {
  for (const mutation of [{ id: '' }, { user_id: 'another-owner' }, { name: 'Another wine' }, { status: 'tasted' },
    { is_favorite: true }, { use_for_profile_training: true }, { sensory_attributes: {} }, { matchrim_affinity: 75 }]) {
    assert.equal(confirmsNativeFoodSave95({ ...receipt, ...mutation }, expected), false);
  }
  for (const key of Object.keys(receipt)) {
    const partial: Record<string, unknown> = { ...receipt }; delete partial[key];
    assert.equal(confirmsNativeFoodSave95(partial, expected), false);
  }
  assert.equal(confirmsNativeFoodSave95(receipt, { ...expected, id: 'another-row' }), false);
  for (const bad of [null, undefined, [], 1, 'id']) assert.equal(confirmsNativeFoodSave95(bad, expected), false);
});
console.log(JSON.stringify({ groups, passed: true, networkCalls: 0, accountsCreated: 0, scope: 'Executed native read lifecycle, error taxonomy and persistence receipts, not OCR or taste accuracy' }));
