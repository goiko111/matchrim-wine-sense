"""Local HEIC decode/recovery through visible controls; no real recognition or native certification."""
import argparse
import ast
import base64
import hashlib
import json
import re
import time
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--url', default='http://127.0.0.1:4471')
p.add_argument('--unsupported-image', type=Path, default=Path('/Users/GOIKO/Downloads/IMG_7547 2.HEIC'))
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
photo = root / 'qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg'
contract = root / 'scripts/qa-multi-wine-ui.py'
sha = lambda data: hashlib.sha256(data).hexdigest()
assert sha(photo.read_bytes()) == '9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9'
assert sha(contract.read_bytes()) == 'f2aa2924e48c8c2f6f0cbe45011e6ef92bda3cb17be14a645659b70a0343ae40'
assert args.unsupported_image.is_file()
tree = ast.parse(contract.read_text())
scope = {}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in ['candidate', 'function_response']], type_ignores=[]), str(contract), 'exec'), scope)
responses = {'detect': scope['function_response']('detect-wine-regions', SimpleNamespace(post_data_json={})), 'analyze': {rid: scope['function_response']('analyze-wine-region', SimpleNamespace(post_data_json={'region_id': rid})) for rid in ['region-1', 'region-2', 'region-3', 'region-4', 'region-5']}}
uid = '00000000-0000-4000-8000-000000000080'
enc = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
user = {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@matchrim.invalid', 'app_metadata': {'provider': 'email'}, 'user_metadata': {}}
session = {'user': user, 'access_token': enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': uid, 'exp': 1900000000}) + '.' + enc('synthetic-invalid'), 'refresh_token': 'synthetic-invalid', 'expires_at': 1900000000, 'expires_in': 86400, 'token_type': 'bearer'}
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    try:
        for width, height, orientation in [(393, 852, 'portrait'), (852, 393, 'landscape')]:
            for input_kind in ['gallery', 'camera']:
                context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce', service_workers='block')
                case = input_kind + '-' + orientation
                checks, failures, observations, seen, handled, errors, console = [], [], {}, [], [], [], []
                counts = {'profile': 0, 'detect': 0, 'analyze': 0, 'search': 0}

                def reply(route, body):
                    route.fulfill(status=200, content_type='application/json', body=json.dumps(body), headers={'Access-Control-Allow-Origin': '*'})

                def intercept(route):
                    req, url = route.request, urlparse(route.request.url)
                    if url.netloc == urlparse(args.url).netloc:
                        return route.continue_()
                    handled.append(req.url)
                    assert req.method not in ['PUT', 'PATCH', 'DELETE']
                    assert not (req.method == 'POST' and url.path.startswith('/rest/v1/'))
                    if '/auth/v1/user' in url.path:
                        return reply(route, user)
                    if '/rest/v1/quiz_results' in url.path:
                        counts['profile'] += 1
                        return reply(route, None)
                    endpoint = re.sub(r'-v\d+$', '', url.path.rstrip('/').split('/')[-1])
                    if '/functions/v1/' in url.path and endpoint == 'detect-wine-regions':
                        counts['detect'] += 1
                        return reply(route, responses['detect'])
                    if '/functions/v1/' in url.path and endpoint == 'analyze-wine-region':
                        counts['analyze'] += 1
                        return reply(route, responses['analyze'][req.post_data_json['region_id']])
                    if '/functions/v1/' in url.path and endpoint == 'search-wines':
                        counts['search'] += 1
                        return reply(route, {'wines': []})
                    return reply(route, [] if '/rest/v1/' in url.path else {})

                context.route('**/*', intercept)
                context.route_web_socket('**/*', lambda ws: ws.connect_to_server() if urlparse(ws.url).netloc == urlparse(args.url).netloc else ws.close(code=1008, reason='Local decode QA'))
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

                def select(button_name, path):
                    with page.expect_file_chooser() as event:
                        page.get_by_role('button', name=button_name, exact=True).tap()
                    chooser = event.value
                    before = chooser.element.evaluate('e=>({value:e.value,count:e.files.length,capture:e.capture})')
                    chooser.set_files(str(path))
                    return before

                def wait_decode_error(expected_count):
                    for _ in range(200):
                        if sum('Scan failed:' in item for item in console) >= expected_count:
                            page.wait_for_timeout(100)
                            return
                        page.wait_for_timeout(10)
                    raise AssertionError('Expected actual browser decode failure was not observed')

                try:
                    page.goto(args.url + '/escanear/etiqueta', wait_until='networkidle')
                    before_requests = counts.copy()
                    label = 'Hacer foto' if input_kind == 'camera' else 'Elegir de galer\u00eda'
                    observations['firstChooser'] = select(label, args.unsupported_image)
                    wait_decode_error(1)
                    observations['errorText'] = page.locator('main').inner_text()
                    check('Decode error visible in empty upload state', page.get_by_test_id('scan-input-error').count() == 1)
                    check('Correct local decode reason, not network/provider or unreadable identity', 'El dispositivo no puede abrir este formato de imagen' in observations['errorText'] and 'Sin reconocer' not in observations['errorText'])
                    check('No profile/vision/catalog request before valid image', counts == before_requests, counts.copy())
                    check('Retry same selected image available', page.get_by_role('button', name='Reintentar', exact=True).count() == 1)
                    check('Discard selected image available', page.get_by_role('button', name='Descartar imagen', exact=True).count() == 1)
                    check('Empty-state horizontal layout contained', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                    page.screenshot(path=str(args.output / (case + '-decode-error.png')))
                    if page.get_by_role('button', name='Reintentar', exact=True).count():
                        context.set_offline(True)
                        page.get_by_role('button', name='Reintentar', exact=True).tap()
                        wait_decode_error(2)
                        check('Same-file retry returns visible decode error without remote work', page.get_by_test_id('scan-input-error').count() == 1 and counts == before_requests)
                        check('Offline does not mislabel a local format failure as network failure', 'El dispositivo no puede abrir este formato de imagen' in page.get_by_test_id('scan-input-error').inner_text() and 'No hay conexi\u00f3n' not in page.get_by_test_id('scan-input-error').inner_text())
                        context.set_offline(False)
                        observations['errorAria'] = page.get_by_test_id('scan-input-error').get_attribute('role')
                        check('Decode notice announced as alert', observations['errorAria'] == 'alert')
                        for control in ['Reintentar', 'Descartar imagen']:
                            rect = page.get_by_role('button', name=control, exact=True).bounding_box()
                            check(control + ' touch target at least44px', rect['width'] >= 44 and rect['height'] >= 44, rect)
                        page.get_by_role('button', name='Descartar imagen', exact=True).tap()
                        check('Discard clears old error', page.get_by_test_id('scan-input-error').count() == 0)
                        observations['secondChooser'] = select(label, args.unsupported_image)
                        check('Same-file chooser reset after discard', observations['secondChooser']['value'] == '' and observations['secondChooser']['count'] == 0)
                        wait_decode_error(3)
                    select('Elegir de galer\u00eda', photo)
                    page.get_by_text('Lote listo para revisar', exact=True).wait_for(timeout=45000)
                    check('Valid original JPEG recovers after decode error', page.get_by_test_id('region-pin-2').count() == 1 and page.get_by_test_id('scan-input-error').count() == 0 and counts['detect'] == before_requests['detect'] + 1 and counts['analyze'] == before_requests['analyze'] + 4)
                    check('No stale decode message in recovered scan', 'El dispositivo no puede abrir este formato de imagen' not in page.locator('main').inner_text())
                    page.screenshot(path=str(args.output / (case + '-recovered.png')))
                    page.get_by_role('button', name='Cerrar an\u00e1lisis', exact=True).tap()
                    check('Recovered reset restores input controls', page.get_by_role('button', name='Elegir de galer\u00eda', exact=True).is_enabled() and not page.get_by_test_id('region-pin-2').count())
                    check('All remote calls intercepted before auth; no writes', sorted(seen) == sorted(handled))
                    check('No runtime or unexpected console errors', not errors and all(re.search(r'Scan failed: (?:ImagePreparationError|Error): El dispositivo no puede abrir este formato de imagen', item) for item in console), console)
                except Exception as error:
                    failures.append(str(error))
                    page.screenshot(path=str(args.output / (case + '-failure.png')))
                finally:
                    results.append({'case': case, 'checks': checks, 'failures': failures, 'observations': observations, 'counts': counts, 'runtimeErrors': errors, 'expectedConsole': console, 'realRemoteAppCalls': 0, 'realWrites': 0})
                    context.close()
    finally:
        browser.close()
        (args.output / 'results.json').write_text(json.dumps({'scope': __doc__, 'privateInput': {'name': args.unsupported_image.name, 'sha256': sha(args.unsupported_image.read_bytes())}, 'publicCanary': {'name': photo.name, 'sha256': sha(photo.read_bytes())}, 'sourceSha256': sha((root / 'src/components/wine-import/MultiWineLabelScanner.tsx').read_bytes()), 'results': results}, ensure_ascii=False, indent=2) + '\n')
passed = sum(check['passed'] for row in results for check in row['checks'])
total = sum(len(row['checks']) for row in results)
print(json.dumps({'passed': passed, 'total': total, 'failures': {row['case']: row['failures'] for row in results if row['failures']}}))
if any(row['failures'] for row in results):
    raise SystemExit(1)
