import assert from 'node:assert/strict';
import path from 'node:path';
import { loadCache112 } from './benchmark-matchrim-native112';

type Receipt179 = { url: string; sourceReceipt: string; sha256: string; metadata: string };
export function pinCache179(repo: string, receipts: Receipt179[], loader = loadCache112) {
  const snapshots = new Map<string, ReturnType<typeof loadCache112>>();
  const pinned: ReturnType<typeof loadCache112> = new Map();
  for (const receipt of receipts) {
    const file = receipt.sourceReceipt.split('#')[0], folder = path.dirname(file);
    assert(path.isAbsolute(folder), 'ABSOLUTE_RECEIPT_REQUIRED');
    if (!snapshots.has(folder)) snapshots.set(folder, loader(repo, [folder]));
    const entry = snapshots.get(folder)!.get(receipt.url);
    assert(entry && entry.sourceReceipt === receipt.sourceReceipt && entry.sha256 === receipt.sha256
      && entry.metadata === receipt.metadata, 'EXACT_REPLAY_RECEIPT_REQUIRED');
    const previous = pinned.get(receipt.url);
    assert(!previous || previous.sha256 === entry.sha256 && previous.status === entry.status
      && previous.metadata === entry.metadata, 'MIXED_REPLAY_OBSERVATIONS');
    pinned.set(receipt.url, entry);
  }
  return pinned;
}
