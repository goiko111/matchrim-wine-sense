"""Real Scan/ScanHub/batch UI with existing deterministic vision fixtures and intercepted writes."""
import argparse
import base64
import json
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--url',default='http://127.0.0.1:4443')
p.add_argument('--output',type=Path,required=True)
p.add_argument('--analytics',action='store_true',help='Assert intercepted success analytics; enable it on the local server only.')
p.add_argument('--cases',default='denied,minimal,success,pending-double,partial-rejected,partial-ambiguous,anonymous,switch-owner,logout,unmount,mode-switch,query-change,aba,network-error,wrong-owner,wrong-fields,cardinality,new-scan')
args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
IMAGE=Path('qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg').resolve()
A='00000000-0000-4000-8000-000000000081';B='00000000-0000-4000-8000-000000000082'
enc=lambda v:base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
def make_user(uid):return {'id':uid,'aud':'authenticated','role':'authenticated','email':'synthetic@matchrim.invalid','app_metadata':{'provider':'email'},'user_metadata':{}}
def make_session(uid):return {'user':make_user(uid),'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':uid,'exp':1900000000})+'.'+enc('not-valid'),'refresh_token':'synthetic','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for case in args.cases.split(','):
        context=browser.new_context(viewport={'width':393,'height':852},is_mobile=True,has_touch=True,reduced_motion='reduce')
        storage={'matchrim.scan_privacy_notice.v2':'accepted','matchrim.local_profile_owner.v1':'anonymous' if case=='anonymous' else A}
        if case!='anonymous':storage['sb-cbjynrbvrhcmpaojmqdp-auth-token']=json.dumps(make_session(A))
        for uid in [A,B,'anonymous']:storage['matchrim.onboarding.v2:'+uid]=json.dumps({'version':2,'result':'skipped'})
        context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const [k,v]of Object.entries(%s))localStorage.setItem(k,v);"%json.dumps(storage))
        owner=A;writes=[];held=[];errors=[];requests=[];events=[];console_errors=[];layout=None
        def reply(route,payload,status=200):route.fulfill(status=status,content_type='application/json',body=json.dumps(payload))
        def intercept(route):
            req=route.request;url=urlparse(req.url)
            if url.netloc==urlparse(args.url).netloc:return route.continue_()
            requests.append({'method':req.method,'path':url.path})
            if '/auth/v1/user' in url.path:return reply(route,make_user(owner))
            if '/rest/v1/app_events' in url.path and req.method=='POST':
                events.append(req.post_data_json);return reply(route,None)
            if '/rest/v1/user_wines' in url.path and req.method=='POST':
                body=req.post_data_json
                writes.append({'body':body,'query':parse_qs(url.query),'prefer':req.headers.get('prefer'),'accept':req.headers.get('accept')})
                row={'id':'saved-'+str(len(writes)),**body};status=200;payload=row
                if case in ['pending-double','switch-owner','logout','unmount','mode-switch','query-change','aba'] and len(writes)==1:
                    held.append((route,row));return
                if case=='denied':status,payload=403,{'code':'42501','message':'synthetic denied'}
                if case=='minimal' or (case=='partial-ambiguous' and len(writes)==2):payload=None
                if case=='partial-rejected' and len(writes)==2:status,payload=400,{'code':'23514','message':'synthetic check violation'}
                if case=='network-error':return route.abort('connectionreset')
                if case=='wrong-owner':payload={**row,'user_id':B}
                if case=='wrong-fields':payload={**row,'status':'tasted','use_for_profile_training':True}
                if case=='cardinality':status,payload=406,{'code':'PGRST116','message':'synthetic cardinality failure'}
                return reply(route,payload,status)
            if '/rest/v1/quiz_results' in url.path:return reply(route,None)
            if '/rest/v1/' in url.path:return reply(route,[])
            return reply(route,{})
        context.route('**/*',intercept)
        page=context.new_page();page.set_default_timeout(8000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda e:console_errors.append(e.text[:1000]) if e.type=='error' else None)
        def switch(uid):
            global owner
            owner=uid
            page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}",make_session(uid))
            page.wait_for_timeout(100)
        def history():return page.evaluate("Object.entries(localStorage).filter(([k])=>k.includes('scan_history')).map(([key,value])=>({key,value}))")
        def bottom_capture(suffix):
            page.evaluate('window.scrollTo(0,document.documentElement.scrollHeight)');page.wait_for_timeout(100)
            page.screenshot(path=str(args.output/(case+suffix+'.png')))
        try:
            page.goto(args.url+'/escanear/etiqueta',wait_until='networkidle')
            page.get_by_text('QA local: respuestas deterministas.',exact=False).wait_for()
            page.locator('input[type=file]').nth(1).set_input_files(str(IMAGE))
            page.get_by_text('Lote listo para revisar',exact=True).wait_for(timeout=30000)
            page.get_by_role('tab',name='Vinos',exact=False).click()
            confirm=page.get_by_role('button',name=re.compile('^Confirmar [0-9]+ referencia'))
            confirm.wait_for();assert '2 referencias' in confirm.inner_text(),confirm.inner_text()
            confirm.scroll_into_view_if_needed()
            if case=='pending-double':confirm.evaluate('(e)=>{e.click();e.click()}')
            else:confirm.click()
            page.wait_for_timeout(250)
            if case=='anonymous':
                page.wait_for_url('**/auth?**')
                assert parse_qs(urlparse(page.url).query).get('redirect')==['/escanear/etiqueta']
                assert not writes and not history(), 'anonymous confirmation recorded history'
                switch(A);page.wait_for_url('**/escanear/etiqueta')
                page.get_by_role('button',name='Elegir de galería',exact=True).wait_for()
                assert not writes and not history(),'auth return inserted without new confirmation'
            elif case in ['switch-owner','logout','unmount','mode-switch','query-change','aba']:
                assert held
                if case=='switch-owner':switch(B)
                elif case=='aba':switch(B);switch(A)
                elif case=='logout':page.evaluate("async()=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.signOut()}")
                elif case=='mode-switch':page.get_by_role('button',name='Volver a tipos de escaneo',exact=True).click()
                elif case=='query-change':page.evaluate("history.pushState({},'',location.pathname+'?qa-context=changed');dispatchEvent(new PopStateEvent('popstate'))")
                else:page.get_by_role('link',name='Inicio',exact=True).click()
                page.wait_for_timeout(150)
                for route,row in held:reply(route,row)
                held.clear();page.wait_for_timeout(350)
                assert len(writes)==1,'obsolete batch continued inserting'
                assert not history(),'obsolete batch recorded history'
                assert not page.locator('[data-sonner-toast]').filter(has_text=re.compile('guardado|Lote confirmado')).count(),'obsolete success notice'
                if case=='query-change':
                    page.get_by_role('button',name='Guardado sin confirmar',exact=True).wait_for()
                    assert page.get_by_role('button',name='Guardado sin confirmar',exact=True).is_disabled()
            elif case=='pending-double':
                assert len(writes)==1,'duplicate confirmation during pending insert'
                assert page.get_by_role('button',name='Guardando lote',exact=True).is_disabled()
                assert page.get_by_role('button',name='Cerrar análisis',exact=True).is_disabled()
                bottom_capture('-pending')
                for route,row in held:reply(route,row)
                held.clear()
                page.get_by_role('button',name='Lote confirmado',exact=True).wait_for()
                assert len(writes)==2
            elif case in ['success','new-scan']:
                page.get_by_role('button',name='Lote confirmado',exact=True).wait_for()
                assert len(writes)==2 and history()
                if case=='new-scan':
                    page.get_by_role('button',name='Cerrar análisis',exact=True).click()
                    page.locator('input[type=file]').nth(1).set_input_files(str(IMAGE))
                    page.get_by_text('Lote listo para revisar',exact=True).wait_for(timeout=30000)
                    page.get_by_role('tab',name='Vinos',exact=False).click()
                    page.get_by_role('button',name=re.compile('^Confirmar 2 referencias')).click()
                    page.get_by_role('button',name='Lote confirmado',exact=True).wait_for()
                    assert len(writes)==4,'new scan improperly suppressed by global wine-name dedup'
            elif case=='partial-rejected':
                retry=page.get_by_role('button',name=re.compile('^Reintentar'))
                retry.wait_for();assert len(writes)==2 and not history()
                assert page.get_by_text('No guardado: rechazo',exact=True).count()==1
                bottom_capture('-partial')
                retry.click();page.get_by_role('button',name='Lote confirmado',exact=True).wait_for()
                assert len(writes)==3 and writes[0]['body']['name']!=writes[2]['body']['name'],'saved group inserted again'
            else:
                assert not page.get_by_role('button',name='Lote confirmado',exact=True).count(),'false batch success'
                assert not history(),'false history confirmation'
                assert len(writes)==(2 if case=='partial-ambiguous' else 1),'batch did not stop'
                page.get_by_role('alert').filter(has_text='confirm').wait_for()
                assert not page.get_by_role('button',name=re.compile('^Reintentar')).count(),'ambiguous insert offers reinsertion'
                page.get_by_role('button',name='Abrir detalle de Muga Reserva',exact=True).click()
                assert page.get_by_role('textbox',name='Vino',exact=True).is_disabled()
                assert page.get_by_role('button',name='Reanalizar',exact=True).is_disabled()
                page.get_by_role('button',name='Cerrar',exact=True).click()
                page.get_by_role('button',name='Guardado sin confirmar',exact=True).wait_for()
            for write in writes:
                assert write['body']['status']=='wishlist' and write['body']['use_for_profile_training'] is False
                assert write['body']['place_details']['source']=='label_scanner'
                assert write['prefer']=='return=representation' and write['accept']=='application/vnd.pgrst.object+json'
                assert write['query']['select']==['id,user_id,name,producer,vintage,status,is_favorite,use_for_profile_training']
            assert not any(re.search(r'/functions/v1/(detect-wine-regions|analyze-wine-region|analyze-wine-label)',r['path']) for r in requests),'fixture attempted vision API'
            page.wait_for_timeout(150)
            if args.analytics:
                expected=4 if case=='new-scan' else 2 if case in ['success','pending-double','partial-rejected'] else 1 if case=='partial-ambiguous' else 0
                assert len([e for e in events if e['event_name']=='wine_saved'])==expected,events
            assert not errors,errors
            bottom_capture('')
            button=page.get_by_role('button',name=re.compile('^(Lote confirmado|Guardado sin confirmar)$'))
            if button.count():
                layout=button.evaluate("e=>{const r=e.getBoundingClientRect();const n=document.querySelector('nav.fixed');const nr=n?.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,navTop:nr?.top,innerWidth,scrollWidth:document.documentElement.scrollWidth}}")
                assert layout['x']>=0 and layout['x']+layout['width']<=393 and layout['height']>=44,layout
                assert layout['scrollWidth']<=393,layout
                if layout.get('navTop') is not None:assert layout['bottom']<=layout['navTop'],layout
            results.append({'case':case,'passed':True,'writes':writes,'requests':requests,'errors':errors,'console_errors':console_errors,'history':history(),'events':events,'layout':layout})
        except Exception as error:
            page.screenshot(path=str(args.output/(case+'-failure.png')))
            results.append({'case':case,'passed':False,'error':str(error),'writes':writes,'requests':requests,'errors':errors,'console_errors':console_errors,'history':history(),'events':events,'layout':layout})
        finally:
            for route,_ in held:route.abort()
            context.close()
        print(case,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    browser.close()
(args.output/'results.json').write_text(json.dumps({'scope':__doc__,'vision':'existing deterministic fixture; not recognition accuracy','remote_calls':0,'results':results},indent=2))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
