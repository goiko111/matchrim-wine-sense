"""Actual Tab/End/Home reading of overflowed client detail; web keyboard only."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from qa_matchrim_runtime import add_browser_options,launch_browser,open_label_region,upload_scan_file
from qa_matchrim_cloud_fixture import ClientFixture,PHOTO
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',default='http://127.0.0.1:4469');p.add_argument('--output',type=Path,required=True);add_browser_options(p)
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True);rows=[]
with sync_playwright() as pw:
 browser=launch_browser(pw,a)
 for mode in ['label','menu']:
  for case,w,h,scale in [('portrait',393,852,1),('landscape',852,393,1),('text-200',393,852,2)]:
   f=ClientFixture(browser,a.url,viewport={'width':w,'height':h},is_mobile=True,has_touch=True);f.mobile_surface();page=f.page();checks=[];observed={}
   def check(name,ok,actual=None):checks.append({'name':name,'passed':bool(ok),'actual':actual})
   try:
    page.goto(a.url+'/escanear/'+('etiqueta' if mode=='label' else 'carta-vinos'),wait_until='networkidle')
    if scale!=1:page.add_style_tag(content='html{font-size:32px!important}')
    upload_scan_file(page,mode,str(PHOTO))
    if mode=='label':expect(page.get_by_text('Lote listo para revisar',exact=True)).to_be_visible(timeout=45000);open_label_region(page,2)
    else:expect(page.get_by_role('button',name='Abrir vino 1: Lugana Allegrini',exact=True)).to_be_visible(timeout=45000);page.get_by_role('button',name='Abrir vino 1: Lugana Allegrini',exact=True).click()
    dialog=page.get_by_role('dialog');expect(dialog).to_be_visible();page.wait_for_timeout(350)
    body=dialog.locator('.overflow-y-auto');initial=body.evaluate('e=>({height:e.clientHeight,scroll:e.scrollHeight,top:e.scrollTop,tabIndex:e.tabIndex,role:e.getAttribute("role"),label:e.getAttribute("aria-label")})');observed['initial']=initial
    close=dialog.get_by_role('button',name='Cerrar' if mode=='label' else 'Cerrar detalle',exact=True);close.focus();trace=[];reached=False
    for _ in range(40):
     page.keyboard.press('Tab');trace.append(dialog.evaluate('e=>({tag:document.activeElement.tagName,label:document.activeElement.getAttribute("aria-label"),text:document.activeElement.textContent.slice(0,70)})'))
     if body.evaluate('e=>e===document.activeElement'):reached=True;break
    observed['tabTrace']=trace
    if initial['scroll']>initial['height']+1:
     check('Actual Tab reaches overflowed body',reached)
     if reached:
      page.keyboard.press('End');page.wait_for_function('()=>{const e=document.querySelector("[role=dialog] .overflow-y-auto");return e&&Math.abs(e.scrollTop-(e.scrollHeight-e.clientHeight))<=2}').dispose();end=body.evaluate('e=>({top:e.scrollTop,max:e.scrollHeight-e.clientHeight,focused:e===document.activeElement})');observed['end']=end
      check('End reaches last text with focus retained',end['focused'] and abs(end['top']-end['max'])<=2,end)
      page.wait_for_timeout(250);page.keyboard.press('Home');page.wait_for_function('()=>document.querySelector("[role=dialog] .overflow-y-auto")?.scrollTop<=2').dispose();home=body.evaluate('e=>({top:e.scrollTop,focused:e===document.activeElement})');observed['home']=home
      check('Home returns to start',home['focused'] and home['top']<=2,home)
    else:check('No overflow requires no extra scroll control',True,initial)
    check('Frozen sources and no runtime errors',f.finish()['sourcesUnchanged'] and not f.errors)
    page.screenshot(path=str(a.output/(mode+'-'+case+'.png')))
   except Exception as error:check('Scenario completed',False,str(error));page.screenshot(path=str(a.output/(mode+'-'+case+'-failure.png')))
   finally:rows.append({'mode':mode,'case':case,'checks':checks,'observed':observed,'network':f.finish(),'passed':all(c['passed'] for c in checks)});f.context.close()
 browser.close()
(a.output/'results.json').write_text(json.dumps({'scope':__doc__,'results':rows},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':sum(len(r['checks']) for r in rows),'failed':[{'mode':r['mode'],'case':r['case'],'checks':[c for c in r['checks'] if not c['passed']]} for r in rows if not r['passed']]}))
if any(not r['passed'] for r in rows):raise SystemExit(1)
