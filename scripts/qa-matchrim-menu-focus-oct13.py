"""Only11 actual keyboard/touch focus routes on the existing local menu replay, not native/users/provider QA."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--output',type=Path,required=True);p.add_argument('--url',default='http://127.0.0.1:4458')
p.add_argument('--cases',default='all',help='all, or comma-separated row:Enter:portrait etc.')
args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
contract=root/'docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json'
image=root/'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
assert hashlib.sha256(image.read_bytes()).hexdigest()=='2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
wine=json.loads(contract.read_text())['bothContract']['vinos'][1]
UID='00000000-0000-4000-8000-000000000080'
enc=lambda value:base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
session={'user':{'id':UID,'aud':'authenticated','role':'authenticated','email':'qa@matchrim.invalid','app_metadata':{'provider':'email'},'user_metadata':{}},'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':UID,'exp':1900000000})+'.'+enc('synthetic-invalid'),'refresh_token':'synthetic-invalid','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}
paths=[contract,image,root/'src/components/wine-import/WineMenuScanner.tsx',root/'src/components/ui/drawer.tsx']
(args.output/'input-provenance.json').write_text(json.dumps({'scope':__doc__,'hashes':{str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in paths},'fixture':'Existing04/08/09/10 image and BOTH contract, no new OCR/profile-positive/catalog truth','cases':args.cases},indent=2)+'\n')
snapshot=r"""() => {
 const el=document.activeElement,d=document.querySelector('[role=dialog]'),label=el?.getAttribute('aria-label');
 const identify=node=>node?{tag:node.tagName,id:node.id,label:node.getAttribute('aria-label'),text:node.textContent?.trim().slice(0,100),connected:node.isConnected}:null;
 const references=attribute=>(d?.getAttribute(attribute)||'').split(/\s+/).filter(Boolean).map(id=>identify(document.getElementById(id)));
 const hit=node=>{if(!node)return null;const r=node.getBoundingClientRect(),at=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{reaches:!!at&&(at===node||node.contains(at)),rect:{x:r.x,y:r.y,width:r.width,height:r.height}};};
 return {active:identify(el),inDialog:!!d&&d.contains(el),dialog:identify(d),labelledby:references('aria-labelledby'),describedby:references('aria-describedby'),closeHit:hit(d?.querySelector('[aria-label="Cerrar detalle"]')),scroll:{x:scrollX,y:scrollY},noticePresent:[...document.querySelectorAll('[data-sonner-toast]')].some(t=>t.textContent.includes('vinos detectados en la carta'))};
}"""
cases=[(entry,method,orientation) for entry in ['row','pin'] for method in ['Enter','Space','touch'] for orientation in ['portrait','landscape']]
if args.cases!='all':cases=[tuple(case.split(':')) for case in args.cases.split(',')]
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for entry,method,orientation in cases:
            key='-'.join([entry,method,orientation]);w,h=(393,852) if orientation=='portrait' else (852,393)
            requests,seen,fulfilled,sockets,errors,console,checks,failures=[],[],[],[],[],[],[],[];observations={};counters={'ocr':0,'canonical':0,'base':0}
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
                else:ws.close(code=1008,reason='Only11 local fixture')
            context.route('**/*',intercept);context.route_web_socket('**/*',ws_handler)
            context.on('request',lambda req:seen.append(req.url) if urlparse(req.url).netloc!=urlparse(args.url).netloc else None)
            seed={'sb-cbjynrbvrhcmpaojmqdp-auth-token':json.dumps(session),'matchrim.local_profile_owner.v1':UID,'matchrim.onboarding.v2:'+UID:json.dumps({'version':2,'result':'skipped'}),'matchrim.scan_privacy_notice.v2':'accepted'}
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(seed))
            page=context.new_page();page.set_default_timeout(6000)
            page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console.append(re.sub(r'https?://\S+','<URL>',m.text)) if m.type=='error' else None)
            def check(name,passed,detail=None):
                checks.append({'name':name,'passed':bool(passed),'detail':detail})
                if not passed:failures.append(name)
            def tab_to(target,limit=90):
                trace=[]
                for _ in range(limit):
                    if target.evaluate('el=>el===document.activeElement'):return trace
                    page.keyboard.press('Tab');trace.append(page.evaluate(snapshot))
                raise AssertionError('Real Tab navigation did not reach requested target')
            def open_from(trigger):
                if method=='touch':trigger.tap()
                else:
                    observations.setdefault('triggerTabTraces',[]).append(tab_to(trigger))
                    assert trigger.evaluate('el=>el===document.activeElement')
                    page.keyboard.press('Enter' if method=='Enter' else 'Space')
                immediate=page.evaluate(snapshot)
                dialog=page.get_by_role('dialog');dialog.wait_for(state='visible')
                page.wait_for_function('()=>{const r=document.querySelector("[role=dialog]")?.getBoundingClientRect();return r&&r.top>=0&&r.bottom<=innerHeight+1;}')
                page.wait_for_timeout(100)
                return immediate,page.evaluate(snapshot)
            try:
                page.goto(args.url+'/escanear/carta-vinos',wait_until='networkidle')
                page.evaluate("""()=>{window.__qa11Events=[];for(const kind of ['keydown','pointerdown'])document.addEventListener(kind,e=>{const label=e.target?.closest('button')?.getAttribute('aria-label');window.__qa11Events.push({kind,key:e.key||null,pointerType:e.pointerType||null,label,scroll:{x:scrollX,y:scrollY}});},{capture:true,passive:true});}""")
                page.locator('input[type=file]').first.set_input_files(str(image))
                row=page.get_by_role('button',name=re.compile(r'^Abrir vino \d+:')).first;row.wait_for(timeout=45000)
                trigger=row if entry=='row' else page.get_by_role('button',name=re.compile(r'^Vino 1:')).first
                trigger.wait_for(state='visible');initial=counters.copy()
                observations['trigger']={'label':trigger.get_attribute('aria-label'),'method':method}
                observations['immediate'],observations['settled']=open_from(trigger)
                observations['openingEvent']=page.evaluate("label=>window.__qa11Events.findLast(e=>e.label===label&&(e.kind==='pointerdown'||e.key==='Enter'||e.key===' '))",observations['trigger']['label'])
                page.screenshot(path=str(args.output/(key+'-opened.png')))
                check('Settled initial focus enters own modal without harness focus',observations['settled']['inDialog'],observations['settled'])
                check('Dialog accessible title and description resolve',bool(observations['settled']['labelledby']) and bool(observations['settled']['describedby']) and all(r and r['connected'] and r['text'] for r in observations['settled']['labelledby']+observations['settled']['describedby']))
                check('Initial focus is not an editing field',observations['settled']['active']['tag'] not in ['INPUT','TEXTAREA','SELECT'])
                check('Entering modal focus does not jump initiating page scroll',observations['openingEvent'] is not None and abs(observations['settled']['scroll']['y']-observations['openingEvent']['scroll']['y'])<2,observations['openingEvent'])
                page.keyboard.press('Tab');observations['firstTab']=page.evaluate(snapshot)
                page.keyboard.press('Shift+Tab');observations['firstShiftTab']=page.evaluate(snapshot)
                cycle=[]
                for _ in range(5):page.keyboard.press('Tab');cycle.append(page.evaluate(snapshot))
                for _ in range(5):page.keyboard.press('Shift+Tab');cycle.append(page.evaluate(snapshot))
                observations['cycle']=cycle
                check('First Tab and ShiftTab stay in modal',observations['firstTab']['inDialog'] and observations['firstShiftTab']['inDialog'])
                check('Real forward/backward cycle stays within modal',all(item['inDialog'] for item in cycle))
                check('Close button center remains hit-reachable',observations['settled']['closeHit']['reaches'])
                check('Micro10: own notice absent at detail opening',not observations['settled']['noticePresent'])
                observations['beforeEscape']=page.evaluate(snapshot);page.keyboard.press('Escape');page.get_by_role('dialog').wait_for(state='hidden');page.wait_for_timeout(100)
                observations['afterEscape']=page.evaluate(snapshot)
                observations['escapeReturned']=trigger.evaluate('el=>el===document.activeElement')
                page.screenshot(path=str(args.output/(key+'-escape-return.png')))
                check('Escape returns exact original row/pin',observations['escapeReturned'],observations['afterEscape'])
                check('Escape return does not jump page scroll',abs(observations['afterEscape']['scroll']['y']-observations['settled']['scroll']['y'])<2)
                observations['reopenImmediate'],observations['reopenSettled']=open_from(trigger)
                close=page.get_by_role('dialog').get_by_role('button',name='Cerrar detalle')
                if method=='touch':close.tap()
                else:
                    observations['closeTabTrace']=tab_to(close,40);page.keyboard.press('Enter')
                page.get_by_role('dialog').wait_for(state='hidden');page.wait_for_timeout(100)
                observations['afterClose']=page.evaluate(snapshot);observations['closeReturned']=trigger.evaluate('el=>el===document.activeElement')
                page.screenshot(path=str(args.output/(key+'-close-return.png')))
                check('Close returns exact original row/pin, no injected focus',observations['closeReturned'],observations['afterClose'])
                check('Close return preserves page scroll',abs(observations['afterClose']['scroll']['y']-observations['reopenSettled']['scroll']['y'])<2)
                check('Focus lifecycle causes no additional OCR/catalog/profile read',counters==initial and counters=={'ocr':1,'canonical':1,'base':1},counters.copy())
                check('No REST/feedback/history/stock/profile writes',not any(r['method'] in ['PATCH','DELETE','PUT'] or(r['method']=='POST' and r['path'].startswith('/rest/v1/')) for r in requests))
                check('All nonlocal HTTP/WS intercepted',sorted(seen)==sorted(fulfilled) and all(item['local'] or item['blocked'] for item in sockets))
                check('No runtime/console error or mobile overflow',not errors and not console and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                observations['inputEvents']=page.evaluate('window.__qa11Events')
            except Exception as error:
                failures.append(str(error));page.screenshot(path=str(args.output/(key+'-exception.png')))
            finally:
                results.append({'case':key,'passed':not failures,'checks':checks,'failures':failures,'observations':observations,'counters':counters,'requests':requests,'socketAudit':sockets,'errors':errors,'console':console});context.close()
                (args.output/'results.json').write_text(json.dumps({'scope':__doc__,'realRemoteAppCalls':0,'paidCalls':0,'realAccounts':0,'results':results},ensure_ascii=False,indent=2)+'\n')
            print(key,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    finally:browser.close()
raise SystemExit(0 if all(result['passed'] for result in results) else 1)
