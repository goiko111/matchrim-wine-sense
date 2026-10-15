import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseStructuredObject, structuredResponseError, STRUCTURED_RESPONSE_ERROR_STATUS,
} from '../supabase/functions/_shared/structured-response';

const value = { name: 'literal { } / ;', nested: { text: '``` and "quotes"' }, absent: null };
for (const json of [JSON.stringify(value), '  ' + JSON.stringify(value) + '\n',
  '```json\n' + JSON.stringify(value) + '\n```',
  '```\r\n' + JSON.stringify(value) + '\r\n```']) {
  test(`whole object accepted: ${JSON.stringify(json)}`, () => {
    assert.deepEqual(parseStructuredObject(json), { ok: true, value });
  });
}

for (const content of ['', ' ', null, undefined, 9, {}, [], '[]', 'null', '"text"', 'true',
  '{"name":"truncated', '{"name": "A",}', '{"name": NaN}',
  'before {"name":"A"}', '{"name":"A"} after', '{} {}', '{}\n{}',
  '```json\n{}\n```\n```json\n{}\n```',
  '```json\n{}\n```\nafter', '```json\n{}', '```javascript\n{}\n```']) {
  test(`invalid output rejected without repair: ${String(content)}`, () => {
    const result = parseStructuredObject(content);
    assert.equal(result.ok, false);
    if (result.ok) assert.fail('Unexpected success');
    assert.equal(result.error.error, 'invalid_model_response');
    assert.equal(result.error.recoverable, true);
    assert.equal(result.error.retryable, false);
    assert.equal('value' in result, false);
    assert.equal(JSON.stringify(result).includes('truncated'), false, 'raw model content is not exposed');
  });
}

test('callers can reject semantic schema or incomplete output with the same contract', () => {
  assert.equal(STRUCTURED_RESPONSE_ERROR_STATUS, 502);
  assert.equal(structuredResponseError('invalid_schema').retryable, false);
  assert.equal(structuredResponseError('incomplete_response').recoverable, true);
});
