"""Deterministic browser scheduling on the original public pixels; no provider/model/native QA."""
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
from qa_matchrim_runtime import add_browser_options, launch_browser

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--url',default='http://127.0.0.1:4469')
p.add_argument('--output',type=Path,required=True)
add_browser_options(p)
a=p.parse_args(); a.output.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
photo=root/'qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg'
assert hashlib.sha256(photo.read_bytes()).hexdigest()=='9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9'
contract=root/'scripts/qa-multi-wine-ui.py'
assert hashlib.sha256(contract.read_bytes()).hexdigest()=='f2aa2924e48c8c2f6f0cbe45011e6ef92bda3cb17be14a645659b70a0343ae40'
scope={}; tree=ast.parse(contract.read_text())
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['candidate','function_response']],type_ignores=[]),str(contract),'exec'),scope)
responses={'detect':scope['function_response']('detect-wine-regions',SimpleNamespace(post_data_json={})), 'analyze':{rid:scope['function_response']('analyze-wine-region',SimpleNamespace(post_data_json={'region_id':rid})) for rid in ['region-1','region-2','region-3','region-4','region-5']}}
uid='00000000-0000-4000-8000-000000000080'
enc=lambda v:base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
def session_for(owner):
 user={'id':owner,'aud':'authenticated','role':'authenticated','email':'qa@matchrim.invalid','app_metadata':{'provider':'email'},'user_metadata':{}}
 return {'user':user,'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':owner,'exp':1900000000})+'.'+enc('synthetic-invalid'),'refresh_token':'synthetic-invalid','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}
