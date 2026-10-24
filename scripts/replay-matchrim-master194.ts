import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createReader194, runCases194, validatePlan194, type Plan194 } from './probe-matchrim-master194';

const root = 'qa-fixtures/master194/responses';
const output = process.argv[2] ?? 'qa-artifacts/continuation194-20261024/OFFLINE-REEVALUATION-r1.json';
assert(process.argv.length <= 3 && /^qa-artifacts\/continuation194-20261024\/[a-zA-Z0-9_-]+\.json$/.test(output), 'LOCAL_NEW_OUTPUT_ONLY');
fs.mkdirSync(path.dirname(output), { recursive: true });
assert(!fs.existsSync(output), 'REPLAY_OUTPUT_EXISTS_KEEP_PRIOR_EVIDENCE');
const files = fs.readdirSync(root).filter(name => /^(?:\d{2}-(?:BODY|RECEIPT)\.json|RESULT\.json)$/.test(name)).sort();
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const before = files.map(file => ({ file, sha256: hash(fs.readFileSync(path.join(root, file))) }));
const receipts = files.filter(name => name.endsWith('-RECEIPT.json')).map(file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')));
assert.equal(receipts.length, 40); assert(receipts.every(row => row.httpStatus === 200));
const plan: Plan194[] = JSON.parse(fs.readFileSync('qa-fixtures/master194/query-plan.json', 'utf8'));
const source = JSON.parse(fs.readFileSync('qa-fixtures/master194/source-ocr.observed.json', 'utf8'));
assert.equal(source.sourcePackageSHA256, JSON.parse(fs.readFileSync(path.join(root, 'AUTHORIZATION.json'), 'utf8')).sourcePackageSHA256);
validatePlan194(plan, source.cases);
let reads = 0; const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('EXTERNAL_NETWORK_FORBIDDEN_IN_REPLAY194'); };
try {
  const reader = createReader194({ key: 'synthetic-replay-key194',
    claim: index => { assert.equal(index, reads + 1); },
    fetcher: async (url, init) => {
      const receipt = receipts[reads++]; assert(receipt); assert.equal(String(url), receipt.url);
      assert.equal(init?.method, 'GET'); assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
      const value = JSON.parse(fs.readFileSync(path.join(root, `${String(receipt.index).padStart(2, '0')}-BODY.json`), 'utf8'));
      return Response.json(value);
    }, record: () => undefined,
  });
  const evaluation = await runCases194(plan, reader);
  assert.equal(reads, 40); assert.equal(evaluation.requests, 40);
  const gross = evaluation.scenes.find(row => row.imageId === 'img-096');
  assert.equal(gross?.status, 'fallback-proposals-unconfirmed');
  assert(gross && 'fallbackTotal' in gross); assert.equal(gross.fallbackTotal, 57); assert.equal(gross.fallbackComplete, false);
  assert.equal(evaluation.identitiesConfirmed, 0); assert(evaluation.pagination.passed);
  for (const row of before) assert.equal(hash(fs.readFileSync(path.join(root, row.file))), row.sha256, 'SOURCE_RECEIPT_CHANGED');
  const statuses: Record<string, number> = {};
  for (const scene of evaluation.scenes) statuses[scene.status] = (statuses[scene.status] ?? 0) + 1;
  fs.writeFileSync(output, JSON.stringify({ mode: 'RETAINED_RESPONSE_REPLAY', externalRequests: 0, keychainReads: 0,
    sourceFingerprints: before, sourceUnchanged: true, retainedReads: reads, statuses, evaluation,
    scope: 'Current parser on preserved real payloads; not another live run, recognition pass or app deployment' }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ output, externalRequests: 0, retainedReads: reads, sourceUnchanged: true, statuses, identitiesConfirmed: 0 }));
} finally { globalThis.fetch = originalFetch; }
