"""Only16 multivino A-cancel/B-reentry stale catalog completion: local existing response contract, not vision."""
import argparse
import ast
import base64
import hashlib
import json
import re
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--url',default='http://127.0.0.1:4463');p.add_argument('--baseline-results',type=Path)
args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
photo=root/'qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg'
truth=root/'qa-fixtures/food-menu/ground-truth.json';contract_source=root/'scripts/qa-multi-wine-ui.py'
sha=lambda value:hashlib.sha256(value).hexdigest()
assert sha(photo.read_bytes())=='9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9'
assert sha(contract_source.read_bytes())=='f2aa2924e48c8c2f6f0cbe45011e6ef92bda3cb17be14a645659b70a0343ae40'
assert json.loads(truth.read_text())['normalized_sha256']==sha(photo.read_bytes())
tree=ast.parse(contract_source.read_text());defs=[node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in ['candidate','function_response']]
assert len(defs)==2
scope={};exec(compile(ast.Module(body=defs,type_ignores=[]),str(contract_source),'exec'),scope)
responses={'detect-wine-regions':scope['function_response']('detect-wine-regions',SimpleNamespace(post_data_json={})),
 'analyze-wine-region':{rid:scope['function_response']('analyze-wine-region',SimpleNamespace(post_data_json={'region_id':rid})) for rid in ['region-1','region-2','region-3','region-4','region-5']},
 'search-wines':scope['function_response']('search-wines',SimpleNamespace(post_data_json={}))}
