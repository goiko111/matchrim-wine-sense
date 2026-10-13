"""Accessible numeric progress/meter contract and single existing local-stub scan, not vision/native/user QA."""
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

p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--url',default='http://127.0.0.1:4464')
args=p.parse_args();root=Path(__file__).resolve().parents[1]
primitive=json.loads((args.output/'primitive-cases.json').read_text());html=(args.output/'primitives.html').read_text()
photo=root/'qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg';contract_source=root/'scripts/qa-multi-wine-ui.py'
sha=lambda value:hashlib.sha256(value).hexdigest()
assert sha(photo.read_bytes())=='9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9'
assert sha(contract_source.read_bytes())=='f2aa2924e48c8c2f6f0cbe45011e6ef92bda3cb17be14a645659b70a0343ae40'
tree=ast.parse(contract_source.read_text());scope={};exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['candidate','function_response']],type_ignores=[]),str(contract_source),'exec'),scope)
responses={'detect':scope['function_response']('detect-wine-regions',SimpleNamespace(post_data_json={})), 'analyze':{rid:scope['function_response']('analyze-wine-region',SimpleNamespace(post_data_json={'region_id':rid})) for rid in ['region-1','region-2','region-3','region-4','region-5']}}
(args.output/'scan-response-payloads.json').write_text(json.dumps(responses,ensure_ascii=False,indent=2)+'\n')
UID='00000000-0000-4000-8000-000000000080';enc=lambda value:base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
user={'id':UID,'aud':'authenticated','role':'authenticated','email':'qa@matchrim.invalid','app_metadata':{'provider':'email'},'user_metadata':{}}
session={'user':user,'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':UID,'exp':1900000000})+'.'+enc('synthetic-invalid'),'refresh_token':'synthetic-invalid','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}
measure=r"""e=>{
 const r=e.getBoundingClientRect(),child=e.firstElementChild?.getBoundingClientRect();
 return {role:e.getAttribute('role'),name:e.getAttribute('aria-label'),now:e.getAttribute('aria-valuenow'),min:e.getAttribute('aria-valuemin'),max:e.getAttribute('aria-valuemax'),text:e.getAttribute('aria-valuetext'),state:e.getAttribute('data-state'),indicator:e.firstElementChild?.style.transform,visualPercent:child&&r.width?(1+(child.left-r.left)/r.width)*100:null,rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right},viewport:innerWidth};
}"""
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for width,height,orientation in [(393,852,'portrait'),(852,393,'landscape')]:
            for kind in ['primitive','scan']:
                context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,reduced_motion='reduce',service_workers='block')
                case=kind+'-'+orientation;checks=[];failures=[];observations={};requests=[];seen=[];handled=[];sockets=[];errors=[];console=[];held={'profile':[],'detect':[],'search':[]};counts={'profile':0,'detect':0,'analyze':0,'search':0};scanning=False
                def reply(route,body):route.fulfill(status=200,content_type='application/json',body=json.dumps(body),headers={'Access-Control-Allow-Origin':'*'})
                def intercept(route):
                    req=route.request;url=urlparse(req.url)
                    if url.netloc==urlparse(args.url).netloc:
                        if url.path=='/__qa_progress':return route.fulfill(status=200,content_type='text/html',body=html)
                        return route.continue_()
                    handled.append(req.url);row={'method':req.method,'path':url.path}
                    if req.post_data and '/functions/v1/' in url.path:
                        body=req.post_data_json;row['bodySha256']=sha(req.post_data.encode());row['body']={k:({'sha256':sha(v.encode()),'length':len(v)} if k=='image' and isinstance(v,str) else v) for k,v in body.items()}
                    requests.append(row)
                    if '/auth/v1/user' in url.path:return reply(route,user)
                    if '/rest/v1/quiz_results' in url.path and scanning:counts['profile']+=1;held['profile'].append(route);return
                    endpoint=re.sub(r'-v\d+$','',url.path.rstrip('/').split('/')[-1])
                    if '/functions/v1/' in url.path and endpoint=='detect-wine-regions':counts['detect']+=1;held['detect'].append(route);return
                    if '/functions/v1/' in url.path and endpoint=='analyze-wine-region':counts['analyze']+=1;return reply(route,responses['analyze'][req.post_data_json['region_id']])
                    if '/functions/v1/' in url.path and endpoint=='search-wines':counts['search']+=1;held['search'].append(route);return
                    return reply(route,[] if '/rest/v1/' in url.path else {})
                def ws_handler(ws):
                    local=urlparse(ws.url).netloc==urlparse(args.url).netloc;sockets.append({'local':local,'blocked':not local})
                    if local:ws.connect_to_server()
                    else:ws.close(code=1008,reason='Local progress QA only')
                context.route('**/*',intercept);context.route_web_socket('**/*',ws_handler)
                context.on('request',lambda req:seen.append(req.url) if urlparse(req.url).netloc!=urlparse(args.url).netloc else None)
                if kind=='scan':
                    storage={'sb-cbjynrbvrhcmpaojmqdp-auth-token':json.dumps(session),'matchrim.scan_privacy_notice.v2':'accepted','matchrim.local_profile_owner.v1':UID,'matchrim.onboarding.v2:'+UID:json.dumps({'version':2,'result':'skipped'})}
                    context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(storage))
                page=context.new_page();page.set_default_timeout(7500);page.on('pageerror',lambda error:errors.append(str(error)));page.on('console',lambda message:console.append(re.sub(r'https?://\S+','<URL>',message.text)) if message.type=='error' else None)
                cdp=context.new_cdp_session(page)
                def ax(selector):
                    doc=cdp.send('DOM.getDocument',{'depth':0});node=cdp.send('DOM.querySelector',{'nodeId':doc['root']['nodeId'],'selector':selector})
                    return cdp.send('Accessibility.getPartialAXTree',{'nodeId':node['nodeId'],'fetchRelatives':False})['nodes']
                def check(name,passed,detail=None):
                    checks.append({'name':name,'passed':bool(passed),'detail':detail})
                    if not passed:failures.append(name)
                def semantics(dom,expected_role,expected_name,value,text):
                    return dom['role']==expected_role and dom['name']==expected_name and dom['min']=='0' and dom['max']=='100' and (dom['now'] is None if value is None else dom['now'] is not None and float(dom['now'])==value) and dom['text']==text and dom['state']==('indeterminate' if value is None else 'complete' if value==100 else 'loading')
                def accessible(nodes,role,name,value):
                    return any(node.get('role',{}).get('value')==role and node.get('name',{}).get('value')==name and (value is None or node.get('value',{}).get('value')==value) for node in nodes)
                def activate(button):
                    if orientation=='landscape':button.tap();return
                    for _ in range(80):
                        if button.evaluate('e=>e===document.activeElement'):break
                        page.keyboard.press('Tab')
                    else:raise AssertionError('Real keyboard cannot reach gallery')
                    page.keyboard.press('Enter')
                def wait_held(key):
                    for _ in range(180):
                        if held[key]:return
                        page.wait_for_timeout(10)
                    raise AssertionError('Expected real client request never reached local route '+key)
                try:
                    if kind=='primitive':
                        page.goto(args.url+'/__qa_progress',wait_until='networkidle');page.evaluate('document.fonts.ready');observations['cases']=[]
                        for item in primitive['cases']:
                            selector='[data-case="'+item['id']+'"] [role]';element=page.locator(selector);dom=element.evaluate(measure);nodes=ax(selector)
                            check(item['id']+' DOM role/name/range/value/text/state',semantics(dom,item['role'],item['name'],item['expectedNow'],item['expectedText']),dom)
                            check(item['id']+' computed accessibility role/name/value',accessible(nodes,item['role'],item['name'],item['expectedNow']),nodes)
                            value=item['syntheticPrimitiveValue'] or 0
                            check(item['id']+' visual percentage and stable mobile bounds',abs(dom['visualPercent']-value)<0.1 and dom['rect']['x']>=0 and dom['rect']['right']<=width and dom['rect']['height']>=6,dom)
                            observations['cases'].append({'case':item['id'],'dom':dom,'ax':nodes})
                        page.screenshot(path=str(args.output/(case+'.png')),full_page=True)
                    else:
                        page.goto(args.url+'/escanear/etiqueta',wait_until='networkidle')
                        with page.expect_file_chooser() as choice:activate(page.get_by_role('button',name='Elegir de galería',exact=True))
                        chooser=choice.value;observations['chooserBefore']=chooser.element.evaluate('e=>({value:e.value,count:e.files.length})');scanning=True;chooser.set_files(str(photo));observations['selection']=chooser.element.evaluate('e=>[...e.files].map(f=>({name:f.name,type:f.type,size:f.size,lastModified:f.lastModified}))')
                        check('Actual gallery chooser path, empty input and fixture bypass disabled',observations['chooserBefore']=={'value':'','count':0} and observations['selection'][0]['name']==photo.name and not page.get_by_text('QA local: respuestas deterministas.',exact=False).count())
                        for label,key,value in [('Cargando tu perfil','profile',24),('Localizando botellas y etiquetas','detect',24),('Leyendo cada región por separado','search',42)]:
                            wait_held(key)
                            if key=='search':page.wait_for_timeout(750)
                            page.get_by_text(label,exact=True).wait_for();selector='[role=progressbar]';dom=page.locator(selector).evaluate(measure);nodes=ax(selector)
                            observations[key]={'dom':dom,'ax':nodes,'phase':label,'counts':counts.copy()}
                            check('App '+key+' value and accessible name',semantics(dom,'progressbar','Progreso estimado del escaneo de etiquetas',value,str(value)+'%') and accessible(nodes,'progressbar','Progreso estimado del escaneo de etiquetas',value),observations[key])
                            page.screenshot(path=str(args.output/(case+'-'+key+'.png')))
                            for route in held[key]:reply(route,None if key=='profile' else responses['detect'] if key=='detect' else {'wines':[]})
                        page.get_by_text('Lote listo para revisar',exact=True).wait_for(timeout=45000);page.wait_for_timeout(400)
                        dom=page.locator('[role=progressbar]').evaluate(measure);nodes=ax('[role=progressbar]');observations['ready']={'dom':dom,'ax':nodes,'phase':'Lote listo para revisar'}
                        check('App ready exposes100 without replacing pending identity/affinity data',semantics(dom,'progressbar','Progreso estimado del escaneo de etiquetas',100,'100%') and accessible(nodes,'progressbar','Progreso estimado del escaneo de etiquetas',100))
                        check('Observed scan plan unchanged with null profile/empty catalog',counts=={'profile':1,'detect':1,'analyze':4,'search':3},counts.copy())
                        page.screenshot(path=str(args.output/(case+'-ready.png')))
                    check('No unexpected console/runtime/horizontal overflow',not errors and not console and page.evaluate('document.documentElement.scrollWidth<=innerWidth'),{'errors':errors,'console':console})
                    check('All external HTTP/WS intercepted with zero real writes',sorted(seen)==sorted(handled) and all(s['local'] or s['blocked'] for s in sockets) and not any(r['method'] in ['PATCH','DELETE','PUT'] or(r['method']=='POST' and r['path'].startswith('/rest/v1/')) for r in requests))
                except Exception as error:
                    failures.append(str(error));page.screenshot(path=str(args.output/(case+'-exception.png')))
                finally:
                    results.append({'case':case,'passed':not failures,'checks':checks,'failures':failures,'observations':observations,'requests':requests,'counts':counts,'sockets':sockets,'errors':errors,'console':console});context.close()
                    (args.output/'results.json').write_text(json.dumps({'scope':__doc__,'realRemoteAppCalls':0,'realWrites':0,'realAccounts':0,'paidCalls':0,'results':results},ensure_ascii=False,indent=2)+'\n')
                print(case,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    finally:browser.close()
raise SystemExit(0 if all(item['passed'] for item in results) else 1)
