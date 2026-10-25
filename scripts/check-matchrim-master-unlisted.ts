import assert from 'node:assert/strict';
import { masterRequestUrl194 } from '../supabase/functions/_shared/matchrim-master194';

const url = (includeUnlisted?: unknown) => masterRequestUrl194({ operation: 'search',
  query: { name: 'Migratoria', ...(includeUnlisted === undefined ? {} : { includeUnlisted }) } });
const flag = (value: unknown) => new URL(url(value)!).searchParams.get('includeUnlisted');

assert.equal(flag('1'), '1'); assert.equal(flag(true), '1');
assert.equal(flag('0'), '0'); assert.equal(flag(false), '0');
assert.equal(new URL(url()!).searchParams.has('includeUnlisted'), false);
for (const bad of ['', '2', 'true', 'false', 1, 0, null, ' 1', [], {}]) assert.equal(url(bad), null, String(JSON.stringify(bad)));
assert.equal(masterRequestUrl194({ operation: 'search', query: { name: 'Migratoria', other: 1 } }), null);
console.log('PASS includeUnlisted: 1, 0, true, false forwarded as 1/0; empty, 2 and others rejected');
