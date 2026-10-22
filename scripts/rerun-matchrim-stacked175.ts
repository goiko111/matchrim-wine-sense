import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { main112, sha112 } from './benchmark-matchrim-native112';

const root = 'qa-artifacts/night105-20261021', source = `${root}/native112-corpus200-r16/CACHE_READS.json`;
const receipts = JSON.parse(fs.readFileSync(source, 'utf8')) as { sourceReceipt: string }[];
const caches = [...new Set(receipts.map(row => path.dirname(row.sourceReceipt.split('#')[0]))), path.resolve(path.dirname(source))];
const output = `${root}/native112-corpus200-r17`, reservation = 'qa-artifacts/continuation174-20261022/RESERVATION175.json';
assert(!fs.existsSync(output) && !fs.existsSync(reservation));
fs.writeFileSync(reservation, JSON.stringify({ reservedUTC: new Date().toISOString(), priorCLI: 377,
  priorConservativeReservation: 380, maximumNewFreeGET: 20, conservativeAfterReservation: 400, freeCeiling: 400,
  remainingReservedCapacity: 0, paidCap: 'unchanged 50 requests / EUR15', modelStarts: 0, imageUploads: 0,
  productionWrites: 0, lovableAgentTurns: 0, cacheSources: caches, cacheReceiptSHA256: sha112(fs.readFileSync(source)),
  preflight: 'PREFLIGHT175-r2.json', scope: 'Last bounded free GET reservation. Retained Vision replay through production stacked-query logic; no spelling aliases, new models, retry of cached HTTP errors or expected-name input.',
}, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
process.exitCode = await main112([output, 'live', '20', ...caches]);
