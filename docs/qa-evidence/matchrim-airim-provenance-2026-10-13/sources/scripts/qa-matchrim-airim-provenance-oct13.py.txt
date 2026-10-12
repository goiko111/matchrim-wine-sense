"""Only09 guide language: same existing scene/contract, invalid fake auth and SDK read-only interception."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--output',type=Path,required=True);p.add_argument('--url',default='http://127.0.0.1:4456')
args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
contract=root/'docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json'
image=root/'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
assert hashlib.sha256(image.read_bytes()).hexdigest()=='2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
wine=json.loads(contract.read_text())['bothContract']['vinos'][1]
UID='00000000-0000-4000-8000-000000000080'
enc=lambda v:base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
session={'user':{'id':UID,'aud':'authenticated','role':'authenticated','email':'qa@matchrim.invalid','app_metadata':{'provider':'email'},'user_metadata':{}},'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':UID,'exp':1900000000})+'.'+enc('synthetic-invalid'),'refresh_token':'synthetic-invalid','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}
files=[contract,image,root/'src/utils/aiRimContextGuide.ts',root/'src/components/wine-import/WineMenuScanner.tsx']
(args.output/'input-provenance.json').write_text(json.dumps({'scope':__doc__,'hashes':{str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in files},'fixture':'Existing04 syntheticBOTH and one image, not fresh recognition; high signal/inference, no matched catalog, no profile-positive UI data.','realRemoteAppCalls':0,'paidCalls':0},indent=2)+'\n')
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for orientation in ['portrait','landscape']:
            w,h=(393,852) if orientation=='portrait' else (852,393)
            requests,seen,fulfilled,sockets,errors,console,checks,failures=[],[],[],[],[],[],[],[]
            counters={'ocr':0,'canonical':0,'base':0}
            context=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,reduced_motion='reduce',service_workers='block')
            def reply(route,payload,status=200):
                fulfilled.append(route.request.url);route.fulfill(status=status,content_type='application/json',body=json.dumps(payload),headers={'Access-Control-Allow-Origin':'*'})
            def intercept(route):
                req=route.request;url=urlparse(req.url)
                if url.netloc==urlparse(args.url).netloc:return route.continue_()
                requests.append({'method':req.method,'host':url.hostname,'path':url.path})
                if '/auth/v1/user' in url.path:return reply(route,session['user'])
                if '/rest/v1/quiz_results' in url.path:counters['base']+=1;return reply(route,None)
                if '/functions/v1/scan-wine-menu' in url.path:
                    counters['ocr']+=1;return reply(route,{'vinos':[wine],'layout':'rows','coverage':{'status':'reported_complete','extracted_wines':1}})
                if '/functions/v1/' in url.path:counters['canonical']+=1;return reply(route,{'wines':[]})
                return reply(route,[] if '/rest/v1/' in url.path else {})
            def ws_handler(ws):
                local=urlparse(ws.url).netloc==urlparse(args.url).netloc
                sockets.append({'host':urlparse(ws.url).hostname,'local':local,'blocked':not local})
                if local:ws.connect_to_server()
                else:ws.close(code=1008,reason='Only09 local fixture')
            context.route('**/*',intercept);context.route_web_socket('**/*',ws_handler)
            context.on('request',lambda req:seen.append(req.url) if urlparse(req.url).netloc!=urlparse(args.url).netloc else None)
            seed={'sb-cbjynrbvrhcmpaojmqdp-auth-token':json.dumps(session),'matchrim.local_profile_owner.v1':UID,'matchrim.onboarding.v2:'+UID:json.dumps({'version':2,'result':'skipped'}),'matchrim.scan_privacy_notice.v2':'accepted'}
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(seed))
            page=context.new_page();page.set_default_timeout(6500)
            page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console.append(re.sub(r'https?://\S+','<URL>',m.text)) if m.type=='error' else None)
            def check(name,passed,detail=None):
                checks.append({'name':name,'passed':bool(passed),'detail':detail})
                if not passed:failures.append(name)
            observed=''
            try:
                page.goto(args.url+'/escanear/carta-vinos',wait_until='networkidle')
                page.locator('input[type=file]').first.set_input_files(str(image))
                row=page.get_by_role('button',name=re.compile(r'^Abrir vino \d+:')).first;row.wait_for(timeout=45000)
                before_counters=counters.copy();row.click()
                dialog=page.get_by_role('dialog');dialog.wait_for(state='visible')
                page.wait_for_function('()=>{const r=document.querySelector("[role=dialog]")?.getBoundingClientRect();return r&&r.top>=0&&r.bottom<=innerHeight+1;}')
                guide=dialog.locator('[data-testid="airim-context-guide"]');guide.scroll_into_view_if_needed();page.wait_for_timeout(300)
                observed=guide.inner_text()
                check('High inference signal is not confirmed identity',not re.search(r'\b(?:confirmad[oa]|verificad[oa])\b|Identidad lista',observed,re.I),observed)
                check('Guide explicitly presents a reading/candidate',bool(re.search(r'candidat[oa]|lectura|referencia propuesta',observed,re.I)))
                check('Guide explains non-proof of bottle/vintage',bool(re.search(r'botella|añada|annada',observed,re.I)) and bool(re.search(r'no (?:acredita|verifica|demuestra)|no es.*verificacion|no equivale',observed,re.I)))
                check('Affinity remains pending, no invented personal score',bool(re.search(r'afinidad pendiente',observed,re.I)) and not re.search(r'Afinidad orientativa.*%',observed,re.I))
                check('Guide has an accessible section heading',guide.get_by_role('heading').count()==1 and bool(guide.get_attribute('aria-labelledby')))
                check('Guide text fits without overlap',guide.evaluate('el=>{const b=el.getBoundingClientRect();return [...el.querySelectorAll("p,h4,li")].every(p=>{const r=p.getBoundingClientRect();return r.left>=b.left&&r.right<=b.right+1;});}'))
                guide.screenshot(path=str(args.output/(orientation+'-guide.png')))
                page.screenshot(path=str(args.output/(orientation+'-viewport.png')))
                check('Language causes no extra OCR/canonical/profile read',counters==before_counters and counters=={'ocr':1,'canonical':1,'base':1},counters.copy())
                check('No DB/feedback/history/profile/stock writes',not any(r['method'] in ['PATCH','DELETE','PUT'] or(r['method']=='POST' and r['path'].startswith('/rest/v1/')) for r in requests))
                check('Every nonlocal request intercepted',sorted(seen)==sorted(fulfilled))
                check('No runtime errors or mobile overflow',not errors and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            except Exception as error:
                failures.append(str(error));page.screenshot(path=str(args.output/(orientation+'-exception.png')))
            finally:
                results.append({'case':orientation,'passed':not failures,'checks':checks,'failures':failures,'observed':observed,'counters':counters,'requests':requests,'socketAudit':sockets,'errors':errors,'console':console});context.close()
            print(orientation,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    finally:browser.close()
(args.output/'results.json').write_text(json.dumps({'scope':__doc__,'realRemoteAppCalls':0,'paidCalls':0,'realAccounts':0,'results':results},ensure_ascii=False,indent=2)+'\n')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
