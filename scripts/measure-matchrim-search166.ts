// 166: is the hand search's own second attempt still needed after the server change of 21-nov-2026?
// Reads Winerim's public store (GET, read-only). Run: npx tsx scripts/measure-matchrim-search166.ts > out.json
const real = globalThis.fetch; let calls = 0;
globalThis.fetch = ((...args: Parameters<typeof fetch>) => { calls += 1; return real(...args); }) as typeof fetch;
const { searchStore139, searchStoreTolerant163 } = await import('../src/utils/storeListing139');
const queries = ['ondare milenium', 'lalier blanc', 'lalier r-20', 'irache 18.91', 'finca de la mota', 'katxina', 'martin codax', 'mara martin', 'pontellon', 'enate 234', 'ossian', 'la jefa',
  'imperial reserva', 'viña ardanza', 'vina ardansa', 'pago de carraovejas', 'carraobejas', 'marques de riscal', 'marqes de riscal', 'ramon bilbao', 'protos', 'albariño', 'muga', 'ostatu', 'nava real', 'belondrade', 'terras gauda', 'tera gauda', 'habla del silencio', 'juve camps'];
const out: unknown[] = [];
for (const query of queries) {
  let before = calls, t0 = Date.now(); const direct = await searchStore139(query); const directCalls = calls - before, directMs = Date.now() - t0;
  before = calls; t0 = Date.now(); const tolerant = await searchStoreTolerant163(query);
  const extra = tolerant.filter(row => !direct.some(own => own.id === row.id));
  out.push({ query, direct: direct.length, directMs, first: direct[0] ? `${direct[0].name} (${direct[0].winery})` : null, extraCalls: calls - before, extraMs: Date.now() - t0, added: extra.length, addedNames: extra.slice(0, 4).map(row => `${row.name} (${row.winery})`) });
}
console.log(JSON.stringify(out, null, 1));
