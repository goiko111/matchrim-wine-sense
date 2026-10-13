"""Measured display clusters under live resize/text/zoom; preserves original list identity and pixels."""
import argparse,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from qa_matchrim_runtime import add_browser_options,launch_browser,open_label_region,upload_scan_file
from qa_matchrim_cloud_fixture import ClientFixture,PHOTO
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',default='http://127.0.0.1:4469');p.add_argument('--output',type=Path,required=True);add_browser_options(p)
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True);rows=[]
with sync_playwright() as pw:
 b=launch_browser(pw,a)
 for mode in ['label','menu']:
  f=ClientFixture(b,a.url,viewport={'width':393,'height':852},is_mobile=True,has_touch=True);f.mobile_surface();page=f.page();checks=[];observed={}
  def check(name,ok,actual=None):checks.append({'name':name,'passed':bool(ok),'actual':actual})
  def pins():
   return page.locator('[data-testid^="region-pin-"]' if mode=='label' else '[data-testid^="wine-pin-"]').evaluate_all('els=>els.map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute("aria-label"),x:r.x,y:r.y,w:r.width,h:r.height}})')
  def disjoint(stage):
   data=pins();overlaps=[(i,j) for i,r in enumerate(data) for j,t in enumerate(data) if i<j and min(r['x']+r['w'],t['x']+t['w'])>max(r['x'],t['x']) and min(r['y']+r['h'],t['y']+t['h'])>max(r['y'],t['y'])];observed[stage]=data;check(stage+' targets disjoint',bool(data) and not overlaps,overlaps)
  try:
   page.goto(a.url+'/escanear/'+('etiqueta' if mode=='label' else 'carta-vinos'),wait_until='networkidle');upload_scan_file(page,mode,str(PHOTO))
   if mode=='label':expect(page.get_by_text('Lote listo para revisar',exact=True)).to_be_visible(timeout=45000)
   else:expect(page.get_by_role('button',name='Abrir vino 1: Lugana Allegrini',exact=True)).to_be_visible(timeout=45000)
   before_calls=len(f.requests);image=page.locator('img[alt="Foto analizada con regiones numeradas"]' if mode=='label' else 'img[alt="Carta con vinos marcados mediante numeros"]');before_src=image.get_attribute('src')
   disjoint('initial');page.add_style_tag(content='html{font-size:32px!important}');page.wait_for_timeout(200);disjoint('text changed after scan')
   page.set_viewport_size({'width':852,'height':393});page.wait_for_timeout(200);disjoint('landscape after scan')
   page.add_style_tag(content='html{font-size:16px!important}');page.set_viewport_size({'width':393,'height':852});page.wait_for_timeout(200)
   if mode=='menu':
    page.get_by_role('button',name='Acercar carta',exact=True).click();page.wait_for_timeout(200);disjoint('zoom150');page.get_by_role('button',name='Acercar carta',exact=True).click();page.wait_for_timeout(200);disjoint('zoom200')
    row_list=page.get_by_role('button',name=re.compile('^Abrir vino \\d+:')).all()
    last=row_list[-1];expected=last.get_attribute('aria-label').split(': ',1)[1];last.click();expect(page.get_by_role('dialog').get_by_role('heading').first).to_contain_text(expected)
    check('Last original row still opens its own identity',expected in page.get_by_role('dialog').inner_text(),expected)
    page.get_by_role('dialog').get_by_role('button',name='Cerrar detalle',exact=True).click()
   else:
    for index in [1,2,3,4,5]:
     open_label_region(page,index);check('Original region remains reachable '+str(index),page.get_by_role('dialog').get_by_role('heading').first.inner_text().startswith('Región '+str(index)+':'));page.get_by_role('dialog').get_by_role('button',name='Cerrar',exact=True).click();expect(page.get_by_role('dialog')).to_be_hidden()
   check('Grouping does not call OCR/catalog again',len(f.requests)==before_calls)
   check('Image data URL pixels remain exact across layout changes',image.get_attribute('src')==before_src)
   check('No runtime/observer errors and frozen sources',not f.errors and f.finish()['sourcesUnchanged'],f.errors)
   page.screenshot(path=str(a.output/(mode+'.png')))
  except Exception as e:check('Scenario completed',False,str(e));page.screenshot(path=str(a.output/(mode+'-failure.png')))
  finally:rows.append({'mode':mode,'checks':checks,'observed':observed,'network':f.finish(),'passed':all(c['passed'] for c in checks)});f.context.close()
 b.close()
(a.output/'results.json').write_text(json.dumps({'scope':__doc__,'results':rows},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':sum(len(r['checks']) for r in rows),'failed':[r['mode'] for r in rows if not r['passed']]}))
if any(not r['passed'] for r in rows):raise SystemExit(1)
