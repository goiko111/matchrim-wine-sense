const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const current = path.resolve(__dirname, '..');
const baseline = '/private/tmp/matchrim72-production-candidate';
const out = path.resolve(current, '..');
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const walk = dir => fs.readdirSync(dir, { withFileTypes:true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir,entry.name)) : [path.join(dir,entry.name)]);
const candidates = [...walk(path.join(current,'src')), ...walk(path.join(current,'scripts')),
  path.join(current,'supabase/functions/_shared/matchrim-learning.ts')];
const changes=[];
let patch='';
for (const file of candidates) {
  const relative=path.relative(current,file);
  const oldFile=path.join(baseline,relative);
  const content=fs.readFileSync(file);
  const oldContent=fs.existsSync(oldFile)?fs.readFileSync(oldFile):null;
  if (oldContent && content.equals(oldContent)) continue;
  const result=spawnSync('git',['diff','--no-index','--',oldContent?oldFile:'/dev/null',file],{encoding:'utf8'});
  if (result.status!==1) throw new Error(`Unexpected diff status ${relative}: ${result.status}`);
  patch+=result.stdout.replaceAll(baseline.replace(/^\//,'')+'/', '').replaceAll(current.replace(/^\//,'' )+'/', '');
  const destination=path.join(out,'local-changes',relative);
  fs.mkdirSync(path.dirname(destination),{recursive:true}); fs.copyFileSync(file,destination);
  changes.push({ path:relative, baselineSha256:oldContent?hash(oldContent):null, localSha256:hash(content), bytes:content.length });
}
fs.writeFileSync(path.join(out,'local-remediation.patch'),patch);
const checks={};
for (const [name,needle] of [['tests-delivery-final.log','Matchrim ground-truth manifest checks passed'],
  ['build-delivery.log','built in'],['ios-delivery-build.log','** BUILD SUCCEEDED **'],
  ['guide-simulator-delivery.log','** TEST SUCCEEDED **']]) {
  const log=fs.readFileSync(path.join(out,name),'utf8'); checks[name]={ marker:needle, found:log.includes(needle) };
}
const assets=walk(path.join(current,'dist-delivery')).map(file => ({ path:path.relative(path.join(current,'dist-delivery'),file), sha256:hash(fs.readFileSync(file)) }));
fs.writeFileSync(path.join(out,'local-source-manifest.json'),JSON.stringify({ generatedAt:new Date().toISOString(),
  baseline, sourceCodeCommit:'09d1edf5ca48a1e0a0be8cf2fe10ac3c8b121a92', repositoryHead:'7282f66',
  sourceRepository:'/Users/GOIKO/2matchrim-release-integration-20260902', branch:'codex/matchrim-learning-airim-qa-20260928',
  distribution:'local prototype only, fake backend; NOT a TestFlight IPA', productionChanged:false,
  changes, patchSha256:hash(Buffer.from(patch)), checks, assets },null,2));
console.log(JSON.stringify({ files:changes.length, patchBytes:Buffer.byteLength(patch), checks }));
