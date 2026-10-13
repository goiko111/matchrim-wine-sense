"""Web layout/keyboard/AX checks; mobile styling is emulated, never physical iOS QA."""
import argparse
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from qa_matchrim_runtime import add_browser_options,launch_browser,open_label_region,upload_scan_file
from qa_matchrim_cloud_fixture import ClientFixture,PHOTO
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--url',default='http://127.0.0.1:4469');p.add_argument('--output',type=Path,required=True)
add_browser_options(p);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
rows=[]
with sync_playwright() as pw:
 browser=launch_browser(pw,a)
 for mode in ['label','menu']:
  for case,w,h,scale,mobile in [('narrow',320,568,1,True),('portrait',393,852,1,True),('landscape',852,393,1,True),('text-200',393,852,2,True),('web-keyboard',720,800,1,False)]:
   fixture=ClientFixture(browser,a.url,viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile)
   if mobile:fixture.mobile_surface()
   page=fixture.page();checks=[];observed={}
   def check(name,ok,detail=None):checks.append({'name':name,'passed':bool(ok),'actual':detail})
   def contained():return page.evaluate('document.documentElement.scrollWidth')<=w+1
   def capture(stage):page.screenshot(path=str(a.output/(mode+'-'+case+'-'+stage+'.png')))
   def rects(locator):return locator.evaluate_all('els=>els.map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute("aria-label"),x:r.x,y:r.y,w:r.width,h:r.height}})')
   try:
    page.goto(a.url+'/escanear/'+('etiqueta' if mode=='label' else 'carta-vinos'),wait_until='networkidle')
    if scale!=1:page.add_style_tag(content='html {font-size:32px !important}')
    if mode=='label':
     with page.expect_file_chooser() as event:page.get_by_role('button',name='Elegir de galería',exact=True).click()
     chooser=event.value;chooser.set_files(str(PHOTO));chooser.element.dispose()
     expect(page.get_by_text('Lote listo para revisar',exact=True)).to_be_visible(timeout=45000)
    else:
     upload_scan_file(page,'menu',str(PHOTO))
     expect(page.get_by_role('button',name=re.compile('^Abrir vino 1:'))).to_be_visible(timeout=45000)
    check('Document has no horizontal overflow',contained());capture('scene')
    pins=page.locator('[data-testid^="region-pin-"]' if mode=='label' else '[data-testid^="wine-pin-"]')
    observed['pins']=rects(pins)
    check('Pins expose accessible names and 44px targets',bool(observed['pins']) and all(r['label'] and r['w']>=44 and r['h']>=44 for r in observed['pins']),observed['pins'])
    # The original recorded pin positions are preserved; overlap is measured, not
    # silently removed or replaced with synthetic identity/scene coordinates.
    observed['pinOverlaps']=[(i,j) for i,r in enumerate(observed['pins']) for j,t in enumerate(observed['pins']) if i<j and min(r['x']+r['w'],t['x']+t['w'])>max(r['x'],t['x']) and min(r['y']+r['h'],t['y']+t['h'])>max(r['y'],t['y'])]
    check('Measured pin hit targets do not overlap',not observed['pinOverlaps'],observed['pinOverlaps'])
    if mode=='label':
     detail_button=page.get_by_test_id('region-pin-2')
    else:detail_button=page.get_by_role('button',name=re.compile('^Abrir vino 1:'))
    detail_button.click() if mode=='menu' else open_label_region(page,2,touch=mobile);dialog=page.get_by_role('dialog');expect(dialog).to_be_visible()
    page.wait_for_function('()=>{const r=document.querySelector("[role=dialog]")?.getBoundingClientRect();return r&&r.top>=-1&&r.bottom<=innerHeight+1}').dispose()
    page.wait_for_timeout(350)
    observed['visibleViewport']=page.evaluate('({x:visualViewport?.offsetLeft||0,y:visualViewport?.offsetTop||0,width:visualViewport?.width||innerWidth,height:visualViewport?.height||innerHeight,layoutWidth:innerWidth,layoutHeight:innerHeight})')
    observed['dialog']=dialog.evaluate('e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,text:e.innerText}}')
    check('Detail fits viewport including text scale',observed['dialog']['x']>=observed['visibleViewport']['x']-1 and observed['dialog']['right']<=observed['visibleViewport']['x']+observed['visibleViewport']['width']+1 and observed['dialog']['y']>=observed['visibleViewport']['y']-1 and observed['dialog']['bottom']<=observed['visibleViewport']['y']+observed['visibleViewport']['height']+1,observed['dialog'])
    check('No positive affinity without profile/catalog',not re.search(r'\d+% de encaje',observed['dialog']['text']) and ('pendiente' in observed['dialog']['text'].lower() or 'perfil' in observed['dialog']['text'].lower()))
    # Read actual accessibility tree in the web browser.
    cdp=fixture.context.new_cdp_session(page)
    ax=cdp.send('Accessibility.getFullAXTree')['nodes'];cdp.detach()
    observed['axDialogs']=[{'name':n.get('name',{}).get('value'),'ignored':n.get('ignored')} for n in ax if n.get('role',{}).get('value')=='dialog']
    check('Dialog is named and exposed in web AX tree',any(n['name'] and not n['ignored'] for n in observed['axDialogs']),observed['axDialogs'])
    capture('detail')
    close=dialog.get_by_role('button',name='Cerrar' if mode=='label' else 'Cerrar detalle',exact=True)
    close.focus();page.keyboard.press('Tab');check('Tab stays within modal',dialog.evaluate('e=>e.contains(document.activeElement)'))
    close.click();expect(dialog).to_be_hidden()
    if mobile and mode=='label':page.get_by_role('tab',name='Comparar',exact=True).click()
    section=page.get_by_role('region',name='Comparar 2–5 vinos',exact=True)
    expect(section).to_be_visible()
    observed['comparisonCheckboxes']=section.get_by_role('checkbox').count()
    check('Comparator retains 2–5 contract controls',observed['comparisonCheckboxes']>=2)
    table=section.locator('table')
    if table.count():
     affinity_row=table.locator('tr').filter(has=page.get_by_text('Afinidad',exact=True))
     observed['affinities']=affinity_row.locator('td').all_inner_texts()
     check('Comparator shows pending affinities rather than fabricated positive scores',all(v=='-' for v in observed['affinities']),observed.get('affinities'))
    check('Comparator overflow stays within document',contained());capture('compare')
    check('All network intercepted, no unknown operations',fixture.finish()['externalIntercepted'] and not fixture.unexpected,fixture.unexpected)
    check('No browser runtime errors',not fixture.errors,fixture.errors)
    check('Sources stayed unchanged throughout the suite',fixture.finish()['sourcesUnchanged'])
   except Exception as error:check('Scenario completed',False,str(error));capture('failure')
   finally:
    rows.append({'mode':mode,'case':case,'textScale':scale,'emulatedMobileSurface':mobile,'checks':checks,'observed':observed,'network':fixture.finish(),'passed':all(c['passed'] for c in checks)});fixture.context.close()
 browser.close()
(a.output/'results.json').write_text(json.dumps({'scope':__doc__,'results':rows},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':sum(len(r['checks']) for r in rows),'failed':[{'mode':r['mode'],'case':r['case'],'checks':[c for c in r['checks'] if not c['passed']]} for r in rows if not r['passed']]}))
if any(not r['passed'] for r in rows):raise SystemExit(1)
