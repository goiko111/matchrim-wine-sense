"""Only12 multi-fiche navigation on exact existing four-candidate contract; local replay, not people/recognition."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--output',type=Path,required=True);p.add_argument('--url',default='http://127.0.0.1:4459')
args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
contract=root/'docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json'
photo=root/'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
assert hashlib.sha256(contract.read_bytes()).hexdigest()=='1c6d8bd4e5d9aa392f476a66ba7a86e8c6a055f752110f3bef008450c6de6e9e'
assert hashlib.sha256(photo.read_bytes()).hexdigest()=='2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
response=json.loads(contract.read_text())['bothContract']
UID='00000000-0000-4000-8000-000000000080'
enc=lambda value:base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
session={'user':{'id':UID,'aud':'authenticated','role':'authenticated','email':'qa@matchrim.invalid','app_metadata':{'provider':'email'},'user_metadata':{}},'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':UID,'exp':1900000000})+'.'+enc('synthetic-invalid'),'refresh_token':'synthetic-invalid','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}
paths=[contract,photo,root/'src/components/wine-import/WineMenuScanner.tsx']
(args.output/'input-provenance.json').write_text(json.dumps({'scope':__doc__,'hashes':{str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in paths},'responseSha256':hashlib.sha256(json.dumps(response,sort_keys=True,ensure_ascii=False).encode()).hexdigest(),'contractCandidates':4,'caseCount':8,'note':'Entire existing bothContract unchanged; one scene, no additional truth/profile/provider.'},indent=2)+'\n')
snapshot=r"""() => {
 const dialog=document.querySelector('[role=dialog]'),active=document.activeElement;
 const identify=el=>el?{tag:el.tagName,label:el.getAttribute('aria-label'),text:el.textContent?.trim().slice(0,110),disabled:el instanceof HTMLButtonElement?el.disabled:false,connected:el.isConnected}:null;
 const buttons=[...(dialog?.querySelectorAll('button')||[])],previous=buttons.find(b=>b.textContent.trim()==='Anterior'),next=buttons.find(b=>b.textContent.trim()==='Siguiente');
 const title=dialog?.querySelector('h2'),titleText=title?.textContent.trim()||'',index=Number(titleText.match(/^(\d+)\./)?.[1]||0)-1;
 const refs=attribute=>(dialog?.getAttribute(attribute)||'').split(/\s+/).filter(Boolean).map(id=>{const el=document.getElementById(id);return {id,...identify(el)};});
 const hit=el=>{if(!el)return null;const r=el.getBoundingClientRect(),at=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{reaches:!!at&&(at===el||el.contains(at)),rect:{x:r.x,y:r.y,width:r.width,height:r.height}};};
 return {index,title:titleText,labelledby:refs('aria-labelledby'),describedby:refs('aria-describedby'),active:identify(active),inDialog:!!dialog&&dialog.contains(active),sameDialog:!!dialog&&dialog===window.__qa12Dialog,previous:identify(previous),next:identify(next),hits:{close:hit(dialog?.querySelector('[aria-label="Cerrar detalle"]')),previous:hit(previous),next:hit(next)},scroll:{x:scrollX,y:scrollY},bodyScroll:dialog?.querySelector('.overflow-y-auto')?.scrollTop??null};
}"""
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for entry,method,orientation in ((entry,method,orientation) for entry in ['row','cluster'] for method in ['keyboard','touch'] for orientation in ['portrait','landscape']):
            key='-'.join([entry,method,orientation]);w,h=(393,852) if orientation=='portrait' else (852,393)
            requests,seen,fulfilled,sockets,errors,console,checks,failures=[],[],[],[],[],[],[],[];observed={};counters={'ocr':0,'canonical':0,'base':0}
            context=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,reduced_motion='reduce',service_workers='block')
            def reply(route,payload):
                fulfilled.append(route.request.url);route.fulfill(status=200,content_type='application/json',body=json.dumps(payload),headers={'Access-Control-Allow-Origin':'*'})
            def intercept(route):
                req=route.request;url=urlparse(req.url)
                if url.netloc==urlparse(args.url).netloc:return route.continue_()
                requests.append({'method':req.method,'host':url.hostname,'path':url.path})
                if '/auth/v1/user' in url.path:return reply(route,session['user'])
                if '/rest/v1/quiz_results' in url.path:counters['base']+=1;return reply(route,None)
                if '/functions/v1/scan-wine-menu' in url.path:counters['ocr']+=1;return reply(route,response)
                if '/functions/v1/' in url.path:counters['canonical']+=1;return reply(route,{'wines':[]})
                return reply(route,[] if '/rest/v1/' in url.path else {})
            def ws_handler(ws):
                local=urlparse(ws.url).netloc==urlparse(args.url).netloc;sockets.append({'host':urlparse(ws.url).hostname,'local':local,'blocked':not local})
                if local:ws.connect_to_server()
                else:ws.close(code=1008,reason='Only12 local replay')
            context.route('**/*',intercept);context.route_web_socket('**/*',ws_handler)
            context.on('request',lambda req:seen.append(req.url) if urlparse(req.url).netloc!=urlparse(args.url).netloc else None)
            seed={'sb-cbjynrbvrhcmpaojmqdp-auth-token':json.dumps(session),'matchrim.local_profile_owner.v1':UID,'matchrim.onboarding.v2:'+UID:json.dumps({'version':2,'result':'skipped'}),'matchrim.scan_privacy_notice.v2':'accepted'}
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(seed))
            page=context.new_page();page.set_default_timeout(6000)
            page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console.append(re.sub(r'https?://\S+','<URL>',m.text)) if m.type=='error' else None)
            def check(name,passed,detail=None):
                checks.append({'name':name,'passed':bool(passed),'detail':detail})
                if not passed:failures.append(name)
            def tab_to(target,limit=80):
                trace=[]
                for _ in range(limit):
                    if target.evaluate('el=>el===document.activeElement'):return trace
                    page.keyboard.press('Tab');trace.append(page.evaluate(snapshot)['active'])
                raise AssertionError('Tab cannot reach actual requested button')
            def activate(target,key_name='Enter'):
                if method=='touch':target.tap()
                else:observed.setdefault('tabTraces',[]).append(tab_to(target));page.keyboard.press(key_name)
            def settle(index):
                page.wait_for_function("index=>{const d=document.querySelector('[role=dialog]'),t=d?.querySelector('h2')?.textContent||'',r=d?.getBoundingClientRect();return t.startsWith((index+1)+'. ')&&r&&r.top>=0&&r.bottom<=innerHeight+1;}",arg=index)
                return page.evaluate(snapshot)
            def verify_context(label,state):
                index=state['index'];expected=response['vinos'][index]
                check(label+': exact current index/name/title',state['title']==str(index+1)+'. '+expected['nombre'],state['title'])
                description=' '.join(r.get('text','') for r in state['describedby'])
                check(label+': current description and labelled title agree',expected['productor'] in description and expected['region'] in description and any(r.get('text')==state['title'] for r in state['labelledby']),description)
                check(label+': boundary buttons are correct',state['previous']['disabled']==(index==0) and state['next']['disabled']==(index==3))
                check(label+': focus remains interior and enabled',state['inDialog'] and not state['active']['disabled'],state['active'])
                check(label+': same modal and no Close autofocus reset',state['sameDialog'])
                check(label+': enabled controls hit-reachable',state['hits']['close']['reaches'] and (state['previous']['disabled'] or state['hits']['previous']['reaches']) and (state['next']['disabled'] or state['hits']['next']['reaches']))
            try:
                page.goto(args.url+'/escanear/carta-vinos',wait_until='networkidle')
                page.evaluate("""()=>{window.__qa12Events=[];for(const kind of ['keydown','pointerdown'])document.addEventListener(kind,e=>window.__qa12Events.push({kind,key:e.key||null,pointerType:e.pointerType||null,label:e.target?.closest('button')?.getAttribute('aria-label')||e.target?.closest('button')?.textContent.trim()||null}),{capture:true,passive:true});}""")
                page.locator('input[type=file]').first.set_input_files(str(photo))
                rows=page.get_by_role('button',name=re.compile(r'^Abrir vino \d+:'));rows.first.wait_for(timeout=45000)
                observed['runtimeRows']=rows.evaluate_all("els=>els.map(el=>el.getAttribute('aria-label'))")
                check('Exact full four-candidate contract appears in runtime rows',observed['runtimeRows']==['Abrir vino '+str(i+1)+': '+wine['nombre'] for i,wine in enumerate(response['vinos'])],observed['runtimeRows'])
                cluster=page.get_by_role('button',name=re.compile(r'^Grupo de 3 vinos:')).first
                observed['runtimePins']=page.get_by_role('button').evaluate_all("els=>els.map(el=>el.getAttribute('aria-label')).filter(label=>label&&/^(Vino|Grupo)/.test(label))")
                assert cluster.count()==1,'Existing real cluster required, never fabricate coordinates'
                original=page.get_by_role('button',name='Abrir vino 2: Barbaresco Marchesi di Barolo',exact=True) if entry=='row' else cluster
                observed['originalTrigger']=original.get_attribute('aria-label');initial=counters.copy()
                activate(original,'Enter' if entry=='row' else 'Space');page.get_by_role('dialog').wait_for(state='visible')
                page.evaluate("window.__qa12Dialog=document.querySelector('[role=dialog]')")
                state=settle(1 if entry=='row' else 3);observed['initial']=state;verify_context('initial',state)
                page.screenshot(path=str(args.output/(key+'-initial.png')))
                transitions=[]
                path=[2,3,2,1,0,1,2] if entry=='row' else [2,1,2,3,2,1,0,1,2]
                for step,destination in enumerate(path):
                    previous=state;direction='Siguiente' if destination>state['index'] else 'Anterior'
                    button=page.get_by_role('dialog').get_by_role('button',name=direction,exact=True)
                    activate(button,'Enter' if step%2==0 else 'Space')
                    immediate=page.evaluate(snapshot);state=settle(destination)
                    transitions.append({'destination':destination,'direction':direction,'before':previous,'immediate':immediate,'settled':state})
                    verify_context('step'+str(step),state)
                    check('step'+str(step)+': no reset to Close after explicit navigation',state['active']['label']!='Cerrar detalle',state['active'])
                    check('step'+str(step)+': page scroll stays unchanged',state['scroll']==previous['scroll'],{'before':previous['scroll'],'after':state['scroll']})
                    if destination in [0,3]:page.screenshot(path=str(args.output/(key+'-boundary-'+str(destination)+'.png')))
                observed['transitions']=transitions
                cycle=[]
                for _ in range(4):page.keyboard.press('Tab');cycle.append(page.evaluate(snapshot))
                for _ in range(4):page.keyboard.press('Shift+Tab');cycle.append(page.evaluate(snapshot))
                observed['cycle']=cycle;check('Multificha Tab/ShiftTab cycle never exits modal or disabled control',all(s['inDialog'] and not s['active']['disabled'] for s in cycle))
                page.keyboard.press('Escape');page.get_by_role('dialog').wait_for(state='hidden');page.wait_for_timeout(100)
                observed['escapeReturn']={'exact':original.evaluate('el=>el===document.activeElement'),'state':page.evaluate(snapshot)}
                check('Escape returns external original trigger, not changed selected wine',observed['escapeReturn']['exact'],observed['escapeReturn']['state']['active'])
                page.screenshot(path=str(args.output/(key+'-original-return.png')))
                alternate=page.get_by_role('button',name='Vino 1: Lugana Allegrini',exact=True)
                observed['alternateTrigger']=alternate.get_attribute('aria-label');activate(alternate,'Space')
                page.get_by_role('dialog').wait_for(state='visible');page.evaluate("window.__qa12Dialog=document.querySelector('[role=dialog]')")
                observed['reopened']=settle(0);verify_context('reopened',observed['reopened'])
                close=page.get_by_role('dialog').get_by_role('button',name='Cerrar detalle');activate(close,'Enter')
                page.get_by_role('dialog').wait_for(state='hidden');page.wait_for_timeout(100)
                observed['alternateReturn']={'exact':alternate.evaluate('el=>el===document.activeElement'),'original':original.evaluate('el=>el===document.activeElement'),'state':page.evaluate(snapshot)}
                check('Reopened session returns its own new pin, not old opener',observed['alternateReturn']['exact'] and not observed['alternateReturn']['original'],observed['alternateReturn']['state']['active'])
                page.screenshot(path=str(args.output/(key+'-new-return.png')))
                check('All navigation leaves existing request counts unchanged',counters==initial,counters.copy())
                check('No REST/history/profile/stock/feedback writes',not any(r['method'] in ['PATCH','DELETE','PUT'] or(r['method']=='POST' and r['path'].startswith('/rest/v1/')) for r in requests))
                check('All nonlocal HTTP and WS intercepted',sorted(seen)==sorted(fulfilled) and all(s['local'] or s['blocked'] for s in sockets))
                check('No runtime/console errors or mobile overflow',not errors and not console and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                observed['inputEvents']=page.evaluate('window.__qa12Events')
            except Exception as error:
                failures.append(str(error));page.screenshot(path=str(args.output/(key+'-exception.png')))
            finally:
                results.append({'case':key,'passed':not failures,'checks':checks,'failures':failures,'observations':observed,'counters':counters,'requests':requests,'socketAudit':sockets,'errors':errors,'console':console});context.close()
                (args.output/'results.json').write_text(json.dumps({'scope':__doc__,'realRemoteAppCalls':0,'paidCalls':0,'realAccounts':0,'results':results},ensure_ascii=False,indent=2)+'\n')
            print(key,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    finally:browser.close()
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
