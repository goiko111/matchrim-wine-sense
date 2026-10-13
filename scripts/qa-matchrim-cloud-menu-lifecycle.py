"""Menu preparation cancellation/owner schedule on public canary pixels and old intercepted payloads."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from qa_matchrim_runtime import add_browser_options,launch_browser,upload_scan_file
from qa_matchrim_cloud_fixture import ClientFixture,PHOTO,AUTH,fake_session
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',default='http://127.0.0.1:4469');p.add_argument('--output',type=Path,required=True);add_browser_options(p)
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True);rows=[]
with sync_playwright() as pw:
 browser=launch_browser(pw,a)
 for scenario in ['cancel-read','owner-read','stale-error-new-scan','cancel-decode']:
  fixture=ClientFixture(browser,a.url,viewport={'width':393,'height':852},is_mobile=True,has_touch=True);fixture.mobile_surface()
  fixture.context.add_init_script('''
   window.__qa={readQueue:[],decodeQueue:[],images:0,canvases:0,delayDecode:false};
   const Reader=FileReader,NativeImage=Image,create=document.createElement.bind(document);
   window.FileReader=class extends Reader{readAsDataURL(file){if(file.name==='delayed-public.jpg')__qa.readQueue.push({reader:this,read:()=>super.readAsDataURL(file)});else super.readAsDataURL(file)}};
   window.Image=function(...args){__qa.images++;const image=new NativeImage(...args);
    if(__qa.delayDecode){__qa.delayDecode=false;let callback=null;Object.defineProperty(image,'onload',{get:()=>callback,set:v=>callback=v,configurable:true});image.addEventListener('load',()=>__qa.decodeQueue.push(()=>callback?.call(image,new Event('load'))),{once:true})}return image};
   document.createElement=function(name,...args){if(name==='canvas')__qa.canvases++;return create(name,...args)};
  ''')
  page=fixture.page();checks=[]
  def check(name,passed,actual=None):checks.append({'name':name,'passed':bool(passed),'actual':actual})
  def upload(delayed=True):upload_scan_file(page,'menu',{'name':'delayed-public.jpg' if delayed else 'public-original.jpg','mimeType':'image/jpeg','buffer':PHOTO.read_bytes()})
  try:
   page.goto(a.url+'/escanear/carta-vinos',wait_until='networkidle')
   if scenario=='cancel-decode':page.evaluate('__qa.delayDecode=true')
   upload(scenario!='cancel-decode');page.wait_for_function('()=>__qa.readQueue.length>0||__qa.decodeQueue.length>0').dispose()
   before=page.evaluate('({images:__qa.images,canvases:__qa.canvases})')
   request_count=len(fixture.requests)
   if scenario=='owner-read':
    page.evaluate('([key,session])=>{localStorage.setItem(key,JSON.stringify(session));const c=new BroadcastChannel(key);c.postMessage({event:"SIGNED_IN",session});setTimeout(()=>c.close(),100)}',[AUTH,fake_session('00000000-0000-4000-8000-000000000081')])
    page.wait_for_timeout(250)
   else:
    page.get_by_role('button',name='Cancelar análisis',exact=True).click()
    page.wait_for_timeout(150)
    check('Cancellation releases loader before delayed read/decode completes',page.get_by_role('button',name='Cancelar análisis',exact=True).count()==0)
   if scenario=='stale-error-new-scan':
    if page.get_by_role('button',name='Cancelar análisis',exact=True).count():
     check('New scan is available immediately after cancelling preparation',False)
    else:
     upload(False);expect(page.get_by_role('button',name='Abrir vino 1: Lugana Allegrini',exact=True)).to_be_visible(timeout=45000)
     page.evaluate('for(const item of __qa.readQueue.splice(0))item.reader.dispatchEvent(new Event("error"))');page.wait_for_timeout(200)
     check('Old read error does not clear newer menu results',page.get_by_role('button',name='Abrir vino 1: Lugana Allegrini',exact=True).count()==1)
   else:
    page.evaluate('for(const item of __qa.readQueue.splice(0))item.read();for(const done of __qa.decodeQueue.splice(0))done()');page.wait_for_timeout(350)
    after=page.evaluate('({images:__qa.images,canvases:__qa.canvases})')
    check('Cancelled menu preparation creates no further image/canvas',before==after,{'before':before,'after':after})
    check('Cancelled scene cannot publish a late preview',page.locator('img[alt="Carta con vinos marcados mediante numeros"]').count()==0)
    check('No provider/profile/catalog work after cancellation',not any('/functions/v1/' in r['path'] for r in fixture.requests[request_count:]))
   check('Web runtime errors absent',not fixture.errors,fixture.errors)
   page.screenshot(path=str(a.output/(scenario+'.png')))
  except Exception as error:check('Scenario completed',False,str(error));page.screenshot(path=str(a.output/(scenario+'-failure.png')))
  finally:rows.append({'scenario':scenario,'checks':checks,'network':fixture.finish(),'passed':all(c['passed'] for c in checks)});fixture.context.close()
 browser.close()
(a.output/'results.json').write_text(json.dumps({'scope':__doc__,'results':rows},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':sum(len(r['checks']) for r in rows),'failed':[{'scenario':r['scenario'],'checks':[c for c in r['checks'] if not c['passed']]} for r in rows if not r['passed']]}))
if any(not r['passed'] for r in rows):raise SystemExit(1)
