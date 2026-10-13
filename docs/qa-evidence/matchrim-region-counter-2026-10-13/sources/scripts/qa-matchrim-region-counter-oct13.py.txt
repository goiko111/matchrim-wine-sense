"""Focused region-counter UI on the existing local-stub scan; not vision/native/human QA."""
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
p.add_argument('--url', default='http://127.0.0.1:4465')
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
responses = {
    'detect': scope['function_response']('detect-wine-regions', SimpleNamespace(post_data_json={})),
    'analyze': {rid: scope['function_response']('analyze-wine-region', SimpleNamespace(post_data_json={'region_id': rid})) for rid in ['region-1', 'region-2', 'region-3', 'region-4', 'region-5']},
}
(args.output / 'scan-response-payloads.json').write_text(json.dumps(responses, ensure_ascii=False, indent=2) + '\n')
uid = '00000000-0000-4000-8000-000000000080'
enc = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
user = {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid', 'app_metadata': {'provider': 'email'}, 'user_metadata': {}}
session = {'user': user, 'access_token': enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': uid, 'exp': 1900000000}) + '.' + enc('synthetic-invalid'), 'refresh_token': 'synthetic-invalid', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
expected = {
    'queue': '0 analizadas \u00b7 3 en curso \u00b7 1 en espera \u00b7 1 sin analizar',
    'catalog': '1 analizada \u00b7 3 en curso \u00b7 1 sin analizar',
    'ready': '4 analizadas \u00b7 1 sin analizar',
}
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for width, height, orientation in [(393, 852, 'portrait'), (852, 393, 'landscape')]:
            context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')
            checks, failures, observations, requests, seen, handled, sockets, errors, console = [], [], {}, [], [], [], [], [], []
            held = {'profile': [], 'detect': [], 'analyze': [], 'search': []}
            counts = {'profile': 0, 'detect': 0, 'analyze': 0, 'search': 0}
            scanning, hold_analysis = False, True

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
                    if hold_analysis:
                        held['analyze'].append(route)
                        return
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
                    ws.close(code=1008, reason='Local counter QA only')

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

            def capture(stage):
                # Read only DOM; no component/state/event/file injection.
                header = page.get_by_text('Lote listo para revisar' if stage == 'ready' else 'Leyendo cada regi\u00f3n por separado', exact=True).locator('..')
                counter = page.get_by_test_id('scan-region-progress')
                if not counter.count():
                    counter = header.locator('[role=status]')
                actual = counter.inner_text() if counter.count() else None
                row = {'expected': expected[stage], 'actual': actual, 'headerText': header.inner_text(), 'requestCounts': counts.copy()}
                if counter.count():
                    row['dom'] = counter.evaluate('e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return {role:e.getAttribute("role"),live:e.getAttribute("aria-live"),rect:{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height},parent:{x:p.x,right:p.right},width:e.scrollWidth,client:e.clientWidth,text:e.textContent};}')
                observations[stage] = row
                check(stage + ' exact truthful state partition', actual == expected[stage], row)
                if counter.count():
                    dom = row['dom']
                    check(stage + ' mobile counter bounds and wrapping', dom['rect']['x'] >= 0 and dom['rect']['right'] <= width and dom['width'] <= dom['client'] and page.evaluate('document.documentElement.scrollWidth<=innerWidth'), dom)
                    check(stage + ' polite status semantics', dom['role'] == 'status' and dom['live'] in [None, 'polite'], dom)
                else:
                    check(stage + ' mobile counter bounds and wrapping', False)
                    check(stage + ' polite status semantics', False)
                page.screenshot(path=str(args.output / (orientation + '-' + stage + '.png')))

            try:
                page.goto(args.url + '/escanear/etiqueta', wait_until='networkidle')
                gallery = page.get_by_role('button', name='Elegir de galer\u00eda', exact=True)
                with page.expect_file_chooser() as chooser_event:
                    if orientation == 'portrait':
                        for _ in range(80):
                            if gallery.evaluate('e=>e===document.activeElement'):
                                break
                            page.keyboard.press('Tab')
                        else:
                            raise AssertionError('Gallery cannot be reached by real Tab')
                        page.keyboard.press('Enter')
                    else:
                        gallery.tap()
                chooser = chooser_event.value
                observations['chooserBefore'] = chooser.element.evaluate('e=>({value:e.value,count:e.files.length})')
                scanning = True
                chooser.set_files(str(photo))
                observations['selection'] = chooser.element.evaluate('e=>[...e.files].map(f=>({name:f.name,type:f.type,size:f.size,lastModified:f.lastModified}))')
                check('Visible gallery and same original file, fixture bypass off', observations['chooserBefore'] == {'value': '', 'count': 0} and observations['selection'][0]['name'] == photo.name and not page.get_by_text('QA local: respuestas deterministas.', exact=False).count())
                wait_held('profile')
                for route in held['profile']:
                    reply(route, None)
                wait_held('detect')
                for route in held['detect']:
                    reply(route, responses['detect'])
                wait_held('analyze', 3)
                page.wait_for_timeout(100)
                capture('queue')
                hold_analysis = False
                for route in held['analyze']:
                    reply(route, responses['analyze'][route.request.post_data_json['region_id']])
                wait_held('search', 3)
                page.wait_for_timeout(300)
                capture('catalog')
                for route in held['search']:
                    reply(route, {'wines': []})
                page.get_by_text('Lote listo para revisar', exact=True).wait_for(timeout=45000)
                page.wait_for_timeout(400)
                capture('ready')
                check('Observed unchanged scan plan, no new retries/calls', counts == {'profile': 1, 'detect': 1, 'analyze': 4, 'search': 3}, counts.copy())
                check('No unexpected console or runtime diagnostics', not errors and not console, {'errors': errors, 'console': console})
                check('All external HTTP and WS intercepted; zero real writes', sorted(seen) == sorted(handled) and all(socket['local'] or socket['blocked'] for socket in sockets) and not any(row['method'] in ['PATCH', 'DELETE', 'PUT'] or (row['method'] == 'POST' and row['path'].startswith('/rest/v1/')) for row in requests))
            except Exception as error:
                failures.append(str(error))
                page.screenshot(path=str(args.output / (orientation + '-exception.png')))
            finally:
                results.append({'case': orientation, 'passed': not failures, 'checks': checks, 'failures': failures, 'observations': observations, 'requests': requests, 'counts': counts, 'sockets': sockets, 'errors': errors, 'console': console})
                context.close()
                (args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'realRemoteAppCalls': 0, 'realWrites': 0, 'realAccounts': 0, 'paidCalls': 0, 'results': results}, ensure_ascii=False, indent=2) + '\n')
            print(orientation, 'PASS' if results[-1]['passed'] else 'FAIL', flush=True)
    finally:
        browser.close()
raise SystemExit(0 if all(row['passed'] for row in results) else 1)