AUTH='sb-cbjynrbvrhcmpaojmqdp-auth-token'
rows=[]
with sync_playwright() as pw:
 browser=launch_browser(pw,a)
 for scenario in ['cancel-read','cancel-decode','stale-read-error','owner-read','retry-offline']:
  context=browser.new_context(viewport={'width':393,'height':852},is_mobile=True,has_touch=True,service_workers='block',reduced_motion='reduce')
  checks=[]; counts={'profile':0,'detect':0,'analyze':0,'search':0}; seen=[]; handled=[]; errors=[]; held=[]
  def reply(route,body):route.fulfill(status=200,content_type='application/json',body=json.dumps(body))
  def intercept(route):
   req=route.request; u=urlparse(req.url)
   if u.scheme=='http' and u.netloc==urlparse(a.url).netloc:return route.continue_()
   handled.append(req.url)
   assert req.method not in ['PUT','PATCH','DELETE']
   assert not(req.method=='POST' and '/rest/v1/' in u.path)
   if '/auth/v1/user' in u.path:return reply(route,session_for(uid)['user'])
   if '/rest/v1/quiz_results' in u.path:counts['profile']+=1;return reply(route,None)
   endpoint=re.sub(r'-v\d+$','',u.path.rstrip('/').split('/')[-1])
   if '/functions/v1/' in u.path and endpoint=='detect-wine-regions':
    counts['detect']+=1
    if scenario=='retry-offline' and counts['detect']==1:return route.abort('internetdisconnected')
    return reply(route,responses['detect'])
   if '/functions/v1/' in u.path and endpoint=='analyze-wine-region':counts['analyze']+=1;return reply(route,responses['analyze'][req.post_data_json['region_id']])
   if '/functions/v1/' in u.path and endpoint=='search-wines':counts['search']+=1;return reply(route,{'wines':[]})
   return reply(route,[] if '/rest/v1/' in u.path else {})
  context.route('**/*',intercept)
  context.route_web_socket('**/*',lambda ws:ws.connect_to_server() if urlparse(ws.url).netloc==urlparse(a.url).netloc else ws.close(code=1008))
  context.on('request',lambda r:seen.append(r.url) if urlparse(r.url).netloc!=urlparse(a.url).netloc else None)
  storage={AUTH:json.dumps(session_for(uid)),'matchrim.scan_privacy_notice.v2':'accepted','matchrim.local_profile_owner.v1':uid,'matchrim.onboarding.v2:'+uid:json.dumps({'version':2,'result':'skipped'})}
  context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(storage))
  context.add_init_script('''
   window.__qa={readQueue:[],decodeQueue:[],images:0,canvases:0,aborts:0,delayDecode:false};
   const NativeReader=window.FileReader, NativeImage=window.Image, create=document.createElement.bind(document);
   window.FileReader=class extends NativeReader{
    readAsDataURL(file){if(file.name==='delayed-public.jpg')window.__qa.readQueue.push({reader:this,read:()=>super.readAsDataURL(file)});else super.readAsDataURL(file)}
    abort(){window.__qa.aborts++;super.abort()}
   };
   window.Image=function(...args){
    window.__qa.images++;const image=new NativeImage(...args);
    if(window.__qa.delayDecode){window.__qa.delayDecode=false;let callback=null;
     Object.defineProperty(image,'onload',{get:()=>callback,set:v=>{callback=v},configurable:true});
     image.addEventListener('load',()=>window.__qa.decodeQueue.push(()=>callback?.call(image,new Event('load'))),{once:true});
    }return image;
   };
   document.createElement=function(name,...args){if(name==='canvas')window.__qa.canvases++;return create(name,...args)};
  ''')
  page=context.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda e:errors.append(str(e)))
  def check(name,ok,actual=None):checks.append({'name':name,'passed':bool(ok),'actual':actual})
  def upload(name):
   with page.expect_file_chooser() as event:page.get_by_role('button',name='Elegir de galería',exact=True).tap()
   chooser=event.value
   chooser.set_files({'name':name,'mimeType':'image/jpeg','buffer':photo.read_bytes()});chooser.element.dispose()
  try:
   page.goto(a.url+'/escanear/etiqueta',wait_until='networkidle')
   before=counts.copy()
   if scenario=='retry-offline':
    upload('original-public.jpg');page.get_by_text('Lote listo para revisar',exact=True).wait_for(timeout=45000)
    check('Transient detection failure retries intercepted request and recovers',counts['detect']==2 and counts['analyze']==4,counts.copy())
   else:
    if scenario=='cancel-decode':page.evaluate('window.__qa.delayDecode=true')
    upload('original-public.jpg' if scenario=='cancel-decode' else 'delayed-public.jpg')
    page.wait_for_function('()=>window.__qa.readQueue.length>0||window.__qa.decodeQueue.length>0').dispose()
    check('Preparation cancellation is visible before preview',page.get_by_role('button',name='Cancelar',exact=True).is_visible())
    if scenario=='owner-read':
     other=session_for('00000000-0000-4000-8000-000000000081')
     page.evaluate('([key,session])=>{localStorage.setItem(key,JSON.stringify(session));const c=new BroadcastChannel(key);c.postMessage({event:"SIGNED_IN",session});setTimeout(()=>c.close(),100)}',[AUTH,other])
     page.wait_for_timeout(250)
    else:
     page.get_by_role('button',name='Cancelar',exact=True).tap()
     page.get_by_test_id('scan-input-cancelled').wait_for()
    resources=page.evaluate('({images:__qa.images,canvases:__qa.canvases})')
    if scenario=='stale-read-error':
     upload('recovery-public.jpg');page.get_by_text('Lote listo para revisar',exact=True).wait_for(timeout=45000)
     page.evaluate('for(const entry of __qa.readQueue.splice(0))entry.reader.dispatchEvent(new Event("error"))')
     page.wait_for_timeout(150)
     check('Late cancelled reader failure cannot replace newer ready scene',page.get_by_text('Lote listo para revisar',exact=True).count()==1 and page.get_by_test_id('scan-input-error').count()==0)
    else:
     page.evaluate('for(const entry of __qa.readQueue.splice(0))entry.read();for(const finish of __qa.decodeQueue.splice(0))finish()')
     page.wait_for_timeout(350)
     after=page.evaluate('({images:__qa.images,canvases:__qa.canvases})')
     check('Cancelled preparation stops further image/canvas work',after==resources,{'before':resources,'after':after})
     check('Cancelled preparation never reaches profile/provider/catalog',counts==before,counts.copy())
     if scenario!='owner-read':check('Cancellation persists after late success',page.get_by_test_id('scan-input-cancelled').count()==1)
   check('No browser runtime errors',not errors,errors)
   check('External app HTTP intercepted before navigation',sorted(seen)==sorted(handled))
   page.screenshot(path=str(a.output/(scenario+'.png')))
  except Exception as e:check('Scenario completed',False,str(e));page.screenshot(path=str(a.output/(scenario+'-failure.png')))
  finally:
   rows.append({'scenario':scenario,'checks':checks,'counts':counts,'passed':all(r['passed'] for r in checks)});context.close()
 browser.close()
(a.output/'results.json').write_text(json.dumps({'scope':__doc__,'browserVersion':browser.version,'results':rows},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':sum(len(r['checks']) for r in rows),'failures':[{'scenario':r['scenario'],'checks':[c for c in r['checks'] if not c['passed']]} for r in rows if not r['passed']]}))
if any(not r['passed'] for r in rows):raise SystemExit(1)
