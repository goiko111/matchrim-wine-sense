import { build } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Local-only configuration; browser QA rejects all outbound requests.
process.env.VITE_SUPABASE_URL='https://matchrim-local-qa.invalid';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='public-local-fixture-key';
process.env.VITE_SUPABASE_ANON_KEY='public-local-fixture-key';
process.env.VITE_MATCHRIM_NATIVE_GUIDE_ENABLED='true';
const shipped=new Set();
await build({plugins:[{name:'record-shipped-module-reachability',generateBundle(_options,bundle){
  for(const chunk of Object.values(bundle))if(chunk.type==='chunk')for(const id of Object.keys(chunk.modules))shipped.add(id);
}}]});
const audit=JSON.parse(readFileSync('../../matchrim73-qa-20261007/dependency-audit-after.json','utf8'));
const rows=Object.entries(audit.vulnerabilities).filter(([,v])=>v.severity==='high').map(([name,v])=>{
  const paths=[...shipped].filter(id=>id.includes(`/node_modules/${name}/`));
  return {name,reportedSeverity:v.severity,shippedModuleCount:paths.length,
    classification:paths.length?'PRESENT_IN_WEB_BUNDLE_REQUIRES_ADVISORY_REVIEW':'NOT_IN_WEB_BUNDLE_BUILD_OR_TOOLING_PATH_REMAINS',
    modules:paths.map(p=>p.replace(resolve('.'),'candidate')),via:v.via,fixAvailable:v.fixAvailable};
});
writeFileSync('../dependency-reachability.json',JSON.stringify({auditDate:'2026-10-07',analysisDate:'2026-10-08',scope:'Local candidate web bundle module graph; does not certify Node tooling or excluded worker/native paths',totalHigh:rows.length,present:rows.filter(r=>r.shippedModuleCount).map(r=>r.name),rows},null,2));
console.log('High findings present in web bundle:',rows.filter(r=>r.shippedModuleCount).map(r=>r.name).join(', '));
