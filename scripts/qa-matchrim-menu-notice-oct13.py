"""Only10 owned menu detection notice: existing scene/contract, local replay, no real recognition."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--output',type=Path,required=True);p.add_argument('--url',default='http://127.0.0.1:4457');p.add_argument('--before',action='store_true');p.add_argument('--entry',choices=['row','pin','both'],default='row')
args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
contract=root/'docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json'
image=root/'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
assert hashlib.sha256(image.read_bytes()).hexdigest()=='2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
wine=json.loads(contract.read_text())['bothContract']['vinos'][1]
UID='00000000-0000-4000-8000-000000000080'
enc=lambda value:base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
session={'user':{'id':UID,'aud':'authenticated','role':'authenticated','email':'qa@matchrim.invalid','app_metadata':{'provider':'email'},'user_metadata':{}},'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':UID,'exp':1900000000})+'.'+enc('synthetic-invalid'),'refresh_token':'synthetic-invalid','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}
paths=[contract,image,root/'src/components/wine-import/WineMenuScanner.tsx',root/'src/components/AccountNotifications.tsx']
(args.output/'input-provenance.json').write_text(json.dumps({'scope':__doc__,'hashes':{str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in paths},'fixture':'Existing04/08/09 BOTH contract and image, no positive profile/catalog or fresh OCR.','before':args.before,'entry':args.entry,'realRemoteAppCalls':0,'paidCalls':0},indent=2)+'\n')
geometry="""() => {
 const d=document.querySelector('[role=dialog]'), title=d?.querySelector('h2'), close=d?.querySelector('[aria-label="Cerrar detalle"]');
 const header=close?.parentElement?.parentElement;
 const toast=[...document.querySelectorAll('[data-sonner-toast]')].find(el=>el.textContent.includes('vinos detectados en la carta'));
 const rect=el=>el?Object.fromEntries(['x','y','width','height','top','bottom','left','right'].map(k=>[k,el.getBoundingClientRect()[k]])):null;
 const intersection=(a,b)=>a&&b?Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)):0;
 const hit=el=>{if(!el)return null;const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;const at=document.elementFromPoint(x,y);return {x,y,reaches:!!at&&(at===el||el.contains(at)),tag:at?.tagName,label:at?.getAttribute('aria-label')};};
 const tr=rect(toast),hr=rect(header),ttl=rect(title);
 return {toast:tr,toastVisible:!!toast&&toast.dataset.visible==='true',toastRemoved:toast?.dataset.removed,header:hr,title:ttl,close:rect(close),headerOverlap:intersection(tr,hr),titleOverlap:intersection(tr,ttl),titleHit:hit(title),closeHit:hit(close),toastAge:performance.now()-(window.__qa10NoticeAt??performance.now()),focus:{inDialog:!!d&&d.contains(document.activeElement),label:document.activeElement?.getAttribute('aria-label'),tag:document.activeElement?.tagName}};
}"""
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for entry_kind,orientation in ((entry,orientation) for entry in (['row','pin'] if args.entry=='both' else [args.entry]) for orientation in ['portrait','landscape']):
            prefix=entry_kind+'-'+orientation
            w,h=(393,852) if orientation=='portrait' else (852,393)
            requests,seen,fulfilled,sockets,errors,console,checks,failures=[],[],[],[],[],[],[],[]
            counters={'ocr':0,'canonical':0,'base':0}
            context=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,reduced_motion='reduce',service_workers='block')
            def reply(route,payload):
                fulfilled.append(route.request.url);route.fulfill(status=200,content_type='application/json',body=json.dumps(payload),headers={'Access-Control-Allow-Origin':'*'})
            def intercept(route):
                req=route.request;url=urlparse(req.url)
                if url.netloc==urlparse(args.url).netloc:return route.continue_()
                requests.append({'method':req.method,'host':url.hostname,'path':url.path})
                if '/auth/v1/user' in url.path:return reply(route,session['user'])
                if '/rest/v1/quiz_results' in url.path:counters['base']+=1;return reply(route,None)
                if '/functions/v1/scan-wine-menu' in url.path:counters['ocr']+=1;return reply(route,{'vinos':[wine],'layout':'rows','coverage':{'status':'reported_complete','extracted_wines':1}})
                if '/functions/v1/' in url.path:counters['canonical']+=1;return reply(route,{'wines':[]})
                return reply(route,[] if '/rest/v1/' in url.path else {})
            def ws_handler(ws):
                local=urlparse(ws.url).netloc==urlparse(args.url).netloc;sockets.append({'host':urlparse(ws.url).hostname,'local':local,'blocked':not local})
                if local:ws.connect_to_server()
                else:ws.close(code=1008,reason='Only10 local fixture')
            context.route('**/*',intercept);context.route_web_socket('**/*',ws_handler)
            context.on('request',lambda req:seen.append(req.url) if urlparse(req.url).netloc!=urlparse(args.url).netloc else None)
            seed={'sb-cbjynrbvrhcmpaojmqdp-auth-token':json.dumps(session),'matchrim.local_profile_owner.v1':UID,'matchrim.onboarding.v2:'+UID:json.dumps({'version':2,'result':'skipped'}),'matchrim.scan_privacy_notice.v2':'accepted'}
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(seed))
            page=context.new_page();page.set_default_timeout(5000)
            page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console.append(re.sub(r'https?://\S+','<URL>',m.text)) if m.type=='error' else None)
            def check(name,passed,detail=None):
                checks.append({'name':name,'passed':bool(passed),'detail':detail})
                if not passed:failures.append(name)
            observations={}
            try:
                page.goto(args.url+'/escanear/carta-vinos',wait_until='networkidle')
                page.evaluate("""async()=>{const {toast}=await import('/src/components/ui/sonner.tsx');window.__qa10Toast=toast;window.__qa10Dismiss=[];const original=toast.dismiss;toast.dismiss=(...args)=>{window.__qa10Dismiss.push({args,at:performance.now()});return original(...args);};const observer=new MutationObserver(()=>{if(window.__qa10NoticeAt===undefined&&[...document.querySelectorAll('[data-sonner-toast]')].some(el=>el.textContent.includes('vinos detectados en la carta')))window.__qa10NoticeAt=performance.now();});observer.observe(document.body,{childList:true,subtree:true});}""")
                page.locator('input[type=file]').first.set_input_files(str(image))
                row=page.get_by_role('button',name=re.compile(r'^Abrir vino \d+:')).first;row.wait_for(timeout=45000)
                notice=page.locator('[data-sonner-toast]').filter(has_text='vinos detectados en la carta');notice.wait_for(state='visible')
                page.screenshot(path=str(args.output/(prefix+'-list-notice.png')))
                observations['historyBefore']=page.evaluate("window.__qa10Toast.getHistory().map(t=>({id:t.id,title:typeof t.title==='string'?t.title:null,type:t.type}))")
                owned=next(item['id'] for item in observations['historyBefore'] if item['title'] and 'vinos detectados en la carta' in item['title'])
                initial=counters.copy();entry=row if entry_kind=='row' else page.get_by_role('button',name=re.compile(r'^Vino 1:')).first
                observations['entry']=entry.get_attribute('aria-label');entry.click()
                dialog=page.get_by_role('dialog');dialog.wait_for(state='visible')
                page.wait_for_function('()=>{const r=document.querySelector("[role=dialog]")?.getBoundingClientRect();return r&&r.top>=0&&r.bottom<=innerHeight+1;}')
                if not args.before:page.wait_for_function("()=>![...document.querySelectorAll('[data-sonner-toast]')].some(el=>el.textContent.includes('vinos detectados en la carta'))",timeout=1800)
                observations['row']=page.evaluate(geometry);observations['dismissAfterRow']=page.evaluate('window.__qa10Dismiss')
                page.screenshot(path=str(args.output/(prefix+'-row-detail.png')))
                check('Measured during original TTL, never waiting for expiry',observations['row']['toastAge']<3500,observations['row']['toastAge'])
                check('Own detection notice does not overlap header',observations['row']['headerOverlap']==0,observations['row'])
                check('Title and close center hit-tests reach their actual controls',observations['row']['titleHit']['reaches'] and observations['row']['closeHit']['reaches'])
                if not args.before:check('Dismissal used only exact owned ID',bool(observations['dismissAfterRow']) and all(item['args']==[owned] for item in observations['dismissAfterRow']),observations['dismissAfterRow'])
                close=dialog.get_by_role('button',name='Cerrar detalle');close.focus()
                check('Close receives keyboard focus',close.evaluate('el=>el===document.activeElement'))
                page.keyboard.press('Tab');observations['tabFocus']=page.evaluate(geometry)['focus']
                check('Tab remains inside open drawer',observations['tabFocus']['inDialog'],observations['tabFocus'])
                close.click();dialog.wait_for(state='hidden')
                check('Close works without force',dialog.count()==0 or not dialog.is_visible())
                count=page.get_by_text('1 resultado',exact=True);check('List result feedback remains',count.count()==1)
                if not args.before:check('List count retains polite live status',count.get_attribute('role')=='status' and count.get_attribute('aria-live')=='polite')
                pin=page.get_by_role('button',name=re.compile(r'^Vino 1:')).first
                observations['pinButtons']=page.get_by_role('button').evaluate_all('els=>els.map(el=>el.getAttribute("aria-label")).filter(s=>s&&/vino|grupo/i.test(s))')
                assert pin.count()==1,'Existing scene must expose its real numbered pin; no row fallback'
                observations['secondPath']=pin.get_attribute('aria-label');pin.click();dialog.wait_for(state='visible')
                page.wait_for_function('()=>{const r=document.querySelector("[role=dialog]")?.getBoundingClientRect();return r&&r.top>=0&&r.bottom<=innerHeight+1;}')
                observations['second']=page.evaluate(geometry)
                page.keyboard.press('Escape');dialog.wait_for(state='hidden')
                check('Escape closes second existing path without force',not dialog.is_visible())
                if not args.before:
                    page.evaluate("window.__qa10Foreign=window.__qa10Toast.warning('QA10: aviso ajeno de control',{id:'qa10-foreign-warning'})")
                    foreign=page.locator('[data-sonner-toast]').filter(has_text='QA10: aviso ajeno de control');foreign.wait_for(state='visible')
                    auditStart=page.evaluate('window.__qa10Dismiss.length');row.click();dialog.wait_for(state='visible')
                    check('Unrelated synthetic warning is not dismissed on reopen',foreign.count()==1 and page.evaluate('window.__qa10Dismiss.length')==auditStart)
                    page.screenshot(path=str(args.output/(prefix+'-foreign-warning-control.png')))
                    dialog.get_by_role('button',name='Cerrar detalle').click();dialog.wait_for(state='hidden')
                check('Open/dismiss caused no extra OCR/catalog/profile reads',counters==initial and counters=={'ocr':1,'canonical':1,'base':1},counters.copy())
                check('No REST or other writes',not any(r['method'] in ['PATCH','DELETE','PUT'] or(r['method']=='POST' and r['path'].startswith('/rest/v1/')) for r in requests))
                check('All nonlocal HTTP/WS intercepted',sorted(seen)==sorted(fulfilled) and all(s['local'] or s['blocked'] for s in sockets))
                check('No runtime/console errors or horizontal overflow',not errors and not console and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            except Exception as error:
                failures.append(str(error));page.screenshot(path=str(args.output/(prefix+'-exception.png')))
            finally:
                results.append({'case':entry_kind+':'+orientation,'passed':not failures,'checks':checks,'failures':failures,'observations':observations,'counters':counters,'requests':requests,'socketAudit':sockets,'errors':errors,'console':console});context.close()
            print(prefix,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    finally:browser.close()
(args.output/'results.json').write_text(json.dumps({'scope':__doc__,'realRemoteAppCalls':0,'paidCalls':0,'realAccounts':0,'results':results},ensure_ascii=False,indent=2)+'\n')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
