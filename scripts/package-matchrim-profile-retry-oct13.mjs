import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
const input = process.argv[2];
if (!input) throw new Error('Pass08 artifact directory');
const output = 'docs/qa-evidence/matchrim-profile-retry-2026-10-13';
mkdirSync(output,{recursive:true});
for (const name of ['before','after-first','after','after-cancel','after-unmount','checkpoint08.md','contracts.json','tsconfig-scoped.json']) cpSync(join(input,name),join(output,name),{recursive:true});
const hash=(bytes)=>createHash('sha256').update(bytes).digest('hex');
const baseline='301d078854d3e1594645d76f1fb24dea61eb0be7';
const product=['src/components/wine-import/WineMenuScanner.tsx','src/utils/scanProfile.ts','src/services/matchrimScanProfile.ts','src/utils/menuProfileRecovery.ts'];
const scripts=['scripts/check-matchrim-profile-retry-oct13.ts','scripts/qa-matchrim-profile-retry-oct13.py','scripts/package-matchrim-profile-retry-oct13.mjs'];
const protectedPaths=['src/utils/menuAffinityPresentation.ts','src/utils/menuWineSave.ts','src/utils/menuWineActions.ts','src/utils/scanWineEvidence.ts','src/utils/scanConfidence.ts','src/utils/wineAffinityExplanation.ts','src/utils/matchrimLearning.ts','src/contexts/AuthContext.tsx','src/pages/MyWines.tsx','src/utils/wineMenuScan.ts','src/utils/wineComparison.ts','src/components/AffinityExplanation.tsx'];
const stages=[];
for(const path of [...product,...scripts,...protectedPaths]){
  const now=readFileSync(path),old=spawnSync('git',['show',baseline+':'+path]);
  if(protectedPaths.includes(path)&&(old.status!==0||hash(old.stdout)!==hash(now)))throw Error('Protected source drift:'+path);
  const file=join(output,'sources',path+'.txt');mkdirSync(dirname(file),{recursive:true});writeFileSync(file,now);
  if(old.status===0){const prior=join(output,'baseline-sources',path+'.txt');mkdirSync(dirname(prior),{recursive:true});writeFileSync(prior,old.stdout);}
  stages.push({path,before:old.status===0?hash(old.stdout):null,after:hash(now),protected:protectedPaths.includes(path)});
}
const queries=(source)=>{
  const tree=ts.createSourceFile('loader.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),found=[];
  const visit=(node)=>{if(ts.isAwaitExpression(node)&&node.expression.getText(tree).startsWith('supabase.from('))found.push(node.expression.getText(tree));ts.forEachChild(node,visit);};visit(tree);return found;
};
const loaderPath='src/services/matchrimScanProfile.ts';
const oldQueries=queries(spawnSync('git',['show',baseline+':'+loaderPath],{encoding:'utf8'}).stdout),newQueries=queries(readFileSync(loaderPath,'utf8'));
if(oldQueries.length!==2||JSON.stringify(oldQueries)!==JSON.stringify(newQueries))throw Error('SDK profile query changed');
const protectedEvidence=[];
for(const name of ['matchrim-menu-save-2026-10-12','matchrim-menu-actions-2026-10-12','matchrim-affinity-status-2026-10-12']){
  const path='docs/qa-evidence/'+name+'/manifest.json',bytes=readFileSync(path),old=spawnSync('git',['show',baseline+':'+path]);
  if(hash(bytes)!==hash(old.stdout))throw Error('Protected manifest changed:'+name);
  const manifest=JSON.parse(bytes);
  for(const entry of manifest.entries)if(hash(readFileSync(join(dirname(path),entry.path)))!==entry.sha256)throw Error('Protected evidence changed:'+entry.path);
  protectedEvidence.push({name,sha256:hash(bytes),entries:manifest.entries.length,unchanged:true});
}
const contracts=JSON.parse(readFileSync(join(input,'contracts.json')));
for(const[path,expected]of Object.entries(contracts.sourceHashes))if(hash(readFileSync(path))!==expected)throw Error('Contract source drift:'+path);
writeFileSync(join(output,'source-stages.json'),JSON.stringify({baseline,stages,queriesUnchanged:newQueries,protectedEvidence,note:'Cancelled-response fixture originally omitted cancel hold; only those2 cases rerun. Initial Home unmount triggered unrelated destination quiz read3; final selector unmount has2. No new image/OCR for proving newbatch; clear/lifecycle contract only. Earlier source stages identified by receipt hashes; full intermediate snapshots not retained.'},null,2)+String.fromCharCode(10));
const verification=[];
for(const[name,args]of [['typecheck-scoped',['tsc','--project',join(input,'tsconfig-scoped.json')]],['lint-scoped',['eslint',...product,'scripts/check-matchrim-profile-retry-oct13.ts']]]){
  const result=spawnSync('npx',args,{encoding:'utf8'});
  writeFileSync(join(output,name+'.stdout.txt'),result.stdout);writeFileSync(join(output,name+'.stderr.txt'),result.stderr);
  verification.push({name,command:['npx',...args],exitCode:result.status});
  if(result.status!==0)throw Error('Only08 verification failed:'+name);
}
writeFileSync(join(output,'verification.json'),JSON.stringify({checks:verification,fullSuites:false,webBuild:false,nativeBuild:false},null,2)+String.fromCharCode(10));
const get=(name)=>JSON.parse(readFileSync(join(output,name,'results.json'))).results;
const primary=[...get('after').filter(r=>!r.case.startsWith('cancel:')&&!r.case.startsWith('unmount:')),...get('after-cancel'),...get('after-unmount')];
const checks=primary.flatMap(r=>r.checks);
if(primary.length!==18||primary.some(r=>!r.passed||r.counters.ocr!==1||r.counters.canonical!==1||r.counters.base!==2))throw Error('Primary08 counter/QA mismatch');
writeFileSync(join(output,'primary.json'),JSON.stringify({scope:'Only08 intercepted fake-auth one-scene variations, not users/recognition/persistence; saved ID is ref contract not UI insert',contexts:primary.length,contextsPassed:primary.filter(r=>r.passed).length,checks:checks.length,checksPassed:checks.filter(c=>c.passed).length,contracts:contracts.checks.length,realRemoteAppCalls:0,paidCalls:0,cases:primary},null,2)+String.fromCharCode(10));
const walk=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const entries=walk(output).filter(path=>!path.endsWith('/manifest.json')).sort().map(path=>({path:relative(output,path),sha256:hash(readFileSync(path))}));
writeFileSync(join(output,'manifest.json'),JSON.stringify({entries,captures:entries.filter(e=>e.path.endsWith('.png')).length},null,2)+String.fromCharCode(10));
console.log(JSON.stringify({contexts:primary.length,checks:checks.length,contracts:contracts.checks.length,entries:entries.length,captures:entries.filter(e=>e.path.endsWith('.png')).length,sources:stages.length,protectedSources:protectedPaths.length,protectedEvidence:protectedEvidence.reduce((n,e)=>n+e.entries,0)}));
