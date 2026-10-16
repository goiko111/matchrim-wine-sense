"""Only14 real UI cancel pending menu OCR and same exact file retry via standard filechooser; local automation, not OS/iOS."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--url',default='http://127.0.0.1:4461')
args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
photo=root/'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
fixture=root/'docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json'
assert hashlib.sha256(photo.read_bytes()).hexdigest()=='2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
assert hashlib.sha256(fixture.read_bytes()).hexdigest()=='1c6d8bd4e5d9aa392f476a66ba7a86e8c6a055f752110f3bef008450c6de6e9e'
response=json.loads(fixture.read_text())['bothContract'];source_info={'path':str(photo),'basename':photo.name,'MIME':'image/jpeg','sha256':hashlib.sha256(photo.read_bytes()).hexdigest(),'size':photo.stat().st_size,'mtimeNs':photo.stat().st_mtime_ns}
UID='00000000-0000-4000-8000-000000000080'
enc=lambda value:base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
session={'user':{'id':UID,'aud':'authenticated','role':'authenticated','email':'qa@matchrim.invalid','app_metadata':{'provider':'email'},'user_metadata':{}},'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':UID,'exp':1900000000})+'.'+enc('synthetic-invalid'),'refresh_token':'synthetic-invalid','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}
paths=[photo,fixture,root/'src/components/wine-import/WineMenuScanner.tsx']
(args.output/'input-provenance.json').write_text(json.dumps({'scope':__doc__,'hashes':{str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in paths},'sameSourceFile':source_info,'selection':'Standard page.expect_file_chooser -> FileChooser.set_files(exact same Path), after visible UI reset. No file payload/new name/manual event/value mutation. Automation does not certify physical OS/iOS picker.'},indent=2)+'\n')
snapshot=r"""() => {
 const visible=el=>!!el&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0&&getComputedStyle(el).visibility!=='hidden';
 const buttons=[...document.querySelectorAll('button')].filter(visible);
 const inputs=[...document.querySelectorAll('input[type=file]')].map(el=>({disabled:el.disabled,accept:el.accept,capture:el.getAttribute('capture'),value:el.value,files:[...el.files].map(f=>({name:f.name,type:f.type,size:f.size,lastModified:f.lastModified}))}));
 const text=document.body.innerText;
 return {buttons:buttons.map(el=>({label:el.getAttribute('aria-label')||el.textContent.trim(),disabled:el.disabled})),inputs,rows:buttons.filter(el=>el.getAttribute('aria-label')?.startsWith('Abrir vino ')).map(el=>el.getAttribute('aria-label')),cancelVisible:buttons.some(el=>el.textContent.trim()==='Cancelar análisis'),cancelFeedback:text.includes('Análisis cancelado.'),loadingText:['Leyendo secciones, líneas y precios...','Comprobando calidad y perspectiva...','Ordenando resultados...'].filter(t=>text.includes(t)),successNotice:[...document.querySelectorAll('[data-sonner-toast]')].some(el=>el.textContent.includes('vinos detectados en la carta')),active:{tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.trim().slice(0,80)},document:{x:scrollX,y:scrollY}};
}"""
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for method,orientation in ((method,orientation) for method in ['keyboard','touch'] for orientation in ['portrait','landscape']):
            key=method+'-'+orientation;w,h=(393,852) if orientation=='portrait' else (852,393);release_kind='response' if orientation=='portrait' else 'error'
            requests,seen,handled,sockets,fail_requests,errors,console,checks,failures=[],[],[],[],[],[],[],[],[];observed={};attempt=0;held={};releases=[]
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
                if '/functions/v1/scan-wine-menu' in url.path:
                    counts[attempt]['ocr']+=1
                    if counts[attempt]['ocr']==1:held[attempt]=route;return
                    return reply(route,response)
                if '/functions/v1/' in url.path:
                    if attempt in counts:counts[attempt]['canonical']+=1
                    return reply(route,{'wines':[]})
                return reply(route,[] if '/rest/v1/' in url.path else {})
            def ws_handler(ws):
                local=urlparse(ws.url).netloc==urlparse(args.url).netloc;sockets.append({'host':urlparse(ws.url).hostname,'local':local,'blocked':not local})
                if local:ws.connect_to_server()
                else:ws.close(code=1008,reason='Only14 local replay')
            context.route('**/*',intercept);context.route_web_socket('**/*',ws_handler)
            context.on('request',lambda req:seen.append(req.url) if urlparse(req.url).netloc!=urlparse(args.url).netloc else None)
            context.on('requestfailed',lambda req:fail_requests.append({'method':req.method,'path':urlparse(req.url).path,'failure':req.failure,'attemptAtFailure':attempt}))
            seed={'sb-cbjynrbvrhcmpaojmqdp-auth-token':json.dumps(session),'matchrim.local_profile_owner.v1':UID,'matchrim.onboarding.v2:'+UID:json.dumps({'version':2,'result':'skipped'}),'matchrim.scan_privacy_notice.v2':'accepted'}
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(seed))
            page=context.new_page();page.set_default_timeout(6500)
            page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console.append(re.sub(r'https?://\S+','<URL>',m.text)) if m.type=='error' else None)
            def check(name,passed,detail=None):
                checks.append({'name':name,'passed':bool(passed),'detail':detail})
                if not passed:failures.append(name)
            def tab_to(target,limit=80):
                trace=[]
                for _ in range(limit):
                    if target.evaluate('el=>el===document.activeElement'):return trace
                    page.keyboard.press('Tab');trace.append(page.evaluate(snapshot)['active'])
                raise AssertionError('Real Tab cannot reach visible requested control')
            def activate(target):
                if method=='touch':target.tap()
                else:observed.setdefault('tabTraces',[]).append(tab_to(target));page.keyboard.press('Enter')
            def choose_exact(upload):
                with page.expect_file_chooser() as chooser_event:activate(upload)
                chooser=chooser_event.value
                observed.setdefault('chooserBefore',[]).append(chooser.element.evaluate("el=>({value:el.value,disabled:el.disabled,files:[...el.files].map(f=>({name:f.name,type:f.type,size:f.size,lastModified:f.lastModified}))})"))
                chooser.set_files(str(photo))
                info=chooser.element.evaluate("el=>({value:el.value,disabled:el.disabled,files:[...el.files].map(f=>({name:f.name,type:f.type,size:f.size,lastModified:f.lastModified}))})")
                observed.setdefault('selections',[]).append({'path':str(photo),'sourceSHA':hashlib.sha256(photo.read_bytes()).hexdigest(),'info':info})
            def wait_held(index):
                for _ in range(150):
                    if index in held:return
                    page.wait_for_timeout(100)
                raise AssertionError('Expected local pending OCR route missing')
            def release(index,payload,status=200):
                try:reply(held[index],payload,status);releases.append({'attempt':index,'status':status,'acceptedByTool':True,'note':'Protocol acceptance does not mean aborted fetch delivered to app'})
                except Exception as error:releases.append({'attempt':index,'status':status,'acceptedByTool':False,'error':re.sub(r'https?://\S+','<URL>',str(error))})
            try:
                page.goto(args.url+'/escanear/carta-vinos',wait_until='networkidle')
                page.evaluate("""()=>{window.__qa14SelectionEvents=[];for(const kind of ['input','change','cancel'])document.addEventListener(kind,e=>{if(e.target.matches?.('input[type=file]'))window.__qa14SelectionEvents.push({kind,isTrusted:e.isTrusted,value:e.target.value,files:[...e.target.files].map(f=>({name:f.name,type:f.type,size:f.size,lastModified:f.lastModified}))});},{capture:true,passive:true});}""")
                observed['initial']=page.evaluate(snapshot);upload=page.get_by_role('button',name='Subir archivo',exact=True)
                attempt=1;choose_exact(upload);wait_held(1)
                cancel=page.get_by_role('button',name='Cancelar análisis',exact=True);cancel.wait_for(state='visible')
                observed['pendingFirst']=page.evaluate(snapshot)
                check('Pending first OCR has real Cancel and disabled inputs',observed['pendingFirst']['cancelVisible'] and all(i['disabled'] for i in observed['pendingFirst']['inputs']) and counts[1]=={'ocr':1,'canonical':0,'base':1},counts[1].copy())
                page.screenshot(path=str(args.output/(key+'-pending.png')))
                activate(cancel);cancel.wait_for(state='hidden');page.get_by_text('Análisis cancelado. Puedes reintentarlo con la misma imagen o elegir otra.',exact=True).wait_for(state='visible')
                page.wait_for_timeout(100);observed['cancelled']=page.evaluate(snapshot)
                check('Cancel completes loading and restores enabled inputs',not observed['cancelled']['cancelVisible'] and not observed['cancelled']['loadingText'] and all(not i['disabled'] for i in observed['cancelled']['inputs']))
                check('Cancelled analysis has no result or success notice',observed['cancelled']['cancelFeedback'] and not observed['cancelled']['rows'] and not observed['cancelled']['successNotice'])
                check('Browser reports aborted menu request',any('/functions/v1/scan-wine-menu' in r['path'] and 'ABORT' in (r['failure'] or '').upper() for r in fail_requests),fail_requests.copy())
                check('Real gallery recovery controls observed, not fictitious retry',page.get_by_role('button',name='Quitar carta',exact=True).count()==1 and page.get_by_role('button',name='Subir archivo',exact=True).count()==0,observed['cancelled']['buttons'])
                page.screenshot(path=str(args.output/(key+'-cancelled.png')))
                activate(page.get_by_role('button',name='Quitar carta',exact=True));upload.wait_for(state='visible');observed['cleared']=page.evaluate(snapshot)
                check('Quitar carta clears file input via product UI',all(not i['files'] and i['value']=='' for i in observed['cleared']['inputs']) and not observed['cleared']['cancelFeedback'])
                attempt=2;choose_exact(upload);wait_held(2);observed['pendingSecond']=page.evaluate(snapshot)
                check('Same exact path/name/MIME/size/mtime/hash selected after real UI clear',observed['selections'][0]['path']==observed['selections'][1]['path'] and observed['selections'][0]['sourceSHA']==observed['selections'][1]['sourceSHA']==source_info['sha256'] and observed['selections'][0]['info']['files']==observed['selections'][1]['info']['files'],observed['selections'])
                check('New exact-file attempt really starts and loads independently',observed['pendingSecond']['cancelVisible'] and counts[2]=={'ocr':1,'canonical':0,'base':1} and not observed['pendingSecond']['cancelFeedback'],counts[2].copy())
                old_payload=response if release_kind=='response' else {'error':'QA14 stale local error'}
                release(1,old_payload,200 if release_kind=='response' else 503)
                page.wait_for_timeout(1400);observed['afterOldRelease']=page.evaluate(snapshot)
                check('Late old response/error cannot replace new pending UI',observed['afterOldRelease']['cancelVisible'] and all(i['disabled'] for i in observed['afterOldRelease']['inputs']) and not observed['afterOldRelease']['cancelFeedback'] and not observed['afterOldRelease']['rows'] and not observed['afterOldRelease']['successNotice'])
                check('Cancelled old attempt has no retry or extra lookups after late release',counts[1]=={'ocr':1,'canonical':0,'base':1} and counts[2]=={'ocr':1,'canonical':0,'base':1},json.loads(json.dumps(counts)))
                page.screenshot(path=str(args.output/(key+'-new-pending-after-old-release.png')))
                release(2,response)
                rows=page.get_by_role('button',name=re.compile(r'^Abrir vino \d+:'));rows.first.wait_for(timeout=45000)
                page.wait_for_timeout(100);observed['completed']=page.evaluate(snapshot)
                expected=['Abrir vino '+str(i+1)+': '+wine['nombre'] for i,wine in enumerate(response['vinos'])]
                check('Retried exact file finishes full unchanged four-candidate contract',observed['completed']['rows']==expected and not observed['completed']['cancelFeedback'],observed['completed']['rows'])
                check('Retry final lifecycle resets loading/inputs normally',not observed['completed']['cancelVisible'] and all(not i['disabled'] for i in observed['completed']['inputs']))
                check('Measured per-attempt plan: cancelled1/0/1, complete retry1/2/1',counts[1]=={'ocr':1,'canonical':0,'base':1} and counts[2]=={'ocr':1,'canonical':2,'base':1},json.loads(json.dumps(counts)))
                page.screenshot(path=str(args.output/(key+'-completed.png')))
                observed['selectionEvents']=page.evaluate('window.__qa14SelectionEvents')
                check('Two browser change events observed from standard chooser',len([e for e in observed['selectionEvents'] if e['kind']=='change'])==2,observed['selectionEvents'])
                check('Source file hash unchanged across selections',hashlib.sha256(photo.read_bytes()).hexdigest()==source_info['sha256'])
                check('No REST/history/stock/profile/feedback writes',not any(r['method'] in ['PATCH','DELETE','PUT'] or(r['method']=='POST' and r['path'].startswith('/rest/v1/')) for r in requests))
                check('Every nonlocal HTTP and WS intercepted including held-aborted routes',sorted(seen)==sorted(handled) and all(s['local'] or s['blocked'] for s in sockets))
                check('No runtime/console errors or mobile width overflow',not errors and not console and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            except Exception as error:
                failures.append(str(error));page.screenshot(path=str(args.output/(key+'-exception.png')))
            finally:
                results.append({'case':key,'releaseKind':release_kind,'passed':not failures,'checks':checks,'failures':failures,'observations':observed,'countsByAttempt':counts,'releases':releases,'requestFailures':fail_requests,'requests':requests,'socketAudit':sockets,'errors':errors,'console':console});context.close()
                (args.output/'results.json').write_text(json.dumps({'scope':__doc__,'realRemoteAppCalls':0,'paidCalls':0,'realAccounts':0,'selectionLimit':'Browser automated standard chooser/nativeCDP; isTrusted is not human or OS/iOS proof. No direct reselect without UI clear tested because SubirArchivo not visible with cancelled preview. ReintentarFoto exists but camera path is out of scope.','results':results},ensure_ascii=False,indent=2)+'\n')
            print(key,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    finally:browser.close()
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
