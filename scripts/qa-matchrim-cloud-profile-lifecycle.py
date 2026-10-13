"""Manual profile recovery with null sources, delayed local responses and account lifecycle; no hosted persistence."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from qa_matchrim_runtime import add_browser_options,launch_browser,upload_scan_file
from qa_matchrim_cloud_fixture import ClientFixture,PHOTO,AUTH,fake_session
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',default='http://127.0.0.1:4469');p.add_argument('--output',type=Path,required=True);add_browser_options(p)
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True);rows=[]
with sync_playwright() as pw:
 browser=launch_browser(pw,a)
 for scenario in ['recover','cancel','close','timeout','owner','unmount','persistent']:
  fixture=ClientFixture(browser,a.url,viewport={'width':393,'height':852},is_mobile=True,has_touch=True);fixture.mobile_surface();fixture.profile_mode='error'
  page=fixture.page();checks=[]
  def check(name,ok,actual=None):checks.append({'name':name,'passed':bool(ok),'actual':actual})
  def release():
   for route in fixture.profile_held[:]:
    try:fixture.reply(route,None)
    except Exception:pass
   fixture.profile_held.clear()
  try:
   page.goto(a.url+'/escanear/carta-vinos',wait_until='networkidle');upload_scan_file(page,'menu',str(PHOTO))
   row=page.get_by_role('button',name='Abrir vino 1: Lugana Allegrini',exact=True);expect(row).to_be_visible(timeout=45000);row.click()
   dialog=page.get_by_role('dialog');retry=dialog.get_by_role('button',name='Reintentar perfil',exact=True)
   expect(retry).to_be_visible();check('Profile read failure is explicit and manually retryable',retry.is_enabled())
   count_before=len([r for r in fixture.requests if '/quiz_results' in r['path']])
   fixture.profile_mode='error' if scenario=='persistent' else 'held';retry.click()
   if scenario=='persistent':expect(retry).to_be_enabled(timeout=10000)
   else:
    for _ in range(100):
     if fixture.profile_held:break
     page.wait_for_timeout(10)
    check('Retry reaches an intercepted held request',bool(fixture.profile_held))
    if scenario=='cancel':dialog.get_by_role('button',name='Cancelar carga del perfil',exact=True).click()
    if scenario=='close':dialog.get_by_role('button',name='Cerrar detalle',exact=True).click();expect(dialog).to_be_hidden()
    if scenario=='owner':
     fixture.owner='00000000-0000-4000-8000-000000000081'
     page.evaluate('([key,session])=>{localStorage.setItem(key,JSON.stringify(session));const c=new BroadcastChannel(key);c.postMessage({event:"SIGNED_IN",session});setTimeout(()=>c.close(),100)}',[AUTH,fake_session(fixture.owner)]);page.wait_for_timeout(200)
    if scenario=='unmount':page.evaluate('history.pushState({},"","/escanear");window.dispatchEvent(new PopStateEvent("popstate"))');page.wait_for_timeout(150)
    if scenario=='timeout':page.wait_for_timeout(5300)
    release();page.wait_for_timeout(200)
   count_after=len([r for r in fixture.requests if '/quiz_results' in r['path']])
   if scenario in ['recover','cancel','timeout','persistent']:
    expect(dialog).to_be_visible()
    text=dialog.inner_text();check('No positive affinity fabricated during recovery','Afinidad pendiente' in text and '% de encaje' not in text)
    if scenario=='recover':check('Null profile is honest absence after retry','No hay un perfil guardado' in text and dialog.get_by_role('button',name='Reintentar perfil',exact=True).count()==0)
    else:check('Cancelled/failed/timeout retry keeps failure recoverable',dialog.get_by_role('button',name='Reintentar perfil',exact=True).is_enabled())
    page.wait_for_timeout(250);check('No automatic retry loop',len([r for r in fixture.requests if '/quiz_results' in r['path']])==count_after)
   if scenario in ['owner','unmount']:check('Old drawer and results cleared on owner/unmount',page.get_by_role('dialog').count()==0 and page.get_by_role('button',name='Abrir vino 1: Lugana Allegrini',exact=True).count()==0)
   if scenario=='close':check('Late profile result does not reopen closed drawer',page.get_by_role('dialog').count()==0)
   check('All HTTP requests intercepted and no write attempts',fixture.finish()['externalIntercepted'] and not fixture.unexpected,fixture.unexpected)
   check('No web runtime errors',not fixture.errors,fixture.errors)
   page.screenshot(path=str(a.output/(scenario+'.png')))
  except Exception as error:check('Scenario completed',False,str(error));page.screenshot(path=str(a.output/(scenario+'-failure.png')))
  finally:release();rows.append({'scenario':scenario,'checks':checks,'network':fixture.finish(),'passed':all(c['passed'] for c in checks)});fixture.context.close()
 browser.close()
(a.output/'results.json').write_text(json.dumps({'scope':__doc__,'results':rows},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':sum(len(r['checks']) for r in rows),'failed':[{'scenario':r['scenario'],'checks':[c for c in r['checks'] if not c['passed']]} for r in rows if not r['passed']]}))
if any(not r['passed'] for r in rows):raise SystemExit(1)
