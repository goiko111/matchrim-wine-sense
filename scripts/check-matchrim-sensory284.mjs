import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { apply } from './check-matchrim-sensory207.mjs';
const require = createRequire(import.meta.url), Ajv = require('ajv');
// rev3-2026-10-28 as received on 28-oct 10:47; validate.py is kept as text and never executed.
const folder = 'qa-fixtures/master284/', expected = {
  'CONTRATO-API.md': '00a75d8c3e383cb33a08ad73b1699790ff4f703c51946aa1bb1a551292723c5d',
  'EJEMPLOS.json': '46770fb0573162cfa548f550061db0a83231f7895a00e5cffa3af27ddd580a39',
  'NEGATIVOS.json': '28a5423e8a2924ed3c82ac3bc6e25a1e459dd3b0b617c1e726a1d1695edb6d71',
  'VALIDACION-CRUZADA.md': 'eb2098774019e0658681f23beb182551e726b67304cbc9ba4ce2f43f80159ec9',
  'sensory-evidence-1.schema.json': '0ae3a425a4baf16ef438f19948e53095ccbcf24721817d2a99c62d908ba837d6',
  'validate.py.txt': '7ff528736a41ded4417185b8c1493782add880b21e2aff5c397a5d2678a8b886' };
for (const [file, hash] of Object.entries(expected)) assert.equal(createHash('sha256').update(fs.readFileSync(folder + file)).digest('hex'), hash, file);
const read = file => JSON.parse(fs.readFileSync(folder + file, 'utf8'));
const schema = read('sensory-evidence-1.schema.json'), examples = read('EJEMPLOS.json'), negatives = read('NEGATIVOS.json');
const ajv = new Ajv({ allErrors: true, jsonPointers: true, format: 'full' });
const root = ajv.compile(schema), search = ajv.compile({ $ref: schema.$id + '#/definitions/searchResult' });
const axes = ['power', 'sweetness', 'acidity', 'tannin', 'fruity', 'aging'];
// Independent implementation of VALIDACION-CRUZADA.md rev3: X1-X5 and X8; X6/X7 are withdrawn.
const cross284 = block => {
  const errors = [], rows = block.attributesByVintage;
  for (const row of rows) for (const axis of axes) {
    const ev = row.evidence[axis];
    if (Object.hasOwn(row, axis) && row[axis] !== ev.value) errors.push('X1');
    if (ev.state === 'ai_estimate_recorded' && row.origin.type !== 'ai_recorded') errors.push('X5');
    if (ev.state === 'unknown_origin' && row.origin.type !== 'unrecorded') errors.push('X5');
  }
  const generic = rows.filter(row => row.vintage === null), years = rows.filter(row => row.vintage !== null).map(row => String(row.vintage));
  if (new Set(years).size !== years.length) errors.push('X3');
  if (generic.some(row => Object.hasOwn(row, 'conflict') !== (generic.length > 1))) errors.push('X2');
  const vr = block.vintageResolution;
  if (vr) {
    if (vr.genericRowCount !== generic.length) errors.push('X2');
    if ((vr.status === 'exact') !== years.includes(String(vr.requested))) errors.push('X4');
    if (block.vintages && JSON.stringify(vr.knownVintages.map(String).sort()) !== JSON.stringify(block.vintages.map(String).sort())) errors.push('X4');
  }
  const lists = [block.vintages, vr?.knownVintages].filter(Array.isArray);
  for (const row of rows) if (row.scope === 'exact' && lists.some(list => !list.map(String).includes(String(row.vintage)))) errors.push('X8');
  return errors;
};
let checks = 0;
const check = (name, run) => { run(); checks++; console.log('PASS', name); };
for (const [name, block] of Object.entries(examples.valid)) check(`valid ${name}`, () => {
  assert(root(block), JSON.stringify(root.errors)); assert.deepEqual(cross284(block), []);
});
for (const [name, item] of Object.entries(examples.search)) check(`search ${name}`, () => assert(search(item.resultItem), JSON.stringify(search.errors)));
for (const test of negatives.schema) check(`schema ${test.id}`, () => {
  const doc = Object.hasOwn(test, 'doc') ? test.doc : apply(examples.valid[test.base], test.ops);
  const validate = test.search ? search : root; assert.equal(validate(doc), false, test.expect);
  if (test.expectValidator) assert(validate.errors.some(error => error.keyword === test.expectValidator
    && error.dataPath.slice(1) === test.expectPath), JSON.stringify(validate.errors));
});
for (const test of negatives.cross) check(`cross ${test.id} expected ${test.expectCode}`, () => {
  const doc = apply(examples.valid[test.base], test.ops); assert(root(doc), JSON.stringify(root.errors));
  const errors = cross284(doc); assert(errors.length > 0); assert(errors.every(code => code === test.expectCode), JSON.stringify(errors));
});
for (const test of negatives.positive) check(`positive ${test.id}`, () => {
  const doc = apply(examples.valid[test.base], test.ops); assert(root(doc), JSON.stringify(root.errors)); assert.deepEqual(cross284(doc), []);
});
// Own checks of what rev3 claims, beyond the supplied cases.
const base = examples.valid.zorrera_2015, unknownAxis = axes.find(axis => base.attributesByVintage.some(row => row.evidence[axis].state === 'unknown_origin'));
const unknownRow = base.attributesByVintage.findIndex(row => row.evidence[unknownAxis].state === 'unknown_origin');
check('own: suspected_default is no longer an accepted evidence state', () => {
  assert.equal(root(apply(base, [{ set: `attributesByVintage.${unknownRow}.evidence.${unknownAxis}.state`, value: 'suspected_default' }])), false);
  assert(root.errors.some(error => error.keyword === 'enum' && error.dataPath.endsWith(`/evidence/${unknownAxis}/state`)), JSON.stringify(root.errors));
});
check('own: a rule object cannot be attached to an axis', () => {
  assert.equal(root(apply(base, [{ set: `attributesByVintage.${unknownRow}.evidence.${unknownAxis}.rule`,
    value: { id: 'R2', version: '1', reason: 'x', isProofOfOrigin: false, knownExceptions: [] } }])), false);
  assert(root.errors.some(error => error.keyword === 'additionalProperties'), JSON.stringify(root.errors));
});
check('own: unknown_origin cannot carry proof (no promotion to genuine evidence)', () => {
  assert.equal(root(apply(base, [{ set: `attributesByVintage.${unknownRow}.evidence.${unknownAxis}.proof`, value: { url: 'https://example.invalid', retrievedAt: '2026-10-28T00:00:00Z' } }])), false);
});
check('own: R207-1 counterexample (exact harvest outside both declared lists) is rejected by X8 only', () => {
  const exact = base.attributesByVintage.findIndex(row => row.scope === 'exact');
  const doc = apply(base, [{ set: `attributesByVintage.${exact}.vintage`, value: '2023' }, { set: 'vintageResolution.requested', value: '2023' }]);
  assert(root(doc), JSON.stringify(root.errors)); assert.deepEqual([...new Set(cross284(doc))], ['X8']);
});
const rulesActive = root(apply(base, [{ set: 'evidenceMethod.rulesActive', value: ['R2@1'] }]));
assert.equal(checks, 7 + 1 + 20 + 8 + 3 + 4);
console.log(JSON.stringify({ passed: true, revision: 'rev3-2026-10-28', checks, suppliedCases: 39, suppliedValid: 8, suppliedSchemaNegatives: 20,
  suppliedCrossNegatives: 8, suppliedPositives: 3, ownChecks: 4, negativesWithExpectedKeywordAndPath: negatives.schema.filter(test => test.expectValidator).length,
  withdrawnRulesActiveFieldStillAccepted: rulesActive, completeContractApproved: false, apiImplemented: false, productionDataValidated: false,
  storedConfidenceRangeVerified: false, attachmentCodeExecuted: false, newExternalCalls: 0 }));
