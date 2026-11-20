// 161 (owner's video of the 159, 20-nov-2026). Run: npx tsx scripts/check-matchrim-ux161.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';

const store = new Map<string, string>();
(globalThis as Record<string, unknown>).sessionStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };
const { stashPendingSave160, peekPendingSave160, settlePendingSave160 } = await import('../src/utils/pendingSave160');
const { shortNames145 } = await import('../src/utils/scanKind144');
const read = (file: string) => fs.readFileSync(file, 'utf8');
let groups = 0;
const test = async (name: string, fn: () => void | Promise<void>) => { await fn(); groups += 1; console.log(`  ok ${name}`); };

await test('A wine chosen without a session waits with its place and rating, and is saved once', async () => {
  const wine = { name: 'La Nine', producer: null, vintage: null, labelPhoto: 'data:image/jpeg;base64,AAAA' };
  stashPendingSave160(wine as never, 'tasted', 'not_for_me');
  assert.equal(peekPendingSave160()?.rating, 'not_for_me');
  assert.ok(!store.get('matchrim.pending_save160')?.includes('base64'), 'the photo is not written to storage');
  const saved: string[] = [];
  const save = async (userId: string, item: { wine: { name: string; labelPhoto?: string | null }; place: string; rating: string | null }) => { saved.push(`${userId}:${item.wine.name}:${item.place}:${item.rating}:${Boolean(item.wine.labelPhoto)}`); return true; };
  assert.equal(await settlePendingSave160(null, save as never), null, 'no session, nothing saved');
  const [a, b] = await Promise.all([settlePendingSave160('u1', save as never), settlePendingSave160('u1', save as never)]);
  assert.deepEqual(saved, ['u1:La Nine:tasted:not_for_me:true']);
  assert.equal(a?.wine.name, 'La Nine'); assert.equal(b?.wine.name, 'La Nine');
  assert.equal(peekPendingSave160(), null);
  assert.equal(await settlePendingSave160('u1', save as never), null);
});
await test('A waiting wine older than half an hour is forgotten', () => {
  store.set('matchrim.pending_save160', JSON.stringify({ wine: { name: 'Viejo' }, place: 'tasted', rating: null, at: Date.now() - 31 * 60_000 }));
  assert.equal(peekPendingSave160(), null);
  store.delete('matchrim.pending_save160');
});
await test('The save buttons keep the choice instead of sending to the old form; the sign-in screen says why', () => {
  const choice = read('src/components/NativeSaveChoice142.tsx');
  assert.ok(choice.includes('stashPendingSave160(wine, place, rating)'));
  assert.ok(!/NativeSaveChoice142[\s\S]*my-wines\/add/.test(choice));
  const auth = read('src/pages/Auth.tsx');
  assert.ok(auth.includes('auth-why160') && auth.includes('necesitas una cuenta') && auth.includes('settlePendingSave160'));
  assert.ok(read('src/pages/MyWines.tsx').includes('settlePendingSave160'));
});
await test('Several bottles: a wine with an estimated note is saved from its sheet, and each row shows its bottle', () => {
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.ok(scanner.includes("selectedRegion?.status === 'recognized' || selectedRegion?.status === 'uncertain'"));
  assert.ok(scanner.includes('left160 === 0') && scanner.includes('row-photo160'));
  assert.ok(read('src/components/wine-import/LabelAnalysisView.tsx').includes('`gap139 min-w-0 space-y-2'), 'no «aún no tenemos la ficha» under an estimate');
});
await test('The short name the reading settled on is searched («# Psi» → «Psi»)', () => {
  assert.deepEqual(shortNames145(['# Psi']), ['Psi']);
  assert.deepEqual(shortNames145(['Ribera del Duero', '# Psi']), ['Psi']);
  assert.ok(read('src/components/wine-import/CandidateRecovery286.tsx').includes("manualQuery ? '' : candidate.name"));
});
console.log(`check-matchrim-ux161: ${groups}/5 groups`);
