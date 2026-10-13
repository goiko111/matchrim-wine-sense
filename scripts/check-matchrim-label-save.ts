import assert from 'node:assert/strict';
import { confirmedLabelInsertId, labelInsertErrorResult, saveLabelBatch, type LabelSaveBatch, type LabelSaveCallback, type LabelSaveResult } from '../src/utils/labelScanSave';

let checks = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  assert.deepEqual(actual, expected, name);
  checks += 1;
};
const wine = { nombre: 'Synthetic A', productor: 'Synthetic producer', anada: 2020 };
const row = { id: 'row-a', user_id: 'owner-a', name: wine.nombre, producer: wine.productor, vintage: wine.anada, status: 'wishlist', is_favorite: false, use_for_profile_training: false };
for (const [name, value] of Object.entries({ null: null, undefined: undefined, array: [row], empty: [], missingId: { ...row, id: null }, blankId: { ...row, id: ' ' }, wrongOwner: { ...row, user_id: 'owner-b' }, wrongName: { ...row, name: 'Other' }, wrongProducer: { ...row, producer: 'Other' }, wrongVintage: { ...row, vintage: 2021 }, tasted: { ...row, status: 'tasted' }, training: { ...row, use_for_profile_training: true }, favorite: { ...row, is_favorite: true } })) {
  check(name, confirmedLabelInsertId(value, wine, 'owner-a'), null);
}
check('verified row', confirmedLabelInsertId(row, wine, 'owner-a'), 'row-a');
check('favorite preserved', confirmedLabelInsertId({ ...row, is_favorite: true }, { ...wine, is_favorite: true }, 'owner-a'), 'row-a');
for (const code of ['23502', '23503', '23514', '22P02']) check('explicit rejection '+code, labelInsertErrorResult({ code }).status, 'rejected');
for (const code of ['42501', 'PGRST116', '', 'XX000', '23505']) check('ambiguous '+code, labelInsertErrorResult({ code }).status, 'ambiguous');
check('missing error', labelInsertErrorResult(null).status, 'ambiguous');

const batch = (): LabelSaveBatch => ({ ownerId: 'owner-a', wines: [wine, { nombre: 'Synthetic B' }], results: [] });
const saved: LabelSaveResult = { status: 'saved', rowId: 'verified-row', ownerId: 'owner-a' };
const current = () => true;
const notified: string[] = [];
for (const status of ['rejected', 'ambiguous', 'auth-required'] as const) {
  const value = batch(); let calls = 0;
  check(status, await saveLabelBatch(value, async () => { calls++; return { status }; }, current, () => notified.push(status)), 'incomplete');
  check(status+' stops next group', calls, 1);
}
const rejectedCallback = batch();
check('callback rejects', await saveLabelBatch(rejectedCallback, async () => { throw new Error('network'); }, current, () => {}), 'incomplete');
check('rejection is ambiguous', rejectedCallback.results[0]?.status, 'ambiguous');
for (const value of [undefined, { status: 'saved', rowId: '', ownerId: 'owner-a' }, { status: 'saved', rowId: 'x', ownerId: 'owner-b' }]) {
  const b = batch();
  await saveLabelBatch(b, (async () => value) as LabelSaveCallback, current, () => {});
  check('invalid callback result', b.results[0]?.status, 'ambiguous');
}
const partial = batch(); let calls = 0;
const save: LabelSaveCallback = async () => ++calls === 2 ? { status: 'rejected' } : saved;
check('partial rejection', await saveLabelBatch(partial, save, current, () => {}), 'incomplete');
check('retain first success', partial.results[0]?.status, 'saved');
check('retry pending only', await saveLabelBatch(partial, save, current, () => {}), 'confirmed');
check('three calls total', calls, 3);
check('confirmed rerun no insert', await saveLabelBatch(partial, save, current, () => {}), 'confirmed');
check('still three calls', calls, 3);
const ambiguous = batch(); calls = 0;
const uncertainSave: LabelSaveCallback = async () => ++calls === 2 ? { status: 'ambiguous' } : saved;
await saveLabelBatch(ambiguous, uncertainSave, current, () => {});
check('ambiguous rerun blocked', await saveLabelBatch(ambiguous, uncertainSave, current, () => {}), 'incomplete');
check('no ambiguous reinsert', calls, 2);
let active = true; let updates = 0; calls = 0;
const stale = batch();
check('unmount while pending', await saveLabelBatch(stale, async () => { calls++; active = false; return saved; }, () => active, () => updates++), 'obsolete');
check('no stale continuation', calls, 1);
check('no stale UI updates', updates, 0);
check('no stale ledger success', stale.results, []);
check('obsolete before request', await saveLabelBatch(batch(), async () => { throw new Error('must not call'); }, () => false, () => {}), 'obsolete');
check('obsolete callback', await saveLabelBatch(batch(), async () => ({ status: 'obsolete' }), current, () => {}), 'obsolete');
const obsoleteParent = batch();
await saveLabelBatch(obsoleteParent, async () => ({ status: 'obsolete' }), current, () => {});
check('obsolete parent blocks current child retry', await saveLabelBatch(obsoleteParent, async () => { throw new Error('must not reinsert'); }, current, () => {}), 'incomplete');
check('obsolete retained without success', obsoleteParent.results[0]?.status, 'obsolete');
check('empty batch not success', await saveLabelBatch({ ownerId: 'owner-a', wines: [], results: [] }, async () => saved, current, () => {}), 'incomplete');
console.log(JSON.stringify({ scope: 'local label-save contract and per-batch ledger, not hosted persistence', passed: checks }));
