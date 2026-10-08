import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ScanRegion } from '../src/utils/multiWineScan';
import type { MenuScanWine } from '../src/utils/wineMenuScan';

const baseline = process.env.MATCHRIM_DELTA_BASELINE === '1';
const source = baseline ? '../../matchrim73-qa-20261007/build-workspace' : '.';
const scan = await import(resolve(source, 'src/utils/multiWineScan.ts'));
const menu = await import(resolve(source, 'src/utils/wineMenuScan.ts'));
const results: Array<{ name: string; status: string; error?: string }> = [];
function check(name: string, run: () => void) {
  try { run(); results.push({name, status:'PASS'}); }
  catch (error) { results.push({name, status:'FAIL', error:String(error)}); }
}
const full = {id:'full',box:{x:0,y:0,width:100,height:100}};
const bottles = Array.from({length:18},(_,i)=>({object_type:'bottle',confidence:0.9,
  box:{x:(i%9)*11+1,y:Math.floor(i/9)*40+14,width:8,height:32}}));
for (const reversed of [false,true]) check(`scene container cannot absorb 18 bottles (reversed=${reversed})`,()=>{
  const regions=[{object_type:'bottle',confidence:0.99,box:{x:0,y:12,width:100,height:88}},...bottles];
  const actual=scan.normalizeDetectedRegions({regions:reversed?regions.reverse():regions});
  assert.equal(actual.length,18);
  assert(actual.every((r:ScanRegion)=>r.box.width===8 && r.box.height===32));
});
check('one bottle and overlapping label fragments still consolidate',()=>{
  const actual=scan.normalizeDetectedRegions({regions:[
    {object_type:'bottle',box:{x:10,y:0,width:20,height:95},confidence:0.8},
    {object_type:'label',box:{x:12,y:40,width:16,height:22},confidence:0.95},
    {object_type:'label',box:{x:13,y:41,width:15,height:20},confidence:0.9},
  ]});
  assert.equal(actual.length,1);assert.equal(actual[0].box.height,95);
});
check('capped complete detector cannot claim complete coverage',()=>{
  const grid=Array.from({length:70},(_,i)=>({object_type:'bottle',confidence:0.8,
    box:{x:(i%10)*10,y:Math.floor(i/10)*14,width:6,height:10}}));
  const result=scan.mergeWineDetectionTileResults([{tile:full,payload:{regions:grid,coverage:{status:'reported_complete',estimated_visible_objects:70}}}]);
  assert.equal(result.regions.length,60);assert.equal(result.coverage.status,'partial');
  assert.equal(result.coverage.estimatedVisibleObjects,70);
});
const row=(nombre:string,patch:Partial<MenuScanWine>={}):MenuScanWine=>({nombre,productor:null,anada:null,region:null,pais:null,
  precio:20,tipo:'Tinto',descripcion:null,seccion:'TINTOS',texto_fuente:nombre,confidence:0.9,
  posicion:{x:10,y:20,width:20,height:2},...patch});
const merge=(vinos:MenuScanWine[]):MenuScanWine[]=>menu.mergeMenuTileResults([{tile:full,response:{vinos}}]).vinos ?? [];
check('Reserva and Reserva Especial remain distinct',()=>{
  assert.equal(merge([row('Muga Reserva'),row('Muga Reserva Especial')]).length,2);
});
check('known producer and vintage conflicts survive same-position OCR',()=>{
  assert.equal(merge([row('Muga Reserva',{anada:2018}),row('Muga Reserva',{anada:2021})]).length,2);
  assert.equal(merge([row('Reserva',{productor:'A'}),row('Reserva',{productor:'B'})]).length,2);
});
check('unique grape/price fragment joins its complete menu row',()=>{
  const result=merge([row('Oxford Landing',{texto_fuente:'Oxford Landing Grenache Shiraz Mourvedre 650',precio:650}),
    row('Grenache, Shiraz, Mourvedre',{precio:650})]);
  assert.deepEqual(result.map(x=>x.nombre),['Oxford Landing']);
});
check('standalone grape menu entry remains reviewable',()=>assert.equal(merge([row('Shiraz')]).length,1));
check('ambiguous grape/price match is not collapsed',()=>assert.equal(merge([
  row('Example One',{texto_fuente:'Example One Shiraz 20'}),
  row('Example Two',{texto_fuente:'Example Two Shiraz 20'}),row('Shiraz'),
]).length,3));
check('grape fragment cannot join a different vintage or section',()=>{
  assert.equal(merge([row('Example One',{texto_fuente:'Example One Shiraz 20',anada:2018}),row('Shiraz',{anada:2021})]).length,2);
  assert.equal(merge([row('Example One',{texto_fuente:'Example One Shiraz 20'}),row('Shiraz',{seccion:'BLANCOS'})]).length,2);
});
type RecordedItem={name:string;producer:string|null;vintage:number|null;price:number|null;
  currency:string|null;section:string|null;source_text:string|null;position:MenuScanWine['posicion'];
  service_prices:MenuScanWine['precios'];confidence:number;doubts:string[]};
const report=JSON.parse(readFileSync('../../matchrim73-qa-20261007/independent25/ground-truth-e2e-report.json','utf8')) as {
  results:Array<{mode:string;source_id:string;backend:{items?:RecordedItem[]}}>};
const replay=report.results.filter(s=>s.mode==='carta-vinos').map(scene=>{
  const inputs=(scene.backend.items||[]).map(r=>row(r.name,{productor:r.producer,anada:r.vintage,
    precio:r.price,moneda:r.currency,seccion:r.section,texto_fuente:r.source_text,posicion:r.position,
    precios:r.service_prices,confidence:r.confidence,dudas:r.doubts}));
  const output=merge(inputs);
  return {scene:scene.source_id,recordedRows:inputs.length,afterRows:output.length,
    removedNames:inputs.filter(r=>!output.some(o=>o.nombre===r.nombre)).map(r=>r.nombre)};
});
const result={baseline,external_calls:0,fixture_scope:'Contract geometry plus recorded menu outputs; not a new provider benchmark',
  passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,results,replay};
writeFileSync(`../delta-${baseline?'baseline':'candidate'}.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(result.failed)process.exitCode=1;
