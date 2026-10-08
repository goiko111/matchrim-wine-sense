import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { isWineMenuItem } from '../src/utils/wineMenuGrounding';
import { canonicalLabelSearchQuery, isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';
import { normalizeWineCandidates } from '../src/utils/multiWineScan';

const results: {name: string; passed: boolean; error?: string}[] = [];
const check = (name: string, fn: () => void) => {
  try { fn(); results.push({name, passed:true}); }
  catch (error) { results.push({name, passed:false, error: error instanceof Error ? error.message : String(error)}); }
};
for (const name of ['Prosecco', 'Prosecco Brut', 'Champagne', 'Cava Brut', 'Sauvignon Blanc', 'Rioja Crianza',
  'Sangiovese, Canaiolo', 'Cab. Sauv., Merlot', 'WINE (black cherry and violets)', 'ROSE (grapefruit and melon)']) {
  check(`category ${name} is not a named menu wine`, () => assert.equal(isWineMenuItem({nombre:name,texto_fuente:name}),false));
  check(`category ${name} cannot resolve canonical catalog identity`, () => assert.equal(isSafeCanonicalLabelMatch({name},{name,producer:'Unseen producer'}),false));
  check(`category ${name} cannot acquire sensory or affinity values`, () => assert.deepEqual(normalizeWineCandidates({candidates:[{name,confidence:.99,affinity:99,sensory_attributes:{potencia:4}}]},'test'),[]));
}
for (const wine of [
  {name:'BIOCA Mencia Seleccion',producer:null},
  {name:'Prosecco',producer:'Nino Franco'},
  {name:'Sauvignon Blanc',producer:'Cloudy Bay'},
  {name:'Lalama',producer:null},
  {name:'200 Monges',producer:null},
  {name:'Muga Reserva (2019)',producer:'Muga'},
]) {
  check(`named wine preserved: ${wine.name}`,()=>assert.equal(normalizeWineCandidates({candidates:[wine]},'test').length,1));
  check(`grounded producer preserved: ${wine.name}`,()=>assert.equal(isWineMenuItem({nombre:wine.name,productor:wine.producer,texto_fuente:[wine.name,wine.producer].filter(Boolean).join(' ')}),true));
}
check('unseen producer cannot manufacture specific menu identity',()=>assert.equal(isWineMenuItem({nombre:'Prosecco',productor:'Nino Franco',texto_fuente:'Prosecco'}),false));
check('same brand different cuvee stays rejected',()=>assert.equal(isSafeCanonicalLabelMatch({name:'Muga Reserva'},{name:'Muga Prado Enea'}),false));
check('catalog name lookup does not require producer in the name column', () => {
  const input = {name:'  Arzuaga Crianza  ',producer:'Bodegas Arzuaga Navarro, S.L.'};
  const rows = [{name:'Arzuaga Crianza',producer:'Bodegas Arzuaga Navarro, S.L.'}];
  const query = canonicalLabelSearchQuery(input);
  assert.equal(query,'Arzuaga Crianza');
  assert.equal(rows.filter(row => [row.name,row.producer].some(value => value.includes(query))).length,1);
  assert.equal(isSafeCanonicalLabelMatch(input,rows[0]),true);
});
check('producer still rejects a wrong winery after name-only retrieval', () => {
  assert.equal(isSafeCanonicalLabelMatch({name:'Reserva',producer:'Bodegas Arzuaga'},{name:'Reserva',producer:'Muga'}),false);
});
check('canonical query preserves cuvee punctuation and bounds input', () => {
  assert.equal(canonicalLabelSearchQuery({name:' Muga (Prado Enea) '}),'Muga (Prado Enea)');
  assert.equal(canonicalLabelSearchQuery({name:'x'.repeat(200)}).length,120);
});
const report={passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results,providerCalls:0};
writeFileSync(process.env.MR75_BASELINE ? '../identity75-baseline.json' : '../identity75-regression.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(report.failed)process.exitCode=1;
