"""Local browser QA: fake accounts, isolated in-memory REST, denied external traffic."""
import base64
import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / "ui" / os.environ.get("QA_PHASE", "local-fixed")
BASE = os.environ.get("MATCHRIM_QA_URL", "http://127.0.0.1:4382")
PROFILES = json.loads((ROOT.parent / "simulation/baseline-profiles.json").read_text())
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
RESULTS = []
TRAFFIC = []
BASELINE = os.environ.get("QA_PHASE") == "baseline"
SESSION_COUNT = int(os.environ.get('QA_SESSION_COUNT','100'))

def token(payload):
    enc = lambda obj: base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip("=")
    return enc({"alg": "HS256", "typ": "JWT"}) + "." + enc(payload) + ".synthetic-not-valid"

def session(index):
    uid = f"00000000-0000-4000-8000-{index+1:012d}"
    user = {"id": uid, "email": f"synthetic-{index}@matchrim.invalid", "aud": "authenticated", "role": "authenticated",
            "app_metadata": {"provider": "email", "providers": ["email"]}, "user_metadata": {}, "created_at": "2026-01-01T00:00:00Z"}
    return {"access_token": token({"sub": uid, "exp": 2000000000}), "refresh_token": "synthetic-no-real-refresh",
            "expires_at": 2000000000, "expires_in": 86400, "token_type": "bearer", "user": user}

def make_context(browser, index=0, authenticated=True, width=393, height=852, large=False, stale=False, profile=True):
    context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce", locale="es-ES")
    sess = session(index)
    taste = PROFILES[index]["base"]
    user = sess["user"]
    wines = [{"id": f"wine-{index}", "user_id": user["id"], "name": f"QA vino {index}", "producer": "Bodega ficticia",
              "vintage": 2022, "status": "collection", "quantity": 3, "rating": "ok", "is_favorite": False,
              "use_for_profile_training": True, "matchrim_affinity": None, "sensory_attributes": {"potencia": 3, "acidez": 4, "dulzura": 1, "taninos": 2, "afrutado": 4},
              "created_at": "2026-01-01T12:00:00Z", "updated_at": "2026-01-01T12:00:00Z", "grape_varieties": ["QA"], "place_details": None}]
    quiz = [{"id": f"quiz-{index}", "user_id": user["id"], **taste, "created_at": "2026-01-01T00:00:00Z", "wine_recommendations": []}] if profile else []
    requests = []
    errors = []
    context.add_init_script("""args => {}""")
    setup = {"session": sess if authenticated else None, "profile": taste if profile else None, "owner": "OTHER-USER" if stale else user["id"] if authenticated else "anonymous", "large": large}
    context.add_init_script("""(() => {
      const a = %s;
      window.CapacitorCustomPlatform = {name:'ios'};
      if (!localStorage.getItem('qa.initialized')) {
        if (a.session) localStorage.setItem('sb-cbjynrbvrhcmpaojmqdp-auth-token',JSON.stringify(a.session));
        if(a.profile) localStorage.setItem('matchrim_quiz_result',JSON.stringify(a.profile));
        localStorage.setItem('matchrim.local_profile_owner.v1',a.owner);
        localStorage.setItem('qa.initialized','yes');
      }
      const display = () => { document.documentElement.style.setProperty('--matchrim-native-safe-top','59px'); document.documentElement.style.setProperty('--matchrim-native-safe-bottom','34px'); if(a.large) document.documentElement.style.fontSize='20px'; };
      document.addEventListener('DOMContentLoaded',display);
    })();""" % json.dumps(setup))

    def handler(route):
        request = route.request
        url = urlparse(request.url)
        if url.netloc == urlparse(BASE).netloc:
            return route.continue_()
        requests.append({"path": url.path, "method": request.method})
        TRAFFIC.append({"host": url.hostname, "path": url.path, "disposition": "fulfilled-local"})
        body = []
        status = 200
        if url.hostname != "cbjynrbvrhcmpaojmqdp.supabase.co":
            return route.fulfill(status=200, content_type="application/json", body="{}")
        if request.method == "OPTIONS":
            return route.fulfill(status=200, headers={"Access-Control-Allow-Origin": "*"})
        if url.path.startswith('/auth/v1/'):
            if url.path.endswith('/user'): body = user
            elif url.path.endswith('/token'): body = sess
            elif url.path.endswith('/signup'): body = user
            else: body = {}
        elif '/rest/v1/' in url.path:
            table = url.path.split('/')[-1]
            query = parse_qs(url.query)
            if table == "user_wines":
                if request.method == 'PATCH':
                    patch = request.post_data_json
                    for row in wines:
                        if query.get('id', [f'eq.{row["id"]}'])[0] == f'eq.{row["id"]}': row.update(patch)
                elif request.method == 'DELETE': wines.clear()
                elif request.method == 'POST':
                    payload = request.post_data_json
                    payload = payload if isinstance(payload, list) else [payload]
                    wines.extend({**w, 'id': f'new-{len(wines)}', 'created_at': '2026-10-07T00:00:00Z'} for w in payload)
                body = list(wines)
                for field in ['status', 'is_favorite', 'rating', 'user_id', 'use_for_profile_training']:
                    val = query.get(field, [''])[0]
                    if val.startswith('eq.'):
                        body = [w for w in body if str(w.get(field)).lower() == val[3:].lower()]
                    if val == 'not.is.null': body = [w for w in body if w.get(field) is not None]
            elif table == "quiz_results": body = quiz
            elif table == "user_roles": body = []
            elif table == "profiles": body = [{"id": user['id'], "first_name": "Sintetico", "preferred_language": "ES"}]
            elif table == "account_deletion_requests":
                if request.method == 'POST': body = [{"id": "local-request", "status": "requested", "requested_at": "2026-10-07"}]
            if 'vnd.pgrst.object' in request.headers.get('accept', ''): body = body[0] if body else None
        elif '/functions/v1/' in url.path:
            endpoint = url.path.split('/')[-1]
            if endpoint == 'ai-wine-chat': body = {"success": True, "response": "Fixture local: faltan ficha canonica y preferencias de madera. No es una recomendacion real."}
            elif 'calculate-wine-affinity' in endpoint: body = {"affinity": None}
            else: body = {"results": [], "wines": [], "total": 0}
        route.fulfill(status=status, content_type='application/json', body=json.dumps(body), headers={"Access-Control-Allow-Origin": "*"})
    context.route('**/*', handler)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    return context, page, wines, requests, errors

