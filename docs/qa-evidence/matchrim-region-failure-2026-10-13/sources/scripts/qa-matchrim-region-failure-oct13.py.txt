"""Region service failures and recovery on the exact existing local scan contract, not live vision."""
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
p.add_argument('--url', default='http://127.0.0.1:4467')
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
            for action in ['initial-400', 'initial-429', 'reanalysis-400', 'reanalysis-transport']:
                context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')
                case = action + '-' + orientation
                checks, failures, observations, requests, seen, handled, sockets, errors, console = [], [], {}, [], [], [], [], [], []
                held = {'profile': [], 'detect': [], 'search': []}
                counts = {'profile': 0, 'detect': 0, 'analyze': 0, 'search': 0}
                scanning = False
                failing = action.startswith('initial-')

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
                        if failing and req.post_data_json['region_id'] == 'region-2':
                            if action == 'reanalysis-transport':
                                return route.abort('internetdisconnected')
                            status = 429 if action == 'initial-429' else 400
                            return route.fulfill(status=status, content_type='application/json', body=json.dumps({'error': 'INTERNAL_QA_ONLY provider detail must not appear'}), headers={'Access-Control-Allow-Origin': '*'})
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
                    open_region(2)
                    if action.startswith('reanalysis-'):
                        observations['previousName'] = page.get_by_role('dialog').get_by_role('textbox', name='Vino', exact=True).input_value()
                        failing = True
                        page.get_by_role('dialog').get_by_role('button', name='Reanalizar', exact=True).tap()
                        page.get_by_text('Lote listo para revisar', exact=True).wait_for(timeout=45000)
                    page.wait_for_timeout(150)
                    snapshot('failure')
                    dialog = page.get_by_role('dialog')
                    check('Failure is named as analysis error, not unreadability', 'Error de an\u00e1lisis' in dialog.get_by_role('heading').first.inner_text())
                    check('Safe region failure message is visible', dialog.get_by_test_id('region-analysis-error').count() == 1)
                    if dialog.get_by_test_id('region-analysis-error').count():
                        visible_error = dialog.get_by_test_id('region-analysis-error').evaluate('e=>{const r=e.getBoundingClientRect(),b=e.closest(".overflow-y-auto").getBoundingClientRect();return {top:r.top,bottom:r.bottom,bodyTop:b.top,bodyBottom:b.bottom};}')
                        observations['errorViewport'] = visible_error
                        check('Error explanation appears before crop without scrolling', visible_error['top'] >= visible_error['bodyTop'] - 1 and visible_error['bottom'] <= visible_error['bodyBottom'] + 1, visible_error)
                    else:
                        check('Error explanation appears before crop without scrolling', False)
                    check('No internal provider detail or false visual evidence diagnosis', 'INTERNAL_QA_ONLY' not in dialog.inner_text() and 'No hay evidencia visual suficiente para asignar un vino.' not in dialog.inner_text())
                    check('Counter separates failed request', page.get_by_test_id('scan-region-progress').inner_text() == '3 analizadas \u00b7 1 con error \u00b7 1 sin analizar')
                    expected_attempts = 6 if action == 'initial-429' else 7 if action == 'reanalysis-transport' else 5 if action == 'reanalysis-400' else 4
                    check('Retry and crop budget bounded by existing policy', counts == {'profile': 1, 'detect': 1, 'analyze': expected_attempts, 'search': 3}, counts.copy())
                    if action.startswith('reanalysis-'):
                        check('Previous result retained but explicitly not updated', dialog.get_by_role('textbox', name='Vino', exact=True).input_value() == observations['previousName'] and dialog.get_by_text('Resultado anterior: este intento no ha podido actualizar la identificaci\u00f3n ni la afinidad.', exact=True).count() == 1)
                        dialog.get_by_role('textbox', name='Vino', exact=True).fill('Referencia QA corregida')
                        page.wait_for_timeout(100)
                        check('Explicit manual edit clears failure without inventing affinity', page.get_by_test_id('region-analysis-error').count() == 0 and dialog.get_by_text('Identidad introducida manualmente. Afinidad pendiente de datos sensoriales verificables.', exact=True).count() == 1 and page.get_by_test_id('scan-region-progress').inner_text() == '4 analizadas \u00b7 1 sin analizar')
                    else:
                        failing = False
                        dialog.get_by_role('button', name='Reanalizar', exact=True).tap()
                        page.get_by_text('Lote listo para revisar', exact=True).wait_for(timeout=45000)
                        check('Retry one failed region recovers original uncertain outcome', 'Dudoso' in dialog.get_by_role('heading').first.inner_text() and dialog.get_by_role('textbox', name='Vino', exact=True).input_value() == 'Marques de Riscal Reserva' and page.get_by_test_id('region-analysis-error').count() == 0)
                        check('Recovery analyzes only selected region', counts['analyze'] == expected_attempts + 1 and counts['detect'] == 1 and counts['profile'] == 1 and counts['search'] == 3, counts.copy())
                    snapshot('recovered')
                    close_dialog()
                    open_region(2)
                    check('Recovery survives close/reopen', page.get_by_test_id('region-analysis-error').count() == 0)
                    check('No unexpected runtime/console diagnostics', not errors and all(re.search(r'(status of (400|429)|ERR_INTERNET_DISCONNECTED)', message) for message in console), {'errors': errors, 'expectedBrowserErrors': console})
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
