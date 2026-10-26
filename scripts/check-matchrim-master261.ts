import assert from 'node:assert/strict';
import fs from 'node:fs';
import { nativeDuplicateWineGroups261 } from '../src/utils/nativeMasterDuplicates261';
import { groupDuplicateWines, type WineCandidate, type ScanRegion } from '../src/utils/multiWineScan';
import { resolveMasterCandidate259, nativeMasterLink259 } from '../src/utils/nativeMasterLink259';
import { makeCellarMasterReference260 } from '../src/utils/cellarMasterReference260';

const read = (file: string) => JSON.parse(fs.readFileSync(`qa-artifacts/master253-20261026/hosted-six-r1/${file}`, 'utf8'));
const candidate: WineCandidate = { id: 'reviewed261', name: 'La Migratoria', producer: 'Bodegas Frontonio', vintage: 2023,
  region: null, country: null, grapes: [], alcohol: null, confidence: .8, source: 'manual',
  evidence: ['Identidad indicada por el usuario'], inferredFields: [], uncertaintyReasons: [] };
const makeRegion = (id: string, value: WineCandidate, status: ScanRegion['status'] = 'recognized'): ScanRegion => ({
  id, index: 1, objectType: 'bottle', box: { x: 0, y: 0, width: 20, height: 80 }, detectionConfidence: .9,
  quality: { glare: 'low', occlusion: 'low', legibility: 'good' }, status,
  candidates: [value], selectedCandidateId: value.id, duplicateCount: 1, error: null,
});
const oldFetch = globalThis.fetch;
globalThis.fetch = async () => { throw Error('MASTER261_NO_NETWORK'); };
try {
  const result = await resolveMasterCandidate259(candidate, async operation => read(operation.operation === 'search' ? '02-BODY.json' : '03-BODY.json'));
  assert(result.status === 'reference-ready');
  const linked = result.candidate, unlinked = { ...candidate, id: 'raw261', source: 'label' as const, confidence: .99 };
  const regions = [makeRegion('raw-region', unlinked), makeRegion('reviewed-region', linked)];
  const before = JSON.stringify(regions);
  assert.equal(groupDuplicateWines(regions)[0].candidate.id, unlinked.id, 'Retained RED: raw confidence displaces the linked representative');
  assert.equal(makeCellarMasterReference260(groupDuplicateWines(regions)[0].candidate), null);
  for (const input of [regions, [...regions].reverse()]) {
    const groups = nativeDuplicateWineGroups261(input);
    assert.equal(groups.length, 1); assert.equal(groups[0].count, 2);
    assert.equal(groups[0].candidate, linked); assert(nativeMasterLink259(groups[0].candidate));
    assert(makeCellarMasterReference260(groups[0].candidate));
    assert.equal(groups[0].regionIds[0], 'reviewed-region');
  }
  assert.equal(JSON.stringify(regions), before);
  for (const patch of [{ name: 'LA MIGRATORIA', producer: 'BODEGAS FRONTONIO' },
    { name: 'La Mígratoria', producer: 'Frontonio' }, { name: ' La Migratoria ', producer: 'Bodegas  Frontonio' }]) {
    const variant = { ...unlinked, ...patch };
    const groups = nativeDuplicateWineGroups261([makeRegion('variant', variant), makeRegion('linked', linked)]);
    assert.equal(groups.length, 1, 'Case/accent/spacing and known producer wrappers are not a second wine');
    assert.equal(groups[0].count, 2); assert.equal(groups[0].candidate, linked);
  }
  const uncertain = [makeRegion('raw-region', unlinked, 'uncertain'), makeRegion('reviewed-region', linked)];
  nativeDuplicateWineGroups261(uncertain);
  assert.equal(uncertain[0].status, 'uncertain');
  assert.equal(nativeDuplicateWineGroups261(uncertain.filter(row => row.status === 'recognized'))[0].count, 1);
  for (const patch of [{ vintage: null }, { region: 'Different' }, { country: 'Different' }]) {
    const raw = { ...unlinked, ...patch };
    const groups = nativeDuplicateWineGroups261([makeRegion('raw', raw), makeRegion('linked', linked)]);
    assert.equal(groups.length, 2, 'Separate unknown/different bottle identity rather than lose or borrow the linked reference');
    assert.equal(new Set(groups.map(group => group.key)).size, 2);
    assert.equal(groups.reduce((sum, group) => sum + group.count, 0), 2);
    assert.equal(groups.find(group => group.regionIds.includes('linked'))?.candidate, linked);
  }
  assert.equal(nativeDuplicateWineGroups261([makeRegion('old', { ...unlinked, vintage: 2022 }), makeRegion('new', linked)]).length, 2);
  const discarded = [makeRegion('raw', unlinked), makeRegion('linked', linked, 'discarded')];
  assert.equal(nativeDuplicateWineGroups261(discarded)[0].candidate, unlinked);
  const plain = [makeRegion('raw', unlinked), makeRegion('other', { ...unlinked, id: 'other', confidence: .7 })];
  assert.deepEqual(nativeDuplicateWineGroups261(plain), groupDuplicateWines(plain));
  console.log(JSON.stringify({ passed: 7, failed: 0, priorGroupingRetainedRed: true,
    bindingPreservedWithoutTransfer: true, regionStatesUnchanged: true, externalCalls: 0,
    realScenes: 0, scope: 'Synthetic duplicate-region composition with actual retained master detail, not multibottle accuracy' }));
} finally { globalThis.fetch = oldFetch; }