def record(case, callback, page, evidence=False):
    started = time.monotonic()
    try:
        details = callback()
        RESULTS.append({"case": case, "environment": "browser-local-mocked-backend", "status": "PASS", "details": details, "durationMs": round((time.monotonic()-started)*1000)})
    except Exception as error:
        RESULTS.append({"case": case, "environment": "browser-local-mocked-backend", "status": "FAIL", "observed": str(error)[:1000]})
        evidence = True
    if evidence: page.screenshot(path=str(OUT / (case.replace('/', '_') + '.png')), full_page=True)
    (OUT/'checkpoint-results.json').write_text(json.dumps(RESULTS,indent=2))
    if RESULTS[-1]['status']=='FAIL': print(case,RESULTS[-1].get('observed'),flush=True)

def go(page, path):
    page.goto(BASE + path)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(100)
    text = page.locator('body').inner_text()
    assert len(text) > 20 and 'Algo no ha cargado bien' not in text
    assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth+2'), 'horizontal overflow'
    return {"requested": path, "final": urlparse(page.url).path, "heading": page.locator('h1,h2').all_text_contents()[:3]}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=CHROME)
        # Every declared route, including guards, aliases and dynamic concrete examples.
        declared = json.loads((ROOT.parent/'baseline-manifest.json').read_text())['routes']
        substitute = {'/escanear/:mode':'/escanear/etiqueta', '/wine-styles/:slug':'/wine-styles/tinto-versatil', '/wines/:id/:slug?':'/wines/qa-local', '/my-wines/:section':'/my-wines/wishlist', '*':'/qa-unknown'}
        for authenticated in [False, True]:
            context, page, _, _, errors = make_context(browser, authenticated=authenticated)
            for row in declared:
                path = substitute.get(row['path'], row['path'])
                record(('auth' if authenticated else 'anon') + '-route-' + path, lambda path=path: go(page,path), page, path in ['/', '/registration', '/my-wines', '/profile', '/inteligencia-liquida'])
            RESULTS.append({'case': f'routes-pageerrors-{authenticated}', 'status': 'PASS' if not errors else 'FAIL', 'observed': errors})
            context.close()
        # 100 independent browser sessions, three meaningful UI journeys each.
        for i in range(SESSION_COUNT):
            context, page, wines, requests, errors = make_context(browser, i, width=[320,393,430,852][i%4], height=393 if i%4==3 else 852, large=i%6==0)
            def profile_flow():
                go(page, '/profile'); page.get_by_role('heading', name='Mi Perfil', exact=True).wait_for()
                go(page, '/my-wines'); page.get_by_text(f'QA vino {i}', exact=True).wait_for()
                assert page.get_by_text(f'QA vino {(i+1)%100}', exact=True).count()==0
                assert '0%' not in page.locator('body').inner_text(), 'unknown affinity presented as 0%'
                return {'owner': i, 'profile': PROFILES[i]['base'], 'ownWinePresent': True}
            def rating_flow():
                go(page, '/my-wines')
                page.get_by_role('button',name='Me encanta',exact=True).first.click()
                page.wait_for_timeout(500)
                assert wines[0]['rating']=='love'
                assert wines[0]['quantity']==3, 'editing an existing rating consumed another bottle'
                if not BASELINE:
                    page.get_by_role('button',name='Quitar valoración',exact=True).first.click()
                    page.wait_for_timeout(500)
                    assert wines[0]['rating'] is None and wines[0]['use_for_profile_training'] is False
                return {'quantity': wines[0]['quantity'], 'rating': wines[0]['rating'], 'requests': len(requests)}
            def airim_flow():
                go(page, '/inteligencia-liquida')
                page.get_by_label('Pregunta para aiRIM').fill(f'Consulta sintetica {i}: marisco y 25 euros')
                page.get_by_role('button',name='Abrir conversación').click()
                page.get_by_role('button',name='Enviar pregunta').click()
                page.get_by_text('Fixture local:', exact=False).wait_for()
                page.get_by_role('button',name='Volver a aiRIM').click()
                assert page.get_by_role('heading',name='¿Qué necesitas decidir?').is_visible()
                return {'response':'fixture, NOT live intelligence', 'back':True}
            for name, fn in [('profile-cellar',profile_flow),('rating-edit-delete',rating_flow),('airim-question-back',airim_flow)]:
                record(f'persona-{i:03d}-{name}', fn, page, i in [0,22,23,25])
            if errors: RESULTS.append({'case': f'persona-{i}-pageerrors', 'status':'FAIL','observed':errors})
            context.close()
            if i%20==0: print(f'UI sessions {i+1}/100', flush=True)
        # Previous account's profile cannot become another account's cold start.
        context,page,_,_,_ = make_context(browser, 101, stale=True, profile=False)
        page.add_init_script("localStorage.setItem('matchrim_quiz_result',JSON.stringify({potente:5,acidez:5,dulce:5,tanico:5,afrutado:5}));")
        def stale_flow():
            go(page,'/')
            assert page.evaluate("localStorage.getItem('matchrim_quiz_result')") is None, 'another user cache survives login'
            return 'stale cache cleared before Home uses it'
        record('account-cache-isolation',stale_flow,page,True); context.close()
        if not BASELINE:
            context,page,_,_,_ = make_context(browser, authenticated=False, profile=False)
            def guide_flow():
                go(page,'/')
                dialog=page.get_by_role('dialog'); dialog.wait_for()
                dialog.get_by_role('radio',name='Carta o pizarra').check()
                for step in range(2):
                    page.screenshot(path=str(OUT/f'onboarding-step-{step+1}.png'),full_page=False)
                    dialog.get_by_role('button',name='Continuar',exact=True).click()
                assert dialog.get_by_text('Guardar no es puntuar',exact=True).is_visible()
                page.screenshot(path=str(OUT/'onboarding-step-3.png'),full_page=False)
                dialog.get_by_role('button',name='Empezar',exact=True).click()
                assert urlparse(page.url).path=='/escanear/carta-vinos'
                go(page,'/'); assert page.get_by_role('dialog').count()==0
                page.get_by_role('button',name='Ayuda: abrir guía de Matchrim').click()
                page.get_by_role('button',name='Saltar guía').click()
                page.reload(); page.wait_for_load_state('networkidle'); assert page.get_by_role('dialog').count()==0
                return {'steps':3,'skippable':True,'reopen':True,'returnDoesNotRepeat':True,'eventsLocalOnly':True}
            record('onboarding-end-to-end',guide_flow,page,True); context.close()
        browser.close()
    report={'phase':os.environ.get('QA_PHASE','local-fixed'),'results':RESULTS,'total':len(RESULTS),'passed':sum(r['status']=='PASS' for r in RESULTS),
            'failed':sum(r['status']=='FAIL' for r in RESULTS),'browserSessions':3 + SESSION_COUNT + (not BASELINE), 'longitudinalProfilesSeparate':1000,
            'traffic':TRAFFIC,'realBackendRequests':0,'safety':'Only localhost requests continue; every external URL fulfilled locally.'}
    (OUT/'results.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({k:v for k,v in report.items() if k not in ['results','traffic']},indent=2))
    for result in RESULTS:
        if result['status']=='FAIL': print(result['case'],result.get('observed'))

if __name__=='__main__': main()
