"""Only08 explicit profile retry, one existing scene, invalid local auth/SDK interception; zero hosted writes/OCR rerun."""
import argparse
import base64
import copy
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--url', default='http://127.0.0.1:4455')
p.add_argument('--cases', default='recover:portrait,recover:landscape')
args = p.parse_args(); args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
contract = root / 'docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json'
image = root / 'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
assert hashlib.sha256(image.read_bytes()).hexdigest() == '2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
wine = json.loads(contract.read_text())['bothContract']['vinos'][1]
UID = '00000000-0000-4000-8000-000000000080'; AUTH = 'sb-cbjynrbvrhcmpaojmqdp-auth-token'
enc = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
def fake_session(uid):
    return {'user': {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid', 'app_metadata': {'provider': 'email'}, 'user_metadata': {}}, 'access_token': enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': uid, 'exp': 1900000000}) + '.' + enc('synthetic-invalid'), 'refresh_token': 'synthetic-invalid', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
session = fake_session(UID); results = []
source_files = [contract, image, root / 'src/components/wine-import/WineMenuScanner.tsx', root / 'src/utils/scanProfile.ts', root / 'src/services/matchrimScanProfile.ts']
(args.output / 'input-provenance.json').write_text(json.dumps({'scope': __doc__, 'hashes': {str(f.relative_to(root)): hashlib.sha256(f.read_bytes()).hexdigest() for f in source_files}, 'data': 'One existing image and04 syntheticBOTH. No profile-positive UI fixture. Null200 is absence, not recovery of a real human profile.', 'remoteAppCalls': 0, 'paidCalls': 0}, indent=2) + '\n')
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for case in args.cases.split(','):
            scenario, orientation = case.split(':'); width, height = (393,852) if orientation == 'portrait' else (852,393)
            requests, seen, terminal, pending, sockets, errors, console, checks, failures, snapshots, client_failed, reply_errors = [], [], [], [], [], [], [], [], [], [], [], []
            counters = {'base':0, 'ocr':0, 'canonical':0}
            context = browser.new_context(viewport={'width':width,'height':height}, is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')
            def reply(route, data, status=200):
                terminal.append(route.request.url)
                try: route.fulfill(status=status, content_type='application/json', body=json.dumps(data), headers={'Access-Control-Allow-Origin':'*'})
                except Exception as error:
                    reply_errors.append({'url':route.request.url,'message':str(error),'clientAborted':route.request.url in client_failed})
                    if route.request.url not in client_failed: raise
            def intercept(route):
                req = route.request; url = urlparse(req.url)
                if url.netloc == urlparse(args.url).netloc: return route.continue_()
                requests.append({'method':req.method, 'host':url.hostname, 'path':url.path, 'query':parse_qs(url.query)})
                if '/auth/v1/user' in url.path: return reply(route, session['user'])
                if '/rest/v1/quiz_results' in url.path:
                    counters['base'] += 1
                    if counters['base'] == 1 or scenario == 'persistent': return reply(route, {'message':'Synthetic base read unavailable'}, 500)
                    if scenario in ['doubleclick','close','owner','clear','unmount','timeout','cancel']: pending.append(route); return
                    return reply(route, None)
                if '/functions/v1/scan-wine-menu' in url.path:
                    counters['ocr'] += 1
                    return reply(route, {'vinos':[wine], 'layout':'rows', 'coverage':{'status':'reported_complete','extracted_wines':1}})
                if '/functions/v1/' in url.path:
                    counters['canonical'] += 1; return reply(route, {'wines':[]})
                return reply(route, [] if '/rest/v1/' in url.path else {})
            def ws_handler(ws):
                local = urlparse(ws.url).netloc == urlparse(args.url).netloc
                sockets.append({'host':urlparse(ws.url).hostname,'local':local,'blocked':not local})
                if local: ws.connect_to_server()
                else: ws.close(code=1008, reason='Only08 no hosted egress')
            context.route('**/*', intercept); context.route_web_socket('**/*', ws_handler)
            context.on('request', lambda req: seen.append(req.url) if urlparse(req.url).netloc != urlparse(args.url).netloc else None)
            context.on('requestfailed', lambda req: client_failed.append(req.url))
            seed = {AUTH:json.dumps(session), 'matchrim.local_profile_owner.v1':UID, 'matchrim.onboarding.v2:'+UID:json.dumps({'version':2,'result':'skipped'}), 'matchrim.scan_privacy_notice.v2':'accepted'}
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(seed))
            page = context.new_page(); page.set_default_timeout(6500)
            page.on('pageerror',lambda e:errors.append(str(e))); page.on('console',lambda m:console.append(re.sub(r'https?://\S+','<URL>',m.text)) if m.type=='error' else None)
            def check(name, passed, detail=None):
                checks.append({'name':name,'passed':bool(passed),'detail':detail})
                if not passed: failures.append(name)
            def release():
                for route in pending: reply(route, None)
                pending.clear(); page.wait_for_timeout(200)
            try:
                page.goto(args.url+'/escanear/carta-vinos', wait_until='networkidle')
                page.locator('input[type=file]').first.set_input_files(str(image))
                row = page.get_by_role('button',name=re.compile(r'^Abrir vino \d+:')).first; row.wait_for(timeout=45000)
                page.get_by_text('Ver fichas completas y acciones',exact=True).click(); page.locator('button[aria-controls="wine-actions-0"]').click()
                card = page.locator('#wine-actions-0'); card.get_by_role('button',name='Editar',exact=True).click(); page.locator('#scan-price-0').fill('35')
                image_hashes = lambda: page.locator('img').evaluate_all('async els=>Promise.all(els.filter(e=>e.src.startsWith("data:image")).map(async e=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(e.src)))].map(x=>x.toString(16).padStart(2,"0")).join("")))')
                initial = {'row':row.inner_text(),'name':page.locator('#scan-name-0').input_value(),'price':page.locator('#scan-price-0').input_value(),'image':image_hashes(), 'ocr':counters['ocr'],'canonical':counters['canonical']}
                snapshots.append({'stage':'before-retry',**initial})
                row.click(); dialog=page.get_by_role('dialog'); dialog.wait_for(state='visible')
                page.wait_for_function('()=>{const r=document.querySelector("[role=dialog]")?.getBoundingClientRect();return r&&r.top>=0&&r.bottom<=innerHeight+1;}')
                button=dialog.get_by_role('button',name='Reintentar perfil',exact=True)
                check('Known base read failure is distinct from absence', dialog.get_by_text(re.compile('No se pudo cargar|No hemos podido cargar')).count()>0)
                check('Explicit profile-only retry available',button.count()==1)
                if button.count():
                    if scenario=='doubleclick': button.dblclick()
                    else: button.click()
                    page.wait_for_timeout(150)
                    check('Exactly one new base read, no parallel click or automatic retry',counters['base']==2,counters.copy())
                    if scenario in ['doubleclick','close','owner','clear','unmount','timeout','cancel']:
                        check('Pending retry is observable',bool(pending) and dialog.get_by_text('Cargando perfil...',exact=True).count()==1)
                        if scenario=='doubleclick': release()
                        elif scenario=='close':
                            dialog.get_by_role('button',name='Cerrar detalle',exact=True).click(); dialog.wait_for(state='hidden'); release()
                        elif scenario=='cancel': dialog.get_by_role('button',name='Cancelar carga del perfil',exact=True).click(); release()
                        elif scenario=='owner':
                            other=fake_session('00000000-0000-4000-8000-000000000081')
                            page.evaluate('([key,session])=>{localStorage.setItem(key,JSON.stringify(session));const c=new BroadcastChannel(key);c.postMessage({event:"SIGNED_IN",session});setTimeout(()=>c.close(),100);}',[AUTH,other]); page.wait_for_timeout(200); release()
                        elif scenario=='timeout': page.wait_for_timeout(5300); release()
                        elif scenario=='unmount':
                            # Browser history route event unmounts the active scanner while drawer is still open.
                            page.evaluate('history.pushState({},"","/escanear");window.dispatchEvent(new PopStateEvent("popstate"))'); page.wait_for_timeout(150); release()
                        else:
                            dialog.get_by_role('button',name='Cerrar detalle',exact=True).click(); dialog.wait_for(state='hidden')
                            # Existing clear control, no new file/OCR.
                            page.get_by_role('button',name='Quitar carta',exact=True).click()
                            release()
                    else: page.wait_for_timeout(250)
                    if scenario in ['recover','doubleclick']:
                        check('Valid absence replaces failure, not fabricated profile',dialog.get_by_text(re.compile('No hay un perfil|Aún no hay un perfil')).count()>0 and dialog.get_by_text(re.compile('No se pudo cargar')).count()==0)
                        check('Absence is not a transient error with endless retry',dialog.get_by_role('button',name='Reintentar perfil',exact=True).count()==0)
                    if scenario in ['persistent','timeout']:
                        check('Failure/timeout remains honest and manually retryable',dialog.get_by_role('button',name='Reintentar perfil',exact=True).is_enabled())
                        page.wait_for_timeout(300);check('No automatic loop while failure persists',counters['base']==2)
                    if scenario in ['close','cancel']:
                        check('Cancelled/closed retry does not publish late absence',page.get_by_text('No hay un perfil guardado para esta cuenta; afinidad pendiente.',exact=True).count()==0)
                    if scenario in ['owner','clear','unmount']:
                        check('Stale context has no previous wine profile publication',page.get_by_text('No hay un perfil guardado para esta cuenta; afinidad pendiente.',exact=True).count()==0)
                    if scenario not in ['owner','clear','unmount']:
                        if not dialog.is_visible():
                            row.click(); dialog.wait_for(state='visible')
                            page.wait_for_function('()=>{const r=document.querySelector("[role=dialog]")?.getBoundingClientRect();return r&&r.top>=0&&r.bottom<=innerHeight+1;}')
                        check('Selection and wine identity remain unchanged',dialog.get_by_role('heading',name='1. '+wine['nombre'],exact=True).count()==1)
                        status=dialog.locator('[data-testid="scan-profile-recovery"]'); status.scroll_into_view_if_needed()
                        status.screenshot(path=str(args.output/(case.replace(':','-')+'-profile.png')))
                        page.screenshot(path=str(args.output/(case.replace(':','-')+'-viewport.png')))
                        dialog.get_by_role('button',name='Cerrar detalle',exact=True).click()
                        dialog.wait_for(state='hidden')
                        check('Image bytes, manual pending price, count and original list remain unchanged',page.locator('#scan-price-0').input_value()==initial['price'] and row.inner_text()==initial['row'] and image_hashes()==initial['image'])
                        snapshots.append({'stage':'after-retry','row':row.inner_text(),'name':page.locator('#scan-name-0').input_value(),'price':page.locator('#scan-price-0').input_value(),'image':image_hashes(),'ocr':counters['ocr'],'canonical':counters['canonical']})
                check('Retry does not invoke OCR/canonical/vision again',counters['ocr']==initial['ocr'] and counters['canonical']==initial['canonical'],counters.copy())
                check('Owner-explicit GET only for profile reads',all(r['method']=='GET' and r['query'].get('user_id')==['eq.'+UID] for r in requests if r['path'].endswith('/quiz_results')))
                check('No DB/feedback/history/profile writes',not any(r['method'] in ['PATCH','DELETE','PUT'] or (r['method']=='POST' and r['path'].startswith('/rest/v1/')) for r in requests))
                check('All nonlocal requests locally terminal/intercepted',sorted(seen)==sorted(terminal),{'seen':len(seen),'terminal':len(terminal)})
                check('Any failed fixture reply corresponds to observed client abort, not egress failure',all(e['clientAborted'] for e in reply_errors),reply_errors)
                check('No runtime exception or mobile overflow',not errors and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                if not button.count(): page.screenshot(path=str(args.output/(case.replace(':','-')+'-no-retry.png')))
            except Exception as error:
                failures.append(str(error));page.screenshot(path=str(args.output/(case.replace(':','-')+'-exception.png')))
            finally:
                release();results.append({'case':case,'passed':not failures,'checks':checks,'failures':failures,'counters':counters,'snapshots':snapshots,'requests':requests,'sockets':sockets,'errors':errors,'console':console,'clientAborted':client_failed,'replyErrors':reply_errors});context.close()
            print(case,'PASS' if results[-1]['passed'] else 'FAIL',flush=True)
    finally: browser.close()
(args.output/'results.json').write_text(json.dumps({'scope':__doc__,'realRemoteAppCalls':0,'paidCalls':0,'realAccounts':0,'results':results},ensure_ascii=False,indent=2)+'\n')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
