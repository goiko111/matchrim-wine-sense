"""Local shop-response/history ownership QA; every nonlocal request is intercepted."""
import argparse, base64, json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--url',default='http://127.0.0.1:4444')
p.add_argument('--output',type=Path,required=True)
p.add_argument('--cases',default='current,switch,logout,unmount,aba,late-error,reader-cleanup,home-cleanup,multitab,reader-mismatch,home-mismatch,completed-switch,switch-pending')
args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
A='00000000-0000-4000-8000-000000000091';B='00000000-0000-4000-8000-000000000092'
OWNER='matchrim.local_profile_owner.v1';HISTORY='matchrim.scan_history.v1'
enc=lambda x:base64.urlsafe_b64encode(json.dumps(x).encode()).decode().rstrip('=')
def user(uid):return {'id':uid,'aud':'authenticated','role':'authenticated','email':'qa-history@matchrim.invalid','app_metadata':{},'user_metadata':{}}
def session(uid):return {'user':user(uid),'access_token':enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':uid,'exp':1900000000})+'.'+enc('synthetic'),'refresh_token':'synthetic','expires_at':1900000000,'expires_in':86400,'token_type':'bearer'}
prior={'id':'synthetic-prior','type':'shop-link','title':'QA historial previo A','route':'/escanear/encontrar-vino','createdAt':1791740000000}
response={'summary':'QA resultado vigente A','consejo':'Fixture local, no recomendacion real.','recomendaciones':[{'nombre':'QA tienda A','tipo':None,'region':None,'uvas':[],'precio_estimado':None,'razon':'Respuesta sintetica retenida','atributos':{}}]}
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for case in args.cases.split(','):
        context=browser.new_context(viewport={'width':393,'height':852},is_mobile=True,has_touch=True,reduced_motion='reduce')
        seed={OWNER:A,HISTORY:json.dumps([prior]),'sb-cbjynrbvrhcmpaojmqdp-auth-token':json.dumps(session(A)),'matchrim.scan_privacy_notice.v2':'accepted'}
        for uid in [A,B,'anonymous']:seed['matchrim.onboarding.v2:'+uid]=json.dumps({'version':2,'result':'skipped'})
        context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};if(!localStorage.getItem('qa.history.seeded')){for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);localStorage.setItem('qa.history.seeded','true')}"%json.dumps(seed))
        owner=A;held=[];events=[];requests=[];errors=[];observed={}
        def reply(route,payload,status=200):route.fulfill(status=status,content_type='application/json',body=json.dumps(payload))
        def intercept(route):
            req=route.request;path=urlparse(req.url).path
            if urlparse(req.url).netloc==urlparse(args.url).netloc:return route.continue_()
            requests.append({'method':req.method,'path':path})
            if path.endswith('/auth/v1/user'):return reply(route,user(owner))
            if path.endswith('/functions/v1/analyze-shop-link'):
                held.append(route);observed['request_body']=req.post_data_json;return
            if path.endswith('/rest/v1/app_events') and req.method=='POST':events.append(req.post_data_json);return reply(route,None)
            if path.endswith('/rest/v1/quiz_results'):return reply(route,None)
            if '/rest/v1/' in path:return reply(route,[])
            return reply(route,{})
        context.route('**/*',intercept)
        page=context.new_page();page.set_default_timeout(7000);page.on('pageerror',lambda e:errors.append(str(e)))
        def snapshot():return page.evaluate("({owner:localStorage.getItem('matchrim.local_profile_owner.v1'),history:JSON.parse(localStorage.getItem('matchrim.scan_history.v1')||'[]')})")
        def switch(uid,target=None):
            global owner
            owner=uid
            (target or page).evaluate("async s=>{const{ supabase }=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}",session(uid))
            page.wait_for_timeout(150)
        try:
            if case in ['reader-cleanup','home-cleanup','reader-mismatch','home-mismatch']:
                page.goto(args.url+('/' if case.startswith('home-') else '/escanear'),wait_until='networkidle')
                page.get_by_text(prior['title'],exact=True).wait_for()
                if case.endswith('mismatch'):
                    second=context.new_page();second.goto(args.url+'/escanear',wait_until='networkidle')
                    second.evaluate("v=>{localStorage.setItem(v.ownerKey,v.owner);localStorage.setItem(v.historyKey,JSON.stringify(v.items))}",{'ownerKey':OWNER,'owner':B,'historyKey':HISTORY,'items':[{**prior,'title':'QA historial B ajeno'}]})
                    page.wait_for_timeout(200)
                    assert not page.get_by_text('QA historial B ajeno',exact=True).count(),'reader exposed mismatched-owner storage'
                    assert snapshot()['history'][0]['title']=='QA historial B ajeno','reader deleted foreign cache'
                    observed['mismatched_cache_preserved']=True
                    switch(B)
                else:switch(B)
                observed['after_cleanup']=snapshot()
                if not case.endswith('mismatch'):assert observed['after_cleanup']['history']==[],'existing cleanup failed'
                assert not page.get_by_text(prior['title'],exact=True).count(),'reader retained old item'
                page.reload(wait_until='networkidle')
                assert not page.get_by_text(prior['title'],exact=True).count()
                if case.endswith('mismatch'):page.get_by_text('QA historial B ajeno',exact=True).wait_for()
                else:assert snapshot()['history']==[]
            else:
                page.goto(args.url+'/escanear/encontrar-vino',wait_until='networkidle')
                page.locator('#shop-intent').fill('Consulta QA A sin tienda real')
                page.get_by_role('button',name='Encontrar mi vino',exact=True).click()
                page.wait_for_timeout(200);assert held,'shop request not intercepted'
                if case in ['switch','late-error','switch-pending']:switch(B)
                elif case=='aba':switch(B);switch(A)
                elif case=='logout':page.evaluate("async()=>{const{supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.signOut()}")
                elif case=='unmount':page.get_by_role('button',name='Volver a tipos de escaneo',exact=True).click()
                elif case=='multitab':
                    second=context.new_page();second.goto(args.url+'/escanear',wait_until='networkidle');switch(B,second)
                page.wait_for_timeout(200)
                observed['before_release']=snapshot()
                if case in ['switch','logout','aba','late-error','multitab','switch-pending']:assert snapshot()['history']==[],'cleanup did not precede late response'
                if case=='switch-pending':
                    page.locator('#shop-intent').fill('Consulta QA B')
                    page.get_by_role('button',name='Encontrar mi vino',exact=True).click();page.wait_for_timeout(200)
                    assert len(held)==2
                    reply(held.pop(0),response);page.wait_for_timeout(200)
                    assert page.get_by_role('button',name='Buscando…',exact=True).is_disabled(),'old finally cleared B pending state'
                    assert not snapshot()['history'] and not page.get_by_text('QA tienda A',exact=True).count()
                    observed['old_finally_ignored']=True
                final_response={**response,'summary':'QA resultado vigente B','recomendaciones':[{**response['recomendaciones'][0],'nombre':'QA tienda B'}]} if case=='switch-pending' else response
                for route in held:reply(route,{'error':'QA error antiguo A'} if case=='late-error' else final_response)
                held.clear();page.wait_for_timeout(300)
                observed['after_release']=snapshot()
                observed['result_visible']=page.get_by_text('QA tienda A',exact=True).count()
                observed['late_error_visible']=page.get_by_text('QA error antiguo A',exact=True).count()
                success_events=[e for e in events if e['event_name']=='shop_link_analyzed']
                if case in ['current','completed-switch']:
                    assert observed['result_visible']==1 and len(success_events)==1
                    assert len(snapshot()['history'])==2 and snapshot()['history'][0]['title']=='Encontrar vino: QA tienda A'
                    if case=='completed-switch':
                        switch(B)
                        assert not page.get_by_text('QA tienda A',exact=True).count() and snapshot()['history']==[]
                        assert page.locator('#shop-intent').input_value()==''
                elif case=='switch-pending':
                    assert page.get_by_text('QA tienda B',exact=True).count()==1 and len(success_events)==1
                    assert len(snapshot()['history'])==1 and snapshot()['history'][0]['title']=='Encontrar vino: QA tienda B'
                else:
                    assert not observed['result_visible'],'obsolete result rendered'
                    assert not observed['late_error_visible'],'obsolete error notice rendered'
                    assert not success_events,'obsolete success event'
                    expected=[prior] if case=='unmount' else []
                    assert snapshot()['history']==expected,'obsolete response repopulated history'
                page.get_by_role('button',name='Volver a tipos de escaneo',exact=True).click() if case!='unmount' else None
                if case=='current':page.get_by_text('Encontrar vino: QA tienda A',exact=True).wait_for()
                elif case=='switch-pending':page.get_by_text('Encontrar vino: QA tienda B',exact=True).wait_for()
                else:assert not page.get_by_text('Encontrar vino: QA tienda A',exact=True).count()
                page.reload(wait_until='networkidle')
                if case=='current':page.get_by_text('Encontrar vino: QA tienda A',exact=True).wait_for()
                elif case=='switch-pending':page.get_by_text('Encontrar vino: QA tienda B',exact=True).wait_for()
                else:assert not page.get_by_text('Encontrar vino: QA tienda A',exact=True).count()
            assert not errors,errors
            assert not any('detect-wine' in x['path'] or 'analyze-wine' in x['path'] for x in requests)
            page.screenshot(path=str(args.output/(case+'.png')))
            results.append({'case':case,'passed':True,'observed':observed,'final':snapshot(),'events':events,'requests':requests,'errors':errors})
        except Exception as error:
            page.screenshot(path=str(args.output/(case+'-failure.png')))
            results.append({'case':case,'passed':False,'error':str(error),'observed':observed,'final':snapshot(),'events':events,'requests':requests,'errors':errors})
        finally:
            for route in held:route.abort()
            context.close()
        print(case,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    browser.close()
(args.output/'results.json').write_text(json.dumps({'scope':__doc__,'remote_calls':0,'real_vision':False,'results':results},indent=2))
raise SystemExit(0 if all(x['passed'] for x in results) else 1)
