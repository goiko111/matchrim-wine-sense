import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const folder = 'qa-fixtures/master207/';
const load = name => JSON.parse(fs.readFileSync(folder + name, 'utf8'));
const schema = load('sensory-evidence-1.schema.json'), examples = load('EJEMPLOS.json'), negatives = load('NEGATIVOS.json');
const ajv = new Ajv({ allErrors: true, validateSchema: true, format: 'full' });
const root = ajv.compile(schema);
const search = ajv.compile({ $ref: schema.$id + '#/definitions/searchResult' });
const axes = ['power', 'sweetness', 'acidity', 'tannin', 'fruity', 'aging'];
// Independent, local implementation of the developer's documented X1-X7 checks.
// This reviews a proposed contract; it is not an app decoder or an API approval.
export const cross = block => {
  const errors = [], rows = block.attributesByVintage, rules = block.evidenceMethod.rulesActive ?? [];
  for (const row of rows) {
    for (const axis of axes) {
      const ev = row.evidence[axis];
      if (Object.hasOwn(row, axis) && row[axis] !== ev.value) errors.push('X1');
      if (ev.state === 'ai_estimate_recorded' && row.origin.type !== 'ai_recorded') errors.push('X5');
      if (ev.state === 'unknown_origin' && row.origin.type !== 'unrecorded') errors.push('X5');
      if (ev.state === 'suspected_default') {
        const key = `${ev.rule.id}@${ev.rule.version}`;
        if (!rules.includes(key) || key === 'R2@1' && (axis !== 'tannin' || !['blanco', 'espumoso'].includes(block.type))) errors.push('X6');
      }
      if (rules.includes('R2@1') && axis === 'tannin' && ['blanco', 'espumoso'].includes(block.type)
        && ev.value === 3 && ev.state !== 'suspected_default') errors.push('X7');
    }
  }
  const generic = rows.filter(row => row.vintage === null), years = rows.filter(row => row.vintage !== null).map(row => row.vintage);
  if (new Set(years).size !== years.length) errors.push('X3');
  if (generic.some(row => Object.hasOwn(row, 'conflict') !== (generic.length > 1))) errors.push('X2');
  const vr = block.vintageResolution;
  if (vr) {
    if (vr.genericRowCount !== generic.length) errors.push('X2');
    if ((vr.status === 'exact') !== years.includes(vr.requested)) errors.push('X4');
    if (block.vintages && JSON.stringify([...vr.knownVintages].sort()) !== JSON.stringify([...block.vintages].sort())) errors.push('X4');
  }
  return errors;
};
export const apply = (base, ops) => {
  const result = structuredClone(base);
  for (const op of ops) {
    const parts = (op.set ?? op.del).split('.'); let current = result;
    for (const key of parts.slice(0, -1)) { assert(!['__proto__', 'constructor', 'prototype'].includes(key)); current = current[key]; }
    const key = parts.at(-1); assert(!['__proto__', 'constructor', 'prototype'].includes(key));
    if (Object.hasOwn(op, 'set')) current[key] = structuredClone(op.value);
    else if (Array.isArray(current)) current.splice(Number(key), 1);
    else delete current[key];
  }
  return result;
};
if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
let checks = 0;
const check = (name, run) => { run(); checks++; console.log('PASS', name); };
for (const [name, doc] of Object.entries(examples.valid)) check(`valid ${name}`, () => {
  assert(root(doc), JSON.stringify(root.errors)); assert.deepEqual(cross(doc), []);
});
for (const [name, example] of Object.entries(examples.search)) check(`search ${name}`, () => assert(search(example.resultItem)));
for (const test of negatives.schema) check(`schema rejects ${test.id}`, () => {
  const doc = Object.hasOwn(test, 'doc') ? test.doc : apply(examples.valid[test.base], test.ops);
  assert.equal((test.search ? search : root)(doc), false);
});
for (const test of negatives.cross) check(`cross rejects ${test.id}`, () => {
  const doc = apply(examples.valid[test.base], test.ops);
  assert(root(doc), JSON.stringify(root.errors)); assert(cross(doc).length > 0);
});
const counterexamples = [
  { id: 'R207-1', issue: 'Exact sensory harvest absent from both declared vintage sets', doc: apply(examples.valid.zorrera_2015, [
    { set: 'attributesByVintage.1.vintage', value: '2023' }, { set: 'vintageResolution.requested', value: '2023' },
  ]) },
  { id: 'R207-2', issue: 'Recorded AI confidence outside probability range', doc: apply(examples.valid.zorrera_2015, [
    { set: 'attributesByVintage.1.origin', value: { type: 'ai_recorded', model: 'test-only', confidence: -10, generatedAt: '2026-10-24T00:00:00Z' } },
    ...axes.filter(axis => ['unknown_origin', 'ai_estimate_recorded'].includes(examples.valid.zorrera_2015.attributesByVintage[1].evidence[axis].state))
      .map(axis => ({ set: `attributesByVintage.1.evidence.${axis}.state`, value: 'ai_estimate_recorded' })),
  ]) },
];
for (const test of counterexamples) check(`reproduces contract gap ${test.id}`, () => {
  assert(root(test.doc), JSON.stringify(root.errors)); assert.deepEqual(cross(test.doc), []);
});
console.log(JSON.stringify({ passed: true, regressionChecks: checks,
  suppliedValid: Object.keys(examples.valid).length + Object.keys(examples.search).length,
  suppliedNegative: negatives.schema.length + negatives.cross.length,
  reviewApproved: false, counterexamples, externalCalls: 0, attachmentCodeExecuted: false }, null, 2));
}
