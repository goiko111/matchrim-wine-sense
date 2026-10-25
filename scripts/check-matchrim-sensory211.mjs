import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { cross as cross207, apply } from './check-matchrim-sensory207.mjs';
const require = createRequire(import.meta.url), Ajv = require('ajv');
const read = file => JSON.parse(fs.readFileSync('qa-fixtures/master211/' + file, 'utf8'));
const schema = read('sensory-evidence-1.schema.json'), examples = read('EJEMPLOS.json'), negatives = read('NEGATIVOS.json');
const ajv = new Ajv({ allErrors: true, jsonPointers: true, format: 'full' });
const root = ajv.compile(schema), search = ajv.compile({ $ref: schema.$id + '#/definitions/searchResult' });
const cross211 = block => {
  const errors = cross207(block);
  const lists = [block.vintages, block.vintageResolution?.knownVintages].filter(Array.isArray);
  for (const row of block.attributesByVintage) {
    if (row.scope === 'exact' && lists.some(list => !list.map(String).includes(String(row.vintage)))) errors.push('X8');
  }
  return errors;
};
let checks = 0;
const check = (name, run) => { run(); checks++; console.log('PASS', name); };
for (const [name, block] of Object.entries(examples.valid)) check(`valid ${name}`, () => {
  assert(root(block), JSON.stringify(root.errors)); assert.deepEqual(cross211(block), []);
});
for (const [name, item] of Object.entries(examples.search)) check(`search ${name}`, () => assert(search(item.resultItem)));
for (const test of negatives.schema) check(`schema ${test.id}`, () => {
  const doc = Object.hasOwn(test, 'doc') ? test.doc : apply(examples.valid[test.base], test.ops);
  const validate = test.search ? search : root; assert.equal(validate(doc), false);
  if (test.expectValidator) assert(validate.errors.some(error => error.keyword === test.expectValidator
    && error.dataPath.slice(1) === test.expectPath), JSON.stringify(validate.errors));
});
for (const test of negatives.cross) check(`cross ${test.id} expected ${test.expectCode}`, () => {
  const doc = apply(examples.valid[test.base], test.ops); assert(root(doc), JSON.stringify(root.errors));
  const errors = cross211(doc); assert(errors.length > 0); assert(errors.every(code => code === test.expectCode), JSON.stringify(errors));
});
for (const test of negatives.positive) check(`positive ${test.id}`, () => {
  const doc = apply(examples.valid[test.base], test.ops); assert(root(doc), JSON.stringify(root.errors)); assert.deepEqual(cross211(doc), []);
});
console.log(JSON.stringify({ passed: true, checks, suppliedValid: Object.keys(examples.valid).length + Object.keys(examples.search).length,
  suppliedNegative: negatives.schema.length + negatives.cross.length, suppliedPositiveMutations: negatives.positive.length,
  priorCounterexamplesRejected: true, providedCasesValidated: true, completeContractApproved: false,
  productionDataValidated: false, providerConfidenceRangeInStoredRows: 'not-verified',
  backendDeployed: false, attachmentCodeExecuted: false, newExternalCalls: 0 }));
