"""Only15 owned UI await cancellation in ranking while canonical requests stay pending; local replay, not server cancellation."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--url',default='http://127.0.0.1:4462')
args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
photo=root/'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
fixture=root/'docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json'
assert hashlib.sha256(photo.read_bytes()).hexdigest()=='2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
assert hashlib.sha256(fixture.read_bytes()).hexdigest()=='1c6d8bd4e5d9aa392f476a66ba7a86e8c6a055f752110f3bef008450c6de6e9e'
response=json.loads(fixture.read_text())['bothContract']
UID='00000000-0000-4000-8000-000000000080'
enc=lambda value:base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
session={'user':{'id':UID,'aud':'authenticated','role':'authenticated','email':'qa@matchrim.invalid','app_metadata':{'provider':'email'},'user_metadata':{}},'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':UID,'exp':1900000000})+'.'+enc('synthetic-invalid'),'refresh_token':'synthetic-invalid','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}
paths=[photo,fixture,root/'src/components/wine-import/WineMenuScanner.tsx',root/'src/services/winerimApi.ts']
(args.output/'input-provenance.json').write_text(json.dumps({'scope':__doc__,'hashes':{str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in paths},'samePath':str(photo),'selection':'Real SubirArchivo button + standard nativeCDP FileChooser, exact same file after QuitarCarta. Not OS/iOS proof.','requestSetup':'All3 OCR replay calls complete. Actual2 canonical calls held; no pipeline/fixtureflag/positive catalog changes.'},indent=2)+'\n')
snapshot=r"""() => {
 const visible=el=>el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0&&getComputedStyle(el).visibility!=='hidden';
 const buttons=[...document.querySelectorAll('button')].filter(visible),text=document.body.innerText;
 return {at:performance.now(),cancelAt:window.__qa15CancelAt??null,recoveryAt:window.__qa15RecoveryAt??null,phase:['Ordenando resultados...','Leyendo secciones, líneas y precios...','Comprobando calidad y perspectiva...'].filter(t=>text.includes(t)),cancelVisible:buttons.some(b=>b.textContent.trim()==='Cancelar análisis'),feedback:text.includes('Análisis cancelado.'),rows:buttons.filter(b=>b.getAttribute('aria-label')?.startsWith('Abrir vino ')).map(b=>b.getAttribute('aria-label')),buttons:buttons.map(b=>({label:b.getAttribute('aria-label')||b.textContent.trim(),disabled:b.disabled})),inputs:[...document.querySelectorAll('input[type=file]')].map(el=>({disabled:el.disabled,value:el.value,files:[...el.files].map(f=>({name:f.name,type:f.type,size:f.size,lastModified:f.lastModified}))})),successNotice:[...document.querySelectorAll('[data-sonner-toast]')].some(el=>el.textContent.includes('vinos detectados en la carta')),active:{tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.trim().slice(0,80)}};
}"""
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for method,orientation,old_status in [('keyboard','portrait',200),('touch','landscape',503)]:
            key=method+'-'+orientation;w,h=(393,852) if orientation=='portrait' else (852,393)
            requests,seen,handled,sockets,request_failures,errors,warnings,console,checks,failures=[],[],[],[],[],[],[],[],[],[];observed={};attempt=0;held={1:[],2:[]};releases=[]
            counts={1:{'ocr':0,'canonical':0,'base':0},2:{'ocr':0,'canonical':0,'base':0}}
            context=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,reduced_motion='reduce',service_workers='block')
            def reply(route,payload,status=200):route.fulfill(status=status,content_type='application/json',body=json.dumps(payload),headers={'Access-Control-Allow-Origin':'*'})
            def intercept(route):
                req=route.request;url=urlparse(req.url)
                if url.netloc==urlparse(args.url).netloc:return route.continue_()
                handled.append(req.url);requests.append({'method':req.method,'host':url.hostname,'path':url.path,'attemptAtArrival':attempt})
                if '/auth/v1/user' in url.path:return reply(route,session['user'])
                if '/rest/v1/quiz_results' in url.path:
                    if attempt in counts:counts[attempt]['base']+=1
                    return reply(route,None)
                if '/functions/v1/scan-wine-menu' in url.path:counts[attempt]['ocr']+=1;return reply(route,response)
                if '/functions/v1/' in url.path:counts[attempt]['canonical']+=1;held[attempt].append(route);return
                return reply(route,[] if '/rest/v1/' in url.path else {})
            def ws_handler(ws):
                local=urlparse(ws.url).netloc==urlparse(args.url).netloc;sockets.append({'host':urlparse(ws.url).hostname,'local':local,'blocked':not local})
                if local:ws.connect_to_server()
                else:ws.close(code=1008,reason='Only15 local replay')
            context.route('**/*',intercept);context.route_web_socket('**/*',ws_handler)
            context.on('request',lambda req:seen.append(req.url) if urlparse(req.url).netloc!=urlparse(args.url).netloc else None)
            context.on('requestfailed',lambda req:request_failures.append({'path':urlparse(req.url).path,'failure':req.failure,'attemptAtFailure':attempt}))
            seed={'sb-cbjynrbvrhcmpaojmqdp-auth-token':json.dumps(session),'matchrim.local_profile_owner.v1':UID,'matchrim.onboarding.v2:'+UID:json.dumps({'version':2,'result':'skipped'}),'matchrim.scan_privacy_notice.v2':'accepted'}
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(seed))
            page=context.new_page();page.set_default_timeout(6500)
            page.on('pageerror',lambda error:errors.append(str(error)))
            def console_event(message):
                text=re.sub(r'https?://\S+','<URL>',message.text)
                if message.type=='error':console.append(text)
                if message.type=='warning':warnings.append(text)
            page.on('console',console_event)
            def check(name,passed,detail=None):
                checks.append({'name':name,'passed':bool(passed),'detail':detail})
                if not passed:failures.append(name)
            def tab_to(target,limit=80):
                trace=[]
                for _ in range(limit):
                    if target.evaluate('el=>el===document.activeElement'):return trace
                    page.keyboard.press('Tab');trace.append(page.evaluate(snapshot)['active'])
                raise AssertionError('Real Tab cannot reach requested control')
            def activate(target):
                if method=='touch':target.tap()
                else:observed.setdefault('tabTraces',[]).append(tab_to(target));page.keyboard.press('Enter')
            def choose(upload):
                with page.expect_file_chooser() as choice:activate(upload)
                chooser=choice.value;observed.setdefault('chooserBefore',[]).append(chooser.element.evaluate("el=>({disabled:el.disabled,value:el.value,files:[...el.files].map(f=>({name:f.name,type:f.type,size:f.size,lastModified:f.lastModified}))})"))
                chooser.set_files(str(photo));observed.setdefault('files',[]).append(chooser.element.evaluate("el=>[...el.files].map(f=>({name:f.name,type:f.type,size:f.size,lastModified:f.lastModified}))"))
            def wait_catalog(index):
                for _ in range(150):
                    if len(held[index])==2:return
                    page.wait_for_timeout(100)
                raise AssertionError('Exact replay did not reach actual2 catalog requests')
            def release_catalog(index,status):
                for route in held[index]:
                    try:reply(route,{'wines':[]} if status==200 else {'error':'QA15 stale local error'},status);releases.append({'attempt':index,'status':status,'acceptedByTool':True})
                    except Exception as error:releases.append({'attempt':index,'status':status,'acceptedByTool':False,'error':re.sub(r'https?://\S+','<URL>',str(error))})
            try:
                page.goto(args.url+'/escanear/carta-vinos',wait_until='networkidle')
                page.evaluate("""()=>{window.__qa15Events=[];document.addEventListener('click',e=>{if(e.target.closest('button')?.textContent.trim()==='Cancelar análisis')window.__qa15CancelAt=performance.now();},{capture:true,passive:true});document.addEventListener('keydown',e=>window.__qa15Events.push({key:e.key,tag:e.target.tagName,label:e.target.getAttribute('aria-label')||null}),{capture:true,passive:true});const observer=new MutationObserver(()=>{if(window.__qa15CancelAt!==undefined&&window.__qa15RecoveryAt===undefined&&document.body.innerText.includes('Análisis cancelado.')&&![...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Cancelar análisis')&&[...document.querySelectorAll('input[type=file]')].every(i=>!i.disabled))window.__qa15RecoveryAt=performance.now();});observer.observe(document.body,{subtree:true,childList:true,attributes:true});}""")
                upload=page.get_by_role('button',name='Subir archivo',exact=True);attempt=1;choose(upload);wait_catalog(1)
                page.get_by_text('Ordenando resultados...',exact=True).wait_for(state='visible');cancel=page.get_by_role('button',name='Cancelar análisis',exact=True)
                observed['rankingBeforeCancel']=page.evaluate(snapshot)
                check('Actually reached ranking with two held catalog requests',observed['rankingBeforeCancel']['phase']==['Ordenando resultados...'] and counts[1]=={'ocr':3,'canonical':2,'base':1},counts[1].copy())
                page.screenshot(path=str(args.output/(key+'-ranking-pending.png')));activate(cancel)
                samples=[]
                for target_ms in [100,1000,2000]:
                    elapsed=page.evaluate('performance.now()-window.__qa15CancelAt')
                    if elapsed<target_ms:page.wait_for_timeout(target_ms-elapsed)
                    state=page.evaluate(snapshot);samples.append({'targetMs':target_ms,'elapsedMs':state['at']-state['cancelAt'],'state':state})
                observed['cancelSamplesWhileCatalogHeld']=samples
                recovered=not samples[-1]['state']['cancelVisible'] and samples[-1]['state']['feedback'] and all(not i['disabled'] for i in samples[-1]['state']['inputs'])
                observed['recoveredWithoutCatalogRelease']=recovered
                check('UI recovers while catalog still held, measured bounded window not published SLA',recovered,samples)
                page.screenshot(path=str(args.output/(key+'-cancel-catalog-still-held.png')))
                check('No results/success/extra calls before any catalog release',not samples[-1]['state']['rows'] and not samples[-1]['state']['successNotice'] and counts[1]=={'ocr':3,'canonical':2,'base':1},counts[1].copy())
                check('Underlying catalog remains held without network-abort event',len(held[1])==2 and not any('/functions/v1/' in r['path'] for r in request_failures),request_failures.copy())
                if not recovered:
                    observed['oldReleaseNeededForUI']=True;release_catalog(1,old_status)
                    cancel.wait_for(state='hidden');page.get_by_text('Análisis cancelado. Puedes reintentarlo con la misma imagen o elegir otra.',exact=True).wait_for(state='visible')
                    observed['recoveredAfterForcedOldRelease']=page.evaluate(snapshot)
                else:observed['oldReleaseNeededForUI']=False
                activate(page.get_by_role('button',name='Quitar carta',exact=True));upload.wait_for(state='visible')
                attempt=2;choose(upload);wait_catalog(2);observed['newRankingPending']=page.evaluate(snapshot)
                check('Visible UI exact-file retry starts new ranking, no stale feedback',observed['newRankingPending']['phase']==['Ordenando resultados...'] and not observed['newRankingPending']['feedback'] and observed['files'][0]==observed['files'][1] and counts[2]=={'ocr':3,'canonical':2,'base':1},counts[2].copy())
                if recovered:release_catalog(1,old_status)
                page.wait_for_timeout(1400);observed['afterOldLateCompletion']=page.evaluate(snapshot)
                check('Old completed lookups cannot replace new loader/results/feedback',observed['afterOldLateCompletion']['cancelVisible'] and observed['afterOldLateCompletion']['phase']==['Ordenando resultados...'] and all(i['disabled'] for i in observed['afterOldLateCompletion']['inputs']) and not observed['afterOldLateCompletion']['feedback'] and not observed['afterOldLateCompletion']['rows'] and not observed['afterOldLateCompletion']['successNotice'])
                check('Old completions cause no extra canonical/OCR/profile calls',counts=={1:{'ocr':3,'canonical':2,'base':1},2:{'ocr':3,'canonical':2,'base':1}},json.loads(json.dumps(counts)))
                page.screenshot(path=str(args.output/(key+'-new-ranking-after-old-completion.png')))
                release_catalog(2,200)
                rows=page.get_by_role('button',name=re.compile(r'^Abrir vino \d+:'));rows.first.wait_for(timeout=45000);observed['final']=page.evaluate(snapshot)
                check('New attempt alone publishes four existing candidate rows',observed['final']['rows']==['Abrir vino '+str(i+1)+': '+wine['nombre'] for i,wine in enumerate(response['vinos'])] and not observed['final']['feedback'])
                check('Final loader/input recovery normal',not observed['final']['cancelVisible'] and all(not i['disabled'] for i in observed['final']['inputs']))
                page.screenshot(path=str(args.output/(key+'-new-completed.png')))
                check('No REST/history/profile/stock/feedback writes',not any(r['method'] in ['PATCH','DELETE','PUT'] or(r['method']=='POST' and r['path'].startswith('/rest/v1/')) for r in requests))
                check('Every nonlocal request/WS intercepted including pending canonical',sorted(seen)==sorted(handled) and all(s['local'] or s['blocked'] for s in sockets))
                unexpected_errors=[text for text in console if not(old_status==503 and '503' in text and 'Failed to load resource' in text)]
                observed['expected503ConsoleControl']=[text for text in console if text not in unexpected_errors]
                check('No runtime/unexpected console/mobile overflow errors',not errors and not unexpected_errors and page.evaluate('document.documentElement.scrollWidth<=innerWidth'),{'warnings':warnings,'console':console})
                observed['events']=page.evaluate('window.__qa15Events')
            except Exception as error:
                failures.append(str(error));page.screenshot(path=str(args.output/(key+'-exception.png')))
            finally:
                results.append({'case':key,'passed':not failures,'checks':checks,'failures':failures,'observations':observed,'countsByAttempt':counts,'releases':releases,'requestFailures':request_failures,'requests':requests,'socketAudit':sockets,'errors':errors,'warnings':warnings,'console':console});context.close()
                (args.output/'results.json').write_text(json.dumps({'scope':__doc__,'realRemoteAppCalls':0,'paidCalls':0,'realAccounts':0,'results':results},ensure_ascii=False,indent=2)+'\n')
            print(key,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    finally:browser.close()
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
