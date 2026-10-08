import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import * as contract from '../supabase/functions/_shared/matchrim-catalog-search';

const baseline=process.env.MATCHRIM_DELTA_BASELINE==='1';
const source=resolve(baseline?'../../matchrim73-qa-20261007/build-workspace':'.',baseline?'supabase/functions/search-wines/index.ts':'supabase/functions/search-wines-v75/index.ts');
let handler:(r:Request)=>Promise<Response>;
let calls=0; let filter=''; let localFailure=false; let external=false; let externalCalls=0;
const client={from:()=>({select:()=>({or:(value:string)=>{filter=value;return {limit:async()=>{calls++;return localFailure?{data:null,error:{code:'TEST_UNAVAILABLE'}}:{data:[{id:'fixture-only',name:'Stored wine'}],error:null};}};}})})};
const compiled=ts.transpileModule(readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const requireFixture=(id:string)=>id.includes('/http/server')?{serve:(fn:typeof handler)=>{handler=fn;}}:
  id.includes('supabase-js')?{createClient:()=>client}:id.includes('matchrim-catalog-search')?contract:assert.fail(`Unexpected import ${id}`);
const quiet={log:()=>{},warn:()=>{},error:()=>{}};
new Function('require','exports','Deno','fetch','console',compiled)(requireFixture,{},
  {env:{get:(key:string)=>key==='LOVABLE_API_KEY'?(external?'fixture-key-not-real':undefined):'fixture-value'}},
  async (_url:string,options:RequestInit)=>{externalCalls++; assert(options.signal,'External search must have a timeout');throw new Error('fixture provider unavailable');},quiet);
const results:Array<{name:string,status:string,error?:string}>=[];
async function check(name:string,run:()=>Promise<void>){try{await run();results.push({name,status:'PASS'});}catch(error){results.push({name,status:'FAIL',error:String(error)});}}
const request=(value:unknown)=>new Request('http://localhost/search-wines',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
for(const input of [null,[],{query:42},{query:{}},{query:'valid',limit:-1},{query:'valid',limit:100000},{query:'valid',limit:1.5},{query:'x'.repeat(241)}]){
  await check(`invalid input yields 400 before data access: ${JSON.stringify(input).slice(0,70)}`,async()=>{const before=calls;assert.equal((await handler(request(input))).status,400);assert.equal(calls,before);});
}
await check('malformed JSON is a client error',async()=>assert.equal((await handler(new Request('http://localhost',{method:'POST',body:'{'}))).status,400));
await check('unsupported method is rejected',async()=>assert.equal((await handler(new Request('http://localhost',{method:'GET'}))).status,405));
await check('short empty lookup does not access catalog',async()=>{const before=calls;const r=await handler(request({query:' '}));assert.equal(r.status,200);assert.deepEqual(await r.json(),{wines:[]});assert.equal(calls,before);});
await check('punctuated label remains a quoted filter operand',async()=>{
  const r=await handler(request({query:'Chateau (Reserve), "A"',limit:20}));assert.equal(r.status,200);
  assert(filter.startsWith('name.ilike."%Chateau (Reserve), \\"A\\"%"'));
  assert.deepEqual((await r.json()).wines,[{id:'fixture-only',name:'Stored wine'}]);
});
await check('catalog failure preserves a valid empty result',async()=>{localFailure=true;const r=await handler(request({query:'Valid wine'}));assert.equal(r.status,200);assert.deepEqual((await r.json()).wines,[]);localFailure=false;});
await check('bounded external failure preserves stored results',async()=>{external=true;const r=await handler(request({query:'Stored wine'}));assert.equal(r.status,200);assert.equal((await r.json()).wines[0].id,'fixture-only');assert.equal(externalCalls,1);external=false;});
const report={baseline,scope:'Actual Edge handler with stubbed database/provider; zero remote calls. Production 500 cause not established.',passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,results};
writeFileSync(`../catalog-${baseline?'baseline':'candidate'}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
