"""Only13 actual native-key reading/scroll of existing menu body; no new content, provider/users/native QA."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--url',default='http://127.0.0.1:4460')
args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
fixture=root/'docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json'
photo=root/'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
assert hashlib.sha256(fixture.read_bytes()).hexdigest()=='1c6d8bd4e5d9aa392f476a66ba7a86e8c6a055f752110f3bef008450c6de6e9e'
assert hashlib.sha256(photo.read_bytes()).hexdigest()=='2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
response=json.loads(fixture.read_text())['bothContract']
UID='00000000-0000-4000-8000-000000000080'
enc=lambda value:base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
session={'user':{'id':UID,'aud':'authenticated','role':'authenticated','email':'qa@matchrim.invalid','app_metadata':{'provider':'email'},'user_metadata':{}},'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':UID,'exp':1900000000})+'.'+enc('synthetic-invalid'),'refresh_token':'synthetic-invalid','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}
paths=[fixture,photo,root/'src/components/wine-import/WineMenuScanner.tsx']
(args.output/'input-provenance.json').write_text(json.dumps({'scope':__doc__,'hashes':{str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in paths},'contractCandidates':4,'input':'Exact same entire bothContract emitted per local invocation; no role/focus/scroll/body/text injection.'},indent=2)+'\n')
snapshot=r"""() => {
 const dialog=document.querySelector('[role=dialog]'),body=dialog?.querySelector('.overflow-y-auto'),active=document.activeElement;
 const identify=el=>el?{tag:el.tagName,label:el.getAttribute('aria-label'),role:el.getAttribute('role'),text:el.textContent?.trim().slice(0,100),disabled:el instanceof HTMLButtonElement?el.disabled:false}:null;
 const rect=el=>el?Object.fromEntries(['x','y','width','height','top','bottom','left','right'].map(k=>[k,el.getBoundingClientRect()[k]])):null;
 const fragment=[...(body?.querySelectorAll('p')||[])].at(-1),b=rect(body),f=rect(fragment),at=f?document.elementFromPoint(f.left+f.width/2,f.top+f.height/2):null;
 const visible=!!b&&!!f&&f.top>=b.top-2&&f.bottom<=b.bottom+2&&f.left>=b.left-2&&f.right<=b.right+2&&f.top>=0&&f.bottom<=innerHeight;
 const title=dialog?.querySelector('h2')?.textContent.trim()||'',index=Number(title.match(/^(\d+)\./)?.[1]||0)-1;
 return {index,title,active:identify(active),inDialog:!!dialog&&dialog.contains(active),bodyFocused:active===body,document:{x:scrollX,y:scrollY},body:body?{scrollHeight:body.scrollHeight,clientHeight:body.clientHeight,scrollTop:body.scrollTop,max:Math.max(0,body.scrollHeight-body.clientHeight),overflow:body.scrollHeight>body.clientHeight+1,tabIndex:body.tabIndex,role:body.getAttribute('role'),label:body.getAttribute('aria-label'),rect:b}:null,fragment:fragment?{text:fragment.textContent.trim(),rect:f,fullyVisible:visible,hitReachable:!!at&&(at===fragment||fragment.contains(at))}:null};
}"""
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for entry,orientation in ((entry,orientation) for entry in ['row','cluster'] for orientation in ['portrait','landscape']):
            key=entry+'-'+orientation;w,h=(393,852) if orientation=='portrait' else (852,393)
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
                else:ws.close(code=1008,reason='Only13 local replay')
            context.route('**/*',intercept);context.route_web_socket('**/*',ws_handler)
            context.on('request',lambda req:seen.append(req.url) if urlparse(req.url).netloc!=urlparse(args.url).netloc else None)
            seed={'sb-cbjynrbvrhcmpaojmqdp-auth-token':json.dumps(session),'matchrim.local_profile_owner.v1':UID,'matchrim.onboarding.v2:'+UID:json.dumps({'version':2,'result':'skipped'}),'matchrim.scan_privacy_notice.v2':'accepted'}
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(seed))
            page=context.new_page();page.set_default_timeout(6000)
            page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console.append(re.sub(r'https?://\S+','<URL>',m.text)) if m.type=='error' else None)
            def check(name,passed,detail=None):
                checks.append({'name':name,'passed':bool(passed),'detail':detail})
                if not passed:failures.append(name)
            def tab_to(target,reverse=False,limit=80):
                trace=[]
                for _ in range(limit):
                    if target.evaluate('el=>el===document.activeElement'):return trace
                    page.keyboard.press('Shift+Tab' if reverse else 'Tab');trace.append(page.evaluate(snapshot)['active'])
                raise AssertionError('Actual Tab did not reach target')
            def press(key_name):
                before=page.evaluate(snapshot);page.keyboard.press(key_name);page.wait_for_timeout(200);after=page.evaluate(snapshot)
                observed.setdefault('keyTrace',[]).append({'key':key_name,'before':before,'after':after});return after
            def settle(index):
                page.wait_for_function("index=>{const d=document.querySelector('[role=dialog]'),r=d?.getBoundingClientRect();return d?.querySelector('h2')?.textContent.startsWith((index+1)+'. ')&&r&&r.top>=0&&r.bottom<=innerHeight+1;}",arg=index)
            def ax_body():
                try:
                    cdp=context.new_cdp_session(page);doc=cdp.send('DOM.getDocument',{'depth':1});node=cdp.send('DOM.querySelector',{'nodeId':doc['root']['nodeId'],'selector':'[role=dialog] .overflow-y-auto'})
                    tree=cdp.send('Accessibility.getPartialAXTree',{'nodeId':node['nodeId'],'fetchRelatives':False});cdp.detach()
                    return {'available':True,'nodes':[{'role':n.get('role',{}).get('value'),'name':n.get('name',{}).get('value'),'ignored':n.get('ignored'),'properties':n.get('properties',[])} for n in tree.get('nodes',[])]}
                except Exception as error:return {'available':False,'reason':str(error)}
            def read_body(body,label):
                initial=page.evaluate(snapshot)
                if not initial['body']['overflow']:
                    observed.setdefault('notApplicable',[]).append({'state':label,'reason':'No actual overflow; no content stretching or tabindex injection','snapshot':initial})
                    check(label+': no-overflow final fragment already visible',initial['fragment']['fullyVisible'])
                    return
                observed.setdefault('bodyTabTraces',[]).append(tab_to(body))
                check(label+': actual Tab reaches body',page.evaluate(snapshot)['bodyFocused'])
                home=press('Home');arrow=press('ArrowDown')
                check(label+': ArrowDown scrolls body, not document',arrow['body']['scrollTop']>home['body']['scrollTop'] and arrow['document']==home['document'])
                page_down=press('PageDown')
                check(label+': PageDown advances body with focus retained',page_down['body']['scrollTop']>=arrow['body']['scrollTop'] and page_down['bodyFocused'] and page_down['document']==home['document'])
                page_up=press('PageUp')
                check(label+': PageUp returns within body',page_up['body']['scrollTop']<page_down['body']['scrollTop'] and page_up['document']==home['document'])
                end=press('End')
                check(label+': End reaches real final fragment',end['body']['scrollTop']>=end['body']['max']-2 and end['fragment']['fullyVisible'] and end['fragment']['hitReachable'] and end['document']==home['document'],end)
                page.screenshot(path=str(args.output/(key+'-'+label+'-bottom.png')))
                up=press('ArrowUp')
                check(label+': ArrowUp moves body up, not background',up['body']['scrollTop']<end['body']['scrollTop'] and up['bodyFocused'] and up['document']==home['document'])
                start=press('Home')
                check(label+': Home returns top without page jump',start['body']['scrollTop']<=2 and start['document']==home['document'])
                state=start
                for _ in range(15):
                    if state['body']['scrollTop']>=state['body']['max']-2:break
                    state=press('PageDown')
                observed.setdefault('readings',[]).append({'state':label,'initial':initial,'bottomViaPages':state,'ax':ax_body(),'ariaSnapshot':body.aria_snapshot()})
                check(label+': PageDown alone reaches readable bottom',state['body']['scrollTop']>=state['body']['max']-2 and state['fragment']['fullyVisible'] and state['fragment']['hitReachable'] and state['bodyFocused'] and state['document']==home['document'],state)
                check(label+': final existing text unchanged',state['fragment']['text']=='No es un resultado negativo ni significa que este vino no te guste.')
            try:
                page.goto(args.url+'/escanear/carta-vinos',wait_until='networkidle')
                page.evaluate("""()=>{window.__qa13Events=[];document.addEventListener('keydown',e=>window.__qa13Events.push({key:e.key,target:e.target.tagName,label:e.target.getAttribute('aria-label')||null}),{capture:true,passive:true});}""")
                page.locator('input[type=file]').first.set_input_files(str(photo))
                row=page.get_by_role('button',name='Abrir vino 2: Barbaresco Marchesi di Barolo',exact=True);row.wait_for(timeout=45000)
                trigger=row if entry=='row' else page.get_by_role('button',name=re.compile(r'^Grupo de 3 vinos:')).first
                observed['trigger']=trigger.get_attribute('aria-label');observed['triggerTabs']=tab_to(trigger);initialCounts=counters.copy()
                page.keyboard.press('Enter' if entry=='row' else 'Space');page.get_by_role('dialog').wait_for(state='visible');settle(1 if entry=='row' else 3)
                body=page.get_by_role('dialog').locator('.overflow-y-auto')
                observed['opened']=page.evaluate(snapshot);observed['initialAX']=ax_body()
                page.screenshot(path=str(args.output/(key+'-initial.png')))
                read_body(body,'original')
                page.keyboard.press('Shift+Tab');observed['shiftExit']=page.evaluate(snapshot)
                check('ShiftTab from body reaches existing Close',observed['shiftExit']['active']['label']=='Cerrar detalle' and observed['shiftExit']['inDialog'],observed['shiftExit']['active'])
                observed['returnBodyTabs']=tab_to(body);page.keyboard.press('Tab');observed['tabExit']=page.evaluate(snapshot)
                check('Tab from body reaches enabled current navigation control',observed['tabExit']['active']['text'] in ['Anterior','Siguiente'] and not observed['tabExit']['active']['disabled'] and observed['tabExit']['inDialog'],observed['tabExit']['active'])
                previous=page.get_by_role('dialog').get_by_role('button',name='Anterior',exact=True);observed['navTabs']=tab_to(previous,limit=15)
                before_change=page.evaluate(snapshot);page.keyboard.press('Enter');settle(0 if entry=='row' else 2);after_change=page.evaluate(snapshot)
                observed['change']={'before':before_change,'after':after_change}
                expected=response['vinos'][after_change['index']]['nombre']
                check('Single changed wine context and native scroll clamp coherent',after_change['title']==str(after_change['index']+1)+'. '+expected and 0<=after_change['body']['scrollTop']<=after_change['body']['max']+2)
                check('Changing wine does not steal focus or page scroll',after_change['inDialog'] and not after_change['active']['disabled'] and after_change['document']==before_change['document'],after_change)
                read_body(body,'changed')
                page.keyboard.press('Escape');page.get_by_role('dialog').wait_for(state='hidden');page.wait_for_timeout(100)
                observed['escaped']={'exact':trigger.evaluate('el=>el===document.activeElement'),'snapshot':page.evaluate(snapshot)}
                check('Escape after reading returns exact real trigger',observed['escaped']['exact'])
                check('Escape preserves page scroll',observed['escaped']['snapshot']['document']==after_change['document'])
                observed['reopenTabs']=tab_to(trigger);page.keyboard.press('Enter' if entry=='row' else 'Space');page.get_by_role('dialog').wait_for(state='visible');settle(1 if entry=='row' else 3)
                observed['reopenBodyTabs']=tab_to(body);press('End')
                close=page.get_by_role('dialog').get_by_role('button',name='Cerrar detalle');observed['closeTabs']=tab_to(close,reverse=True,limit=15);page.keyboard.press('Enter')
                page.get_by_role('dialog').wait_for(state='hidden');page.wait_for_timeout(100)
                observed['closed']={'exact':trigger.evaluate('el=>el===document.activeElement'),'snapshot':page.evaluate(snapshot)}
                check('Close after body reading returns exact trigger without injected focus',observed['closed']['exact'])
                check('Reading/change/reopen causes no additional request',counters==initialCounts and counters=={'ocr':3,'canonical':2,'base':1},counters.copy())
                check('No REST or other writes',not any(r['method'] in ['PATCH','DELETE','PUT'] or(r['method']=='POST' and r['path'].startswith('/rest/v1/')) for r in requests))
                check('All nonlocal HTTP/WS intercepted',sorted(seen)==sorted(fulfilled) and all(s['local'] or s['blocked'] for s in sockets))
                check('No runtime/console/mobile overflow errors',not errors and not console and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                observed['events']=page.evaluate('window.__qa13Events')
            except Exception as error:
                failures.append(str(error));page.screenshot(path=str(args.output/(key+'-exception.png')))
            finally:
                results.append({'case':key,'passed':not failures,'checks':checks,'failures':failures,'observations':observed,'counters':counters,'requests':requests,'socketAudit':sockets,'errors':errors,'console':console});context.close()
                (args.output/'results.json').write_text(json.dumps({'scope':__doc__,'realRemoteAppCalls':0,'paidCalls':0,'realAccounts':0,'results':results},ensure_ascii=False,indent=2)+'\n')
            print(key,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    finally:browser.close()
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
