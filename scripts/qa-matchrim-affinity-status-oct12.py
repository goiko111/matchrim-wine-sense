"""Only07 active affinity missing-vs-negative presentation, readonly intercepted replay, no new real recommendations."""
import argparse
import base64
import copy
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--url', default='http://127.0.0.1:4454')
p.add_argument('--cases', default='null:portrait,null:landscape')
args = p.parse_args(); args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
contract = root / 'docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json'
image = root / 'docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/fixtures/IMG_7547 2.jpg'
assert hashlib.sha256(image.read_bytes()).hexdigest() == '2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194'
original = json.loads(contract.read_text())['bothContract']['vinos'][1]
UID = '00000000-0000-4000-8000-000000000080'
encode = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
session = {'user': {'id': UID, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid', 'app_metadata': {'provider': 'email'}, 'user_metadata': {}}, 'access_token': encode({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encode({'sub': UID, 'exp': 1900000000}) + '.' + encode('synthetic-invalid'), 'refresh_token': 'synthetic-invalid', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
hashes = {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest() for path in [contract, image, root / 'src/components/wine-import/WineMenuScanner.tsx']}
(args.output / 'input-provenance.json').write_text(json.dumps({'scope': __doc__, 'hashes': hashes, 'source': 'One existing image and04 syntheticBOTH contract. Variant inputs are explicit negative contracts, not extracted truth. No positive profile/catalog injected. No users/persistence/RLS/physical iOS claims.', 'realRemoteAppCalls': 0, 'paidCalls': 0}, indent=2) + '\n')
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for case in args.cases.split(','):
            scenario, orientation = case.split(':')
            width, height = (393, 852) if orientation == 'portrait' else (852, 393)
            wine = copy.deepcopy(original)
            if scenario == 'missing': wine.pop('compatibilidad', None)
            elif scenario == 'null': wine['compatibilidad'] = None
            elif scenario == 'uncalibrated': wine['affinity_calibrated'] = False
            elif scenario == 'nonfinite': wine['compatibilidad'] = 'Infinity'
            requests, seen, fulfilled, sockets, pending, errors, console, checks, failures, observed = [], [], [], [], [], [], [], [], [], {}
            context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')
            def reply(route, data, status=200):
                fulfilled.append(route.request.url)
                route.fulfill(status=status, content_type='application/json', body=json.dumps(data), headers={'Access-Control-Allow-Origin': '*'})
            def intercept(route):
                req = route.request; url = urlparse(req.url)
                if url.netloc == urlparse(args.url).netloc: return route.continue_()
                requests.append({'method': req.method, 'host': url.hostname, 'path': url.path})
                if '/auth/v1/user' in url.path: return reply(route, session['user'])
                if '/rest/v1/quiz_results' in url.path:
                    if scenario == 'profile-loading': pending.append(route); return
                    if scenario == 'profile-error': return reply(route, {'message': 'Synthetic profile unavailable'}, 500)
                    return reply(route, None)
                if '/functions/v1/scan-wine-menu' in url.path: return reply(route, {'vinos': [wine], 'layout': 'rows', 'coverage': {'status': 'reported_complete', 'extracted_wines': 1}})
                if '/functions/v1/' in url.path: return reply(route, {'wines': []})
                return reply(route, [] if '/rest/v1/' in url.path else {})
            def ws_handler(ws):
                local = urlparse(ws.url).netloc == urlparse(args.url).netloc
                sockets.append({'host': urlparse(ws.url).hostname, 'local': local, 'blocked': not local})
                if local: ws.connect_to_server()
                else: ws.close(code=1008, reason='Only07 local QA')
            context.route('**/*', intercept); context.route_web_socket('**/*', ws_handler)
            context.on('request', lambda req: seen.append(req.url) if urlparse(req.url).netloc != urlparse(args.url).netloc else None)
            seed = {'sb-cbjynrbvrhcmpaojmqdp-auth-token': json.dumps(session), 'matchrim.local_profile_owner.v1': UID, 'matchrim.onboarding.v2:' + UID: json.dumps({'version': 2, 'result': 'skipped'}), 'matchrim.scan_privacy_notice.v2': 'accepted'}
            context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(seed))
            page = context.new_page(); page.set_default_timeout(6000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: console.append(re.sub(r'https?://\S+', '<URL>', m.text)) if m.type == 'error' else None)
            def check(name, passed, detail=None):
                checks.append({'name': name, 'passed': bool(passed), 'detail': detail})
                if not passed: failures.append(name)
            try:
                page.goto(args.url + '/escanear/carta-vinos', wait_until='networkidle')
                page.locator('input[type=file]').first.set_input_files(str(image))
                if scenario == 'profile-loading':
                    for _ in range(50):
                        if pending: break
                        page.wait_for_timeout(50)
                    check('Profile load pending creates no rejection/results yet', bool(pending) and page.get_by_text('Sin encaje', exact=True).count() == 0 and page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).count() == 0)
                    page.screenshot(path=str(args.output / (case.replace(':', '-') + '-loading.png')))
                    for route in pending: reply(route, None)
                    pending.clear()
                row = page.get_by_role('button', name=re.compile(r'^Abrir vino \d+:')).first
                row.wait_for(timeout=45000)
                observed['list'] = row.inner_text()
                page.get_by_text('Ver fichas completas y acciones', exact=True).click()
                page.locator('button[aria-controls="wine-actions-0"]').click()
                card = page.locator('#wine-actions-0')
                observed['card'] = card.inner_text()
                check('Consult action does not presume a positive fit', card.get_by_role('button', name='Consultar afinidad', exact=True).count() == 1)
                check('No missing/inference result appears as rejection', card.get_by_text('Sin encaje', exact=True).count() == 0 and card.get_by_text('No priorizaría', exact=True).count() == 0)
                check('Badge/card explicitly pending, not absent-as-zero', card.get_by_text('Afinidad pendiente', exact=True).count() >= 2 and not re.search(r'≈(?:0|NaN|Infinity|71)%', observed['card']))
                check('Explanation is explicit and consistent with pending', card.get_by_role('status').get_by_text('Afinidad pendiente', exact=True).count() == 1)
                check('Profile unavailable cause remains honest', page.locator('[data-testid="scan-profile-source"]').get_by_text('Perfil no disponible para este análisis; afinidad pendiente.', exact=True).count() == 1)
                check('Price provenance unchanged in readonly result', '25,00' in observed['card'] and 'EUR' in observed['card'] or '25,00' in observed['card'] and '€' in observed['card'])
                card.screenshot(path=str(args.output / (case.replace(':', '-') + '-card.png')))
                row.click()
                dialog = page.get_by_role('dialog')
                dialog.wait_for(state='visible')
                page.wait_for_function('()=>{const el=document.querySelector("[role=dialog]");if(!el)return false;const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1;}')
                page.wait_for_timeout(300)
                observed['drawer'] = dialog.inner_text()
                check('Selected detail says pending without an estimated number', dialog.get_by_text('Afinidad pendiente', exact=True).count() >= 2 and not re.search(r'≈(?:0|NaN|Infinity|71)%', observed['drawer']))
                check('Accessible pending explanation is present in detail', dialog.get_by_role('status').get_by_text('Afinidad pendiente', exact=True).count() == 1)
                pending_status = dialog.get_by_role('status').filter(has=page.get_by_text('Afinidad pendiente', exact=True))
                if pending_status.count():
                    pending_status.scroll_into_view_if_needed()
                    check('Pending text lines fit their status container', pending_status.evaluate('el=>{const b=el.getBoundingClientRect();const lines=[...el.querySelectorAll("p")].map(p=>p.getBoundingClientRect());return lines.every((r,i)=>r.left>=b.left&&r.right<=b.right+1&&(i===0||r.top>=lines[i-1].bottom));}'))
                    check('Settled pending status is readable in viewport', pending_status.evaluate('el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}'))
                    pending_status.screenshot(path=str(args.output / (case.replace(':', '-') + '-pending-status.png')))
                check('Detail fits mobile viewport width', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                page.screenshot(path=str(args.output / (case.replace(':', '-') + '-drawer.png')))
                check('No profile/rating/wine/history/feedback write on presentation', not any(r['method'] in ['PATCH', 'DELETE', 'PUT'] or (r['method'] == 'POST' and r['path'].startswith('/rest/v1/')) for r in requests))
                check('All nonlocal requests intercepted', sorted(seen) == sorted(fulfilled), {'seen': len(seen), 'fulfilled': len(fulfilled)})
                check('No runtime exception', not errors, errors)
            except Exception as error:
                failures.append(str(error)); page.screenshot(path=str(args.output / (case.replace(':', '-') + '-exception.png')))
            finally:
                for route in pending: reply(route, None)
                results.append({'case': case, 'passed': not failures, 'checks': checks, 'failures': failures, 'observed': observed, 'rawResponse': wine, 'requests': requests, 'socketAudit': sockets, 'errors': errors, 'console': console})
                context.close()
            print(case, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    finally: browser.close()
(args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'realAccounts': 0, 'realRemoteAppCalls': 0, 'paidCalls': 0, 'results': results}, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
