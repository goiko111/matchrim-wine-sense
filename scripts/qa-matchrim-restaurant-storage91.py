"""Actual Chromium IndexedDB with the production session module; synthetic local owners, no accounts/network."""
import argparse
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_matchrim_runtime import add_browser_options, launch_browser

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', required=True)
p.add_argument('--output', type=Path, required=True)
add_browser_options(p)
a = p.parse_args()
assert not a.output.exists()
a.output.mkdir(parents=True)
compiled = subprocess.check_output(['node', '-e', "const ts=require('typescript'),fs=require('fs');process.stdout.write(ts.transpileModule(fs.readFileSync('src/utils/restaurantSession91.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)"], text=True)
with sync_playwright() as pw:
    browser = launch_browser(pw, a)
    context = browser.new_context(service_workers='block')
    context.route('**/*', lambda route: route.fulfill(content_type='text/html', body='<html><body>Local IndexedDB test</body></html>') if route.request.url == a.url + '/qa-storage91' else route.abort())
    page = context.new_page()
    page.goto(a.url + '/qa-storage91')
    checks = page.evaluate('''async (compiled) => {
      const exports = {}; new Function('exports', compiled)(exports);
      const q = exports, checks = [];
      const check = (name, condition) => { checks.push({name,passed:!!condition}); };
      let a = q.createRestaurantSession91(), b = q.createRestaurantSession91();
      const file = new File(['original bytes'], 'first.jpg', {type:'image/jpeg'});
      a = q.addRestaurantDocument91(a, {id:'doc-a',kind:'food',name:file.name,digest:'a',pageCount:1,file});
      b = q.addRestaurantDocument91(b, {id:'doc-b',kind:'wine',name:'other.jpg',digest:'b',pageCount:1,file:new File(['other bytes'],'other.jpg',{type:'image/jpeg'})});
      await q.writeRestaurantSession91('local-owner-a',a); await q.writeRestaurantSession91('local-owner-b',b);
      const a1 = await q.readRestaurantSession91('local-owner-a'), b1 = await q.readRestaurantSession91('local-owner-b');
      check('Distinct local owners retain separate documents',a1.documents[0].id==='doc-a'&&b1.documents[0].id==='doc-b');
      check('File bytes and name survive real IndexedDB structured cloning',await a1.documents[0].file.text()==='original bytes'&&a1.documents[0].file.name==='first.jpg');
      check('Unknown owner has no inherited session',await q.readRestaurantSession91('local-owner-c')===null);
      a = {...a,pages:a.pages.map(p=>({...p,status:'reading'})),pairs:[{foodId:'x',wineId:'y'}]};
      await q.writeRestaurantSession91('local-owner-a',a);
      const resumed = await q.readRestaurantSession91('local-owner-a');
      check('Interrupted reads reset and stale recommendation filters do not survive reopen',resumed.pages[0].status==='queued'&&resumed.pairs.length===0);
      for(let i=0;i<10;i++)await q.writeRestaurantSession91('local-owner-a',{...a,restaurant:'Update '+i});
      const countFiles = () => new Promise((resolve,reject)=>{const r=indexedDB.open('matchrim.restaurant91',2);r.onsuccess=()=>{const db=r.result,t=db.transaction('files'),c=t.objectStore('files').count();c.onsuccess=()=>resolve(c.result);t.oncomplete=()=>db.close();};r.onerror=reject;});
      check('Metadata updates retain exactly one stored original per document',await countFiles()===2);
      await q.writeRestaurantSession91('local-owner-a',q.createRestaurantSession91());
      check('Delete session removes its original file but preserves another owner',await countFiles()===1&&(await q.readRestaurantSession91('local-owner-b')).documents[0].id==='doc-b');
      return checks;
    }''', compiled)
    browser.close()
(a.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'checks': checks, 'passed': all(row['passed'] for row in checks)}, indent=2))
print(json.dumps({'checks': len(checks), 'failed': [row for row in checks if not row['passed']]}))
raise SystemExit(0 if all(row['passed'] for row in checks) else 1)
