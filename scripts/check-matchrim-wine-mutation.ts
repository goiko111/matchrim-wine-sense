import assert from 'node:assert/strict';
import { confirmsWineMutation } from '../src/utils/matchrimWineMutation';

const id = 'synthetic-wine';
const expected = { rating: 'love', use_for_profile_training: true, quantity: 0, status: 'tasted', consumption_date: '2026-10-11T15:00:00.000Z' };
const cases: [string, unknown, Record<string, string | number | boolean | null>, boolean][] = [
  ['confirmed rating', { id, ...expected }, expected, true],
  ['confirmed training', { id, use_for_profile_training: false }, { use_for_profile_training: false }, true],
  ['confirmed delete', { id }, {}, true],
  ['empty', null, {}, false],
  ['missing', undefined, {}, false],
  ['zero rows', [], {}, false],
  ['array instead of single row', [{ id }], {}, false],
  ['wrong row', { id: 'other', ...expected }, expected, false],
  ['missing fields', { id }, expected, false],
  ['wrong rating', { id, ...expected, rating: 'ok' }, expected, false],
  ['wrong training', { id, ...expected, use_for_profile_training: false }, expected, false],
  ['wrong quantity', { id, ...expected, quantity: 1 }, expected, false],
  ['wrong status', { id, ...expected, status: 'collection' }, expected, false],
  ['timestamp timezone encoding', { id, ...expected, consumption_date: '2026-10-11T15:00:00+00:00' }, expected, true],
  ['wrong timestamp', { id, ...expected, consumption_date: '2026-10-11T16:00:00Z' }, expected, false],
  ['invalid timestamp', { id, ...expected, consumption_date: 'invalid' }, expected, false],
  ['rating removal', { id, rating: null, use_for_profile_training: false }, { rating: null, use_for_profile_training: false }, true],
  ['null is not missing', { id, use_for_profile_training: false }, { rating: null, use_for_profile_training: false }, false],
];
for (const [name, data, fields, expectedResult] of cases) assert.equal(confirmsWineMutation(data, id, fields), expectedResult, name);
console.log(JSON.stringify({ scope: 'local mutation response contract, not hosted persistence', passed: cases.length }));