payload_bytes=(json.dumps(responses,ensure_ascii=False,indent=2)+'\n').encode()
(args.output/'response-payloads.json').write_bytes(payload_bytes)
paths=[photo,truth,contract_source,root/'src/components/wine-import/MultiWineLabelScanner.tsx',root/'src/services/winerimApi.ts',root/'src/utils/invokeEdgeFunction.ts']
(args.output/'input-provenance.json').write_text(json.dumps({'scope':__doc__,'hashes':{str(path.relative_to(root)):sha(path.read_bytes()) for path in paths},'responsePayloadSha256':sha(payload_bytes),'responseReuse':'AST FunctionDef candidate/function_response only; no source import/entrypoint/materialization/download. Complete deterministic payloads unchanged.','imageScope':'Existing CC0 restaurant food menu used only for real client preprocessing/crop/lifecycle. No five-bottle recognition/ground-truth/recall claim.','samePath':str(photo),'fixtureFlag':False,'profile':'GET null, no positive profile','selection':'Real Cancelar/Cerrar analisis/Elegir de galeria and standard FileChooser exact Path. Not OS/iOS chooser certification.'},indent=2)+'\n')
frozen=json.loads(args.baseline_results.read_text()) if args.baseline_results else None
UID='00000000-0000-4000-8000-000000000080'
enc=lambda value:base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
user={'id':UID,'aud':'authenticated','role':'authenticated','email':'qa@matchrim.invalid','app_metadata':{'provider':'email'},'user_metadata':{}}
session={'user':user,'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':UID,'exp':1900000000})+'.'+enc('synthetic-invalid'),'refresh_token':'synthetic-invalid','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}
snapshot=r"""() => {
 const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';};
 const buttons=[...document.querySelectorAll('button')].filter(visible),labels=['Lista para escanear','Comprobando imagen','Cargando tu perfil','Localizando botellas y etiquetas','Leyendo cada región por separado','Lote listo para revisar','Análisis cancelado','Análisis incompleto'];
 return {phase:[...document.querySelectorAll('[aria-live="polite"]')].map(e=>e.textContent.trim()).filter(t=>labels.includes(t)),cancelVisible:buttons.some(e=>e.textContent.trim()==='Cancelar'),closeVisible:buttons.some(e=>e.getAttribute('aria-label')==='Cerrar análisis'),progress:[...document.querySelectorAll('[role=progressbar]')].filter(visible).map(e=>({now:e.getAttribute('aria-valuenow'),max:e.getAttribute('aria-valuemax'),indicator:e.firstElementChild?.style.transform||null})),regionPins:[...document.querySelectorAll('button[data-testid^="region-pin"]')].map(e=>({testId:e.getAttribute('data-testid'),label:e.getAttribute('aria-label')})),candidateRows:[...document.querySelectorAll('button[aria-label^="Abrir detalle de"]')].map(e=>e.getAttribute('aria-label')),performance:document.querySelector('[data-testid="scan-performance-summary"]')?.textContent.trim()||null,notices:[...document.querySelectorAll('[data-sonner-toast]')].map(e=>e.textContent),inputs:[...document.querySelectorAll('input[type=file]')].map(e=>({value:e.value,files:[...e.files].map(f=>({name:f.name,type:f.type,size:f.size,lastModified:f.lastModified}))})),bodyText:document.body.innerText.slice(0,7000),width:{inner:innerWidth,scroll:document.documentElement.scrollWidth}};
}"""
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for method,orientation,old_status in [('keyboard','portrait',200),('touch','landscape',503)]:
            key=method+'-'+orientation;w,h=(393,852) if orientation=='portrait' else (852,393)
            context=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,reduced_motion='reduce',service_workers='block')
            requests,seen,handled,sockets,errors,console,warnings,request_failures,checks,failures=[],[],[],[],[],[],[],[],[],[]
            observations={};attempt=0;held={1:[],2:[]};counts={1:{'detect':0,'analyze':0,'search':0,'profile':0},2:{'detect':0,'analyze':0,'search':0,'profile':0}};releases=[];auto_release_new=False
            def reply(route,payload,status=200):route.fulfill(status=status,content_type='application/json',body=json.dumps(payload),headers={'Access-Control-Allow-Origin':'*'})
            def release_catalog(index,status):
                for route in held[index]:
                    try:reply(route,responses['search-wines'] if status==200 else {'error':'QA16 stale local error'},status);releases.append({'attempt':index,'status':status,'acceptedByTool':True})
                    except Exception as error:releases.append({'attempt':index,'status':status,'acceptedByTool':False,'error':re.sub(r'https?://\S+','<URL>',str(error))})
            def intercept(route):
                req=route.request;url=urlparse(req.url)
                if url.netloc==urlparse(args.url).netloc:return route.continue_()
                handled.append(req.url);row={'method':req.method,'host':url.hostname,'path':url.path,'attempt':attempt}
                if req.post_data:
                    body=req.post_data_json;row['requestBodySha256']=sha(req.post_data.encode());row['body']={k:({'dataUrlSha256':sha(v.encode()),'length':len(v)} if k=='image' and isinstance(v,str) else v) for k,v in body.items()}
                requests.append(row)
                if '/auth/v1/user' in url.path:return reply(route,user)
                if '/rest/v1/quiz_results' in url.path:
                    if attempt in counts:counts[attempt]['profile']+=1
                    return reply(route,None)
                endpoint=re.sub(r'-v\d+$','',url.path.rstrip('/').split('/')[-1])
                if '/functions/v1/' in url.path and endpoint=='detect-wine-regions':counts[attempt]['detect']+=1;return reply(route,responses[endpoint])
                if '/functions/v1/' in url.path and endpoint=='analyze-wine-region':
                    counts[attempt]['analyze']+=1;rid=req.post_data_json['region_id'];return reply(route,responses[endpoint][rid])
                if '/functions/v1/' in url.path and endpoint=='search-wines':
                    counts[attempt]['search']+=1
                    if attempt==2 and auto_release_new:return reply(route,responses[endpoint])
                    held[attempt].append(route);return
                return reply(route,[] if '/rest/v1/' in url.path else {})
            def ws_handler(ws):
                local=urlparse(ws.url).netloc==urlparse(args.url).netloc;sockets.append({'host':urlparse(ws.url).hostname,'local':local,'blocked':not local})
                if local:ws.connect_to_server()
                else:ws.close(code=1008,reason='Only16 local replay')
            context.route('**/*',intercept);context.route_web_socket('**/*',ws_handler)
            context.on('request',lambda req:seen.append(req.url) if urlparse(req.url).netloc!=urlparse(args.url).netloc else None)
            context.on('requestfailed',lambda req:request_failures.append({'path':urlparse(req.url).path,'failure':req.failure}))
            storage={'sb-cbjynrbvrhcmpaojmqdp-auth-token':json.dumps(session),'matchrim.scan_privacy_notice.v2':'accepted','matchrim.local_profile_owner.v1':UID,'matchrim.onboarding.v2:'+UID:json.dumps({'version':2,'result':'skipped'})}
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(storage))
            page=context.new_page();page.set_default_timeout(7500)
            page.on('pageerror',lambda error:errors.append(str(error)))
            def diagnostic(message):
                text=re.sub(r'https?://\S+','<URL>',message.text)
                if message.type=='error':console.append(text)
                if message.type=='warning':warnings.append(text)
            page.on('console',diagnostic)
            def check(name,passed,detail=None):
                checks.append({'name':name,'passed':bool(passed),'detail':detail})
                if not passed:failures.append(name)
            def activate(button):
                if method=='touch':button.tap();return
                trace=[]
                for _ in range(100):
                    if button.evaluate('e=>e===document.activeElement'):break
                    page.keyboard.press('Tab');trace.append(page.evaluate('({tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute("aria-label")||document.activeElement?.textContent?.trim().slice(0,80)})'))
                else:raise AssertionError('Real Tab cannot reach control')
                observations.setdefault('tabTraces',[]).append(trace);page.keyboard.press('Enter')
            def choose():
                button=page.get_by_role('button',name='Elegir de galería',exact=True)
                with page.expect_file_chooser() as choice:activate(button)
                chooser=choice.value;observations.setdefault('chooserBefore',[]).append(chooser.element.evaluate('e=>({value:e.value,files:e.files.length})'));chooser.set_files(str(photo))
                observations.setdefault('selections',[]).append(chooser.element.evaluate('e=>[...e.files].map(f=>({name:f.name,type:f.type,size:f.size,lastModified:f.lastModified}))'))
            def wait_stable_catalog(index):
                prior=None;stable=0
                for _ in range(180):
                    page.wait_for_timeout(100);current=json.dumps(counts[index],sort_keys=True)
                    stable=stable+1 if current==prior else 0;prior=current
                    if held[index] and stable>=7:return
                raise AssertionError('Existing contract did not legitimately reach stable held canonical lookup')
            try:
                page.goto(args.url+'/escanear/etiqueta',wait_until='networkidle')
                check('Embedded fixture flag false and profile not preseeded',not page.get_by_text('QA local: respuestas deterministas.',exact=False).count() and not page.evaluate("localStorage.getItem('matchrim_quiz_result')"))
                attempt=1;choose();wait_stable_catalog(1);observations['aPending']=page.evaluate(snapshot);a_initial=json.loads(json.dumps(counts[1]))
                check('A legitimately analyzing with actual held catalog requests',observations['aPending']['phase']==['Leyendo cada región por separado'] and observations['aPending']['cancelVisible'] and len(held[1])>0,{'counts':a_initial,'held':len(held[1])})
                page.screenshot(path=str(args.output/(key+'-a-analyzing.png')));activate(page.get_by_role('button',name='Cancelar',exact=True))
                page.get_by_text('Análisis cancelado',exact=True).wait_for();observations['aCancelled']=page.evaluate(snapshot)
                check('A current cancel immediately recovers while its lookup remains held',observations['aCancelled']['phase']==['Análisis cancelado'] and observations['aCancelled']['closeVisible'] and not observations['aCancelled']['cancelVisible'] and not observations['aCancelled']['progress'] and len(held[1])>0 and not request_failures)
                page.screenshot(path=str(args.output/(key+'-a-cancelled.png')));activate(page.get_by_role('button',name='Cerrar análisis',exact=True))
                page.get_by_role('button',name='Elegir de galería',exact=True).wait_for();observations['reset']=page.evaluate(snapshot)
                attempt=2;choose();wait_stable_catalog(2);observations['bPending']=page.evaluate(snapshot)
                check('Real close/gallery exact-path reentry without input mutation',all(x['value']=='' and x['files']==0 for x in observations['chooserBefore']) and observations['selections'][0]==observations['selections'][1])
                check('B reaches same legitimate pending plan as A',counts[2]==a_initial and observations['bPending']['phase']==['Leyendo cada región por separado'] and len(held[2])==len(held[1]),json.loads(json.dumps(counts)))
                page.screenshot(path=str(args.output/(key+'-b-analyzing.png')));release_catalog(1,old_status);page.wait_for_timeout(1400);observations['afterOld']=page.evaluate(snapshot)
                stable_keys=['phase','cancelVisible','closeVisible','progress','performance','notices']
                check('Old completion cannot mark B cancelled or change its loader/progress/notice',all(observations['afterOld'][field]==observations['bPending'][field] for field in stable_keys),{'before':{k:observations['bPending'][k] for k in stable_keys},'after':{k:observations['afterOld'][k] for k in stable_keys}})
                check('Old completion does not mutate B regions or candidates',all(observations['afterOld'][field]==observations['bPending'][field] for field in ['regionPins','candidateRows']))
                check('Old completion starts no extra calls',counts[1]==a_initial and counts[2]==a_initial,json.loads(json.dumps(counts)))
                page.screenshot(path=str(args.output/(key+'-b-after-old-completion.png')));auto_release_new=True;release_catalog(2,200)
                page.get_by_text('Lote listo para revisar',exact=True).wait_for(timeout=45000);observations['final']=page.evaluate(snapshot)
                final_progress=observations['final']['progress']
                check('Only B own completions publish ready and return controls',observations['final']['phase']==['Lote listo para revisar'] and not observations['final']['cancelVisible'] and observations['final']['closeVisible'] and observations['final']['performance'] is not None and len(final_progress)==1 and re.fullmatch(r'translateX\(-?0%\)',final_progress[0]['indicator'] or '') is not None)
                check('Local operation plan frozen across before/after',not frozen or json.loads(json.dumps(counts))==next(result for result in frozen['results'] if result['case']==key)['countsByAttempt'],json.loads(json.dumps(counts)))
                unexpected=[text for text in console if not(old_status==503 and '503' in text and 'Failed to load resource' in text)]
                observations['expected503ConsoleControl']=[text for text in console if text not in unexpected]
                check('No unexpected runtime/console/overflow errors',not errors and not unexpected and observations['final']['width']['scroll']<=w,{'warnings':warnings,'console':console})
                check('All HTTP/WS intercepted, no REST writes/accounts/provider calls',sorted(seen)==sorted(handled) and all(s['local'] or s['blocked'] for s in sockets) and not any(r['method'] in ['PATCH','DELETE','PUT'] or(r['method']=='POST' and r['path'].startswith('/rest/v1/')) for r in requests))
                page.screenshot(path=str(args.output/(key+'-b-ready.png')))
            except Exception as error:
                failures.append(str(error));page.screenshot(path=str(args.output/(key+'-exception.png')))
            finally:
                results.append({'case':key,'passed':not failures,'checks':checks,'failures':failures,'observations':observations,'countsByAttempt':counts,'releases':releases,'requests':requests,'requestFailures':request_failures,'socketAudit':sockets,'errors':errors,'console':console,'warnings':warnings});context.close()
                (args.output/'results.json').write_text(json.dumps({'scope':__doc__,'realRemoteAppCalls':0,'realWrites':0,'paidCalls':0,'realAccounts':0,'results':results},ensure_ascii=False,indent=2)+'\n')
            print(key,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    finally:browser.close()
raise SystemExit(0 if all(result['passed'] for result in results) else 1)
