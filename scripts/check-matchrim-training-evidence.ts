import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const baseline=process.env.MATCHRIM_DELTA_BASELINE==='1';
const root=resolve(baseline?'../../matchrim73-qa-20261007/build-workspace':'.');
const {calculateLearnedMatchrimProfile}=await import(`${root}/src/utils/matchrimLearning.ts`);
const {calculateEdgeLearnedProfileAudit}=await import(`${root}/supabase/functions/_shared/matchrim-learning.ts`);
const base={potente:3,acidez:3,dulce:2,tanico:2,afrutado:3};
const wine={id:'sample-1',rating:'love',use_for_profile_training:true,
  sensory_attributes:{potencia:4,acidez:5,dulzura:1,taninos:1,afrutado:4},updated_at:'2026-01-01T00:00:00Z'};
const results:Array<{name:string,status:string,error?:string}>=[];
for(const [implementation,calculate] of Object.entries({client:calculateLearnedMatchrimProfile,edge:calculateEdgeLearnedProfileAudit})){
  function check(name:string,run:()=>void){try{run();results.push({name:`${implementation}: ${name}`,status:'PASS'});}catch(error){results.push({name:`${implementation}: ${name}`,status:'FAIL',error:String(error)});}}
  for(const samples of [0,1,5,20,50]) check(`${samples} consenting distinct ratings`,()=>{
    const r=calculate(base,Array.from({length:samples},(_,i)=>({...wine,id:`sample-${i}`})));
    assert.equal(r.samples,samples);assert(r.confidence>=0 && r.confidence<=100);
  });
  check('saving without a rating does not learn',()=>assert.equal(calculate(base,[{...wine,rating:null}]).samples,0));
  check('withheld or absent consent never becomes training',()=>{
    assert.equal(calculate(base,[{...wine,use_for_profile_training:false}]).samples,0);
    assert.equal(calculate(base,[{...wine,use_for_profile_training:null}]).samples,0);
  });
  check('the same stored rating is counted once',()=>assert.equal(calculate(base,[wine,wine,wine]).samples,1));
  check('later rating removal supersedes older copy in either order',()=>{
    const deleted={...wine,rating:null,updated_at:'2026-02-01T00:00:00Z'};
    for(const rows of [[wine,deleted],[deleted,wine]])assert.equal(calculate(base,rows).samples,0);
  });
  check('later consent withdrawal supersedes older copy',()=>assert.equal(calculate(base,[wine,{...wine,use_for_profile_training:false,updated_at:'2026-02-01T00:00:00Z'}]).samples,0));
  check('edited rating equals the latest snapshot alone',()=>{
    const latest={...wine,rating:'not_for_me',updated_at:'2026-02-01T00:00:00Z'};
    assert.deepEqual(calculate(base,[latest,wine]),calculate(base,[latest]));
  });
  check('ambiguous simultaneous consent conflict fails closed',()=>{
    const withdrawn={...wine,use_for_profile_training:false};
    for(const rows of [[wine,withdrawn],[withdrawn,wine]])assert.equal(calculate(base,rows).samples,0);
  });
  check('distinct records/vintages retain their evidence',()=>assert.equal(calculate(base,[wine,{...wine,id:'different-vintage'}]).samples,2));
  check('empty reset restores onboarding profile',()=>assert.deepEqual(calculate(base,[]).profile,base));
}
const report={baseline,scope:'Pure client and Edge contracts; no account changes or persisted deletion test',passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,results};
writeFileSync(`../training-${baseline?'baseline':'candidate'}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));assert.equal(report.failed,0);
