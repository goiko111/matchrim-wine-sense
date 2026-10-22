import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { main112, sha112 } from './benchmark-matchrim-native112';

const root = 'qa-artifacts/night105-20261021';
const source = `${root}/native112-corpus200-r14/CACHE_READS.json`;
const receipts = JSON.parse(fs.readFileSync(source, 'utf8')) as { sourceReceipt: string }[];
const caches = [...new Set(receipts.map(row => path.dirname(row.sourceReceipt.split('#')[0]))), `${root}/public-browse172-r1`];
const output = `${root}/native112-corpus200-r16`;
const reservation = 'qa-artifacts/continuation174-20261022/RESERVATION.json';
assert(!fs.existsSync(output) && !fs.existsSync(reservation));
fs.mkdirSync(path.dirname(reservation), { recursive: true, mode: 0o700 });
fs.writeFileSync(reservation, JSON.stringify({
  reservedUTC: new Date().toISOString(), priorCLI: 360, priorConservativeReservation: 345,
  maximumNewFreeGET: 35, conservativeAfterReservation: 380, freeCeiling: 400, remainingReservedCapacity: 20,
  paidCap: 'unchanged 50 requests / EUR15', modelStarts: 0, imageUploads: 0, productionWrites: 0,
  lovableAgentTurns: 0, cacheSources: caches, cacheReceiptSHA256: sha112(fs.readFileSync(source)),
  scope: 'Production automatic query planner; retained Vision replay, public catalogue GET only. No retries of cached HTTP failures or paid provider calls.',
}, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
process.exitCode = await main112([output, 'live', '35', ...caches]);
