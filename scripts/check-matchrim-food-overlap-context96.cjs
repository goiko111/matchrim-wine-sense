// Synthetic regression only: no owner image, recorded response or private path.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const repo=process.cwd(),local=require('node:module').createRequire(path.join(repo,'package.json')),ts=local('typescript'),file=path.join(repo,'src/utils/foodMenuScan89.ts');
const candidateArg=process.argv.find(a=>a.startsWith('--candidate='));
const source=fs.readFileSync(candidateArg?candidateArg.slice('--candidate='.length):file,'utf8'),before=execFileSync('git',['show','e9a215906be01fc14f18eed738dccac656d85f85:src/utils/foodMenuScan89.ts'],{cwd:repo,encoding:'utf8'}),json=x=>JSON.parse(JSON.stringify(x));
function load(override){const cache=new Map();const module=filename=>{filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename);const text=filename===file?override:fs.readFileSync(filename,'utf8'),exports={};cache.set(filename,exports);vm.runInNewContext(ts.transpileModule(text,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:s=>s.startsWith('.')?module(path.resolve(path.dirname(filename),s.endsWith('.ts')?s:s+'.ts')):local(s),AbortController,AbortSignal,DOMException,setTimeout,clearTimeout,fetch(){throw Error('NETWORK_DENIED');}},{timeout:1000,filename});return exports;};return module(file);}
const {restoreFoodOverlapSource96,restoreFoodOverlapGuard96,restoreFoodHeaderScope96}=require('./matchrim-food-overlap-context96-scope.cjs');
assert.equal(restoreFoodOverlapSource96(source),before);
restoreFoodOverlapGuard96(fs.readFileSync(path.join(repo,'scripts/check-matchrim-food-overlap96.cjs'),'utf8'));
restoreFoodHeaderScope96(fs.readFileSync(path.join(repo,'scripts/check-matchrim-menu-header-stack96.mjs'),'utf8'));
const sut=load(source),old=load(before),checks=[];const test=(name,fn)=>{fn();checks.push(name);};
function fixture(three,clipped){const tiles=sut.planFoodMenuTiles89(...(three?[3000,1800]:[1800,2400]));return tiles.map((tile,i)=>{
 const dishes=[0,1,2].map(j=>{const cut=clipped&&j===2&&i===0,name='Generic Dish '+['A','B','C'][j],price=[20,30,42][j];let g=three?{x:48,y:30+j*10,width:4,height:3}:{x:40,y:45+j*3,width:8,height:1};
  if(clipped&&j===2)g=three?{x:54,y:50,width:cut?2:4,height:3}:{x:32,y:cut?54.768:54.752,width:36,height:cut?1.232:1.904};
  return{nombre:name,categoria:'soup',match:null,razon:'Synthetic row '+tile.id,recomendaciones:[],source_text:name+(cut?'':' '+price+' PLN'),source_order:j+1,confidence:cut?0:null,region_id:'synthetic-section-'+i,source_box:{x:(g.x-tile.box.x)*100/tile.box.width,y:(g.y-tile.box.y)*100/tile.box.height,width:g.width*100/tile.box.width,height:g.height*100/tile.box.height}};
 });return{ok:true,read:sut.parseFoodMenuTile89({mode:'menu',summary:'Synthetic test, not OCR truth',has_profile:false,profile_source:'none',dishes,scan_region:{id:tile.id,box:tile.box,tile_count:tiles.length,max_dishes:30,coordinate_space:'crop_percent'}},tile)};
});}
const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
for(const three of [false,true])for(const clipped of [false,true])for(const order of three?orders:[[0,1],[1,0]])test('Native '+(three?3:2)+' crops clipped='+clipped+' order='+order,()=>{
 const input=fixture(three,clipped),immutable=JSON.stringify(input),list=order.map(i=>input[i]),result=sut.mergeFoodMenuTiles89(list,true);assert.equal(result.dishes.length,3);assert.equal(result.coverage.duplicate_rows,input.length*3-3);assert.equal(result.coverage.partial,true);assert.equal(result.coverage.estimated_visible_dishes,null);assert.equal(result.coverage.unreadable_dishes,null);
 for(const d of result.dishes){assert.equal(new Set(d.source_tile_ids).size,input.length);const{source_tile_ids,...fields}=json(d);assert(list.flatMap(o=>o.read.dishes).some(r=>{const{source_tile_ids,...original}=json(r);return JSON.stringify(fields)===JSON.stringify(original);}));assert.equal(d.match,null);assert.deepEqual(json(d.recomendaciones),[]);}
 if(clipped)assert.equal(result.dishes.find(d=>d.nombre==='Generic Dish C').source_text,'Generic Dish C 42 PLN');assert.equal(JSON.stringify(input),immutable);assert.equal(JSON.stringify(sut.mergeFoodMenuTiles89(list)),JSON.stringify(old.mergeFoodMenuTiles89(list)));
});
for(const order of orders){
 test('No geometric bridge '+order,()=>{const list=fixture(true,false);for(let i=0;i<3;i++)list[i].read.dishes[2].source_box={x:44+i*2,y:50,width:10,height:3};assert.equal(sut.mergeFoodMenuTiles89(order.map(i=>list[i]),true).dishes.length,4);});
 test('No price bridge '+order,()=>{const list=fixture(true,true);list[2].read.dishes[2].source_text='Generic Dish C 43 PLN';const result=sut.mergeFoodMenuTiles89(order.map(i=>list[i]),true);assert(result.dishes.length>=4);assert(result.dishes.some(d=>d.source_text==='Generic Dish C 42 PLN'));assert(result.dishes.some(d=>d.source_text==='Generic Dish C 43 PLN'));});
 test('No same-crop collapse '+order,()=>{const list=fixture(true,false);list[2].read.dishes.push(json(list[2].read.dishes[2]));assert.equal(sut.mergeFoodMenuTiles89(order.map(i=>list[i]),true).dishes.length,4);});
}
for(const [name,mutate]of [
 ['portion',d=>{d.nombre='Small '+d.nombre;d.source_text='Small '+d.source_text;}],
 ['price',d=>{d.source_text='Generic Dish C 43 PLN';}],
 ['currency',d=>{d.source_text='Generic Dish C 42 EUR';}],
 ['category',d=>{d.categoria='other';}],
 ['order',d=>{d.source_order=99;}],
 ['column',d=>{d.source_box.x=60;}],
 ['row',d=>{d.source_box.y=70;}],
 ['geometry',d=>{d.source_box=null;}],
])test('Distinct '+name,()=>{const list=fixture(true,false);mutate(list[2].read.dishes[2]);assert.equal(sut.mergeFoodMenuTiles89(list,true).dishes.length,4);});
test('Single corroborating row is insufficient, including after prior operations',()=>{const list=fixture(true,false);for(const o of list)o.read.dishes=o.read.dishes.slice(0,1);assert.equal(sut.mergeFoodMenuTiles89(list,true).dishes.length,3);});
test('No geometric evidence',()=>{const list=fixture(true,false);for(const o of list)for(const d of o.read.dishes)d.source_box=null;assert.equal(sut.mergeFoodMenuTiles89(list,true).dishes.length,9);});
console.log(JSON.stringify({passed:checks.length,failed:0,checks,syntheticOnly:true,privatePathsOrCorpusDependencies:false,HTTP:0,SDK:0}));
