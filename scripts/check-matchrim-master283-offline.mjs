import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');
const detailFile = 'qa-artifacts/first20-274-20261027/live-r2/19-BODY.json';
const raw = fs.readFileSync(detailFile), detail = JSON.parse(raw);
const ledger = fs.readFileSync('qa-fixtures/first20-279/RESULT.json', 'utf8');
let groups = 0;
const test = async (name, work) => { await work(); groups++; console.log('PASS ' + name); };

await test('Retained 020 detail is the ledger copy and the search page is derived only from it', () => {
  assert.equal(sha(raw), 'e9ca151f93703aa58480cd013200845958bd1fdb33bb5cbdaf50ed6420c33a0e');
  assert(ledger.includes(sha(raw)), 'Detail hash must be listed in first20-279');
  const listed = detail.representativePublicId !== null;
  assert.deepEqual(JSON.parse(fs.readFileSync('qa-fixtures/native283/qa283-search.json', 'utf8')), {
    results: [{ mantalakWineId: detail.mantalakWineId, name: detail.name, winery: detail.winery, type: detail.type,
      country: detail.country, region: detail.region, grapes: detail.grapes, vintages: detail.vintages, photo: detail.photo,
      slugname: detail.slugname, webUrl: listed ? detail.webUrl : null, id: listed ? detail.representativePublicId : null,
      representativePublicId: listed ? detail.representativePublicId : null, tastingAttributes: {} }],
    count: 1, total: 1, page: 1, limit: 10, pageCount: 1 });
  assert.deepEqual([detail.mantalakWineId, detail.name, detail.winery, detail.vintages], [217477, 'Pinot Blanc', 'De Lozey', [2020]]);
  assert.deepEqual(detail.tastingAttributes.attributesByVintage.map(row => row.vintage), ['2020']);
});

const reached = [], storage = new Map(), nodes = new Map();
const body = { append: node => nodes.set(node.id, node) };
const context = { URL, JSON, btoa, Response, DOMException, Math, Date, location: new URL('capacitor://localhost/index.html'),
  localStorage: { setItem: (key, value) => storage.set(key, value) }, addEventListener: () => {},
  document: { body, getElementById: id => nodes.get(id) ?? null, querySelector: () => null,
    createElement: () => ({ style: {}, setAttribute() {} }) },
  HTMLInputElement: class {}, fetch: async input => { reached.push(String(input)); return new Response(`{"served":"${input}"}`); } };
context.window = context;
vm.runInNewContext(fs.readFileSync('scripts/matchrim-master283-offline.js', 'utf8'), context, { timeout: 1000 });
const catalog = 'https://cbjynrbvrhcmpaojmqdp.supabase.co/functions/v1/matchrim-master-catalog';
const call = payload => context.fetch(catalog, { method: 'POST', body: JSON.stringify(payload) });
const search = query => call({ operation: 'search', query: { name: 'Pinot Blanc', winery: 'De Lozey', page: 1, limit: 10, includeUnlisted: true, ...query } });

await test('Only the exact explicit 020 search and detail are served, from local files', async () => {
  assert.deepEqual(await (await search({})).json(), { served: '/qa283-search.json' });
  assert.deepEqual(await (await call({ operation: 'detail', mantalakWineId: 217477 })).json(), { served: '/qa283-detail.json' });
  assert.equal(nodes.get('qa283-counter').textContent, 'QA283 consultas locales: 2');
  for (const response of [await search({ name: 'La Migratoria' }), await search({ winery: 'Otra' }), await search({ includeUnlisted: false }),
    await call({ operation: 'detail', mantalakWineId: 217480 }), await call({ operation: 'insert' })]) {
    assert.equal(response.status, 400); assert.equal((await response.json()).error, 'QA283_UNEXPECTED_OPERATION');
  }
  assert.deepEqual(reached, ['/qa283-search.json', '/qa283-detail.json'], 'Rejected operations reach no transport');
});
await test('Other URLs fall through to the network-denial guard and a cancelled lookup is not counted', async () => {
  await context.fetch('/qa220-label.jpg'); assert.equal(reached.at(-1), '/qa220-label.jpg');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(context.fetch(catalog, { body: '{}', signal: controller.signal }), /Cancelled/);
  assert.equal(nodes.get('qa283-counter').textContent, 'QA283 consultas locales: 7');
});
await test('Only the synthetic owner quiz and training reads are served locally (285); writes and other owners fall through', async () => {
  const rest = 'https://cbjynrbvrhcmpaojmqdp.supabase.co/rest/v1/';
  const owner = 'user_id=eq.00000000-0000-4000-8000-000000000283';
  assert.deepEqual(await (await context.fetch(rest + 'quiz_results?select=potente&' + owner + '&order=created_at.desc&limit=1')).json(),
    [{ potente: 3, acidez: 4, dulce: 1, tanico: 1, afrutado: 4 }]);
  assert.deepEqual(await (await context.fetch(rest + 'user_wines?select=id&' + owner + '&use_for_profile_training=eq.true')).json(), []);
  const before = reached.length;
  for (const [path, options] of [[rest + 'quiz_results?' + owner, { method: 'POST', body: '{}' }],
    [rest + 'quiz_results?user_id=eq.someone-else', undefined], [rest + 'user_wines?' + owner, undefined]]) await context.fetch(path, options);
  assert.equal(reached.length, before + 3, 'Writes, other owners and untrained reads reach the guard');
  assert.equal(nodes.get('qa283-counter').textContent, 'QA283 consultas locales: 7', 'REST reads are not catalogue lookups');
});
await test('The synthetic session cannot authenticate to a real service', () => {
  const session = JSON.parse(storage.get('sb-cbjynrbvrhcmpaojmqdp-auth-token'));
  assert.equal(session.user.id, '00000000-0000-4000-8000-000000000283');
  assert(session.access_token.endsWith('.QA_OFFLINE_INVALID_SIGNATURE') && session.user.email.endsWith('@example.invalid'));
});
assert.equal(groups, 5);
console.log(`Matchrim master283 offline guard: ${groups}/5 PASS (VM replay, not a native flow)`);
