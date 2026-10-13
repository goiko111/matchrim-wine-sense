"""Human identity caption plus existing manual-detail/list/comparison regression; local responses only."""
import argparse
import ast
import base64
import hashlib
import json
import re
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--url', default='http://127.0.0.1:4468')
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
photo = root / 'qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg'
contract = root / 'scripts/qa-multi-wine-ui.py'
sha = lambda value: hashlib.sha256(value).hexdigest()
assert sha(photo.read_bytes()) == '9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9'
assert sha(contract.read_bytes()) == 'f2aa2924e48c8c2f6f0cbe45011e6ef92bda3cb17be14a645659b70a0343ae40'
tree = ast.parse(contract.read_text())
scope = {}
exec(compile(ast.Module(body=[node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in ['candidate', 'function_response']], type_ignores=[]), str(contract), 'exec'), scope)
responses = {'detect': scope['function_response']('detect-wine-regions', SimpleNamespace(post_data_json={})), 'analyze': {rid: scope['function_response']('analyze-wine-region', SimpleNamespace(post_data_json={'region_id': rid})) for rid in ['region-1', 'region-2', 'region-3', 'region-4', 'region-5']}}
(args.output / 'scan-response-payloads.json').write_text(json.dumps(responses, ensure_ascii=False, indent=2) + '\n')
uid = '00000000-0000-4000-8000-000000000080'
enc = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
user = {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid', 'app_metadata': {'provider': 'email'}, 'user_metadata': {}}
session = {'user': user, 'access_token': enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': uid, 'exp': 1900000000}) + '.' + enc('synthetic-invalid'), 'refresh_token': 'synthetic-invalid', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for width, height, orientation in [(393, 852, 'portrait'), (852, 393, 'landscape')]:
            for action in ['manual', 'confirm', 'edit']:
                context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')
                case = action + '-' + orientation
                checks, failures, observations, requests, seen, handled, sockets, errors, console = [], [], {}, [], [], [], [], [], []
                held = {'profile': [], 'detect': [], 'search': []}
                counts = {'profile': 0, 'detect': 0, 'analyze': 0, 'search': 0}
                scanning = False

                def reply(route, body):
                    route.fulfill(status=200, content_type='application/json', body=json.dumps(body), headers={'Access-Control-Allow-Origin': '*'})

                def intercept(route):
                    req, url = route.request, urlparse(route.request.url)
                    if url.netloc == urlparse(args.url).netloc:
                        return route.continue_()
                    handled.append(req.url)
                    row = {'method': req.method, 'path': url.path}
                    if req.post_data and '/functions/v1/' in url.path:
                        row['bodySha256'] = sha(req.post_data.encode())
                        row['body'] = {key: {'sha256': sha(value.encode()), 'length': len(value)} if key == 'image' and isinstance(value, str) else value for key, value in req.post_data_json.items()}
                    requests.append(row)
                    if '/auth/v1/user' in url.path:
                        return reply(route, user)
                    if '/rest/v1/quiz_results' in url.path and scanning:
                        counts['profile'] += 1
                        held['profile'].append(route)
                        return
                    endpoint = re.sub(r'-v\d+$', '', url.path.rstrip('/').split('/')[-1])
                    if '/functions/v1/' in url.path and endpoint == 'detect-wine-regions':
                        counts['detect'] += 1
                        held['detect'].append(route)
                        return
                    if '/functions/v1/' in url.path and endpoint == 'analyze-wine-region':
                        counts['analyze'] += 1
                        return reply(route, responses['analyze'][req.post_data_json['region_id']])
                    if '/functions/v1/' in url.path and endpoint == 'search-wines':
                        counts['search'] += 1
                        held['search'].append(route)
                        return
                    return reply(route, [] if '/rest/v1/' in url.path else {})

                def socket_handler(ws):
                    local = urlparse(ws.url).netloc == urlparse(args.url).netloc
                    sockets.append({'local': local, 'blocked': not local})
                    if local:
                        ws.connect_to_server()
                    else:
                        ws.close(code=1008, reason='Local edit-lock QA only')

                context.route('**/*', intercept)
                context.route_web_socket('**/*', socket_handler)
                context.on('request', lambda req: seen.append(req.url) if urlparse(req.url).netloc != urlparse(args.url).netloc else None)
                storage = {'sb-cbjynrbvrhcmpaojmqdp-auth-token': json.dumps(session), 'matchrim.scan_privacy_notice.v2': 'accepted', 'matchrim.local_profile_owner.v1': uid, 'matchrim.onboarding.v2:' + uid: json.dumps({'version': 2, 'result': 'skipped'})}
                context.add_init_script("window.CapacitorCustomPlatform={name:'ios'};for(const[k,v]of Object.entries(%s))localStorage.setItem(k,v);" % json.dumps(storage))
                page = context.new_page()
                page.set_default_timeout(7500)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda message: console.append(re.sub(r'https?://\S+', '<URL>', message.text)) if message.type == 'error' else None)

                def check(name, passed, detail=None):
                    checks.append({'name': name, 'passed': bool(passed), 'detail': detail})
                    if not passed:
                        failures.append(name)

                def wait_held(key, count=1):
                    for _ in range(250):
                        if len(held[key]) >= count:
                            return
                        page.wait_for_timeout(10)
                    raise AssertionError('Expected real client requests not reached: ' + key)

                def snapshot(stage):
                    row = page.get_by_role('dialog').evaluate('e=>{const r=e.getBoundingClientRect(),b=e.querySelector(".overflow-y-auto"),footer=e.querySelector(".grid.grid-cols-2"),fr=footer?.getBoundingClientRect();return {title:e.querySelector("h2")?.textContent,text:e.innerText,controls:[...e.querySelectorAll("input,button")].map(n=>({tag:n.tagName,name:n.name||n.textContent.trim(),disabled:n.disabled,value:n.value||null})),rect:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},body:b?{height:b.clientHeight,scroll:b.scrollHeight}:null,footer:fr?{top:fr.top,bottom:fr.bottom}:null};}')
                    observations[stage] = row
                    check(stage + ' dialog and footer within mobile viewport', row['rect']['x'] >= -1 and row['rect']['right'] <= width + 1 and row['rect']['y'] >= -1 and row['rect']['bottom'] <= height + 1 and row['footer']['bottom'] <= row['rect']['bottom'] + 1 and page.evaluate('document.documentElement.scrollWidth<=innerWidth'), row['rect'])
                    page.screenshot(path=str(args.output / (case + '-' + stage + '.png')))

                def open_region(index):
                    page.get_by_test_id('region-pin-' + str(index)).tap()
                    page.get_by_role('dialog').wait_for(state='visible')
                    page.wait_for_function('()=>{const d=document.querySelector("[role=dialog]"),r=d?.getBoundingClientRect();return r&&r.top>=-1&&r.bottom<=innerHeight+1;}', timeout=3000)

                def close_dialog():
                    page.get_by_role('dialog').get_by_role('button', name='Cerrar', exact=True).tap()
                    page.get_by_role('dialog').wait_for(state='hidden')

                try:
                    page.goto(args.url + '/escanear/etiqueta', wait_until='networkidle')
                    gallery = page.get_by_role('button', name='Elegir de galer\u00eda', exact=True)
                    with page.expect_file_chooser() as event:
                        gallery.tap()
                    chooser = event.value
                    observations['chooserBefore'] = chooser.element.evaluate('e=>({value:e.value,count:e.files.length})')
                    scanning = True
                    chooser.set_files(str(photo))
                    observations['selection'] = chooser.element.evaluate('e=>[...e.files].map(f=>({name:f.name,type:f.type,size:f.size,lastModified:f.lastModified}))')
                    check('Visible gallery exact original and bypass off', observations['chooserBefore'] == {'value': '', 'count': 0} and observations['selection'][0]['name'] == photo.name and not page.get_by_text('QA local: respuestas deterministas.', exact=False).count())
                    wait_held('profile')
                    for route in held['profile']:
                        reply(route, None)
                    wait_held('detect')
                    for route in held['detect']:
                        reply(route, responses['detect'])
                    wait_held('search', 3)
                    for route in held['search']:
                        reply(route, {'wines': []})
                    page.get_by_text('Lote listo para revisar', exact=True).wait_for(timeout=45000)
                    index = 5 if action == 'manual' else 2
                    open_region(index)
                    dialog = page.get_by_role('dialog')
                    if action == 'manual':
                        dialog.get_by_role('textbox', name='Vino', exact=True).fill('Referencia QA manual')
                        dialog.get_by_role('button', name='Aplicar identidad manual', exact=True).tap()
                        name = 'Referencia QA manual'
                    elif action == 'confirm':
                        dialog.get_by_role('button', name='Confirmar este candidato', exact=True).tap()
                        name = 'Marques de Riscal Reserva'
                    else:
                        dialog.get_by_role('textbox', name='Vino', exact=True).fill('Referencia QA editada')
                        name = 'Referencia QA editada'
                    page.wait_for_timeout(100)
                    snapshot('manual-detail')
                    check('Notice attributes review rather than manual introduction', dialog.get_by_test_id('manual-identity-notice').count() == 1 and 'Identidad revisada por ti.' in dialog.inner_text() and 'Identidad introducida manualmente' not in dialog.inner_text())
                    check('Null-profile notice states affinity pending without inventing it', 'Afinidad pendiente de ficha sensorial y perfil suficientes.' in dialog.inner_text())
                    check('Review feedback is persistent and announced inside the selected detail', dialog.get_by_test_id('manual-identity-notice').get_attribute('role') == 'status')
                    check('Identity confirmation does not add a competing floating notice', page.locator('[data-sonner-toast]').count() == 0)
                    check('Title attributes human identity, not machine recognition', 'Identidad manual' in dialog.get_by_role('heading').first.inner_text())
                    check('No fabricated100 percent identity in detail or aiRIM', 'Identidad 100%' not in dialog.inner_text() and 'lectura 100%' not in dialog.inner_text() and 'Por ti' in dialog.inner_text())
                    check('aiRIM names human provenance', dialog.get_by_test_id('airim-context-guide').get_by_text('Identidad revisada por ti', exact=True).count() == 1)
                    close_dialog()
                    expected_counter = '4 analizadas \u00b7 1 identidad manual' if action == 'manual' else '3 analizadas \u00b7 1 identidad manual \u00b7 1 sin analizar'
                    observations['counter'] = page.get_by_test_id('scan-region-progress').inner_text()
                    check('Manual identity is a separate counter category', observations['counter'] == expected_counter, observations['counter'])
                    page.get_by_role('tab', name=re.compile(r'^Vinos')).tap()
                    row = page.get_by_role('button', name='Abrir detalle de ' + name, exact=True)
                    observations['row'] = row.inner_text()
                    check('List does not call manual input a read name', 'Identidad confirmada por ti' in observations['row'] and 'Nombre le\u00eddo' not in observations['row'], observations['row'])
                    page.screenshot(path=str(args.output / (case + '-manual-list.png')))
                    page.get_by_role('tab', name='Comparar', exact=True).tap()
                    page.get_by_role('checkbox', name='Comparar ' + name, exact=True).check()
                    page.get_by_role('checkbox', name='Comparar Baron Saint George Grand Vin de Bordeaux', exact=True).check()
                    comparison = page.get_by_role('row').filter(has=page.get_by_role('rowheader', name='Confianza de identidad', exact=True))
                    # Table uses plain th, so recover through rendered text when rowheader is not exposed.
                    if not comparison.count():
                        comparison = page.locator('tr').filter(has=page.locator('th').get_by_text('Confianza de identidad', exact=True))
                    observations['comparisonIdentity'] = comparison.inner_text()
                    check('Comparison distinguishes manual identity from percentage', 'Revisada por ti' in observations['comparisonIdentity'] and '100%' not in observations['comparisonIdentity'], observations['comparisonIdentity'])
                    human_cell = page.locator('li').filter(has_text='Identidad revisada por ti') if orientation == 'portrait' else comparison.get_by_role('cell').filter(has_text='Revisada por ti')
                    human_cell.scroll_into_view_if_needed()
                    visible = human_cell.evaluate('e=>{const r=e.getBoundingClientRect(),at=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&(at===e||e.contains(at))&&document.documentElement.scrollWidth<=innerWidth;}') if human_cell.count() else False
                    check('Manual comparison provenance visible at actual responsive surface', visible)
                    page.screenshot(path=str(args.output / (case + '-manual-comparison.png')))
                    check('Scan plan unchanged, no extra request from human correction', counts == {'profile': 1, 'detect': 1, 'analyze': 4, 'search': 3}, counts.copy())
                    check('No unexpected runtime/console diagnostics', not errors and not console, {'errors': errors, 'console': console})
                    check('Zero external writes/accounts/paid calls, all HTTP/WS intercepted', sorted(seen) == sorted(handled) and all(socket['local'] or socket['blocked'] for socket in sockets) and not any(row['method'] in ['PATCH', 'DELETE', 'PUT'] or (row['method'] == 'POST' and row['path'].startswith('/rest/v1/')) for row in requests))
                except Exception as error:
                    failures.append(str(error))
                    page.screenshot(path=str(args.output / (case + '-exception.png')))
                finally:
                    results.append({'case': case, 'passed': not failures, 'checks': checks, 'failures': failures, 'observations': observations, 'requests': requests, 'counts': counts, 'sockets': sockets, 'errors': errors, 'console': console})
                    context.close()
                    (args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'realRemoteAppCalls': 0, 'realWrites': 0, 'realAccounts': 0, 'paidCalls': 0, 'results': results}, ensure_ascii=False, indent=2) + '\n')
                print(case, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    finally:
        browser.close()
raise SystemExit(0 if all(row['passed'] for row in results) else 1)
